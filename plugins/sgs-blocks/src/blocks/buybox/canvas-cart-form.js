/**
 * The editor canvas's add-to-basket form, as render.php prints it: the Add to Cart button, and with
 * keepAddToCartWithFlow on (and the button not set to open a popup) the linked flow's opener beside it in the
 * side-by-side wrapper (Spec 43 FR-43-25). The canvas cannot know whether the product links a flow (product meta),
 * so the opener shows whenever the setting is on, labelled as the flow's button.
 */
import { __ } from '@wordpress/i18n';
import AuthoredText from '../../components/AuthoredText';

/**
 * @param {Object} props
 * @param {Object} props.attributes  Block attributes.
 * @param {string} props.cartVariant The Add to Cart preset modifier (' buybox__add-to-cart--<slug>' or '').
 * @param {Object} props.cartStyle   The Add to Cart button's own canvas style.
 * @return {Element} The form, or the form and the flow opener in their wrapper.
 */
export function cartFormMock( { attributes, cartVariant, cartStyle } ) {
	const form = (
		<div className="buybox__cart-form">
			<span
				className={ `wp-element-button buybox__add-to-cart${ cartVariant }` }
				style={ cartStyle }
			>
				<AuthoredText
					value={
						attributes.addToCartLabel ||
						__( 'Add to Cart', 'sgs-blocks' )
					}
				/>
			</span>
		</div>
	);
	if ( ! attributes.keepAddToCartWithFlow || 'modal' === attributes.addToCartAction ) {
		return form;
	}
	// As sgs_buybox_flow_opener_html(): the secondary look, or the plain base look when Add to Cart is already secondary.
	const openerLook = 'secondary' === attributes.addToCartStyle ? '' : ' buybox__add-to-cart--secondary';
	return (
		<div className="sgs-buybox__cart-actions sgs-buybox__cart-actions--with-flow">
			{ form }
			<div className="buybox__cart-form buybox__cart-form--modal">
				<span
					className={ `wp-element-button buybox__add-to-cart${ openerLook } buybox__add-to-cart--flow-opener` }
				>
					<span className="buybox__cart-label">
						{ __( 'Flow button (from the linked flow)', 'sgs-blocks' ) }
					</span>
				</span>
			</div>
		</div>
	);
}
