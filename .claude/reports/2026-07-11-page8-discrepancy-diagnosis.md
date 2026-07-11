# Page-8 discrepancy programme — LIVE root-cause diagnosis (2026-07-11)

## STATUS (D306 shipped 2026-07-11, `0908ff92`, pushed)
- ✅ **Cause 1 — black borders (8 items):** FIXED + LANDED. WP-core drops `var:preset|color|` border-color; converter now emits direct `var(--wp--preset--color--{slug})`. Live: #E8D5C0 / #F5D050 accurate.
- ✅ **Cause 2a — equal-height cards + brand "Read The Full Story" button (3 items):** FIXED + LANDED. `verticalAlign` default `start`→`''`. Cards 495/495; brand button full-width centred.
- ⏳ **REMAINING (9 items), each with proven cause below:**
  1. Featured button white text → product-card CTA divergent `--sgs-product-card-btn-text,#ffffff` (route to shared button-preset token channel). `product-card/style.css:246`.
  2. Trial button = primary not secondary → `ctaPreset` not lifted from `--secondary` modifier + render hardcodes `sgs-button--primary`. `array_content.py:148,176` + `product-card/render.php:530`.
  3. Emoji size (32→16px) → icon `font-size`→`iconSize` mapping missing (margin DID lift). Converter icon lift.
  4. Disclaimer box (white bg + border + max-width 620) → `sgs/text` lacks border(width/style/color)+native-bg support (only radius); max-width emitted 420 not 620. BLOCK-CAPABILITY gap (add supports to sgs/text OR clone disclaimer as a container/box).
  5. Gift label + trial label padding → draft `.card-tag{padding:4px 10px;radius:6px}` / label box CSS not transferred. Fix as CSS ATTRIBUTES (not label variants — Bean-directed).
  6. Brand paragraph spacing + info-box text margins (2 items) → draft `*{margin:0}` + `gap:16px`; clone lifts/injects para margins the draft resets → double spacing. NOT line-height (proven). Converter margin-lift over `*{margin:0}` reset.
  7. Announcement "Find out more" underline-hover → hover `text-decoration` not lifted to `textDecorationHover` (hover NOT blocked — narrow extraction gap for atomic-swapped custom button).
  8. Option-picker tick → keep tick (Bean: WCAG), redesign `::before` so unselected pills don't reserve the 6.5px space. `option-picker/style.css:106-130`.
  9. Trustpilot bar taller → padding default vs draft `18px 24px`.
- **Separate (after fixes):** inline-styles architecture (Spec 32) — Bean's last concern.

## PRECISE FIX SCOPES for the 9 remaining (verified ground truth, ready to implement)

