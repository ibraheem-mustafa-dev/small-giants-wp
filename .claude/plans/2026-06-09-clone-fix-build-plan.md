---
doc_type: phase-plan
project: small-giants-wp
thread: cloning-pipeline
title: "Wave-2 → Wave-3 clone-fix BUILD PLAN (council-revised + Bean priority reframe)"
created: 2026-06-09
status: ACTIVE PLAN. Supersedes the plan section of ROOT-CAUSE-FAMILY-MAP.md. Diagnosis = that map (8 families). This doc = what we build, in what order, with which gates.
inputs:
  - ROOT-CAUSE-FAMILY-MAP.md (the 8-family diagnosis)
  - adversarial-council verdict (6 personas, 2026-06-09) — GO on diagnosis, plan revised
  - Bean priority reframe (2026-06-09)
---

# Clone-fix build plan

## ⚠ STATUS CORRECTIONS (last updated 2026-06-13 — read before building from this plan)

| Plan claim | Current truth |
|---|---|
| Stage 0 (gate + baseline + FRs) | **DONE** — Gate A conformance harness wired pre-commit (live: it blocked a commit 2026-06-11); 55-row ledger exists; FR-22-5.3 merged. |
| Stage 1 Commits (F1-consolidate / F1-cross-node / F6a) | **SHIPPED emit-green (D207) but OUTCOME NOT HIT — 0/52 ledger rows closed.** The cross-node router fires but routes padding to the WRONG layer (gridItemPadding/outer, not contentPadding*) + misses CONTENT on shorthand `padding`. |
| "`fold_eligible = len==1` already prevents the XS-3 mechanism" (Stage-1 de-risk note) | **FALSIFIED (D207):** that same guard was the ROOT CAUSE of the hero never dissolving. Replaced 2026-06-11 (`d1e30996`) by a net-of-rule-0 + grid-area gate — which itself carries a scalar-media carve-out that **must be removed**: Bean directive 2026-06-11, the UNIVERSAL grid-item router (next-session-prompt Task 3) supersedes that paragraph. |
| Stage 2 F3 ("build de-hardcode") | **Substantially shipped** by the theme thread's block-quality programme (D206: B3–B6, C7, E9, D8) + D192; remaining F3 items only. |
| Stage 2 F5 card-grid product capability ("biggest tail item") | **SHIPPED (D204, FP-E/FP-H)** — the sign-off LEDGER's FP-E/FP-H rows are stale (still OPEN); flip them on the next ledger walk. Product-page clone now gates on Spec 30 (WC single-product template, D208), which scopes the remaining F5 alias work. |
| Acceptance | **Re-bound 2026-06-11:** every converter change reports fixed/stayed PER LEDGER ROW (clone-parity run + ledger walk); "the mechanism fires" is never an outcome. New finding for Stage 3: a global fontSize 16→18px parity drift (3→24 failures) needs its own root-cause. |
| Stage-1 DEC-3 three-layer model (OUTER/CONTENT/GRID) | **INCOMPLETE (proven live 2026-06-11):** composites that render NAMED grid areas expose a FOURTH destination family — **GRID-PER-AREA, `<areaName>+<suffix>`** (hero `contentPadding*` = padding on the grid column whose AREA is "content"; `mediaPadding*` likewise). A 3-layer router can never deliver H-B because the correct destination isn't in its vocabulary. Built 2026-06-11: `db.attr_for_area_property` + `_route_area_css_to_block_attrs` (net-new, same D194 name-free mechanism). |
| The plan lists `contentPadding` among "the parent container's box attrs" (F1-cross-node bullet) | **NAME COLLISION (Bean caught it):** the hero's `contentPadding*` is NOT the container-mirror CONTENT-band attr — it is the per-AREA attr for the grid column named "content". Do not route content-band semantics to it. |
| Name-free align/grid layer-router (A) — listed as future work | **SHIPPED + CLOSED 2026-06-13 (D222, commits `1b03b8c7` + `c5ecb4eb`).** `property_suffixes` row `align-items → AlignItems` added via dated migration; fork at `convert.py:4092-4101` removed; last `verticalAlign` literal removed (`c5ecb4eb`). Router unification closed. Design + council record: `.claude/plans/archive/2026-06-13-A-layer-router-design.md`. |
| IN-F (notice-banner content — empty content) | **VERIFIED 2026-06-13 (D222, commit `1b03b8c7`).** Universal-lift: composite node with direct rich-text emits one `sgs/text` child (DB-gated `scalarContentLift`, no per-slug branch). Live-verified on canary page 8. Ledger row updated. |
| team-member (D221 regression + scalar-lift) | **SHIPPED 2026-06-13 (D221, commit `e20f0bd5`).** Durable `ATTR_CLASSIFICATION_OVERRIDES` layer forces `team-member.name role=NULL` → scalar; `has_inner_blocks` override removed. Gate A 43 green. |

## The objective (Bean, locked 2026-06-09)

