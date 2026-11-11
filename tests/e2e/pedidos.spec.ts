import { test, expect } from '@playwright/test';

test.describe('US12 Meus pedidos', () => {
  test('US12 - comprador vê a lista dos seus pedidos', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('event-card').first()).toBeVisible();
    await page.getByRole('link', { name: 'Entrar' }).click();
    await page.getByLabel('E-mail').fill('ana@bilheteria.local');
    await page.getByLabel('Senha').fill('Senha123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByTestId('current-user')).toBeVisible();

    await page.getByRole('link', { name: 'Meus pedidos' }).click();

    await expect(page.getByTestId('order-row')).toHaveCount(13);
  });
});
