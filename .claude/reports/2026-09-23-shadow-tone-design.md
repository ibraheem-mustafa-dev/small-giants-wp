# Design: universal shadow-tone check (U-1 follow-on, 2026-09-23)

Status: DESIGN, awaiting council and Bean's sign-off. Shared mechanism (touches `SGS_Container_Wrapper`, the shadow composer and more than three blocks), so R7 design gate and the detector-first rule apply.

## The ask (Bean, 2026-09-23)
Every element that carries a shadow gets a darkness check on the surface it sits on. Dark surface: apply the dark-surface treatment automatically (black at higher strength plus a 1px light ring, already built as `helpers-shadow-dark.php`). Light surface: leave the default. The forced-colours fallback must hold everywhere. Site dark mode is secondary (it is unbuilt scaffolding: no setting, no toggle, one hardcoded palette).

## What exists (read from the code)
- `class-sgs-container-wrapper.php::render` adds `sgs-on-dark` / `sgs-on-light` from `backgroundColour` only, via `helpers-colour-wcag.php::sgs_colour_background_tone` (relative luminance below `SGS_COLOUR_DARK_LUMINANCE` = 0.05). Gradient or `backgroundImage` set: no class.
- `helpers-shadow-dark.php::sgs_shadow_dark_preset_css('section')` re-declares every theme shadow preset and `--wp--custom--shadow-colour` on `.sgs-on-dark>*`; `'light'` resets on `.sgs-on-light>*` to the site's own shadow colour. Registered on demand (`shadow-dark-assets.php::sgs_shadow_dark_enqueue`). Live-verified on eye-care-test (`reports/visual-diff/container-2026-09-21.md`).
- Forced colours: `helpers-shadow-layers.php::sgs_shadow_forced_colours_decl` (1px `CanvasText` outline, nested `@media (forced-colors:active)`), emitted by `sgs_shadow_box_decls` and `sgs_shadow_decls`.
- Text already has a darkness rule: `sgs_wcag_text_colour_for_bg` picks white text when white beats black on WCAG contrast (the crossover is luminance about 0.179). JS twin: `src/utils/wcag-contrast.js::calculateRelativeLuminance`.

## Problems found
P1. **The cut-off misses real dark bands.** Palette colours from `sites/*/theme-snapshot.json` that a designer uses as a dark band but that sit ABOVE 0.05: Indus `primary-dark` #075E80 (0.096), Helping Doctors `primary` #2d6e5e (0.125) and `secondary-dark` #256050 (0.093), healthcare starter `primary` #1A5F6B (0.095), framework `primary-dark` #0F4C4C (0.058). A black shadow is close to invisible on each, and today none gets the dark treatment.
P2. **Detection sees one attribute of one mechanism.** Ignored: `backgroundOverlayColour` over an image (the colour you actually see), gradients, `rgb()/rgba()`, 8-digit hex, and every block-private surface with its own fill (`nav-drawer::drawerBg`, `mega-panel::panelBg`, card-grid / post-grid card backgrounds, `brand-strip` tiles, `trust-bar` icon circles, nav `submenuBg`).
P3. **Many shadows cannot be re-tinted.** The dark scope works by re-declaring variables. A raw shape with no colour falls back to the literal `SGS_SHADOW_DEFAULT_COLOUR` (`#0000001A`); about 30 block `style.css` rules and theme `utilities.css` / `woocommerce.css` hardcode `box-shadow` colours; `supports.shadow` blocks serialise whatever the style engine gives.
P4. **Forced-colours coverage is partial**: not emitted for `--sgs-card-shadow` (card-grid, post-grid, team-member), `supports.shadow` blocks (testimonial, info-box, process-steps, timeline), gallery, or the style.css literals.
P5. **Probable existing bug**: the six `is-style-elevated` variations (`includes/variations/sgs-*-variations.php`) use `var(--wp--custom--shadow--medium)`, which `theme.json` does not define, so they likely draw no shadow.
P6. The editor canvas never gets the tone class, so the editor shows the light-surface shadow on a dark band.

## Design

