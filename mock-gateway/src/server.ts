import { randomInt } from 'node:crypto';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';

const port = Number(process.env.MOCK_GATEWAY_PORT || 8080);
const SLOW_RESPONSE_MS = 10_000;
const MAX_BODY_BYTES = 100_000;

interface ChargeBody {
  amount?: unknown;
  installments?: unknown;
  card?: { number?: unknown };
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(payload);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function authorizationCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

async function handleCharge(req: IncomingMessage, res: ServerResponse): Promise<string> {
  let body: ChargeBody;
  try {
    body = JSON.parse(await readBody(req)) as ChargeBody;
  } catch {
    sendJson(res, 400, { error: 'invalid_request' });
    return 'invalid_request';
  }

  const number = body?.card?.number;
  if (typeof number !== 'string' || typeof body.amount !== 'number') {
    sendJson(res, 400, { error: 'invalid_request' });
    return 'invalid_request';
  }

  const ending = number.slice(-4);
  if (ending === '0002') {
    sendJson(res, 200, { status: 'declined', reason: 'insufficient_funds' });
    return 'declined';
  }
  if (ending === '0003') {
    await new Promise((resolve) => setTimeout(resolve, SLOW_RESPONSE_MS));
    if (!res.destroyed) {
      sendJson(res, 200, { status: 'approved', authorizationCode: authorizationCode() });
    }
    return 'slow';
  }
  if (ending === '0004') {
    sendJson(res, 500, { error: 'internal_error' });
    return 'error';
  }
  sendJson(res, 200, { status: 'approved', authorizationCode: authorizationCode() });
  return 'approved';
}

// Card data is never logged; only the route and the outcome.
const server = createServer(async (req, res) => {
  const path = (req.url ?? '/').split('?')[0];
  let outcome = '';
  try {
    if (req.method === 'GET' && path === '/health') {
      sendJson(res, 200, { status: 'ok' });
      outcome = 'ok';
    } else if (req.method === 'POST' && path === '/charges') {
      outcome = await handleCharge(req, res);
    } else {
      sendJson(res, 404, { error: 'not_found' });
      outcome = 'not_found';
    }
  } catch {
    if (!res.headersSent) sendJson(res, 400, { error: 'invalid_request' });
    outcome = 'invalid_request';
  }
  console.log(`${req.method} ${path} ${res.statusCode} ${outcome}`);
});

server.listen(port, () => {
  console.log(`Gateway simulado ouvindo na porta ${port}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
