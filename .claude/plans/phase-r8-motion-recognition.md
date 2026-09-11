---
plan_id: phase-r8-motion-recognition
phase_name: "R8 — motion/animation recognition from raw CSS"
project: small-giants-wp
header_status: ready-to-execute
cost_estimate_tokens: 168000
docscore_grade: "A (95%)"
---

# Phase R8 — Motion/animation recognition from raw CSS

**USP:** Right now, cloning a beautiful, motion-rich site (the kind the "Awwwards-level" bar is aiming at) produces a completely static page — R9 measured this as the framework's single biggest capability gap of anything checked. This phase makes the pipeline notice and faithfully recreate the fades, reveals, staggers, and premium-library effects a source page actually uses, instead of silently dropping every one of them.

**Plan label:** [PLAN: sonnet] — design is fully settled (brainstorm → 4-rater `/qc-council` → `/research-buddies` → Bean-directed revisions, all complete); this is disciplined implementation against a locked spec, not open-ended architecture.

**Docscore:** A (95%) — verified via `python "C:/Users/Bean/.agents/skills/shared-references/docscore.py" plans/phase-r8-motion-recognition.md --type archived-plan`

**Aggregate cost estimate:** ~168,000 tokens across 14 steps + 4 QA gates (Sonnet-weighted; see Tooling Index for per-step model split). No prior phase-plan actuals exist in this project yet to calibrate against — routing-table defaults used.

**Phase success criteria (done when):**
- [ ] Tier 1 (CSS shape-matching) and Tier 2 (trigger classification) ship, and a real measurement against 3 live sites (including TAG Heuer) confirms genuine coverage before Tier 3/4a build starts
- [ ] Tier 3 (stagger detection) ships with its own timing-comparison logic, sharing only the shape-alike pre-filter (built as a standalone module) with the BEM-recognition doc's future Q2 work
- [ ] Tier 4a (GSAP/Lenis/Three.js DOM-signal detection) ships and is proven live against at least one real WebGL-bearing source
- [ ] A full clone of the TAG Heuer Eyewear page correctly recovers its CSS-shaped motion (blur-text intro, carousel) AND honestly flags its WebGL 3D viewer section as needing a human decision — not silently dropped, not silently attempted
- [ ] `prefers-reduced-motion` is honoured by every emitted effect by construction (verified live, not assumed)
- [ ] Zero hardcoded Python dicts introduced — every shape/trigger/signature lookup is DB-seeded (R-31-1)
- [ ] Tier 4c (style-approximation) and Tier 4d (reference-file pulling, D1019 legal framing intact) ship as the fast-follow, gated on Tier 4a being live

**Entry context (read before starting):**
- `.claude/plans/2026-09-10-r8-motion-recognition-brainstorm.md` — THE governing design doc for this entire phase. Read in full; every tier, decision, and constraint below cites it rather than repeating it.
- `.claude/specs/38-SGS-MOTION-SYSTEM.md` §1 — the four-tier motion doctrine (V/G/H/W) that bounds what any step in this phase may emit
- `.claude/reports/2026-09-10-capability-coverage-inventory.md` — the R9 measurement that motivated this phase
- `.claude/decisions.md` D1019 — the legal framing Tier 4d's step must carry verbatim
- `plugins/sgs-blocks/scripts/converter/db/db_lookup.py::fx_attr_roster`, `::lift_behavioural_attrs` — the existing, working plumbing this phase extends, never replaces
- `C:\Users\Bean\.claude\memory\research\2026-09-10-detecting-motion-libraries-in-bundled-js.md` — the DOM-signal research underpinning Tier 4a

**References:**
- `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — R-31-1 (DB-first), R-31-5 (phases never ship as single commits), R-31-9 (universal mechanisms), R-31-13 (Bean's eye co-authoritative)
- `.claude/plans/2026-09-10-bem-recognition-and-template-detection-brainstorm.md` — sibling doc; Tier 3's shared pre-filter module is built for both this phase and that doc's future Q2 work
- TAG Heuer Eyewear collection page (`https://www.tagheuer.com/fr/en/eyewear/collection-eyewear.html`) — the phase's real-world test case, Awwwards-recognised, chosen because it spans simple CSS motion through genuinely heavy WebGL

**Known noise source for this phase's QA gates (not this phase's to fix):** a live shared-database conflict on `sgs/container`'s `grid-template-columns` (two colliding attribute rows) is being fixed in a parallel, unrelated task right now. If any QA gate's test run shows failures in `test_css_resolvers.py`, `test_tier_object_grid_layout.py`, or similar grid-attribute tests that this phase's steps didn't touch, check whether that fix has landed (`git log --oneline -5 -- plugins/sgs-blocks/src/blocks/container/block.json`) before treating it as a regression this phase caused.

**Tooling Index (used across this phase):**

| Type | Name | Used in |
|------|------|---------|
| skill | /delegate | every dispatched step |
| skill | /subagent-prompt | steps 1, 3, 5, 6, 7, 9, 10, 11, 13, 14 (every step with a pre-written `Prompt:` field) |
| mcp | playwright | steps 6, 10, 11, 14, plus the QA gate after step 10 and step 12 |
| cli | sgs-db.py | steps 1, 5, 7, 9, 10 (every step building or querying a DB-seeded lookup table) |
| external | TAG Heuer live page | step 6, the QA gate after step 10, step 14 |

