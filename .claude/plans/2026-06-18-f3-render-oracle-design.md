---
doc_type: spec
project: small-giants-wp
thread: cloning-pipeline
title: "Phase F step F3 — differential render-oracle + metamorphic relations"
created: 2026-06-18
status: DESIGN v1 — pending /adversarial-council then Bean design-gate
spec_ref: specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md §12.2.2 (WRITTEN vs LANDED) + §12.2.3 (render-oracle + metamorphic) + §7b (false-win guards) + §12.7 (row F3)
depends_on: F1 (fixture corpus, done) + F2 (declare_input ledger, done, commit f8a746c7)
binding_rules: R-22-11 (verify rendered output not internal metrics), R-22-13 (Bean's eye co-authoritative), STOP-4 (WRITTEN ≠ LANDED), STOP-10 (empty-section false-win), R-22-1 (reuse DB/infra, don't duplicate)
reuses: orchestrator/visual_qa_capture.py (Playwright capture + _pixel_diff) + parity2/ (draft-centric computed-style transfer check)
---

# F3 — differential render-oracle + metamorphic relations

## 0. Plain English (what this is, why it exists)

**What.** The oracle that proves what the converter *wrote* actually *landed* — that a cloned section, rendered live, matches the draft. F2 caught whole declarations silently dropped; F3 catches the subtler failure: a value that was emitted to an attribute but renders WRONG (wrong layer, wrong tier, overridden by a default) — "WRITTEN but not LANDED" (STOP-4). It is the **closing gate** of the rebuild: a stage is only "done" when its declarations are LANDED, not merely WRITTEN.

**Why.** Emit-green, conformance-green, "the mechanism fires", aggregate parity % — all are progress signals, never closing gates (R-22-11 / §7b). The only truth is: render the clone live and compare its computed style + painted pixels to the draft. The draft is its own exact, non-circular oracle (render the draft too; diff the two renders).

**Why a separate oracle from F2.** F2 is a static parse (no rendering). F3 is dynamic (live DOM + pixels). Together: F2 guarantees no whole declaration is dropped; F3 guarantees every transferred declaration lands correctly. The two compose to the full no-silent-drop + no-wrong-transfer spine.

## 1. Scope — what F3 IS and is NOT (Bean-locked decisions)

**F3 IS:**
- A **per-section LANDED/not verdict** for a cloned fixture: computed-style equals draft AND pixel-diff within threshold, **gated by the three §7b false-win guards first**.
- **Full coverage (Bean-locked 2026-06-18): all 37 fixtures** get the canary render-diff + computed-style LANDED check, plus page-8 live.
- A **content-hash cache** so a fixture only re-renders when its converted output changed — full coverage without re-rendering all 37 on every rebuild-stage run.
- The **3 metamorphic relations** (§12.2.3) as a local converter-output harness (no rendering): source-order permutation, BEM-synonym rename, px-scaling-by-k.
- **Armed against the LEGACY converter** to capture today's baseline (per §12.6 step 1) — so any rebuild step is provably non-regressing.

