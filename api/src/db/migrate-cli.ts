import { runMigrations } from './migrate';
import { closePool } from './pool';

runMigrations()
  .then((applied) => {
    console.log(applied.length ? `Migrações aplicadas: ${applied.join(', ')}` : 'Banco já está atualizado.');
  })
  .catch((err: Error) => {
    console.error('Falha ao aplicar migrações:', err.message);
    process.exitCode = 1;
  })
  .finally(() => closePool());
