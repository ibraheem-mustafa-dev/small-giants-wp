---
doc_type: session
project: small-giants-wp
date: 2026-08-02
track: Track 1 — cloning pipeline / knowledge-base DB
decisions: D464, D468, D469
commits: 78347070 · f285c722 · 15865b38 · f82ee3e3 · 05b76dca · ba056c21 · f96cf7ee · 7d0e55c7 · b25c9680 · 6dc5c03d · 9122cd8b · 2500b3c3
---

# Track 1 — Phase 0 complete, Phase 1 started (2026-08-02)

Swept from `LEDGER.md` at handoff. 12 commits, all pushed to `main`. A co-active motion/focus track
shared the worktree throughout; every commit here was made by explicit path.

## What the session set out to do, and what it found

**Goal:** execute Phase 0 — make the gitignored knowledge-base DB rebuildable, because every "it
worked last month" regression on this track traces to a database that cannot be reproduced.

**Root finding, proven not assumed:** migration replay is structurally impossible. The first rebuild
died on `no such table: slot_synonyms` — that table was RETIRED in favour of `slots`, so three
historical migrations reference something the current schema correctly lacks. **A May migration
cannot be applied to an August schema.** `--rebuild` therefore records migrations as applied and
seeds from source. Any future plan step premised on replaying `migrations/` is void.

**Result:** `sgs-update-v2.py --rebuild` against an empty file exits 0 with the table set
**39/39 identical, none missing, none extra**. 12 tables reproduce exactly, 10 partially, 3 remain
genuine gaps.

## Plan statements measured FALSE during execution

The Phase 0 plan was council-hardened and still carried five wrong statements. Each was re-derived,
not inherited:

1. **30 migrations, not 29** — one landed after the plan was written. The plan had already corrected
   28→29 and went stale within a day. Counts are now derived at runtime.
2. **NO migration accepts `--db`.** The plan said two did and instructed the runner to pass it;
   exactly two use argparse and both expose only `--dry-run`. That instruction targeted nothing and
   would have made argparse exit 2, which the runner would have recorded as a genuine failure.
3. **The DB is WAL-mode** — the planned `shutil.copy` backup could have captured an incomplete
   snapshot, so the phase's ONLY rollback was unsafe as specified.
4. The sync invocation is at `sgs-update-v2.py:4825`, not 4718.
5. QA Gate B was unnecessary — the from-empty rebuild IS the negative control and answers the same
   question more informatively.

**Premise re-verified and CONFIRMED:** no production `CREATE TABLE` for `blocks` /
`block_attributes` / `block_composition` / `property_suffixes` — the only hits are six TEST FIXTURES
hand-writing partial schemas for exactly those tables. Same disease one layer down; tests untouched.

## Two errors of my own, both corrected in-session

- **A file-scoped search hid writers I concluded were absent.** I searched the repo only and reported
  "no writer anywhere" for 10 tables. `~/.claude/skills/sgs-wp-engine/scripts/populate-db.py` lives
  OUTSIDE the repo and writes five of them, fully wired. This is the captured
  `a-file-scoped-search-hides-the-writer-you-concluded-was-absent` failure, committed again.
- **Presence of a query is not behaviour.** I called `variations` "converter-critical" because
  `db_lookup.py` contains a `SELECT` against it. The call graph shows **zero production callers** —
  only tests and a trace line inside the function itself. That error made a deletion look like a
  seeder job.

Bean corrected me twice more: stale WP reference data has NEGATIVE value (it is used as an existence
gate), and `hooks` is not a WP-core scan. Both were right.

## The sandbox escape — the sharpest lesson

`generate-markup-examples.py` hardcoded `DB_PATH = r'C:\Users\Bean\.agents\…'`. **A literal drive
path is immune to HOME redirection**, so running it under the dbschema sandbox wrote straight through
to the LIVE database (`markup_examples` 399→422; additive, nothing altered, verified). Fixed to
derive from `Path.home()`, which also fixed a CLAUDE.md violation.

**A sandbox a script can silently escape is worse than none, because it is trusted.** The guard
checked that the sandbox pointed away from live; it never checked that the script honoured the
redirect.

A second bug in the same file: `extract_example_attrs` assumed every block.json attribute definition
is a dict and died on `'str' object has no attribute 'get'` — `sgs/nav-menu` stores a doc note as a
string attribute (`_note_nav_fill`) and the skip list only covered `_comment*`. That crash is why
`markup_examples` seeded zero rows despite 399 live: it died before the write.

## `hooks` / `docs` — provenance solved and refreshed

Never repo-derived. Imported from the `wp-devdocs-mcp` index — `_retired/phase1-migrate-hooks.py`
names `HOOKS_DB = ~/.wp-devdocs-mcp/hooks.db` with 8 source ids. That database was gone, but **the
tooling is still installed** as a global npm package exposing a `wp-hooks` CLI which parses
WordPress/Gutenberg/WooCommerce source from GitHub. Its 8 presets map 1:1 to the migrator's source
ids, confirming the chain.

All four MCPs were **deliberately disabled 2026-04-18** for a ~6,000 tokens/session saving, each
replaced by a CLI (`wp-devdocs`→`wp-docs.py`). Re-registering the server would hand that back; the
CLI gives currency without it. That decommission left **no refresh path**, which was the real gap.

Refreshed with a reconcile the original additive import never had: hooks 5407→5468 (+97/−30), docs
1241→1061 (+16/−196), SGS-owned rows untouched. Two defects caught by testing on a copy first: a
CHECK-constraint mismatch (the index has 6 hook types, the schema allows 2) and **a hole in my own
"never touch SGS rows" guarantee** — `UNIQUE(name, hook_type)` meant an `INSERT OR REPLACE` would
have overwritten SGS-owned rows (`example_action`, `example_filter`, `hook` all exist in both).

## Verified end-to-end

`/wp-docs validate-hook`: `init`→VALID · `native.pre-render` (just dropped)→**NOT_FOUND** ·
`is_user_member_of_blog` (just added)→VALID. The existence gate answering correctly for the first
time since April.

## Also closed

- **D468** — `deploy_steps` stopped re-issuing the D336 outage recipe. Not stale prose: `/sgs-db
  deploy` reads those rows back verbatim as instructions, so the table was actively re-issuing a
  procedure that took two client sites down for ~2.5h.
- **D469** — `variations` (205 rows) retired and dropped; duplicated `variant_slots`, zero callers.
  ⛔ I nearly retired `variant_slots` instead — Bean's instruction named it, and the two are one
  character apart with opposite consequences. Confirming cost a minute.
- Stray 0-byte `sgs-framework.db` files eliminated; `.gitignore` gained one `**/` wildcard replacing
  two reactive exact-path entries that had each been patched in after an earlier leak and still
  missed both files found this session.

## T1.1 (closed earlier the same day, D461)

All four fixed at their DERIVATION: `parent_block` 18→23 (hardcoded dict deleted, R-31-1),
`css_layer` 322→352, mis-typed roles 6→0, `block_selectors` 92→86. Evidence + LIMITATIONS:
`reports/2026-08-02-t1.1-evidence-pack.md`. ⛔ Three inherited diagnoses measured FALSE — do not
re-derive. ⛔ Do NOT retry the Task A composite-var classifier fix (measured 1→3 violations,
reverted). ⛔ `sgs/star-rating` lacks `scalar-content-lift`, so the star lift no-ops despite the
correct role; granting it is Bean's opt-in, not a bug. `design_tokens` residual (e) was never a gap;
the real finding is that `token_snap.py` is an inert stub vs Spec 31 §4 and needs a design gate.
