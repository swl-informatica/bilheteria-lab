import { test, expect } from '@playwright/test';
import { auth, EVENTS, findEvent, newBuyer, sectorId } from '../support/api';

test.describe('US04 Compra de ingressos', () => {
  test('US04 - cria pedido aguardando pagamento', async ({ request }) => {
    const buyer = await newBuyer(request);
    const event = await findEvent(request, EVENTS.festival);

    const response = await request.post('/orders', {
      headers: auth(buyer.token),
      data: { eventId: event.id, items: [{ sectorId: sectorId(event, 'Pista'), type: 'FULL', quantity: 1 }] },
    });

    expect(response.ok()).toBeTruthy();
    const order = await response.json();
    expect(order.status).toBe('AWAITING_PAYMENT');
    expect(order.total).toBe(13200);
  });

  test('US04 - recusa pedido com mais de 6 ingressos', async ({ request }) => {
    const buyer = await newBuyer(request);
    const event = await findEvent(request, EVENTS.festival);

    const response = await request.post('/orders', {
      headers: auth(buyer.token),
      data: { eventId: event.id, items: [{ sectorId: sectorId(event, 'Gramado'), type: 'FULL', quantity: 7 }] },
    });

    expect(response.status()).toBe(422);
    expect((await response.json()).error.code).toBe('ORDER_QUANTITY_LIMIT');
  });

  test('US04 - recusa compra antes da abertura das vendas', async ({ request }) => {
    const buyer = await newBuyer(request);
    const event = await findEvent(request, EVENTS.feiraGeek);

    const response = await request.post('/orders', {
      headers: auth(buyer.token),
      data: { eventId: event.id, items: [{ sectorId: sectorId(event, 'Pista'), type: 'FULL', quantity: 1 }] },
    });

    expect(response.status()).toBe(422);
    expect((await response.json()).error.code).toBe('SALES_NOT_OPEN');
  });
});
