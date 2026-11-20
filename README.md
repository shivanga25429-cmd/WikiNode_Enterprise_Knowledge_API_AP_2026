# WikiNode — Enterprise Knowledge API

**Team T0109 · Section A · Phase 1 (faculty demonstration)**

WikiNode centralizes internal HR, IT and Finance policies in PostgreSQL. Employees can browse and search articles. Administrators can create, edit and delete categories and articles through a REST API.

**Technology:** Node.js 20+, Express 5, PostgreSQL 15+, raw parameterized SQL using `pg`. No ORM, vector database, LLM, RAG, login system, or unnecessary Phase 2 features are included.

## Database design

Existing CP1/CP2 assets are preserved:

- `dbms/01_normalization.md` — 1NF to 3NF explanation.
- `dbms/02_er_diagram.png` — one-to-many category → article relationship.
- `dbms/03_schema.sql` — PostgreSQL tables, primary keys, foreign key, checks.
- `dbms/04_queries.sql` — CP3 workload (7 reads, 6 writes, rollback-safe).
- `dbms/05_seed.sql` — re-runnable sample company policies for a live demo.

The foreign key prevents deleting a category while it still contains articles. `updated_at` is set explicitly on updates. All dynamic SQL values use `$1`, `$2`, etc. parameters.

## Quick setup on macOS

PostgreSQL must already be installed, running and accessible. On a Mac with Homebrew PostgreSQL:

```bash
brew services start postgresql@18
pg_isready
createdb wikinode_api
```

If `createdb` says the database exists, **do not drop it**: proceed to the next step. The setup script preserves existing tables and inserts only missing demo content.

From this repository's root:

```bash
test -f .env || cp .env.example .env
npm ci
npm run db:setup
npm test
```

Edit `.env` before starting the server. Set `ADMIN_API_KEY` to a long private string (for example, generate one with `openssl rand -hex 24`), not the example placeholder. For local PostgreSQL with an alternative database username or password, adjust `DATABASE_URL` accordingly.

Terminal 1:

```bash
npm start
```

Terminal 2:

```bash
curl -s http://localhost:3000/health
npm run demo
```

`npm run demo` performs real create, read, update, keyword search and delete requests; it cleans up its own temporary records. The three seed categories and sample articles remain available for browsing.

## API contract

All responses contain `data` (plus `pagination` for lists/search), except successful deletes (HTTP 204). Errors use `{ "error": { "code": "...", "message": "..." } }`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Database health check |
| GET | `/api/categories` | Public | List categories |
| GET | `/api/categories/:id` | Public | Get one category |
| POST | `/api/categories` | Admin | Create category |
| PUT | `/api/categories/:id` | Admin | Update category |
| DELETE | `/api/categories/:id` | Admin | Delete unused category |
| GET | `/api/articles?category_id=1&limit=20&offset=0` | Public | List/filter articles |
| GET | `/api/articles/:id` | Public | Get one article |
| POST | `/api/articles` | Admin | Create article |
| PUT | `/api/articles/:id` | Admin | Update article |
| DELETE | `/api/articles/:id` | Admin | Delete article |
| GET | `/api/search?q=leave&category_id=1` | Public | Case-insensitive keyword search |

`category_id` in filters is optional. `limit` defaults to 20 (maximum 100); `offset` defaults to 0. Search checks title and content with SQL `ILIKE` and treats `%`/`_` as literal characters. A missing or invalid ID returns HTTP 404 or 400, respectively; invalid data returns 400, duplicate category names and referenced-category deletion return 409. Admin mutations require the `X-Admin-Key` request header matching `.env`.

### Example requests

```bash
# Browse categories and articles without authentication
curl http://localhost:3000/api/categories
curl http://localhost:3000/api/articles
curl 'http://localhost:3000/api/search?q=receipt'

# Create a category (use your actual .env secret)
curl -X POST http://localhost:3000/api/categories \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Key: YOUR_SECRET_FROM_ENV' \
  -d '{"name":"Operations","description":"Internal operating procedures"}'

# Create an article (replace category_id with an existing ID)
curl -X POST http://localhost:3000/api/articles \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Key: YOUR_SECRET_FROM_ENV' \
  -d '{"category_id":1,"title":"Leave Request","content":"Ask your manager before leave."}'
```

Do not commit `.env`; only `.env.example` belongs in Git.

## Faculty presentation flow (3–5 minutes)

1. Explain the problem: company policies are scattered across teams; WikiNode centralizes them.
2. Show the ER diagram and the two 3NF tables (`categories`, `articles`) with a restrictive foreign key.
3. Show `npm test` passing, then start the server and open `/health`.
4. Run `npm run demo` live. Explain `X-Admin-Key`, CRUD operations and `ILIKE` search.
5. Show the reported result and explain that temporary demo records were removed.
6. Mention Phase 2 RAG/semantic search only as future scope; it is **not part of this submission**.

## Tests

`npm test` exercises the actual CP2 PostgreSQL DDL in an in-memory PostgreSQL engine (PGlite), then tests HTTP routes, authentication, CRUD, search, constraints, SQL parameterization behavior, and CP3 workload rollback. It requires no separate test database.

For an additional real PostgreSQL smoke test on the Mac, run `npm run db:setup`, `npm start`, and `npm run demo` against `wikinode_api` as shown above.

## Team ownership

| Member | Phase 1 responsibility | Files |
|---|---|---|
| **Navneet Kumar** | Project setup, documentation, automated QA and faculty demo | `package.json`, `package-lock.json`, `.env.example`, `.gitignore`, `README.md`, `tests/api.test.js`, `scripts/demo.mjs` |
| **Jatasay Khetaan** | Raw PostgreSQL connection and seed/setup scripts | `src/db.js`, `dbms/05_seed.sql`, `scripts/setup-db.mjs` |
| **Paras Dhankhar** | Express server, admin middleware, errors and categories CRUD | `src/app.js`, `src/server.js`, `src/middleware/`, `src/routes/categories.js` |
| **Shivang Agarwal** | Articles CRUD, search and input validation | `src/routes/articles.js`, `src/routes/search.js`, `src/lib/validation.js` |

Contributors should commit only files they actually worked on and review. Do not change Git author identities to manufacture contributions. Each person's separate ZIP contains their assigned files.

## Deliberate limits

This is a teaching/demo application, not a public enterprise production system. The shared admin key is appropriate only for a supervised local prototype. Enterprise identity, role-based access, file uploads, vector embeddings, RAG, and a frontend are out of the agreed Phase 1 scope.
