/**
 * sgs/site-header — viewport-fluid scale control (G-1).
 *
 * "Scale with the viewport above a width" — off by default. When on, every
 * size already inside the header (padding, radius, font sizes, the floating
 * pill's own inset) grows smoothly past the chosen breakpoint, matching a
 * reference header built on a fluid rem root (lamalama.com: 16px root up to
 * 1440px viewport, then roughly 1.111vw — 21.33px at 1920px).
 *
 * Mechanism (see includes/sgs-header-fluid-scale.php for the full contract):
 * render.php publishes the growth as one unitless factor,
 * `--sgs-header-fluid-scale`, on `:root`, then reads that same variable back
 * as the header's own `zoom` — one factor, two consumers, so the header's own
 * scaling and any external consumer (a `sgs/nav-drawer` anchored to the
 * header box, rendered as a SIBLING outside the `<header>` element) always
 * agree.
 *
 * Kept in its own file for the same reason FloatControls.js is.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { ToggleControl, Notice } from '@wordpress/components';
import { NumberControl, ToolsPanelItem } from '../../../components/primitives';

export const DEFAULT_FLUID_BREAKPOINT = 1440;

/**
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The control.
 */
export default function FluidScaleControls( { attributes, setAttributes } ) {
	const fluidScale = attributes.fluidScale || {};
	const enabled = !! fluidScale.enabled;

	return (
		<ToolsPanelItem
			label={ __( 'Scale with the viewport', 'sgs-blocks' ) }
			hasValue={ () => enabled }
			onDeselect={ () =>
				setAttributes( {
					fluidScale: { enabled: false, breakpoint: DEFAULT_FLUID_BREAKPOINT },
				} )
			}
		>
			<ToggleControl
				label={ __( 'Scale with the viewport above a width', 'sgs-blocks' ) }
				help={ __(
					'Off by default. Once on, everything inside the header — and the gap around it when it floats as a pill — grows smoothly past the width you set below, instead of staying a fixed size on very large screens.',
					'sgs-blocks'
				) }
				checked={ enabled }
				onChange={ ( value ) =>
					setAttributes( {
						fluidScale: {
							enabled: value,
							breakpoint: fluidScale.breakpoint || DEFAULT_FLUID_BREAKPOINT,
						},
					} )
				}
				__nextHasNoMarginBottom
			/>
			{ enabled && (
				<>
					<NumberControl
						label={ __( 'Scale above this viewport width (px)', 'sgs-blocks' ) }
						value={ fluidScale.breakpoint || DEFAULT_FLUID_BREAKPOINT }
						min={ 768 }
						max={ 2560 }
						onChange={ ( value ) =>
							setAttributes( {
								fluidScale: {
									enabled: true,
									breakpoint:
										value === '' || value === undefined
											? DEFAULT_FLUID_BREAKPOINT
											: Math.max( 768, Math.min( 2560, parseInt( value, 10 ) || DEFAULT_FLUID_BREAKPOINT ) ),
								},
							} )
						}
						__next40pxDefaultSize
					/>
					<Notice status="info" isDismissible={ false }>
						<p style={ { margin: 0 } }>
							{ __(
								'Below this width the header is unaffected. Above it, it grows the same way as a genuine large monitor would show it, with no other setting to touch.',
								'sgs-blocks'
							) }
						</p>
					</Notice>
				</>
			) }
		</ToolsPanelItem>
	);
}
