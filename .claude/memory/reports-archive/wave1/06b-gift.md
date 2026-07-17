# Wave-1 Fact-Finder — Gift Section Batch 2 (GF-F, GF-G, GF-H, GF-I)

**Date:** 2026-06-08
**Sources:** index.html, current-clone-page-source.html, sgs-framework.db (via sgs-db.py), render.php files, convert.py

---

## GF-F — "Price font wrong"

### Issue (verbatim)
"Price font wrong"

### DRAFT facts
- Draft element: `<div class="sgs-gift-section__card-price">£15</div>` (index.html line 960) and `<div class="sgs-gift-section__card-price">£42</div>` (line 967)
- Draft CSS (index.html lines 577–583, `<style>` block):
  ```css
  .sgs-gift-section__card .sgs-gift-section__card-price {
    font-family: 'Fraunces', serif;
    font-size: 30px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 16px;
  }
  ```
- The draft price element uses `font-family: 'Fraunces', serif` — this is a custom decorative font, not the default body font.
- The element is a `<div>` with no sgs-BEM child-element class — just the price modifier class `.sgs-gift-section__card-price`.

### CLONE facts
- Clone renders price as: `<p style="color:var(--wp--preset--color--text);font-size:30px;font-weight:700;, serif" class="wp-block-sgs-text">£15</p>` (current-clone-page-source.html line 947)
- Clone renders `£42` as: `<p style="color:var(--wp--preset--color--text);font-size:30px;font-weight:700;, serif" class="wp-block-sgs-text">£42</p>` (line 960)
- The inline `style` attribute value is: `color:var(--wp--preset--color--text);font-size:30px;font-weight:700;, serif`
- The `, serif` fragment is present as a dangling suffix after `font-weight:700;` — it is NOT a valid CSS property declaration (no property name, just a value fragment). It does NOT constitute a working `font-family` declaration.
- `font-family` property is absent from the inline style entirely as a valid declaration.
- Block used: `sgs/text` (class `wp-block-sgs-text`).

### DB facts
- `sgs/text` block has a `fontFamily` attribute: `attr_name=fontFamily, attr_type=string, default_value=""` (empty string default). The attribute exists in the schema.
- `_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS` tuple in `db_lookup.py` lines 1101–1103 is:
  ```python
  _TYPO_LIFT_TYPOGRAPHY_CSS_PROPS: tuple[str, ...] = (
      "font-size", "line-height", "letter-spacing",
      "font-weight", "font-style", "text-align",
  )
  ```
- `font-family` is explicitly NOT in this tuple. The comment at lines 1096–1100 states: "The DB classifies more properties as role='typography' (font-family, text-decoration, text-transform) but those are deliberately OUT of the typed flat-attr lift scope here (they have separate handling / no faithful-default need on the cloning path). Adding one to this tuple is the single edit needed to bring it into scope."
- `sgs/text` `fontFamily` attr has `default_value=""` — no font family is set by default.

### SPEC-DOC refs
- `db_lookup.py` lines 1092–1104: `_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS` definition + inline comment explicitly excluding `font-family`.
- `db_lookup.py` line 1096: "The DB classifies more properties as role='typography' (font-family, text-decoration, text-transform) but those are deliberately OUT of the typed flat-attr lift scope here."

