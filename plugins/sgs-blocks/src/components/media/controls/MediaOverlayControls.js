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
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { RangeControl, SelectControl } from '@wordpress/components';
import GradientOverlayControl from '../../GradientOverlayControl.js';

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
	blendModeKey,
	paintDisabled,
	disabledReason = '',
} ) {
	return (
		<>
			<GradientOverlayControl
				attributes={ attributes }
				setAttributes={ setAttributes }
				attrNames={ attrNames }
				solidLabel={ __( 'Overlay colour', 'sgs-blocks' ) }
			/>
			<div aria-disabled={ paintDisabled }>
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
