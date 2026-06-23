---
doc_type: spec
project: small-giants-wp
thread: cloning-pipeline
title: "Phase F step F3 — LANDED oracle (F3-core) + deferred F3-runtime"
created: 2026-06-18
updated: 2026-06-18
version: v2 (adversarial-council-corrected — re-scoped to F3-core; render-mechanism fixed)
status: DESIGN v2 — Bean-approved re-scope (2026-06-18); F3-core to build in a fresh session
spec_ref: specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md §12.2.2 (WRITTEN vs LANDED) + §12.2.3 (render-oracle + metamorphic) + §7b (false-win guards) + §12.7 (row F3)
depends_on: F1 (fixtures, done) + F2 (declare_input ledger, done, f8a746c7)
council: adversarial-council 2026-06-18 (6 personas) — synthesis + Bean-filtered verdicts in §11
binding_rules: R-22-11, R-22-13, STOP-4 (WRITTEN≠LANDED), STOP-10 (empty-section false-win), R-22-1 (reuse not duplicate), parity-bem-class-blind-spot, measurement-vs-eye
reuses: orchestrator/visual_qa_capture.py (Playwright capture + _pixel_diff helpers) + parity2/ (TOLERANCE/normalisation helpers ONLY — NOT its BEM-class matcher)
---

# F3 — LANDED oracle (F3-core) + deferred F3-runtime

## 0. Plain English (what this is, why it exists)

**What.** The oracle that proves what the converter *wrote* actually *landed* — that a cloned section, rendered live in WordPress, matches the draft's intended CSS. F2 caught whole declarations silently dropped; F3 catches the subtler failure: a value emitted to an attribute but rendering WRONG (wrong layer/tier/overridden) — "WRITTEN but not LANDED" (STOP-4).

**Why the re-scope (Bean-approved 2026-06-18, after the council).** The original design pixel-diffed a *locally-rendered bare draft* against a *WordPress-rendered clone* — apples-to-oranges (the draft has no theme CSS/fonts/WP resets, so even a perfect transfer fails the pixel-diff on chrome). That made the pixel-diff a ~100% false-fail gate. **Corrected primary mechanism: computed-style comparison of the specific transferred properties on the rendered SGS block** (environment-comparable), with pixel-diff demoted to a deferred secondary signal. And the original scope (full-37 + content-hash cache + canary deploy-orchestration) was a 6-10hr multi-subsystem project for a step whose done-when is "oracle runs on ONE fixture, returns a per-section verdict" — so it splits into **F3-core** (build now) and **F3-runtime** (deferred).

## 1. F3-core — what builds now (the §12.7 done-when)

The verdict ENGINE proven on one fixture, emitting the frozen F3→F5 contract:
1. A **verdict function**: input = one fixture's draft + its rendered clone (on the canary); output = per-section, per-cell verdict via the §6 contract.
2. **Primary LANDED signal = targeted computed-style** — for each draft cell `(rendered-block, property, tier)`, locate the rendered SGS block element (by block slug → `.wp-block-sgs-<slug>` / the block's `block.json` `selectors`, **NOT** the draft BEM class — parity2's blind spot) and read `getComputedStyle` on it; compare to the draft's intended value within tolerance (ΔE76 ≤1 colour / ≤1px length — reuse `parity2`'s `_colour_delta`/`_parse_px` helpers, cite file:line).
3. The **four false-win guards** (§2), each with a test proving it fails the right way.
4. **MR-2** (BEM-synonym → identical converter output) as one parametrised relation — the direct name-free-routing proof.
5. Emit the per-fixture `_render-oracle/<fixture>.landed.json` (§6) for one real fixture end-to-end.

**Reuse (R-22-1):** `visual_qa_capture` for Playwright capture/launch; `parity2`'s tolerance/normalisation helpers ONLY. Build no new renderer, no new colour-delta.

## 2. The false-win guards (§7b + council 4th guard) — fire BEFORE any match counts

