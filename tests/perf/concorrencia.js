// Compras simultâneas: 50 compradores diferentes pedem 1 inteira da Plateia de O Último Ato ao mesmo tempo.
import http from 'k6/http';
import { check } from 'k6';

const API_URL = __ENV.API_URL || 'http://localhost:3001';
const BUYERS = 50;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const options = {
  scenarios: {
    compras: { executor: 'per-vu-iterations', vus: BUYERS, iterations: 1, maxDuration: '1m' },
  },
  thresholds: {
    checks: ['rate==1.0'],
  },
};

function randomCpf() {
  let digits;
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

export function setup() {
  const events = http.get(`${API_URL}/events`).json();
  const summary = events.find((event) => event.name === 'O Último Ato');
  const event = http.get(`${API_URL}/events/${summary.id}`).json();
  const sector = event.sectors.find((s) => s.name === 'Plateia');

  const tokens = [];
  for (let i = 0; i < BUYERS; i++) {
    const email = `carga.${Date.now()}.${i}@teste.local`;
    const user = { name: `Comprador ${i}`, email, cpf: randomCpf(), birthDate: '1990-01-01', password: 'Senha123' };
    http.post(`${API_URL}/auth/register`, JSON.stringify(user), { headers: JSON_HEADERS });
    const login = http.post(`${API_URL}/auth/login`, JSON.stringify({ email, password: 'Senha123' }), {
      headers: JSON_HEADERS,
    });
    tokens.push(login.json('token'));
  }
  return { eventId: event.id, sectorId: sector.id, tokens };
}

export default function (data) {
  const token = data.tokens[__VU - 1];
  const body = { eventId: data.eventId, items: [{ sectorId: data.sectorId, type: 'FULL', quantity: 1 }] };
  const res = http.post(`${API_URL}/orders`, JSON.stringify(body), {
    headers: { ...JSON_HEADERS, Authorization: `Bearer ${token}` },
  });

  check(res, {
    'pedido criado ou setor esgotado': (r) => [200, 201, 409].includes(r.status),
  });
}
