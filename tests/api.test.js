import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import request from 'supertest';
import { createApp } from '../src/app.js';

const key = 'local-test-secret-not-for-deployment';
let db;
let api;
let hrId;
let articleId;

before(async () => {
  db = new PGlite(); // In-memory PostgreSQL engine, not an SQL mock.
  const schema = await readFile(new URL('../dbms/03_schema.sql', import.meta.url), 'utf8');
  await db.exec(schema);
  const seed = await readFile(new URL('../dbms/05_seed.sql', import.meta.url), 'utf8');
  await db.exec(seed);
  api = request(createApp({ db, adminKey: key }));
  const result = await db.query("SELECT category_id FROM wikinode.categories WHERE name='HR'");
  hrId = result.rows[0].category_id;
});

after(async () => {
  await db?.close();
});

test('health checks a live PostgreSQL database', async () => {
  const res = await api.get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('seed is idempotent and includes HR, IT and Finance content', async () => {
  await db.exec(await readFile(new URL('../dbms/05_seed.sql', import.meta.url), 'utf8'));
  const cats = await api.get('/api/categories');
  assert.equal(cats.status, 200);
  assert.equal(cats.body.data.length, 3);
  const articles = await api.get('/api/articles');
  assert.equal(articles.status, 200);
  assert.equal(articles.body.pagination.total, 3);
});

test('unauthorized writes are refused; category can be read', async () => {
  assert.equal((await api.post('/api/categories').send({ name: 'Legal' })).status, 401);
  assert.equal((await api.post('/api/categories').set('X-Admin-Key', 'wrong').send({ name: 'Legal' })).status, 401);
  const res = await api.get(`/api/categories/${hrId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.name, 'HR');
});

test('category CRUD validates input and uniqueness', async () => {
  assert.equal((await api.post('/api/categories').set('X-Admin-Key', key).send({ name: '  ' })).status, 400);
  const created = await api.post('/api/categories').set('X-Admin-Key', key)
    .send({ name: ' Legal ', description: 'Contracts and regulations' });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.name, 'Legal');
  assert.equal(created.headers.location, `/api/categories/${created.body.data.category_id}`);
  const id = created.body.data.category_id;
  const duplicate = await api.post('/api/categories').set('X-Admin-Key', key).send({ name: 'Legal' });
  assert.equal(duplicate.status, 409);
  const updated = await api.put(`/api/categories/${id}`).set('X-Admin-Key', key)
    .send({ name: 'Legal', description: 'Updated compliance information' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.description, 'Updated compliance information');
  assert.equal((await api.delete(`/api/categories/${id}`).set('X-Admin-Key', key)).status, 204);
  assert.equal((await api.get(`/api/categories/${id}`)).status, 404);
});

test('article CRUD, category filter and foreign-key protections work', async () => {
  const created = await api.post('/api/articles').set('X-Admin-Key', key)
    .send({ category_id: hrId, title: 'Remote Work Policy', content: 'Work from home with manager approval.' });
  assert.equal(created.status, 201);
  articleId = created.body.data.article_id;
  assert.equal(created.body.data.category_name, 'HR');
  assert.equal((await api.get(`/api/articles/${articleId}`)).body.data.title, 'Remote Work Policy');
  const filtered = await api.get(`/api/articles?category_id=${hrId}&limit=1&offset=0`);
  assert.equal(filtered.status, 200);
  assert.equal(filtered.body.data.length, 1);
  assert.ok(filtered.body.pagination.total >= 2);
  const invalidFk = await api.post('/api/articles').set('X-Admin-Key', key)
    .send({ category_id: 999999, title: 'Ghost', content: 'Invalid category' });
  assert.equal(invalidFk.status, 409);
  const blockedDeletion = await api.delete(`/api/categories/${hrId}`).set('X-Admin-Key', key);
  assert.equal(blockedDeletion.status, 409);
  const changed = await api.put(`/api/articles/${articleId}`).set('X-Admin-Key', key)
    .send({ category_id: hrId, title: 'Remote Work Guidelines', content: 'Manager approval is required.' });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.data.title, 'Remote Work Guidelines');
  assert.equal((await api.delete(`/api/articles/${articleId}`).set('X-Admin-Key', key)).status, 204);
  assert.equal((await api.get(`/api/articles/${articleId}`)).status, 404);
});

test('case-insensitive keyword search handles literal SQL wildcards and category filter', async () => {
  const result = await api.get('/api/search?q=REIMBURSEMENT');
  assert.equal(result.status, 200);
  assert.equal(result.body.pagination.total, 1);
  assert.equal(result.body.data[0].category_name, 'Finance');
  assert.equal((await api.get('/api/search?q=%25')).body.pagination.total, 0);
  assert.equal((await api.get(`/api/search?q=policy&category_id=${hrId}`)).body.pagination.total, 1);
  assert.equal((await api.get('/api/search?q=')).status, 400);
});

test('invalid IDs, pagination, bodies and unknown routes return useful errors', async () => {
  assert.equal((await api.get('/api/articles/nope')).status, 400);
  assert.equal((await api.get('/api/articles?limit=999')).status, 400);
  assert.equal((await api.get('/api/articles?offset=-1')).status, 400);
  assert.equal((await api.post('/api/articles').set('X-Admin-Key', key)
    .send({ category_id: hrId, title: '', content: 'No title' })).status, 400);
  assert.equal((await api.post('/api/articles').set('X-Admin-Key', key)
    .send({ category_id: hrId, title: 'x', content: 'y', extra: true })).status, 400);
  assert.equal((await api.post('/api/categories').set('X-Admin-Key', key)
    .set('Content-Type', 'application/json').send('{bad json')).status, 400);
  assert.equal((await api.get('/api/unknown')).status, 404);
});

test('the committed CP3 SQL demo executes without persisting demonstration records', async () => {
  const sql = await readFile(new URL('../dbms/04_queries.sql', import.meta.url), 'utf8');
  await db.exec(sql);
  const result = await db.query("SELECT count(*)::integer AS n FROM wikinode.categories WHERE name = 'T0109_CP3_DEMO_CATEGORY'");
  assert.equal(result.rows[0].n, 0);
});
