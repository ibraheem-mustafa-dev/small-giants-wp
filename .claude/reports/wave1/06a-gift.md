# Wave-1 Fact-Finder — Gift Section (GF-A through GF-E)

**Source files pinned:**
- DRAFT: `sites/mamas-munches/mockups/homepage/index.html`
- CLONE: `sites/mamas-munches/mockups/homepage/current-clone-page-source.html`
- DB: `~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."`
- PIPELINE: `plugins/sgs-blocks/scripts/orchestrator/converter_v2/`
- LABEL RENDER: `plugins/sgs-blocks/src/blocks/label/render.php`
- LABEL STYLE: `plugins/sgs-blocks/src/blocks/label/style.css`

---

## GF-A — "The label, heading and text alignment issues exist here too."

### Issue (verbatim)
"The label, heading and text alignment issues exist here too."

### DRAFT facts
- `.sgs-gift-section__card-inner { max-width: 960px; margin: 0 auto; }` — **no `text-align`** (index.html line 553). Alignment is browser default (left).
- `.sgs-gift-section h2 { font-size: 28px; font-weight: 600; color: var(--text); margin-bottom: 8px; }` — **no `text-align`** (line 554).
- `.sgs-gift-section .sgs-section-heading__sub { font-size: 16px; color: var(--text); margin-bottom: 32px; }` — **no `text-align`** (line 555).
- `.sgs-section-heading__label { font-size: 12px; ... }` — **no `text-align`** (lines 44–52).
- Contrast: social-proof section **does** have explicit `text-align: center` on its h2 (line 616) and sub (line 621). Gift section has none.

### CLONE facts
- Gift section label (clone line 931): `<span ... class="wp-block-sgs-label has-text-color" ...>Give the gift of nourishment</span>` — no `text-align` in inline style, no `text-align` class on wrapper `<div class="wp-block-sgs-heading" id="sgs-hdg-3c7176bc">` (line 932).
- Gift section h2 (clone line 932–935): `<div class="wp-block-sgs-heading" id="sgs-hdg-3c7176bc">` — **no** `style="text-align:..."` attribute on wrapper div.
- Gift section sub/text (clone line 937): `<p style="color:var(--wp--preset--color--text-muted);font-size:16px;text-align:center" class="wp-block-sgs-text">For baby showers, new arrivals, and the mums who deserve a treat.</p>` — **has `text-align:center`** in inline style.
- Block default stylesheet (clone line 157): `:where(.wp-block-sgs-heading){text-align:center}` — heading block has a **global CSS default of `text-align:center`** that applies to ALL `wp-block-sgs-heading` instances, including the gift heading, without any per-instance override.

### DB facts
- `SELECT block_slug, attr_name, attr_type, default_value FROM block_attributes WHERE block_slug IN ('sgs/label','sgs/heading','sgs/text') AND attr_name LIKE '%align%'`:
  - `sgs/heading  textAlign  string  ""`  (default empty string — no alignment set by default in block attrs)
  - `sgs/label    textAlign  string  ""`
  - `sgs/text     textAlign  string  ""`
- All three blocks declare `textAlign` attr; default value is `""` (not `"center"`). The global `text-align:center` on `.wp-block-sgs-heading` is a stylesheet rule, not driven by a block attribute.

### SPEC-DOC refs
- None directly scoped to gift text-align. Pattern is identical to other sections (e.g. social-proof section has explicit `text-align:center` and clone correctly emits `style="text-align:center"` on its heading wrapper — clone line 988: `<div style="text-align:center" class="wp-block-sgs-heading"`).

### PIPELINE-LOCATION refs
- `db_lookup.py` lines 1101–1103: `_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS` tuple includes `"text-align"`.
- `db_lookup.py` lines 1137–1146: fallback map entry `("text-align", "textAlign", None)` — `text-align` lifts to `textAlign` attr with no unit companion.
- `convert.py` lines 2847–2849: `typo_lift = _lift_typography_to_block_attrs(node, slug, css_rules)` — runs for all leaf blocks. Gift section h2 and sub/text are leaf blocks; `text-align` would only be lifted if found in the draft's computed CSS for those elements.

---

## GF-B — "Text styles are all inconsistent across all content in this section."

### Issue (verbatim)
"Text styles are all inconsistent across all content in this section."

### DRAFT facts
All typography values for the gift section (index.html `<style>` block):

| Element / class | font-size | font-weight | color | line-height | font-family |
|---|---|---|---|---|---|
| `.sgs-section-heading__label` (eyebrow) | 12px | 600 | `var(--text)` | — | — |
| `.sgs-gift-section h2` | 28px (mobile), 36px (@640px+) | 600 | `var(--text)` | — | — |
| `.sgs-gift-section .sgs-section-heading__sub` | 16px | — | `var(--text)` | — | — |
| `.sgs-gift-section__card h3` | 22px | 600 | `var(--text)` | — | — |
| `.sgs-gift-section__card-description` | 14px | — | `var(--text-muted)` | 1.6 | — |
| `.sgs-gift-section__card-price` | 30px | 700 | `var(--text)` | — | `'Fraunces', serif` |