A match counts only after ALL pass; a guard failure is a FAIL, never a match (STOP-10):
1. **Empty-section guard** — `el.innerText.length > 0` AND the element is present.
2. **Element-present guard** — the section's expected block element exists in the rendered clone. Selector = `block_attributes.derived_selector` for the block's wrapper, else `.wp-block-sgs-<slug>`. `querySelector(selector) !== null`.
3. **Non-default-value guard** — the draft value differs from the block's default, sourced from **`block.json` `attributes.<attr>.default`** (via `wp-blocks.py dump`), NOT the converter DB (preserves independence). If draft == default → `UNVERIFIED`, never LANDED.
4. **Height-parity guard (NEW, council)** — the clone section's rendered height matches the draft section's within tolerance; a material height divergence is a FAIL regardless of any per-property match (catches the truncated-section / dropped-element case that the empty-section guard misses and that crop-to-MIN would hide).

## 3. Verdict taxonomy — exhaustive + mutually exclusive (council Defect 5)

Per cell, by this precedence (first match wins): `NOT-RENDERED > GUARD-FAIL > UNVERIFIED > WRITTEN-not-LANDED > LANDED`.
- **NOT-RENDERED** — the clone failed to render / the page didn't load. FAIL (in F3-runtime: split into infra-flake vs content-fail; in F3-core, a single NOT-RENDERED on the one fixture).
- **GUARD-FAIL** — guard 1/2/4 fired (empty / missing element / height divergence). FAIL.
- **UNVERIFIED** — guard 3 fired (draft == default) or the cell wasn't exercised. NOT a pass, NOT a transfer-fail — a coverage gap F5 reports.
- **WRITTEN-not-LANDED** — the attr was emitted (converter says transferred) but rendered computed-style ≠ draft. **Hard fail at the severity of a silent drop (STOP-4).** Also the verdict when computed-style matches but the (deferred) pixel-diff fails — visible incorrectness overrides an attr that "looks right".
- **LANDED** — computed-style equals draft (within tolerance), all guards passed. The only "done". (In F3-runtime, LANDED additionally requires the pixel-diff secondary to pass.)

**Section identity (council Defect 1):** each draft fixture section root carries a `data-f3-section-id` attribute (F1 fixture-format addition); the clone's section is resolved via the converter's draft-section→emitted-block-slug map (not BEM re-derivation). A draft section with no clone equivalent → that section's cells are NOT-RENDERED, no positional shift.

## 4. MR-2 (name-free routing) — F3-core; MR-1/MR-3 → F3-runtime

- **MR-2 (build now):** rename a fixture's BEM class to a `slots.aliases` synonym (within the SAME slot — assert `slots_1.standalone_block == slots_2.standalone_block` first) → emitted markup must be JSON-semantically identical AND equal the known-correct golden (invariance AND correctness). Emit an MR-2 coverage line: "covered N of M slot roles; roles with no alias = MR-2-UNCOVERED" (no silent under-test).
- **MR-1 (source-order permutation) + MR-3 (px-scale-by-k) → F3-runtime.** MR-3 must be re-scoped when built: applies ONLY to raw-px values that stay raw-px (exclude %/em/calc/unitless/0/token-snapped; token-snapped values re-snap after scaling — monotonicity, not exact scale); never scale a `@media` breakpoint threshold (changes meaning, not value — device-tier-vs-visual rule).

## 5. DEFERRED — F3-runtime (build lazily when the rebuild first renders many fixtures)

