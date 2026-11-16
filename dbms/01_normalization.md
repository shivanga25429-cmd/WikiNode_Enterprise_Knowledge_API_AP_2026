# WikiNode — Data normalization (1NF → 2NF → 3NF)

**Team:** T0109 · **AP application:** WikiNode Enterprise Knowledge API · **Scope:** Phase 1

## 1. Business facts and assumptions

WikiNode stores departmental knowledge articles. Each article belongs to exactly one category (for example HR, IT, or Finance). Each category may contain zero or more articles. Administrators create/update/delete content; employees read and search it. In this phase, administrator access is protected by an application-level secret, not a user table. Article versioning, multi-category tags, document embeddings and RAG are deliberately outside Phase 1.

The final schema has **exactly two domain tables**, `wikinode.categories` and `wikinode.articles`. All article titles/content are stored as scalar fields. The database guarantees referential integrity; an in-use category cannot be deleted.

## 2. Starting relation (to explain anomalies)

Imagine a single article export:

`KnowledgeEntry(article_id, title, content, category_id, category_name, category_description, article_created_at, article_updated_at, category_created_at, category_updated_at)`

| article_id | title | category_id | category_name | category_description |
|---:|---|---:|---|---|
| 1 | Leave Policy | 10 | HR | Employee policies |
| 2 | Holiday Calendar | 10 | HR | Employee policies |
| 3 | VPN Setup | 20 | IT | Technical guidance |

The HR category name and description repeat for multiple rows. Updating the HR description in only one row creates an **update anomaly**. The category cannot exist before an article (an **insertion anomaly**); deleting its last article may delete the category's only record (a **deletion anomaly**).

### 1NF — Atomic values

Store one article per row, with atomic IDs, names, timestamps and text fields. Do not embed an array of articles inside a category field. `KnowledgeEntry` as shown is in 1NF if every cell holds a single value and `article_id` uniquely identifies each row.

### 2NF — No partial key dependencies

`article_id` is the **single-column primary key** of the starting relation. Every non-key attribute depends on the complete key; there is no composite key whose proper subset determines a field. Thus the starting 1NF relation also satisfies 2NF.

### 3NF — Remove transitive dependencies

The original relation has these functional dependencies under our business assumptions:

- `article_id → title, content, category_id, article_created_at, article_updated_at`
- `category_id → category_name, category_description, category_created_at, category_updated_at`
- Hence `article_id → category_id → category_name, category_description, category_created_at, category_updated_at` is a **transitive dependency**.

Separate the category fields into a category table, and keep only the category foreign key in articles:

**`wikinode.categories`**

| Column | Key / rule |
|---|---|
| `category_id` | Primary key, generated integer |
| `name` | Required, unique, nonblank |
| `description` | Optional, nonblank when present |
| `created_at`, `updated_at` | Required timestamps with time zone |

Functional dependencies: `category_id → name, description, created_at, updated_at`; since `name` is required and unique, `name → category_id, description, created_at, updated_at` is an alternate-key dependency.

**`wikinode.articles`**

| Column | Key / rule |
|---|---|
| `article_id` | Primary key, generated integer |
| `category_id` | Required foreign key → `categories.category_id` |
| `title` | Required, nonblank |
| `content` | Required, nonblank |
| `created_at`, `updated_at` | Required timestamps with time zone |

Functional dependency: `article_id → category_id, title, content, created_at, updated_at`.

Non-key columns in each table depend on their table's key, the whole key, and no other non-key column. **Both tables are in 3NF**. Given only the stated functional dependencies, both are also in BCNF because every nontrivial determinant is a candidate key.

## 3. Relationships and integrity

`categories (1) ─── (0..N) articles`: an article references exactly one existing category through `articles.category_id`. The foreign key uses `ON DELETE RESTRICT` to protect content from accidental category deletion; admins must first move or delete the articles. `ON UPDATE RESTRICT` protects key identity. Category names are unique. `CHECK` constraints reject blank names, titles/content and invalid timestamp ordering. PostgreSQL automatically indexes primary-key and unique constraints; no tuning indexes are included at this stage.

## 4. Limits and deliberate trade-offs

- Case-sensitive `UNIQUE(name)` treats `HR` and `hr` as different strings; the UI/API can enforce a naming convention. A later optional index can make names case-insensitively unique if required.
- Multiple articles can share a title within the same category; no unsupported uniqueness rule is invented.
- `updated_at` is refreshed by application `UPDATE` queries, not a database trigger. Direct manual SQL updates must maintain that field.
- No users, roles, version history, article tags, embeddings, or vector tables are introduced in Phase 1. Authentication based on a shared admin key is suitable for a supervised prototype, not production enterprise identity management.
- `ILIKE` keyword search is only Phase 1; semantic search belongs to the future RAG phase.

**Executable schema:** [`03_schema.sql`](03_schema.sql) · **Diagram:** [`02_er_diagram.png`](02_er_diagram.png).
