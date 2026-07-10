# Track E — no-inline styling migration report: `sgs/product-card`

**Branch:** `feat/no-inline-track-E` (off `main`, D-ceiling D298)
**Scope:** ONE block — `sgs/product-card` (dual-mode typed / WooCommerce-bound). FILES ONLY.
**Status:** DONE, build-green, `/qc-council` run (3 raters, all SHIP-WITH-FIX → all fixes applied). **NOT deployed / not LANDED / not committed to main** — hand to the INTEGRATION session.

---

## Pattern decision: KEEP-WRAPPER (hero pattern)

product-card KEEPS `SGS_Container_Wrapper` (delegates the outer `<div>`). Confirmed with Bean + all 3 raters:
- It is a genuine composite: the bound modes hang **load-bearing** `data-wp-interactive` / `data-wp-init` / `data-wp-context` (the Interactivity manifest) on the same outer element `get_block_wrapper_attributes()` controls (render.php docblock L29-40). Dropping the wrapper would force a hand-rolled outer element across 5 render branches for zero gain.
- Verified the shared wrapper adds **no grid options/CSS** to product-card (its grid engine is dormant without grid attrs, which product-card never passes; kind = `'content'`). So keep-wrapper carries no useless baggage.
- This is a legitimate exception to the D294 "content-KIND → block-private" default (Rater C + spec-lawyer agree; keep-wrapper is contract-compliant since the wrapper is itself fully no-inline, D296).

---

## Files changed (4)

| File | Change |
|---|---|
| `src/blocks/product-card/block.json` | `__experimentalSkipSerialization:true` added to `supports.color`, `supports.spacing`, `supports.__experimentalBorder`. Version UNCHANGED (1.16.11) — no bump, no deprecations (D293). |
| `src/blocks/product-card/render.php` | (a) added `$sgs_css_length`/`$sgs_css_keyword` sanitiser closures; (b) native `color`+`border` emitted SCOPED via `wp_style_engine_get_styles(selector='.{uid}.wp-block-sgs-product-card')`, folded into the block's existing `<style>` accumulator BEFORE the typed early-return so BOTH paths carry it; (c) re-add preset `has-*-color`/`has-*-background-color`/`has-*-gradient-background`/`has-*-border-color` classes; (d) 2 badge inline `color:` → `--sgs-pc-badge-fg` var; (e) 3 `<style>` emissions wrapped in `wp_strip_all_tags`; (f) empty-state branch now prepends the scoped `<style>`. |
| `src/blocks/product-card/style.css` | 2 badge colour rules consume `var(--sgs-pc-badge-fg, var(--wp--preset--color--surface,#fff))` + a 0,3,0 specificity guard so the auto-contrast var beats `sgs/label`'s pill-wrap rule when a label block coexists. |
| `src/blocks/product-card/edit.js` | Typed-mode editor parity: re-applies the WP-native colour/border (custom → inline preview style; preset → `has-*` classes) so the typed native preview mirrors the frontend after skip-serialisation (bound mode uses `ServerSideRender`, already faithful). Editor inline style is contract-allowed for live preview; the dynamic frontend is inline-free. |

---

## Box-object attrs for CENTRAL seeding (integrator)

**NONE.** product-card has **no 4-side/4-corner flat attr clusters**. Its box props are single scalars / 2-axis (`ctaPaddingY`/`ctaPaddingX`, `ctaBorderWidth`, `ctaBorderRadius`, `innerPadding`) handled by the shared `sgs_button_element_style_css` helper (Spec 32 §6.1(c) keeps 2-axis/single scalars scalar). Base card border-radius rides WP-native `__experimentalBorder` (already object-shaped, handled in render). **No `box_family` seeds to add. No `check-box-family-guard` surface.**

## Flat attrs removed
**NONE.** (No box-object migration; no attr schema change → no `--stage 10` orphan prune needed for this block.)

## Border / shadow
- Border: routed via WP-native `__experimentalBorder` (skip-serialised → scoped). Custom width/style/radius (incl. 4-corner array) + preset border-colour all handled.
- Shadow: NOT declared by this block — N/A.

## Per-element inline → scoped
All per-element typography (title/price/desc/pill/priceNote/priceFromLabel/tag) + CTA styling were ALREADY scoped via `sgs_typography_css_rule` / `sgs_button_element_style_css` pre-migration. This migration additionally scoped: the native card `color`/`border`, and the 2 dynamic badge colours (→ CSS var). Card `margin` (native `spacing.margin`) is now emitted scoped by the **shared wrapper** (its existing base-spacing mechanism, class-sgs-container-wrapper.php L871-898) once skip-serialisation is on — NOT emitted by the block (avoids double-emit).

## view.js inline-style check
**CLEAN.** `view.js` never writes `element.style.property`. It mutates Interactivity context + toggles classes/attributes only (verified by grep + Rater B). No re-inline trap.

## F3 disposition — 2 baseline rows, BOTH MIS-TAGGED (report, do NOT drain)
`hardcoded-render-defaults-baseline.json` has 2 product-card rows: `padding "7px 13px"` and `padding "4px 10px"`, both attributed to attr `innerPadding`. **Both are MIS-TAGGED:**
- `7px 13px` is on `.product-card .pill` (style.css L121) + `.sgs-product-card__pill` (L1051) — the pack-size **chip** padding.
- `4px 10px` is on `.product-card .trial-tag` (L220) + `.sgs-product-card__tag` (L963) — the tag **chip** padding.
- The REAL `innerPadding` (card body) is already var-driven: `padding: var(--sgs-product-card-inner-padding, 20px)` at L81/L950.

