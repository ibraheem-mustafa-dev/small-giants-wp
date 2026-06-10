---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Clone-fix SIGN-OFF LEDGER — every issue → family → status → workstream"
created: 2026-06-09
status: Stage 0 baseline (CLONE-FIX-BUILD-PLAN.md). The authoritative close-out tracker. Re-baselined against git+canary per council C5. Update the Status column as each issue is verified fixed on the real homepage (R-22-11/R-22-13). Nothing is "done" until its row reads VERIFIED.
legend: "Family: F1 per-slot CSS routing · F1b array per-item · F2 font-family · F3 block-render default · F4 breakpoint · F5 block resolution/capability · F6a inheritance/ancestor · F7 double-emission · F8 content extraction · NEW framework/draft. Status: OPEN · SHIPPED (already fixed) · VERIFIED (fixed+live-confirmed)."
---

# Sign-off ledger

## Status summary (baseline 2026-06-09)
- Total tracked: **55 issues** (incl. council-added FP-I + split sub-IDs).
- **SHIPPED (already fixed, pre-build):** 3 — H-C2 (D192), FP-F (D191), SP-G binding-half (D191).
- **OPEN:** 52.
- **VERIFIED (fixed + live-confirmed this programme):** 0 (build not started).

## Ledger

| Issue | Section | Family | Owning workstream | Status |
|---|---|---|---|---|
| H-A | Hero | F7 | Stage2-F7 | OPEN |
| H-A2 | Hero | F4 | Stage2-F4 (cause-needs-trace) | OPEN |
| H-B | Hero | F1 cross-node | Stage1 | OPEN |
| H-C1 | Hero | F6a + draft-convention | Stage1 + draft | OPEN |
| H-C2 | Hero | F3 inert controls | — | **SHIPPED (D192)** |
| TB-A | Trust Bar | F1 cross-node + F1b | Stage1 + Stage1b | OPEN |
| TB-B | Trust Bar | F1b array + F4 | Stage1b + Stage2-F4 | OPEN |
| TB-C | Trust Bar | NEW icon-drift | NEW (draft + iconFill flag) | OPEN |
| TB-C-draft | Trust Bar | NEW draft | draft edit | OPEN |
| BR-A | Brand | F4 | Stage2-F4 | OPEN |
| BR-B | Brand | F8 (was F1) | Stage2-F8 | OPEN |
| BR-C | Brand | F3 (was F5) | Stage2-F3 | OPEN |
| FP-A | Featured-prod | F6a / F3 | Stage1-F6a / Stage2-F3 | OPEN |
| FP-B | Featured-prod | F1 | Stage1 | OPEN |
| FP-C | Featured-prod | F1 cross-node | Stage1 | OPEN |
| FP-D | Featured-prod | F5 | Stage2-F5 | OPEN |
| FP-E | Featured-prod | NEW block-capability | Spec 27 (card-grid product) | OPEN |
| FP-F | Featured-prod | NEW rest-validation | — | **SHIPPED (D191)** |
| FP-G | Featured-prod | F3 | Stage2-F3 | OPEN |
| FP-H | Featured-prod | NEW block-arch-mismatch | Spec 27 | OPEN |
| FP-I | Featured-prod | F3 (council-added) | Stage2-F3 | OPEN |
| FP-J | Featured-prod | F1 cross-node | Stage1 | OPEN |
| FP-K | Featured-prod | F3 (showLabel render-side boolean default — NOT F6; corrected per qc-council) | Stage2-F3 | OPEN |
| FP-L1 | Featured-prod | F3 | Stage2-F3 | OPEN |
| FP-M | Featured-prod | F2 | Stage2-F2 | OPEN |
| FP-N | Featured-prod | F3 + F1 | Stage2-F3 + Stage1 | OPEN |
| FP-O | Featured-prod | F3 | Stage2-F3 | OPEN |
| FP-P | Featured-prod | F1 | Stage1 | OPEN |
| FP-DRAFT | Featured-prod | NEW draft-naming | draft edit | OPEN |
| IN-A | Ingredients | F6a | Stage1-F6a | OPEN |
| IN-B | Ingredients | F1 cross-node | Stage1 | OPEN |
| IN-C | Ingredients | F3 (feature-grid auto-flex) | Stage2-F3 | OPEN |
| IN-D | Ingredients | F8 (emoji icon) | Stage2-F8 | OPEN |
| IN-E | Ingredients | F6a | Stage1-F6a | OPEN |
| IN-F | Ingredients | F8 + F6 | Stage2-F8 + Stage1-F6a | OPEN |
| GF-A | Gift | F6a / F3 | Stage1-F6a / Stage2-F3 | OPEN |
| GF-B.1 | Gift | F1 | Stage1 | OPEN |
| GF-B.2 | Gift | F1 (cross-slot leak) | Stage1 | OPEN |
| GF-B.3 | Gift | F4 (min-width:640) | Stage2-F4 | OPEN |
| GF-B.4 | Gift | F2 | Stage2-F2 | OPEN |
| GF-C | Gift | F1 (spacing-support gate) | Stage1 | OPEN |
| GF-D.1 | Gift | F3 (bg default) | Stage2-F3 | OPEN |
| GF-D.2 | Gift | F3 (pill style) | Stage2-F3 | OPEN |
| GF-E | Gift | F6a / F3 | Stage1-F6a / Stage2-F3 | OPEN |
| GF-F | Gift | F2 | Stage2-F2 | OPEN |
| GF-G | Gift | F1 (absorbed gap) | Stage1 | OPEN |
| GF-H | Gift | F3 (multi-button auto-wrap) | Stage2-F3 | OPEN |
| GF-I | Gift | F8 + F5 | Stage2-F8 + F5 | OPEN |
| SP-A | Social Proof | F4 (min-width:640) | Stage2-F4 | OPEN |
| SP-B | Social Proof | F1 (spacing-support gate) | Stage1 | OPEN |
| SP-C | Social Proof | F3 (verticalAlign) | Stage2-F3 | OPEN |
| SP-D.1 | Social Proof | F1 (NOT F3 — qc-council: `starSize` is already attr-driven; the fix is the converter routing `.sgs-testimonial__stars` `font-size:15px` → the child `sgs/star-rating`'s size attr via the dispatch, a typography→child-block-attr route) | Stage1 (dispatch — typography to child) | OPEN |
| SP-D.2 | Social Proof | F1 | Stage1 | OPEN |
| SP-E | Social Proof | F3 + F8 | Stage2-F3 + F8 | OPEN |
| SP-F | Social Proof | F3 (slide-card token) | Stage2-F3 | OPEN |
| SP-G | Social Proof | F5 wrong-block (+ binding SHIPPED D191) | Stage2-F5 | OPEN (binding half done) |

## Workstream load (open issues only)
- **Stage 1 (F1 cross-node + F6a):** ~18 (the biggest — H-B, FP-B/C/J/N/P, GF-B.1/B.2/C/G, SP-B/D.2, IN-B + F6a: H-C1, FP-A/K, IN-A/E/F, GF-A/E)
- **Stage 1b (array per-item):** 2 (TB-A, TB-B) — small count, but the FR-22-2.5 build is medium.
- **Stage 2-F3:** ~15 (the second-biggest — BR-C, FP-G/I/L1/N/O, IN-C, GF-D.1/D.2/H, SP-C/D.1/E/F + F6b half of FP-A/GF-A/GF-E)
- **Stage 2-F4:** 4 (H-A2, BR-A, GF-B.3, SP-A)
- **Stage 2-F2:** 3 (FP-M, GF-B.4, GF-F)
- **Stage 2-F5:** 3 (FP-D, SP-G, GF-I-half)
- **Stage 2-F7:** 1 (H-A)
- **Stage 2-F8:** ~4 (BR-B, IN-D, IN-F, GF-I-half, SP-E-half)
- **NEW / draft / Spec 27:** TB-C, TB-C-draft, FP-E, FP-H, FP-DRAFT. **⚠ MILESTONE GATE (qc-council):** FP-E (card-grid WooCommerce product capability) + FP-H (product-card built-in-elements architecture) are NOT Stage-1/2/3 work — they are a **Spec 27 block-build milestone** (multi-session: new attrs + render.php + edit.js + deprecated.js + WC query, co-ordinated with Spec 27 Phases). They **cannot be marked VERIFIED by the clone-fix waves** — they require an explicit Spec-27 session. **SEQUENCING (Bean-confirmed 2026-06-09): that session must run AFTER (a) the Spec27-28 council-mustfix wave plan (`.claude/plans/2026-06-06-spec27-28-council-mustfix-wave-plan.md`, currently AWAITING-BEAN-SIGNOFF / Wave-2 mid-build — it edits the same product-card files) AND (b) the cloning converter Stage 1.** Prompt ready at `.claude/reports/wave2/FP-E-FP-H-SPEC27-REBUILD-PROMPT.md`. Until then, FP-E/FP-H stay OPEN by design; the 55-row ledger reaching all-VERIFIED is gated on it. Do NOT let them be silently rolled into "residue".

## Stage-1 build prerequisites (council C5 — must be green BEFORE the relevant commit)
- **canonical_slot backfill — NOT A GATE (D194); DONE as metadata.** The cross-node dispatch does NOT find the parent's per-slot box attrs by `canonical_slot` — structural box CSS routes NAME-FREE via layer-prefix + `property_suffixes` (D194). F1-cross-node has **no dependency** on this backfill. The ~41 content-area rows (`contentWidth`/`contentPadding*`) are tagged `canonical_slot='content'` + `role='layout'` as convention-consistent metadata only, maintained deterministically by `/sgs-update` Stage 1 `assign-canonical.py` (the throwaway `seed-canonical-slots.py` was deleted as redundant parallel infra). Status: **DONE-as-metadata, not a pre-commit gate.** Design-gate: `WRAPPER-CSS-ROUTING-DESIGN-GATE.md`.
- **Gate identity (no doc may say `is_class_section_block` for the composite-interior carve-out).** The live gates are `db.has_scalar_media_attrs(slug)` (`convert.py:2940`) + `_is_container_mirror_block` (`:2950`); the XS-3 guard is `fold_eligible` (`_process_container_children:3857`). Corrected across all docs 2026-06-09.

## Uncaptured residue (council Completeness — must stay visible)
- **Mobile/tablet defects** — the source review was DESKTOP-ONLY. The responsiveness *failure-mode* is captured (F4 + per-device CSS vars), and universal fixes apply to all devices — but the **375/768 verification pass at Stage 3 may surface device-specific defects** not in this ledger. Add them here when found.
- **FP-F drift guard** — the binding fix shipped, but its `generate-extension-attributes.js --check` is only wired to prebuild, not CI/pre-commit. Confirm the pre-commit wiring (memory `dont-claim-a-guard-is-enforced-unless-wired`).
- Any new issue found during build/verify gets a row here — the ledger is the single close-out source.
