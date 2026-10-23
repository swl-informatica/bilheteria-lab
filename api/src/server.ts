import { createApp } from './app';
import { config } from './config';
import { runMigrations } from './db/migrate';
import { closePool, getPool } from './db/pool';
import { seedDatabase } from './seed/seed';

async function start(): Promise<void> {
  const applied = await runMigrations();
  if (applied.length) console.log(`Migrações aplicadas: ${applied.join(', ')}`);

  const users = await getPool().query<{ total: number }>('SELECT COUNT(*)::int AS total FROM users');
  if (users.rows[0].total === 0) {
    await seedDatabase();
    console.log('Banco vazio: dados iniciais carregados.');
  }

  const server = createApp().listen(config.port, () => {
    console.log(`API ouvindo na porta ${config.port}`);
  });

  const shutdown = () => {
    server.close(() => {
      closePool().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err: Error) => {
  console.error('Falha ao iniciar a API:', err.message);
  process.exit(1);
});
