---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Specialised reviewer personas for the 3 vital cross-stage cloning mechanisms"
created: 2026-06-17
source: /research-check default tier (2 Sonnet agents — Answer + Optimiser), web-grounded
purpose: roster of reviewing-subagent personas to exhaustively audit the cross-stage functions Bean named as success-critical
---

# Cross-stage reviewer personas — roster

Bean (2026-06-17): three cross-stage functions are vital and must be exhaustive/robust in logic, branching, routing:
**(M1)** multi-layer nested wrapper/grid recognition & mapping into every `sgs/container` + composite built-in container;
**(M2)** the intelligent classification fork — child block vs atomic element vs CSS rule vs block variant;
**(M3)** complete no-exception CSS transfer to the equivalent block/element.

The roster below pairs each mechanism with the optimal persona(s) + the knowledge + toolset each needs. Grounded in: WPT reftests, AddressSanitizer (conservation accounting), construct-oriented fuzzing (PROGnosticator FSE 2026), translation validation (Necula PLDI 2000), Hypothesis property-based testing, multi-agent debate (Du et al. 2023), and the OverlayQA Figma-to-code dropped-property catalogues.

## The personas

| # | Persona | Worldview | Key knowledge | Key tools | Best-found failures |
|---|---------|-----------|---------------|-----------|---------------------|
| P1 | **Translation Validator** | every pass preserves observable semantics; "looks close" is a defect | translation validation, differential/metamorphic testing, WP attr→CSS semantics | sgs-db attr map, golden-diff harness, live computed-style probe | value coercion, silent default injection, multi-stage info loss |
| P2 | **Classification Auditor** | the node fork is a grammar with precedence + exhaustiveness | parser/grammar precedence, DB-as-grammar (slots/roles/variant_slots), discriminated-union exhaustiveness | sgs-db variant_slots, grep walker branches, trace.jsonl stage_2, construct-fuzz | node swallowed by wrong rule, variant missed, hardcoded-dict drift from DB |
| P3 | **CSS Transfer Completeness Auditor** | surjective accounting: \|source\| = \|transferred\| + \|skipped-with-reason\|; zero fall off | CSS cascade/inheritance/shorthand, the 6 commonly-dropped property classes, conservation invariant | extract.json decl count, leftover-buckets reason check, grep `except:`/`pass`, property-coverage matrix | background-image/filter/pseudo-element silent drops, shorthand loss, broad-except swallow |
| P4 | **Nested Layout Depth Auditor** | grid nesting is not flat; 3–4 levels; no property at two layers | CSS Grid (explicit/implicit tracks, subgrid, stacking context/contain), the OUTER/CONTENT/GRID/PER-AREA invariants, container_kind | sgs-db container roster, trace stage_3_layer, bounding-rect at each depth, depth-N differential | layer collapse, unconditional sgs-cols-* override, depth>1 wrapper miss |
| P5 | **Responsive Transfer Reviewer** | responsive is a parallel declaration channel that must transfer independently + device-tier-map | media-query semantics, device-tier (768/1024) vs visual-breakpoint distinction, _BP constants consistency | grep tier attrs + _BP constants, extract responsive count, 375/768/1440 screenshot diff | off-by-one tier, _GRID_TABLET_BP vs wrapper mismatch, base-only transfer dropping overrides |
| P6 | **Variant & Composite Integrity Auditor** | variant block = state machine; composite must mirror sgs/container exactly | variant_slots set-difference, variant_attr, composite-mirror rule, icon resolver | sgs-db variant join, grep cross-variant bleed + per-block `if slug==` branches, sourceMode audit | wrong variant, cross-variant attr bleed, composite carve-out, bound-mode regression |

## The four cutting-edge techniques (deploy as review *methods*, not just opinions)

1. **Render-Differential Oracle (reftest)** — review the rendered *pixels* of draft vs clone, not the markup. Catches background-image/filter/pseudo-element/specificity bugs as a CLASS without enumerating them. Cost: empty-section false-win + reflow false-loss → gate on `innerText.length>0` + element-present; subpixel/font noise at fine tolerance. (W3C WPT reftests.)
2. **CSS Accounting Ledger (conservation law)** — instrument the pipeline so every draft CSS declaration exits as TRANSFERRED | EXPLICITLY-EXCLUDED(reason) | UNACCOUNTED; UNACCOUNTED is a failing assertion. Makes silent drops structurally impossible. **This is a concrete Spec-31 anti-cheat addition + the answer to M3's "without exception."** Cost: 1–2 days wiring; one-time classification of known-intentional skips. (AddressSanitizer shadow-memory principle.)
3. **Property-Based Fuzzer (Hypothesis)** — generate synthetic SGS-BEM drafts; assert transfer invariants (round-trip idempotency, monotonicity, value preservation, shorthand-expansion completeness, no-phantom-attr) without a known-correct output; shrink to minimal repro. Cost: invariant formulation is Opus-level; needs a BEM `@composite` strategy; nightly not per-commit.
4. **Committed Adversarial Worldview** — assign each reviewer a precise invariant to FALSIFY ("the container never emits a hardcoded override a faithful attr should win"), with file+DOM evidence access, a search-exhaustiveness mandate, and a rubric that rewards counterexamples. Cross-family model, distinct from the implementer. (Du et al. multi-agent debate + this project's /qc-council cross-family results, blub 255.)

## Deployment mapping (mechanism → reviewers + methods)

- **M1 nested wrapper/grid** → P4 + P5, method = Render-Differential Oracle + depth-N differential.
- **M2 classification fork** → P2 + P6, method = construct-oriented fuzz + Committed Adversarial Worldview.
- **M3 complete CSS transfer** → P3 + P1, method = CSS Accounting Ledger + Property-Based Fuzzer.

## Sources
WPT reftests (web-platform-tests.org); AddressSanitizer; PROGnosticator FSE 2026 (futures.cs.utah.edu/papers/26FSE-a.pdf); Necula PLDI 2000 (translation validation); Hypothesis docs; Du et al. arXiv:2305.14325 (multi-agent debate); OverlayQA Figma-to-code dropped-property catalogues. Gap: no academic surjectivity-invariant work specific to CSS translators — the ledger is derived from ASan + construct-fuzzing applied to the CSS-declaration unit.
