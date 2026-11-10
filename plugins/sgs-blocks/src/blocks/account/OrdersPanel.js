/**
 * sgs/account — Orders list panel, the colour rows of every Round 9 setting, and the extra typography targets.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { fillRow, textRow } from '../../components';
import { Choice, TextField, TierBox, Toggle, TYPE_TARGET } from './extraControls';

// [ row key, label, background attribute, text attribute ]
const STATUSES = [
	[ 'Pending', __( 'Pending', 'sgs-blocks' ), 'ordersPillPendingBackground', 'ordersPillPendingText' ],
	[ 'Processing', __( 'Processing', 'sgs-blocks' ), 'ordersPillProcessingBackground', 'ordersPillProcessingText' ],
	[ 'OnHold', __( 'On hold', 'sgs-blocks' ), 'ordersPillOnHoldBackground', 'ordersPillOnHoldText' ],
	[ 'Completed', __( 'Completed', 'sgs-blocks' ), 'ordersPillCompletedBackground', 'ordersPillCompletedText' ],
	[ 'Cancelled', __( 'Cancelled', 'sgs-blocks' ), 'ordersPillCancelledBackground', 'ordersPillCancelledText' ],
	[ 'Refunded', __( 'Refunded', 'sgs-blocks' ), 'ordersPillRefundedBackground', 'ordersPillRefundedText' ],
	[ 'Failed', __( 'Failed', 'sgs-blocks' ), 'ordersPillFailedBackground', 'ordersPillFailedText' ],
];

/**
 * @param {Object}   props               Panel props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The Orders panel.
 */
