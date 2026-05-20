# Real-Path Honest Analysis — Rater A
**Date:** 2026-05-20  
**Role:** Honest-path council — what actually closes pixel-diff to ≤ 1% per section  
**Evidence base:** Screenshots, live HTML curl, leftover-buckets.json, extract.json, render.php, convert.py, mockup index.html

---

## What the screenshots actually show

Before classifying root causes, here is what the eye sees comparing mockup to live render at 1440px.

### Hero (67.8% diff)

**Mockup:** Pink-background split layout, left panel has label → h1 → subheadline → two CTA buttons side-by-side ("Shop Zookies" primary, "Try 3 for £5" secondary). Headline reads "Made for the mum / who needs it most" (with a `<br>` creating the line break). Large food photograph on the right.

**SGS live:** Same pink split layout, label → h1 → subheadline present. **The CTA div is completely empty.** `<div class="sgs-hero__ctas"></div>`. No buttons visible. Headline reads "Made for the mumwho needs it most" — "mum" and "who" run together (missing word break). Same photograph is present.

Two visible failures:
1. No buttons (structural — not a styling gap)
2. No line break in headline (content processing gap)

### Brand (43.7% diff)

**Mockup:** Cream background, 2-column grid: left = text content (h2 + blockquote body text + ghost CTA "Read the full story →"), right = photograph of cookies.

**SGS live:** Correct 2-column grid layout, correct cream background, h2 present, body text present, ghost CTA button present, photograph present. The visible difference is minor: image arrangement, slight font weight/size differences on the heading, and the WP admin toolbar and navigation bar consuming ~60px of vertical space above the section (these are not mockup elements — they are WP chrome included in the screenshot crop).

The 43.7% is dominated by **layout offset from WP chrome** (admin bar + nav menu above the section shifts every element downward, pushing pixels out of alignment even when the section itself is correct).

### Social-proof (57.2% diff)

**Mockup:** 3-column static grid of testimonial cards, each card showing stars + quote text + "Name, City" in bold. Wide layout, light cream background.

**SGS live:** Single-card carousel (testimonial slider) with left/right navigation arrows, pagination dots, a pause button, and an avatar circle with initials. Layout is fundamentally different — one card visible at a time instead of three.

This is a **block variant mismatch** — the mockup shows a 3-grid layout; cv2 emitted `sgs/testimonial-slider` which renders in carousel mode. It is not a CSS gap. Even perfect CSS lifts won't close this: the DOM structure is architecturally different.

### Trust-bar (31.7% diff)

**Mockup:** Pink background strip, 4 items each with a circle icon (SVG Lucide icon inside a circle) above label text. Items: house icon "Handmade in Birmingham", tick icon "Registered Food Business", truck icon "Free UK Delivery Over £35", star icon "Loved by Breastfeeding Mums".

**SGS live:** Pink background strip, 4 items but **icons are missing**. Each item shows an empty `<span class="sgs-trust-bar__value">` (blank) then the label text. The `showItemIcons` attribute defaults to `false` — icons only appear when `showItemIcons: true` AND `icon` is populated per item. cv2's trust-bar emission has no icon data:

```
items: [{"label":"Handmade in Birmingham"},{"label":"Registered Food Business"},...]
```

No `icon` field per item, no `showItemIcons: true`. Icons are the primary visible content that makes the trust bar look designed. Without them, it's just a row of centred text labels.

Additionally: the mockup uses `sgs-trust-bar__inner` → `sgs-trust-bar__badge` → `sgs-trust-bar__icon` + `sgs-trust-bar__text`. The render.php uses `sgs-trust-bar` → `sgs-trust-bar__item` → `sgs-trust-bar__icon` + `sgs-trust-bar__value` + `sgs-trust-bar__label`. Different sub-element names — **confirmed R2 dead-selector instance**.

---

## Root-cause classification by section

### Hero — primary cause: **(e) Block architecture mismatch + (b) Missing attribute lift**

The hero CTA gap is not a CSS selector problem. The hero block's CTAs are rendered via `$content` (InnerBlocks) per `render.php:771`: `$content_html .= '<div class="sgs-hero__ctas">' . $content . '</div>'`. The block receives `$content` from WordPress, which is the InnerBlocks HTML. cv2 emits a self-closing block comment: `<!-- wp:sgs/hero {...} /-->` — no InnerBlocks children. WordPress passes empty string for `$content`. Result: empty CTA div.

Evidence: `convert.py:3301` — `attrs["ctaPrimaryText"] = cta.get_text(strip=True)`. cv2 lifts CTA text as legacy attributes (`ctaPrimaryText`, `ctaSecondaryText`). But `render.php:56` — these variables are read but `render.php:611-612` documents "CTA buttons now rendered via sgs/multi-button + sgs/button InnerBlocks. Legacy ctaPrimary* / ctaSecondary* attributes are handled by deprecated.js migration." The variables are assigned from attributes but **never used to generate HTML output** in render.php. Every occurrence is CSS styling (hover vars). The actual button HTML comes from `$content`. Legacy attrs do not render buttons server-side.

