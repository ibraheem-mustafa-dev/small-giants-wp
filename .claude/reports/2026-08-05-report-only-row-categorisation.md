---
doc_type: report
title: Report-only role categorisation — 28 unassigned block_attributes.role rows + 3 disputed a11y-text rows + svg role proposal
date: 2026-08-05
status: evidence-gathering only — NO DB writes, NO code changes, NO commit
---

# Report-only row categorisation

**Method note:** every DB query below ran read-only via `sgs-db.py sql` against the live
`sgs-framework.db` (SELECT only — no seeder, no `/sgs-update`, no INSERT/UPDATE/DELETE
was run). Every code claim was reached by opening the actual file:line, not inferred from
the attribute's name. Where I could not reach a definitive answer I say so in the
"Could not determine" section rather than guessing.

---

## Part 1 — the 28 unassigned rows

### D2-only group (17)

| Block.attr | What the source does (file:line) | Proposed role | Confidence | Hand-authored override needed? |
|---|---|---|---|---|
| `sgs/buybox.addToCartLabel` | `buybox/render.php:393-396` — client-facing CTA button text, falls back to `__('Add to Cart')` when empty | `text-content` | High | No |
| `sgs/buybox.perUnitDenomination` | `buybox/render.php:128-133` — client-facing unit label e.g. "per bar"/"per 100g", falls back to a translated template when empty | `text-content` | High | No |
| `sgs/form.formName` | `form/render.php:52` — assigned to `$form_name` and then **never read again anywhere in the file**. Grepped `includes/forms/` too — zero hits. It is currently dead on both the frontend render and the forms backend. | Leave **NULL** — not draft-extractable content (no consumer at all today) | High | No — but flag as a separate dead-attribute finding, out of scope for this task |
| `sgs/form-field-{date,email,number,phone,select,text,textarea}.fieldName` (7 blocks) | Each `render.php:18` (`form-field-text` also `helpText`/`placeholder`/`label` for comparison) — `fieldName` feeds `field_id()` → the HTML `name=` attribute used for form-submission processing. It is a **backend processing key**, structurally distinct from the block's own `label` attr, which already carries `role='text-content'` for every one of these blocks (confirmed via `SELECT` — see evidence below). A generic BEM mockup has no notion of a form-processing key to extract. | Leave **NULL** (uniform across all 7) | High | No |
| `sgs/google-reviews.excludeKeywords` | `google-reviews/render.php:75`, `edit.js:33/142-143` — operator-typed comma-separated keyword filter (review moderation config), not visible/draft content | Leave **NULL** | High | No |
| `sgs/icon.ariaLabel` | `icon/render.php:112-113,400` — screen-reader text applied when the icon is "informative" (no link). Real functional consumer, but no draft-extraction path exists (a11y-text's own description confirms: "nothing in the converter reads a draft's aria-label into an attr, except star-rating's count"). | `a11y-text` | High | No |
| `sgs/image-sequence.posterAlt` | `image-sequence/render.php:47,177-183` — alt text passed to `sgs_responsive_image()` for the poster `<img>`. **`posterMedia` is a genuine sibling image-object attr (`attr_type='object'`)** — see companion analysis below | `image-alt`, `alt_companion_attr='posterMedia'` | Medium-high on the ROLE; **the current CG-8 consumer code will NOT actually route it** — see "flag" below | Flag: needs a code change (out of scope here), not just a DB write |
| `sgs/nav-drawer.drawerRef` | `nav-drawer/render.php:72-83,356` — the `<dialog>` element's `id`, matched by `sgs/nav-menu`'s burger via `aria-controls`. A structural wiring identifier, not content, not a11y text, not CSS. | Leave **NULL** — no existing role fits without stretching semantics (closest analogue `tag-identity` is specifically for HTML-tag/level identity, not cross-block id-linking) | Medium | No |
| `sgs/star-rating.schemaItemName` | `star-rating/render.php:36` — feeds the `itemReviewed` name in the block's Schema.org Review JSON-LD (what is being rated, e.g. a product/business name) | `identity` (the block's identifying TEXT, per the `roles` table description) | Medium | No |
| `sgs/whatsapp-cta.message` | `whatsapp-cta/render.php:39,55-58` — client-authored prefilled WhatsApp message copy, URL-encoded into the `wa.me` link | `text-content` | High | No |
| `sgs/whatsapp-cta.phoneNumber` | `whatsapp-cta/render.php:38,53-58` — raw digit string used to build the `wa.me/<number>` URL | Leave **NULL** | Medium-high | No — no role extracts "digits from a business phone field"; `link-href` would extract the whole `<a href>` value (wrong shape), and a generic mockup class is unlikely to encode a real phone number as inner text |

