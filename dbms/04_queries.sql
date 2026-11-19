-- WikiNode AP CP3 — consolidated PostgreSQL SQL workload (Team T0109)
-- Sources: Shivang R1/R2/R7; Navneet R3-R6; Jatasay W1-W3; Paras W4-W6.
-- In Jatasay's source the search query was also marked R7; Navneet R5 is
-- the canonical keyword search and R7 is the category count. No duplicate ID.
-- The example read parameters below should be bound by the Express API.
-- This script demonstrates all writes within a single transaction; ROLLBACK
-- guarantees that demonstration records do not persist.
-- Use psql -v ON_ERROR_STOP=1 -d <test_db> -f dbms/04_queries.sql

BEGIN;

-- @R1
-- List all categories alphabetically.

SELECT
    category_id,
    name,
    description,
    created_at,
    updated_at
FROM wikinode.categories
ORDER BY name ASC;

-- @R2
-- Retrieve a category by its primary key.
-- Example parameter: category_id = 1

SELECT
    category_id,
    name,
    description,
    created_at,
    updated_at
FROM wikinode.categories
WHERE category_id = 1;

-- @R3
-- List articles with their categories.
SELECT
    a.article_id,
    a.title,
    a.content,
    c.category_id,
    c.name AS category_name,
    a.created_at,
    a.updated_at
FROM wikinode.articles AS a
INNER JOIN wikinode.categories AS c
    ON a.category_id = c.category_id
ORDER BY a.created_at DESC, a.article_id DESC;

-- @R4
-- Retrieve one article by its primary key.
-- Demonstration value: article_id = 1. Bind this value in application code.
SELECT
    a.article_id,
    a.title,
    a.content,
    c.category_id,
    c.name AS category_name,
    a.created_at,
    a.updated_at
FROM wikinode.articles AS a
INNER JOIN wikinode.categories AS c
    ON a.category_id = c.category_id
WHERE a.article_id = 1;

-- @R5
-- Search article titles and content case-insensitively.
-- Demonstration keyword: policy. Bind it in application code.
SELECT
    a.article_id,
    a.title,
    a.content,
    c.name AS category_name
FROM wikinode.articles AS a
INNER JOIN wikinode.categories AS c
    ON a.category_id = c.category_id
WHERE a.title ILIKE '%policy%'
   OR a.content ILIKE '%policy%'
ORDER BY a.updated_at DESC, a.article_id DESC;

-- @R6
-- Retrieve articles belonging to one category.
-- Demonstration value: category_id = 1. Bind this value in application code.
SELECT
    a.article_id,
    a.category_id,
    a.title,
    a.content,
    a.created_at,
    a.updated_at
FROM wikinode.articles AS a
WHERE a.category_id = 1
ORDER BY a.created_at DESC, a.article_id DESC;

-- @R7
-- Count articles belonging to each category.
-- Include categories containing zero articles.

SELECT
    c.category_id,
    c.name AS category_name,
    COUNT(a.article_id) AS article_count
FROM wikinode.categories AS c
LEFT JOIN wikinode.articles AS a
    ON a.category_id = c.category_id
GROUP BY
    c.category_id,
    c.name
ORDER BY
    article_count DESC,
    c.name ASC;

-- WRITE DEMO: execute in the order shown to satisfy foreign-key dependencies.
-- @W1
-- Create a category (Jatasay's W1, using rollback-safe demo data).
INSERT INTO wikinode.categories (name, description)
VALUES ('T0109_CP3_DEMO_CATEGORY', 'Temporary category for CP3 demonstration')
RETURNING category_id, name, description, created_at, updated_at;

-- @W2
-- Update the category, refreshing updated_at (Jatasay's W2).
UPDATE wikinode.categories
SET description = 'Updated CP3 demonstration category',
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'T0109_CP3_DEMO_CATEGORY'
RETURNING category_id, name, description, updated_at;

-- @W4
-- Create an article in the category just inserted (Paras's W4).
INSERT INTO wikinode.articles (category_id, title, content)
SELECT category_id, 'T0109_CP3_DEMO_ARTICLE', 'Sample employee leave policy for CP3 tests.'
FROM wikinode.categories WHERE name = 'T0109_CP3_DEMO_CATEGORY'
RETURNING article_id, category_id, title, content, created_at, updated_at;

-- @W5
-- Update only that demonstration article (Paras's W5).
UPDATE wikinode.articles
SET title = 'T0109_CP3_DEMO_ARTICLE_UPDATED',
    content = 'Revised sample employee leave policy.',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'T0109_CP3_DEMO_ARTICLE'
  AND category_id = (SELECT category_id FROM wikinode.categories WHERE name = 'T0109_CP3_DEMO_CATEGORY')
RETURNING article_id, category_id, title, content, updated_at;

-- @W6
-- Delete only the demonstration article (Paras's W6).
DELETE FROM wikinode.articles
WHERE title = 'T0109_CP3_DEMO_ARTICLE_UPDATED'
  AND category_id = (SELECT category_id FROM wikinode.categories WHERE name = 'T0109_CP3_DEMO_CATEGORY')
RETURNING article_id, title;

-- @W3
-- Delete the demonstration category only if unused (Jatasay's W3).
DELETE FROM wikinode.categories AS c
WHERE c.name = 'T0109_CP3_DEMO_CATEGORY'
  AND NOT EXISTS (SELECT 1 FROM wikinode.articles AS a WHERE a.category_id = c.category_id)
RETURNING c.category_id, c.name;

ROLLBACK;