1. **Featured button white text** — `product-card/style.css:238-248` uses a divergent `color:var(--sgs-product-card-btn-text,#ffffff)` (unset→white). FIX: route the product-card CTA colour to the shared `--wp--custom--button-presets--{preset}--{role}` token channel (like the global button), so the client's dark `primary.text` wins. No per-client override. (composite-mirror R-31-9.)
2. **Trial button = primary not secondary** — converter lifts only `ctaText`/`ctaUrl` (`array_content.py:148,176`), never the `--secondary` modifier → `ctaPreset` stays default `primary`; AND render hardcodes `sgs-button--primary` (`product-card/render.php:530,1141,…`; the secondary CTA slot already emits `sgs-button--{$style}`). FIX: lift the child button's BEM preset modifier → `ctaPreset` (DB vocab `db_lookup.inherit_style_presets()`) + emit `sgs-button--{$ctaPreset}` for the primary CTA.
3. **Emoji size (32→16)** — `sgs/icon.iconSize` is the universal PX size (`--sgs-icon-size`, all icon types) but its **`css_property` column is `None`** so nothing maps `font-size`→`iconSize`. FIX: seed `iconSize.css_property='font-size'` (block.json `supports.sgs`/declaration → `/sgs-update --stage 1`). Data-only, no new machinery.
4. **Disclaimer box** — padding/max-width(620)/centring DO lift + render correctly (verified live). Only **background(white) + border(1px)** don't, because `sgs/text` declares only `__experimentalBorder.radius` + `color:false`. FIX: recognise the disclaimer as a small **container/box** (has bg+border) wrapping the text — NOT force box supports onto sgs/text. (Recognition, not a lift gap.)
5. **Gift/trial label box** — `sgs/label` padding is **pill-gated** (`label/render.php:96-105`: paints only for block-styles `is-style-pill-fill`/`is-style-pill-wrap`; plain eyebrow = 0 padding by design). Converter emits plain eyebrow → no padding. FIX: converter detects a padded-box label (draft bg+padding+radius) → set the pill block-style (`is-style-pill-fill` full-width for trial, `is-style-pill-wrap` capsule for gift) + transfer the real padding/bg/radius values. Block-style IS required here (padding structurally gated to it).
6. **Brand paragraph spacing + info-box text margins (2 items)** — draft has `*{margin:0}` + `gap:16px`; clone lifts/injects para margins the draft resets → double spacing (NOT line-height, proven). FIX: trace why the converter emits `sgs/text` margins over a `*{margin:0}` reset (mis-lift or default); make gap-spaced sections not double up.
7. **"Find out more" underline-hover** — IS an `sgs/button` (confirmed in markup: `inheritStyle:custom`, `textDecoration:none` lifted, **no `textDecorationHover`**). The button render emits `:hover{text-decoration:underline}` from `textDecorationHover` (`button/render.php:338-339`). Shared typography helper handles the full BASE set (FontSize/Weight/Style/LineHeight/LetterSpacing/**TextDecoration**/TextTransform — all have `property_suffixes` rows) but **NO hover variant** (hover is button-only). FIX (Bean-directed): (a) add hover typography to the shared helper so it's universal, not button-only; (b) converter lifts draft `:hover` typography onto the hover attrs.
8. **Option-picker tick** — keep tick (WCAG, Bean-chosen) but redesign `::before` (`option-picker/style.css:106-130`, `:274-277 --no-tick`) so UNSELECTED pills don't reserve the 6.5px space (no layout shift on select → absolute-position or 0-width-until-checked).
9. **Trustpilot bar taller** — padding default vs draft `18px 24px`; cloned to container/flex. Verify + transfer the draft padding.

