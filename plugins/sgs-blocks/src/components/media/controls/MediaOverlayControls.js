/**
 * MediaOverlayControls — shared bare-row control set for the `overlay` atom
 * (colour/gradient + opacity + blend mode, resting and hover).
 *
 * Reuses `GradientOverlayControl` for the colour/gradient pair rather than
 * hand-rolling a third colour picker — that component already carries the
 * D4 unified-colour-panel rebuild (palette-token `linked` semantics, alpha
 * policy, optional hover tab). This file adds the two rows
 * `GradientOverlayControl` does not own: opacity and blend mode, both gated
 * inert when there is nothing to tint (registry.js `overlay.requires`).
 *
 * Bare rows only — mounts no `InspectorControls`/`PanelBody`.
 *
 * ── Opacity is TIERED (2026-09-03) ──────────────────────────────────────
 * `opacityTabletKey`/`opacityMobileKey` are OPTIONAL — a caller that omits
 * them (none currently do; `overlay.control.js` now always passes them)
 * would get the old flat `RangeControl` back untouched, so this is a
 * back-compatible addition. When supplied, the row is wrapped in
 * `ResponsiveControl` (the same pattern `object-fit.control.js` uses for its
 * tiered `ObjectFit` row) so it reads/writes whichever device tier the
 * global toggle currently has active, with an inherit hint mirroring
 * `resolveInheritedFit()`'s mobile -> tablet -> desktop -> default chain.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { RangeControl, SelectControl } from '@wordpress/components';
import GradientOverlayControl from '../../GradientOverlayControl.js';
import ResponsiveControl from '../../ResponsiveControl.js';

/** Same 'no override' value the atom's CSS var() chain falls back to (1 = 100%). */
const DEFAULT_OPACITY = 100;

/**
 * Resolve what a tier VISUALLY falls back to, for the inherit hint — mirrors
 * the CSS cascade in `assets/css/media-atoms/overlay.css` (mobile -> tablet
 * -> desktop -> the 100% default).
 *
 * @param {Object} attributes Block attributes.
 * @param {Object} tierKeys   `{desktop, tablet, mobile}` attribute names.
 * @param {string} tier       'tablet' | 'mobile'.
 * @return {number} The value this tier inherits when it has no explicit one.
 */
function resolveInheritedOpacity( attributes, tierKeys, tier ) {
	if ( 'mobile' === tier ) {
		return (
			attributes[ tierKeys.tablet ] ??
			attributes[ tierKeys.desktop ] ??
			DEFAULT_OPACITY
		);
	}
	return attributes[ tierKeys.desktop ] ?? DEFAULT_OPACITY;
}

const BLEND_MODE_OPTIONS = [
	{ label: __( 'Normal', 'sgs-blocks' ), value: 'normal' },
	{ label: __( 'Multiply', 'sgs-blocks' ), value: 'multiply' },
	{ label: __( 'Screen', 'sgs-blocks' ), value: 'screen' },
	{ label: __( 'Overlay', 'sgs-blocks' ), value: 'overlay' },
	{ label: __( 'Darken', 'sgs-blocks' ), value: 'darken' },
	{ label: __( 'Lighten', 'sgs-blocks' ), value: 'lighten' },
	{ label: __( 'Colour dodge', 'sgs-blocks' ), value: 'color-dodge' },
	{ label: __( 'Colour burn', 'sgs-blocks' ), value: 'color-burn' },
	{ label: __( 'Soft light', 'sgs-blocks' ), value: 'soft-light' },
	{ label: __( 'Hard light', 'sgs-blocks' ), value: 'hard-light' },
	{ label: __( 'Difference', 'sgs-blocks' ), value: 'difference' },
	{ label: __( 'Exclusion', 'sgs-blocks' ), value: 'exclusion' },
];

/**
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @param {Object}   props.attrNames        `{gradient, solid, solidHover, gradientHover}`.
 * @param {string}   props.opacityKey
 * @param {string}   [props.opacityTabletKey] Tablet tier sibling — omit for
 *                                            the old untiered flat row.
 * @param {string}   [props.opacityMobileKey] Mobile tier sibling.
 * @param {string}   props.blendModeKey
 * @param {boolean}  props.paintDisabled     True when there is no colour and
 *                                          no gradient — opacity/blend are inert.
 * @param {string}   [props.disabledReason]
 */
export default function MediaOverlayControls( {
	attributes,
	setAttributes,
	attrNames,
	opacityKey,
	opacityTabletKey,
	opacityMobileKey,
	blendModeKey,
	paintDisabled,
	disabledReason = '',
} ) {
	const isTiered = Boolean( opacityTabletKey && opacityMobileKey );
	const tierKeys = isTiered
		? { desktop: opacityKey, tablet: opacityTabletKey, mobile: opacityMobileKey }
		: null;

	return (
		<>
			<GradientOverlayControl
				attributes={ attributes }
				setAttributes={ setAttributes }
				attrNames={ attrNames }
				solidLabel={ __( 'Overlay colour', 'sgs-blocks' ) }
			/>
			<div aria-disabled={ paintDisabled }>
				{ isTiered ? (
					<ResponsiveControl
						label={ __( 'Overlay opacity (%)', 'sgs-blocks' ) }
						value={ attributes[ tierKeys.desktop ] }
						isInherited={ ( tier ) =>
							'desktop' !== tier && 'number' !== typeof attributes[ tierKeys[ tier ] ]
						}
						resolvedValue={ ( tier ) =>
							resolveInheritedOpacity( attributes, tierKeys, tier )
						}
						onReset={ ( tier ) =>
							setAttributes( { [ tierKeys[ tier ] ]: null } )
						}
					>
						{ ( breakpoint ) => {
							const tierValue = attributes[ tierKeys[ breakpoint ] ];
							const hasExplicitTierValue =
								'desktop' === breakpoint || 'number' === typeof tierValue;
							return (
								<RangeControl
									label={ __( 'Overlay opacity (%)', 'sgs-blocks' ) }
									value={
										hasExplicitTierValue
											? ( 'number' === typeof tierValue ? tierValue : DEFAULT_OPACITY )
											: undefined
									}
									initialPosition={
										hasExplicitTierValue
											? undefined
											: resolveInheritedOpacity( attributes, tierKeys, breakpoint )
									}
									min={ 0 }
									max={ 100 }
									disabled={ paintDisabled }
									help={ paintDisabled ? disabledReason : undefined }
									onChange={ ( v ) =>
										setAttributes( { [ tierKeys[ breakpoint ] ]: v } )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							);
						} }
					</ResponsiveControl>
				) : (
					<RangeControl
						label={ __( 'Overlay opacity (%)', 'sgs-blocks' ) }
						value={ 'number' === typeof attributes[ opacityKey ] ? attributes[ opacityKey ] : 100 }
						min={ 0 }
						max={ 100 }
						disabled={ paintDisabled }
						help={ paintDisabled ? disabledReason : undefined }
						onChange={ ( v ) => setAttributes( { [ opacityKey ]: v } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				) }
			</div>
			<div aria-disabled={ paintDisabled }>
				<SelectControl
					label={ __( 'Overlay blend mode', 'sgs-blocks' ) }
					value={ attributes[ blendModeKey ] || 'normal' }
					options={ BLEND_MODE_OPTIONS }
					disabled={ paintDisabled }
					help={ paintDisabled ? disabledReason : undefined }
					onChange={ ( v ) => setAttributes( { [ blendModeKey ]: v } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</div>
		</>
	);
}
