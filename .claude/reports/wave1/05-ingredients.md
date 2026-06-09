# Wave-1 Fact-Finder — Ingredients Section (05-ingredients.md)

Generated: 2026-06-08. FACTS ONLY — no root-cause, no solutions, no interpretation beyond what the code/data literally states.

---

## IN-A — Label, heading and text alignment set to inherited; alignment not transferred

### Issue (verbatim)
"Label, heading and text are set to inherited for alignment. Heading is correctly center aligned since that is the default and the label and text are wrong since their default is left alignment. This is a global issue for all blocks that deal with some form of text, they just don't get these CSS rules moved over."

### DRAFT facts
- `index.html` line 506: `.sgs-ingredients-section__inner { max-width: 960px; margin: 0 auto; text-align: center; }` — `text-align: center` is set on the PARENT wrapper, not on the label or text elements themselves.
- `index.html` lines 44–52: `.sgs-section-heading__label { font-size: 12px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text); margin-bottom: 6px; display: block; }` — NO `text-align` property declared directly on `.sgs-section-heading__label`.
- `index.html` lines 508–513: `.sgs-ingredients-section .sgs-section-heading__intro { font-size: 16px; color: var(--text-muted); margin: 0 auto 36px; max-width: 540px; }` — NO `text-align` property declared directly on `.sgs-section-heading__intro`.
- `index.html` lines 507: `.sgs-ingredients-section h2 { font-size: 28px; font-weight: 600; color: var(--text); margin-bottom: 8px; }` — NO `text-align` property declared directly on `h2`.
- Draft DOM (lines 913–916): `<span class="sgs-section-heading__label">`, `<h2>`, `<p class="sgs-section-heading__intro">` — none carry inline `style="text-align:..."` attributes.

### CLONE facts
- Clone line 876: `<span style="margin-bottom:6px;--sgs-label-colour:var(--wp--preset--color--text);...;--sgs-label-text-transform:uppercase;..." class="wp-block-sgs-label has-text-color" id="sgs-lbl-43e15767">` — no `text-align` in inline style.
- Clone line 877–880: `<div class="wp-block-sgs-heading"><h2 class="wp-block-sgs-heading__text" style="color:var(--wp--preset--color--text);font-size:28px;font-weight:600;line-height:1.2">` — no `text-align` in inline style or block attrs.
- Clone line 882: `<p style="color:var(--wp--preset--color--text-muted);font-size:16px" class="wp-block-sgs-text">` — no `text-align` in inline style.
- Clone line 657 (inline `<style>` block): `.page-id-8 .sgs-section-heading__label{ font-size: 12px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text); margin-bottom: 6px; display: block }` — no `text-align`.
- Clone line 722: `.page-id-8 .sgs-ingredients-section__inner{ max-width: 960px; margin: 0 auto; text-align: center }` — `text-align: center` IS present in the variation CSS for the container inner div, but the individual leaf blocks (sgs/label, sgs/text, sgs/heading) do not have `textAlign` in their emitted attrs.

### DB facts
- `sgs/label` has attr `textAlign` (string, default: `""`) — `db: block_attributes WHERE block_slug='sgs/label' AND attr_name='textAlign'`.
- `sgs/heading` has attr `textAlign` (string, default: `""`) — `db: block_attributes WHERE block_slug='sgs/heading' AND attr_name='textAlign'`.
- `sgs/text` has attr `textAlign` (string, default: `""`) — `db: block_attributes WHERE block_slug='sgs/text' AND attr_name='textAlign'`.
- `sgs/info-box` has attrs `textAlignDesktop` (string, `""`), `textAlignMobile` (string, `""`), `textAlignTablet` (string, `""`) — no base `textAlign`. No `textAlignDesktop/Tablet/Mobile` on sgs/label or sgs/text.
- `db_lookup.py` lines 1101–1103: `_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS` tuple includes `"text-align"` — `text-align` IS in the typography lift scope.
- `db_lookup.py` lines 1137–1143: fallback `_FALLBACK` list includes `("text-align", "textAlign", None)` — maps CSS `text-align` → block attr `textAlign`.