export default function OrdersPanel( { attributes, setAttributes } ) {
	const p = { attributes, setAttributes };
	return (
		<PanelBody title={ __( 'Orders list', 'sgs-blocks' ) } initialOpen={ false }>
			<Toggle
				{ ...p }
				name="ordersLook"
				label={ __( 'Draw orders as bordered rows', 'sgs-blocks' ) }
				help={ __( 'Order, date, status pill, total and a chevron on each row. Colours and type are under Colour and Typography.', 'sgs-blocks' ) }
			/>
			{ attributes.ordersLook && <TierBox { ...p } name="ordersRowPadding" label={ __( 'Row padding', 'sgs-blocks' ) } /> }
			{ attributes.ordersLook && <TierBox { ...p } name="ordersPillPadding" label={ __( 'Status pill padding', 'sgs-blocks' ) } /> }
			<Toggle
				{ ...p }
				name="ordersEmptyState"
				label={ __( 'Empty state card', 'sgs-blocks' ) }
				help={ __( 'Replaces WooCommerce’s “no order has been made” notice.', 'sgs-blocks' ) }
			/>
			{ attributes.ordersEmptyState && (
				<>
					<TextField { ...p } name="ordersEmptyHeading" label={ __( 'Heading', 'sgs-blocks' ) } />
					<TextField { ...p } name="ordersEmptyText" label={ __( 'Text', 'sgs-blocks' ) } />
					<TextField { ...p } name="ordersEmptyButtonLabel" label={ __( 'Button label', 'sgs-blocks' ) } />
					<TextField
						{ ...p }
						name="ordersEmptyButtonUrl"
						label={ __( 'Button link', 'sgs-blocks' ) }
						help={ __( 'Empty = the shop page.', 'sgs-blocks' ) }
					/>
					<TierBox { ...p } name="ordersEmptyPadding" label={ __( 'Card padding', 'sgs-blocks' ) } />
					<Choice
						{ ...p }
						name="wishlistLayout"
						label={ __( 'Saved items layout', 'sgs-blocks' ) }
						options={ [
							{ label: __( 'Wishlist panel default', 'sgs-blocks' ), value: '' },
							{ label: __( 'Frame cards', 'sgs-blocks' ), value: 'cards' },
						] }
					/>
					<TextField
						{ ...p }
						name="wishlistEmptyHeading"
						label={ __( 'Saved items card: heading', 'sgs-blocks' ) }
						help={ __( 'The Saved items tab shows this card, in the same look, while the list is empty. Leave the heading, text and button empty for the wishlist panel’s own message.', 'sgs-blocks' ) }
					/>
					<TextField { ...p } name="wishlistEmptyText" label={ __( 'Saved items card: text', 'sgs-blocks' ) } />
					<TextField { ...p } name="wishlistEmptyButtonLabel" label={ __( 'Saved items card: button label', 'sgs-blocks' ) } />
					<TextField
						{ ...p }
						name="wishlistEmptyButtonUrl"
						label={ __( 'Saved items card: button link', 'sgs-blocks' ) }
						help={ __( 'Empty = the shop page.', 'sgs-blocks' ) }
					/>
				</>
			) }
			<Toggle
				{ ...p }
				name="ordersSummary"
				label={ __( 'Items summary in the orders list', 'sgs-blocks' ) }
				help={ __( 'A column naming the order’s products.', 'sgs-blocks' ) }
			/>
			<Toggle
				{ ...p }
				name="orderDetailLook"
				label={ __( 'Order detail page', 'sgs-blocks' ) }
				help={ __( 'Replaces WooCommerce’s order page with the parts below. Off = WooCommerce’s own page.', 'sgs-blocks' ) }
			/>
			{ attributes.orderDetailLook && (
				<>
					<TextField { ...p } name="orderDetailBackLabel" label={ __( 'Back link label', 'sgs-blocks' ) } />
					<TextField { ...p } name="orderDetailTitle" label={ __( 'Heading ({order} = order number)', 'sgs-blocks' ) } />
					<TextField { ...p } name="orderDetailPlacedText" label={ __( 'Line under the heading ({date}, {method})', 'sgs-blocks' ) } />
					<Toggle
						{ ...p }
						name="orderDetailProgress"
						label={ __( 'Progress line', 'sgs-blocks' ) }
					/>
					{ attributes.orderDetailProgress && (
						<>
						<TextField { ...p } name="orderDetailProgressLabel" label={ __( 'Progress line screen-reader label', 'sgs-blocks' ) } />
						<TextField { ...p } name="orderStepPlaced" label={ __( 'Step: placed', 'sgs-blocks' ) } />
						<TextField { ...p } name="orderStepProcessing" label={ __( 'Step: processing', 'sgs-blocks' ) } help={ __( 'Empty = the step is left out.', 'sgs-blocks' ) } />
						<TextField { ...p } name="orderStepDispatched" label={ __( 'Step: dispatched / posted', 'sgs-blocks' ) } />
						<TextField { ...p } name="orderStepDelivered" label={ __( 'Step: delivered', 'sgs-blocks' ) } />
						<TextField { ...p } name="orderStepReady" label={ __( 'Pickup orders: ready step', 'sgs-blocks' ) } help={ __( 'Empty = the dispatched label.', 'sgs-blocks' ) } />
						<TextField { ...p } name="orderStepCollected" label={ __( 'Pickup orders: last step', 'sgs-blocks' ) } help={ __( 'Empty = the delivered label.', 'sgs-blocks' ) } />
						</>
					) }
					<Toggle
						{ ...p }
						name="orderDetailItems"
						label={ __( 'Item rows', 'sgs-blocks' ) }
					/>
					<Toggle
						{ ...p }
						name="orderDetailBoxes"
						label={ __( 'Address, payment and total boxes', 'sgs-blocks' ) }
					/>
					{ attributes.orderDetailBoxes && (
						<>
						<TextField { ...p } name="orderDetailAddressTitle" label={ __( 'Address box title', 'sgs-blocks' ) } />
						<TextField { ...p } name="orderDetailPaymentTitle" label={ __( 'Payment box title', 'sgs-blocks' ) } />
						<TextField { ...p } name="orderDetailTotalTitle" label={ __( 'Total box title', 'sgs-blocks' ) } />
						<TextField { ...p } name="orderDetailSubtotalLabel" label={ __( 'Subtotal label', 'sgs-blocks' ) } />
						<TextField { ...p } name="orderDetailTotalLabel" label={ __( 'Total label', 'sgs-blocks' ) } />
						</>
					) }
					<Toggle
						{ ...p }
						name="orderDetailWhatsApp"
						label={ __( 'WhatsApp card', 'sgs-blocks' ) }
					/>
					{ attributes.orderDetailWhatsApp && (
						<>
						<TextField { ...p } name="orderDetailWhatsAppNumber" label={ __( 'WhatsApp number', 'sgs-blocks' ) } help={ __( 'Digits with the country code, for example 447960597847.', 'sgs-blocks' ) } />
						<TextField { ...p } name="orderDetailWhatsAppTitle" label={ __( 'Card title', 'sgs-blocks' ) } />
						<TextField { ...p } name="orderDetailWhatsAppText" label={ __( 'Card line ({order} = order number)', 'sgs-blocks' ) } />
						</>
					) }
				</>
			) }
		</PanelBody>
	);
}

