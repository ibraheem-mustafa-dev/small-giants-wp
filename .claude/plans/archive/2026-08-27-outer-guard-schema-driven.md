# Make the OUTER-layer root-vs-child element guard schema-driven

## Context

The cloning converter has a guard that decides "does this CSS property belong to a
block's own outer/root box, or to a named child part of it?" — used when resolving
which block attribute a draft's CSS declaration should write to. Today it works by
comparing the DB's `css_element` value against a hardcoded 4-value list: `''`, `'root'`,
`'self'`, `'wrapper'`. If a block declares its own custom name for its wrapper element
(several do — `sgs/before-after` calls its `frame`, and many others use `box`, `grid`,
`button`, `row`, etc., all correctly declared via `supports.sgs.elements.<name>.isWrapper:
true` in the block's own `block.json`), the guard has no way to recognise that custom
name as "this block's own root" — it just isn't in the list.

This was found as a side effect of Task 1's converter bug fix (2026-08-27, commit
`e84d7f172` on `main`) — a live case surfaced on `sgs/before-after`, worked around there
with a targeted DB migration + a note that the guard itself needed a proper fix. Live
DB check (2026-08-27) confirms this is currently a narrow, mostly-latent gap: only 6
attributes across `sgs/hero` (5) and `sgs/media` (1) currently exercise this exact path,
and all 6 are correctly excluded today (they're genuinely child-scoped) — this is a
structural landmine, not a widespread live bug, but it affects CSS routing determinism
for 32 blocks that declare a custom wrapper-element name, and Bean has approved building
the real fix (this session, in conversation) rather than leaving the migration-workaround
in place indefinitely.

## Global constraints

- R-31-1: no hardcoded property→attr dicts or literal-name lists. This IS the hardcoded
  list being removed — the replacement must read the block's OWN `isWrapper` declaration
  (from `block.json` or the DB row it seeds, whichever is the established source of truth
  — check `attr-classification-overrides.json`'s seeding logic from Task 1 for precedent),
  never re-introduce a second hardcoded list of "known custom wrapper names".
- The guard exists in (at least) two places sharing the same literal list: `db_lookup.py`'s
  `_outer_element_clause` (inside `declared_attrs_for_css_property`) and the OUTER arm of
  `_base_domain_attrs_for_css_property`. Both need the same fix — don't fix one and leave
  the other, that reintroduces exactly the divergence Task 1 already had to clean up once.
  There is a third, structurally identical but currently out-of-scope copy in
  `attrs_for_css_property_state` (~line 3451-3462 as of `main`'s current state) — Task 1
  deliberately deferred that one; you may fix it too if doing so is a natural consequence
  of this same change, but it is not required.
- Every fix needs a FAILING TEST FIRST (watched failing against the unfixed code), then
  the fix, then the test passing. This project has zero tolerance for a "fixed" claim
  without that evidence.
- Do NOT regress the `sgs/before-after` migration already merged (its DB row is currently
  `wrapper` as a workaround) — once this fix lands, that row's value becomes irrelevant
  either way (a schema-driven check reads the block's real `frame` declaration directly),
  but do not delete or fight the existing migration file; it's historical record.
- Verify against the live DB (`~/.claude/skills/sgs-wp-engine/sgs-framework.db`, read-only
  queries) for the real current state — this project's session so far found cached/assumed
  figures wrong more than once. Do not trust any number in this plan as still accurate;
  re-derive it.
- If you hit the same shared-DB classifier drift (~85 pre-existing `db-consistency`/F6
  violations from a concurrent session's in-progress edit) that blocked three prior commits
  this session, that is ALREADY established as legitimate and pre-existing — verify it's
  the same shape via the same A/B check (compare against `main` or via `git stash`), and if
  so you're authorised to use `git commit --no-verify` (documented at `.githooks/pre-commit`
  line 54 as the sanctioned bypass for this exact gate) without asking again.
- UK English in all output and comments.

## Task 1 — Make the guard read the block's own isWrapper declaration

Replace the hardcoded root-element-name list in both `_outer_element_clause` and
`_base_domain_attrs_for_css_property`'s OUTER arm with a check against the actual source
of truth: does THIS block declare THIS `css_element` value as its own `isWrapper: true`
element (per its `block.json`, or the DB column/table that already derives from it)?
Read Task 1's earlier commits on `main` (`c6ecb9f40`..`85f22a13c`, all on the retired
`fix/converter-bugs-b-d` branch, now merged) for the precedent on how `isWrapper` was
already read and verified this session — reuse that pattern rather than inventing a new
one.

**Test:** a failing-test-first proof using a synthetic/in-memory DB fixture (per this
session's own established lesson — Task 2's tests were sent back for depending on live,
concurrently-mutated DB state; don't repeat that mistake here). Cover: (a) a block whose
`isWrapper` element has a custom name (e.g. `before-after`'s `frame`) resolves correctly
as root-scoped; (b) a block's genuinely-named-child element (e.g. `hero`'s `overlay`,
`media`'s own child-selector case) still correctly excludes as child-scoped; (c) a
negative control proving the check can fail (not vacuous).

## Verification

- Full converter pytest suite, zero new failures against the current `main` baseline
  (re-derive the current pass count yourself, this session's baseline has moved twice).
- Re-run the existing Task 1 regression tests (`test_root_modifier_element_guard.py`) to
  confirm this change doesn't regress that work — they may need updating if the mechanism
  genuinely changes shape, but the underlying behaviour they assert must still hold.
- Live-check the DB again post-fix: confirm the same 6 currently-seeded rows (`sgs/hero`
  x5, `sgs/media` x1) still resolve the same way they do today (correctly excluded as
  child-scoped) — this fix must not flip a correct exclusion into a wrong inclusion.
