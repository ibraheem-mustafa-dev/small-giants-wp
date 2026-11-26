/**
 * SGS Cart — inspector panels for the drawer's two additions: the centred empty state and the gift box.
 *
 * Render side: `includes/helpers-cart-panel-extras.php`, view scripts `panel-render.js` and `panel-gift.js`. The picture is
 * a media slot (`emptyImage`); the heading and the text link's wording are the existing "Empty-cart message" and
 * "Empty-cart button text" settings.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';
import { MediaElementPanel } from '../../components';
import SgsFreeTextField from '../../components/SgsFreeTextField';
import metadata from './block.json';
import ProductPickerControl from '../../components/ProductPickerControl';

const IMAGE_SLOT = metadata.supports.sgs.mediaElements.find(
	( e ) => 'emptyImage' === e.prefix
);

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    The block's current attributes.
 * @param {Function} props.setAttributes The block's attribute setter.
 * @param {boolean}  props.hasPanel      Whether displayMode is flyout|drawer.
 * @return {Element|null} The panels, or null in link mode (no panel is built).
 */
export default function PanelEmptyGiftControls( {
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

	return (
		<>
			<MediaElementPanel
				attributes={ attributes }
				setAttributes={ setAttributes }
				blockName="sgs/cart"
				blockSlug="sgs/cart"
				prefix="emptyImage"
				inGroup="settings"
				atoms={ IMAGE_SLOT.atoms }
				kinds={ IMAGE_SLOT.kinds }
				context={ IMAGE_SLOT.context }
			/>
			<PanelBody
				title={ __( 'Empty basket extras', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<p className="components-base-control__help">
					{ __(
						'Add a picture (above), a line of text, a one-tap product button or a link address and the empty drawer is centred: picture, heading, text, button, link. Leave them all empty and the drawer keeps its plain empty message.',
						'sgs-blocks'
					) }
				</p>
				<SgsFreeTextField
					type="rich"
					label={ __(
						'Line of text under the heading',
						'sgs-blocks'
					) }
					value={ attributes.emptyBody ?? '' }
					onChange={ ( val ) => setAttributes( { emptyBody: val } ) }
				/>
				<ProductPickerControl
					help={ __(
						'One tap adds it to the basket: a simple product, or a variable product whose default options are all set. Any other product makes the button a link to its page. Clear it for no button.',
						'sgs-blocks'
					) }
					value={ Number( attributes.emptyProductId ) || 0 }
					onChange={ ( id ) =>
						setAttributes( { emptyProductId: id } )
					}
				/>
				{ Number( attributes.emptyProductId ) > 0 &&
					text(
						'emptyButtonLabel',
						__( 'Button label', 'sgs-blocks' ),
						__(
							"Type {price} where the product's current price should go.",
							'sgs-blocks'
						)
					) }
				{ text(
					'emptyCtaUrl',
					__( 'Text link address', 'sgs-blocks' ),
					__(
						'Empty uses the shop page. The link\'s wording is "Empty-cart button text" in Mini-cart panel; blank wording hides the link.',
						'sgs-blocks'
					)
				) }
			</PanelBody>
			<PanelBody
				title={ __( 'Gift box', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<ToggleControl
					label={ __(
						'Offer "This is a gift" in the panel',
						'sgs-blocks'
					) }
					help={ __(
						'A tick box above the buttons while the basket holds an item. It is the same gift choice as the Gift order block: the basket page, the checkout and the order all show what is chosen here.',
						'sgs-blocks'
					) }
					checked={ !! attributes.panelGiftShow }
					onChange={ ( val ) =>
						setAttributes( { panelGiftShow: val } )
					}
					__nextHasNoMarginBottom
				/>
				{ attributes.panelGiftShow && (
					<>
						{ text(
							'panelGiftLabel',
							__( 'Tick box label', 'sgs-blocks' )
						) }
						{ text(
							'panelGiftHelp',
							__( 'Helper line', 'sgs-blocks' ),
							__(
								'Small text under the label. Empty prints none.',
								'sgs-blocks'
							)
						) }
						{ text(
							'panelGiftToLabel',
							__( 'Recipient field label', 'sgs-blocks' )
						) }
						{ text(
							'panelGiftMessageLabel',
							__( 'Note field label', 'sgs-blocks' )
						) }
					</>
				) }
			</PanelBody>
		</>
	);
}
