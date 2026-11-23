import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import {
	ResponsiveOverride,
	SgsBorderControl,
	SgsLengthControl,
	TypographyControls,
} from '../../components';

// The stepper's number and buttons share one text style (size and weight).
const QTY_TARGETS = [
	{
		key: 'itemQty',
		prefix: 'itemQty',
		label: __( 'Quantity stepper text', 'sgs-blocks' ),
		showStyle: false,
		showLineHeight: false,
	},
];

/**
 * SGS Cart — the quantity stepper's look (height, border, corners, text). Its fill
 * and text colours are rows in the colour panel (panelColourRows.js). Printed by
 * includes/helpers-cart-panel-items-css.php::sgs_cart_qty_stepper_css().
 *
 * @param {Object}   root0               Props.
 * @param {Object}   root0.attributes    The block's current attributes.
 * @param {Function} root0.setAttributes The block's attribute setter.
 * @param {boolean}  root0.hasPanel      Whether displayMode is flyout|drawer.
 */
export default function PanelItemRowDesign( {
	attributes,
	setAttributes,
	hasPanel,
} ) {
	if (
		! hasPanel ||
		false === attributes.itemShowQty ||
		'stepper' !== attributes.itemQtyStyle
	) {
		return null;
	}
	return (
		<PanelBody
			title={ __( 'Mini-cart quantity stepper', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<TypographyControls
				attributes={ attributes }
				setAttributes={ setAttributes }
				targets={ QTY_TARGETS }
			/>
			<ResponsiveOverride
				label={ __( 'Stepper height', 'sgs-blocks' ) }
				value={ attributes.itemQtyHeight }
				onChange={ ( obj ) => setAttributes( { itemQtyHeight: obj } ) }
			>
				{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
					<SgsLengthControl
						presets={ false }
						label={ __( 'Stepper height', 'sgs-blocks' ) }
						hideLabelFromVision
						value={ ownValue || '' }
						placeholder={ inherited ? effectiveValue : '44px' }
						onChange={ ( val ) => setOwnValue( val || '' ) }
					/>
				) }
			</ResponsiveOverride>
			<SgsBorderControl
				widthValues={ attributes.itemQtyBorderWidth ?? {} }
				onWidthChange={ ( next ) =>
					setAttributes( { itemQtyBorderWidth: next } )
				}
				styleValue={ attributes.itemQtyBorderStyle }
				onStyleChange={ ( val ) =>
					setAttributes( { itemQtyBorderStyle: val } )
				}
				colourValue={ attributes.itemQtyBorderColour }
				onColourChange={ ( val ) =>
					setAttributes( { itemQtyBorderColour: val ?? '' } )
				}
				colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
				colourLinked
			/>
			<SgsLengthControl
				presets={ false }
				label={ __( 'Stepper corners', 'sgs-blocks' ) }
				help={ __( 'Leave blank for fully rounded.', 'sgs-blocks' ) }
				value={ attributes.itemQtyRadius || '' }
				onChange={ ( val ) =>
					setAttributes( { itemQtyRadius: val || '' } )
				}
			/>
		</PanelBody>
	);
}
