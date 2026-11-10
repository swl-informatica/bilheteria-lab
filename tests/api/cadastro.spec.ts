import { test, expect } from '@playwright/test';
import { DEFAULT_PASSWORD, randomCpf, uniqueEmail } from '../support/api';

test.describe('US01 Cadastro de comprador', () => {
  test('US01 - cadastra comprador com dados válidos', async ({ request }) => {
    const email = uniqueEmail();
    const cpf = randomCpf();
    const response = await request.post('/auth/register', {
      data: {
        name: 'Maria Teste',
        email: email.toUpperCase(),
        cpf: `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`,
        birthDate: '1995-03-20',
        password: DEFAULT_PASSWORD,
      },
    });

    expect(response.status()).toBe(201);
    const user = await response.json();
    expect(user).toMatchObject({ name: 'Maria Teste', email, cpf, birthDate: '1995-03-20', role: 'BUYER' });
    expect(user).not.toHaveProperty('password');
  });

  test('US01 - recusa nome com menos de 3 caracteres', async ({ request }) => {
    const response = await request.post('/auth/register', {
      data: { name: 'Al', email: uniqueEmail(), cpf: randomCpf(), birthDate: '1995-03-20', password: DEFAULT_PASSWORD },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields).toHaveProperty('name');
  });

  test('US01 - recusa CPF já cadastrado', async ({ request }) => {
    const cpf = randomCpf();
    const data = { name: 'Maria Teste', cpf, birthDate: '1995-03-20', password: DEFAULT_PASSWORD };
    const first = await request.post('/auth/register', { data: { ...data, email: uniqueEmail() } });
    expect(first.status()).toBe(201);

    const second = await request.post('/auth/register', { data: { ...data, email: uniqueEmail() } });

    expect(second.status()).toBe(409);
    expect((await second.json()).error.code).toBe('CPF_IN_USE');
  });
});
