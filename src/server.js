import 'dotenv/config';
import { createApp } from './app.js';
import { createPool } from './db.js';

const adminKey = process.env.ADMIN_API_KEY;
if (!adminKey || adminKey === 'replace-this-with-a-long-random-secret' || adminKey.length < 16) {
  throw new Error('Set ADMIN_API_KEY to a private value of at least 16 characters in .env');
}

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer from 1 to 65535');
}

const pool = createPool();
try {
  await pool.query('SELECT 1 FROM wikinode.categories LIMIT 1');
  await pool.query('SELECT 1 FROM wikinode.articles LIMIT 1');
} catch (error) {
  await pool.end();
  throw new Error(`WikiNode database not ready: ${error.message}`);
}

const app = createApp({ db: pool, adminKey });
const server = app.listen(port, () => {
  console.log(`WikiNode API ready at http://localhost:${port}`);
});

async function shutDown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.once('SIGINT', shutDown);
process.once('SIGTERM', shutDown);