/**
 * Colour rows for the block's colour panel: every Round 9 colour setting.
 *
 * @param {Object}   attributes    Block attributes.
 * @param {Function} setAttributes Attribute setter.
 * @return {Array} Rows for SgsColourPanel.
 */
export function extraColourRows( attributes, setAttributes ) {
	const t = ( key, label, attrs ) => textRow( { key, label, attrs, attributes, setAttributes } );
	const f = ( key, label, attrs ) => fillRow( { key, label, attrs, attributes, setAttributes } );
	const rows = [
		t( 'headerEyebrow', __( 'Page header eyebrow', 'sgs-blocks' ), { base: 'headerEyebrowColour' } ),
		t( 'headerTitle', __( 'Page header title', 'sgs-blocks' ), { base: 'headerTitleColour' } ),
		t( 'headerIntro', __( 'Page header intro', 'sgs-blocks' ), { base: 'headerIntroColour' } ),
		t( 'headerMeta', __( 'Page header signed-in line', 'sgs-blocks' ), { base: 'headerMetaColour' } ),
		t( 'headerBack', __( 'Back to sign in link', 'sgs-blocks' ), { base: 'headerBackColour' } ),
		f( 'headerRule', __( 'Page header rule', 'sgs-blocks' ), { base: 'headerRuleColour' } ),
		t( 'menuCount', __( 'Menu Orders count', 'sgs-blocks' ), { base: 'menuCountColour' } ),
		f( 'ordersRowBackground', __( 'Order row background', 'sgs-blocks' ), { base: 'ordersRowBackground', hover: 'ordersRowBackgroundHover' } ),
		f( 'ordersRowBorder', __( 'Order rows frame and lines', 'sgs-blocks' ), { base: 'ordersRowBorderColour' } ),
		t( 'ordersNumber', __( 'Order number', 'sgs-blocks' ), { base: 'ordersNumberColour' } ),
		t( 'ordersDate', __( 'Order date', 'sgs-blocks' ), { base: 'ordersDateColour' } ),
		t( 'ordersTotal', __( 'Order total', 'sgs-blocks' ), { base: 'ordersTotalColour' } ),
		f( 'ordersPillBackground', __( 'Status pill background', 'sgs-blocks' ), { base: 'ordersPillBackground' } ),
		t( 'ordersPillText', __( 'Status pill text', 'sgs-blocks' ), { base: 'ordersPillText' } ),
	];
	STATUSES.forEach( ( [ key, label, background, text ] ) => {
		rows.push(
			f( 'ordersPill' + key + 'Bg', label + ': ' + __( 'pill background', 'sgs-blocks' ), { base: background } ),
			t( 'ordersPill' + key + 'Tx', label + ': ' + __( 'pill text', 'sgs-blocks' ), { base: text } )
		);
	} );
	rows.push(
		f( 'ordersEmptyBackground', __( 'Orders empty card background', 'sgs-blocks' ), { base: 'ordersEmptyBackground' } ),
		f( 'ordersEmptyBorder', __( 'Orders empty card border', 'sgs-blocks' ), { base: 'ordersEmptyBorderColour' } ),
		t( 'ordersEmptyTitle', __( 'Orders empty card heading', 'sgs-blocks' ), { base: 'ordersEmptyTitleColour' } ),
		t( 'ordersEmptyText', __( 'Orders empty card text', 'sgs-blocks' ), { base: 'ordersEmptyTextColour' } ),
		f( 'addressCardBackground', __( 'Address card background', 'sgs-blocks' ), { base: 'addressCardBackgroundColour' } ),
		t( 'addressTitle', __( 'Address card title', 'sgs-blocks' ), { base: 'addressTitleColour' } ),
		t( 'addressHelper', __( 'Addresses helper line', 'sgs-blocks' ), { base: 'addressHelperColour' } ),
		t( 'accountSection', __( 'Change password heading', 'sgs-blocks' ), { base: 'accountSectionColour' } ),
		f( 'accountSectionRule', __( 'Change password rule', 'sgs-blocks' ), { base: 'accountSectionRuleColour' } ),
		t( 'accountPasswordHelper', __( 'Change password helper text', 'sgs-blocks' ), { base: 'accountPasswordHelperColour' } ),
		f( 'loginButtonBackground', __( 'Sign in button background', 'sgs-blocks' ), { base: 'loginButtonBackground', hover: 'loginButtonBackgroundHover' } ),
		t( 'loginButtonText', __( 'Sign in button text', 'sgs-blocks' ), { base: 'loginButtonText', hover: 'loginButtonTextHover' } ),
		t( 'loginLink', __( 'Lost password link', 'sgs-blocks' ), { base: 'loginLinkColour', hover: 'loginLinkColourHover' } )
	);
	return rows;
}