- Sub colour: `color: var(--text)` (line 555) — **not** `var(--text-muted)`.
- Card price font-family: `font-family: 'Fraunces', serif` (line 578).
- `.sgs-gift-section h2` desktop size: `font-size: 36px` at `@media (min-width: 640px)` (line 602).

### CLONE facts
| Element | clone inline style | clone class |
|---|---|---|
| Section label (line 931) | `--sgs-label-font-size:12px;--sgs-label-font-weight:600;--sgs-label-letter-spacing:1.5px;--sgs-label-text-transform:uppercase` | `wp-block-sgs-label has-text-color` |
| H2 (lines 932–935) | `color:var(--wp--preset--color--text);font-size:28px;font-weight:600;line-height:1.2` | `wp-block-sgs-heading__text` |
| Sub/text (line 937) | `color:var(--wp--preset--color--text-muted);font-size:16px;text-align:center` | `wp-block-sgs-text` |
| Card h3 card 1 (lines 941–944) | `color:var(--wp--preset--color--text);font-size:22px;font-weight:600;line-height:1.2` | `wp-block-sgs-heading__text` |
| Card description card 1 (line 946) | `color:var(--wp--preset--color--text-muted);font-size:14px;line-height:1.6unitless` | `wp-block-sgs-text` |
| Card price card 1 (line 947) | `color:var(--wp--preset--color--text);font-size:30px;font-weight:700;, serif` | `wp-block-sgs-text` |

**Discrepancies vs draft:**
1. Sub (line 937): clone colour = `var(--wp--preset--color--text-muted)` vs draft `var(--text)`.
2. Sub (line 937): clone has `text-align:center` vs draft has no `text-align`.
3. H2 (line 933): clone `font-size:28px` with no `@media` responsive override inline — draft h2 has desktop `font-size: 36px` at 640px+.
4. Card price (line 947): clone `style` string ends in `font-weight:700;, serif` — the `font-family` value is malformed (`, serif` instead of `font-family:'Fraunces', serif`).
5. H2 heading wrapper (line 932): no `text-align` attribute — but `.wp-block-sgs-heading{text-align:center}` default CSS (line 157) applies centre alignment. Draft has no centering.

### DB facts
- `sgs/text textAlign string ""` — empty default (no centre).
- `sgs/heading textAlign string ""` — empty default (no centre).
- `sgs/heading fontSize number 28` — default is 28. No responsive default attrs (`fontSizeTablet`, `fontSizeMobile` both default `None`).
- `sgs/text textColour string ""` — no default. `sgs/heading textColour string "text"` — default is `"text"` token.

### SPEC-DOC refs
- None specific to gift section typography.

### PIPELINE-LOCATION refs
- `db_lookup.py` lines 1137–1146: `_FALLBACK` map — `("font-size","fontSize","fontSizeUnit")`, `("color","textColour",None)`, `("text-align","textAlign",None)` — text-align and colour are in scope for lift.
- `convert.py` lines 2847–2849: `_lift_typography_to_block_attrs` called for leaf blocks.
- `convert.py` lines 489–508: `_root_lift_rules` / `_lift_root_supports_to_style` — handles padding/border/colour via WP native `style.*` path.

---

## GF-C — "Missing padding between sgs-section-heading__sub and sgs-gift-section__cards"

### Issue (verbatim)
"Missing padding between sgs-section-heading__sub and sgs-gift-section__cards - (Consistently been missed across all section.)"

### DRAFT facts
- `.sgs-gift-section .sgs-section-heading__sub { font-size: 16px; color: var(--text); margin-bottom: 32px; }` (index.html line 555).
- The `margin-bottom: 32px` on the sub creates 32px spacing between the sub text and the cards grid.
- `.sgs-gift-section__cards { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 20px; }` (line 556) — the cards wrapper itself has `margin-bottom: 20px`, not `margin-top`.

### CLONE facts
- Clone sub/text (line 937): `<p style="color:var(--wp--preset--color--text-muted);font-size:16px;text-align:center" class="wp-block-sgs-text">` — **no `margin-bottom`** in inline style. No `marginBottom` attribute set.
- Cards grid container (line 938): `<div style="gap:16px;display:grid;grid-template-columns:1fr 1fr;align-items:start" class="sgs-container sgs-container--grid ... sgs-gift-section__cards wp-block-sgs-container">` — **no `margin-top`** in inline style.

