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
- [x] All 12 gaps below are built, each with its MUST FAIL test green and its negative control holding (2026-10-19, `4853fe370` to `13d04b31f`).
- [x] `cd plugins/sgs-blocks && npm run build` (PowerShell) passes, then `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` passes every gate and deploys (fast 183/183, full 12/12; sandybrown runs `96106abc1`).
- [ ] The batched live check (step 9) reads each gap's computed values at 375, 768 and 1440 on the canary and in the editor canvas, with cropped screenshot pairs for the visual ones (5, 7, 8, 13).
- [x] Each gap's FR in its owning spec reads `Status: built` with the command that proves it; `.claude/reports/2026-10-19-css-equivalence-audit.md` "Real control gaps" table points at the built FRs.

**Progress (2026-10-20):** Steps 0 to 11 are done. Every builder commit is on `main` and the build runs on sandybrown, indus-test and mamas-test, with the Indus and Mama's redesign snapshots pushed (Bean's go). Step 11's council (three raters: PHP renders and the sanitiser, editor controls and canvas twins, gates and detectors) found no exploitable fault; every confirmed finding is fixed (`147184977`). Step 9's live check (`.claude/qa/control-gaps/results-2026-10-20.md`) passed every Live line after three fixes it found (`677a58580`: the editor canvas lacked the inline-format sheet on a page using a format, a lazy `sizes="auto"` media image took Chrome's 1500px placeholder height, the footer painted over the add-to-basket bar). Bean's review of the cropped pairs against Mama's draft led to: the label end shape reworked to the draft's clip-path model (`16a535736`), Mama's three advisory palette colours confirmed, a cover-cropped image keeping the attachment's sizes hint (`sgs/media`), every inner scroller arrow-free (`afdc09cdb`), the button presets' pressed state and custom easing, and `@keyframes` in the Additional CSS box (`7ee561b4a`). Bean co-signed the faithful pairs on mamas-test (`.claude/qa/control-gaps/pairs/mt-*.png`). Session rulings that changed designs are in the Designs above. Follow-ups cleared (2026-10-20): the press roles and per-style timing reach the buybox add-to-cart, product-card's CTAs and whatsapp-cta (Spec 32 FR-32-19, `tests/php/CtaPressStateTest.php`); `plugins/sgs-blocks/scripts/hover-guard/check.js` runs and passes; `Product_Manifest::axis_key` and the v9 manifest cache key let a single-variant product add to the basket (G6, proved at 375 on the canary: cart 0 to 1 to 2); 349 of the 408 text-outline attributes route in the framework DB.

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

- The 12 FRs exist in their specs (Spec 01 FR-1-1, Spec 02 FR-2-1 to FR-2-6, Spec 04 FR-4-1 and FR-4-2, Spec 32 FR-32-23, FR-32-24 and FR-32-26); each reads `Status: built` with its commit, and states its live check open until Step 9 runs.
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

| Wave | Builder | Gaps | Files owned |
|---|---|---|---|
| 1 | B1 container | G1 | `src/blocks/container/*`, `includes/container-pin-edge-css.php` |
| 1 | B2 buybox | G6 (with the bar subtitle's one-line cut) | `src/blocks/buybox/*`, `src/blocks/whatsapp-cta/style.css` |
| 1 | B3 theme and form | G3, G4, G9, G10 | `theme/sgs-theme/*`, `src/blocks/nav-drawer/style.css` and `render.php`, `src/blocks/google-reviews/render.php` and `render-styles.php`, `src/blocks/form/style.css`, `src/blocks/form-field-tiles/*`, `src/blocks/choice-flow-question/*`, `scripts/snapshot_scrollbar_tokens.py`, `scripts/check-snapshot-scrollbar-tokens.py`, `scripts/push-theme-snapshot.py`, `sites/indus-foods/theme-snapshot.json` |
| 2 | B4 label | G5 | `src/blocks/label/*`, `includes/helpers-end-shape.php`, `src/utils/end-shape.js` |
| 2 | B5 inline formats (Opus) | G7, G8 | `src/components/DesignTokenPicker.js` (the `disableCustomColors` prop only), `src/utils/rich-text-formats.js`, `src/blocks/extensions/inline-formats/*`, `src/blocks/extensions/index.js`, `includes/helpers-inline-formats.php`, `includes/class-sgs-blocks.php`, `assets/css/inline-formats.css`, `src/blocks/heading/*`, `src/blocks/text/*`, `scripts/survey-rich-text-formats.js`, `scripts/data/rich-text-format-roles.json`, `scripts/snapshot_inline_format_tokens.py`, `scripts/check-snapshot-inline-format-tokens.py`, `scripts/computed-route/lint.mjs` and its test |
| 2 | B8 floating layer | G13 | `src/blocks/decorative-image/*` |
| 3 | B6 link underline | G11 | `includes/helpers-link-underline.php`, `src/components/LinkUnderlineControl.js`, `src/utils/link-underline.js`, the 10 link-underline blocks |
| 3 | B7 typography (after B6) | G2 | `includes/helpers-typography.php`, `src/components/TypographyControls.js`, `src/utils/typography-preview.js`, `scripts/audit-typography-attr-declarations.js`, `scripts/survey-typography-opt-in-props.js`, every block.json and edit.js its two fixers touch |
| all | Main thread only | registries and glue | `includes/render-helpers.php` (require lines: B4's, then B5's, with its header comment list), `scripts/consistency/*.json` (incl. `setting-registry.json`), `scripts/attr-classification-overrides.json`, `scripts/data/property-suffixes.json`, `scripts/check-dead-controls.js`, `push-theme-snapshot.py::roster_guard` lines for B5's tokens, the 9 `sites/*/theme-snapshot.json` token additions, and the rich-text rollout pass (B5's detector `--fix` over every other block, after the wave 2 gate, as its own commit) |

**Registry rows in waves 1 and 2**: every new attribute needs rows in the shared registries, and `npm run build` / `gate:fast` stay red until they exist. Each wave 1 and 2 builder returns a ready-to-paste fragment per registry file (exact JSON or JS lines and where they go); the main thread applies all fragments before the wave's build. Wave 3 builders edit the registries themselves.

**Commits**: one commit per gap, except G7 with G8 (one shared mechanism) and G9 with G10 (they share `src/blocks/form/style.css`); the rich-text rollout pass is its own commit. The tree is shared and dirty, so `git pull --rebase` refuses: run `git pull --ff-only origin main` before committing, commit by explicit pathspec with `git branch --show-current` in the same command, push at once; if the push is rejected, `git pull --no-rebase origin main` (a merge works on a dirty tree when no file overlaps) and push again. Never stash.

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
- **Reach**: add `showTextStroke` to `scripts/audit-typography-attr-declarations.js::SUFFIX_SHAPES`. The opt-in props are added by a detector, not a throwaway codemod (more than 3 blocks): new `scripts/survey-typography-opt-in-props.js` (under `plugins/sgs-blocks/`) with `--survey`, `--fix`, `--check`, `--self-test`, whose `--check` fails when a `<TypographyControls>` call passing `showTextWrap` lacks `showTextStroke` (127 call lines in 45 files on 2026-10-19; paste `--survey` as the baseline); run its `--fix`, then `node scripts/audit-typography-attr-declarations.js --fix --apply` for the block.json attributes (universal per FP-9). Registries: `scripts/check-dead-controls.js` (3 suffixes in the `sgs_typography_css_rule` list), `scripts/data/property-suffixes.json` (`TextStrokeWidth` → `-webkit-text-stroke-width` typography; `TextStrokeColour` → `-webkit-text-stroke-color` colour), `scripts/consistency/cluster-member-sets.json`, `.claude/rules/colour-emission.md` (text outline colour is owned by TypographyControls).
- **Tests**: `tests/php/TypographyTextStrokeTest.php`: `sgs/text` with `textStrokeWidth:{desktop:2,mobile:1.5}`, `textStrokeColour:'#0A7EA8'`, `textStrokeColourHover:'#D8CA50'` → base rule has `-webkit-text-stroke-width:2px` and `-webkit-text-stroke-color:#0A7EA8`; `@media (max-width:767px){…-webkit-text-stroke-width:1.5px`; the hover rule sits inside `@media (hover: hover)`; negative control: nothing set → no `text-stroke`. Extend `tests/js/typography-preview.test.js`.
- **Live**: `sgs/text` with opacity-0 colour: `getComputedStyle(el).webkitTextStrokeWidth` 2px at 1440 and 768, 1.5px at 375; `color` is `rgba(…, 0)`; hover with a real pointer changes the stroke colour.

### G3: branded scrollbars on every scroller (theme, Spec 32 FR-32-26)

Drafts: Indus drawer gold thumb (`Indus Foods Website v2.dc.html`, grep `data-drawer-scroll` and `scrollbar-color`); Mama's hides its bars.

- **Facts**: the nav drawer's 35% ink mix measures 2.13:1 on the default surface (inside the 2:1 floor below, with little margin); primary on surface is 4.84:1, accent on footer-bg 8.31:1. The thumb floor is **2:1** (Bean, 2026-10-19): a restyled scrollbar loses WCAG 1.4.11's user-agent exemption, which would ask 3:1, but the leading browsers' own default bars sit below that, and Bean uses WCAG to secure good UX, so the browsers' level is the benchmark. Do not raise it to 3:1. When `scrollbar-color` or `scrollbar-width` is not `auto`, Chrome 121+ ignores `::-webkit-scrollbar` parts on that element (CSS Scrollbars spec). Every `::-webkit-scrollbar{display:none}` in the codebase already pairs with `scrollbar-width:none` (count per file; the new test checks each pair). A `var()` inside `:root{scrollbar-color}` resolves at the root, so the rule goes on `:where(*)` for per-scope overrides to reach descendants.
- **Tokens**: snapshot keys `settings.custom.scrollbar.{thumb, thumbOnDark, track}` (the `settings.custom.focus` precedent); `theme/sgs-theme/theme.json` defaults `thumb` = `var(--wp--preset--color--primary)`, `thumbOnDark` = `var(--wp--preset--color--accent)`, `track` = `transparent`. CSS reads `--wp--custom--scrollbar--thumb`, `--thumb-on-dark`, `--track`; scopes override `--sgs-scrollbar-thumb` and `--sgs-scrollbar-track`. Each thumb must reach 2:1 against its ground, measured as the focus tokens are (Spec 32 §14.5; model the maths on `scripts/check-snapshot-focus-tokens.py`).
- **Control**: snapshot-only, like focus (a site-wide brand look); the per-instance control is the drawer's text colour. Help line for Spec 32: "Scrollbar colour comes from your theme snapshot (scrollbar.thumb). A block that needs its own sets `--sgs-scrollbar-thumb` in its scoped style."
- **CSS** (new `theme/sgs-theme/assets/css/scrollbars.css`): `:root,.sgs-on-light{--sgs-scrollbar-thumb:var(--wp--custom--scrollbar--thumb,var(--wp--preset--color--primary,#1f7a7a));--sgs-scrollbar-track:var(--wp--custom--scrollbar--track,transparent)}` `.sgs-on-dark{--sgs-scrollbar-thumb:var(--wp--custom--scrollbar--thumb-on-dark,var(--wp--preset--color--accent,#f59e0b))}` `:root,:where(*){scrollbar-color:var(--sgs-scrollbar-thumb) var(--sgs-scrollbar-track)}` `:where(.sgs-scrollbar-native,.sgs-scrollbar-native *){scrollbar-color:auto}`. Enqueued synchronously by `theme/sgs-theme/functions.php::enqueue_styles` (as `sgs-focus` is) and added to the editor by `functions.php::setup` with `add_editor_style( 'assets/css/scrollbars.css' )`. The page's own scrollbar is included (the root value propagates to the viewport). Width stays `auto` (no global `thin`).
- **Opt-outs**: class `sgs-scrollbar-native` on the shop filter sheet (`theme/sgs-theme/assets/css/woocommerce.css`, deliberately the browser's bar) and on sgs/google-reviews's scroller when its `scrollbarColour` is empty (the class goes on the element `src/blocks/google-reviews/render.php` prints; `scrollbarColour` itself is read in `render-styles.php`); hidden bars keep `scrollbar-width:none`.
- **Arrow buttons** (Bean, 2026-10-19): the page's own scrollbar keeps whatever the visitor's platform draws (step arrows on Windows' classic bars, none on Mac, iPhone and Android), only recoloured; every inner scroller (drawer, menus, sliders, cart, pop-ups, rails) is slim with no arrows: `:where(body *)::-webkit-scrollbar-button{display:none}` beside the token rules (Chromium and WebKit; Firefox draws no arrows). Verify on Windows Chrome at step 9: the page bar keeps its arrows, the drawer and a slider rail show none.
- **Pass look**: in Chrome the drawer thumb stays rounded with no arrow buttons and takes the token colour; the page scrollbar's thumb is the primary colour. Judged by the main thread from a headed screenshot, then shown to Bean at step 9.
- **Nav drawer** (`src/blocks/nav-drawer/style.css`): delete both 35% mixes (the thumb `background-color` and the `@supports not selector(::-webkit-scrollbar)` `scrollbar-color`) and rewrite the comments that name `--sgs-nd-scrollbar-ink`; the thumb background becomes `var(--sgs-scrollbar-thumb)`; add `@supports selector(::-webkit-scrollbar){.wp-block-sgs-nav-drawer{scrollbar-color:auto}}` so the rounded, arrow-free webkit thumb keeps working; Firefox inherits the token colour and keeps `scrollbar-width:thin`. `src/blocks/nav-drawer/render.php` publishes `--sgs-scrollbar-thumb:<drawer text colour>` in place of `--sgs-nd-scrollbar-ink`.
- **Snapshot gate**: new `scripts/snapshot_scrollbar_tokens.py` (contrast maths) and `scripts/check-snapshot-scrollbar-tokens.py` (refuses a thumb under 2:1 against its ground; self-test with a 1.5:1 negative control), wired into `scripts/push-theme-snapshot.py::roster_guard` (paths under `plugins/sgs-blocks/`). Indus: `sites/indus-foods/theme-snapshot.json` gains `settings.custom.scrollbar.thumbOnDark` = `#e7d768` (pushing it to indus-test needs the Indus session's go: step 8).
- **Tests**: `tests/js/scrollbar-contract.test.js` (model: `focus-system-contract.test.js`): the `:where(*)` rule declares `scrollbar-color`; no `--sgs-nd-scrollbar-ink` anywhere; every `::-webkit-scrollbar{display:none}` has its `scrollbar-width:none` pair. Fails today (file missing, `35%` present).
- **Live**: `getComputedStyle(document.documentElement).scrollbarColor` at 375/768/1440; the open drawer's computed value is `auto` in Chrome; a headed Chrome screenshot (native bars do not show in element screenshots).

### G4: text weight on Mac matches the drafts (font smoothing; theme, Spec 01 FR-1-1)

- Always on, no setting (Bean, 2026-10-19). It tells Mac browsers to smooth letters in greyscale, so text draws slightly thinner and lighter, most visibly light text on dark grounds; Windows, Android and iPhone ignore it. 13 draft files declare it. In `theme/sgs-theme/assets/css/core-blocks-critical.css`, add to the existing `html` rule: `-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;` (that file loads synchronously on the frontend and through `add_editor_style`).
- **Test**: `tests/js/font-smoothing.test.js`: the critical CSS holds both declarations (fails today). **Live**: `getComputedStyle(document.body).webkitFontSmoothing === 'antialiased'` (Chrome reports the value on any OS).

### G9: a long uploaded file name stays inside its box (sgs/form, Spec 04 FR-4-1)

Draft: `sites/indus-foods/handoff/TradeApplication.dc.html` (grep `overflow-wrap`).

- **CSS** (`src/blocks/form/style.css`; first grep it for a `min-width` on `.sgs-form-field`: if one exists, keep it, drop that one declaration below and say so in the report): `.sgs-form-file__preview{min-width:0;overflow-wrap:anywhere}` `.sgs-form-file__name,.sgs-form-file__error,.sgs-form-field__error{overflow-wrap:anywhere}` `:where(.sgs-form-field){min-width:0}` `.sgs-form-review__term,.sgs-form-review__detail{min-width:0;overflow-wrap:anywhere}`. Covers the span from `form/view.js::uploadFile`, choice-flow's `flow-fields.js::uploadFlowFile` (writes into the preview), and `form/view.js::populateReview`. Leave `grid-template-columns` alone (the F3 rule in `plugins/sgs-blocks/scripts/check-hardcoded-render-defaults.js` governs it). Both review selectors exist today (`form/style.css::.sgs-form-review__term`, `::.sgs-form-review__detail`).
- **Test**: `tests/js/form-file-wrap.test.js`: the stylesheet holds those rules (fails today). **Live**: a canary form page, `setInputFiles` with a 120-character name: `preview.scrollWidth <= preview.clientWidth` and `document.documentElement.scrollWidth <= innerWidth` at 375/768/1440, and again on the review step.

### G10: a description line under each option tile's label (sgs/form-field-tiles and sgs/choice-flow-question, Spec 04 FR-4-2)

Draft: `sites/indus-foods/handoff/EnquiryForm.dc.html` ("What can we help with?" chips: 17px bold label, 15px description, 4px gap). Bean, 2026-10-19: copy the choice-flow question block's description (copy, not a shared helper: the two blocks' markup differs).

- **Copied from `src/blocks/choice-flow-question`**: `block.json::attributes.options` item `description` (string, `""`); `OptionPolishFields.js` `TextareaControl` label "Description", `rows={2}`, `maxLength` and slice at 140; render span `sgs-choice-flow-question__option-description`; CSS muted colour, `.875em`, line-height 1.4.
- **Tiles** (`src/blocks/form-field-tiles/`): `block.json::attributes.tiles` item gains `description` (string, `""`); the Tiles panel gains the same `TextareaControl` after Label, help "Optional. One line shown under the tile label. Leave blank for none."; `render.php` prints `<span class="sgs-form-tile__description">` after `.sgs-form-tile__label` and before `.sgs-form-tile__check`, inside the `<label for>` (part of the accessible name, WCAG 2.5.3), with `esc_html( mb_substr( $desc, 0, 140 ) )`. `src/blocks/form/style.css`: `:where(.sgs-form-tile__description){display:block;color:var(--wp--preset--color--text-muted,#6b7280);font-size:.875em;line-height:1.4;overflow-wrap:anywhere}` (no opacity: contrast is never reduced; the draft's lighter tone is a `tileDescriptionColour` the route writes).
- **Controls on both blocks** (every visible property has a control; choice-flow's description has none today):
  - Tiles: `tileLabel*` and `tileDescription*` typography sets (FontSize, FontSizeUnit, FontSizeTablet, FontSizeMobile, FontFamily, FontWeight, FontStyle, LineHeight, LineHeightUnit, LetterSpacing, LetterSpacingUnit, TextTransform, TextDecoration, TextAlign, TextWrap; the `account/block.json` `cardDesc*` shape), plus `tileLabelColour` and `tileDescriptionColour` (strings, `''`); `<TypographyControls prefix="tileLabel" …>` and `<TypographyControls prefix="tileDescription" fontSizePresets showFontFamily showDecoration showTransform showLetterSpacing showTextAlign showTextWrap />`; two `SgsColourPanel` text rows; `render.php` emits `sgs_typography_css_rule( $attributes, 'tileLabel', '.' . $uid . ' .sgs-form-tile__label' )` and the same for `tileDescription`, plus the colours through `sgs_colour_value()`.
  - Choice-flow question: `optionDescription*` (same shape) and `optionDescriptionColour`; `<TypographyControls prefix="optionDescription" …same props… />` and an `SgsColourPanel` text row in `edit.js` under `<InspectorControls group="styles">`; `render.php` is at its line cap, so the scoped CSS comes from new `src/blocks/choice-flow-question/helpers-description-style.php::sgs_choice_flow_question_description_css( $attributes, $uid )` (selector `.' . $uid . '.sgs-choice-flow-question .sgs-choice-flow-question__option-description`, which beats the showcase layout's 14px), emitted once per block for both render paths. Empty defaults keep today's look.
- **Canvas twins**: the same span in the tiles preview tile and in `choice-flow-question/QuestionPreview.js` (find where option cards render in the canvas), each with `typographyPreviewCss( attributes, '<prefix>', selector, previewTier )` and the colour in the `textPaintPreview` call, attributes named at the call site.
- **Tests**: `tests/php/FormFieldTilesDescriptionTest.php` and `tests/php/ChoiceFlowQuestionDescriptionTest.php` (`BlockHarnessRenderTrait`): a description renders inside the label (tiles) or button (choice flow); none → no span; the scoped CSS holds the font-size and colour rules; mutation: drop the `mb_substr` or the selector's third class. **Live**: computed `font-size` and `color` of both descriptions at 375/768/1440 (the showcase case overridable from 14px); the accessible name includes the description.
- The hand-written typography sets match the generator's shape; wave 3's fixers add only the outline prop and its three attributes to them.

### G5: a tilted ribbon tag with a V-cut end (sgs/label end shapes, Spec 02 FR-2-2)

Draft: `sites/mamas-munches-redesign/handoff/Home.dc.html` and `Product.dc.html` (grep `polygon(0 0,100% 0,88% 50%`): pink "baked with love" tag, 2px outline, tilted -6 and -4 degrees, floating over the photo collage (it floats via G13). Bean, 2026-10-19: option A, the shared border panel plus left and right end shapes from the container's shape-divider library, cut (not painted) so what is behind shows through. Bean, 2026-10-20, after the live review: the notch cuts into the label's own box, the cut sides carry no border, and the straight sides are a clean CSS border, as the draft's `border:2px solid` plus `clip-path:polygon(…)` paints it.

- **Library reading** (decided): the painted part of a divider tile is the part of the label that stays, so `arrow` gives exactly the draft's V notch and `triangle` a point.
- **Attributes** (`src/blocks/label/block.json`, one value each, no tiers): `endShapeLeft`, `endShapeRight` strings, enum `"" | arrow | triangle | slant | curve | wave-smooth | zigzag`, default `""`; `endDepth` number default 45, min 10, max 150 (percent of the label's height: the angle holds at any text length); `borderWidth` `{}`, `borderStyle` `""`, `borderColour` `""`, `borderColourGradient` `""`. Add `css:border-width`, `css:border-style`, `css:border-color`, `css:border-color-gradient` to `supports.sgs.elements.label.attrMap` and delete the "label has no border feature" text from `_note`.
- **Menu names** (what you see, not library keys): Straight (`""`), V notch (arrow), Point (triangle), Slant (slant), Round (curve), Wave (wave-smooth), Zigzag (zigzag). Left out: cloud, drops, mountains (mush at ~50px), the asymmetric pair (lopsided), tilt, split, slant-gentle and wave (repeats). A ticket is V notch on both ends; a chevron is left V notch plus right Point.
- **Controls**: new `src/blocks/label/EndShapePanel.js` (`PanelBody` "Shape"): `SelectControl` "Left end" and "Right end", help "Cuts this end of the label into a shape. Whatever is behind the label shows through the cut. Add padding on this side so the text clears it."; `RangeControl` "End depth" (shown when an end is not Straight), help "How far the cut reaches into the label, as a percentage of the label's height."; `<SgsBorderControl label="Border">` with `widthValues={borderWidth}`/`onWidthChange`, `styleValue`/`onStyleChange`, `colourValue`/`onColourChange`, `colourGradientValue`/`onColourGradientChange`, no radius props, help "With an end shape, the cut removes the border along it." Every border style the panel offers paints, since the border is a real CSS border Rotation stays Motion → Rest rotate.
- **Typography clean-up** (`label/edit.js`): delete the six bespoke ToolsPanelItems that duplicate the shared panel (Font weight, Text transform, Line height, Letter spacing, Font style, Text align) and their unused constants and imports; rename the survivor "Typography" with `hasValue`/`onDeselect` over every typography attribute; mount `<TypographyControls attributes setAttributes prefix="" showSize showResponsive fontSizePresets showFontFamily showWeight showStyle showLineHeight showLetterSpacing showTransform showDecoration showTextAlign showTextWrap showTextColumns showWritingMode />`.
- **Shared helper** `includes/helpers-end-shape.php` with JS twin `src/utils/end-shape.js` (identical strings): `sgs_end_shape_allowed(): array`; `sgs_end_shape_cut_svg( string $shape, string $side, float $depth ): string`; `sgs_end_shape_mask_decls( array $ends ): string` (`$ends = [ 'left' => [ shape, depth ], 'right' => … ]`); `sgs_end_shape_border_box_decls( array $ends, array $border_decls, string $paint ): string` (the layer's `inset` per side, the border width and style declarations `sgs_border_element_decls()` printed, the colour from its `facts.paint`: a flat colour as `border-color`, a gradient as `border-image:<gradient> 1` with `border-image-width` 0 on each shaped side, none left on `currentColor`; then `border-<side>:1px solid transparent` for each shaped side and `background-clip:padding-box`); `sgs_end_shape_layer_decls( array $ends, array $border_decls, string $paint ): string` (`content`, `position:absolute`, the border box declarations, `z-index:-2;box-sizing:border-box;pointer-events:none;border-radius:inherit`, then the mask). `$side` takes `left|right` now; `top|bottom` later lets the container make a see-through cut.
- **Mask geometry**: one data-URI SVG tile per shaped end, `width=k height=100 viewBox="0 0 k 100" preserveAspectRatio="none"` (k = `endDepth`); right end `transform="matrix(0 0.0833 -k/120 0 k 0)"`, left end `matrix(0 0.0833 k/120 0 0 0)`; the cut tile is `<path fill-rule="evenodd" d="M0,0H1200V120H0Z {full library path}">` (the full `sgs_get_shape_dividers` path, not the trimmed edge path: arrow's trimmed path closes along the top edge, so XOR with it keeps the notch and removes the body, proven by a Chromium render on 2026-10-19); encode only `% < > # "` (`%25 %3C %3E %23 %22`) with single-quoted SVG attributes so PHP and JS match.
- **Render** (`label/render.php`, appended after the existing helper output; `helpers-tokens.php::sgs_block_background_layer_css` is never edited; S = root selector): no end shape → an ordinary border via `sgs_border_element_decls( $attributes, '', S, array( 'colour' => array( 'base' => 'borderColour', 'gradient' => 'borderColourGradient' ), 'colour_as_paint' => false, 'facts' => true, 'radius' => false ) )`. With an end shape the same call with `colour_as_paint` true: class `has-end-shape`; `S{background-color:transparent;position:relative;isolation:isolate}` (plus `display:inline-block` for a variant other than the pills), then the border width and style declarations and `border-color:transparent`, so the root keeps its border widths for layout and paints none of it; the fill stays on `sgs_block_background_layer_css()`'s `S::after`; then `S::after{<sgs_end_shape_layer_decls( ends, base width declarations, facts.paint )>}`, e.g. for the draft tag `content:"";position:absolute;inset:calc(-1 * 2px) calc(-1 * 2px) calc(-1 * 2px) calc(-1 * 2px);border-style:solid;border-width:2px 2px 2px 2px;border-color:#3A2A22;border-right:1px solid transparent;background-clip:padding-box;z-index:-2;box-sizing:border-box;pointer-events:none;border-radius:inherit;mask-image:linear-gradient(#000 0 0),url("cutR");mask-position:0 0,right center;mask-size:100% 100%,auto 100%;mask-repeat:no-repeat;mask-composite:subtract;` (a second end adds `,url("cutL")`, `,left center`, `,auto 100%` and `subtract,add`). Each side is inset by its own width (a 0 side is `0`), so the layer covers the root's border box exactly; a tablet or mobile width adds `@media(max-width:1023px|767px){S::after{<inset and width declarations>}}`. The mask cuts fill and border together: the cut sides have no line, and top, bottom and the straight end are crisp CSS borders. Each shaped side's layer border is a 1px transparent strip and the fill stops at the layer's padding box, so no paint meets the layer's edge along the cut: in Chrome a masked, rotated element shows a hairline wherever paint meets its edge under a zero mask (proven 2026-10-20 at -6 degrees and DPR 1.25 and 2: the hairline followed the layer's edge when the layer was widened and stayed with the border removed, and went to 0 pixels once that edge carried no paint). The cut removes that side's border anyway, apart from its two corner points. The mask sits at the box's own end (`right center` / `left center`); the render and stylesheet add no padding or width for a shape (the panel help asks the author for padding on the shaped side). `style.css`: `:where(.is-style-pill-fill,.is-style-pill-wrap).wp-block-sgs-label.has-end-shape::after{content:"";position:absolute;border-radius:inherit;pointer-events:none;background-color:var(--wp--preset--color--primary)}`. A gradient border is a `border-image`, which paints square corners under a radius. The `::before` dot and the focus outline are untouched; the root is never masked; the label has no child elements.
- **Canvas twin**: `src/blocks/label/end-shape-preview.js::labelEndShapePreviewCss( selector, attributes )` from `src/utils/end-shape.js`, in the scoped `<style>` beside `dotCss`: `S{background-color:transparent;position:relative;isolation:isolate}` then `S::after{<endShapeLayerDecls( ends, the border width declarations, the border paint )><fill paint>}`, the same layer declarations render.php prints; the canvas element is the `RichText` itself, with no child elements; `sgsBorderPreview()` with the panel values keeps the root's widths, colour transparent and no `border-image` while a shape is set.
- **Tests**: `tests/php/LabelEndShapeTest.php`: the draft tag (right arrow, depth 45, 2px solid `#3A2A22` on all sides, `#EE8088` fill) → CSS has `S::after{<LAYER_ARROW_RIGHT_DRAFT>}` (the border width, `border-color:#3A2A22` and `mask-composite:subtract` on the layer), the fill `background-color:#EE8088` on `::after`, the root's `border-width:2px 2px 2px 2px;border-color:transparent`, `#3A2A22` nowhere outside `::after`, no `stroke`, no `sgs-label__edge` and no padding property; the helper output equals the parity literal; per-side widths (top 2px, left 4px) → `inset:calc(-1 * 2px) 0 0 calc(-1 * 4px);border-width:2px 0 0 4px`; a tablet width → the layer's tablet `@media` inset and width; a gradient border → `border-image:<gradient> 1` on the layer and no masked ring; the border box declarations carry the shaped side's `1px solid transparent` strip and `background-clip:padding-box`, both ends give `border-image-width:1 0 1 0` and both strips, no shaped end gives `inset:0;` alone; dashed stays dashed; a rem width insets by the same rem; negative controls: both Straight → no `mask-image`, no layer inset, the plain root border with `border-color:#3A2A22`; style None → the layer at `inset:0` with no border; shape `cloud` → Straight; a text gradient plus a shape keeps the gradient rule. `tests/js/label-end-shape.test.js`: the cut tile, the mask declarations and the layer declarations equal the PHP test's literals, and `labelEndShapePreviewCss()` for the draft tag prints that same layer plus the fill.
- **Live**: the draft tag at Rest rotate -6 inside a G13 floating layer: the `::after` layer carries the fill and the border and is masked; the root is not; a pixel at the notch centre shows the section behind; the top, bottom and left borders measure the same device-pixel thickness, and no border pixel lies along the notch's two sides; Chromium, Firefox and WebKit at 375/768/1440, at device pixel ratio 1.25 and 2 as well as 1. If the mask fails in one engine, show the uncut tag there; never a second technique.

### G6: a phone add-to-basket bar that slides up once the buy button scrolls away (sgs/buybox, Spec 02 FR-2-3)

Draft: `sites/mamas-munches-redesign/handoff/Product.dc.html` (grep `position:fixed;bottom:0`, `barOn`, `showBar`).

- **Facts**: the buybox root is `data-wp-interactive="sgs/product-card"`, context holds `priceDisplay`, `selectedVariationId`, `axes`, `selectedAxes`, `pending`; the add button is `.buybox__cart-form` submitting to `actions.addToCart`; `guided.js` guards that form's submit with a capture listener. The bar lives inside the root and triggers the existing form.
- **Attribute** (`src/blocks/buybox/block.json`): `stickyBar` object default `{}`, per tier `"off"` or `"after-button"`. No label-mode attribute: the bar always shows the price and a variant line.
- **Control** (`src/blocks/buybox/inspector-extra.js`, below "Stick while scrolling"): `ResponsiveOverride` + `SelectControl` "Add-to-basket bar", options "Off" and "Show once the Add button has scrolled out of view", help "A fixed bar at the bottom of the screen with the price, the chosen options and an Add button. Usually switched on for phones only." The existing add-to-cart button settings style the bar's button through the shared `.buybox__add-to-cart` classes.
- **Render** (`src/blocks/buybox/render.php`, after `.sgs-buybox__config-col` closes, before the data island; only when a tier is on): `<div class="sgs-buybox__bar" data-sgs-bar hidden role="region" aria-label="Quick add to basket">` holding `<span class="sgs-buybox__bar-price" data-wp-text="context.priceDisplay">`, `<span class="sgs-buybox__bar-variant" data-sgs-bar-variant>`, `<button type="button" class="wp-element-button buybox__add-to-cart" data-wp-bind--disabled="context.pending" data-wp-bind--aria-busy="context.pending">` with the existing `$add_to_cart_label`; the tier map on the root as `data-sgs-bar='{"d":0,"t":0,"m":1}'` from `extras.php::sgs_buybox_sticky_bar_data()` (mirrors `sgs_buybox_sticky_data`); out of stock: `data-wp-bind--hidden="!context.inStock"`.
- **JS** (new `src/blocks/buybox/sticky-bar.js`, added to `block.json::viewScriptModule`, plain DOM like `guided.js`): an `IntersectionObserver` on the in-flow add control (`.buybox__cart-form`, or `[data-sgs-modal-open]` in modal mode); the bar shows only while that control is above the viewport (`boundingClientRect.top < 0`) and the current tier (`matchMedia` at 768 and 1024) is on. The variant line is cut to one line with an ellipsis by a built-in bar default, `.sgs-buybox__bar-variant{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}` with `.sgs-buybox__bar>div{min-width:0;flex:1}` (the draft's only one-line cut is this bar subtitle, so it is a default here, not a typography control; Bean, 2026-10-19). Variant line rebuilt on the root's `sgs:option-selected` event from `.sgs-buybox__picker-selected-value` texts joined with " / ". Click → `cartForm.requestSubmit()` (inherits `actions.addToCart`, the guided guard and the toast); in modal mode `.click()` the modal-open button; with `selectedVariationId` 0 and axes present, scroll the picker into view (`scrollIntoView({block:'center'})`) and focus its first input instead of submitting. While the bar is on, set `--sgs-sticky-bar-h` on `:root`. Reduced motion removes the transition. No JS → `hidden` stays → nothing renders.
- **CSS** (`src/blocks/buybox/style.css`): `.sgs-buybox__bar{position:fixed;inset-inline:0;bottom:0;z-index:var(--wp--custom--z-index--sticky-bar,150);display:flex;align-items:center;gap:12px;padding:10px 16px calc(10px + env(safe-area-inset-bottom));transform:translateY(110%);transition:transform .3s cubic-bezier(.2,.8,.2,1)}`, `.sgs-buybox__bar.is-on{transform:none}`, button `min-height:44px`; colours from three new attributes (a visible look needs a control): `stickyBarBackground`, `stickyBarText`, `stickyBarBorderColour` (strings, default `''`), set in the block's `SgsColourPanel` as rows "Bar background", "Bar text", "Bar border", emitted by `render.php` through `sgs_colour_value()` as `--sgs-buybox-bar-bg`, `--sgs-buybox-bar-text`, `--sgs-buybox-bar-border` in the block's scoped style and read as `background:var(--sgs-buybox-bar-bg,var(--wp--preset--color--surface));color:var(--sgs-buybox-bar-text,var(--wp--preset--color--text));border-top:2px solid var(--sgs-buybox-bar-border,var(--wp--preset--color--border))`; `body{padding-bottom:var(--sgs-sticky-bar-h,0px)}` and `:root{scroll-padding-bottom:var(--sgs-sticky-bar-h,0px)}` (WCAG 2.4.11). No theme.json entry: no `--wp--custom--z-index--*` token is defined anywhere, and whatsapp-cta and google-rating-badge read theirs with a fallback the same way. In `src/blocks/whatsapp-cta/style.css`: `.sgs-whatsapp-cta--floating{bottom:calc(var(--sgs-sticky-bar-h,0px) + 24px)}` (24px is its current bottom).
- **Canvas twin** (`src/blocks/buybox/canvas-mock.js`): the bar drawn statically at the bottom of the mock when the previewed tier is on, `position:absolute` inside the mock (never fixed), mock price and a sample variant line.
- **Tests**: `tests/php/BuyboxStickyBarTest.php` (the `BuyboxImagePriorityTest` child-process harness): variable product, `stickyBar {mobile:'after-button'}` → HTML has `data-sgs-bar`, `data-wp-text="context.priceDisplay"`, `aria-label="Quick add to basket"`, no `style="`; negative control: unset → no `data-sgs-bar`. `tests/js/buybox-sticky-bar.test.js` with a mocked `IntersectionObserver`: `is-on` when the control leaves above; click calls `form.requestSubmit` once; with `selectedVariationId` 0 and axes, click calls `scrollIntoView` instead; `--sgs-sticky-bar-h` set then cleared.
- **Live**: a canary product page with a buybox (`wp post list --post_type=product`): at 375 scroll past the Add button → bar at `bottom:0`, clicking it shows the basket toast and changes the cart count, it never covers a focused control at the page end; at 768 and 1440 the bar is hidden; reduced motion → no transition; Tab to the bar button → visible focus ring, at least 44px.

### G7: a highlighter stripe behind selected words and G8: a small photo inside a line of text, in every SGS text element (Spec 02 FR-2-4, FR-2-5)

Draft: `sites/mamas-munches-redesign/handoff/Home.dc.html` H1 "Made for the mum [photo] who needs it [most]": the photo is a real image (`assets/photo-pair-love.jpg`, 1.55em × 0.78em, full radius, 3px dark border, tilted -4 degrees) and "most" carries a yellow stripe across its lower part. Bean, 2026-10-19: universal, like bold, italic and link in the toolbar.

- **Facts**: 32 editor RichText usages in 19 files; 14 set no `allowedFormats` (they take every registered format, inline-style ones too), 18 hard-code their own list; no shared list exists. Core's `core/text-color` and `core/image` both save inline `style`, so SGS registers its own formats. 21 blocks print RichText through `wp_kses_post`, which keeps `style`. `audit-inline-styling.js` reads render source only, never saved content.
- **One shared list** `src/utils/rich-text-formats.js`, five frozen arrays: `RICH_TEXT_BODY` (`core/bold`, `core/italic`, `core/link`, `core/strikethrough`, `sgs/highlight`, `sgs/inline-photo`); `RICH_TEXT_BODY_NO_LINK` (the same minus link, for text inside an `<a>`, `<button>` or `<summary>`); `RICH_TEXT_EMPHASIS` (bold, italic); `RICH_TEXT_LINK_ONLY` (link); `RICH_TEXT_PLAIN` (`[]`). Assignments (decided): BODY for heading, text, quote, collapsible-text, the timeline description, the testimonial quote, the choice-flow-result body, the product-card description, the counter label, the trust-bar title, team-member name and role, form-field-consent; BODY_NO_LINK for the accordion-item title and whatsapp-cta; EMPHASIS for the button label (a 44px target whose name and fill contrast a stripe or photo would change) and the second testimonial field (confirm which field); LINK_ONLY for label (12 to 14px tag text); PLAIN for the 7 existing empty lists and the pricing-table and product-faq heading fields (they print through `esc_html`). `timeline`'s `core/text-color` and `collapsible-text`'s `core/underline` go (both save inline style): highlight and strikethrough replace them.
- **Detector** `scripts/survey-rich-text-formats.js` (`--survey`, `--fix`, `--check`, `--self-test`; under `plugins/sgs-blocks/`), roles in `scripts/data/rich-text-format-roles.json` (file and field → constant; anything unmapped is listed for a decision, never guessed): `--check` fails on a RichText with an inline array or no `allowedFormats`, or a render.php printing RichText through `wp_kses_post` (allowlist: button's own kses, pricing-table, product-faq); `--fix` writes the import, the prop and the sanitiser swap; self-test fixtures: a literal list, a missing prop, a correct file, a swap. Added to `scripts/run-gates.py` (`gate:fast`).
- **Sanitiser** `includes/helpers-inline-formats.php::sgs_rich_text_kses( string $html ): string`: `wp_kses_allowed_html( 'post' )` with `style` unset on every tag and `img` limited to `src`, `alt`, `class`, `srcset`, `sizes`, `width`, `height`, `loading`, `decoding`. Button keeps its own allowlist (a test asserts it carries no `style`).
- **Site-wide look, no block attributes**: snapshot keys `settings.custom.highlight` (`colour` `var(--wp--preset--color--accent)`, `thickness` `0.2em`, `lift` `0.02em`, `overhang` `4%`, `tilt` `0deg`) and `settings.custom.inlinePhoto` (`width` `1.55em`, `height` `0.78em`, `borderWidth` `0`, `borderColour` `currentColor`, `radius` `999px`, `tilt` `0deg`), defaults in `theme/sgs-theme/theme.json` and in the 9 `sites/*/theme-snapshot.json` (the Mama's draft's 3px border and -4deg tilt are its snapshot values). Set in the snapshot only (the `settings.custom.focus` precedent; no editor panel edits `settings.custom`). Guard: `scripts/snapshot_inline_format_tokens.py` and `scripts/check-snapshot-inline-format-tokens.py` (`--survey`, `--fix`, `--check`, `--self-test`), one line in `push-theme-snapshot.py::roster_guard`.
- **Per-highlight colour from the palette by class**: `sgs/highlight` registered like core's text-color, `className:'sgs-highlight'`, `attributes:{class:'class'}`; saved `<span class="sgs-highlight sgs-highlight--accent">`; `helpers-inline-formats.php::sgs_inline_format_palette_css(): string` reads `wp_get_global_settings( array( 'color', 'palette' ) )`, keeps slugs matching `^[a-z0-9-]+$`, emits `.sgs-highlight--{slug}{--sgs-highlight-colour:var(--wp--preset--color--{slug})}` through `wp_add_inline_style( 'sgs-inline-formats', … )`.
- **Shared stylesheet** `assets/css/inline-formats.css`: `.sgs-highlight{position:relative;isolation:isolate;white-space:nowrap}`; `.sgs-highlight::before{content:"";position:absolute;pointer-events:none;z-index:-1;inset-inline:calc(var(--wp--custom--highlight--overhang,4%)*-1);bottom:var(--wp--custom--highlight--lift,.02em);block-size:var(--wp--custom--highlight--thickness,.2em);background:var(--sgs-highlight-colour,var(--wp--custom--highlight--colour,var(--wp--preset--color--accent)));border-radius:999px;transform:rotate(var(--wp--custom--highlight--tilt,0deg))}`; `.sgs-inline-photo{display:inline-block;vertical-align:middle;box-sizing:border-box;object-fit:cover;margin:0 .06em;inline-size:var(--wp--custom--inline-photo--width,1.55em);block-size:var(--wp--custom--inline-photo--height,.78em);border:var(--wp--custom--inline-photo--border-width,0) solid var(--wp--custom--inline-photo--border-colour,currentColor);border-radius:var(--wp--custom--inline-photo--radius,999px);transform:rotate(var(--wp--custom--inline-photo--tilt,0deg))}`; `@media (forced-colors:active){.sgs-highlight{text-decoration:underline}}`. Registered as `sgs-inline-formats` in `includes/class-sgs-blocks.php`, enqueued for the editor canvas on `enqueue_block_assets`; on the frontend `helpers-inline-formats.php::sgs_inline_formats_maybe_enqueue` (a `render_block` filter) enqueues it only when a block's HTML holds `sgs-highlight` or `sgs-inline-photo`. No block.json `style` changes.
- **Editor** `src/blocks/extensions/inline-formats/index.js` (imported by `src/blocks/extensions/index.js`; each format's `edit` returns null unless the selected block's name starts with `sgs/`): **Highlight**: toolbar button "Highlight"; popover "Highlight colour", the shared swatch row `<DesignTokenPicker linked disableCustomColors clearable states={[…one state…]}>` (never a raw `ColorPalette`: inspector-scan rule 24 refuses one anywhere under `src/`; `disableCustomColors` is a new `DesignTokenPicker` prop forwarded to the palette in `SgsColourStateControl`, because a custom hex cannot become a class), help "Pick one of your site colours. Leave it clear to use the site's highlight colour."; button "Remove highlight"; a notice over 3 words "Best on one to three words: a highlight never breaks across lines." **Inline photo**: toolbar button "Inline photo" opens `MediaUpload` (images only) and inserts the `medium` size with `insertObject` and class `wp-image-N`; a popover on the photo: toggle "Decorative photo" (on by default; help "The words already say it all, so screen readers skip the photo."), field "Describe the photo" (help "Read aloud as part of the text, so keep it short."), buttons "Replace" and "Remove"; toggle off with an empty description shows a warning notice (validation warns, never blocks). Replace uses `applyFormat` on the one-character range as core's image format does (verify in the installed `@wordpress/format-library`).
- **Rollout**: B5 builds the mechanism and adopts it in heading and text; after the wave 2 gate the main thread runs `node scripts/survey-rich-text-formats.js --fix` over every other block as one commit, then `--check`.
- **Route** (`scripts/computed-route/lint.mjs`): refuse a tree whose `content` or `text` string contains `style=`; test in `scripts/computed-route/tests/lint.test.mjs`. The route's writer and detector for these two draft shapes are a later Spec 48 step (coverage plan).
- **Tests**: `tests/php/InlineFormatsTest.php` (helpers called directly): `sgs_rich_text_kses` strips `style` from span, img, a and p and keeps `class`, `src`, `alt`; `sgs_inline_format_palette_css` with slugs `accent` and `bad slug!` emits only the accent rule; the enqueue filter enqueues only for HTML holding the class; button's allowlist has no `style`; `ThemeSnapshotManifestTest` asserts the new keys. `tests/js/rich-text-formats.test.js`: every constant lists only registered names; `create` → `toHTMLString` round-trips the photo and a coloured highlight unchanged. Detector and token guard `--self-test`; `push-theme-snapshot.py --dry-run` refuses a snapshot missing `highlight.thickness`; mutation: delete the `style` unset and confirm red.
- **Live**: a new canary test page (`scripts/wp-build-page.js`, never a motion fixture) with a heading, text, quote, timeline, collapsible-text, a product-card description and an accordion title (no `<a>` inside it) at 375/768/1440: the stripe's `::before` height is 0.2 × font size, wider than the word by twice the overhang, colour matching its slug; the photo 1.55em × 0.78em (±1px), rotated, `naturalWidth > 0`; `document.querySelectorAll('[class*="wp-block-sgs-"] [style]').length === 0`; `scrollWidth === innerWidth` at 375; the same in the editor canvas plus keyboard use of both popovers; a token proof (push `thickness` `0.3em` to the canary snapshot, assert the height changes, restore in the same command); a cropped screenshot pair against the draft H1.

### G11: a link underline in its own colour (shared link underline helper, Spec 32 FR-32-24)

Draft: `sites/mamas-munches-redesign/handoff/SiteFooter.dc.html` (grep `text-decoration-color`): footer links have no underline at rest; on hover a plain 2px underline, 4px below, cream `#FFFAF0`, while the text stays dark `#3A2A22`.

- **Attributes** per link prefix: `{prefix}LinkUnderlineColour` string `""`, `{prefix}LinkUnderlineColourHover` string `""`, `{prefix}LinkUnderlineOffset` string `""` (CSS length); widen `{prefix}LinkUnderline` enum to `["","none","always","hover","sweep"]`.
- **Control** (`src/components/LinkUnderlineControl.js`, gains `colour`, `colourHover`, `offset` and their `on*Change`): new option "Shows on hover" (help "An underline appears when the link is hovered or focused with the keyboard."); "Underline colour" `DesignTokenPicker` with states Normal and Hover, `linked:true`, shown for Always, Shows on hover and Sweep; "Underline gap" `SgsLengthControl` px, placeholder "Default", help "Space between the text and its underline.", shown for Always and Shows on hover.
- **Render** (`includes/helpers-link-underline.php::sgs_link_underline_css`; L = `{sel} a`, C colour, CH hover colour, T thickness, O offset; colours through `sgs_colour_value`): always → `L{text-decoration-line:underline;[text-decoration-thickness:T;][text-decoration-color:C;][text-underline-offset:O;]}` + `sgs_hover_state_rules(L,'text-decoration-color:CH')`; hover → `L{text-decoration-line:none;[thickness][color:C][offset]}` + `sgs_hover_state_rules(L,'text-decoration-line:underline[;text-decoration-color:CH]')` + the forced-colours rule (longhands only: the shorthand resets colour and thickness); sweep → the gradient becomes `linear-gradient(X,X)` with X = C or `currentColor`, the hover rule adds `background-image:linear-gradient(CH,CH)` when CH is set; offset does not apply to sweep.
- **Canvas twin**: `src/utils/link-underline.js::linkUnderlinePreviewCss` takes `{colour, colourHover, offset}` and mirrors the rules with plain `:hover` and `colourVar`.
- **Reach** (hand-declared on 11 prefixes in 10 blocks: business-info, collapsible-text, heading, icon-list, label, text `''`, product-card `desc`, quote `attribution`, testimonial `quote` and `''`, timeline `description`): more than 3 blocks, so first build `scripts/survey-link-underline-family.js` with `--survey/--fix/--check/--self-test` (per migration-method), checking every block declares all siblings, every `<LinkUnderlineControl>` and `linkUnderlinePreviewCss(` call passes the new props by name (`check-editor-render-parity` CHECK A needs names), and the 33 `scripts/attr-classification-overrides.json` rows exist. Registries: `scripts/check-dead-controls.js` (`sgs_link_underline_css` list), `scripts/data/property-suffixes.json` (`LinkUnderlineColour` → `text-decoration-color`, `LinkUnderlineOffset` → `text-underline-offset`), `cluster-member-sets.json`, `setting-registry.json`, `tests/js/__snapshots__/configurator-schema-compat.test.js.snap`.
- **Tests**: extend `tests/php/LinkUnderlineTest.php`: `linkUnderline:'hover'`, thickness `2px`, offset `4px`, colour `#FFFAF0` → `/ a\{text-decoration-line:none;text-decoration-thickness:2px;text-decoration-color:#FFFAF0;text-underline-offset:4px;\}/` and a guarded `a:hover{text-decoration-line:underline`; negative control: no colour → no `text-decoration-color`. New `tests/js/link-underline.test.js`.
- **Live**: `sgs/icon-list` links: `textDecorationLine`, `textDecorationColor`, `textUnderlineOffset`, `textDecorationThickness` at rest and under a real pointer hover at 375/768/1440.

### G13: anything can float over a section (sgs/decorative-image becomes "Floating layer", Spec 02 FR-2-6)

Draft: the Mama's hero collage (`Home.dc.html`): tilted overlapping polaroids, the floating "baked with love" tag (G5) and the round "baked to order" badge. Bean, 2026-10-19: give the decorative image block inner blocks so it doubles as a floating container (it already owns per-device position, width, rotation, layer order, opacity, flip, fade and hide).

- **block.json**: title "Floating layer", description "Floats an image, text, a label or a badge over its section at a set position, size and angle.", keywords floating, layer, badge, sticker, tag (the slug stays `sgs/decorative-image`); new `widthUnit` enum `px | % | auto` default `px` (one unit for every tier); `opacity` default 85 → 100 (floating text must not fade); `"css:transform": "rotation"` in `supports.sgs.elements.image.attrMap` (fixes the framework DB row `sgs/decorative-image | rotation | css_property 'z-index'`: `transform` is missing from `property_suffixes`, so the emission guess in `extract-signatures.py::extract_css_property_and_layer` took the neighbouring `z-index`; check after the reseed that the row reads `transform`); `example` as tier objects.
- **Inner blocks**: new `save.js` returns `<InnerBlocks.Content />` and `index.js` registers it (old self-closing instances serialise as `""` and stay valid: no deprecated.js); every block allowed.
- **render.php** (closures only, no top-level functions): `$has_content = '' !== trim( $content )`; return nothing only with no media and no content; with content, the wrapper `<div class="sgs-decorative-image sgs-decorative-image--layer [sgs-decorative-image--over-image] {uid}">` holds the optional `<img class="sgs-decorative-image__media sgs-media-el">` then `<div class="sgs-decorative-image__content">{$content}</div>` (the video branch appends the same content div); image only keeps today's naked `<img>` root. `widthUnit` `auto` → `width:max-content;max-width:100%` (tiers ignored); `%` → `width:N%`.
- **Accessibility**: with content the wrapper never gets `aria-hidden` or a role; `imageDecorative` affects only the `<img>` (`alt=""` plus `aria-hidden` when on, `imageAlt` when off); help "Turn off only when the image carries meaning, then write alt text. Text and blocks inside the layer are always read out."
- **style.css**: `.sgs-decorative-image--layer{pointer-events:auto;user-select:auto}`; `.sgs-decorative-image--layer>.sgs-decorative-image__media{display:block;width:100%;height:auto}`; `.sgs-decorative-image--over-image>.sgs-decorative-image__content{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}`; content alone: `.sgs-decorative-image__content{display:flow-root}`.
- **Editor**: the positioned preview holds the optional image plus `useInnerBlocksProps( { className: 'sgs-decorative-image__content' }, { renderAppender: blockCount ? undefined : InnerBlocks.ButtonBlockAppender } )`, pointer events on with content; empty state: MediaPicker "Choose image" plus "Or add blocks to float text, a label or a badge."; new `LayerImagePanel.js` (Replace, Remove; edit.js is 591 lines); `SelectControl` "Width type" with "Fixed (px)", "Percentage of the section (%)", "Fit the content", help "Fit the content suits a label or a badge; fixed or percentage suits a photo."; canvas twin `layer-preview.js::layerPreviewStyle( attributes, tier, hasContent )`.
- **The two Mama's pieces**: the tag = a Floating layer (Fit the content, rotation -6) holding the G5 label; the badge = a Floating layer (no image, Fit the content, rotation 12, Motion float loop) holding an `sgs/container` (aspect ratio 1, radius 999px, `#EE8088`, 2px `#3A2A22` border, shadow preset) with a label "Baked" and text "to order", centred.
- **Tests**: `tests/php/DecorativeImageLayerTest.php` (passes inner content through `scripts/qa/lib/render-css-harness.php --content` from its own helper; `BlockHarnessRenderTrait::render_block` takes no content argument and is not changed): content only → a `--layer` div with the content, no `aria-hidden`, CSS has `rotate(12deg)` (fails today: render returns nothing without media); image plus content → `--over-image`, `aria-hidden` on the `<img>` only; negative controls: nothing → empty output; image only → the root is still the naked `<img class="sgs-decorative-image sgs-media-el`; `auto` → `width:max-content`; `%` with a tablet tier → the scoped `@media` rule. `tests/js/decorative-image-layer-preview.test.js`: the preview style matches PHP for `auto` and `%`.
- **Live**: the badge root has its rotation and `pointer-events:auto`, "Baked to order" is in the accessibility tree; with an image the content box equals the image box; in the editor a no-image layer saves and reloads cleanly and an existing image-only canary instance still validates.
- **Route** (note): an absolutely positioned draft node that is not an image routes to a Floating layer with inner blocks (coverage plan, step 10).

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
Step 3 — B3: G4, G9, G3, G10 theme, form and choice flow
  Model:       sonnet
  Action:      dispatch the Builder brief + this step's Prompt line
  Files:       Orchestration B3
  Inputs:      Designs G3, G4, G9, G10
  Outcome:     `scrollbar-contract`, `font-smoothing`, `form-file-wrap` JS tests, `FormFieldTilesDescriptionTest` and `ChoiceFlowQuestionDescriptionTest` green, red under mutation; `check-snapshot-scrollbar-tokens.py --self-test` passes with its 1.5:1 negative control
  Exec:        PARALLEL with steps 1, 2
  Deps:        step 0
  Marker:      (none)
  Time:        50
  Tooling:     /sgs-wp-engine, phpunit, wp-scripts test-unit-js, python
  On-Fail:     as step 1
  Prompt:      "Your builder: B3. Build Designs G4, G9, G3, G10 in that order. Files you own: theme/sgs-theme/assets/css/core-blocks-critical.css, theme/sgs-theme/assets/css/scrollbars.css (new), theme/sgs-theme/functions.php, theme/sgs-theme/theme.json, theme/sgs-theme/assets/css/woocommerce.css; under plugins/sgs-blocks/: src/blocks/nav-drawer/style.css and render.php, src/blocks/google-reviews/render.php and render-styles.php, src/blocks/form/style.css, src/blocks/form-field-tiles/block.json, render.php, edit.js, src/blocks/choice-flow-question/block.json, edit.js, QuestionPreview.js, OptionPolishFields.js, helpers-description-style.php (new), render.php (one call to the new helper for both render paths and no other logic: it is at its line cap), scripts/snapshot_scrollbar_tokens.py (new), scripts/check-snapshot-scrollbar-tokens.py (new), scripts/push-theme-snapshot.py, and the new tests the designs name; and sites/indus-foods/theme-snapshot.json. The scrollbar thumb floor is 2:1 (Bean's ruling; never 3:1). Do not push any snapshot."
  Test:
    Happy:       the root `scrollbar-color` resolves to primary; the drawer's webkit thumb is intact in Chrome; a tile and a choice-flow option both show their description
    Edge:        a block with `scrollbar-width:none` stays hidden; google-reviews with an empty colour keeps the native bar; a 200-character description is cut to 140
    Fail:        a snapshot thumb at 1.5:1 → the gate refuses
    Integration: a 120-character file name wraps in the preview and on the review step
```

```text
QA Gate — Wave 1
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    steps 1–3 must be complete
  Check:   read each builder's full diff (`git diff -- <owned paths>`) and apply their reported registry edits; then in PowerShell `cd plugins/sgs-blocks; vendor/bin/phpunit --filter "ContainerPinBelowHeaderTest|BuyboxStickyBarTest|FormFieldTilesDescriptionTest|ChoiceFlowQuestionDescriptionTest"; npx wp-scripts test-unit-js tests/js/container-pin-preview.test.js tests/js/buybox-sticky-bar.test.js tests/js/scrollbar-contract.test.js tests/js/font-smoothing.test.js tests/js/form-file-wrap.test.js; npm run build; npm run gate:fast; node scripts/audit-inline-styling.js --check; python scripts/check-snapshot-scrollbar-tokens.py --self-test`
  Pass:    every command exits 0; commit G1, G6, G4, G3, then G9 with G10, following the Orchestration "Commits" rule
  Fail:    /systematic-debugging on the red item; fix inline if under 10 lines, else re-dispatch that builder with the evidence
  Marker:  QA
```

```text
Step 4 — B4: G5 label end shapes and the typography clean-up
  Model:       sonnet
  Action:      dispatch the Builder brief + this step's Prompt line
  Files:       Orchestration B4
  Inputs:      Design G5
  Outcome:     `LabelEndShapeTest` and `label-end-shape.test.js` green, red under mutation; label's inspector shows one Typography panel
  Exec:        PARALLEL with steps 5, 5b
  Deps:        QA Gate wave 1
  Marker:      (none)
  Time:        40
  Tooling:     /sgs-wp-engine, phpunit, wp-scripts test-unit-js
  On-Fail:     as step 1; if the mask cannot be shown working in the test output, report before trying another technique
  Prompt:      "Your builder: B4. Build Design G5 (sgs/label end shapes from the shape-divider library, the shared border panel, and the removal of label's six duplicate typography controls; rotation is the existing Motion rest rotate). Do not change label's kses call: the main thread's rich-text rollout does it. Files you own, under plugins/sgs-blocks/: src/blocks/label/block.json, render.php, edit.js, style.css, EndShapePanel.js (new), end-shape-preview.js (new); includes/helpers-end-shape.php (new; report its require line for includes/render-helpers.php); src/utils/end-shape.js (new); tests/php/LabelEndShapeTest.php (new); tests/js/label-end-shape.test.js (new). Read includes/shape-dividers.php::sgs_get_shape_dividers and src/utils/shape-dividers.js; do not edit them."
  Test:
    Happy:       right end V notch, depth 45, 2px outline → the mask and the edge spans with the exact pinned strings
    Edge:        both ends shaped (a ticket); depth 10 and 150 stay inside the box
    Fail:        both ends Straight, or style None → no mask, no edge span; an unlisted shape reads as Straight
    Integration: a text gradient on the label still paints with an end shape
```

```text
Step 5 — B5: G7 highlight and G8 inline photo (universal rich-text formats)
  Model:       opus
  Action:      dispatch the Builder brief + this step's Prompt line
  Files:       Orchestration B5
  Inputs:      Designs G7, G8
  Outcome:     `InlineFormatsTest`, `rich-text-formats.test.js`, `survey-rich-text-formats.js --self-test` and `check-snapshot-inline-format-tokens.py --self-test` green, red under mutation; heading and text use the shared list; the route's `lint.test.mjs` refuses `style=` inside text
  Exec:        PARALLEL with steps 4, 5b
  Deps:        QA Gate wave 1
  Marker:      (none)
  Time:        60
  Tooling:     /sgs-wp-engine, /wp-hooks, /wp-block-development, /migration-method, phpunit, wp-scripts test-unit-js, node --test
  On-Fail:     as step 1
  Prompt:      "Your builder: B5. Build Designs G7 and G8 (universal rich-text formats with a site-wide look). Files you own: under plugins/sgs-blocks/: src/utils/rich-text-formats.js (new), src/blocks/extensions/inline-formats/index.js and its popover file (new), src/blocks/extensions/index.js, includes/helpers-inline-formats.php (new; report its require line for includes/render-helpers.php), includes/class-sgs-blocks.php, assets/css/inline-formats.css (new), src/blocks/heading/*, src/blocks/text/*, scripts/survey-rich-text-formats.js (new), scripts/data/rich-text-format-roles.json (new), scripts/snapshot_inline_format_tokens.py (new), scripts/check-snapshot-inline-format-tokens.py (new), the tests the design names, and theme/sgs-theme/theme.json's settings.custom.highlight and settings.custom.inlinePhoto defaults (B3 has finished with theme.json by now); at the repo root scripts/computed-route/lint.mjs and scripts/computed-route/tests/lint.test.mjs (then `cd scripts/computed-route && node --test tests/*.test.mjs && node lint.mjs && node capabilities.mjs --gate`; lint.mjs needs the README to list any new test). Follow .claude/skills/migration-method/SKILL.md for the detector: --survey first and paste it. Adopt the shared list in heading and text only; report the paste-ready lines for the 9 sites/*/theme-snapshot.json files and the push-theme-snapshot.py roster_guard line; the main thread runs the rollout over the other blocks."
  Test:
    Happy:       a coloured highlight and a photo in one heading render with class-only markup; the look follows the snapshot tokens
    Edge:        a palette slug with a space is ignored; a highlight over 3 words shows the editor notice
    Fail:        pasted `<span style="color:red">` → `style` stripped at render; a RichText with an inline list fails the detector
    Integration: `wp_filter_content_tags` adds srcset to the photo; the editor round trip keeps `wp-image-N`
```

```text
Step 5b — B8: G13 floating layer (sgs/decorative-image holds inner blocks)
  Model:       sonnet
  Action:      dispatch the Builder brief + this step's Prompt line
  Files:       Orchestration B8
  Inputs:      Design G13
  Outcome:     `DecorativeImageLayerTest` and `decorative-image-layer-preview.test.js` green, red under mutation; an image-only instance still renders the naked `<img>`
  Exec:        PARALLEL with steps 4, 5
  Deps:        QA Gate wave 1
  Marker:      (none)
  Time:        30
  Tooling:     /sgs-wp-engine, /wp-block-development, phpunit, wp-scripts test-unit-js
  On-Fail:     as step 1
  Prompt:      "Your builder: B8. Build Design G13 (sgs/decorative-image becomes the Floating layer: optional image, inner blocks, Width type, opacity default 100, the attrMap fix for rotation). Files you own, under plugins/sgs-blocks/: src/blocks/decorative-image/block.json, index.js, save.js (new), edit.js, render.php, style.css, editor.css, LayerImagePanel.js (new), layer-preview.js (new); tests/php/DecorativeImageLayerTest.php (new); tests/js/decorative-image-layer-preview.test.js (new). render.php: closures only, never a top-level function. No deprecated.js."
  Test:
    Happy:       a layer with no image holding a label renders the wrapper and the label, rotated, readable by screen readers
    Edge:        image plus content → content layered over the image; `auto` width fits the label on one line
    Fail:        no image and no content → empty output
    Integration: an existing image-only instance on the canary still validates in the editor
```

```text
QA Gate — Wave 2
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    steps 4, 5 and 5b must be complete
  Check:   read the three diffs in full; apply the registry fragments, both render-helpers.php require lines, B5's snapshot lines and roster_guard line; then in PowerShell `cd plugins/sgs-blocks; vendor/bin/phpunit --filter "LabelEndShapeTest|InlineFormatsTest|LabelDotTest|DecorativeImageLayerTest|ThemeSnapshotManifestTest"; npx wp-scripts test-unit-js tests/js/label-end-shape.test.js tests/js/rich-text-formats.test.js tests/js/decorative-image-layer-preview.test.js; node scripts/survey-rich-text-formats.js --self-test; python scripts/check-snapshot-inline-format-tokens.py --self-test; python scripts/push-theme-snapshot.py --client mamas-munches-redesign --target mamas-test --dry-run on a copy missing highlight.thickness must refuse; npm run build; npm run gate:fast; node scripts/audit-inline-styling.js --check`; and `cd scripts/computed-route && node --test tests/*.test.mjs && node lint.mjs && node capabilities.mjs --gate`; after the build, the framework DB row `sgs/decorative-image | rotation` reads css_property `transform`
  Pass:    all exit 0; commit G5, G7 with G8, then G13, following the Orchestration "Commits" rule; then the rich-text rollout: `node scripts/survey-rich-text-formats.js --survey`, `--fix`, `--check` (exit 0), read its full diff, rerun `npm run gate:fast`, commit it as its own commit; push
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
Step 7 — B7: G2 outlined lettering (shared typography rollout)
  Model:       sonnet
  Action:      dispatch the Builder brief + this step's Prompt line
  Files:       Orchestration B7, plus the registries Design G2 names
  Inputs:      Design G2; step 6 committed by the main thread
  Outcome:     `TypographyTextStrokeTest` and `typography-preview.test.js` green, red under mutation; `scripts/survey-typography-opt-in-props.js --check` and `--self-test` and `node scripts/audit-typography-attr-declarations.js --check` exit 0 after their fixers
  Exec:        SEQUENTIAL
  Deps:        step 6
  Marker:      (none)
  Time:        35
  Tooling:     /migration-method, /sgs-wp-engine, phpunit, wp-scripts test-unit-js
  On-Fail:     as step 1; if a fixer touches anything besides adding `showTextStroke` and its attributes, revert its output by hand and report
  Prompt:      "Your builder: B7. Build Design G2 in includes/helpers-typography.php, src/components/TypographyControls.js, src/utils/typography-preview.js and scripts/audit-typography-attr-declarations.js::SUFFIX_SHAPES (all under plugins/sgs-blocks/), with its tests. Then build scripts/survey-typography-opt-in-props.js (Design G2 'Reach'; follow .claude/skills/migration-method/SKILL.md): it must match both forms a block uses to pass the panel's options, JSX props (`<TypographyControls … showTextWrap>`) and option lists (`showTextWrap: true` inside a `targets` array, e.g. src/blocks/form/edit.js); run --survey and paste it, --fix, --check, --self-test; then `node scripts/audit-typography-attr-declarations.js --survey`, `--fix --apply`, `--check`. Wave 3 runs alone, so you may edit the shared registries the design names and every block.json and edit.js the fixers touch. Report the number of targets and blocks changed."
  Test:
    Happy:       2px desktop and 1.5px mobile outline on sgs/text
    Edge:        an outline with no colour uses the text colour; an option-list target (form) gains the prop
    Fail:        nothing set → no `text-stroke`
    Integration: every rolled-out block's inspector shows the outline fields (`check-dead-controls` green)
```

```text
QA Gate — Wave 3
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    steps 6–7 must be complete
  Check:   read both diffs (B7: the helper, control and twin in full, and 5 sampled generated block.json changes); in PowerShell `cd plugins/sgs-blocks; vendor/bin/phpunit --filter "LinkUnderline|TypographyTextStroke"; npx wp-scripts test-unit-js tests/js/link-underline.test.js tests/js/typography-preview.test.js; npm run build; npm run gate:full; node scripts/audit-inline-styling.js --check`; and from the repo root `python scripts/check-no-client-names.py --check`
  Pass:    all exit 0; commit G11 (after step 6, before step 7 starts), then G2, following the Orchestration "Commits" rule
  Fail:    as wave 1
  Marker:  QA
```

```text
Step 8 — Deploy to the canary
  Model:       inline
  Action:      message peers first; `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` (motion QA tier none: no motion change). Push the Indus snapshot (`python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client indus-foods --target u945238940@141.136.39.73 --target-domain lavender-dinosaur-183533.hostingersite.com`) only after the Indus review session says go.
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
  Action:      /qc: build test pages with `scripts/wp-build-page.js` from JSON trees saved under `.claude/qa/control-gaps/` (never a motion fixture page); run every Design's "Live" check at 375, 768 and 1440 in headed Chrome (channel chrome), plus the editor canvas for G2, G5, G7, G8, G10, G11, G13; on Windows Chrome the scrollbar arrows (page keeps them, inner scrollers none); cropped screenshot pairs against the draft for G5, G7, G8, G13 (the Mama's hero collage); show Bean the pairs (FP-13). Delete the test pages in the same command that finishes with them.
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
  Action:      in each owning spec, change the FR's `Status: not built` line (added 2026-10-19) to `Status: built` with the commit and the proving command: Spec 02 FR-2-1 (G1), FR-2-2 (G5), FR-2-3 (G6), FR-2-4 (G7), FR-2-5 (G8), FR-2-6 (G13); Spec 32 FR-32-23 (G2), FR-32-24 (G11), FR-32-26 (G3); Spec 01 FR-1-1 (G4); Spec 04 FR-4-1 (G9), FR-4-2 (G10). Put the FR IDs in the audit's "Real control gaps" table; add `scrollbar`, `highlight` and `inlinePhoto` rows to Spec 32 §14.3's `settings.custom` key table (consumers `theme/sgs-theme/assets/css/scrollbars.css` and `plugins/sgs-blocks/assets/css/inline-formats.css`; gates `check-snapshot-scrollbar-tokens.py` and `check-snapshot-inline-format-tokens.py`); update the touched blocks' CLAUDE.md files; `.claude/plans/2026-10-11-spec48-indus-build.md` (the timeline years' outline colour follows the current card: a Current state owned by the pinned timeline build); `.claude/plans/2026-10-12-clone-coverage-foundation.md` (the route's writer and detector for the highlight and inline-photo shapes, an absolutely positioned non-image draft node routed to a Floating layer, and every new attribute); `.claude/LEDGER.md`; and `.claude/prompts/After control gaps - route calibration and gradient seeder.md` (the next route session's prompt, asked for by the route session): fill its "STATE AFTER THE CONTROL-GAPS BUILD" block (which sites run which commit, whether indus-test has this build, the commit the DB was reseeded at, every attribute added, renamed or removed, decorative-image's inner blocks needing a calibration fixture, the changed gates incl. inspector-scan rule 24, anything left open) and correct anything this build made stale (any *Gradient css_property or `behavioural-analyser/` seeder change); `check-md-wrap.py --check`; tell Bean it is ready. Run /writing-clearly-and-concisely over the new help texts.
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
- **Decision:** how the ribbon tag's border meets the V-cut.
  - **Options:** the fill and a real CSS border on one masked layer, so the cut removes both / an SVG-mask ring stroked along the cut / an inset clip polygon
  - **Recommendation:** one masked layer with the real border (Bean, 2026-10-20, after reviewing the stroked ring live against the draft)
  - **Why:** it is what the draft paints (`border:2px solid` then `clip-path`): no line along the cut, and straight sides that Chrome snaps as one crisp CSS border; the stroked ring mixed device-snapped straight edges with anti-aliased SVG diagonals, which read as blurry and patchy, and it drew a line the draft does not have.
  - **Cost of wrong choice:** none known; a gradient border is a `border-image` with square corners under a radius.
  - **Who decides:** Bean (decided)
- **Decision:** the site-wide scrollbar default.
  - **Options:** brand primary thumb with the page scrollbar included / a neutral grey / the browser default unless the snapshot sets one
  - **Recommendation:** brand primary, page included, width left at auto
  - **Why:** Bean asked for scrollbars linked to the brand presets across the whole site; primary measures 4.84:1 on the default surface.
  - **Cost of wrong choice:** a client whose primary is pale gets a weak thumb: the snapshot gate refuses under 2:1 (Bean's floor; the browsers' own bars sit below 3:1).
  - **Who decides:** Bean (asked for it)

- **Decision:** how the ribbon tag is built (Bean, 2026-10-19).
  - **Options:** A label with end shapes from the divider library / B a decorative image of the shape with text on top / C container side dividers
  - **Recommendation:** A
  - **Why:** reuses the shared border panel and the divider shape library; the shape grows with the text and the colours stay editable; the divider paints a colour, which over a photo shows a wedge instead of the photo.
  - **Cost of wrong choice:** B bakes colours into a file and keeps two blocks aligned by hand; C is the most work for a small tag.
  - **Who decides:** Bean (decided A, and accepted the five end-shape recommendations: the painted part of a tile is what stays, depth as a percentage of height, six shapes, a px outline, the floating layer's opacity default 100 and Width type)
- **Decision:** how anything floats over a section (Bean, 2026-10-19).
  - **Options:** the decorative image block gains inner blocks / a universal "Float over" extension on every block / positioning on the label only
  - **Recommendation:** the decorative image block gains inner blocks (Bean's proposal)
  - **Why:** it already owns per-device position, width, rotation, layer order, opacity, flip, fade and hide; composition makes any block float with no change to 80 blocks.
  - **Cost of wrong choice:** none found; the extension remains possible later.
  - **Who decides:** Bean (decided)
- **Decision:** where the highlight and inline photo are available and where their look is set (Bean, 2026-10-19).
  - **Options:** every SGS text element with a site-wide look in the snapshot / heading and text only with per-block settings
  - **Recommendation:** every SGS text element through one shared toolbar list and detector; the look in `settings.custom.highlight` and `settings.custom.inlinePhoto`; per-highlight colour from the palette by class
  - **Why:** universal like bold, italic and link; no per-block attributes to multiply; the button label and the label block stay narrower (a 44px target; 12 to 14px tag text).
  - **Cost of wrong choice:** a client wanting a different stripe per block cannot have it until per-block overrides are added.
  - **Who decides:** Bean (decided universal; accepted the per-field lists)
- **Decision:** scrollbar arrow buttons and contrast floor (Bean, 2026-10-19).
  - **Options:** platform arrows on the page and none inside / never / always; a 3:1 or 2:1 floor
  - **Recommendation:** platform arrows on the page, none on inner scrollers; a 2:1 floor
  - **Why:** the page should feel native while inner panels stay slim; the browsers' own bars sit below 3:1, and Bean uses WCAG to secure good UX.
  - **Cost of wrong choice:** a reviewer applying WCAG 1.4.11 literally would ask 3:1 of a restyled bar; the spec and this plan record the ruling so it is not reverted.
  - **Who decides:** Bean (decided)
- **Decision:** the one-line cut on the phone bar subtitle.
  - **Options:** a typography control on every text block / a default of the phone bar
  - **Recommendation:** a default of the phone bar (in G6)
  - **Why:** the draft's only use is the bar subtitle, which the buybox draws itself; the read-more block cannot clamp without its toggle.
  - **Who decides:** Bean (accepted)

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

Empty: every entry closed on 2026-10-20.

- The sparkle's easing: the Additional CSS loop runs `linear` over stops sampled from the draft's whole-cycle curve, within 0.67deg of the draft live (Spec 32 FR-32-20 item 7).
- Per-property button easing: `hover-easing-colour` and `hover-easing-shadow` (Bean chose the two overrides), live on mamas-test with the draft's timing (Spec 32 FR-32-9, FR-32-19).
- The route writes a draft's endless keyframe loop into the Additional CSS box (Spec 48 FR-48-78).
- `product-card/style.css`: the swatch hit area holds its `max()` in a custom property, so the build prints no postcss-calc warning.
- The three live checks pass (`.claude/qa/control-gaps/results-2026-10-20.md`, "Parking-lot live checks"); the photo popover, which Escape could not close, was fixed on the way (`532181577`).
- `ResponsiveLogoTest`: the test helper hands `render.php` a null `$block`, so it raises no warning.
- The 59 unrouted text-outline attributes: each is claimed in its block's element manifest, all 408 route after the reseed, and `check-text-stroke-routing.py --check` (fast tier) keeps it so.

Owned elsewhere: the route's writer and detector for the new attributes and the two inline formats (`plans/2026-10-12-clone-coverage-foundation.md`, step 10); the Indus timeline years' outline following the current card (`plans/2026-10-11-spec48-indus-build.md`, step 20b).
