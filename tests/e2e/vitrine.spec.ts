import { test, expect } from '@playwright/test';

test.describe('US03 Vitrine de eventos', () => {
  test('US03 - lista os eventos com a situação de venda', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('event-card')).toHaveCount(12);
    await expect(page.getByTestId('event-card').filter({ hasText: 'Orquestra em Concerto' })).toContainText('Cancelado');
    await expect(page.getByTestId('event-card').filter({ hasText: 'Feira Geek' })).toContainText('Em breve');
  });

  test('US03 - detalhe do evento mostra os setores', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Festival Sons do Cerrado' }).click();

    await expect(page.getByTestId('sector-card')).toHaveCount(3);
    await expect(page.getByTestId('sector-card').first()).toContainText('Pista');
  });
});