### PIPELINE-LOCATION refs
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` lines 1092–1104: `_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS` — `font-family` is excluded from lift scope.
- The clone emits `font-size:30px;font-weight:700;` correctly via the lift, but not `font-family`.
- The dangling `, serif` in the style attribute (clone line 947) indicates an incomplete or malformed emit — a partial value of `'Fraunces', serif` without the property name. Exact origin in convert.py not verified in this pass (fact-finding scope), but the result is confirmed present.

---

## GF-G — "Gap between price and the text above it is missing in clone."

### Issue (verbatim)
"Gap between price and the text above it is missing in clone."

### DRAFT facts
- Draft CSS (index.html line 577–583):
  ```css
  .sgs-gift-section__card .sgs-gift-section__card-price {
    font-family: 'Fraunces', serif;
    font-size: 30px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 16px;
  }
  ```
- The gap is between the description paragraph (`.sgs-gift-section__card-description`) and the price div. The description has CSS at line 576: `.sgs-gift-section__card .sgs-gift-section__card-description { font-size: 14px; color: var(--text-muted); margin-bottom: 20px; line-height: 1.6; }`
- So gap above the price in the draft = `margin-bottom: 20px` on the description element that precedes it.
- The price element itself has `margin-bottom: 16px` (gap below price, to the button).

### CLONE facts
- Clone price element (line 947): `<p style="color:var(--wp--preset--color--text);font-size:30px;font-weight:700;, serif" class="wp-block-sgs-text">£15</p>`
- No `margin-top` or `margin-bottom` is present on the price `<p>` element's inline style.
- Clone description element (line 946): `<p style="color:var(--wp--preset--color--text-muted);font-size:14px;line-height:1.6unitless" class="wp-block-sgs-text">The perfect gift for a new mum...</p>`
- No `margin-bottom` is present on the description element's inline style.
- Both elements are rendered via `sgs/text` (`wp-block-sgs-text`) without any margin attrs set.

### DB facts
- `sgs/text` block has `marginBottom` attribute: `attr_name=marginBottom, attr_type=number, default_value=None`.
- `sgs/text` block has `marginTop` attribute: `attr_name=marginTop, attr_type=number, default_value=None`.
- Both default to `None` — no default margin is applied by the block without an explicit attribute value.
- The `_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS` tuple in db_lookup.py does NOT include `margin-bottom` or `margin-top` — those are spacing properties, not typography lift properties.

### SPEC-DOC refs
- `db_lookup.py` lines 1101–1103: The lift scope for text blocks covers `font-size`, `line-height`, `letter-spacing`, `font-weight`, `font-style`, `text-align`. `margin-bottom` is not in scope.
- `convert.py` lines 1572–1575: `_ABSORB_GAP_PROPS` includes `margin-bottom` as a spacing property absorbed at the wrapper/container level — not propagated to inner text block attrs.

### PIPELINE-LOCATION refs
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` lines 1101–1103: text lift scope excludes margin.
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` lines 1572–1575: `_ABSORB_GAP_PROPS` frozenset — `margin-bottom` listed as absorbed at container level.
- `plugins/sgs-blocks/src/blocks/sgs-text/` (if exists) or the `sgs/text` render.php: handles `marginBottom` attr when set — not verified in this fact-finding pass (file path not confirmed).

---

## GF-H — "Button in draft doesn't have wrapper but our multi-button parent to sgs/button is automatically adding padding. If wrapper to button doesn't exist then the sgs/multi-button css should be blank."

### Issue (verbatim)
"Button in draft doesn't have wrapper but our multi-button parent to sgs/button is automatically adding padding. If wrapper to button doesn't exist then the sgs/multi-button css should be blank."

### DRAFT facts
- Draft gift section button (index.html line 961): `<a href="/product/gift-box/" class="sgs-button sgs-button--primary">Shop Gift Box</a>`
- This is a bare `<a>` element directly inside `<div class="sgs-gift-section__card">`. It has NO wrapping parent div, NO container element, and NO multi-button wrapper class.
- The second gift button (line 968): `<a href="/product/40-day-bundle/" class="sgs-button sgs-button--primary">Shop Bundle</a>` — same: bare `<a>` with no wrapper.
- Draft button CSS (index.html lines 55–69): `.sgs-button { display: inline-flex; align-items: center; ... padding: 12px 24px; ... min-height: 44px; ... }` (lines 55–97).

### CLONE facts
- Clone gift card button (current-clone-page-source.html line 949):
  `<div style="padding-top:14px;padding-right:24px;padding-bottom:14px;padding-left:24px" class="sgs-button-wrapper wp-block-sgs-button has-text-color" id="sgs-btn-13"><a href="/product/gift-box/" class="sgs-button is-style-primary" style="--sgs-btn-icon-gap:8px;"><span class="sgs-button__label">Shop Gift Box</span></a></div>`
- The `sgs/button` render.php outputs a `<div class="sgs-button-wrapper">` wrapper ALWAYS (render.php line 607–612, 689, 707) — there is no conditional that suppresses the wrapper div.
- The wrapper `<div>` has `style="padding-top:14px;padding-right:24px;padding-bottom:14px;padding-left:24px"` applied.
- Button is wrapped in `sgs/multi-button` (lines 948–950): `<div style="gap:12px" class="sgs-container sgs-multi-button ... wp-block-sgs-multi-button" id="sgs-mb-14">`.
- The `sgs/multi-button` element carries a `<style>` tag with full flex CSS (line 948): `#sgs-mb-14.sgs-multi-button{display:flex;flex-direction:row;flex-wrap:wrap;gap:12px;justify-content:flex-start;align-items:center;}` + responsive breakpoint rules.
- Multi-button's own `style.css` file (plugins/sgs-blocks/src/blocks/multi-button/style.css) contains ONLY the comment `/* Multi Button — frontend styles */` — no CSS rules.
- The `padding-top:14px;padding-right:24px;padding-bottom:14px;padding-left:24px` on the button wrapper comes from `button.render.php` lines 247–254: padding is rendered when `paddingTop`/`paddingRight`/`paddingBottom`/`paddingLeft` attrs are set. The clone sets these attributes (confirmed by the presence of the inline style).

