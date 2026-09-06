# T6 — gradient-path-deferred classifier: work list

**doc_type:** report
**Date:** 2026-09-03
**Scope:** `plugins/sgs-blocks/scripts/colour-codemod/` only. No `block.json`/`edit.js`/`render.php`/`style.css`/`src/` edits. No git commands run. No `fix.js --apply`. No deploy, no `sgs-update-v2.py`, no DB writes.

## What this answers

`fix.js --fix` (dry run) refuses every colour row it cannot autofix, tagging one bucket `REFUSED:gradient-path-deferred`. That bucket mixes two structurally incompatible repairs (direct-paint vs custom-property indirection) under one refusal string, which is why nobody could start the batch safely. This report classifies every row in that bucket, with evidence, into the repair it actually needs.

## Tool built

`plugins/sgs-blocks/scripts/colour-codemod/classify-gradient-path-deferred.js` — read-only, rerunnable. It:

1. Runs `node fix.js --fix` itself (never hand-typed) and parses every `REFUSED:gradient-path-deferred` line.
2. Looks up each row's `css_property`/`css_element` from the DB (read-only connection, `mode=ro`) — used only as an existence check, not as the verdict source (the verdict is always textual evidence from the block's own PHP/CSS).
3. Classifies each row via three ordered strategies (first hit wins), all evidence-based:
   - **Strategy 0 — shared button-element helper.** A `sgs_button_element_style_css($attributes, 'prefix', …)` call in render.php whose prefix + `ColourText`/`ColourTextHover` matches the attribute. That helper (`includes/helpers-button-style.php`) does a direct `'color:' . sgs_colour_value(...)` paint — verified once, applies to every call site.
   - **Strategy 1 — shared custom-property MAP array.** An array literal in render.php or a `require_once`'d file, shaped either `'attrName' => '--css-var'` (post-grid/tabs) or `'--css-var' => …$attributes['attrName']` (nav-menu), with a confirmed `var(--css-var)` consumer.
   - **Strategy 2 — direct variable trace.** `$var = $attributes['attrName']`, followed up to two hops through `$derived = <expr using $var>` assignments (excluding bare `$var[] = …` array-pushes — those are generic multi-purpose accumulators, not single-value derivations; see Anti-vacuity below), then scanned for either a CSS paint-property token (`color:`, `background-color:`, etc., including the `array('color' => $var)` shape used by `sgs/testimonial`'s `$sgs_el_rule` closure) or a `--` custom-property token.
   - A dedicated check flags rows that route into WordPress core's native `wp_style_engine_get_styles()` (via a `style_color_args`/`style_engine_args` accumulator) as their own case — genuinely a third mechanism, forced into neither A nor B.
4. Never guesses: any row that doesn't produce direct textual evidence for A or B is reported NEEDS-HUMAN with what was tried.

**Run commands:**
```
node plugins/sgs-blocks/scripts/colour-codemod/classify-gradient-path-deferred.js --json <out.json>
node plugins/sgs-blocks/scripts/colour-codemod/classify-gradient-path-deferred.js --disable-a-detection
```

## Final counts (this run, 2026-09-03)

fix.js currently reports **93 refused** rows total (up from the brief's snapshot of 89 — moving target, as expected). Of those, **47** carry the `gradient-path-deferred` refusal (46 `text`-mechanism + 1 `stroke`-mechanism, `sgs/before-after.handleIconColour`, included per the task's literal scope "every colour row the codemod refuses with gradient-path-deferred").

| Bucket | Count | Meaning |
|---|---|---|
| **A — direct paint** | **28** | Near drop-in for the shipped gradient helper triad |
| **B — custom-property indirection** | **17** | Needs a different repair shape (see below) |
| **NEEDS-HUMAN** | **2** | Genuinely a third mechanism (WP core Style Engine), not this classifier's two recipes |

**Re-running is safe and expected to move**: this set was 44 rows before an earlier same-day DB reseed and 47 after. The classifier re-derives everything from `fix.js --fix`'s live output each run — never a cached number.

## Full per-row table

### Cluster A — direct paint (28 rows)

| Block.attr | render.php site | PHP var | CSS selector (scoped) | Single-state or normal+hover |
|---|---|---|---|---|
| `sgs/brand-strip.nameColour` | :436 | `$name_colour` | `.sgs-brand-strip__name` | single |
| `sgs/card-grid.textColourHover` | :273 | `$hover_text` | (hover state of title/card text) | hover |
| `sgs/form.submitColour` | :224 | `$submit_colour` | submit button | single |
| `sgs/google-reviews.writeReviewColourText` | shared helper, prefix `writeReview` | via `sgs_button_element_style_css()` | `.sgs-google-reviews__write-review` | single (+ hover sibling `writeReviewColourTextHover` via same helper) |
| `sgs/google-reviews.arrowColourText` | shared helper, prefix `arrow` | via `sgs_button_element_style_css()` | `.sgs-google-reviews__arrow` | single (+ hover sibling) |
| `sgs/modal.triggerColour` | :41 | `$trigger_colour` | trigger element | single |
| `sgs/modal.closeColourText` | shared helper, prefix `close` | via `sgs_button_element_style_css()` | `.sgs-modal__close` | single |
| `sgs/nav-menu.navColour` | :856 | `$nav_colour` | nav root text | single |
| `sgs/nav-menu.itemColour` | :893 | `$item_colour` | `$link_sel` | single (hover sibling `itemColourHover` exists separately) |
| `sgs/nav-menu.burgerColour` | :1109 | `$burger_colour` | `.sgs-nav-menu__burger` | single |
| `sgs/option-picker.labelColour` | :542 | `$label_colour` | legend | single |
| `sgs/post-grid.textColourHover` | :635 | `$hover_text` | card hover targets | hover |
| `sgs/pricing-table.titleColour` | :515 | `$title_colour` | `.sgs-pricing-table__name`, `.sgs-pricing-table__title` | single |
| `sgs/pricing-table.featureColour` | :502 | `$feature_colour` | `.sgs-pricing-table__feature` | single |
| `sgs/pricing-table.ctaColour` | :507 | `$cta_colour` | CTA text | single |
| `sgs/pricing-table.popularBadgeColour` | :470 | `$badge_colour` | popular badge | single |
| `sgs/process-steps.numberColour` | :375 | `$number_colour` | step number | single |
| `sgs/process-steps.titleColour` | :404 | `$title_colour` | `{$title_scope}` | single |
| `sgs/process-steps.descriptionColour` | :408 | `$description_colour` | `{$desc_scope}` | single |
| `sgs/product-card.ctaColourText` | shared helper, prefix `cta` | via `sgs_button_element_style_css()` | CTA element | single |
| `sgs/product-card.tagTextColour` | :545 | `$sgs_tag_text_colour` | `.sgs-product-card__tag--trial` | single |
| `sgs/quote.attributionColour` | :225 | `$attrib_colour` | attribution | single |
| `sgs/quote.textColourHover` | :284 | `$hover_colour` | hover state | hover |
| `sgs/testimonial.summaryColour` | :291 (via `$sgs_el_rule`) | `$summary_colour` | `.sgs-testimonial__summary` | single |
| `sgs/testimonial.nameColour` | :355 (via `$sgs_el_rule`) | `$name_colour` | `.sgs-testimonial__name` | single |
| `sgs/testimonial.roleColour` | :367 (via `$sgs_el_rule`) | `$role_colour` | `.sgs-testimonial__role` | single |
| `sgs/testimonial.orgColour` | :373 (via `$sgs_el_rule`) | `$org_colour` | `.sgs-testimonial__org` | single |
| `sgs/testimonial.ratingColour` | :282 (via `$sgs_el_rule`) | `$rating_colour` | `.sgs-testimonial__rating` | single |

### Cluster B — custom-property indirection (17 rows)

| Block.attr | Custom property | Assigned at | Consumed at |
|---|---|---|---|
| `sgs/before-after.labelColour` | `--sgs-before-after-label-colour` | render.php:271 | style.css:192 |
| `sgs/before-after.handleIconColour` | `--sgs-before-after-handle-icon-colour` | render.php:265 | style.css:259 |
| `sgs/button.colourText` | `--sgs-btn-color` | render.php:346 | style.css:71 |
| `sgs/mega-panel.iconColour` | `--sgs-mm-accent-text` | render.php:218 (via derived `$accent_text_value`) | style.css:259,294,315 |
| `sgs/nav-menu.featuredColour` | `--sgs-nm-featured-colour` | render.php:1060 | render.php:1384 |
| `sgs/nav-menu.submenuColour` | `--sgs-nm-submenu-colour` | render.php:1220 | render.php:1354 |
| `sgs/option-picker.pillTextColour` | `--sgs-op-text` | render.php:307 | style.css:187 |
| `sgs/post-grid.titleColour` | `--sgs-pg-title-colour` | `includes/class-post-grid-rest.php:296` | style.css:344 |
| `sgs/post-grid.excerptColour` | `--sgs-pg-excerpt-colour` | `includes/class-post-grid-rest.php:297` | style.css:360 |
| `sgs/post-grid.metaColour` | `--sgs-pg-meta-colour` | `includes/class-post-grid-rest.php:298` | style.css:294 |
| `sgs/post-grid.categoryBadgeColour` | `--sgs-pg-badge-colour` | `includes/class-post-grid-rest.php:300` | style.css:317,328 |
| `sgs/post-grid.readMoreColour` | `--sgs-pg-readmore-colour` | `includes/class-post-grid-rest.php:299` | style.css:374 |
| `sgs/product-card.titleColour` | `--sgs-card-title-colour` | render.php:162 | style.css:1089 |
| `sgs/product-card.descColour` | `--sgs-card-desc-colour` | render.php:168 | style.css:1096 |
| `sgs/product-card.priceColour` | `--sgs-card-price-colour` | render.php:165 | style.css:161,196,1139 |
| `sgs/product-card.priceNoteColour` | `--sgs-card-price-note-colour` | render.php:171 | style.css:1145 |
| `sgs/tabs.tabTextColour` | `--sgs-tab-text` | render.php:77 | style.css:87 |

### NEEDS-HUMAN (2 rows — genuine third mechanism)

| Block.attr | Why |
|---|---|
| `sgs/process-steps.textColour` | Routes through `$style_color_args['text'] = ...$attributes['textColour']` → `wp_style_engine_get_styles()` (WP core), not an SGS colour helper. Neither Cluster A nor B applies; needs its own repair shape (likely: intercept before the style-engine call and add gradient handling there, or accept as a scoped exception). |
| `sgs/testimonial-slider.textColour` | Same WP core Style Engine mechanism (`$slider_color_args['text']` → `$slider_style_engine_args['color']` → `wp_style_engine_get_styles()`). Note: `sgs/testimonial-slider` is also on the fidelity-exclusion list (accepted testimonial slider) per project memory — worth confirming with Bean whether this row needs the gradient fix at all before spending time on it. |

## Verification performed (verbatim)

### 1. Positive control — 3 Cluster A rows, lines quoted from render.php

```
--- process-steps.numberColour ---
$number_colour           = $attributes['numberColour'] ?? '';
	$num_decls[] = 'color:' . sgs_colour_value( $number_colour );

--- quote.attributionColour ---
$attrib_colour      = $attributes['attributionColour'] ?? '';
	$attrib_decls[] = 'color:' . sgs_colour_value( $attrib_colour );

--- pricing-table.ctaColour ---
$cta_colour            = $attributes['ctaColour'] ?? '';
		$pt_cta_decls[] = 'color:' . $colour_val( $cta_colour );
```
All three show the resolved colour concatenated straight after `'color:'` — direct paint, confirmed.

### 2. Negative control — 2 Cluster B rows, both halves quoted, consumer confirmed landed

```
--- tabs.tabTextColour ---
render.php:77   'tabTextColour'            => '--sgs-tab-text',
style.css:87    color: var( --sgs-tab-text, var( --wp--preset--color--text-muted, #555555 ) );

--- product-card.priceColour ---
render.php:158  $sgs_price_colour      = sgs_colour_value( $attributes['priceColour'] ?? '' );
render.php:165  $inline_styles[] = '--sgs-card-price-colour:' . $sgs_price_colour . ';';
style.css:161   color: var(--sgs-card-price-colour, var(--wp--preset--color--text, #3a2e26));
```
Both show the assignment to the custom property AND the `var(...)` consumer resolved — the row genuinely needs custom-property-shaped indirection, so a single-shot 3-declaration paint recipe cannot be dropped in.

### 3. Anti-vacuity — disabling A-detection zeroes the A bucket cleanly

```
$ node classify-gradient-path-deferred.js
gradient-path-deferred classifier — 47 row(s): A=28 B=17 NEEDS-HUMAN=2

$ node classify-gradient-path-deferred.js --disable-a-detection
gradient-path-deferred classifier — 47 row(s): A=0 B=17 NEEDS-HUMAN=30  [A-DETECTION DISABLED — control run]
```
With A-detection disabled, A drops to exactly 0 and every one of the 28 previously-A rows falls to NEEDS-HUMAN (not silently reclassified as B — the B count is unchanged at 17). 0 + 17 + 30 = 47. Confirms the A detector is doing real, falsifiable work rather than defaulting rows into A.

**This anti-vacuity check itself caught a real bug during development**: the first version of the classifier used a looser "any `--` token on the line" test for Cluster B, which false-matched the BEM modifier `sgs-product-card__tag--trial` as if it were a CSS custom property, silently mis-bucketing `product-card.tagTextColour` toward NEEDS-HUMAN. A second bug — over-eager two-hop derived-variable tracing through a generic `$scoped_css[] = …` accumulator array — briefly mis-bucketed `brand-strip.nameColour` as Cluster B via an unrelated `--sgs-name-text-align` custom property that happened to share the same accumulator variable. Both are now guarded: a negative-lookbehind on the custom-property token (`(?<![\w-])--…`) and exclusion of bare `$var[] = …` array-pushes from derived-variable tracing.

### 4. Cross-check against the 32 shipped blocks

```
$ grep -rl "sgs_text_colour_gradient_fallback_rule" src/blocks/*/render.php | wc -l
32
```
Blocks appearing on BOTH the shipped-helper list and this refusal list: `sgs/brand-strip`, `sgs/card-grid`, `sgs/pricing-table`, `sgs/product-card`, `sgs/testimonial`.

**sgs/card-grid** — `titleColour`/`subtitleColour` already route through the full triad:
```
render.php:754  $title_colour_effective = sgs_resolve_text_colour_or_gradient( $title_colour, $title_colour_gradient );
render.php:756      $title_colour_decl = sgs_text_colour_decl( $title_colour_effective );
render.php:760      $sgs_grid_typo_css .= sgs_text_colour_gradient_fallback_rule( $sgs_grid_title_sel, $title_colour_effective );
```
…while the refused sibling `textColourHover` in the SAME file, 40 lines away, still does the plain concat:
```
render.php:273  $card_grid_hover_decls[] = 'color:' . sgs_colour_value( $hover_text );
```

**sgs/pricing-table** — `priceColour` already routes through the triad:
```
render.php:481  $price_colour_effective = sgs_resolve_text_colour_or_gradient( $price_colour, $price_colour_gradient );
render.php:484      $price_colour_decl = sgs_text_colour_decl( $price_colour_effective );
render.php:488      $responsive_css .= sgs_text_colour_gradient_fallback_rule( $price_sel, $price_colour_effective );
```
…while its refused siblings `titleColour`, `featureColour`, `ctaColour`, `popularBadgeColour` in the same file still do the plain concat (lines 515, 502, 507, 470).

This is the strongest evidence available that Cluster A's recipe is correct: it is not a new pattern being proposed, it is the existing, working, in-production pattern sitting a few lines away in the exact same file.

## Cluster A generalised recipe (for the batch that follows)

For each Cluster A row, replace the flat concat:
```php
$scoped_css[] = 'color:' . sgs_colour_value( $var ) . ';';
```
with the shipped triad (mirroring `sgs/card-grid`/`sgs/pricing-table`'s existing `priceColour`/`titleColour` sites):
```php
$var_effective = sgs_resolve_text_colour_or_gradient( $var, $var_gradient );
if ( '' !== $var_effective ) {
    $var_decl = sgs_text_colour_decl( $var_effective );
    if ( '' !== $var_decl ) {
        $scoped_css[] = $selector . '{' . $var_decl . '}';
    }
    $scoped_css[] = sgs_text_colour_gradient_fallback_rule( $selector, $var_effective );
}
```
Per-row holes to fill for each of the 28 A rows (all named in the table above):

- **`$var` / `$var_gradient`** — the attribute's own PHP var (table col 3) and its NOT-YET-EXISTING gradient sibling attribute (`{attr}Gradient` in block.json — needs adding for each row; none of the 28 currently declare one, since the gradient dimension is exactly what's deferred).
- **`$selector`** — table col 4 (scoped CSS selector) — already present in every row's existing code, just needs reuse instead of the flat `'color:'` string.
- **Single-state vs hover** — 4 of the 28 rows are hover-state paints (`card-grid.textColourHover`, `post-grid.textColourHover`, `quote.textColourHover`, and `nav-menu.itemColour`'s sibling `itemColourHover` not itself in this list but adjacent) — these need the hover-scoped selector and, per fix.js's existing "every dimension or none" discipline, should be fixed in the SAME pass as the row's own hover-state gradient if one exists, never half-fixed.
- **Shared-helper rows** (`google-reviews.writeReviewColourText`/`arrowColourText`, `modal.closeColourText`, `product-card.ctaColourText`) — these 4 do NOT get a per-block edit. Fixing `includes/helpers-button-style.php`'s `$colour_text` branch (line 144, plus its `ColourTextHover` sibling at ~line 200) once fixes all `*ColourText` attributes on every block that calls `sgs_button_element_style_css()` — a shared-mechanism fix, not 4 separate ones (per the project's own captured lesson: "a shared function serving N flagged blocks is one fix, not N").

## Cluster B — why it needs a different shape (not detailed as a recipe here, out of this task's scope)

A text gradient is three CSS declarations (`background-image`, `background-clip:text`, `color:transparent`) that must land on the SAME rule. A single custom property consumed as `color: var(--x)` cannot carry three declarations through one substitution point. The repair shape for these 17 rows is a separate design question (e.g. promoting the custom property to a small set of gradient-aware custom properties, or moving the consuming selector to accept a full declaration block) — intentionally not designed here; this report's job was classification, not the Cluster B fix design.

## Files

- Classifier (new): `plugins/sgs-blocks/scripts/colour-codemod/classify-gradient-path-deferred.js`
- Machine-readable output: regenerate on demand via the `--json <path>` run command above (not committed — ephemeral, rerun any time; counts are expected to move as the DB reseeds and more rows convert)
- Untouched (read-only, verified via `--self-test`): `plugins/sgs-blocks/scripts/colour-codemod/fix.js`, `survey.js`
