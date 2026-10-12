# A single motion system for SGS: research report, revision 3 (12 Oct 2026)

Durable home of the research behind Phase 0, step 0.2 of `.claude/plans/2026-10-12-clone-coverage-foundation.md` (the motion redesign) and the Spec 38 rewrite. Revision 3 applies the quality gate's recommendations (gap analysis of 12 Oct 2026, graded C 3.25): it adds the 22 special effects, three panels per element, the motion tokens that already exist, the database mapping and the hover-side migration.

## Bottom line

1. Build one motion model with three motion types, each with its own panel on every compatible block: Hover, Entrance and reveal, Effects. An element can carry one of each at the same time.
2. Every animated element stores its own values and its own delay. Nothing in the browser works out delays. A container helper writes the delays once.
3. Most motion needs no JavaScript. Hover and focus are plain CSS, page-load entrances are plain CSS, and only below-the-fold reveals need a few lines of script. GSAP is used only for Tier G effects that are impossible any other way.
4. Build on the motion tokens the theme already has (`theme.json` `settings.custom`: durations, easings, transitions, entrance defaults, used about 144 times). Keep their names; extend only where needed. The earlier claim that the theme had shadow entries only was wrong.
5. Firefox does not yet run scroll-linked CSS effects in its stable release, so those effects need a fallback. This is settled, not open.
6. The client sees a simple layer (pick an effect, a trigger, an intensity) and a "Fine-tune" layer with every value. Effect types are presets that write the values underneath.
7. Seven decisions are yours, ranked in the table below. My recommendations are marked.

## The model in three sentences

An effect (such as "fade up") is a preset: a starting point that writes real values onto the block. Each element stores its own values for each motion type, including its own delay, and the automated cloning tool writes those values straight from the Claude Design draft into all three panels. A container's "stagger" control is only a helper: it writes a delay onto each child once, and the browser never recalculates it.

## 1. Decisions for you (ranked)

| Rank | Decision | Why it ranks here | Recommendation |
|---|---|---|---|
| D1 | Keep the current motion token names, or rename them | About 144 uses depend on it; it must be settled before anything is built on the tokens | Keep |
| D2 | What happens to a block when its preset is edited later | Decides how the stored data is shaped | C: stamped copy pointing at tokens |
| D3 | What Firefox shows for scroll-linked effects | Stable Firefox cannot run them, so something must appear | One small script driver everywhere (changed from revision 2, see D3) |
| D4 | Token personality: one bundle or two | Token names are hard to change later | Two bundles (calm and lively) |
| D5 | What the editor shows while you build | An element that starts invisible is hard to click | Final state plus Replay |
| D6 | Custom-selector escape hatch for the cloning tool | May be needed for draft effects the part list cannot name | Scoped to the block root, only if proven needed |
| D7 | Stagger cap for long loops | Item 20 must not wait 20 steps | Restart per visual row, with a maximum as a safety net |

### D1. Keep the current motion token names, or rename them?
Why now: the theme already defines motion tokens (section 6) and about 144 places read them as `--wp--custom--duration--*`, `--wp--custom--easing--*`, `--wp--custom--transition--*` and `--wp--custom--entrance--*`. The first draft of this report proposed a second set with new names, which would have run two token systems side by side.
- **A. Keep the names, extend where needed.** Benefit: nothing existing breaks, no sweep, presets point at what is already there. Drawback: the names (`medium`, `extra-slow`) are size-based rather than intent-based, which is slightly less self-explanatory.
- **B. Rename to intent-based names (for example quick, gentle) with a sweep of about 144 uses.** Benefit: clearer names, in line with Open Props and Web Awesome (Appendix D). Drawback: a sweep across plugins and theme, a risk of missed uses, and no change a client would ever see.
- **Recommendation: A.** The framework is pre-production, so a rename costs little, but it buys nothing visible. Extend with distance and spring tokens only.

### D2. What happens to a block when its preset is edited later?
Why now: it decides how the stored data is shaped, so it must be settled before building.
- **A. Live link.** The block stores the preset name plus only what you changed. Benefit: editing a preset restyles the whole site. Drawback: needs stable field IDs, preset version numbers and a drift checker; blocks can change in ways nobody expects.
- **B. Stamped copy.** The preset writes every value onto the block. Benefit: explicit and predictable, and it matches your rule that every element stores its own values. Drawback: editing a preset never reaches existing blocks.
- **C. Stamped copy that points at motion tokens.** Values are copied, but each one points at a named setting (for example "fast"). Benefit: you can still retune the whole site by changing the token. Drawback: editing a preset itself does not reach existing blocks.
- **Recommendation: C.** It keeps blocks explicit and predictable, and site-wide retuning works through the existing tokens.

