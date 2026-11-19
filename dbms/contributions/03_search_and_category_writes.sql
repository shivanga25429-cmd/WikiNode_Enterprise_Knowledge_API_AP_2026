-- WikiNode AP CP3 | Jatasay | keyword search and category administration
-- @R7 READ: keyword search in article title or content
SELECT a.article_id, a.title, c.name AS category_name, a.updated_at
FROM wikinode.articles a JOIN wikinode.categories c ON c.category_id = a.category_id
WHERE a.title ILIKE '%policy%' OR a.content ILIKE '%policy%'
ORDER BY a.updated_at DESC;

-- @W1 WRITE: create category
INSERT INTO wikinode.categories(name, description)
VALUES ('HR', 'Human resources policies') RETURNING *;

-- @W2 WRITE: update category; application updates updated_at
UPDATE wikinode.categories SET description = 'Updated HR policies', updated_at = CURRENT_TIMESTAMP
WHERE category_id = 1 RETURNING *;

-- @W3 WRITE: delete only if unused (FK also restricts deletion)
DELETE FROM wikinode.categories c WHERE c.category_id = 1
AND NOT EXISTS (SELECT 1 FROM wikinode.articles a WHERE a.category_id = c.category_id)
RETURNING *;