### DB facts
- `sgs/button` `paddingTop` default: `None`; `paddingRight` default: `None`; `paddingBottom` default: `None`; `paddingLeft` default: `None`. All four padding attrs have `default_value=None`.
- `sgs/button` style.css (style-level default, line 16): `.sgs-button { ... padding: 14px 24px; ... }` — the `.sgs-button` element (inside the wrapper) has default CSS padding `14px 24px` from the static stylesheet. This padding is on the `.sgs-button` inner element, NOT on the `.sgs-button-wrapper` div.
- The `padding-top:14px;padding-right:24px` on the `.sgs-button-wrapper` div in the clone indicates the converter set the block's padding attrs (`paddingTop=14`, `paddingRight=24`, `paddingBottom=14`, `paddingLeft=24`).
- `sgs/multi-button` has no padding attrs in DB — no `paddingTop` etc. DB query returns only gap/direction/justify/align attrs.

### SPEC-DOC refs
- `plugins/sgs-blocks/src/blocks/button/render.php` lines 247–254: padding inline style generation is conditional on attrs being non-null — not a hardcoded default.
- `plugins/sgs-blocks/src/blocks/button/style.css` line 16: `.sgs-button { padding: 14px 24px; }` — this is the CSS-level default padding on the inner button element (NOT the wrapper).
- `plugins/sgs-blocks/src/blocks/multi-button/style.css` line 2: only a comment — no padding/gap CSS rules.
- `convert.py` lines 2997–3004: the converter wraps loose `sgs/button` runs in `sgs/multi-button` automatically ("Spec 11 + P-9: wrap any loose sgs/button runs in sgs/multi-button"). A single bare button in draft is still wrapped.
- `convert.py` lines 3718–3741: `_group_loose_buttons()` function — wraps even a single `sgs/button` in `sgs/multi-button`.

### PIPELINE-LOCATION refs
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` lines 2997–3004 and 3718–3741: auto-wrapping logic.
- `plugins/sgs-blocks/src/blocks/multi-button/render.php` lines 76–119: multi-button render generates `#uid.sgs-multi-button` scoped CSS unconditionally (regardless of child count or draft wrapper presence).
- `plugins/sgs-blocks/src/blocks/button/render.php` line 607–612: `$wrapper_attr = get_block_wrapper_attributes(...)` with class `sgs-button-wrapper` — the wrapper div is ALWAYS emitted.
- `plugins/sgs-blocks/src/blocks/button/render.php` lines 247–254: padding inline style on wrapper div — applied when attrs are set.

---

## GF-I — "The announcement bar on the clone looks nothing like sgs-announcement-bar--send-to-ward. Like it's genuinely not got one single thing correct even on something as simple as the actual content or font size."

### Issue (verbatim)
"The announcement bar on the clone looks nothing like sgs-announcement-bar--send-to-ward. Like it's genuinely not got one single thing correct even on something as simple as the actual content or font size."

### DRAFT facts
- Draft element (index.html lines 972–975):
  ```html
  <div class="sgs-announcement-bar--send-to-ward">
    <p>🏥 Heading to hospital? Ask us about our Send to Ward delivery.</p>
    <a href="/send-to-ward/">Find out more →</a>
  </div>
  ```
- Draft CSS for this element (index.html lines 585–598):
  - Wrapper: `background: white; border: 1px solid var(--primary); border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;`
  - Paragraph: `font-size: 14px; color: var(--text); font-weight: 500;`
  - Link: `font-size: 14px; font-weight: 600; color: var(--primary-dark); white-space: nowrap; min-height: 44px; display: inline-flex; align-items: center; padding: 6px 0;`
- The draft element's root class is `sgs-announcement-bar--send-to-ward` — this is a BEM modifier on the `sgs-announcement-bar` block identifier. It has NO companion block-root class (e.g. `sgs-announcement-bar` alone is absent). The ONLY class is the modifier form.
- Content: "🏥 Heading to hospital? Ask us about our Send to Ward delivery." with link "Find out more →" to `/send-to-ward/`.
- This is a callout/notice-style inline component inside the gift section — NOT a site-wide sticky announcement bar at the top of the page.

