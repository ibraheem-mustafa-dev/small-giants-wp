---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Converter root-cause report + the primary-source methodology (scripts + DB first, docs second)"
created: 2026-06-07
status: REFERENCE — root causes found + fixed this session (commits e7f28b0f, ea9897e7, ec1fb1ab, cc978252); deferred items listed at the end
evidence:
  - "extract.json (emitted markup) + convert-trace-b*.jsonl + parity2-report-*.json across runs 174303 / 191324 / 200341 / 202423 / 204913 / 212027"
  - "property_suffixes + block_attributes + block_composition tables in sgs-framework.db"
  - "live-DOM (Playwright) on canary page 8"
supersedes_framing_in:
  - ".claude/reports/2026-06-05-clone-fix-spec-9-roots.md (R1-R9 — partially correct; built off parity2 css_dropped which we now know was contaminated)"
  - ".claude/reports/2026-06-06-container-architecture-rootcause-and-proposal.md (P1-P4 — the 'partial application' thesis is correct; P4 cascade was the real lever)"
---

# Converter root-cause report + the primary-source methodology

## 0. The one-paragraph version

For weeks the cloning fidelity work was driven by **downstream interpretations** — adversarial councils, verification agents, and the `parity2` `css_dropped` lists — and it kept circling the same framing ("missing block attributes / 4 axes of partial application"). When we instead read the **two actual sources of truth — the pipeline scripts (`convert.py` / `db_lookup.py`) and the DB tables they consume (`property_suffixes`, `block_attributes`) — and only then checked them against the spec + cloning-pipeline docs**, the real problem surfaced in minutes: the converter was **emitting wrong CSS values** (e.g. a testimonial's `font-size:14px` came out `17px`) because of a **broken CSS cascade and selector matcher**, and the gauge we were trusting (`parity2`) was **mis-pairing nodes** so those wrong values were invisible. The dominant problem was **value corruption + an unreliable measurement instrument**, not missing attributes.

---

## 1. The methodology — what actually works

**There are exactly two sources of truth for what the pipeline does and where it fails:**

1. **The pipeline scripts** — `convert.py`, `db_lookup.py`, `sgs-clone-orchestrator.py`, the `parity2/` matcher. The converter is a deterministic program; its behaviour is fully determined by this code.
2. **The DB tables it reads** — `property_suffixes` (CSS-property → attribute-suffix map), `block_attributes` (which attrs each block actually has), `block_composition`, `block_supports`. These are the data the program runs on.

**Everything else is downstream interpretation, and was actively misleading:**

| Instrument | Why it misled |
|---|---|
| Adversarial / qc councils | Personas *reasoned about* the code and converged on "missing attrs / partial coverage" — a plausible-but-wrong frame, because they didn't diff the **emitted values** against the **draft values**. |
| Verification agents | Read the code but trusted `parity2`'s `css_dropped` lists, inheriting their contamination. |
| `parity2` `css_dropped` | The matcher mis-paired draft nodes to wrong clone nodes (a testimonial `<p>` to a `<footer>`), so the "dropped CSS" it reported was a *different node's* CSS. Decisions built on these lists chased phantoms. |
| Prior root-cause reports | Correctly identified some real issues (the "partial application" thesis, the cascade bug as P4) but the recommended fixes were partly aimed at the contaminated `css_dropped` framing. |

**The procedure that found the truth (and the order matters):**

1. **Read the script.** Open the actual function that does the work (`_collect_css_decls_for_element`, `_lift_root_supports_to_style`, `_lift_wrapper_css_to_container_attrs`). Trace the exact branch + condition.
2. **Read the DB.** Dump the actual rows (`property_suffixes` — 117 rows; `block_attributes` for the inner blocks). Don't assume coverage — count it.
3. **Diff the EMIT against the DRAFT directly** — `extract.json` (what the converter produced) vs the mockup CSS (what it should be). Bypass `parity2` entirely for this. This is what exposed `14px → 17px`.
4. **Only THEN check the spec + pipeline docs** — does the code align with `Spec 22 §FR-22-21` / `§FR-22-5` and `cloning-pipeline-flow.md`? Classify each gap as **implementation bug** vs **spec gap** vs **doc drift**.

**Rule of thumb captured this session:** *if a measurement instrument (parity2, pixel-diff, a council verdict) disagrees with the raw emitted output, trust the emit and fix the instrument.* The emit + the draft are ground truth; every scoring layer on top can be wrong.

---

## 2. Root issues — each cited to the source, not to a verdict

### A. Value-corruption bugs (the dominant, previously-invisible class)

These corrupted the *values* the converter emitted. They were invisible in `parity2`'s `css_dropped` (which lists *missing* props, not *wrong* ones) and only surfaced by reading `extract.json` against the draft.

| # | Root cause (from the script) | Evidence | Fix | Commit |
|---|---|---|---|---|
| A1 | **CSS cascade was first-wins, ignoring specificity.** `_collect_css_decls_for_element._merge_into` used `if p not in target` — the *earliest* rule in source order won, regardless of specificity. So a generic `blockquote p {font-size:17px}` (early in the sheet) beat the more-specific `.sgs-testimonial__text {font-size:14px}` (later). | `convert.py:558-561` (the merge); `extract.json` testimonial emitted `fontSize:17` vs draft `14px`; both testimonials emitted identical wrong `17/1.75/16`. | Specificity-aware cascade: rules sorted by `(specificity, source-order)`, **last-wins**, inline style highest. | `e7f28b0f` |
| A2 | **Selector matcher skipped tag-ancestor checks.** For `.class tag` it verified the class ancestor; for `tag tag` (`blockquote p`) the `parent_token.startswith(".")` branch was false, so the ancestor check was *skipped* and the rule matched **every `<p>` on the page**. | `convert.py:596-612` (the `elif last_part == desc_tag` branch); the testimonial `<p>` (no `<blockquote>` ancestor) wrongly matched `blockquote p`. | Tag-ancestor selectors now require a real matching ancestor in the DOM. | `e7f28b0f` |
| A3 | **Token-snapping rewrote literal values to the nearest theme token**, destroying the draft's real values. | `_snap_style_dict_leaves` → `token_resolver.snap_style_dict`; Bean flagged "that snapping sounds stupid". | Disabled (values preserved; bespoke values should become new tokens in the client variation, not be snapped — memory `cloning_preserves_intentional_bespoke_detail`). | `e7f28b0f` |
| A4 | **Responsive attr-name casing bug.** The responsive lift built the per-device attr name as `"".join(p.capitalize() …)` → `PaddingTopTablet` (PascalCase), but block attrs are `paddingTopTablet` (camelCase). Every responsive box value dropped as `no_schema_attr`. | `convert.py:784` + the run trace's `responsive_attr_dropped candidate="PaddingTopTablet"`; `responsive_attr_lifted` count = 0. | Lower-case the first char of the derived attr name; same for the shorthand path. | `e7f28b0f` |

### B. Coverage / plumbing gaps (real, but smaller than the value-corruption class)

| # | Root cause | Evidence | Fix | Commit |
|---|---|---|---|---|
| B1 | **The DB-driven lift ran only for container-mirror composites**, not every resolved block. Inner blocks got the hardcoded 15-rule `_root_lift_rules` (which omits min-height/max-width/box-shadow/typography). | `convert.py:2835` gate `if _is_container_mirror_block(slug)`. | Hoisted the universal `_lift_wrapper_css_to_container_attrs` call to run for **every** resolved block. | `e7f28b0f` |
| B2 | **Folded composite content-columns discarded their own CSS.** `_route_composite_interior`'s `content_column_folded` branch walked grandchildren without lifting the wrapper's CSS — the one of four fold paths with no lift edge. | `convert.py:2517-2526`; hero `__content` padding evaporated. | Call `_fold_layout_into_attrs` before walking grandchildren (matches the other 3 fold paths). | `e7f28b0f` |
| B3 | **The flex/grid alignment family had no map row.** `property_suffixes` (117 rows) had `gap` but **no** `display/align-items/justify-content/justify-items/align-content/flex-direction/flex-wrap`. | DB dump of `property_suffixes` distinct `css_property` values (57); the 7 flex props absent. | Added them, mapped to existing/added container attrs (display→layout, align-items→verticalAlign, justify-content→justifyContent, …). | `ec1fb1ab` (+ `e7f28b0f` for the first four via migration) |
| B4 | **The container lacked the receiving attrs** for the flex family + responsive padding/margin. `sgs/container` had `gapTablet`/`minHeightTablet` but no `paddingTopTablet`, `justifyContent`, `flexDirection`, `flexWrap`. | `block_attributes` dump for `sgs/container`. | Added the attrs + their `@media` render in the shared wrapper helper + propagated to section mirrors. | `e7f28b0f` (responsive padding) + `ec1fb1ab` (flex) |
| B5 | **Hardcoded CSS→attr maps (R-22-1 violation).** `_TYPOGRAPHY_CSS_TO_ATTRS` re-encoded a mapping the DB's `property_suffixes.css_property` column already holds. | The hardcoded list in `convert.py`; the DB column it duplicated. | `typography_css_to_attrs()` now derives the mapping from the DB; only a 2-entry colour-disambiguation table + a lift-scope roster remain. `_root_lift_rules` (WP-core `style.*` paths) + `_BREAKPOINT_RULES` (W3C thresholds) kept + documented as legitimate platform-schema constants. | `cc978252` |

### C. The measurement instrument was itself broken (`parity2`)

This is the meta-finding: **we couldn't see the gains because the gauge was wrong.**

| # | Root cause | Evidence | Fix | Commit |
|---|---|---|---|---|
| C1 | **The matcher anchored draft↔clone leaves on EXACT normalised ownText, but normalisation only lowercased + collapsed whitespace.** The live render mangled the draft's curly quotes to the U+FFFD replacement char (`�`), and straight-vs-curly quotes / apostrophes / em-dashes differ — so any punctuated text failed to match and fell through to a wrong structural node (testimonial text → a `<footer>`). | `parity2/transfer_checker.py:108` (`_normalise_text`); `parity2-captures.json` showed clone text as `�I was sceptical…`. | Normalisation now strips all non-word characters, so `"I was sceptical…"` and `�I was sceptical…` match. Content-transfer matching rose **90.7% → 96.3%** on the same captures. | `ea9897e7` |
| C2 | **No containment fallback** for sections the converter restructures (static testimonials → a slider): the text leaf's `ownText` is empty (text lives in container `text`), so the matcher can't anchor it at all. | `parity2-captures.json`: the `sceptical` text appears only in slider container nodes with empty `ownText`. | **DEFERRED** — needs a containment fallback (draft ownText ⊆ a clone node's `text`, same section). | — |

### D. Tooling / operability bugs (blocked the work, not the fidelity)

| # | Root cause | Evidence | Fix | Commit |
|---|---|---|---|---|
| D1 | **`/sgs-update` crashed on cp1252 bytes.** `subprocess.run` calls used strict utf-8 decoding with no `errors=`, so a sub-script printing a cp1252 em-dash (`0x97`) raised `UnicodeDecodeError` in a reader thread. | The traceback in the run log (`subprocess.py _readerthread`). | All `subprocess.run` calls now decode with `errors="replace"`. | `e7f28b0f` |
| D2 | **The autonomy gate rolled back every deploy** — it defaulted to rollback when the visual-QA capture stubbed out (`decision=None`), so a `--mode draft` verification clone reverted and was un-inspectable. | `[autonomy] outcome=rolled-back merge=rolled-back decision=None`. | `--mode draft` auto-skips the gate (verification runs stay inspectable); `--mode strict` still enforces it; `--enforce-autonomy-gate` overrides. | `e7f28b0f` |

---

## 3. Alignment with the spec + cloning-pipeline docs

After fixing from the source, we checked each finding against the docs. The pattern matches D178's "good docs + undelivered/mis-wired code" — **the specs were largely right; the code didn't deliver them, and one prior report's fix-framing was contaminated by the broken gauge.**

| Doc | Finding |
|---|---|
| `Spec 22 §FR-22-21` (universal wrapper-conversion) | Correctly mandates faithful CSS transfer. The **cascade/selector bugs (A1/A2) are a layer BELOW FR-22-21** — they corrupt the CSS values *before* the lift sees them, which the spec assumes are correct. Not a spec gap; an implementation bug in `_collect_css_decls_for_element`. |
| `Spec 22 §FR-22-5` (CSS four-destination routing) | The D1 typed-attr lift is described correctly; the casing bug (A4) + the container-mirror-only gate (B1) were impl gaps against it. |
| `Spec 22 R-22-1` (DB-first, no hardcoded dicts) | The typography map (B5) was a genuine violation — now fixed. `_root_lift_rules` / `_BREAKPOINT_RULES` are **WP-core / W3C platform schema, not SGS per-block data** → the permitted-constant exception (same class as `SKIP_TOP_LEVEL_TAGS`); documented in code. |
| `cloning-pipeline-flow.md` "DO NOT REDESIGN" box | Held up — none of the fixes invented bespoke composites, hardcoded per-section values, or mirrored the draft DOM. They are all "complete the DB-driven transfer / fix the value-corruption" — exactly what the box prescribes. |
| `2026-06-05-clone-fix-spec-9-roots.md` (R1-R9) | Diagnoses were mostly correct, but several fix-shapes targeted the contaminated `css_dropped` lists. R3 (own-class props dropped) overlaps our B3; the value-corruption class (A1/A2) was **not** in that report — because it's invisible in `css_dropped`. |
| `2026-06-06-container-architecture-rootcause-and-proposal.md` (P1-P4) | The "partial per-tier consumption" thesis is accurate. **P4 (cascade first-wins → last-wins) was the real lever** and was correctly identified there but never built; we built it as A1. |
| `parity2` design (`2026-06-07-draft-centric-parity-verifier-design.md`) | The draft-as-denominator model is sound; the **matcher implementation** (C1/C2) was the weak point, not the design. The instrument needs the same primary-source scrutiny as the converter. |

---

## 4. What shipped (4 commits, all on `main`)

| Commit | Scope |
|---|---|
| `e7f28b0f` | A1 cascade, A2 selector, A3 snapping-off, A4 casing, B1 universal lift, B2 content-fold, B4 responsive padding, B3 (first 4 flex props), D1 unicode, D2 gate auto-skip |
| `ea9897e7` | C1 parity2 text normalisation (content 90.7→96.3%) |
| `ec1fb1ab` | B3/B4 flex receiving surface (justifyContent/flexDirection/flexWrap + map) |
| `cc978252` | B5 de-hardcode the typography map (R-22-1), via `/subagent-driven-development` |

Measured movement (honest, as both converter + gauge got more correct): content **90.7% → 96.3%**, full **44.4% → 45.4%/48.2%**. The full% is still modest because the remaining drops are real CSS/layout differences + the deferred matcher work (C2).

---

## 5. Deferred — needs a focused session (each is sensitive enough for its own qc-council + gate)

1. **Array-driven blocks (R7)** — `card-grid.items` / `announcement-bar.messages` / `notice-banner` InnerBlock; they fall back to `sgs/container` and emit empty. The largest single fidelity lever left.
2. **Inner-block flex receiving attrs (Axis 4)** — the flex CSS on `.sgs-X__content` flags `no_matching_container_attr` because inner blocks (button/text/icon) lack the attrs.
3. **parity2 containment fallback (C2)** — so converter-restructured sections (testimonials→slider, brand) score honestly instead of 0%.
4. **The `--Array` variant bug** — `FR-22-20` emits a JS Array `.toString()` as a `--Array` className.

---

## 6. The principle to carry forward

> **When diagnosing the cloning pipeline, read the scripts and the DB tables first, diff the emitted output against the draft directly, and only then check the spec/pipeline docs for alignment. Treat every scoring layer (parity2, pixel-diff, council verdicts) as a hypothesis that can be wrong — verify it against the raw emit before building on it.** The expensive weeks were spent trusting interpretations; the truth was in `convert.py` line 558 and the `property_suffixes` table the whole time.
