import { __ } from '@wordpress/i18n';

/**
 * SGS Cart — the mini-cart panel's per-element colour rows for
 * `<SgsColourPanel>` (heading count, head and footer borders, item text,
 * empty-cart button, subtotal, Checkout, the note under it). Data-driven: one
 * entry per element, with an optional hover state.
 *
 * @param {Object}   root0               Props.
 * @param {Object}   root0.attributes    The block's current attributes.
 * @param {Function} root0.setAttributes The block's attribute setter.
 * @param {boolean}  root0.hasPanel      Whether displayMode is flyout|drawer.
 * @return {Array} Rows for `SgsColourPanel`.
 */
export default function buildPanelColourRows( { attributes, setAttributes, hasPanel } ) {
	if ( ! hasPanel ) {
		return [];
	}
	const rows = [
		[ 'panelCountColour', __( 'Panel heading count', 'sgs-blocks' ) ],
		[ 'panelCloseColour', __( 'Panel close button', 'sgs-blocks' ) ],
		[ 'panelHeadBorderColour', __( 'Panel head divider', 'sgs-blocks' ) ],
		[ 'panelEmptyColour', __( 'Empty-cart text', 'sgs-blocks' ) ],
		[ 'emptyMessageColour', __( 'Empty-cart message', 'sgs-blocks' ) ],
		[ 'emptyCtaBg', __( 'Empty-cart button background', 'sgs-blocks' ) ],
		[ 'emptyCtaColour', __( 'Empty-cart button text', 'sgs-blocks' ) ],
		[ 'itemThumbBg', __( 'Item image background', 'sgs-blocks' ) ],
		[ 'itemBrandColour', __( 'Item brand', 'sgs-blocks' ) ],
		[ 'itemDetailColour', __( 'Item details', 'sgs-blocks' ) ],
		[ 'itemActionColour', __( 'Save for later link', 'sgs-blocks' ) ],
		[ 'itemActionBorderColour', __( 'Save for later underline', 'sgs-blocks' ) ],
		[ 'itemRemoveColour', __( 'Remove link', 'sgs-blocks' ) ],
		[ 'itemRemoveBorderColour', __( 'Remove link underline', 'sgs-blocks' ) ],
		[ 'panelFooterBg', __( 'Panel footer background', 'sgs-blocks' ) ],
		[ 'panelFooterBorderColour', __( 'Panel footer divider', 'sgs-blocks' ) ],
		[ 'subtotalLabelColour', __( 'Subtotal label', 'sgs-blocks' ) ],
		[ 'subtotalValueColour', __( 'Subtotal amount', 'sgs-blocks' ) ],
		[ 'freeDeliveryTextColour', __( 'Free-delivery message', 'sgs-blocks' ) ],
		[ 'checkoutBg', __( 'Checkout button background', 'sgs-blocks' ), 'checkoutBgHover' ],
		[ 'checkoutColour', __( 'Checkout button text', 'sgs-blocks' ), 'checkoutColourHover' ],
		[ 'panelNoteColour', __( 'Note under Checkout', 'sgs-blocks' ) ],
	];
	const state = ( key, label, attr ) => ( {
		key,
		label,
		value: attributes[ attr ],
		onChange: ( val ) => setAttributes( { [ attr ]: val ?? '' } ),
		linked: true,
	} );
	return rows.map( ( [ attr, label, hoverAttr ] ) => ( {
		key: attr,
		label,
		states: [
			state( 'normal', __( 'Normal', 'sgs-blocks' ), attr ),
			...( hoverAttr ? [ state( 'hover', __( 'Hover', 'sgs-blocks' ), hoverAttr ) ] : [] ),
		],
	} ) );
}
