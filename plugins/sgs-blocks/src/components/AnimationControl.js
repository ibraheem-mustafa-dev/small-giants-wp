/**
 * Animation selector for block sidebar.
 *
 * Lets editors choose a scroll-triggered animation (fade-up, slide, etc.),
 * delay, and duration. The frontend IntersectionObserver reads these as
 * data attributes and triggers the CSS transition.
 */
import { SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const ANIMATIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Fade Up', 'sgs-blocks' ), value: 'fade-up' },
	{ label: __( 'Fade In', 'sgs-blocks' ), value: 'fade-in' },
	{ label: __( 'Slide Left', 'sgs-blocks' ), value: 'slide-left' },
	{ label: __( 'Slide Right', 'sgs-blocks' ), value: 'slide-right' },
	{ label: __( 'Scale In', 'sgs-blocks' ), value: 'scale-in' },
];

const DELAYS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '0' },
	{ label: '100ms', value: '100' },
	{ label: '200ms', value: '200' },
	{ label: '300ms', value: '300' },
];

const DURATIONS = [
	{ label: __( 'Fast (300ms)', 'sgs-blocks' ), value: 'fast' },
	{ label: __( 'Medium (500ms)', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Slow (800ms)', 'sgs-blocks' ), value: 'slow' },
];

export default function AnimationControl( {
	animation,
	animationDelay,
	animationDuration,
	onChangeAnimation,
	onChangeDelay,
	onChangeDuration,
} ) {
	return (
		<>
			<SelectControl
				label={ __( 'Animation', 'sgs-blocks' ) }
				value={ animation || 'none' }
				options={ ANIMATIONS }
				onChange={ onChangeAnimation }
				__nextHasNoMarginBottom
			/>
			{ animation && animation !== 'none' && (
				<>
					<SelectControl
						label={ __( 'Delay', 'sgs-blocks' ) }
						value={ animationDelay || '0' }
						options={ DELAYS }
						onChange={ onChangeDelay }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Duration', 'sgs-blocks' ) }
						value={ animationDuration || 'medium' }
						options={ DURATIONS }
						onChange={ onChangeDuration }
						__nextHasNoMarginBottom
					/>
				</>
			) }
		</>
	);
}
