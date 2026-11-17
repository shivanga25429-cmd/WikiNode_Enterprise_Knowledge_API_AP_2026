-- WikiNode Enterprise Knowledge API
-- CP2: PostgreSQL schema based on CP1 3NF normalization

CREATE SCHEMA IF NOT EXISTS wikinode;

CREATE TABLE wikinode.categories (
    category_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT categories_name_nonblank
        CHECK (length(btrim(name)) > 0),
    CONSTRAINT categories_description_nonblank
        CHECK (description IS NULL OR length(btrim(description)) > 0),
    CONSTRAINT categories_timestamp_order
        CHECK (updated_at >= created_at)
);

CREATE TABLE wikinode.articles (
    article_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT articles_category_fk
        FOREIGN KEY (category_id)
        REFERENCES wikinode.categories(category_id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT articles_title_nonblank
        CHECK (length(btrim(title)) > 0),
    CONSTRAINT articles_content_nonblank
        CHECK (length(btrim(content)) > 0),
    CONSTRAINT articles_timestamp_order
        CHECK (updated_at >= created_at)
);
