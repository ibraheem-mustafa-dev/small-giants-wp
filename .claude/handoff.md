---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-11
session: D307 + D308 — page-8 discrepancy programme: 5 more items fixed + LANDED (emoji, universal margin reset, option-picker tick, trustpilot, sgs/text disclaimer box)
---

# Session Handoff — 2026-07-11 (D307 + D308)

## Completed This Session

1. **D307 (`54ac3a44`, on `main`, pushed) — 4 CSS-layer page-8 fixes, LANDED live.** Each cause proven on the LIVE DOM/real node FIRST — the register (`2026-07-11-page8-discrepancy-diagnosis.md`) had the WRONG mechanism on 3 of the 4.
2. **Fix 1 — emoji size:** `sgs/icon` sized its container off `--sgs-icon-size` but had no rule for the emoji glyph → it rendered 16px in a 32px box. Added `.sgs-icon__emoji { font-size: var(--sgs-icon-size); line-height:1 }`. Universal (not the register's DB-seed theory). `icon/style.css`.
3. **Fix 3 — universal margin reset (Bean chose a THEME reset; researched):** the converter's CSS matcher `collect_css_decls_for_element` silently drops the draft's global `*{margin:0}` reset → cloned `<p>`/`<h*>` leak browser-default margins. `/research-check --tier extended` (3 researchers + WP core) proved a bare `p{margin:0}` breaks WP block-gap (gutenberg#53717), so shipped as `@layer reset { p,h1-h6,blockquote,figure,figcaption,dl,dd,pre {margin:0} }` in `core-blocks-critical.css` — yields to block-gap + block-library + block scoped/inline, still beats UA. Theme 1.5.6→1.5.7. **Block-gap verified PRESERVED** on authored `is-layout-flow` content live.
4. **Fix 7 — option-picker tick:** the WCAG `::before` tick was in-flow, reserving ~7px on every pill → wider than draft. Made it `position:absolute` (out of flow) + pill `position:relative`. Pills 96→85px, no shift on select. `option-picker/style.css`.
5. **Fix 8 — trustpilot height:** folded into Fix 3 (register's "padding defaulted" was false — bar already had correct 18/24 padding; the extra height was the leaked `<p>` item margins, gone with Fix 3). No separate fix.
6. **D308 (`8b45a417`, branch `feat/text-box-and-universal-hover`, NOT merged) — Fix 6, sgs/text disclaimer box, LANDED live.** Built via `/subagent-driven-development` (solo implementer + cross-model review + `/qc-inline`). `sgs/text` ALREADY had bg/border/radius/max-width attrs + no-inline render (register's "extend the block" was wrong); the gap was the converter OUTER resolver — `attr_for_layer_property` name-build capitalises → `BackgroundColour` ≠ the camelCase `backgroundColour`, so bg/border gapped while everything else transferred.
7. **Fix 6 mechanism (Spec 31 §3.A step 2 + step 6, D308):** additive OUTER fallback to `attr_for_property` (fires only on None + layer OUTER + attr exists — MF-4-safe, no regression) + border-width box-object merge (gated on DB `box_family`) + shared shorthand-expansion on css_pass + a **colour-slug validation guard** (code-review caught a D306-class BLOCKER: raw `var(--border)`→undefined `var(--wp--preset--color--border)`→dark; now validates against the real palette, `--border:#E8D5C0`→`border-subtle`). 7 converter files + 3 tests.
8. **Docs:** Spec 31 §3.A (both D308 mechanisms), decisions.md (D307 + D308).

## Current State
- **Branch:** `feat/text-box-and-universal-hover` at `8b45a417` (D308 code) — to be merged to main this handoff. `main` at `54ac3a44` (D307).
- **Tests:** converter suite **445 pass, 1 skip** (440 + 5 new disclaimer regression tests); no goldens touched.
- **Build:** green (F5/F6 commit gates + anti-mirror + no_slug_literal all clean).
- **Deploy:** sandybrown page 8 = fresh reclone (`…171511`) with D307 + D308 LANDED; CDN cleared.
- **Uncommitted:** the doc updates (spec 31, decisions, state, handoff, next-session-prompt) — committed + merged this handoff.

## Known Issues / Blockers
- None block next session. 3 page-8 items remain (Fix 5, Fix 2, Fix 4), each scoped + designed below.
- The register `2026-07-11-page8-discrepancy-diagnosis.md` had WRONG mechanisms on several fixes — do NOT trust it; verify on the LIVE DOM/real node before building.

## Next Priorities (in order)
1. **Fix 5 — universal hover** (Bean-directed approach; see next-session-prompt Task 1). Modify the EXISTING CSS collector to bucket `:hover`, universal across BOTH converter CSS families; deterministic `{suffix}Hover` DB derivation; shared helper hover + editor controls; wire button to the shared helper.
2. **Fix 2 — product-card CTA = full button capability** (variant + raw hex, editor + pipeline).
3. **Fix 4 — gift + trial labels padded pill box** (converter pill-style detection).

## Files Modified
| File | What changed |
|---|---|
| `plugins/sgs-blocks/src/blocks/icon/style.css` | Fix 1: emoji glyph font-size:var(--sgs-icon-size) |
| `theme/sgs-theme/assets/css/core-blocks-critical.css` | Fix 3: `@layer reset` flow-content margin reset |
| `theme/sgs-theme/style.css` | Fix 3: Version 1.5.6→1.5.7 |
| `plugins/sgs-blocks/src/blocks/option-picker/style.css` | Fix 7: tick `::before` absolute |
| `plugins/sgs-blocks/scripts/converter/{services/attr_resolve.py,db/db_lookup.py,resolvers/outer_box.py,resolvers/content_band.py,services/root_supports.py,services/css_pass.py,services/styling_helpers.py}` | Fix 6: OUTER fallback + box-object merge + shorthand expansion + slug validation |
| `plugins/sgs-blocks/scripts/converter/tests/{test_disclaimer_box_colour_border.py (new),test_draft_var_colour_resolution.py,test_css_pass_partition.py}` | Fix 6 regression tests |
| `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md`, `.claude/decisions.md`, `.claude/state.md`, `reports/visual-diff/{icon,option-picker,theme-margin-reset}-2026-07-11.md` (new) | Spec + truth + LANDED reports |

## Notes for Next Session
- **The register's mechanisms are unreliable** — 3 of 4 D307 fixes + Fix 6 had wrong causes in it. Verify on the live DOM (Playwright) or a real-node converter trace BEFORE building. This is the load-bearing lesson of the session.
- **CDN caching bit twice** — a block CSS change at an unchanged `?ver` serves stale to a browser that cached it; the origin/CDN was fine (no-store fetch confirmed). Force-reload the stylesheet or verify via `fetch(no-store)` when a CSS change "doesn't land".
- **Bean corrected the Fix 5 approach:** modify the EXISTING collector to bucket `:hover` (strip pseudo → match base → hover bucket, like the `@media` bucket), NOT a new route — AND it must be universal across BOTH CSS families (`collect_css_decls_for_element` + the per-declaration dispatch resolvers). The state-CLASS ban was removed in the button rework, but the CSS `:hover` PSEUDO-rule is still excluded (`styling_helpers.py:590`).
- **Fix 6 is on a branch that must merge to main** this handoff.

## Next Session Prompt
See `.claude/next-session-prompt.md`.
