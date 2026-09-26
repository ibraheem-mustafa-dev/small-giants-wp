/**
 * Hover Effects extension — "Hover Effects" inspector panel.
 *
 * Split out of the former hover-effects.js (D551, Phase 2.1 header docs live
 * in ../index.js). Verbatim move of the PanelBody JSX; receives every value
 * it reads from the withHoverControls HOC as props.
 *
 * @package SGS\Blocks
 */
import {
	PanelBody,
	RangeControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { SCALE_PRESET_OPTIONS, DURATION_OPTIONS, EASING_OPTIONS } from '../constants';

/**
 * @param {Object}   props
 * @param {boolean}  props.hideShadowPicker
 * @param {boolean}  props.hideImageZoom
 * @param {boolean}  props.hideGrayscale
 * @param {Array}    props.shadowOptions
 * @param {string}   props.sgsHoverScalePreset
 * @param {number}   props.sgsHoverScale
 * @param {number}   props.sgsHoverLift
 * @param {number}   props.sgsHoverZoom
 * @param {number}   props.sgsHoverZoomDuration
 * @param {string}   props.sgsHoverShadow
 * @param {boolean}  props.sgsHoverImageZoom
 * @param {boolean}  props.sgsHoverGrayscale
 * @param {boolean}  props.sgsHoverBorderAccent
 * @param {string}   props.sgsHoverDuration
 * @param {number}   props.sgsHoverDurationMs
 * @param {string}   props.sgsHoverEasing
 * @param {number}   props.sgsStaggerDelay
 * @param {boolean}  props.sgsFocusRing
 * @param {Function} props.setAttributes
 */
export default function HoverPanel( {
	hideShadowPicker,
	hideImageZoom,
	hideGrayscale,
	shadowOptions,
	sgsHoverScalePreset,
	sgsHoverScale,
	sgsHoverLift,
	sgsHoverZoom,
	sgsHoverZoomDuration,
	sgsHoverShadow,
	sgsHoverImageZoom,
	sgsHoverGrayscale,
	sgsHoverBorderAccent,
	sgsHoverDuration,
	sgsHoverDurationMs,
	sgsHoverEasing,
	sgsStaggerDelay,
	sgsFocusRing,
	setAttributes,
} ) {
	return (
		<PanelBody
			title={ __( 'Hover Effects', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<SelectControl
				label={ __( 'Hover scale', 'sgs-blocks' ) }
				help={ __( 'Scale the block up on hover using a preset value.', 'sgs-blocks' ) }
				value={ sgsHoverScalePreset }
				options={ SCALE_PRESET_OPTIONS }
				onChange={ ( val ) => setAttributes( { sgsHoverScalePreset: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<RangeControl
				label={ __( 'Hover scale (fine, %)', 'sgs-blocks' ) }
				help={ __( '0 = no scale. 105 = 5% larger. Overrides preset above.', 'sgs-blocks' ) }
				value={ sgsHoverScale }
				onChange={ ( val ) => setAttributes( { sgsHoverScale: val } ) }
				min={ 0 }
				max={ 120 }
				step={ 1 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<RangeControl
				label={ __( 'Hover lift (px)', 'sgs-blocks' ) }
				help={ __( 'Raises the block on hover. 0 = no lift. Works together with scale.', 'sgs-blocks' ) }
				value={ sgsHoverLift }
				onChange={ ( val ) => setAttributes( { sgsHoverLift: val ?? 0 } ) }
				min={ 0 }
				max={ 24 }
				step={ 1 }
				allowReset
				resetFallbackValue={ 0 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ hideShadowPicker ? (
				<p className="sgs-hover-effects__shadow-note" style={ { fontSize: '12px', fontStyle: 'italic', color: '#757575' } }>
					{ __( 'This block’s Shadow panel already has a hover shadow setting — see “Hover shadow” there.', 'sgs-blocks' ) }
				</p>
			) : (
				<SelectControl
					label={ __( 'Hover shadow', 'sgs-blocks' ) }
					value={ sgsHoverShadow }
					options={ shadowOptions }
					onChange={ ( val ) => setAttributes( { sgsHoverShadow: val } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
			{ ! hideImageZoom && (
			<ToggleControl
				label={ __( 'Zoom image on hover', 'sgs-blocks' ) }
				help={ __( 'Gently scales any image inside the block when hovered.', 'sgs-blocks' ) }
				checked={ sgsHoverImageZoom }
				onChange={ ( val ) => setAttributes( { sgsHoverImageZoom: val } ) }
			/>
			) }
			{ ! hideImageZoom && sgsHoverImageZoom && (
				<>
					<RangeControl
						label={ __( 'Photo zoom (%)', 'sgs-blocks' ) }
						help={ __( 'How far the image grows on hover. 0 = the block default (110%).', 'sgs-blocks' ) }
						value={ sgsHoverZoom }
						onChange={ ( val ) => setAttributes( { sgsHoverZoom: val ?? 0 } ) }
						min={ 0 }
						max={ 130 }
						step={ 1 }
						allowReset
						resetFallbackValue={ 0 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Photo zoom duration (ms)', 'sgs-blocks' ) }
						help={ __( 'How long the zoom takes. 0 = the block default.', 'sgs-blocks' ) }
						value={ sgsHoverZoomDuration }
						onChange={ ( val ) => setAttributes( { sgsHoverZoomDuration: val ?? 0 } ) }
						min={ 0 }
						max={ 2000 }
						step={ 50 }
						allowReset
						resetFallbackValue={ 0 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</>
			) }
			{ ! hideGrayscale && (
			<ToggleControl
				label={ __( 'Grayscale to colour', 'sgs-blocks' ) }
				help={ __( 'Desaturates images at rest; restores colour on hover.', 'sgs-blocks' ) }
				checked={ sgsHoverGrayscale }
				onChange={ ( val ) => setAttributes( { sgsHoverGrayscale: val } ) }
			/>
			) }
			<ToggleControl
				label={ __( 'Border accent line on hover', 'sgs-blocks' ) }
				help={ __( 'Adds a coloured line at the bottom that scales in on hover.', 'sgs-blocks' ) }
				checked={ sgsHoverBorderAccent }
				onChange={ ( val ) => setAttributes( { sgsHoverBorderAccent: val } ) }
			/>
			<SelectControl
				label={ __( 'Transition duration', 'sgs-blocks' ) }
				help={ __( 'Speed of hover transitions. Sourced from brand motion tokens.', 'sgs-blocks' ) }
				value={ sgsHoverDuration }
				options={ DURATION_OPTIONS }
				onChange={ ( val ) => setAttributes( { sgsHoverDuration: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<RangeControl
				label={ __( 'Exact duration (ms)', 'sgs-blocks' ) }
				help={ __( 'Overrides the duration above. 0 = use it.', 'sgs-blocks' ) }
				value={ sgsHoverDurationMs }
				onChange={ ( val ) => setAttributes( { sgsHoverDurationMs: val ?? 0 } ) }
				min={ 0 }
				max={ 2000 }
				step={ 50 }
				allowReset
				resetFallbackValue={ 0 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<SelectControl
				label={ __( 'Transition easing', 'sgs-blocks' ) }
				help={ __( 'Curve applied to hover transitions. Sourced from brand motion tokens.', 'sgs-blocks' ) }
				value={ sgsHoverEasing }
				options={ EASING_OPTIONS }
				onChange={ ( val ) => setAttributes( { sgsHoverEasing: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<RangeControl
				label={ __( 'Child stagger delay (ms)', 'sgs-blocks' ) }
				help={ __( 'Each direct child is delayed by a multiple of this value.', 'sgs-blocks' ) }
				value={ sgsStaggerDelay }
				onChange={ ( val ) => setAttributes( { sgsStaggerDelay: val } ) }
				min={ 0 }
				max={ 500 }
				step={ 25 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<ToggleControl
				label={ __( 'Show focus ring on keyboard focus', 'sgs-blocks' ) }
				help={ __( 'Adds a visible focus ring (3px primary glow at 0.4 alpha) when keyboard-tabbed to. Recommended on for any clickable block.', 'sgs-blocks' ) }
				checked={ sgsFocusRing }
				onChange={ ( val ) => setAttributes( { sgsFocusRing: val } ) }
			/>
		</PanelBody>
	);
}