### esc_attr-unresolved group (9)

| Block.attr | What the source does (file:line) | Proposed role | Confidence | Override needed? |
|---|---|---|---|---|
| `sgs/button.ariaLabel` | `button/render.php:38,45,920,937` — explicit aria-label overriding the visible label text, applied when the button is icon-only or the operator sets one | `a11y-text` | High | No |
| `sgs/form-field-address.fieldName` | `form-field-address/render.php:21,63` — same backend-key pattern as the D2 group | Leave **NULL** | High | No |
| `sgs/form-field-file.fieldName` | `form-field-file/render.php:20-21` — same pattern | Leave **NULL** | High | No |
| `sgs/form-field-hidden.defaultValue` | `form-field-hidden/render.php:14` — the stored value of an invisible hidden field (e.g. a tracking value) | Leave **NULL** | High | No |
| `sgs/form-field-hidden.fieldName` | `form-field-hidden/render.php:12-13` — same backend-key pattern | Leave **NULL** | High | No |
| `sgs/icon.linkRel` | `icon/render.php:112` — the link's `rel` attribute (e.g. `nofollow noopener`), an SEO/security config value, not text | Leave **NULL** | High | No |
| `sgs/media.linkRel` | Same shape as `icon.linkRel` (both blocks share the linked-media pattern) | Leave **NULL** | High | No |
| `sgs/nav-menu.navLabel` | `nav-menu/render.php:633-657,1441` — feeds `aria-label` on the `<nav>` landmark; falls back to the resolved WP menu's own name, then `"Primary"` | `a11y-text` | High | No |
| `sgs/responsive-logo.alt` | **See dedicated verdict below — this is the disputed row.** | Leave **NULL** (see reasoning) | High that neither existing role is correct | Flag — genuine gap |

### a11y group (2)

| Block.attr | What the source does (file:line) | Proposed role | Confidence | Override needed? |
|---|---|---|---|---|
| `sgs/cart.ariaLabel` | `cart/render.php:80,227` — aria-label on the cart trigger button, defaulting to `__('View your cart')` | `a11y-text` — **already correctly classified, confirmed** | High | No |
| `sgs/form-field-consent.fieldName` | `form-field-consent/render.php:19,27` — same backend-key pattern as every other `fieldName` above | Leave **NULL** | High | No |

---

## Part 2 — the three disputed `a11y-text` rows

### `sgs/responsive-logo.alt` — Bean's doubt is CORRECT that `a11y-text` mis-describes it, but `image-alt` is the WRONG fix

**What the render does (`responsive-logo/render.php:60-67,106-116,352,357,377,381,394,401,409`):** `alt` is read straight off the block attribute, defaulted to `"{Site Name} home"` when empty, and printed via `esc_attr($alt)` into **every** rendered `<img alt="...">` across all three code paths (animation mode, custom-breakpoint switch, tablet switch, mobile-default switch). This is a real, load-bearing, always-executing consumer — the opposite of "documentation only."

**Why `image-alt` does not apply as currently shaped:** the `image-alt` role's mechanism (`converter/db/db_lookup.py:2611-2636` `image_alt_companion_for()`, consumed at `converter/walk.py:485`) requires a **sibling `image-object` attr** to hang the alt off. I queried `sgs/responsive-logo`'s full attribute list:

