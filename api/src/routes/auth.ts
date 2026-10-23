import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { createSession } from '../auth';
import { getPool, withTransaction } from '../db/pool';
import { AppError, FieldErrors, validationError } from '../errors';
import { isValidDate, toIso, today } from '../time';
import { toUser, USER_COLUMNS, UserRow } from '../users';
import { asObject, charLength, INVALID, isMissing, REQUIRED } from '../validation';

export const MIN_REGISTRATION_AGE = 16;
export const MAX_FAILED_LOGINS = 5;
export const PASSWORD_HASH_ROUNDS = 10;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const CPF_FORMATTED = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const CPF_DIGITS = /^\d{11}$/;

export function isValidCpf(digits: string): boolean {
  if (!CPF_DIGITS.test(digits)) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  const numbers = digits.split('').map(Number);
  for (const length of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += numbers[i] * (length + 1 - i);
    }
    const check = ((sum * 10) % 11) % 10;
    if (check !== numbers[length]) return false;
  }
  return true;
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase();
}

interface RegistrationInput {
  name: string;
  email: string;
  cpf: string;
  birthDate: string;
  password: string;
}

function parseRegistration(raw: unknown): RegistrationInput {
  const body = asObject(raw);
  const fields: FieldErrors = {};
  const currentDate = today();

  let name = '';
  if (isMissing(body.name)) fields.name = REQUIRED;
  else if (typeof body.name !== 'string') fields.name = INVALID;
  else {
    name = body.name.trim();
    const length = charLength(name);
    if (length < 3 || length >= 100) fields.name = INVALID;
  }

  let email = '';
  if (isMissing(body.email)) fields.email = REQUIRED;
  else if (typeof body.email !== 'string') fields.email = INVALID;
  else {
    email = body.email;
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) fields.email = INVALID;
  }

  let cpf = '';
  if (isMissing(body.cpf)) fields.cpf = REQUIRED;
  else if (typeof body.cpf !== 'string') fields.cpf = INVALID;
  else if (!CPF_FORMATTED.test(body.cpf) && !CPF_DIGITS.test(body.cpf)) fields.cpf = INVALID;
  else {
    cpf = body.cpf.replace(/\D/g, '');
    if (!isValidCpf(cpf)) fields.cpf = INVALID;
  }

  let birthDate = '';
  if (isMissing(body.birthDate)) fields.birthDate = REQUIRED;
  else if (typeof body.birthDate !== 'string' || !isValidDate(body.birthDate)) fields.birthDate = INVALID;
  else {
    birthDate = body.birthDate;
    if (birthDate > currentDate) fields.birthDate = INVALID;
  }

  let password = '';
  if (isMissing(body.password)) fields.password = REQUIRED;
  else if (typeof body.password !== 'string') fields.password = INVALID;
  else {
    password = body.password;
    const length = charLength(password);
    if (length < 8 || length > 64 || !/\p{L}/u.test(password) || !/[0-9]/.test(password)) {
      fields.password = INVALID;
    }
  }

  if (Object.keys(fields).length > 0) throw validationError(fields);
  return { name, email: normalizeEmail(email), cpf, birthDate, password };
}

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const input = parseRegistration(req.body);

  const age = Number(today().slice(0, 4)) - Number(input.birthDate.slice(0, 4));
  if (age < MIN_REGISTRATION_AGE) {
    throw new AppError('UNDERAGE_REGISTRATION');
  }

  const pool = getPool();
  const emailTaken = await pool.query('SELECT 1 FROM users WHERE email = $1', [input.email]);
  if (emailTaken.rowCount) throw new AppError('EMAIL_IN_USE');
  const cpfTaken = await pool.query('SELECT 1 FROM users WHERE cpf = $1', [input.cpf]);
  if (cpfTaken.rowCount) throw new AppError('CPF_IN_USE');

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);
  try {
    const result = await pool.query<UserRow>(
      `INSERT INTO users AS u (name, email, cpf, birth_date, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'BUYER')
       RETURNING ${USER_COLUMNS}`,
      [input.name, input.email, input.cpf, input.birthDate, passwordHash],
    );
    res.status(201).json(toUser(result.rows[0]));
  } catch (err) {
    const pgError = err as { code?: string; constraint?: string };
    if (pgError.code === '23505' && pgError.constraint === 'users_email_key') {
      throw new AppError('EMAIL_IN_USE');
    }
    if (pgError.code === '23505' && pgError.constraint === 'users_cpf_key') {
      throw new AppError('CPF_IN_USE');
    }
    throw err;
  }
});

authRouter.post('/login', async (req, res) => {
  const body = asObject(req.body);
  const fields: FieldErrors = {};
  for (const key of ['email', 'password'] as const) {
    const value = body[key];
    if (isMissing(value) || value === '') fields[key] = REQUIRED;
    else if (typeof value !== 'string') fields[key] = INVALID;
  }
  if (Object.keys(fields).length > 0) throw validationError(fields);

  const email = normalizeEmail(body.email as string);
  const password = body.password as string;

  const outcome = await withTransaction(async (client) => {
    await client.query('INSERT INTO login_attempts (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [
      email,
    ]);
    const attempt = await client.query<{ locked: boolean }>(
      'SELECT locked FROM login_attempts WHERE email = $1 FOR UPDATE',
      [email],
    );
    if (attempt.rows[0].locked) return { error: new AppError('LOGIN_LOCKED') };

    const found = await client.query<UserRow & { password_hash: string }>(
      `SELECT ${USER_COLUMNS}, u.password_hash FROM users u WHERE u.email = $1`,
      [email],
    );
    const user = found.rows[0];
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!valid) {
      const updated = await client.query<{ locked: boolean }>(
        `UPDATE login_attempts
            SET failed_count = failed_count + 1,
                locked = failed_count >= $2,
                updated_at = now()
          WHERE email = $1
          RETURNING locked`,
        [email, MAX_FAILED_LOGINS],
      );
      return {
        error: new AppError(updated.rows[0].locked ? 'LOGIN_LOCKED' : 'INVALID_CREDENTIALS'),
      };
    }

    await client.query(
      'UPDATE login_attempts SET failed_count = 0, locked = false, updated_at = now() WHERE email = $1',
      [email],
    );
    const session = await createSession(client, user.id);
    return { session, user };
  });

  if ('error' in outcome) throw outcome.error;
  res.json({
    token: outcome.session.token,
    expiresAt: toIso(outcome.session.expiresAt),
    user: toUser(outcome.user),
  });
});
