import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createPool } from '../src/db.js';

const schemaPath = fileURLToPath(new URL('../dbms/03_schema.sql', import.meta.url));
const seedPath = fileURLToPath(new URL('../dbms/05_seed.sql', import.meta.url));
const pool = createPool();
const client = await pool.connect();

try {
  await client.query('BEGIN');
  const result = await client.query(`
    SELECT to_regclass('wikinode.categories') AS categories,
           to_regclass('wikinode.articles') AS articles
  `);
  const { categories, articles } = result.rows[0];

  if (Boolean(categories) !== Boolean(articles)) {
    throw new Error('Partial WikiNode schema detected; inspect it before running setup');
  }

  if (!categories) {
    await client.query(await readFile(schemaPath, 'utf8'));
    console.log('Created wikinode.categories and wikinode.articles');
  } else {
    console.log('Existing WikiNode schema found; preserving both tables');
  }

  await client.query(await readFile(seedPath, 'utf8'));
  const counts = await client.query(`
    SELECT (SELECT count(*) FROM wikinode.categories) AS categories,
           (SELECT count(*) FROM wikinode.articles) AS articles
  `);
  await client.query('COMMIT');
  console.log(`Ready: ${counts.rows[0].categories} categories, ${counts.rows[0].articles} articles`);
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Database setup failed:', error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
