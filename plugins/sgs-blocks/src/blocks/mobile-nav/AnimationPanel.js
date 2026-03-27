/**
 * Animation Panel — preset picker + backdrop controls for Panel 7.
 *
 * Primary control is the animation preset selector (snappy / smooth / spring /
 * bouncy / none). Raw duration/easing/exit controls are hidden unless the user
 * selects "Custom" — this keeps the panel clean for 95% of use cases.
 *
 * Backdrop blur and opacity are always visible — they are independent of the
 * animation preset and affect visual quality on all variants.
 *
 * Extracted from edit.js to keep it under 500 lines.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl, RangeControl, ToggleControl } from '@wordpress/components';

const PRESET_OPTIONS = [
	{ label: __( 'Spring (natural bounce)', 'sgs-blocks' ), value: 'spring' },
	{ label: __( 'Snappy (fast, material)', 'sgs-blocks' ), value: 'snappy' },
	{ label: __( 'Smooth (ease-in-out)', 'sgs-blocks' ), value: 'smooth' },
	{ label: __( 'Bouncy (high overshoot)', 'sgs-blocks' ), value: 'bouncy' },
	{ label: __( 'None (instant)', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Custom\u2026', 'sgs-blocks' ), value: 'custom' },
];

const EASING_OPTIONS = [
	{ label: __( 'Spring (natural bounce)', 'sgs-blocks' ), value: 'spring' },
	{ label: __( 'Ease', 'sgs-blocks' ), value: 'ease' },
	{ label: __( 'Ease In-Out', 'sgs-blocks' ), value: 'ease-in-out' },
	{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
];

/**
 * @param {Object}   props
 * @param {Object}   props.attributes   Full block attributes object.
 * @param {Function} props.setAttributes Block setAttributes.
 */
export default function AnimationPanel( { attributes, setAttributes } ) {
	const {
		animationPreset,
		animationDuration,
		animationEasing,
		exitDuration,
		staggerDelay,
		backdropOpacity,
		backdropBlur,
		backdropBlurAmount,
	} = attributes;

	const isCustom = 'custom' === animationPreset;

	return (
		<>
			<SelectControl
				label={ __( 'Animation Preset', 'sgs-blocks' ) }
				help={ __( 'Choose a preset or select Custom to set timing manually.', 'sgs-blocks' ) }
				value={ animationPreset ?? 'spring' }
				options={ PRESET_OPTIONS }
				onChange={ ( value ) => setAttributes( { animationPreset: value } ) }
			/>

			{ isCustom && (
				<>
					<RangeControl
						label={ __( 'Entry Duration (ms)', 'sgs-blocks' ) }
						help={ __( 'Set to 0 for instant open. Spring easing gives a natural bounce.', 'sgs-blocks' ) }
						value={ animationDuration }
						min={ 0 }
						max={ 800 }
						step={ 20 }
						onChange={ ( value ) => setAttributes( { animationDuration: value } ) }
					/>
					<SelectControl
						label={ __( 'Animation Easing', 'sgs-blocks' ) }
						value={ animationEasing }
						options={ EASING_OPTIONS }
						onChange={ ( value ) => setAttributes( { animationEasing: value } ) }
					/>
					<RangeControl
						label={ __( 'Exit Duration (ms)', 'sgs-blocks' ) }
						help={ __( 'Closing animation duration. Usually shorter than entry.', 'sgs-blocks' ) }
						value={ exitDuration }
						min={ 0 }
						max={ 600 }
						step={ 20 }
						onChange={ ( value ) => setAttributes( { exitDuration: value } ) }
					/>
				</>
			) }

			<RangeControl
				label={ __( 'Stagger Delay (ms)', 'sgs-blocks' ) }
				help={ __( 'Time between each menu item appearing. 0 = all at once.', 'sgs-blocks' ) }
				value={ staggerDelay }
				min={ 0 }
				max={ 120 }
				step={ 5 }
				onChange={ ( value ) => setAttributes( { staggerDelay: value } ) }
			/>

			<RangeControl
				label={ __( 'Backdrop Opacity (%)', 'sgs-blocks' ) }
				help={ __( 'Darkness of the background overlay for overlay and bottom-sheet variants.', 'sgs-blocks' ) }
				value={ backdropOpacity }
				min={ 0 }
				max={ 100 }
				step={ 5 }
				onChange={ ( value ) => setAttributes( { backdropOpacity: value } ) }
			/>

			<ToggleControl
				label={ __( 'Backdrop Blur', 'sgs-blocks' ) }
				help={ __( 'Blurs the page content behind the backdrop overlay.', 'sgs-blocks' ) }
				checked={ backdropBlur ?? false }
				onChange={ ( value ) => setAttributes( { backdropBlur: value } ) }
			/>

			{ backdropBlur && (
				<RangeControl
					label={ __( 'Blur Amount (px)', 'sgs-blocks' ) }
					value={ backdropBlurAmount ?? 8 }
					min={ 0 }
					max={ 20 }
					step={ 1 }
					onChange={ ( value ) => setAttributes( { backdropBlurAmount: value } ) }
				/>
			) }
		</>
	);
}
