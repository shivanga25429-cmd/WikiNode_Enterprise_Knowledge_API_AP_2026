#!/usr/bin/env python3
"""Benchmark AP CP4 queries against local PostgreSQL, using real EXPLAIN times.

Usage: python3 scripts/benchmark_cp4.py --database wikinode_api
All demonstration writes are rolled back. No database is created or dropped.
"""
import argparse
import re
import subprocess
from pathlib import Path
from statistics import mean, median

ROOT = Path(__file__).resolve().parents[1]
WORKLOAD = ROOT / "dbms/04_queries.sql"
PLANS = ROOT / "dbms/plans"
REPORT = ROOT / "dbms/05_query_timings.md"
IDS = [f"R{i}" for i in range(1, 8)] + [f"W{i}" for i in range(1, 7)]
# W3 deletes the demo category; run it only after W4-W6 finish using that category.
EXECUTION_ORDER = [f"R{i}" for i in range(1, 8)] + ["W1", "W2", "W4", "W5", "W6", "W3"]
MARKER = re.compile(r"^-- @(R[1-7]|W[1-6]|END)$")
TIME = re.compile(r"Execution Time:\s*([\d.]+)\s*ms")

def read_queries():
    result, active, lines = {}, None, []
    for line in WORKLOAD.read_text().splitlines():
        m = MARKER.fullmatch(line)
        if m:
            if active in IDS:
                # Ignore comment-only or empty lines after the SQL terminator.
                # R7 is followed by a '-- WRITE DEMO' section heading.
                while lines and (not lines[-1].strip() or lines[-1].lstrip().startswith("--")):
                    lines.pop()
                result[active] = "\n".join(lines).strip()
            active, lines = m.group(1), []
            if active == "END":
                break
        elif active in IDS:
            lines.append(line)
    if set(result) != set(IDS):
        raise ValueError("Expected all 13 query IDs; found " + str(sorted(result)))
    for key, sql in result.items():
        if ("-- READ" if key[0] == "R" else "-- WRITE") not in sql:
            raise ValueError(key + ": missing READ/WRITE annotation")
        if not sql.endswith(";"):
            raise ValueError(key + ": incomplete SQL")
    return result

def benchmark_run(db, queries):
    parts = [r"\set ON_ERROR_STOP on", "BEGIN;", "SET LOCAL search_path TO wikinode;"]
    for key in EXECUTION_ORDER:
        parts.extend([r"\echo AP_START_" + key,
                      "EXPLAIN (ANALYZE, BUFFERS) " + queries[key],
                      r"\echo AP_STOP_" + key])
    parts.append("ROLLBACK;")
    p = subprocess.run(
        ["psql", "-X", "-q", "-P", "pager=off", "-v", "ON_ERROR_STOP=1", "-d", db],
        input="\n".join(parts) + "\n", text=True, capture_output=True, timeout=600)
    if p.returncode:
        raise RuntimeError("PostgreSQL error: " + p.stderr[-3000:])
    results = {}
    for key in IDS:
        beginning, ending = "AP_START_" + key + "\n", "AP_STOP_" + key
        if p.stdout.count(beginning) != 1 or p.stdout.count(ending) != 1:
            raise ValueError("Cannot isolate plan for " + key)
        plan = p.stdout.split(beginning, 1)[1].split(ending, 1)[0].strip()
        # psql aligns QUERY PLAN headings with spaces; keep evidence readable and Git-clean.
        plan = "\n".join(line.rstrip() for line in plan.splitlines())
        times = TIME.findall(plan)
        if len(times) != 1:
            raise ValueError(key + ": expected one real Execution Time")
        results[key] = (float(times[0]), plan)
    return results

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--database", default="wikinode_api")
    db = ap.parse_args().database
    queries = read_queries()
    times = {key: [] for key in IDS}
    plans = {key: [] for key in IDS}
    for run in range(1, 4):
        measured = benchmark_run(db, queries)
        for key in IDS:
            millis, plan = measured[key]
            times[key].append(millis)
            plans[key].append(f"=== {key} run {run} ===\n{plan}\n")
            print(f"{key} run {run}: {millis:.3f} ms", flush=True)
    PLANS.mkdir(parents=True, exist_ok=True)
    for key in IDS:
        (PLANS / (key + ".txt")).write_text("\n".join(plans[key]))
    report = [
        "# AP CP4 — Query Timings and Execution Plans", "",
        "**Project:** WikiNode Enterprise Knowledge API — Team T0109",
        "**Database:** " + db, "",
        "## Methodology", "",
        "- Run existing CP3 workload on the seeded PostgreSQL database.",
        "- Execute seven reads and six writes, in dependency-preserving order, three times.",
        "- Capture real PostgreSQL EXPLAIN (ANALYZE, BUFFERS) execution plans.",
        "- Every pass is enclosed in BEGIN / ROLLBACK, so example writes do not persist.",
        "- Write execution order is W1, W2, W4, W5, W6, W3 to preserve category dependencies.",
        "- Times depend on actual local PostgreSQL data, hardware, and caches.",
        "", "## Measured results", "",
        "| Query | Type | Run 1 (ms) | Run 2 (ms) | Run 3 (ms) | Average (ms) | Median (ms) | Plan |",
        "|---|---|---:|---:|---:|---:|---:|---|",
    ]
    for key in IDS:
        t = times[key]
        report.append(
            "| " + key + " | " + ("READ" if key[0] == "R" else "WRITE")
            + " | " + " | ".join(f"{n:.3f}" for n in t)
            + f" | {mean(t):.3f} | {median(t):.3f} | [plan](plans/{key}.txt) |"
        )
    report.extend([
        "", "## Reproduce", "",
        "Run: python3 scripts/benchmark_cp4.py --database wikinode_api",
        "", "## Evidence", "",
        "- dbms/plans/R1.txt through R7.txt; dbms/plans/W1.txt through W6.txt",
        "- SQL source: dbms/04_queries.sql",
        "- Each plan file contains all three real PostgreSQL executions.", ""
    ])
    REPORT.write_text("\n".join(report))
    print("Saved 13 three-run plan files and the generated timing report.")

if __name__ == "__main__":
    main()
