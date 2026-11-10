/**
 * Panels for the account block's order page, the orders list summary and the Saved items tab: each a small panel of its own.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { Choice, TextField, Toggle } from './extraControls';

/**
 * @param {Object}   props               Panel props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The order page and Saved items panels.
 */
export default function OrderPagePanels( { attributes, setAttributes } ) {
	const p = { attributes, setAttributes };
	return (
		<>
		<PanelBody title={ __( 'Orders list: items summary', 'sgs-blocks' ) } initialOpen={ false }>
			<Toggle { ...p } name="ordersSummary" label={ __( 'Items summary in the orders list', 'sgs-blocks' ) } help={ __( 'A column naming the order’s products.', 'sgs-blocks' ) } />
		</PanelBody>
		<PanelBody title={ __( 'Order page', 'sgs-blocks' ) } initialOpen={ false }>
			<Toggle { ...p } name="orderDetailLook" label={ __( 'Order detail page', 'sgs-blocks' ) } help={ __( 'Replaces WooCommerce’s order page with the parts in the panels below. Off = WooCommerce’s own page.', 'sgs-blocks' ) } />
			{ attributes.orderDetailLook && (
				<>
					<TextField { ...p } name="orderDetailBackLabel" label={ __( 'Back link label', 'sgs-blocks' ) } />
					<TextField { ...p } name="orderDetailTitle" label={ __( 'Heading ({order} = order number)', 'sgs-blocks' ) } />
					<TextField { ...p } name="orderDetailPlacedText" label={ __( 'Line under the heading ({date}, {method})', 'sgs-blocks' ) } />
					<Toggle { ...p } name="orderDetailItems" label={ __( 'Item rows', 'sgs-blocks' ) } />
					<Toggle { ...p } name="orderDetailBoxes" label={ __( 'Address, payment and total boxes', 'sgs-blocks' ) } />
				</>
			) }
		</PanelBody>
		{ attributes.orderDetailLook && (
			<PanelBody title={ __( 'Order page: progress line', 'sgs-blocks' ) } initialOpen={ false }>
				<Toggle { ...p } name="orderDetailProgress" label={ __( 'Progress line', 'sgs-blocks' ) } />
				<TextField { ...p } name="orderDetailProgressLabel" label={ __( 'Screen-reader label', 'sgs-blocks' ) } />
				<TextField { ...p } name="orderStepPlaced" label={ __( 'Step: placed', 'sgs-blocks' ) } />
				<TextField { ...p } name="orderStepProcessing" label={ __( 'Step: processing', 'sgs-blocks' ) } help={ __( 'Empty = the step is left out.', 'sgs-blocks' ) } />
				<TextField { ...p } name="orderStepDispatched" label={ __( 'Step: dispatched / posted', 'sgs-blocks' ) } />
				<TextField { ...p } name="orderStepDelivered" label={ __( 'Step: delivered', 'sgs-blocks' ) } />
			</PanelBody>
		) }
		{ attributes.orderDetailLook && (
			<PanelBody title={ __( 'Order page: pickup orders', 'sgs-blocks' ) } initialOpen={ false }>
				<TextField { ...p } name="orderStepReady" label={ __( 'Ready step', 'sgs-blocks' ) } help={ __( 'Empty = the dispatched label.', 'sgs-blocks' ) } />
				<TextField { ...p } name="orderStepCollected" label={ __( 'Last step', 'sgs-blocks' ) } help={ __( 'Empty = the delivered label.', 'sgs-blocks' ) } />
			</PanelBody>
		) }
		{ attributes.orderDetailBoxes && (
			<PanelBody title={ __( 'Order page: boxes', 'sgs-blocks' ) } initialOpen={ false }>
				<TextField { ...p } name="orderDetailAddressTitle" label={ __( 'Address box title', 'sgs-blocks' ) } />
				<TextField { ...p } name="orderDetailPaymentTitle" label={ __( 'Payment box title', 'sgs-blocks' ) } />
				<TextField { ...p } name="orderDetailTotalTitle" label={ __( 'Total box title', 'sgs-blocks' ) } />
				<TextField { ...p } name="orderDetailSubtotalLabel" label={ __( 'Subtotal label', 'sgs-blocks' ) } />
				<TextField { ...p } name="orderDetailTotalLabel" label={ __( 'Total label', 'sgs-blocks' ) } />
			</PanelBody>
		) }
		{ attributes.orderDetailLook && (
			<PanelBody title={ __( 'Order page: WhatsApp card', 'sgs-blocks' ) } initialOpen={ false }>
				<Toggle { ...p } name="orderDetailWhatsApp" label={ __( 'WhatsApp card', 'sgs-blocks' ) } />
				<TextField { ...p } name="orderDetailWhatsAppNumber" label={ __( 'WhatsApp number', 'sgs-blocks' ) } help={ __( 'Digits with the country code, for example 447960597847.', 'sgs-blocks' ) } />
				<TextField { ...p } name="orderDetailWhatsAppTitle" label={ __( 'Card title', 'sgs-blocks' ) } />
				<TextField { ...p } name="orderDetailWhatsAppText" label={ __( 'Card line ({order} = order number)', 'sgs-blocks' ) } />
			</PanelBody>
		) }
		<PanelBody title={ __( 'Saved items', 'sgs-blocks' ) } initialOpen={ false }>
			<Choice
				{ ...p }
				name="wishlistLayout"
				label={ __( 'Saved items layout', 'sgs-blocks' ) }
				options={ [
					{ label: __( 'Wishlist panel default', 'sgs-blocks' ), value: '' },
					{ label: __( 'Frame cards', 'sgs-blocks' ), value: 'cards' },
				] }
			/>
			<TextField { ...p } name="wishlistCountText" label={ __( 'Count beside the heading', 'sgs-blocks' ) } help={ __( '{count} becomes the number of saved items, for example “{count} frames”. Empty = no count.', 'sgs-blocks' ) } />
			<TextField { ...p } name="wishlistCountOneText" label={ __( 'Count for one item', 'sgs-blocks' ) } help={ __( 'For example “{count} frame”. Empty = the wording above.', 'sgs-blocks' ) } />
			<TextField { ...p } name="wishlistEmptyHeading" label={ __( 'Empty card: heading', 'sgs-blocks' ) } help={ __( 'Shown while the list is empty, in the orders empty card look (Orders list panel). Leave heading, text and button empty for the wishlist panel’s own message.', 'sgs-blocks' ) } />
			<TextField { ...p } name="wishlistEmptyText" label={ __( 'Empty card: text', 'sgs-blocks' ) } />
			<TextField { ...p } name="wishlistEmptyButtonLabel" label={ __( 'Empty card: button label', 'sgs-blocks' ) } />
			<TextField { ...p } name="wishlistEmptyButtonUrl" label={ __( 'Empty card: button link', 'sgs-blocks' ) } help={ __( 'Empty = the shop page.', 'sgs-blocks' ) } />
		</PanelBody>
		</>
	);
}
