/**
 * Media block inspector: the Media Styling ToolsPanel (order and alignment).
 */
import { __ } from '@wordpress/i18n';
import { ComboboxControl, TextControl } from '@wordpress/components';
import { LogicalAlignControl, ResponsiveOverride } from '../../../components';
import { BLEND_MODE_OPTIONS } from '../../../components/media/controls/MediaOverlayControls';
import { ToolsPanel, ToolsPanelItem } from '../../../components/primitives';

const IMAGE_BLEND_OPTIONS = [
	{ label: __( 'Normal', 'sgs-blocks' ), value: '' },
	...BLEND_MODE_OPTIONS.filter( ( o ) => 'normal' !== o.value ),
];

export default function MediaStylingPanel( { attributes, setAttributes } ) {
	return (
		<ToolsPanel
			label={ __( 'Media Styling', 'sgs-blocks' ) }
			resetAll={ () => setAttributes( { alignment: 'start', order: {}, imageBlendMode: '' } ) }
		>
			<ToolsPanelItem
				label={ __( 'Order', 'sgs-blocks' ) }
				hasValue={ () =>
					!! attributes.order &&
					Object.values( attributes.order ).some( ( v ) => '' !== v && null != v )
				}
				onDeselect={ () => setAttributes( { order: {} } ) }
			>
				<ResponsiveOverride
					label={ __( 'Order', 'sgs-blocks' ) }
					value={ attributes.order }
					onChange={ ( obj ) => setAttributes( { order: obj } ) }
				>
					{ ( { ownValue, setOwnValue } ) => (
						<TextControl
							label={ __( 'Order in a flex or grid row', 'sgs-blocks' ) }
							help={ __( 'Lower numbers come first. Empty keeps the source order.', 'sgs-blocks' ) }
							type="number"
							value={ ownValue ?? '' }
							onChange={ ( v ) => setOwnValue( '' === v ? '' : parseInt( v, 10 ) ) }
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					) }
				</ResponsiveOverride>
			</ToolsPanelItem>

			{ /*
			  * Sizing (mediaSizing/height/width/maxWidth/maxHeight/
			  * aspectRatio), Shape and Border (radius/width/style/
			  * colour) now render in MediaPanelLayout's own
			  * "Box & Border" PanelBody (mounted above) via the
			  * `box-shape` atom — one writer per attribute, not two
			  * panels racing. object-fit/focal-point/motion render in
			  * the "Image Styling" PanelBody, also mounted above.
			  */ }

			<ToolsPanelItem
				label={ __( 'Image blend mode', 'sgs-blocks' ) }
				hasValue={ () => !! attributes.imageBlendMode }
				onDeselect={ () => setAttributes( { imageBlendMode: '' } ) }
			>
				<ComboboxControl
					label={ __( 'Image blend mode', 'sgs-blocks' ) }
					help={ __( 'Multiply drops the white ground of a logo photo so the page colour shows through.', 'sgs-blocks' ) }
					value={ attributes.imageBlendMode || '' }
					options={ IMAGE_BLEND_OPTIONS }
					onChange={ ( v ) => setAttributes( { imageBlendMode: v || '' } ) }
					allowReset={ false }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				label={ __( 'Alignment', 'sgs-blocks' ) }
				hasValue={ () =>
					( attributes.alignment || 'start' ) !== 'start'
				}
				onDeselect={ () =>
					setAttributes( { alignment: 'start' } )
				}
				isShownByDefault
			>
				<LogicalAlignControl
					value={ attributes.alignment }
					onChange={ ( value ) =>
						setAttributes( { alignment: value } )
					}
				/>
			</ToolsPanelItem>
		</ToolsPanel>
	);
}
