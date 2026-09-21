---
doc_type: design-report
unit: U-1 commit 4f (shared layered shadow control)
date: 2026-09-21
status: DESIGN, awaiting Bean's approval (no code written)
inputs: 2026-09-21-4f-shadow-research-{nerd,gh,practical}.md, 2026-09-21-4f-shadow-census.md
---

# Layered shadow control: design

## Problem

The shared `ShadowControl` edits ONE shadow layer. Real designs (Halcyon, Indus, Material, Tailwind elevation) use two or more, with different opacity per layer, so clones come out flatter and a client cannot reach a professional-looking shadow without hand-written CSS. The converter also gaps every non-preset shadow.

## Design (one model, three levels, one stored shape)

**Simple (default view).** Elevation (None, 1 to 6), Look (Soft, Crisp, Long, Glow, Hard), Colour (theme tokens first), Intensity (one constant strength across all elevations, per the Nerd: sources disagree on opacity vs elevation, so elevation moves geometry only). Result: a generated 2 to 6 layer stack. Theme presets (subtle, raised, floating, glow) stay as "Theme styles" chips.

**Custom (one click, "Customise").** A layer list. Each row: colour chip, plain-English summary, move up/down, duplicate, delete. Alt+Up/Down reorders from the keyboard with a live-region announcement. There is no hide/show eye: a hidden layer has nowhere to live in the saved text, so delete (and undo) covers it. "Add layer" up to the cap. Elevation keeps working as a proportional scale of the whole stack.

**Advanced (row expander).** X, Y, blur, spread (Up/Down nudging keeps the unit), colour with separate opacity, inset. A raw CSS field: paste any `box-shadow` (this is what makes reference cloning exact). A layer the parser cannot understand is kept as an "As written" row and is NEVER reset (the Gutenberg defect).

**States.** Where a block has a hover shadow, a Normal / Hover switcher (Hover says "Same as Normal" until overridden; one-click "Lift on hover" = Elevation + 1). Never a detached hover tab with its own defaults (Kadence bug).

## Storage (no new attributes, no migration)

