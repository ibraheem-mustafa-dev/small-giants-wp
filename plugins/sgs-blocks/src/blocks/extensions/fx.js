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
 * @package SGS\Blocks
 */

import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import {
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
	SelectControl,
	RangeControl,
	ToggleControl,
	Notice,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { isExtensionHidden } from './hide-extensions';
import qualifyingBlocks from './generated-fx-qualifying-blocks.json';
import fxEffectMeta from './generated-fx-effect-meta.json';

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
const SHIPPED_EFFECTS = [ 'scrub', 'pin-scrub', 'horizontal-panel', 'split-reveal' ];

const FX_OPTION_LABELS = {
	scrub: __( 'Scroll reveal (scrubbed)', 'sgs-blocks' ),
	'pin-scrub': __( 'Pin section & scrub', 'sgs-blocks' ),
	'horizontal-panel': __( 'Horizontal scroll section', 'sgs-blocks' ),
	'split-reveal': __( 'Text reveal (split)', 'sgs-blocks' ),
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
	{ label: __( 'Smooth start and finish', 'sgs-blocks' ), value: 'power2.inOut' },
	{ label: __( 'Strong finish', 'sgs-blocks' ), value: 'power3.out' },
	{ label: __( 'Overshoot and settle', 'sgs-blocks' ), value: 'back.out' },
	{ label: __( 'Bounce', 'sgs-blocks' ), value: 'bounce.out' },
	{ label: __( 'Elastic wobble', 'sgs-blocks' ), value: 'elastic.out(1,0.5)' },
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
	{ label: __( 'As soon as it enters view', 'sgs-blocks' ), value: 'top bottom' },
	{ label: __( 'Just after it enters view', 'sgs-blocks' ), value: 'top 85%' },
	{ label: __( 'A little into view', 'sgs-blocks' ), value: 'top 70%' },
	{ label: __( 'Halfway up the screen', 'sgs-blocks' ), value: 'top center' },
	{ label: __( 'At the very top of the screen', 'sgs-blocks' ), value: 'top top' },
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
	{ label: __( 'Short — about half a screen', 'sgs-blocks' ), value: '+=50%' },
	{ label: __( 'Standard — about one screen', 'sgs-blocks' ), value: '+=100%' },
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
	{ label: __( 'At the very top of the screen', 'sgs-blocks' ), value: 'top top' },
	{ label: __( 'Once it has fully passed', 'sgs-blocks' ), value: 'bottom top' },
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
	{ label: __( 'Standard — a moment to take it in', 'sgs-blocks' ), value: '' },
	{ label: __( 'None — moves on as soon as it lands', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Brief', 'sgs-blocks' ), value: 'short' },
	{ label: __( 'Long', 'sgs-blocks' ), value: 'long' },
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
 * Effects that own an element's transform/opacity across a scroll range.
 *
 * Mirrors `fx_effects.owns_scroll_transform` in the DB (§6.1) and drives the
 * §4.3 editor-side Notice. The authoritative copy is the DB, projected into
 * PHP by the generator; this list exists only so the EDITOR can explain the
 * exclusion without a REST round-trip. The render layer never trusts it — it
 * reads the generated PHP map. If the two disagree the render layer wins, and
 * the disagreement is a bug to fix at the DB, never here.
 */
const SCROLL_OWNING_FX = [ 'scrub', 'pin-scrub', 'horizontal-panel', 'split-reveal' ];

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
			fxEase: { type: 'string', default: '' },
			fxSplit: { type: 'string', default: '' },
			fxMask: { type: 'string', default: '' },
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
	};
	// Emit any finite number INCLUDING zero. The old `value > 0` test silently
	// discarded a deliberate 0 — see the attribute declarations above.
	Object.entries( numeric ).forEach( ( [ key, value ] ) => {
		if ( 'number' === typeof value && Number.isFinite( value ) ) {
			data[ key ] = String( value );
		}
	} );

	return { ...props, ...data };
}

addFilter(
	'blocks.getSaveContent.extraProps',
	'sgs/fx-save-props',
	addFxSaveProps
);

/**
 * The "Scroll & effects" inspector panel (Spec 38 §7).
 */
const withFxControls = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { name, attributes, setAttributes, isSelected } = props;

		if ( ! shouldHaveFx( name ) || isExtensionHidden( name, 'fx' ) ) {
			return <BlockEdit { ...props } />;
		}
		if ( ! isSelected ) {
			return <BlockEdit { ...props } />;
		}

		const { fx } = attributes;
		const isSplit = 'split-reveal' === fx;
		const ownsScroll = SCROLL_OWNING_FX.includes( fx );
		const fxOptions = fxOptionsForBlock( name );

		const resetAll = () =>
			setAttributes( {
				fx: '',
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
			} );

		return (
			<>
				<BlockEdit { ...props } />
				<InspectorControls group="styles">
					<ToolsPanel
						label={ __( 'Scroll & effects', 'sgs-blocks' ) }
						resetAll={ resetAll }
					>
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
								onChange={ ( value ) =>
									setAttributes( { fx: value } )
								}
								help={ __(
									'Scroll effects preview on the live site, not in the editor.',
									'sgs-blocks'
								) }
							/>
						</ToolsPanelItem>

						{ ownsScroll && (
							<ToolsPanelItem
								hasValue={ () => false }
								label={ __( 'Entrance animation', 'sgs-blocks' ) }
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
								onDeselect={ () =>
									setAttributes( { fxStart: '' } )
								}
							>
								<SelectControl
									__nextHasNoMarginBottom
									label={ __( 'Start position', 'sgs-blocks' ) }
									value={ attributes.fxStart }
									options={ FX_START_OPTIONS }
									onChange={ ( value ) =>
										setAttributes( { fxStart: value } )
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
									label={ __( 'When it starts', 'sgs-blocks' ) }
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
										? __( 'How long it stays stuck', 'sgs-blocks' )
										: __( 'Where it finishes', 'sgs-blocks' )
								}
								onDeselect={ () =>
									setAttributes( { fxEnd: '' } )
								}
							>
								<SelectControl
									__nextHasNoMarginBottom
									label={
										fxPins( fx )
											? __( 'How long it stays stuck', 'sgs-blocks' )
											: __( 'Where it finishes', 'sgs-blocks' )
									}
									value={ attributes.fxEnd }
									options={
										fxPins( fx )
											? FX_END_PIN_OPTIONS
											: FX_END_POSITION_OPTIONS
									}
									onChange={ ( value ) =>
										setAttributes( { fxEnd: value } )
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
								label={ __( 'Pause after the animation', 'sgs-blocks' ) }
								onDeselect={ () =>
									setAttributes( { fxHold: '' } )
								}
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
										setAttributes( { fxHold: value } )
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
								onDeselect={ () =>
									setAttributes( { fxEase: '' } )
								}
							>
								<SelectControl
									__nextHasNoMarginBottom
									label={ __( 'Feel', 'sgs-blocks' ) }
									value={ attributes.fxEase }
									options={ FX_EASE_OPTIONS }
									onChange={ ( value ) =>
										setAttributes( { fxEase: value } )
									}
									help={ __(
										'How the motion speeds up and slows down.',
										'sgs-blocks'
									) }
								/>
							</ToolsPanelItem>
						) }

						{ isSplit && (
							<ToolsPanelItem
								hasValue={ () =>
									undefined !== attributes.fxDuration
								}
								label={ __( 'Speed', 'sgs-blocks' ) }
								onDeselect={ () =>
									setAttributes( { fxDuration: undefined } )
								}
							>
								<RangeControl
									__nextHasNoMarginBottom
									__next40pxDefaultSize
									label={ __( 'Speed (seconds)', 'sgs-blocks' ) }
									value={ attributes.fxDuration }
									onChange={ ( value ) =>
										setAttributes( { fxDuration: value } )
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
								hasValue={ () => undefined !== attributes.fxScrub }
								label={ __( 'Scrub smoothing', 'sgs-blocks' ) }
								onDeselect={ () =>
									setAttributes( { fxScrub: undefined } )
								}
							>
								<RangeControl
									__nextHasNoMarginBottom
									__next40pxDefaultSize
									label={ __( 'Scrub smoothing', 'sgs-blocks' ) }
									value={ attributes.fxScrub }
									onChange={ ( value ) =>
										setAttributes( { fxScrub: value } )
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
									setAttributes( { fxSplit: '', fxMask: '' } )
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
											label: __( 'Characters', 'sgs-blocks' ),
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
										setAttributes( {
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
								onDeselect={ () =>
									setAttributes( { fxMask: '' } )
								}
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
										setAttributes( {
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
									setAttributes( { fxStagger: undefined } )
								}
							>
								<RangeControl
									__nextHasNoMarginBottom
									__next40pxDefaultSize
									label={ __( 'Stagger (seconds)', 'sgs-blocks' ) }
									value={ attributes.fxStagger }
									onChange={ ( value ) =>
										setAttributes( { fxStagger: value } )
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