Recorded so it is not lost; explicitly NOT in F3-core's done-gate:
- **Full-37 canary render-diff** + the page-per-fixture provisioning (slug prefix `f3-oracle-<fixture>`, no reused page — avoids cross-fixture CDN/OPcache contamination) + controlled concurrency.
- **Content-hash cache** — and when built, the key MUST cover: emitted markup + theme-snapshot version + deployed block.json versions (CDN `?ver`) + consumed render.php/style.css hashes + wrapper PHP hash + converter git-sha + viewport + fixture-file hash. Plus a served-`?ver` validation on cache-hit + a `--force-refresh`. (A stale cache = a false LANDED = the worst failure here; that danger is why it's deferred, not built under time pressure.)
- **Pixel-diff secondary signal** — with the apples-to-apples fix (render the draft inside the same WP/theme environment, OR gate on delta-over-a-known-difference-baseline, never an absolute ≤1%) + numpy `_pixel_diff` (the pure-Python loop is the wall-time) + browser-reuse + `deviceScaleFactor:1` + `document.fonts.ready` + disable-animations + admin-bar-hidden (anonymous render) + per-section `boundingBox` crop (not crop-to-MIN).
- **Flake classification** — NOT-RENDERED:infra (retry, bounded) vs NOT-RENDERED:content (hard fail); a canary health pre-gate (sentinel render) so "the canary lied" is a distinct verdict.
- **Deploy choreography** — OPcache reset (HTTP) + LiteSpeed purge + block.json version bump before each render; assert the page `modified` timestamp advanced + served `?ver` matches deployed before capturing.
- **Committed per-cell baseline** (the F2-golden-regen defence) — `_render-oracle/baseline/<fixture>.landed.json` committed at a fixed legacy commit; gate on `new_failures = current − baseline` only; baseline changes need an explicit reviewed diff (no auto-regen); each baseline failure tagged with its owning §12.7 rebuild stage (expires when that stage ships).
- **Wiring** — F3-runtime is a named per-stage-completion run (NOT prebuild/commit-hook — a 15-25min canary run can't gate every commit); F3-core's MR-2 + verdict-function unit tests CAN go in prebuild.

## 6. The F3→F5 contract (frozen)

Per-fixture `_render-oracle/<fixture>.landed.json`:
`{fixture, generated_by:{module,version}, sections:[{section_id, block_slug, guards:{empty,element,height,non_default}, element_selector, cells:[{property, tier, draft_value, computed_value, expected_default, verdict}]}]}`.
- **F5 join key = `(section_id, block_slug, property, tier)`.** `tier` uses F2's vocabulary exactly: `Base|Mobile|Tablet|Desktop|Other:<verbatim-condition>` (so the F2↔F3↔F5 keys line up; non-device breakpoints carry the raw condition both sides).
- A cell `transferred` in F2/fate but `WRITTEN-not-LANDED` in F3 = hard fail. `LANDED` confirms. `UNVERIFIED`/`NOT-RENDERED`/`GUARD-FAIL` are reported explicitly, never silently counted as LANDED.
- Plain-English summary alongside the JSON (MF-5 / non-coder QC): e.g. "Section 3 (hero) FAIL: background-color written #2D6A4F but rendered #3A7A5F (not landed). Section 7 (trust-bar) OK."

## 7. Acceptance criteria (F3-core done-when — §12.7 F3)

1. The verdict function runs on ONE real fixture (cloned + rendered on the canary) and returns a per-section/per-cell verdict in the §6 schema.
2. The four guards each have a test proving they FAIL correctly (empty → GUARD-FAIL; default-equal → UNVERIFIED; missing element → GUARD-FAIL; height divergence → GUARD-FAIL).
3. The verdict taxonomy precedence (§3) is implemented + tested (incl. the computed-pass/pixel-N/A case).
4. MR-2 runs as a parametrised relation with a coverage line; legacy baseline for MR-2 captured for the corpus.
5. Reuse verified: F3 calls `visual_qa_capture` for capture + `parity2`'s tolerance helpers ONLY; the LANDED probe uses targeted `getComputedStyle` on the rendered block, NOT parity2's BEM-class matcher (grep/structure test).
6. Independence: guard-3 default comes from `block.json`, not the converter DB.
7. F3-core's unit tests wired into `package.json prebuild`; the live-canary run is a separate named command (F3-runtime arms it for many fixtures later).

## 8-10. (architecture context unchanged — see §1-§6)

## 11. Council synthesis (2026-06-18, 6 personas) — Bean-filtered verdicts

Grades: oracle-correctness C+, cynic C+, spec-lawyer D+, ship-PM C+, maintenance-realist D+, infra-flake-redteam D.
- **ACCEPTED (fatal/convergent):** apples-to-oranges render → computed-style primary (6/6); parity2-pairing wrong for LANDED → targeted getComputedStyle (5/6); cache premature+poisons → DEFER (6/6); full-37+orchestration over-scoped → F3-core/F3-runtime split (5/6, Bean-approved re-scope); baseline rubber-stamp → committed per-cell diff (6/6); flake-classify (defer with render); spec-precision holes — section_id, verdict taxonomy, guard-3-from-block.json, F3→F5 join key (3/6); 4th height-parity guard (2/6); MR-3 unsound → re-scope when built; MR-2 coverage+correctness.
- **DEFERRED not rejected:** canary health-gate / session-lock / OPcache+LiteSpeed+CDN purge choreography — all real, but belong to F3-runtime (no canary plumbing for a step that shouldn't render 37 yet).
- **Reversal recorded:** Bean's earlier "full render-diff on all 37" is superseded by the F3-core/F3-runtime split, on the new information that the render comparison was broken as designed and full-37+cache is premature.
