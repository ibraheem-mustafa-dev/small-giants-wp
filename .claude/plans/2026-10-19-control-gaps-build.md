---
plan_id: 2026-10-19-control-gaps-build
phase_name: Control gaps build (the 12 real gaps from the CSS equivalence audit)
project: small-giants-wp
header: Build the 12 block controls and theme defaults the Indus and Mama's drafts need, in one fresh session
cost_estimate: about 5 hours of build session; 7 builder subagents (Sonnet 6, Opus 1) plus main-thread QA
docscore_grade: A (100%, phase-plan, 2026-10-19)
---

# Phase: Control gaps build

**USP:** every feature the two client drafts use gets a real control, so no draft goes live with a look SGS cannot reproduce, and every future client gets the same 12 capabilities for free.

**Plan label:** [PLAN: opus] (the main thread QCs seven builders and owns the shared-layer rollout)

**Docscore:** A (100%, phase-plan template, 2026-10-19)

**Aggregate cost estimate:** 6 Sonnet builders at about 150k tokens each, 1 Opus builder at about 250k, main thread about 400k.

**Phase success criteria (done when):**
- [ ] All 12 gaps below are built, each with its MUST FAIL test green and its negative control holding.
- [ ] `cd plugins/sgs-blocks && npm run build` (PowerShell) passes, then `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` passes every gate and deploys.
- [ ] The batched live check (step 9) reads each gap's computed values at 375, 768 and 1440 on the canary and in the editor canvas, with cropped screenshot pairs for the visual ones (5, 7, 8).
- [ ] Each gap's FR in its owning spec reads `Status: built` with the command that proves it; `.claude/reports/2026-10-19-css-equivalence-audit.md` "Real control gaps" table points at the built FRs.

**Entry context (read before starting):**
- `.claude/reports/2026-10-19-css-equivalence-audit.md` "Real control gaps": what each gap is and which draft uses it.
- This plan's "Designs" section: the builder's source of truth for every attribute, label, selector and test.
- `CLAUDE.md`, `plugins/sgs-blocks/CLAUDE.md`, `.claude/rules/block-authoring.md`, `.claude/rules/colour-emission.md`.
- Drafts: `sites/indus-foods/handoff/*.dc.html`, `sites/mamas-munches-redesign/handoff/*.dc.html`.

**References:**
- MDN `-webkit-text-stroke` (Baseline since 2017, no unprefixed property), `paint-order`, `line-clamp` (read 2026-10-19).
- Gutenberg trunk `packages/format-library/src/text-color/inline.tsx` and `image/index.tsx` (both core formats save inline `style`, so SGS needs its own formats), `packages/rich-text/src/create.ts` (extra classes survive a round trip), `wp-includes/kses.php` (read 2026-10-19).
- Format API guide: https://github.com/wordpress/gutenberg/blob/trunk/docs/how-to-guides/format-api.md
- Theme and scrollbar sources: see Design G3 and G4.

## Pre-conditions

