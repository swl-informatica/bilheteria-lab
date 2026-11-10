import { test, expect } from '@playwright/test';
import { EVENTS, findEvent } from '../support/api';

test.describe('US03 Vitrine de eventos', () => {
  test('US03 - lista todos os eventos em ordem de data', async ({ request }) => {
    const response = await request.get('/events');

    expect(response.status()).toBe(200);
    const events = await response.json();
    expect(events).toHaveLength(12);
    const starts = events.map((event: { startsAt: string }) => new Date(event.startsAt).getTime());
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  test('US03 - mostra a situação de venda de cada evento', async ({ request }) => {
    const events = await (await request.get('/events')).json();
    const status = (name: string) => events.find((event: { name: string }) => event.name === name).salesStatus;

    expect(status(EVENTS.festival)).toBe('ON_SALE');
    expect(status(EVENTS.acustico)).toBe('SALES_CLOSED');
    expect(status(EVENTS.orquestra)).toBe('CANCELED');
    expect(status(EVENTS.feiraGeek)).toBe('UPCOMING');
    expect(status(EVENTS.rodaDeSamba)).toBe('HELD');
  });

  test('US03 - detalhe mostra os preços de inteira e meia do setor', async ({ request }) => {
    const event = await findEvent(request, EVENTS.standUp);
    const plateia = event.sectors.find((sector: { name: string }) => sector.name === 'Plateia');

    expect(plateia.fullPrice).toBe(8555);
    expect(plateia.halfPrice).toBe(4277);
    expect(plateia.capacity).toBe(80);
  });
});