### CLONE facts
- Clone element (current-clone-page-source.html lines 966–983):
  ```html
  <div style="--sgs-ab-cta-colour:var(--wp--preset--color--accent)"
       class="sgs-announcement-bar sgs-announcement-bar--standard sgs-announcement-bar--top sgs-announcement-bar--fade has-small-font-size sgs-announcement-bar--sticky wp-block-sgs-announcement-bar"
       data-wp-interactive="sgs/announcement-bar"
       data-wp-context="{...}"
       ...>
    <div class="sgs-announcement-bar__content">
      <div class="sgs-announcement-bar__messages">
        <div class="sgs-announcement-bar__message" data-index="0" ...>
          <div class="sgs-announcement-bar__text">
            🎉 New product launch — get 20% off with code LAUNCH20!
          </div>
        </div>
      </div>
    </div>
  </div>
  ```
- Content in clone: `"🎉 New product launch — get 20% off with code LAUNCH20!"` — this is the DB default message, NOT the draft content "🏥 Heading to hospital? Ask us about our Send to Ward delivery."
- The clone carries: `sgs-announcement-bar--standard sgs-announcement-bar--top sgs-announcement-bar--fade has-small-font-size sgs-announcement-bar--sticky` — sticky global top-of-page bar behaviour with `position=top`, `variant=standard`, `rotationType=fade`.
- No link element ("Find out more →") is present in the clone — the draft's `<a>` is absent.
- font-size class is `has-small-font-size` (maps to WP preset `small`). Draft specifies `font-size: 14px` for both the paragraph and the link.
- Clone has WP Interactivity bindings (`data-wp-interactive`, `data-wp-context` with rotation/dismiss state) — the draft has none of these.
- Clone has `sgs-announcement-bar--sticky` — positions the element as a fixed sticky header. The draft element is inline within the gift section layout.
- Clone `data-wp-context` has `"blockId":"sgs-announcement-17"` and all the global announcement-bar context fields.

### DB facts
- `sgs/announcement-bar` block: `tier=block` (DB query confirmed).
- DB `messages` default: `[{"text": "🎉 New product launch — get 20% off with code LAUNCH20!", "ctaText": "Shop Now", "ctaUrl": ""}]` — this is exactly the message appearing in the clone.
- DB `sticky` default: `true`.
- DB `position` default: `"top"`.
- DB `variant` default: `"standard"`.
- DB `rotationType` default: `"fade"`.
- DB `fontSize` default: `"small"`.
- DB `ctaColour` default: `"accent"`.
- No slot in the DB (`slots` table) maps to `sgs/announcement-bar` via `standalone_block`. Query `SELECT slot_name FROM slots WHERE standalone_block='sgs/announcement-bar'` returned no results.
- No slot exists for `send-to-ward` or `ward` (DB query confirmed — no results).

### SPEC-DOC refs
- `plugins/sgs-blocks/src/blocks/announcement-bar/render.php` lines 16–22: messages pulled from `$attributes['messages']` with fallback to empty default. Lines 23–27: variant/cta_style/cta_colour/position/sticky/dismissible all read from attrs with defaults.
- `plugins/sgs-blocks/src/blocks/announcement-bar/render.php` lines 62–70: wrapper classes assembled from attrs — `sgs-announcement-bar--standard`, `sgs-announcement-bar--top`, `sgs-announcement-bar--fade`, `sgs-announcement-bar--sticky`.
- `convert.py` lines 3061–3093: BEM modifier carry logic. The comment explicitly names `.sgs-announcement-bar--send-to-ward` as an example case for BEM modifier carry (line 3063). The logic carries the modifier class onto the emitted block's `className` attr, but does NOT affect the block's content attributes (messages, sticky, position, etc.).

### PIPELINE-LOCATION refs
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` lines 3061–3093: BEM modifier carry. The `--send-to-ward` modifier would be carried to `className` BUT does not set block content/behaviour attributes.
- `plugins/sgs-blocks/src/blocks/announcement-bar/render.php` lines 16–110: full render logic — content comes from `$attributes['messages']` attr only; no mechanism to extract text content from draft HTML children.
- No converter code found that maps draft HTML child text (`<p>` / `<a>` content inside `.sgs-announcement-bar--send-to-ward`) to `messages` array attribute of `sgs/announcement-bar`.
- No slot DB row maps this BEM element to `sgs/announcement-bar` with pre-populated content (DB query confirmed no results).

---

## Coverage Checklist

| Issue | Status |
|-------|--------|
| GF-F — Price font wrong | fact-complete |
| GF-G — Gap between price and text above missing | fact-complete |
| GF-H — Button multi-button wrapper padding | fact-complete |
| GF-I — Announcement bar clone vs send-to-ward | fact-complete |
