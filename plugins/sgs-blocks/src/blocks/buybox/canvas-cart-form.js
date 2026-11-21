/**
 * The editor canvas's add-to-basket form, as render.php prints it: the Add to Cart button, and with
 * keepAddToCartWithFlow on (and the button not set to open a popup that names one, and not the guided layout) the linked
 * flow's opener beside it in the side-by-side wrapper, after it or, with openerBeforeAddToCart, before it (Spec 43 FR-43-25). The canvas cannot know whether the product links a
 * flow (product meta), so the opener shows whenever those conditions hold, labelled as the flow's button.
 */
import { __ } from '@wordpress/i18n';
import AuthoredText from '../../components/AuthoredText';
import { presetNames } from '../button/preset-names';

/**
 * Whether the flow's opener shows beside Add to Cart: the same conditions as
 * includes/buybox-linked-flow.php::sgs_buybox_keep_setting_applies(). The setting is on, the layout is not guided, and the
 * button does not open a named popup (a popup action with no popup named falls back to cart mode, so the opener shows).
 *
 * @param {Object} attributes Block attributes.
 * @return {boolean} True when the opener shows.
 */
export function keepsFlowOpener( attributes ) {
	if ( ! attributes.keepAddToCartWithFlow || 'guided' === ( attributes.buyboxLayout || 'standard' ) ) {
		return false;
	}
	// As sanitize_key() and sanitize_text_field() read the two settings.
	const action = String( attributes.addToCartAction || 'cart' ).toLowerCase().replace( /[^a-z0-9_-]/g, '' );
	const popup = String( attributes.addToCartModalId || '' ).replace( /<[^>]*>/g, '' ).trim();
	return ! ( 'modal' === action && '' !== popup );
}

/**
 * @param {Object} props
 * @param {Object} props.attributes  Block attributes.
 * @param {string} props.cartVariant The Add to Cart preset modifier (' buybox__add-to-cart--<slug>' or '').
 * @param {Object} props.cartStyle   The Add to Cart button's own canvas style.
 * @param {Object} [props.openerStyle] The flow opener's own canvas style (`buttonKitStyle( attributes, 'flowOpener', ... )`): the
 *                                     kit's look settings, as the page prints them.
 * @return {Element} The form, or the form and the flow opener in their wrapper.
 */
export function cartFormMock( { attributes, cartVariant, cartStyle, openerStyle } ) {
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
	if ( ! keepsFlowOpener( attributes ) ) {
		return form;
	}
	// As sgs_buybox_flow_opener_html(): the preset the opener's own style names, else the secondary look, or the plain base
	// look when Add to Cart is already secondary.
	const openerLook = presetNames().includes( attributes.flowOpenerStyle )
		? ` buybox__add-to-cart--${ attributes.flowOpenerStyle }`
		: ( 'secondary' === attributes.addToCartStyle ? '' : ' buybox__add-to-cart--secondary' );
	const opener = (
		<div className="buybox__cart-form buybox__cart-form--modal">
			<span
				className={ `wp-element-button buybox__add-to-cart${ openerLook } buybox__add-to-cart--flow-opener` }
				style={ openerStyle }
			>
				<span className="buybox__cart-label">
					{ __( 'Flow button (from the linked flow)', 'sgs-blocks' ) }
				</span>
			</span>
		</div>
	);
	// openerBeforeAddToCart: the opener first, as render.php prints it.
	return (
		<div className="sgs-buybox__cart-actions sgs-buybox__cart-actions--with-flow">
			{ attributes.openerBeforeAddToCart ? opener : form }
			{ attributes.openerBeforeAddToCart ? form : opener }
		</div>
	);
}
