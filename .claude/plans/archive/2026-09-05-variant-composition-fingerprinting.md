# Variant composition fingerprinting

## Context

`sgs/nav-drawer`'s `split-zone-serif` and `two-column-editorial` variants
share zero discriminating attribute values (confirmed by direct data trace:
every colour/alignment/close-style value each one sets is duplicated by at
least one sibling variant), so `variant_slots` has no row for either and
`detect_variant()` scores both at 0 — permanently undetectable from a
draft's extracted CSS alone. This is F6's last baselined violation.

The fix Bean directed: extend variant detection to also fingerprint each
variant's **InnerBlocks composition** (the ordered set of child block
NAMES its `variations.js` template seeds), as a tiebreaker signal
alongside the existing attribute-value signal. `two-column-editorial`
seeds `[nav-menu, button]`; `split-zone-serif` seeds `[nav-menu,
icon-list, text, social-icons, card-grid]` — genuinely distinct
regardless of the description-text inaccuracies found in a separate audit
this session (do not fix those descriptions here — separate, unrelated
task).

**Confirmed feasible, not assumed:** `plugins/sgs-blocks/scripts/converter/services/assembly.py`
fully resolves every child into `results` (a list of `ChildBlock`, each
carrying `.slug`) at line 127, BEFORE step 4's variant detection call at
line 409-414. The recognized child-slug sequence is available exactly
where `detect_variant()` needs it — no walker reordering required.

## Design decision (already made, do not re-litigate)

