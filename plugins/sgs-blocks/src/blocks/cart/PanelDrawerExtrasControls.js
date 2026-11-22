/**
 * SGS Cart — the drawer's upsell row (content tab) and the gift box's placement.
 *
 * Render side: `includes/helpers-cart-panel-extras.php::sgs_cart_upsell_html`, `sgs_cart_gift_box_html`; view script
 * `panel-render.js` (the row and an after-items gift box sit inside the scrolling list, under the basket lines).
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import ProductPickerControl from '../../components/ProductPickerControl';

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    The block's current attributes.
 * @param {Function} props.setAttributes The block's attribute setter.
 * @param {boolean}  props.hasPanel      Whether displayMode is flyout|drawer.
 * @return {Element|null} The panels, or null in link mode (no panel is built).
 */
export default function PanelDrawerExtrasControls( {
	attributes,
	setAttributes,
	hasPanel,
} ) {
	if ( ! hasPanel ) {
		return null;
	}
	const text = ( attr, label, help ) => (
		<TextControl
			label={ label }
			help={ help }
			value={ attributes[ attr ] ?? '' }
			onChange={ ( val ) => setAttributes( { [ attr ]: val } ) }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);
	const hasUpsell = Number( attributes.upsellProductId ) > 0;

	return (
		<>
			{ attributes.panelGiftShow && (
				<PanelBody
					title={ __( 'Gift box placement', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Where the gift box sits', 'sgs-blocks' ) }
						value={ attributes.panelGiftPlacement || 'footer' }
						options={ [
							{
								label: __( 'Above the footer', 'sgs-blocks' ),
								value: 'footer',
							},
							{
								label: __(
									'Under the last basket line (scrolls with the lines)',
									'sgs-blocks'
								),
								value: 'after-items',
							},
						] }
						onChange={ ( val ) =>
							setAttributes( { panelGiftPlacement: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			) }
			<PanelBody
				title={ __( 'Upsell row', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<ProductPickerControl
					label={ __( 'Product to offer', 'sgs-blocks' ) }
					help={ __(
						'A row under the basket lines with an Add button, hidden while this product is in the basket. A simple product, or a variable product whose default options are all set, is added in one tap; any other product makes the button a link to its page. Clear it for no row.',
						'sgs-blocks'
					) }
					value={ Number( attributes.upsellProductId ) || 0 }
					onChange={ ( id ) =>
						setAttributes( { upsellProductId: id } )
					}
				/>
				{ hasUpsell && (
					<>
						{ text(
							'upsellTitle',
							__( 'Heading', 'sgs-blocks' ),
							__( 'Empty uses the product name.', 'sgs-blocks' )
						) }
						{ text(
							'upsellText',
							__( 'Line under the heading', 'sgs-blocks' ),
							__(
								'Type {price} where the price should go. Empty prints none.',
								'sgs-blocks'
							)
						) }
						{ text(
							'upsellButtonLabel',
							__( 'Button label', 'sgs-blocks' ),
							__(
								'Type {price} where the price should go.',
								'sgs-blocks'
							)
						) }
						<ToggleControl
							label={ __(
								'Show the product picture',
								'sgs-blocks'
							) }
							checked={ false !== attributes.upsellShowImage }
							onChange={ ( val ) =>
								setAttributes( { upsellShowImage: val } )
							}
							__nextHasNoMarginBottom
						/>
					</>
				) }
			</PanelBody>
		</>
	);
}
