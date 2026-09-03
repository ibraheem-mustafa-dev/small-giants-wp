# Gap-candidates retirement (in a worktree, needs finishing)

**Written 2026-09-03.** **Scope: this thread only.** The inspector-scan detector backlog
(`01-tab-group`, `21-render-without-control`) has its own separate prompt:
`.claude/prompts/2026-09-03-detector-violations-01-and-21.md` — don't mix the two, they touch
unrelated parts of the codebase. Invoke `/autopilot` first.

## Where you left off

This thread is **mid-flight, in an isolated git worktree, not yet committed**. (Two unrelated
threads also closed this session — `01-tab-group`'s detector rework and modal's overlay-opacity
fix — both on `main`, both pushed; see the detector-violations prompt above if picking those up.)

### Attribute-gap-candidates retirement — needs finishing

**What happened:** a routine `/sgs-update` run flagged the largest-ever single-run drop in the
`attribute_gap_candidates` table. Investigation found the real cause was a test-cleanup bug (two
test files running a blanket `DELETE FROM attribute_gap_candidates` against the *live production
DB*, not a fixture). Bean's actual point, once raised: the whole feature this table backs — a
promotion workflow surfacing CSS attributes present in a cloned draft but missing from the block,
for a human to review and add — was never finished and never wanted. Decision: retire it fully,
not just fix the test bug.

**Where the work lives:** `c:\Users\Bean\Projects\small-giants-wp-gap-retirement`, branch
`fix/retire-attribute-gap-candidates`, based on `main` as of commit `054048d41`. This is a
separate git worktree (created deliberately — this repo's main working directory is shared with
a concurrent session actively committing to `main`; branching there would have silently diverted
their next commit onto this branch instead).

**What's done in the worktree (16 files changed: 3 deleted, 13 modified), each individually
verified — but NOT YET integrated, committed, or pushed:**

| File | What changed |
|---|---|
| `gap-detection/detect.py` | Deleted — sole purpose was writing to the retired table |
| `orchestrator/stage_attribute_promotion.py` + its test | Deleted — the promotion CLI |
| `behavioural-analyser/assign-canonical.py` | Trimmed — removed the CREATE TABLE/INSERT/health-check block for this table; canonical-slot backfill logic (the file's real job) untouched |
| `converter/db/db_lookup.py` | Removed `write_attribute_gap_candidate()` + `propose_attr_name()` |
| `orchestrator/css_router.py` | Removed `write_d3_to_db()`. **D3 classification itself and its D2 fallback emission are untouched** — every D3 rule still ships to D2 in the same pass, so the real never-silently-drop guarantee is unaffected |
| `sgs-clone-orchestrator.py` | `d3_inserted` now hardcoded `0` (was calling the deleted `write_d3_to_db`) |
| `converter/services/pseudo_overlay.py` | Its honest-gap write (unmapped pseudo-element CSS) now goes to `content_gap_collector.record_content_gap()` instead of the DB table — this is the one call site that genuinely needed a replacement mechanism, not just deletion, since nothing else was recording those specific gaps |
| `converter/services/css_pass.py` | Comment updated to match |
| `converter/tests/test_pseudo_overlay_lift.py` | Rewritten to assert against the in-memory `content_gap_collector` ledger instead of querying the DB — this is the fix for the original data-corruption bug |
| `converter/tests/test_state_value_lift.py` | Same DB-query removal, **plus** a genuinely stale `xfail` fixed: `test_decorative_image_top_left_lift_after_unexclude` was asserting a pre-migration flat value shape; verified live that `positionX`/`positionY` are now tier objects in both `block.json` and `render.php` (`sgs_responsive_normalise_object()`), so the migration this test was waiting on had already landed — the test just never got updated. Now a real passing assertion, not a suppressed xfail |
| `.claude/dev-setup.md`, `orchestrator/README.md`, `cheat-gate/cheat-gate-baseline.json` | Dead references to the deleted files removed |
| `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md`, `20-CLONE-FIDELITY-MEASUREMENT.md`, `19-SGS-CLI-COMMANDS.md` | Retirement notes added. One factual error already caught and fixed: `19-SGS-CLI-COMMANDS.md` initially named `converter/services/gap_writer.py` as one of the retired writers — it is NOT; it's a separate, unrelated, still-fully-live module (builds the in-memory `GAP` object for the converter's real conservation ledger). Re-check the other two spec files' wording for the same class of mistake before trusting them — they were written by the same dispatched agent and weren't re-verified as closely |

