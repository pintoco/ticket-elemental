// Aplica las migraciones a la BD de tests (DATABASE_URL_TEST o la local por defecto).
const { spawnSync } = require('child_process');

const url = process.env.DATABASE_URL_TEST || 'postgresql://test:test@127.0.0.1:5440/ticket_test';
const res = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, DATABASE_URL: url },
});
process.exit(res.status ?? 1);
