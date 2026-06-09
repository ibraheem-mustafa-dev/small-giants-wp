---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Reference-accuracy sweep — every file:line + DB ref verified against live source (2026-06-09)"
created: 2026-06-09
status: COMPLETE. 4 parallel agents verified ~90 citations across the wave-1 reports + wave-2 planning docs. Build-critical (wave-2) + genuine-error (phantom) drifts FIXED inline. Wave-1 line-drift (pre-HC2 snapshots) governed by the line-number policy below.
---

# Reference-accuracy sweep

## Line-number policy (project convention — `cloning-pipeline-stages.md` line_number_policy)
Script line numbers drift as the converter evolves (HC2's commit shifted `hero/render.php` ~+6-15 lines; other files moved similarly). **The named function / constant / gate is authoritative — grep the symbol if a cited line is off.** All symbol *names* in these docs were verified to EXIST at the stated location ±a few lines; the symbols are correct. DB refs were re-verified current via `sgs-db.py`.

## FIXED inline (build-critical — wave-2 planning docs)
| doc | was | now |
|---|---|---|
| CLONE-FIX-BUILD-PLAN.md ×2 | "46-row ledger" | "55-row ledger" (ledger's actual tracked count) |
| CLONE-FIX-BUILD-PLAN.md / STAGE1-HANDOFF | `_collect_css_decls_for_element(node)` `:2872` | `:2871` (`:2872` is the `_lift_wrapper_css_to_container_attrs` sibling call) |
| SIGN-OFF-LEDGER.md | contentWidth NULL "across 14 blocks" | "across 28 blocks" (~41 total rows still correct) |
| STAGE0-FRS-AND-GATE.md | `_BREAKPOINT_RULES` "at convert.py:3317-3318" | `_BREAKPOINT_RULES` at `db_lookup.py:1233-1239`; `:3317-3318` is `_GRID_DESKTOP_BP`/`_GRID_TABLET_BP` only |
| (earlier this session) all docs | composite-interior gate `is_class_section_block` / guard `:2956` | gate `has_scalar_media_attrs:2940` + `_is_container_mirror_block:2950`; guard `fold_eligible:3857` |

## FIXED inline (genuine PHANTOMS — wrong file / non-existent symbol, wave-1 reports)
| doc | phantom | corrected to |
|---|---|---|
| 04a-featured-product-styling FP-G | `class-sgs-container-wrapper.php:37` "border: 1px solid …" | the border rule is in `product-card/style.css:37` (wrong file — `:37` of the wrapper class is `*/` end-of-docblock) |
| 04a2-featured-product-styling FP-M | `_TYPOGRAPHY_CSS_TO_ATTRS` constant in convert.py | no such constant — it's the local `prop_map` dict at `convert.py:1321-1331` (font-family genuinely absent from it ✓) |
| 05-ingredients IN-F | `convert.py:2416-2431 resolve_slug_from_bem` maps disclaimer→notice-banner | `resolve_slug_from_bem` is in `db_lookup.py` (not convert.py); `:2416-2431` is the `_route_composite_interior` docstring |
| 07a-social-proof SP-D | `sgs/testimonial` has `nameFontSize`/`nameFontSizeMobile`/`nameFontSizeTablet` attrs read at render.php:115-124 | those attrs DO NOT EXIST in `block_attributes` for `sgs/testimonial`, and render.php does not read them — the SP-D font-size fix must target the CHILD `sgs/text`/the slider, not phantom parent attrs |
| 01-hero H-C (now stale, not a phantom) | hero `textAlignDesktop/Mobile/Tablet` "inert / never read in render.php" | HC2 (D192) WIRED them — now read `render.php:204-206`, emitted `:480-487`. The H-C2 row in the family map already records this as SHIPPED; the 01-hero snapshot pre-dates it |

## Wave-1 line-drift inventory (snapshots; symbol-authoritative per the policy above)
~45 citations where the named symbol is correct but the line drifted ±2-15 (files moved post-Wave-1). Representative (full list in the 2026-06-09 sweep-agent returns): 01-hero render.php cites (214→210, 275-282→290-300, 393-400→391-401, 162-191→155-183, 193-206→185-198, 384-398→383-396, 435-448→433-446, 451-467→450-464, 828-855→843-870); 02-trust-bar convert.py cites (2950-2971→2950-2972, 3548-3578→3548-3583, 2291-2323→2301/2314, 960-969→966-968); 03-brand (3333-3411→3333-3414, 2099-2104→2099-2103); 04a heading cites (style.css 5-9→7-9, render.php 197-200→198-200, product-card style.css 676→679); 04b (card-grid-variations 76→132, block.json 163→162, product-card render.php 95-98→109); 05 (convert.py 869/971→981); 06a (label render.php 103 = conditional not literal); 06b (button render.php 247-254 = button element not wrapper div); 07b (testimonial render.php avatar block 130-161→120-149, 147→135, 157-159→145-146, 160→148, 163→151, 164→152, 201→189; slider 60-61→40, 127→123); 08-binding (edit.js 464-467→477-480, 267/462→268/475).

**These do not block the build** (the build uses the wave-2 docs, now accurate, + grep-by-symbol). If a future session needs a Wave-1 cite, grep the named symbol. To fully re-baseline the snapshots on demand, the corrected lines above are the source.
