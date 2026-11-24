# AP CP4 — Query Timings and Execution Plans

**Project:** WikiNode Enterprise Knowledge API — Team T0109
**Database:** wikinode_api

## Methodology

- Run existing CP3 workload on the seeded PostgreSQL database.
- Execute seven reads and six writes, in dependency-preserving order, three times.
- Capture real PostgreSQL EXPLAIN (ANALYZE, BUFFERS) execution plans.
- Every pass is enclosed in BEGIN / ROLLBACK, so example writes do not persist.
- Write execution order is W1, W2, W4, W5, W6, W3 to preserve category dependencies.
- Times depend on actual local PostgreSQL data, hardware, and caches.

## Measured results

| Query | Type | Run 1 (ms) | Run 2 (ms) | Run 3 (ms) | Average (ms) | Median (ms) | Plan |
|---|---|---:|---:|---:|---:|---:|---|
| R1 | READ | 0.049 | 0.118 | 0.065 | 0.077 | 0.065 | [plan](plans/R1.txt) |
| R2 | READ | 0.023 | 0.044 | 0.033 | 0.033 | 0.033 | [plan](plans/R2.txt) |
| R3 | READ | 0.051 | 0.102 | 0.100 | 0.084 | 0.100 | [plan](plans/R3.txt) |
| R4 | READ | 0.011 | 0.021 | 0.021 | 0.018 | 0.021 | [plan](plans/R4.txt) |
| R5 | READ | 0.066 | 0.041 | 0.037 | 0.048 | 0.041 | [plan](plans/R5.txt) |
| R6 | READ | 0.019 | 0.017 | 0.013 | 0.016 | 0.017 | [plan](plans/R6.txt) |
| R7 | READ | 0.081 | 0.158 | 0.147 | 0.129 | 0.147 | [plan](plans/R7.txt) |
| W1 | WRITE | 0.148 | 0.218 | 0.182 | 0.183 | 0.182 | [plan](plans/W1.txt) |
| W2 | WRITE | 0.183 | 0.195 | 0.193 | 0.190 | 0.193 | [plan](plans/W2.txt) |
| W3 | WRITE | 0.074 | 0.112 | 0.085 | 0.090 | 0.085 | [plan](plans/W3.txt) |
| W4 | WRITE | 0.558 | 0.201 | 0.179 | 0.313 | 0.201 | [plan](plans/W4.txt) |
| W5 | WRITE | 0.093 | 0.111 | 0.093 | 0.099 | 0.093 | [plan](plans/W5.txt) |
| W6 | WRITE | 0.022 | 0.029 | 0.024 | 0.025 | 0.024 | [plan](plans/W6.txt) |

## Reproduce

Run: python3 scripts/benchmark_cp4.py --database wikinode_api

## Evidence

- dbms/plans/R1.txt through R7.txt; dbms/plans/W1.txt through W6.txt
- SQL source: dbms/04_queries.sql
- Each plan file contains all three real PostgreSQL executions.
