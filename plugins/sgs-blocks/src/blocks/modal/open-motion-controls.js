/**
 * Modal: how the dialog and its backdrop open. Duration, easing and start scale of the panel, and the backdrop's fade
 * time. Every control left at its default keeps the stylesheet's own medium duration, spring curve, 0.95 start scale
 * and the shared scrim's 200ms fade (render.php prints a rule only for a value that is set).
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { RangeControl } from '@wordpress/components';
import EasingAtom from '../../components/motion/EasingAtom';

/**
 * The open-animation controls.
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block editor setAttributes.
 * @return {JSX.Element} The panel body.
 */
export function DialogOpenMotionControls( { attributes, setAttributes } ) {
	const {
		openDuration,
		openEasing,
		openEasingCustom,
		openStartScale,
		scrimFadeDuration,
	} = attributes;

	return (
		<>
			<RangeControl
				label={ __( 'Open and close time (ms)', 'sgs-blocks' ) }
				help={ __( '0 keeps the theme duration.', 'sgs-blocks' ) }
				value={ openDuration ?? 0 }
				onChange={ ( value ) =>
					setAttributes( { openDuration: value ?? 0 } )
				}
				min={ 0 }
				max={ 3000 }
				step={ 10 }
				allowReset
				resetFallbackValue={ 0 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<EasingAtom
				vocab="nav"
				label={ __( 'Open and close easing', 'sgs-blocks' ) }
				value={ openEasing }
				custom={ openEasingCustom }
				fallback="ease"
				onChange={ ( val ) => setAttributes( { openEasing: val } ) }
				onCustomChange={ ( val ) =>
					setAttributes( { openEasingCustom: val } )
				}
			/>
			<RangeControl
				label={ __( 'Start scale', 'sgs-blocks' ) }
				help={ __(
					'0 keeps the theme start scale (0.95). 1 opens with no growth.',
					'sgs-blocks'
				) }
				value={ openStartScale ?? 0 }
				onChange={ ( value ) =>
					setAttributes( { openStartScale: value ?? 0 } )
				}
				min={ 0 }
				max={ 1 }
				step={ 0.005 }
				allowReset
				resetFallbackValue={ 0 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<RangeControl
				label={ __( 'Backdrop fade time (ms)', 'sgs-blocks' ) }
				help={ __(
					'0 keeps the shared 200ms backdrop fade.',
					'sgs-blocks'
				) }
				value={ scrimFadeDuration ?? 0 }
				onChange={ ( value ) =>
					setAttributes( { scrimFadeDuration: value ?? 0 } )
				}
				min={ 0 }
				max={ 3000 }
				step={ 10 }
				allowReset
				resetFallbackValue={ 0 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</>
	);
}
