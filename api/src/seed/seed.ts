import bcrypt from 'bcryptjs';
import { withTransaction } from '../db/pool';
import { percentOf } from '../money';
import { PAYMENT_WINDOW_MINUTES, serviceFeeFor } from '../orders';
import { PASSWORD_HASH_ROUNDS } from '../routes/auth';
import { localDateTime, now, today } from '../time';
import { buildSeedData } from './data';
import { stableId } from './ids';

const PAYMENT_TIME = '10:00';
const MINUTES_BEFORE_PAYMENT = 5;
const SEED_CARD_LAST4 = '1111';

/** Wipes every table and loads the initial data, with dates relative to the current day. */
export async function seedDatabase(): Promise<void> {
  const seededAt = now();
  const data = buildSeedData(today(seededAt));

  const hashes = new Map<string, string>();
  for (const user of data.users) {
    hashes.set(user.key, await bcrypt.hash(user.password, PASSWORD_HASH_ROUNDS));
  }

  await withTransaction(async (client) => {
    await client.query(
      'TRUNCATE tickets, order_items, orders, coupons, sectors, events, sessions, login_attempts, users CASCADE',
    );

    for (const user of data.users) {
      await client.query(
        `INSERT INTO users (id, name, email, cpf, birth_date, password_hash, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [stableId(`user:${user.key}`), user.name, user.email, user.cpf, user.birthDate, hashes.get(user.key), user.role],
      );
    }

    const sectorPrices = new Map<string, number>();
    const eventStarts = new Map<string, Date>();
    for (const event of data.events) {
      const eventId = stableId(`event:${event.key}`);
      const startsAt = localDateTime(event.startDate, event.startTime);
      eventStarts.set(event.key, startsAt);
      await client.query(
        `INSERT INTO events (id, name, venue, description, age_rating, sales_open_on, starts_at, canceled_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          eventId,
          event.name,
          event.venue,
          event.description,
          event.ageRating,
          event.salesOpenOn,
          startsAt,
          event.canceled ? seededAt : null,
        ],
      );
      for (const [position, sector] of event.sectors.entries()) {
        sectorPrices.set(`${event.key}/${sector.key}`, sector.fullPrice);
        await client.query(
          `INSERT INTO sectors (id, event_id, name, full_price, capacity, position)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [stableId(`sector:${event.key}/${sector.key}`), eventId, sector.name, sector.fullPrice, sector.capacity, position],
        );
      }
    }

    const couponPercents = new Map<string, number>();
    for (const coupon of data.coupons) {
      couponPercents.set(coupon.code, coupon.percent);
      await client.query(
        `INSERT INTO coupons (id, code, percent, starts_on, ends_on, usage_limit, min_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          stableId(`coupon:${coupon.code}`),
          coupon.code,
          coupon.percent,
          coupon.startsOn,
          coupon.endsOn,
          coupon.usageLimit,
          coupon.minAmount,
        ],
      );
    }

    for (const order of data.orders) {
      const orderId = stableId(`order:${order.key}`);
      const sectorId = stableId(`sector:${order.eventKey}/${order.sectorKey}`);
      const unitPrice = sectorPrices.get(`${order.eventKey}/${order.sectorKey}`)!;
      const subtotal = unitPrice * order.quantity;
      const discount = order.couponCode ? percentOf(subtotal, couponPercents.get(order.couponCode)!) : 0;
      const serviceFee = serviceFeeFor(subtotal - discount);
      const total = subtotal - discount + serviceFee;

      const paidAt = order.paidAtSeedMoment
        ? seededAt
        : order.paidOn
          ? localDateTime(order.paidOn, PAYMENT_TIME)
          : null;
      const createdAt = paidAt
        ? new Date(paidAt.getTime() - MINUTES_BEFORE_PAYMENT * 60000)
        : new Date(seededAt.getTime() - (order.createdMinutesAgo ?? 0) * 60000);
      const deadline = new Date(createdAt.getTime() + PAYMENT_WINDOW_MINUTES * 60000);

      await client.query(
        `INSERT INTO orders (id, user_id, event_id, coupon_id, status, subtotal, discount, service_fee, total,
                             payment_deadline, payment_attempts, paid_at, card_last4, installments, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          orderId,
          stableId(`user:${order.userKey}`),
          stableId(`event:${order.eventKey}`),
          order.couponCode ? stableId(`coupon:${order.couponCode}`) : null,
          paidAt ? 'PAID' : 'AWAITING_PAYMENT',
          subtotal,
          discount,
          serviceFee,
          total,
          deadline,
          0,
          paidAt,
          paidAt ? SEED_CARD_LAST4 : null,
          paidAt ? 1 : null,
          createdAt,
        ],
      );
      await client.query(
        `INSERT INTO order_items (order_id, sector_id, type, half_price_category, quantity, unit_price, line_total, position)
         VALUES ($1, $2, 'FULL', NULL, $3, $4, $5, 0)`,
        [orderId, sectorId, order.quantity, unitPrice, subtotal],
      );
      for (const [position, ticket] of order.tickets.entries()) {
        await client.query(
          `INSERT INTO tickets (code, order_id, sector_id, type, status, used_at, position)
           VALUES ($1, $2, $3, 'FULL', $4, $5, $6)`,
          [
            ticket.code,
            orderId,
            sectorId,
            ticket.used ? 'USED' : 'VALID',
            ticket.used ? eventStarts.get(order.eventKey) : null,
            position,
          ],
        );
      }
    }
  });
}
