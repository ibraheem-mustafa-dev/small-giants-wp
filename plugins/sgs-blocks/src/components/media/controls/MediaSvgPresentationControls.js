/**
 * MediaSvgPresentationControls — shared bare-row control set for the
 * `svg-presentation` atom (position/animation/speed/opacity/text-shadow/
 * min-height for an inline SVG element).
 *
 * Mirrors the vocabulary `sgs/container`'s `BackgroundPanel` SVG tab already
 * uses for `bgSvg*` (background/foreground position, none/pulse/float/wave
 * animation, slow/medium/fast speed, 0-100 opacity, text-shadow toggle,
 * free-form min-height) — same client-facing questions, re-expressed as
 * atom bases (`SvgPosition`/`SvgAnimation`/`SvgAnimationSpeed`/`SvgOpacity`/
 * `SvgTextShadow`/`SvgMinHeight`) so any NEW block adopting the
 * `svg-presentation` atom gets the identical capability container already
 * proved out, without duplicating its markup.
 *
 * Bare rows only — mounts no `InspectorControls`/`PanelBody`.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { RangeControl, SelectControl, TextControl, ToggleControl } from '@wordpress/components';

const POSITION_OPTIONS = [
	{ label: __( 'Background (behind content)', 'sgs-blocks' ), value: 'background' },
	{ label: __( 'Foreground (above content)', 'sgs-blocks' ), value: 'foreground' },
];

const ANIMATION_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Pulse', 'sgs-blocks' ), value: 'pulse' },
	{ label: __( 'Float', 'sgs-blocks' ), value: 'float' },
	{ label: __( 'Wave', 'sgs-blocks' ), value: 'wave' },
];

const SPEED_OPTIONS = [
	{ label: __( 'Slow', 'sgs-blocks' ), value: 'slow' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Fast', 'sgs-blocks' ), value: 'fast' },
];

/**
 * @param {Object}   props
 * @param {string}   props.position
 * @param {Function} props.onPositionChange
 * @param {string}   props.animation
 * @param {Function} props.onAnimationChange
 * @param {string}   props.speed
 * @param {Function} props.onSpeedChange
 * @param {number}   props.opacity
 * @param {Function} props.onOpacityChange
 * @param {boolean}  props.textShadow
 * @param {Function} props.onTextShadowChange
 * @param {string}   props.minHeight
 * @param {Function} props.onMinHeightChange
 * @param {boolean}  [props.speedDisabled]  True when animation is 'none'.
 * @param {string}   [props.speedHiddenReason]
 */
export default function MediaSvgPresentationControls( {
	position,
	onPositionChange,
	animation,
	onAnimationChange,
	speed,
	onSpeedChange,
	opacity,
	onOpacityChange,
	textShadow,
	onTextShadowChange,
	minHeight,
	onMinHeightChange,
	speedDisabled = false,
	speedHiddenReason = '',
} ) {
	return (
		<>
			<SelectControl
				label={ __( 'Position', 'sgs-blocks' ) }
				value={ position || 'background' }
				options={ POSITION_OPTIONS }
				onChange={ onPositionChange }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<RangeControl
				label={ __( 'Opacity (%)', 'sgs-blocks' ) }
				value={ 'number' === typeof opacity ? opacity : 100 }
				min={ 0 }
				max={ 100 }
				step={ 5 }
				onChange={ onOpacityChange }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<SelectControl
				label={ __( 'Animation', 'sgs-blocks' ) }
				value={ animation || 'none' }
				options={ ANIMATION_OPTIONS }
				onChange={ onAnimationChange }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<div aria-disabled={ speedDisabled }>
				<SelectControl
					label={ __( 'Animation speed', 'sgs-blocks' ) }
					value={ speed || 'medium' }
					options={ SPEED_OPTIONS }
					disabled={ speedDisabled }
					help={ speedDisabled ? speedHiddenReason : undefined }
					onChange={ onSpeedChange }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</div>
			<ToggleControl
				label={ __( 'Text shadow', 'sgs-blocks' ) }
				help={ __( 'Adds a subtle shadow to inner text for readability over busy SVG layers.', 'sgs-blocks' ) }
				checked={ !! textShadow }
				onChange={ onTextShadowChange }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Minimum height', 'sgs-blocks' ) }
				help={ __( 'e.g. 400px or 50vh. Leave blank for no minimum.', 'sgs-blocks' ) }
				value={ minHeight || '' }
				onChange={ onMinHeightChange }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</>
	);
}
