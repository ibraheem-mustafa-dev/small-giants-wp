---
doc_type: next-session-prompt
project: small-giants-wp
track: C — section/layout composites → keep-wrapper (grid family)
model: parallel EDIT track (worktree, files-only) of the split-edit/serial-land rollout
generated: 2026-07-10
---

# TRACK C — no-inline rollout: section/layout composites → KEEP-WRAPPER (like hero)

Invoke `/autopilot` first. You are ONE parallel EDIT track of the no-inline styling rollout
(`.claude/plans/2026-07-10-no-inline-parallel-rollout.md` = the MASTER plan). You migrate ONLY
this track's blocks, in your OWN git worktree, FILES ONLY — you do NOT deploy, harness, seed the
DB, or commit to `main`. A separate INTEGRATION session lands everything. The hard architecture is
DONE + LANDED (D294–D298): box-object no-inline mechanism, content-KIND→block-private (D294),
grid-scoping (D296), the reusable harness, keep-structure-nav pattern (D298). You apply the PROVEN
recipe to YOUR blocks.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/plans/block-migration-DONE-checklist.md` — the 11 end conditions (definition of done per block).
2. `.claude/plans/2026-07-09-per-block-no-inline-migration-contract.md` — clauses A–G (the HOW, verbatim).
3. `.claude/decisions.md` head — D294 (which pattern per block) + D296 (grid-scoping in the shared wrapper) + D298 (Wave 2 + STOP-69 + the F3 var()-fallback lesson).
4. Spec 31 §3.A/§4/§13.4/§13.6 (FR-31-22 box-object, FR-31-21.1 composite-mirror + D294) + Spec 32 §6.1 — read Spec 31 IN FULL (Bean-locked every session).
5. **Exemplars to COPY:** `src/blocks/hero` + `includes/class-sgs-container-wrapper.php` (section/layout composite → KEEP the already-scoped wrapper — THE reference for this track). `src/blocks/quote` if a block turns out content-KIND.

## ⛔ THE SHARED-RESOURCE PROTOCOL (this is what makes parallel safe — obey exactly)
1. **Own worktree/branch.** `git worktree add ../sgs-track-C -b feat/no-inline-track-C` off `main`. Work ONLY there. (`/using-git-worktrees`.)
2. **Files ONLY, your track's block dirs ONLY.** Edit `src/blocks/<block>/{block.json,render.php,edit.js,save.js,style.css,view.js,index.js}` for THIS track's blocks. Do NOT touch: `scripts/sgs-update-v2.py`, `scripts/hardcoded-render-defaults-baseline.json`, `includes/*` (shared helpers — reuse, never edit; the wrapper is already fully scoped D292/294/296), any other block, `build/`.
3. **One SOLO Sonnet subagent per block** (disjoint dirs → parallel-safe, FR-31-6.1/STOP-39). Never 2+ writers on a shared file.
4. **Catch JS errors locally.** After edits run `npm run build` in your worktree (build/ is gitignored/local — catches the STOP-69 `*/`-in-JS-comment trap + parse errors + prebuild gates). `php -l` each render.php.
5. **NO deploy, NO harness, NO /sgs-update, NO main commit.** Commit block files to YOUR branch only.
6. **REPORT** to `reports/no-inline-track-C-report.md` on your branch — per block: files changed; new box-object attrs `(block, attr, family)` for CENTRAL seeding; flat attrs removed; border decision; shadow handling; per-item/view.js inline fixes; the block's pattern + WHY; any clause you could NOT meet (STOP + report — never guess-wire).
7. **Classification is per-block, verified — not assumed.** Use the DB (`container_kind`, `wraps_block`) + D294 + reading the block's render. If a wrapper is load-bearing, KEEP it + say so. STOP-and-ask if unsure.

## THE PER-BLOCK RECIPE (each block, via a solo Sonnet subagent)
Flip EVERY declared styling support (`spacing`/`color`/`__experimentalBorder`/`typography`/`shadow`) to
`__experimentalSkipSerialization:true`; read `$attributes['style'][...]` and emit scoped `.uid`/`#uid`
CSS via `wp_style_engine_get_styles`. Box families (padding/margin/borderWidth/borderRadius) → named
OBJECT attrs incl. Tablet/Mobile tiers (remove flat per-side/per-corner + `*Unit`). Device tiers ONLY
`@media max-width:1023px` + `max-width:767px` (custom breakpoint → `sgsCustomCss`). Security: keyword
attrs `[^a-zA-Z-]`, lengths `[^A-Za-z0-9.%]`, `<style>` via `wp_strip_all_tags`. Editor: box families via
`ResponsiveBoxControl`/`ResponsiveBorderRadiusControl`, typography via shared `TypographyControls`; no dead
controls. No version bump, no deprecations (D293).

## ⛔ ANTI-PATTERN STOPs (carry forward)
- **STOP-16** — a subagent "it works" is a HYPOTHESIS; YOU re-run `npm run build` (the migrator can't — shared build dir).
- **STOP-69** — NEVER write `*/` inside a JS block comment (e.g. `style.spacing.*/style.border`) — it closes the comment early and breaks the webpack build. Space it.
- **STOP-39** — one solo coding subagent per shared file; disjoint block dirs run parallel.
- **STOP-43/44/68** — emit-green ≠ LANDED (integration's job); a schema-valid attr can be a render no-op; grid CSS is scoped ONCE in the SHARED wrapper (D296) — do NOT re-inline grid per block.
- **Wrapper-rip-out trap** — a migrator may unilaterally drop a wrapper; QC every composite decision vs the DB + D294. For THIS track the DEFAULT is KEEP the wrapper (genuine grid/section, like hero); emit only the block's OWN extras block-private-scoped. `modal` is `container_kind='section'` + `containerMirror:false` (keep-structure, like mobile-nav).

## THIS TRACK'S ROSTER — 8 blocks (section/layout composites → KEEP the scoped wrapper, like hero)
`card-grid, feature-grid, cta-section, gallery, post-grid, google-reviews, trustpilot-reviews, modal`
- Pattern: genuine grid/section → KEEP the (already-scoped) `SGS_Container_Wrapper`; emit ONLY the block's OWN extras (per-area families, colours-as-vars, its own box) block-private-scoped, like hero. Do NOT re-inline grid (D296 scopes it in the shared wrapper).
- `cta-section` carries `shadow` (scope it, not a box family). `modal` is section-KIND + `containerMirror:false` → keep-structure.
- `card-grid`/`feature-grid`/`post-grid`/`gallery` are grid composites — their per-item box CSS folds to `gridItem*` defaults; keep the arrangement in the wrapper.
- Several have view.js (gallery lightbox, google/trustpilot carousels) — confirm view.js writes only `--var`/classes, never `.style.property`.

## DONE for THIS track (then hand to the INTEGRATION session)
All 8 blocks migrated on `feat/no-inline-track-C`, each `php -l` clean + `npm run build` green locally, the
report written. Do NOT deploy/land/commit-to-main — tell the operator the branch is ready. The INTEGRATION
session (see the MASTER plan) merges all track branches → central seeds → one deploy → harness-LANDs everything.

## Skills / tools
| /using-git-worktrees | your isolated worktree | | /dispatching-parallel-agents | per-block solo Sonnet fan-out |
| /qc-inline | per-block build check | | /qc-council | any composite touching shared render (blub-255) | | /sgs-db /wp-blocks | schema ground truth (READ) |
| /brainstorming | a genuine per-block design wrinkle | | /capture-lesson | a new architectural rule |