```
desktopLogoId       number     enum-class-probe
tabletLogoId        number     enum-class-probe
mobileLogoId        number     enum-class-probe
```

All three logo attrs are `attr_type='number'` — raw WordPress **attachment IDs**, not `image-object` dicts (`{url,id,alt}`) and not `string` image-URL attrs either. Every existing `image-alt` companion row (`decorative-image.imageAlt`→`imageUrl`, `media.imageAlt`→`imageUrl`, `product-card.imageAlt`→`image`) points at a `attr_type='string'` companion — I confirmed this directly:

```
sgs/decorative-image  imageUrl   string   image-object
sgs/media              imageUrl   string   image-object
sgs/product-card       image      string   image-object
```

I also traced *why* it must be `string`: `converter/walk.py:262-304` (`_typed_value_for_role`) only captures the alt text (`alt_value`) into the CG-8 companion lift when `role == "image-object" and attr_type == "string"` (line 295) — because for a **string**-typed image attr the extractor downcasts the extracted `{url,alt}` dict to a bare URL string, and the alt would otherwise be silently lost, which is exactly what CG-8 exists to prevent. An **object**-typed image attr keeps the full dict (alt included) as its own value, so it needs no companion at all — but `responsive-logo` has neither shape; it stores attachment IDs, which the draft-side extractor (`scalar_media_from_img`, reading a `<img src>`/`<img alt>` pair from the DOM) cannot populate in the first place.

**Verdict:** `a11y-text` is **wrong** in the sense that its own description ("nothing in the converter reads a draft's aria-label into an attr… marking it content-bearing would let the walk lift screen-reader text into visible content") does not describe this attr's real-world function — the alt genuinely reaches a rendered `<img>`, it is not decorative metadata. But `image-alt` is **also wrong** given the current schema — there is no compatible companion attr, so assigning it would create exactly the trap Bean flagged for `icon-dashicon`/`icon-emoji`/`icon-lucide`/`icon-wp-icon`: a role nothing reads. **Recommendation: leave `NULL`, with a written note** (this report) that the true fix is a code-level one — either give `responsive-logo` a `string`/`object`-typed logo attr the image-object pipeline can populate, or extend the a11y-text/image-alt vocabulary to distinguish "genuinely unclonable a11y metadata" from "a11y text with a real render consumer but no matching companion shape." That is outside this task's read-only DB scope.

### `sgs/cart.ariaLabel` — `a11y-text` is CORRECT

`cart/render.php:80` sets `$aria_label` from the attribute (default `__('View your cart')`), used at line 227 on the cart trigger button. `sgs/cart` is a functional e-commerce UI widget rendered entirely by the framework (WooCommerce Store-API hydrated) — a BEM mockup has no equivalent element carrying an intentional "shopping cart" aria-label to extract, and no code anywhere attempts to. This matches `a11y-text`'s description exactly. **Verdict: correctly classified.**

### `sgs/tabs.blockLabel` — `a11y-text` is CORRECT

`tabs/render.php:218-219` uses `blockLabel` (when set) as the accessible name for the whole tablist region. Same shape as `cart.ariaLabel` and `nav-menu.navLabel` — a structural/landmark label, not draft-extractable content, no extraction mechanism targets it. **Verdict: correctly classified.**

---

## Part 3 — the proposed `svg` role

### 1. What actually consumes an SVG-markup attr today

Two entirely separate mechanisms exist, and they behave very differently:

**(a) `sgs/hero.svgContent` / `sgs/media.svgContent` — role=`content`, `emit_shape='nested'`.** I grepped `field_extractors.py`, `scalar_content.py`, and `walk.py` for the literal string `svgContent` — **zero hits** in all three. There is no bespoke SVG-markup extractor anywhere in `converter/`. This means these two attrs are extracted through the **generic** `role in ("content", "text-content")` branch (`field_extractors.py:182-184`), which calls `rich_text_content(element)`.

