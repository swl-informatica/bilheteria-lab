import { clearSession, getToken } from './session.js';

const NETWORK_ERROR_MESSAGE = 'Não foi possível conectar ao servidor. Tente novamente.';
const UNKNOWN_ERROR_MESSAGE = 'Erro inesperado. Tente novamente.';

function baseUrl() {
  const configured = window.APP_CONFIG && window.APP_CONFIG.apiUrl;
  return String(configured || '').replace(/\/+$/, '');
}

export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields || {};
    this.sessionExpired = false;
  }
}

async function request(method, path, { body, auth = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE, {});
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (response.ok) return data;

  const payload = (data && data.error) || {};
  const error = new ApiError(
    response.status,
    payload.code || 'UNKNOWN',
    payload.message || UNKNOWN_ERROR_MESSAGE,
    payload.fields,
  );
  if (auth && response.status === 401) {
    error.sessionExpired = true;
    clearSession();
    window.dispatchEvent(new CustomEvent('session-expired'));
  }
  throw error;
}

const encode = encodeURIComponent;

export const api = {
  register: (body) => request('POST', '/auth/register', { body }),
  login: (body) => request('POST', '/auth/login', { body }),
  listEvents: () => request('GET', '/events'),
  getEvent: (id) => request('GET', `/events/${encode(id)}`),
  quoteOrder: (body) => request('POST', '/orders/quote', { body, auth: true }),
  createOrder: (body) => request('POST', '/orders', { body, auth: true }),
  listOrders: () => request('GET', '/orders', { auth: true }),
  getOrder: (id) => request('GET', `/orders/${encode(id)}`, { auth: true }),
  payOrder: (id, body) => request('POST', `/orders/${encode(id)}/payment`, { body, auth: true }),
  refundQuote: (id) => request('GET', `/orders/${encode(id)}/refund-quote`, { auth: true }),
  cancelOrder: (id) => request('POST', `/orders/${encode(id)}/cancel`, { auth: true }),
};
