import { APIRequestContext, expect } from '@playwright/test';

export const DEFAULT_PASSWORD = 'Senha123';

export const CARDS = {
  approved: '4111111111111111',
  declined: '4111111100000002',
};

export type Buyer = { name: string; email: string; cpf: string; password: string; token: string };

// Gera um CPF fictício com dígitos verificadores válidos.
export function randomCpf(): string {
  let digits: number[];
  do {
    digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  } while (digits.every((d) => d === digits[0]));
  for (const length of [9, 10]) {
    const sum = digits.slice(0, length).reduce((acc, d, i) => acc + d * (length + 1 - i), 0);
    const rest = (sum * 10) % 11;
    digits.push(rest === 10 ? 0 : rest);
  }
  return digits.join('');
}

export function uniqueEmail(): string {
  return `comprador.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@teste.local`;
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function login(request: APIRequestContext, email: string, password = DEFAULT_PASSWORD) {
  const response = await request.post('/auth/login', { data: { email, password } });
  expect(response.status()).toBe(200);
  const body = await response.json();
  return body.token as string;
}

// Cadastra um comprador novo, só deste teste, e devolve o token.
export async function newBuyer(request: APIRequestContext): Promise<Buyer> {
  const data = {
    name: 'Comprador Teste',
    email: uniqueEmail(),
    cpf: randomCpf(),
    birthDate: '1990-01-01',
    password: DEFAULT_PASSWORD,
  };
  const response = await request.post('/auth/register', { data });
  expect(response.status()).toBe(201);
  const token = await login(request, data.email, data.password);
  return { ...data, token };
}

export async function findEvent(request: APIRequestContext, name: string) {
  const response = await request.get('/events');
  const events = await response.json();
  const summary = events.find((event: { name: string }) => event.name === name);
  expect(summary, `evento ${name}`).toBeTruthy();
  const detail = await request.get(`/events/${summary.id}`);
  return detail.json();
}

export function sectorId(event: { sectors: { id: string; name: string }[] }, name: string): string {
  const sector = event.sectors.find((s) => s.name === name);
  expect(sector, `setor ${name}`).toBeTruthy();
  return sector!.id;
}

export async function createOrder(
  request: APIRequestContext,
  token: string,
  eventId: string,
  items: Record<string, unknown>[],
  couponCode?: string,
) {
  const response = await request.post('/orders', {
    headers: auth(token),
    data: { eventId, items, ...(couponCode ? { couponCode } : {}) },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

export const EVENTS = {
  festival: 'Festival Sons do Cerrado',
  standUp: 'Noite do Stand-up',
  ultimoAto: 'O Último Ato',
  acustico: 'Acústico ao Entardecer',
  orquestra: 'Orquestra em Concerto',
  feiraGeek: 'Feira Geek',
  rodaDeSamba: 'Roda de Samba',
};