### D3. What does Firefox show for scroll-linked effects?
Why now: Firefox's stable release cannot run them (section 4), so something must appear instead. Two precedents already exist in the repo and disagree: the timeline progress line (`.claude/specs/38-SGS-MOTION-SYSTEM.md::FR-38-35`) uses one script driver on every browser with no native scroll-timeline branch, while the parallax and media motion in `plugins/sgs-blocks/assets/css/extensions.css` use native CSS scroll timelines behind an `@supports (animation-timeline: scroll())` check.
- **A. One small script driver on every browser (the FR-38-35 precedent).** One plain-JS driver writes a registered custom property (0 to 1) as the element scrolls, and CSS reads it; there is no native branch to keep in sync. Benefit: identical on every browser, one strategy, already proven in the framework. Drawback: a small scroll listener on pages that use these effects.
- **B. Native CSS where supported, static final state elsewhere (the current parallax pattern).** Benefit: no script. Drawback: Firefox visitors see no motion, and it is a second strategy beside FR-38-35.
- **C. Native CSS where supported, a simple in-view reveal elsewhere.** Benefit: some motion remains everywhere. Drawback: two code paths and a visibly different effect in Firefox.
- **D. Load GSAP for those effects.** Benefit: identical everywhere. Drawback: heavy; against the rule that GSAP is only for Tier G effects nothing else can do.
- **Recommendation: A for new scroll-linked effects.** Revision 2 recommended C. The in-repo precedent changes the answer: A gives one strategy instead of two, and the driver is small plain JS. The existing parallax can stay as it is until the redesign folds it in. This does not change the Tier G boundary: a single-property fade or translate scrub is Tier V, and multi-keyframe, staggered or sequenced scrubs are Tier G (`FR-38-7`).

### D4. Token personality
Why now: tokens are the named settings that presets point at; their names are hard to change later.
- **One bundle.** Benefit: simpler. Drawback: one mood for every client.
- **Two bundles, calm and lively.** Benefit: a client picks a personality; precedent in IBM Carbon's productive and expressive sets [S27]. Drawback: twice the values to maintain.
- **Recommendation: two.** Implemented as two value sets for the same existing token names, chosen per client in the snapshot.

### D5. What the editor shows while you build
Why now: an element that starts invisible is hard to click on in the editor.
- **Final state plus a Replay button.** Benefit: always editable, and you can still see the motion on demand. Drawback: one extra click to preview.
- **Play when the block is selected.** Benefit: automatic. Drawback: distracting while editing.
- **A "disable in editor" switch.** Benefit: simple; GenerateBlocks did this [S14]. Drawback: no preview at all.
- **Recommendation: final state plus Replay.**

### D6. A custom-selector escape hatch for the cloning tool
Why now: the cloning tool may meet draft effects that target something the normal part list cannot name.
- **None.** Benefit: safest. Drawback: such effects are dropped.
- **Scoped to the block's own root.** Benefit: works inside loops and stays contained. Drawback: a typed selector is a way to write fragile rules.
- **Free selectors.** Benefit: anything is possible. Drawback: Bricks shows these fail inside loops [S19].
- **Recommendation: scoped to the root, and only if the cloning tool proves it needs one.**

### D7. Stagger cap for long loops
Why now: a list of 20 items must not make item 20 wait 20 steps.
- **A maximum total delay.** Benefit: simple. Drawback: late items all arrive together.
- **Restart the delay at each visual row.** Benefit: a new row of cards staggers afresh, so waits stay short. Drawback: needs to know the column count per device.
- **Recommendation: restart per visual row, with a maximum as a safety net.**

Not owner decisions, settled below: the sibling-index() CSS function (section 9), the animation engine (section 5) and how rules are emitted (section 3).

## 2. What the client sees: three panels per element

Each compatible block gets three separate panels. An element can carry an entrance, a hover effect and an effect at once, and each is customised on its own. Each panel has a simple layer that is always visible and a Fine-tune layer that holds every value. Intensity maps to tokens, not to loose numbers. Each changed field shows a "Customised" tag and a "Reset" control. The timeline never appears in the simple layer.

```
Hover   (one per element; only on devices that can hover)
  Effect      [ Lift v ]   (live thumbnail beside each choice)
  Intensity   ( Subtle ) ( Standard ) ( Bold )
  > Fine-tune: distance, scale, rotation, image zoom, grayscale, border accent,
               duration, easing, per-device values
               (colour and shadow VALUES are set in the colour and shadow controls, not here)

Entrance and reveal   (one per element)
  Effect      [ Fade up v ]
  Trigger     ( Page load ) ( Scroll into view )
  Intensity   ( Subtle ) ( Standard ) ( Bold )
  [ Replay ]   Note: reduced-motion visitors see no movement.
  > Fine-tune: distance, duration, delay, easing, start and end values, per-device values
               On a container, also: Stagger helper
                 Step between children   [ 80 ms ]
                 Order   ( Row first ) ( Column first ) ( From centre ) ( Reverse )
                 Maximum total delay      [ 600 ms ]
               The helper writes a delay onto each child once; children can then be edited individually.

Effects   (one per element; Tier V, W, H and G effects)
  Effect      [ Magnet v ]   (only effects valid for this block are listed)
  Trigger     (offered triggers come from the effect's own list)
  Intensity   ( Subtle ) ( Standard ) ( Bold )
  > Fine-tune: the effect's own values (strength, radius, speed, density, colours from the palette), per-device values
```

The stagger helper lives only on containers and only writes values. Its last settings are kept so it can be re-run, and it is never read when the page renders.

## 3. Current mechanism and migration

