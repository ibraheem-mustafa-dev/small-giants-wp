/**
 * Checkout-only inspector panel: wording WooCommerce draws in JavaScript, the order summary extras (Edit link, brand
 * under each line) and the optional mobile field under Contact (a site option, because WooCommerce's checkout fields
 * cannot hold block attributes).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';

const WORDING = [
	[ 'loginLink', __( 'Log in link beside Contact (WooCommerce: Log in)', 'sgs-blocks' ), 'Log in' ],
	// translators: %s stands for the site title WooCommerce inserts.
	[ 'createAccountLabel', __( 'Create-account checkbox (WooCommerce: Create an account with %s)', 'sgs-blocks' ), 'Create an account with %s' ],
	[ 'expressDivider', __( 'Express checkout divider (WooCommerce: Or continue below)', 'sgs-blocks' ), 'Or continue below' ],
	[ 'summaryTitle', __( 'Order summary heading (WooCommerce: Order summary)', 'sgs-blocks' ), 'Order summary' ],
	[ 'emailLabel', __( 'Email field label (WooCommerce: Email address)', 'sgs-blocks' ), 'Email address' ],
	[ 'cityLabel', __( 'City field label (WooCommerce: City)', 'sgs-blocks' ), 'City' ],
	[ 'newPasswordLabel', __( 'Account password field label (WooCommerce: Create a password)', 'sgs-blocks' ), 'Create a password' ],
];

/**
 * @param {Object}   props               Block attributes and setter.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The panel.
 */
export function CheckoutWordingPanel( { attributes, setAttributes } ) {
	const strings = attributes.sgsCheckoutStrings || {};
	const [ mobile, setMobile ] = useEntityProp( 'root', 'site', 'sgs_checkout_mobile_field' );
	const mobileValue = mobile && 'object' === typeof mobile ? mobile : {};
	const setString = ( key, value ) => {
		const next = { ...strings, [ key ]: value };
		if ( ! value ) {
			delete next[ key ];
		}
		setAttributes( { sgsCheckoutStrings: Object.keys( next ).length ? next : undefined } );
	};
	const setMobileField = ( key, value ) => setMobile( { label: '', placeholder: '', ...mobileValue, [ key ]: value } );
	return (
		<PanelBody title={ __( 'Wording and extras', 'sgs-blocks' ) } initialOpen={ false }>
			{ WORDING.map( ( [ key, label, original ] ) => (
				<TextControl
					key={ key }
					label={ label }
					placeholder={ original }
					value={ strings[ key ] || '' }
					onChange={ ( value ) => setString( key, value ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) ) }
			<TextControl
				label={ __( 'Signed-in line under Contact (%s becomes the customer email)', 'sgs-blocks' ) }
				help={ __( 'Shown only to a signed-in customer, for example: Signed in as %s. Leave empty for none.', 'sgs-blocks' ) }
				value={ strings.signedInLine || '' }
				onChange={ ( value ) => setString( 'signedInLine', value ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<TextControl
				label={ __( 'Text before the Log in link (for example: Already have an account? )', 'sgs-blocks' ) }
				help={ __( 'Plain text placed in front of the link; only the link stays clickable. Keep a trailing space.', 'sgs-blocks' ) }
				value={ strings.loginPrefix || '' }
				onChange={ ( value ) => setString( 'loginPrefix', value ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<TextControl
				label={ __( 'Edit link beside the summary heading (link text)', 'sgs-blocks' ) }
				help={ __( 'Links to the bag page. Empty shows no link.', 'sgs-blocks' ) }
				value={ attributes.sgsSummaryEditLinkLabel || '' }
				onChange={ ( value ) => setAttributes( { sgsSummaryEditLinkLabel: value || undefined } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<ToggleControl
				label={ __( 'Show the brand under each product name', 'sgs-blocks' ) }
				checked={ !! attributes.sgsItemShowBrand }
				onChange={ ( value ) => setAttributes( { sgsItemShowBrand: value || undefined } ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Mobile field under Contact: label', 'sgs-blocks' ) }
				help={ __( 'A site-wide setting that only administrators can change. Leave both fields empty for no mobile field.', 'sgs-blocks' ) }
				value={ mobileValue.label || '' }
				onChange={ ( value ) => setMobileField( 'label', value ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<TextControl
				label={ __( 'Mobile field under Contact: placeholder', 'sgs-blocks' ) }
				value={ mobileValue.placeholder || '' }
				onChange={ ( value ) => setMobileField( 'placeholder', value ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</PanelBody>
	);
}
