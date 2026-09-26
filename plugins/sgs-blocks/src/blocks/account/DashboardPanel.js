/**
 * sgs/account — "Dashboard" inspector panel.
 *
 * Greeting, latest-order card text, the 4-step progress labels, quick-card
 * visibility + per-endpoint descriptions, and the no-orders empty state.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';

const DEFAULT_CARD_DESCRIPTIONS = {
	orders: __( 'See and reorder past orders', 'sgs-blocks' ),
	'saved-items': __( 'Your saved products', 'sgs-blocks' ),
	'edit-address': __( 'Delivery and billing', 'sgs-blocks' ),
	'edit-account': __( 'Name, email and password', 'sgs-blocks' ),
	downloads: __( 'Your downloads', 'sgs-blocks' ),
	'payment-methods': __( 'Saved cards', 'sgs-blocks' ),
};

const CARD_LABELS = {
	orders: __( 'Orders card description', 'sgs-blocks' ),
	'saved-items': __( 'Saved items card description', 'sgs-blocks' ),
	'edit-address': __( 'Addresses card description', 'sgs-blocks' ),
	'edit-account': __( 'Account details card description', 'sgs-blocks' ),
	downloads: __( 'Downloads card description', 'sgs-blocks' ),
	'payment-methods': __( 'Payment methods card description', 'sgs-blocks' ),
};

const DEFAULT_STEP_LABELS = {
	placed: __( 'Placed', 'sgs-blocks' ),
	processing: __( 'Processing', 'sgs-blocks' ),
	dispatched: __( 'Dispatched', 'sgs-blocks' ),
	delivered: __( 'Delivered', 'sgs-blocks' ),
};

/**
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @return {JSX.Element} Panel.
 */
export default function DashboardPanel( { attributes, setAttributes } ) {
	const {
		greeting,
		showLatestOrder,
		latestOrderHeading,
		viewOrderLabel,
		parcelTrackingLabel,
		noOrdersText,
		shopLinkLabel,
		statusStepLabels,
		showQuickCards,
		cardDescriptions,
	} = attributes;

	const steps = { ...DEFAULT_STEP_LABELS, ...( statusStepLabels || {} ) };
	const cards = { ...DEFAULT_CARD_DESCRIPTIONS, ...( cardDescriptions || {} ) };

	return (
		<PanelBody title={ __( 'Dashboard', 'sgs-blocks' ) } initialOpen={ false }>
			<TextControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Greeting ({name} = the shopper\'s name)', 'sgs-blocks' ) }
				value={ greeting }
				onChange={ ( value ) => setAttributes( { greeting: value } ) }
			/>

			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Show latest order card', 'sgs-blocks' ) }
				checked={ false !== showLatestOrder }
				onChange={ ( value ) => setAttributes( { showLatestOrder: value } ) }
			/>

			{ false !== showLatestOrder && (
				<>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Latest order heading', 'sgs-blocks' ) }
						value={ latestOrderHeading }
						onChange={ ( value ) => setAttributes( { latestOrderHeading: value } ) }
					/>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'View order label', 'sgs-blocks' ) }
						value={ viewOrderLabel }
						onChange={ ( value ) => setAttributes( { viewOrderLabel: value } ) }
					/>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Track parcel label', 'sgs-blocks' ) }
						value={ parcelTrackingLabel }
						onChange={ ( value ) => setAttributes( { parcelTrackingLabel: value } ) }
					/>
					{ Object.keys( DEFAULT_STEP_LABELS ).map( ( key ) => (
						<TextControl
							key={ key }
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ DEFAULT_STEP_LABELS[ key ] + ' ' + __( 'step label', 'sgs-blocks' ) }
							value={ steps[ key ] }
							onChange={ ( value ) =>
								setAttributes( { statusStepLabels: { ...steps, [ key ]: value } } )
							}
						/>
					) ) }
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'No-orders text', 'sgs-blocks' ) }
						value={ noOrdersText }
						onChange={ ( value ) => setAttributes( { noOrdersText: value } ) }
					/>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Shop link label', 'sgs-blocks' ) }
						value={ shopLinkLabel }
						onChange={ ( value ) => setAttributes( { shopLinkLabel: value } ) }
					/>
				</>
			) }

			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Show quick-link cards', 'sgs-blocks' ) }
				checked={ false !== showQuickCards }
				onChange={ ( value ) => setAttributes( { showQuickCards: value } ) }
			/>

			{ false !== showQuickCards &&
				Object.keys( DEFAULT_CARD_DESCRIPTIONS ).map( ( key ) => (
					<TextControl
						key={ key }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ CARD_LABELS[ key ] }
						value={ cards[ key ] }
						onChange={ ( value ) =>
							setAttributes( { cardDescriptions: { ...cards, [ key ]: value } } )
						}
					/>
				) ) }
		</PanelBody>
	);
}
