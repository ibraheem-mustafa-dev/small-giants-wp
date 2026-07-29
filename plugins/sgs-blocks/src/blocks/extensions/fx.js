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
	__experimentalUnitControl as UnitControl,
	SelectControl,
	RangeControl,
	Notice,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { isExtensionHidden } from './hide-extensions';
import qualifyingBlocks from './generated-fx-qualifying-blocks.json';

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
								<UnitControl
									__next40pxDefaultSize
									label={ __( 'Start position', 'sgs-blocks' ) }
									value={ attributes.fxStart }
									onChange={ ( value ) =>
										setAttributes( { fxStart: value } )
									}
									help={ __(
										'Where the effect begins, e.g. “top 85%”.',
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
