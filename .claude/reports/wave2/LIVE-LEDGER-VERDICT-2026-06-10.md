---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Live-DOM ledger verdict — Stage-1 (Commits 2/3/4) vs the 55-issue SIGN-OFF-LEDGER"
created: 2026-06-10
status: VERDICT. Live computed-style comparison (clone-parity.js) of the deployed page 8 BEFORE Stage-1 (06-07 report) vs AFTER Stage-1 (06-10 report), mapped to SIGN-OFF-LEDGER.md. Header/footer excluded.
---

# Live ledger verdict — Stage-1 did not move the rendered page

## Headline
- **Live page render is UNCHANGED between pre-Stage-1 (2026-06-07) and post-Stage-1 (2026-06-10).** Both clone-parity runs at 1440px: total 130, passed 4, failed 126, identical.
- **Per-section property-failure diff: 0 FIXED · 118 STAYED · 0 NEW** (header/footer excluded; `start`↔`left` benign-filtered).
- **0 of 26 live headings carry any `text-align`** → all render the block's `:where(){text-align:center}` default. The H-C1 class is unfixed across the whole page.
- The Stage-1 EMIT did change (parity2 CSS 84.6%→87.1%, golden fixtures + 121 unit tests green) — but those are EMIT-LEVEL on ISOLATED fixtures. The real page's emit still lacks the fixes: **0/28 sgs/heading carry `textAlign`; hero emits no `contentPadding`.** Emit-green ≠ render-fixed (measurement-vs-eye / verify-rendered-output-not-internal-metrics).

## Scope map (SIGN-OFF-LEDGER, 55 issues)
- **Stage-1 TARGETED (families F1 cross-node, F6a inheritance, F1b array): 23 issues.** All 23 STAYED on live.
- **Never in Stage-1 scope (F2 font, F3 render-default, F4 breakpoint, F5 resolution, F7 double-grid, F8 extraction, Spec-27): ~30 issues.** Open by design.
- **Already shipped pre-Stage-1: 3** (H-C2/D192, FP-F/D191, SP-G binding-half/D191).

## Per-section verdict

| Section | Open issues | Stage-1 targeted | Targeted issue IDs | Live status |
|---|---|---|---|---|
| Hero | 5 | 2 | H-B (F1), H-C1 (F6a) | STAYED — padding on outer/0px on `__content`; heading centre; split-grid 199/1098 (H-A, F7, never in scope) |
| Trust Bar | 4 | 2 | TB-A (F1+F1b), TB-B (F1b) | STAYED — badges centre + widened |
| Brand | 3 | 0 | — | out of scope (F4/F8/F3) |
| Featured-product | 15 | 6 | FP-A/B/C/J/N/P | STAYED (+ FP-E/FP-H are Spec-27 milestone, not clone-fix) |
| Ingredients | 6 | 4 | IN-A/B/E/F | STAYED — also the only sub-100 content section (66.7%, disclaimer gap) |
| Gift | 13 | 6 | GF-A/B.1/B.2/C/E/G | STAYED — width/height/lineHeight mismatches persist |
| Social Proof | 8 | 3 | SP-B/D.1/D.2 | STAYED — width mismatch persists |

(Most sections also show "ELEMENT present→MISSING" entries — the clone-parity DOM-path matcher failing to pair a draft class to a converted clone element. These are partly the expected convert-not-mirror restructuring, NOT all real visual defects; the load-bearing failures are the property mismatches: padding, width, height, lineHeight, textAlign.)

## Why the wiring didn't land (open question — NOT yet root-caused)
The commits DID add wiring into `walk()` (Commit 2 `_route_interior_css_to_parent_slot`; Commit 3 `_resolve_inherited_typography` at the atomic-tag-swap + A2 leaf paths) and unit-tested it. But the real Mama's page nests headings/content inside composites + `sgs/container` wrappers (`__content` emits as a nested `sgs/container`), and the deployed emit shows the new attrs were NOT produced for those nested elements. Hypothesis (unconfirmed): the wiring fires on the isolated-fixture leaf path but not the composite-interior / container-children path the real page uses. Requires an emit-path trace of the real hero before asserting the mechanism.

## What this means for the gate
"Fixed" must be gated by a LIVE-DOM read of the specific issue (R-22-11/R-22-13), not by golden fixtures or parity2. Gate A (golden conformance) checks emit STRINGS on isolated fixtures — it passed while the real render stayed broken. A live-DOM per-issue check is the missing gate.
