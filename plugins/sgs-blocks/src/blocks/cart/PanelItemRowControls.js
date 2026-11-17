import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';

/**
 * SGS Cart — how an item row in the mini-cart is laid out: the quantity control's
 * style. Kept apart from "Mini-cart contents" so that panel stays short.
 *
 * @param {Object}   root0               Props.
 * @param {Object}   root0.attributes    The block's current attributes.
 * @param {Function} root0.setAttributes The block's attribute setter.
 * @param {boolean}  root0.hasPanel      Whether displayMode is flyout|drawer.
 */
export default function PanelItemRowControls( { attributes, setAttributes, hasPanel } ) {
	if ( ! hasPanel ) {
		return null;
	}
	return (
		<PanelBody title={ __( 'Mini-cart item rows', 'sgs-blocks' ) } initialOpen={ false }>
			{ false !== attributes.itemShowQty && (
				<SelectControl
					label={ __( 'Quantity control', 'sgs-blocks' ) }
					help={ __( 'The stepper is a minus button, the number and a plus button in one pill. Its buttons stop at the limits the shop sets for that item.', 'sgs-blocks' ) }
					value={ attributes.itemQtyStyle || 'input' }
					options={ [
						{ label: __( 'A number box', 'sgs-blocks' ), value: 'input' },
						{ label: __( 'A stepper (minus, number, plus)', 'sgs-blocks' ), value: 'stepper' },
					] }
					onChange={ ( val ) => setAttributes( { itemQtyStyle: val } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</PanelBody>
	);
}