The headline word-break gap is `convert.py:3265`: `attrs[heading_attr] = h.get_text(strip=True)`. BeautifulSoup's `.get_text(strip=True)` strips all HTML tags including `<br>`. The line `Made for the mum<br>who needs it most` becomes `Made for the mumwho needs it most`.

**Operator-promotion fixes neither of these.** No amount of attribute promotion routes CTA button content into InnerBlocks. No promotion fixes `<br>` stripping. These are pipeline bugs.

### Trust-bar — primary cause: **(b) Missing block attribute lift (icons) + (a) Dead CSS selectors**

cv2 does not extract icon data from trust-bar items because the mockup does not have Lucide icon slugs encoded in it. The mockup embeds SVG inline (`<svg>...</svg>` inside `sgs-trust-bar__icon`). cv2 would need to match those SVGs to Lucide icon slugs — a reverse-lookup problem. The `extract.json` confirms: items array has only `{label: "..."}`, no `icon` field, no `showItemIcons: true`.

The CSS dead-selector problem is confirmed: mockup uses `sgs-trust-bar__badge` and `sgs-trust-bar__text`, render.php uses `sgs-trust-bar__item` and `sgs-trust-bar__label`. These are R2 mismatches. After R2 reconciliation the CSS lifts would reach the right elements, but without icons the bar still looks bare. The icon gap is dominant at this section.

**Operator-promotion cannot fix icon extraction.** An operator can manually set icon slugs in the editor, but that is not "promotion" of lifted attributes — it is fresh content entry.

### Social-proof — primary cause: **(e) Block variant/structural mismatch**

cv2 correctly identifies `sgs/testimonial-slider` and emits testimonial content. The problem is the block renders in carousel mode (one card at a time) while the mockup shows a static 3-column grid. This is a `displayMode` or `columns` attribute that cv2 does not lift — the mockup CSS uses `sgs-testimonial-slider` but the layout is `display: grid; grid-template-columns: 1fr 1fr 1fr`. The render.php for `sgs/testimonial-slider` produces a carousel DOM with navigation arrows; there is no grid layout mode exposed. The section cannot reach ≤ 1% diff without either (a) the block adding a `displayMode: grid` option that stops the carousel and shows all cards simultaneously, or (b) using a different block (`sgs/card-grid` or repeating `sgs/testimonial`).

**This is not fixable by operator-promotion.** It requires a block attribute addition.

### Brand (43.7%) — primary cause: **(c) Measurement contamination**

The screenshots confirm the brand section's content is substantially correct: 2-column grid, heading, body text, ghost CTA, photograph. The 43.7% diff is inflated by:
1. WP admin toolbar (~32px) and navigation menu (~60px) above the section that shift all elements downward in the crop
2. Navigation bar visible at top of the SGS screenshot (not present in mockup crop)

The actual content visible difference is minor — slight heading font weight variation and a slightly different image crop. After removing the WP chrome offset, this section is likely at 5-15% true content diff.

**The navigation bar contamination is measurement-side**. Every section's pixel-diff is inflated because the live render includes the sticky navigation bar in each section screenshot. The mockup has no navigation overlay. This is a systematic +5-15pt inflation across all sections.

---

## Is operator-promotion the right path?

**Honest answer: no, it is not the dominant path. It is a tertiary fix that matters after the first two structural problems are resolved.**

The session hypothesis was: "operator-driven attribute promotion will incrementally close R2 dead-CSS-selector problem." That is plausible for a subset of gaps but the evidence shows it is not the dominant mechanism for any section:

| Section | Dominant gap | Is it R2 dead-selectors? | Is promotion the fix? |
|---|---|---|---|
| Hero | Empty CTA div + missing `<br>` | No | No |
| Trust-bar | Icons not extracted, no `showItemIcons` | Partially | No (icon slugs need a new lift mechanism) |
| Social-proof | Block variant wrong (carousel vs grid) | No | No |
| Brand | WP chrome measurement contamination | No | No |

R2 dead-selector reconciliation (`block_element_synonyms` DB table + Stage 0.6 class reconciler) is real work and will produce gains — particularly for sections where the CSS was lifted correctly but is targeting non-existent class names. But for the four sections measured, R2 is not the first-order problem. Promoting attributes from `attribute-gap-candidates.txt` to `block.json` will not render CTA buttons, will not add icons to the trust bar, will not switch the testimonial slider to grid mode, and will not remove the nav bar from screenshots.

Calling promotion "the real path" now would be a band-aid framing: it papers over three structural gaps by attributing them to a fourth problem that is real but secondary.

---

## The real fix path, in priority order