### Entrance side (verified in the repo)
- `plugins/sgs-blocks/assets/js/animation-entrance-timing.js::staggerOffset` computes each delay in the browser: the child's index, capped at `DEFAULT_STAGGER_MAX` (7), multiplied by the step. Settings are `sgsAnimationStagger`, `sgsAnimationStaggerChildren` and `sgsAnimationStaggerMax`, serialised as data attributes by `plugins/sgs-blocks/includes/animation-stagger.php`.
- Blocks declare which children animate through `block.json::supports.sgs.animationItems` (read in `animation-stagger.php`).
- Playback uses the browser's Web Animations API (WAAPI, the built-in way for script to run animations) with `fill: 'backwards'` in `assets/js/animation-observer.js`, and an `sgs-entrance-pending` flag marks elements that have not yet entered (referenced in `plugins/sgs-blocks/assets/css/extensions.css`, `assets/js/animation-observer.js` and `includes/animation-attributes.php`).
- The per-element entrance settings today are `sgsAnimation`, `sgsAnimationDelay`, `sgsAnimationDistance`, `sgsAnimationDuration`, `sgsAnimationEasing`, `sgsAnimationStart` and `sgsAnimationTrigger` (framework DB `block_attributes`).
- The "automatic 100ms spacing" described in the council review: not separately verified; `staggerOffset` multiplies by a stored step.

### Hover side (verified in the framework DB and `plugins/sgs-blocks/src/blocks/extensions/hover-effects/`)
Hover settings are scattered across several independent controls. Block counts below come from the framework DB on 12 Oct 2026; do not copy them into other documents. Query: `SELECT attr_name, COUNT(DISTINCT block_slug) FROM block_attributes WHERE attr_name IN (...) GROUP BY attr_name` (use `/sgs-db`).

| Today's setting | Blocks (12 Oct 2026) | Becomes |
|---|---|---|
| `sgsHoverDuration`, `sgsHoverDurationMs`, `sgsHoverEasing`, `sgsHoverEasingCustom` | 8 | Hover panel Fine-tune: duration and easing |
| `bgHoverZoom`, `bgHoverZoomScale`, `bgHoverZoomDuration`, `bgHoverZoomEasing`, `bgHoverZoomEasingCustom` | 7 | Hover panel: background zoom effect with its own duration and easing |
| `sgsHoverZoom`, `sgsHoverZoomStyle`, `sgsHoverZoomDuration`, `sgsHoverImageZoom` | see DB | Hover panel: image zoom |
| `shadowLiftOnHover` | 22 | Hover panel: lift effect (the shadow VALUE stays in the shadow control) |
| `sgsHoverShadow`, `sgsHoverShadowCustom` | 8 | Hover panel: the effect toggle moves; the shadow value stays in the shadow control |
| `scaleHover`, `sgsHoverScale`, `sgsHoverScalePreset` | 11 (`scaleHover`) | Hover panel: scale |
| `effectHover` | 7 | Hover panel: effect preset |
| `sgsHoverLift`, `sgsHoverIndent`, `sgsHoverOpacity`, `sgsHoverGrayscale`, `sgsHoverBorderAccent` | see DB | Hover panel Fine-tune values |
| `sgsHoverTilt3D` (boolean) | see DB | Hover panel: tilt. Its angle and perspective limits are fixed in `plugins/sgs-blocks/assets/css/extensions.css` (`.sgs-has-tilt-3d`); they become stored values. The exact limits were not re-read in this pass |

Colour and shadow hover VALUES are compliant per-element styling states and stay where they are; the redesign owns the effects and all hover transition timing. A WP-CLI sweep converts stored settings into the new per-element values with no legacy fallback (project rule R-31-14).

### Entrance migration
What stays: WAAPI or CSS playback, and the pending flag if still needed. What goes: every runtime delay computation (`staggerOffset`, the cap of 7, group-index lookups). A WP-CLI sweep converts stored stagger settings into a stored delay on each child.

### Making "every element stores its own delay" buildable
- **Per device.** Delays are stored per element and per device with the existing device lock: Desktop unsuffixed, then Tablet and Mobile, with tiers at 768 and 1024 (device-lock convention; exact attribute suffixes unverified in this pass).
- **Emission.** Each delay is written as a scoped custom-property rule inside a media query through the shared CSS collector, with no inline styles (`.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md::FR-32-4`; the audit command is `audit-inline-styling.js --check`).
- **Repeated items from one template.** `sgs/post-grid` has its own loop index (`plugins/sgs-blocks/src/blocks/post-grid/render-interior.php::$card_params['_card_index']`) and writes the delay itself. Core post-template and the WooCommerce product-template give no per-item index (post-template: Gutenberg source, reviewer finding, not re-read here), so a `render_block` filter emits one scoped rule per item with the server-written value, the pattern in `FR-32-4a` (reference: `plugins/sgs-blocks/src/blocks/social-icons/render.php::$scoped_css`). Enhanced pagination and load-more re-render on the server, so the index restarts per page.
- **Keeping delays correct while editing.** The container helper rewrites every child's delay when a child is inserted, moved, removed or duplicated (a duplicate would otherwise copy its source's delay). A drift gate compares stored delays with block order.

### Failure modes and mitigations
| Failure | Plain-English effect | Mitigation |
|---|---|---|
| Batch vs index | In a long loop, item 20 waits 20 steps | Helper and server index restart the delay per visual row per device, with a maximum (D7) |
| Scroll-driven reveals | A delay in milliseconds means nothing when motion follows scroll position | Stagger applies to time-based reveals only; scroll-linked effects get no stagger. A staggered scrub is Tier G per Spec 38 `FR-38-7` |
| Synced patterns and template parts | Every use of the pattern shares one stored delay | Acceptable: the pattern is one design; override by detaching |
| Per-device delay vs container width | Delays follow the screen width, but column count can follow the container's width | Accepted risk: the helper writes delays per device from the viewport tier, and the drift gate flags a mismatch; revisit if a real case appears |
| Entrance and hover fight on one element | A card still held by its entrance cannot lift on hover, or one timing overwrites the other | Composition rule (section 5) |

