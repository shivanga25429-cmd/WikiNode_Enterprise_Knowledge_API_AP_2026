-- WikiNode Enterprise Knowledge API
-- AP CP3
-- Contributor: Paras Dhankhar
-- Article management WRITE queries

-- @W4
-- Create a new article in an existing category.
-- Replace example category_id with a valid category ID.

INSERT INTO wikinode.articles (
    category_id,
    title,
    content
)
VALUES (
    1,
    'Employee Leave Policy',
    'Guidelines for employee leave requests.'
)
RETURNING
    article_id,
    category_id,
    title,
    content,
    created_at,
    updated_at;


-- @W5
-- Update an existing article.
-- The application must refresh updated_at.

UPDATE wikinode.articles
SET
    title = 'Updated Employee Leave Policy',
    content = 'Revised guidelines for employee leave.',
    updated_at = CURRENT_TIMESTAMP
WHERE article_id = 1
RETURNING
    article_id,
    category_id,
    title,
    content,
    updated_at;


-- @W6
-- Delete an article by its ID.

DELETE FROM wikinode.articles
WHERE article_id = 1
RETURNING
    article_id,
    title;
