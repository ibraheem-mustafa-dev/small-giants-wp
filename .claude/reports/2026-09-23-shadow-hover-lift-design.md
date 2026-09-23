# Design: shadow lift on hover by default (2026-09-23)

Status: DESIGN. Bean's direction (2026-09-23): "Auto lift on hover should be default"; everything with a shadow lifts, and each decorative preset gets its own matching hover. Shared mechanism (the shadow composer, the container wrapper and more than three blocks), so the design gate, a council and the detector-first rule apply.

## What exists
- 11 theme presets (`theme/sgs-theme/theme.json::settings.shadow.presets`): an elevation ladder `whisper`, `soft`, `lifted`, `floating`, and decorative `crisp`, `long`, `outline`, `grounded`, `glow`, `pressed`, `hard`. Values are written against `var(--wp--custom--shadow-colour)` (Glow against the primary colour).
- A hover shadow exists only where a block declares its own hover attribute (13 blocks, for example `button`, `card-grid`, `team-member`) and someone sets it. `includes/helpers-colour-variants.php::sgs_shadow_decls` emits `box-shadow` on hover only when the hover shape or colour is set. The container wrapper, hero, trust-bar, site-footer, physics-canvas, the card custom properties, the `supports.shadow` blocks and the stylesheet shadows have no hover at all.
- Dark surfaces: `includes/helpers-shadow-dark.php` re-declares every preset variable on `.sgs-on-dark>*` (and dark mode); a custom property holding `var(--wp--preset--shadow--x)` resolves where it is declared, so a hover value must be either a preset variable used directly or a variable the dark scope also re-declares.
- Hover rules must go through `includes/helpers-hover-state.php::sgs_hover_state_rules` (touch-safe). Motion only under `prefers-reduced-motion: no-preference`.

## Design
**H1. One hover map in the theme.** `theme.json::settings.custom.shadowHover` maps each preset slug to its hover: a preset slug (resolved to `var(--wp--preset--shadow--<slug>)`) or a literal written in the same strict grammar as the presets. A client snapshot can re-map it; `sync-snapshot-shadow-presets.py` carries it.

| Preset | Hover |
|---|---|
| whisper | soft |
| soft | lifted |
| lifted | floating |
| floating | literal: the floating layers with y offsets and blurs x1.25 (`0 3px 5px 0 4%, 0 10px 20px 0 6%, 0 30px 60px -8px 14%, 0 60px 120px -16px 12%`) |
| crisp | literal: offsets x2, same crispness (`0 2px 2px 0 16%, 0 4px 8px -1px 14%`) |
| long | literal: each step 1.5x longer at the same alpha |
| outline | literal: ring 1px to 2px, soft layer 2px 8px to 4px 12px |
| grounded | literal: the contact shadow deeper (`0 26px 24px -14px 30%, 0 1px 2px 0 6%`) |
| glow | literal: 55%/28% to 70%/40% of the primary colour, blur 16/40 to 20/52 |
| hard | literal: `6px 6px 0 0` |
| pressed | pressed (an inset "pushed in" look stays as it is) |

**H2. One PHP resolver, `sgs_shadow_hover_value( $shape, $colour )`** (in `includes/helpers-shadow-layers.php` or a sibling under the line cap), returning the hover value for a resting shadow:
- a preset slug: the map entry (a slug becomes `var(--wp--preset--shadow--<slug>)`, a literal becomes `var(--wp--custom--shadow-hover--<slug>)`, the variable WordPress generates from `settings.custom`);
- a layered custom shadow (Layers / Raw tabs): each outer layer's y offset and blur x1.25, spread and colour unchanged, inset layers unchanged, capped by the composer's grammar; composed through `sgs_shadow_layers`;
- `none`, empty or unparseable: '' (no hover).
A JS twin in `src/utils/shadow-layers.js` for the Shadow panel's Hover tab ("Lifts to: Lifted") with a shared case table (`tests/shared/`), as the composer already has.

**H3. Dark surfaces.** `sgs_shadow_dark_declarations` also derives the dark variant of each literal hover entry and re-declares `--wp--custom--shadow-hover--<slug>` in the section, light and root scopes, next to the presets. A hover to another preset needs nothing (the preset variable is already re-declared).

