import { test, expect } from '@playwright/test';
import { auth, CARDS, createOrder, EVENTS, findEvent, login, newBuyer, sectorId } from '../support/api';

const card = (number: string) => ({ number, holderName: 'COMPRADOR TESTE', expiry: '12/30', cvv: '123' });

test.describe('US08 Pagamento', () => {
  test('US08 - pagamento aprovado emite os ingressos', async ({ request }) => {
    const buyer = await newBuyer(request);
    const event = await findEvent(request, EVENTS.festival);
    const order = await createOrder(request, buyer.token, event.id, [
      { sectorId: sectorId(event, 'Gramado'), type: 'FULL', quantity: 2 },
    ]);

    const response = await request.post(`/orders/${order.id}/payment`, {
      headers: auth(buyer.token),
      data: { installments: 1, card: card(CARDS.approved) },
    });

    expect(response.status()).toBe(200);
    const paid = await response.json();
    expect(paid.status).toBe('PAID');
    expect(paid.cardLast4).toBe('1111');
    expect(paid.tickets).toHaveLength(2);
    for (const ticket of paid.tickets) {
      expect(ticket.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
      expect(ticket.status).toBe('VALID');
    }
  });

  test('US08 - pagamento recusado mantém o pedido aguardando', async ({ request }) => {
    const buyer = await newBuyer(request);
    const event = await findEvent(request, EVENTS.festival);
    const order = await createOrder(request, buyer.token, event.id, [
      { sectorId: sectorId(event, 'Gramado'), type: 'FULL', quantity: 1 },
    ]);

    const response = await request.post(`/orders/${order.id}/payment`, {
      headers: auth(buyer.token),
      data: { installments: 1, card: card(CARDS.declined) },
    });

    expect(response.status()).toBe(402);
    expect((await response.json()).error.message).toBe('Pagamento recusado. Tentativas restantes: 2.');
    const current = await (await request.get(`/orders/${order.id}`, { headers: auth(buyer.token) })).json();
    expect(current.status).toBe('AWAITING_PAYMENT');
    expect(current.paymentAttempts).toBe(1);
  });

  test('US08 - não aceita pagamento depois do prazo', async ({ request }) => {
    const token = await login(request, 'ana@bilheteria.local');
    const orders = await (await request.get('/orders', { headers: auth(token) })).json();
    const overdue = orders.find((order: { status: string }) => ['AWAITING_PAYMENT', 'EXPIRED'].includes(order.status));
    expect(overdue).toBeTruthy();

    const response = await request.post(`/orders/${overdue.id}/pay`, {
      headers: auth(token),
      data: { installments: 1, card: card(CARDS.approved) },
    });

    expect(response.status()).toBe(409);
    expect((await response.json()).error.code).toBe('PAYMENT_EXPIRED');
  });
});
