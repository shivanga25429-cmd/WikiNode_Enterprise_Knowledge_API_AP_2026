-- WikiNode Enterprise Knowledge API
-- AP CP3
-- Contributor: Shivang Agarwal
-- Category read operations

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
