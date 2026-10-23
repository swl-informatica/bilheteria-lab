import { randomInt } from 'node:crypto';
import type { PoolClient } from 'pg';
import { Db, getPool, withTransaction } from './db/pool';
import { AppError, FieldErrors, notFound, validationError } from './errors';
import {
  activeOrderCondition,
  calendarStatus,
  EVENT_COLUMNS,
  eventDate,
  EventRow,
  halfPrice,
  halfQuota,
  loadSectorStock,
} from './events';
import { charge } from './gateway';
import { formatBrl, percentOf } from './money';
import {
  ageOn,
  currentYearMonth,
  daysBetween,
  localDate,
  localDateTime,
  now,
  today,
  toIso,
  toIsoOrNull,
} from './time';
import { User } from './users';
import { asObject, charLength, INVALID, isMissing, isUuid, REQUIRED } from './validation';

export const MAX_TICKETS_PER_ORDER = 6;
export const MAX_TICKETS_PER_BUYER = 6;
export const PAYMENT_WINDOW_MINUTES = 15;
export const MAX_DECLINED_ATTEMPTS = 3;
export const MIN_SERVICE_FEE = 300;
export const SERVICE_FEE_PERCENT = 10;
export const MIN_INSTALLMENT_TOTAL = 15000;

const TICKET_TYPES = ['FULL', 'HALF'] as const;
const HALF_CATEGORIES = ['STUDENT', 'SENIOR', 'DISABLED', 'LOW_INCOME_YOUTH'] as const;
const TICKET_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type TicketType = (typeof TICKET_TYPES)[number];
type HalfCategory = (typeof HALF_CATEGORIES)[number];

export interface ItemRequest {
  sectorId: string;
  type: TicketType;
  halfPriceCategory: HalfCategory | null;
  quantity: number;
}

export interface OrderRequest {
  eventId: string;
  couponCode: string | null;
  items: ItemRequest[];
}

interface PricedItem extends ItemRequest {
  unitPrice: number;
  lineTotal: number;
}

interface CouponRow {
  id: string;
  code: string;
  percent: number;
  starts_on: string;
  ends_on: string;
  usage_limit: number;
  min_amount: number;
}

interface SectorRow {
  id: string;
  name: string;
  full_price: number;
  capacity: number;
}

interface Evaluation {
  at: Date;
  event: EventRow;
  coupon: CouponRow | null;
  items: PricedItem[];
  subtotal: number;
  discount: number;
  serviceFee: number;
  total: number;
}

export interface OrderRow {
  id: string;
  user_id: string;
  event_id: string;
  status: string;
  coupon_code: string | null;
  subtotal: number;
  discount: number;
  service_fee: number;
  total: number;
  payment_deadline: Date;
  payment_attempts: number;
  paid_at: Date | null;
  card_last4: string | null;
  installments: number | null;
  refund_amount: number | null;
  created_at: Date;
}

