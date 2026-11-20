import { Router } from 'express';
import { HttpError, parseBody, parsePositiveId, requiredText, optionalDescription } from '../lib/validation.js';

const columns = 'category_id, name, description, created_at, updated_at';

export function categoriesRouter(db, admin) {
  const router = Router();

  router.get('/', async (req, res) => {
    const result = await db.query(`SELECT ${columns} FROM wikinode.categories ORDER BY name ASC`);
    res.json({ data: result.rows });
  });

  router.get('/:id', async (req, res) => {
    const id = parsePositiveId(req.params.id);
    const result = await db.query(`SELECT ${columns} FROM wikinode.categories WHERE category_id = $1`, [id]);
    if (!result.rows.length) throw new HttpError(404, 'NOT_FOUND', 'Category not found');
    res.json({ data: result.rows[0] });
  });

  router.post('/', admin, async (req, res) => {
    const body = parseBody(req.body, ['name', 'description'], ['name']);
    const name = requiredText(body.name, 'name', 120);
    const description = optionalDescription(body.description);
    const result = await db.query(
      `INSERT INTO wikinode.categories (name, description) VALUES ($1, $2) RETURNING ${columns}`,
      [name, description],
    );
    res.location(`/api/categories/${result.rows[0].category_id}`).status(201).json({ data: result.rows[0] });
  });

  router.put('/:id', admin, async (req, res) => {
    const id = parsePositiveId(req.params.id);
    const body = parseBody(req.body, ['name', 'description'], ['name']);
    const result = await db.query(
      `UPDATE wikinode.categories
       SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
       WHERE category_id = $3 RETURNING ${columns}`,
      [requiredText(body.name, 'name', 120), optionalDescription(body.description), id],
    );
    if (!result.rows.length) throw new HttpError(404, 'NOT_FOUND', 'Category not found');
    res.json({ data: result.rows[0] });
  });

  router.delete('/:id', admin, async (req, res) => {
    const id = parsePositiveId(req.params.id);
    const result = await db.query('DELETE FROM wikinode.categories WHERE category_id = $1 RETURNING category_id', [id]);
    if (!result.rows.length) throw new HttpError(404, 'NOT_FOUND', 'Category not found');
    res.status(204).send();
  });

  return router;
}