## 4. Browser support

MDN browser-compat-data, checked 12 Oct 2026: Firefox `animation-timeline` is preview (Nightly) only; caniuse's Firefox 160 is a future release. So scroll-driven CSS animations run in Chrome and Edge 115+ and Safari 26+, and not in stable Firefox [S28][S29][S30][S31]. Any native use stays behind `@supports`, and D3 decides the fallback. Share figure: cite browser-compat-data rather than the single-source 87.84%.

Spec 38 `FR-38-7` (read 12 Oct 2026): a single-property fade or translate scrub stays Tier V; Tier G owns multi-keyframe, staggered or sequenced scrubs (`.claude/specs/38-SGS-MOTION-SYSTEM.md`).

## 5. Runtime ladder, tiers and composition rules

Hover and focus are CSS transitions on custom properties. Hover effects and reveals are CSS or plain JavaScript first; GSAP only for what is impossible otherwise (pinning, horizontal pinned tracks, complex scrubbed timelines). The ladder maps onto Spec 38's existing tiers: V (CSS and plain JS, the default), G (GSAP, conditionally loaded, a closed capability list), H (helper libraries on a closed list, such as Lenis and Lottie) and W (WebGL, a closed list with its own 120 KB allowance on Tier W pages only). Tier W is not a rung of the ladder; it is a separate substrate for a closed list of effects.

| Ladder row | Mechanism | Spec 38 tier | JS added |
|---|---|---|---|
| Hover, focus, state | CSS transitions | V | 0 kB |
| Page-load entrances above the fold | Pure CSS, `@starting-style` plus `transition-behavior: allow-discrete` (Baseline since Aug 2024 [S32]) | V | 0 kB |
| Springs | CSS `linear()` easing generated from tokens | V | 0 kB |
| Below-the-fold reveal | One IntersectionObserver (browser feature that reports when an element enters view) setting a data attribute; CSS transitions play the reveal | V | about 1 kB (estimate) |
| Single-property scroll scrub | One script driver writing a registered custom property (D3 option A, FR-38-35 pattern) | V | small, shared |
| Multi-keyframe sequences CSS cannot express | The existing WAAPI entrance code, kept and extended, minus every delay computation | V | already shipped |
| Sequences beyond that, only if needed | Motion mini, about 2.3 kB (vendor figure taken from a reviewer, not re-measured) [S6] | V | about 2.3 kB |
| Pinned, scrubbed, split text, Flip, Draggable, DrawSVG, MorphSVG | GSAP and its plugins, conditional per page | G | about 23 kB core (vendor figure) [S6] |
| Smooth scrolling, Lottie | Closed-list helper libraries | H | per library |
| Surface treatment, wave gradient, generative background | WebGL, closed list | W | within the Tier W allowance |

All Tier V and G rows sit inside the 50 KB-per-page budget except where a page uses Tier G or W effects, which are bounded by the conditional-loading rule.

### Composition rule: entrance, hover and effects on one element
- An entrance animates `opacity` and the individual `translate` property, and is never held as an end state. It plays with `fill: 'backwards'` (as `assets/js/animation-observer.js` does today), so once it ends the element returns to its normal styles and hover is free to act. A held `translate` also turns the element into the containing block of absolutely positioned children (workspace lesson: a held animation end state makes a containing block).
- Hover uses its own properties or the individual transform properties (`scale`, `rotate`, and a different axis or variable for lift) with its own transition timing, so an entrance and a hover never write the same property.
- Each motion type owns its own timing variables; none shares a transition list with another.
- The gap analysis inferred this conflict from the design and did not reproduce it; the rule is a precaution that costs nothing.

### Hover gating
Hover motion sits inside `@media (hover: hover) and (pointer: fine)`, so touch screens never show a stuck lifted state after a tap. Keyboard focus gets the same treatment through `:focus-visible` and `:focus-within` where the effect is a state change. Touch devices that need the information the hover revealed must have it visible by default (degrade to more content, never less).

### Above-the-fold and reduced motion
No review checked effect on Largest Contentful Paint (LCP, the time until the biggest visible element appears). Rule: the LCP element gets no opacity-0 entrance by default. Transform and opacity run on the compositor; use will-change sparingly [S33][S31]. Reduced motion: decorative motion sits inside `prefers-reduced-motion: no-preference`; script needs a change listener; prefer motion-free alternatives to shrinking durations [S34][S35]; under reduced motion stored delays are zeroed too, so nothing waits for no visible reason; WCAG 2.3.3 is AAA [S36]. Each `fx_effects` row already records its reduced-motion behaviour (`simplify` or `suppress`).

## 6. Tokens and storage

