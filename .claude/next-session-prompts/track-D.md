---
doc_type: next-session-prompt
project: small-giants-wp
track: D — composites with child items + forms + F3-drain
model: parallel EDIT track (worktree, files-only) of the split-edit/serial-land rollout
generated: 2026-07-10
---

# TRACK D — no-inline rollout: composites with child items + forms + F3-drain

Invoke `/autopilot` first. You are ONE parallel EDIT track of the no-inline styling rollout
(`.claude/plans/2026-07-10-no-inline-parallel-rollout.md` = the MASTER plan). You migrate ONLY
this track's blocks, in your OWN git worktree, FILES ONLY — you do NOT deploy, harness, seed the
DB, or commit to `main`. A separate INTEGRATION session lands everything. The hard architecture is
DONE + LANDED (D294–D298): box-object no-inline mechanism, content-KIND→block-private (D294),
grid-scoping (D296), the reusable harness, keep-structure-nav pattern (D298). You apply the PROVEN
recipe to YOUR blocks.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/plans/block-migration-DONE-checklist.md` — the 11 end conditions (definition of done per block).
2. `.claude/plans/2026-07-09-per-block-no-inline-migration-contract.md` — clauses A–G (the HOW, verbatim); ESPECIALLY §E2 (F3 DRAIN).
3. `.claude/decisions.md` head — D294 (which pattern per block) + D296 (grid-scoping) + D298 (Wave 2 + STOP-69 + the F3 var()-fallback lesson).
4. Spec 31 §3.A/§4/§13.4/§13.6 (FR-31-22 box-object, FR-31-21.1 composite-mirror + D294) + Spec 32 §6.1 — read Spec 31 IN FULL (Bean-locked every session).
5. **Exemplars to COPY:** `src/blocks/hero` + `includes/class-sgs-container-wrapper.php` (keep-wrapper). `src/blocks/quote` (content-KIND child items). For F3-drain shape, D298's mobile-nav drain (`var(--x)` from render, not a CSS fallback).

## ⛔ THE SHARED-RESOURCE PROTOCOL (this is what makes parallel safe — obey exactly)
1. **Own worktree/branch.** `git worktree add ../sgs-track-D -b feat/no-inline-track-D` off `main`. Work ONLY there. (`/using-git-worktrees`.)
2. **Files ONLY, your track's block dirs ONLY.** Edit `src/blocks/<block>/{block.json,render.php,edit.js,save.js,style.css,view.js,index.js}` for THIS track's blocks. Do NOT touch: `scripts/sgs-update-v2.py`, `scripts/hardcoded-render-defaults-baseline.json` (you REPORT F3 rows; the integrator edits the baseline), `includes/*` (shared — reuse, never edit), any other block, `build/`.
3. **One SOLO Sonnet subagent per block** (disjoint dirs → parallel-safe, FR-31-6.1/STOP-39). Never 2+ writers on a shared file. Keep parent/child pairs (accordion+item, tabs+tab, form+step+field-tiles) with ONE subagent each per block but coordinate the shape.
4. **Catch JS errors locally.** After edits run `npm run build` in your worktree (build/ is gitignored/local — catches the STOP-69 `*/`-in-JS-comment trap + parse errors + prebuild gates). `php -l` each render.php.
5. **NO deploy, NO harness, NO /sgs-update, NO main commit.** Commit block files to YOUR branch only.
6. **REPORT** to `reports/no-inline-track-D-report.md` on your branch — per block: files changed; new box-object attrs `(block, attr, family)` for CENTRAL seeding; flat attrs removed; border/shadow handling; per-item/view.js inline fixes; **F3 drain**: which baseline row(s) drained + how (attr/var from render), or which are MIS-TAGGED (structural CSS / safety clamp — do NOT force-wire; report for `P-F3-NAV-MISTAG-GATE`); the block's pattern + WHY; any clause you could NOT meet (STOP + report).
7. **Classification is per-block, verified — not assumed.** DB (`container_kind`, `wraps_block`) + D294 + reading the render. Load-bearing wrapper → KEEP + say so. STOP-and-ask if unsure.

## THE PER-BLOCK RECIPE (each block, via a solo Sonnet subagent)
Flip EVERY declared styling support (`spacing`/`color`/`__experimentalBorder`/`typography`/`shadow`) to
`__experimentalSkipSerialization:true`; read `$attributes['style'][...]` and emit scoped `.uid`/`#uid`
CSS via `wp_style_engine_get_styles`. Box families → named OBJECT attrs incl. Tablet/Mobile tiers
(remove flat per-side/per-corner + `*Unit`). Device tiers ONLY `@media max-width:1023px` + `max-width:767px`
(custom breakpoint → `sgsCustomCss`). **F3-drain (§E2):** replace a hardcoded layout/visual literal for a
property the block exposes a control for with the attr read / `var(--sgs-x)` EMITTED FROM render.php (a
`var(--x, <literal>)` CSS fallback does NOT zero the baseline row — the literal must move to render). If a
baselined row traces to structural CSS / a safety clamp, it is MIS-TAGGED — report, do NOT force-wire.
Security + editor + no-churn as per the contract. No version bump, no deprecations (D293).