interface ItemRow {
  order_id: string;
  sector_id: string;
  type: TicketType;
  half_price_category: HalfCategory | null;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface TicketRow {
  code: string;
  order_id: string;
  sector_id: string;
  type: TicketType;
  status: 'VALID' | 'USED' | 'CANCELED';
}

const ORDER_COLUMNS = `o.id, o.user_id, o.event_id, o.status, c.code AS coupon_code, o.subtotal, o.discount,
  o.service_fee, o.total, o.payment_deadline, o.payment_attempts, o.paid_at, o.card_last4,
  o.installments, o.refund_amount, o.created_at`;

// ---------------------------------------------------------------------------
// Request parsing

export function parseOrderRequest(raw: unknown): OrderRequest {
  const body = asObject(raw);
  const fields: FieldErrors = {};

  if (isMissing(body.eventId)) fields.eventId = REQUIRED;
  else if (!isUuid(body.eventId)) fields.eventId = INVALID;

  let couponCode: string | null = null;
  if (!isMissing(body.couponCode)) {
    if (typeof body.couponCode !== 'string') fields.couponCode = INVALID;
    else couponCode = body.couponCode.trim() || null;
  }

  const items: ItemRequest[] = [];
  if (isMissing(body.items)) fields.items = REQUIRED;
  else if (!Array.isArray(body.items) || body.items.length === 0) fields.items = INVALID;
  else {
    body.items.forEach((rawItem: unknown, index: number) => {
      const prefix = `items.${index}`;
      if (rawItem === null || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
        fields[prefix] = INVALID;
        return;
      }
      const item = rawItem as Record<string, unknown>;
      let valid = true;

      if (isMissing(item.sectorId)) {
        fields[`${prefix}.sectorId`] = REQUIRED;
        valid = false;
      } else if (!isUuid(item.sectorId)) {
        fields[`${prefix}.sectorId`] = INVALID;
        valid = false;
      }

      const type = item.type;
      if (isMissing(type)) {
        fields[`${prefix}.type`] = REQUIRED;
        valid = false;
      } else if (!TICKET_TYPES.includes(type as TicketType)) {
        fields[`${prefix}.type`] = INVALID;
        valid = false;
      }

      const category = item.halfPriceCategory;
      if (type === 'HALF') {
        if (isMissing(category)) {
          fields[`${prefix}.halfPriceCategory`] = REQUIRED;
          valid = false;
        } else if (!HALF_CATEGORIES.includes(category as HalfCategory)) {
          fields[`${prefix}.halfPriceCategory`] = INVALID;
          valid = false;
        }
      } else if (type === 'FULL' && !isMissing(category)) {
        fields[`${prefix}.halfPriceCategory`] = INVALID;
        valid = false;
      }

      const quantity = item.quantity;
      if (isMissing(quantity)) {
        fields[`${prefix}.quantity`] = REQUIRED;
        valid = false;
      } else if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1) {
        fields[`${prefix}.quantity`] = INVALID;
        valid = false;
      }

      if (valid) {
        items.push({
          sectorId: (item.sectorId as string).toLowerCase(),
          type: type as TicketType,
          halfPriceCategory: type === 'HALF' ? (category as HalfCategory) : null,
          quantity: quantity as number,
        });
      }
    });
  }

  if (Object.keys(fields).length > 0) throw validationError(fields);
  return { eventId: (body.eventId as string).toLowerCase(), couponCode, items };
}

function mergeItems(items: ItemRequest[]): ItemRequest[] {
  const merged = new Map<string, ItemRequest>();
  for (const item of items) {
    const key = `${item.sectorId}|${item.type}|${item.halfPriceCategory ?? ''}`;
    const existing = merged.get(key);
    if (existing) existing.quantity += item.quantity;
    else merged.set(key, { ...item });
  }
  return [...merged.values()];
}

// ---------------------------------------------------------------------------
// Pricing and validation of a new order

export function serviceFeeFor(amount: number): number {
  return Math.max(MIN_SERVICE_FEE, percentOf(amount, SERVICE_FEE_PERCENT));
}