### SPEC-DOC refs
- `convert.py` lines 1400–1566 (`_lift_typography_to_block_attrs`): lifts typography CSS props (including `text-align`) from `_collect_css_decls_for_element` onto leaf block attrs. Only lifts CSS properties that are **present on the element itself** (line 1440: `base_decls, bp_decls = _collect_css_decls_for_element(node, css_rules)`). The function relies on `_collect_css_decls_for_element` returning `text-align` as a base_decl for the node.
- `convert.py` lines 547–694 (`_collect_css_decls_for_element`): matches CSS selectors against the element's classes and tag. Selector `.sgs-ingredients-section__inner` does NOT match `<span class="sgs-section-heading__label">` or `<p class="sgs-section-heading__intro">` — those are child elements; `_collect_css_decls_for_element` does NOT traverse parent rules for inherited properties. `text-align: center` on the inner container is thus not returned in `base_decls` for the child label/text nodes.

### PIPELINE-LOCATION refs
- `convert.py` line 2847: `typo_lift = _lift_typography_to_block_attrs(node, slug, css_rules)` — call site for leaf blocks.
- `db_lookup.py` lines 1101–1103, 1143: `text-align` in lift scope and fallback map.
- `convert.py` lines 547–694: `_collect_css_decls_for_element` — collects CSS for an element from its own selectors only; does not resolve inherited properties from parent selectors.

---

## IN-B — Padding between sgs-section-heading__intro and sgs-feature-grid missing in clone

### Issue (verbatim)
"Padding between sgs-section-heading__intro and sgs-feature-grid" (missing in clone)

### DRAFT facts
- `index.html` lines 508–513: `.sgs-ingredients-section .sgs-section-heading__intro { font-size: 16px; color: var(--text-muted); margin: 0 auto 36px; max-width: 540px; }` — `margin: 0 auto 36px` includes `margin-bottom: 36px`, which creates 36px of spacing between the intro paragraph and the feature grid below it.
- Draft DOM line 916: `<p class="sgs-section-heading__intro">Every Zookie contains the same four galactagogues...` — the paragraph element carries class `sgs-section-heading__intro`.

### CLONE facts
- Clone line 882: `<p style="color:var(--wp--preset--color--text-muted);font-size:16px" class="wp-block-sgs-text">Every Zookie contains the same four galactagogues...` — inline style contains `color` and `font-size` only. No `margin-bottom`, no `margin: 0 auto 36px`.
- Clone line 724: `.page-id-8 .sgs-ingredients-section .sgs-section-heading__intro{ font-size: 16px; color: var(--text-muted); margin: 0 auto 36px; max-width: 540px }` — this variation CSS rule IS present in the cloned page's `<style>` block, but the emitted block is `wp-block-sgs-text` which carries class `wp-block-sgs-text`, NOT `sgs-section-heading__intro`. The variation CSS therefore does not apply to the emitted `sgs/text` block because the block's DOM class does not match the selector.

### DB facts
- `sgs/text` has attrs `marginBottom` (number, default: `None`), `marginBottomMobile` (number, default: `None`), `marginBottomTablet` (number, default: `None`), `marginUnit` (string, default: `"px"`) — margin attrs exist on the block.

### SPEC-DOC refs
- `convert.py` lines 1400–1566 (`_lift_typography_to_block_attrs`): lifts typography CSS props — `margin` is not in `_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS` (lines 1101–1103; only: `font-size`, `line-height`, `letter-spacing`, `font-weight`, `font-style`, `text-align`). Margin is therefore not lifted via the typography path.
- `convert.py` line 697: `_lift_root_supports_to_style` — lifts WP native supports (spacing, border, colour) onto `style.*` paths; does not lift margin onto flat `sgs/text` attrs.

### PIPELINE-LOCATION refs
- `db_lookup.py` lines 1101–1103: `_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS` — `margin` is absent from this tuple.
- `convert.py` lines 869, 971–1143 (`_lift_wrapper_css_to_container_attrs`): margin/padding lift onto container attrs — applies to wrapper containers, not to leaf text blocks.

---

## IN-C — Ingredients grid is 2×2 in clone; draft is 4 boxes in one row

