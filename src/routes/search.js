import { Router } from 'express';
import {
  HttpError, escapeLikePattern, parsePagination, parsePositiveId, requiredText,
} from '../lib/validation.js';

export function searchRouter(db) {
  const router = Router();

  router.get('/', async (req, res) => {
    if (req.query.q === undefined) {
      throw new HttpError(400, 'BAD_REQUEST', 'q is required');
    }
    const keyword = requiredText(req.query.q, 'q', 200);
    const { limit, offset } = parsePagination(req.query);
    const values = [`%${escapeLikePattern(keyword)}%`];
    let categoryClause = '';

    if (req.query.category_id !== undefined) {
      values.push(parsePositiveId(req.query.category_id, 'category_id'));
      categoryClause = `AND a.category_id = $${values.length}`;
    }

    const where = `WHERE (a.title ILIKE $1 OR a.content ILIKE $1) ${categoryClause}`;
    const from = `FROM wikinode.articles a JOIN wikinode.categories c ON c.category_id = a.category_id`;
    const [count, rows] = await Promise.all([
      db.query(`SELECT count(*)::integer AS total ${from} ${where}`, values),
      db.query(`SELECT a.article_id, a.category_id, c.name AS category_name,
                       a.title, a.content, a.created_at, a.updated_at
                ${from} ${where}
                ORDER BY a.updated_at DESC, a.article_id DESC
                LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, offset]),
    ]);
    res.json({ data: rows.rows, pagination: { limit, offset, total: count.rows[0].total }, keyword });
  });

  return router;
}
