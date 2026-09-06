/**
 * Tier G "Scroll & effects" extension — Spec 38 FR-38-4 / §7 / §11.2.
 *
 * Adds the fx attribute surface to sgs/* blocks and renders the one collapsed
 * "Scroll & effects" ToolsPanel in the Styles tab. The attributes are emitted
 * onto saved markup as `data-sgs-fx*`, which is what `SGS_Motion_Registry`
 * sniffs at render time to decide whether a page needs any GSAP at all.
 *
 * WHY THE ATTRIBUTES ARE NAMED `fx*` AND NOT `sgsFx*`
 * Spec 38 §11.3 fixes the block-attribute names as `fx`, `fxTrigger`,
 * `fxStart`, … and §6.2 seeds those exact names into `block_attributes` under
 * the `fx:*` pseudo-namespace. The DB rows already exist under these names, so
 * renaming them here to fit the older `sgs*` convention would silently
 * de-couple the code from its own registry. `generate-extension-attributes.js`
 * was extended to recognise the `fx*` prefix instead — see the note there.
 *
 * ⚠ WHY THE SERVER MIRROR MATTERS (the failure this would otherwise cause):
 * blocks that preview through `ServerSideRender` post their attributes to the
 * core block-renderer REST route, which validates against the SERVER-registered
 * schema with `additionalProperties => false`. An attribute registered only in
 * JS makes that route reject the WHOLE request with "Invalid parameter(s):
 * attributes" — the block's editor canvas dies while the frontend stays
 * perfectly fine. `generate-extension-attributes.js` mirrors these onto the
 * server at build time precisely to stop that.
 *
 * @package
 */