async function evaluateOrder(db: Db, user: User, request: OrderRequest, lock: boolean): Promise<Evaluation> {
  const found = await db.query<EventRow>(
    `SELECT ${EVENT_COLUMNS} FROM events e WHERE e.id = $1`,
    [request.eventId],
  );
  const event = found.rows[0];
  if (!event) throw notFound();
  const at = now();
  const currentDate = today(at);

  const sectorResult = await db.query<SectorRow>(
    'SELECT id, name, full_price, capacity FROM sectors WHERE event_id = $1',
    [event.id],
  );
  const sectors = new Map(sectorResult.rows.map((sector) => [sector.id, sector]));
  const sectorErrors: FieldErrors = {};
  request.items.forEach((item, index) => {
    if (!sectors.has(item.sectorId)) sectorErrors[`items.${index}.sectorId`] = INVALID;
  });
  if (Object.keys(sectorErrors).length > 0) throw validationError(sectorErrors);

  const items = mergeItems(request.items);

  if (calendarStatus(event, currentDate) !== null) throw new AppError('SALES_NOT_OPEN');

  if (event.age_rating !== 'L') {
    const minimumAge = Number(event.age_rating);
    if (ageOn(user.birthDate, currentDate) < minimumAge) {
      throw new AppError('AGE_RESTRICTED', { idade: minimumAge });
    }
  }

  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  if (quantity < 1 || quantity > MAX_TICKETS_PER_ORDER) throw new AppError('ORDER_QUANTITY_LIMIT');

  const owned = await db.query<{ total: number }>(
    `SELECT COALESCE(SUM(oi.quantity), 0)::int AS total
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
      WHERE o.user_id = $1 AND o.event_id = $2 AND o.status = 'PAID'`,
    [user.id, event.id],
  );
  if (owned.rows[0].total + quantity > MAX_TICKETS_PER_BUYER) throw new AppError('BUYER_LIMIT');

  const priced: PricedItem[] = items.map((item) => {
    const sector = sectors.get(item.sectorId)!;
    const unitPrice = item.type === 'FULL' ? sector.full_price : halfPrice(sector.full_price);
    return { ...item, unitPrice, lineTotal: unitPrice * item.quantity };
  });
  const subtotal = priced.reduce((sum, item) => sum + item.lineTotal, 0);
  const fullAmount = priced
    .filter((item) => item.type === 'FULL')
    .reduce((sum, item) => sum + item.lineTotal, 0);

  let coupon: CouponRow | null = null;
  let discount = 0;
  if (request.couponCode) {
    const couponResult = await db.query<CouponRow>(
      `SELECT id, code, percent, starts_on, ends_on, usage_limit, min_amount
         FROM coupons WHERE code = $1 ${lock ? 'FOR UPDATE' : ''}`,
      [request.couponCode.toUpperCase()],
    );
    coupon = couponResult.rows[0] ?? null;
    if (!coupon) throw new AppError('COUPON_INVALID');
    if (currentDate < coupon.starts_on || at >= localDateTime(coupon.ends_on, '00:00')) {
      throw new AppError('COUPON_EXPIRED');
    }
    const uses = await db.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM orders o
        WHERE o.coupon_id = $1 AND (o.status = 'REFUNDED' OR ${activeOrderCondition('o', '$2')})`,
      [coupon.id, at],
    );
    if (uses.rows[0].total >= coupon.usage_limit) throw new AppError('COUPON_EXHAUSTED');
    if (subtotal < coupon.min_amount) {
      throw new AppError('COUPON_MIN_AMOUNT', { valor: formatBrl(coupon.min_amount) });
    }
    if (fullAmount === 0) throw new AppError('COUPON_NOT_APPLICABLE');
    discount = percentOf(subtotal, coupon.percent);
  }

  const stock = new Map((await loadSectorStock(db, [event.id], at)).map((sector) => [sector.id, sector]));
  const requested = new Map<string, { total: number; half: number }>();
  for (const item of priced) {
    const entry = requested.get(item.sectorId) ?? { total: 0, half: 0 };
    entry.total += item.quantity;
    if (item.type === 'HALF') entry.half += item.quantity;
    requested.set(item.sectorId, entry);
  }
  for (const [sectorId, entry] of requested) {
    const sector = stock.get(sectorId)!;
    if (entry.half > 0 && sector.used_half + entry.half > halfQuota(sector.capacity)) {
      throw new AppError('HALF_PRICE_QUOTA', { setor: sector.name });
    }
  }
  for (const [sectorId, entry] of requested) {
    const sector = stock.get(sectorId)!;
    if (sector.used + entry.total > sector.capacity) {
      throw new AppError('SOLD_OUT', { setor: sector.name });
    }
  }

  const serviceFee = serviceFeeFor(subtotal);
  return {
    at,
    event,
    coupon,
    items: priced,
    subtotal,
    discount,
    serviceFee,
    total: subtotal - discount + serviceFee,
  };
}

function itemView(item: {
  sectorId: string;
  type: TicketType;
  halfPriceCategory: HalfCategory | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}) {
  return {
    sectorId: item.sectorId,
    type: item.type,
    halfPriceCategory: item.halfPriceCategory,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
  };
}

export async function quoteOrder(user: User, raw: unknown) {
  const request = parseOrderRequest(raw);
  const evaluation = await evaluateOrder(getPool(), user, request, false);
  return {
    items: evaluation.items.map(itemView),
    subtotal: evaluation.subtotal,
    discount: evaluation.discount,
    serviceFee: evaluation.serviceFee,
    total: evaluation.total,
  };
}

export async function createOrder(user: User, raw: unknown) {
  const request = parseOrderRequest(raw);
  const orderId = await withTransaction(async (client) => {
    const evaluation = await evaluateOrder(client, user, request, true);
    const deadline = new Date(evaluation.at.getTime() + PAYMENT_WINDOW_MINUTES * 60 * 1000);
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO orders (user_id, event_id, coupon_id, status, subtotal, discount, service_fee, total,
                           payment_deadline, created_at)
       VALUES ($1, $2, $3, 'AWAITING_PAYMENT', $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        user.id,
        evaluation.event.id,
        evaluation.coupon?.id ?? null,
        evaluation.subtotal,
        evaluation.discount,
        evaluation.serviceFee,
        evaluation.total,
        deadline,
        evaluation.at,
      ],
    );
    const id = inserted.rows[0].id;
    for (const [position, item] of evaluation.items.entries()) {
      await client.query(
        `INSERT INTO order_items (order_id, sector_id, type, half_price_category, quantity, unit_price,
                                  line_total, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, item.sectorId, item.type, item.halfPriceCategory, item.quantity, item.unitPrice, item.lineTotal, position],
      );
    }
    return id;
  });
  return getOrderView(getPool(), orderId);
}

