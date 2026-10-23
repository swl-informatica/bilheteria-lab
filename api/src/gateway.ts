import { config } from './config';

export const GATEWAY_TIMEOUT_MS = 5000;

export interface ChargeRequest {
  amount: number;
  installments: number;
  card: { number: string; holderName: string; expiry: string; cvv: string };
}

export type ChargeResult =
  | { status: 'approved'; authorizationCode: string | null }
  | { status: 'declined' }
  | { status: 'unavailable' };

export async function charge(request: ChargeRequest): Promise<ChargeResult> {
  try {
    const response = await fetch(`${config.paymentGatewayUrl}/charges`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
    });
    if (response.status !== 200) {
      console.warn(`Gateway de pagamento respondeu com status ${response.status}`);
      return { status: 'unavailable' };
    }
    const body = (await response.json()) as { status?: unknown; authorizationCode?: unknown };
    if (body.status === 'approved') {
      return {
        status: 'approved',
        authorizationCode: typeof body.authorizationCode === 'string' ? body.authorizationCode : null,
      };
    }
    if (body.status === 'declined') return { status: 'declined' };
    console.warn('Gateway de pagamento devolveu uma resposta inesperada');
    return { status: 'unavailable' };
  } catch (err) {
    const name = err instanceof Error ? err.name : 'Error';
    console.warn(`Falha ao contatar o gateway de pagamento (${name})`);
    return { status: 'unavailable' };
  }
}
