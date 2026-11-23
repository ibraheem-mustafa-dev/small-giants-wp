import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import {
	ResponsiveBoxControl,
	SgsBorderControl,
	TypographyControls,
} from '../../components';
import { spacingDefaultsFor } from '../../utils/spacing-defaults';

// The delivery note under the subtotal: its own text style, apart from the instalments note under Checkout.
const TAX_NOTE_TARGETS = [
	{
		key: 'panelTaxNote',
		prefix: 'panelTaxNote',
		label: __( 'Note under the subtotal', 'sgs-blocks' ),
		showStyle: false,
		showLineHeight: false,
		showTextAlign: true,
	},
];

/**
 * SGS Cart — the mini-cart's note under the subtotal (text style) and the free-delivery
 * band (border and padding). Their colours are rows in the colour panel (panelColourRows.js).
 * Printed by includes/helpers-cart-panel-items-css.php::sgs_cart_footer_band_css and the
 * panel's typography loop (includes/helpers-cart-panel-css.php).
 *
 * @param {Object}   root0               Props.
 * @param {string}   root0.name          The block's registered name.
 * @param {Object}   root0.attributes    The block's current attributes.
 * @param {Function} root0.setAttributes The block's attribute setter.
 * @param {boolean}  root0.hasPanel      Whether displayMode is flyout|drawer.
 */
export default function PanelFooterDesign( {
	name,
	attributes,
	setAttributes,
	hasPanel,
} ) {
	if ( ! hasPanel ) {
		return null;
	}
	return (
		<>
			<PanelBody
				title={ __(
					'Mini-cart note under the subtotal',
					'sgs-blocks'
				) }
				initialOpen={ false }
			>
				<TypographyControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					targets={ TAX_NOTE_TARGETS }
				/>
			</PanelBody>
			<PanelBody
				title={ __( 'Mini-cart free-delivery band', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<SgsBorderControl
					widthValues={ attributes.freeDeliveryBandBorderWidth ?? {} }
					onWidthChange={ ( next ) =>
						setAttributes( { freeDeliveryBandBorderWidth: next } )
					}
					styleValue={ attributes.freeDeliveryBandBorderStyle }
					onStyleChange={ ( val ) =>
						setAttributes( { freeDeliveryBandBorderStyle: val } )
					}
					colourValue={ attributes.freeDeliveryBandBorderColour }
					onColourChange={ ( val ) =>
						setAttributes( {
							freeDeliveryBandBorderColour: val ?? '',
						} )
					}
					colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
					colourLinked
				/>
				<ResponsiveBoxControl
					label={ __( 'Band padding', 'sgs-blocks' ) }
					presets
					defaults={ spacingDefaultsFor(
						name,
						'freeDeliveryBandPadding'
					) }
					values={ {
						base: attributes.freeDeliveryBandPadding?.desktop ?? {},
						tablet:
							attributes.freeDeliveryBandPadding?.tablet ?? {},
						mobile:
							attributes.freeDeliveryBandPadding?.mobile ?? {},
					} }
					onChange={ ( tier, next ) => {
						const key = 'base' === tier ? 'desktop' : tier;
						setAttributes( {
							freeDeliveryBandPadding: {
								...( attributes.freeDeliveryBandPadding || {} ),
								[ key ]: next,
							},
						} );
					} }
				/>
			</PanelBody>
		</>
	);
}