### DB facts
- `sgs/text marginBottom number None` (default `None` — not set).
- `sgs/text marginBottomMobile number None`, `sgs/text marginBottomTablet number None` (both `None`).
- `sgs/container` has `marginBottom` attrs (confirmed via `block_composition.container_kind` table is populated; full attr list not re-queried here but margin attrs present per architecture).

### SPEC-DOC refs
- None specific to sub-to-cards spacing in `.claude/specs/`.

### PIPELINE-LOCATION refs
- `convert.py` lines 494–500: `_root_lift_rules` tuple includes `("margin-bottom", "spacing", "margin", ["spacing","margin","bottom"], "unit")` — this is the WP native `style.spacing.margin.bottom` path.
- `convert.py` lines 2856: `_lift_root_supports_to_style(node, slug, css_rules, attrs)` — fires for every resolved block.
- `db_lookup.py` lines 1137–1143: `_FALLBACK` map — `margin-bottom` is NOT in the `_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS` or `_TYPO_COLOUR_CSS_PROPS` tuples (lines 1101–1104). It is handled only via the `_root_lift_rules` / WP native `style.*` path (line 500), NOT via the flat `marginBottom` block attr path.

---

## GF-D — "Label dont [font] size, colour, padding size of highlighting colour around the text."

### Issue (verbatim)
"Label dont [font] size, colour, padding size of highlighting colour around the text." (card label/tag styling: font-size, colour, padding/highlight)

### DRAFT facts
`.sgs-gift-section__card-tag` (index.html lines 563–574):
```
display: inline-block;
background: var(--surface-pink);
color: var(--primary-dark);
font-size: 11px;
font-weight: 700;
padding: 4px 10px;
border-radius: 6px;
letter-spacing: 0.5px;
text-transform: uppercase;
margin-bottom: 12px;
```
- `background: var(--surface-pink)` = `#F5C2C8` (from CSS vars, clone line 387: `--wp--preset--color--surface-pink: #F5C2C8`).
- `color: var(--primary-dark)` = `#C56A7A`.
- `font-size: 11px`.
- `padding: 4px 10px`.

`.sgs-section-heading__label` (index.html lines 44–52) — the section eyebrow label:
- `font-size: 12px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text); margin-bottom: 6px;`
- **No `background`**, **no `padding`**.

