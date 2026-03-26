/**
 * Animation Panel — entry/exit timing, easing, stagger, backdrop opacity for Panel 7.
 *
 * Extracted from edit.js to keep it under 500 lines.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl, RangeControl } from '@wordpress/components';

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
		animationDuration,
		animationEasing,
		exitDuration,
		staggerDelay,
		backdropOpacity,
	} = attributes;

	return (
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
		</>
	);
}
