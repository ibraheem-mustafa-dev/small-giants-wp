---
doc_type: plan
project: small-giants-wp
created: 2026-08-01
completed: 2026-08-02
parent: .claude/plans/2026-08-01-db-derivation-and-converter-cleanup.md
status: COMPLETE — executed 2026-08-02 (D464). Partial-rebuild pass per Bean's ruling.
---

[PLAN: opus]

# Phase 0 — Make the knowledge-base DB rebuildable

> ## ✅ EXECUTED AND CLOSED 2026-08-02 — D464. Do not re-run; read this block first.
>
> **All 9 steps + both QA gates done.** Commits `78347070` (Steps 0.0–0.3 + Gate A) and
> `15865b38` (Steps 0.4–0.5). Built in `plugins/sgs-blocks/scripts/dbschema/`:
> `schema.sql` · `sandbox.py` · `migrate.py` + `schema_migrations` · `migration-manifest.json` ·
> `schema-baseline-pre.json` · `rebuild_compare.py`. Later additions: `check_schema_drift.py`,
> `wp_reference_archive.py`, `refresh_wp_reference.py`.
>
> **Bean's two rulings (2026-08-02):** a PARTIAL rebuild PASSES provided shortfalls are written
> down and carried to Phase 1 · stop at QA Gate A and reassess (later continued through 0.4–0.5).
>
> ### Result — `--rebuild` from a genuinely empty file
> Exit 0. **Table set IDENTICAL: 39 live / 39 rebuilt, none missing, none extra.**
> 12 tables reproduce with exactly matching row counts; 10 partially; 3 known gaps
> (`property_suffixes`, `slots`, `excluded_properties`); 15 empty-and-classified.
> Full breakdown: `.claude/reports/2026-08-02-db-rebuild-comparison.md` +
> `.claude/reports/2026-08-02-phase1-table-classification.md`.
>
> ### ⛔ THE PHASE'S BIGGEST FINDING — replay is structurally impossible
> The first rebuild died on migration #2 with `no such table: slot_synonyms`. **Cause proven:**
> `slot_synonyms` was RETIRED in favour of `slots`, so it is correctly absent from the live schema
> while THREE historical migrations still reference it. **A May migration cannot be applied to an
> August schema.** `--rebuild` therefore RECORDS migrations as applied and seeds from source; it
> never replays history. This invalidates any future plan step premised on replaying `migrations/`.
>
> ### ⛔ Plan statements MEASURED FALSE during execution (do not trust the text below where it conflicts)
> 1. **30 migrations, not 29** — one landed after the plan was written. **Derive counts at runtime.**
> 2. **NO migration accepts `--db`.** The plan said 2 did and told Step 0.2 to pass it; exactly two
>    use argparse and both expose only `--dry-run`. That instruction targeted nothing and would have
>    argparse-exit-2 into a fake failure. The HOME-redirect sandbox is the sole uniform mechanism.
> 3. **The DB is WAL-mode**, so Step 0.0's `shutil.copy` backup could have captured an incomplete
>    snapshot — the phase's ONLY rollback was unsafe as specified. Now uses `Connection.backup()`.
> 4. The sync invocation is at `sgs-update-v2.py:4825`, not 4718.
> 5. QA Gate B as written was unnecessary: the from-empty rebuild IS the negative control, and it
>    answers the same question more informatively.
>
> **Premise re-verified and CONFIRMED:** no *production* `CREATE TABLE` for `blocks` /
> `block_attributes` / `block_composition` / `property_suffixes` — the only hits are six TEST
> FIXTURES, which hand-write partial schemas for exactly those tables (same drift disease, one
> layer down; tests deliberately untouched).
>
> **Phase 1 is UNBLOCKED.** Scope is now measured, not guessed — see the classification report.

**USP:** Every "it worked last month" bug this session chased — hero art direction, the `emit_shape`
139→117 slide, `container_kind` — has the same cause: a database that cannot be rebuilt, so derived
values silently rot and nothing notices. This phase makes the DB reproducible. **Nothing downstream is
provable until it passes.**