### CLONE facts
**Card-tag label — card 1 (clone line 940):**
```
style="margin-bottom:12px;
  --sgs-label-colour:var(--wp--preset--color--primary-dark);
  --sgs-label-bg:var(--wp--preset--color--primary);
  --sgs-label-font-size:11px;
  --sgs-label-font-weight:700;
  --sgs-label-line-height:1.2em;
  --sgs-label-letter-spacing:0.5px;
  --sgs-label-text-transform:uppercase;
  --sgs-label-border-radius:6px"
class="wp-block-sgs-label has-text-color has-primary-dark-color has-background has-surface-pink-background-color"
```
- `--sgs-label-bg:var(--wp--preset--color--primary)` — **set to `primary` (#E68A95), not `surface-pink` (#F5C2C8)**. Draft uses `background: var(--surface-pink)`.
- `--sgs-label-colour:var(--wp--preset--color--primary-dark)` — matches draft `color: var(--primary-dark)`.
- `--sgs-label-font-size:11px` — matches draft `font-size: 11px`.
- `has-background has-surface-pink-background-color` WP utility classes also present — these set `background-color: var(--wp--preset--color--surface-pink) !important` (clone line 387). So actual background rendered is `surface-pink` via the utility class, but `--sgs-label-bg` custom property is wrong (`primary` vs `surface-pink`).
- **`--sgs-label-padding` is NOT set** in the inline style. The clone card-tag label has no `is-style-pill-fill` or `is-style-pill-wrap` class — render.php line 103: `$is_pill = false`, so `--sgs-label-padding` is NOT emitted. Base style.css has `--sgs-label-padding: 4px 12px 4px 12px` defined as a CSS custom property (line 15) but it is NOT applied as actual `padding` in the base variant — only the `is-style-pill-fill` and `is-style-pill-wrap` variants use it (style.css lines 44, 63). So rendered padding is **zero** from the SGS label CSS. The `has-background` WP utility does not add padding.

**Section eyebrow label (clone line 931):**
```
style="margin-bottom:6px;
  --sgs-label-colour:var(--wp--preset--color--text);
  --sgs-label-bg:var(--wp--preset--color--primary);
  --sgs-label-font-size:12px;
  --sgs-label-font-weight:600;
  --sgs-label-line-height:1.2em;
  --sgs-label-letter-spacing:1.5px;
  --sgs-label-text-transform:uppercase;
  --sgs-label-border-radius:6px"
class="wp-block-sgs-label has-text-color"
```
- `--sgs-label-bg:var(--wp--preset--color--primary)` — set but not consumed (no pill class; base variant has no background).
- No `has-background` class — so NO background rendered. Matches draft (which also has no background on section label).
- `--sgs-label-font-size:12px` — matches draft.
- `--sgs-label-colour:var(--wp--preset--color--text)` — matches draft `color: var(--text)`.

### DB facts
- `sgs/label fontSize number 12` (default 12).
- `sgs/label paddingTop number 4`, `paddingBottom number 4`, `paddingLeft number 12`, `paddingRight number 12` — DB defaults are 4/4/12/12. Draft card-tag uses `padding: 4px 10px` = top/bottom 4px, left/right 10px. Clone DB default for `paddingLeft`/`paddingRight` = **12** (not 10).
- `sgs/label backgroundColour string "primary"` — DB default is `"primary"` (not `"surface-pink"`).
- `sgs/label textColour string "primary"` — DB default is `"primary"`.
- `sgs/label borderRadius number 6` — matches draft 6px.

### SPEC-DOC refs
- `plugins/sgs-blocks/src/blocks/label/render.php` lines 101–107: `$is_pill` guard controls `--sgs-label-padding` emission.
- `plugins/sgs-blocks/src/blocks/label/style.css` lines 32–70: base variant has no padding; padding only applied in `is-style-pill-fill` and `is-style-pill-wrap` variants.

### PIPELINE-LOCATION refs
- `db_lookup.py` lines 1101–1146: `text-align`, `font-size`, `color`, `background-color` all in lift scope. `padding` is handled via `_root_lift_rules` path (convert.py line 494–497), not the label flat-attr path.
- `convert.py` lines 2870–2876: `_lift_wrapper_css_to_container_attrs` — fires for all resolved blocks; DB-gated (property_suffixes + block_attrs check).

---

## GF-E — "Heading misalignment common issue"

### Issue (verbatim)
"Heading misalignment common issue"

### DRAFT facts
- `.sgs-gift-section h2 { font-size: 28px; font-weight: 600; color: var(--text); margin-bottom: 8px; }` (index.html line 554) — **no `text-align`** property. Alignment is inherited/browser default = left.
- `.sgs-gift-section__card-inner { max-width: 960px; margin: 0 auto; }` (line 553) — **no `text-align`**. Left-aligned.
- Comparison: social-proof `h2` has `text-align: center` (line 616); ingredients section has `text-align: center` via `.sgs-ingredients-section__inner { ... text-align: center; }` (line 506). Gift section has neither.
- Desktop `font-size: 36px` at `@media (min-width: 640px)` (line 602) — not a `text-align` difference but a typography gap.

### CLONE facts
- Gift section h2 wrapper (clone line 932): `<div class="wp-block-sgs-heading" id="sgs-hdg-3c7176bc">` — **no inline `style="text-align:..."` attribute**.
- Global stylesheet rule (clone line 157): `:where(.wp-block-sgs-heading){text-align:center}` — this CSS rule forces `text-align:center` on ALL `wp-block-sgs-heading` elements without an explicit override.
- Resulting rendered text-align on clone gift h2: **centre** (from the global CSS rule).
- Draft gift h2 text-align: **left** (no declaration → browser default).
- Card h3 headings (lines 941–943, 954–956): same `wp-block-sgs-heading` wrapper — also subject to the `text-align:center` global rule.

### DB facts
- `sgs/heading textAlign string ""` — empty string default. An empty `textAlign` attr means the converter does NOT emit `style="text-align:..."` on the heading wrapper, leaving the global `.wp-block-sgs-heading{text-align:center}` CSS rule in force.

### SPEC-DOC refs
- `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` — not read for this fact-finder (file exists; line-level cite would require full read of a large doc).

### PIPELINE-LOCATION refs
- `db_lookup.py` lines 1101–1103: `"text-align"` is in `_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS`.
- `db_lookup.py` line 1143: fallback entry `("text-align","textAlign",None)`.
- `convert.py` lines 2847–2849: `_lift_typography_to_block_attrs` — lifts `text-align` to `textAlign` only if `text-align` is found in the **computed CSS for the h2 element itself** from the draft. The draft has no `text-align` on `.sgs-gift-section h2`, so lift produces nothing, and `textAlign` stays `""` → no override emitted → global `text-align:center` CSS takes effect.

---

## Coverage checklist

| Issue | Status |
|---|---|
| **GF-A** — label/heading/text alignment | fact-complete |
| **GF-B** — text style inconsistency | fact-complete |
| **GF-C** — missing sub-to-cards padding | fact-complete |
| **GF-D** — card label font-size/colour/padding/highlight | fact-complete |
| **GF-E** — heading misalignment | fact-complete |