**D1. One definition of "dark", shared with text.** `sgs_colour_background_tone()` returns `dark` when white text would be chosen for that colour (`sgs_wcag_text_colour_for_bg() === '#fff'`), `light` when black would, `''` when the colour cannot be resolved. `SGS_COLOUR_DARK_LUMINANCE` is deleted. Effect on P1: every colour listed there becomes dark. Rationale: a surface a designer would put white text on is a surface a black shadow disappears on; one rule means a client never sees "white text but a black shadow" on the same band.

**D2. One resolver for what a surface looks like: `sgs_surface_tone( array $layers )`** in `helpers-colour-wcag.php`. Input is the painted layers from the top down (each a colour string plus an opacity 0 to 1). It walks down until the accumulated opacity reaches 0.5 and judges the colour that dominates:
- solid colour (hex 3/6/8, `rgb()/rgba()`, palette var or slug, named keyword via a fixed list): tone of that colour; an 8-digit hex or `rgba` alpha feeds the opacity.
- gradient: the mean luminance of its stops (parsed from the stored gradient string; any stop that cannot be resolved makes the answer `''`).
- image with an overlay of opacity 0.5 or more: tone of the overlay; image without such an overlay: `''` (unknown, add nothing; the image is not analysed).
- empty / `transparent`: `''`, so the element inherits its parent's context through the cascade (a transparent child container of a dark band stays dark).
Tier objects (overlay opacity per tier): judged on the desktop value; recorded as a limitation, not guessed per tier.

**D3. Every surface marks itself through one helper**, `sgs_surface_tone_class( array $layers ): string` (returns `sgs-on-dark`, `sgs-on-light` or `''`, and enqueues the dark stylesheet when dark). Callers:
- `SGS_Container_Wrapper::render` (replaces the current inline block; passes colour, gradient, image + overlay colour and opacity), so every wrapper block (container, hero, cta-section, trust-bar, site-header, site-footer, physics-canvas, card-grid, post-grid ...) is covered at once.
- Block-private surfaces with their own fill, found by the detector in D5 (initial list: nav-drawer, mega-panel, brand-strip tiles, card surfaces rendered by card-grid / post-grid / team-member, trust-bar icon circles, nav submenus). A surface marks ITS OWN children; a card's own shadow is judged by the surface it sits on, which is the parent's class. This is the existing, verified model.

**D4. Every shadow becomes re-tintable.**
- `SGS_SHADOW_DEFAULT_COLOUR` becomes `color-mix(in srgb, var(--wp--custom--shadow-colour) 10%, transparent)`, the same 10% black on a light page, so a raw shape with no colour follows the dark scope.
- A detector `plugins/sgs-blocks/scripts/check-shadow-sources.py` (survey / fix / check / self-test, gate in `scripts/gates.json`) lists every `box-shadow` source: PHP composer calls, `--sgs-card-shadow` and similar variables, `supports.shadow` declarations, and literal `box-shadow` values in `src/blocks/*/style.css` and theme CSS. Fix mode rewrites a literal black/rgba shadow to the matching preset or to a `site` colour-mix at the same alpha; anything it cannot map is reported, never guessed. The `is-style-elevated` variations move to a real preset (P5), after a live check confirms they draw nothing today.
- Coloured (brand) shadows are left alone, as the dark variant already does.

**D5. Forced colours everywhere.** The same detector's check mode fails any shadow source that lacks the `CanvasText` fallback. Fixes: `--sgs-card-shadow` consumers, `supports.shadow` serialisation (append the fallback where the block scopes its style-engine output), gallery, and each style.css rule (a nested `@media (forced-colors:active)` beside it). The fallback stays tone-independent: forced-colours mode replaces author colours with system ones, so the tone check does not apply there.

**D6. Editor parity.** `src/utils/surface-tone.js` mirrors D1 and D2 on `calculateRelativeLuminance` plus the same text-colour choice, and each marking block's `edit.js` adds the same class to its canvas element. The dark stylesheet is already enqueued in the editor.

**D7. Dark mode.** Unchanged and secondary. The one approved addition: under site dark mode, a surface marked `sgs-on-light` resets to black shadows, not the (now light) site colour. Emitted only in the dark-mode root CSS, so it has no effect unless dark mode is switched on.