### Tokens that already exist
- `theme/sgs-theme/theme.json` `settings.custom` holds motion tokens: `duration` (instant, fast, medium, slow, extra-slow), `easing` (default, ease-out, ease-in, spring, linear), `transition` (fast, medium, slow) and `entrance` (distance, duration, easing). They are read as `--wp--custom--duration--*`, `--wp--custom--easing--*`, `--wp--custom--transition--*` and `--wp--custom--entrance--*` about 144 times across `plugins/` and `theme/` (counted by the main session on 12 Oct 2026), including the entrance script. Revision 2 wrongly said `settings.custom` had shadow entries only.
- **Build on these.** Keep the names (D1). Extend only where a gap is proven: a distance scale for hover and entrance travel (for example sm, md, lg), and further springs. Per-client personality (D4) is two value sets for the same names, deployed through the existing snapshot path (`sites/<client>/theme-snapshot.json`, `push-theme-snapshot.py`).
- **Stale database table.** The framework DB `animation_tokens` table holds 8 rows (fade-in, fade-out, slide-up, zoom-in, bounce, pulse, spin, fade-up), each with keyframes, a fixed duration and easing as literal text, and a `used_by` list. They are keyframe presets, not tokens, and their durations and easings duplicate values the theme tokens already define. Reconcile: the keyframe presets are re-seeded as DB-seeded Entrance presets (section 6, storage-to-DB mapping) that point at the theme tokens instead of literal values, and the table is then retired. Only `fade-up` is in use (8 blocks).
- No colour or shadow tokens (out of scope). Standards context: W3C DTCG 2025.10 (not a W3C Standard) defines duration, cubicBezier and transition shapes [S23]; Style Dictionary's DTCG duration handling is an open PR [S24]; Material 3 and Carbon scales are the reference [S25][S26][S27].
- **Unverified.** "Core has no state model for hover" is a reviewer claim that was not checked in the repo; it does not affect the design, because SGS's own model is chosen either way.

### Storage object
One key per motion type (hover, entrance, effect), registered once as a block support; targets come from `supports.sgs.elements` (every block in the framework DB declares `elements`; query it rather than caching a count). One JSON Schema is shared by the cloning tool, the PHP renderer and the inspector. Unsourced attributes serialise into the block comment with no documented size limit [S39]. On the container, `stagger` holds only the helper's last settings so it can be re-run; it is never read at render time. The shape is finalised once D2 is decided.

### Storage-to-DB mapping (rule R-31-1: DB-first, no hand-written lists)
- **Per-element values become `block_attributes` rows.** Each stored motion value is one row with `css_property` (the property it drives, or the custom property it sets, such as a delay or duration variable), `css_state` (rest, hover or in-view), `css_tier` (the device tier) and `css_element` (the part it targets, from the declared part list). 1,035 object-typed attributes already carry a `css_property`, so object storage is routable; the motion object follows the same convention. The cloner, the calibration and the gates read these rows, so Phase 1's coverage test can see every motion setting.
- **Effects stay in `fx_effects`.** Each effect's tier, scope, triggers, pins and picker membership already live there (section 7). The Effects panel lists only rows whose scope and requirements fit the block.
- **Presets are DB-seeded.** The effect types offered in the Hover and Entrance panels (lift, zoom, fade up, slide, and so on) are rows seeded by `sgs-update-v2.py` from one source (the reconciled `animation_tokens` successor), each row listing the values it writes. The inspector and the cloner read the same rows; neither holds a hand-written list. Reference data is seeded through `plugins/sgs-blocks/scripts/dbschema/seed_reference_data.py`.
- **Tokens are read from `theme.json`**, not copied into the DB; presets reference token names.

### Editor
Final state plus Replay (D5); reduced motion honoured in the editor; the iframe canvas needs assets loaded inside it [S40]; Spectra previews before applying [S15].

### Editor budget (acceptance test)
Measure keystroke latency and memory on a 200-block page before and after the change. A forum anecdote about another plugin's editor memory is the motive for the test, not evidence.

## 7. The 22 special effects (`fx_effects`) in the three-panel model

The framework DB table `fx_effects` holds 22 rows (queried 12 Oct 2026; re-query rather than copying this count: `SELECT effect, tier, scope, triggers, pins, in_picker FROM fx_effects`). Revision 2 did not mention them. The rule for all of them: they belong to the Effects panel (or, where noted, Hover or Entrance), and their parameters become per-element stored values written by the effect type as a preset, exactly like hover and entrance. The grouping below is a recommendation for the Spec 38 rewrite.

