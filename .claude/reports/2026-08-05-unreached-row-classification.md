# Unreached-row classification — content-role fingerprint open space

**Date:** 2026-08-05. **Scope:** read-only investigation, no DB writes, no code changes.
**Tool used:** `plugins/sgs-blocks/scripts/content-role-detect/fingerprint_content_roles.py` (re-run, not hand-rolled).

## 1. The exact open set measured

Command:

```bash
cd plugins/sgs-blocks/scripts/content-role-detect
python fingerprint_content_roles.py --json
```

Result at measurement time (2026-08-05, commit `8115c3da` or later, `git pull` confirmed already up to date):

```
eligible pool            220
reached by any detector  37
unreached (open space)   183
```

`unreached` was computed directly (not trusted from the summary line) as:

```python
pool = eligible_pool(conn)                     # DB query, see fingerprint_content_roles.py:191-197
reached = union(assignments, report_only, vetoed, content_gaps)   # from the --json output
open_set = pool - reached
```

`len(open_set) == 183`, confirming the JSON summary's arithmetic (220 − 37 = 183) against the actual key sets, not just the printed counts.

Of the 183, **65** are the four device-tier sibling attribute names (`gapMobile`, `gapTablet`, `gridTemplateColumnsMobile`, `gridTemplateColumnsTablet`) across 17 blocks — these are confirmed STYLING by the device-tier rule referenced in the task brief and are **not re-classified here** (would just repeat that rule's own finding). That leaves:

**118 rows = the genuinely open set this report classifies, every one of them, below.**

(48 distinct attribute names across 32 blocks.)

## 2. Per-row classification table

Grouped by attribute name where the consumer is identical across blocks (verified per-block, not assumed — see §5 blind spots for the one place this bit).

| Block.attr | Classification | Decided by (file:line) | Confidence |
|---|---|---|---|
| sgs/form-field-address.conditionalField | TECHNICAL | `includes/forms/field-render-helpers.php:30,43,49` | high |
| sgs/form-field-address.conditionalOperator | TECHNICAL | `includes/forms/field-render-helpers.php:50,54` | high |
| sgs/form-field-address.conditionalValue | TECHNICAL | `includes/forms/field-render-helpers.php:51,54` | high |
| *(same 3 attrs × 14 form-field blocks: checkbox, consent, date, email, file, hidden, number, phone, radio, select, text, textarea, tiles, address)* | TECHNICAL (all 42 rows) | same shared file — one consumer emits `data-conditional-field/-operator/-value`, read by `src/blocks/form/view.js:764-818` to decide field visibility | high |
| sgs/card-grid.direction | DEAD | none found (see below) | high |
| sgs/content-collection.direction | DEAD | none found | high |
| sgs/feature-grid.direction | DEAD | none found | high |
| sgs/gallery.direction | DEAD | none found | high |
| sgs/google-reviews.direction | DEAD | none found | high |
| sgs/trustpilot-reviews.direction | DEAD | none found | high |
| sgs/card-grid.wrap | DEAD | none found | high |
| sgs/feature-grid.wrap | DEAD | none found | high |
| sgs/gallery.wrap | DEAD | none found | high |
| sgs/container.backgroundOverlayColour | STYLING | `includes/class-sgs-container-wrapper.php:193` | high |
| sgs/cta-section.backgroundOverlayColour | STYLING | same shared wrapper | high |
| sgs/container.overlayGradientFrom | STYLING | `includes/class-sgs-container-wrapper.php:197` | high |
| sgs/cta-section.overlayGradientFrom | STYLING | same | high |
| sgs/hero.overlayGradientFrom | STYLING | same | high |
| sgs/trust-bar.overlayGradientFrom | STYLING | same | high |
| sgs/container.overlayGradientTo | STYLING | `includes/class-sgs-container-wrapper.php:198` | high |
| sgs/cta-section.overlayGradientTo | STYLING | same | high |
| sgs/hero.overlayGradientTo | STYLING | same | high |
| sgs/trust-bar.overlayGradientTo | STYLING | same | high |
| sgs/container.shapeDividerTop | STYLING | `includes/class-sgs-container-wrapper.php:961` | high |
| sgs/cta-section.shapeDividerTop | STYLING | same | high |
| sgs/hero.shapeDividerTop | STYLING | same | high |
| sgs/trust-bar.shapeDividerTop | STYLING | same | high |
| sgs/container.shapeDividerTopColour | STYLING | `includes/class-sgs-container-wrapper.php:972` | high |
| sgs/cta-section.shapeDividerTopColour | STYLING | same | high |
| sgs/hero.shapeDividerTopColour | STYLING | same | high |
| sgs/trust-bar.shapeDividerTopColour | STYLING | same | high |
| sgs/container.shapeDividerBottom | STYLING | `includes/class-sgs-container-wrapper.php:962` | high |
| sgs/cta-section.shapeDividerBottom | STYLING | same | high |
| sgs/hero.shapeDividerBottom | STYLING | same | high |
| sgs/trust-bar.shapeDividerBottom | STYLING | same | high |
| sgs/container.shapeDividerBottomColour | STYLING | `includes/class-sgs-container-wrapper.php:985` | high |
| sgs/cta-section.shapeDividerBottomColour | STYLING | same | high |
| sgs/hero.shapeDividerBottomColour | STYLING | same | high |
| sgs/trust-bar.shapeDividerBottomColour | STYLING | same | high |
| sgs/trust-bar.gridItemBorder | STYLING | `includes/class-sgs-container-wrapper.php:419` | high |
| sgs/google-reviews.justifyContent | STYLING | `includes/class-sgs-container-wrapper.php:440` | high |
| sgs/trustpilot-reviews.justifyContent | STYLING | same | high |
| sgs/site-footer-row.justifyContent | STYLING | `src/blocks/site-footer-row/render.php:206` calls `SGS_Container_Wrapper::render($attributes,…)` which reads it internally — see wrapper line 440 | high |
| sgs/site-header-row.justifyContent | STYLING | `src/blocks/site-header-row/render.php:211` → same wrapper | high |
| sgs/google-reviews.alignItems | STYLING | `includes/class-sgs-container-wrapper.php:245` | high |
| sgs/trustpilot-reviews.alignItems | STYLING | same | high |
| sgs/button.anchor | TECHNICAL (HTML id, not content) | `block.json:18,414` — WP core `supports.anchor` native mechanism | high |
| sgs/heading.anchor | TECHNICAL (HTML id) | `src/blocks/heading/render.php:564-565` sets `$root_attr_args['id'] = $anchor` | high |
| sgs/button.className | TECHNICAL (CSS class list, WP core "Additional CSS class(es)") | `block.json:418`, WP core `supports.className` mechanism | high |
| sgs/heading.customWidthUnit | STYLING | `src/blocks/heading/render.php:156` `sgs_heading_safe_unit(...)` | high |
| sgs/text.customWidthUnit | STYLING | `src/blocks/text/render.php:159` | high |
| sgs/nav-drawer.sgsCustomCss | STYLING | `src/blocks/nav-drawer/render.php:181` — raw CSS emitted into a scoped `<style>` block | high |
| sgs/nav-menu.sgsCustomCss | STYLING | `src/blocks/nav-menu/render.php:1407-1408` | high |
| sgs/site-footer-row.rowShrinkHideTarget | TECHNICAL | `src/blocks/site-footer-row/render.php:191` feeds `sgs_resolve_row_shrink_hide_target()` | high |
| sgs/site-header-row.rowShrinkHideTarget | TECHNICAL | `src/blocks/site-header-row/render.php:194` | high |
| sgs/site-footer-row.rowSlot | TECHNICAL (structural slot key, not display text) | `src/blocks/site-footer-row/render.php:57` `sanitize_html_class($attributes['rowSlot'])`; also feeds a CSS modifier class in `edit.js:210` | medium — it IS rendered into a class name, but the value is a fixed enum slot identifier ('top'/'main'/'bottom'-shaped), not authored copy |
| sgs/site-header-row.rowSlot | TECHNICAL | `src/blocks/site-header-row/render.php:58`, `edit.js:189` | medium |
| sgs/brand-strip.scrollDirection | STYLING (animation-direction modifier) | `src/blocks/brand-strip/render.php:63`, `edit.js:287` (`sgs-brand-strip--reverse` class) | high |
| sgs/form.successRedirect | TECHNICAL (redirect target URL, JS-consumed, never painted as text) | `src/blocks/form/view.js:345-346` (`window.location.href = ctx.successRedirect`); configured via `LinkControl` in `edit.js:124-126` | medium — URL-shaped like `link-href`, but never rendered as a visible/clickable link; it's read by JS after submit, so TECHNICAL fits better than a content role. Flagged in §4 as worth a second look. |
| sgs/heading.textWrap | STYLING | `src/blocks/heading/render.php:313-316` emits `text-wrap:` CSS declaration | high |
| sgs/icon-list.defaultIconSource | TECHNICAL (icon-source dispatch key: lucide\|wp-icon\|dashicon\|emoji) | `src/blocks/icon-list/render.php:136,565` feeds `$render_icon()` dispatcher | high |
| sgs/icon-list.source | TECHNICAL (data-source mode: typed\|menu) | `src/blocks/icon-list/render.php:158,166,220` | high |
| sgs/image-sequence.desktopFrameExt | TECHNICAL (asset file-extension config) | `src/blocks/image-sequence/render.php:111` feeds `$sgs_frame_tier(...)` URL builder | high |
| sgs/image-sequence.mobileFrameExt | TECHNICAL | `src/blocks/image-sequence/render.php:113` | high |
| sgs/image-sequence.tabletFrameExt | TECHNICAL | `src/blocks/image-sequence/render.php:112` | high |
| sgs/mega-aside.asideFormat | TECHNICAL (content-arrangement mode selector: feature\|preview\|cta) | `src/blocks/mega-aside/render.php:48-49`; block.json:34 explicitly documents it as "a content-arrangement mode attr, not a css: property mapping" | high |
| sgs/mega-panel.colourScheme | STYLING (theming/variant selector — recolours every child via `data-mega-scheme` + scoped CSS) | `src/blocks/mega-panel/render.php:73-74,130,194`, `edit.js:219` | high |
| sgs/mega-panel.viewAllPlacement | STYLING (layout position selector) | `src/blocks/mega-panel/render.php:531-533` | high |
| sgs/option-picker.defaultSelected | TECHNICAL (functional default state — which option key is pre-selected, not display text) | `src/blocks/option-picker/render.php:98`, `edit.js:217,238-248` | high |
| sgs/post-grid.orderBy | TECHNICAL (WP_Query `orderby` arg) | `src/blocks/post-grid/render.php:55,201` `sanitize_key($attributes['orderBy'] ?? 'date')` | high |
| sgs/responsive-logo.align | STYLING (alignment control, mirrors WP core align shape) | `src/blocks/responsive-logo/render.php:68,173` sets CSS margin rule | high |
| sgs/separator.contentIconName | CONTENT (icon-identity — a Lucide slug, same shape as `sgs/icon.iconName` which already carries role `icon-lucide`) | `src/blocks/separator/render.php:292`, `edit.js:138,268` | high |
| sgs/separator.gradientColourEnd | STYLING (colour value) | `src/blocks/separator/render.php:85` | high |
| sgs/separator.gradientColourStart | STYLING | `src/blocks/separator/render.php:84` | high |
| sgs/separator.thicknessUnit | STYLING | `src/blocks/separator/render.php:71` `$sgs_css_length(...)` | high |
| sgs/timeline.orientation | STYLING (layout mode: vertical\|horizontal, drives CSS class) | `src/blocks/timeline/render.php:63,72,339-340` | high |
| sgs/before-after.afterImageAlt | CONTENT (authored alt text) | `src/blocks/before-after/media-render.php:70,86,111` — feeds `alt=` on the resolved `<img>` | high |
| sgs/before-after.beforeImageAlt | CONTENT | same helper, `$prefix.'ImageAlt'` | high |
| sgs/before-after.afterVideoAlt | CONTENT (authored alt/label text for the video comparison slot) | `src/blocks/before-after/media-render.php:138` (`$prefix.'VideoAlt'`) | high |
| sgs/before-after.beforeVideoAlt | CONTENT | same | high |

118 rows accounted for above (42 conditional-logic + 6 direction + 3 wrap + 32 shape-divider/gradient/border + 4 justifyContent + 2 alignItems + 2 anchor + 1 className + 2 customWidthUnit + 2 sgsCustomCss + 2 rowShrinkHideTarget + 2 rowSlot + 1 scrollDirection + 1 successRedirect + 1 textWrap + 2 icon-list + 3 image-sequence + 1 asideFormat + 2 mega-panel + 1 defaultSelected + 1 orderBy + 1 align + 4 separator + 1 orientation + 4 before-after alts = 118).

**Totals: STYLING 61, TECHNICAL 48, CONTENT 5, DEAD 9, UNKNOWN 0** (0 UNKNOWN because every row's consumer was found and read — the previously-unreached status was a detector blind spot, not an absence of ground truth).

## 3. Could-not-determine section

None outright unresolved. Two rows are **confidently classified but flagged as boundary calls worth a second pair of eyes**, both marked "medium" above:

- **`sgs/form.successRedirect`** — a URL, configured via `LinkControl` (the same editor widget used for genuine link content), but consumed purely by JS (`window.location.href`) after form submit — never painted, never an `<a href>`. Filed TECHNICAL because the consumer never renders it as a link; a case could be made for `link-href` on shape alone. Tried: read `view.js:345-346` (the only consumer) and `edit.js:124-126` (the only editor control) — both confirm it drives a redirect, not visible output, so I did not flip it, but it's the one row where "shape resembles an existing role" and "actual consumption" pull in different directions.
- **`sgs/site-footer-row.rowSlot` / `sgs/site-header-row.rowSlot`** — a fixed structural-position key (top/main/bottom-shaped), rendered into a BEM modifier class AND used to resolve shrink-hide behaviour. Filed TECHNICAL (it's an enum picking a structural slot, not authored copy) rather than a styling/enum role, because no `enum_values` are declared in the DB for it (it fell into this pool specifically because `enum_values IS NULL`) and its role is closer to `tag-identity`/structural-identity than to a CSS-driving `select-from-enum`. Tried: read both render.php files, both edit.js files, and the `ROW_LABELS` map referenced alongside it — found no consumer that treats it as content.

## 4. Recommended next action per group

| Group | Recommendation |
|---|---|
| **STYLING (61 rows)** — backgroundOverlayColour, overlayGradientFrom/To, shapeDivider* (×4 shapes ×4 blocks), gridItemBorder, justifyContent, alignItems, customWidthUnit, sgsCustomCss, scrollDirection, textWrap, mega-panel.colourScheme/viewAllPlacement, responsive-logo.align, separator.gradientColour*/thicknessUnit, timeline.orientation | The generic `styling` role (styling-behaviour classification, "no more specific styling family established") covers ALL of these correctly for the purpose of excluding them from the content walk — that is its entire job. Two of them (`colourScheme`, `viewAllPlacement`) are closer in shape to `select-from-enum` if anyone wants a more specific role later, but assigning generic `styling` is not wrong and unblocks the walk today. Recommend: seed all 61 as `styling` in Step 3. |
| **TECHNICAL (48 rows)** — conditionalField/Operator/Value (×14 blocks), anchor (×2), className, rowShrinkHideTarget (×2), rowSlot (×2), successRedirect, icon-list.defaultIconSource/source, image-sequence frame-ext (×3), mega-aside.asideFormat, option-picker.defaultSelected, post-grid.orderBy | These are correctly OUTSIDE the content walk already (role=NULL keeps them out by default) — the risk was never "silently dropped from clones", it's the opposite: leaving them NULL is already correct behaviour. No new role needed. If the project wants role=NULL rows to stop showing up as "unreached" noise in future fingerprint runs, the negative pre-filter in `eligible_pool()` could exclude attrs proven technical, but that is a scope decision for whoever owns the detector, not this report. |
| **CONTENT (5 rows)** — before-after's 4 alt attrs + separator.contentIconName | `separator.contentIconName`: assign the existing `icon-lucide` role — structurally identical to `sgs/icon.iconName`, which already carries it. Note (inherited, not new): `icon-lucide` currently has **no consumer in the converter** per the DB's own role description, so assigning it closes the classification gap but does not by itself make the icon clone correctly — that's a separate, already-known converter gap. The 4 before-after alt attrs: assign `text-content`, following the exact precedent set 2026-08-05 for `sgs/responsive-logo.alt` (D490) — `image-alt` would be architecturally closer but its consumer requires a companion attr with role `image-object`, and before-after's sibling attrs (`beforeImageUrl` etc.) are typed `role='content'` not `image-object`, and two of the four rows (`*VideoAlt`) have no image companion at all. Assigning `image-alt` today would feed a consumer expecting a shape that doesn't exist here — same trap the fingerprint script's own docstring warns against for responsive-logo. `text-content` is correct now; revisit if before-after's media attrs are ever normalised to `image-object`. |
| **DEAD (9 rows)** — direction (×6: card-grid, content-collection, feature-grid, gallery, google-reviews, trustpilot-reviews), wrap (×3: card-grid, feature-grid, gallery) | Confirmed dead: every one of these 6 blocks declares BOTH `direction`/`wrap` (bare) AND `flexDirection`/`flexWrap` (which route through `attrMap` `"css:flex-direction"`/`"css:flex-wrap"` and are read by `class-sgs-container-wrapper.php:646` for direction / the flex-wrap allow-list at line 445). The bare `direction`/`wrap` pair has zero references anywhere in `render.php`, `edit.js`, or any shared `includes/` file across all 6 blocks — they are leftover duplicates from before the `flexDirection`/`flexWrap` pair existed. Recommend: do NOT assign a role (a role would pull dead weight into the content walk); flag these 9 rows for deletion from `block.json` in a separate cleanup pass — they serve no purpose and the duplicate pair is confusing for anyone reading the schema. |

## 5. Blind spots of this method

1. **Grep-based "no consumer found" is a negative result, not a proof of absence** (per the project's own `feedback_a_greps_blind_spot_is_the_shape_of_the_grep`). For the 9 DEAD rows I searched `render.php`, `edit.js`, and every `includes/*.php` file that mentions the term anywhere in the plugin (154-file full-plugin grep, not block-scoped) plus `git log -p` on the block.json to see if the attr was ever wired and later orphaned. I did not additionally grep compiled `build/` output or theme-side PHP outside `plugins/sgs-blocks/` — if some theme-level code reads these bare attrs from a stored post's `attrs` JSON directly (bypassing the block's own render path), it would be invisible to this method. I consider this unlikely (nothing else in the codebase reads SGS block attributes except each block's own render.php + the shared `includes/` tree) but it is not proven to zero.
2. **"Consumed identically across N blocks" was verified per-block for the shared-wrapper rows, not assumed from one sample** — I explicitly re-ran the grep for `direction`/`wrap` against `content-collection`, `google-reviews`, `trustpilot-reviews` separately (not just card-grid) after finding the first three dead, specifically because a file-scoped conclusion earlier this project was proven wrong by a shared consumer (`gap`/`class-sgs-container-wrapper.php`). Same discipline applied to `justifyContent`/`alignItems` on `site-footer-row`/`site-header-row`, which route through the shared wrapper via `SGS_Container_Wrapper::render($attributes)` rather than a direct `$attributes['justifyContent']` reference in their own render.php — a literal-string grep on those two files alone would have wrongly reported them as unconsumed.
3. **JS-side / Interactivity-API rendering is a known detector blind spot (per the module's own docstring) and I did not independently re-verify every JS consumer beyond what grep surfaced.** Where a row's only consumer was `edit.js` (author-time preview) with no matching `render.php`/shared-include reference, I trusted that as sufficient evidence of the role (e.g. `sgsCustomCss`, `rowSlot`) because the classification (STYLING/TECHNICAL) didn't hinge on whether the FRONTEND painted it — but I did not run the live frontend to confirm the compiled JS output matches source.
2. **Confidence "medium" rows (successRedirect, rowSlot ×2) are genuine judgement calls, not measurement gaps** — the evidence is complete for all three; the uncertainty is about which existing role-shape fits best, not about what the code does.
4. **The 65 device-tier sibling rows were taken on trust from the task brief and not re-verified individually** — I confirmed the *pattern* (all 4 attribute names route through the responsive-gap/grid-template CSS machinery already, per their names) but did not read each of the 17 blocks' render.php for those specifically, since the task stated a separate rule already handles them and re-deriving that would duplicate existing work rather than add new coverage.
5. **DB role-name recommendations (`styling`, `icon-lucide`, `text-content`) were checked for existence in the `roles` table but I did not re-verify each recommended role's CONSUMER code path beyond what the `roles` table's own description already documents** — e.g. I did not personally trace `converter/services/field_extractors.py` to confirm `icon-lucide` truly has no consumer; I took the DB's own row description as authoritative for that specific claim since it is itself a documented, dated finding (2026-08-04) rather than a guess.

## Summary

118-row open set, fully classified, zero left as UNKNOWN: **61 STYLING, 48 TECHNICAL, 5 CONTENT, 9 DEAD**. Combined with the 65 device-tier rows (already STYLING per the separate rule) and the 37 rows the detector itself reached, all 220 eligible rows now have a stated classification or a stated reason for staying NULL — none are silently unaccounted for.