### Issue (verbatim)
"The ingredients grid is 2x2 on the clone but on the draft it's 4 boxes in one row."

### DRAFT facts
- `index.html` line 514: `.sgs-feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; }` — base (mobile) layout: 2 columns.
- `index.html` line 544: `@media (min-width: 600px) { .sgs-feature-grid { grid-template-columns: repeat(4, 1fr); } }` — at ≥600px: 4 columns.
- Draft DOM lines 918–939: 4 `<div class="sgs-info-box">` children inside `.sgs-feature-grid`.

### CLONE facts
- Clone line 883–888: `<style>#sgs-fg-12.sgs-feature-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; align-items: stretch; justify-items: stretch; }</style>` — the render.php `auto-flex` mode emits `auto-fill minmax(240px, 1fr)` grid. At viewport widths where 240px×4 < container width, this auto-fills to 4 columns; at smaller widths it wraps.
- Clone line 889: `<div style="margin-bottom:24px;gap:14px;display:grid;grid-template-columns:1fr 1fr;align-items:start" class="...sgs-feature-grid sgs-feature-grid--auto-flex...sgs-cols-2 sgs-cols-tablet-2 sgs-cols-mobile-1...">` — container wrapper's inline style has `grid-template-columns:1fr 1fr` (the base/mobile value from the draft CSS); classes show `sgs-cols-2`.
- Clone line 299–300 (global feature-grid block CSS): `.sgs-feature-grid{display:grid;gap:24px}.sgs-feature-grid--auto-flex{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}` — block default CSS uses `auto-fill minmax(240px,1fr)` for `--auto-flex` modifier.

### DB facts
- `sgs/feature-grid` attrs: `layoutMode` (string, default: `"auto-flex"`), `columnsDesktop` (number, default: `0`), `columnsMobile` (number, default: `1`), `columnsTablet` (number, default: `2`), `gridTemplateColumns` (string, default: `""`), `gridTemplateColumnsTablet` (string, default: `""`), `gridTemplateColumnsMobile` (string, default: `""`), `minItemWidth` (number, default: `240`), `minItemWidthUnit` (string, default: `"px"`).

### SPEC-DOC refs
- `convert.py` lines 3309–3411 (`_collect_responsive_grid_from_css`): maps mockup `@media (min-width: 600px) { grid-template-columns: repeat(4, 1fr) }` → `desktop_cols = "repeat(4, 1fr)"` (only one breakpoint, 600px ≥ `_GRID_TABLET_BP=600` and < `_GRID_DESKTOP_BP=1024` → also `tablet_cols = "repeat(4, 1fr)"`; since equal, `gridTemplateColumnsTablet` not set; `gridTemplateColumnsMobile = "1fr 1fr"` from base). `gridTemplateColumns = "repeat(4, 1fr)"` would be set in the result dict.
- `convert.py` lines 3516–3524: `columns` integer is extracted from `repeat(N, 1fr)` patterns via `_parse_repeat_columns`; `repeat(4, 1fr)` → `columns = 4`.
- `plugins/sgs-blocks/src/blocks/feature-grid/render.php` lines 21–24, 79–118: when `layoutMode = 'auto-flex'` (the default), render.php emits `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))` regardless of `columnsDesktop`/`gridTemplateColumns` attrs. When `layoutMode != 'auto-flex'`, it uses `repeat($columns_desktop, 1fr)` at desktop, `repeat($columns_tablet, 1fr)` at tablet, `repeat($columns_mobile, 1fr)` at mobile.
- The clone's `layoutMode` is `auto-flex` (the default, not overridden by the converter) and `minItemWidth=240` (default). The inline style on the wrapper element (`grid-template-columns:1fr 1fr`) comes from the `SGS_Container_Wrapper::render()` call with `columnsDesktop` defaulting or set to 2.

### PIPELINE-LOCATION refs
- `convert.py` lines 3333–3411 (`_collect_responsive_grid_from_css`): responsive column extraction.
- `plugins/sgs-blocks/src/blocks/feature-grid/render.php` lines 79–119: `layoutMode` branch determines which grid CSS is emitted.

---

## IN-D — Emojis missing from info boxes; default star icons shown instead

