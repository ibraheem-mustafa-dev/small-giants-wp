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
import { useState, useEffect } from '@wordpress/element';
import { DesignTokenPicker } from '../../components';
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
	'cursor-field': __( 'Cursor-follow background', 'sgs-blocks' ),
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
			 * Undefined-when-untouched, same reasoning as the numeric params
			 * above: there is no meaningful "0px radius" a client would choose
			 * (it paints nothing), so unset must be distinguishable from set
			 * and the render layer treats 0 as unset.
			 */
			fxFieldRadius: { type: 'number' },
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
						{ 'cursor-field' === fx && (
							<>
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
