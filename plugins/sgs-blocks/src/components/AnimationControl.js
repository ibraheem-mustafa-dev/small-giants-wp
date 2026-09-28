/**
 * Animation selector for block sidebar.
 *
 * Lets editors choose an entrance animation (fade-up, slide, etc.), delay,
 * duration, easing and — for directional effects — travel distance. The
 * frontend observer (assets/js/animation-observer.js) reads these as data
 * attributes and plays the entrance as a Web Animations API keyframe
 * animation, not a CSS transition.
 */
import { SelectControl, Notice } from '@wordpress/components';
import { NumberControl } from './primitives';
import { __ } from '@wordpress/i18n';

/** Clamp a custom duration to a safe range in milliseconds (mirrors includes/animation-timing-clamp.php). */
const MAX_CUSTOM_DURATION_MS = 5000;
/** Clamp a custom distance to a safe range in pixels (mirrors includes/animation-timing-clamp.php). */
const MAX_CUSTOM_DISTANCE_PX = 400;

/**
 * Clamp a value to a 0..max integer, falling back to `fallback` when the
 * value is missing or not a finite number — never lets a stray NaN or
 * out-of-range value reach the stored attribute.
 *
 * @param {number|string} value    Raw input.
 * @param {number}        max      Upper bound.
 * @param {number}        fallback Value used when input is not a finite number.
 * @return {number} A clamped whole number.
 */
function clamp( value, max, fallback ) {
	const num = Number( value );
	if ( ! Number.isFinite( num ) ) {
		return fallback;
	}
	return Math.max( 0, Math.min( max, Math.round( num ) ) );
}

const ANIMATIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Fade Up', 'sgs-blocks' ), value: 'fade-up' },
	{ label: __( 'Fade Down', 'sgs-blocks' ), value: 'fade-down' },
	{ label: __( 'Fade In', 'sgs-blocks' ), value: 'fade-in' },
	{ label: __( 'Fade Left', 'sgs-blocks' ), value: 'fade-left' },
	{ label: __( 'Fade Right', 'sgs-blocks' ), value: 'fade-right' },
	{ label: __( 'Slide Up', 'sgs-blocks' ), value: 'slide-up' },
	{ label: __( 'Slide Down', 'sgs-blocks' ), value: 'slide-down' },
	{ label: __( 'Slide Left', 'sgs-blocks' ), value: 'slide-left' },
	{ label: __( 'Slide Right', 'sgs-blocks' ), value: 'slide-right' },
	{ label: __( 'Scale In', 'sgs-blocks' ), value: 'scale-in' },
	{ label: __( 'Scale Out', 'sgs-blocks' ), value: 'scale-out' },
	{ label: __( 'Rotate In', 'sgs-blocks' ), value: 'rotate-in' },
	{ label: __( 'Flip In', 'sgs-blocks' ), value: 'flip-in' },
	{ label: __( 'Blur In', 'sgs-blocks' ), value: 'blur-in' },
	{ label: __( 'Bounce In', 'sgs-blocks' ), value: 'bounce-in' },
	{ label: __( 'Reveal Up', 'sgs-blocks' ), value: 'reveal-up' },
];

const DELAYS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '0' },
	{ label: '100ms', value: '100' },
	{ label: '200ms', value: '200' },
	{ label: '300ms', value: '300' },
	{ label: '500ms', value: '500' },
	{ label: '800ms', value: '800' },
];

/**
 * Effects that move an element along an axis (as opposed to scale, rotate,
 * filter or clip-path effects) — the only ones a travel distance applies to.
 */
const DIRECTIONAL_EFFECTS = [
	'fade-up', 'fade-down', 'fade-left', 'fade-right',
	'slide-up', 'slide-down', 'slide-left', 'slide-right',
];

/**
 * Distance options. The empty value keeps each effect's own default travel
 * (30px for fade-*, 100px for slide-*) — the label reflects whichever
 * default applies to the currently-selected effect.
 */
const PRESET_DISTANCES = [ '15', '30', '50', '100' ];

function distanceOptions( animation ) {
	const isSlide = animation && animation.startsWith( 'slide-' );
	return [
		{
			label: isSlide
				? __( 'Default (100px)', 'sgs-blocks' )
				: __( 'Default (30px)', 'sgs-blocks' ),
			value: '',
		},
		{ label: '15px', value: '15' },
		{ label: '30px', value: '30' },
		{ label: '50px', value: '50' },
		{ label: '100px', value: '100' },
		{ label: __( 'Custom', 'sgs-blocks' ), value: 'custom' },
	];
}

/**
 * Duration options reference theme.json motion tokens:
 * settings.custom.duration.* — var(--wp--custom--duration--<value>)
 */