**A rule Bean set mid-session, apply it to anything still to write:** no active code comment or
doc should narrate history ("RETIRED 2026-09-03, this used to..."). Write clean code/docs that
describe current behaviour only; retirement history belongs in the commit message and
`decisions.md`, not scattered inline comments. Several early edits had to be corrected for this —
check any new code you write against it too.

## First action

```
cd c:\Users\Bean\Projects\small-giants-wp-gap-retirement
git status
```

Confirm the 16-file diff is still there and nothing else touched it.

## What's left to finish this thread

1. **Drop the live `attribute_gap_candidates` table** from `sgs-framework.db` and regenerate
   `plugins/sgs-blocks/scripts/dbschema/schema.sql` (via `check_schema_drift.py --regenerate`, or
   hand-trim then `--check`). Do this in the worktree's checked-out tree, not the shared main
   working directory.
2. **Run the full gate suite**, especially `pytest-oracle-converter` (the hard gate that owns the
   two rewritten test files) and `npm run gate:fast` more broadly — confirm nothing regressed
   from either the retirement or the drop.
3. **Run `/sgs-update`** inside the worktree afterward to confirm the Stage 13 CSV export
   self-corrects (it enumerates tables live from `sqlite_master`, so dropping the table should
   need zero code change there — verify this claim rather than trust it).
4. **Re-verify Branch B's and Branch D's work yourself** — both were dispatched to Haiku
   subagents this session and only spot-checked, not fully re-read. Branch B (dead-file deletion +
   reference cleanup) reported touching `.claude/dev-setup.md`, `orchestrator/README.md`, and
   `cheat-gate/cheat-gate-baseline.json` — confirm those edits are accurate. Branch D (spec
   retirement notes) already had one factual error caught; read all three spec edits in full
   before trusting them.
5. **Commit + push the branch, open a PR** — this qualifies as "risky" under this project's own
   git-workflow rule (touches the cloning pipeline / converter core), so it's a branch+PR, not a
   direct commit to `main`, regardless of how the rest of this session's work landed.
6. **Clean up the worktree** once merged: `git worktree remove` from the main working directory
   (never delete the folder by hand — see the worktree gotchas in project memory).

## Unrelated work also still open

The inspector-scan detector backlog (`01-tab-group` real remaining work, `21-render-without-control`
fully untriaged, `31-golden-colour-control` deliberately parked as its own session) and
`image-sequence`'s deferred panel merges all live in
`.claude/prompts/2026-09-03-detector-violations-01-and-21.md` — not this prompt. Don't fold them
into this thread's session.

## Rules worth carrying forward

- **When the user pushes back on a technical claim, investigate concretely before answering —
  don't just re-assert or just agree.** Bean's "gap-candidates column is no longer used" claim was
  checked and found subtly wrong (it WAS still wired in and load-bearing for a real promotion
  workflow) before his follow-up reframed the actual point (the feature was never wanted
  finished — a different and correct claim). Investigating the first claim concretely is what
  surfaced the real bug (the live-DB test corruption) before the retirement decision was even made.
- **A shared working directory with a concurrent session means branch operations need a
  worktree**, not a plain `git checkout -b` — confirmed necessary again this session.
- **Path-scoped commits in this repo need explicit per-file paths for brand-new (untracked)
  directories** — `git commit -- newdir/` alone can fail with "did not match any file(s) known to
  git" even after the directory has real content; `git add` the new files first, then commit with
  the individual file paths, not the directory path.
- **This repo's pre-commit gate chain is heavy (multiple minutes)** — always run commits with
  `run_in_background: true` and a long timeout, never expect the default 2-minute foreground
  limit to be enough.

## Skills

| Skill | When |
|---|---|
| `/autopilot` | First, before any response |
| `/using-git-worktrees` | Already invoked for this thread's isolation; reference if managing the worktree further |
| `/qc-council` | Before trusting a new detector claim, or any fix touching a shared/core file |
| `/dispatching-parallel-agents` | If further parallel, independent cleanup is needed |
| `/delegate` | Before every dispatch |
| `/handoff` | Session close |

## Tools

| Tool | For |
|---|---|
| `python plugins/sgs-blocks/scripts/dbschema/check_schema_drift.py --regenerate` | Regenerate schema.sql after the table drop |
| `python -m pytest plugins/sgs-blocks/scripts/converter/tests/` | Run the converter test suite directly |
| `npm run gate:fast` (from `plugins/sgs-blocks/`) | Full gate suite |
| `python plugins/sgs-blocks/scripts/sgs-update-v2.py` | 9-stage DB/reference refresh |
| `node scripts/inspector-scan/run.js` (from `plugins/sgs-blocks/`) | Detector rule counts for the remaining backlog items |