### Issue (verbatim)
"Emojis are missing from info boxes and have default star icons."

### DRAFT facts
- `index.html` lines 920, 925, 930, 935: four `<div class="sgs-info-box__icon" aria-hidden="true">` elements contain emoji characters directly: `🌾`, `🍺`, `🌿`, `🌱`.
- No `<svg>` or icon name in the draft — these are plain Unicode emoji text nodes inside the `sgs-info-box__icon` div.

### CLONE facts
- Clone lines 891, 900, 909, 918 (one per info-box): each emits a `sgs/icon` block with `class="sgs-icon--source-lucide wp-block-sgs-icon"`, `aria-label="star"`, rendering `<svg class="lucide lucide-star">` — the Lucide `star` icon (the `sgs/icon` block's default `iconName` attr value).
- Clone line 891: `<a href="http://🌾" class="sgs-icon__link" aria-label="star">` — the emoji character `🌾` has been placed in the `linkUrl` attr (`href`) rather than as `emojiChar`. The resolved icon is still `lucide-star`.
- Clone lines 891–897 (info-box 1): `<div style="margin-bottom:10px;--sgs-icon-size:32px;color:var(--wp--preset--color--primary);..." class="...sgs-icon--source-lucide wp-block-sgs-icon">` — `iconSource` is `lucide`, `iconName` is `star` (default), `emojiChar` is empty.

### DB facts
- `sgs/icon` attrs: `iconName` (string, default: `"star"`), `iconSource` (string, default: `"lucide"`), `emojiChar` (string, default: `""`).
- `sgs/info-box` attrs: `mediaType` (string, default: `"icon"`), `mediaEmoji` (string, default: `""`), `icon` (string, default: `"star-filled"`), `iconColour` (string, default: `"primary"`).
- The `sgs-info-box__icon` BEM element resolves to the `icon` slot → `sgs/icon` standalone block (DB: `slots WHERE slot_name='icon'`, `standalone_block='sgs/icon'`).

### SPEC-DOC refs
- `convert.py` lines 3682–3684 (`_route_text_leaf`): step (a) checks `db.atomic_tag_map().get(node.name)`. For `<div class="sgs-info-box__icon">`, `div` is not in `atomic_tag_map`. Step (b): BEM element `icon` → `block_for_slot_token("icon")` → `sgs/icon`. Step (c) not reached. `target = "sgs/icon"`.
- `convert.py` line 3711: `attrs = _atomic_attrs_for(node, target)` — for `sgs/icon`, `_atomic_attrs_for` collects attrs. The emoji text node `🌾` inside `<div class="sgs-info-box__icon">` is not mapped to `emojiChar`; there is no handler that reads text nodes inside `sgs-info-box__icon` and writes them to `emojiChar`.
- `convert.py` lines 2291–2323 (`icon_resolver.py` usage): the icon identity resolver in this block applies to `sgs/trust-bar` badges only (comment at line 2291: "icon: identity resolver (Task 2 — icon_resolver.py)"). No equivalent emoji-to-`emojiChar` resolver for `sgs/info-box` icon children.

### PIPELINE-LOCATION refs
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/icon_resolver.py`: invoked for trust-bar icon resolution only (lines 2301–2323 of `convert.py`).
- `convert.py` lines 3682–3715 (`_route_text_leaf`): determines `sgs/icon` as the target for `sgs-info-box__icon` div, but does not lift the emoji text child as `emojiChar`.
- `sgs/icon` DB: `emojiChar` attr exists (string, default `""`), `iconSource` attr (string, default `"lucide"`).

---

## IN-E — Icon and text in info box should all be centred but are left aligned

### Issue (verbatim)
"Same text type alignment for icon and text in the info box. Should all be centred but instead are left aligned."

### DRAFT facts
- `index.html` lines 515–519: `.sgs-info-box { background: white; border-radius: 12px; padding: 22px 16px; border: 1px solid var(--border); }` — no `text-align` on `.sgs-info-box` directly.
- `index.html` line 506: `.sgs-ingredients-section__inner { max-width: 960px; margin: 0 auto; text-align: center; }` — `text-align: center` is set on the ancestor `__inner` container; it inherits to all children including the info-boxes.
- No `text-align` CSS rule directly on `.sgs-info-box`, `.sgs-info-box__icon`, `.sgs-info-box h4`, or `.sgs-info-box p` in the draft stylesheet.

### CLONE facts
- Clone lines 892–895 (info-box heading): `<h4 class="wp-block-sgs-heading__text" style="color:var(--wp--preset--color--text);font-size:19px;font-weight:600">Oats</h4>` — no `text-align` in inline style.
- Clone lines 897: `<p style="color:var(--wp--preset--color--text-muted);font-size:13px;line-height:1.55unitless" class="wp-block-sgs-text">Rich in iron...` — no `text-align` in inline style.
- Clone lines 890–898 (`sgs/info-box` wrapper): `class="...sgs-info-box..."` — no `textAlignDesktop` attr set in emitted inline style.

### DB facts
- `sgs/info-box` has attrs `textAlignDesktop` (string, `""`), `textAlignMobile` (string, `""`), `textAlignTablet` (string, `""`) — no base `textAlign` attr on `sgs/info-box`.
- `sgs/heading` has `textAlign` (string, `""`) — emitted without value in clone.
- `sgs/text` has `textAlign` (string, `""`) — emitted without value in clone.

### SPEC-DOC refs
- Same mechanism as IN-A: `_lift_typography_to_block_attrs` only lifts CSS props present in `_collect_css_decls_for_element` results for that specific element. Neither `.sgs-info-box`, `.sgs-info-box h4`, nor `.sgs-info-box p` have a direct `text-align` CSS rule in the draft — the alignment comes from the ancestor `.sgs-ingredients-section__inner`.
- `convert.py` lines 547–694 (`_collect_css_decls_for_element`): matches `.sgs-info-box h4` descendant combinator selector against the `<h4>` node if the parent has class `sgs-info-box`. Lines 614–626: parent_token matching checks up the ancestor chain for class presence. However, the `text-align` CSS is on `.sgs-ingredients-section__inner`, not `.sgs-info-box` — so the combinator selector `.sgs-ingredients-section__inner h4` does not exist in the draft; there is no such rule.

### PIPELINE-LOCATION refs
- `convert.py` lines 547–694 (`_collect_css_decls_for_element`): does not resolve inherited CSS from ancestor containers.
- `db_lookup.py` lines 1101–1103: `text-align` is in lift scope but requires a direct CSS rule on the element.

---

## IN-F — Notice banner on clone looks nothing like sgs-ingredients-section__disclaimer

### Issue (verbatim)
"The notice banner on the clone looks nothing like sgs-ingredients-section__disclaimer. Has black outline, default icon (draft has no icon) and no text has been carried over."

### DRAFT facts
- `index.html` line 941: `<p class="sgs-ingredients-section__disclaimer">We make nourishing food. We don't make medical claims. If you have specific concerns about lactation, your IBCLC or midwife is the right person to speak to.</p>` — plain `<p>` element, no icon, text content is 167 characters.
- `index.html` lines 530–541: `.sgs-ingredients-section__disclaimer { font-size: 14px; color: var(--text-muted); font-style: italic; max-width: 620px; margin: 0 auto; padding: 16px 20px; background: white; border-radius: 10px; border: 1px solid var(--border); line-height: 1.55; }` — styled as a white box with 1px border, italic text, no icon, no left-border accent, no colour-variant class.

### CLONE facts
- Clone line 927: `<div style="border-radius:10px;border-style:solid;border-width:1px;padding-top:16px;padding-right:20px;padding-bottom:16px;padding-left:20px;margin-top:0;margin-right:auto;margin-bottom:0;margin-left:auto" class="sgs-container sgs-notice-banner sgs-notice-banner--info wp-block-sgs-notice-banner has-border-color has-border-border-color" role="note"><span class="sgs-notice-banner__icon" aria-hidden="true"><!-- @license lucide-static v0.564.0 - ISC --><svg class="lucide lucide-info" ...></svg></span></div>` — block is `sgs/notice-banner` with `variant=info`, showing a Lucide `info` SVG icon, and `sgs-notice-banner--info` class (which applies `background-color: var(--_banner-bg, #ebf5ff)` and `border-left: 4px solid var(--_banner-border, #3b82f6)` via the block's CSS at line 305). The `text` content is entirely absent — no `sgs/text` InnerBlocks child emitted.
- Clone line 927 full content: the `sgs/notice-banner` block closes immediately after the icon span — there is no `.sgs-notice-banner__text` span, no text content whatsoever.

### DB facts
- `sgs/notice-banner` attrs: `text` (string, default: `""`), `showIcon` (boolean, default: `true`), `variant` (string, default: `"info"`), `icon` (string, default: `"info"`).
- `slots WHERE slot_name='disclaimer'`: `standalone_block = 'sgs/notice-banner'`, `scope = 'element'`, `aliases = NULL`.
- `sgs/notice-banner` `text` attr is `string` type — confirmed by `block_attributes` query.

### SPEC-DOC refs
- `convert.py` lines 3696–3700: in `_route_text_leaf`, step (b) resolves BEM element `disclaimer` (from class `sgs-ingredients-section__disclaimer`) via `block_for_slot_token("disclaimer")` → `sgs/notice-banner`. `_is_text_capable_block("sgs/notice-banner")` checks for attrs named `text` or `content` — `text` attr exists → returns `True` → `target = "sgs/notice-banner"`.
- However, `_route_text_leaf` step (a) at line 3682 checks `db.atomic_tag_map().get(node.name)`. For `<p>` tag, `atomic_tag_map()` returns `sgs/text` (via `html_tag_to_core_block` → `core/paragraph` → reverse-walk → `sgs/text`). Step (a) returns `sgs/text`, so step (b) is **never reached** for a `<p>` tag. Yet the clone shows `sgs/notice-banner` — meaning the node was NOT processed through `_route_text_leaf` at all. Instead, `resolve_slug_from_bem` (path 2) matched `disclaimer` element → `sgs/notice-banner` upstream in the main `walk()` function, setting `slug = "sgs/notice-banner"`.
- `plugins/sgs-blocks/src/blocks/notice-banner/render.php` lines 28–29: "FR-22-6: `$text` is no longer rendered here — the text content slot is now an InnerBlocks child (sgs/text), emitted via `$content`." `$text` attr retained for `deprecated.js` back-compat only. R-22-14: no fallback. `$content` (InnerBlocks) renders the text.
- The converter emitted `sgs/notice-banner` with no InnerBlocks children and no `text` attr set. `render.php` line 105: `$sgs_inner_html .= $content;` — `$content` is empty (no InnerBlocks). Result: icon only, no text.
- Notice-banner's default `variant = "info"` drives: `sgs-notice-banner--info` class → `background-color: var(--_banner-bg, #ebf5ff)` (light blue) + `border-left: 4px solid var(--_banner-border, #3b82f6)` (blue border), plus the default Lucide `info` icon. Draft has a white box with only a 1px `var(--border)` border and no icon.

### PIPELINE-LOCATION refs
- `convert.py` lines 2416–2431 (`resolve_slug_from_bem`): path 2 maps `disclaimer` BEM element → `sgs/notice-banner`.
- `convert.py` lines 2835–2849: leaf block path calls `_atomic_attrs_for(node, slug)` for `sgs/notice-banner`, and `_lift_typography_to_block_attrs`. `_atomic_attrs_for` for `sgs/notice-banner` does not emit InnerBlocks children carrying the `<p>` text.
- `plugins/sgs-blocks/src/blocks/notice-banner/render.php` line 105: `$sgs_inner_html .= $content;` — only renders InnerBlocks child content; `$text` attr is deprecated.

---

## Coverage Checklist

| Issue | Status |
|-------|--------|
| IN-A — text-align not transferred to label/heading/text | fact-complete |
| IN-B — margin-bottom 36px missing on intro paragraph | fact-complete |
| IN-C — grid is 2×2 not 4×1 row | fact-complete |
| IN-D — emojis missing, default star icons shown | fact-complete |
| IN-E — icon and text inside info-box left-aligned instead of centred | fact-complete |
| IN-F — notice banner has default icon, wrong styling, no text | fact-complete |
