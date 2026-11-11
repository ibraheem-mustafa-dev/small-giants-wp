/**
 * Inspector panels of the Cart and Checkout look extension, grouped by what they paint.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { ResponsiveBoxControl, ResponsiveLengthControl, SgsLengthControl, ShadowControl, TierBorderControl } from '../../../components';
import { boxTiers, CardControls, ColourRow, TextControls, writeTier } from './controls';

const LENGTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
];

const LABEL_POSITIONS = [
	{ value: '', label: __( 'WooCommerce default (floating)', 'sgs-blocks' ) },
	{ value: 'above', label: __( 'Above the field', 'sgs-blocks' ) },
	{ value: 'floating', label: __( 'Floating', 'sgs-blocks' ) },
];

/**
 * Form fields: fill, border, shadow, padding, height, text, label position.
 *
 * @param {Object} props Block attributes and setter.
 * @return {JSX.Element} The panel.
 */
export function FieldsPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Form fields', 'sgs-blocks' ) } initialOpen={ false }>
			<CardControls attributes={ attributes } setAttributes={ setAttributes } prefix="sgsField" />
			<SgsLengthControl
				scale="spacing"
				label={ __( 'Minimum height', 'sgs-blocks' ) }
				value={ attributes.sgsFieldMinHeight || '' }
				units={ LENGTH_UNITS }
				onChange={ ( val ) => setAttributes( { sgsFieldMinHeight: val || undefined } ) }
				help={ __( 'Leave empty to keep the default.', 'sgs-blocks' ) }
			/>
			<SelectControl
				label={ __( 'Label position', 'sgs-blocks' ) }
				value={ attributes.sgsFieldLabelPosition || '' }
				options={ LABEL_POSITIONS }
				onChange={ ( val ) => setAttributes( { sgsFieldLabelPosition: val || undefined } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<TextControls attributes={ attributes } setAttributes={ setAttributes } prefix="sgsField" />
			<PanelBody title={ __( 'Field labels', 'sgs-blocks' ) } initialOpen={ false }>
				<TextControls attributes={ attributes } setAttributes={ setAttributes } prefix="sgsFieldLabel" />
			</PanelBody>
		</PanelBody>
	);
}

/**
 * Line items: card, picture size, header row, stepper, name and price.
 *
 * @param {Object}  props        Block attributes, setter and whether this is the cart.
 * @return {JSX.Element} The panel.
 */
