// Carga de consulta: 50 usuários virtuais por 2 minutos alternando a lista e o detalhe de eventos.
import http from 'k6/http';
import { check, sleep } from 'k6';

const API_URL = __ENV.API_URL || 'http://localhost:3001';

export const options = {
  vus: 50,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const events = http.get(`${API_URL}/events`).json();
  return { ids: events.map((event) => event.id) };
}

export default function (data) {
  const list = http.get(`${API_URL}/events`, { tags: { name: 'GET /events' } });
  check(list, { 'lista responde 200': (r) => r.status === 200 });

  const id = data.ids[Math.floor(Math.random() * data.ids.length)];
  const detail = http.get(`${API_URL}/events/${id}`, { tags: { name: 'GET /events/{id}' } });
  check(detail, { 'detalhe responde 200': (r) => r.status === 200 });

  sleep(1);
}