**H4. Where it applies.** One helper call per shadow emitter, `sgs_shadow_hover_rules( $selector, $shape, $colour, $attributes )` returning the touch-safe hover rule plus a `transition: box-shadow` under `prefers-reduced-motion: no-preference`:
- `sgs_shadow_decls` (the 13 blocks with a hover attribute): an explicitly set hover shape or colour wins; otherwise the automatic lift.
- `SGS_Container_Wrapper` (container, hero, cta-section, trust-bar, site-footer, site-header, physics-canvas, card-grid, post-grid and the other wrapper callers), the block-private emitters (`sgs_shadow_box_decls` callers: nav-drawer, mega-panel items, brand-strip tiles, trust-bar badge images), the card custom properties (`--sgs-card-shadow` consumers get a `--sgs-card-shadow-hover` sibling) and the five `supports.shadow` blocks.
- Stylesheet shadows (`src/blocks/*/style.css`, theme CSS): a postbuild transform beside `scripts/shadow-fallback/` adds the hover rule for a resting shadow rule that has none, skipping inset, transient-state (`:hover`, `:focus*`, `:active`) and pseudo-element rules and rules inside a forced-colours query; the hover guard classifies `box-shadow` as a motion property.

**H5. Switch off.** One block-level attribute `shadowLiftOnHover` (boolean, default true) on every block that draws a shadow, added by a survey/fix/check script; a "Lift on hover" `ToggleControl` in the Shadow panel's Hover tab. Overlay surfaces that are already floating and always under the pointer when open (mega-panel, nav-drawer, modal, the cart drawer, submenus, tooltips) declare `supports.sgs.shadowLift: false` in block.json and never lift (declarative per block, read by the helper; no slug list in code).

**H6. Detector.** `scripts/check-shadow-sources.py` gains a hover check: every shadow source outside an overlay block reaches the lift (or an explicit hover), and every hover rule is touch-guarded. Survey first; the counts go in this note before fixing.

## Order (one commit each, tests with negative controls)
1. H1 map + H2 resolver + JS twin + shared cases.
2. H3 dark variants of the hover map.
3. H4 in `sgs_shadow_decls` and the wrapper; H5 attribute fan-out and control.
4. H4 for the other PHP emitters and the card properties, via the detector.
5. H4 stylesheet transform.
Live check on eye-care-test: page 53's cards on light and dark bands hovered with a real pointer (computed `box-shadow` before and after, a screenshot), a touch-emulated tap not sticking, reduced motion, forced colours unaffected, a block with the switch off, and an overlay block not lifting.

## Risks for the council
- Every shadowed element now changes on hover, including static boxes (Bean's ruling, with the per-block switch).
- The H4 stylesheet transform touches compiled CSS for every block.
- Specificity: the automatic hover rule must lose to an explicit hover rule and win over the resting rule.
- A lifted shadow can be clipped by an `overflow:hidden` parent.

## Council (2026-09-23, Sonnet adversarial): GO WITH FIXES, applied
- **Hover guard ordering (was BLOCKER).** The stylesheet lift transform runs BEFORE `scripts/hover-guard/run-transform.js` in `postbuild`, and the hover guard's classifier treats `box-shadow` as a motion property, so the guard wraps every injected `:hover` rule in the touch-safe form; a rule injected after the guard would ship unguarded and stick after a tap.
- **Transitions (was BLOCKER).** The lift adds NO `transition` declaration: `transition` is a whole-value shorthand, so a second one would silently cancel a block's existing transition. The lift inherits whatever transition the element already declares, as today's explicit hover shadows do. H4's "transition: box-shadow under reduced motion" clause is withdrawn.
- **Explicit wins (note).** Verified in `sgs_shadow_decls` (the automatic lift is the else branch); the same structure is required and tested in the wrapper and every other emitter, not assumed.
- **Dark hover variants (note).** The H3 loop is proven by a test that reads a literal hover entry back from the section, light and root scopes.
- **One switch per block (note).** Kept (a client-facing simplicity choice); the survey reports shadow sources per block so a block needing more than one switch is visible.
- **Procedural lift instead of a map (alternative).** Rejected: Bean chose a matching hover per decorative preset, which a single procedural rule cannot give; the procedural rule is used only for custom layered shadows (H2).