**The deliverable is the UNIVERSAL PIPELINE CONVERTER — not a high parity score on the Mama's draft.** The score on one draft is a verification signal, not the product. Consequences that drive this whole plan:

- **A temporary parity regression while we replace a carve-out with the real universal mechanism is ACCEPTABLE.** We do not protect the current number.
- **BUT the universal replacement must be proven genuinely universal on the live DOM across all blocks before it ships.** The +13pp XS-3 revert (`c76aa107`) was reverted because the replacement was *broken/non-universal*, NOT because regression is bad. Verify universality (Rule 5 / R-22-11), don't assume it.
- **Build order optimises for the universal core, not for an incrementally-prettier canary.** Cheap-visible-wins-first sequencing (council C3) is de-prioritised; independent families build in PARALLEL.

## Council verdict outcome

GO on the 8-family decomposition (all 6 personas praised the F1/F3 layer split). NO-GO on the original plan as written → revised below. Disposition of each convergent must-fix:

| Council finding | Disposition |
|---|---|
| **C1 — F1 paths already exist** (Fact-Checker+Cynic) | **ACCEPTED.** F1 = consolidate the 4-5 existing lift paths into one DB-driven dispatch + add the missing **cross-node child→parent CSS routing** — NOT "build a router from scratch". |
| **C2 — F6 doesn't separate from F1; it's two problems + has no FR** (Cynic+Spec-Lawyer+Arch) | **ACCEPTED.** Split F6 → **F6a** (converter resolves inherited/ancestor CSS — same function as F1, build together) + **F6b** (heading block's `:where(){text-align:center}` default → reclassify into F3). Write the spec rule (FR) before building F6a. |
| **C3 — build cheap wins first (stall trap)** | **DE-PRIORITISED** per Bean reframe. Keep parallelism; don't gate the core behind a sequencing rule. |
| **C4 — removing `_route_composite_interior` is a +13pp landmine** | **REFRAMED, not rejected.** Score-preservation is NOT the goal → remove the carve-out anyway. Keep only the real lesson: **verify the replacement is universal on live DOM before shipping** (the prior attempt failed because it was broken, not because it regressed). |
| **C5 — stale denominator (FP-F shipped)** | **ACCEPTED.** Re-baseline every issue {open / canary-only / shipped} before sizing. FP-F/SP-G binding = SHIPPED (D191); not a workstream. |
| **C6 — F2 font-family is a D0-vs-D1 decision, not a 1-liner** | **ACCEPTED.** Reframe as: font matches a theme token → leave (D0); genuine per-element override → lift (D1). Un-excluding blindly would override theme fonts. |
| **C7 — conformance gate must be Stage-0, + F3 needs its own guard** | **ACCEPTED.** Gate-first. This is the anti-rot mechanism for the whole programme. |
| **FP-I dropped; mobile silent scope gap; residue list + sign-off ledger missing** | **ACCEPTED** (FP-I added; ledger added). Mobile: Bean confirms the responsiveness *failure-mode* is captured (per-device CSS vars, breakpoints) — universal fixes apply to all devices — so a **mobile/tablet verification PASS at the end** suffices, not an exhaustive pre-list. |
| BR-B → F8 (not F1); BR-C → F3 (not F5); F5-trustpilot = alias-coverage | **ACCEPTED** (reclassified in the map). |

## The plan

### Stage 0 — gate + baseline + spec (do FIRST, before any build)
1. **Spec↔code conformance gate** (D178's missing cure) — wired to something that runs (prebuild + pre-commit, per memory `dont-claim-a-guard-is-enforced-unless-wired`). Fails when emit diverges from the spec. This is the structural defence that stops the families silently re-rotting.
2. **Re-baseline the issue register** — every issue from the family map tagged `open | canary-only | shipped` against git + canary. FP-F/SP-G = shipped. Produces the true denominator + the **55-row sign-off ledger** (issue → family → owner → verified Y/N).
3. **Write the missing spec rules (FRs)** so new behaviour is documented before it's coded: FR for inherited/absent-value resolution (F6a); FR for draft-driven breakpoints (F4); the FR-22-19 retirement clause (so removing `_route_composite_interior` is a sanctioned spec change, not silent deletion).

### Stage 1 — PRIORITY: the universal converter core
Built as one coherent workstream (split into commits per R-22-5), design-gated (Rule 7), **regression-OK but live-DOM-verified-universal**. qc-council (2026-06-09, cross-model empirical) re-sized this into three distinct pieces — do NOT bundle them as one "consolidate+extend":

- **F1-consolidate (SMALL, verified).** `_lift_typography_to_block_attrs` (`convert.py:1400`), `_lift_wrapper_css_to_container_attrs` (`:981`, called `:2786`/`:2872`), `_lift_root_supports_to_style`, the scalar-media path → ONE DB-driven dispatch keyed on `role`/`canonical_slot`/`attr_type` (`equivalent_block_for`, `db_lookup.py:1995`). **Delete the dead `_lift_styling_attrs` (`:1687`) + `_slot_attr_prefix` (`:1665`)** — qc-council confirmed zero production call-sites (test-only). This part IS consolidation.
- **F1-cross-node (NET-NEW code, MEDIUM — qc-council Correction 1).** An interior element's CSS routes to its destination: the parent container's box attrs (`contentPadding`/`contentWidth`/gap) or a child-block's attrs. The CONTENT fork (child-block vs parent) is slot-keyed (`slot_has_equivalent_block`); the **box-CSS destination is found NAME-FREE — by layer-prefix + box-property `property_suffixes` (D194), NOT by matching `canonical_slot`** (aligns the older Method-2 plans, which map property→attr via a curated property-keyed lift, not a slot-name key). **NO Commit-0a / `canonical_slot`-backfill dependency** (D194; design-gate `WRAPPER-CSS-ROUTING-DESIGN-GATE.md`). **This is genuinely new code, NOT a tidy extend** — qc-council confirmed the A2 path collects CSS for the node ONLY (`_collect_css_decls_for_element(node)`, `:2871`; the `:2872` sibling call is `_lift_wrapper_css_to_container_attrs`); nothing walks a `__inner`/`__content` child's CSS upward today. This is the headline F1 capability; size it as a real build.
- **F6a inheritance/absence** rides here (same `_collect_css_decls_for_element`): resolve inherited/ancestor values + make browser-defaults explicit.
- **Remove the carve-outs.** Replace BOTH per-composite interior-routing branches in `walk()` — `_route_composite_interior` (def `:2404`, gated `has_scalar_media_attrs` `:2940`) + `_is_container_mirror_block` (`:2950`, def `:908`) → `_process_container_children` (`:3834`) — and the trust-bar atomic handler, with the universal dispatch. **qc-council de-risked this:** the sole-element-child guard `fold_eligible = len(element_children) == 1` (`_process_container_children:3857`) already prevents the exact mechanism behind the +13pp XS-3 revert, and the trust-bar bound-mode cheat was already purged (D182). Still **verify on the live DOM that the replacement routes correctly for EVERY composite + array block**; roll back only if genuinely non-universal, not if the draft's number dips.

### Stage 1b — array per-item routing (SEPARATE MEDIUM BUILD — qc-council Correction 2)
**Do NOT fold into Stage 1's "consolidate+extend".** FR-22-2.5 is `built_status: DESCRIBED — no ship evidence` (Spec 22:190); per-item routing needs DOM-per-item walking + per-item block emission, which **nothing does today** (the Sonnet rater + the architecture persona converged on this). It's a medium build that lands AFTER F1-consolidate + F1-cross-node. Covers the trust-bar badge per-item CSS (TB-A/TB-B) + any array composite. Sequence it explicitly; don't let it hide inside Stage 1's scope.

### Stage 2 — PARALLEL families (independent; build alongside Stage 1)
- **F3 block-render de-hardcode** + a `check-hardcoded-render-defaults.js` structural guard. Check each F3 item against the 29-block mirrored roster first (if mirrored, wire the attr; don't add a duplicate). Overlaps WS-1/D192 — dedupe.
- **F4 breakpoints** — draft-driven detection (read the draft's actual `@media` thresholds; add `min-width:640`; fix the `768` misbucket) → land on the block's `+Tablet`/`+Mobile` attr tiers (never inline @media).
- **F2 font-family** — the D0-vs-D1 decision (token → leave; override → lift), design-gated.
- **F5 block resolution/capability** — slot-table aliases (`trustpilot-reviews`, announcement-bar callout) + the card-grid product capability (Spec 27 thread — size it honestly, it's the biggest tail item).
- **F7 grid engine** (H-A double emission), **F8 content extraction** (tie to the FR-22-2.4 unresolved-attr log so gaps self-report).

### Stage 3 — verify
- Real-homepage live DOM per section (Playwright, R-22-11) — the universal mechanism routed correctly, not just the score.
- **Mobile/tablet verification pass** (375 / 768) — confirm the universal fix landed across devices.
- The 55-row sign-off ledger closed out + Bean's eye (R-22-13).
- **Uncaptured residue list** maintained (FP-I now in; any mobile-only defect found in the pass; the FP-F drift guard wiring) so nothing silently survives.

## Gates (the council skills, baked in)
- **Per fix-shape before dispatch: `/qc-council`** (blub.db 255) — validate against a measured baseline (predicted vs actual delta), esp. the Stage-1 core + F4.
- **Before any shared-mechanism build: design-gate (Rule 7)** + Bean approval — Stage-1 core, F3, F7 all qualify.
- **This plan itself was `/adversarial-council`-gated** (2026-06-09, 6 personas) — that's why it exists in this shape.

## Build sequencing (priority, not strict order — parallelise the independents)
1. Stage 0 (gate + baseline + FRs) — blocks everything below; do first.
2. Stage 1 universal core — the priority, the deliverable.
3. Stage 2 families — in parallel with Stage 1 where they don't touch the same converter functions (F3/F4/F2/F5 are mostly independent; F7/F8 coordinate with the core).
4. Stage 3 verify — continuous per landed piece + a final full pass.
