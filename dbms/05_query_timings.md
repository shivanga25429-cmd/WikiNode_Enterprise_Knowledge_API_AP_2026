# AP CP4 — Query Timings and Execution Plans

**Project:** WikiNode Enterprise Knowledge API — Team T0109

## Status

NOT MEASURED — execute the benchmark on the team's local PostgreSQL database.
Do not substitute estimates or DE-project timings for the AP workload.

## Run measured benchmarks

1. Start PostgreSQL and initialize the AP database using the README instructions:
   - Ensure the database is available (normally wikinode_api).
   - Run npm run db:setup to install the schema and sample articles.
2. From the repository root, run:

       python3 scripts/benchmark_cp4.py --database wikinode_api

3. The runner replaces this template with a measured report and writes 13 execution-plan
   files under dbms/plans/. Each plan has three PostgreSQL EXPLAIN (ANALYZE, BUFFERS)
   executions. Writes execute in one transaction per run and are rolled back.
4. Review timings, verify the plans and commit dbms/05_query_timings.md and dbms/plans/.

## Queries

| Query IDs | Type | Runs | Evidence |
|---|---|---|---|
| R1–R7 | READ | 3 per query, pending | dbms/plans/R1.txt–R7.txt |
| W1–W6 | WRITE | 3 per query, pending | dbms/plans/W1.txt–W6.txt |

Source: dbms/04_queries.sql. The script does not create or delete databases.
