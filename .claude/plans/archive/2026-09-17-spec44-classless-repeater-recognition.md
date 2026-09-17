# Plan — Spec 44 Classless Repeater Recognition (build now, council next session)

**doc_type:** plan
**Date:** 2026-09-17
**Governing spec:** `.claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md` (v2.3.1)
**Bean's explicit sequencing (2026-09-17):** build the mechanism this session; run the
`/adversarial-council` re-verification pass (the spec's own stated precondition — "NOT YET
re-verified since v2.2.0 → v2.3.0, do not assume v2.3.0 is GO") **next session**, before
FR-44-1's auto-complete trust gate is ever enabled live or the mechanism is treated as
trustworthy. Both opt-in flags (`--classless-match`, `--classless-auto-complete`) stay
off by default per the spec's own rollout design (§9) — that default IS the safety net
for this sequencing: the code can exist and be tested without being live anywhere.

## 1. Goal (plain English)

Teach the cloning pipeline to recognise a repeated, classless (no-CSS-class) content
group's real block identity from structural evidence — a ticker of trust badges, a row
of brand logos, a grid of cards — using deterministic DB-driven matching, never a guess.
This is upstream of Spec 45 (already built, standalone) — once this ships, Spec 45's
field resolver finally has a real `parent_slug` to consume instead of a fixture.

**Done looks like:** the DB table, the two-stage recognition function, the audit log +
review-surface integration, and the orchestrator wiring all exist, are unit-tested per
the spec's own §10 test plan, and are reachable ONLY behind the two off-by-default flags.
Live-wiring confidence (should the flags ever flip on) is explicitly NOT this session's
job — that's the deferred council pass's call.

## 2. Grounding done this session (don't re-derive)

- `block_render_repeaters` table does not exist in the live DB (confirmed).
- `recognise_render_time_repeater`, `--classless-match`, `--classless-auto-complete`,
  `classless-recognition-log.jsonl` writer — none exist anywhere in the codebase
  (confirmed via `grep -rl` across `plugins/sgs-blocks/scripts/`).
- Real, shipped dependencies confirmed present and reusable as-is: `converter/services/
  repeated_sibling_detector.py` (singleton-vs-repeated), `converter/services/
  render_emits.py` + `sgs-update-v2.py::_populate_emit_shape` (the source-derived DB
  seeding precedent to mirror), `recogniser/simple_html_review_report.py` (the existing
  `operator-review.html` generator to ADD rows to, not replace), `array_item_schema` +
  `converter/resolvers/array_content.py::lift_array_content()` (Stage B's reuse target).
- §5.0's verification figures, re-measured live this session (spec's own numbers are
  stale, re-check before quoting either): `array_item_schema.role` population is
  **25 of 90 rows populated, across 13 distinct blocks** (spec said 25/84 across 12 —
  drifted since the spec was written, as expected on a shared worktree).
- The real orchestrator integration point: `sgs-clone-orchestrator.py`'s `if
  _cv2_eligible:` block (~line 2255) is where `converter.entry.convert_section` gets
  imported and called per boundary — this is the call site Spec 44 §4.4 means by "runs
  INSTEAD of `convert_section` for that boundary."

## 3. Work units (build sequencing per spec §9: one pass, in this order)

```
UNIT: S44-1-verify-and-seed
PURPOSE: §5.0 verification (record fresh figures in this plan — done, see §2 above) +
         §4.2 block_render_repeaters table + §4.3 Steps 1-2 seeder (render.php foreach
         detection + structural-role derivation), mirroring _populate_emit_shape's
         source-derived pattern.
FILES: plugins/sgs-blocks/scripts/converter/db/db_lookup.py or a new migration file for
       the CREATE TABLE (follow this project's existing migration convention — check
       migrations/ dir for the pattern); a new seeder module or a new sgs-update-v2.py
       stage (mirror _populate_emit_shape's location/shape); a new self-test file.
INPUTS: none (reads real block render.php source)
OUTPUTS: block_render_repeaters rows for every block with a genuine render-time repeater
TOOLING: sqlite3, /sgs-wp-engine DB conventions
ON-CRITICAL-PATH: yes
TEST: per spec §10 — (a) a render-time row SURVIVES a full reseed; (b) a block with an
      ordinary non-repeater foreach seeds ZERO rows (negative control, required not
      optional); (c) mutating a fixture block's PHP changes source_sha and triggers a
      reseed warning, not silent staleness. Real buybox gallery-col.php as the primary
      fixture (spec's own worked example, §4.1).

UNIT: S44-2-stage-a-recognition
PURPOSE: §4.3 Step 0 (parent-narrowing: singleton-vs-repeated + parent composite-shape
         check, combined) + §4.4 recognise_render_time_repeater(draft_group, client_slug)
         Stage A path (structural match against the narrowed candidate's real rendered
         shape, using §3.1's exact-structural-match rule).
FILES: new module in plugins/sgs-blocks/scripts/recogniser/ or converter/services/
       (match the project's existing module placement convention for a recognition
       mechanism — recogniser/ is where dom_shape_classifier.py and
       classless_field_resolver.py live); self-test file.
INPUTS: a repeated draft group (from the walker/boundary layer) + client_slug
OUTPUTS: RenderMatchResult — a resolved block identity with match quality (exact/partial),
         or an honest "no match" needing Stage B
TOOLING: repeated_sibling_detector.py (reused, not modified), block_attributes,
         block_render_repeaters (from Unit 1)
ON-CRITICAL-PATH: yes
TEST: per spec §10 — buybox vs product-card correctly separated by parent context BEFORE
      leaf matching (the spec's own flagship worked example — must resolve to buybox as
      the only surviving candidate, AND must NOT auto-complete since the leaf match is
      partial, exactly as §4.1 derives); a group's leaf shape is only ever checked
      against the narrowed candidate(s), never the full roster; a close-but-partial
      match after narrowing does not auto-complete.

UNIT: S44-3-stage-b-fallback
PURPOSE: §5 Stage B DB-fact elimination (runs only when Stage A finds nothing, scans the
         FULL seeded roster per FR-44-1(b), no pre-narrowing) + §5.2 field-level
         resolution priority order + §5.3's brand-strip "count" field decision (skip with
         honest reason, or a small new attribute — pick one, document the choice).
FILES: same module as Unit 2, additive functions; self-test additions.
INPUTS: a repeated draft group Stage A didn't resolve
OUTPUTS: narrowed candidate(s) or an honest gap
TOOLING: array_item_schema, array_content.py (reused unmodified)
ON-CRITICAL-PATH: yes
TEST: per spec §10 — the five real shapes from prior session evidence (ticker,
      brand-tile, reasons-card, filter chip, basket line item) + a negative control (a
      genuinely ambiguous field no rule resolves, must fall to review, never guessed).

UNIT: S44-4-trust-gate-and-wiring
PURPOSE: §3/FR-44-1 trust gate (exact match AND per-client first-look) + §7 audit log
         (classless-recognition-log.jsonl, with the v2.3.1 source discriminator already
         specified for Spec 45 Tier 4 compatibility) + operator-review.html integration
         (add rows to the EXISTING generator, §7) + classless-summary.md end-of-run file
         + §9 rollout flags (--classless-match, --classless-auto-complete, both
         off-by-default) + the orchestrator call-site wiring (§4.4 — runs INSTEAD of
         convert_section for a matched boundary, at the real integration point named in
         §2 above).
FILES: sgs-clone-orchestrator.py (the flag + call-site wiring), the Unit 2/3 module
       (log-writing + trust-gate logic), recogniser/simple_html_review_report.py
       (extend, don't replace), a new classless-summary.md writer; self-test additions.
INPUTS: Unit 2/3's RenderMatchResult
OUTPUTS: a real clone-time decision (auto-complete or review-pending), logged
TOOLING: existing operator-review.html generator, existing orchestrator flag pattern
         (--dom-shape-min-confidence / --sc-var-min-confidence as the precedent to mirror)
ON-CRITICAL-PATH: yes
TEST: per spec §10 — FR-44-1(b) simulated new-client first occurrence forces review once,
      second occurrence for the SAME client auto-completes under (a) alone; confirm the
      audit log + operator-review.html + classless-summary.md all fire on a real dry-run.
```

## 4. Dependencies

Strictly sequential per spec §9 ("one pass," this order) — Unit 1 blocks Unit 2 (Stage A
needs seeded `block_render_repeaters` to match against), Unit 2 blocks Unit 3 (Stage B
only runs when Stage A returns nothing), Unit 3 blocks Unit 4 (the trust gate + wiring
needs both stages' output shape finalised first). No parallel opportunity here, unlike
Spec 45's tiers — this is one recognition pipeline, not four independent resolvers.

## 5. Gates

```
GATE 1-3: after each unit — task reviewer (spec compliance + code quality), same
          discipline as the Spec 45 build. Fix cycle on any Critical/Important finding
          before moving to the next unit.

GATE 4 (after Unit 4 — everything wired): a live dry-run against the real Eye Care
Birmingham draft with --classless-match on (--classless-auto-complete stays OFF), per
spec §10's live-verification requirement. Confirm the previously-admitted-but-failed
boundaries (13 admitted / 0 completed, this project's own prior measurement) now show
real completions or honest review-queue entries. This is a functional smoke test, NOT
the trust-gate validation — do not flip --classless-auto-complete on based on this run.

FINAL GATE — held for next session, not run now: /adversarial-council re-verification
of the built mechanism (mirroring the 3-round discipline this exact spec has already
been through twice). This is the actual "is it safe to trust" checkpoint. Nothing in
this plan enables live auto-completion before that pass runs.
```

## 6. Commit plan

One commit per UNIT, matching R-31-5 (phases never ship as single commits) and this
project's own established pattern from the Spec 45 build.

## 7. Smallest first action

Unit 1's `CREATE TABLE block_render_repeaters` — the schema is already fully specified
in spec §4.2, copy it verbatim. ~5 min, zero dependencies.
