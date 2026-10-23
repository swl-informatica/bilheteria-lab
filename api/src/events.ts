import { Db } from './db/pool';
import { localDate, toIso } from './time';

export type SalesStatus = 'CANCELED' | 'HELD' | 'SALES_CLOSED' | 'UPCOMING' | 'SOLD_OUT' | 'ON_SALE';

export interface EventRow {
  id: string;
  name: string;
  venue: string;
  description: string;
  age_rating: string;
  sales_open_on: string;
  starts_at: Date;
  canceled_at: Date | null;
}

export interface SectorStock {
  id: string;
  event_id: string;
  name: string;
  full_price: number;
  capacity: number;
  used: number;
  used_half: number;
}

export interface SectorView {
  id: string;
  name: string;
  fullPrice: number;
  halfPrice: number;
  capacity: number;
  available: number;
  halfAvailable: number;
}

export const EVENT_COLUMNS =
  'e.id, e.name, e.venue, e.description, e.age_rating, e.sales_open_on, e.starts_at, e.canceled_at';

/** Condition for orders that hold capacity: paid, or awaiting payment within the deadline. */
export function activeOrderCondition(alias: string, nowParam: string): string {
  return `(${alias}.status = 'PAID' OR (${alias}.status = 'AWAITING_PAYMENT' AND ${alias}.payment_deadline > ${nowParam}))`;
}

export function halfPrice(fullPrice: number): number {
  return Math.floor(fullPrice / 2);
}

export function halfQuota(capacity: number): number {
  return Math.round((capacity * 40) / 100);
}

export function eventDate(event: EventRow): string {
  return localDate(event.starts_at);
}

/** Status that depends only on dates and cancellation; null means sales are open. */
export function calendarStatus(event: EventRow, currentDate: string): SalesStatus | null {
  if (event.canceled_at) return 'CANCELED';
  const date = eventDate(event);
  if (date < currentDate) return 'HELD';
  if (date === currentDate) return 'SALES_CLOSED';
  if (currentDate < event.sales_open_on) return 'UPCOMING';
  return null;
}

export function sectorView(sector: SectorStock): SectorView {
  const available = Math.max(0, sector.capacity - sector.used);
  const halfLeft = Math.max(0, halfQuota(sector.capacity) - sector.used_half);
  return {
    id: sector.id,
    name: sector.name,
    fullPrice: sector.full_price,
    halfPrice: halfPrice(sector.full_price),
    capacity: sector.capacity,
    available,
    halfAvailable: Math.min(halfLeft, available),
  };
}

export function salesStatus(event: EventRow, sectors: SectorStock[], currentDate: string): SalesStatus {
  const status = calendarStatus(event, currentDate);
  if (status) return status;
  if (sectors.every((sector) => sectorView(sector).available === 0)) return 'SOLD_OUT';
  return 'ON_SALE';
}

export async function loadSectorStock(db: Db, eventIds: string[], at: Date): Promise<SectorStock[]> {
  if (eventIds.length === 0) return [];
  const result = await db.query<SectorStock>(
    `SELECT s.id, s.event_id, s.name, s.full_price, s.capacity,
            COALESCE(SUM(oi.quantity) FILTER (WHERE o.id IS NOT NULL), 0)::int AS used,
            COALESCE(SUM(oi.quantity) FILTER (WHERE o.id IS NOT NULL AND oi.type = 'HALF'), 0)::int AS used_half
       FROM sectors s
       LEFT JOIN order_items oi ON oi.sector_id = s.id
       LEFT JOIN orders o ON o.id = oi.order_id AND ${activeOrderCondition('o', '$2')}
      WHERE s.event_id = ANY($1::uuid[])
      GROUP BY s.id
      ORDER BY s.position, s.name`,
    [eventIds, at],
  );
  return result.rows;
}

export function eventSummary(event: EventRow, sectors: SectorStock[], currentDate: string) {
  return {
    id: event.id,
    name: event.name,
    venue: event.venue,
    startsAt: toIso(event.starts_at),
    ageRating: event.age_rating,
    salesStatus: salesStatus(event, sectors, currentDate),
    minPrice: sectors.length ? Math.min(...sectors.map((sector) => sector.full_price)) : 0,
  };
}

export function eventDetail(event: EventRow, sectors: SectorStock[], currentDate: string) {
  return {
    ...eventSummary(event, sectors, currentDate),
    salesOpenOn: event.sales_open_on,
    description: event.description,
    sectors: sectors.map(sectorView),
  };
}
