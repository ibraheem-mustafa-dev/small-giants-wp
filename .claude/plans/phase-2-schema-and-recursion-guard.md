---
doc_type: phase-plan
phase_id: 2
project: small-giants-wp
parent_spec: .claude/specs/14-CLONING-PIPELINE-CATALOGUE.md
parent_plan: .claude/plans/master-spec14-build-plan.md
title: Phase 2 — Schema migrations + recursion-guard module
session_date: 2026-05-11
plan_label: PLAN sonnet
estimated_minutes: 60
---

# Phase 2 — Schema migrations + recursion-guard module

**USP:** Storage layer ready before any FR writes to it. Recursion-safety primitive in place before any DOM-walking script runs.

**Plan label:** `[PLAN: sonnet]`

**Success criteria:**

- [ ] uimax `component_libraries.is_gap_candidate` column exists (INTEGER, DEFAULT 0)
- [ ] uimax `attribute_gap_candidates` table exists with FR8 schema (incl. `status` field with `pending`/`applied`/`discarded` enum)
- [ ] uimax `functionality_gap_candidates` table exists with same lifecycle schema
- [ ] `plugins/sgs-blocks/scripts/recogniser/recursion-guard.py` exists; importable; passes self-test
- [ ] Commit on main: `feat(p2): uimax schema migrations + recursion-guard module`

**Entry context:**

- Spec 14 FR7 (component_libraries column), FR8 (gap-candidate tables), FR18 (recursion-guard build per P1 decision)
- Existing uimax schema at `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db`
- `/uimax-write-validator.py` for write-path checks
- `~/.agents/skills/sgs-wp-engine/scripts/sgs-db.py` for query helper

**Tooling Index:**

| Type | Name | Used in |
|---|---|---|
| cli | Python sqlite3 | Steps 1-3 |
| cli | git | Step 6 |
| inline | Write tool | Step 4 |
| skill | /uimax | Step 5 QA |

---

## Step 1 — [SESSION-START] Pre-flight + uimax DB snapshot

```
Step 1 — Pre-flight
  Model:       inline
  Action:      Run master plan pre-flight invariants. Backup uimax DB: `cp ~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db ~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db.bak-spec14-p2`
  Files:       backup file at ~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db.bak-spec14-p2
  Outcome:     Backup exists; main DB unchanged
  Marker:      SESSION-START
  Time:        2 min
  Cold-Entry:  Read master plan + this phase plan + spec 14 FR7 + FR8
  On-Fail:     If backup fails (disk space, permissions), halt
  Test:
    Happy:       Backup file exists with size > 0
    Edge:        Existing backup with same name → overwrite (intentional)
    Fail:        Disk write fails → halt
    Integration: Subsequent steps mutate the primary DB; rollback path is the backup
```

## Step 2 — Add `is_gap_candidate` column to uimax `component_libraries`

```
Step 2 — FR7 schema migration
  Model:       haiku
  Action:      Run SQL: `ALTER TABLE component_libraries ADD COLUMN is_gap_candidate INTEGER DEFAULT 0`. Verify via PRAGMA table_info.
  Files:       ~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db
  Outcome:     Column exists; all 210 existing rows default to 0
  Marker:      (none)
  Time:        5 min
  Tooling:     Python sqlite3
  On-Fail:     Column already exists (idempotency) → no-op, proceed. Other error → halt + restore from backup
  Test:
    Happy:       PRAGMA shows new column; all rows have value 0
    Edge:        Re-running this step is idempotent (catches existing column)
    Fail:        Different error → restore + halt
    Integration: FR9 (leftover-bucket-router) will write to this column at gap-detection
```

Inline execution:

```python
import sqlite3
db = sqlite3.connect(r'C:\Users\Bean\.agents\skills\ui-ux-pro-max\scripts\ui-ux-pro-max.db')
try:
    db.execute('ALTER TABLE component_libraries ADD COLUMN is_gap_candidate INTEGER DEFAULT 0')
    db.commit()
    print('Added column')
except sqlite3.OperationalError as e:
    if 'duplicate column name' in str(e):
        print('Already exists — idempotent skip')
    else:
        raise
# Verify
cols = [r[1] for r in db.execute("PRAGMA table_info('component_libraries')")]
assert 'is_gap_candidate' in cols
# Count default values
n = db.execute('SELECT COUNT(*) FROM component_libraries WHERE is_gap_candidate IS NULL OR is_gap_candidate = 0').fetchone()[0]
total = db.execute('SELECT COUNT(*) FROM component_libraries').fetchone()[0]
print(f'{n}/{total} rows have default 0')
```

## Step 3 — Create FR8 gap-candidate tables

```
Step 3 — FR8 table creation
  Model:       haiku
  Action:      Create `attribute_gap_candidates` + `functionality_gap_candidates` tables with status field. Both share the same schema shape (with one field difference: `css_property` vs `feature_type`).
  Files:       ~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db
  Outcome:     Both tables exist; status column has CHECK constraint
  Marker:      (none)
  Time:        5 min
  Tooling:     Python sqlite3
  On-Fail:     Table already exists → idempotent skip
  Test:
    Happy:       sqlite_master returns both tables; CHECK constraint visible
    Edge:        Existing tables → skip
    Fail:        Other SQL error → halt + restore
    Integration: FR10 + FR12 + FR13 write rows here; FR21 flips status; FR11 (gap-candidate manifest read) consumes
```

Inline execution:

