/**
 * Panels for the account block's order page, the orders list summary and the Saved items tab: each a small panel of its own.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, TextControl } from '@wordpress/components';
import {
	FlexWrapControl,
	IconPicker,
	LinkPopoverField,
} from '../../components';
import { LINK_SOURCES_NO_TOP } from '../../shared/link-source-options';
import { Choice, TextField, Toggle } from './extraControls';

// [ WooCommerce status slug without the wc- prefix, editor label ]
const ORDER_STATUSES = [
	[ 'pending', __( 'Pending payment', 'sgs-blocks' ) ],
	[ 'processing', __( 'Processing', 'sgs-blocks' ) ],
	[ 'on-hold', __( 'On hold', 'sgs-blocks' ) ],
	[ 'completed', __( 'Completed', 'sgs-blocks' ) ],
	[ 'delivered', __( 'Completed, after the delivery wait', 'sgs-blocks' ) ],
	[ 'cancelled', __( 'Cancelled', 'sgs-blocks' ) ],
	[ 'refunded', __( 'Refunded', 'sgs-blocks' ) ],
	[ 'failed', __( 'Failed', 'sgs-blocks' ) ],
];

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
			<PanelBody
				title={ __( 'Order status wording', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<p>
					{ __(
						'The status pill in the orders list, on the order page and on the dashboard. Empty keeps WooCommerce’s own name.',
						'sgs-blocks'
					) }
				</p>
				{ ORDER_STATUSES.map( ( [ slug, label ] ) => (
					<TextControl
						key={ slug }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ label }
						value={ attributes.orderStatusLabels?.[ slug ] ?? '' }
						onChange={ ( value ) => {
							const next = {
								...( attributes.orderStatusLabels || {} ),
							};
							if ( value ) {
								next[ slug ] = value;
							} else {
								delete next[ slug ];
							}
							setAttributes( { orderStatusLabels: next } );
						} }
					/>
				) ) }
			</PanelBody>
			<PanelBody
				title={ __( 'Orders list: items summary', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<Toggle
					{ ...p }
					name="ordersSummary"
					label={ __(
						'Items summary in the orders list',
						'sgs-blocks'
					) }
					help={ __(
						'A column naming the order’s products.',
						'sgs-blocks'
					) }
				/>
				<Toggle
					{ ...p }
					name="ordersRowList"
					label={ __( 'Orders as link rows', 'sgs-blocks' ) }
					help={ __(
						'Each order is one row that links to the order: number and date, items, status, total and a chevron. Replaces WooCommerce’s table; its pagination stays.',
						'sgs-blocks'
					) }
				/>
				<TextField
					{ ...p }
					name="ordersNumberPrefix"
					label={ __( 'Order number prefix', 'sgs-blocks' ) }
					help={ __(
						'Printed before the order number in the list and on the order page.',
						'sgs-blocks'
					) }
				/>
				<TextField
					{ ...p }
					name="ordersDateFormat"
					label={ __( 'Date format', 'sgs-blocks' ) }
					help={ __(
						'A PHP date format such as j F Y. Empty = the site’s format.',
						'sgs-blocks'
					) }
				/>
				{ attributes.ordersRowList && (
					<>
						<Toggle
							{ ...p }
							name="ordersRowThumbs"
							label={ __(
								'Product thumbnails in each row',
								'sgs-blocks'
							) }
							help={ __(
								'The same thumbnails the latest-order card shows, above the items line.',
								'sgs-blocks'
							) }
						/>
						{ attributes.ordersRowThumbs && (
							<FlexWrapControl
								label={ __(
									'Wrap row thumbnails',
									'sgs-blocks'
								) }
								value={ attributes.ordersRowThumbsFlexWrap }
								onChange={ ( value ) =>
									setAttributes( {
										ordersRowThumbsFlexWrap: value,
									} )
								}
							/>
						) }
						<Toggle
							{ ...p }
							name="ordersRowItemCount"
							label={ __(
								'Item count beside the date',
								'sgs-blocks'
							) }
							help={ __(
								'For example “3 items”. Wording below; {count} is the number.',
								'sgs-blocks'
							) }
						/>
						{ attributes.ordersRowItemCount && (
							<>
								<TextField
									{ ...p }
									name="ordersRowItemCountOne"
									label={ __(
										'Item count wording: one item',
										'sgs-blocks'
									) }
									help={ __(
										'Empty uses “1 item”.',
										'sgs-blocks'
									) }
								/>
								<TextField
									{ ...p }
									name="ordersRowItemCountMany"
									label={ __(
										'Item count wording: several items',
										'sgs-blocks'
									) }
									help={ __(
										'Empty uses “3 items”.',
										'sgs-blocks'
									) }
								/>
							</>
						) }
						<TextField
							{ ...p }
							name="ordersRowViewLabel"
							label={ __( 'Row end label', 'sgs-blocks' ) }
							help={ __(
								'Text at the end of each row in place of the chevron, for example View order. Empty keeps the chevron.',
								'sgs-blocks'
							) }
						/>
						{ attributes.ordersRowViewLabel && (
							<IconPicker
								label={ __(
									'Row end label icon',
									'sgs-blocks'
								) }
								sources={ [ 'lucide' ] }
								value={
									attributes.ordersRowViewIcon
										? {
												source: 'lucide',
												name: attributes.ordersRowViewIcon,
										  }
										: null
								}
								onChange={ ( val ) =>
									setAttributes( {
										ordersRowViewIcon: val ? val.name : '',
									} )
								}
							/>
						) }
					</>
				) }
				<Toggle
					{ ...p }
					name="ordersTrimZeros"
					label={ __( 'Whole pounds without pence', 'sgs-blocks' ) }
					help={ __(
						'Prints £248 instead of £248.00 in the list and on the order page.',
						'sgs-blocks'
					) }
				/>
			</PanelBody>
			<PanelBody
				title={ __( 'Order page', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<Toggle
					{ ...p }
					name="giftNote"
					label={ __( 'Gift note on the order page', 'sgs-blocks' ) }
					help={ __(
						'For an order placed as a gift, prints the recipient and the message after the order table. Shown only to someone allowed to view the order.',
						'sgs-blocks'
					) }
				/>
				{ attributes.giftNote && (
					<TextField
						{ ...p }
						name="giftNoteHeading"
						label={ __( 'Gift note heading', 'sgs-blocks' ) }
						help={ __( 'Empty uses “Gift note”.', 'sgs-blocks' ) }
					/>
				) }
				<Toggle
					{ ...p }
					name="orderDetailLook"
					label={ __( 'Order detail page', 'sgs-blocks' ) }
					help={ __(
						'Replaces WooCommerce’s order page with the parts in the panels below. Off = WooCommerce’s own page.',
						'sgs-blocks'
					) }
				/>
				{ attributes.orderDetailLook && (
					<>
						<TextField
							{ ...p }
							name="orderDetailBackLabel"
							label={ __( 'Back link label', 'sgs-blocks' ) }
						/>
						<TextField
							{ ...p }
							name="orderDetailTitle"
							label={ __(
								'Heading ({order} = order number)',
								'sgs-blocks'
							) }
						/>
						<TextField
							{ ...p }
							name="orderDetailPlacedText"
							label={ __(
								'Line under the heading ({date}, {method})',
								'sgs-blocks'
							) }
						/>
						<Toggle
							{ ...p }
							name="orderDetailItems"
							label={ __( 'Item rows', 'sgs-blocks' ) }
						/>
						<TextField
							{ ...p }
							name="orderDetailItemsHeading"
							label={ __(
								'Heading above the item rows',
								'sgs-blocks'
							) }
							help={ __( 'Empty prints none.', 'sgs-blocks' ) }
						/>
						<Toggle
							{ ...p }
							name="orderDetailItemQtyFirst"
							label={ __(
								'Quantity before each name',
								'sgs-blocks'
							) }
							help={ __(
								'Prints 2 × Taster Trio.',
								'sgs-blocks'
							) }
						/>
						<Toggle
							{ ...p }
							name="orderDetailBoxes"
							label={ __(
								'Address, payment and total boxes',
								'sgs-blocks'
							) }
						/>
					</>
				) }
			</PanelBody>
			{ attributes.orderDetailLook && (
				<PanelBody
					title={ __( 'Order page: help link', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextField
						{ ...p }
						name="orderDetailHelpText"
						label={ __(
							'Help line before the link',
							'sgs-blocks'
						) }
						help={ __(
							'For example “Something not right?”. Empty prints the link alone.',
							'sgs-blocks'
						) }
					/>
					<TextField
						{ ...p }
						name="orderDetailHelpLabel"
						label={ __( 'Help link label', 'sgs-blocks' ) }
						help={ __(
							'A link under the order page, for example “Message us”. Empty prints nothing.',
							'sgs-blocks'
						) }
					/>
					<LinkPopoverField
						label={ __( 'Help link destination', 'sgs-blocks' ) }
						help={ __(
							'A page, a Site Info value such as WhatsApp, or a typed address. Nothing prints while it is empty.',
							'sgs-blocks'
						) }
						value={ {
							url: attributes.orderDetailHelpUrl,
							linkSource:
								attributes.orderDetailHelpUrlSource || '',
						} }
						linkSources={ LINK_SOURCES_NO_TOP }
						onChange={ ( next ) => {
							const patch = {};
							if ( undefined !== next.url ) {
								patch.orderDetailHelpUrl = next.url;
							}
							if ( undefined !== next.linkSource ) {
								patch.orderDetailHelpUrlSource =
									next.linkSource;
							}
							setAttributes( patch );
						} }
					/>
				</PanelBody>
			) }
			{ attributes.orderDetailLook && (
				<PanelBody
					title={ __( 'Order page: order again', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<Toggle
						{ ...p }
						name="orderDetailOrderAgain"
						label={ __( 'Order again button', 'sgs-blocks' ) }
						help={ __(
							'Under the totals; WooCommerce decides which orders can be re-ordered (completed by default).',
							'sgs-blocks'
						) }
					/>
					{ attributes.orderDetailOrderAgain && (
						<TextField
							{ ...p }
							name="orderDetailOrderAgainLabel"
							label={ __(
								'Order again button label',
								'sgs-blocks'
							) }
							help={ __(
								'Empty uses “Order again”.',
								'sgs-blocks'
							) }
						/>
					) }
					{ attributes.orderDetailOrderAgain && (
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __(
								'Orders that can be ordered again',
								'sgs-blocks'
							) }
							help={ __(
								'Completed orders only (WooCommerce’s default), or a processing order too.',
								'sgs-blocks'
							) }
							value={
								attributes.orderDetailOrderAgainWhen ||
								'completed'
							}
							options={ [
								{
									value: 'completed',
									label: __(
										'Completed orders',
										'sgs-blocks'
									),
								},
								{
									value: 'paid',
									label: __(
										'Completed and processing orders',
										'sgs-blocks'
									),
								},
							] }
							onChange={ ( value ) =>
								setAttributes( {
									orderDetailOrderAgainWhen: value,
								} )
							}
						/>
					) }
				</PanelBody>
			) }
			{ attributes.orderDetailLook && (
				<PanelBody
					title={ __( 'Order page: progress line', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<Toggle
						{ ...p }
						name="orderDetailProgress"
						label={ __( 'Progress line', 'sgs-blocks' ) }
					/>
					<TextField
						{ ...p }
						name="orderDetailProgressLabel"
						label={ __( 'Screen-reader label', 'sgs-blocks' ) }
					/>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __(
							'A completed order stands on',
							'sgs-blocks'
						) }
						help={ __(
							'WooCommerce has no “delivered” status. Choose the dispatched step if orders are marked completed when they are posted.',
							'sgs-blocks'
						) }
						value={ attributes.orderCompletedStep || 'delivered' }
						options={ [
							{
								value: 'delivered',
								label: __( 'The delivered step', 'sgs-blocks' ),
							},
							{
								value: 'dispatched',
								label: __(
									'The dispatched step',
									'sgs-blocks'
								),
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { orderCompletedStep: value } )
						}
					/>
					{ 'dispatched' === attributes.orderCompletedStep && (
						<TextControl
							type="number"
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __(
								'Days after posting until the last step',
								'sgs-blocks'
							) }
							help={ __(
								'0 = never. A completed order moves to the last step, by itself, this many whole days after it was completed.',
								'sgs-blocks'
							) }
							min={ 0 }
							value={ attributes.orderDeliveredAfterDays || 0 }
							onChange={ ( value ) =>
								setAttributes( {
									orderDeliveredAfterDays: Math.max(
										0,
										parseInt( value, 10 ) || 0
									),
								} )
							}
						/>
					) }
					<TextField
						{ ...p }
						name="orderStepPlaced"
						label={ __( 'Step: placed', 'sgs-blocks' ) }
					/>
					<TextField
						{ ...p }
						name="orderStepProcessing"
						label={ __( 'Step: processing', 'sgs-blocks' ) }
						help={ __(
							'Empty = the step is left out.',
							'sgs-blocks'
						) }
					/>
					<TextField
						{ ...p }
						name="orderStepDispatched"
						label={ __(
							'Step: dispatched / posted',
							'sgs-blocks'
						) }
					/>
					<TextField
						{ ...p }
						name="orderStepDelivered"
						label={ __( 'Step: delivered', 'sgs-blocks' ) }
					/>
					<TextField
						{ ...p }
						name="orderStepPlacedNote"
						label={ __(
							'Placed: line under the step',
							'sgs-blocks'
						) }
						help={ __(
							'Empty prints nothing. {date} is the date the order was placed.',
							'sgs-blocks'
						) }
					/>
					<TextField
						{ ...p }
						name="orderStepProcessingNote"
						label={ __(
							'Processing: line under the step',
							'sgs-blocks'
						) }
					/>
					<TextField
						{ ...p }
						name="orderStepDispatchedNote"
						label={ __(
							'Dispatched: line under the step',
							'sgs-blocks'
						) }
					/>
					<TextField
						{ ...p }
						name="orderStepDeliveredNote"
						label={ __(
							'Delivered: line under the step',
							'sgs-blocks'
						) }
					/>
				</PanelBody>
			) }
			{ attributes.orderDetailLook && (
				<PanelBody
					title={ __( 'Order page: pickup orders', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextField
						{ ...p }
						name="orderStepReady"
						label={ __( 'Ready step', 'sgs-blocks' ) }
						help={ __(
							'Empty = the dispatched label.',
							'sgs-blocks'
						) }
					/>
					<TextField
						{ ...p }
						name="orderStepCollected"
						label={ __( 'Last step', 'sgs-blocks' ) }
						help={ __(
							'Empty = the delivered label.',
							'sgs-blocks'
						) }
					/>
				</PanelBody>
			) }
			{ attributes.orderDetailBoxes && (
				<PanelBody
					title={ __( 'Order page: boxes', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextField
						{ ...p }
						name="orderDetailAddressTitle"
						label={ __( 'Address box title', 'sgs-blocks' ) }
					/>
					<TextField
						{ ...p }
						name="orderDetailPaymentTitle"
						label={ __( 'Payment box title', 'sgs-blocks' ) }
					/>
					<TextField
						{ ...p }
						name="orderDetailTotalTitle"
						label={ __( 'Total box title', 'sgs-blocks' ) }
					/>
					<TextField
						{ ...p }
						name="orderDetailSubtotalLabel"
						label={ __( 'Subtotal label', 'sgs-blocks' ) }
					/>
					<TextField
						{ ...p }
						name="orderDetailShippingLabel"
						label={ __( 'Shipping row label', 'sgs-blocks' ) }
						help={ __(
							'Empty = the shipping method’s name.',
							'sgs-blocks'
						) }
					/>
					<TextField
						{ ...p }
						name="orderDetailShippingFreeText"
						label={ __(
							'Shipping row text when free',
							'sgs-blocks'
						) }
						help={ __( 'Empty = the amount.', 'sgs-blocks' ) }
					/>
					<TextField
						{ ...p }
						name="orderDetailTotalLabel"
						label={ __( 'Total label', 'sgs-blocks' ) }
					/>
				</PanelBody>
			) }
			{ attributes.orderDetailLook && (
				<PanelBody
					title={ __( 'Order page: WhatsApp card', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<Toggle
						{ ...p }
						name="orderDetailWhatsApp"
						label={ __( 'WhatsApp card', 'sgs-blocks' ) }
					/>
					<TextField
						{ ...p }
						name="orderDetailWhatsAppNumber"
						label={ __( 'WhatsApp number', 'sgs-blocks' ) }
						help={ __(
							'Digits with the country code, for example 447960597847.',
							'sgs-blocks'
						) }
					/>
					<TextField
						{ ...p }
						name="orderDetailWhatsAppTitle"
						label={ __( 'Card title', 'sgs-blocks' ) }
					/>
					<TextField
						{ ...p }
						name="orderDetailWhatsAppText"
						label={ __(
							'Card line ({order} = order number)',
							'sgs-blocks'
						) }
					/>
				</PanelBody>
			) }
			<PanelBody
				title={ __( 'Saved items', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<Choice
					{ ...p }
					name="wishlistLayout"
					label={ __( 'Saved items layout', 'sgs-blocks' ) }
					options={ [
						{
							label: __( 'Wishlist panel default', 'sgs-blocks' ),
							value: '',
						},
						{
							label: __( 'Frame cards', 'sgs-blocks' ),
							value: 'cards',
						},
						{
							label: __( 'Site product cards', 'sgs-blocks' ),
							value: 'product-cards',
						},
					] }
				/>
				<TextField
					{ ...p }
					name="wishlistCountText"
					label={ __( 'Count beside the heading', 'sgs-blocks' ) }
					help={ __(
						'{count} becomes the number of saved items, for example “{count} frames”. Empty = no count.',
						'sgs-blocks'
					) }
				/>
				<TextField
					{ ...p }
					name="wishlistCountOneText"
					label={ __( 'Count for one item', 'sgs-blocks' ) }
					help={ __(
						'For example “{count} frame”. Empty = the wording above.',
						'sgs-blocks'
					) }
				/>
				<TextField
					{ ...p }
					name="wishlistEmptyHeading"
					label={ __( 'Empty card: heading', 'sgs-blocks' ) }
					help={ __(
						'Shown while the list is empty, in the orders empty card look (Orders list panel). Leave heading, text and button empty for the wishlist panel’s own message.',
						'sgs-blocks'
					) }
				/>
				<TextField
					{ ...p }
					name="wishlistEmptyText"
					label={ __( 'Empty card: text', 'sgs-blocks' ) }
				/>
				<TextField
					{ ...p }
					name="wishlistEmptyButtonLabel"
					label={ __( 'Empty card: button label', 'sgs-blocks' ) }
				/>
				<TextField
					{ ...p }
					name="wishlistEmptyButtonUrl"
					label={ __( 'Empty card: button link', 'sgs-blocks' ) }
					help={ __( 'Empty = the shop page.', 'sgs-blocks' ) }
				/>
			</PanelBody>
		</>
	);
}
