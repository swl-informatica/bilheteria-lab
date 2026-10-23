import { createHash, randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errors';
import { Db, getPool } from './db/pool';
import { now } from './time';
import { toUser, User, USER_COLUMNS, UserRow } from './users';

export const SESSION_HOURS = 8;

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(db: Db, userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now().getTime() + SESSION_HOURS * 60 * 60 * 1000);
  await db.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [
    hashToken(token),
    userId,
    expiresAt,
  ]);
  return { token, expiresAt };
}

async function userFromRequest(req: Request): Promise<User | undefined> {
  const header = req.headers.authorization;
  if (!header) return undefined;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  if (!match) return undefined;
  const result = await getPool().query<UserRow>(
    `SELECT ${USER_COLUMNS}
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > $2`,
    [hashToken(match[1]), now()],
  );
  return result.rows[0] ? toUser(result.rows[0]) : undefined;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const user = await userFromRequest(req);
  if (!user) throw new AppError('UNAUTHORIZED');
  req.user = user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, () => undefined);
  if (req.user?.role !== 'ADMIN') throw new AppError('FORBIDDEN');
  next();
}

export function currentUser(req: Request): User {
  if (!req.user) throw new AppError('UNAUTHORIZED');
  return req.user;
}