// ---------------------------------------------------------------------------
// Reading orders

async function fetchOrder(db: Db, id: string, forUpdate = false): Promise<OrderRow | undefined> {
  const result = await db.query<OrderRow>(
    `SELECT ${ORDER_COLUMNS}
       FROM orders o
       LEFT JOIN coupons c ON c.id = o.coupon_id
      WHERE o.id = $1
      ${forUpdate ? 'FOR UPDATE OF o' : ''}`,
    [id],
  );
  return result.rows[0];
}

function isOverdue(order: OrderRow, at: Date): boolean {
  return order.status === 'AWAITING_PAYMENT' && order.payment_deadline.getTime() <= at.getTime();
}

async function expireIfOverdue(db: Db, order: OrderRow, at: Date): Promise<void> {
  if (!isOverdue(order, at)) return;
  await db.query(`UPDATE orders SET status = 'EXPIRED' WHERE id = $1 AND status = 'AWAITING_PAYMENT'`, [
    order.id,
  ]);
  order.status = 'EXPIRED';
}

/** Loads an order visible to the user, recording its expiration when the deadline has passed. */
async function findOrderFor(
  db: Db,
  user: User,
  id: string,
  options: { forUpdate?: boolean; adminCanSeeAll?: boolean } = {},
): Promise<OrderRow> {
  if (!isUuid(id)) throw notFound();
  const order = await fetchOrder(db, id.toLowerCase(), options.forUpdate);
  const allowed = order && (order.user_id === user.id || options.adminCanSeeAll);
  if (!order || !allowed) throw notFound();
  await expireIfOverdue(db, order, now());
  return order;
}

async function loadDetails(db: Db, orderIds: string[]) {
  const items = await db.query<ItemRow>(
    `SELECT order_id, sector_id, type, half_price_category, quantity, unit_price, line_total
       FROM order_items WHERE order_id = ANY($1::uuid[]) ORDER BY position`,
    [orderIds],
  );
  const tickets = await db.query<TicketRow>(
    `SELECT code, order_id, sector_id, type, status
       FROM tickets WHERE order_id = ANY($1::uuid[]) ORDER BY position, code`,
    [orderIds],
  );
  return { items: items.rows, tickets: tickets.rows };
}

function orderView(order: OrderRow, items: ItemRow[], tickets: TicketRow[]) {
  return {
    id: order.id,
    eventId: order.event_id,
    status: order.status,
    items: items.map((item) =>
      itemView({
        sectorId: item.sector_id,
        type: item.type,
        halfPriceCategory: item.half_price_category,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        lineTotal: item.line_total,
      }),
    ),
    couponCode: order.coupon_code,
    subtotal: order.subtotal,
    discount: order.discount,
    serviceFee: order.service_fee,
    total: order.total,
    paymentDeadline: toIso(order.payment_deadline),
    paymentAttempts: order.payment_attempts,
    paidAt: toIsoOrNull(order.paid_at),
    cardLast4: order.card_last4,
    installments: order.installments,
    refundAmount: order.refund_amount,
    tickets: tickets.map((ticket) => ({
      code: ticket.code,
      sectorId: ticket.sector_id,
      type: ticket.type,
      status: ticket.status,
    })),
    createdAt: toIso(order.created_at),
  };
}

