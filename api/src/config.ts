function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não definida`);
  }
  return value;
}

function optionalNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Variável de ambiente ${name} inválida`);
  }
  return parsed;
}

export const config = {
  get port(): number {
    return optionalNumber('API_PORT', 3001);
  },
  get databaseUrl(): string {
    return required('DATABASE_URL');
  },
  get paymentGatewayUrl(): string {
    return required('PAYMENT_GATEWAY_URL').replace(/\/+$/, '');
  },
  get corsOrigin(): string | undefined {
    return process.env.CORS_ORIGIN || undefined;
  },
};
