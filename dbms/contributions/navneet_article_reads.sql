-- WikiNode Enterprise Knowledge API
-- AP CP3
-- Contributor: Navneet Kumar
-- Article READ queries

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
