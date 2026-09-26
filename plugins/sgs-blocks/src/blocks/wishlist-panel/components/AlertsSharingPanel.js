/**
 * SGS Wishlist Panel — "Alerts and sharing" inspector panel: the guest
 * banner, the shopper-facing opt-in/share copy, and the shared-list view's
 * own copy.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The panel.
 */
export default function AlertsSharingPanel( { attributes, setAttributes } ) {
	const { layout, showGuestPrompt } = attributes;

	const set = ( key ) => ( value ) => setAttributes( { [ key ]: value } );
	const field = ( key, label, help ) => (
		<TextControl
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			label={ label }
			help={ help }
			value={ attributes[ key ] }
			onChange={ set( key ) }
		/>
	);

	return (
		<PanelBody title={ __( 'Alerts and sharing', 'sgs-blocks' ) }>
			{ 'strip' !== layout && (
				<>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Show the sign-in banner for guests', 'sgs-blocks' ) }
						checked={ !! showGuestPrompt }
						onChange={ set( 'showGuestPrompt' ) }
					/>
					{ showGuestPrompt && field( 'guestPromptText', __( 'Guest banner text', 'sgs-blocks' ) ) }
					{ field( 'signInLabel', __( 'Sign in link label', 'sgs-blocks' ) ) }
					{ field( 'alertsPriceLabel', __( 'Price-alert opt-in label', 'sgs-blocks' ) ) }
					{ field( 'alertsStockLabel', __( 'Stock-alert opt-in label', 'sgs-blocks' ) ) }
					{ field( 'privacyLinkLabel', __( 'Privacy-policy link label', 'sgs-blocks' ) ) }
					{ field( 'shareLabel', __( '"Share my list" label', 'sgs-blocks' ) ) }
					{ field( 'shareCopyLabel', __( 'Copy-link button label', 'sgs-blocks' ) ) }
					{ field( 'shareCopiedText', __( '"Link copied" confirmation', 'sgs-blocks' ) ) }
					{ field( 'shareNewLinkLabel', __( '"Make a new link" label', 'sgs-blocks' ) ) }
				</>
			) }
			{ field( 'sharedHeading', __( 'Shared-list heading', 'sgs-blocks' ) ) }
			{ field( 'addToMineLabel', __( '"Save to my list" label (shared view)', 'sgs-blocks' ) ) }
			{ field( 'sharedGoneText', __( 'Shared-list-removed message', 'sgs-blocks' ) ) }
		</PanelBody>
	);
}