- Shape attribute: comma-separated layers, each `[inset] X Y BLUR SPREAD`. One layer is byte-identical to today.
- Colour attribute: one colour (applies to all layers, today's behaviour) OR a top-level-comma list parallel to the layers. A layer colour is a token or CSS colour; per-layer opacity is standard CSS `color-mix(in srgb, <colour> N%, transparent)`, so a token stays linked to the brand and the parser can read it back as `{colour, opacity}`.
- One paren-depth-aware splitter (never a regex), one shared PHP composer `sgs_shadow_layers()` and one JS twin, replacing the three drifting copies (PHP composer, editor preview, media atom, with the existing byte-parity test).
- The generator is stateless: it writes ordinary layers. The panel recognises its own output by regenerating, so reopening shows "Elevation 3, Soft"; anything hand-edited shows "Custom". Nothing is lost moving between levels.

## Rules

- Layer cap: generator up to 6, manual add up to 6, raw paste up to 8 with a warning above 6. Blur capped at 100px, warning above 60px.
- Forced colours: `box-shadow` is removed by the browser, so the framework emits an outline fallback when a shadow is a block's only edge.
- `filter: drop-shadow` surface (nav submenu): layers chain, inset and spread are disabled with a stated reason (never dropped silently).
- Editor notice when an ancestor with `overflow:hidden` will clip the shadow.
- Hover transitions only under `prefers-reduced-motion: no-preference`.

## Proven vs assumed

| Claim | Status |
|---|---|
| 25 mounts in 22 files, one editor UI, 92 PHP call sites | PROVEN (census, commands in report) |
| Stored values are all plain strings, zero shadow values in theme content | PROVEN |
| Converter gaps every non-preset shadow | PROVEN |
| Old single-layer values stay valid with no migration | PROVEN by construction, to be proved by a test |
| The elevation formula matches real references | ASSUMED (derived by the Nerd from Comeau's numbers). Exit test: the raw-paste path reproduces Halcyon's and Indus's two-layer literals exactly; the generator is checked against Comeau's published tiers |
| Recognise-by-regeneration round-trips | ASSUMED, first thing built and tested |
| `color-mix()` layer colours survive every emit path | ASSUMED (the style engine drops it, so shadows must go through our own scoped rule, as the header fill already does) |
| Outline fallback does not shift layout | ASSUMED, measured live before shipping |

## Order of work (from the census)

1. Parser and composer helpers (PHP + JS twin) with negative controls.
2. `ShadowControl` rewrite, split under the 250-line limit.
3. Previews and the media atom twin.
4. `drop-shadow` chaining and the forced-colours fallback.
5. Gates and rosters (helper-parity, dead-controls, inspector-scan rule 07, media-atom parity, converter tests).
6. Live: mega panel, a card, the submenu, a header, real editor round trip.
7. Converter multi-layer split and elevation rows in `design_tokens` (see decision 1).

## Adversarial council changes (2026-09-21, six reviewers, each finding checked against the code)

**Real defects in code that exists today (fixed inside 4f-1).**
1. `includes/media/atoms/shadow.php::sgs_media_atom_shadow_resolve` emits the shape and a preset slug with no sanitiser at all, so any editor can inject CSS site-wide. Fix: the atom calls the shared composer and its mirror is deleted; the byte-parity test is replaced by one shared input/output fixture read by both the PHP and JS tests.
2. `helpers-tokens.php::sgs_css_value_has_breakout` does not reject `/*`, `*/`, `!` or unbalanced parentheses. One stray comment opener in a stored value can swallow every rule after it in the shared stylesheet. Fix: the shared composer parses each layer and re-emits only parsed fields (no blocklist).
3. `sgs_shadow_value` mangles a shape that starts with a minus (`-2px 4px ...`), which the control can produce today (negative X offset), and `sgs_shadow_value_composed` ignores the colour when the first length is a unitless `0`. Fix: one shared raw-shape rule in PHP and JS.
4. `sgs_shadow_value_to_drop_shadow` strips spread from the first layer only, so a multi-layer value gives an invalid filter. Fix: chain one `drop-shadow()` per layer, skip inset layers, say why in the panel.

**Corrections to this design.**
5. `color-mix()` colours do NOT survive the PHP path today: `sgs_is_css_colour` does not recognise them and `sgs_colour_value` mangles them into a `currentColor` slug, while the editor previews them correctly. Fix: a strict whole-value validator for `color-mix(in srgb, <token|hex|rgb> N%, transparent)`, plus a shared PHP/JS test fixture.
6. The composer appends ONE colour to the end of the whole string. Fix: split shape and colour lists at top-level commas, zip them, and land this (with a golden-output test) before any control work.
7. Recognise-by-regeneration would silently demote every stored stack the first time the generator is tuned. Fix: the generator becomes a frozen, versioned table (tuned before ship, append-only afterwards); recognition tries every version and reads colour and intensity from the layers, so a custom colour still shows as Elevation N.
8. Write shape and colour in ONE `setAttributes` call (a delete or reorder must not leave the two lists misaligned, and it is one undo step).
9. `none` and empty are different. Empty means "block default" (card-grid and team-member default to Raised), so Elevation "None" must save an explicit `none`, and the panel shows "Block default: Raised" when empty.
10. Hover shape and hover colour inherit together or not at all; a shorter colour list repeats its last entry, extras are ignored.
11. The cap (8 layers, 2,000 bytes, blur 0 to 100, offsets and spread -200 to 200) is enforced in PHP as well as the UI; a layer that fails the grammar is dropped from the page and flagged in the panel as "won't display", never silently reset.
12. The "92 call sites" figure counted comments; the composer has 23 real calls.

**Scope trims.** Cut: overflow-clip notice, blur warning as a separate rule (one warning line stays). Defer: "Lift on hover" and forced-colours fallback (no computable "shadow is the only edge" test; its own follow-up). Keep: the existing Normal/Hover tabs (ten blocks already pass a hover SHAPE; the "zero mounts" note in `ShadowControl.js::shadowAttrKeys` is stale).

**Panel requirements added.** Reset clears the current state only and is undoable; every replace shares one confirm placed beside the control touched, announced, with focus moved to it; controls do not move until confirmed; raw CSS is checked with `CSS.supports` and errors are announced (`aria-invalid`); focus returns to the next row (else Add) after delete or reorder; every action announces a distinct message; core `TabPanel`; a stacked layer row at 280px; elevation thumbnails carry an accessible name; one opacity owner per layer; the `canEditShape` guard (hover-only blocks) carries over; plain-English copy.

**Not acted on.** A palette slug that equals a CSS colour name (for example `teal`) resolving to the CSS colour is existing behaviour of `sgs_colour_value`, not introduced here.

**4f-2 changes.** No elevation rows in `design_tokens` are needed (the generator lives in the panel). The converter must write the colour list too, and match `a,b` and `a, b` alike.

## Direction settled after the council (Bean, 2026-09-21)

1. **Two separate things in the Simple tab.** Presets are complete finished shadows saved by NAME (a link: change the theme once and every block using it updates). The Elevation builder (elevation 0 to 6, Look, colour, Intensity) is live in the editor and writes the block's own copy of the layers. The "frozen, versioned generator" idea is withdrawn: pre-production there are no saved shadows to protect, so the builder is retuned freely. Recognition (showing "Elevation 3, Crisp") reads colour and intensity from the layers, so a custom colour still shows as an elevation.
2. **New preset set replaces the four old ones (Option 1).** Old `subtle, raised, floating, glow` are removed cleanly and replaced by a new named set with a one-off rename script over the 18 files that reference the old names (theme CSS, block CSS and render files, `hover-effects.php` allowlist and its JS twin, the `design_tokens` shadow rows). Draft set, to be tuned by eye against Halcyon, Indus and Comeau's tiers before it is frozen into `theme.json`: Whisper, Soft, Lifted, Floating, Crisp, Long, Outline, Grounded, Glow, Pressed, Hard (values in the prototype, `PRESETS`). Rename map: subtle to Whisper, raised to Soft; Floating and Glow keep their names with new values.
3. **One site-wide shadow colour.** Presets are written against a site colour variable (Glow uses the brand colour), so a rebrand recolours every shadow at once. A block may pick its own colour instead. The colour list gains a "site" entry alongside palette names and hex codes.
4. **Colour and opacity are separate, PHP builds the `color-mix`.** Same approach as the background fill helper (`includes/helpers-surface-ground.php::sgs_surface_fill_alpha`). Each layer saves a colour (site, palette name or hex) and an opacity, as a colour-list entry such as `site 12%`; the server parses that with a small strict reader and builds the `color-mix` itself. No `color-mix` is stored and none passes through `sgs_colour_value`. This removes the need for a stored-`color-mix` validator and drops the hex-with-opacity option.
5. **State toggle at panel level, colour picker single-state.** As the existing control does. On blocks with a hover colour but no hover shape, the Hover tab shows one colour and opacity row per Normal layer.
6. **Forced-colours (high-contrast) fallback is IN 4f-1, carried by the shared helper (Bean, 2026-09-21).** Browsers remove `box-shadow` in forced-colours mode, so every shadowed element also gets a 1px outline in the system text colour, only under `@media (forced-colors: active)`, skipped while the element has keyboard focus. There is no "shadow is the only edge" test: an element that already has a border just gets a second line over it, only in that mode. The rule rides inside the shadow's own declaration list as a nested `@media` block, so it needs no selector. New helper `sgs_shadow_box_decl()` returns the `box-shadow` declaration together with the fallback; `sgs_shadow_decls` uses it (seven blocks free); a codemod with survey, fix and check moves the direct callers (about 23, including the container wrapper) onto it; the same check fails the build when a shadow writer (PHP emitter, custom-property consumer, static default in a block stylesheet) lacks a fallback. `filter: drop-shadow` surfaces (nav submenu) are expected to survive the mode and get no outline, to be confirmed by emulation. Proof: a real browser with forced colours emulated shows the outline on a shadowed card, none on an unshadowed one, the focus ring intact, and the filter shadow unchanged. Assumptions to prove: browsers accept a nested `@media` inside a rule, and older browsers ignore it without dropping neighbouring declarations. Adds about one session to 4f-1.

## Decisions taken (Bean, before the council)

1. Split into 4f-1 (control, helpers, previews, drop-shadow, forced colours) and 4f-2 (converter split so Halcyon/Indus clone with both layers)? Recommend YES: the converter is a separate shared mechanism with its own council.
2. Layer cap 6 (generator) / 8 (raw paste): agree?
3. Light angle: straight down for v1, no per-site angle setting (per-layer X is available in Advanced). Agree?