const DURATIONS = [
	{ label: __( 'Instant (60ms)', 'sgs-blocks' ),     value: 'instant' },
	{ label: __( 'Fast (150ms)', 'sgs-blocks' ),        value: 'fast' },
	{ label: __( 'Medium (300ms)', 'sgs-blocks' ),      value: 'medium' },
	{ label: __( 'Slow (500ms)', 'sgs-blocks' ),        value: 'slow' },
	{ label: __( 'Extra slow (800ms)', 'sgs-blocks' ),  value: 'extra-slow' },
	{ label: __( 'Custom', 'sgs-blocks' ),              value: 'custom' },
];

/** Token values from DURATIONS, excluding the synthetic "custom" entry. */
const DURATION_TOKENS = DURATIONS.map( ( d ) => d.value ).filter( ( v ) => 'custom' !== v );

/**
 * Easing options reference theme.json motion tokens:
 * settings.custom.easing.* — var(--wp--custom--easing--<value>)
 */
const EASINGS = [
	{ label: __( 'Default (Material)', 'sgs-blocks' ),  value: 'default' },
	{ label: __( 'Ease out (snappy)', 'sgs-blocks' ),   value: 'ease-out' },
	{ label: __( 'Ease in (gentle)', 'sgs-blocks' ),    value: 'ease-in' },
	{ label: __( 'Spring (bouncy)', 'sgs-blocks' ),     value: 'spring' },
	{ label: __( 'Linear (constant)', 'sgs-blocks' ),   value: 'linear' },
	{ label: __( 'Ease (CSS default curve)', 'sgs-blocks' ), value: 'ease' },
];

export default function AnimationControl( {
	blockName,
	animation,
	animationDelay,
	animationDuration,
	animationEasing,
	animationDistance,
	onChangeAnimation,
	onChangeDelay,
	onChangeDuration,
	onChangeEasing,
	onChangeDistance,
} ) {
	const hasAnimation = animation && animation !== 'none';
	const isDirectional = hasAnimation && DIRECTIONAL_EFFECTS.includes( animation );

	const isCustomDuration =
		!! animationDuration && ! DURATION_TOKENS.includes( animationDuration );
	const isCustomDistance =
		!! animationDistance && ! PRESET_DISTANCES.includes( animationDistance );

	return (
		<>
			<SelectControl
				label={ __( 'Animation', 'sgs-blocks' ) }
				value={ animation || 'none' }
				options={ ANIMATIONS }
				onChange={ onChangeAnimation }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ hasAnimation && 'sgs/site-header' === blockName && (
				<Notice status="info" isDismissible={ false }>
					{ __(
						"An entrance hides the header until it plays, so it delays the header's first appearance.",
						'sgs-blocks'
					) }
				</Notice>
			) }
			{ hasAnimation && (
				<>
					<SelectControl
						label={ __( 'Delay', 'sgs-blocks' ) }
						value={ animationDelay || '0' }
						options={ DELAYS }
						onChange={ onChangeDelay }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Duration', 'sgs-blocks' ) }
						value={ isCustomDuration ? 'custom' : ( animationDuration || 'medium' ) }
						options={ DURATIONS }
						onChange={ ( val ) =>
							onChangeDuration(
								'custom' === val
									? String( clamp( animationDuration, MAX_CUSTOM_DURATION_MS, 300 ) )
									: val
							)
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ isCustomDuration && (
						<NumberControl
							label={ __( 'Custom duration (ms)', 'sgs-blocks' ) }
							value={ animationDuration }
							min={ 0 }
							max={ MAX_CUSTOM_DURATION_MS }
							onChange={ ( val ) =>
								onChangeDuration(
									String( clamp( val, MAX_CUSTOM_DURATION_MS, 300 ) )
								)
							}
							__next40pxDefaultSize
						/>
					) }
					<SelectControl
						label={ __( 'Easing', 'sgs-blocks' ) }
						value={ animationEasing || 'default' }
						options={ EASINGS }
						onChange={ onChangeEasing }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ isDirectional && (
						<>
							<SelectControl
								label={ __( 'Distance', 'sgs-blocks' ) }
								value={ isCustomDistance ? 'custom' : ( animationDistance || '' ) }
								options={ distanceOptions( animation ) }
								onChange={ ( val ) =>
									onChangeDistance(
										'custom' === val
											? String( clamp( animationDistance, MAX_CUSTOM_DISTANCE_PX, 50 ) )
											: val
									)
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							{ isCustomDistance && (
								<NumberControl
									label={ __( 'Custom distance (px)', 'sgs-blocks' ) }
									value={ animationDistance }
									min={ 0 }
									max={ MAX_CUSTOM_DISTANCE_PX }
									onChange={ ( val ) =>
										onChangeDistance(
											String( clamp( val, MAX_CUSTOM_DISTANCE_PX, 50 ) )
										)
									}
									__next40pxDefaultSize
								/>
							) }
						</>
					) }
				</>
			) }
		</>
	);
}
