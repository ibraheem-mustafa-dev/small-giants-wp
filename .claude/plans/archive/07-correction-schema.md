# Spec 07: Correction Accumulator
**Target:** Cerebras | **Time:** 10 min

New pipeline_corrections table + sgs-db.py corrections list/add commands.

**File:** C:/Users/Bean/.agents/skills/sgs-wp-engine/scripts/sgs-db.py

**DDL:** pipeline_corrections(id, pipeline TEXT, stage TEXT, source_url TEXT, technique TEXT, outcome TEXT, correction TEXT, created_at TEXT DEFAULT datetime now).

**Commands:**
- corrections list [--pipeline name]
- corrections add --pipeline name --outcome success/failure/timeout --correction text

**Rules:** cmd_corrections(), ensure_tables() at startup, backup DB, use print_table(), do NOT modify existing code.

**Verify:** list empty OK, add returns ID, list shows entry, stats works.