These are structural **component constants** with NO dedicated control (like the `sgs/label` chip padding that stays — memory `framework-block-client-hardcode-is-a-bug-not-a-constant`). Force-wiring them onto `innerPadding` would make the body-padding control also resize the pills/tags — a defect. Per §E2 + D298 + `P-F3-NAV-MISTAG-GATE`, correct action is **report-and-leave**. Confirmed by all 3 raters.
→ **Integrator: leave both baseline rows; the gate-precision fix is Task-4 / `P-F3-NAV-MISTAG-GATE`, not this track.**

## Security
- New closures applied to every free-text value concatenated into scoped CSS (border style = keyword, border width/radius = length). `wp_style_engine_get_styles` sanitises its own inputs. All 3 `<style>` blobs now emitted via `wp_strip_all_tags` (contract §D, mirroring hero). No injection vector (Rater C).

## `/qc-council` verdict
3 adversarial raters (color-scoping / dual-mode+a11y / contract+security), each told to falsify. **All 3: SHIP-WITH-FIX.** Confirmed sound: zero-inline, no double-emit, selector specificity, box-object N/A, F3 mis-tag disposition, no-churn, keep-wrapper, interactivity/SSR/a11y intact. 4 MINOR fixes surfaced + **ALL APPLIED**:
1. (Rater A) empty-state branch dropped the scoped `<style>` → prepend it (render.php).
2. (Rater B) badge auto-contrast lost specificity vs `sgs/label` pill-wrap → 0,3,0 guard (style.css).
3. (Rater B) typed editor lost colour/border preview → re-apply in edit.js.
4. (Rater C) 3 `<style>` blobs emitted raw → `wp_strip_all_tags` (contract §D).

## Local verification (this track's bar)
- `php -l render.php` — clean; `block.json` valid JSON.
- `npm run build` — **GREEN** (all prebuild gates: dead-controls, hardcoded-render-defaults, box-family AST, cheat/excluded/ledger/db-consistency/atomic-slug + pytest oracle; webpack editor + view both compiled; postbuild copied styles). Re-run green after the 4 fixes.
- Zero-inline: only remaining inline `style=` is the 2 badges emitting `style="--sgs-pc-badge-fg:VALUE"` (custom-property VALUE, contract-allowed) + the 7 wrapper `--sgs-*` vars. No real property declaration anywhere in render.php or product-card-builtin-render.php.

## Could NOT fully meet locally (integration must verify LANDED — STOP-43/44)
- **Typed editor parity (fix 3)** compiles but is **visually UNVERIFIED** (no editor without deploy). Integration session: open a TYPED product-card in the editor, set a custom card background/border via the native colour/border controls, confirm the editor preview shows it (matching the frontend).
- **Bound path** LANDED verification needs a live variable WooCommerce product (badges + option-picker + interactivity). If no bound fixture is feasible, LAND at least the typed card + note the bound path as reasoned-but-unlanded.

---

## Additional fix (Bean-directed mid-session): typed option-picker parity with bound

Bean: *"typed mode's option pickers don't match bound-mode styling"* → *"the option picker in typed mode should use the same setup as bound mode."* Investigated to ground truth:

- **The typed FRONTEND already renders the real `sgs/option-picker` block** (`includes/product-card-builtin-render.php` L164 `render_block('sgs/option-picker')`, mapped from `packSizes`). Same block as bound — NOT a bespoke design.
- **Root cause of the visible mismatch:** the card-scoped option-picker overrides — `--sgs-op-border: var(--wp--preset--color--primary)` (the pink resting outline) + the 44px touch sizing — were gated to `.product-card--live` (bound only; the old comment deliberately excluded "page-144 Typed clones"). So the typed picker fell back to the shared block's dark/foreground default border and smaller target. Selected state already matched (both use the option-picker `:checked` default = primary fill + tick + bold).
- **The typed EDITOR preview** used a bespoke `.sgs-product-card__pill` stand-in (surface bg + pink-tint active) instead of the option-picker markup — so the editor canvas looked nothing like the bound picker.

**Fixes (all in product-card's own files — shared `sgs/option-picker` block + converter untouched):**
1. `style.css`: un-gated the option-picker overrides `.product-card--live …` → `.product-card …` (min-height ×2 + `--sgs-op-border`), so BOTH typed and bound pickers get the identical pink resting outline + 44px target.
2. `edit.js`: the typed preview stand-in now emits the REAL `.sgs-option-picker`/`__options`/`__option`/`__pill` markup (`--outlined --medium`), so the shared option-picker stylesheet + the card override style it byte-identically to the frontend/bound (pink resting, filled+tick selected via the `:checked` sibling rule).

**Result:** typed and bound pickers now use the same block AND the same styling in both editor and frontend.
**Not yet visually verified** (files-only track — no deploy). Integration must confirm on a live typed card + editor that the pack pills show the pink outline (resting) + filled (selected), matching bound.
**Leftover (harmless, noted):** the now-unused bespoke `.sgs-product-card__pill(-group/-option)` CSS in style.css (L1042+) is dead for the editor path but left in place (removing it risks the `pill` typography-selector wiring; a separate tidy).