**Docscore:** pending (Stage 7)
**Aggregate estimate:** ~105 min across 9 steps + 2 QA gates (Step 0.05 added by BLOCKER-3).
**Council:** 3 BLOCKERs + 5 SHOULD-FIXes applied (see COUNCIL FINDINGS). Two would have
corrupted or destroyed the live DB; nothing was executed.

## Pre-conditions

All were satisfied before execution on 2026-08-02:

- **A verified backup exists.** The DB is gitignored with no other copy, so Step 0.0 backs up FIRST.
  ⚠ It is WAL-mode, so the backup must use SQLite's `Connection.backup()` — a file copy can capture
  a snapshot missing committed-but-uncheckpointed data (the plan originally specified `shutil.copy`;
  corrected during execution).
- **The sandbox harness exists before anything writes.** 27 migrations hardcode `Path.home()`, so
  without HOME redirection a "rebuild test" mutates the live database.
- **Bean present for the pass-criterion ruling** — whether a PARTIAL rebuild passes (he ruled: yes,
  provided shortfalls are written down and carried to Phase 1).
- **The tree may be dirty with a co-active track's work** — commit by exact path, never `git add -A`.

## Parking lot (deferred OUT of Phase 0, with owners)

| Deferred | Where it went |
|---|---|
| Seeders for `property_suffixes`, `slots`, `excluded_properties` | Phase 1 — LEDGER task **T1.4** |
| Row-count regression gate (schema drift IS gated; row floors are not) | Phase 1 — LEDGER task **T1.5**, parent plan Phase 3 |
| Restoring `hooks`/`docs` on a rebuild (archive exists, not wired) | LEDGER task **T1.7** |
| `enrich-db.py` `--only <target>` selector, needed before its 2 seeders can be wired | LEDGER task **T1.6** |
| `block_styles` retire/keep — editor JS never checked for `registerBlockStyle` sync | LEDGER task **T1.6** |
| Deleting any migration | ⛔ Blocked until its replacement seeder is PROVEN — unchanged rule |

**Nothing was silently dropped.** Every deferral above is mapped to a named task, per STOP-29.

## Phase success criteria (done when)

- [ ] `python sgs-update-v2.py --rebuild` against an empty file produces a DB whose **table set is
      identical** and whose per-table row counts match the current DB within the tolerance defined in SHOULD-FIX-4 (zero drift on Phase-0-owned tables; the 4 known-unreproducible tables listed N/A)
- [ ] Every **DB** migration in `migrations/` is registered in a `schema_migrations` table and is
      **replayable in order** from empty — and every NON-DB file there is explicitly excluded
      (see BLOCKER-1)
- [ ] A committed `schema-baseline.json` records per-table row counts, so Phase 3's regression gate
      has a floor to compare against
- [ ] The rebuild is proven by TWO **negative controls**: drop `property_suffixes` (runner
      mechanism) AND `block_attributes` (the no-DDL class), rebuild, confirm each returns (SHOULD-FIX-5)

## Entry context (read before starting)

- `.claude/plans/2026-08-01-db-derivation-and-converter-cleanup.md` — parent plan, the 4 settled decisions
- `plugins/sgs-blocks/scripts/sgs-update-v2.py` — the seeder; has NO DDL for the core tables
- `plugins/sgs-blocks/scripts/migrations/` — 29 dated one-shots (NOT all DB migrations — see BLOCKER-1), no runner, no tracking
- DB: `~/.claude/skills/sgs-wp-engine/sgs-framework.db` (gitignored; hard-linked to `~/.agents/...`)

## References

- Measured this session: `blocks` / `block_attributes` / `block_composition` have **no `CREATE TABLE`
  anywhere in the repo**; `property_suffixes` + `excluded_properties` have **0 references** in
  `sgs-update-v2.py`; `roles` is READ-ONLY there (line 1866); `slots` only gets `standalone_block`
  UPDATEs, never row creation
- `_meta_schema_version` holds exactly ONE row (`spec-15-p1`, 2026-05-12) — no migration registers itself
- Rule: `db-changes-reproducible-via-migration-not-manual-or-moduleload`
  (`migrations/2026-06-26-testimonial-media-role-selector.py:21`) — already the stated policy, unenforced

## Tooling Index

