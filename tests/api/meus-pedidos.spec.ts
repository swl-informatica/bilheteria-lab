import { test, expect } from '@playwright/test';
import { auth, createOrder, EVENTS, findEvent, newBuyer, sectorId } from '../support/api';

test.describe('US12 Meus pedidos', () => {
  test('US12 - lista só os pedidos do próprio comprador', async ({ request }) => {
    const buyer = await newBuyer(request);
    const event = await findEvent(request, EVENTS.festival);
    const order = await createOrder(request, buyer.token, event.id, [
      { sectorId: sectorId(event, 'Gramado'), type: 'FULL', quantity: 1 },
    ]);

    const response = await request.get('/orders', { headers: auth(buyer.token) });

    expect(response.status()).toBe(200);
    const orders = await response.json();
    expect(orders).toHaveLength(1);
    expect(orders[0].id).toBe(order.id);
  });
});
