import { Router } from 'express';
import { requireAdmin } from '../auth';
import { getPool } from '../db/pool';
import { FieldErrors, notFound, validationError } from '../errors';
import { EVENT_COLUMNS, eventDetail, EventRow, loadSectorStock } from '../events';
import { cancelEvent, checkIn } from '../orders';
import { now, today } from '../time';
import { asObject, INVALID, isMissing, REQUIRED } from '../validation';
import { normalizeEmail } from './auth';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.post('/events/:id/cancel', async (req, res) => {
  await cancelEvent(req.params.id);
  const pool = getPool();
  const at = now();
  const found = await pool.query<EventRow>(`SELECT ${EVENT_COLUMNS} FROM events e WHERE e.id = $1`, [
    req.params.id.toLowerCase(),
  ]);
  if (!found.rows[0]) throw notFound();
  const stock = await loadSectorStock(pool, [found.rows[0].id], at);
  res.json(eventDetail(found.rows[0], stock, today(at)));
});

adminRouter.post('/tickets/:code/check-in', async (req, res) => {
  res.json(await checkIn(req.params.code));
});

adminRouter.post('/login-locks/unlock', async (req, res) => {
  const body = asObject(req.body);
  const fields: FieldErrors = {};
  if (isMissing(body.email) || body.email === '') fields.email = REQUIRED;
  else if (typeof body.email !== 'string') fields.email = INVALID;
  if (Object.keys(fields).length > 0) throw validationError(fields);

  await getPool().query(
    `UPDATE login_attempts SET failed_count = 0, locked = false, updated_at = now() WHERE email = $1`,
    [normalizeEmail(body.email as string)],
  );
  res.status(204).end();
});
