/**
 * SurfaceGroundControls: the shared inspector controls for a frosted surface
 * (backdrop blur, saturate and fill opacity), written once for every surface that
 * offers them (sgs/site-header, sgs/mega-panel, sgs/nav-drawer). The matching
 * render side is `includes/helpers-surface-ground.php`.
 *
 * Returns ToolsPanelItems, so the caller mounts it inside its own ToolsPanel and
 * adds `surfaceBlur`, `surfaceSaturate` and `surfaceOpacity` to that panel's
 * resetAll.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { RangeControl } from '@wordpress/components';
import SgsLengthControl from './SgsLengthControl';
import { ToolsPanelItem } from './primitives';

/**
 * @param {Object}   props                 Component props.
 * @param {Object}   props.attributes      Block attributes.
 * @param {Function} props.setAttributes   Attribute setter.
 * @param {boolean}  [props.showOpacity]   Offer the fill-opacity control (default true).
 * @return {JSX.Element} The controls.
 */
export default function SurfaceGroundControls( {
	attributes,
	setAttributes,
	showOpacity = true,
} ) {
	const { surfaceBlur, surfaceSaturate, surfaceOpacity } = attributes;

	return (
		<>
			<ToolsPanelItem
				label={ __( 'Background blur', 'sgs-blocks' ) }
				hasValue={ () => !! surfaceBlur }
				onDeselect={ () => setAttributes( { surfaceBlur: '' } ) }
			>
				<SgsLengthControl
					label={ __( 'Background blur', 'sgs-blocks' ) }
					help={ __(
						'Blurs whatever sits behind this surface, the way frosted glass does. Leave empty for none.',
						'sgs-blocks'
					) }
					value={ surfaceBlur || '' }
					onChange={ ( value ) =>
						setAttributes( { surfaceBlur: value || '' } )
					}
					units={ [ { value: 'px', label: 'px' } ] }
					presets={ false }
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				label={ __( 'Background saturation', 'sgs-blocks' ) }
				hasValue={ () => typeof surfaceSaturate === 'number' }
				onDeselect={ () => setAttributes( { surfaceSaturate: undefined } ) }
			>
				<RangeControl
					label={ __( 'Background saturation (%)', 'sgs-blocks' ) }
					help={ __(
						'Boosts or mutes the colour of what shows through the blur. 150 is a common frosted look. Leave unset for none.',
						'sgs-blocks'
					) }
					value={ typeof surfaceSaturate === 'number' ? surfaceSaturate : undefined }
					min={ 0 }
					max={ 300 }
					step={ 10 }
					allowReset
					onChange={ ( value ) =>
						setAttributes( {
							surfaceSaturate: typeof value === 'number' ? value : undefined,
						} )
					}
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</ToolsPanelItem>

			{ showOpacity && (
				<ToolsPanelItem
					label={ __( 'Fill opacity', 'sgs-blocks' ) }
					hasValue={ () => typeof surfaceOpacity === 'number' }
					onDeselect={ () => setAttributes( { surfaceOpacity: undefined } ) }
				>
					<RangeControl
						label={ __( 'Fill opacity', 'sgs-blocks' ) }
						help={ __(
							'How much of the background colour shows: 1 is solid, lower lets the page through. Applies to a plain colour, not a gradient.',
							'sgs-blocks'
						) }
						value={ typeof surfaceOpacity === 'number' ? surfaceOpacity : undefined }
						min={ 0 }
						max={ 1 }
						step={ 0.05 }
						allowReset
						onChange={ ( value ) =>
							setAttributes( {
								surfaceOpacity: typeof value === 'number' ? value : undefined,
							} )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</ToolsPanelItem>
			) }
		</>
	);
}
