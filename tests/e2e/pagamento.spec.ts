import { test, expect } from '@playwright/test';
import { CARDS, createOrder, EVENTS, findEvent, newBuyer, sectorId } from '../support/api';

const apiURL = process.env.API_URL ?? 'http://localhost:3001';

test.describe('US08 Pagamento', () => {
  test('US08 - pagamento aprovado mostra os ingressos do pedido', async ({ page, playwright }) => {
    const request = await playwright.request.newContext({ baseURL: apiURL });
    const buyer = await newBuyer(request);
    const event = await findEvent(request, EVENTS.festival);
    const order = await createOrder(request, buyer.token, event.id, [
      { sectorId: sectorId(event, 'Gramado'), type: 'FULL', quantity: 1 },
    ]);
    await request.dispose();

    await page.goto('/login');
    await page.getByLabel('E-mail').fill(buyer.email);
    await page.getByLabel('Senha').fill(buyer.password);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByTestId('current-user')).toBeVisible();

    await page.goto(`/orders/${order.id}/pay`);
    await page.getByLabel('Número do cartão').fill(CARDS.approved);
    await page.getByLabel('Nome do titular').fill('COMPRADOR TESTE');
    await page.getByLabel('Validade').fill('12/30');
    await page.getByLabel('CVV').fill('123');
    await page.getByRole('button', { name: 'Pagar' }).click();

    await expect(page).toHaveURL(new RegExp(`/orders/${order.id}$`));
    await expect(page.getByTestId('ticket')).toHaveCount(1);
    await expect(page.getByTestId('ticket-status')).toHaveText('Válido');
  });
});