const target = ( prefix, label, extra = {} ) => ( { key: prefix, label, prefix, ...TYPE_TARGET, ...extra } );

export const EXTRA_TYPE_TARGETS = [
	target( 'headerEyebrow', __( 'Page header eyebrow', 'sgs-blocks' ) ),
	target( 'headerTitle', __( 'Page header title', 'sgs-blocks' ) ),
	target( 'headerIntro', __( 'Page header intro', 'sgs-blocks' ) ),
	target( 'headerMeta', __( 'Page header signed-in line', 'sgs-blocks' ) ),
	target( 'headerBack', __( 'Back to sign in link', 'sgs-blocks' ) ),
	target( 'menuCount', __( 'Menu Orders count', 'sgs-blocks' ) ),
	target( 'ordersNumber', __( 'Order number', 'sgs-blocks' ) ),
	target( 'ordersDate', __( 'Order date', 'sgs-blocks' ) ),
	target( 'ordersTotal', __( 'Order total', 'sgs-blocks' ) ),
	target( 'ordersPill', __( 'Order status pill', 'sgs-blocks' ) ),
	target( 'ordersEmptyTitle', __( 'Orders empty card heading', 'sgs-blocks' ) ),
	target( 'ordersEmptyTextType', __( 'Orders empty card text', 'sgs-blocks' ) ),
	target( 'addressTitle', __( 'Address card title', 'sgs-blocks' ) ),
	target( 'addressHelper', __( 'Addresses helper line', 'sgs-blocks' ) ),
	target( 'accountSection', __( 'Change password heading', 'sgs-blocks' ) ),
	target( 'accountPasswordHelperType', __( 'Change password helper text', 'sgs-blocks' ) ),
	target( 'loginButton', __( 'Sign in button', 'sgs-blocks' ) ),
	target( 'loginLink', __( 'Lost password link', 'sgs-blocks' ) ),
];