```python
schemas = {
'attribute_gap_candidates': '''
CREATE TABLE IF NOT EXISTS attribute_gap_candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_slug TEXT NOT NULL,
    selector TEXT NOT NULL,
    css_property TEXT NOT NULL,
    value_seen TEXT,
    role_proposed TEXT NOT NULL,
    confidence REAL NOT NULL CHECK(confidence BETWEEN 0.0 AND 1.0),
    seen_count INTEGER DEFAULT 1,
    last_seen TEXT NOT NULL,
    staged_at TEXT,
    applied_at TEXT,
    provenance TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'applied', 'discarded')),
    UNIQUE(block_slug, selector, css_property)
)
''',
'functionality_gap_candidates': '''
CREATE TABLE IF NOT EXISTS functionality_gap_candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_slug TEXT NOT NULL,
    feature_type TEXT NOT NULL,
    css_signal TEXT NOT NULL,
    role_proposed TEXT,
    confidence REAL CHECK(confidence BETWEEN 0.0 AND 1.0),
    seen_count INTEGER DEFAULT 1,
    last_seen TEXT NOT NULL,
    staged_at TEXT,
    applied_at TEXT,
    provenance TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'applied', 'discarded')),
    UNIQUE(block_slug, feature_type, css_signal)
)
'''
}
import sqlite3
db = sqlite3.connect(r'C:\Users\Bean\.agents\skills\ui-ux-pro-max\scripts\ui-ux-pro-max.db')
for name, ddl in schemas.items():
    db.execute(ddl)
db.commit()
# Verify
for name in schemas:
    info = list(db.execute(f"PRAGMA table_info('{name}')"))
    print(f'{name}: {len(info)} columns')
```

## Step 4 — Build `recursion-guard.py` standalone module

```
Step 4 — Recursion guard module
  Model:       sonnet
  Action:      Write `plugins/sgs-blocks/scripts/recogniser/recursion-guard.py` as a standalone module exporting: `RecursionGuard` class with `enter(node_id)` / `exit(node_id)` context-manager protocol; default `max_depth=12`; `visited_nodes` set tracking visited ids; raises `RecursionGuardError(depth, visited)` typed exception on overflow OR cycle. ~50-70 LOC. Include self-test in `if __name__ == '__main__':` block that runs 3 cases: (a) clean nested walk to depth 11 passes; (b) walk to depth 13 raises typed error; (c) walking the same node twice raises typed error.
  Files:       plugins/sgs-blocks/scripts/recogniser/recursion-guard.py (new, ~70 LOC)
  Outcome:     Module exists; `python recursion-guard.py` self-test prints "PASS 3/3"
  Marker:      (none)
  Time:        25 min
  Tooling:     Write tool, Python
  On-Fail:     Self-test fails → fix the failing case; re-run
  Test:
    Happy:       self-test prints PASS 3/3
    Edge:        max_depth=0 raises immediately on first enter — handle gracefully
    Fail:        cycle detection on shared subtree should fire on FIRST revisit, not Nth
    Integration: FR9 leftover-bucket-router + extract.py + boundary detector import this module
```

## Step 5 — Verify import infrastructure + smoke-test recursion-guard

```
Step 5 — Import smoke test
  Model:       haiku
  Action:      First verify `plugins/sgs-blocks/scripts/recogniser/__init__.py` exists (shipped 2026-05-11 in phase 7 commit 7ac627cf — confirmed in P1). If missing, create empty `__init__.py`. Then run `python -c "from plugins.sgs_blocks.scripts.recogniser.recursion_guard import RecursionGuard; print('OK')"` from repo root.
  Files:       plugins/sgs-blocks/scripts/recogniser/__init__.py (verify exists; create if missing)
  Outcome:     stdout "OK"
  Marker:      (none)
  Time:        3 min
  On-Fail:     ImportError → diagnose Python path
  Test:
    Happy:       "OK" printed; __init__.py exists at expected path
    Edge:        __init__.py missing → create empty file (safe; phase 7's was empty too)
    Fail:        ImportError after __init__.py exists → check Python path setup
    Integration: P3 + P5 + P6 import this module
```

## QA Gate — Schema + module integrity

```
QA Gate — P2 integrity
  Model:       haiku
  Check:       Python script that asserts (1) component_libraries.is_gap_candidate exists; (2) attribute_gap_candidates + functionality_gap_candidates tables exist with status column; (3) recursion-guard.py imports cleanly; (4) recursion-guard self-test passes
  Pass:        Stdout "PASS: P2 schema + recursion-guard ready"
  Fail:        Return to failing step
  Marker:      QA
```

## Step 6 — [HANDOFF] Commit P2

```
Step 6 — Commit P2
  Model:       inline
  Action:      Stage `plugins/sgs-blocks/scripts/recogniser/recursion-guard.py`. Commit message: `feat(p2): uimax schema migrations + recursion-guard module`. Push to main.
  Files:       git commit on main
  Outcome:     Commit visible on origin/main
  Marker:      HANDOFF
  Time:        3 min
  Tooling:     git
  On-Fail:     Pre-commit hook fails → diagnose
  Test:
    Happy:       Commit on origin/main; subject matches
    Edge:        Skip uimax DB binary from commit (it's outside repo at `~/.agents/`)
    Fail:        Hook reject → fix + recommit
    Integration: P3 reads from these tables
```

Note on uimax DB: the database is at `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` — OUTSIDE the project repo. Schema changes are local-state only and not committed via this repo's git. P2 still commits the recursion-guard.py script which IS in the repo.