**Q1/Q2/Q3 architecture answers (Bean's questions, verified):** Q1 = not a default blocking; label padding is pill-gated + converter didn't set the pill block-style. Q2 = base typography IS universal (helper + property_suffixes cover the full set); only HOVER typography is missing (button-only + not lifted). Q3 = iconSize is universal; its `css_property` column is unseeded (None) so font-size doesn't route to it.

---


Fresh clone deployed to sandybrown page 8 (run `mamas-munches-homepage-2026-07-11-102806`), CDN cleared, all measurements = live computed-style at 800px unless noted. Draft = `sites/mamas-munches/mockups/homepage/index.html`.

## The unifying meta-cause (Bean's diagnosis, confirmed)
"We haven't purged the hardcoded styles from our blocks completely." Every symptom is the pipeline failing to make the clone reflect the DRAFT — in one of three shapes:
- **(1) A draft VALUE is not transferred → the element falls to a WRONG framework default.**
- **(2) A draft value is ABSENT but the framework INJECTS a default anyway (D228 cheat-to-remove).**
- **(3) A draft variant/preset is not detected → the wrong style renders.**

These collapse Bean's 15+ symptoms into ~3 universal causes, plus a theme-token layer.

---

## CAUSE 1 — Colour not transferred per-instance + a MIS-MAPPED theme token (Groups A + part of C)

**Evidence (live):** card/box borders render `rgb(58,46,38)` = #3A2E26 (theme DARK TEXT) on featured card, trial card, info-box, gift container, testimonial card. Draft wants #E8D5C0 (border) / #F5D050 (trial accent, dashed).

Two compounding sub-causes:
- **1a — theme token mis-map.** `--wp--preset--color--border` resolves to `rgb(58,46,38)` (dark text) while the correct light `#E8D5C0` is deployed as `--wp--preset--color--border-subtle` (rgb(232,213,192), verified). Blocks whose base CSS reads `var(--wp--preset--color--border, #e8d5c0)` render dark because the token IS defined (to the wrong colour), so the `#e8d5c0` fallback never fires. Blocks that render CORRECTLY (option-picker pill, button--outline, testimonial-slider pause-btn = rgb(232,213,192)) reference `--border-subtle` or the direct fallback.
- **1b — converter lifts no per-instance border-COLOR.** The converter-emitted scoped rule `.sgs-pc-4.wp-block-sgs-product-card` sets `border-style:solid;border-width:1px` but NO `border-color` → nothing overrides the poisoned base rule. (Reverted D281 border-colour seed — `P-DRAFT-CSSVAR-SEED-READD`.)
- **1c — button text colour.** Draft `.sgs-button--primary{color:var(--text)}` = dark; clone renders WHITE (framework default). Same "value not transferred / wrong default" shape.

**Live proof:** `--wp--preset--color--border`→rgb(58,46,38); `--border-subtle`→rgb(232,213,192); featured card border-top-color = rgb(58,46,38).

**Refined (definitive) mechanism — there is NO `border` palette slug in base theme.json OR the client snapshot; `--wp--preset--color--border` is UNDEFINED.** So the dark border is `currentColor`, arriving two ways per block:
- **product-card (grid item):** `--sgs-gi-border` = empty; the shared-wrapper rule `.sgs-container--grid > .sgs-container{border:var(--sgs-gi-border)}` (0,2,0) fires with an empty value → the `border` SHORTHAND resets border-color to `currentColor`, beating the block's own correct base rule. Proof: the base `.product-card` fallback in isolation resolves to rgb(232,213,192)=#E8D5C0 — the grid-item rule clobbers it. So a secondary D228 fix is warranted: the grid-item `border:var(--sgs-gi-border)` must not emit (reset) when the per-item border is unset.
- **info-box / testimonial:** the converter emits per-instance `border-width`+`border-style` (lifted from draft) but NO `border-color`; the block's own coloured-border rule only fires on a `--bordered`/variant modifier the clone lacks → falls to `currentColor`.

Both converge on the SAME principled fix: **CAUSE 1b — lift the draft's border-COLOR per-instance** (resolve `var(--border)`→#E8D5C0→snap to `border-subtle` token), emit `border-color:var(--wp--preset--color--border-subtle)` on the winning scoped rule. Faithful (transfers the draft value), universal, Spec-31 §3.A + D301 role-colour + D287 var-resolution, no cheat. The token-fix (1a) is a non-faithful band-aid — reject in favour of 1b.

### ⭐ DEFINITIVE ROOT CAUSE (2026-07-11, proven end-to-end — supersedes the guesses below)
**Cause = a WordPress CORE style-engine limitation, NOT the converter, NOT the theme token, NOT a hard block.** Proof chain:
1. The converter RESOLVES border-colour correctly: running the real resolver on the draft, `_colour_value_to_style('var(--border)')` → `'var:preset|color|border-subtle'` and `'var(--accent)')` → `'var:preset|color|accent'` (styling_helpers `_resolve_draft_colour_var` → draft `:root` #E8D5C0 → theme palette → slug).
2. The converter EMITS it: the fresh clone's stage-4 block markup shows every info-box with `style.border = {"color":"var:preset|color|border-subtle","radius":"12px","style":"solid","width":"1px"}`. Colour IS present in the emitted attrs.
3. WP DROPS it at render: the live info-box scoped `<style>` = `background-color:#ffffff;border-radius:12px;border-style:solid;border-width:1px;padding…` — **no border-color**. Background survived because the draft `white`→concrete `#ffffff`; border-color was the only `var:preset|color|` value.
4. WHY: WP 7.0.1 `wp-includes/style-engine/class-wp-style-engine.php:128` — the shorthand `border.color` definition has **property_keys + path + classnames but NO `css_vars`** (unlike `border.radius`, and unlike the per-side `border.{top,right,bottom,left}` which each carry `'css_vars'=>['color'=>'--wp--preset--color--$slug']`, and unlike `color.background`/`color.text`). Without `css_vars`, `wp_style_engine_get_styles()` cannot resolve a `var:preset|color|SLUG` value for shorthand border-color → silently drops it. This is the ONE universal cause for EVERY black border (featured/trial cards, info-box, testimonial, gift container, announcement bar, trustpilot).
- **Answers Bean's architecture question:** colour transfer is NOT excluded and NOT hard-blocked; the pipeline does its job. The loss is WP-core-specific to the preset-reference format for shorthand border-color.
- **Universal fix (Spec 31 §3.A, no carve-out):** emit `style.border.color` (and any colour routed to a WP-native path lacking `css_vars`) as a form WP serialises — a DIRECT `var(--wp--preset--color--{slug})` or the concrete hex — instead of the `var:preset|color|{slug}` preset reference. One converter-side change (border-colour serialisation), universal across all `__experimentalBorder` blocks. (product-card, being a grid item, has a SECONDARY compounding cause — the shared-wrapper grid-item `border:var(--sgs-gi-border)` shorthand resetting border-color to currentColor when the per-item var is unset; address alongside.)

### VERIFIED file:lines + a FALSIFIED rater claim (2026-07-11, sentinel-probed live)
- **Sentinel probe:** `var(--wp--preset--color--border, magenta)` → **magenta** ⇒ `--wp--preset--color--border` is **UNDEFINED** (no palette slug in base theme.json OR snapshot). `border-subtle` → #E8D5C0. `buttonPresets.primary.text` → **dark #3A2E26** (correct).
- **FALSIFIED:** Agent A's headline "a STALE dark `border` key in live `wp_global_styles` poisons the borders" is WRONG (the sentinel proves the var is undefined, not defined-dark) and "buttonPresets.primary.text is white on live" is WRONG (it resolves dark). A deploy/token-merge fix would fix NEITHER. Kept here per prove-the-cause / fact-check-every-rater-claim.
- **VERIFIED converter cause (Group A borders):** the WP-native `__experimentalBorder` support lift emits per-instance `border-width`+`border-style` but **drops `border-color`** → currentColor (dark). The existing role='color' border lift (`converter/resolvers/styling_content.py:194-205`, D301) only fires for blocks with a role='color' border attr (option-picker pill, product-card CTA) — the card's OUTER border is WP-native `__experimentalBorder` (`product-card/block.json:50`) with no colour target. Fix = the native-border lift must also carry `border-color` (universal for every `__experimentalBorder` block). product-card additionally has the grid-item `border:var(--sgs-gi-border)` reset (shared wrapper) compounding it + clobbering the trial dashed-gold border.
- **VERIFIED button white text (C-i):** `product-card/style.css:238-248` `.product-card .sgs-button--primary{color:var(--sgs-product-card-btn-text,#ffffff)}` (0,2,0) with the var unset → white; diverges from the shared `--wp--custom--button-presets--*` channel the global button uses (which resolves dark correctly). Fix = route the CTA colour to the shared preset channel (composite-mirror R-31-9).

## CAUSE 2 — Injected framework defaults overriding the draft's ABSENT values (Groups B + D) — the D228 sweep

- **B — card equal-height (VERIFIED file:line).** Product grid computes `align-items:START`; cards unequal (572/536px). Draft `.sgs-products` declares NO align-items → grid default `stretch`. Source: `container/block.json:225` `verticalAlign` default `"start"` → read at `class-sgs-container-wrapper.php:206` (`?? 'start'`) → emitted at `:536`. **Fix = default `"start"`→`""`** (FR-31-5.1 absent→initial; the `:536` guard `'' !== $vertical_align` already suppresses when blank) + wrapper fallback `?? 'start'`→`?? ''`. Universal via the shared wrapper. **Bean's "routed to container not card-grid" is a RED HERRING** — card-grid uses the SAME wrapper. Also fixes the brand "Read The Full Story" button (C-iii: relies on parent flex-stretch; no button width to lift).
- **D — option-picker pill** has a `::before` (6.5px, empty) reserving swatch space the draft has no swatch for; pills wider than draft.
- **D — info-box text** carries injected `margin:13px 0`.
- **D — labels** render `padding:0` (no padded capsule); draft label is a padded rounded box.

## CAUSE 3 — Variant / preset not detected (Group C trial button)

Trial card CTA renders identical to featured (both `--primary`). Draft styles the trial button `.sgs-button--secondary`. **VERIFIED (Agent B):** the CTAs are the typed product-card's built-in CTA (`ctaText`/`ctaUrl`/`ctaPreset`), NOT standalone `sgs/button`. Two-part cause: (1) the composite content-extraction (`converter/resolvers/array_content.py:148,176`) lifts only `ctaText`+`ctaUrl`, never the button's `--secondary` modifier → `ctaPreset` stays block.json default `'primary'` for both; (2) render hardcodes `sgs-button--primary` for the primary CTA (`product-card/render.php:530,1141,…`) — the secondary CTA slot already emits `sgs-button--{$style}` correctly (the pattern exists). **Fix = lift the child button's BEM preset modifier → `ctaPreset` (DB vocabulary `db_lookup.inherit_style_presets()`, FR-31-20) + emit `sgs-button--{$ctaPreset}` for the primary CTA.**

## CAUSE 4 — Value-not-transferred, sizing/typography (Group D emoji + trustpilot; Group E spacing)

- **D — emoji size.** Draft `.sgs-info-box__icon{font-size:32px}`; clone renders **16px** (icon font-size not lifted → default). Same shape as CAUSE 1 (value dropped → wrong default) but typography not colour.
- **D — trustpilot bar** taller than draft (padding default; draft `.sgs-social-proof__trustpilot-bar`).
- **E — brand spacing/line-height.** Clone body line-height 1.6 (25.6px); brand paras `margin:16px 0`. Candidate = theme base vs draft base (`P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE`) — verify vs draft base before attributing.

## COMPLETE ITEM-BY-ITEM MAP (Bean's full list, all evidence-backed 2026-07-11)

| # | Bean's item | Root cause | Cause group | Evidence |
|---|---|---|---|---|
| Product cards | both different heights | `container/block.json:225` `verticalAlign` default `"start"` → grid not `stretch` | **2** | live grid `align-items:start`; draft `.sgs-products` no align-items |
| Feat #1 | option-picker tick on selected | option-picker renders WCAG tick (`::before`, style.css:106-130); no `--no-tick` applied | **3(inject)** | live: no `--no-tick` class; `::before` width 6.5px |
| Feat #2 | pills wider / left blank space | SAME as #1 — the `::before` reserves tick space (not a swatch); `--no-tick` suppresses it (style.css:274) | **3(inject)** | live ::before 6.5px |
| Feat #3 | featured border black | WP-core drops `var:preset|color|` border-color (no `css_vars`) | **1** | markup has border.color; scoped CSS omits it |
| Feat #4 | button text white | `product-card/style.css:238-248` `--sgs-product-card-btn-text,#ffffff` divergent channel (unset→white); global button token is dark | **3(inject)** | Agent B; token `buttonPresets.primary.text`=dark |
| Trial #1 | dashed border black | SAME WP-core border-color drop (`var(--accent)`→`var:preset|color|accent` dropped); dashed style DID transfer | **1** | live 2px dashed rgb(58,46,38) |
| Trial #2 | "NEW? START HERE" not full-width | label variant (`pill-fill` = width:100%) not set by converter | **3(lift)** | live label = bare `wp-block-sgs-label`, no variant, padding 0 |
| Trial #3 | button = primary not secondary | ctaPreset not lifted from `--secondary` modifier + `product-card/render.php` hardcodes `sgs-button--primary` | **3(lift)** | Agent B: `array_content.py:148,176`; render `:530` etc |
| Brand #1 | para + heading↔quote gaps too big | injected `sgs/text` para margin `16px 0` compounding container gap (draft `.sgs-brand__content{gap:16px}` gap-only) | **2** | live paras margin 16px 0; ⚠ verify draft `<p>` margin=0 (line-height 1.6 secondary) |
| Brand #2 | "Read The Full Story" left not full-width centred | SAME `verticalAlign:start` default → flex column not stretch (draft relies on stretch; no button width to lift) | **2** | Agent B; draft `.sgs-brand__content` flex no align-items |
| Ingr #1 | emojis smaller | icon `font-size:32px` (draft `.sgs-info-box__icon`) not lifted → default 16px | **3(lift)** | live 16px vs draft 32px |
| Ingr #2 | info-box borders black | SAME WP-core border-color drop | **1** | live rgb(58,46,38); markup border.color present |
| Ingr #3 | info-box text margins injected | injected `sgs/text` default margin (draft lacks) | **2** | live text margin 13px 0 |
| Disc #1 | missing white box + border | disclaimer `<p>`→`sgs/text` doesn't carry draft `background:white; border:1px var(--border); padding:16px 20px; border-radius:10px` (border-color also Cause 1) | **3(lift)** | live: bg transparent, border 0, padding 0; draft has all |
| Disc #2 | first line longer than draft | `max-width` wrong: live 420px (a default), draft 620px + `margin:0 auto` centre not transferred | **3(lift)** | live maxWidth 420px vs draft 620px |
| Gift #1 | label tight capsule not padded box | `.sgs-gift-section__card-tag` draft `inline-block; padding:4px 10px; radius:6px` — padding/display not transferred | **3(lift)** | live gift label padding 0, display inline |
| Gift #2 | gift cards different heights | SAME `verticalAlign:start` default | **2** | as product cards |
| Gift #3 | gift border black | SAME WP-core border-color drop | **1** | live rgb(58,46,38) |
| Ann #4 | "Find out more" no underline-hover | hover `text-decoration` not lifted to `textDecorationHover` (hover NO LONGER blocked — narrow extraction gap for atomic-swapped custom button) | **3(lift)** | Bean-corrected: block removed; gap not block |
| Ann #5 | announcement container border black | SAME WP-core border-color drop | **1** | live rgb(58,46,38) container |
| Social #1 | testimonial borders black | SAME WP-core border-color drop | **1** | live rgb(58,46,38) |
| Social #2 | trustpilot border black | SAME WP-core border-color drop | **1** | draft `.sgs-...trustpilot-bar{border:1px var(--border)}` |
| Social #3 | trustpilot bar taller | padding default vs draft `18px 24px` (+ flex-wrap/content) | **3(lift)** | draft padding 18/24; clone → container/flex |

### The 3 universal causes (Bean's "~3", confirmed)
- **CAUSE 1 — WP-core border-color serialisation drop** (8 items: every black border). ONE converter-side fix.
- **CAUSE 2 — injected hardcoded block/wrapper DEFAULTS to remove/gate** (5 items: card heights ×2, brand button, info-box/text margins, option-picker tick). "Hardcoded styles not purged" — exactly Bean's phrase. FR-31-5.1 absent→initial.
- **CAUSE 3 — draft VALUES not lifted/transferred** (9 items: trial button preset, labels ×2, emoji size, disclaimer box, disclaimer max-width, gift label padding, announcement hover, trustpilot padding). The pipeline must LIFT these.

## CAUSE 5 — Inline-styles architecture (Group F, Spec 32 §6.1) — separate concern
CSS emitted into HTML via scoped `<style>`/style-id vs the draft's DevTools Styles panel. Needs its own Spec-32 investigation: distinguish legitimate scoped `<style>` (the contract) from genuine inline `style="…"`. Deferred to its own track.

---

## Recommended fix order (highest ROI first)
1. **CAUSE 1 (colour + token)** — biggest ROI (≈7 sections). Fix the token mapping (1a) and/or re-add per-instance colour lift (1b/1c). Awaiting agent file:line confirmation of whether the snapshot `border` value is a drift to correct vs the converter seed to re-add.
2. **CAUSE 2 (injected defaults)** — remove/gate the `align-items:start` default (grid→stretch) + the option-picker swatch / info-box margin / label defaults.
3. **CAUSE 3 (variant detection)** — map `--secondary`/width to `inheritStyle`/width.
4. **CAUSE 4 (sizing/typography)** — icon font-size lift + trustpilot + brand base (token pipeline).
5. **CAUSE 5 (inline architecture)** — separate Spec-32 session.