export function LineItemsPanel( { attributes, setAttributes, isCart } ) {
	const shared = { attributes, setAttributes };
	return (
		<PanelBody title={ __( 'Line items', 'sgs-blocks' ) } initialOpen={ false }>
			<CardControls { ...shared } prefix="sgsItem" />
			{ isCart && <SgsLengthControl
				scale="spacing"
				label={ __( 'Space between items', 'sgs-blocks' ) }
				value={ attributes.sgsItemGap || '' }
				units={ LENGTH_UNITS }
				onChange={ ( val ) => setAttributes( { sgsItemGap: val || undefined } ) }
			/> }
			<ResponsiveLengthControl
				scale="spacing"
				label={ __( 'Picture width', 'sgs-blocks' ) }
				value={ attributes.sgsItemThumbSize }
				units={ LENGTH_UNITS }
				onChange={ ( next ) => setAttributes( { sgsItemThumbSize: next } ) }
			/>
			{ isCart && (
				<ResponsiveBoxControl
					presets
					label={ __( 'Cell padding (sets the row height)', 'sgs-blocks' ) }
					values={ boxTiers( attributes.sgsItemCellPadding ) }
					onChange={ ( tier, next ) => setAttributes( { sgsItemCellPadding: writeTier( attributes.sgsItemCellPadding, tier, next ) } ) }
				/>
			) }
			<PanelBody title={ __( 'Picture look', 'sgs-blocks' ) } initialOpen={ false }>
				<CardControls { ...shared } prefix="sgsItemImage" noShadow noPadding />
			</PanelBody>
			{ isCart && (
				<PanelBody title={ __( 'Quantity stepper', 'sgs-blocks' ) } initialOpen={ false }>
					<CardControls { ...shared } prefix="sgsItemStepper" noShadow noPadding noRadius />
					<ResponsiveLengthControl
						scale="spacing"
						label={ __( 'Width', 'sgs-blocks' ) }
						value={ attributes.sgsItemStepperWidth }
						units={ LENGTH_UNITS }
						onChange={ ( next ) => setAttributes( { sgsItemStepperWidth: next } ) }
					/>
					<SgsLengthControl
						scale="spacing"
						label={ __( 'Corner radius', 'sgs-blocks' ) }
						value={ attributes.sgsItemStepperRadius || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { sgsItemStepperRadius: val || undefined } ) }
					/>
				</PanelBody>
			) }
			{ isCart && (
				<ToggleControl
					label={ __( 'Hide the header row', 'sgs-blocks' ) }
					checked={ !! attributes.sgsItemHideHeader }
					onChange={ ( val ) => setAttributes( { sgsItemHideHeader: val || undefined } ) }
					__nextHasNoMarginBottom
				/>
			) }
			<ToggleControl
				label={ __( 'Hide the unit price under the name', 'sgs-blocks' ) }
				checked={ !! attributes.sgsItemHideUnitPrice }
				onChange={ ( val ) => setAttributes( { sgsItemHideUnitPrice: val || undefined } ) }
				__nextHasNoMarginBottom
			/>
			{ isCart && (
				<ToggleControl
					label={ __( 'Hide the lines WooCommerce draws inside each item', 'sgs-blocks' ) }
					help={ __( 'The thin rules above the picture, the name and the price.', 'sgs-blocks' ) }
					checked={ !! attributes.sgsItemHideSeparators }
					onChange={ ( val ) => setAttributes( { sgsItemHideSeparators: val || undefined } ) }
					__nextHasNoMarginBottom
				/>
			) }
			<PanelBody title={ __( 'Item name', 'sgs-blocks' ) } initialOpen={ false }>
				<TextControls { ...shared } prefix="sgsItemName" />
			</PanelBody>
			<PanelBody title={ __( 'Item price', 'sgs-blocks' ) } initialOpen={ false }>
				<TextControls { ...shared } prefix="sgsItemPrice" />
			</PanelBody>
			<PanelBody title={ __( 'Variant text', 'sgs-blocks' ) } initialOpen={ false }>
				<TextControls { ...shared } prefix="sgsItemVariant" />
			</PanelBody>
			{ isCart && (
				<PanelBody title={ __( 'Remove link', 'sgs-blocks' ) } initialOpen={ false }>
					<TextControls { ...shared } prefix="sgsItemRemove" />
				</PanelBody>
			) }
		</PanelBody>
	);
}

/**
 * Summary and totals card, its heading and the total row.
 *
 * @param {Object} props Block attributes and setter.
 * @return {JSX.Element} The panel.
 */
export function SummaryPanel( { attributes, setAttributes, isCart } ) {
	const shared = { attributes, setAttributes };
	return (
		<PanelBody title={ __( 'Summary and totals', 'sgs-blocks' ) } initialOpen={ false }>
			<CardControls { ...shared } prefix="sgsSummary" />
			{ isCart && (
				<ToggleControl
					label={ __( 'Card wraps the checkout button', 'sgs-blocks' ) }
					help={ __( 'Paints the card on the whole side column, so Proceed to checkout sits inside it.', 'sgs-blocks' ) }
					checked={ !! attributes.sgsSummaryWrapsButton }
					onChange={ ( val ) => setAttributes( { sgsSummaryWrapsButton: val || undefined } ) }
					__nextHasNoMarginBottom
				/>
			) }
			<PanelBody title={ __( 'Summary heading', 'sgs-blocks' ) } initialOpen={ false }>
				<TextControls { ...shared } prefix="sgsSummaryHeading" />
			</PanelBody>
			<PanelBody title={ __( 'Summary row labels', 'sgs-blocks' ) } initialOpen={ false }>
				<TextControls { ...shared } prefix="sgsSummaryRowLabel" />
			</PanelBody>
			<PanelBody title={ __( 'Summary row values', 'sgs-blocks' ) } initialOpen={ false }>
				<TextControls { ...shared } prefix="sgsSummaryRowValue" />
			</PanelBody>
			<TierBorderControl
				label={ __( 'Line between summary rows', 'sgs-blocks' ) }
				value={ attributes.sgsSummaryRowDivider }
				onChange={ ( next ) => setAttributes( { sgsSummaryRowDivider: next } ) }
			/>
			<PanelBody title={ __( 'Total row label', 'sgs-blocks' ) } initialOpen={ false }>
				<TextControls { ...shared } prefix="sgsTotalLabel" />
			</PanelBody>
			<PanelBody title={ __( 'Total row value', 'sgs-blocks' ) } initialOpen={ false }>
				<TextControls { ...shared } prefix="sgsTotalValue" />
			</PanelBody>
			<TierBorderControl
				label={ __( 'Line above the total row', 'sgs-blocks' ) }
				value={ attributes.sgsTotalDivider }
				onChange={ ( next ) => setAttributes( { sgsTotalDivider: next } ) }
			/>
		</PanelBody>
	);
}