Composition match is a **TIEBREAKER**, not an additive score component.
`detect_variant()` only consults it when the attribute-value score ties
(including today's 0-0 tie) — this changes zero currently-working
detection (every block whose attribute score already picks a clear
winner is untouched) and only adds coverage for blocks like nav-drawer
that are unresolvable today. An additive score risks a strong composition
match outranking a marginally-better attribute match on an
already-correct variant — rejected for that reason.

## Global constraints

- R-31-1 (DB-driven, no hardcoded per-block dicts) and R-31-9 (universal —
  works for every block with `variations.js`, not just nav-drawer) apply
  to every task here, same as the rest of this codebase's variant system.
- Mirror the EXISTING `variant_slots` / `_extract_variation_attribute_values`
  / `detect_variant` methodology exactly (delete-then-insert idempotent
  population, set-difference discrimination, "never guess — a tie returns
  None" ambiguity doctrine) — this is an extension of a working pattern,
  not a new architecture.
- Never invent/approximate a child block's slug when it can't be
  statically resolved (a `CallExpression` whose local helper's return
  value isn't a literal array) — report it as excluded, exactly like the
  existing `nonLiteralAttrs` field does for attribute values. Guessing a
  wrong slug would poison the fingerprint silently.
- No UI/editor-facing change. This is converter/DB-layer only.
- Naming: new DB table `variant_composition_slots`; new JS extractor
  output field `innerBlockSlugs` / `nonLiteralInnerBlocks` (mirroring
  `attributes` / `nonLiteralAttrs`).

## Task 1 — Extend the JS extractor to emit composition data

**File:** `plugins/sgs-blocks/scripts/variant-value-extractor/extract-variation-values.js`

Read the whole file first — it already parses `variations.js` via
`@babel/parser`/`@babel/traverse` and extracts each variation's `name` +
`attributes` object to plain JSON (`evalLiteral()`, `findVariationsArray()`).
Extend `extract()` to ALSO read each variation object's `innerBlocks`
property (an `ArrayExpression`) and, for each TOP-LEVEL element, resolve
the child block's slug string:

- Element is itself an `ArrayExpression` whose first item is a
  `StringLiteral` (the literal `['sgs/block-name', {...}, [...]]` shape) →
  use that string directly.
- Element is a `CallExpression` referencing a LOCAL function/arrow
  declared in the SAME FILE (e.g. `navMenu(...)` where
  `function navMenu(overrides) { return ['sgs/nav-menu', {...}]; }` is
  declared above) → resolve the function declaration via `@babel/traverse`,
  find its `ReturnStatement`, and if THAT return value is an
  `ArrayExpression` whose first item is a `StringLiteral`, use that
  string. If the function has multiple returns, an unresolvable return
  shape, or isn't found in-file, treat this element as unresolved.
- Any other shape (identifier reference, spread, computed, nested
  destructuring) → unresolved.

Add to each variant's output object: `innerBlockSlugs: string[]` (only the
successfully-resolved slugs, in order, gaps removed — NOT positionally
padded) and `unresolvedInnerBlocks: number` (count of elements that could
not be resolved, so the caller can tell "this variant seeds 5 children but
we only fingerprinted 3" from "this variant seeds 3 children total").

Write/extend the test file for this extractor (find it — this directory
likely has one already, e.g. `extract-variation-values.test.js`; if none
exists, add one) covering: a variation with plain literal-array
innerBlocks entries; one using a local helper function like nav-drawer's
real `navMenu()`; one with an unresolvable entry (e.g. a spread or a
helper whose return isn't a literal array) — confirm it appears in
`unresolvedInnerBlocks`, not fabricated into `innerBlockSlugs`.

Run the extractor against the REAL
`plugins/sgs-blocks/src/blocks/nav-drawer/variations.js` and confirm by
hand that `two-column-editorial` → `innerBlockSlugs: ["sgs/nav-menu", "sgs/button"]`
and `split-zone-serif` → `innerBlockSlugs: ["sgs/nav-menu", "sgs/icon-list", "sgs/text", "sgs/social-icons", "sgs/card-grid"]`
(paste the actual command + output in your report — this is the concrete
proof the extractor works on the block that motivated this whole task).

## Task 2 — DB schema + population in `/sgs-update`

**Files:** `plugins/sgs-blocks/scripts/sgs-update-v2.py`,
`plugins/sgs-blocks/scripts/converter/db/db_lookup.py` (schema-ensure
function only — mirror how `variant_slots`'s schema-ensure is duplicated
in both files today, same reasoning as that duplication: read the
surrounding comments, this is deliberate, not an oversight to "fix" into
a shared import).

1. Add a schema-ensure block for a new table (mirror the existing
   `variant_slots` CREATE TABLE block in both files exactly):
   ```sql
   CREATE TABLE IF NOT EXISTS variant_composition_slots (
       block_slug TEXT NOT NULL,
       variant_value TEXT NOT NULL,
       unique_child_slug TEXT NOT NULL,
       PRIMARY KEY (block_slug, variant_value, unique_child_slug)
   )
   ```
2. In `sgs-update-v2.py`'s variant-detection population block (read
   lines ~953-1046 in full first — this is the exact section to extend,
   right after the existing `value_aware_variants` / `variants_map`
   branches), add a THIRD population pass:
   - Call the Task 1 extractor (mirror `_extract_variation_attribute_values`'s
     subprocess-call pattern exactly — same timeout, same soft-fail-to-None
     on missing node/parse error/non-JSON, same WARN-and-continue
     philosophy: this is enrichment, never a hard `/sgs-update` failure).
   - For each variant, take its `innerBlockSlugs` list (or empty list if
     the extractor returned none / the block has no `variations.js`).
   - Compute set-difference EXACTLY like the existing value-aware
     attribute-pairs block does (lines 1018-1028): each variant's
     discriminating child slugs = its own slug SET minus the UNION of
     every sibling variant's slug set. (Set semantics — a child slug
     appearing twice in one variant's own list doesn't matter; what
     matters is whether ANY sibling variant's list also contains that
     slug at all.)
   - `DELETE FROM variant_composition_slots WHERE block_slug = ?` then
     `INSERT OR IGNORE` each discriminating slug — same idempotent
     delete-then-insert shape as `variant_slots`.
3. Run `python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1`
   (confirm this is the right stage from the script's own docstring/stage
   map — read it, don't assume) against the real DB, then query
   `variant_composition_slots WHERE block_slug='sgs/nav-drawer'` and
   confirm `split-zone-serif` and `two-column-editorial` NOW have rows
   (paste the actual query + output in your report).

## Task 3 — `detect_variant()` tiebreaker scoring

**File:** `plugins/sgs-blocks/scripts/converter/db/db_lookup.py`

Read `detect_variant()` (~line 3836) and `_variant_slots_map()` (~line
3566) in full first.

1. Add a new helper `_variant_composition_slots_map(block_slug)` mirroring
   `_variant_slots_map`'s query/shape exactly, reading from
   `variant_composition_slots`: returns
   `tuple[tuple[variant_value, tuple[child_slug, ...]], ...]`.
2. Change `detect_variant`'s signature to
   `detect_variant(block_slug: str, populated_attrs: dict, child_slugs: list[str] | None = None) -> str | None`
   (default `None` so every EXISTING caller that doesn't pass it keeps
   working unchanged — grep the codebase for all current call sites and
   confirm none breaks; there should be exactly one, in `assembly.py`,
   handled by Task 4).
3. After computing `scores` (today's attribute-based sort, unchanged) and
   detecting a tie at the top (today's existing tie-detection block, lines
   ~3874-3878) — BEFORE returning `None` for that tie — attempt a
   composition tiebreak:
   - Only if `child_slugs` is not `None` and not empty.
   - Load `_variant_composition_slots_map(block_slug)`.
   - Restrict to the variant NAMES that were tied at the top score.
   - For each tied variant, score = size of the overlap between its
     discriminating child-slug SET and the input `child_slugs` SET
     (`len(variant_slugs & set(child_slugs))`), NOT an exact-sequence
     match — order doesn't need to matter for this signal, membership
     does (state this reasoning in a comment; do not silently choose a
     different scoring shape).
   - If exactly one tied variant has a strictly-higher composition score
     than every other tied variant, return it (log via `_trace` a new
     event `variant_detect_composition_tiebreak_hit` with block_slug,
     the tied variant set, and the winning variant — mirror the existing
     `_trace(...)` calls' argument style in this function).
   - Otherwise (still tied, or all composition scores are 0), fall
     through to the EXISTING behaviour — log `variant_detect_tie` and
     return `None`. Never let the composition signal manufacture a
     result the attribute signal couldn't already narrow to a 2-way
     tie; it breaks ties, it does not detect from scratch.
4. Write/extend the test file covering `detect_variant` (find the
   existing test file for this function — grep for
   `variant_detect_tie` or `detect_variant` in any `test_*.py` under
   `plugins/sgs-blocks/scripts/converter/`) with a NEW test case using
   nav-drawer's real shape: `populated_attrs` that score 0-0 between
   `split-zone-serif` and `two-column-editorial` (or a synthetic
   equivalent block/variant fixture if the real one is awkward to set up
   as a unit test — your call, state which you chose and why), and
   `child_slugs` matching one of the two variants' real composition,
   asserting `detect_variant` now returns the correct variant instead of
   `None`. Also add a case where `child_slugs` is `None` (today's
   pre-existing behaviour, still returns `None` on a tie) to prove the
   default-off path is unchanged.

## Task 4 — Wire the call site + full regression proof

**File:** `plugins/sgs-blocks/scripts/converter/services/assembly.py`

1. Read step 4 (lines ~399-414) in full again in this file's current
   state (Tasks 1-3 don't touch this file, so it should be unchanged from
   what was read during design, but confirm).
2. Change the call at line 412 to pass the recognized child slugs:
   `_child_slugs = [r.slug for r in results if isinstance(r, ChildBlock)]`
   (computed once, reusable if variant detection runs more than once —
   check whether it does; if step 4 only runs once per `build_block_markup`
   call, a local variable is fine) then
   `db_lookup.detect_variant(rec.slug, attrs, child_slugs=_child_slugs)`.
3. Run the FULL converter test suite (find the command — likely
   `pytest` from `plugins/sgs-blocks/scripts/converter/` or a named
   `npm run` script; check `scripts/run-gates.py`'s "oracle" tier from
   this session's earlier `[gate:full]` output — `pytest-oracle-converter`
   was one of its 3 gates) and confirm it's still green — this call site
   sits inside the SAME function whose other 8 steps every existing
   converter regression test already exercises, so this is the
   highest-risk task for a silent regression.
4. **Live end-to-end proof, not just unit tests:** run the actual
   `/sgs-clone` pipeline (or whatever the smallest real invocation is —
   check `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md`'s stage map for
   the entry point, or a smaller per-block harness if the converter
   package exposes one) against a real or synthetic draft HTML fragment
   built to match `split-zone-serif`'s real composition (nav-menu +
   icon-list + text + social-icons + card-grid, all with
   `drawerBg:footer-bg`/`drawerAlign:left`/`closeStyle:separate-x` —
   the exact values that tie 0-0 on attributes alone) and confirm the
   converter now emits `variantPreset: "split-zone-serif"` on the output
   block, where it previously emitted nothing / left the attribute at
   its block.json default. Paste the actual emitted block markup/attrs
   in your report — this is the concrete "the bug is actually fixed"
   evidence Bean will want to see, not just "tests pass".
5. Re-run `python plugins/sgs-blocks/scripts/check-*` or whatever
   surfaced the original F6 nav-drawer finding this session (search
   `.claude/reports/` or the F6 gate script itself — it was named in this
   session's Phase 3/4 commit output) and confirm the nav-drawer
   variant-discriminator-collision finding for
   `['split-zone-serif', 'two-column-editorial']` is GONE (the pair now
   has real discriminating rows), not just re-baselined.

## Out of scope (do not touch)

- Fixing the 3 inaccurate variation `description` strings found in this
  session's separate audit (`anchored-card-stack`'s "cards" claim,
  `solid-brand-light`'s "uppercase"/naming, `split-zone-serif`'s
  "serif"/"alongside") — unrelated task, raised separately.
- Any OTHER block's variant descriptions or discrimination — this plan's
  proof case is nav-drawer, but the mechanism itself must stay universal
  (R-31-9); do not hardcode nav-drawer's slug anywhere in Tasks 1-3.
- Extending composition fingerprinting to NESTED innerBlocks (grandchildren)
  — top-level child slugs only, matching the scope Bean asked for.

## Verification (end-to-end, beyond each task's own checks)

1. `pytest-oracle-converter` (or whatever the full converter gate is
   named — confirmed in Task 4) green.
2. The nav-drawer F6 collision finding is gone (Task 4 step 5).
3. `python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1` runs
   clean against the real DB with no new warnings for any OTHER block
   with `variations.js` (grep for which blocks have one; there are more
   than just nav-drawer — confirm the new pass doesn't warn/fail on any
   of them).

---

# PART 2 — closing the loop + a universal structural guard (2026-09-05, Bean-directed)

Tasks 1-4 above are DONE and reviewed (see `.claude/memory/sdd-progress.md`).
They built a correct, universal, backward-compatible composition-tiebreak
mechanism — but two gaps surfaced during Task 4's honest end-to-end proof,
and Bean asked for both fixed PLUS a structural guard so this exact class
of gap (a block gets a real composition discriminator that can never
actually fire because the block has no content-extraction path) can't
recur silently on some future block the way it did on nav-drawer.

Investigated this session (read-only, findings below are ground-truth, not
assumed):

- **Nav-drawer's gap is NOT nav-drawer-specific.** `derive_delegates_content()`
  (`plugins/sgs-blocks/scripts/converter/has_inner.py`, `_RENDER_CONTENT_RE`)
  is a REGEX HEURISTIC over `render.php` source text that decides whether a
  block "consumes `$content` non-trivially" (→ gets a real content-extraction
  path). Nav-drawer's `render.php` genuinely calls
  `printf( '...%4$s...', ..., $content )` with `$content` as a bare trailing
  function argument on its own line — none of the regex's 11 existing
  alternatives match that shape (they all require `$content` adjacent to
  `.`/`;`/`,`/`:`/`{}`/`echo`). So the fix is widening ONE shared regex, not
  writing new per-block converter logic — and it will correctly turn on
  content-extraction for ANY OTHER block using this same `printf`-argument
  shape today, not just nav-drawer (R-31-9 in action: fix the general
  pattern, not the specific block).
- **F6 Check #3** (`plugins/sgs-blocks/scripts/db-consistency/check_variants.py`,
  registered inside the single db-consistency `run.py` suite as
  `"variants": "Check #3 — Variant Discriminator Collision"`) computes each
  variant's discriminator signature from `variant_slots` ALONE (lines
  ~153-168) — it has zero awareness of `variant_composition_slots`, so it
  will keep flagging a collision even after composition genuinely
  disambiguates two variants.
- **A new proactive gate is the "protect the future" mechanism** — not a
  block-by-block audit (only nav-drawer has a `variations.js` file today,
  confirmed by a full repo grep in Task 2's review, so there is nothing
  else to retroactively fix right now). The gate: for ANY block with real
  discriminating rows in `variant_composition_slots`, confirm the block
  ALSO has a working content-extraction path (delegates_content via
  `has_inner.py`, an `array-content-lift` capability, or `block_attributes`
  rows with `emit_shape='child'`) — if a future block gets a composition
  discriminator seeded but has none of those three paths, the discriminator
  is dead code (can never reach `detect_variant()`), and this gate catches
  it at `/sgs-update` time or as a db-consistency finding, the same way
  nav-drawer's gap would have been caught immediately had this existed
  before Task 1.

## Task 5 — Widen `has_inner.py`'s `$content`-consumption regex

**File:** `plugins/sgs-blocks/scripts/converter/has_inner.py`

1. Read `_RENDER_CONTENT_RE` (~lines 41-53) and `derive_delegates_content()`
   in full — understand all 11 existing alternatives and why each one
   represents a genuine "consumes `$content`" shape.
2. Add ONE more alternative matching `$content` as a bare trailing
   function-call argument on its own line before a closing `)` — the exact
   shape confirmed live in `nav-drawer/render.php`'s `printf(...)` call
   (read that file's real line to get the exact whitespace/shape, do not
   guess it). Keep the same regex-alternation style as the existing 11.
3. **Universality check (do this, it's the actual point of this task):**
   grep EVERY block's `render.php` for a similar bare-trailing-argument
   `$content` usage (not just nav-drawer) and confirm which OTHER blocks
   newly pick up `delegates_content=1` because of this widening. For each
   one, spot-check that turning on content-extraction for it is CORRECT
   (i.e., that block's `$content` really is its InnerBlocks output, not
   some unrelated variable that coincidentally matches — read the
   surrounding code, don't just trust the regex match) — a false-positive
   widening here would silently start extracting children for a block that
   was correctly delegates_content=0 before, which is exactly the kind of
   silent-wrong-data risk this whole plan's "never guess" doctrine exists
   to prevent.
4. Confirm nav-drawer now shows `derive_delegates_content('sgs/nav-drawer') == 1`.
5. Run the FULL converter regression suite (Task 4's baseline: 1023 passed,
   2 skipped, 10 xfailed) and confirm no regressions — widening a
   content-extraction heuristic is exactly the kind of change that could
   silently change OTHER blocks' conversion output if a false positive
   slips through step 3.
6. **Live end-to-end proof** (this is what Task 4 couldn't do): run a real
   or synthetic draft matching nav-drawer's `split-zone-serif` composition
   through the actual `/sgs-clone`-equivalent conversion entry point Task 4
   used, and confirm the emitted `sgs/nav-drawer` block now genuinely sets
   `variantPreset: "split-zone-serif"` — paste the actual output. This is
   the concrete "the original bug is now actually fixed end-to-end" proof.

## Task 6 — F6 Check #3: fold in `variant_composition_slots`

**File:** `plugins/sgs-blocks/scripts/db-consistency/check_variants.py`

1. Read `run()` in full (~lines 140-200), especially the signature
   computation at lines 153-168 and the collision-flagging/fix-message text
   at lines 170-194.
2. Extend the per-variant signature computation to ALSO query
   `SELECT variant_value, unique_child_slug FROM variant_composition_slots WHERE block_slug = ?`
   (confirm the real column name against Task 2's actual committed schema
   — the plan's Part 1 text says `unique_child_slug`, verify it wasn't
   renamed during Task 2's implementation) and fold each variant's
   composition-slug frozenset into its signature (e.g. a signature becomes
   a `(attribute_slots_frozenset, composition_slots_frozenset)` tuple
   rather than just the attribute frozenset) — two variants only collide
   now if BOTH halves are identical.
3. Update the collision fix-message text (~lines 186-191) to also mention
   `variant_composition_slots`/InnerBlocks composition as a way to
   disambiguate two variants, not just `supports.sgs.variants` in
   block.json.
4. Run `check_variants.py` against the real DB (after Task 5 lands, so
   nav-drawer's content-extraction is real) and confirm: `split-zone-serif`
   no longer collides with anything (it has a real composition
   discriminator); `two-column-editorial` STILL collides with
   `floating-capped-card` (correctly — they share both an empty attribute
   signature AND an identical composition signature, a genuine unresolved
   collision, not a false positive) — report both outcomes explicitly, do
   not claim full resolution.
5. Extend/add to `plugins/sgs-blocks/scripts/db-consistency/tests/test_f6_consistency.py`
   (or wherever the existing F6 regression tests live — find them) with a
   case proving a block with an EMPTY `variant_slots` signature but a
   REAL, unique `variant_composition_slots` signature is correctly NOT
   flagged as a collision.

## Task 7 — New Check #10: dead composition discriminator

**File:** new `plugins/sgs-blocks/scripts/db-consistency/check_dead_composition_signal.py`,
registered in `plugins/sgs-blocks/scripts/db-consistency/run.py`.

1. Read `check_variants.py` in full as the shape/convention template
   (`Violation`/`variant_key` imports from `.models`, `run(conn)` signature,
   return shape).
2. Read `run.py`'s registration pattern for an existing check (the
   `_load_sibling(...)` call, the `_CHECK_LABELS` dict entry, the
   `_CHECK_ORDER` list, the `violations.extend(...)` chain in `main()`) —
   mirror it exactly for a new entry: key `"dead_composition_signal"`,
   label `"Check #10 — Dead Composition Discriminator"`.
3. Implement `run(conn)`: for every `block_slug` with at least one row in
   `variant_composition_slots` (a real, non-empty discriminator exists for
   at least one of its variants), check whether that block has ANY of the
   three content-extraction paths — `derive_delegates_content(block_slug)`
   returning 1 (import from `has_inner.py` — check how `check_variants.py`
   or another existing check already imports/uses this, mirror that), an
   `array-content-lift` capability (query `block_capabilities` or wherever
   this lives — confirmed location from this session's investigation, or
   re-verify), or a `block_attributes` row with `emit_shape='child'`. If
   NONE of the three are present, emit a `Violation` naming the block and
   the dead variant(s), with a fix message explaining the discriminator
   exists but can never reach `detect_variant()` without a real
   content-extraction path, and pointing at `has_inner.py`/`array-content-lift`
   as the places to add one.
4. Run it against the real DB — after Tasks 5-6, nav-drawer should NOT be
   flagged (it now has content-extraction). Manufacture a synthetic
   negative-control test case (insert a fake `variant_composition_slots`
   row for a block that genuinely has no content-extraction path, or mock
   the DB layer) proving the check DOES fire when the gap genuinely exists
   — an untested positive-control-only check is not proof it can ever
   fail, per this project's own "a check with no positive control passes
   against a dead feature" doctrine (see `.claude/decisions.md` if you want
   the fuller reasoning, not required reading, just context for why this
   matters).
5. Add the regression test to `test_f6_consistency.py` (or sibling file),
   covering both the negative control (a real, healthy block — nothing
   flagged) and the positive control (the synthetic dead-discriminator
   case — flagged).
6. Run the full `db-consistency` suite (`run.py`) end-to-end and confirm
   the new Check #10 appears in output, with zero findings against the
   REAL current DB (nav-drawer is fixed by Task 5) and update the
   consistency baseline file if this project's convention requires one for
   a newly-added check (check `db-consistency-baseline.json` or similar —
   confirmed location from earlier context this session,
   `plugins/sgs-blocks/scripts/db-consistency/db-consistency-baseline.json`).

## Updated global constraints for Part 2

- Task 5's regex widening MUST be verified against every block it could
  affect, not just nav-drawer (R-31-9) — this is the task most likely to
  cause a silent regression if under-checked.
- Task 6 and Task 7 both read `variant_composition_slots` — use the EXACT
  column names from Task 2's real committed migration, not the plan text's
  possibly-stale naming.
- Task 7 is the "protect the future" deliverable Bean asked for — it must
  have a genuine positive control (a case where it actually fires), not
  just a clean pass against present-day data.

## Updated end-to-end verification (Part 2)

1. Full converter regression suite still green after Task 5 (no
   regressions from the regex widening).
2. A real conversion of a `split-zone-serif`-shaped draft now emits
   `variantPreset: "split-zone-serif"` end-to-end (Task 5 step 6) —
   the ORIGINAL bug is now actually fixed, not just infrastructure-ready.
3. `check_variants.py` (Check #3) no longer flags `split-zone-serif`;
   still correctly flags `two-column-editorial`/`floating-capped-card`
   (a real, distinct, unresolved collision — out of this plan's scope to
   fix further, per Part 1's "out of scope" section).
4. Check #10 fires on a manufactured positive control and stays silent on
   the real, now-fixed nav-drawer.

## Addendum (2026-09-06, D974) — the `two-column-editorial` collision this plan left open is now closed

This plan's Part 1 correctly scoped `two-column-editorial`/`floating-capped-card`'s collision
as "real, distinct, unresolved" and out of scope. It stayed genuinely undetectable after this
plan shipped — verification item 3 above still held. A follow-up session (D974,
`f351464db`/`3e8006dea`, merged `68378ab86`) fixed the actual cause: `itemFontSize` was seeded
as a flat number against `sgs/nav-menu`'s tiered schema, and `listColumns` had no CSS-extraction
route at all — both fixed, confirmed live via `detect_variant()` now returning
`"two-column-editorial"` for a real-clone-shaped fixture. Do not re-open this collision as a
gap in THIS plan's scope; it is fully closed, just by later, separate work.
