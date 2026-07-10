---
doc_type: next-session-prompt
project: small-giants-wp
track: E — product-card (complex, dedicated window)
model: parallel EDIT track (worktree, files-only) of the split-edit/serial-land rollout
generated: 2026-07-10
---

# TRACK E — no-inline rollout: sgs/product-card (the complex dual-mode block)

Invoke `/autopilot` first. You are ONE parallel EDIT track of the no-inline styling rollout
(`.claude/plans/2026-07-10-no-inline-parallel-rollout.md` = the MASTER plan). You migrate ONLY
`sgs/product-card`, in your OWN git worktree, FILES ONLY — you do NOT deploy, harness, seed the DB,
or commit to `main`. A separate INTEGRATION session lands everything. The hard architecture is DONE +
LANDED (D294–D298). product-card gets its OWN window because it is the most complex block: dual-mode
(typed / WooCommerce-bound), `arrayContentLift`, `imageControls`, F3 debt, an option-picker child,
a value-ladder, and a big view.js store.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/plans/block-migration-DONE-checklist.md` — the 11 end conditions.
2. `.claude/plans/2026-07-09-per-block-no-inline-migration-contract.md` — clauses A–G (verbatim), §E2 (F3 DRAIN).
3. `.claude/decisions.md` head — D294 (pattern) + D298 (Wave 2 + STOP-69 + F3 var()-fallback lesson) + D275/D284 (product-card's current typed/bound architecture — legacy InnerBlocks PURGED; typed built-in elements).
4. Spec 31 §3.A/§4/§13.4/§13.6 + Spec 32 §6.1 + Spec 27 (product/WooCommerce master) — read Spec 31 IN FULL.
5. **Exemplars:** `src/blocks/hero` (keep-wrapper composite + per-area families) + `src/blocks/quote` (content-KIND). product-card's own `render.php` (typed + bound paths) is ground truth for how it styles its built-in elements (`sgs_button_element_style_css` for cta*, the price/desc typography).

## ⛔ THE SHARED-RESOURCE PROTOCOL (obey exactly)
1. **Own worktree/branch.** `git worktree add ../sgs-track-E -b feat/no-inline-track-E` off `main`. Work ONLY there.
2. **Files ONLY, product-card dir ONLY.** Edit `src/blocks/product-card/*`. Do NOT touch: `scripts/sgs-update-v2.py`, `scripts/hardcoded-render-defaults-baseline.json` (report F3; integrator edits baseline), `includes/*` (shared helpers incl. `helpers-button-style.php` — REUSE, never edit), any other block, `build/`.
3. **You MAY use ≥1 solo subagent** but this is a single big block — consider doing it yourself (Opus) with a solo subagent for mechanical parts. Never 2+ writers on product-card files at once.
4. **Catch JS errors locally** — `npm run build` in your worktree (catches STOP-69 + parse + gates). `php -l render.php`.
5. **NO deploy, NO harness, NO /sgs-update, NO main commit.** Commit to YOUR branch only.
6. **REPORT** to `reports/no-inline-track-E-report.md` — files changed; new box-object attrs `(block, attr, family)` for CENTRAL seeding (typed + bound paths); flat attrs removed; border/shadow; per-element (title/price/desc/cta) inline → scoped; view.js inline-style check (the store must not write `.style.property`); F3 rows drained/mis-tagged; the pattern decision (block-private vs keep-wrapper) + WHY; anything you could NOT meet (STOP + report).
7. **Classification verified** — product-card is content-KIND-ish but dual-mode + arrayContentLift + option-picker child; VERIFY via DB + render whether it drops the wrapper or keeps structure. STOP-and-ask if the bound-mode structure is load-bearing.

## THE RECIPE
Flip EVERY declared styling support (product-card declares `spacing`/`color`/`__experimentalBorder`) to
`__experimentalSkipSerialization:true`; read `$attributes['style'][...]` + all custom per-element style
attrs (cta*/price/desc/title/tag) and emit scoped `.uid`/`#uid` CSS via `wp_style_engine_get_styles` +
the shared `sgs_button_element_style_css`/`sgs_typography_css_rule` helpers (REUSE, scoped). Box families →
named OBJECT attrs incl. tiers. Device tiers ONLY 1023/767 (custom → `sgsCustomCss`). F3-drain the 2
product-card baseline rows (default from render, not CSS fallback) — report mis-tags. Do BOTH typed and
bound render paths. Security + editor + no-churn per the contract. No version bump, no deprecations (D293).

## ⛔ ANTI-PATTERN STOPs
- **STOP-16** — subagent "it works" is a HYPOTHESIS; YOU re-run `npm run build`.
- **STOP-69** — no `*/` inside a JS block comment.
- **STOP-43/44** — emit-green ≠ LANDED (integration's job); a schema-valid attr can be a render no-op (esp. bound-mode + WP-native supports on a dynamic block).
- **F3 mis-tag** — never force-wire a structural/safety literal onto a named control (`P-F3-NAV-MISTAG-GATE`).
- **The dual-mode trap** — a fix that works in typed mode may not in bound mode (or vice-versa). Verify both paths in the report; the INTEGRATION session LANDS both on a live typed card AND (if feasible) a bound card.

## THIS TRACK'S ROSTER — 1 block
`product-card` — dual-mode (typed / WooCommerce-bound), arrayContentLift, imageControls, value-ladder, option-picker child, big view.js store. Run `/qc-council` before considering it done (it touches a lot of surface).

## DONE for THIS track (then hand to the INTEGRATION session)
product-card migrated on `feat/no-inline-track-E`, `php -l` clean + `npm run build` green locally, `/qc-council`
run, the report written (typed + bound paths + F3 disposition). Do NOT deploy/land/commit-to-main — tell the
operator the branch is ready. The INTEGRATION session merges → central seeds → one deploy → harness-LANDs
(typed card + bound card if feasible).

## Skills / tools
| /using-git-worktrees | your isolated worktree | | /qc-council | product-card is high-surface — validate before done |
| /qc-inline | build check | | /sgs-db /wp-blocks /sgs-clone | product-card schema + variant + WooCommerce ground truth (READ) |
| /brainstorming | a genuine design wrinkle | | /capture-lesson | a new architectural rule |
