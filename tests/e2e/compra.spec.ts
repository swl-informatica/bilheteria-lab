import { test, expect } from '@playwright/test';

async function loginAs(page, email: string, password = 'Senha123') {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByTestId('current-user')).toBeVisible();
}

test.describe('US04 Compra de ingressos', () => {
  test('US04 - comprador reserva ingresso pelo front', async ({ page }) => {
    await loginAs(page, 'ana@bilheteria.local');
    await page.getByRole('link', { name: 'Noite do Stand-up' }).click();

    const plateia = page.getByTestId('sector-row').filter({ hasText: 'Plateia' });
    await plateia.getByLabel('Quantidade de inteira').fill('1');
    await expect(page.getByTestId('summary-item')).toHaveCount(1);
    await page.getByRole('button', { name: 'Reservar' }).click();

    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+\/pay$/);
  });

  test('US07 - resumo atualiza os valores ao mudar a quantidade', async ({ page }) => {
    await loginAs(page, 'bruno@bilheteria.local');
    await page.getByRole('link', { name: 'Festival Sons do Cerrado' }).click();

    const gramado = page.getByTestId('sector-row').filter({ hasText: 'Gramado' });
    await gramado.getByLabel('Quantidade de inteira').fill('1');
    await expect(page.getByTestId('order-total')).toHaveText('R$ 18,00');

    await gramado.getByLabel('Quantidade de inteira').fill('3');
    await page.waitForTimeout(290);
    const total = await page.getByTestId('order-total').textContent();
    expect(total).toBe('R$ 49,50');
  });
});
