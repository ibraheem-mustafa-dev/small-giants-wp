---
doc_type: reference
title: Doc-vs-code audit reconciliation — 2026-07-14
project: small-giants-wp
created: 2026-07-14
status: complete
---

# Doc-audit reconciliation — 2026-07-14

**Scope audited:** all of `.claude/` (architecture, specs, plans, parking, cloning-pipeline docs) + `specs/` cross-references, against live code, the SGS DB, and recent D-numbered decisions (D-ceiling D334 at time of this pass, commit `776a4c35`). `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` and `.claude/reports/2026-07-14-spec17-s9-coverage-audit.md` were explicitly OUT OF SCOPE for this pass (Bean editing those directly).

## Discrepancies found and fixed (SMALL — fixed inline)

| Doc | Discrepancy | Fix |
|---|---|---|
| `architecture.md` | Top banner said §S9 header/footer/nav blocks were "P1-P5 NOT started — design-approved, build-pending" | Corrected to BUILT + LIVE (D323-D333, §S9 11/11), pending final Bean sign-off |
| `architecture.md` | Hardcoded "74 SGS blocks (verified 2026-06-13)" in 3 places | Replaced with DB-authoritative pointers (`/sgs-db`); noted the live count is 79 as of 2026-07-14 as an illustrative figure only |
| `architecture.md` | Stale "D-ceiling D258" cited as if current | Marked explicitly as an illustrative historical example, deferred to `state.md` |
| `specs/01-SGS-THEME.md` | `parts/header.html` / `parts/footer.html` comments said they "WILL host" the new blocks "once P1/P2/P3 land — build-pending" | Corrected: they already host `sgs/site-header`/`sgs/site-footer`(+`sgs/adaptive-nav`), BUILT + LIVE |
| `specs/01-SGS-THEME.md` | "Known gap" note said `push-theme-snapshot.py` writes disk file ONLY, snapshot pushes "silently fail" | Corrected to reflect D161: push-write half SHIPPED (POSTs to `wp_global_styles` REST); only the pull round-trip + pre-deploy guard remain open (parking `P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES`, already correctly PARTIAL — no parking change needed) |
| `specs/02-SGS-BLOCKS.md` | Multiple "DESIGN-APPROVED / build-pending" framings for `sgs/site-header`/`sgs/site-footer`/`sgs/adaptive-nav` (status_history line, folder-tree comments, roster table, "Header/Footer/Nav System" H2, DB-reseed closing line) | All flipped to BUILT + LIVE (D323-D333, §S9 11/11); added a 2026-07-14 status_history line; bumped `last_verified` to 2026-07-14 |
| `specs/02-SGS-BLOCKS-REFERENCE.md` | Auto-generated file was stale (last generated 2026-07-09, 74 dynamic blocks, missing the 5 new header/footer/nav blocks) | REGENERATED successfully via `python plugins/sgs-blocks/scripts/generate-block-reference.py` — now shows 79 dynamic / 201 total blocks, including `sgs/site-header`, `sgs/site-footer`, `sgs/site-header-row`, `sgs/site-footer-row`, `sgs/adaptive-nav`. No manual edit or parking entry needed. |
| `specs/29-CONTAINER-EQUIVALENT-BLOCKS.md` | Section/layout KIND roster tables missing the 5 new blocks | Added `sgs/site-header`/`sgs/site-footer` to the `section` table and `sgs/site-header-row`/`sgs/site-footer-row`/`sgs/adaptive-nav` to the `layout` table, each flagged BUILT + LIVE |
| `specs/29-CONTAINER-EQUIVALENT-BLOCKS.md` | §1 and §4 narrative referenced a live "frozen engine" + `SGS_NEW_ENGINE=1` dual-engine model | Both notes rewritten to describe the single modular `converter/` engine (frozen tree + flag deleted at D276, 2026-07-05); frontmatter `spec_version` bumped 1.0→1.1, `last_verified` added (2026-07-14) |
| `specs/00-naming-conventions.md` | Hover-attr naming convention (`{base}Hover` suffix, D309) was undocumented despite being universally followed in code | Added new §3.5 documenting the suffix convention, the anti-pattern (prefix form), and why (zero-per-convention converter routing) |
| `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` | §6.2 said "DESIGN-APPROVED, build-pending" while §(a)/(b)/(d) documented the same feature as "BUILT + LANDED 2026-07-12" | Status line corrected to "BUILT + LANDED 2026-07-12" |
| `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` | §10 said `src/blocks/button/presets.js` "are removed" | Clarified: the file is RETAINED (reused by `sgs/product-card`'s CTA preset control) — only the button's OWN consumption of it for styling was removed |
| `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` | §6.1 cited "~52 of 59 styling-support blocks remain" — materially stale (a 2026-07-14 grep found ~63/80 block folders already migrated) | Replaced the stale count with a DB/grep-authoritative pointer + a note to re-scan before scoping; filed parking `P-NOINLINE-ROSTER-RECOUNT` |
| `plans/2026-07-09-per-block-no-inline-migration-contract.md` | §A and §F instructed emitting scoped CSS via an **ID selector `#{uid}`** — superseded by D303 (2026-07-10), which mandates a **CLASS selector `.{uid}.{block-class}`** and explicitly bans `#{uid}` | Both sections rewritten to the class-scoped form with the D303 rationale (STOP-21 — an ID-scoped rule can't be overridden by the equal-specificity `sgsCustomCss` residual), mirroring `block-migration-DONE-checklist.md`'s wording. `sgs/button`'s reference-impl line corrected from `#sgs-btn-{uid}` to `.{uid}.sgs-button` (post-D303 `83d133aa`) |
| `specs/31-UNIVERSAL-CLONING-PIPELINE.md` | §4 + §13 claimed a `block_attributes.box_side` DB column exists (`box_side = top\|right\|bottom\|left`) | Verified against the live DB schema — `block_attributes` has `box_family` only, NO `box_side` column (grep for `box_side` in the schema = 0 hits). All 3 references corrected to drop the column claim and state per-side/per-corner identity is tracked via the flat attr's naming convention, not a dedicated column. This was the ONE Spec 31 edit made per the task's constraint. |
| `cloning-pipeline-stages.md` | Stage 11.6 baseline numbers (content 77%, CSS 47/49/54%, 2026-07-04) presented without noting they predate the D315 (2026-07-12) parity-tool rebuild | Note extended to flag the pre-D315 numbers as superseded and point at D315's page-8 numbers (88% raw CSS / 79% tag / 100% content) as measured by a DIFFERENT, non-comparable instrument |

## Discrepancies found — LARGE (filed to parking, not attempted here)

None required a genuinely large rework beyond the roster-recount noted above (`P-NOINLINE-ROSTER-RECOUNT`) — every other discrepancy found in the audited scope was a status-flip / stale-note class of fix, safely handled inline. No new LARGE-bucket parking entries were needed this pass.

## Plans archived (moved `.claude/plans/` → `.claude/plans/archive/`)

Moved via PowerShell `Move-Item` (Windows ground truth per project convention):

1. `2026-07-04-converter-completion-EXECUTION.md` (shipped D276)
2. `2026-07-07-button-external-css-rearchitecture.md` (shipped D293)
3. `2026-07-12-style-tag-consolidation-design.md` (self-declared LANDED 2026-07-12)
4. `2026-07-13-header-footer-container-design-gate.md` (superseded)
5. `2026-07-13-header-builder-remaining-work.md` (shipped D326)
6. `go-rippling-cascade.md` (shipped D328)
7. `2026-07-09-styling-two-thread-programme.md` (subsumed into Spec 31/32 + rollout docs)

**Kept in `.claude/plans/` (verified still present, unmoved):** `2026-07-09-no-inline-styling-design-gate.md`, `2026-07-09-box-object-interface-contract.md`, `2026-07-10-no-inline-parallel-rollout.md`, `2026-07-13-header-footer-nav-system-design-gate.md`, `block-migration-DONE-checklist.md`, `2026-07-09-per-block-no-inline-migration-contract.md`.

## Parking entries added

- **`P-NOINLINE-ROSTER-RECOUNT`** (new, 2026-07-14, bucket: Framework / blocks, status OPEN) — Spec 32's no-inline migration roster count needs a proper re-scan; the cited "~52 of 59" estimate is materially behind the live grep (~63/80 already migrated).

No other new parking entries were required — the one other candidate (`P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES`) was checked and found already correctly reflecting PARTIAL status with the D161 detail; only the referencing note in Spec 01 was stale, not the parking entry itself.

## Docs verified accurate — no change needed

- `specs/20-CLONE-FIDELITY-MEASUREMENT.md`
- `specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md`
- `common-wp-styling-errors.md`
- `specs/30-SGS-WOOCOMMERCE-PAGE-TYPES.md` (Spec 30)
- `specs/18-*` (Spec 18)
- `specs/26-SGS-GLOBAL-STYLES-AND-THEMING.md` (Spec 26)
- `WRAPPER-CSS-ROUTING-DESIGN-GATE.md`
- `WOOCOMMERCE-PAGE-TYPE-SOLUTION.md`

## Explicitly out of scope (not touched)

- `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md`
- `.claude/reports/2026-07-14-spec17-s9-coverage-audit.md`

## Not committed

Per instructions, none of the above changes were committed. Bean to review + commit.