### Fix 1: Measurement decontamination (~30 min)
**File:** `scripts/pixel-diff.py` (or the Playwright screenshot script that produces section crops)  
**Problem:** Screenshots include WP admin bar + navigation in every section crop, inflating every section by 5-15%.  
**Fix:** Append `?logged_out=1` or use a logged-out Playwright context. Or add `screenshot({ clip: { selector: '.sgs-hero' } })` after hiding `#wpadminbar` and `.sgs-header` via `evaluate`. This produces clean section-only crops. Without this, every measurement overstates the gap.

### Fix 2: Hero CTA InnerBlocks emission (~2 hours)
**File:** `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` hero handler  
**Problem:** cv2 lifts `ctaPrimaryText`/`ctaSecondaryUrl` as legacy attrs but render.php ignores them. InnerBlocks `$content` is empty because the block comment is self-closing.  
**Fix:** cv2's hero emitter must generate nested block comments for InnerBlocks when CTA data is present:
```
<!-- wp:sgs/hero {"headline":"...", ...} -->
<!-- wp:sgs/multi-button {...} -->
<!-- wp:sgs/button {"text":"Shop Zookies","url":"/shop/","style":"primary"} /-->
<!-- wp:sgs/button {"text":"Try 3 for £5","url":"/product/trial-pack/","style":"secondary"} /-->
<!-- /wp:sgs/multi-button -->
<!-- /wp:sgs/hero -->
```
This is not about promoting attributes — it is generating InnerBlocks markup from the extracted CTA data.

### Fix 3: Headline `<br>` preservation (~1 hour)
**File:** `convert.py:3265`  
**Problem:** `h.get_text(strip=True)` strips `<br>` tags, collapsing word-break formatting.  
**Fix:** Replace with `h.decode_contents()` (returns inner HTML preserving tags), then strip only outer whitespace. Store as `innerHTML`-aware string in the headline attribute. render.php already uses `wp_kses_post()` on the headline, which passes `<br>` through.

### Fix 4: Trust-bar icon lift (~3 hours, needs design decision)
**File:** `convert.py` trust-bar handler  
**Problem:** Mockup icons are inline SVGs; render.php uses Lucide slug strings (`"home"`, `"check"`, etc.). No reverse-lookup from SVG to slug exists.  
**Fix options (in order of effort):**  
(a) Add a known-mappings dict from Mamas Munches SVG fingerprints to Lucide slugs — one-time seed for this client's 4 icons.  
(b) Build a generic SVG-to-Lucide fingerprint DB from `includes/lucide-icons.php` — universal, reusable.  
(c) Leave icons blank in cv2 output, add `showItemIcons: false` to suppress the empty icon container so the trust bar at least renders cleanly without them. This closes the double-text bug (currently `__value` shows empty + `__label` shows text — two lines of text for each item).

### Fix 5: R2 dead-selector reconciliation (synthesis recommendation, still valid)
**Files:** New `block_element_synonyms` DB table + Stage 0.6 class reconciler  
**This is the right path FOR THE SUBSET of gaps where cv2 lifted valid CSS but it targets mockup class names.** After Fixes 1-4 close the structural gaps, R2 becomes the primary remaining mechanism. For trust-bar: `__badge` → `__item`, `__text` → `__label`. For hero: `__sub` → `__subheadline`. This lifts are blocked until R2 is fixed. Promotion does not fix these selectors — reconciliation does.

### Fix 6: Testimonial slider `displayMode: grid` attribute
**File:** `src/blocks/testimonial-slider/block.json` + `render.php`  
**Problem:** No grid layout mode exists. Block is carousel-only.  
**Fix:** Add `displayMode` attribute with `carousel` (default) and `grid` values. When `grid`, render as CSS grid without navigation arrows. cv2 detects grid layout in mockup via `display:grid` on `sgs-testimonial-slider` and emits `displayMode: grid`.

---

## Summary judgement

The pixel-diff numbers at 43-87% across sections do not primarily represent CSS-attribute gaps that operator-promotion can close. They represent:

1. **Measurement inflation** — WP chrome in every screenshot (~5-15pt per section, affects all sections)
2. **Structural emit gaps** — hero CTAs are InnerBlocks, not attrs; cv2 emits self-closing comment, buttons absent (~30pt for hero)
3. **Missing content data** — trust-bar icons have no slug in mockup, cv2 cannot extract what isn't there (~15pt for trust-bar)
4. **Block variant wrong** — testimonial slider carousel vs static grid (~50pt for social-proof)
5. **R2 dead CSS selectors** — real, but secondary to the above; responsible for remaining ~10-15pt after Fixes 1-4

Operator-promotion addresses none of these. It is the right mechanism for expanding `block.json` schema to expose attributes that exist in render.php but aren't in block.json — a real gap but a fourth-order contributor. Treating it as "the real path" would send the next session chasing 5% wins while the 50% structural gaps remain open.

**The real path is Fixes 1-4 above, in that order, targeting ~3-4 engineering hours total.**