/**
 * The two columns: sidebar width (wide layout only) and the gap between form and sidebar.
 *
 * @param {Object} props Block attributes and setter.
 * @return {JSX.Element} The panel.
 */
export function ColumnsPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Columns', 'sgs-blocks' ) } initialOpen={ false }>
			<ResponsiveLengthControl
				scale="spacing"
				label={ __( 'Summary column width', 'sgs-blocks' ) }
				help={ __( 'Applies while WooCommerce shows the summary beside the form; the form takes the rest. Leave empty for 360px.', 'sgs-blocks' ) }
				value={ attributes.sgsSidebarWidth }
				units={ LENGTH_UNITS }
				onChange={ ( next ) => setAttributes( { sgsSidebarWidth: next } ) }
			/>
			<ResponsiveLengthControl
				scale="spacing"
				label={ __( 'Gap between the columns', 'sgs-blocks' ) }
				value={ attributes.sgsColumnGap }
				units={ LENGTH_UNITS }
				onChange={ ( next ) => setAttributes( { sgsColumnGap: next } ) }
			/>
		</PanelBody>
	);
}

/**
 * Notice panels and the commerce note.
 *
 * @param {Object} props Block attributes and setter.
 * @return {JSX.Element} The panel.
 */
export function NoticePanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Notice panels', 'sgs-blocks' ) } initialOpen={ false }>
			<CardControls attributes={ attributes } setAttributes={ setAttributes } prefix="sgsNotice" />
		</PanelBody>
	);
}

/**
 * Checkout only: steps, option cards, the phone summary bar, terms.
 *
 * @param {Object} props Block attributes and setter.
 * @return {JSX.Element} The panels.
 */