| Effect | Tier | Scope | Triggers | Pins | In picker | Panel and model |
|---|---|---|---|---|---|---|
| `cursor-field` | V | block | hover | no | yes | Effects. Modular per-variable: strength, radius, colours (from the palette) as stored values |
| `magnet` | V | block | hover | no | yes | Effects, or Hover as an effect type. Modular: pull strength and radius |
| `particles` | V | block | hover | no | yes | Effects. Modular: density, size, speed, colours |
| `grid-dots` | V | block | hover | no | yes | Effects. Modular: spacing, size, response radius |
| `carousel-loop` | V | block | load | no | no | Effects (track blocks only). Modular: speed, direction, pause on hover; not in the picker because it belongs to the carousel's own controls |
| `surface-treatment` | W | block | load | no | yes | Effects (images). Modular: treatment type, intensity |
| `wave-gradient` | W | block | load | no | yes | Effects (surfaces). Modular: speed, amplitude, palette colours |
| `generative-background` | W | block | load | no | yes | Effects (surfaces). Modular: seed, speed, density, palette colours |
| `scrub` | G | block | scroll, load, hover | no | yes | Effects. Tier G stays; its start, end and ease are stored per-element values. A single-property scrub is Tier V under `FR-38-7` and moves to the D3 driver |
| `pin-scrub` | G | block | scroll | yes | yes | Effects. Tier G stays; scroll length and pin position stored |
| `horizontal-panel` | G | block | scroll | yes | yes | Effects. Tier G stays; track length and speed stored (the pinned horizontal track in FR-48-77) |
| `split-reveal` | G | block | scroll, load, hover | no | yes | Effects, or Entrance for text. Tier G stays (SplitText); split unit, stagger step and order stored, the stagger written by the same helper vocabulary |
| `scramble` | G | block | scroll, load, hover | no | yes | Effects (text). Tier G stays; characters and duration stored |
| `flip` | G | paired | scroll | no | no | Effects. Tier G stays; internal use, not offered in the picker |
| `draggable` | G | block | load | no | no | Effects. Tier G stays; not offered in the picker |
| `draw` | G | element | scroll, load, hover | no | yes | Effects (SVG). Tier G stays; duration, start and end stored |
| `morph` | G | element | scroll, load, hover | no | yes | Effects (SVG). Tier G stays; duration and easing stored |
| `motion-path` | G | element | scroll | no | yes | Effects (SVG). Tier G stays; path reference and progress range stored |
| `image-sequence` | G | block | scroll | no | no | Effects. Tier G stays; not offered in the picker |
| `scroll-smoother` | H | site | scroll | no | no | Site-level only (SGS Motion settings page). Not per-element |
| `page-transitions` | V | site | load | no | no | Site-level only. Not per-element |
| `lottie` | H | element | load, visible, hover, scroll | no | no | Effects (Lottie element). Closed-list helper; the file and playback trigger are stored values |

Summary: 8 effects become modular per-variable Effects-panel effects in Tier V or W (`cursor-field`, `magnet`, `particles`, `grid-dots`, `carousel-loop`, `surface-treatment`, `wave-gradient`, `generative-background`); 11 stay Tier G (`scrub`, `pin-scrub`, `horizontal-panel`, `split-reveal`, `scramble`, `flip`, `draggable`, `draw`, `morph`, `motion-path`, `image-sequence`) with their parameters stored per element; 2 are site-level (`scroll-smoother`, `page-transitions`); `lottie` is a per-element Tier H helper. Total 22. Fx effects own their scroll or pointer transforms in some cases (the `owns_scroll_transform` column in `fx_effects`); the composition rule in section 5 must treat those as the effect's own property group, so an entrance never shares them.

## 8. What changes for the cloning tool

The tool writes values and delays straight from the draft into the shared schema, into all three panels: the Hover panel (effect, intensity, timing), the Entrance panel (effect, trigger, intensity or literal values, and a stored delay per element and per device) and the Effects panel (effect type and its parameters). It no longer chooses a stagger setting; it records the draft's actual delays, using the container helper only for convenience. Repeated items from templates receive server-written delays, so the tool never writes per-item values for them.
- **Spec 48 `FR-48-47` (row 11, motion):** entrance writing is built (`lib/fill-entrance.mjs`); the parameter comparison against the recorded keyframes, duration, easing and delay is not built; a draft effect no preset expresses is a named gap owned by Spec 38.
- **Spec 48 `FR-48-77` (effect recognition):** a draft's interactive and scroll effects are written in its own JavaScript, and `FR-48-47` writes entrances only, so a clone silently drops every other effect. FR-48-77 recognises each effect by its mechanism (a pinned horizontal scroll, a pointer-tracked reveal, a magnet, a tilt, a logo marquee), maps it to an SGS setting from the framework DB (`fx_effects`, block effect support) with recorded parameters, and raises a named Spec 38 gap where nothing expresses it. A draft that loads GSAP or Lenis itself is recorded through a sandbox-pinned copy first (`FR-48-47` and §5.4 item 18).
- **The 16-of-22 gap:** the clone coverage plan (`.claude/plans/2026-10-12-clone-coverage-foundation.md`) records that 16 of the 22 `fx_effects` have no recogniser even under FR-48-77, that entrance stagger is always null in the inventory, and that no writer sets an effect's own parameters. The Spec 38 rewrite and the Spec 48 rewrite must land together so recognisers target the three-panel model, with each effect's parameters as stored per-element values.
- Where a draft effect is not expressible, the tool raises a named gap rather than guessing; a root-scoped selector exists only if D6 allows it.

## 9. Alternatives rejected