- The 12 FRs exist in their specs with `Status: not built` (Spec 01 FR-1-1, Spec 02 FR-2-1 to FR-2-5, Spec 04 FR-4-1 and FR-4-2, Spec 32 FR-32-23 to FR-32-26; added 2026-10-19).
- `plugins/sgs-blocks/vendor/bin/phpunit` and `node_modules` are installed (`cd plugins/sgs-blocks; npm run test:unit` runs).
- `npm run build` runs from PowerShell (the nvm shim is broken in Git Bash).
- No other session is mid-deploy to sandybrown or mid-reseed of the framework DB at each wave gate (step 0's messages).
- The canary's SSH and `.claude/secrets/sandybrown.env` work (step 8 and 9).

**Tooling Index:**

| Type | Name | Used in |
|---|---|---|
| skill | /sgs-wp-engine | every build step |
| skill | /delegate | step 0 (confirm models) |
| skill | /wp-blocks, /sgs-db | steps 1 to 7 (attribute shapes, DB rows) |
| skill | /wp-hooks | step 5 (format registration, kses) |
| skill | /migration-method | step 6 (link underline family detector), step 7 (typography rollout) |
| skill | /systematic-debugging | any red gate or test |
| skill | /qc | step 9 |
| skill | /lint | QA gates |
| skill | /writing-clearly-and-concisely | step 10 (spec FRs, help text review) |
| cli | vendor/bin/phpunit, wp-scripts test-unit-js | every build step |
| cli | build-deploy.py | step 8 |
| external | Playwright (headed Chrome, channel chrome) | step 9 |

## Orchestration

The shared worktree has other sessions in it. Builders never run `npm run build` (it reseeds the shared framework DB); only the main thread does, once per wave gate, after messaging peers (`ListAgents`, `SendMessage`). Builders run only their own PHPUnit and JS tests. Each builder commits nothing; the main thread reads each diff in full, then commits by explicit pathspec.

Files are partitioned so builders in one wave never touch the same file:

| Wave | Builders in parallel | Gaps | Files owned |
|---|---|---|---|
| 1 | B1 container | G1 | `src/blocks/container/*`, `includes/container-pin-edge-css.php` |
| 1 | B2 buybox | G6 | `src/blocks/buybox/*`, `src/blocks/whatsapp-cta/style.css` |
| 1 | B3 theme and form | G3, G4, G9, G10 | `theme/sgs-theme/*`, `src/blocks/nav-drawer/style.css` and `render.php`, `src/blocks/google-reviews/render.php` and `render-styles.php`, `src/blocks/form/style.css`, `src/blocks/form-field-tiles/*`, `scripts/snapshot_scrollbar_tokens.py`, `scripts/check-snapshot-scrollbar-tokens.py`, `scripts/push-theme-snapshot.py`, `sites/indus-foods/theme-snapshot.json` |
| 2 | B4 label | G5 | `src/blocks/label/*`, `includes/helpers-shape-preset.php`, `src/utils/shape-preset.js` |
| 2 | B5 inline formats (Opus) | G7, G8 | `src/blocks/heading/*`, `src/blocks/text/*`, `src/blocks/extensions/inline-formats/*`, `includes/helpers-inline-formats.php`, `assets/css/inline-formats.css`, `includes/class-sgs-blocks.php` |
| 3 | B6 link underline | G11 | `includes/helpers-link-underline.php`, `src/components/LinkUnderlineControl.js`, `src/utils/link-underline.js`, the 10 link-underline blocks |
| 3 | B7 typography (after B6) | G2, G12 | `includes/helpers-typography.php`, `src/components/TypographyControls.js`, `src/utils/typography-preview.js`, `scripts/audit-typography-attr-declarations.js`, every block.json the generator touches |

| all | Main thread only | registries and glue | `includes/render-helpers.php` (require lines, B4's then B5's, with its header comment list), `scripts/consistency/*.json` (incl. `scripts/consistency/setting-registry.json`), `scripts/attr-classification-overrides.json`, `scripts/data/property-suffixes.json`, `scripts/check-dead-controls.js`, `src/blocks/label/render.php`'s kses swap (wave 2 gate) |

**Registry rows in waves 1 and 2**: every new attribute needs rows in the shared registries, and `npm run build` / `gate:fast` stay red until they exist. Each wave 1 and 2 builder returns a ready-to-paste fragment per registry file (exact JSON or JS lines and where they go); the main thread applies all fragments before the wave's build. Wave 3 builders edit the registries themselves.

**Commits**: one commit per gap, except G7 with G8, G2 with G12, and G9 with G10 (G9 and G10 share `src/blocks/form/style.css`). The tree is shared and dirty, so `git pull --rebase` refuses: run `git pull --ff-only origin main` before committing, commit by explicit pathspec with `git branch --show-current` in the same command, push at once; if the push is rejected, `git pull --no-rebase origin main` (a merge works on a dirty tree when no file overlaps) and push again. Never stash.

**Gates**: a gate passes when it exits 0; warnings do not fail it. `gate:fast` and `gate:full` run `plugins/sgs-blocks/scripts/run-gates.py` tiers (`npm run gate:list` names every gate). A red gate whose finding is not this phase's work is checked as pre-existing and disclosed in the commit (`[gates-ok:<reason>]`, `~/.claude/rules/git-hygiene.md`).

**Peer work in the route**: other sessions edit `scripts/computed-route/` (uncommitted intake-inventory files on 2026-10-19). Before B5 starts, run `cd scripts/computed-route && node --test tests/*.test.mjs` and record the baseline; a failure already in the baseline is not B5's.

**Mutation checks** revert by hand with the Edit tool, then `git diff -- <file>` must match the pre-mutation diff (builders cannot stash or commit).

Wave 3 is sequential (B6 then B7) because both touch the shared registries (`scripts/check-dead-controls.js`, `scripts/data/property-suffixes.json`, `scripts/consistency/cluster-member-sets.json`) and B7's generator rewrites block.json files across ~44 blocks. Waves 1 and 2 can overlap in time if the main thread has review capacity; they share no files.

## Designs (the builder's source of truth)

Paths are relative to `plugins/sgs-blocks/` unless they start with `theme/`, `scripts/` at the repo root, or `.claude/`. Every attribute name is final; every label and help text is final UK English.

### G1: a sticky side column stops below the sticky header (sgs/container, Spec 02 FR-2-1)

Draft: `sites/indus-foods/handoff/Indus Foods Website v2.dc.html` (grep `R.sticky`, `top:120px`): desktop only, header 84px.

- **Attributes** (`src/blocks/container/block.json`, beside `pinEdge`): `pinBelowHeader` object default `{}` (per tier `desktop`/`tablet`/`mobile`, value `"on"` or `"off"`, same inherit-from-larger-tier cascade as `pinEdge`); `pinGap` object default `{}` (per tier, a CSS length or spacing-preset slug read through `sgs_css_length_value()`; unset = `var(--wp--preset--spacing--40,1.5rem)`, the shop filter's default). Both act only at a tier where `pinEdge` resolves to `top`: if desktop is top and "on" but tablet resolves to bottom, tablet gets no offset.
- **Control** (`src/blocks/container/components/PinEdgeControl.js`, under "Pin to edge", shown when the previewed tier's pin is Top): `ToggleControl` in `ResponsiveOverride`, label "Stop below the site header", help "Keeps the pinned column clear of a sticky header instead of sliding under it. Ignored inside drawers and pop-ups."; `SpacingControl custom` in `ResponsiveOverride`, label "Gap below the header", help "Space between the header and the pinned column."
- **Render** (`includes/container-pin-edge-css.php::sgs_container_pin_edge_css`): add `pinBelowHeader` and the resolved gap to the grouping key (now `edge|pad`); keep the base `position:sticky;top:0;…` rule; for each "on" tier at a top edge add, inside the same `sgs_tier_exact_media_css()` wrapper: `{sel}:not(dialog *,[role="dialog"] *,[popover] *){top:calc(var(--sgs-header-height,0px) + GAP);}`. Drawers and modals are native `<dialog>`, so the `:not()` keeps the offset out; `--sgs-header-height` is 0 when the header is not sticky (`src/header-behaviours/view.js::publishHeight`).
- **Canvas twin**: new `src/blocks/container/pin-edge-preview.js::pinEdgeTopPreview(attributes, tier)`, called from `container/edit.js` where it sets `top: 0` today; returns `calc(var(--sgs-header-height, 0px) + <gap>)`.
- **Tests**: `tests/php/ContainerPinBelowHeaderTest.php` (`BlockHarnessRenderTrait`): `pinEdge {desktop:'top'}`, `pinBelowHeader {desktop:'on'}`, `pinGap {desktop:'36px'}` → CSS contains `top:calc(var(--sgs-header-height,0px) + 36px)` and `:not(dialog *`; negative controls: toggle unset, or edge `bottom`, → no `--sgs-header-height`. `tests/js/container-pin-preview.test.js` asserts `pinEdgeTopPreview`'s value.
- **Live**: a grid with a pinned container under the sticky header: at 1440 after an 800px scroll the column's `getBoundingClientRect().top` equals header bottom + gap; at 768 and 375 (desktop-only pin) computed `position` is `static`; the same container inside `sgs/nav-drawer` computes `top: 0px`.
- **Not in scope**: the draft's `align-items:start` on the parent grid is the parent container's existing Align items setting; the pin rule does not add `align-self`.

### G2: hollow outlined lettering (shared typography, Spec 32 FR-32-23)

Drafts: Indus timeline years `color:transparent; -webkit-text-stroke:2px #0A7EA8` (1.5px mobile); Mama's star glyph 1px `#3A2A22`. Indus's colour change is the current card in a scroll, not hover; that belongs to the pinned timeline build (record it in the Indus build plan, not here).

- **Attributes** per typography prefix: `{prefix}TextStrokeWidth` object default `{}` (desktop/tablet/mobile numbers in px, 0 to 20); `{prefix}TextStrokeColour` string `""`; `{prefix}TextStrokeColourHover` string `""`.
- **Control** (`src/components/TypographyControls.js`, new opt-in prop `showTextStroke`, rendered after Text wrap): "Outline width", `NumberControl` px in `ResponsiveControl`, help "Draws a line round each letter. For hollow letters, set the text colour's opacity to 0 under Colour."; "Outline colour", `DesignTokenPicker` with states Normal and Hover, `linked:true`, solid only.
- **Hollow fill**: no new toggle. The text colour picker already allows alpha (`DesignTokenPicker::enableAlpha=true`; `sgs_is_css_colour` accepts `#RRGGBBAA`), so the text colour at opacity 0 makes hollow letters and keeps its own Hover state.
- **Render** (`includes/helpers-typography.php::sgs_typography_css_rule`): a tiered spec `{value:<object>, css:'-webkit-text-stroke-width', unit_default:'px'}` in `$tiered_specs`; `-webkit-text-stroke-color:<sgs_colour_value()>` in `$base_decls`; hover via `sgs_hover_state_rules( $selector, '-webkit-text-stroke-color:X' )`. No `paint-order`.
- **Canvas twin** (`src/utils/typography-preview.js::typographyPreviewStyle`): `WebkitTextStrokeWidth` per tier via `valueAtTier`, `WebkitTextStrokeColor` via `tokens.js::colourVar`; note in the docblock that hover is not previewed inline.
- **Reach**: add `showTextStroke` to `scripts/audit-typography-attr-declarations.js::SUFFIX_SHAPES`. The opt-in props are added by a detector, not a throwaway codemod (more than 3 blocks): new `scripts/survey-typography-opt-in-props.js` (under `plugins/sgs-blocks/`) with `--survey`, `--fix`, `--check`, `--self-test`, whose `--check` fails when a `<TypographyControls>` call passing `showTextWrap` lacks `showTextStroke` or `showTextLines` (127 call lines in 45 files on 2026-10-19; paste `--survey` as the baseline); run its `--fix`, then `node scripts/audit-typography-attr-declarations.js --fix --apply` for the block.json attributes (universal per FP-9). Registries: `scripts/check-dead-controls.js` (3 suffixes in the `sgs_typography_css_rule` list), `scripts/data/property-suffixes.json` (`TextStrokeWidth` → `-webkit-text-stroke-width` typography; `TextStrokeColour` → `-webkit-text-stroke-color` colour), `scripts/consistency/cluster-member-sets.json`, `.claude/rules/colour-emission.md` (text outline colour is owned by TypographyControls).
- **Tests**: `tests/php/TypographyTextStrokeTest.php`: `sgs/text` with `textStrokeWidth:{desktop:2,mobile:1.5}`, `textStrokeColour:'#0A7EA8'`, `textStrokeColourHover:'#D8CA50'` → base rule has `-webkit-text-stroke-width:2px` and `-webkit-text-stroke-color:#0A7EA8`; `@media (max-width:767px){…-webkit-text-stroke-width:1.5px`; the hover rule sits inside `@media (hover: hover)`; negative control: nothing set → no `text-stroke`. Extend `tests/js/typography-preview.test.js`.
- **Live**: `sgs/text` with opacity-0 colour: `getComputedStyle(el).webkitTextStrokeWidth` 2px at 1440 and 768, 1.5px at 375; `color` is `rgba(…, 0)`; hover with a real pointer changes the stroke colour.

### G3: branded scrollbars on every scroller (theme, Spec 32 FR-32-26)

Drafts: Indus drawer gold thumb (`Indus Foods Website v2.dc.html`, grep `data-drawer-scroll` and `scrollbar-color`); Mama's hides its bars.

- **Facts**: the nav drawer's 35% ink mix measures 2.13:1 on the default surface (fails the 3:1 UI-component rule); primary on surface is 4.84:1, accent on footer-bg 8.31:1. When `scrollbar-color` or `scrollbar-width` is not `auto`, Chrome 121+ ignores `::-webkit-scrollbar` parts on that element (CSS Scrollbars spec). Every `::-webkit-scrollbar{display:none}` in the codebase already pairs with `scrollbar-width:none` (count per file; the new test checks each pair). A `var()` inside `:root{scrollbar-color}` resolves at the root, so the rule goes on `:where(*)` for per-scope overrides to reach descendants.
- **Tokens**: snapshot keys `settings.custom.scrollbar.{thumb, thumbOnDark, track}` (the `settings.custom.focus` precedent); `theme/sgs-theme/theme.json` defaults `thumb` = `var(--wp--preset--color--primary)`, `thumbOnDark` = `var(--wp--preset--color--accent)`, `track` = `transparent`. CSS reads `--wp--custom--scrollbar--thumb`, `--thumb-on-dark`, `--track`; scopes override `--sgs-scrollbar-thumb` and `--sgs-scrollbar-track`. Each thumb must reach 3:1 against its ground, measured as the focus tokens are (Spec 32 §14.5; model the maths on `scripts/check-snapshot-focus-tokens.py`).
- **Control**: snapshot-only, like focus (a site-wide brand look); the per-instance control is the drawer's text colour. Help line for Spec 32: "Scrollbar colour comes from your theme snapshot (scrollbar.thumb). A block that needs its own sets `--sgs-scrollbar-thumb` in its scoped style."
- **CSS** (new `theme/sgs-theme/assets/css/scrollbars.css`): `:root,.sgs-on-light{--sgs-scrollbar-thumb:var(--wp--custom--scrollbar--thumb,var(--wp--preset--color--primary,#1f7a7a));--sgs-scrollbar-track:var(--wp--custom--scrollbar--track,transparent)}` `.sgs-on-dark{--sgs-scrollbar-thumb:var(--wp--custom--scrollbar--thumb-on-dark,var(--wp--preset--color--accent,#f59e0b))}` `:root,:where(*){scrollbar-color:var(--sgs-scrollbar-thumb) var(--sgs-scrollbar-track)}` `:where(.sgs-scrollbar-native,.sgs-scrollbar-native *){scrollbar-color:auto}`. Enqueued synchronously by `theme/sgs-theme/functions.php::enqueue_styles` (as `sgs-focus` is) and added to the editor by `functions.php::setup` with `add_editor_style( 'assets/css/scrollbars.css' )`. The page's own scrollbar is included (the root value propagates to the viewport). Width stays `auto` (no global `thin`).
- **Opt-outs**: class `sgs-scrollbar-native` on the shop filter sheet (`theme/sgs-theme/assets/css/woocommerce.css`, deliberately the browser's bar) and on sgs/google-reviews's scroller when its `scrollbarColour` is empty (the class goes on the element `src/blocks/google-reviews/render.php` prints; `scrollbarColour` itself is read in `render-styles.php`); hidden bars keep `scrollbar-width:none`.
- **Pass look**: in Chrome the drawer thumb stays rounded with no arrow buttons and takes the token colour; the page scrollbar's thumb is the primary colour. Judged by the main thread from a headed screenshot, then shown to Bean at step 9.
- **Nav drawer** (`src/blocks/nav-drawer/style.css`): delete both 35% mixes (the thumb `background-color` and the `@supports not selector(::-webkit-scrollbar)` `scrollbar-color`) and rewrite the comments that name `--sgs-nd-scrollbar-ink`; the thumb background becomes `var(--sgs-scrollbar-thumb)`; add `@supports selector(::-webkit-scrollbar){.wp-block-sgs-nav-drawer{scrollbar-color:auto}}` so the rounded, arrow-free webkit thumb keeps working; Firefox inherits the token colour and keeps `scrollbar-width:thin`. `src/blocks/nav-drawer/render.php` publishes `--sgs-scrollbar-thumb:<drawer text colour>` in place of `--sgs-nd-scrollbar-ink`.
- **Snapshot gate**: new `scripts/snapshot_scrollbar_tokens.py` (contrast maths) and `scripts/check-snapshot-scrollbar-tokens.py` (refuses a thumb under 3:1 against its ground; self-test with a 1.6:1 negative control), wired into `scripts/push-theme-snapshot.py::roster_guard` (paths under `plugins/sgs-blocks/`). Indus: `sites/indus-foods/theme-snapshot.json` gains `settings.custom.scrollbar.thumbOnDark` = `#e7d768` (pushing it to indus-test needs the Indus session's go: step 8).
- **Tests**: `tests/js/scrollbar-contract.test.js` (model: `focus-system-contract.test.js`): the `:where(*)` rule declares `scrollbar-color`; no `--sgs-nd-scrollbar-ink` anywhere; every `::-webkit-scrollbar{display:none}` has its `scrollbar-width:none` pair. Fails today (file missing, `35%` present).
- **Live**: `getComputedStyle(document.documentElement).scrollbarColor` at 375/768/1440; the open drawer's computed value is `auto` in Chrome; a headed Chrome screenshot (native bars do not show in element screenshots).

### G4: crisper text on macOS and iOS (theme, Spec 01 FR-1-1)

- Always on, no setting (subpixel antialiasing has been off by default since macOS Mojave; 13 draft files already declare it). In `theme/sgs-theme/assets/css/core-blocks-critical.css`, add to the existing `html` rule: `-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;` (that file loads synchronously on the frontend and through `add_editor_style`).
- **Test**: `tests/js/font-smoothing.test.js`: the critical CSS holds both declarations (fails today). **Live**: `getComputedStyle(document.body).webkitFontSmoothing === 'antialiased'` (Chrome reports the value on any OS).

### G9: a long uploaded file name stays inside its box (sgs/form, Spec 04 FR-4-1)

Draft: `sites/indus-foods/handoff/TradeApplication.dc.html` (grep `overflow-wrap`).

- **CSS** (`src/blocks/form/style.css`; first grep it for a `min-width` on `.sgs-form-field`: if one exists, keep it, drop that one declaration below and say so in the report): `.sgs-form-file__preview{min-width:0;overflow-wrap:anywhere}` `.sgs-form-file__name,.sgs-form-file__error,.sgs-form-field__error{overflow-wrap:anywhere}` `:where(.sgs-form-field){min-width:0}` `.sgs-form-review__term,.sgs-form-review__detail{min-width:0;overflow-wrap:anywhere}`. Covers the span from `form/view.js::uploadFile`, choice-flow's `flow-fields.js::uploadFlowFile` (writes into the preview), and `form/view.js::populateReview`. Leave `grid-template-columns` alone (the F3 rule in `plugins/sgs-blocks/scripts/check-hardcoded-render-defaults.js` governs it). Both review selectors exist today (`form/style.css::.sgs-form-review__term`, `::.sgs-form-review__detail`).
- **Test**: `tests/js/form-file-wrap.test.js`: the stylesheet holds those rules (fails today). **Live**: a canary form page, `setInputFiles` with a 120-character name: `preview.scrollWidth <= preview.clientWidth` and `document.documentElement.scrollWidth <= innerWidth` at 375/768/1440, and again on the review step.

### G10: a description line under each option tile's label (sgs/form-field-tiles, Spec 04 FR-4-2)

Draft: `sites/indus-foods/handoff/EnquiryForm.dc.html` ("What can we help with?" chips: 17px bold label, 15px description at opacity .85, 4px gap).

- **Attributes** (`src/blocks/form-field-tiles/block.json`): `tiles[].description` string in the item schema; a `tileDescription*` typography set with the shape of `account/block.json`'s `cardDesc*` (FontSize, Unit, Tablet, Mobile, Family, Weight, Style, LineHeight, LineHeightUnit, LetterSpacing, LetterSpacingUnit, TextTransform, TextDecoration, TextAlign, TextWrap); `tileDescriptionColour` string `''`; and, in the same pass, a `tileLabel*` typography set of the same shape plus `tileLabelColour` (the label has no typography today; stale `tileLabel*` comments in `style.css` become true).
- **Controls** (`src/blocks/form-field-tiles/edit.js`): in the Tiles panel, a `TextControl` after Label: "Description", help "A short line under the label. Leave blank for none."; a panel mounting `<TypographyControls prefix="tileLabel" …>` and `<TypographyControls prefix="tileDescription" fontSizePresets showFontFamily showDecoration showTransform showLetterSpacing showTextAlign showTextWrap/>` (as account and accordion do); `SgsColourPanel` text rows for `tileLabelColour` and `tileDescriptionColour`.
- **Render** (`src/blocks/form-field-tiles/render.php`, after the label span): `if ( '' !== trim( (string) ( $tile['description'] ?? '' ) ) ) { echo '<span class="sgs-form-tile__description">' . esc_html( $tile['description'] ) . '</span>'; }` inside the `<label for>`, so it is part of the accessible name (WCAG 2.5.3; `aria-describedby` on the first input already carries error and help). Scoped CSS: `sgs_typography_css_rule( $attributes, 'tileDescription', '.' . $sgs_ft_uid . ' .sgs-form-tile__description' )` and the same for `tileLabel` on the label span, plus the colour declarations. `src/blocks/form/style.css`: `:where(.sgs-form-tile__description){font-size:var(--wp--preset--font-size--small,.9375rem);line-height:1.4;font-weight:400;overflow-wrap:anywhere}`. No opacity default (contrast is never reduced): the draft's opacity .85 is reproduced by setting `tileDescriptionColour`, which the route writes; this is decided, not a deviation.
- **Canvas twin**: the same span in the preview tile; `typographyPreviewCss( attributes, 'tileDescription', selector, previewTier )` and `'tileLabel'`; both colours added to the `textPaintPreview` call, attributes named at the call site.
- **Test**: `tests/php/FormFieldTilesDescriptionTest.php` (`BlockHarnessRenderTrait`): a tile with a description renders the span inside the label; without one, no span; the CSS holds the typography rule. **Live**: a canary tiles field: computed `font-size` and `color` of the description at 375/768/1440; the accessible name in the accessibility snapshot includes the description.

### G5: a tilted ribbon tag with a V-cut right end (sgs/label, Spec 02 FR-2-2)

Draft: `sites/mamas-munches-redesign/handoff/Home.dc.html` and `Product.dc.html` (grep `polygon(0 0,100% 0,88% 50%`): pink "baked with love" tag, 2px border, rotated -6 and -4 degrees.

- **Rotation is already built**: `sgs/label` has `supports.sgs.motion: true`; Motion → Hover → Rotate → Rest rotate (`restRotate`, `--sgs-rot-rest`, per device) tilts the root and its layers. Add nothing for rotation.
- **Attributes** (`src/blocks/label/block.json`): `shape` string enum `none | ribbon-right | ribbon-left | ticket | arrow-right | chevron`, default `none`; `shapeNotch` number default 12 (min 4, max 40; percent of width: 12 gives the draft's 88% point); `borderWidth` object `{}` (one box, no tiers: per-device border width is Bean-locked off); `borderStyle` string `solid`; `borderColour` string `""`; `borderColourGradient` string `""`. Add `css:border-width`, `css:border-style`, `css:border-color`, `css:border-color-gradient` to `supports.sgs.elements.label.attrMap`; delete the "label has no border feature" `_note` text.
- **Control**: new `src/blocks/label/ShapePanel.js` (edit.js is 601 lines): `PanelBody` "Shape"; `SelectControl` "Shape", help "Cuts the label's end into a ribbon, ticket or arrow. The tilt is under Motion, Hover, Rotate."; `RangeControl` "Notch depth" (shown when shape is not none); `<SgsBorderControl>` with `widthValues`/`styleValue`/`colourValue`/`colourGradientValue` read from `borderWidth`/`borderStyle`/`borderColour`/`borderColourGradient` and the matching `on*Change` writers, with border help "With a shape, the outline follows the cut edges. Style None removes it; any other style draws solid."
- **Shared helper** `includes/helpers-shape-preset.php`: `sgs_shape_preset_points( $preset, $notch )`, `sgs_shape_preset_clip( $preset, $notch )` → `polygon(…)`, `sgs_shape_preset_ring_mask( $preset, $notch, $width )` → data-URI SVG mask. Polygons (n = notch): ribbon-right `0 0,100% 0,(100-n)% 50%,100% 100%,0 100%`; ribbon-left `0 0,100% 0,100% 100%,0 100%,n% 50%`; ticket both V-cuts; arrow-right `0 0,(100-n)% 0,100% 50%,(100-n)% 100%,0 100%`; chevron arrow-right plus a left V-cut. JS twin `src/utils/shape-preset.js` with identical output.
- **Render** (`src/blocks/label/render.php`): the clip goes on layers only, never the root (text, hit area and focus ring stay whole). Fill: keep the existing `::after` from `includes/helpers-tokens.php::sgs_block_background_layer_css` (never edit that shared helper) and append, in `label/render.php` after its output, `{sel}::after{inset:calc(-1*W);clip-path:POLY;z-index:-2}` so the fill and the ring clip the same border box (the helper's `inset:0` is the padding box, which would misalign the V edges). Ring: when shape ≠ none and border width > 0, print `<span class="sgs-label__edge" aria-hidden="true"></span>` as the first child; CSS `{sel} .sgs-label__edge{position:absolute;inset:calc(-1*W);z-index:-1;pointer-events:none;clip-path:POLY;<paint>;mask:url("data:image/svg+xml,…") 0 0/100% 100% no-repeat;}` where the mask SVG is `viewBox 0 0 100 100`, `preserveAspectRatio="none"`, a `<polygon>` with `fill="none" stroke="#000" stroke-width="2W" vector-effect="non-scaling-stroke"` (the viewport and the clip remove the stroke's outer half, leaving an even W-wide line along the diagonals); `<paint>` is `sgs_background_paint_decl( sgs_colour_value( borderColour ), borderColourGradient )`. The root gets `border:W solid transparent` (W = the top value from `sgs_border_box_decls()`); `border-radius` is ignored while a shape is set. (The content echo's swap to `sgs_rich_text_kses` is done by the main thread at the wave 2 gate.) Before relying on Motion for the tilt, confirm the label's root receives `--sgs-rot-rest` (`includes/motion/class-sgs-motion-rotation.php`, `src/components/motion/generated-motion-defs.json`).
- **Canvas twin**: `src/blocks/label/shape-preview.js` (mirrors `dot-preview.js`, scoped `<style>` for `.sgs-lbl-ed-{clientId}`); in edit.js, when the ring is on, render `<span {...blockProps}><span aria-hidden contentEditable={false} class="sgs-label__edge"/><RichText …/></span>`; call `sgsBorderPreview()` with the panel values (`check-border-preview-twin.js`), colour overridden to transparent while a shape is set.
- **Tests**: `tests/php/LabelShapeTest.php` (same harness as `LabelDotTest`): `shape=ribbon-right`, `shapeNotch=12`, `borderWidth={top:'2px',right:'2px',bottom:'2px',left:'2px'}`, `borderColour='#3A2A22'` → CSS has `clip-path:polygon(0 0,100% 0,88% 50%,100% 100%,0 100%)`, HTML has `sgs-label__edge`, mask has `vector-effect="non-scaling-stroke"` and `stroke-width="4"`; negative controls: `shape=none` → no `clip-path`, no edge span; `borderStyle=none` → no edge span; `textColourGradient` + shape still emits the gradient rule. `tests/js/label-shape-preview.test.js`: PHP and JS polygons identical for every preset.
- **Live**: one label per preset: computed `clip-path` on `::after` and the edge span at 375/768/1440; a cropped screenshot of the V edge with pixel samples along the diagonal (the outline must be there); `rotate` equals the Motion rest rotate. Browser matrix for the SVG mask: Chromium, Firefox, WebKit. If the mask fails in one engine, fall back to fill-only (no outline) there; never add a second technique.

### G6: a phone add-to-basket bar that slides up once the buy button scrolls away (sgs/buybox, Spec 02 FR-2-3)

Draft: `sites/mamas-munches-redesign/handoff/Product.dc.html` (grep `position:fixed;bottom:0`, `barOn`, `showBar`).

- **Facts**: the buybox root is `data-wp-interactive="sgs/product-card"`, context holds `priceDisplay`, `selectedVariationId`, `axes`, `selectedAxes`, `pending`; the add button is `.buybox__cart-form` submitting to `actions.addToCart`; `guided.js` guards that form's submit with a capture listener. The bar lives inside the root and triggers the existing form.
- **Attribute** (`src/blocks/buybox/block.json`): `stickyBar` object default `{}`, per tier `"off"` or `"after-button"`. No label-mode attribute: the bar always shows the price and a variant line.
- **Control** (`src/blocks/buybox/inspector-extra.js`, below "Stick while scrolling"): `ResponsiveOverride` + `SelectControl` "Add-to-basket bar", options "Off" and "Show once the Add button has scrolled out of view", help "A fixed bar at the bottom of the screen with the price, the chosen options and an Add button. Usually switched on for phones only." The existing add-to-cart button settings style the bar's button through the shared `.buybox__add-to-cart` classes.
- **Render** (`src/blocks/buybox/render.php`, after `.sgs-buybox__config-col` closes, before the data island; only when a tier is on): `<div class="sgs-buybox__bar" data-sgs-bar hidden role="region" aria-label="Quick add to basket">` holding `<span class="sgs-buybox__bar-price" data-wp-text="context.priceDisplay">`, `<span class="sgs-buybox__bar-variant" data-sgs-bar-variant>`, `<button type="button" class="wp-element-button buybox__add-to-cart" data-wp-bind--disabled="context.pending" data-wp-bind--aria-busy="context.pending">` with the existing `$add_to_cart_label`; the tier map on the root as `data-sgs-bar='{"d":0,"t":0,"m":1}'` from `extras.php::sgs_buybox_sticky_bar_data()` (mirrors `sgs_buybox_sticky_data`); out of stock: `data-wp-bind--hidden="!context.inStock"`.
- **JS** (new `src/blocks/buybox/sticky-bar.js`, added to `block.json::viewScriptModule`, plain DOM like `guided.js`): an `IntersectionObserver` on the in-flow add control (`.buybox__cart-form`, or `[data-sgs-modal-open]` in modal mode); the bar shows only while that control is above the viewport (`boundingClientRect.top < 0`) and the current tier (`matchMedia` at 768 and 1024) is on. Variant line rebuilt on the root's `sgs:option-selected` event from `.sgs-buybox__picker-selected-value` texts joined with " / ". Click → `cartForm.requestSubmit()` (inherits `actions.addToCart`, the guided guard and the toast); in modal mode `.click()` the modal-open button; with `selectedVariationId` 0 and axes present, scroll the picker into view (`scrollIntoView({block:'center'})`) and focus its first input instead of submitting. While the bar is on, set `--sgs-sticky-bar-h` on `:root`. Reduced motion removes the transition. No JS → `hidden` stays → nothing renders.
- **CSS** (`src/blocks/buybox/style.css`): `.sgs-buybox__bar{position:fixed;inset-inline:0;bottom:0;z-index:var(--wp--custom--z-index--sticky-bar,150);display:flex;align-items:center;gap:12px;padding:10px 16px calc(10px + env(safe-area-inset-bottom));transform:translateY(110%);transition:transform .3s cubic-bezier(.2,.8,.2,1)}`, `.sgs-buybox__bar.is-on{transform:none}`, button `min-height:44px`; colours from three new attributes (a visible look needs a control): `stickyBarBackground`, `stickyBarText`, `stickyBarBorderColour` (strings, default `''`), set in the block's `SgsColourPanel` as rows "Bar background", "Bar text", "Bar border", emitted by `render.php` through `sgs_colour_value()` as `--sgs-buybox-bar-bg`, `--sgs-buybox-bar-text`, `--sgs-buybox-bar-border` in the block's scoped style and read as `background:var(--sgs-buybox-bar-bg,var(--wp--preset--color--surface));color:var(--sgs-buybox-bar-text,var(--wp--preset--color--text));border-top:2px solid var(--sgs-buybox-bar-border,var(--wp--preset--color--border))`; `body{padding-bottom:var(--sgs-sticky-bar-h,0px)}` and `:root{scroll-padding-bottom:var(--sgs-sticky-bar-h,0px)}` (WCAG 2.4.11). No theme.json entry: no `--wp--custom--z-index--*` token is defined anywhere, and whatsapp-cta and google-rating-badge read theirs with a fallback the same way. In `src/blocks/whatsapp-cta/style.css`: `.sgs-whatsapp-cta--floating{bottom:calc(var(--sgs-sticky-bar-h,0px) + 24px)}` (24px is its current bottom).
- **Canvas twin** (`src/blocks/buybox/canvas-mock.js`): the bar drawn statically at the bottom of the mock when the previewed tier is on, `position:absolute` inside the mock (never fixed), mock price and a sample variant line.
- **Tests**: `tests/php/BuyboxStickyBarTest.php` (the `BuyboxImagePriorityTest` child-process harness): variable product, `stickyBar {mobile:'after-button'}` → HTML has `data-sgs-bar`, `data-wp-text="context.priceDisplay"`, `aria-label="Quick add to basket"`, no `style="`; negative control: unset → no `data-sgs-bar`. `tests/js/buybox-sticky-bar.test.js` with a mocked `IntersectionObserver`: `is-on` when the control leaves above; click calls `form.requestSubmit` once; with `selectedVariationId` 0 and axes, click calls `scrollIntoView` instead; `--sgs-sticky-bar-h` set then cleared.
- **Live**: a canary product page with a buybox (`wp post list --post_type=product`): at 375 scroll past the Add button → bar at `bottom:0`, clicking it shows the basket toast and changes the cart count, it never covers a focused control at the page end; at 768 and 1440 the bar is hidden; reduced motion → no transition; Tab to the bar button → visible focus ring, at least 44px.

### G7: a highlighter stripe behind one word of a heading (Spec 02 FR-2-4) and G8: a small rounded photo inside a heading's line (Spec 02 FR-2-5)

Draft: `sites/mamas-munches-redesign/handoff/Home.dc.html` (grep `F9CF6E` and `vertical-align`): the H1's "most" with a yellow stripe across its lower part, tilted; a pill photo (1.55em × 0.78em, full radius, 3px dark border, tilted -4 degrees) between words.

- **Facts**: sgs/heading and sgs/text are dynamic; their HTML lives in `heading/block.json::attributes.content` and `text/block.json::attributes.text` and prints through `wp_kses_post()`, which keeps `style` on every tag. `audit-inline-styling.js --check` reads render.php source only, never saved content. Core's `core/text-color` (`<mark … style=…>`) and `core/image` (`<img … style="width:…">`) both save inline style, so SGS registers its own formats. Allowed formats today: `core/bold`, `core/italic`, `core/link` (`heading/edit.js` and `text/edit.js` `allowedFormats`).
- **One shared mechanism**: the words carry only a class; the look comes from block attributes emitted as custom properties in the block's scoped `<style>`, painted by one shared stylesheet (Spec 32 §6.1(b)). Sizes in `em` follow the heading's tiered font size, so no device tiers. Every highlight (and every photo) in one block shares one look.
- **Sanitising**: new `includes/helpers-inline-formats.php::sgs_rich_text_kses( string $html ): string` = the post allowlist with `style` removed from every tag; it replaces `wp_kses_post` in `heading/render.php`, `text/render.php` (both `printf` sites) and `label/render.php` (label's swap is done by the main thread at the wave 2 gate). Load it through `includes/render-helpers.php`.
- **CSS helper**: `includes/helpers-inline-formats.php::sgs_inline_formats_css( array $attributes, string $root_sel, string $html ): string`, returns `''` unless the HTML contains `sgs-highlight` or `sgs-inline-photo`; colours through `sgs_colour_value()`, lengths through `sgs_css_length_value()`; pushed into `$scoped_css[]` (heading) or `$responsive_css` (text).
- **Shared stylesheet** `assets/css/inline-formats.css`, registered as handle `sgs-inline-formats` in `includes/class-sgs-blocks.php` on `init` and added to heading's and text's block.json `"style"`, which is a string today (`"file:./style-index.css"`): convert it to an array `["sgs-inline-formats", "file:./style-index.css"]` (precedent: `product-card/block.json`), so it loads in the canvas and on the frontend only where those blocks are.
- **Registration**: new `src/blocks/extensions/inline-formats/index.js` (both formats and a guard: each format's `edit` returns null unless the selected block is sgs/heading or sgs/text), `src/blocks/extensions/inline-formats/inline-photo-popover.js`, imported by `src/blocks/extensions/index.js` (a webpack entry enqueued by `includes/class-sgs-blocks.php::enqueue_editor_extensions`). Add `sgs/highlight` and `sgs/inline-photo` to both blocks' `allowedFormats`. Canvas preview `src/utils/inline-formats-preview.js` (builds the scoped `<style>` from named attributes and `sgsBorderPreview`; precedent `heading/edit.js::linkPreviewCss` + `utils/tokens.js::linkColourPreviewCss`).
- **G7 format** `sgs/highlight`: `tagName:'span'`, `className:'sgs-highlight'`, no attributes; saved `<span class="sgs-highlight">most</span>` (a span, not `<mark>`: the stripe is decoration and `<mark>` means relevance). Attributes on heading and text: `highlightColour` string `''` (falls back to the `accent` token), `highlightThickness` string `'0.2em'`, `highlightLift` string `'0.02em'`, `highlightOverhang` number `4` (percent), `highlightTilt` number `0` (degrees). UI: toolbar button "Highlight" (`RichTextToolbarButton` + `toggleFormat`); a "Highlight" row in the block's `SgsColourPanel` (`fillRow`); panel "Highlight shape" shown when the content contains `sgs-highlight`: "Thickness" (help "How tall the stripe is."), "Lift" ("How far the stripe sits above the bottom of the letters."), "Overhang" ("How far the stripe reaches past each end of the words."), "Tilt" ("Angle the stripe for a hand-drawn look."); a notice when a highlight covers more than 3 words: "Best on one to three words: a highlight never breaks across lines." Root custom properties `--sgs-highlight-colour|thickness|lift|overhang|tilt`. Shared CSS: `.sgs-highlight{position:relative;isolation:isolate;white-space:nowrap}` `.sgs-highlight::before{content:"";position:absolute;inset-inline:calc(var(--sgs-highlight-overhang,4%)*-1);bottom:var(--sgs-highlight-lift,.02em);block-size:var(--sgs-highlight-thickness,.2em);background:var(--sgs-highlight-colour,var(--wp--preset--color--accent));border-radius:999px;z-index:-1;transform:rotate(var(--sgs-highlight-tilt,0deg))}` `@media (forced-colors:active){.sgs-highlight{text-decoration:underline}}`. With a gradient text colour the stripe would cover the letters' bottom: show an editor notice, no fix in this phase.
- **G8 format** `sgs/inline-photo`: `object:true`, `tagName:'img'`, `className:'sgs-inline-photo'`, `attributes:{className:'class', url:'src', alt:'alt'}`; saved `<img class="sgs-inline-photo wp-image-123" src="…-300x200.jpg" alt="">` (`wp-image-N` survives; `wp_filter_content_tags` adds srcset, sizes, width, height, never style). Attributes on heading and text: `inlinePhotoWidth` string `'1.55em'`, `inlinePhotoHeight` string `'0.78em'`, `inlinePhotoTilt` number `0`, `inlinePhotoBorderWidth` box object (default 0), `inlinePhotoBorderStyle` string `'solid'`, `inlinePhotoBorderColour` string `''` (falls back to `currentColor`), `inlinePhotoBorderRadius` string `'999px'`. UI: toolbar button "Inline photo" opens `MediaUpload` (images only) and inserts the `medium` size with `insertObject`; a popover on the photo: toggle "Decorative photo" (on by default, help "The words already say it all, so screen readers skip the photo."), "Describe the photo" (alt; required when the toggle is off; help "Read aloud as part of the heading, so keep it short."), buttons "Replace" and "Remove"; Styles panel "Inline photo" shown when the content contains `sgs-inline-photo`: Width, Height, Tilt, and `SgsBorderControl` with `widthValues={ attributes.inlinePhotoBorderWidth }`, `styleValue`, `colourValue`, `radiusValues` read from `inlinePhotoBorderStyle|Colour|Radius`, and `onWidthChange` / `onStyleChange` / `onColourChange` / `onRadiusChange` writing those four attributes (the component has no prefix prop). Border CSS: `$sel = "$root_sel .sgs-inline-photo"; $d = sgs_border_element_decls( $attributes, 'inlinePhoto', $sel );` then `$css = $sel . '{' . implode( ';', $d['base'] ) . '}'`, then the `tablet` and `mobile` arrays wrapped in their tier media queries exactly as `includes/helpers-border-style.php::sgs_border_element_decls`'s docblock and an existing caller show, then `$d['hover']` through `sgs_hover_state_rules`, then each entry of `$d['rules']` verbatim (the helper returns declaration arrays and the caller places them; `radius` is on by default). Shared CSS: `.sgs-inline-photo{display:inline-block;vertical-align:middle;inline-size:var(--sgs-inline-photo-w,1.55em);block-size:var(--sgs-inline-photo-h,.78em);object-fit:cover;margin:0 .06em;transform:rotate(var(--sgs-inline-photo-tilt,0deg));box-sizing:border-box}`. block.json note: `imageControls` not opted in, the photo carries its own size controls.
- **sgs/label** gets neither format now (12 to 14px text); only the kses swap.
- **Route** (`scripts/computed-route/lint.mjs`): refuse a tree whose `content` or `text` string contains `style=`; test in `scripts/computed-route/tests/lint.test.mjs`. The route's writer and detector for these two draft shapes are a later Spec 48 step (record it in the coverage plan).
- **Tests**: `tests/php/InlineFormatsTest.php` (calls the helpers directly: the render harness runs in its own process): `sgs_rich_text_kses('<span class="sgs-highlight" style="color:red">m</span>')` has no `style=`; `sgs_inline_formats_css(['highlightColour'=>'accent'], '.x', '<span class="sgs-highlight">m</span>')` contains `--sgs-highlight-colour:var(--wp--preset--color--accent)`; HTML without the class → `''`; a harness render of sgs/heading with both formats has no ` style=` outside its `<style>`. `tests/js/inline-formats.test.js`: `toHTMLString(create({html}))` returns the photo markup unchanged; applying the highlight gives `<span class="sgs-highlight">`.
- **Live**: a new canary test page built with `scripts/wp-build-page.js` (never a motion fixture): at 375/768/1440 the stripe's `::before` height is 0.2 × font size and wider than the word by twice the overhang, its colour matches; the photo is 1.55em × 0.78em (±1px), `border-top-width:3px`, a rotate transform, `naturalWidth>0`; `document.querySelectorAll('.wp-block-sgs-heading [style]').length === 0`; `scrollWidth === innerWidth` at 375; the same in the editor canvas iframe; a cropped screenshot pair against the draft H1.

### G11: a link underline in its own colour (shared link underline helper, Spec 32 FR-32-24)

Draft: `sites/mamas-munches-redesign/handoff/SiteFooter.dc.html` (grep `text-decoration-color`): footer links have no underline at rest; on hover a plain 2px underline, 4px below, cream `#FFFAF0`, while the text stays dark `#3A2A22`.

- **Attributes** per link prefix: `{prefix}LinkUnderlineColour` string `""`, `{prefix}LinkUnderlineColourHover` string `""`, `{prefix}LinkUnderlineOffset` string `""` (CSS length); widen `{prefix}LinkUnderline` enum to `["","none","always","hover","sweep"]`.
- **Control** (`src/components/LinkUnderlineControl.js`, gains `colour`, `colourHover`, `offset` and their `on*Change`): new option "Shows on hover" (help "An underline appears when the link is hovered or focused with the keyboard."); "Underline colour" `DesignTokenPicker` with states Normal and Hover, `linked:true`, shown for Always, Shows on hover and Sweep; "Underline gap" `SgsLengthControl` px, placeholder "Default", help "Space between the text and its underline.", shown for Always and Shows on hover.
- **Render** (`includes/helpers-link-underline.php::sgs_link_underline_css`; L = `{sel} a`, C colour, CH hover colour, T thickness, O offset; colours through `sgs_colour_value`): always → `L{text-decoration-line:underline;[text-decoration-thickness:T;][text-decoration-color:C;][text-underline-offset:O;]}` + `sgs_hover_state_rules(L,'text-decoration-color:CH')`; hover → `L{text-decoration-line:none;[thickness][color:C][offset]}` + `sgs_hover_state_rules(L,'text-decoration-line:underline[;text-decoration-color:CH]')` + the forced-colours rule (longhands only: the shorthand resets colour and thickness); sweep → the gradient becomes `linear-gradient(X,X)` with X = C or `currentColor`, the hover rule adds `background-image:linear-gradient(CH,CH)` when CH is set; offset does not apply to sweep.
- **Canvas twin**: `src/utils/link-underline.js::linkUnderlinePreviewCss` takes `{colour, colourHover, offset}` and mirrors the rules with plain `:hover` and `colourVar`.
- **Reach** (hand-declared on 11 prefixes in 10 blocks: business-info, collapsible-text, heading, icon-list, label, text `''`, product-card `desc`, quote `attribution`, testimonial `quote` and `''`, timeline `description`): more than 3 blocks, so first build `scripts/survey-link-underline-family.js` with `--survey/--fix/--check/--self-test` (per migration-method), checking every block declares all siblings, every `<LinkUnderlineControl>` and `linkUnderlinePreviewCss(` call passes the new props by name (`check-editor-render-parity` CHECK A needs names), and the 33 `scripts/attr-classification-overrides.json` rows exist. Registries: `scripts/check-dead-controls.js` (`sgs_link_underline_css` list), `scripts/data/property-suffixes.json` (`LinkUnderlineColour` → `text-decoration-color`, `LinkUnderlineOffset` → `text-underline-offset`), `cluster-member-sets.json`, `setting-registry.json`, `tests/js/__snapshots__/configurator-schema-compat.test.js.snap`.
- **Tests**: extend `tests/php/LinkUnderlineTest.php`: `linkUnderline:'hover'`, thickness `2px`, offset `4px`, colour `#FFFAF0` → `/ a\{text-decoration-line:none;text-decoration-thickness:2px;text-decoration-color:#FFFAF0;text-underline-offset:4px;\}/` and a guarded `a:hover{text-decoration-line:underline`; negative control: no colour → no `text-decoration-color`. New `tests/js/link-underline.test.js`.
- **Live**: `sgs/icon-list` links: `textDecorationLine`, `textDecorationColor`, `textUnderlineOffset`, `textDecorationThickness` at rest and under a real pointer hover at 375/768/1440.

### G12: one line of text cut with an ellipsis (shared typography, Spec 32 FR-32-25)

Draft: `sites/mamas-munches-redesign/handoff/Product.dc.html` (grep `text-overflow`): the sticky bar subtitle, mobile only.

- **Attribute** per typography prefix: `{prefix}TextLines` object default `{}` (desktop/tablet/mobile integers 0 to 10; unset = not set; 0 = show everything again at that size and smaller).
- **Control** (`TypographyControls`, opt-in `showTextLines`): label "Cut long text", field "Lines shown" (`NumberControl` 0 to 10, follows the device toggle), help "Longer text ends in '…'. Leave empty to show it all; 0 shows it all again on this screen size. Screen readers still read the full text, so only cut text that isn't essential."
- **Render**: private `helpers-typography.php::sgs_typography_lines_decls( int $n ): string`, printed per tier (base, then `@media (max-width:1023px)`, then `(max-width:767px)`, per `helpers-responsive.php`'s order): n=1 → `white-space:nowrap;overflow:hidden;text-overflow:ellipsis;` (keeps `display`); n≥2 → `display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:N;line-clamp:N;overflow:hidden;white-space:normal;`; n=0 → `white-space:normal;-webkit-line-clamp:none;line-clamp:none;overflow:visible;text-overflow:clip;`.
- **Canvas twin**: `typographyPreviewStyle` resolves the tier and sets `whiteSpace`, `overflow`, `textOverflow`, `display:'-webkit-box'`, `WebkitBoxOrient`, `WebkitLineClamp`.
- **Reach**: `showTextLines` in `SUFFIX_SHAPES`, same rollout as G2; `property-suffixes.json` row `TextLines` → `-webkit-line-clamp` (typography).
- **Tests**: `tests/php/TypographyTextLinesTest.php`: `{desktop:2,mobile:1}` → base `-webkit-line-clamp:2;line-clamp:2` and `@media (max-width:767px){…white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`; `{desktop:2,tablet:0}` → the tablet rule has `line-clamp:none`; negative control: unset → no `clamp`. Extend the JS twin test.
- **Live**: `sgs/text` with long copy: `webkitLineClamp`, `textOverflow`, `whiteSpace`, and `scrollHeight > clientHeight` at 375/768/1440.

## Builder brief (shared by every dispatched step)

Every builder prompt below starts with this block; paste it verbatim above the step's own lines.

> You are building part of the SGS WordPress block framework in the shared worktree `C:\Users\Bean\Projects\small-giants-wp` (other sessions work in it too). Read `CLAUDE.md`, `plugins/sgs-blocks/CLAUDE.md`, `.claude/rules/block-authoring.md`, `.claude/rules/colour-emission.md`, then this plan file `.claude/plans/2026-10-19-control-gaps-build.md`: its "Orchestration" table and the Design section named below, which is your exact specification (attribute names, labels, help text, selectors, tests). Rules: (1) edit only the files the Orchestration table and your step give your builder; if you need a change elsewhere (a shared registry such as `scripts/consistency/*.json`, `scripts/attr-classification-overrides.json`, `scripts/data/property-suffixes.json`, `scripts/check-dead-controls.js`, `includes/render-helpers.php`), do not make it: list it in your report with the exact lines; (2) never run `npm run build`, never deploy, never commit, never `git stash`, never `git add`; (3) write the MUST FAIL test first, run it and record the red output, then build, then record it green; then mutate one load-bearing line of your implementation, confirm the test goes red, and restore it; (4) run PHP tests from PowerShell: `cd plugins/sgs-blocks; vendor/bin/phpunit --filter <TestName>`; JS tests: `cd plugins/sgs-blocks; npx wp-scripts test-unit-js <path>`; (5) never put code containing backslashes or regexes through shell heredocs or `node -e`: use your file-writing tool; (6) no inline `style=""` from any block (`node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` must exit 0); UK English in names, labels, help and comments; comments describe current behaviour only; cite code by symbol, never by line; (7) if the design is wrong or impossible against the real code, stop that item and report the evidence (file::symbol and what you saw); never improvise a different design. Report: every file changed, the red and green test output, the mutation result, registry edits needed, and any deviation with its evidence.

## Steps

```text
Step 0 — Pre-flight
  Model:       inline
  Action:      `git pull --ff-only origin main` (works on the shared dirty tree; never stash); in the main session (these are its tools, not a subagent's) `ListAgents`, then `SendMessage` each local peer, including the Indus review session that deploys to indus-test: "Control gaps build starting: I will run npm run build (reseeds the framework DB) at three wave gates and deploy once to sandybrown at the end; tell me if you are mid-deploy or mid-reseed." Read this plan's Orchestration and Builder brief.
  Files:       none
  Inputs:      this plan
  Outcome:     peers know; the tree is current
  Exec:        SEQUENTIAL
  Deps:        none
  Marker:      SESSION-START
  Time:        5
  Tooling:     git, ListAgents, SendMessage
  On-Fail:     a peer mid-deploy: start wave 1 anyway (builders do not build); hold the wave 1 gate's build until the peer finishes
  Cold-Entry:  this plan; `.claude/reports/2026-10-19-css-equivalence-audit.md` "Real control gaps"; `.claude/LEDGER.md`
  Test:
    Happy:       pull clean, peers acknowledged
    Edge:        no peers listed: proceed
    Fail:        pull conflict: resolve by reading both sides, never stash
    Integration: standalone
```

```text
Step 1 — B1: G1 sticky column below the header
  Model:       sonnet
  Action:      dispatch the Builder brief + this step's Prompt line
  Files:       Orchestration B1
  Inputs:      Design G1
  Outcome:     `ContainerPinBelowHeaderTest` and `container-pin-preview.test.js` green, red under mutation
  Exec:        PARALLEL with steps 2, 3
  Deps:        step 0
  Marker:      (none)
  Time:        20
  Tooling:     /sgs-wp-engine, phpunit, wp-scripts test-unit-js
  On-Fail:     main thread reads the report's evidence, corrects the design in this plan, re-dispatches
  Prompt:      "Your builder: B1. Build Design G1 (sgs/container pin below the site header). Files you own, under plugins/sgs-blocks/: src/blocks/container/block.json, src/blocks/container/components/PinEdgeControl.js, src/blocks/container/edit.js, src/blocks/container/pin-edge-preview.js (new), includes/container-pin-edge-css.php, tests/php/ContainerPinBelowHeaderTest.php (new), tests/js/container-pin-preview.test.js (new)."
  Test:
    Happy:       pin top + toggle on + 36px → `top:calc(var(--sgs-header-height,0px) + 36px)` inside the tier media wrapper
    Edge:        tablet inherits desktop's "on"; mobile pin bottom → no offset at mobile
    Fail:        toggle on with pin none → no offset rule
    Integration: a container inside sgs/nav-drawer keeps `top:0` (the `:not(dialog *)` guard)
```

```text
Step 2 — B2: G6 phone add-to-basket bar
  Model:       sonnet
  Action:      dispatch the Builder brief + this step's Prompt line
  Files:       Orchestration B2
  Inputs:      Design G6
  Outcome:     `BuyboxStickyBarTest` and `buybox-sticky-bar.test.js` green, red under mutation
  Exec:        PARALLEL with steps 1, 3
  Deps:        step 0
  Marker:      (none)
  Time:        35
  Tooling:     /sgs-wp-engine, /wp-interactivity-api, phpunit, wp-scripts test-unit-js
  On-Fail:     as step 1
  Prompt:      "Your builder: B2. Build Design G6 (sgs/buybox phone add-to-basket bar). Files you own, under plugins/sgs-blocks/: src/blocks/buybox/block.json, render.php, extras.php, sticky-bar.js (new), style.css, inspector-extra.js, canvas-mock.js; src/blocks/whatsapp-cta/style.css; tests/php/BuyboxStickyBarTest.php (new); tests/js/buybox-sticky-bar.test.js (new). Use `var(--wp--custom--z-index--sticky-bar,150)`; nobody adds a theme.json entry."
  Test:
    Happy:       the add control scrolls above the viewport at 375 → bar `is-on`; a click submits the cart form once
    Edge:        variable product with no variation → the click scrolls to the picker, no submit
    Fail:        no JS → `hidden` stays, nothing renders
    Integration: the WhatsApp floating button sits above the bar (`--sgs-sticky-bar-h`)
```

```text
Step 3 — B3: G4, G9, G3, G10 theme and form
  Model:       sonnet
  Action:      dispatch the Builder brief + this step's Prompt line
  Files:       Orchestration B3
  Inputs:      Designs G3, G4, G9, G10
  Outcome:     `scrollbar-contract`, `font-smoothing`, `form-file-wrap` JS tests and `FormFieldTilesDescriptionTest` green, red under mutation; `check-snapshot-scrollbar-tokens.py --self-test` passes with its 1.6:1 negative control
  Exec:        PARALLEL with steps 1, 2
  Deps:        step 0
  Marker:      (none)
  Time:        45
  Tooling:     /sgs-wp-engine, phpunit, wp-scripts test-unit-js, python
  On-Fail:     as step 1
  Prompt:      "Your builder: B3. Build Designs G4, G9, G3, G10 in that order. Files you own: theme/sgs-theme/assets/css/core-blocks-critical.css, theme/sgs-theme/assets/css/scrollbars.css (new), theme/sgs-theme/functions.php, theme/sgs-theme/theme.json, theme/sgs-theme/assets/css/woocommerce.css; under plugins/sgs-blocks/: src/blocks/nav-drawer/style.css and render.php, src/blocks/google-reviews/render.php and render-styles.php, src/blocks/form/style.css, src/blocks/form-field-tiles/block.json, render.php, edit.js, scripts/snapshot_scrollbar_tokens.py (new), scripts/check-snapshot-scrollbar-tokens.py (new), scripts/push-theme-snapshot.py, and the new tests the designs name; and sites/indus-foods/theme-snapshot.json. Do not push any snapshot."
  Test:
    Happy:       the root `scrollbar-color` resolves to primary; the drawer's webkit thumb is intact in Chrome
    Edge:        a block with `scrollbar-width:none` stays hidden; google-reviews with an empty colour keeps the native bar
    Fail:        a snapshot thumb at 1.6:1 → the gate refuses
    Integration: a 120-character file name wraps in the preview and on the review step
```

```text
QA Gate — Wave 1
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    steps 1–3 must be complete
  Check:   read each builder's full diff (`git diff -- <owned paths>`) and apply their reported registry edits; then in PowerShell `cd plugins/sgs-blocks; vendor/bin/phpunit --filter "ContainerPinBelowHeaderTest|BuyboxStickyBarTest|FormFieldTilesDescriptionTest"; npx wp-scripts test-unit-js tests/js/container-pin-preview.test.js tests/js/buybox-sticky-bar.test.js tests/js/scrollbar-contract.test.js tests/js/font-smoothing.test.js tests/js/form-file-wrap.test.js; npm run build; npm run gate:fast; node scripts/audit-inline-styling.js --check; python scripts/check-snapshot-scrollbar-tokens.py --self-test`
  Pass:    every command exits 0; commit G1, G6, G4, G3, then G9 with G10, following the Orchestration "Commits" rule
  Fail:    /systematic-debugging on the red item; fix inline if under 10 lines, else re-dispatch that builder with the evidence
  Marker:  QA
```

```text
Step 4 — B4: G5 ribbon tag (sgs/label)
  Model:       sonnet
  Action:      dispatch the Builder brief + this step's Prompt line
  Files:       Orchestration B4
  Inputs:      Design G5
  Outcome:     `LabelShapeTest` and `label-shape-preview.test.js` green, red under mutation
  Exec:        PARALLEL with step 5
  Deps:        QA Gate wave 1
  Marker:      (none)
  Time:        45
  Tooling:     /sgs-wp-engine, phpunit, wp-scripts test-unit-js
  On-Fail:     as step 1; if the SVG mask cannot be shown working in the test output, report before trying another technique
  Prompt:      "Your builder: B4. Build Design G5 (sgs/label shape presets and border; rotation is the existing Motion rest rotate, add nothing for it). Skip the label kses swap: the main thread does it after B5. Files you own, under plugins/sgs-blocks/: src/blocks/label/block.json, render.php, edit.js, ShapePanel.js (new), shape-preview.js (new), style.css; includes/helpers-shape-preset.php (new; report its require line for includes/render-helpers.php); src/utils/shape-preset.js (new); tests/php/LabelShapeTest.php (new); tests/js/label-shape-preview.test.js (new)."
  Test:
    Happy:       ribbon-right, notch 12, 2px border → the polygon with `88% 50%` and an edge span with the mask
    Edge:        notch 40 and notch 4 stay inside the box; ribbon-left mirrors ribbon-right
    Fail:        shape none, or border style none → no clip-path, no edge span
    Integration: a text gradient on the label still paints with a shape set
```

```text
Step 5 — B5: G7 highlight and G8 inline photo (rich-text formats)
  Model:       opus
  Action:      dispatch the Builder brief + this step's Prompt line
  Files:       Orchestration B5
  Inputs:      Designs G7, G8
  Outcome:     `InlineFormatsTest` and `inline-formats.test.js` green, red under mutation; the route's `lint.test.mjs` refuses `style=` inside text
  Exec:        PARALLEL with step 4
  Deps:        QA Gate wave 1
  Marker:      (none)
  Time:        90
  Tooling:     /sgs-wp-engine, /wp-hooks, /wp-block-development, phpunit, wp-scripts test-unit-js, node --test
  On-Fail:     as step 1
  Prompt:      "Your builder: B5. Build Designs G7 and G8 (shared inline formats on sgs/heading and sgs/text). Files you own, under plugins/sgs-blocks/: src/blocks/heading/block.json, edit.js, render.php; src/blocks/text/block.json, edit.js, render.php; src/blocks/extensions/inline-formats/index.js and inline-photo-popover.js (new); src/blocks/extensions/index.js; src/utils/inline-formats-preview.js (new); includes/helpers-inline-formats.php (new; report its require line for includes/render-helpers.php); includes/class-sgs-blocks.php; assets/css/inline-formats.css (new); tests/php/InlineFormatsTest.php (new); tests/js/inline-formats.test.js (new); and at the repo root scripts/computed-route/lint.mjs and scripts/computed-route/tests/lint.test.mjs (then run `cd scripts/computed-route && node --test tests/*.test.mjs && node lint.mjs && node capabilities.mjs --gate`; lint.mjs needs the README to list any new test). Do not touch sgs/label."
  Test:
    Happy:       a highlight and a photo in one heading render with class-only markup and the scoped custom properties
    Edge:        content with neither class → no inline-formats CSS; a highlight over 3 words shows the editor notice
    Fail:        pasted `<span style="color:red">` → `style` stripped at render
    Integration: `wp_filter_content_tags` adds srcset to the photo; the editor round trip keeps `wp-image-N`
```

```text
QA Gate — Wave 2
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    steps 4–5 must be complete
  Check:   read both diffs in full; apply the registry edits and both `render-helpers.php` require lines; swap `wp_kses_post` for `sgs_rich_text_kses` in `src/blocks/label/render.php`; then in PowerShell `cd plugins/sgs-blocks; vendor/bin/phpunit --filter "LabelShapeTest|InlineFormatsTest|LabelDotTest"; npx wp-scripts test-unit-js tests/js/label-shape-preview.test.js tests/js/inline-formats.test.js; npm run build; npm run gate:fast; node scripts/audit-inline-styling.js --check`; and `cd scripts/computed-route && node --test tests/*.test.mjs && node lint.mjs && node capabilities.mjs --gate`
  Pass:    all exit 0; commit G5, then G7 with G8 (one shared mechanism), following the Orchestration "Commits" rule
  Fail:    as wave 1
  Marker:  QA
```

```text
Step 6 — B6: G11 link underline colour, gap and hover mode
  Model:       sonnet
  Action:      dispatch the Builder brief + this step's Prompt line
  Files:       Orchestration B6, plus the registries Design G11 names (wave 3 runs alone)
  Inputs:      Design G11
  Outcome:     `survey-link-underline-family.js --check` and `--self-test` exit 0; `LinkUnderlineTest` and `link-underline.test.js` green, red under mutation
  Exec:        SEQUENTIAL
  Deps:        QA Gate wave 2
  Marker:      (none)
  Time:        30
  Tooling:     /migration-method, /sgs-wp-engine, phpunit, wp-scripts test-unit-js
  On-Fail:     as step 1
  Prompt:      "Your builder: B6. Build Design G11. Wave 3 runs alone, so you may edit the shared registries Design G11 names. Follow .claude/skills/migration-method/SKILL.md: build scripts/survey-link-underline-family.js (under plugins/sgs-blocks/; --survey, --fix, --check, --self-test) first, run --survey and paste its output, then --fix, then hand-finish what the fixer cannot, then --check. The 10 blocks are business-info, collapsible-text, heading, icon-list, label, text, product-card, quote, testimonial, timeline."
  Test:
    Happy:       hover mode, 2px, 4px, #FFFAF0 → the exact rest rule and a guarded hover underline
    Edge:        sweep with a colour → the gradient uses it; the gap is ignored for sweep
    Fail:        no colour set → no `text-decoration-color` printed
    Integration: all 11 prefixes pass the new props by name (`check-editor-render-parity` green)
```

```text
Step 7 — B7: G2 outlined lettering and G12 cut to N lines (shared typography rollout)
  Model:       sonnet
  Action:      dispatch the Builder brief + this step's Prompt line
  Files:       Orchestration B7, plus the registries Designs G2 and G12 name
  Inputs:      Designs G2, G12; step 6 committed by the main thread
  Outcome:     `TypographyTextStrokeTest`, `TypographyTextLinesTest`, `typography-preview.test.js` green, red under mutation; `node scripts/audit-typography-attr-declarations.js --check` and `--self-test` exit 0 after `--fix --apply`
  Exec:        SEQUENTIAL
  Deps:        step 6
  Marker:      (none)
  Time:        40
  Tooling:     /migration-method, /sgs-wp-engine, phpunit, wp-scripts test-unit-js
  On-Fail:     as step 1; if the opt-in fixer touches anything besides adding the two props, revert its output by hand and report
  Prompt:      "Your builder: B7. Build Designs G2 and G12 in includes/helpers-typography.php, src/components/TypographyControls.js, src/utils/typography-preview.js and scripts/audit-typography-attr-declarations.js::SUFFIX_SHAPES (all under plugins/sgs-blocks/), with their tests. Then build scripts/survey-typography-opt-in-props.js (Design G2 "Reach"; follow .claude/skills/migration-method/SKILL.md), run its --survey and paste the output, --fix, --check and --self-test; then `node scripts/audit-typography-attr-declarations.js --survey`, `--fix --apply`, `--check`. Wave 3 runs alone, so you may edit the shared registries the designs name and every block.json and edit.js the codemod and generator touch. Report the number of targets and blocks changed."
  Test:
    Happy:       2px desktop and 1.5px mobile stroke; `{desktop:2,mobile:1}` lines → clamp, then ellipsis on mobile
    Edge:        lines 0 at tablet undoes desktop's clamp; a stroke with no colour uses the text colour
    Fail:        nothing set → no `text-stroke`, no `clamp`
    Integration: every rolled-out block's inspector shows both fields (`check-dead-controls` green)
```

```text
QA Gate — Wave 3
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    steps 6–7 must be complete
  Check:   read both diffs (B7: the helper, control and twin in full, and 5 sampled generated block.json changes); in PowerShell `cd plugins/sgs-blocks; vendor/bin/phpunit --filter "LinkUnderline|TypographyTextStroke|TypographyTextLines"; npx wp-scripts test-unit-js tests/js/link-underline.test.js tests/js/typography-preview.test.js; npm run build; npm run gate:full; node scripts/audit-inline-styling.js --check`; and from the repo root `python scripts/check-no-client-names.py --check`
  Pass:    all exit 0; commit G11 (after step 6, before step 7 starts), then G2 with G12, following the Orchestration "Commits" rule
  Fail:    as wave 1
  Marker:  QA
```

```text
Step 8 — Deploy to the canary
  Model:       inline
  Action:      message peers first; `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` (motion QA tier none: no motion change). Push the Indus snapshot (`python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client indus-foods --target indus-test`) only after the Indus review session says go.
  Files:       none
  Inputs:      waves 1 to 3 pushed
  Outcome:     the deploy passes every gate and its verify stage
  Exec:        SEQUENTIAL
  Deps:        QA Gate wave 3
  Marker:      (none)
  Time:        15
  Tooling:     /wp-sgs-deploy, build-deploy.py
  On-Fail:     /systematic-debugging on the failing gate; never `--allow-dirty` or `--skip-verify`
  Test:
    Happy:       deploy exit 0, stage timings printed
    Edge:        a peer's commit enters the deploy: read its subject, confirm it is green
    Fail:        a gate red on another session's work: stop and message that session
    Integration: the canary serves the new build (a live probe of one new rule, not only the checksum)
```

```text
Step 9 — Batched live check
  Model:       inline
  Action:      /qc: build test pages with `scripts/wp-build-page.js` from JSON trees saved under `.claude/qa/control-gaps/` (never a motion fixture page); run every Design's "Live" check at 375, 768 and 1440 in headed Chrome (channel chrome), plus the editor canvas for G2, G5, G7, G8, G10, G11, G12; cropped screenshot pairs against the draft for G5, G7, G8; show Bean the pairs (FP-13). Delete the test pages in the same command that finishes with them.
  Files:       `.claude/qa/control-gaps/*.json`
  Inputs:      step 8
  Outcome:     every Live check passes and Bean has seen the pairs
  Exec:        SEQUENTIAL
  Deps:        step 8
  Marker:      QA
  Time:        40
  Tooling:     /qc, Playwright, wp-build-page.js
  On-Fail:     /systematic-debugging per failing gap; fix all, then rebuild and redeploy once
  Test:
    Happy:       all 12 Live checks pass
    Edge:        no test page overflows horizontally at 375
    Fail:        values match but Bean sees a difference: run the extended measurement set (`~/.claude/rules/measurement-vs-eye.md`) before arguing
    Integration: the editor canvas matches the frontend for every control
```

```text
Step 10 — Docs to current truth
  Model:       inline
  Action:      in each owning spec, change the FR's `Status: not built` line (added 2026-10-19) to `Status: built` with the commit and the proving command: Spec 02 FR-2-1 (G1), FR-2-2 (G5), FR-2-3 (G6), FR-2-4 (G7), FR-2-5 (G8); Spec 32 FR-32-23 (G2), FR-32-24 (G11), FR-32-25 (G12), FR-32-26 (G3); Spec 01 FR-1-1 (G4); Spec 04 FR-4-1 (G9), FR-4-2 (G10). Put the FR IDs in the audit's "Real control gaps" table; add a `scrollbar` row to Spec 32 §14.3's `settings.custom` key table (consumer `theme/sgs-theme/assets/css/scrollbars.css`, gate `plugins/sgs-blocks/scripts/check-snapshot-scrollbar-tokens.py`); update the touched blocks' CLAUDE.md files; `.claude/plans/2026-10-11-spec48-indus-build.md` (the timeline years' outline colour follows the current card: a Current state owned by the pinned timeline build); `.claude/plans/2026-10-12-clone-coverage-foundation.md` (the route's writer and detector for the highlight and inline-photo shapes and every new attribute); `.claude/LEDGER.md`. Run /writing-clearly-and-concisely over the new help texts.
  Files:       the specs, plans, LEDGER and CLAUDE.md files named
  Inputs:      steps 1 to 9
  Outcome:     `python plugins/sgs-blocks/scripts/lints/lint-spec-drift.py` (no new gating finding) and `python scripts/check-md-wrap.py --check <each file>` exit 0
  Exec:        SEQUENTIAL
  Deps:        step 9
  Marker:      (none)
  Time:        20
  Tooling:     /writing-clearly-and-concisely, lint-spec-drift.py
  On-Fail:     fix the flagged lines
  Test:
    Happy:       every FR has a Status line and a command
    Edge:        the first numbered FRs in Specs 01, 02 and 04 follow FR-{spec_id}-{N}
    Fail:        a stale "label has no border feature" or similar sentence remains: grep and replace
    Integration: `python .claude/hooks/handoff-preflight.py --check` exits 0
```

```text
Step 11 — Close
  Model:       inline
  Action:      /qc-council on the session's commits (three Sonnet raters by angle, verify every finding before fixing), fix or record, then /handoff
  Files:       as findings require
  Inputs:      all commits
  Outcome:     findings fixed or recorded; the next-session prompt written
  Exec:        SEQUENTIAL
  Deps:        step 10
  Marker:      HANDOFF
  Time:        30
  Tooling:     /qc-council, /handoff
  On-Fail:     record unfixed findings in this plan's Parking lot
  Test:
    Happy:       council findings closed
    Edge:        a finding on another session's code: message that session
    Fail:        a finding disputes a design decision: put it to Bean with options
    Integration: the handoff preflight is green
```

## Estimate

Waves 1 and 2 overlap with main-thread review: about 2 hours to the end of wave 2, 1 hour for wave 3, 1 hour for deploy, live check and docs, 30 minutes to close. About 4.5 hours.

## Key Judgement Calls

### Primary decisions (surfaced during planning)

- **Decision:** roll the outline and line-cut settings out to every typography target that has the full set (~120 targets, 44 blocks), or only to the prefixes the drafts use.
  - **Options:** all full-set targets / draft prefixes only
  - **Recommendation:** all full-set targets
  - **Why:** FP-9 (universal mechanisms); the cost is block.json size, not behaviour; a later client would otherwise hit the same gap per block.
  - **Cost of wrong choice:** draft-only → the next client's outlined text is a new gap; all → larger block.json files.
  - **Who decides:** architect (decided)
- **Decision:** when the phone bar appears.
  - **Options:** only once the Add button has scrolled above the screen / whenever the Add button is off screen (the draft)
  - **Recommendation:** above the screen only
  - **Why:** the draft's rule also shows the bar before the visitor reaches the Add button, duplicating it near the page top.
  - **Cost of wrong choice:** a cosmetic difference from the draft on long product pages.
  - **Who decides:** architect (decided; Bean can flip it at step 9)
- **Decision:** how the ribbon tag's outline follows the V-cut.
  - **Options:** an SVG-mask ring layer clipped to the shape / an inset clip polygon / an SVG background with a baked colour
  - **Recommendation:** the SVG-mask ring
  - **Why:** an even line along the diagonals and palette colours or gradients from CSS; the inset polygon thins the diagonals; a baked SVG loses palette slugs.
  - **Cost of wrong choice:** an uneven or missing outline in one engine; the fallback is fill-only there.
  - **Who decides:** architect (decided)
- **Decision:** the site-wide scrollbar default.
  - **Options:** brand primary thumb with the page scrollbar included / a neutral grey / the browser default unless the snapshot sets one
  - **Recommendation:** brand primary, page included, width left at auto
  - **Why:** Bean asked for scrollbars linked to the brand presets across the whole site; primary measures 4.84:1 on the default surface.
  - **Cost of wrong choice:** a client whose primary is pale gets a weak thumb: the snapshot gate refuses under 3:1.
  - **Who decides:** Bean (asked for it)

### Pre-emptive decisions (Hidden Decisions pass)

Two cold reviewers (Sonnet builder lens, Haiku junior lens, 2026-10-19) read the plan and checked its citations; their findings are answered in place above. The decisions they would have paused on:

- **Decision:** who edits the shared registries in waves 1 and 2.
  - **Flagged by:** sonnet-reviewer
  - **Recommendation:** builders return paste-ready fragments; the main thread applies them before the wave build (Orchestration).
  - **Why:** parallel builders on one 7,000-line JSON file collide.
- **Decision:** how to commit on a shared dirty tree without stash or rebase.
  - **Flagged by:** both
  - **Recommendation:** `pull --ff-only` before committing, push at once, merge pull if rejected (Orchestration "Commits").
  - **Why:** `git pull --rebase` refuses with other sessions' unstaged files (seen 2026-10-19).
- **Decision:** whether theme.json gets a z-index token for the bar.
  - **Flagged by:** both
  - **Recommendation:** no; use `var(--wp--custom--z-index--sticky-bar,150)` like whatsapp-cta.
  - **Why:** no z-index token is defined anywhere today.
- **Decision:** the tile description's opacity versus the draft.
  - **Flagged by:** haiku-reviewer
  - **Recommendation:** no opacity default; the route writes a lighter `tileDescriptionColour`.
  - **Why:** opacity lowers contrast unpredictably; a colour is measurable.
- **Decision:** two gaps sharing one file and one commit rule.
  - **Flagged by:** haiku-reviewer
  - **Recommendation:** G9 and G10 commit together (one `form/style.css`).
  - **Why:** no partial staging on a shared tree.
- **Decision:** a pre-check that finds something (an existing `min-width`, a label root without `--sgs-rot-rest`).
  - **Flagged by:** both
  - **Recommendation:** keep what exists, skip only the conflicting line, report it; for the rotation, report before building the shape.
  - **Why:** brief rule 7: never improvise a design.
- **Decision:** route test failures from another session's uncommitted files.
  - **Flagged by:** sonnet-reviewer
  - **Recommendation:** record the route test baseline before B5 starts; only new failures are B5's.
  - **Why:** peers edit `scripts/computed-route/` in the same tree.

## Parking lot

- The route's writer and detector for every new attribute and the two inline formats (Spec 48; recorded in the coverage plan at step 10).
- The Indus timeline years' outline colour follows the current card (a Current state), owned by the pinned timeline build.
