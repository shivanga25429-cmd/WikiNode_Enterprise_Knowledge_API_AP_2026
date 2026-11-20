import { Router } from 'express';
import { HttpError, parsePagination, parsePositiveId, requireArticleFields } from '../lib/validation.js';

const articleSelect = `
  SELECT a.article_id, a.category_id, c.name AS category_name,
         a.title, a.content, a.created_at, a.updated_at
  FROM wikinode.articles a
  JOIN wikinode.categories c ON c.category_id = a.category_id
`;

async function findArticle(db, id) {
  const result = await db.query(`${articleSelect} WHERE a.article_id = $1`, [id]);
  return result.rows[0];
}

export function articlesRouter(db, admin) {
  const router = Router();

  router.get('/', async (req, res) => {
    const { limit, offset } = parsePagination(req.query);
    const params = [];
    let where = '';
    if (req.query.category_id !== undefined) {
      const id = parsePositiveId(req.query.category_id, 'category_id');
      params.push(id);
      where = `WHERE a.category_id = $${params.length}`;
    }
    const [count, rows] = await Promise.all([
      db.query(`SELECT count(*)::integer AS total FROM wikinode.articles a ${where}`, params),
      db.query(`${articleSelect} ${where} ORDER BY a.updated_at DESC, a.article_id DESC
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]),
    ]);
    res.json({ data: rows.rows, pagination: { limit, offset, total: count.rows[0].total } });
  });

  router.get('/:id', async (req, res) => {
    const article = await findArticle(db, parsePositiveId(req.params.id));
    if (!article) throw new HttpError(404, 'NOT_FOUND', 'Article not found');
    res.json({ data: article });
  });

  router.post('/', admin, async (req, res) => {
    const fields = requireArticleFields(req.body);
    const result = await db.query(
      `INSERT INTO wikinode.articles (category_id, title, content) VALUES ($1, $2, $3)
       RETURNING article_id`,
      [fields.category_id, fields.title, fields.content],
    );
    const article = await findArticle(db, result.rows[0].article_id);
    res.location(`/api/articles/${article.article_id}`).status(201).json({ data: article });
  });

  router.put('/:id', admin, async (req, res) => {
    const id = parsePositiveId(req.params.id);
    const fields = requireArticleFields(req.body);
    const result = await db.query(
      `UPDATE wikinode.articles
       SET category_id = $1, title = $2, content = $3, updated_at = CURRENT_TIMESTAMP
       WHERE article_id = $4 RETURNING article_id`,
      [fields.category_id, fields.title, fields.content, id],
    );
    if (!result.rows.length) throw new HttpError(404, 'NOT_FOUND', 'Article not found');
    res.json({ data: await findArticle(db, id) });
  });

  router.delete('/:id', admin, async (req, res) => {
    const id = parsePositiveId(req.params.id);
    const result = await db.query('DELETE FROM wikinode.articles WHERE article_id = $1 RETURNING article_id', [id]);
    if (!result.rows.length) throw new HttpError(404, 'NOT_FOUND', 'Article not found');
    res.status(204).send();
  });

  return router;
}
