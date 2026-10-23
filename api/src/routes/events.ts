import { Router } from 'express';
import { getPool } from '../db/pool';
import { notFound } from '../errors';
import { EVENT_COLUMNS, eventDetail, EventRow, eventSummary, loadSectorStock, SectorStock } from '../events';
import { now, today } from '../time';
import { isUuid } from '../validation';

export const eventsRouter = Router();

eventsRouter.get('/', async (_req, res) => {
  const pool = getPool();
  const at = now();
  const events = await pool.query<EventRow>(
    `SELECT ${EVENT_COLUMNS} FROM events e ORDER BY e.starts_at, e.name`,
  );
  const stock = await loadSectorStock(
    pool,
    events.rows.map((event) => event.id),
    at,
  );
  const byEvent = new Map<string, SectorStock[]>();
  for (const sector of stock) {
    const list = byEvent.get(sector.event_id) ?? [];
    list.push(sector);
    byEvent.set(sector.event_id, list);
  }
  const currentDate = today(at);
  res.json(events.rows.map((event) => eventSummary(event, byEvent.get(event.id) ?? [], currentDate)));
});

eventsRouter.get('/:id', async (req, res) => {
  const id = req.params.id;
  if (!isUuid(id)) throw notFound();
  const pool = getPool();
  const at = now();
  const found = await pool.query<EventRow>(`SELECT ${EVENT_COLUMNS} FROM events e WHERE e.id = $1`, [id]);
  const event = found.rows[0];
  if (!event) throw notFound();
  const stock = await loadSectorStock(pool, [event.id], at);
  res.json(eventDetail(event, stock, today(at)));
});
