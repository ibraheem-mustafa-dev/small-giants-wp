---
doc_type: phase-plan
project: small-giants-wp
thread: cloning-pipeline
title: "Composite-fidelity universal fix set — design-gate"
created: 2026-06-15
status: DESIGN — awaiting Bean sign-off before any build. Rule-7 high-blast items flagged for /adversarial-council.
d_ceiling_at_creation: D227
source_register: .claude/reports/2026-06-14-clone-vs-draft-defect-register.md
evidence_runs:
  - pipeline-state/mamas-munches-homepage-2026-06-14-081059  (trace b1-b9, extract.json, leftover-buckets.json, match.json)
prior_work_incorporated: D222 (align layer-router), D223 (child-CSS styling-lift), D224 (IN-E/H-C1/IN-B/GF-B.2 root causes + council), D225 (4 fixes shipped a8bf5616), D226 (live-verify: IN-B ok, H-C1 wrong layer)
---

# Composite-fidelity universal fix set — design (Mama's homepage)

## The single architectural root cause

The run (`match.json`) confirms only **hero (b2)** and **trust-bar (b3)** resolve to composites; **b4–b9 are all `sgs/container`**. This is the faithful-vs-broken split Bean identified.

- **Container sections stay faithful** because they get fidelity from TWO sources: (a) the draft's class CSS preserved as scoped section/variation CSS, and (b) `_fold_layout_into_attrs` lifting `__inner` max-width → `contentWidth` + the grid lift.
- **Composites discard the draft classes** (rendered with the block's own classes) and rely ONLY on typed-attribute extraction — which is missing several property families.

**Therefore the meta-fix is:** make composite typed-attr extraction *property-complete + flag-not-drop*, so a composite captures the same families the container/variation-CSS path captures for free. Most individual fixes below are instances of this.

## Evidence index (every claim tied to an artefact, not inference)

| Claim | Evidence source |
|---|---|
| Only hero+trust-bar are composites; b4-b9 = container | `match.json` (run 081059) |
| trust-bar `__inner` grid lifted, max-width→contentWidth NEVER fires; `has_inner_blocks=false` | `convert-trace-b3.jsonl` |
| hero h1 emitted `fontSize`+`fontSizeTablet`, NO `fontSizeMobile` (34px dropped) | `convert-trace-b2.jsonl` emit keys |
| brand image: ZERO media-CSS lift events (radius/max-height/order silently dropped) | `convert-trace-b5.jsonl` (absence) |
| `unitless` bug bites `sgs/text` not `sgs/heading` | `helpers-typography.php:96` vs `heading/render.php:222` + trace b2 |
| IN-E text-align is WP-native `supports.typography`, NOT a block_attributes row; gate-widen breaks ~16 blocks | D224 (council-verified) |
| hero-sub renders as child `sgs/text`; D225 H-C1 fix targeted hero.subHeadlineMaxWidth (wrong layer) | D226 live-verify |
| gift "Find out more" = standalone `sgs/button` (id sgs-btn-20), NOT wrapped in multi-button | clone DOM L881 + trace b7 |

## The fix set (touch each function once; universal R-22-9)

| # | Fix | Layer | File (to confirm at build) | Blast | Council? | Fixes |
|---|---|---|---|---|---|---|
| 1 | Decode `unitless` sentinel in shared typography helper; audit sibling render files for the same | render | `includes/helpers-typography.php:96` | low | no | HE6, I10, F15, G15 |
| 2 | Lift composite `__inner` max-width (var-resolved) → `contentWidth`, mirroring the container fold; fire for `has_inner_blocks=false` composites too | converter | `convert.py` (fold/composite-interior path) | **high** | **yes** | trust-bar T1, content-band family |
| 3 | Route hero-sub max-width onto the child `sgs/text` `maxWidth` (its real render layer), not `hero.subHeadlineMaxWidth` | converter | `convert.py` (hero-sub path / H-C1) | med | yes | HE5 |
| 4 | When Desktop A-collapse claims `fontSize`, route the mobile-first base value → `fontSizeMobile` | converter | `convert.py:1724-1742` | **high** | **yes** | HE4, B6, F9 |
| 5 | Extend media lift to read `border-radius`, `max-height` (the property, not `height`), `order`; thread `css_rules` into scalar-media for hero img | converter | `convert.py:3195-3206`, `:3919` | med | no | B3, B4, B5, HE8 |
| 6 | Stop skipping gradient backgrounds; route to a gradient/background attr | converter | `convert.py:817` | low | no | F12 |
| 7 | Read draft `@media` breakpoints instead of snapping to constants (FR-22-5.2) | converter | `convert.py:5006-5007`, `db_lookup.py:1409` | **high (design-gate)** | **yes** | Fam F (B1, F8, G4, HE10) |
| 8 | IN-E probe-first text-align transfer (NOT gate-widen — would force textAlign:left onto ~16 blocks) | converter | `convert.py:1836` | **high** | **yes** | I8 |
| 9 | DEC-3 button link-style emit (not `is-style-primary`); DEC-1 disclaimer → `sgs/text` (or container+text); DEC-4 testimonial → static `card-grid` | converter/DB | match path + `slots`/`blocks` | med | per-item | DEC rows |
| 10 | Star polygon → filled (icon resolver maps to a filled star slug or preserves verbatim) | converter | `icon_resolver.py:185` | low | no | T5 |

## Build waves (by risk)

- **Wave A — contained, no council:** #1 (render), #5 (media), #6 (gradient), #10 (icon). Fix-once, low blast, immediate live-verify.
- **Wave B — high-blast, /adversarial-council each before build:** #2 (composite content-width), #4 (mobile tier A-collapse), #8 (IN-E probe-first). #3 rides with #2.
- **Wave C — design-gate redesign:** #7 (breakpoint reading) — own /brainstorming + council; `_BREAKPOINT_RULES` has a dual role (routing + suffix-validation) so a naive constant change breaks the guard (D224 warning).
- **Wave D — match/DB decisions:** #9 (DEC-3/1/4) — small, per-item, mostly DB/match data.

## MUST-confirm BEFORE building (no fix designed until proven from trace/DB)

- **DEC-5** — re-ID which CTA (if any) is wrongly wrapped in multi-button (Lens-1 was wrong; gift is fine).
- **DEC-1** — query `sgs/text` supports: does it do bg + border + max-width + italic + centring alone? Else use `sgs/container`+`sgs/text`.
- **B7** dup-margin, **F7** Fraunces (inheritance bleed?), **F13** tag colour, **HE7** spurious min-height, **HE11** doubled grid — confirm each per-row from the trace before touching.

## Acceptance (every row)

Per R-22-11 + R-22-13: each fixed row flips to VERIFIED via live computed-style on canary page 8 vs the draft (Playwright/chrome-devtools), AND both conformance suites green (Gate A `scripts/tests/test_converter_conformance.py` + `converter_v2/tests/`), AND no regression on already-VERIFIED rows (D226 IN-B/GF-B.2). Commit path-scoped per wave.

## Orchestration

Opus orchestrates (plan/delegate/QC/live-verify/commit); sonnet subagents implement (no commit/deploy authority). `/adversarial-council` on each Wave-B/C item's shape BEFORE build; `/qc-council` + both suites + live page-8 verify BEFORE each commit. DB changes via dated `migrations/*.py` or block.json `supports.sgs` auto-seed, verified by full `/sgs-update` reseed — never a manual DB edit.