export function CheckoutPanels( { attributes, setAttributes } ) {
	const shared = { attributes, setAttributes };
	return (
		<>
			<PanelBody title={ __( 'Checkout steps', 'sgs-blocks' ) } initialOpen={ false }>
				<CardControls { ...shared } prefix="sgsStep" />
				<PanelBody title={ __( 'Step titles', 'sgs-blocks' ) } initialOpen={ false }>
					<TextControls { ...shared } prefix="sgsStepTitle" />
				</PanelBody>
			</PanelBody>
			<PanelBody title={ __( 'Shipping and payment options', 'sgs-blocks' ) } initialOpen={ false }>
				<CardControls { ...shared } prefix="sgsOption" />
				<ColourRow { ...shared } label={ __( 'Chosen option fill', 'sgs-blocks' ) } name="sgsOptionChosenBackground" />
				<ColourRow { ...shared } label={ __( 'Chosen option border colour', 'sgs-blocks' ) } name="sgsOptionChosenBorderColour" />
				<ShadowControl
					label={ __( 'Chosen option shadow', 'sgs-blocks' ) }
					attributes={ attributes }
					setAttributes={ setAttributes }
					attrNames={ { base: 'sgsOptionChosenShadow', colour: 'sgsOptionChosenShadowColour' } }
				/>
				<TierBorderControl
					label={ __( 'Outline round a whole group of options', 'sgs-blocks' ) }
					value={ attributes.sgsOptionGroupOutline }
					onChange={ ( next ) => setAttributes( { sgsOptionGroupOutline: next } ) }
				/>
				<ResponsiveLengthControl
					scale="spacing"
					label={ __( 'Gap below each payment option', 'sgs-blocks' ) }
					value={ attributes.sgsOptionGap }
					units={ LENGTH_UNITS }
					onChange={ ( next ) => setAttributes( { sgsOptionGap: next } ) }
				/>
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Style the card fields to match the form fields', 'sgs-blocks' ) }
					help={ __( 'Stripe draws the card number, expiry and security code in its own frame; this hands it the form field settings above (border, radius, padding, text, label and focus line).', 'sgs-blocks' ) }
					checked={ true === attributes.sgsStripeMatchFields }
					onChange={ ( on ) => setAttributes( { sgsStripeMatchFields: on ? true : undefined } ) }
				/>
			</PanelBody>
			<PanelBody title={ __( 'Show order summary bar (phones)', 'sgs-blocks' ) } initialOpen={ false }>
				<CardControls { ...shared } prefix="sgsBar" />
				<ColourRow { ...shared } label={ __( 'Text colour', 'sgs-blocks' ) } name="sgsBarColour" />
			</PanelBody>
			<PanelBody title={ __( 'Terms', 'sgs-blocks' ) } initialOpen={ false }>
				<TextControls { ...shared } prefix="sgsTerms" />
			</PanelBody>
		</>
	);
}

/**
 * The primary button (Proceed to checkout on the cart, Place order on the checkout): type, height, padding.
 *
 * @param {Object} props Block attributes and setter.
 * @return {JSX.Element} The panel.
 */
export function ButtonPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Primary button', 'sgs-blocks' ) } initialOpen={ false }>
			<TextControls attributes={ attributes } setAttributes={ setAttributes } prefix="sgsButton" noColour />
			<CardControls attributes={ attributes } setAttributes={ setAttributes } prefix="sgsButton" noShadow noPadding noRadius noFill />
			<ResponsiveLengthControl
				scale="spacing"
				label={ __( 'Minimum height', 'sgs-blocks' ) }
				help={ __( 'Leave empty to keep the button preset.', 'sgs-blocks' ) }
				value={ attributes.sgsButtonMinHeight }
				units={ LENGTH_UNITS }
				onChange={ ( next ) => setAttributes( { sgsButtonMinHeight: next } ) }
			/>
			<ResponsiveBoxControl
				presets
				label={ __( 'Padding', 'sgs-blocks' ) }
				values={ boxTiers( attributes.sgsButtonPadding ) }
				onChange={ ( tier, next ) => setAttributes( { sgsButtonPadding: writeTier( attributes.sgsButtonPadding, tier, next ) } ) }
			/>
		</PanelBody>
	);
}

/**
 * The collapsed coupon panel in the order summary: its padding, the height of its code box and Apply button, and its label text.
 *
 * @param {Object} props Block attributes and setter.
 * @return {JSX.Element} The panel.
 */
export function CouponPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Coupon panel', 'sgs-blocks' ) } initialOpen={ false }>
			<ResponsiveBoxControl
				presets
				label={ __( 'Padding', 'sgs-blocks' ) }
				values={ boxTiers( attributes.sgsCouponPadding ) }
				onChange={ ( tier, next ) => setAttributes( { sgsCouponPadding: writeTier( attributes.sgsCouponPadding, tier, next ) } ) }
			/>
			<ResponsiveLengthControl
				scale="spacing"
				label={ __( 'Code box and Apply button height', 'sgs-blocks' ) }
				value={ attributes.sgsCouponControlHeight }
				units={ LENGTH_UNITS }
				onChange={ ( next ) => setAttributes( { sgsCouponControlHeight: next } ) }
			/>
			<TextControls attributes={ attributes } setAttributes={ setAttributes } prefix="sgsCouponLabel" />
		</PanelBody>
	);
}