async function getOrderView(db: Db, id: string) {
  const order = await fetchOrder(db, id);
  if (!order) throw notFound();
  const details = await loadDetails(db, [order.id]);
  return orderView(order, details.items, details.tickets);
}

export async function listOrders(user: User) {
  const pool = getPool();
  await pool.query(
    `UPDATE orders SET status = 'EXPIRED'
      WHERE user_id = $1 AND status = 'AWAITING_PAYMENT' AND payment_deadline <= $2`,
    [user.id, now()],
  );
  const orders = await pool.query<OrderRow>(
    `SELECT ${ORDER_COLUMNS}
       FROM orders o
       LEFT JOIN coupons c ON c.id = o.coupon_id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC, o.id`,
    [user.id],
  );
  const details = await loadDetails(
    pool,
    orders.rows.map((order) => order.id),
  );
  return orders.rows.map((order) =>
    orderView(
      order,
      details.items.filter((item) => item.order_id === order.id),
      details.tickets.filter((ticket) => ticket.order_id === order.id),
    ),
  );
}

export async function getOrder(user: User, id: string) {
  const pool = getPool();
  const order = await findOrderFor(pool, user, id, { adminCanSeeAll: true });
  return getOrderView(pool, order.id);
}

// ---------------------------------------------------------------------------
// Payment

interface PaymentInput {
  installments: number;
  card: { number: string; holderName: string; expiry: string; cvv: string };
}

function parsePayment(raw: unknown): PaymentInput {
  const body = asObject(raw);
  const fields: FieldErrors = {};

  const installments = body.installments;
  if (isMissing(installments)) fields.installments = REQUIRED;
  else if (
    typeof installments !== 'number' ||
    !Number.isInteger(installments) ||
    installments < 1 ||
    installments > 3
  ) {
    fields.installments = INVALID;
  }

  const card = { number: '', holderName: '', expiry: '', cvv: '' };
  if (isMissing(body.card)) fields.card = REQUIRED;
  else if (typeof body.card !== 'object' || Array.isArray(body.card)) fields.card = INVALID;
  else {
    const rawCard = body.card as Record<string, unknown>;
    const checks: Array<[keyof typeof card, (value: string) => boolean]> = [
      ['number', (value) => /^\d{16}$/.test(value)],
      [
        'holderName',
        (value) => {
          const length = charLength(value.trim());
          return length >= 3 && length <= 50;
        },
      ],
      ['expiry', (value) => /^(0[1-9]|1[0-2])\/\d{2}$/.test(value)],
      ['cvv', (value) => /^\d{3}$/.test(value)],
    ];
    for (const [key, isValid] of checks) {
      const value = rawCard[key];
      if (isMissing(value)) fields[`card.${key}`] = REQUIRED;
      else if (typeof value !== 'string' || !isValid(value)) fields[`card.${key}`] = INVALID;
      else card[key] = key === 'holderName' ? value.trim() : value;
    }
  }

  if (Object.keys(fields).length > 0) throw validationError(fields);
  return { installments: installments as number, card };
}