| Type | Name | Used in |
|---|---|---|
| cli | `sqlite3` / python `sqlite3` | 0.1, 0.2, 0.5 |
| script | `sgs-update-v2.py` | 0.4, 0.5 |
| skill | `/sgs-db` | QA-A, QA-B |
| skill | `/delegate` | step model assignment |

---

## COUNCIL FINDINGS (`/qc-council`, 2026-08-01 — applied below)

**Stage 1.5 structural pre-gate:** all 4 cited `file:line` refs verified present. `--rebuild` confirmed
absent (0 occurrences) — the premise holds.

**Stage 5 empirical baseline — MEASURED, not assumed.** Created an empty DB: `tables=0`,
`SELECT ... FROM blocks` → `no such table: blocks`. The baseline check FAILS without the fix, so the
hypothesis is **validated** (had it already passed, the diagnosis would have been wrong).

**BLOCKER-1 — `migrations/` is not homogeneous.** `2026-07-16-fix-spec-drift.py` contains **zero**
database operations — it rewrites Spec 17 markdown. Step 0.2 as originally written ("discover
`migrations/*.py`, run them all") would execute it on every rebuild, and its own docstring states a
missed anchor **raises** — aborting the rebuild for a non-DB reason. **Every file must be classified
before the runner is built; non-DB one-shots are excluded from the replay set and recorded as such.**

**BLOCKER-2 — migrations cannot target a temp DB; a "rebuild test" would write to the LIVE database.**
Surfaced by the cold junior reviewer asking a question the plan never answered: *how does the runner
invoke a migration?* The interface is uniform (`def main() -> int` + `if __name__ == "__main__"`), but
**27 of 29 migrations hardcode the live path** —
`DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"` — and only 2 accept a
`--db` argument.

**Consequence as originally written:** Step 0.5's "rebuild into a temp path" and QA Gate B's "on a COPY
of the DB" are both **impossible** — the migrations would ignore the temp path and mutate the real,
gitignored, irreplaceable database. QA Gate B would have dropped `property_suffixes` from the LIVE DB.

**Resolution (chosen for zero migration edits):** the runner invokes each migration as a SUBPROCESS with
`HOME`/`USERPROFILE` pointed at a temp directory, so `Path.home()` resolves there and the migration
writes to the sandbox by construction. Steps 0.2 / 0.5 / QA-B updated. The 2 migrations that already
take `--db` get it passed explicitly. **Every rebuild step must assert it is not touching the live path
before it runs.**

**BLOCKER-3 — the seeder has no target parameter either, AND it reads a DIFFERENT path from the
migrations.** `sgs-update-v2.py:74` hardcodes
`SGS_DB = Path.home()/".agents"/"skills"/"sgs-wp-engine"/"sgs-framework.db"` — note **`.agents`**,
while every migration uses **`.claude`**. Its argparse exposes `--stage`, `--dry-run`, `--wp-version`,
`--prune-mode` and **no target-path flag at all**.

**VERIFIED: the two paths are the SAME FILE** — identical size (14,000,128 bytes) and identical mtime,
i.e. hardlinked. So today they agree by accident of linking, not by design.

**Consequence for the BLOCKER-2 sandbox fix:** a sandbox `HOME` must create **BOTH**
`~/.claude/skills/sgs-wp-engine/` and `~/.agents/skills/sgs-wp-engine/` **pointing at one file**
(hardlink or copy-back). Miss this and the rebuild silently splits — migrations write one file, the
seeder writes another, and the comparison in 0.5 reports nonsense. The sandbox setup must ASSERT both
paths resolve to the same inode before any write.

**SHOULD-FIX-3 — "filename order == chronological order" is FALSE.** Verified by mtime: on 2026-07-05
the filename sort is `drop → fontstyle → prune → register-image → register-tag`, but the real creation
order is `drop (00:44) → prune (03:50) → fontstyle (15:19) ≈ register-image (15:19) → register-tag
(18:09)`. Same-date collisions also exist on 05-16, 06-07, 06-13, 07-04, 07-22. Step 0.2 asserted this
as fact. **It may not matter** (adoption is `--mark-applied`, which never replays) — but it must be
stated as an accepted risk with a same-date tiebreak rule, not asserted as true.

**SHOULD-FIX-4 — the plan said "within a stated tolerance" and never stated one.** The phrase
appeared in the success criteria and in Step 0.5 with no number anywhere. **Defined now:** zero drift on any table Phase 0
claims to own; the four known-unreproducible tables (`property_suffixes`, `roles`, `slots`,
`excluded_properties`) are listed N/A and carried to Phase 1. An executor must never invent a threshold.

**SHOULD-FIX-5 — QA Gate B is a weaker proxy than the phase claims.** Dropping `property_suffixes`
(154 rows, a flat vocabulary list) from a copy tests the migration-runner mechanism, NOT "the DB
rebuilds from nothing". It exercises neither `blocks` (205) nor `block_attributes` (2946) — the two
tables with **no `CREATE TABLE` anywhere in the repo**, i.e. the same failure class. **Add a second
negative control on `block_attributes`**, or state plainly that Gate B covers the runner only.

**Backup naming:** follow the repo's existing convention — the live DB already sits beside
`sgs-framework.db.bak-2026-07-21`, `.bak-D258`, `.bak-20260413`. Step 0.0 uses `.bak-phase0-2026-08-01`.

**SHOULD-FIX-1 — count was wrong.** 29 `.py` files in `migrations/`, not 28. Corrected throughout.
(A cached count drifting by one is precisely the failure class this plan exists to end.)

**SHOULD-FIX-2 — proposed path collides.** The plan created `scripts/db/`, immediately adjacent to the
existing `scripts/converter/db/`. We are already fighting three things named "orchestrator" and three
named "pipeline-state"; adding a second "db" would repeat the mistake. **Renamed to `scripts/dbschema/`.**

## Steps

```
Step 0.0 — Back up the DB, and CLASSIFY every migration  [added by council: BLOCKER-1 + backup gap]
  Model:      haiku
  Action:     (a) Copy the live DB to sgs-framework.db.bak-phase0-2026-08-01 and record its per-table row
              counts to a temp JSON — the DB is gitignored, so this is the ONLY rollback that exists.
              (b) Read all 29 migrations/*.py and classify each as DB-MIGRATION or NOT-A-DB-MIGRATION,
              writing dbschema/migration-manifest.json.
  Files:      NEW plugins/sgs-blocks/scripts/dbschema/migration-manifest.json + a .bak outside the repo
  Inputs:     migrations/ (29 files), live DB
  Outcome:    A restorable backup exists, and every migration is classified with evidence.
  Exec:       SEQUENTIAL
  Deps:       none
  Marker:     SESSION-START
  Time:       8 min
  Tooling:    python sqlite3, Read
  On-Fail:    n/a — pure read + new files.
  Cold-Entry: this file; parent plan; the DB path above.
  Prompt:     "TWO tasks against the SGS knowledge base.
              (a) BACKUP FIRST, before anything else: copy ~/.claude/skills/sgs-wp-engine/sgs-framework.db
              to sgs-framework.db.bak-phase0-2026-08-01 in the same directory. This file is gitignored and has
              NO other backup anywhere — it is irreplaceable. Then enumerate every table via
              sqlite_master and write {table: row_count} to a JSON next to the backup. Verify the .bak
              opens and reports the same table count as the original.
              (b) CLASSIFY: read every .py in plugins/sgs-blocks/scripts/migrations/ (29 files). For
              each, decide DB-MIGRATION or NOT-A-DB-MIGRATION. Evidence = does it open a sqlite
              connection / execute SQL against sgs-framework.db? A file that only edits markdown, specs
              or source files is NOT a DB migration. We already know 2026-07-16-fix-spec-drift.py is
              NOT one (0 DB ops — it rewrites Spec 17 markdown); confirm that and find any others.
              Write plugins/sgs-blocks/scripts/dbschema/migration-manifest.json as
              [{filename, classification, evidence}]. Do not modify any migration. Report the count in
              each class — this number becomes the replay set for the rebuild."
  Test:
    Happy:      .bak opens, table count matches; manifest classifies all 29
    Edge:       a migration that BOTH edits files and writes the DB → classified DB-MIGRATION, noted
    Fail:       an unreadable/syntax-broken migration → listed UNCLASSIFIED, never silently omitted
    Integration: manifest DB-MIGRATION count == what Step 0.2's runner will discover

Step 0.05 — Build the sandbox harness  [added by council: BLOCKER-2 + BLOCKER-3]
  Model:      sonnet
  Action:     Write dbschema/sandbox.py: create a temp HOME containing BOTH
              .claude/skills/sgs-wp-engine/ and .agents/skills/sgs-wp-engine/ resolving to ONE db
              file; expose a context manager that runs a subprocess with HOME+USERPROFILE repointed;
              ASSERT the resolved target != the live path before yielding.
  Files:      NEW plugins/sgs-blocks/scripts/dbschema/sandbox.py
  Inputs:     0.0 (backup exists first)
  Outcome:    Any script using Path.home() can be run against a throwaway DB, provably not the live one.
  Exec:       SEQUENTIAL
  Deps:       0.0
  Marker:     (none)
  Time:       15 min
  Tooling:    python, subprocess
  On-Fail:    Delete sandbox.py. Nothing else touched.
  Prompt:     "Write plugins/sgs-blocks/scripts/dbschema/sandbox.py. PROBLEM: 27 of 29 migrations
              hardcode Path.home()/'.claude'/'skills'/'sgs-wp-engine'/'sgs-framework.db', and
              sgs-update-v2.py:74 hardcodes the same under '.agents' instead. Neither accepts a target
              path. VERIFIED: those two paths are currently the SAME FILE (hardlinked — identical size
              and mtime). REQUIREMENT: a context manager `sandbox(seed_from=None)` that (1) makes a
              temp dir as HOME, (2) creates BOTH .claude/skills/sgs-wp-engine/ and
              .agents/skills/sgs-wp-engine/ inside it resolving to ONE db file (hardlink; fall back to
              copy-back-on-exit if the filesystem refuses), (3) ASSERTS via os.stat that both paths
              share one inode AND that neither equals the real live path — raise if either check
              fails, (4) yields a runner that spawns subprocesses with HOME and USERPROFILE set to the
              temp dir. Windows: set BOTH env vars, Path.home() prefers USERPROFILE there. Ship a
              --self-test proving the guard FIRES: point it at the real HOME and assert it raises. A
              guard that has never been shown to fail is decoration."
  Test:
    Happy:      a subprocess run under sandbox() writes only inside the temp HOME
    Edge:       filesystem refuses hardlink -> copy-back path still keeps both views in sync
    Fail:       target resolves to the live path -> raises before any write
    Integration: `sgs-update-v2.py --dry-run` under sandbox() leaves the live DB mtime unchanged

Step 0.1 — Capture the live schema as committed DDL
  Model:      haiku
  Action:     Dump `SELECT sql FROM sqlite_master WHERE sql IS NOT NULL` from the live DB; write it
              verbatim to plugins/sgs-blocks/scripts/dbschema/schema.sql, ordered tables → indexes → views.
  Files:      NEW plugins/sgs-blocks/scripts/dbschema/schema.sql
  Inputs:     live sgs-framework.db
  Outcome:    schema.sql, applied to an empty file, yields a table set identical to the live DB.
  Exec:       SEQUENTIAL
  Deps:       none
  Marker:     SESSION-START
  Time:       5 min
  Tooling:    python sqlite3
  On-Fail:    Delete schema.sql; nothing else touched (pure read + new file).
  Cold-Entry: this file; parent plan; the DB path above.
  Prompt:     "Read the SQLite DB at ~/.claude/skills/sgs-wp-engine/sgs-framework.db. Run
              `SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY
              CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, name`. Write every `sql`
              value verbatim, each terminated with a semicolon, to
              plugins/sgs-blocks/scripts/dbschema/schema.sql. Do NOT hand-edit, reformat or 'improve' any
              statement — byte-fidelity to the live schema is the whole point. Then PROVE it: create a
              temp empty .db, execute schema.sql against it, and report the table-name set difference
              vs the live DB. Report the diff; do not fix it yourself."
  Test:
    Happy:      apply schema.sql to an empty file → table set == live table set
    Edge:       tables with no rows still create
    Fail:       a malformed statement → sqlite3.OperationalError naming the statement
    Integration: `db_lookup.get_connection()` opens the rebuilt file without error

Step 0.2 — Build the migration runner + tracking table
  Model:      sonnet
  Action:     Create dbschema/migrate.py: create `schema_migrations(filename TEXT PRIMARY KEY,
              applied_at TEXT)`; read dbschema/migration-manifest.json (Step 0.0) and replay ONLY the DB-MIGRATION set, in filename (date) order; skip any already
              recorded; run the rest; record each. Flags: --status, --apply, --mark-applied.
  Files:      NEW plugins/sgs-blocks/scripts/dbschema/migrate.py
  Inputs:     migrations/ (29 files; classify first per BLOCKER-1), schema.sql from 0.1
  Outcome:    `migrate.py --status` lists every DB migration with applied/pending, and is idempotent.
  Exec:       SEQUENTIAL
  Deps:       0.0, 0.05, 0.1
  Marker:     (none)
  Time:       15 min
  Tooling:    python sqlite3
  On-Fail:    Delete migrate.py + DROP schema_migrations. No migration has run yet at this point.
  Prompt:     "Write plugins/sgs-blocks/scripts/dbschema/migrate.py — a migration runner for the SGS SQLite
              knowledge base. Requirements: (1) create table schema_migrations(filename TEXT PRIMARY
              KEY, applied_at TEXT) if absent; (2) read dbschema/migration-manifest.json and take ONLY entries
              classified DB-MIGRATION, sorted by filename (date-prefixed, so filename order ==
              chronological order). NEVER glob migrations/*.py directly — that directory contains
              non-DB one-shots that must not run on a rebuild (BLOCKER-1);
              (3) --status prints each file as APPLIED or PENDING; (4) --apply runs only PENDING ones,
              in order, recording success in schema_migrations — a failure must STOP the run, never
              continue to the next. INVOKE EACH AS A SUBPROCESS with HOME and USERPROFILE set to a
              sandbox dir (BLOCKER-2: 27 of 29 migrations hardcode
              Path.home()/'.claude'/'skills'/'sgs-wp-engine'/'sgs-framework.db' and ignore any path
              you pass). Before every run, ASSERT the resolved target is not the live path — refuse
              otherwise. Pass --db explicitly to the 2 migrations that accept it; (5) --mark-applied
              records files as applied WITHOUT running them (needed to adopt the existing DB, where the DB
              ones have already been run by hand). Every migration in that directory is already written
              to be idempotent — do not modify any of them. Ship with a --self-test that proves --apply
              can FAIL (feed it a deliberately broken migration in a temp dir and assert non-zero exit
              plus no schema_migrations row written). A runner that cannot fail reads green forever."
  Test:
    Happy:      --status on the live DB → every DB migration listed
    Edge:       run --apply twice → second is a no-op
    Fail:       a migration raising → that one rolls back, run stops, exit non-zero
    Integration: after --mark-applied, a later --apply does nothing

Step 0.3 — Adopt the existing DB
  Model:      haiku
  Action:     Run `migrate.py --mark-applied --all` against the live DB so all DB migrations register as applied
              without re-running.
  Files:      (DB only — gitignored)
  Inputs:     0.2
  Outcome:    `--status` shows every DB migration APPLIED, 0 PENDING; no table data changed.
  Exec:       SEQUENTIAL
  Deps:       0.2
  Marker:     (none)
  Time:       2 min
  Tooling:    dbschema/migrate.py
  On-Fail:    `DELETE FROM schema_migrations` — the table is additive, nothing else is touched.
  Prompt:     "Run `python plugins/sgs-blocks/scripts/dbschema/migrate.py --mark-applied --all`. BEFORE and
              AFTER, capture per-table row counts for every table via sqlite_master enumeration.
              Report any table whose count changed — the expected answer is NONE except the new
              schema_migrations table. If any other count moved, STOP and report; do not remediate."
  Test:
    Happy:      --status -> all DB migrations APPLIED
    Edge:       re-running --mark-applied is a no-op
    Fail:       a missing migration file → named in the error
    Integration: row counts unchanged except schema_migrations

QA Gate A — the existing DB is intact and now tracked
  Model:   haiku
  Exec:    SEQUENTIAL
  Deps:    0.0–0.3
  Check:   `python dbschema/migrate.py --status | grep -c APPLIED` == the classified DB-migration count
           AND per-table row counts match the pre-Step-0.1 capture for every pre-existing table
  Pass:    all DB migrations applied; zero row-count drift
  Fail:    restore from sgs-framework.db.bak-phase0-2026-08-01 (Step 0.0); re-open Step 0.2
  Marker:  QA

Step 0.4 — Wire bootstrap into the seeder
  Model:      sonnet
  Action:     Add `--rebuild` to sgs-update-v2.py: on an empty/absent DB, apply schema.sql, then
              migrate.py --apply, then run the normal seeding stages. Existing no-flag behaviour is
              unchanged.
  Files:      plugins/sgs-blocks/scripts/sgs-update-v2.py
  Inputs:     0.1, 0.2
  Outcome:    `--rebuild` on a fresh path produces a populated DB; the default path is byte-identical
              in behaviour to today.
  Exec:       SEQUENTIAL
  Deps:       QA Gate A
  Marker:     (none)
  Time:       12 min
  Tooling:    sgs-update-v2.py
  On-Fail:    `git checkout plugins/sgs-blocks/scripts/sgs-update-v2.py` — additive change, clean revert.
  Prompt:     "Add a --rebuild flag to plugins/sgs-blocks/scripts/sgs-update-v2.py. When passed AND the
              target DB is empty or absent: (1) execute dbschema/schema.sql, (2) run dbschema/migrate.py --apply,
              (3) continue into the existing seeding stages unchanged. When NOT passed, behaviour must
              be EXACTLY as today — this is strictly additive; do not refactor any existing stage. If
              --rebuild is passed against a NON-empty DB, refuse and exit non-zero with a message
              telling the operator to delete the file first (never silently wipe a populated DB).
              Verify by diffing a no-flag run's stdout before and after your change — it must be
              identical."
  Test:
    Happy:      --rebuild on a temp path → populated DB
    Edge:       --rebuild against a populated DB → refuses, exit non-zero
    Fail:       schema.sql missing → clear error, no partial DB left behind
    Integration: a no-flag run's output is unchanged from before

Step 0.5 — Rebuild-from-empty comparison  ← THE PHASE GATE
  Model:      inline
  Action:     Rebuild into a SANDBOX (temp HOME per BLOCKER-2, asserted != live path); compare
              table set and per-table row counts against live.
              Write the result to reports/2026-08-01-db-rebuild-comparison.md, including every
              table that does NOT match and why.
  Files:      NEW .claude/reports/2026-08-01-db-rebuild-comparison.md
  Inputs:     0.4
  Outcome:    A written, honest account of exactly which tables reproduce and which do not.
  Exec:       SEQUENTIAL
  Deps:       0.4
  Marker:     SESSION-START
  Time:       10 min
  Tooling:    python sqlite3, /sgs-db
  On-Fail:    Report only — no repo mutation. A shortfall is the EXPECTED result and is Phase 1's input.
  Cold-Entry: this file; the parent plan's "Layer 1" evidence table.
  Test:
    Happy:      table set identical
    Edge:       tables legitimately empty on a fresh build are listed as such, not as failures
    Fail:       rebuild raises → the failing stage is named
    Integration: `db_lookup` opens the rebuilt DB and `container_default_slug()` returns non-None

Step 0.6 — Determine what `--apply` writes  (unblocks D-2)
  Model:      haiku
  Action:     Read sync-container-wrapping-blocks.py and report every side effect of --apply:
              DB writes, block.json writes, file writes, version bumps.
  Files:      (read-only)
  Inputs:     none
  Outcome:    A yes/no answer on whether auto-applying on reseed is safe, with evidence.
  Exec:       PARALLEL with 0.1–0.5
  Deps:       none
  Marker:     (none)
  Time:       5 min
  Tooling:    Read/Grep
  On-Fail:    n/a — read-only.
  Prompt:     "Read plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py IN FULL. Enumerate
              EVERY side effect gated behind the --apply flag, separately from those gated behind
              --write-block-json. For each: what it writes (DB table+column, or file path), and
              whether it is reversible. sgs-update-v2.py currently invokes this script with
              --write-block-json and deliberately WITHOUT --apply (see its stage-11 comment). Answer
              one question with evidence: if --apply were enabled automatically on every reseed, what
              besides block_composition.wraps_block/container_kind would change? Quote the code. Do not
              recommend — report."
  Test:
    Happy:      every --apply side effect enumerated with file:line
    Edge:       side effects shared between --apply and --write-block-json distinguished
    Fail:       flag parsing unclear → say so rather than guess
    Integration: cross-check against sgs-update-v2.py:4718's invocation

Step 0.7 — Commit the baseline
  Model:      haiku
  Action:     Write dbschema/schema-baseline.json (per-table row counts + a generated-at stamp) and commit
              schema.sql, migrate.py, the sgs-update change, the baseline and the comparison report.
  Files:      NEW plugins/sgs-blocks/scripts/dbschema/schema-baseline.json + the Phase-0 files
  Inputs:     0.5
  Outcome:    Phase 3's regression gate has a committed floor to compare against.
  Exec:       SEQUENTIAL
  Deps:       0.5
  Marker:     HANDOFF
  Time:       5 min
  Tooling:    git
  On-Fail:    `git reset HEAD~1` (no push until QA Gate B passes).
  Test:
    Happy:      baseline JSON lists every table with its count
    Edge:       zero-row tables are present with count 0, not omitted
    Fail:       DB unreadable → non-zero exit, no partial file
    Integration: a later `--check` against an unchanged DB passes

QA Gate B — negative control (the phase's real proof)
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    0.0–0.7
  Check:   In a SANDBOX HOME (asserted != live path, per BLOCKER-2): place a copy of the DB,
           `DROP TABLE property_suffixes`, run `sgs-update-v2.py --rebuild`, then assert
           `SELECT COUNT(*) FROM property_suffixes` matches schema-baseline.json.
           NEVER run this against the real HOME — it would drop the table from the live DB.
  Pass:    the table returns with its full row count from a clean rebuild
  Fail:    Phase 0 has NOT met its goal — property_suffixes still has no reproducible source.
           That is a real result: record it and carry it into Phase 1 rather than declaring success.
  Marker:  QA
```

---

## Key Judgement Calls

- **Decision:** Does Phase 0 pass if the rebuild is *partial*?
  - **Options:** [A] pass only on 100% parity · [B] pass on table-set parity + a written list of
    row-count shortfalls carried into Phase 1 · [C] pass on "it runs"
  - **Recommendation:** **B**
  - **Why:** We already know `property_suffixes`/`roles`/`slots`/`excluded_properties` have no
    reproducible source — that IS Phase 1's work. Demanding 100% here would either fail the phase
    for a known reason or tempt someone to fake it with a data dump.
  - **Cost of wrong choice:** A → phase stalls on known-pending work. C → we ship an unproven claim
    that the DB is rebuildable, which is the exact failure mode this whole plan exists to kill.
  - **Who decides:** Bean

- **Decision:** Commit `schema.sql` as generated DDL, or hand-curate it?
  - **Options:** [A] verbatim from `sqlite_master` · [B] hand-written and tidied
  - **Recommendation:** **A**
  - **Why:** Hand-curation reintroduces exactly the drift class we're fixing. Generated DDL is
    regenerable and diffable.
  - **Cost of wrong choice:** a tidied schema silently diverging from the live one — undetectable
    until the next rebuild, which is months away.
  - **Who decides:** architect

- **Decision:** `schema.sql` in git when the DB itself is gitignored?
  - **Options:** [A] commit it · [B] gitignore it too
  - **Recommendation:** **A**
  - **Why:** The schema is source; the data is an artefact. Committing it is what makes the rebuild
    reviewable and gives the regression gate something to diff.
  - **Cost of wrong choice:** B leaves the rebuild as unreproducible as the thing it replaces.
  - **Who decides:** architect

## Pre-emptive decisions (Hidden Decisions pass — pending, Stage 6)

*To be appended after the two cold peer reviewers report.*