import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import {
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	useSettings,
} from '@wordpress/block-editor';
import {
	SelectControl,
	RangeControl,
	ToggleControl,
	Button,
	Notice,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { useSelect } from '@wordpress/data';
import { useState, useEffect, useMemo } from '@wordpress/element';
import { DesignTokenPicker, resolveColourToken } from '../../components';
import { isExtensionHidden } from './hide-extensions';
import qualifyingBlocks from './generated-fx-qualifying-blocks.json';
import fxEffectMeta from './generated-fx-effect-meta.json';
import fxPresets from './fx-presets.json';
import fxPathRoutes from '../../../includes/fx-path-routes.json';
import fxShapeRoutes from '../../../includes/fx-shape-routes.json';
import { ToggleGroupControl, ToggleGroupControlOption, ToggleGroupControlOptionIcon, ToolsPanel, ToolsPanelItem } from '../../components/primitives';

/**
 * Every runtime effect module that actually exists under
 * src/shared/effects/gsap/ (fx-scrub.js, fx-pin-scrub.js,
 * fx-horizontal-panel.js, fx-split-reveal.js). Hand-maintained deliberately —
 * this is NOT the "which blocks qualify" roster (that is now fully derived,
 * see generated-fx-qualifying-blocks.json below); it tracks which JS MODULES
 * have actually been built. An effect whose module does not exist yet must
 * NOT be offerable — a client could select it and get nothing, which reads
 * as a broken product rather than an unshipped feature. Later waves add
 * their effect name here as their module lands; the qualifying-blocks side
 * needs no change (it already has all 11 grammar effects computed).
 */
const SHIPPED_EFFECTS = [
	'scrub',
	'pin-scrub',
	'horizontal-panel',
	'split-reveal',
	// Wave C. `scramble` is added because its module landed AND it is driven
	// entirely by grammar params this panel already emits, so selecting it here
	// genuinely works end to end.
	//
	'scramble',
	// `draw` ADDED 2026-07-31. The blocker was never the module — it landed in
	// Wave C and is live-verified (8 distinct stroke-dash states across one
	// scroll sweep on the canary). The blocker was that `sgs/responsive-logo`
	// already owns this capability through its own `animationStyle` enum, so
	// offering it here too would put TWO controls for ONE capability on that
	// block. That is now solved where it belongs: responsive-logo declares
	// `supports.sgs.fx.providesNatively: [ "draw" ]` and
	// generate-fx-qualifying-blocks.py subtracts it from that block's derived
	// roster — the exact "data-driven exclusion in the qualifying-blocks
	// generator, not a code carve-out here" this comment previously called for.
	// icon / separator / decorative-image now offer it, responsive-logo does
	// not, and no slug is named in either file.
	//
	// Fully operable end to end: the trigger picker is driven from
	// `fxEffectMeta.draw.triggers` (scroll,load,hover) rather than a hardcoded
	// list, so selecting `draw` yields a real, configurable control.
	'draw',
	// `motion-path` ADDED 2026-07-31, and ONLY because the control it was
	// waiting on now exists. Its blocker was that `fx-motion-path.js` resolves
	// a CSS SELECTOR (`data-sgs-fx-motion-path-target`) which appeared in no
	// §11.2 grammar, no `block_attributes` row and no control — an effect a
	// client could select and then have no way to configure.
	//
	// Spec 38 §11.2's D427 amendment is now built end to end: the client picks
	// a route THUMBNAIL (`fxPath`, or a media-library SVG for `custom`), and
	// `includes/fx-path-routes.php` expands that at render time into a hidden
	// <svg> plus the `-target` selector the runtime already expected. The
	// runtime is untouched. Selecting this effect from the picker therefore
	// yields a real, configurable control that produces real motion — which is
	// the only condition on which anything may join this array.
	'motion-path',
	// `morph` ADDED — same shape of unblock as `motion-path` above, for the
	// other half of the same D427 amendment. `includes/fx-shape-routes.php`
	// expands a client-picked shape-PAIR thumbnail (`fxShape`, or two
	// media-library SVGs for `custom`) into a real shape element carrying
	// `data-sgs-fx="morph"` plus the existing `-morph-target` selector
	// `fx-morph.js` already expected — moving the effect onto a render-layer
	// -emitted shape is what lets a block whose own root is not a shape (a
	// container, a button…) qualify at all, not only the three blocks that
	// happen to render inline SVG geometry at their own root. `fx-morph.js`
	// is untouched. Selecting this effect from the picker therefore yields a
	// real, configurable control that produces real motion.
	'morph',
	// `cursor-field` ADDED 2026-08-01 (FR-38-25). It meets this array's single
	// condition — selecting it yields a real, configurable control that
	// produces real motion — on all four legs, verified end to end rather than
	// assumed: the runtime module exists (`shared/effects/fx-cursor-field.js`),
	// the registry enqueues it and its stylesheet on the same conditional terms
	// (`class-sgs-motion-registry.php` MODULES + EFFECT_STYLES), the render
	// layer marks the emitter and emits per-instance overrides
	// (`includes/fx-cursor-field.php`), and the panel below carries three real
	// controls (field style / colour / size).
	//
	// ⚠ It was OMITTED here on first build, which made the whole feature
	// unreachable from the editor while every other layer was correctly wired —
	// caught by a qc-council code-path trace before deploy. This array is the
	// on-switch: an effect fully built everywhere else is still dead code until
	// its name appears in it.
	'cursor-field',
	// `surface-treatment` ADDED — Tier W (Spec 38 §1.2b, D479), the one
	// effect in this array that is not GSAP-driven at all: it paints a
	// WebGL grain / halftone / duotone finish over the block's own `<img>`
	// via `src/shared/effects/fx-surface-treatment.js` +
	// `webgl/index.js`. It still meets this array's single condition —
	// selecting it yields a real, configurable control that produces a
	// real result — the runtime module exists, the registry enqueues it on
	// `data-sgs-fx="surface-treatment"` (a real `fx_effects` DB row, so no
	// bespoke sniff was needed), `includes/fx-surface-treatment.php` turns
	// the panel's choices into the `data-sgs-fx-treatment*` attributes +
	// duotone custom properties the runtime already expects, and the panel
	// below carries a real preset picker plus duotone colours plus an
	// intensity fine-tune.
	'surface-treatment',
	// `magnet` ADDED 2026-08-24 (FR-38-30). Meets this array's single
	// condition on every leg, each verified rather than assumed: the runtime
	// module exists (`shared/effects/fx-magnet.js`, driving the generalised
	// `magnet.js` that has shipped since the mega-menu build), the registry
	// enqueues it AND its stylesheet on the same conditional terms
	// (`class-sgs-motion-registry.php` MODULES + EFFECT_STYLES), the generic
	// `fx-attributes.php` injector stamps its three params from FX_ATTR_MAP,
	// and the panel below carries three real controls (pull / range / axis).
	//
	// ⚠ Heeding this array's own warning, written when `cursor-field` was
	// built everywhere else and omitted here: an effect fully wired in every
	// other layer is still DEAD CODE until its name appears in this array.
	'magnet',
	// `wave-gradient` ADDED 2026-08-25 (FR-38-31). Tier W's SECOND entry.
	// Every leg verified rather than assumed: the runtime modules exist
	// (`shared/effects/fx-wave-gradient.js` + `webgl/wave-gradient.js`), the
	// registry enqueues both the module AND its stylesheet (which is the
	// FALLBACK CONTRACT here, not decoration), `includes/fx-wave-gradient.php`
	// resolves palette slugs into the custom properties both the CSS fallback
	// and the shader read, and the panel below carries six real controls.
	'wave-gradient',
	// `particles` ADDED (FR-38-32). Every leg verified rather than assumed:
	// the runtime modules exist (`shared/effects/fx-particles.js` +
	// `shared/effects/particles.js`), the registry enqueues both the module
	// AND its stylesheet (`class-sgs-motion-registry.php` MODULES +
	// EFFECT_STYLES — the stylesheet is load-bearing here for the same
	// reason it is for magnet/cursor-field: without it the canvas would
	// track the pointer and paint nothing visible would move into place),
	// the generic `fx-attributes.php` injector stamps its three params from
	// FX_ATTR_MAP, and the panel below carries a preset picker plus
	// density/size fine-tune controls.
	//
	// ⚠ Heeding this array's own warning above: an effect fully wired in
	// every other layer is still DEAD CODE until its name appears here.
	'particles',
	// `grid-dots` ADDED (FR-38-33, owner-specified 2026-08-27, built
	// 2026-08-28). Every leg verified rather than assumed, in the order this
	// array's own warning demands: the runtime modules exist
	// (`shared/effects/fx-grid-dots.js` + `shared/effects/grid-dots.js`), the
	// webpack entry emits them, and the registry enqueues BOTH the module and
	// its stylesheet (`class-sgs-motion-registry.php` MODULES + EFFECT_STYLES
	// — the stylesheet is load-bearing here exactly as it is for
	// magnet/cursor-field/particles: it positions the canvas AND carries the
	// `color` channel the JS reads its paint colour from, so without it the
	// lattice would compute correctly and paint nothing you could see).
	//
	// It needs no new params: the design gate settled one configuration
	// (Preset B — cell 40 / dot 2 / radius 150 / lean 12 / ease 260, proximity
	// fade on), so selecting the effect is the whole interaction. Per-instance
	// controls are a deliberate follow-up, not an oversight — the owner asked
	// for the fade specifically to become controllable "later", and adding
	// knobs nobody has asked to turn is how a panel grows dead controls.
	'grid-dots',
	// `generative-background` ADDED (Spec 38, D874 technique spec — the
	// generative-background-engine build, Step 1 / v1 only). Tier W's THIRD
	// entry, but v1 ships NO WebGL, NO shader, NO per-frame animation: a
	// single OKLCH-interpolated gradient image built once on a <canvas> 2D
	// context and painted as a static background. Every leg verified rather
	// than assumed: the runtime module exists
	// (`shared/effects/fx-generative-background.js`), the registry enqueues
	// both the module AND its stylesheet (the CSS fallback contract — see
	// that file's own docblock), `includes/fx-generative-background.php`
	// resolves the four palette slugs plus the ground preset into the custom
	// properties both the CSS fallback and the JS-built image read, and the
	// panel below carries five real controls (four colours + ground).
	//
	// v1.1 (motion — a folded, twisted 3D geometry) is a SEPARATE, later,
	// design-gated build per the technique spec's own kill criterion — not an
	// assumed continuation of this array entry. Speed/Size/Shape/Position are
	// deliberately NOT offered here yet; see the panel below for why.
	'generative-background',
];

const FX_OPTION_LABELS = {
	scrub: __( 'Scroll reveal (scrubbed)', 'sgs-blocks' ),
	'pin-scrub': __( 'Pin section & scrub', 'sgs-blocks' ),
	'horizontal-panel': __( 'Horizontal scroll section', 'sgs-blocks' ),
	'split-reveal': __( 'Text reveal (split)', 'sgs-blocks' ),
	scramble: __( 'Text scramble', 'sgs-blocks' ),
	draw: __( 'Draw SVG lines', 'sgs-blocks' ),
	'motion-path': __( 'Travel along a route', 'sgs-blocks' ),
	morph: __( 'Morph between shapes', 'sgs-blocks' ),
	'cursor-field': __( 'Cursor follow', 'sgs-blocks' ),
	'surface-treatment': __( 'Surface treatment', 'sgs-blocks' ),
	magnet: __( 'Magnetic pull', 'sgs-blocks' ),
	'wave-gradient': __( 'Flowing gradient', 'sgs-blocks' ),
	particles: __( 'Particle trail', 'sgs-blocks' ),
	// Named for what the CLIENT sees, like every label above — not for the
	// mechanism. "Grid dots" says what is on the screen; "cursor grid-dot
	// field" is the spec's name for it and would be the longest label here.
	'grid-dots': __( 'Grid dots (follow cursor)', 'sgs-blocks' ),
	'generative-background': __( 'Generative gradient', 'sgs-blocks' ),
};

/**
 * Build the SelectControl options for one block: "None" plus every shipped
 * effect this SPECIFIC block structurally qualifies for (Spec 38 §2 —
 * derived via scripts/generate-fx-qualifying-blocks.py from block.json
 * containerKind / RichText usage / the fx_effects DB's scope+requires
 * columns, never hand-typed per block).
 *
 * @param {string} name Block name.
 * @return {Array<{label: string, value: string}>} SelectControl options.
 */
function fxOptionsForBlock( name ) {
	const qualifying = qualifyingBlocks[ name ] || [];
	const shippedQualifying = SHIPPED_EFFECTS.filter( ( effect ) =>
		qualifying.includes( effect )
	);
	return [
		{ label: __( 'None', 'sgs-blocks' ), value: '' },
		...shippedQualifying.map( ( effect ) => ( {
			label: FX_OPTION_LABELS[ effect ],
			value: effect,
		} ) ),
	];
}

/**
 * GSAP easing presets offered in the "Feel" control.
 *
 * Verified against the installed GSAP core (`node_modules/gsap/src/gsap-core.js`,
 * v3.15.0) rather than invented: `Power0`-`Power4`, `Back`, `Elastic`, `Bounce`,
 * `Sine`, `Expo`, `Circ` are all registered eases (`_insertEase` calls
 * ~lines 1071-1083, exported ~line 3253). `none` (aliased to `Power0`/linear) is
 * GSAP's own "no easing" value, used elsewhere in this codebase as the scrub
 * default (`fx-scrub.js`, `fx-horizontal-panel.js`). Labels are plain English —
 * a non-technical client picks a FEEL, not a GSAP ease-family name.
 *
 * @type {Array<{label: string, value: string}>}
 */
const FX_EASE_OPTIONS = [
	{ label: __( 'Standard (default)', 'sgs-blocks' ), value: '' },
	{ label: __( 'Constant speed, no easing', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Gentle start', 'sgs-blocks' ), value: 'power1.out' },
	{
		label: __( 'Smooth start and finish', 'sgs-blocks' ),
		value: 'power2.inOut',
	},
	{ label: __( 'Strong finish', 'sgs-blocks' ), value: 'power3.out' },
	{ label: __( 'Overshoot and settle', 'sgs-blocks' ), value: 'back.out' },
	{ label: __( 'Bounce', 'sgs-blocks' ), value: 'bounce.out' },
	{
		label: __( 'Elastic wobble', 'sgs-blocks' ),
		value: 'elastic.out(1,0.5)',
	},
];

/**
 * Documented ScrollTrigger `start` presets (gold-standard item 8 — the value
 * is always `"<trigger-position> <scroller-position>"`, two space-separated
 * tokens). A `UnitControl` parses to a single number+unit and cannot express
 * this shape, so the inspector offers a closed set of real, working values
 * instead of free text a non-technical client could easily mistype.
 *
 * @type {Array<{label: string, value: string}>}
 */
const FX_START_OPTIONS = [
	{ label: __( 'Default for this effect', 'sgs-blocks' ), value: '' },
	{
		label: __( 'As soon as it enters view', 'sgs-blocks' ),
		value: 'top bottom',
	},
	{
		label: __( 'Just after it enters view', 'sgs-blocks' ),
		value: 'top 85%',
	},
	{ label: __( 'A little into view', 'sgs-blocks' ), value: 'top 70%' },
	{ label: __( 'Halfway up the screen', 'sgs-blocks' ), value: 'top center' },
	{
		label: __( 'At the very top of the screen', 'sgs-blocks' ),
		value: 'top top',
	},
];

/**
 * `fxEnd` when the selected effect PINS — the value is a pin LENGTH.
 *
 * `+=N%` is ScrollTrigger's relative-end syntax: "hold for N% of the viewport
 * height beyond the start". Percentages of the viewport, not of the section, so
 * the labels can honestly talk in screenfuls.
 *
 * @type {Array<{label: string, value: string}>}
 */
const FX_END_PIN_OPTIONS = [
	{ label: __( 'Automatic (default)', 'sgs-blocks' ), value: '' },
	{
		label: __( 'Short — about half a screen', 'sgs-blocks' ),
		value: '+=50%',
	},
	{
		label: __( 'Standard — about one screen', 'sgs-blocks' ),
		value: '+=100%',
	},
	{ label: __( 'Long — about two screens', 'sgs-blocks' ), value: '+=200%' },
];

/**
 * `fxEnd` when the selected effect does NOT pin — the value is a scroll
 * POSITION, the same two-token grammar as `FX_START_OPTIONS`.
 *
 * @type {Array<{label: string, value: string}>}
 */
const FX_END_POSITION_OPTIONS = [
	{ label: __( 'Default for this effect', 'sgs-blocks' ), value: '' },
	{ label: __( 'A little into view', 'sgs-blocks' ), value: 'top 70%' },
	{ label: __( 'Halfway up the screen', 'sgs-blocks' ), value: 'top center' },
	{
		label: __( 'At the very top of the screen', 'sgs-blocks' ),
		value: 'top top',
	},
	{
		label: __( 'Once it has fully passed', 'sgs-blocks' ),
		value: 'bottom top',
	},
];

/**
 * Labels for `fxTrigger` — WHEN the effect fires (Spec 38 §11.2's
 * `load | scroll | hover` enum).
 *
 * Which of these a client is actually offered comes from the effect's own
 * `triggers` list in the DB, never from this map: a pinning effect spans a
 * scroll RANGE and cannot coherently fire on hover, so offering it the option
 * would ship a dead control.
 *
 * @type {Object<string,string>}
 */
/**
 * `fxHold` — how long a PINNING effect keeps holding its finished state before
 * the section releases and the page scrolls on.
 *
 * Named in plain terms rather than after the mechanism: a client is choosing
 * "how long do I get to look at the finished thing", not configuring a
 * timeline tail. Values are fractions of the pin, so this scales with whatever
 * pin length they chose rather than being a fixed pixel dwell.
 *
 * Only meaningful where the effect pins — a non-pinning effect has no
 * "afterwards" to hold, which is why the control is gated on `fxPins()`.
 *
 * @type {Array<{label: string, value: string}>}
 */
const FX_HOLD_OPTIONS = [
	{
		label: __( 'Standard — a moment to take it in', 'sgs-blocks' ),
		value: '',
	},
	{
		label: __( 'None — moves on as soon as it lands', 'sgs-blocks' ),
		value: 'none',
	},
	{ label: __( 'Brief', 'sgs-blocks' ), value: 'short' },
	{ label: __( 'Long', 'sgs-blocks' ), value: 'long' },
];

/*
 * Cursor-field types (FR-38-25).
 *
 * ⚠ THIS IS ONE OF THREE PLACES A FIELD TYPE IS NAMED, and the three must stay
 * in step:
 *   1. here — the client-facing picker
 *   2. `includes/fx-cursor-field.php` SGS_FX_CURSOR_FIELD_TYPES — the closed
 *      list the render layer will honour (an unknown value is skipped with a
 *      reason, never coerced)
 *   3. `assets/css/fx-cursor-field.css` — the rule that actually paints it
 *
 * A type present here and missing from (3) would offer a client an option that
 * silently paints nothing. **That divergence IS NOW GATED** — invariant I6 of
 * `scripts/check-fx-list-drift.py` (prebuild) asserts all three lists agree in
 * every direction, and its `--self-test` proves the check fails when they do
 * not. Until 2026-08-02 this was only a recorded residual, which is how two
 * hand-maintained lists diverging silently has bitten this codebase before (see
 * the TRANSITION_STYLES note in class-sgs-motion-registry.php).
 *
 * The empty value is not a type: it means "whatever the stylesheet defaults to",
 * which is `glow` — FR-38-25 as originally signed — so an instance saved before
 * types existed keeps rendering exactly what it always did.
 */
const FX_FIELD_TYPE_OPTIONS = [
	{ label: __( 'Glow — a soft pool of light', 'sgs-blocks' ), value: '' },
	{
		label: __( 'Torch — reveals a pattern beneath', 'sgs-blocks' ),
		value: 'spotlight-mask',
	},
	{
		label: __( 'Aurora — colours shift as you move', 'sgs-blocks' ),
		value: 'hue-shift',
	},
	{
		label: __( 'Drift — a pattern that moves with depth', 'sgs-blocks' ),
		value: 'parallax-pattern',
	},
	{
		label: __( 'Brickwork — reveals brick tiling beneath', 'sgs-blocks' ),
		value: 'brick-reveal',
	},
];

/**
 * Pool shapes. Empty is the stylesheet's circle; each other value must have a
 * matching `[data-sgs-cursor-field-shape="…"]` rule in fx-cursor-field.css and
 * an entry in SGS_FX_CURSOR_FIELD_SHAPES, or it renders a circle silently.
 */
/**
 * Which way a magnet may pull. 'both' is the default because a magnetic BUTTON
 * reads as following the cursor; the single-axis options exist for a magnet on
 * something that must not drift out of a row or a column.
 *
 * @type {Array<{label: string, value: string}>}
 */
const FX_MAGNET_AXIS_OPTIONS = [
	{ label: __( 'Follows the cursor', 'sgs-blocks' ), value: '' },
	{ label: __( 'Side to side only', 'sgs-blocks' ), value: 'x' },
	{ label: __( 'Up and down only', 'sgs-blocks' ), value: 'y' },
];

/**
 * The three shipped particle presets (FR-38-32). '' maps to 'sparks' at the
 * boot module — see `fx-particles.js`'s `readOptions()` — so this list's
 * first real option is the headline preset, matching `fxMagnetAxis`'s own
 * "'' is the sensible default" shape immediately above.
 *
 * @type {Array<{label: string, value: string}>}
 */
const FX_PARTICLE_PRESET_OPTIONS = [
	{ label: __( 'Sparks — a fading trail', 'sgs-blocks' ), value: 'sparks' },
	{
		label: __( 'Gravity dots — drift down and settle', 'sgs-blocks' ),
		value: 'gravity-dots',
	},
	{ label: __( 'Ripple — expanding rings', 'sgs-blocks' ), value: 'ripple' },
];

const FX_FIELD_SHAPE_OPTIONS = [
	{ label: __( 'Circle', 'sgs-blocks' ), value: '' },
	{ label: __( 'Wide ellipse', 'sgs-blocks' ), value: 'wide' },
	{ label: __( 'Tall ellipse', 'sgs-blocks' ), value: 'tall' },
];

const FX_TRIGGER_LABELS = {
	scroll: __( 'When it scrolls into view (default)', 'sgs-blocks' ),
	load: __( 'As soon as the page loads', 'sgs-blocks' ),
	hover: __( 'When the visitor hovers over it', 'sgs-blocks' ),
};

/**
 * Does this effect pin the section while it plays?
 *
 * Read from the generated DB mirror, NOT a hand-kept list. `fx.js` already
 * carries two hand-maintained effect lists that nothing cross-checks; a third
 * would be one more way for the inspector to disagree with the registry in
 * silence. `owns_scroll_transform` is not a usable stand-in — five effects set
 * it and only two pin.
 *
 * @param {string} effect Effect slug.
 * @return {boolean} True when the effect pins.
 */
function fxPins( effect ) {
	return true === fxEffectMeta[ effect ]?.pins;
}

/**
 * The trigger options this effect can honour, as SelectControl options.
 *
 * Returns an empty array when the effect offers only one trigger — a control
 * with a single value is a dead control, so the caller renders nothing.
 *
 * @param {string} effect Effect slug.
 * @return {Array<{label: string, value: string}>} Options, possibly empty.
 */
function fxTriggerOptions( effect ) {
	const triggers = fxEffectMeta[ effect ]?.triggers || [];
	if ( triggers.length < 2 ) {
		return [];
	}
	return triggers
		.filter( ( trigger ) => FX_TRIGGER_LABELS[ trigger ] )
		.map( ( trigger ) => ( {
			// 'scroll' is the module default, so it maps to the empty value —
			// emitting "scroll" explicitly would write a redundant attribute
			// into every block that never left the default.
			value: 'scroll' === trigger ? '' : trigger,
			label: FX_TRIGGER_LABELS[ trigger ],
		} ) );
}

/**
 * Does this effect own the element's transform/opacity across a scroll range?
 *
 * Drives the §4.3 editor-side entrance-exclusion Notice and the scrub-smoothing
 * control's visibility.
 *
 * DERIVED, NOT DECLARED (2026-07-31). This was a hand-typed array —
 * `[ 'scrub', 'pin-scrub', 'horizontal-panel', 'split-reveal' ]` — whose own
 * comment conceded the DB was authoritative. That is a fourth motion list
 * nothing cross-checked: the moment an effect's `owns_scroll_transform` changed
 * in the seeder, the render layer would have suppressed entrance animations
 * while this panel silently told the client the opposite, with no gate
 * anywhere to notice. It now reads the same generated mirror `fxPins()` uses,
 * so the editor and the render layer cannot disagree without the DB itself
 * being wrong — one place to fix rather than two places to keep in step.
 *
 * @param {string} effect Effect slug.
 * @return {boolean} True when the effect owns scroll transform/opacity.
 */
function fxOwnsScrollTransform( effect ) {
	return true === fxEffectMeta[ effect ]?.owns_scroll_transform;
}

/**
 * The parameters a preset governs for one effect.
 *
 * Read from `fx-presets.json`, so "which params does Dramatic set" is a data
 * question. Every level of an effect declares the SAME key set (the file's own
 * `_precedence` contract — a preset writes its whole governed set including
 * nulls, so switching levels cannot leave the previous level's values behind),
 * which is why reading the first level is sufficient and a union would only
 * hide a malformed entry.
 *
 * @param {string} effect Effect slug.
 * @return {string[]} Attribute names this effect's presets write.
 */
function fxPresetGovernedKeys( effect ) {
	const levels = fxPresets.effects[ effect ];
	if ( ! levels ) {
		return [];
	}
	const first = fxPresets.levels.find( ( level ) => levels[ level.value ] );
	return first ? Object.keys( levels[ first.value ] ) : [];
}

/**
 * Does this effect offer an intensity preset at all?
 *
 * An effect with fewer than two governed parameters gets no preset control: a
 * "preset" that moves one value is not a preset, it is a second name for that
 * value, and shipping it would add a control whose only effect is to make the
 * panel longer.
 *
 * @param {string} effect Effect slug.
 * @return {boolean} True when a preset control should render.
 */
function fxHasPresets( effect ) {
	return fxPresetGovernedKeys( effect ).length > 1;
}

/**
 * fx params stored as numbers rather than strings.
 *
 * Named once because three separate places need the same distinction: the
 * preset null-clearing below, the reset handler, and the save filter's "emit
 * any finite number including zero" rule.
 *
 * @type {string[]}
 */
const FX_NUMERIC_PARAMS = [ 'fxScrub', 'fxStagger', 'fxDuration' ];

/**
 * The concrete attribute values one preset level writes for one effect.
 *
 * JSON cannot express `undefined`, so a `null` in the data means "clear this
 * param back to the effect module's own default". The two are NOT
 * interchangeable at the attribute layer: the numeric fx params are declared
 * with no default precisely so `undefined` (never touched) is distinguishable
 * from an explicit `0`, so a null must become `undefined` for those and `''`
 * for the string params.
 *
 * @param {string} effect Effect slug.
 * @param {string} level  Preset level value.
 * @return {Object} Attribute changes, ready for `setAttributes`.
 */
function fxPresetAttributes( effect, level ) {
	const values = fxPresets.effects?.[ effect ]?.[ level ] || {};
	const out = {};
	Object.entries( values ).forEach( ( [ key, value ] ) => {
		if ( null === value ) {
			out[ key ] = FX_NUMERIC_PARAMS.includes( key ) ? undefined : '';
			return;
		}
		out[ key ] = value;
	} );
	return out;
}

/**
 * Every fx param attribute, with the value that means "unset".
 *
 * Used to clear the panel on reset AND when the client changes effect. The
 * latter matters: these values are not interchangeable between effects. An
 * `fxEnd` of `+=100%` is a PIN LENGTH and means nothing to a non-pinning
 * effect; an `fxSplit` of `chars` is meaningless outside a text reveal. Left
 * behind on an effect switch they become stored state the client cannot see
 * (no control renders for them) and cannot clear.
 *
 * @type {Object<string, string|undefined>}
 */
const FX_PARAM_RESET = {
	fxPreset: '',
	fxTrigger: '',
	fxStart: '',
	fxEnd: '',
	fxHold: '',
	fxScrub: undefined,
	fxStagger: undefined,
	fxDuration: undefined,
	fxEase: '',
	fxSplit: '',
	fxMask: '',
	fxPath: '',
	fxPathAsset: undefined,
	fxPathRotate: '',
	fxPathRest: '',
	fxPathRestVh: undefined,
	fxShape: '',
	fxShapeAssetFrom: undefined,
	fxShapeAssetTo: undefined,
	fxTreatment: '',
	fxTreatmentShadow: '',
	fxTreatmentHighlight: '',
	fxTreatmentTint: '',
	fxTreatmentInk: '',
	fxTreatmentIntensity: undefined,
	fxTreatmentReveal: '',
};

/*
 * Per-breakpoint disable (D446 Task 15) is DELIBERATELY excluded from
 * FX_PARAM_RESET above, not merely forgotten. `FX_PARAM_RESET` is spread by
 * BOTH `changeEffect()` (every effect switch) and `resetAll()` ("Reset all"
 * in the panel) — the two need different behaviour here. "Never show any
 * effect on this tier" is independent of WHICH effect is chosen, so it must
 * survive an effect switch; "Reset all" should still zero it, which
 * `resetAll()` below does explicitly rather than through this shared object.
 */

/**
 * The curated motion-path routes, as picker options (Spec 38 §11.2, D427).
 *
 * `custom` is appended rather than living in the JSON: it is not a route, it is
 * the escape hatch into the media library, and putting it in the data file
 * would make the render layer have to know it is not a `d` string.
 *
 * @type {Array<{value: string, label: string, d: string|null}>}
 */
const FX_PATH_OPTIONS = [
	...Object.entries( fxPathRoutes.routes ).map( ( [ value, route ] ) => ( {
		value,
		label: route.label,
		description: route.description,
		d: route.d,
	} ) ),
	{
		value: 'custom',
		label: __( 'My own SVG', 'sgs-blocks' ),
		description: __(
			'Use a line drawn in your own SVG file, uploaded to the media library.',
			'sgs-blocks'
		),
		d: null,
	},
];

/**
 * The curated MorphSVG shape pairs, as picker options (Spec 38 §11.2, D427).
 *
 * `custom` is appended rather than living in the JSON, same reasoning as
 * `FX_PATH_OPTIONS`: it is the escape hatch into the media library, not a
 * pair, and the render layer needs to tell the two apart without guessing.
 *
 * @type {Array<{value: string, label: string, d: string|null}>}
 */
const FX_SHAPE_OPTIONS = [
	...Object.entries( fxShapeRoutes.pairs ).map( ( [ value, pair ] ) => ( {
		value,
		label: pair.label,
		description: pair.description,
		d: pair.from.d,
	} ) ),
	{
		value: 'custom',
		label: __( 'My own shapes', 'sgs-blocks' ),
		description: __(
			'Use two matched shapes from your own SVG files, uploaded to the media library.',
			'sgs-blocks'
		),
		d: null,
	},
];

/**
 * The curated surface-treatment presets, as picker options (Spec 38 §1.2b,
 * D479).
 *
 * Deliberately NOT imported from `src/shared/effects/surface-treatments/
 * presets.js` — that module also exports every preset's GLSL fragment
 * source as a string, and importing it here would inline three shader
 * programmes into the EDITOR's webpack bundle for a value this panel only
 * needs three ids and three labels from. Hand-kept in step with that file
 * instead, the same "hand-kept mirror, not a shared import" shape this file
 * already uses for `fx-presets.json` → `FX_ATTR_MAP`'s PHP twin. There is no
 * `custom` escape hatch here, unlike `FX_PATH_OPTIONS`/`FX_SHAPE_OPTIONS`:
 * a surface treatment is a shader programme, not an SVG a client could
 * upload, so the only choices are the three built ones.
 *
 * @type {Array<{value: string, label: string}>}
 */
const FX_TREATMENT_OPTIONS = [
	{ value: 'grain', label: __( 'Grain', 'sgs-blocks' ) },
	{ value: 'halftone', label: __( 'Halftone', 'sgs-blocks' ) },
	{ value: 'duotone', label: __( 'Duotone', 'sgs-blocks' ) },
];

/**
 * A surface-treatment thumbnail — a small glyph suggesting the finish.
 *
 * Drawn as a simple pattern rather than the real shader output (unlike
 * `routeThumbnail`/`shapeThumbnail`, which can draw the exact `d` the
 * runtime will use): a WebGL grain/halftone/duotone finish has no static
 * path data to preview from, only a live-rendered pixel field, so the
 * closest honest preview at 24px is an iconographic stand-in for each
 * finish rather than a false promise of pixel accuracy.
 *
 * @param {string} id Preset id — `grain` | `halftone` | `duotone`.
 * @return {Object} An SVG element.
 */
function treatmentThumbnail( id ) {
	if ( 'halftone' === id ) {
		return (
			<svg
				viewBox="0 0 100 100"
				width="24"
				height="24"
				aria-hidden="true"
				focusable="false"
			>
				<circle cx="22" cy="22" r="13" fill="currentColor" />
				<circle cx="58" cy="22" r="9" fill="currentColor" />
				<circle cx="86" cy="24" r="5" fill="currentColor" />
				<circle cx="22" cy="58" r="9" fill="currentColor" />
				<circle cx="58" cy="58" r="6" fill="currentColor" />
				<circle cx="86" cy="60" r="3" fill="currentColor" />
				<circle cx="22" cy="86" r="5" fill="currentColor" />
				<circle cx="58" cy="86" r="3" fill="currentColor" />
			</svg>
		);
	}

	if ( 'duotone' === id ) {
		return (
			<svg
				viewBox="0 0 100 100"
				width="24"
				height="24"
				aria-hidden="true"
				focusable="false"
			>
				<rect x="12" y="12" width="76" height="76" fill="currentColor" />
				<path
					d="M 12 12 H 88 V 88 Z"
					fill="none"
					stroke="currentColor"
					strokeOpacity="0.35"
					strokeWidth="10"
				/>
				<rect
					x="12"
					y="12"
					width="38"
					height="76"
					fill="currentColor"
					fillOpacity="0.4"
				/>
			</svg>
		);
	}

	// `grain` — scattered flecks, the default/fallback glyph.
	return (
		<svg
			viewBox="0 0 100 100"
			width="24"
			height="24"
			aria-hidden="true"
			focusable="false"
		>
			<rect
				x="10"
				y="10"
				width="80"
				height="80"
				rx="6"
				fill="none"
				stroke="currentColor"
				strokeWidth="6"
			/>
			<circle cx="27" cy="30" r="4" fill="currentColor" />
			<circle cx="52" cy="22" r="3" fill="currentColor" />
			<circle cx="72" cy="38" r="4.5" fill="currentColor" />
			<circle cx="34" cy="55" r="3" fill="currentColor" />
			<circle cx="60" cy="58" r="4" fill="currentColor" />
			<circle cx="78" cy="70" r="3" fill="currentColor" />
			<circle cx="24" cy="76" r="4" fill="currentColor" />
			<circle cx="48" cy="80" r="3" fill="currentColor" />
		</svg>
	);
}

/**
 * A shape-pair thumbnail — the FROM shape, filled small.
 *
 * Filled rather than stroked (unlike `routeThumbnail`, which draws a line):
 * a morph target is a SHAPE, not a path to travel along, so the thumbnail
 * reads the same way the render layer will actually paint it
 * (`fill: currentColor` in `assets/css/fx-shape-routes.css`).
 *
 * @param {string|null} d Path data, or null for the custom-upload option.
 * @return {Object} An SVG element.
 */
function shapeThumbnail( d ) {
	if ( null === d ) {
		// Custom upload: the same outline-with-arrow glyph FX_PATH_OPTIONS
		// uses, so both "upload your own" options read identically.
		return (
			<svg
				viewBox="0 0 100 100"
				width="24"
				height="24"
				aria-hidden="true"
				focusable="false"
			>
				<path
					d="M 26 16 H 62 L 80 34 V 88 H 26 Z M 53 46 V 76 M 40 59 L 53 46 L 66 59"
					fill="none"
					stroke="currentColor"
					strokeWidth="7"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		);
	}

	return (
		<svg
			viewBox="0 0 100 100"
			width="24"
			height="24"
			aria-hidden="true"
			focusable="false"
		>
			<path d={ d } fill="currentColor" stroke="none" />
		</svg>
	);
}

/**
 * The option component the route picker renders each thumbnail with.
 *
 * `ToggleGroupControlOptionIcon` is the WP-native "pick one of these pictures"
 * control and is what the thumbnail picker wants. The fallback is not
 * defensive clutter: this codebase already uses the two sibling exports and
 * has never used this one, so a WP build where it is absent would take the
 * whole panel down with it — and every control in it, including the ones that
 * have nothing to do with routes. Both components accept `value`/`label`, so
 * passing both props means the degraded path is a NAMED option list rather
 * than a broken panel.
 *
 * @type {Function}
 */
const RouteOption = ToggleGroupControlOptionIcon || ToggleGroupControlOption;

/**
 * A route thumbnail — the actual curve, drawn small.
 *
 * The signed D427 shape is "the client picks a THUMBNAIL", and a thumbnail of
 * a route is simply that route at 24px. Drawing it from the same `d` the render
 * layer will use means the preview cannot drift from the result.
 *
 * @param {string|null} d Path data, or null for the custom-upload option.
 * @return {Object} An SVG element.
 */
function routeThumbnail( d ) {
	if ( null === d ) {
		// Custom upload: an outline sheet with an arrow, drawn in the same
		// stroke weight so it sits evenly beside the four route curves.
		return (
			<svg
				viewBox="0 0 100 100"
				width="24"
				height="24"
				aria-hidden="true"
				focusable="false"
			>
				<path
					d="M 26 16 H 62 L 80 34 V 88 H 26 Z M 53 46 V 76 M 40 59 L 53 46 L 66 59"
					fill="none"
					stroke="currentColor"
					strokeWidth="7"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		);
	}

	return (
		<svg
			viewBox="0 0 100 100"
			width="24"
			height="24"
			aria-hidden="true"
			focusable="false"
		>
			<path
				d={ d }
				fill="none"
				stroke="currentColor"
				strokeWidth="8"
				strokeLinecap="round"
			/>
		</svg>
	);
}

/**
 * Which blocks the fx extension applies to at all.
 *
 * A block qualifies when it has at least one SHIPPED effect available (per
 * the derived qualifying-blocks map) — the exact same check
 * `fxOptionsForBlock` uses to build the SelectControl, by construction
 * (Hard constraint: attributes and panel must never diverge — a block
 * carrying fx attributes with no control to set/clear them is a defect, and
 * the reverse is too).
 *
 * @param {string} name Block name.
 * @return {boolean} True when the block should carry fx attributes.
 */
function shouldHaveFx( name ) {
	return fxOptionsForBlock( name ).length > 1;
}

/**
 * Register the fx attributes on qualifying blocks.
 *
 * @param {Object} settings Block settings.
 * @param {string} name     Block name.
 * @return {Object} Settings, with fx attributes added.
 */
function addFxAttributes( settings, name ) {
	if ( ! shouldHaveFx( name ) ) {
		return settings;
	}

	// Declarative per-block opt-out, checked against the settings object
	// because the block is not registered yet at this filter — mirrors
	// animation.js and hover-effects.js.
	if ( isExtensionHidden( settings, 'fx' ) ) {
		return settings;
	}

	return {
		...settings,
		attributes: {
			...settings.attributes,
			fx: { type: 'string', default: '' },
			/*
			 * The intensity preset (Spec 38 §7) — a REAL stored attribute, not
			 * a transient editor convenience, so it round-trips through save,
			 * survives a clone, and can be read back to show the client which
			 * preset is currently applied.
			 *
			 * It is deliberately NOT emitted as a data attribute. Everything a
			 * preset does is already materialised in the individual fx params
			 * (see `fx-presets.json` `_precedence`), so emitting it would put
			 * an attribute in the markup that no runtime reads — the exact
			 * dead-attribute shape this project has been bitten by before.
			 */
			fxPreset: { type: 'string', default: '' },
			fxTrigger: { type: 'string', default: '' },
			fxStart: { type: 'string', default: '' },
			fxEnd: { type: 'string', default: '' },
			fxHold: { type: 'string', default: '' },
			/*
			 * No defaults on the numeric params — deliberate.
			 *
			 * With `default: 1` (scrub) / `default: 0` (stagger, duration) there
			 * was no way to tell "the client never touched this" from "the
			 * client deliberately chose 0", so the save filter below treated 0
			 * as unset and dropped it. Net effect: dragging Scrub smoothing to
			 * 0 — asking for instant, no-lag scrubbing — silently produced 1
			 * SECOND of smoothing, because the attribute was never emitted and
			 * the effect module fell back to its own default. The whole extreme
			 * end of that control was a no-op that snapped back to default with
			 * no feedback.
			 *
			 * Undefined-when-untouched makes the distinction real: unset emits
			 * nothing (module default applies), an explicit 0 emits "0" and is
			 * honoured. 0 is a legitimate scrub value — GSAP treats no-smoothing
			 * scrub as `true`, which the modules now map explicitly.
			 */
			fxScrub: { type: 'number' },
			fxStagger: { type: 'number' },
			fxDuration: { type: 'number' },
			/*
			 * Cursor-reactive field (FR-38-25). `fxFieldType` names WHAT is
			 * painted — the field-type system Bean asked for when he ruled the
			 * effect "isn't limited to a glow/colour, it could be a pattern,
			 * move floating objects etc". Empty means the stylesheet's own
			 * default (`glow`, FR-38-25 as originally signed), so an instance
			 * saved before types existed renders exactly as it always did.
			 *
			 * `fxFieldColour` stores a palette SLUG (DesignTokenPicker's own
			 * value shape), never a resolved hex — `includes/fx-cursor-field.php`
			 * maps it to `var(--wp--preset--color--<slug>)` so the field
			 * re-colours with the site rather than freezing today's palette.
			 */
			fxFieldType: { type: 'string', default: '' },
			fxFieldColour: { type: 'string', default: '' },
			/*
			 * Pool SHAPE. Empty = the stylesheet's circle, so an instance saved
			 * before shapes existed is unchanged. The geometry itself lives in
			 * CSS (`[data-sgs-cursor-field-shape]`), never here — the render
			 * layer only passes a validated slug through.
			 */
			fxFieldShape: { type: 'string', default: '' },
			/*
			 * Undefined-when-untouched, same reasoning as the numeric params
			 * above: there is no meaningful "0px radius" a client would choose
			 * (it paints nothing), so unset must be distinguishable from set
			 * and the render layer treats 0 as unset.
			 */
			fxFieldRadius: { type: 'number' },
			/*
			 * TRAIL — how far the pool lags behind the pointer, 0-100.
			 * Read by the emitter module, not by CSS: it eases the published
			 * position toward the cursor each frame instead of snapping to it.
			 * Undefined when untouched so the module's own default stands, and
			 * NO `default: null` — a null on a number attr 400s every
			 * ServerSideRender preview (D755).
			 */
			fxWaveBase: { type: 'string', default: '' },
			fxWave1: { type: 'string', default: '' },
			fxWave2: { type: 'string', default: '' },
			fxWave3: { type: 'string', default: '' },
			fxWaveVariant: { type: 'string' },
			fxWaveSpeed: { type: 'number' },
			fxWaveAmplitude: { type: 'number' },
			/*
			 * Generative background (Spec 38, D874 — v1 static build only).
			 * Four colour SLOTS, matching `fxWaveBase`/`fxWave1-3`'s shape
			 * (empty string default, so an unset colour resolves to nothing
			 * rather than to a stray `background-color:` declaration).
			 * `includes/fx-generative-background.php` resolves each through
			 * `sgs_colour_value()` and interpolates them in OKLCH — never fed
			 * to the style engine raw (D684).
			 */
			fxGenColour1: { type: 'string', default: '' },
			fxGenColour2: { type: 'string', default: '' },
			fxGenColour3: { type: 'string', default: '' },
			fxGenColour4: { type: 'string', default: '' },
			/*
			 * Ground preset (§6 of the technique spec — a MANDATORY control,
			 * not a fixed default). 'light' | 'dark'; empty resolves to
			 * 'light' at render time. Resolved from the client's own base
			 * colour tokens ('surface' / 'footer-bg'), never a hardcoded hex.
			 */
			fxGenGround: { type: 'string', default: '' },
			/*
			 * Generative background — geometry mechanism (v1.2 rewrite,
			 * 2026-08-28). `fxGenSpeed` mirrors `fxWaveSpeed`'s own shape
			 * (undefined-when-untouched, engine reads it 5-150 -> ×1/50 —
			 * `fx-generative-background.js` already had this reader before
			 * this rewrite). The other nine are the vertex shader's own
			 * tunables — also undefined-when-untouched so the shader's
			 * calibrated defaults (`webgl/generative-background.js`) stand
			 * until a client changes them. NO `default: null` on any of
			 * these — a null on a number attr 400s every ServerSideRender
			 * preview (D755).
			 */
			fxGenSpeed: { type: 'number' },
			fxGenFoldFreq1: { type: 'number' },
			fxGenFoldFreq2: { type: 'number' },
			fxGenFoldFreq3: { type: 'number' },
			fxGenFoldPower1: { type: 'number' },
			fxGenFoldPower2: { type: 'number' },
			fxGenFoldPower3: { type: 'number' },
			fxGenDisplaceFreqX: { type: 'number' },
			fxGenDisplaceFreqZ: { type: 'number' },
			fxGenDisplaceAmount: { type: 'number' },
			/*
			 * Generative background — striation / glow-gate + depth-fade
			 * params (§3, 2026-08-28 build). Same undefined-when-untouched
			 * shape as the geometry tunables above — the shader's own
			 * calibrated defaults stand until a client changes them. NO
			 * `default: null` on any of these (D755).
			 */
			fxGenGlowAmount: { type: 'number' },
			fxGenGlowPower: { type: 'number' },
			fxGenGlowRamp: { type: 'number' },
			fxGenStriationStrength: { type: 'number' },
			fxGenStriationFreq: { type: 'number' },
			fxGenColourAttenuation: { type: 'number' },
			fxGenParabolaPower: { type: 'number' },
			fxMagnetAxis: { type: 'string', default: '' },
			fxMagnetRadius: { type: 'number' },
			fxMagnetStrength: { type: 'number' },
			/*
			 * Particle trail (FR-38-32). `fxParticlePreset` picks which of
			 * the three `PRESETS` in `particles.js` runs — '' is treated as
			 * 'sparks' by the boot module, so an instance saved before this
			 * shipped renders the headline preset rather than nothing.
			 * `fxParticleDensity`/`fxParticleSize` are UNDEFINED-when-
			 * untouched (never `default: null` — a null on a number attr
			 * 400s every ServerSideRender preview, D755), same reasoning as
			 * `fxMagnetRadius`/`fxMagnetStrength` immediately above: the
			 * engine's own preset default stands until a client changes it.
			 */
			fxParticlePreset: { type: 'string', default: '' },
			fxParticleDensity: { type: 'number' },
			fxParticleSize: { type: 'number' },
			/*
			 * Optional colour OVERRIDE (D846). Empty by default, and empty means
			 * the shipped behaviour is unchanged: `particles.js` falls back to the
			 * emitter's inherited `color`. Stores a palette SLUG (DesignTokenPicker's
			 * own value shape, same as `fxFieldColour`) so re-theming re-colours the
			 * trail, resolved to `var(--wp--preset--color--<slug>)` in PHP.
			 */
			fxParticleColour: { type: 'string', default: '' },
			/*
			 * FR-38-33 grid-dot colour. Same shape and same reason as
			 * `fxParticleColour` directly above: stores a palette SLUG (or a hex
			 * for a custom pick) so re-theming re-colours the field, resolved to
			 * `var(--wp--preset--color--<slug>)` in PHP.
			 *
			 * Added 2026-08-28 because the effect shipped with no control and an
			 * ACCENT default that measured 1.35:1 against the client's cream
			 * background — worse than the D846 trail this whole pattern exists to
			 * prevent. The default moved to `primary`; this is the escape hatch
			 * so a client on a palette where primary also fails is not stuck.
			 */
			fxGridDotColour: { type: 'string', default: '' },
			/*
			 * The colour a dot reaches AT the pointer; dots interpolate from
			 * `fxGridDotColour` to this one by proximity.
			 *
			 * It is a second attribute rather than a second field on the first
			 * because D609's colour contract is one control carrying N STATES,
			 * and a state is a separate stored value. Passing both to a single
			 * `DesignTokenPicker` via its `states` prop is what produces the
			 * Normal/Hover tab toggle inside the popover.
			 *
			 * Added 2026-08-28: proximity previously drove ALPHA ONLY, via a
			 * constant the client could not reach.
			 */
			fxGridDotHoverColour: { type: 'string', default: '' },
			/*
			 * Marker shape. `line` and `triangle` rotate to point at the
			 * pointer — the "magnetic filings" pattern, and the only way the
			 * `fxGridLean` value becomes visible while a dot is at rest, since
			 * a circle is radially symmetric.
			 *
			 * ⛔ Deliberately NOT an arbitrary icon. At lattice scale (a few px,
			 * hundreds of instances) an icon degrades to an unreadable blob and
			 * costs a path draw per cell per frame instead of one `arc()`.
			 */
			fxGridDotShape: { type: 'string', default: '' },
			/*
			 * FR-38-33 grid-dot geometry. The five values Bean tuned in the
			 * 2026-08-28 prototype, exposed after he saw the shipped panel with
			 * nothing under the effect picker: "the controls for the grid dots
			 * effect don't show up". They did not exist — the effect shipped
			 * param-less on the reasoning that the design gate had settled one
			 * configuration. That was too thin next to every sibling effect
			 * (cursor-field 6 params, wave-gradient 7, particles 4).
			 *
			 * ⛔ EVERY DEFAULT IS `undefined`, NOT A NUMBER. `grid-dots.js`'s own
			 * DEFAULTS table is the single source of the Preset B values, and the
			 * boot module passes `undefined` for an absent attribute so that table
			 * wins. Repeating 40/2/150/12/260 here would create a second source
			 * that silently drifts. (This is also the bug that shipped: object
			 * spread COPIES an explicit undefined over a default, which is why the
			 * engine now filters undefined keys rather than spreading them.)
			 *
			 * The `data-sgs-fx-grid-*` names these map to are the ones
			 * `fx-grid-dots.js:readOptions()` already reads, and each is clamped
			 * there to the same bounds the controls advertise.
			 */
			fxGridCell: { type: 'number' },
			fxGridDotSize: { type: 'number' },
			fxGridRadius: { type: 'number' },
			fxGridLean: { type: 'number' },
			fxGridEase: { type: 'number' },
			fxFieldBlend: { type: 'number' },
			/* Stored as `fxFieldTrail`, shown to the client as "Drag weight".
			   The names differ DELIBERATELY. This is a lerp follower and has no
			   fading tail, so "Trail" was the wrong client-facing word and was
			   changed 2026-08-24. The stored ATTRIBUTE keeps its name because
			   canary 2721 already authors it on 5+ containers, and WP DELETES an
			   undeclared attr on the next editor save (D338) — renaming it needs a
			   block-editor content migration, which is not worth its risk for an
			   internal identifier no client ever sees. The deploy's oldshape audit
			   caught this; the rename was reverted rather than forced. */
			fxFieldTrail: { type: 'number' },
			fxEase: { type: 'string', default: '' },
			fxSplit: { type: 'string', default: '' },
			fxMask: { type: 'string', default: '' },
			/*
			 * Motion-path route (Spec 38 §11.2, D427). `fxPath` is a curated
			 * preset key or the literal `custom`; `fxPathAsset` is a MEDIA
			 * LIBRARY attachment ID, never markup — the `sgs/responsive-logo`
			 * `svgAnimationSource` precedent, chosen because an inline-SVG
			 * paste field is an XSS vector.
			 *
			 * Neither is the runtime's own contract: `includes/fx-path-routes.php`
			 * expands whichever is set into the hidden <svg> and the existing
			 * `data-sgs-fx-motion-path-target` selector. That selector is
			 * render-layer OUTPUT and has no attribute here by design — a draft
			 * never authors it, and the cloning contract maps `fxPath`.
			 */
			fxPath: { type: 'string', default: '' },
			fxPathAsset: { type: 'number' },
			/*
			 * Whether the traveller turns to face the direction of travel.
			 * Stored as a string because the runtime reads the raw attribute
			 * (`'false' !== el.getAttribute(...)`), so the two honest values
			 * are `''` (absent → the module's own default, on) and `'false'`.
			 */
			fxPathRotate: { type: 'string', default: '' },
			/*
			 * Resting position (Spec 38 §11.2, D441). Where the traveller
			 * settles once its scrub completes. `fxPathRest` is a curated
			 * preset key or `custom`; unset (`''`) resolves to `middle` via
			 * `fx-motion-path.css`'s default rule — the DEFAULT this control
			 * ships with, matching industry convention for "settle and read"
			 * (viewport centre). `fxPathRestVh` is the 5vh-stepped fine-tune
			 * slider value, meaningful only when `fxPathRest === 'custom'`;
			 * `undefined` when untouched, same "unset vs a deliberate value"
			 * distinction `fxScrub` etc. use above, because 0 (rest flush
			 * with the header-clearance floor) is a legitimate choice.
			 */
			fxPathRest: { type: 'string', default: '' },
			fxPathRestVh: { type: 'number' },
			/*
			 * MorphSVG shape pair (Spec 38 §11.2, D427). `fxShape` is a
			 * curated preset key or the literal `custom`; `fxShapeAssetFrom` /
			 * `fxShapeAssetTo` are MEDIA LIBRARY attachment IDs, never markup
			 * — the same `svgAnimationSource` precedent `fxPathAsset` follows.
			 *
			 * `includes/fx-shape-routes.php` expands whichever is set into a
			 * visible FROM `<svg>` + hidden TO `<svg>` + the existing
			 * `data-sgs-fx-morph-target` selector. That selector is
			 * render-layer OUTPUT and has no attribute here by design — a
			 * draft never authors it, and the cloning contract maps `fxShape`.
			 */
			fxShape: { type: 'string', default: '' },
			fxShapeAssetFrom: { type: 'number' },
			fxShapeAssetTo: { type: 'number' },
			/*
			 * Surface treatment (Tier W, Spec 38 §1.2b, D479). `fxTreatment`
			 * is the curated preset id (`grain`|`halftone`|`duotone`); empty
			 * means untreated, not "the stylesheet's own default" — unlike
			 * `fxFieldType` above, there is no meaningful default finish for
			 * a block nobody asked to be painted over.
			 *
			 * `fxTreatmentShadow`/`fxTreatmentHighlight` store palette SLUGS,
			 * the same `DesignTokenPicker` value shape `fxFieldColour`
			 * already uses — `includes/fx-surface-treatment.php` resolves
			 * them via the same `sgs_fx_cursor_field_colour()` helper that
			 * maps a slug to `var(--wp--preset--color--<slug>)`, so the
			 * duotone re-colours with the site rather than freezing today's
			 * palette. Duotone-only; the panel only renders these two when
			 * `fxTreatment === 'duotone'`.
			 *
			 * `fxTreatmentTint` (grain) / `fxTreatmentInk` (halftone) are the
			 * same palette-SLUG shape, one colour each, for the two
			 * single-colour treatments — every treatment now carries colour
			 * control, not only duotone. Left empty, the runtime derives its
			 * own default straight from the site palette (`paletteFallback`/
			 * `paletteTransform` in `presets.js`), so an unset value is
			 * "follow the theme", never a frozen literal — the same
			 * empty-means-untreated-default shape the rest of this block
			 * documents, applied per treatment rather than per finish.
			 *
			 * `fxTreatmentIntensity` is undefined-when-untouched, the same
			 * "0 is a legitimate value, unset is a different thing" shape
			 * `fxScrub`/`fxFieldRadius` already use above: the render layer
			 * clamps an explicit value to 0-1 and drops it back to unset at
			 * 0, letting the preset's own built-in default stand when the
			 * client never opens this control.
			 */
			fxTreatment: { type: 'string', default: '' },
			fxTreatmentShadow: { type: 'string', default: '' },
			fxTreatmentHighlight: { type: 'string', default: '' },
			fxTreatmentTint: { type: 'string', default: '' },
			fxTreatmentInk: { type: 'string', default: '' },
			fxTreatmentIntensity: { type: 'number' },
			/*
			 * Reveal-on-scroll toggle for the treatment above. Empty string
			 * means ON (the default): the treatment develops in as the
			 * element scrolls into view, driven by the boot module's
			 * `uResolve` uniform. `'off'` is the only other legal value —
			 * the boot module's own gate is `'off' !== dataset.sgsFxTreatmentReveal`,
			 * so ANY value other than the exact string `'off'` reads as on.
			 * Kept a plain string, not a boolean, to match the render
			 * layer's closed-set skip-with-reason pattern the rest of this
			 * effect's params use (`fxTreatment` above).
			 */
			fxTreatmentReveal: { type: 'string', default: '' },
			/*
			 * Per-breakpoint disable (Spec 38 §7 build task, D446 Task 15) —
			 * the single most common post-launch agency request, per the
			 * competitor review this task cited: "turn the animation off on
			 * mobile". A BOOLEAN per tier, not per-tier values — the client
			 * is choosing whether the effect exists there at all, not tuning
			 * it. Named with the EXISTING breakpoint-suffix vocabulary
			 * (`Tablet`/`Mobile`) the rest of the framework already uses for
			 * responsive attrs (`gapTablet`, `fontSizeMobile`, …), not an
			 * invented shape.
			 *
			 * No Desktop member: desktop is always the "on" tier an author
			 * is designing the effect FOR, so there is nothing to disable
			 * there without also removing the effect outright (which is what
			 * clearing `fx` already does).
			 */
			fxDisableTablet: { type: 'boolean', default: false },
			fxDisableMobile: { type: 'boolean', default: false },
		},
	};
}

addFilter( 'blocks.registerBlockType', 'sgs/fx-attributes', addFxAttributes );

/**
 * Emit the fx attributes as `data-sgs-fx*` on STATIC blocks' saved markup.
 *
 * Dynamic blocks bypass this entirely (their save returns null) and are handled
 * server-side by `includes/fx-attributes.php`. Both paths must exist — this is
 * the same two-path shape the animation extension has, and missing either one
 * produces an effect that works on some blocks and silently not on others.
 *
 * @param {Object} props      Save-element props.
 * @param {Object} blockType  Block type.
 * @param {Object} attributes Block attributes.
 * @return {Object} Props, with data attributes added when an effect is set.
 */
function addFxSaveProps( props, blockType, attributes ) {
	if ( ! shouldHaveFx( blockType.name ) ) {
		return props;
	}
	if ( ! attributes.fx ) {
		return props;
	}

	const data = { 'data-sgs-fx': attributes.fx };

	// Only emit params the client actually set. Emitting empty attributes
	// would make the markup noisier and, worse, would let an empty string
	// override the effect module's own considered default.
	const optional = {
		'data-sgs-fx-trigger': attributes.fxTrigger,
		'data-sgs-fx-start': attributes.fxStart,
		'data-sgs-fx-end': attributes.fxEnd,
		'data-sgs-fx-hold': attributes.fxHold,
		'data-sgs-fx-ease': attributes.fxEase,
		'data-sgs-fx-split': attributes.fxSplit,
		'data-sgs-fx-mask': attributes.fxMask,
		'data-sgs-fx-path': attributes.fxPath,
		/*
		 * The runtime's own attribute name, not an `fxPathRotate`-shaped one:
		 * `fx-motion-path.js` reads `data-sgs-fx-motion-path-rotate` and that
		 * module is deliberately untouched by this work, so the editor bends to
		 * it rather than the reverse.
		 */
		'data-sgs-fx-motion-path-rotate': attributes.fxPathRotate,
		'data-sgs-fx-motion-path-rest': attributes.fxPathRest,
		'data-sgs-fx-shape': attributes.fxShape,
		/*
		 * Cursor field (FR-38-25). The render layer reads these back off the
		 * rendered root and turns them into `data-sgs-cursor-field` plus a
		 * uid-scoped <style> — it does NOT paint from these names directly, so
		 * they stay an authoring surface the cloning grammar can map.
		 */
		'data-sgs-fx-field': attributes.fxFieldType,
		'data-sgs-fx-field-colour': attributes.fxFieldColour,
		/*
		 * Surface treatment (Tier W, D479). `includes/fx-surface-treatment.php`
		 * still runs on p11 for THESE (as for every fx attribute) to turn the
		 * colour slugs into the `--sgs-fx-shadow`/`--sgs-fx-highlight` custom
		 * properties and clamp intensity — it is not bypassed for static
		 * blocks, only the base `data-sgs-fx-treatment*` values need to reach
		 * the markup at all, which is this filter's job for a static block
		 * exactly as it already is for every other fx param above.
		 */
		'data-sgs-fx-treatment': attributes.fxTreatment,
		'data-sgs-fx-treatment-shadow': attributes.fxTreatmentShadow,
		'data-sgs-fx-treatment-highlight': attributes.fxTreatmentHighlight,
		'data-sgs-fx-treatment-tint': attributes.fxTreatmentTint,
		'data-sgs-fx-treatment-ink': attributes.fxTreatmentInk,
		// Only 'off' is ever meaningful to emit — '' (reveal on, the default)
		// is falsy here and correctly skipped by the `if ( value )` guard
		// below, matching the render layer's "presence means off" contract.
		'data-sgs-fx-treatment-reveal': attributes.fxTreatmentReveal,
		'data-sgs-fx-particle-preset': attributes.fxParticlePreset,
		/*
		 * Generative background (Spec 38, D874). String colour slugs and a
		 * string ground preset — grouped with the other truthy-filtered
		 * strings (fxFieldColour/fxTreatment* above), NOT the numeric group
		 * below, which only emits `typeof value === 'number'`.
		 */
		'data-sgs-fx-gen-colour-1': attributes.fxGenColour1,
		'data-sgs-fx-gen-colour-2': attributes.fxGenColour2,
		'data-sgs-fx-gen-colour-3': attributes.fxGenColour3,
		'data-sgs-fx-gen-colour-4': attributes.fxGenColour4,
		'data-sgs-fx-gen-ground': attributes.fxGenGround,
	};
	Object.entries( optional ).forEach( ( [ key, value ] ) => {
		if ( value ) {
			data[ key ] = value;
		}
	} );

	const numeric = {
		'data-sgs-fx-scrub': attributes.fxScrub,
		'data-sgs-fx-stagger': attributes.fxStagger,
		'data-sgs-fx-duration': attributes.fxDuration,
		// 0 is legitimate here (rest flush with the header-clearance floor —
		// see the attribute declaration above), so it must survive the same
		// finite-number test the other numeric params use, not a `> 0` test.
		'data-sgs-fx-motion-path-rest-vh': attributes.fxPathRestVh,
		// Cursor-field radius in px. The render layer clamps it to a range that
		// still renders as a field rather than trusting the stored number.
		'data-sgs-fx-field-radius': attributes.fxFieldRadius,
		'data-sgs-fx-wave-base': attributes.fxWaveBase,
		'data-sgs-fx-wave-1': attributes.fxWave1,
		'data-sgs-fx-wave-2': attributes.fxWave2,
		'data-sgs-fx-wave-3': attributes.fxWave3,
		'data-sgs-fx-wave-variant': attributes.fxWaveVariant,
		'data-sgs-fx-wave-speed': attributes.fxWaveSpeed,
		'data-sgs-fx-wave-amplitude': attributes.fxWaveAmplitude,
		// Generative background — geometry mechanism (v1.2 rewrite).
		'data-sgs-fx-gen-speed': attributes.fxGenSpeed,
		'data-sgs-fx-gen-fold-freq-1': attributes.fxGenFoldFreq1,
		'data-sgs-fx-gen-fold-freq-2': attributes.fxGenFoldFreq2,
		'data-sgs-fx-gen-fold-freq-3': attributes.fxGenFoldFreq3,
		'data-sgs-fx-gen-fold-power-1': attributes.fxGenFoldPower1,
		'data-sgs-fx-gen-fold-power-2': attributes.fxGenFoldPower2,
		'data-sgs-fx-gen-fold-power-3': attributes.fxGenFoldPower3,
		'data-sgs-fx-gen-disp-freq-x': attributes.fxGenDisplaceFreqX,
		'data-sgs-fx-gen-disp-freq-z': attributes.fxGenDisplaceFreqZ,
		'data-sgs-fx-gen-disp-amount': attributes.fxGenDisplaceAmount,
		'data-sgs-fx-gen-glow-amount': attributes.fxGenGlowAmount,
		'data-sgs-fx-gen-glow-power': attributes.fxGenGlowPower,
		'data-sgs-fx-gen-glow-ramp': attributes.fxGenGlowRamp,
		'data-sgs-fx-gen-striation-strength': attributes.fxGenStriationStrength,
		'data-sgs-fx-gen-striation-freq': attributes.fxGenStriationFreq,
		'data-sgs-fx-gen-colour-attenuation': attributes.fxGenColourAttenuation,
		'data-sgs-fx-gen-parabola-power': attributes.fxGenParabolaPower,
		'data-sgs-fx-magnet-axis': attributes.fxMagnetAxis,
		'data-sgs-fx-magnet-radius': attributes.fxMagnetRadius,
		'data-sgs-fx-magnet-strength': attributes.fxMagnetStrength,
		'data-sgs-fx-field-blend': attributes.fxFieldBlend,
		'data-sgs-fx-field-trail': attributes.fxFieldTrail,
		'data-sgs-fx-field-shape': attributes.fxFieldShape,
		// Surface-treatment intensity, 0-1. The render layer clamps it and
		// drops a 0 back to unset — see the attribute declaration above.
		'data-sgs-fx-treatment-intensity': attributes.fxTreatmentIntensity,
		'data-sgs-fx-particle-density': attributes.fxParticleDensity,
		'data-sgs-fx-particle-size': attributes.fxParticleSize,
		'data-sgs-fx-particle-colour': attributes.fxParticleColour,
		'data-sgs-fx-grid-colour': attributes.fxGridDotColour,
		'data-sgs-fx-grid-cell': attributes.fxGridCell,
		'data-sgs-fx-grid-dot': attributes.fxGridDotSize,
		'data-sgs-fx-grid-radius': attributes.fxGridRadius,
		'data-sgs-fx-grid-lean': attributes.fxGridLean,
		'data-sgs-fx-grid-ease': attributes.fxGridEase,
	};
	// Emit any finite number INCLUDING zero. The old `value > 0` test silently
	// discarded a deliberate 0 — see the attribute declarations above.
	Object.entries( numeric ).forEach( ( [ key, value ] ) => {
		if ( 'number' === typeof value && Number.isFinite( value ) ) {
			data[ key ] = String( value );
		}
	} );

	/*
	 * An attachment ID is the one numeric fx value where zero is NOT a
	 * meaningful setting — attachment IDs start at 1, so 0 is "no file
	 * chosen". It is therefore emitted on a `> 0` test, unlike the params
	 * above, and this is the reason why rather than an inconsistency.
	 */
	if (
		'number' === typeof attributes.fxPathAsset &&
		attributes.fxPathAsset > 0
	) {
		data[ 'data-sgs-fx-path-asset' ] = String( attributes.fxPathAsset );
	}

	if (
		'number' === typeof attributes.fxShapeAssetFrom &&
		attributes.fxShapeAssetFrom > 0
	) {
		data[ 'data-sgs-fx-shape-asset-from' ] = String(
			attributes.fxShapeAssetFrom
		);
	}
	if (
		'number' === typeof attributes.fxShapeAssetTo &&
		attributes.fxShapeAssetTo > 0
	) {
		data[ 'data-sgs-fx-shape-asset-to' ] = String(
			attributes.fxShapeAssetTo
		);
	}

	/*
	 * Per-breakpoint disable (D446 Task 15). Booleans, so they follow the
	 * same "only emit when meaningfully set" rule the rest of this function
	 * uses for strings/numbers — `false` emits nothing rather than an
	 * `="false"` string a CSS/JS selector would need to know to check for.
	 */
	if ( attributes.fxDisableTablet ) {
		data[ 'data-sgs-fx-disable-tablet' ] = '1';
	}
	if ( attributes.fxDisableMobile ) {
		data[ 'data-sgs-fx-disable-mobile' ] = '1';
	}

	return { ...props, ...data };
}

addFilter(
	'blocks.getSaveContent.extraProps',
	'sgs/fx-save-props',
	addFxSaveProps
);

/**
 * The per-page Tier G motion cost, surfaced from a MEASURING SCRIPT owned by
 * a different track (Spec 38 §7 build task 19 / D446 / Bean's D448 ruling —
 * GSAP keeps its budget exemption, but per-page cost becomes VISIBLE).
 *
 * ⚠ THE INTERFACE THIS HOOK ASSUMES — written here because the measuring
 * script + admin panel had not landed at the time this was built, and this
 * file owns ONLY the editor-side surfacing (per the D446 task split):
 *
 *   GET /wp-json/sgs/v1/motion-budget?post_id=<id>
 *   → 200 { totalKb: number, budgetKb: number, overBudget: boolean,
 *           effects: [ { effect: string, kb: number } ] }
 *   → 404 (or any error) — read as "no data yet", never surfaced as an
 *     error to the client; the panel simply shows nothing extra.
 *
 * This hook deliberately COMPUTES NOTHING ITSELF. Spec 38 §4.4's own budget
 * table is explicit that its per-effect KB figures are "ESTIMATES … verified
 * + recorded at Wave A build" — reproducing a second estimate here would
 * give the operator two numbers that can silently disagree, which is worse
 * than showing nothing. If the endpoint is missing, this returns `null` and
 * the caller renders no cost information at all rather than a guess.
 *
 * `useSelect`/`useState`/`useEffect` are called UNCONDITIONALLY every time
 * this hook runs (Rules of Hooks) — `enabled` only gates whether the EFFECT
 * BODY performs a fetch, not whether the hook itself is called. This is what
 * lets a caller invoke it from every block instance without one duplicate
 * network request per non-selected/non-qualifying block on the page.
 *
 * @param {boolean} enabled Whether to actually fetch (caller's block both
 *                          qualifies for fx AND is currently selected).
 * @return {Object|null} `{ totalKb, budgetKb, overBudget, effects }`, or
 *                        `null` while loading / when unavailable.
 */
function useMotionBudget( enabled ) {
	const postId = useSelect(
		( select ) => select( 'core/editor' )?.getCurrentPostId?.(),
		[]
	);
	const [ budget, setBudget ] = useState( null );

	useEffect( () => {
		if ( ! enabled || ! postId ) {
			return;
		}
		let cancelled = false;
		apiFetch( { path: `/sgs/v1/motion-budget?post_id=${ postId }` } )
			.then( ( data ) => {
				if ( ! cancelled ) {
					setBudget(
						data && 'number' === typeof data.totalKb ? data : null
					);
				}
			} )
			.catch( () => {
				// Endpoint not built yet, or genuinely nothing to measure —
				// both read the same way: no cost information to show.
				if ( ! cancelled ) {
					setBudget( null );
				}
			} );
		return () => {
			cancelled = true;
		};
	}, [ enabled, postId ] );

	return budget;
}

/*
 * ── Narrow-hue-palette warning (D946/1f) ────────────────────────────────────
 * Bean's approved direction: WARN, don't block. Reuses the exact pattern
 * already shipped for this shape of problem — `sgs/site-header`'s
 * `contrastSafe` mechanism (a computed check against the operator's own
 * colour choices, a non-dismissible `<Notice status="warning">` naming the
 * specific issue) — rather than inventing a second warning mechanism.
 *
 * The CURRENT alpha-composite blob engine's real vulnerability, measured
 * this session, is the OPPOSITE of what the (now-corrected) Colour 2 help
 * text used to say: colours picked too CLOSE together in hue wash out;
 * colours spread wide — even near-opposite ones like navy+gold — work fine.
 */

/**
 * RGB (each 0-255) -> hue, 0-360 degrees. Standard HSL hue formula. A fully
 * achromatic (grey) input has no real hue; it is reported as 0 rather than
 * excluded — a near-grey stop reads as "close to everything" in the
 * plain-English warning anyway, which is the right outcome even though the
 * literal hue value is arbitrary for it.
 *
 * @param {number} r 0-255.
 * @param {number} g 0-255.
 * @param {number} b 0-255.
 * @return {number} Hue, 0-360.
 */
function rgbToHue( r, g, b ) {
	const rN = r / 255;
	const gN = g / 255;
	const bN = b / 255;
	const max = Math.max( rN, gN, bN );
	const min = Math.min( rN, gN, bN );
	const delta = max - min;
	if ( delta === 0 ) {
		return 0;
	}
	let h;
	if ( max === rN ) {
		h = ( ( gN - bN ) / delta ) % 6;
	} else if ( max === gN ) {
		h = ( bN - rN ) / delta + 2;
	} else {
		h = ( rN - gN ) / delta + 4;
	}
	h *= 60;
	if ( h < 0 ) {
		h += 360;
	}
	return h;
}

/**
 * Circular distance between two hues on the colour wheel, 0-180 degrees
 * (the shorter way around).
 *
 * @param {number} a Hue, 0-360.
 * @param {number} b Hue, 0-360.
 * @return {number} Distance, 0-180.
 */
function circularHueDistance( a, b ) {
	const diff = Math.abs( a - b ) % 360;
	return diff > 180 ? 360 - diff : diff;
}

/**
 * Resolve a stored `DesignTokenPicker` value (slug, hex, rgb(), var(), …) to
 * a hue, via the SAME probe-element technique `wcag-contrast.js`'s
 * `calculateRelativeLuminance()` already uses for `var()` — the browser's
 * own computed style is the only reliable way to turn an arbitrary CSS
 * colour syntax into concrete channels without re-implementing CSS colour
 * parsing.
 *
 * @param {string} value   Stored colour value.
 * @param {Array}  palette Active theme colour palette ([{ slug, color }]).
 * @return {number|null} Hue, 0-360, or null when the value is empty/unresolvable.
 */
function resolveHue( value, palette ) {
	const resolved = resolveColourToken( value, palette );
	if ( ! resolved ) {
		return null;
	}
	const probe = document.createElement( 'div' );
	probe.style.color = resolved;
	document.body.appendChild( probe );
	const computed = getComputedStyle( probe ).color;
	document.body.removeChild( probe );
	const m = computed.match( /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/ );
	if ( ! m ) {
		return null;
	}
	return rgbToHue( parseInt( m[ 1 ], 10 ), parseInt( m[ 2 ], 10 ), parseInt( m[ 3 ], 10 ) );
}

/**
 * Threshold below which the four generative-background colours are flagged
 * as too close together — a conservative starting threshold, not
 * independently re-validated below 30°; revisit if real client feedback
 * disagrees. The investigation's measured data showed genuinely washed
 * palettes at 4-7 degrees spread and healthy results from 100+ degrees.
 *
 * @type {number}
 */
const FX_GEN_HUE_SPREAD_WARNING_THRESHOLD = 30;

/**
 * The "Scroll & effects" inspector panel (Spec 38 §7).
 */
const withFxControls = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { name, attributes, setAttributes, isSelected } = props;
		const qualifies =
			shouldHaveFx( name ) && ! isExtensionHidden( name, 'fx' );

		/*
		 * Called UNCONDITIONALLY, above both early returns below — `isSelected`
		 * changes on every selection/deselection of the SAME component
		 * instance, so calling a hook only after that check would violate the
		 * Rules of Hooks (a different hook count on the next render). The
		 * network fetch itself is still gated internally on `qualifies &&
		 * isSelected`, so an unselected or non-qualifying block costs nothing
		 * beyond this one no-op hook call — not a duplicate request per block
		 * on the page.
		 */
		const motionBudget = useMotionBudget( qualifies && isSelected );

		/*
		 * Generative background — geometry mechanism (v1.2 rewrite). Same
		 * unconditional-hook reasoning as `motionBudget` immediately above:
		 * called before both early returns so the hook count never changes
		 * between renders. Gates the 8 fold/displacement RangeControls
		 * behind a "Show more" disclosure in the panel below.
		 */
		const [ showGenAdvanced, setShowGenAdvanced ] = useState( false );

		/*
		 * D946/1f — narrow-hue-palette warning. Same unconditional-hook
		 * reasoning as `motionBudget`/`showGenAdvanced` above: called before
		 * both early returns so the hook count never changes between a
		 * qualifying and a non-qualifying block. `useSettings` itself is
		 * cheap and side-effect-free when its result goes unused.
		 */
		const [ genColourPalette ] = useSettings( 'color.palette' );
		const genHueSpreadWarning = useMemo( () => {
			const hues = [
				attributes.fxGenColour1,
				attributes.fxGenColour2,
				attributes.fxGenColour3,
				attributes.fxGenColour4,
			]
				.map( ( v ) => resolveHue( v, genColourPalette ) )
				.filter( ( h ) => null !== h );
			if ( hues.length < 2 ) {
				return null;
			}
			let maxSpread = 0;
			for ( let i = 0; i < hues.length; i++ ) {
				for ( let j = i + 1; j < hues.length; j++ ) {
					maxSpread = Math.max( maxSpread, circularHueDistance( hues[ i ], hues[ j ] ) );
				}
			}
			return maxSpread < FX_GEN_HUE_SPREAD_WARNING_THRESHOLD ? maxSpread : null;
		}, [
			attributes.fxGenColour1,
			attributes.fxGenColour2,
			attributes.fxGenColour3,
			attributes.fxGenColour4,
			genColourPalette,
		] );

		if ( ! qualifies ) {
			return <BlockEdit { ...props } />;
		}
		if ( ! isSelected ) {
			return <BlockEdit { ...props } />;
		}

		const { fx } = attributes;
		const isSplit = 'split-reveal' === fx;
		const isPath = 'motion-path' === fx;
		const isMorph = 'morph' === fx;
		const ownsScroll = fxOwnsScrollTransform( fx );
		const fxOptions = fxOptionsForBlock( name );

		const governedByPreset = fxPresetGovernedKeys( fx );

		/**
		 * Write one or more fx params on the client's behalf.
		 *
		 * THIS IS THE PRESET-VS-MANUAL PRECEDENCE, in one place. A preset is a
		 * WRITER, not a filter: choosing one stamps its whole governed set into
		 * the real attributes, and from that moment the attributes — not the
		 * preset — are the single source of truth for what the effect does.
		 * `fxPreset` survives only as a truthful LABEL for the last group
		 * applied, so the instant the client hand-edits any param the preset
		 * governs, that label stops being true and is cleared to "Custom" in
		 * the same interaction the client can see.
		 *
		 * The alternative — letting a preset keep overriding params underneath
		 * it — is the design this deliberately rejects: it makes a control the
		 * client can move but not change, which reads as a broken product.
		 *
		 * @param {Object} next Attribute changes.
		 */
		const setParam = ( next ) => {
			const touchesPreset = Object.keys( next ).some( ( key ) =>
				governedByPreset.includes( key )
			);
			setAttributes(
				touchesPreset && attributes.fxPreset
					? { ...next, fxPreset: '' }
					: next
			);
		};

		/**
		 * Apply an intensity preset — or clear back to Custom.
		 *
		 * Writes the FULL governed set, including the nulls that clear a param
		 * to its module default, so the state after applying a preset is fully
		 * determined and switching between levels cannot leave the previous
		 * level's values stranded.
		 *
		 * Choosing "Custom" writes nothing but the label: it means "these are
		 * my own numbers now", and wiping the client's numbers to say so would
		 * be the opposite of what they asked for.
		 *
		 * @param {string} level Preset level, or '' for Custom.
		 */
		const applyPreset = ( level ) => {
			if ( ! level ) {
				setAttributes( { fxPreset: '' } );
				return;
			}
			setAttributes( {
				...fxPresetAttributes( fx, level ),
				fxPreset: level,
			} );
		};

		/**
		 * Change the effect, clearing every param behind it.
		 *
		 * fx params are NOT interchangeable between effects: an `fxEnd` of
		 * `+=100%` is a pin length that a non-pinning effect cannot use, and an
		 * `fxSplit` of `chars` means nothing outside a text reveal. Carried
		 * across a switch they become stored state with no control rendering
		 * for them — invisible to the client and impossible for them to clear.
		 *
		 * @param {string} value New effect slug.
		 */
		const changeEffect = ( value ) =>
			setAttributes( { ...FX_PARAM_RESET, fx: value } );

		const resetAll = () =>
			setAttributes( {
				...FX_PARAM_RESET,
				fx: '',
				// Not part of FX_PARAM_RESET (see the note above that
				// constant) because `changeEffect()` must NOT clear these —
				// only the panel's own "Reset all" should.
				fxDisableTablet: false,
				fxDisableMobile: false,
			} );

		/*
		 * The §7 asset gate. A route is what gives motion-path its geometry —
		 * without one the runtime fails safe and the block simply never moves,
		 * which from the client's chair is indistinguishable from a broken
		 * feature. So the dependent controls stay DISABLED and the panel says
		 * why, rather than offering settings that cannot do anything yet.
		 */
		const pathRouteChosen =
			isPath &&
			!! attributes.fxPath &&
			( 'custom' !== attributes.fxPath ||
				( attributes.fxPathAsset || 0 ) > 0 );

		/*
		 * The same §7 asset gate, for MorphSVG. A shape PAIR is what gives
		 * morph its geometry on both ends — without one the runtime fails
		 * safe and never tweens. `custom` needs BOTH assets, not one: a
		 * matched-topology pair with only half uploaded is not a pair.
		 */
		const shapePairChosen =
			isMorph &&
			!! attributes.fxShape &&
			( 'custom' !== attributes.fxShape ||
				( ( attributes.fxShapeAssetFrom || 0 ) > 0 &&
					( attributes.fxShapeAssetTo || 0 ) > 0 ) );

		return (
			<>
				<BlockEdit { ...props } />
				<InspectorControls group="styles">
					<ToolsPanel
						label={ __( 'Scroll & effects', 'sgs-blocks' ) }
						resetAll={ resetAll }
						/*
						 * Scoping hook for `fx-panel.scss`. Added 2026-08-28 for
						 * the budget Notice below, which rendered at HALF WIDTH:
						 * `ToolsPanel` lays its children out in a TWO-COLUMN
						 * grid, so a plain (non-ToolsPanelItem) child occupies
						 * one column unless it is told to span. Scoped to this
						 * panel rather than fixing `.components-tools-panel >
						 * .components-notice` globally, because that selector
						 * would silently restyle every other panel's notices
						 * across the editor.
						 */
						className="sgs-fx-panel"
					>
						{ /*
						 * Per-page motion cost (D446 Task 19 / Bean's D448
						 * ruling — GSAP keeps its budget exemption, but the
						 * cost becomes visible). A plain child, not a
						 * ToolsPanelItem: it is informational, not a
						 * setting, and has nothing for "Reset all" to clear.
						 * Only shown once an effect exists on THIS block,
						 * because a block with no effect has nothing to
						 * attribute cost to.
						 */ }
						{ !! fx && motionBudget && (
							<Notice
								status={
									motionBudget.overBudget ? 'warning' : 'info'
								}
								isDismissible={ false }
							>
								{ motionBudget.overBudget
									? sprintf(
											/* translators: 1: current KB, 2: budget KB. */
											__(
												'This page loads about %1$s KB of scroll-effect code — over the %2$s KB budget.',
												'sgs-blocks'
											),
											motionBudget.totalKb,
											motionBudget.budgetKb
									  )
									: sprintf(
											/* translators: 1: current KB, 2: budget KB. */
											__(
												'This page loads about %1$s KB of scroll-effect code (budget: %2$s KB).',
												'sgs-blocks'
											),
											motionBudget.totalKb,
											motionBudget.budgetKb
									  ) }
							</Notice>
						) }

						<ToolsPanelItem
							hasValue={ () => !! fx }
							label={ __( 'Effect', 'sgs-blocks' ) }
							onDeselect={ () => setAttributes( { fx: '' } ) }
							isShownByDefault
						>
							<SelectControl
								__nextHasNoMarginBottom
								label={ __( 'Effect', 'sgs-blocks' ) }
								value={ fx }
								options={ fxOptions }
								onChange={ changeEffect }
								help={ __(
									'Scroll effects preview on the live site, not in the editor.',
									'sgs-blocks'
								) }
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>

						{ /*
						 * Per-breakpoint disable (D446 Task 15) — sits right
						 * under the effect picker, above intensity/timing,
						 * because "does it exist here at all" is a bigger
						 * decision than any of the fine-tuning below it.
						 * Shown whenever an effect is chosen, independent of
						 * which one — every effect can be turned off per
						 * tier the same way.
						 */ }
						{ !! fx && (
							<ToolsPanelItem
								hasValue={ () =>
									attributes.fxDisableTablet ||
									attributes.fxDisableMobile
								}
								label={ __(
									'Disable on smaller screens',
									'sgs-blocks'
								) }
								onDeselect={ () =>
									setAttributes( {
										fxDisableTablet: false,
										fxDisableMobile: false,
									} )
								}
							>
								<ToggleControl
									__nextHasNoMarginBottom
									label={ __(
										'Turn off on tablet and below',
										'sgs-blocks'
									) }
									checked={ !! attributes.fxDisableTablet }
									onChange={ ( checked ) =>
										setAttributes( {
											fxDisableTablet: checked,
											// Disabling tablet also disables
											// mobile — mobile is narrower than
											// tablet, so "on for mobile but
											// off for tablet" is not a
											// reachable state a client could
											// have meant.
											fxDisableMobile: checked
												? true
												: attributes.fxDisableMobile,
										} )
									}
									help={ __(
										'Also turns it off on mobile.',
										'sgs-blocks'
									) }
								/>
								<ToggleControl
									__nextHasNoMarginBottom
									label={ __(
										'Turn off on mobile only',
										'sgs-blocks'
									) }
									checked={
										!! attributes.fxDisableMobile &&
										! attributes.fxDisableTablet
									}
									disabled={ !! attributes.fxDisableTablet }
									onChange={ ( checked ) =>
										setAttributes( {
											fxDisableMobile: checked,
										} )
									}
									help={ __(
										'Keeps it running on tablet; only switches it off on phones.',
										'sgs-blocks'
									) }
								/>
							</ToolsPanelItem>
						) }

						{ /*
						 * The intensity preset (Spec 38 §7). Sits directly
						 * under the effect picker and above everything it
						 * governs, because that is the order the client
						 * actually decides in: what should happen, then how
						 * much of it. Shown by default for the same reason —
						 * a client who never opens "+" should still be able to
						 * get a considered result, and before this they were
						 * handed scrub smoothing in seconds instead.
						 */ }
						{ !! fx && fxHasPresets( fx ) && (
							<ToolsPanelItem
								hasValue={ () => !! attributes.fxPreset }
								label={ __( 'Intensity', 'sgs-blocks' ) }
								onDeselect={ () => applyPreset( '' ) }
								isShownByDefault
							>
								<SelectControl
									__nextHasNoMarginBottom
									label={ __( 'Intensity', 'sgs-blocks' ) }
									value={ attributes.fxPreset }
									options={ [
										{
											label: __(
												'Custom — my own settings',
												'sgs-blocks'
											),
											value: '',
										},
										...fxPresets.levels.map(
											( level ) => ( {
												label: level.label,
												value: level.value,
											} )
										),
									] }
									onChange={ applyPreset }
									help={
										attributes.fxPreset
											? sprintf(
													/* translators: %s: plain-English description of the chosen intensity. */
													__(
														'%s Changing any setting below switches this to Custom.',
														'sgs-blocks'
													),
													fxPresets.levels.find(
														( level ) =>
															level.value ===
															attributes.fxPreset
													)?.description || ''
											  )
											: __(
													'Pick a starting point, then fine-tune below if you want to. Intensity changes how the motion feels — it never changes what people who prefer reduced motion see.',
													'sgs-blocks'
											  )
									}
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						) }

						{ /*
						 * Motion-path route picker — Spec 38 §11.2 (D427).
						 * Shown by default because it is not a refinement:
						 * without a route this effect has no geometry and the
						 * block does not move at all.
						 */ }
						{ isPath && (
							<ToolsPanelItem
								hasValue={ () => !! attributes.fxPath }
								label={ __( 'Route', 'sgs-blocks' ) }
								onDeselect={ () =>
									setAttributes( {
										fxPath: '',
										fxPathAsset: undefined,
										fxPathRotate: '',
									} )
								}
								isShownByDefault
							>
								<ToggleGroupControl
									__nextHasNoMarginBottom
									__next40pxDefaultSize
									isBlock
									label={ __( 'Route', 'sgs-blocks' ) }
									value={ attributes.fxPath }
									onChange={ ( value ) =>
										setAttributes( {
											fxPath: value || '',
											// Dropping out of "My own SVG"
											// releases the file too — leaving
											// an attachment ID attached to a
											// curated route would be stored
											// state with no control showing it.
											fxPathAsset:
												'custom' === value
													? attributes.fxPathAsset
													: undefined,
										} )
									}
									help={ __(
										'The shape this block travels along as the visitor scrolls. It crosses the section the block sits in, and starts at the beginning of the route rather than where the block currently sits.',
										'sgs-blocks'
									) }
								>
									{ FX_PATH_OPTIONS.map( ( option ) => (
										<RouteOption
											key={ option.value }
											value={ option.value }
											label={ option.label }
											icon={ routeThumbnail( option.d ) }
										/>
									) ) }
								</ToggleGroupControl>

								{ ! attributes.fxPath && (
									<Notice
										status="warning"
										isDismissible={ false }
									>
										{ __(
											'Pick a route above. Until you do, this block will not move on the live site.',
											'sgs-blocks'
										) }
									</Notice>
								) }

								{ 'custom' === attributes.fxPath && (
									<MediaUploadCheck>
										<Notice
											status="info"
											isDismissible={ false }
										>
											{ __(
												'Upload an .svg file containing ONE line — the first line in the file is the route. Draw it left-to-right in the direction you want the block to travel. Upload via the media library; SVG code cannot be pasted in, because that would be a security risk.',
												'sgs-blocks'
											) }
										</Notice>

										{ ( attributes.fxPathAsset || 0 ) >
										0 ? (
											<Button
												variant="secondary"
												isDestructive
												size="small"
												onClick={ () =>
													setAttributes( {
														fxPathAsset: undefined,
													} )
												}
											>
												{ sprintf(
													/* translators: %d: media library attachment ID. */
													__(
														'Remove SVG (attachment %d)',
														'sgs-blocks'
													),
													attributes.fxPathAsset
												) }
											</Button>
										) : (
											<MediaUpload
												allowedTypes={ [
													'image/svg+xml',
												] }
												value={ attributes.fxPathAsset }
												onSelect={ ( media ) =>
													setAttributes( {
														fxPathAsset: media?.id,
													} )
												}
												render={ ( { open } ) => (
													<Button
														variant="secondary"
														onClick={ open }
													>
														{ __(
															'Choose SVG file',
															'sgs-blocks'
														) }
													</Button>
												) }
											/>
										) }
									</MediaUploadCheck>
								) }
							</ToolsPanelItem>
						) }

						{ isPath && (
							<ToolsPanelItem
								hasValue={ () =>
									'false' === attributes.fxPathRotate
								}
								label={ __(
									'Turn to follow the route',
									'sgs-blocks'
								) }
								onDeselect={ () =>
									setAttributes( { fxPathRotate: '' } )
								}
							>
								<ToggleControl
									__nextHasNoMarginBottom
									label={ __(
										'Turn to follow the route',
										'sgs-blocks'
									) }
									// The §7 asset gate: no route resolved yet,
									// so there is nothing for this to affect.
									// Disabled and explained beats enabled and
									// inert.
									disabled={ ! pathRouteChosen }
									checked={
										'false' !== attributes.fxPathRotate
									}
									onChange={ ( checked ) =>
										setAttributes( {
											fxPathRotate: checked
												? ''
												: 'false',
										} )
									}
									help={
										pathRouteChosen
											? __(
													'On: the block tilts to face the direction it is moving, like a plane following a flight path. Off: it stays upright the whole way — usually what you want for a logo or a photo.',
													'sgs-blocks'
											  )
											: __(
													'Choose a route first.',
													'sgs-blocks'
											  )
									}
								/>
							</ToolsPanelItem>
						) }

						{ /*
						 * Resting position — Spec 38 §11.2 (D441). Where the
						 * traveller settles once its scroll-scrubbed journey
						 * finishes. Gated on `pathRouteChosen` exactly like
						 * the rotate toggle above: without a route there is
						 * nothing to settle FROM, so a resting position has
						 * nothing to do yet.
						 */ }
						{ isPath && (
							<ToolsPanelItem
								hasValue={ () => !! attributes.fxPathRest }
								label={ __( 'Resting position', 'sgs-blocks' ) }
								onDeselect={ () =>
									setAttributes( {
										fxPathRest: '',
										fxPathRestVh: undefined,
									} )
								}
								isShownByDefault
							>
								<ToggleGroupControl
									__nextHasNoMarginBottom
									__next40pxDefaultSize
									isBlock
									label={ __(
										'Resting position',
										'sgs-blocks'
									) }
									// An unset value reads as "Middle of the
									// screen" — fx-motion-path.css's default
									// rule already resolves unset the same
									// way, so this just makes that visible.
									value={ attributes.fxPathRest || 'middle' }
									disabled={ ! pathRouteChosen }
									onChange={ ( value ) =>
										setAttributes( {
											fxPathRest:
												'middle' === value
													? ''
													: value || '',
											// Dropping out of "Custom"
											// releases the fine-tune value —
											// leaving it stored would be
											// state with no control showing
											// it once the preset changes.
											fxPathRestVh:
												'custom' === value
													? attributes.fxPathRestVh ??
													  50
													: undefined,
										} )
									}
									help={
										pathRouteChosen
											? __(
													'Where the block should stop and stay readable once it finishes travelling. Middle of the screen is the safest default — text that animates into place is meant to be read.',
													'sgs-blocks'
											  )
											: __(
													'Choose a route first.',
													'sgs-blocks'
											  )
									}
								>
									<ToggleGroupControlOption
										value="below-header"
										label={ __(
											'Just below header',
											'sgs-blocks'
										) }
									/>
									<ToggleGroupControlOption
										value="middle"
										label={ __(
											'Middle of screen',
											'sgs-blocks'
										) }
									/>
									<ToggleGroupControlOption
										value="lower-third"
										label={ __(
											'Lower third',
											'sgs-blocks'
										) }
									/>
									<ToggleGroupControlOption
										value="custom"
										label={ __( 'Custom', 'sgs-blocks' ) }
									/>
								</ToggleGroupControl>

								{ /*
								 * Fine-tune only appears for Custom — showing
								 * it for every preset would clutter the panel
								 * for a client who just wants one of the
								 * three named positions (the brief's own
								 * "must not clutter" condition).
								 */ }
								{ 'custom' === attributes.fxPathRest && (
									<RangeControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __(
											'Fine-tune (% down the screen)',
											'sgs-blocks'
										) }
										value={ attributes.fxPathRestVh ?? 50 }
										min={ 0 }
										max={ 100 }
										step={ 5 }
										disabled={ ! pathRouteChosen }
										onChange={ ( value ) =>
											setAttributes( {
												fxPathRestVh:
													undefined === value
														? 50
														: value,
											} )
										}
										help={ __(
											'0% rests right below the header; 100% rests at the very bottom of the screen. It can never end up UNDER the header, whatever you choose.',
											'sgs-blocks'
										) }
									/>
								) }
							</ToolsPanelItem>
						) }

						{ /*
						 * Shape-pair picker — Spec 38 §11.2 / §3.4 (D427).
						 * Shown by default for the same reason the route
						 * picker is: without a pair this effect has no
						 * geometry and the block never morphs at all.
						 */ }
						{ isMorph && (
							<ToolsPanelItem
								hasValue={ () => !! attributes.fxShape }
								label={ __( 'Shapes', 'sgs-blocks' ) }
								onDeselect={ () =>
									setAttributes( {
										fxShape: '',
										fxShapeAssetFrom: undefined,
										fxShapeAssetTo: undefined,
									} )
								}
								isShownByDefault
							>
								<ToggleGroupControl
									__nextHasNoMarginBottom
									__next40pxDefaultSize
									isBlock
									label={ __( 'Shapes', 'sgs-blocks' ) }
									value={ attributes.fxShape }
									onChange={ ( value ) =>
										setAttributes( {
											fxShape: value || '',
											// Dropping out of "My own shapes"
											// releases both files — leaving an
											// attachment ID attached to a
											// curated pair would be stored
											// state with no control showing it.
											fxShapeAssetFrom:
												'custom' === value
													? attributes.fxShapeAssetFrom
													: undefined,
											fxShapeAssetTo:
												'custom' === value
													? attributes.fxShapeAssetTo
													: undefined,
										} )
									}
									help={ __(
										'The starting shape reshapes into the second shape once the effect plays.',
										'sgs-blocks'
									) }
								>
									{ FX_SHAPE_OPTIONS.map( ( option ) => (
										<RouteOption
											key={ option.value }
											value={ option.value }
											label={ option.label }
											icon={ shapeThumbnail( option.d ) }
										/>
									) ) }
								</ToggleGroupControl>

								{ ! attributes.fxShape && (
									<Notice
										status="warning"
										isDismissible={ false }
									>
										{ __(
											'Pick a shape pair above. Until you do, this block will not morph on the live site.',
											'sgs-blocks'
										) }
									</Notice>
								) }

								{ 'custom' === attributes.fxShape && (
									<MediaUploadCheck>
										<Notice
											status="info"
											isDismissible={ false }
										>
											{ __(
												'Upload two .svg files, each containing ONE shape line, with roughly the same number of points — that is what makes the morph look clean rather than tangled. Upload via the media library; SVG code cannot be pasted in, because that would be a security risk.',
												'sgs-blocks'
											) }
										</Notice>

										<p>
											{ __(
												'Starting shape',
												'sgs-blocks'
											) }
										</p>
										{ ( attributes.fxShapeAssetFrom || 0 ) >
										0 ? (
											<Button
												variant="secondary"
												isDestructive
												size="small"
												onClick={ () =>
													setAttributes( {
														fxShapeAssetFrom:
															undefined,
													} )
												}
											>
												{ sprintf(
													/* translators: %d: media library attachment ID. */
													__(
														'Remove SVG (attachment %d)',
														'sgs-blocks'
													),
													attributes.fxShapeAssetFrom
												) }
											</Button>
										) : (
											<MediaUpload
												allowedTypes={ [
													'image/svg+xml',
												] }
												value={
													attributes.fxShapeAssetFrom
												}
												onSelect={ ( media ) =>
													setAttributes( {
														fxShapeAssetFrom:
															media?.id,
													} )
												}
												render={ ( { open } ) => (
													<Button
														variant="secondary"
														onClick={ open }
													>
														{ __(
															'Choose SVG file',
															'sgs-blocks'
														) }
													</Button>
												) }
											/>
										) }

										<p>
											{ __(
												'Ending shape',
												'sgs-blocks'
											) }
										</p>
										{ ( attributes.fxShapeAssetTo || 0 ) >
										0 ? (
											<Button
												variant="secondary"
												isDestructive
												size="small"
												onClick={ () =>
													setAttributes( {
														fxShapeAssetTo:
															undefined,
													} )
												}
											>
												{ sprintf(
													/* translators: %d: media library attachment ID. */
													__(
														'Remove SVG (attachment %d)',
														'sgs-blocks'
													),
													attributes.fxShapeAssetTo
												) }
											</Button>
										) : (
											<MediaUpload
												allowedTypes={ [
													'image/svg+xml',
												] }
												value={
													attributes.fxShapeAssetTo
												}
												onSelect={ ( media ) =>
													setAttributes( {
														fxShapeAssetTo:
															media?.id,
													} )
												}
												render={ ( { open } ) => (
													<Button
														variant="secondary"
														onClick={ open }
													>
														{ __(
															'Choose SVG file',
															'sgs-blocks'
														) }
													</Button>
												) }
											/>
										) }
									</MediaUploadCheck>
								) }

								{ isMorph &&
									!! attributes.fxShape &&
									! shapePairChosen && (
										<Notice
											status="warning"
											isDismissible={ false }
										>
											{ __(
												'Upload both shapes above to finish setting this up.',
												'sgs-blocks'
											) }
										</Notice>
									) }
							</ToolsPanelItem>
						) }

						{ ownsScroll && (
							<ToolsPanelItem
								hasValue={ () => false }
								label={ __(
									'Entrance animation',
									'sgs-blocks'
								) }
								isShownByDefault
							>
								<Notice status="info" isDismissible={ false }>
									{ __(
										'A scroll effect controls this block’s motion — entrance animation is off.',
										'sgs-blocks'
									) }
								</Notice>
							</ToolsPanelItem>
						) }

						{ !! fx && (
							<ToolsPanelItem
								hasValue={ () => !! attributes.fxStart }
								label={ __( 'Start position', 'sgs-blocks' ) }
								onDeselect={ () => setParam( { fxStart: '' } ) }
							>
								<SelectControl
									__nextHasNoMarginBottom
									label={ __(
										'Start position',
										'sgs-blocks'
									) }
									value={ attributes.fxStart }
									options={ FX_START_OPTIONS }
									onChange={ ( value ) =>
										setParam( { fxStart: value } )
									}
									help={ __(
										'How far the visitor needs to scroll before the effect begins.',
										'sgs-blocks'
									) }
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						) }

						{ !! fx && fxTriggerOptions( fx ).length > 0 && (
							<ToolsPanelItem
								hasValue={ () => !! attributes.fxTrigger }
								label={ __( 'When it starts', 'sgs-blocks' ) }
								onDeselect={ () =>
									setAttributes( { fxTrigger: '' } )
								}
							>
								<SelectControl
									__nextHasNoMarginBottom
									label={ __(
										'When it starts',
										'sgs-blocks'
									) }
									value={ attributes.fxTrigger }
									options={ fxTriggerOptions( fx ) }
									onChange={ ( value ) =>
										setAttributes( { fxTrigger: value } )
									}
									help={ __(
										'Hover also responds to keyboard focus, and plays automatically on touch screens where there is no hover.',
										'sgs-blocks'
									) }
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						) }

						{ !! fx && (
							<ToolsPanelItem
								hasValue={ () => !! attributes.fxEnd }
								label={
									fxPins( fx )
										? __(
												'How long it stays stuck',
												'sgs-blocks'
										  )
										: __(
												'Where it finishes',
												'sgs-blocks'
										  )
								}
								onDeselect={ () => setParam( { fxEnd: '' } ) }
							>
								<SelectControl
									__nextHasNoMarginBottom
									label={
										fxPins( fx )
											? __(
													'How long it stays stuck',
													'sgs-blocks'
											  )
											: __(
													'Where it finishes',
													'sgs-blocks'
											  )
									}
									value={ attributes.fxEnd }
									options={
										fxPins( fx )
											? FX_END_PIN_OPTIONS
											: FX_END_POSITION_OPTIONS
									}
									onChange={ ( value ) =>
										setParam( { fxEnd: value } )
									}
									help={
										fxPins( fx )
											? __(
													'How far the visitor keeps scrolling while the section holds still.',
													'sgs-blocks'
											  )
											: __(
													'How far the visitor needs to scroll before the effect has finished.',
													'sgs-blocks'
											  )
									}
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						) }

						{ !! fx && fxPins( fx ) && (
							<ToolsPanelItem
								hasValue={ () => !! attributes.fxHold }
								label={ __(
									'Pause after the animation',
									'sgs-blocks'
								) }
								onDeselect={ () => setParam( { fxHold: '' } ) }
							>
								<SelectControl
									__nextHasNoMarginBottom
									label={ __(
										'Pause after the animation',
										'sgs-blocks'
									) }
									value={ attributes.fxHold }
									options={ FX_HOLD_OPTIONS }
									onChange={ ( value ) =>
										setParam( { fxHold: value } )
									}
									help={ __(
										'How long the section keeps holding still after all its content has arrived, before the page scrolls on.',
										'sgs-blocks'
									) }
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						) }

						{ ( 'scrub' === fx || isSplit ) && (
							<ToolsPanelItem
								hasValue={ () => !! attributes.fxEase }
								label={ __( 'Feel', 'sgs-blocks' ) }
								onDeselect={ () => setParam( { fxEase: '' } ) }
							>
								<SelectControl
									__nextHasNoMarginBottom
									label={ __( 'Feel', 'sgs-blocks' ) }
									value={ attributes.fxEase }
									options={ FX_EASE_OPTIONS }
									onChange={ ( value ) =>
										setParam( { fxEase: value } )
									}
									help={ __(
										'How the motion speeds up and slows down.',
										'sgs-blocks'
									) }
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						) }

						{ /*
						  * Cursor-reactive field (FR-38-25). Three controls,
						  * all `isShownByDefault` because none of them is an
						  * advanced tweak — the type IS the effect, and a
						  * client who turns this on will want to choose how it
						  * looks immediately.
						  *
						  * PARTICIPANTS GET NO CONTROL, deliberately. An opaque
						  * child paints its own share of the same field so the
						  * effect reads continuously across it (Bean: it
						  * "should be able to go over any surface seamlessly"),
						  * and that is detected at runtime from the child's
						  * computed background. Exposing a per-child opt-out
						  * would add a setting to ~51 blocks that almost nobody
						  * would ever open.
						  */ }
						{ 'wave-gradient' === fx && (
							<>
								{ /*
								  * Style picker. FOUR of these five are pure CSS —
								  * only "aurora" boots a WebGL context, because
								  * filamentary curtains need per-pixel noise and
								  * domain warping, which CSS cannot express
								  * (proven across three CSS attempts, D838).
								  * A CSS variant therefore costs no canvas, no
								  * capability probe and no fallback contract.
								  */ }
								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxWaveVariant
										}
										label={ __( 'Style', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxWaveVariant: undefined } )
										}
										isShownByDefault
									>
										<SelectControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Style', 'sgs-blocks' ) }
											value={ attributes.fxWaveVariant || 'pastel' }
											options={ [
												{ label: __( 'Pastel — soft daylight wash', 'sgs-blocks' ), value: 'pastel' },
												{ label: __( 'Aurora — northern lights', 'sgs-blocks' ), value: 'aurora' },
												{ label: __( 'Ink — swirling pigment', 'sgs-blocks' ), value: 'ink' },
												{ label: __( 'Horizon — glow along the base', 'sgs-blocks' ), value: 'horizon' },
												{ label: __( 'Ribbon — one band crossing', 'sgs-blocks' ), value: 'ribbon' },
												{ label: __( 'Veil — broad drifting sheets', 'sgs-blocks' ), value: 'veil' },
											] }
											onChange={ ( value ) =>
												setParam( { fxWaveVariant: value } )
											}
											help={ __(
												'Each style ships with colours chosen to suit it — change any of them below to match your brand. Aurora and Ink are drawn on the graphics card; the rest are pure CSS and cost nothing extra.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								{ /*
								  * A colour is never an optional ToolsPanelItem
								  * (golden-controls.json rule 9c) — these four
								  * rows always render, always visible. Each uses
								  * the single-entry `states` shape (rule 9a) so
								  * it matches every other colour row in the
								  * framework: a thin swatch row with a popover
								  * picker, no tabs (one state = no tabs).
								  */ }
								<DesignTokenPicker
									label={ __( 'Base colour', 'sgs-blocks' ) }
									help={ __(
										'The colour underneath everything. The other three blend on top of it.',
										'sgs-blocks'
									) }
									states={ [
										{
											key: 'normal',
											label: __( 'Normal', 'sgs-blocks' ),
											value: attributes.fxWaveBase,
											onChange: ( val ) =>
												setParam( { fxWaveBase: val ?? '' } ),
											linked: true,
										},
									] }
								/>

								<DesignTokenPicker
									label={ ( 'aurora' === attributes.fxWaveVariant || 'ink' === attributes.fxWaveVariant ) ? __( 'Ramp colour — low', 'sgs-blocks' ) : __( 'Wave colour 1', 'sgs-blocks' ) }
									help={ __(
										'One of three colours that flow across the base. Each moves independently.',
										'sgs-blocks'
									) }
									states={ [
										{
											key: 'normal',
											label: __( 'Normal', 'sgs-blocks' ),
											value: attributes.fxWave1,
											onChange: ( val ) =>
												setParam( { fxWave1: val ?? '' } ),
											linked: true,
										},
									] }
								/>

								<DesignTokenPicker
									label={ ( 'aurora' === attributes.fxWaveVariant || 'ink' === attributes.fxWaveVariant ) ? __( 'Ramp colour — mid', 'sgs-blocks' ) : __( 'Wave colour 2', 'sgs-blocks' ) }
									help={ __(
										'The second flowing colour.',
										'sgs-blocks'
									) }
									states={ [
										{
											key: 'normal',
											label: __( 'Normal', 'sgs-blocks' ),
											value: attributes.fxWave2,
											onChange: ( val ) =>
												setParam( { fxWave2: val ?? '' } ),
											linked: true,
										},
									] }
								/>

								<DesignTokenPicker
									label={ ( 'aurora' === attributes.fxWaveVariant || 'ink' === attributes.fxWaveVariant ) ? __( 'Ramp colour — high', 'sgs-blocks' ) : __( 'Wave colour 3', 'sgs-blocks' ) }
									help={ __(
										'The third flowing colour.',
										'sgs-blocks'
									) }
									states={ [
										{
											key: 'normal',
											label: __( 'Normal', 'sgs-blocks' ),
											value: attributes.fxWave3,
											onChange: ( val ) =>
												setParam( { fxWave3: val ?? '' } ),
											linked: true,
										},
									] }
								/>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxWaveSpeed
										}
										label={ __( 'Speed', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxWaveSpeed: undefined } )
										}
										isShownByDefault
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Speed', 'sgs-blocks' ) }
											value={ attributes.fxWaveSpeed }
											onChange={ ( value ) =>
												setParam( { fxWaveSpeed: value } )
											}
											min={ 5 }
											max={ 150 }
											step={ 5 }
											help={ __(
												'How quickly the colours drift across the section.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxWaveAmplitude
										}
										label={ __( 'Wave depth', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxWaveAmplitude: undefined } )
										}
										isShownByDefault
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Wave depth', 'sgs-blocks' ) }
											value={ attributes.fxWaveAmplitude }
											onChange={ ( value ) =>
												setParam( { fxWaveAmplitude: value } )
											}
											min={ 0 }
											max={ 100 }
											step={ 5 }
											help={ __(
												'How much the surface ripples. Zero is a still gradient that still shifts colour.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<Notice status="info" isDismissible={ false }>
									{ __(
										'This animates on the live site only — the editor canvas shows the still fallback in your chosen colours. Visitors get a Pause control, and it stops on its own when off-screen or under reduced-motion settings.',
										'sgs-blocks'
									) }
								</Notice>
							</>
						) }

						{ /*
						  * Generative background (Spec 38, D874 — v1 static
						  * build only). Four colours + one ground preset.
						  * Speed/Size/Shape/Position are DELIBERATELY absent —
						  * the technique spec's Configurability-axes table
						  * scopes them to v1.1 (they need the folded-plane
						  * geometry this v1 does not build), and a control
						  * that visibly does nothing is a defect, not a
						  * convenience.
						  */ }
						{ 'generative-background' === fx && (
							<>
								{ null !== genHueSpreadWarning && (
									<Notice
										status="warning"
										isDismissible={ false }
										className="sgs-fx-gen-hue-spread-notice"
									>
										{ __(
											'These four colours are close together on the colour wheel — the background effect may look flat or washed out. Try picking colours from more different parts of the colour wheel.',
											'sgs-blocks'
										) }
									</Notice>
								) }
								<DesignTokenPicker
									label={ __( 'Colour 1', 'sgs-blocks' ) }
									help={ __(
										'The first of four colours the gradient blends between.',
										'sgs-blocks'
									) }
									states={ [
										{
											key: 'normal',
											label: __( 'Normal', 'sgs-blocks' ),
											value: attributes.fxGenColour1,
											onChange: ( val ) =>
												setParam( { fxGenColour1: val ?? '' } ),
											linked: true,
										},
									] }
								/>

								<DesignTokenPicker
									label={ __( 'Colour 2', 'sgs-blocks' ) }
									help={ __(
										'For a premium result pick colours spread WIDELY across the colour wheel — colours that sit too close together (even similar-looking shades of one hue) can blend into a flat, washed-out result.',
										'sgs-blocks'
									) }
									states={ [
										{
											key: 'normal',
											label: __( 'Normal', 'sgs-blocks' ),
											value: attributes.fxGenColour2,
											onChange: ( val ) =>
												setParam( { fxGenColour2: val ?? '' } ),
											linked: true,
										},
									] }
								/>

								<DesignTokenPicker
									label={ __( 'Colour 3', 'sgs-blocks' ) }
									help={ __(
										'The third gradient colour.',
										'sgs-blocks'
									) }
									states={ [
										{
											key: 'normal',
											label: __( 'Normal', 'sgs-blocks' ),
											value: attributes.fxGenColour3,
											onChange: ( val ) =>
												setParam( { fxGenColour3: val ?? '' } ),
											linked: true,
										},
									] }
								/>

								<DesignTokenPicker
									label={ __( 'Colour 4', 'sgs-blocks' ) }
									help={ __(
										'The fourth gradient colour.',
										'sgs-blocks'
									) }
									states={ [
										{
											key: 'normal',
											label: __( 'Normal', 'sgs-blocks' ),
											value: attributes.fxGenColour4,
											onChange: ( val ) =>
												setParam( { fxGenColour4: val ?? '' } ),
											linked: true,
										},
									] }
								/>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenGround &&
											'' !== attributes.fxGenGround
										}
										label={ __( 'Ground', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenGround: '' } )
										}
										isShownByDefault
									>
										<SelectControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Ground', 'sgs-blocks' ) }
											value={ attributes.fxGenGround || 'light' }
											options={ [
												{ label: __( 'Light — bright colour on a light background', 'sgs-blocks' ), value: 'light' },
												{ label: __( 'Dark — saturated colour on a near-black background', 'sgs-blocks' ), value: 'dark' },
											] }
											onChange={ ( value ) =>
												setParam( { fxGenGround: value } )
											}
											help={ __(
												'Resolved from your theme colours — light reads as a bounded shape with text placed beside it; dark reads as a richer, moodier field.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenSpeed
										}
										label={ __( 'Speed', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenSpeed: undefined } )
										}
										isShownByDefault
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Speed', 'sgs-blocks' ) }
											value={ attributes.fxGenSpeed }
											onChange={ ( value ) =>
												setParam( { fxGenSpeed: value } )
											}
											min={ 5 }
											max={ 150 }
											step={ 5 }
											help={ __(
												'How quickly the shape breathes and drifts.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenDisplaceAmount
										}
										label={ __( 'Intensity', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenDisplaceAmount: undefined } )
										}
										isShownByDefault
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Intensity', 'sgs-blocks' ) }
											value={ attributes.fxGenDisplaceAmount }
											onChange={ ( value ) =>
												setParam( { fxGenDisplaceAmount: value } )
											}
											min={ 0 }
											max={ 40 }
											step={ 1 }
											help={ __(
												'How much the surface breathes in and out. Zero is a still folded shape.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								{ /*
								  * Advanced geometry controls (v1.2 geometry
								  * rebuild) — behind the ToolsPanel's own "+"
								  * disclosure (isShownByDefault={ false }, the
								  * same mechanism already used elsewhere in
								  * this panel, e.g. line ~4100 below) rather
								  * than inventing a new "Show more" widget.
								  */ }
								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenFoldFreq1
										}
										label={ __( 'Fold angle 1 frequency', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenFoldFreq1: undefined } )
										}
										isShownByDefault={ false }
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Fold angle 1 frequency', 'sgs-blocks' ) }
											value={ attributes.fxGenFoldFreq1 }
											onChange={ ( value ) =>
												setParam( { fxGenFoldFreq1: value } )
											}
											min={ -2 }
											max={ 2 }
											step={ 0.05 }
											help={ __(
												'How far the first fold rotates the shape.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenFoldFreq2
										}
										label={ __( 'Fold angle 2 frequency', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenFoldFreq2: undefined } )
										}
										isShownByDefault={ false }
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Fold angle 2 frequency', 'sgs-blocks' ) }
											value={ attributes.fxGenFoldFreq2 }
											onChange={ ( value ) =>
												setParam( { fxGenFoldFreq2: value } )
											}
											min={ -2 }
											max={ 2 }
											step={ 0.05 }
											help={ __(
												'How far the second fold rotates the shape.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenFoldFreq3
										}
										label={ __( 'Fold angle 3 frequency', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenFoldFreq3: undefined } )
										}
										isShownByDefault={ false }
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Fold angle 3 frequency', 'sgs-blocks' ) }
											value={ attributes.fxGenFoldFreq3 }
											onChange={ ( value ) =>
												setParam( { fxGenFoldFreq3: value } )
											}
											min={ -2 }
											max={ 2 }
											step={ 0.05 }
											help={ __(
												'How far the third fold rotates the shape.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenFoldPower1
										}
										label={ __( 'Fold 1 shaping', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenFoldPower1: undefined } )
										}
										isShownByDefault={ false }
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Fold 1 shaping', 'sgs-blocks' ) }
											value={ attributes.fxGenFoldPower1 }
											onChange={ ( value ) =>
												setParam( { fxGenFoldPower1: value } )
											}
											min={ 0.1 }
											max={ 8 }
											step={ 0.1 }
											help={ __(
												'How sharply the first fold curves — higher is a tighter bend.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenFoldPower2
										}
										label={ __( 'Fold 2 shaping', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenFoldPower2: undefined } )
										}
										isShownByDefault={ false }
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Fold 2 shaping', 'sgs-blocks' ) }
											value={ attributes.fxGenFoldPower2 }
											onChange={ ( value ) =>
												setParam( { fxGenFoldPower2: value } )
											}
											min={ 0.1 }
											max={ 8 }
											step={ 0.1 }
											help={ __(
												'How sharply the second fold curves — higher is a tighter bend.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenFoldPower3
										}
										label={ __( 'Fold 3 shaping', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenFoldPower3: undefined } )
										}
										isShownByDefault={ false }
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Fold 3 shaping', 'sgs-blocks' ) }
											value={ attributes.fxGenFoldPower3 }
											onChange={ ( value ) =>
												setParam( { fxGenFoldPower3: value } )
											}
											min={ 0.1 }
											max={ 8 }
											step={ 0.1 }
											help={ __(
												'How sharply the third fold curves — higher is a tighter bend.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenDisplaceFreqX
										}
										label={ __( 'Breathing frequency — X', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenDisplaceFreqX: undefined } )
										}
										isShownByDefault={ false }
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Breathing frequency — X', 'sgs-blocks' ) }
											value={ attributes.fxGenDisplaceFreqX }
											onChange={ ( value ) =>
												setParam( { fxGenDisplaceFreqX: value } )
											}
											min={ 0 }
											max={ 0.05 }
											step={ 0.001 }
											help={ __(
												'How tightly the breathing pattern repeats across the shape, left to right.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenDisplaceFreqZ
										}
										label={ __( 'Breathing frequency — Z', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenDisplaceFreqZ: undefined } )
										}
										isShownByDefault={ false }
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Breathing frequency — Z', 'sgs-blocks' ) }
											value={ attributes.fxGenDisplaceFreqZ }
											onChange={ ( value ) =>
												setParam( { fxGenDisplaceFreqZ: value } )
											}
											min={ 0 }
											max={ 0.05 }
											step={ 0.001 }
											help={ __(
												'How tightly the breathing pattern repeats across the shape, front to back.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								{ /*
								  * Striation / glow-gate + depth-fade advanced
								  * controls (§3, 2026-08-28 build) — same "+"
								  * disclosure as the geometry controls above.
								  */ }
								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenGlowAmount
										}
										label={ __( 'Fine-texture visibility', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenGlowAmount: undefined } )
										}
										isShownByDefault={ false }
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Fine-texture visibility', 'sgs-blocks' ) }
											value={ attributes.fxGenGlowAmount }
											onChange={ ( value ) =>
												setParam( { fxGenGlowAmount: value } )
											}
											min={ 0 }
											max={ 100 }
											step={ 1 }
											help={ __(
												'How strongly the fine texture appears where the surface turns away from view.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenGlowPower
										}
										label={ __( 'Fine-texture contrast', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenGlowPower: undefined } )
										}
										isShownByDefault={ false }
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Fine-texture contrast', 'sgs-blocks' ) }
											value={ attributes.fxGenGlowPower }
											onChange={ ( value ) =>
												setParam( { fxGenGlowPower: value } )
											}
											min={ 0.1 }
											max={ 8 }
											step={ 0.1 }
											help={ __(
												'How sharply the fine texture fades between visible and hidden areas.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenGlowRamp
										}
										label={ __( 'Fine-texture spread', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenGlowRamp: undefined } )
										}
										isShownByDefault={ false }
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Fine-texture spread', 'sgs-blocks' ) }
											value={ attributes.fxGenGlowRamp }
											onChange={ ( value ) =>
												setParam( { fxGenGlowRamp: value } )
											}
											min={ 0.05 }
											max={ 2 }
											step={ 0.05 }
											help={ __(
												'How much of the surface the fine texture spreads across.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenStriationStrength
										}
										label={ __( 'Fine-texture strength', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenStriationStrength: undefined } )
										}
										isShownByDefault={ false }
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Fine-texture strength', 'sgs-blocks' ) }
											value={ attributes.fxGenStriationStrength }
											onChange={ ( value ) =>
												setParam( { fxGenStriationStrength: value } )
											}
											min={ 0 }
											max={ 0.6 }
											step={ 0.01 }
											help={ __(
												'How much the fine texture lightens the surface. Zero removes it entirely.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenStriationFreq
										}
										label={ __( 'Fine-texture detail', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenStriationFreq: undefined } )
										}
										isShownByDefault={ false }
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Fine-texture detail', 'sgs-blocks' ) }
											value={ attributes.fxGenStriationFreq }
											onChange={ ( value ) =>
												setParam( { fxGenStriationFreq: value } )
											}
											min={ 5 }
											max={ 120 }
											step={ 1 }
											help={ __(
												'How fine-grained the texture pattern is.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenColourAttenuation
										}
										label={ __( 'Fine-texture colour blend', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenColourAttenuation: undefined } )
										}
										isShownByDefault={ false }
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Fine-texture colour blend', 'sgs-blocks' ) }
											value={ attributes.fxGenColourAttenuation }
											onChange={ ( value ) =>
												setParam( { fxGenColourAttenuation: value } )
											}
											min={ 0 }
											max={ 2 }
											step={ 0.05 }
											help={ __(
												'How much the fine texture backs off over the bluer parts of the gradient.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<ToolsPanelItem
										hasValue={ () =>
											undefined !== attributes.fxGenParabolaPower
										}
										label={ __( 'Fine-texture edge fade', 'sgs-blocks' ) }
										onDeselect={ () =>
											setParam( { fxGenParabolaPower: undefined } )
										}
										isShownByDefault={ false }
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __( 'Fine-texture edge fade', 'sgs-blocks' ) }
											value={ attributes.fxGenParabolaPower }
											onChange={ ( value ) =>
												setParam( { fxGenParabolaPower: value } )
											}
											min={ 0.2 }
											max={ 6 }
											step={ 0.1 }
											help={ __(
												'How much the fine texture fades out at the left and right edges of the shape.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>

								<Notice status="info" isDismissible={ false }>
									{ __(
										'This animates on the live site only — the editor canvas shows the still fallback in your chosen colours. Visitors get a Pause control, and it stops on its own when off-screen or under reduced-motion settings.',
										'sgs-blocks'
									) }
								</Notice>
							</>
						) }

						{ 'magnet' === fx && (
							<>
								<ToolsPanelItem
									hasValue={ () =>
										undefined !==
										attributes.fxMagnetStrength
									}
									label={ __( 'Pull distance', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( {
											fxMagnetStrength: undefined,
										} )
									}
									isShownByDefault
								>
									<RangeControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __(
											'Pull distance (pixels)',
											'sgs-blocks'
										) }
										value={ attributes.fxMagnetStrength }
										onChange={ ( value ) =>
											setParam( {
												fxMagnetStrength: value,
											} )
										}
										min={ 2 }
										max={ 80 }
										step={ 2 }
										help={ __(
											'How far this can lean toward the cursor. Small values feel expensive; large ones feel playful.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>

								<ToolsPanelItem
									hasValue={ () =>
										undefined !==
										attributes.fxMagnetRadius
									}
									label={ __( 'Reach', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( {
											fxMagnetRadius: undefined,
										} )
									}
									isShownByDefault
								>
									<RangeControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __(
											'Reach (pixels)',
											'sgs-blocks'
										) }
										value={ attributes.fxMagnetRadius }
										onChange={ ( value ) =>
											setParam( {
												fxMagnetRadius: value,
											} )
										}
										min={ 20 }
										max={ 400 }
										step={ 10 }
										help={ __(
											'How close the cursor must get before this starts to lean. This is what makes it feel magnetic rather than just hovered.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>

								<ToolsPanelItem
									hasValue={ () => !! attributes.fxMagnetAxis }
									label={ __( 'Direction', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( { fxMagnetAxis: '' } )
									}
								>
									<SelectControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __( 'Direction', 'sgs-blocks' ) }
										value={ attributes.fxMagnetAxis }
										options={ FX_MAGNET_AXIS_OPTIONS }
										onChange={ ( value ) =>
											setParam( { fxMagnetAxis: value } )
										}
										help={ __(
											'Restrict the lean to one axis if this sits in a row or column that must stay aligned.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>

								<Notice status="info" isDismissible={ false }>
									{ __(
										'Magnetic pull previews on the live site only — the editor canvas cannot follow a pointer. Use View Page to feel it.',
										'sgs-blocks'
									) }
								</Notice>
							</>
						) }

						{ /*
						  * FR-38-33 grid-dot field. Added 2026-08-28 after Bean
						  * saw the shipped panel with nothing under the effect
						  * picker. It had shipped param-less on the reasoning
						  * that the design gate settled one configuration —
						  * true, but a settled DEFAULT is not the same as no
						  * CONTROL, and every sibling effect offers a panel of
						  * them.
						  *
						  * These are the five values Bean tuned in the
						  * prototype that ran the design gate, plus the colour
						  * whose accent default measured 1.35:1 on his own
						  * site, plus a shape picker.
						  *
						  * ⛔ EVERY ITEM SETS `isShownByDefault`. The first
						  * cut set it on the colour alone, so the five geometry
						  * controls existed but sat behind the ToolsPanel "+"
						  * menu — and the report that came back was that they
						  * did not exist at all. For a client who will never
						  * open that menu, hidden and absent are the same
						  * thing. `cursor-field` states the rule outright in
						  * its own panel: none of these is an optional
						  * refinement, so none of them hides.
						  *
						  * ⛔ Every `value` is passed RAW (possibly undefined)
						  * rather than defaulted to a number here. The engine's
						  * DEFAULTS table is the single source of Preset B;
						  * repeating 40/2/150/12/260 in this file would create a
						  * second source to drift. An undefined value renders
						  * the RangeControl at its own start position and sends
						  * nothing, which is the intended "unset" state.
						  */ }
						{ 'grid-dots' === fx && (
							<>
								<ToolsPanelItem
									hasValue={ () =>
										!! attributes.fxGridDotColour ||
										!! attributes.fxGridDotHoverColour
									}
									label={ __( 'Dot colour', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( {
											fxGridDotColour: '',
											fxGridDotHoverColour: '',
										} )
									}
									isShownByDefault
								>
									{ /*
									  * D609 SHAPE: one thin control, states as
									  * TABS inside its popover — never a second
									  * sibling row. Passing `states` is what
									  * selects that shape; called without it,
									  * `DesignTokenPicker` silently falls back
									  * to the legacy single-swatch rendering,
									  * which is how this control shipped
									  * looking wrong while using the right
									  * component.
									  *
									  * `enableAlpha` is the whole opacity
									  * story now. The engine stopped forcing a
									  * 0.34 rest alpha, so a translucent
									  * lattice is a translucent COLOUR the
									  * client picks here, per state.
									  */ }
									<DesignTokenPicker
										label={ __(
											'Dot colour',
											'sgs-blocks'
										) }
										linked
										enableAlpha
										states={ [
											{
												key: 'normal',
												label: __(
													'Normal',
													'sgs-blocks'
												),
												value: attributes.fxGridDotColour,
												onChange: ( value ) =>
													setParam( {
														fxGridDotColour: value,
													} ),
											},
											{
												key: 'hover',
												label: __(
													'Pointer',
													'sgs-blocks'
												),
												value: attributes.fxGridDotHoverColour,
												onChange: ( value ) =>
													setParam( {
														fxGridDotHoverColour:
															value,
													} ),
											},
										] }
										help={ __(
											'Normal is the resting lattice; Pointer is the colour dots reach nearest the cursor. Pick something that reads against this section’s background — a brand accent is usually too close to it. Use the opacity slider for a subtler field.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>

								<ToolsPanelItem
									hasValue={ () =>
										!! attributes.fxGridDotShape
									}
									label={ __( 'Dot shape', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( { fxGridDotShape: '' } )
									}
									isShownByDefault
								>
									<SelectControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __(
											'Dot shape',
											'sgs-blocks'
										) }
										value={
											attributes.fxGridDotShape || 'circle'
										}
										options={ [
											{
												label: __(
													'Circle',
													'sgs-blocks'
												),
												value: 'circle',
											},
											{
												label: __(
													'Line — points at the cursor',
													'sgs-blocks'
												),
												value: 'line',
											},
											{
												label: __(
													'Square',
													'sgs-blocks'
												),
												value: 'square',
											},
											{
												label: __(
													'Triangle — points at the cursor',
													'sgs-blocks'
												),
												value: 'triangle',
											},
											{
												label: __(
													'Cross',
													'sgs-blocks'
												),
												value: 'cross',
											},
										] }
										onChange={ ( value ) =>
											setParam( {
												fxGridDotShape: value,
											} )
										}
										help={ __(
											'Line and Triangle rotate to point at the cursor, which makes the Lean setting visible even before a marker moves. Circle, Square and Cross stay upright.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>

								<ToolsPanelItem
									hasValue={ () =>
										undefined !== attributes.fxGridCell
									}
									label={ __( 'Spacing', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( { fxGridCell: undefined } )
									}
									isShownByDefault
								>
									<RangeControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __( 'Spacing', 'sgs-blocks' ) }
										value={ attributes.fxGridCell }
										onChange={ ( value ) =>
											setParam( { fxGridCell: value } )
										}
										min={ 12 }
										max={ 200 }
										step={ 2 }
										help={ __(
											'Gap between dots, in pixels. Smaller reads as texture; larger reads as a pattern.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>

								<ToolsPanelItem
									hasValue={ () =>
										undefined !== attributes.fxGridDotSize
									}
									label={ __( 'Dot size', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( { fxGridDotSize: undefined } )
									}
									isShownByDefault
								>
									<RangeControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __( 'Dot size', 'sgs-blocks' ) }
										value={ attributes.fxGridDotSize }
										onChange={ ( value ) =>
											setParam( { fxGridDotSize: value } )
										}
										min={ 0.5 }
										max={ 12 }
										step={ 0.5 }
										help={ __(
											'Radius of each dot, in pixels.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>

								<ToolsPanelItem
									hasValue={ () =>
										undefined !== attributes.fxGridRadius
									}
									label={ __( 'Reach', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( { fxGridRadius: undefined } )
									}
									isShownByDefault
								>
									<RangeControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __( 'Reach', 'sgs-blocks' ) }
										value={ attributes.fxGridRadius }
										onChange={ ( value ) =>
											setParam( { fxGridRadius: value } )
										}
										min={ 20 }
										max={ 600 }
										step={ 10 }
										help={ __(
											'How far from the pointer dots start to react, in pixels.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>

								<ToolsPanelItem
									hasValue={ () =>
										undefined !== attributes.fxGridLean
									}
									label={ __( 'Lean', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( { fxGridLean: undefined } )
									}
									isShownByDefault
								>
									<RangeControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __( 'Lean', 'sgs-blocks' ) }
										value={ attributes.fxGridLean }
										onChange={ ( value ) =>
											setParam( { fxGridLean: value } )
										}
										min={ 1 }
										max={ 60 }
										step={ 1 }
										help={ __(
											'How far a dot leans toward the pointer. Each dot stays locked inside its own cell, so very large values stop having an effect.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>

								<ToolsPanelItem
									hasValue={ () =>
										undefined !== attributes.fxGridEase
									}
									label={ __( 'Settle', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( { fxGridEase: undefined } )
									}
									isShownByDefault
								>
									<RangeControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __( 'Settle', 'sgs-blocks' ) }
										value={ attributes.fxGridEase }
										onChange={ ( value ) =>
											setParam( { fxGridEase: value } )
										}
										min={ 60 }
										max={ 1200 }
										step={ 20 }
										help={ __(
											'How long dots take to drift back to centre after the pointer leaves, in milliseconds.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>
							</>
						) }

						{ 'particles' === fx && (
							<>
								<ToolsPanelItem
									hasValue={ () =>
										!! attributes.fxParticlePreset
									}
									label={ __( 'Style', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( { fxParticlePreset: '' } )
									}
									isShownByDefault
								>
									<SelectControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __( 'Style', 'sgs-blocks' ) }
										value={
											attributes.fxParticlePreset ||
											'sparks'
										}
										options={ FX_PARTICLE_PRESET_OPTIONS }
										onChange={ ( value ) =>
											setParam( {
												fxParticlePreset: value,
											} )
										}
										help={ __(
											'What trails the cursor across this block on the live site.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>

								<ToolsPanelItem
									hasValue={ () =>
										undefined !==
										attributes.fxParticleDensity
									}
									label={ __( 'Density', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( {
											fxParticleDensity: undefined,
										} )
									}
								>
									<RangeControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __( 'Density', 'sgs-blocks' ) }
										value={ attributes.fxParticleDensity }
										onChange={ ( value ) =>
											setParam( {
												fxParticleDensity: value,
											} )
										}
										min={ 0.25 }
										max={ 3 }
										step={ 0.25 }
										help={ __(
											'How many particles spawn per pointer movement. Higher reads as busier, not faster.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>

								<ToolsPanelItem
									hasValue={ () =>
										undefined !==
										attributes.fxParticleSize
									}
									label={ __( 'Size', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( {
											fxParticleSize: undefined,
										} )
									}
								>
									<RangeControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __( 'Size', 'sgs-blocks' ) }
										value={ attributes.fxParticleSize }
										onChange={ ( value ) =>
											setParam( {
												fxParticleSize: value,
											} )
										}
										min={ 0.25 }
										max={ 3 }
										step={ 0.25 }
										help={ __(
											'A ceiling derived from this block\'s own size still caps how large any single particle can get, so this never overwhelms a small button.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>

								<ToolsPanelItem
									hasValue={ () =>
										!! attributes.fxParticleColour
									}
									label={ __( 'Trail colour', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( { fxParticleColour: '' } )
									}
									isShownByDefault
								>
									<DesignTokenPicker
										label={ __(
											'Trail colour',
											'sgs-blocks'
										) }
										value={ attributes.fxParticleColour }
										onChange={ ( value ) =>
											setParam( {
												fxParticleColour: value,
											} )
										}
									/>
								</ToolsPanelItem>

								<Notice status="info" isDismissible={ false }>
									{ __(
										'The trail previews on the live site only — the editor canvas cannot follow a pointer. Use View Page to feel it.',
										'sgs-blocks'
									) }
								</Notice>
							</>
						) }

						{ 'cursor-field' === fx && (
							<>
								{ /*
								 * MEASURED IN THE EDITOR 2026-08-24, not reasoned.
								 * Spec 38 §9 claimed this canvas "shows the field but
								 * not the tracking". It shows NOTHING: the canvas
								 * iframe carries ZERO `data-sgs-cursor-field`
								 * attributes and none of the fx stylesheets, because
								 * the block renders through edit.js here rather than
								 * render.php, so the render-layer stamp never runs.
								 * Without this Notice a client picks "Aurora —
								 * colours shift as you move", sees no change at all,
								 * and has nothing telling them why. Same precedent as
								 * the parallax and surface-treatment notices.
								 */ }
								<Notice status="info" isDismissible={ false }>
									{ __(
										'Cursor effects preview on the live site only — the editor canvas cannot follow a pointer. Use View Page to see this look in motion.',
										'sgs-blocks'
									) }
								</Notice>

								<ToolsPanelItem
									hasValue={ () =>
										!! attributes.fxFieldType
									}
									label={ __( 'Field style', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( { fxFieldType: '' } )
									}
									isShownByDefault
								>
									<SelectControl
										__nextHasNoMarginBottom
										label={ __(
											'Field style',
											'sgs-blocks'
										) }
										value={ attributes.fxFieldType }
										options={ FX_FIELD_TYPE_OPTIONS }
										onChange={ ( value ) =>
											setParam( { fxFieldType: value } )
										}
										help={ __(
											'What follows the cursor across this section.',
											'sgs-blocks'
										) }
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>

								<ToolsPanelItem
									hasValue={ () =>
										!! attributes.fxFieldColour
									}
									label={ __( 'Field colour', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( { fxFieldColour: '' } )
									}
									isShownByDefault
								>
									<DesignTokenPicker
										label={ __(
											'Field colour',
											'sgs-blocks'
										) }
										value={ attributes.fxFieldColour }
										onChange={ ( value ) =>
											setParam( {
												fxFieldColour: value,
											} )
										}
									/>
								</ToolsPanelItem>

								<ToolsPanelItem
									hasValue={ () =>
										undefined !== attributes.fxFieldRadius
									}
									label={ __( 'Field size', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( {
											fxFieldRadius: undefined,
										} )
									}
									isShownByDefault
								>
									<RangeControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __(
											'Field size (pixels)',
											'sgs-blocks'
										) }
										value={ attributes.fxFieldRadius }
										onChange={ ( value ) =>
											setParam( {
												fxFieldRadius: value,
											} )
										}
										min={ 40 }
										max={ 1200 }
										step={ 10 }
										help={ __(
											'How wide the effect spreads around the cursor.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>

								<ToolsPanelItem
									hasValue={ () =>
										!! attributes.fxFieldShape
									}
									label={ __( 'Field shape', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( { fxFieldShape: '' } )
									}
								>
									<SelectControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __(
											'Field shape',
											'sgs-blocks'
										) }
										value={ attributes.fxFieldShape }
										options={ FX_FIELD_SHAPE_OPTIONS }
										onChange={ ( value ) =>
											setParam( {
												fxFieldShape: value,
											} )
										}
										help={ __(
											'A circle, or an ellipse stretched across or down the block.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>

								{ 'hue-shift' === attributes.fxFieldType && (
									<ToolsPanelItem
										hasValue={ () =>
											undefined !==
											attributes.fxFieldBlend
										}
										label={ __(
											'Colour blend',
											'sgs-blocks'
										) }
										onDeselect={ () =>
											setParam( {
												fxFieldBlend: undefined,
											} )
										}
									>
										<RangeControl
											__nextHasNoMarginBottom
											__next40pxDefaultSize
											label={ __(
												'Colour blend',
												'sgs-blocks'
											) }
											value={ attributes.fxFieldBlend }
											onChange={ ( value ) =>
												setParam( {
													fxFieldBlend: value,
												} )
											}
											min={ 0 }
											max={ 100 }
											step={ 5 }
											help={ __(
												'How far the colours travel from your brand colour. 0 keeps a single hue; higher lets the other colours show through.',
												'sgs-blocks'
											) }
										/>
									</ToolsPanelItem>
								) }

								<ToolsPanelItem
									hasValue={ () =>
										undefined !== attributes.fxFieldTrail
									}
									label={ __( 'Drag weight', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( {
											fxFieldTrail: undefined,
										} )
									}
								>
									<RangeControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __( 'Drag weight', 'sgs-blocks' ) }
										value={ attributes.fxFieldTrail }
										onChange={ ( value ) =>
											setParam( {
												fxFieldTrail: value,
											} )
										}
										min={ 0 }
										max={ 100 }
										step={ 5 }
										help={ __(
											'How heavily the effect lags behind the cursor. 0 follows exactly; higher feels weightier.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>
							</>
						) }

						{ /*
						 * Surface treatment (Tier W, Spec 38 §1.2b, D479).
						 * Presets-before-parameters: the treatment picker is
						 * the primary, shown-by-default control (a client
						 * gets a finished look with zero further clicks),
						 * duotone's two colours appear only when they mean
						 * anything, and intensity sits behind the panel's
						 * "+" because the shipped default already reads
						 * well — Bean's rule that the client must get a
						 * good result without ever opening a fine-tune
						 * control.
						 */ }
						{ 'surface-treatment' === fx && (
							<>
								<ToolsPanelItem
									hasValue={ () =>
										!! attributes.fxTreatment
									}
									label={ __( 'Treatment', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( { fxTreatment: '' } )
									}
									isShownByDefault
								>
									<ToggleGroupControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										isBlock
										label={ __(
											'Treatment',
											'sgs-blocks'
										) }
										value={ attributes.fxTreatment }
										onChange={ ( value ) =>
											setParam( {
												fxTreatment: value || '',
												// Only the colour(s) that
												// belong to the CHOSEN
												// treatment survive a switch
												// — leaving a slug attached
												// to a preset with no colour
												// control showing it would be
												// stored state the client
												// cannot see or clear.
												fxTreatmentShadow:
													'duotone' === value
														? attributes.fxTreatmentShadow
														: '',
												fxTreatmentHighlight:
													'duotone' === value
														? attributes.fxTreatmentHighlight
														: '',
												fxTreatmentTint:
													'grain' === value
														? attributes.fxTreatmentTint
														: '',
												fxTreatmentInk:
													'halftone' === value
														? attributes.fxTreatmentInk
														: '',
											} )
										}
										help={ __(
											'Grain, halftone or duotone, painted over the image on the live site.',
											'sgs-blocks'
										) }
									>
										{ FX_TREATMENT_OPTIONS.map(
											( option ) => (
												<RouteOption
													key={ option.value }
													value={ option.value }
													label={ option.label }
													icon={ treatmentThumbnail(
														option.value
													) }
												/>
											)
										) }
									</ToggleGroupControl>

									{ ! attributes.fxTreatment && (
										<Notice
											status="warning"
											isDismissible={ false }
										>
											{ __(
												'Pick a treatment above. Until you do, this block will not be treated on the live site.',
												'sgs-blocks'
											) }
										</Notice>
									) }
								</ToolsPanelItem>

								<ToolsPanelItem
									hasValue={ () =>
										'off' === attributes.fxTreatmentReveal
									}
									label={ __(
										'Reveal on scroll',
										'sgs-blocks'
									) }
									onDeselect={ () =>
										setParam( { fxTreatmentReveal: '' } )
									}
									isShownByDefault
								>
									<ToggleControl
										__nextHasNoMarginBottom
										label={ __(
											'Reveal on scroll',
											'sgs-blocks'
										) }
										checked={
											'off' !==
											attributes.fxTreatmentReveal
										}
										onChange={ ( checked ) =>
											setParam( {
												fxTreatmentReveal: checked
													? ''
													: 'off',
											} )
										}
										help={ __(
											'The treatment fades in as the image scrolls into view. Turn off to apply it immediately.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>

								{ /*
								 * Per-treatment colour (the owner's request:
								 * "shouldn't [halftone] have colour options?"
								 * / "they should all be defaulted to palette
								 * slugs but be able to be changed with our
								 * universalised colour controls"). One row
								 * for grain, one for halftone, two for
								 * duotone — all four store a palette SLUG via
								 * `DesignTokenPicker`, the same shape
								 * `fxFieldColour` already uses above, and all
								 * four leave their default UNTOUCHED here:
								 * the runtime already resolves an unset
								 * colour from the site palette
								 * (`paletteFallback`/`paletteTransform` in
								 * `presets.js`), so emitting one from this
								 * panel would freeze the finish against
								 * future re-theming instead of letting it
								 * follow the brand.
								 */ }
								{ 'grain' === attributes.fxTreatment && (
									<ToolsPanelItem
										hasValue={ () =>
											!! attributes.fxTreatmentTint
										}
										label={ __(
											'Grain tint',
											'sgs-blocks'
										) }
										onDeselect={ () =>
											setParam( {
												fxTreatmentTint: '',
											} )
										}
										isShownByDefault
									>
										<DesignTokenPicker
											label={ __(
												'Grain tint',
												'sgs-blocks'
											) }
											value={
												attributes.fxTreatmentTint
											}
											onChange={ ( value ) =>
												setParam( {
													fxTreatmentTint: value,
												} )
											}
										/>
										<p className="components-base-control__help">
											{ __(
												'Defaults to your brand colour. Change it to anything in your palette.',
												'sgs-blocks'
											) }
										</p>
									</ToolsPanelItem>
								) }

								{ 'halftone' === attributes.fxTreatment && (
									<ToolsPanelItem
										hasValue={ () =>
											!! attributes.fxTreatmentInk
										}
										label={ __(
											'Ink colour',
											'sgs-blocks'
										) }
										onDeselect={ () =>
											setParam( {
												fxTreatmentInk: '',
											} )
										}
										isShownByDefault
									>
										<DesignTokenPicker
											label={ __(
												'Ink colour',
												'sgs-blocks'
											) }
											value={
												attributes.fxTreatmentInk
											}
											onChange={ ( value ) =>
												setParam( {
													fxTreatmentInk: value,
												} )
											}
										/>
										<p className="components-base-control__help">
											{ __(
												'Defaults to your brand colour. Change it to anything in your palette.',
												'sgs-blocks'
											) }
										</p>
									</ToolsPanelItem>
								) }

								{ 'duotone' === attributes.fxTreatment && (
									<>
										<ToolsPanelItem
											hasValue={ () =>
												!! attributes.fxTreatmentShadow
											}
											label={ __(
												'Shadow colour',
												'sgs-blocks'
											) }
											onDeselect={ () =>
												setParam( {
													fxTreatmentShadow: '',
												} )
											}
											isShownByDefault
										>
											<DesignTokenPicker
												label={ __(
													'Shadow colour',
													'sgs-blocks'
												) }
												value={
													attributes.fxTreatmentShadow
												}
												onChange={ ( value ) =>
													setParam( {
														fxTreatmentShadow:
															value,
													} )
												}
											/>
											<p className="components-base-control__help">
												{ __(
													'Defaults to your brand colour. Change it to anything in your palette.',
													'sgs-blocks'
												) }
											</p>
										</ToolsPanelItem>

										<ToolsPanelItem
											hasValue={ () =>
												!! attributes.fxTreatmentHighlight
											}
											label={ __(
												'Highlight colour',
												'sgs-blocks'
											) }
											onDeselect={ () =>
												setParam( {
													fxTreatmentHighlight: '',
												} )
											}
											isShownByDefault
										>
											<DesignTokenPicker
												label={ __(
													'Highlight colour',
													'sgs-blocks'
												) }
												value={
													attributes.fxTreatmentHighlight
												}
												onChange={ ( value ) =>
													setParam( {
														fxTreatmentHighlight:
															value,
													} )
												}
											/>
											<p className="components-base-control__help">
												{ __(
													'Defaults to your brand colour. Change it to anything in your palette.',
													'sgs-blocks'
												) }
											</p>
										</ToolsPanelItem>
									</>
								) }

								<ToolsPanelItem
									hasValue={ () =>
										undefined !==
										attributes.fxTreatmentIntensity
									}
									label={ __( 'Intensity', 'sgs-blocks' ) }
									onDeselect={ () =>
										setParam( {
											fxTreatmentIntensity: undefined,
										} )
									}
									isShownByDefault={ false }
								>
									<RangeControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __(
											'Intensity',
											'sgs-blocks'
										) }
										value={
											attributes.fxTreatmentIntensity
										}
										onChange={ ( value ) =>
											setParam( {
												fxTreatmentIntensity: value,
											} )
										}
										min={ 0 }
										max={ 1 }
										step={ 0.05 }
										help={ __(
											'How strong the treatment looks. Leave this alone to use the treatment’s own considered default.',
											'sgs-blocks'
										) }
									/>
								</ToolsPanelItem>

								<ToolsPanelItem
									hasValue={ () => false }
									label={ __( 'Preview', 'sgs-blocks' ) }
									isShownByDefault
								>
									<Notice
										status="info"
										isDismissible={ false }
									>
										{ __(
											'Surface treatments preview on the live site. Visitors without WebGL see the original image.',
											'sgs-blocks'
										) }
									</Notice>
								</ToolsPanelItem>
							</>
						) }

						{ isSplit && (
							<ToolsPanelItem
								hasValue={ () =>
									undefined !== attributes.fxDuration
								}
								label={ __( 'Speed', 'sgs-blocks' ) }
								onDeselect={ () =>
									setParam( { fxDuration: undefined } )
								}
							>
								<RangeControl
									__nextHasNoMarginBottom
									__next40pxDefaultSize
									label={ __(
										'Speed (seconds)',
										'sgs-blocks'
									) }
									value={ attributes.fxDuration }
									onChange={ ( value ) =>
										setParam( { fxDuration: value } )
									}
									min={ 0.1 }
									max={ 3 }
									step={ 0.1 }
									help={ __(
										'How long each piece of text takes to reveal.',
										'sgs-blocks'
									) }
								/>
							</ToolsPanelItem>
						) }

						{ ownsScroll && ! isSplit && (
							<ToolsPanelItem
								hasValue={ () =>
									undefined !== attributes.fxScrub
								}
								label={ __( 'Scrub smoothing', 'sgs-blocks' ) }
								onDeselect={ () =>
									setParam( { fxScrub: undefined } )
								}
							>
								<RangeControl
									__nextHasNoMarginBottom
									__next40pxDefaultSize
									label={ __(
										'Scrub smoothing',
										'sgs-blocks'
									) }
									value={ attributes.fxScrub }
									onChange={ ( value ) =>
										setParam( { fxScrub: value } )
									}
									min={ 0 }
									max={ 3 }
									step={ 0.1 }
									help={ __(
										'Seconds the animation takes to catch up with the scrollbar.',
										'sgs-blocks'
									) }
								/>
							</ToolsPanelItem>
						) }

						{ isSplit && (
							<ToolsPanelItem
								hasValue={ () => !! attributes.fxSplit }
								label={ __( 'Split by', 'sgs-blocks' ) }
								onDeselect={ () =>
									setParam( { fxSplit: '', fxMask: '' } )
								}
								isShownByDefault
							>
								<SelectControl
									__nextHasNoMarginBottom
									label={ __( 'Split by', 'sgs-blocks' ) }
									value={ attributes.fxSplit }
									options={ [
										{
											label: __( 'Words', 'sgs-blocks' ),
											value: 'words',
										},
										{
											label: __(
												'Characters',
												'sgs-blocks'
											),
											value: 'chars',
										},
										{
											label: __( 'Lines', 'sgs-blocks' ),
											value: 'lines',
										},
									] }
									onChange={ ( value ) =>
										// Masking is only meaningful on the
										// granularity being split — SplitText
										// silently no-ops otherwise — so the
										// mask value tracks the split value
										// rather than being independently
										// settable into a contradiction.
										setParam( {
											fxSplit: value,
											fxMask: attributes.fxMask
												? value
												: '',
										} )
									}
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						) }

						{ isSplit && !! attributes.fxSplit && (
							<ToolsPanelItem
								hasValue={ () => !! attributes.fxMask }
								label={ __( 'Mask reveal', 'sgs-blocks' ) }
								onDeselect={ () => setParam( { fxMask: '' } ) }
							>
								<ToggleControl
									__nextHasNoMarginBottom
									label={ __( 'Mask reveal', 'sgs-blocks' ) }
									checked={
										!! attributes.fxMask &&
										attributes.fxMask === attributes.fxSplit
									}
									onChange={ ( checked ) =>
										// Masking a granularity SplitText isn't
										// splitting on is a silent no-op
										// (gold-standard item 20) — so the mask
										// value must always equal the CURRENT
										// split granularity, never an
										// independently settable value, or
										// changing "Split by" after enabling
										// this could leave the two mismatched.
										setParam( {
											fxMask: checked
												? attributes.fxSplit
												: '',
										} )
									}
									help={ __(
										'Reveals the text from behind a hard edge instead of fading up.',
										'sgs-blocks'
									) }
								/>
							</ToolsPanelItem>
						) }

						{ isSplit && (
							<ToolsPanelItem
								hasValue={ () => !! attributes.fxStagger }
								label={ __( 'Stagger', 'sgs-blocks' ) }
								onDeselect={ () =>
									setParam( { fxStagger: undefined } )
								}
							>
								<RangeControl
									__nextHasNoMarginBottom
									__next40pxDefaultSize
									label={ __(
										'Stagger (seconds)',
										'sgs-blocks'
									) }
									value={ attributes.fxStagger }
									onChange={ ( value ) =>
										setParam( { fxStagger: value } )
									}
									min={ 0 }
									max={ 0.3 }
									step={ 0.01 }
								/>
							</ToolsPanelItem>
						) }
					</ToolsPanel>
				</InspectorControls>
			</>
		);
	};
}, 'withFxControls' );

addFilter( 'editor.BlockEdit', 'sgs/fx-controls', withFxControls );

/**
 * Static grid-dot preview in the EDITOR CANVAS (FR-38-33).
 *
 * Bean, seeing the shipped effect: "the dots aren't visible in the canvas too".
 * They were not, and by design — `data-sgs-fx` is stamped by a PHP `render_block`
 * filter that the editor canvas never runs, so no fx effect previews there. The
 * panel says so ("Scroll effects preview on the live site, not in the editor").
 *
 * ── WHAT THIS DOES AND DELIBERATELY DOES NOT DO ───────────────────────────
 * It paints the RESTING LATTICE only: dot placement, spacing, size and colour,
 * exactly as they sit before the pointer arrives. It does NOT run the effect —
 * no canvas, no rAF, no pointer tracking, no module import into the editor
 * bundle. The interaction remains a live-site thing.
 *
 * That is the whole point rather than a shortcut. The resting lattice is the
 * half a client must JUDGE while designing — is it too dense, too sparse, can I
 * see the dots against this background — and it is precisely what could not be
 * judged before: the 1.35:1 colour shipped because nobody could see the dots
 * until the page was live.
 *
 * ── WHY A GRADIENT AND NOT A CANVAS ───────────────────────────────────────
 * `radial-gradient` + `background-size` IS a dot lattice, natively, at any
 * pitch. A canvas in the editor would mean importing the engine into the editor
 * bundle, mounting per block, and tearing down on deselect — real work, real
 * lifecycle bugs, for a picture CSS already draws.
 *
 * ⛔ CUSTOM PROPERTIES ONLY on `wrapperProps.style`. Spec 32 forbids inline
 * style PROPERTY declarations; a `--var: value` is a VALUE, not a property
 * declaration (the same distinction `view.js` relies on for `--sgs-di-py`), and
 * this is editor chrome rather than rendered block output either way. The actual
 * `background-image` lives in `fx-panel.scss`.
 */
const withGridDotsEditorPreview = createHigherOrderComponent(
	( BlockListBlock ) => {
		return ( props ) => {
			const { attributes } = props;

			if ( ! attributes || 'grid-dots' !== attributes.fx ) {
				return <BlockListBlock { ...props } />;
			}

			/*
			 * Fall back to the ENGINE's Preset B values, not to invented ones.
			 * These three literals are the one place this file repeats them, and
			 * they exist because CSS cannot read `grid-dots.js`'s DEFAULTS table.
			 * If Preset B ever changes, it changes in grid-dots.js and here.
			 */
			const cell = attributes.fxGridCell || 40;
			const dot = attributes.fxGridDotSize || 2;

			/*
			 * Resolve the stored colour the SAME way `fx-grid-dots.php` does:
			 * a palette SLUG becomes its preset custom property (so the preview
			 * re-colours with the theme, exactly as the live field does), and a
			 * hex/hex8 passes through verbatim so a picked alpha previews too.
			 * An unset value emits nothing and the stylesheet's own fallback
			 * chain applies.
			 *
			 * This exists because the preview previously painted with
			 * `currentColor` — the block's TEXT colour — and so showed a colour
			 * that never ships. It drew crisp dark dots over the exact faint
			 * pink field Bean could not see on the live page.
			 */
			const stored = attributes.fxGridDotColour || '';
			let previewColour = '';
			if ( /^#/.test( stored ) ) {
				previewColour = stored;
			} else if ( /^[a-z0-9-]+$/.test( stored ) ) {
				previewColour = `var(--wp--preset--color--${ stored })`;
			}

			const wrapperProps = {
				...( props.wrapperProps || {} ),
				className: [ props.wrapperProps?.className, 'sgs-grid-dots-preview' ]
					.filter( Boolean )
					.join( ' ' ),
				style: {
					...( props.wrapperProps?.style || {} ),
					'--sgs-gd-cell': `${ cell }px`,
					'--sgs-gd-dot': `${ dot }px`,
					...( previewColour
						? { '--sgs-gd-colour': previewColour }
						: {} ),
				},
			};

			return (
				<BlockListBlock { ...props } wrapperProps={ wrapperProps } />
			);
		};
	},
	'withGridDotsEditorPreview'
);

addFilter(
	'editor.BlockListBlock',
	'sgs/fx-grid-dots-preview',
	withGridDotsEditorPreview
);
