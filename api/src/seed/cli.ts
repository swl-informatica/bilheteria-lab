import { runMigrations } from '../db/migrate';
import { closePool } from '../db/pool';
import { today } from '../time';
import { seedDatabase } from './seed';

async function main(): Promise<void> {
  await runMigrations();
  await seedDatabase();
  console.log(`Dados iniciais recriados para ${today()}.`);
}

main()
  .catch((err: Error) => {
    console.error('Falha ao recriar os dados iniciais:', err.message);
    process.exitCode = 1;
  })
  .finally(() => closePool());
