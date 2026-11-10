import { test, expect, APIRequestContext } from '@playwright/test';
import { auth, EVENTS, findEvent, newBuyer, sectorId } from '../support/api';

function quote(request: APIRequestContext, token: string, body: Record<string, unknown>) {
  return request.post('/orders/quote', { headers: auth(token), data: body });
}

test.describe('US05 Meia-entrada', () => {
  test('US05 - meia custa metade da inteira', async ({ request }) => {
    const buyer = await newBuyer(request);
    const event = await findEvent(request, EVENTS.festival);

    const response = await quote(request, buyer.token, {
      eventId: event.id,
      items: [{ sectorId: sectorId(event, 'Pista'), type: 'HALF', halfPriceCategory: 'STUDENT', quantity: 1 }],
    });

    expect(response.status()).toBe(200);
    expect((await response.json()).items[0].unitPrice).toBe(6000);
  });
});

test.describe('US06 Cupom de desconto', () => {
  test('US06 - aplica o desconto do cupom nas inteiras', async ({ request }) => {
    const buyer = await newBuyer(request);
    const event = await findEvent(request, EVENTS.festival);

    const response = await quote(request, buyer.token, {
      eventId: event.id,
      couponCode: 'BEMVINDO10',
      items: [{ sectorId: sectorId(event, 'Pista'), type: 'FULL', quantity: 1 }],
    });

    expect(response.status()).toBe(200);
    const values = await response.json();
    expect(values.subtotal).toBe(12000);
    expect(values.discount).toBe(1200);
  });

  test('US06 - recusa cupom inexistente', async ({ request }) => {
    const buyer = await newBuyer(request);
    const event = await findEvent(request, EVENTS.festival);

    const response = await quote(request, buyer.token, {
      eventId: event.id,
      couponCode: 'NAOEXISTE',
      items: [{ sectorId: sectorId(event, 'Pista'), type: 'FULL', quantity: 1 }],
    });

    expect(response.status()).toBe(422);
    expect((await response.json()).error.code).toBe('COUPON_INVALID');
  });
});

test.describe('US07 Taxa de serviço', () => {
  test('US07 - cobra a taxa mínima de R$ 3,00', async ({ request }) => {
    const buyer = await newBuyer(request);
    const event = await findEvent(request, EVENTS.festival);

    const response = await quote(request, buyer.token, {
      eventId: event.id,
      items: [{ sectorId: sectorId(event, 'Gramado'), type: 'FULL', quantity: 1 }],
    });

    const values = await response.json();
    expect(values.serviceFee).toBe(300);
    expect(values.total).toBe(1800);
  });

  test('US07 - cobra 10% de taxa acima do mínimo', async ({ request }) => {
    const buyer = await newBuyer(request);
    const event = await findEvent(request, EVENTS.festival);

    const response = await quote(request, buyer.token, {
      eventId: event.id,
      items: [{ sectorId: sectorId(event, 'Pista'), type: 'FULL', quantity: 1 }],
    });

    const values = await response.json();
    expect(values.serviceFee).toBe(1200);
    expect(values.total).toBe(13200);
  });
});