## ⛔ ANTI-PATTERN STOPs (carry forward)
- **STOP-16** — a subagent "it works" is a HYPOTHESIS; YOU re-run `npm run build` (the migrator can't — shared build dir).
- **STOP-69** — NEVER write `*/` inside a JS block comment — it closes the comment early and breaks the webpack build. Space it.
- **STOP-39** — one solo coding subagent per shared file; disjoint block dirs run parallel.
- **STOP-43/44/68** — emit-green ≠ LANDED (integration's job); a schema-valid attr can be a render no-op; grid CSS is scoped ONCE in the shared wrapper (D296) — do NOT re-inline grid per block.
- **Wrapper-rip-out trap** — QC every composite decision vs the DB + D294 (default for these = KEEP the wrapper). **F3 mis-tag** — never force-wire a structural/safety-clamp literal onto a named control (`P-F3-NAV-MISTAG-GATE`).

## THIS TRACK'S ROSTER — 11 blocks (keep-wrapper composites + child pairs + F3-drain)
`accordion, accordion-item, tabs, tab, testimonial-slider, content-collection, trust-bar, pricing-table, form, form-step, form-field-tiles`
- **Parent/child pairs kept TOGETHER:** accordion+accordion-item; tabs+tab; form+form-step+form-field-tiles. A child recurses into its own content; keep the parent's structure.
- **Keep-wrapper composites** (genuine section/layout): accordion, tabs, testimonial-slider (`container_kind='layout'`), content-collection (`layout`), trust-bar (`section`), pricing-table, form (`layout`). Emit only each block's OWN extras block-private-scoped, like hero.
- **F3-drain in THIS track:** `content-collection`, `form`, `pricing-table` have hardcoded-defaults baseline rows — drain the REAL dead-control overrides (default from render, not a CSS var-fallback); report MIS-TAGGED rows rather than force-wiring.
- Interactive (accordion/tabs/testimonial-slider view.js) — confirm view.js writes only `--var`/classes, never `.style.property`.

## DONE for THIS track (then hand to the INTEGRATION session)
All 11 blocks migrated on `feat/no-inline-track-D`, each `php -l` clean + `npm run build` green locally, the
report written (incl. the F3 disposition per row). Do NOT deploy/land/commit-to-main — tell the operator the
branch is ready. The INTEGRATION session merges all track branches → central seeds + baseline edits → one
deploy → harness-LANDs everything.

## Skills / tools
| /using-git-worktrees | your isolated worktree | | /dispatching-parallel-agents | per-block solo Sonnet fan-out |
| /qc-inline | per-block build check | | /qc-council | composite render / F3-drain changes (blub-255) | | /sgs-db /wp-blocks | schema + F3 baseline ground truth (READ) |
| /brainstorming | a genuine per-block design wrinkle | | /capture-lesson | a new architectural rule |
