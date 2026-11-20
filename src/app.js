import express from 'express';
import { fileURLToPath } from 'node:url';
import { requireAdmin } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { categoriesRouter } from './routes/categories.js';
import { articlesRouter } from './routes/articles.js';
import { searchRouter } from './routes/search.js';

export function createApp({ db, adminKey }) {
  if (!db?.query) throw new Error('A database query client is required');

  const app = express();
  const admin = requireAdmin(adminKey);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.use(express.static(fileURLToPath(new URL('../public/', import.meta.url))));

  app.get('/health', async (req, res) => {
    await db.query('SELECT 1');
    res.json({ status: 'ok', service: 'WikiNode API' });
  });

  app.use('/api/categories', categoriesRouter(db, admin));
  app.use('/api/articles', articlesRouter(db, admin));
  app.use('/api/search', searchRouter(db));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