**F3 IS NOT:**
- A new renderer or a new pixel-diff — it **reuses** `visual_qa_capture.py` (Playwright capture + `_pixel_diff`, per-section cropped, at 375/768/1440) and `parity2/` (draft-centric computed-style transfer check). Building a parallel renderer would repeat the F2 mistake (R-22-1 / don't-duplicate).
- The UNACCOUNTED gate (that joins F2's ledger to converter fate) — that is **F5**. F3 produces the LANDED signal F5 consumes for the WRITTEN-vs-LANDED half.
- The cheat-detection gates / coverage-matrix generator — **F5**.

**Canary-only (Bean-locked, prior session):** SGS blocks are server-rendered PHP + theme CSS, so a clone can only render inside WordPress → the render side runs on the canary (`WP_URL_SANDYBROWN`, creds `.claude/secrets/sandybrown.env`). The draft side renders locally (the fixture HTML served on a local port — `visual_qa_capture` already does this).

## 2. Reuse map (what exists → what F3 adds)

| Need | Existing infra (reuse) | F3 addition |
|------|------------------------|-------------|
| Render a page at 375/768/1440, per-section cropped | `visual_qa_capture._run_playwright_capture` (selector-crop + viewport) | call it for BOTH draft (local) and clone (canary) |
| Pixel-diff two renders → diff_ratio | `visual_qa_capture._pixel_diff` (PIL, crop to MIN, ratio) | per-section diff draft-render vs clone-render |
| Draft-centric computed-style transfer per node | `parity2/` (draft_denominator + fate_classifier + transfer_checker) | use as the LANDED computed-style comparator; add the non-default-value guard |
| Convert a fixture → blocks → deploy to a canary page | `sgs-clone-orchestrator.py` + `upload_and_patch.py` (Stage 10 REST patch) | a batch harness that does this per fixture into a dedicated canary test page set |
| Empty-section guard | **NONE today** (routing map VQC-EMPTY: unguarded false-win) | **F3 builds it** — §3 guard 1 |

## 3. The three false-win guards (§7b — fire BEFORE any match counts)

A "match" is only counted after ALL three pass; a guard failure is a **FAIL**, never a match (STOP-10):
1. **Empty-section guard** — `el.innerText.length > 0` AND the element is present in the live DOM. An empty/soft-failed section paints the background and trivially "matches" a pixel-diff → that is a FAIL, not a pass. (The known false-win the current Stage-8 gate does NOT guard.)
2. **Element-present guard** — the section's expected block element exists in the rendered clone (not just "the page loaded"). Missing element = FAIL.
3. **Non-default-value guard** — the draft value for the cell being checked **differs from the block's wrapper default**; if the draft value equals the default, a "match" proves nothing (the transfer was never exercised) → the cell is `UNVERIFIED`, not `LANDED`. (The fixtures are authored non-default per F1's contract, but the guard is enforced structurally, not assumed.)

## 4. The LANDED verdict (per section, per cell)

For each draft section/cell, after the guards pass:
- **LANDED** — live computed-style of the rendered clone equals the draft value (within ΔE≤1 for colour / ≤1px for length — the existing token-snap tolerance) AND the per-section pixel-diff ≤ threshold (reuse the Stage-8 band; ≤1% per §11/Stage-8).
- **WRITTEN-not-LANDED** — the attr was emitted (F2/converter says transferred) but the rendered computed-style ≠ draft (wrong layer / wrong tier / overridden). This is a **hard-fail signal** at the same severity as UNACCOUNTED (STOP-4) — it is the max-width→contentWidth-class bug, caught in the oracle not the eye.
- **UNVERIFIED** — guard 3 failed (draft == default) or the fixture didn't exercise the cell.
- **NOT-RENDERED** — the clone failed to render (deploy/render error) — FAIL, never silently a pass.

F3 emits a per-fixture, per-section verdict artefact (`_render-oracle/<fixture>.landed.json`) consumed by F5.

## 5. The metamorphic relations (§12.2.3 — local, converter-output, no rendering)

A separate harness running the converter on transformed inputs and diffing OUTPUT (not rendering). These prove properties no single render can:
- **MR-1 source-order permutation** — permute the order of non-conflicting CSS rules in a fixture → the converter's emitted block markup must be IDENTICAL. (Catches order-dependence / first-wins-vs-last-wins drift.)
- **MR-2 BEM-synonym rename** — rename a fixture's BEM class to a `slots.aliases` synonym → emitted markup must be IDENTICAL. **This is the direct test of name-free routing** (R-22-2) — the single most important metamorphic relation for this pipeline.
- **MR-3 px-scaling by k** — multiply every px length in a fixture by a constant k → every transferred numeric value in the output must scale by exactly k. (Catches unit/parse drift, truncation, hardcoded constants.)
Each MR is a parametrised test over the fixture corpus. **Armed against the legacy converter now** — failures are expected and become the documented baseline (the legacy converter is NOT name-free-clean); each rebuild stage must not worsen them and must drive them to green for the declarations it owns.

## 6. Canary render mechanics + the content-hash cache (Bean's full-37, made affordable)

- **Per fixture:** convert the fixture draft → SGS blocks (legacy converter at baseline; the rebuilt converter during the rebuild) → deploy to a dedicated canary test page (a page-per-fixture set under a known slug prefix, OR one reusable page patched sequentially — council to weigh; page-per-fixture parallelises, sequential is simpler/cheaper on the canary) → Playwright-render at 375/768/1440, per-section cropped.
- **Content-hash cache:** key each fixture's render artefact by `sha(converted_block_markup + theme_snapshot_version + viewport)`. If the hash is unchanged since the last run, skip the convert+deploy+render and reuse the cached render + verdict. So a rebuild stage that only changes stage-4 logic re-renders only the fixtures whose output changed. This is what makes "full 37" affordable across the many repeated runs F3 will do.
- **Draft side:** rendered locally (fixture HTML on a local port) — cheap, cached by fixture-file hash.
- **Determinism / flake control:** `waitUntil:networkidle` + settle delay (already in `visual_qa_capture`); a render that errors or times out = NOT-RENDERED (FAIL), never silently skipped or counted as a match.

## 7. Acceptance criteria (done-when — §12.7 F3)

1. The oracle runs on a fixture and returns a per-section LANDED / WRITTEN-not-LANDED / UNVERIFIED / NOT-RENDERED verdict (the §12.7 done-when).
2. The three false-win guards each have a test proving they FAIL the right way (an empty section → FAIL not match; a default-equal value → UNVERIFIED not LANDED; a missing element → FAIL).
3. The 3 metamorphic relations run as parametrised tests over the corpus; the legacy-converter baseline (pass/fail per fixture per relation) is captured + committed.
4. Full-37 render-diff runs on the canary with the content-hash cache; a second run with no converter change is a cache hit (no re-render) — proven by a test/log.
5. Reuse verified: F3 imports/calls `visual_qa_capture` + `parity2`, does not reimplement pixel-diff or computed-style capture (grep/structure check).
6. The render-diff + LANDED verdict are wired so F5 can consume the WRITTEN-vs-LANDED signal (the §9-style contract, frozen here in §8).

## 8. The F3→F5 contract (frozen here)

- F3 emits per-fixture `_render-oracle/<fixture>.landed.json`: `{fixture, sections:[{section_id, block_slug, guards:{empty,element,non_default}, cells:[{selector, property, tier, draft_value, computed_value, pixel_diff_by_vp, verdict}]}]}`.
- F5 joins this to F2's `declare_input` + the converter's `declare_fate` on `(selector, property, media/tier)` (the F2↔F5 key): a cell that is `transferred` in fate but `WRITTEN-not-LANDED` in F3 is a hard fail; a cell `LANDED` confirms the transfer.
- `UNVERIFIED`/`NOT-RENDERED` are NOT counted as LANDED and NOT counted as fails-of-transfer — they are coverage gaps F5 reports explicitly (never silently green).

## 9. Risks for the council to red-team

- **R1 — canary as a shared, stateful, flaky dependency.** 37 deploy/render cycles against one live WP site: ordering, caching (Hostinger CDN 7-day — STOP/deploy-asset rule), OPcache, concurrent-session collisions, render flake. Does the cache key cover theme/CDN version? Is a flaky render distinguishable from a real NOT-RENDERED fail?
- **R2 — computed-style equality is not pixel equality.** parity2's computed-style check can pass while the painted pixels differ (the measurement-vs-eye rule — backgroundImage/filter/pseudo over a correct backgroundColor). Does F3's LANDED require BOTH computed-style AND pixel-diff, and is the pixel-diff's per-section crop robust (the empty-section false-win + the crop-to-MIN distortion)?
- **R3 — parity2's known BEM-class blind spot** (memory `parity-bem-class-blind-spot-for-converted-output`): it pairs by draft BEM class, which native SGS output doesn't carry → false "missing". Does reusing parity2 for LANDED inherit this false-negative? Must F3 pair by rendered SGS block + targeted getComputedStyle probe instead?
- **R4 — metamorphic MR-2 (BEM-synonym) needs the slots.aliases data to be correct + complete.** If aliases are missing, MR-2 silently under-tests name-free routing. Is the alias set ground-truthed?
- **R5 — the content-hash cache can mask a real change.** If the hash misses an input (theme change, a CSS-var resolution, a converter-version bump), a stale cached "LANDED" is served for output that actually changed → a false pass. What must the hash cover, and how is a cache poisoning detected?
- **R6 — "armed against legacy" baseline interpretation.** The legacy converter will FAIL many cells/MRs. How does F3 distinguish "expected legacy baseline failure" from "a new regression introduced by a rebuild stage" without the baseline becoming a rubber-stamp that hides new failures (the F2 golden-regen problem)?
- **R7 — full-37 wall-time even with caching.** First run (cold cache) renders all 37 × 3 viewports on one canary. Is that wall-time acceptable, and can it parallelise safely without canary collisions?