## Order (one commit each, tests with negative controls in each)
1. D1 + D2 (helper and tests: every P1 colour dark, every light palette colour light, gradients, rgba, overlay, transparent, hostile input).
2. D3 in the wrapper (byte-identical output for any block without a background; negative control).
3. Detector (survey first: the real counts go in this note before any fix), then D4 and D5 through it, one commit per block family.
4. D3 for block-private surfaces via the detector list.
5. D6 editor mirror.
6. D7.
Live verification after 2, 3 and 4: the page-53 fixture on eye-care-test extended with a #075E80 band, a gradient band, an image with a dark overlay, a card-grid on a dark band, a drawer with a dark `drawerBg`, and a #777 band (just above the cut-off, expected light); computed `box-shadow` read per card, a screenshot, and forced-colours emulation through the Playwright MCP.

## Risks for the council
- D1 flips mid-tone brand bands (0.05 to 0.18) to dark: shadows there change from black-only to ring plus stronger black. Intended, but it is the widest visible change.
- D4's colour-mix default changes the computed value of every colourless raw shadow (same look on a light page; now re-tinted on a dark one).
- The wrapper is a 3,900-line, 34-caller file: D3 must be byte-identical for callers with no background.
- Gradient mean luminance can misjudge a gradient that is dark at one end and light at the other; unresolvable stops return `''`.
- An image without an overlay is never analysed (no server-side image sampling).

## Council (2026-09-23): Sonnet adversarial reader + Haiku code-path verifier

Verifier: every factual claim above TRUE or PARTLY; no FALSE claim. Counts: about 55 literal `box-shadow` rules in block and theme CSS, only 4 with a `forced-colors` rule beside them; 6 `is-style-elevated` variations on an undefined variable (P5 confirmed: `settings.custom.shadow` exists in no theme.json or snapshot); about 15 `#0000001A` expectations in `tests/php/fixtures/shadow-golden.json` change with D4.

Adversarial findings and rulings:
- **D3 "direct children only / the surface itself is not covered" (raised as BLOCKER): REJECTED with evidence.** The rule re-declares CUSTOM PROPERTIES on `>*`, and custom properties inherit, so every descendant at any depth reads the dark values until another marker re-declares them; the element holding the class is judged by ITS parent's marker, which is the intended model (a surface's own shadow sits on the surface behind it). Measured live on eye-care-test page 53: the dark card inside the dark band got the dark variant, and `.qa-nested-child` two levels down inside a light card reset correctly. Dark, light, dark nesting works the same way, each marker re-declaring for its own subtree.
- **D5 "native supports.shadow serialises inline, so no forced-colours fallback is possible" (raised as BLOCKER): REJECTED with evidence.** All five blocks that declare `supports.shadow` set `__experimentalSkipSerialization: true` (Spec 32), and their render.php scopes the style-engine output into the block's own rule (for example `testimonial/render.php` builds `$base_style_engine_args['shadow']`), so the fallback is appended there like everywhere else.
- **D1: ACCEPTED as wording.** Reusing the text rule is a deliberate heuristic (a surface that takes white text is a surface a black shadow disappears on), not a proof. The P1 colours get an eye check in the live verification, not only a formula check.
- **D2 gradients: ACCEPTED.** Weight each stop by the length of the gradient it covers (its position), not a plain mean of stops; `#000 10%, #fff 90%` must judge light.
- **D2 image over a solid colour: ACCEPTED as a stated limitation.** An image with no overlay returns unknown even when a solid colour sits beneath it; an image is never sampled.
- **D4 coupling: ACCEPTED.** The dark pipeline recognises the site colour only in the exact form `color-mix(in srgb, var(--wp--custom--shadow-colour) N%, transparent)`, and one unrecognised layer drops the whole preset's dark variant. The new default must be in that form, and a test asserts that the default classifies as the site colour (negative control: a changed format fails it).
- **Scope: ACCEPTED in part.** `filter: drop-shadow()` sources (`helpers-shadow-filter.php`, `nav-menu-submenu-css.php`, `media` and `product-card` style.css) join the detector's survey and follow the same rules. `text-shadow` (hero, site-header) stays OUT: it is a legibility effect on type, not elevation, and changing it by surface would alter text contrast.

Verdict: GO WITH FIXES (the accepted items above fold into the Order section; nothing blocks commit 1).