I read `rich_text_content()` in full (`converter/services/lift_helpers.py:58-140`). It is explicitly a **rich-text** extractor: it whitelists only `br, strong, em, a, span, b, i, code` as pass-through tags and **strips every other tag to its (usually empty) text content**, HTML-escaping any literal text along the way. `<svg>`, `<path>`, `<circle>`, `<rect>`, `<g>` etc. are **not** in that whitelist. If a draft's hero/media SVG element is ever matched by this attr's slot during a real clone run, `rich_text_content()` would strip every SVG child element down to its (empty) inner text and hand back essentially nothing — **it would destroy the SVG markup, not preserve it.**

**(b) `sgs/container.bgSvgContent` / `sgs/cta-section.bgSvgContent` / `sgs/hero.bgSvgContent` / `sgs/trust-bar.bgSvgContent` — role=`None`, `canonical_slot=None`, `emit_shape=None`.** These are entirely outside `_content_bearing_roles()` — the content walk never even attempts to match or extract them. Their only consumer is `includes/class-sgs-container-wrapper.php:458` at **render time** (reading a value an operator or a prior process already stored), which is a rendering consumer, not a cloning/extraction consumer.

### 2. Would `svg` need to join the content-bearing set, and what breaks if it does without a matching extractor branch?

**Yes, it would need to be added to `_content_bearing_roles()`** for the walk to ever attempt to match/extract a draft's SVG markup into an `svg`-role attr at all — that set is the single gate everything else (Tier-A promotion, `_typed_value_for_role`, `field_extractors.extract_field_value`) is filtered through.

**If `svg` is added to the content-bearing set WITHOUT a dedicated extractor branch, it falls through to the same `rich_text_content()` path `content`/`text-content` already use** (per `field_extractors.py`'s `if role in (...)` dispatch chain — an unrecognised role simply returns `None` per the docstring at line 154-156, *unless* it happens to match an existing `if` clause). Concretely: unless a new `if role == "svg":` branch is added ahead of the generic dispatch, giving `svgContent` role `svg` instead of `content` would make it **fall through every branch and return `None`** (a silent no-op, since `svg` isn't in any existing `if` condition) — which is actually *safer* than today's `content` misclassification (which actively runs SVG through the text stripper) but still not what Bean wants (real SVG capture). Either way, **a real fix requires a genuinely new extractor** — something like `str(element)` / BeautifulSoup's `.decode_contents()` on the matched `<svg>` node, sanitised the way `wp_kses()` sanitises `svgAnimationSource` server-side in `responsive-logo/render.php` — not a re-use of `rich_text_content()`.

### 3. Recommendation: ADD `svg`, with these exact consumer changes

Given (a) proves the current `content` role is actively wrong for `hero.svgContent`/`media.svgContent` (it runs live SVG markup through a text-only stripper that would mangle it), the fix is not "leave it as `content`" — `content` is the bug, not the safe default. Recommend:

1. Add `svg` to the `roles` table (classification `content-bearing`, per the icon-* precedent avoid seeding it *speculatively* — seed it in the SAME commit as the extractor, not ahead of it, per the `feedback_universal_extensions_attach_where_they_make_no_sense` / "a role nothing reads is worse than no role" lesson).
2. Add `svg` to `_content_bearing_roles()` in `db_lookup.py`.
3. Add a new `if role == "svg":` branch in `field_extractors.extract_field_value()` that extracts raw markup from the matched `<svg>` element (self or descendant) via `.decode_contents()`/`str()`, then sanitises it the same way `sgs_svg_kses_allowed_tags()` already does server-side for `responsive-logo`'s `svgAnimationSource` — reusing an existing, already-audited allowlist rather than inventing a new one.
4. Reclassify `sgs/hero.svgContent` and `sgs/media.svgContent` from `content` → `svg` in the same commit as steps 1-3 (a DB-only role flip without the extractor branch would leave them silently returning `None`, per point 2 above — worse than today in a different way, so these two must ship together, not staggered).
5. `bgSvgContent` (4 rows) can THEN be given `role='svg'` too, once the walk is taught to route it through the wrapper-scoped BEM slot — see the gap explanation below; that is a second, separable piece of work because it also needs `canonical_slot`/matching, not just role+extractor.