*(Corrected 2026-09-11 via `/qc` — the original draft of this table both undercounted `/subagent-prompt`'s real usage and cited `wp-blocks.py`, which is not actually invoked anywhere in this plan; removed rather than left as a phantom entry.)*

---

## Base phase (Tiers 1, 2, checkpoint, 3, 4a)

Step 1 — Build the Tier V shape-matching lookup table (DB-first)
  Model:       sonnet
  Action:      Design and seed a new DB table named `motion_shape_signatures` (mirroring the `slots` table's `aliases` column (JSON array) — confirmed live via `PRAGMA table_info(slots)`, there is no separate `slot_synonyms` table, per R-31-1) mapping known CSS animation shapes to existing Tier V preset slugs from the closed vocabulary named in the brainstorm doc §"Ground truth" item 2. Write the seeding script under `plugins/sgs-blocks/scripts/dbschema/`, following the same declarative pattern `fx_attr_roster()` uses (read from a maintained source file, never a hand-authored duplicate query).
  **Pinned schema (resolved by the Hidden Decisions pass — do not re-derive):** columns `id, preset_slug (TEXT, the fx-preset value written in Step 3), tier (TEXT, always 'V' for this table), animated_property (TEXT, e.g. 'opacity'/'transform'), direction (TEXT enum: 'up'|'down'|'left'|'right'|'scale-in'|'scale-out'|'rotate'|'none'), magnitude_min (REAL), magnitude_max (REAL, both in px or unitless-scale-factor depending on animated_property — a translateY entry uses px, a scale entry uses the unitless factor), duration_ms (INTEGER), easing_curve (TEXT enum: 'linear'|'ease'|'ease-in'|'ease-out'|'ease-in-out' — a raw `cubic-bezier(...)` value gets snapped to its nearest of these 5 by control-point distance at seed time, not left as a raw bezier string).
  Files:       `plugins/sgs-blocks/scripts/dbschema/seed-motion-shape-signatures.py` (new), `plugins/sgs-blocks/scripts/dbschema/schema.sql` (new table `motion_shape_signatures`)
  Inputs:      Brainstorm doc Tier 1 section; existing Tier V preset catalogue (query live via `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT DISTINCT preset_slug FROM ..."` — confirm exact table name at build time, do not assume)
  Outcome:     A new DB table exists, seeded with the real Tier V preset catalogue's known shapes, queryable and empty of any hardcoded Python dict equivalent.
  Exec:        SEQUENTIAL
  Deps:        none
  Marker:      SESSION-START
  Time:        25 min
  Tooling:     sgs-db.py, /delegate, /subagent-prompt
  On-Fail:     If the Tier V preset catalogue's "known shape" isn't cleanly expressible as a DB row (e.g. some presets have no clean CSS-property signature), narrow scope to the presets that DO have a clean signature and flag the rest as a documented gap — do not force an approximate signature into the table.
  Cold-Entry:  Brainstorm doc Tier 1 section; `.claude/specs/38-SGS-MOTION-SYSTEM.md` §3 (preset roster); `fx_attr_roster()` as the pattern to mirror.
  Prompt: |
    Project: small-giants-wp. Build a new DB-seeded lookup table mapping known CSS animation shapes to SGS's existing Tier V preset catalogue. Read `.claude/plans/2026-09-10-r8-motion-recognition-brainstorm.md` Tier 1 section in full first. Follow `plugins/sgs-blocks/scripts/converter/db/db_lookup.py::fx_attr_roster`'s declarative pattern exactly — read from a maintained source, never a hand-authored duplicate. New table lives in `plugins/sgs-blocks/scripts/dbschema/schema.sql`; seeding script in `plugins/sgs-blocks/scripts/dbschema/seed-motion-shape-signatures.py`. Query the live Tier V preset catalogue yourself before designing the schema — do not assume shapes, confirm them. This project bans hardcoded Python dicts for exactly this kind of lookup (R-31-1) — the table IS the fix, not a Python-side cache of it. Verify: the new table exists, is seeded, and a spot-check query for 3 known presets (an entrance fade, a hover effect, a parallax tier) returns the expected signature. Commit to `main`, explicit pathspec, no PR, no stash, integrate with origin after.
  Test:
    Happy:       Query the new table for a known "fade up on scroll" signature → returns the correct existing Tier V preset slug.
    Edge:        A CSS shape that partially matches two different presets (e.g. same property, different magnitude) → table design must disambiguate by the full signature, not just the animated property name.
    Fail:        A shape with no matching Tier V preset → query returns empty, not a wrong guess.
    Integration: standalone (this step only builds the lookup table; Step 3 builds the CSS-reading classifier that queries it).

Step 2 — QA: confirm the shape-signature table is genuinely DB-first, not a disguised dict
  Model:   haiku
  Exec:    SEQUENTIAL
  Deps:    step 1 complete
  Check:   `git diff --stat` on step 1's commit, confirm no `.py` file contains a literal dict/list mapping shape→preset outside of the DB seeding script itself; then `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT COUNT(*) FROM motion_shape_signatures"` (adjust table name to what step 1 actually created)
  Pass:    Row count > 0, and no hardcoded shape→preset dict exists anywhere outside the seeding script's own source-of-truth read
  Fail:    If a hardcoded dict is found, send step 1 back with the specific file:symbol to fix before proceeding
  Marker:  QA

Step 3 — Build the CSS declaration-shape classifier (Tier 1)
  Model:       sonnet
  Action:      Write the classifier that reads a draft element's `@keyframes` + `animation`/`transition` declarations, extracts the CSS-level facts (animated properties, direction/magnitude, duration/easing — encoded exactly per Step 1's pinned schema above: direction as one of the 8 named enum values, magnitude as a numeric min/max, easing snapped to the nearest of the 5 named keywords), and queries `motion_shape_signatures` (Step 1's table) to find a matching Tier V preset.
  **Matching rule (resolved by the Hidden Decisions pass — do not re-derive):** exact match required on `animated_property` and `direction`; `duration_ms` matches within ±20%; `easing_curve` must match the same snapped keyword exactly (no cross-keyword tolerance). If a candidate's `magnitude` falls within `[magnitude_min, magnitude_max]`, it's a match. Zero or 2+ equally-good candidates → no match, fall through cleanly (never guess between ties).
  **`lift_behavioural_attrs()`, corrected (verified 2026-09-11 via `/qc` against the real function body — the earlier draft of this step overstated it as a "write mechanism" to reuse; it is not):** its real signature is `lift_behavioural_attrs(node, slug) -> (attrs, skipped)` — a PURE function that reads a draft element's `data-sgs-fx-*` marker attributes and RETURNS an `{attr_name: value}` dict (using the fx-attribute contract's naming — `fx`, `fxTrigger`, `fxStart`, etc., full roster in `fx_attr_roster()`); it does not itself write anything into the emitted block — its caller (`converter/services/assembly.py`, the step that invokes it) merges the returned dict into the block's final attributes. **This classifier must produce output in the SAME `{attr_name: value}` shape** (on a match, `{"fx": <preset_slug from Step 1's table>}`) so it can be merged by that same caller identically — do not invent a second merge/write path, and do not go looking for a "write mechanism" inside `lift_behavioural_attrs()` itself, there isn't one.
  Files:       `plugins/sgs-blocks/scripts/converter/resolvers/motion_shape.py` (new)
  Inputs:      Step 1's DB table; `converter/db/db_lookup.py::lift_behavioural_attrs` as the output-shape precedent (returns a dict, does not write directly — see correction below)
  Outcome:     Given a draft `<div>` with a real `@keyframes fadeInUp` + `animation: fadeInUp 0.6s ease-out`, the classifier correctly identifies and emits the matching Tier V entrance preset attribute.
  Exec:        SEQUENTIAL
  Deps:        step 2 (QA) passed
  Marker:      (none)
  Time:        40 min
  Tooling:     /delegate, /subagent-prompt
  On-Fail:     If the classifier's match rate against a hand-built test fixture set is poor, do not lower the confidence bar to force more matches — narrow to only shapes with genuinely unambiguous signatures and document the rest as Tier 5 candidates (per the brainstorm doc's own "don't force a bad fit" discipline, mirrored from Tier 4c).
  Cold-Entry:  N/A (mid-stream step)
  Prompt: |
    Project: small-giants-wp. Build the Tier 1 CSS declaration-shape classifier per `.claude/plans/2026-09-10-r8-motion-recognition-brainstorm.md` Tier 1 section. Read a draft element's `@keyframes`/`animation`/`transition` declarations, extract the CSS-level shape (animated properties, direction/magnitude, duration/easing), query the DB table built in the prior step, and on a match RETURN a `{"fx": <preset_slug>}` dict in the SAME output shape `converter/db/db_lookup.py::lift_behavioural_attrs` already returns for SGS-authored motion (that function is a pure lookup returning a dict — it does not write anywhere itself; its caller in `converter/services/assembly.py` does the actual merge into the block's attributes — your classifier's output must be mergeable by that same caller, not a second parallel write path). This is a STRUCTURAL constraint: a shape-match against the Tier V catalogue can only ever emit an existing Tier V preset — verify your implementation cannot emit anything else (this is what makes Tier 1 provably safe re: Spec 38's tier-ratchet doctrine). Build a small test fixture set (5-10 known CSS shapes with known expected presets) and verify against it before calling this done. Commit to `main`, explicit pathspec, integrate with origin after.
  Test:
    Happy:       A draft with `animation: fadeInUp 0.6s ease-out` on scroll-visible load → classifier emits the matching entrance preset attribute.
    Edge:        A CSS shape combining two properties (opacity + transform) with an unusual duration → classifier either matches the closest known signature or correctly declines rather than guessing.
    Fail:        A CSS shape with no `@keyframes` at all (just a static `transition` on hover) → classifier correctly returns no Tier 1 match (this is Tier 2's job to route via trigger, or falls through cleanly).
    Integration: Feeds Step 5 (Tier 2 trigger classification) — Tier 1's output element becomes Tier 2's input.

Step 4 — QA: verify Tier 1 cannot emit anything beyond existing Tier V presets
  Model:   sonnet
  Exec:    SEQUENTIAL
  Deps:    step 3 complete
  Check:   Grep the classifier's write path (`git grep -n "fx_attr\|data-sgs-fx" -- plugins/sgs-blocks/scripts/converter/resolvers/motion_shape.py`) and manually confirm every possible emitted value traces to a Tier V-only preset slug from Step 1's table — no code path can reach a Tier G/H/W preset name.
  Pass:    Every emittable value is confirmed Tier V-only by direct code read, not by running the classifier and hoping.
  Fail:    If any code path could theoretically reach a non-Tier-V value, block and fix before proceeding — this is the phase's core safety property.
  Marker:  QA

Step 5 — Build trigger-mechanism classification (Tier 2)
  Model:       sonnet
  Action:      Extend the Step 3 classifier (or add a sibling module) to read the accompanying trigger signal alongside a Tier 1 shape match: `animation-timeline: scroll()` or an adjacent IntersectionObserver pattern → scroll-triggered; a `:hover`/`:focus` selector owning the animation → hover-triggered; unconditional on-load `animation` → load-triggered. Route to the correct Tier V preset FAMILY (the same fade shape maps to a different preset depending on trigger).
  Files:       `plugins/sgs-blocks/scripts/converter/resolvers/motion_trigger.py` (new)
  Inputs:      Step 3's shape-match output; the brainstorm doc's Tier 2 section for the exact trigger-signal list
  Outcome:     The same CSS shape produces the correct DIFFERENT preset depending on whether it's scroll-, hover-, or load-triggered — verified on 3 test fixtures, one per trigger type.
  Exec:        SEQUENTIAL
  Deps:        step 4 (QA) passed
  Marker:      (none)
  Time:        30 min
  Tooling:     sgs-db.py, /delegate, /subagent-prompt
  On-Fail:     A misclassified trigger is a safe failure mode per the brainstorm doc (working-but-wrong-timing, not broken) — if JS-based IntersectionObserver detection proves unreliable, narrow to the CSS-only trigger signals (`animation-timeline: scroll()`, `:hover`) and flag JS-observer detection as a documented gap rather than force an unreliable heuristic.
  Cold-Entry:  N/A (mid-stream step)
  Prompt: |
    Project: small-giants-wp. Build Tier 2 (trigger-mechanism classification) per `.claude/plans/2026-09-10-r8-motion-recognition-brainstorm.md` Tier 2 section, extending the Tier 1 classifier just built. Detect: CSS `animation-timeline: scroll()` or an adjacent IntersectionObserver JS pattern → scroll-triggered; a `:hover`/`:focus` selector owning the animation → hover-triggered; unconditional load `animation` → load-triggered. This determines which Tier V preset FAMILY the Tier 1 shape match routes to. Build 3 test fixtures (one per trigger type, same underlying CSS shape) and verify each produces the correct, DIFFERENT preset. Commit to `main`, explicit pathspec, integrate with origin after.
  Test:
    Happy:       Same fade shape with `animation-timeline: scroll()` vs `:hover` vs unconditional load → three different, correct Tier V presets emitted.
    Edge:        A JS-driven IntersectionObserver pattern in adjacent script content → correctly classified as scroll-triggered without needing the CSS-native `animation-timeline` property.
    Fail:        No trigger signal detectable at all → falls back to load-triggered (the least surprising assumption), documented as an inline code comment at the fallback site — no separate doc file needed.
    Integration: Feeds the CHECKPOINT below — Tiers 1+2 combined are what gets measured against real sites next.

---

### CHECKPOINT — measure Tiers 1+2 against real sites before building Tier 3/4a

Step 6 — Measure Tier 1+2 coverage against TAG Heuer + 2 more real sites
  Model:       sonnet
  Action:      Run a real clone attempt against the TAG Heuer Eyewear collection page's CSS-shaped motion sections (the blur-text intro and scrolling carousel, per the brainstorm doc's test-case framing) plus 1-2 additional real sites with simple CSS motion (Bean picks, or use 2 more Awwwards-listed sites with clearly Tier-V-shaped effects). Record actual match rate: how many real animation declarations got correctly recognised vs missed vs misclassified.
  Files:       New report: `.claude/reports/YYYY-MM-DD-r8-tier1-2-coverage-measurement.md (use the actual run date in YYYY-MM-DD form, this project's standard report-naming convention)`
  Inputs:      Steps 1-5's shipped classifiers; the 3 real test URLs
  Outcome:     A real, evidenced coverage number — not an estimate — confirming whether Tiers 1+2 alone close most of the real-world gap (per the brainstorm doc's Pragmatist rater's hypothesis) or whether a meaningful fraction of real motion is still being missed.
  Exec:        SEQUENTIAL
  Deps:        step 5 complete
  Marker:      HANDOFF
  Time:        35 min
  Tooling:     Playwright MCP, /delegate, /subagent-prompt
  On-Fail:     If coverage is poor (a large fraction of real motion missed), STOP before building Tier 3/4a — return to Step 3/5 with the specific missed cases as new test fixtures, per this project's measure-before-escalating discipline. Do not proceed to Tier 3/4a on an unmeasured assumption.
  Cold-Entry:  This report file; the brainstorm doc's "Real-world test case" section; TAG Heuer URL.
  Prompt: |
    Project: small-giants-wp. Measure real coverage of the just-shipped Tier 1+2 motion classifiers against 3 real sites: TAG Heuer Eyewear's collection page (https://www.tagheuer.com/fr/en/eyewear/collection-eyewear.html — focus on its blur-text intro and scrolling carousel, which are Tier-V-shaped per the design doc) plus 2 more real sites with simple CSS motion. For each site: identify every real CSS animation/transition declaration on the page, run it through the shipped classifiers, and record match/miss/misclassify for each. Write a report to `.claude/reports/[today's date]-r8-tier1-2-coverage-measurement.md` with real numbers, not estimates. This is a genuine measurement checkpoint per this project's own discipline (R-31-5-adjacent: measure before escalating to the next tier) — an honest "coverage is weaker than hoped" finding is a valid and useful result, do not inflate the numbers.
  Test:
    Happy:       TAG Heuer's blur-text intro correctly classified and matched to a real Tier V preset.
    Edge:        A CSS animation using an unusual custom easing curve → correctly classified by shape even with a non-standard easing value.
    Fail:        A genuinely ambiguous or novel motion shape → honestly reported as MISSED, not force-matched to the nearest preset.
    Integration: standalone report; gates whether Step 7 proceeds.

---

## Base phase continued (Tiers 3, 4a)

Step 7 — Build the shared sibling shape-alike pre-filter (standalone module)
  Model:       sonnet
  Action:      Per Bean's day-1 decision (brainstorm doc Tier 3 "Build decision"), build the "these N siblings are structurally shape-alike" comparison as its own standalone module — NOT embedded in Tier 3's own code — so the BEM-recognition doc's future Q2 sibling-repeater work can import it later. Scope narrowly: structural/class-signature shape-alike comparison ONLY, no timing-offset logic (that stays Tier-3-private per rater C's correction).
  **"Class-signature," defined (resolved by the Hidden Decisions pass — do not re-derive):** an element's class-signature is its sorted list of non-utility CSS classes (i.e. exclude any class matching a known utility-framework pattern already handled elsewhere in this pipeline — Tailwind-shaped single-purpose classes; keep BEM element/modifier classes since they carry real identity). Two siblings are "shape-alike" when their tag name AND class-signature are identical, or differ only by a class this project's BEM convention treats as a modifier (`--modifier` suffix) — matching the tolerance the brainstorm doc's Tier 3 section itself describes ("near-identical," e.g. one card missing an optional badge element still counts).
  Files:       `plugins/sgs-blocks/scripts/converter/services/sibling_shape_prefilter.py` (new, standalone)
  Inputs:      Brainstorm doc Tier 3 section + "Build decision" note; QC-council rater C's reuse-claim correction
  Outcome:     A standalone, importable module that answers "are these N sibling elements structurally shape-alike" — used by Step 9 below, ready for the BEM doc's Q2 work to import later without modification.
  Exec:        SEQUENTIAL
  Deps:        step 6 checkpoint passed with acceptable coverage
  Marker:      SESSION-START
  Time:        25 min
  Tooling:     sgs-db.py, /delegate, /subagent-prompt
  On-Fail:     If scope creeps toward embedding timing logic in this module, stop and move it out — the whole point of Bean's day-1 decision was keeping this narrow and genuinely reusable.
  Cold-Entry:  Brainstorm doc Tier 3 section + "Build decision" note; `.claude/plans/2026-09-10-bem-recognition-and-template-detection-brainstorm.md` Q2 section (the future consumer, for interface-shape awareness only — do not build Q2 itself here).
  Prompt: |
    Project: small-giants-wp. Build a STANDALONE sibling shape-alike comparison module per Bean's explicit day-1 decision recorded in `.claude/plans/2026-09-10-r8-motion-recognition-brainstorm.md` Tier 3 section. Scope: given N sibling DOM elements, determine if they are structurally shape-alike (same tag/class-signature pattern) — nothing about timing, animation-delay, or stagger detection belongs in this module, that logic stays in Tier 3 itself (built in the next step). This module must be genuinely reusable by a different, not-yet-built consumer (`.claude/plans/2026-09-10-bem-recognition-and-template-detection-brainstorm.md`'s Q2 sibling-repeater detector) — keep its interface narrow and general, not shaped around Tier 3's specific needs. Commit to `main`, explicit pathspec, integrate with origin after.
  Test:
    Happy:       5 sibling `<div class="card">` elements with identical structure → correctly identified as shape-alike.
    Edge:        5 siblings, one missing an optional badge element → still correctly identified as shape-alike (near-identical, not byte-identical) — per this project's tolerance for "near-identical" rather than strict equality.
    Fail:        5 genuinely different sibling elements (different tags entirely) → correctly identified as NOT shape-alike.
    Integration: Standalone module — consumed by Step 9 (Tier 3) now, and the BEM doc's future Q2 work later (not built in this phase).

Step 8 — QA: confirm the pre-filter module has zero Tier-3-specific logic leaked in
  Model:   haiku
  Exec:    SEQUENTIAL
  Deps:    step 7 complete
  Check:   `git grep -in "delay\|stagger\|timing\|offset" -- plugins/sgs-blocks/scripts/converter/services/sibling_shape_prefilter.py`
  Pass:    Zero matches — confirms no timing/stagger logic leaked into the supposedly-generic module
  Fail:    If matches found, send back to Step 7 to extract that logic into Tier 3's own module before proceeding
  Marker:  QA

Step 9 — Build stagger/repetition detection (Tier 3)
  Model:       sonnet
  Action:      Using Step 7's pre-filter to identify shape-alike siblings, build the NEW timing-offset comparison logic: read each shape-alike sibling's `animation-delay` (or JS-driven stagger equivalent), detect a consistent incrementing pattern, and recognise the group as ONE staggered-reveal effect rather than N independent identical animations.
  **Stagger-acceptance rule (resolved by the Hidden Decisions pass — do not re-derive):** accept as a stagger when the per-sibling delay sequence is strictly monotonic (all increasing, or all decreasing — reject on any reversal in order) across every sibling in the shape-alike group. Do NOT require a fixed arithmetic step size — real staggers commonly use eased (non-linear) offset curves. Reject (fall back to N separate writes) only on a genuine reversal or on identical delays across all siblings (no stagger at all).
  Files:       `plugins/sgs-blocks/scripts/converter/resolvers/motion_stagger.py` (new)
  Inputs:      Step 7's shape-alike pre-filter; the brainstorm doc's explicit correction that this timing logic is NOT shared with the BEM doc's Q2 work
  Outcome:     A group of 5 sibling cards with `animation-delay: 0.1s, 0.2s, 0.3s...` is correctly recognised as one staggered-reveal effect and emits the matching Tier V stagger preset with the correct per-item offset parameter, rather than 5 separate entrance-preset writes.
  Exec:        SEQUENTIAL
  Deps:        step 8 (QA) passed
  Marker:      (none)
  Time:        35 min
  Tooling:     sgs-db.py, /delegate, /subagent-prompt
  On-Fail:     Per the brainstorm doc's own risk assessment: worst case is treating a genuine stagger as N separate simple entrances — a safe degradation, not a blocker. If timing-pattern detection proves unreliable on real sites, ship the safe degradation and document stagger detection as needing more real-world tuning, rather than block the phase on it.
  Cold-Entry:  N/A (mid-stream step)
  Prompt: |
    Project: small-giants-wp. Build Tier 3 (stagger/repetition detection) per `.claude/plans/2026-09-10-r8-motion-recognition-brainstorm.md` Tier 3 section, using the shape-alike pre-filter module built in the prior step. Read each shape-alike sibling's `animation-delay` value (or equivalent JS stagger pattern), detect a consistent incremental offset across the group, and emit ONE staggered-reveal preset write covering the whole group rather than N separate writes. This timing-comparison logic is explicitly NOT shared with the BEM-recognition doc's sibling detector (per `/qc-council` rater C's correction — that doc's detector is an equivalence hash, this needs a differencing signal) — build it fresh here, private to this module. Test against a real 5-sibling staggered-card fixture. Commit to `main`, explicit pathspec, integrate with origin after.
  Test:
    Happy:       5 siblings with `animation-delay: 0.1s` increments → recognised as one staggered group, correct offset parameter emitted.
    Edge:        5 siblings with a non-uniform but still monotonic delay pattern (0.1s, 0.15s, 0.35s) → correctly still recognised as a stagger (tolerant pattern matching, not requiring exact arithmetic progression).
    Fail:        5 siblings with random, non-monotonic delays (not a real stagger) → correctly falls back to N separate entrance-preset writes rather than force-fitting a stagger pattern.
    Integration: Feeds QA Gate below alongside Tier 4a.

Step 10 — Build DOM-runtime-signal detection for GSAP/Lenis/Three.js (Tier 4a)
  Model:       sonnet
  Action:      Build detection for the three durable DOM signals confirmed by research: Lenis's `.lenis`/`.lenis-smooth`/`.lenis-scrolling` body classes; GSAP ScrollTrigger's `.pin-spacer`/`.pin-spacer-*` wrapper div; Three.js's `data-engine="three.js r<version>"` canvas attribute. All three read from the pipeline's EXISTING DOM scrape.
  **The build-time check, made concrete (resolved by the Hidden Decisions pass — do not re-derive):** before writing detection logic, directly read whichever module performs the pipeline's Stage 0 boundary/DOM extraction (locate it via `git grep -n "class_signature" -- plugins/sgs-blocks/scripts/orchestrator/` — `stage1_boundary_hook.py` and `sgs-clone-orchestrator.py` are the known entry points from today's BEM-recognition work) and confirm it retains the FULL raw `class` attribute string and other HTML attributes for every element, not just BEM-recognised ones. If it doesn't, that's a separately-scoped fix to flag, not something to bolt a second scrape onto here.
  Seed the signature patterns into a DB table (mirroring the `slots` table's `aliases` column, not a separate table), never a hardcoded dict. Build the one small new Playwright execution probe (`WebGLRenderingContext.prototype.drawArrays` monkey-patch via `addInitScript`) ONLY for the non-Three.js WebGL draw-call confirmation case.
  Files:       `plugins/sgs-blocks/scripts/converter/resolvers/motion_library_signals.py` (new), `plugins/sgs-blocks/scripts/dbschema/seed-library-signatures.py` (new), a new Playwright probe script under `plugins/sgs-blocks/scripts/converter/` (name at build time)
  Inputs:      `C:\Users\Bean\.claude\memory\research\2026-09-10-detecting-motion-libraries-in-bundled-js.md`; brainstorm doc Tier 4a section
  Outcome:     Given a source page using Lenis, GSAP ScrollTrigger with pinning, or Three.js, the detector correctly identifies which library is genuinely active (not just referenced) and emits a flag into the standard leftover-buckets/operator-review flow — never an auto-trigger to a heavier tier.
  Exec:        SEQUENTIAL
  Deps:        step 9 complete
  Marker:      (none)
  Time:        45 min
  Tooling:     sgs-db.py, /delegate, /subagent-prompt, Playwright MCP
  On-Fail:     If the pipeline's existing DOM scrape does NOT already capture element classes/attributes as assumed (the brainstorm doc's flagged E13 verification), that's a bigger, separately-scoped fix — stop and report, do not silently bolt on a second scraping pass.
  Cold-Entry:  N/A (mid-stream step)
  Prompt: |
    Project: small-giants-wp. Build Tier 4a (DOM-runtime-signal detection) per `.claude/plans/2026-09-10-r8-motion-recognition-brainstorm.md` Tier 4a section and the research at `C:\Users\Bean\.claude\memory\research\2026-09-10-detecting-motion-libraries-in-bundled-js.md`. Detect three signals from the pipeline's EXISTING DOM scrape (verify it captures element classes/attributes FIRST — this is a flagged build-time check, do not assume): Lenis's `.lenis`/`.lenis-smooth`/`.lenis-scrolling` body classes; GSAP ScrollTrigger's `.pin-spacer`/`.pin-spacer-*` wrapper div (confirms active pinning, not just script presence); Three.js's `data-engine="three.js r<version>"` canvas attribute. Seed the class/attribute signature patterns into a new DB table mirroring the `slots` table's `aliases` column (JSON array) — confirmed live via `PRAGMA table_info(slots)`, there is no separate `slot_synonyms` table — never a hardcoded Python dict (R-31-1). Build ONE new small Playwright execution probe (inject via `addInitScript` before page load, monkey-patch `WebGLRenderingContext.prototype.drawArrays` to set a flag) ONLY for confirming a non-Three.js canvas is genuinely drawing WebGL frames, not just present. CRITICAL CONSTRAINT: every detection here feeds the standard leftover-buckets/operator-review flag — NONE of it may auto-trigger a heavier motion tier on its own; that's the exact thing `/qc-council` flagged as a real risk in the original design. Verify this constraint by reading your own code's call sites before calling this done. Commit to `main`, explicit pathspec, integrate with origin after.
  Test:
    Happy:       A source page with Lenis active → `.lenis` class detected on `<body>`, correctly flagged.
    Edge:        A source page that loads GSAP's script but only uses a trivial `.to()` fade (no pinning) → `.pin-spacer` correctly ABSENT, so no false "heavy pinning" flag fires.
    Fail:        A page with a decorative `<canvas>` using a 2D context (not WebGL) → correctly NOT flagged as WebGL-active.
    Integration: Feeds the base-phase QA gate below and later gates Tier 4c/4d (fast-follow).

---

### QA Gate — base phase (Tiers 1-4a) complete and safe

QA Gate — Tiers 1-4a shipped correctly and safely
  Model:   sonnet
  Exec:    SEQUENTIAL
  Deps:    steps 1-10 complete
  Check:   `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests/ -k "motion or shape_prefilter or library_signal" -q` AND a live Playwright re-run of Step 6's TAG Heuer measurement, confirming Tier 3/4a additions didn't regress the Tier 1/2 coverage number
  Pass:    All new tests pass; live TAG Heuer measurement shows the blur-text/carousel motion still correctly recovered AND the page's WebGL section is NOT silently auto-processed by any Tier 4a/4b logic (grep the emitted attributes confirm no Tier G/H/W value present)
  Fail:    If coverage regressed or a Tier G/H/W value was emitted without operator confirmation, STOP — this is the phase's core safety property, do not proceed to fast-follow until fixed
  Marker:  QA

---

## Fast-follow (Tiers 4c, 4d — only after base phase ships and Tier 4a is proven live)

Step 11 — Build WebGL visual-style approximation (Tier 4c)
  Model:       sonnet
  Action:      Gated on Tier 4a's confirmed-WebGL-presence signal (never fires standalone): screenshot the canvas region, classify the visual character (grain/halftone/duotone treatment vs. flowing organic gradient vs. neither) via a vision-capable read of the screenshot's pixels only, sample dominant colours to pre-fill the matching effect's palette control, and present the match as an operator-confirmed suggestion via the SAME BEM-signal declaration mechanism Spec 38 already requires. Never auto-apply.
  Files:       `plugins/sgs-blocks/scripts/converter/services/webgl_style_classifier.py` (new)
  Inputs:      Step 10's Tier 4a presence signal; brainstorm doc Tier 4c section (mechanism steps 1-5)
  Outcome:     A source page with genuine WebGL rendering matching SGS's `surface-treatment` or `flowing-gradient` visual character gets a correct, colour-matched suggestion surfaced to the operator; a page whose WebGL matches neither gets an honest "no match" plus a pointer to Tier 4d.
  Exec:        SEQUENTIAL
  Deps:        base-phase QA gate passed
  Marker:      SESSION-START
  Time:        35 min
  Tooling:     /delegate, /subagent-prompt, Playwright MCP (screenshot)
  On-Fail:     If vision-based classification proves unreliable on real sources, narrow to only the clearest-cut cases (obvious grain textures, obvious flowing gradients) and honestly report ambiguous cases as "no confident match" rather than force a guess — matches the brainstorm doc's own "never force a bad fit" discipline.
  Cold-Entry:  Brainstorm doc Tier 4c section in full; the two shipped Tier W effects' actual customisation surfaces (`surface-treatment`, `flowing-gradient` — read their real block.json/edit.js to know what parameters exist to pre-fill).
  Prompt: |
    Project: small-giants-wp. Build Tier 4c (WebGL visual-style approximation) per `.claude/plans/2026-09-10-r8-motion-recognition-brainstorm.md` Tier 4c section, gated strictly on Tier 4a's confirmed-WebGL-presence signal (read that code first — never fire this standalone). Screenshot the canvas region (the pipeline already does comparable captures for other QA — find and reuse that mechanism). Classify the screenshot's visual character via a vision-capable read of PIXELS ONLY (never the shader/GPU code — that distinction is what keeps this legal under Spec 38 §1.2b's ban, do not blur it) into one of: grain/halftone/duotone treatment, flowing organic gradient, or neither. Sample dominant colours from the same screenshot. Present the result as an operator-confirmed SUGGESTION via the same BEM-signal declaration mechanism every other Tier W effect already uses for its controls — never auto-apply, never skip the confirmation step even if the match looks obviously correct. When neither shipped effect matches, say so plainly and point at Tier 4d (built in the next step) as the alternative. Commit to `main`, explicit pathspec, integrate with origin after.
  Test:
    Happy:       A source with an obvious duotone/grain background texture → correctly classified as matching `surface-treatment`, with sampled colours pre-filling its palette control as a suggestion.
    Edge:        A source with a subtle, ambiguous flowing-gradient-like texture → either a confident match or an honest "uncertain" — never a forced low-confidence guess presented as certain.
    Fail:        A source with a 3D object viewer (TAG Heuer's actual case) → correctly reports NO MATCH to either shipped effect, points to Tier 4d.
    Integration: Feeds Step 13 (Tier 4d) for the no-match case.

Step 12 — QA: confirm Tier 4c never auto-applies without operator confirmation
  Model:   sonnet
  Exec:    SEQUENTIAL
  Deps:    step 11 complete
  Check:   Read every call site of `webgl_style_classifier.py`'s output — confirm none writes directly to a block attribute without passing through the same editor-confirmation UI path every other Tier W declaration uses. Live Playwright check: run the classifier against a real WebGL source and confirm the SUGGESTED effect is NOT live on the page until an operator explicitly confirms it in the editor.
  Pass:    Zero auto-apply code paths found by direct read; live check confirms no visual change occurs pre-confirmation
  Fail:    If any auto-apply path exists, this is a direct Spec 38 §1.2b violation — block and fix immediately, do not treat as minor
  Marker:  QA

Step 13 — Build operator-confirmed reference-file pulling (Tier 4d)
  Model:       sonnet
  Action:      When Tier 4c reports no match (or the operator prefers the real thing), offer pulling the actual reference file(s) behind the detected WebGL effect from the source's publicly-served assets, gated on Tier 4a's presence signal, as ONE Bean-confirmed choice per source. Never automatic. The pulled file is treated as a starting point to be reworked into SGS's own attribute/control system, never shipped verbatim.
  Files:       `plugins/sgs-blocks/scripts/converter/services/webgl_reference_puller.py` (new)
  Inputs:      Step 10's presence signal; Step 11's "no match" output; `.claude/decisions.md` D1019 (the legal framing, verbatim)
  Outcome:     A confirmed per-source choice to pull a reference file fetches the relevant public asset(s), surfaces them to the operator with the D1019 legal framing displayed (not buried), and never fires without that explicit confirmation.
  Exec:        SEQUENTIAL
  Deps:        step 12 (QA) passed
  Marker:      (none)
  Time:        30 min
  Tooling:     /delegate, /subagent-prompt
  On-Fail:     If the D1019 legal framing text gets simplified or dropped during implementation (e.g. "for brevity" in a UI string), that is a hard stop — re-add the framing, do not ship a softened version. This is the one non-negotiable in this step.
  Cold-Entry:  N/A (mid-stream step)
  Prompt: |
    Project: small-giants-wp. Build Tier 4d (operator-confirmed reference-file pulling) per `.claude/plans/2026-09-10-r8-motion-recognition-brainstorm.md` Tier 4d section. Gated on Tier 4a's WebGL-presence signal AND Tier 4c reporting no style match (or operator explicitly preferring the real file over an approximation). Fetch the relevant public asset(s) (shader source, driving JS) from the source's own publicly-served files. Surface this as ONE explicit, per-source, operator-confirmed choice — never automatic, never a default. ⛔ MANDATORY, NON-NEGOTIABLE: read `.claude/decisions.md` D1019 in full and reproduce its legal framing VERBATIM IN INTENT in whatever UI copy/confirmation text you write — this capability is Bean's own risk-tolerance decision, explicitly NOT a legal clearance; rebuilding pulled material is what makes it a derivative work, which still generally needs the original owner's permission under UK/US copyright; the solicitor's-hour question from the original Stripe precedent (D880) remains genuinely unresolved. Do not soften, shorten past recognisability, or omit this framing "for UI brevity" — if the confirmation dialog can't fit the full framing, link to D1019 rather than cut it. Commit to `main`, explicit pathspec, integrate with origin after.
  Test:
    Happy:       Tier 4c reports no match on a real WebGL source → operator is offered the pull-reference-file option with the D1019 framing visibly presented, confirms, and the file is fetched.
    Edge:        Operator declines the offered pull → nothing is fetched, no residual state left half-applied.
    Fail:        Tier 4a has NOT confirmed WebGL presence → Tier 4d never even offers the option (hard gate, not a soft default).
    Integration: Terminal step of the WebGL decision chain (4a → 4c → 4d).

Step 14 — Final live verification: TAG Heuer full clone, all tiers together
  Model:       sonnet
  Action:      Run a complete clone of the TAG Heuer Eyewear collection page through the fully-shipped phase (Tiers 1/2/3/4a/4c/4d) and confirm the phase's own success criteria: CSS-shaped motion (blur-text, carousel) faithfully recovered; the WebGL 3D viewer section honestly flagged with a real choice (approximate/pull/hand-author) rather than attempted or ignored; `prefers-reduced-motion` honoured live (test with the media feature forced on); zero Tier G/H/W values emitted without the operator having explicitly confirmed something in this session.
  Files:       Final report: `.claude/reports/YYYY-MM-DD-r8-tag-heuer-full-verification.md (actual run date, YYYY-MM-DD)`
  Inputs:      All prior steps' shipped code; live TAG Heuer page
  Outcome:     Every phase success criterion in the Phase Header is checked off with real evidence, not assumption.
  Exec:        SEQUENTIAL
  Deps:        step 13 complete
  Marker:      HANDOFF
  Time:        30 min
  Tooling:     Playwright MCP, /delegate, /subagent-prompt
  On-Fail:     Any unmet success criterion is reported honestly in the final report — this is the phase's closing verification, not a step to rush past on partial evidence.
  Cold-Entry:  N/A (final step)
  Prompt: |
    Project: small-giants-wp. Run the final live verification for the completed R8 phase. Clone TAG Heuer Eyewear's collection page (https://www.tagheuer.com/fr/en/eyewear/collection-eyewear.html) through the fully-shipped pipeline. Check, with live evidence for each: (1) the blur-text intro and scrolling carousel are correctly recovered as real Tier V motion, not dropped; (2) the WebGL 3D product viewer section is honestly flagged as needing a decision (approximate via Tier 4c / pull via Tier 4d / hand-author) — NOT silently reproduced, NOT silently dropped; (3) forcing `prefers-reduced-motion: reduce` in the browser genuinely disables the emitted motion, tested live not assumed; (4) grep the full emitted attribute set for this clone and confirm zero Tier G/H/W values exist unless an operator explicitly confirmed something in Tier 4c/4d during this run. Write findings to `.claude/reports/[today's date]-r8-tag-heuer-full-verification.md`, checking off each Phase Header success criterion with the specific evidence for it. Report honestly if anything falls short — this is the closing gate, not a step to soften.
  Test:
    Happy:       All 4 checks above pass with live evidence.
    Edge:        A motion effect that's borderline between Tier 1 and Tier 5 (novel shape) → correctly and honestly reported as a documented gap, not force-matched.
    Fail:        Any Tier G/H/W value found emitted without confirmation → phase is NOT done, report this as a blocking finding, do not close the phase.
    Integration: This IS the integration test for the whole phase.

---

## Key Judgement Calls

### Primary decisions (surfaced during planning)

- **Decision:** Should Tier 4c/4d (fast-follow) be built in the SAME session/continuous run as the base phase, or genuinely deferred to a separate future session?
  - **Options:** [A] Build everything in one continuous execution, treating the base-phase QA gate as an internal checkpoint only / [B] Genuinely stop after the base-phase QA gate and require a fresh session decision to proceed to fast-follow
  - **Recommendation:** [A] — the brainstorm doc frames 4c/4d as "small/separable enough to be their own follow-on step," not "needs its own planning session." Proceed to Step 11 automatically once the base-phase QA gate passes, unless Bean says otherwise.
  - **Why:** The design work for 4c/4d is just as settled as the base phase's — there's no open design question left to force a pause, only a dependency (Tier 4a must be live) which this plan's own sequencing already enforces.
  - **Cost of wrong choice:** If forced to stop, a future cold session has to re-read this whole plan to resume anyway — low cost either way, but continuous execution is cheaper on token overhead.
  - **Who decides:** Bean (default: continuous, per the recommendation above)

- **Decision:** What happens if Step 6's real-world coverage measurement comes back poor (Tiers 1+2 miss a large fraction of real motion)?
  - **Options:** [A] Proceed to Tier 3/4a anyway, treat coverage gaps as a documented follow-up / [B] Stop, return to Step 3/5 with the specific missed cases, re-measure before proceeding
  - **Recommendation:** [B] — matches this project's explicit measure-before-escalating discipline (visible in both this doc and the sibling BEM doc), and Step 6 itself is designed as a hard checkpoint, not a soft one.
  - **Why:** Building Tier 3/4a on top of an under-measured Tier 1/2 wastes effort if the root recognition layer itself needs fixing first.
  - **Cost of wrong choice:** Proceeding anyway risks the phase shipping with a genuinely weak recognition core, discovered only at Step 14's final verification when it's expensive to unwind.
  - **Who decides:** Whoever is executing Step 6 — the check is objective (a real measured number), not a judgement call at execution time.

### Pre-emptive decisions (Hidden Decisions pass — Sonnet + Haiku cold peer review, 2026-09-11)

Both reviewers independently converged on the same root problem: this plan cited the governing brainstorm doc for its data model and algorithms instead of inlining them, which is fine for a warm session but leaves a genuinely cold executor guessing. Fixed directly in the plan above rather than left as prose here — see Step 1 (DB schema now pinned), Step 3 (matching rule + `lift_behavioural_attrs()` write shape + emitted attribute name now spelled out), Step 7 ("class-signature" now defined), Step 9 (stagger-acceptance rule now defined), Step 10 (the build-time DOM-scrape check now names the exact files to read), and the report-path date format (now `YYYY-MM-DD`, this project's standard).

- **Decision:** Should every step re-state its data model inline, or is citing the brainstorm doc + this plan's now-pinned schemas sufficient?
  - **Flagged by:** both reviewers (sonnet-reviewer: "each dependent step's author has to go re-discover the actual name"; haiku-reviewer: "defeats the execute step by step in order instruction")
  - **Recommendation:** Sufficient now that Steps 1/3/7/9/10 pin their own schemas/rules directly (done above) — a step that CONSUMES a pinned value (e.g. Step 5 reading Step 3's trigger classification) still cites the producing step by number, which is fine once the producing step itself is unambiguous.
  - **Why:** Re-stating full context on every single step would make the plan unreadably long; the fix is pinning ambiguous VALUES at their point of definition, not repeating them everywhere they're used.

- **Decision:** What's the confidence/ambiguity threshold for Step 3's classifier when a CSS shape could plausibly match more than one preset?
  - **Flagged by:** sonnet-reviewer ("confidence bar is never defined")
  - **Recommendation:** Zero or 2+ equally-good matches under the now-pinned matching rule (exact property+direction, ±20% duration, exact easing keyword) → no match, fall through. No fuzzy scoring beyond that rule — this keeps Tier 1 provably bounded to Tier V (QA Gate at Step 4 depends on this being a hard rule, not a tunable score).
  - **Why:** A scored/fuzzy confidence system is exactly the kind of thing this project's "don't force a bad fit" discipline (visible in Tier 4c's own design) warns against — a binary rule is auditable, a score is not.

- **Decision:** Where do the Step 3/9 test fixtures come from — invented by the same agent whose code they test?
  - **Flagged by:** sonnet-reviewer ("the test is self-graded by whoever writes the code being tested")
  - **Recommendation:** Acceptable for these specific steps' unit-level fixtures (they're testing a mechanical shape-match, not a judgement call), PROVIDED Step 6's checkpoint (real sites, not invented fixtures) is what actually gates progression to Tier 3/4a — which it already is. Self-authored unit fixtures are a sanity check before the real measurement, not a substitute for it.
  - **Why:** Step 6 is deliberately designed as the objective, non-self-graded checkpoint; the unit fixtures earlier in the chain exist to catch obvious breakage cheaply, not to prove real-world coverage.
