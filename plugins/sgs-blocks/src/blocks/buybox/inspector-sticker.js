import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';
import {
	NumberControl,
	ToggleGroupControl,
	ToggleGroupControlOption,
} from '../../components/primitives';
import { spacingDefaultsFor } from '../../utils/spacing-defaults';
import {
	SgsLengthControl,
	SgsBoxControl,
	SgsBorderControl,
	ShadowControl,
	shadowAttrKeys,
} from '../../components';

const CART_SHADOW_KEYS = shadowAttrKeys( 'addToCartShadow', {
	hover: true,
	hoverColour: true,
} );

const CORNERS = [
	[ 'top-left', __( 'Top left', 'sgs-blocks' ) ],
	[ 'top-right', __( 'Top right', 'sgs-blocks' ) ],
	[ 'bottom-left', __( 'Bottom left', 'sgs-blocks' ) ],
	[ 'bottom-right', __( 'Bottom right', 'sgs-blocks' ) ],
];

/**
 * Settings-tab panels for the photo sticker (gallery-sticker.php) and the add-to-cart
 * button's shadow. The sticker's fill and text colours sit in the Colours panel
 * (inspector-extra.js); its type controls sit in the Typography panel.
 *
 * @param {Object}   o
 * @param {Object}   o.attributes    The block's attributes.
 * @param {Function} o.setAttributes The block's setAttributes.
 * @return {JSX.Element} The panels.
 */
export function BuyboxStickerPanels( { attributes, setAttributes } ) {
	const {
		galleryStickerText,
		galleryStickerPosition,
		galleryStickerOffsetX,
		galleryStickerOffsetY,
		galleryStickerBorderWidth,
		galleryStickerBorderStyle,
		galleryStickerBorderColour,
		galleryStickerBackgroundColour,
		galleryStickerShape,
		galleryStickerRadius,
		galleryStickerRotation,
		galleryStickerPadding,
		galleryStickerDecorative,
	} = attributes;

	return (
		<>
			<PanelBody
				title={ __( 'Photo sticker', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<TextControl
					label={ __( 'Sticker text', 'sgs-blocks' ) }
					value={ galleryStickerText || '' }
					onChange={ ( val ) =>
						setAttributes( { galleryStickerText: val } )
					}
					help={ __(
						'Printed on the main photo, so it stays with the photo while the gallery is pinned. Empty = no sticker.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				{ !! galleryStickerText && (
					<>
						<ToggleGroupControl
							label={ __( 'Corner', 'sgs-blocks' ) }
							value={ galleryStickerPosition || 'bottom-right' }
							onChange={ ( val ) =>
								setAttributes( {
									galleryStickerPosition: val,
								} )
							}
							isBlock
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						>
							{ CORNERS.map( ( [ value, label ] ) => (
								<ToggleGroupControlOption
									key={ value }
									value={ value }
									label={ label }
								/>
							) ) }
						</ToggleGroupControl>
						<SgsLengthControl
							label={ __(
								'Distance from the side edge',
								'sgs-blocks'
							) }
							value={ galleryStickerOffsetX || '' }
							onChange={ ( val ) =>
								setAttributes( {
									galleryStickerOffsetX: val ?? '',
								} )
							}
							help={ __( 'Empty = 14px.', 'sgs-blocks' ) }
							presets={ false }
						/>
						<SgsLengthControl
							label={ __(
								'Distance from the top or bottom edge',
								'sgs-blocks'
							) }
							value={ galleryStickerOffsetY || '' }
							onChange={ ( val ) =>
								setAttributes( {
									galleryStickerOffsetY: val ?? '',
								} )
							}
							help={ __( 'Empty = 14px.', 'sgs-blocks' ) }
							presets={ false }
						/>
						<ToggleGroupControl
							label={ __( 'Shape', 'sgs-blocks' ) }
							value={ galleryStickerShape || 'rounded' }
							onChange={ ( val ) =>
								setAttributes( { galleryStickerShape: val } )
							}
							isBlock
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						>
							<ToggleGroupControlOption
								value="rounded"
								label={ __( 'Rounded', 'sgs-blocks' ) }
							/>
							<ToggleGroupControlOption
								value="pill"
								label={ __( 'Pill', 'sgs-blocks' ) }
							/>
							<ToggleGroupControlOption
								value="tag"
								label={ __( 'Tag', 'sgs-blocks' ) }
							/>
						</ToggleGroupControl>
						{ 'rounded' === ( galleryStickerShape || 'rounded' ) && (
							<SgsLengthControl
								label={ __( 'Corner radius', 'sgs-blocks' ) }
								value={ galleryStickerRadius || '' }
								onChange={ ( val ) =>
									setAttributes( {
										galleryStickerRadius: val ?? '',
									} )
								}
								help={ __(
									'Empty = square corners.',
									'sgs-blocks'
								) }
								presets={ false }
							/>
						) }
						<NumberControl
							__next40pxDefaultSize
							label={ __( 'Tilt (degrees)', 'sgs-blocks' ) }
							value={ galleryStickerRotation || '' }
							step={ 1 }
							min={ -180 }
							max={ 180 }
							onChange={ ( val ) =>
								setAttributes( {
									galleryStickerRotation:
										parseFloat( val ) || 0,
								} )
							}
							help={ __(
								'Negative tilts left. 0 = upright.',
								'sgs-blocks'
							) }
						/>
						<SgsBoxControl
							label={ __( 'Sticker padding', 'sgs-blocks' ) }
							values={ galleryStickerPadding ?? {} }
							defaults={ spacingDefaultsFor(
								'sgs/buybox',
								'galleryStickerPadding'
							) }
							presets
							onChange={ ( next ) =>
								setAttributes( { galleryStickerPadding: next } )
							}
						/>
						<SgsBorderControl
							label={ __( 'Sticker border width', 'sgs-blocks' ) }
							widthValues={ galleryStickerBorderWidth ?? {} }
							onWidthChange={ ( next ) =>
								setAttributes( {
									galleryStickerBorderWidth: next,
								} )
							}
							styleValue={ galleryStickerBorderStyle }
							onStyleChange={ ( val ) =>
								setAttributes( {
									galleryStickerBorderStyle: val,
								} )
							}
							contrastAgainst={ galleryStickerBackgroundColour || '' }
							colourLabel={ __(
								'Sticker border colour',
								'sgs-blocks'
							) }
							colourStates={ [
								{
									key: 'normal',
									label: __( 'Normal', 'sgs-blocks' ),
									value: galleryStickerBorderColour,
									onChange: ( val ) =>
										setAttributes( {
											galleryStickerBorderColour:
												val ?? '',
										} ),
									linked: true,
								},
							] }
						/>
						<ToggleControl
							label={ __(
								'Decorative (hide from screen readers)',
								'sgs-blocks'
							) }
							checked={ false !== galleryStickerDecorative }
							onChange={ ( val ) =>
								setAttributes( {
									galleryStickerDecorative: val,
								} )
							}
							__nextHasNoMarginBottom
						/>
					</>
				) }
			</PanelBody>

			<PanelBody
				title={ __( 'Add to cart shadow', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<ShadowControl
					label={ __( 'Button shadow', 'sgs-blocks' ) }
					attributes={ attributes }
					setAttributes={ setAttributes }
					attrNames={ CART_SHADOW_KEYS }
					liftPrefix="addToCart"
				/>
			</PanelBody>
		</>
	);
}