- **sibling-index() CSS function** (Chrome 138, Firefox 154, Safari 26.2 per MDN browser-compat-data, checked 12 Oct 2026). Excluded: the browser would compute each delay from DOM position, which breaks "each element stores its own delay"; it cannot express irregular delays; and it is wrong when visual order differs from DOM order at a breakpoint.
- **Stylesheet `nth-child` ladders** that derive a delay from position: a computed stagger, excluded for the same reason. Server-written per-item stored values for query loops stay in.
- **Parent-level runtime stagger** (the first draft's section (c)): superseded by the owner's rule that every element stores its own delay.
- **A second, parallel token set:** dropped in favour of the existing `settings.custom` tokens (D1).
- **One effect and one trigger per element:** dropped in favour of three panels (section 2).
- **Recommendations to keep or reuse the current runtime that computes delays:** dropped.

## 10. Evidence and confidence

Verified or well-sourced: Webflow value-per-state model (From/To/FromTo, easing, stagger on the action) [S1][S2]; Webflow targeting scopes [S7]; Oxygen's data-attribute interactions, no inline scripts [S13]; GenerateBlocks Device/State/Target rows and "disable in editor" [S14]; Elementor 37 presets, no orchestration [S9][S10]; Bricks selector targeting fails in loops [S12][S19]; Material and Carbon scales; Gutenberg attribute handling [S39]. Repo facts re-checked for this revision: the 22 `fx_effects` rows, the 8 `animation_tokens` rows, the hover attribute names and block counts, `FR-38-35`, `FR-48-47`, `FR-48-77`, the `extensions.css` tilt and parallax rules; the existing token names and their use count come from the main session's check of `theme.json`.

Low-confidence inferences (absence of evidence, not a documented fact): "Webflow presets are stamped copies" [S1][S4]; "only Otter has a replay button" (Otter's animation add-on was archived 16 Jul 2026 [S17]). No public Gutenberg plugin implements the decided model; Kadence's data-aos object is copied per block with no per-device values; Otter encodes state in className (avoid); Greenshift advertises GSAP timelines [S18].

Counter-evidence: Webflow GSAP complaints (Tier 4 excerpts) [S41-S44]; Webflow keeps Classic because GSAP lacks features [S3]; Framer scroll variants inconsistent, stagger only for CMS frames [S11][S45]; Elementor Safari error [S10]; Motion's comparison is vendor marketing [S6].

Not verified in this revision: the exact tilt angle limits; per-device attribute suffixes; the `sgsHoverZoom*`, `sgsHoverLift` and similar block counts (marked "see DB"); the conflict between entrance and hover (inferred, not reproduced); "core has no state model for hover".

Method: 38 sources; Google Fact Check API returned 403 (no data); Reddit blocked (excerpts only); Framer help and Breakdance docs not read in depth.

## Glossary (10 terms)
1. **Preset**: a named starting point of values for an effect.
2. **Token**: a named setting, such as "fast", that many presets share.
3. **Stagger**: effects on a group start one after another.
4. **Delay**: wait before an element's effect starts.
5. **CSS custom property**: a named value in a stylesheet, reusable and overridable per element.
6. **WAAPI**: the browser's built-in animation scripting.
7. **IntersectionObserver**: browser feature that reports when something scrolls into view.
8. **LCP**: time until the biggest visible element appears.
9. **Tier V, G, H, W**: Spec 38's four runtime tiers: V is CSS and plain JS (the default), G is GSAP for what nothing else can do, H is a closed list of helper libraries, W is WebGL.
10. **fx effect**: one of the 22 special effects in the framework DB `fx_effects` table, such as magnet, cursor field or pinned horizontal scroll.

## Appendix A. Stagger vocabulary (for the container helper)
GSAP stagger: each or amount, from start|end|center|edges|random|index, grid [rows,cols] or auto, axis x|y, ease; grid auto does not recompute on resize; a distributeByPosition helper handles irregular layouts [S5]. Motion: stagger(duration, {startDelay, from first|center|last|index, ease}) [S20]. anime.js: grid, from, reversed, axis, ease, modifier [S21]. Framer puts stagger on the CMS collection frame [S11]; Webflow on the action [S2]. ScrollTrigger: one tween over many elements fires together; per-element starts need one trigger per element [S22]. The SGS helper's order options (row first, column first, from centre, reverse) are in section 2; the helper only writes stored delays and never runs in the browser.

## Appendix B. Effect model and targeting detail
Webflow, Framer, Elementor, Bricks, Oxygen, GenerateBlocks, Spectra (presets; Pro adds duration and delay) [S15], Kadence (duration 50-3000 ms and easing) [S16]: see sources. Target picker lists the block's declared parts (BEM `sgs-<block>__<element>`, from block.json and the framework DB), never typed selectors; a parent state (`:hover`, `:focus-within`, an in-view data attribute on the root) drives children with rules scoped to that root, which works inside loops; nested inner blocks are addressed by relation from the trigger's root.

## Appendix C. Bibliography
S1 Webflow, "Glossary for Interactions with GSAP", help.webflow.com/hc/en-us/articles/42861691922963, 2026, T1. S2 Webflow, "Actions and animations in Interactions with GSAP", help.webflow.com/hc/en-us/articles/42832337629075, T1. S3 Webflow, "Interactions with GSAP vs. Classic Interactions", help.webflow.com/hc/en-us/articles/46300264646803, T1. S4 Webflow, "Create and manage Interactions with GSAP", help.webflow.com/hc/en-us/articles/53580099234579, T1. S5 GSAP, "Staggers", gsap.com/resources/getting-started/Staggers/, T1. S6 Motion, "GSAP vs Motion", motion.dev/docs/gsap-vs-motion, T2 vendor. S7 Webflow, "Triggers & targets in Interactions with GSAP", help.webflow.com/hc/en-us/articles/42832349989395, T1. S8 Webflow, "Intro to Interactions with GSAP", help.webflow.com (article ID not recorded; URL and date not available), T1. S9 Elementor, "Add entrance animations", elementor.com/help/entrance-animations/, T1. S10 Elementor, "Motion effects", elementor.com/help/motion-effects/, T1. S11 Framer University, "3 Ways to Creating Staggered Animations in Framer", framer.university (URL and date not recorded), T2. S12 Bricks Academy "Interactions", academy.bricksbuilder.io (URL and date not recorded), T1, plus r/BricksBuilder excerpt T4. S13 Oxygen, "Interactions and Animations", oxygenbuilder.com/features/interactions/, T1. S14 GenerateBlocks, "Effects Options", docs.generateblocks.com/article/effects-overview/, T1. S15 Spectra, "Animations", wpspectra.com/docs/animations/, T1. S16 Kadence, "Animate on Scroll", kadencewp.com help (URL not recorded), T1. S17 Codeinwp blocks-animation (archived 16 Jul 2026), github.com/Codeinwp/blocks-animation, T2. S18 Greenshift, greenshiftwp.com, T2. S19 Bricks forum, "When hovering parent show only the child element", 2024, T3. S20 Motion, "stagger", motion.dev/docs/stagger, T1. S21 anime.js, "stagger", animejs.com/documentation (URL deep link and date not recorded), T1. S22 GSAP, "ScrollTrigger common mistakes", gsap.com/resources/st-mistakes/, T1. S23 DTCG, "Design Tokens Format Module 2025.10", designtokens.org/tr/2025.10/format/, T1. S24 style-dictionary PR #1758, github.com/amzn/style-dictionary/pull/1758, T3. S25 Material 3, "Easing and duration: tokens and specs", m3.material.io, T1. S26 Material 3, "Motion physics system", m3.material.io, T1. S27 Carbon, "Motion overview", carbondesignsystem.com/elements/motion/overview/, T1. S28 caniuse, animation-timeline view(), caniuse.com (Firefox 160 is a future release), T2. S29 Scrimba 2026 article on scroll-driven animations (URL not recorded), T3. S30 MDN, "animation-timeline", developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline, T1. S31 Chrome for Developers, "Scroll-driven animations", developer.chrome.com, T1. S32 web.dev, "Now in Baseline: animating entry effects", web.dev, T1. S33 Motion, "Performance", motion.dev, T2. S34 web.dev, "prefers-reduced-motion", web.dev/articles/prefers-reduced-motion, T1. S35 Josh Comeau, "Accessible animations", joshwcomeau.com, T2. S36 W3C WAI, SC 2.3.3, w3.org/WAI/WCAG21/Understanding/animation-from-interactions, T1. S39 WP Block Editor Handbook, "Block attributes", developer.wordpress.org/block-editor/reference-guides/block-api/block-attributes/, T1. S40 WP Handbook, "Migrating Blocks for iframe Editor Compatibility", developer.wordpress.org/block-editor, T1. S41-S44 r/webflow and r/webdev excerpts, T4. S45 Framer Community excerpts, T4. Added in revision 2: MDN browser-compat-data `css/properties/animation-timeline.json` and `css/types/sibling-index.json` (T1, fetched 12 Oct 2026). S37 and S38 removed (cited nowhere else). URLs marked "not recorded" were not available when the sources were first gathered and were not re-fetched.

## Appendix D. CSS-first motion systems (supplementary scan, 12 Oct 2026)
Added because the main evidence leaned on GSAP-built references (Webflow, GSAP docs) while SGS's hover and reveal layer is CSS and plain JS.
- Open Props splits motion into duration, easing and keyframe token families named by intent (quick, moderate, gentle) [Source: Open Props, "Supercharged CSS variables", https://open-props.style/, read 2026-10-12, Tier 1].
- Tailwind v4 makes `--ease-*` and `--animate-*` theme variables the source of its utilities, with keyframes declared beside the token; transitions are scoped by property group (`transition-colors` vs `transition`), and `group`/`group-hover:` puts state on one ancestor that children read [Source: Tailwind Labs, "Theme variables", "transition-property", "Hover, focus, and other states", tailwindcss.com/docs, v4.3, Tier 1].
- Web Awesome keeps three intent-named transition durations plus one easing; components never carry their own timing [Source: Fonticons, "Transition tokens", https://webawesome.com/docs/tokens/transitions/, v3.14.0, Tier 1].
- `@property` (Baseline July 2024) lets a typed custom property interpolate; unregistered properties flip instantly [Source: MDN, "@property", developer.mozilla.org/en-US/docs/Web/CSS/@property, Tier 1]. `@starting-style` (Baseline Aug 2024) supplies the from-state for transitions only, not keyframes [Source: MDN; TheoSoti, 10 May 2026, Tier 2]. `animation-timeline` remains Limited availability [Source: MDN, Tier 1].
- Copy: intent-named per-site duration and easing tokens referenced by presets; per-element transitions listing only the properties they change (never `transition: all`); `@property` registration for animatable values; hover/focus state on one ancestor (`:hover`, `:focus-within`, `:has()`) with children reading variables; `@starting-style` plus `transition-behavior: allow-discrete` with a data-attribute toggle for reveals; each stored delay in a delay variable.
- Avoid: novelty time units and deprecated aliases (Open Props); runtime-composed variable stacks (Tailwind `--tw-*`); `transition: all`; computed stagger ladders. Boundary note: a stylesheet `nth-child` ladder that derives delay from position is a computed stagger and is out; the server writing each query-loop item's own stored delay value per index (section 3) is an explicit stored value and stays in.