export function passesLuhn(number: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = Number(number[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function isCardExpired(expiry: string, at: Date): boolean {
  const [month, year] = expiry.split('/').map(Number);
  const current = currentYearMonth(at);
  const fullYear = 2000 + year;
  return fullYear < current.year || (fullYear === current.year && month < current.month);
}

function newTicketCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += TICKET_ALPHABET[randomInt(TICKET_ALPHABET.length)];
  }
  return code;
}

async function issueTickets(client: PoolClient, orderId: string): Promise<void> {
  const items = await client.query<ItemRow>(
    'SELECT sector_id, type, quantity FROM order_items WHERE order_id = $1 ORDER BY position',
    [orderId],
  );
  let position = 0;
  for (const item of items.rows) {
    for (let unit = 0; unit < item.quantity; unit++) {
      let inserted = false;
      while (!inserted) {
        const result = await client.query(
          `INSERT INTO tickets (code, order_id, sector_id, type, status, position)
           VALUES ($1, $2, $3, $4, 'VALID', $5)
           ON CONFLICT (code) DO NOTHING`,
          [newTicketCode(), orderId, item.sector_id, item.type, position],
        );
        inserted = result.rowCount === 1;
      }
      position++;
    }
  }
}

/** Runs the work in a transaction; a returned AppError is committed first and then thrown. */
async function transactional<T>(work: (client: PoolClient) => Promise<T | AppError>): Promise<T> {
  const result = await withTransaction(work);
  if (result instanceof AppError) throw result;
  return result;
}

export async function payOrder(user: User, id: string, raw: unknown) {
  const pool = getPool();
  const visible = await findOrderFor(pool, user, id);
  const payment = parsePayment(raw);

  await transactional(async (client) => {
    await client.query('SELECT 1 FROM events WHERE id = $1 FOR KEY SHARE', [visible.event_id]);
    const order = (await fetchOrder(client, visible.id, true))!;
    const at = now();

    if (isOverdue(order, at)) {
      await expireIfOverdue(client, order, at);
      return new AppError('PAYMENT_EXPIRED');
    }
    if (order.status === 'EXPIRED') return new AppError('PAYMENT_EXPIRED');
    if (order.status !== 'AWAITING_PAYMENT') return new AppError('INVALID_ORDER_STATE');

    if (!passesLuhn(payment.card.number) || isCardExpired(payment.card.expiry, at)) {
      return new AppError('CARD_INVALID');
    }
    if (payment.installments > 1 && order.total <= MIN_INSTALLMENT_TOTAL) {
      return new AppError('INSTALLMENTS_NOT_ALLOWED');
    }

    const result = await charge({
      amount: order.total,
      installments: payment.installments,
      card: payment.card,
    });

    if (result.status === 'unavailable') return new AppError('PAYMENT_UNAVAILABLE');

    if (result.status === 'declined') {
      const attempts = order.payment_attempts + 1;
      const failed = attempts > MAX_DECLINED_ATTEMPTS;
      await client.query('UPDATE orders SET payment_attempts = $2, status = $3 WHERE id = $1', [
        order.id,
        attempts,
        failed ? 'FAILED' : 'AWAITING_PAYMENT',
      ]);
      return new AppError('PAYMENT_DECLINED', { n: Math.max(0, MAX_DECLINED_ATTEMPTS - attempts) });
    }

    await client.query(
      `UPDATE orders
          SET status = 'PAID', paid_at = $2,
              card_last4 = $3, installments = $4
        WHERE id = $1`,
      [order.id, now(), payment.card.number.slice(-4), payment.installments],
    );
    await issueTickets(client, order.id);
    return true;
  });

  return getOrderView(pool, visible.id);
}

// ---------------------------------------------------------------------------
// Cancellation and refund

export type RefundDecision =
  | { allowed: true; refundAmount: number; reason: null }
  | {
      allowed: false;
      refundAmount: 0;
      reason: 'CANCELLATION_WINDOW' | 'TICKET_USED_CANCELLATION' | 'INVALID_ORDER_STATE';
    };

function refundDecision(order: OrderRow, event: EventRow, tickets: TicketRow[], currentDate: string): RefundDecision {
  if (order.status !== 'PAID') {
    return { allowed: false, refundAmount: 0, reason: 'INVALID_ORDER_STATE' };
  }
  if (tickets.some((ticket) => ticket.status === 'USED')) {
    return { allowed: false, refundAmount: 0, reason: 'TICKET_USED_CANCELLATION' };
  }
  const daysBefore = daysBetween(currentDate, eventDate(event));
  if (daysBefore < 2) {
    return { allowed: false, refundAmount: 0, reason: 'CANCELLATION_WINDOW' };
  }
  const daysSincePayment = order.paid_at ? daysBetween(localDate(order.paid_at), currentDate) : 0;
  const ticketsAmount = order.subtotal - order.discount;
  if (daysSincePayment <= 7) {
    return { allowed: true, refundAmount: ticketsAmount, reason: null };
  }
  const percent = daysBefore > 7 ? 80 : 50;
  return { allowed: true, refundAmount: percentOf(ticketsAmount, percent), reason: null };
}

async function loadEvent(db: Db, eventId: string): Promise<EventRow> {
  const result = await db.query<EventRow>(`SELECT ${EVENT_COLUMNS} FROM events e WHERE e.id = $1`, [eventId]);
  return result.rows[0];
}

export async function refundQuote(user: User, id: string) {
  const pool = getPool();
  const order = await findOrderFor(pool, user, id);
  const event = await loadEvent(pool, order.event_id);
  const { tickets } = await loadDetails(pool, [order.id]);
  return refundDecision(order, event, tickets, today());
}

export async function cancelOrder(user: User, id: string) {
  const pool = getPool();
  const visible = await findOrderFor(pool, user, id);

  await transactional(async (client) => {
    const order = (await fetchOrder(client, visible.id, true))!;
    const at = now();
    await expireIfOverdue(client, order, at);

    if (order.status !== 'PAID') {
      await client.query(`UPDATE orders SET status = 'CANCELED' WHERE id = $1`, [order.id]);
      return true;
    }

    const event = await loadEvent(client, order.event_id);
    const { tickets } = await loadDetails(client, [order.id]);
    const decision = refundDecision(order, event, tickets, today(at));
    if (!decision.allowed) return new AppError(decision.reason);

    await client.query(`UPDATE orders SET status = 'REFUNDED', refund_amount = $2 WHERE id = $1`, [
      order.id,
      decision.refundAmount,
    ]);
    await client.query(`UPDATE tickets SET status = 'CANCELED' WHERE order_id = $1 AND status = 'VALID'`, [
      order.id,
    ]);
    return true;
  });

  return getOrderView(pool, visible.id);
}

// ---------------------------------------------------------------------------
// Administration

export async function cancelEvent(id: string): Promise<void> {
  if (!isUuid(id)) throw notFound();
  await transactional(async (client) => {
    const found = await client.query<EventRow>(
      `SELECT ${EVENT_COLUMNS} FROM events e WHERE e.id = $1 FOR UPDATE`,
      [id.toLowerCase()],
    );
    const event = found.rows[0];
    if (!event) return notFound();
    const at = now();
    if (event.canceled_at || eventDate(event) < today(at)) {
      return new AppError('EVENT_CANCEL_NOT_ALLOWED');
    }

    await client.query('UPDATE events SET canceled_at = $2 WHERE id = $1', [event.id, at]);
    await client.query(
      `UPDATE orders SET status = 'EXPIRED'
        WHERE event_id = $1 AND status = 'AWAITING_PAYMENT' AND payment_deadline <= $2`,
      [event.id, at],
    );
    await client.query(
      `UPDATE orders SET status = 'CANCELED' WHERE event_id = $1 AND status = 'AWAITING_PAYMENT'`,
      [event.id],
    );
    await client.query(
      `UPDATE orders SET status = 'REFUNDED', refund_amount = total WHERE event_id = $1 AND status = 'PAID'`,
      [event.id],
    );
    await client.query(
      `UPDATE tickets t SET status = 'CANCELED'
         FROM orders o
        WHERE o.id = t.order_id AND o.event_id = $1 AND t.status = 'VALID'`,
      [event.id],
    );
    return true;
  });
}

export async function checkIn(code: string) {
  return transactional(async (client) => {
    const found = await client.query<{ event_id: string }>(
      'SELECT o.event_id FROM tickets t JOIN orders o ON o.id = t.order_id WHERE t.code = $1',
      [code],
    );
    if (!found.rows[0]) return notFound();
    const eventResult = await client.query<EventRow>(
      `SELECT ${EVENT_COLUMNS} FROM events e WHERE e.id = $1 FOR KEY SHARE`,
      [found.rows[0].event_id],
    );
    const event = eventResult.rows[0];
    const ticketResult = await client.query<TicketRow>(
      `SELECT t.code, t.order_id, t.sector_id, t.type, t.status
         FROM tickets t
        WHERE t.code = $1
        FOR UPDATE`,
      [code],
    );
    const ticket = ticketResult.rows[0];

    if (ticket.status === 'USED') return new AppError('TICKET_ALREADY_USED');
    const at = now();
    if (eventDate(event) !== today(at)) return new AppError('CHECKIN_WINDOW');

    await client.query(`UPDATE tickets SET status = 'USED', used_at = $2 WHERE code = $1`, [ticket.code, at]);
    return { code: ticket.code, sectorId: ticket.sector_id, type: ticket.type, status: 'USED' as const };
  });
}
