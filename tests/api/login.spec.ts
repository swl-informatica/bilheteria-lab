import { test, expect } from '@playwright/test';
import { newBuyer, uniqueEmail } from '../support/api';

test.describe('US02 Login', () => {
  test('US02 - entra com e-mail e senha corretos', async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: { email: 'ana@bilheteria.local', password: 'Senha123' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe('ana@bilheteria.local');
  });

  test('US02 - senha errada mostra a mensagem genérica', async ({ request }) => {
    const buyer = await newBuyer(request);

    const response = await request.post('/auth/login', { data: { email: buyer.email, password: 'Errada123' } });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
    expect(body.error.message).toBe('E-mail ou senha inválidos.');
  });

  test('US02 - e-mail sem cadastro mostra a mesma mensagem', async ({ request }) => {
    const response = await request.post('/auth/login', { data: { email: uniqueEmail(), password: 'Senha123' } });

    expect(response.status()).toBe(401);
    expect((await response.json()).error.message).toBe('E-mail ou senha inválidos.');
  });
});