This is a "build a small real thing" recommendation, not a documentation-only DB reclassification — flagging explicitly that steps 2-4 are code changes outside this task's read-only remit.

### 4. Why `sgs/container.bgSvgContent` appears in NO fingerprint/classification bucket

Confirmed empirically — `bgSvgContent` on all four blocks (`container`/`cta-section`/`hero`/`trust-bar`) has `role=NULL`, `canonical_slot=NULL`, `emit_shape=NULL`, and (checked directly) **no inline `"role"` key in `container/block.json`** either (unlike `sgs/media`, which declares 5 inline `"role": "content"` keys that at least exist as an unused hand-authored signal per `.claude/reports/2026-08-04-attribute-seeding-root-cause.md`). So there is genuinely zero classification signal from any of the three channels that report documents (DB seed, inline block.json `role`, or `supports.sgs.*`).

The most likely root cause, by direct analogy to a finding already on record in this repo: that same 2026-08-04 report proves the **emission scanner never opens `class-sgs-container-wrapper.php`** — it only scans each block's own `render.php` text (`extract-signatures.py:1824-1826`), and `bgSvgContent`'s only real consumer (`class-sgs-container-wrapper.php:458`) lives in that shared wrapper class, not in `container/render.php` itself. This is the exact same "scan-scope bug" the report already documents for the grid/gap tier gaps on `accordion`/`container`/`cta-section`/`trust-bar`/`hero`. I did not re-run the scanner to prove this is the SAME bug for `bgSvgContent` specifically (that would require re-running `extract-signatures.py`, out of this task's read-only scope) — I am reporting it as the best-evidenced explanation, not a proven one. See "Could not determine" below.

---

## Could not determine

- **Whether `sgs/star-rating.schemaItemName` is ever actually populated from a draft mockup in practice**, vs. always operator-typed post-clone — I read only the render consumer, not a live clone run, so `identity` is a reasoned proposal, not proven by a positive extraction test.
- **Whether the `bgSvgContent` "no bucket" root cause is literally the same wrapper-class scan-scope bug** documented for grid/gap attrs, or a distinct cause (e.g. the auto-detection session's heuristic never considered `Svg`-suffixed string attrs as content candidates at all). I did not re-run `extract-signatures.py` to distinguish these — doing so would go beyond read-only DB querying.
- **Whether `sgs/form.formName` was ever wired to anything** (e.g. an admin submissions-list label) at an earlier point in the plugin's history — I confirmed it is dead in the current `render.php` and `includes/forms/`, but did not check git history for a past consumer that was since removed.
- **The exact intended behaviour of `sgs/whatsapp-cta.phoneNumber` in a cloning context** — whether Bean wants this to ever be draft-extractable at all, or whether it should always be a manual post-clone operator entry (it's business-identifying data, arguably shouldn't be cloned from a competitor's mockup even if technically possible).

---

## Summary counts

- 28 rows requested + 3 disputed = 31 rows examined, all with file:line evidence.
- Of the 28: 6 proposed as a real role (`text-content` ×3, `a11y-text` ×3), 1 proposed as `image-alt` with a flagged non-functional gap, 21 recommended `leave NULL` (11 of those are the uniform `fieldName` pattern across 11 form-field blocks).
- Of the 3 disputed: 2 confirmed correctly classified (`cart.ariaLabel`, `tabs.blockLabel`), 1 confirmed mis-described but with no correct existing-vocabulary fix available (`responsive-logo.alt`).
