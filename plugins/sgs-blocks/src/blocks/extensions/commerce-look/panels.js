/**
 * Inspector panels of the Cart and Checkout look extension, grouped by what they paint.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { SgsLengthControl } from '../../../components';
import { CardControls, ColourRow, TextControls } from './controls';

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
			<SgsLengthControl
				scale="spacing"
				label={ __( 'Picture width', 'sgs-blocks' ) }
				value={ attributes.sgsItemThumbSize || '' }
				units={ LENGTH_UNITS }
				onChange={ ( val ) => setAttributes( { sgsItemThumbSize: val || undefined } ) }
			/>
			{ isCart && <SgsLengthControl
				scale="spacing"
				label={ __( 'Quantity stepper corner radius', 'sgs-blocks' ) }
				value={ attributes.sgsItemStepperRadius || '' }
				units={ LENGTH_UNITS }
				onChange={ ( val ) => setAttributes( { sgsItemStepperRadius: val || undefined } ) }
			/> }
			{ isCart && (
				<ToggleControl
					label={ __( 'Hide the header row', 'sgs-blocks' ) }
					checked={ !! attributes.sgsItemHideHeader }
					onChange={ ( val ) => setAttributes( { sgsItemHideHeader: val || undefined } ) }
					__nextHasNoMarginBottom
				/>
			) }
			<PanelBody title={ __( 'Item name', 'sgs-blocks' ) } initialOpen={ false }>
				<TextControls { ...shared } prefix="sgsItemName" />
			</PanelBody>
			<PanelBody title={ __( 'Item price', 'sgs-blocks' ) } initialOpen={ false }>
				<TextControls { ...shared } prefix="sgsItemPrice" />
			</PanelBody>
		</PanelBody>
	);
}

/**
 * Summary and totals card, its heading and the total row.
 *
 * @param {Object} props Block attributes and setter.
 * @return {JSX.Element} The panel.
 */
export function SummaryPanel( { attributes, setAttributes } ) {
	const shared = { attributes, setAttributes };
	return (
		<PanelBody title={ __( 'Summary and totals', 'sgs-blocks' ) } initialOpen={ false }>
			<CardControls { ...shared } prefix="sgsSummary" />
			<PanelBody title={ __( 'Summary heading', 'sgs-blocks' ) } initialOpen={ false }>
				<TextControls { ...shared } prefix="sgsSummaryHeading" />
			</PanelBody>
			<PanelBody title={ __( 'Total row', 'sgs-blocks' ) } initialOpen={ false }>
				<TextControls { ...shared } prefix="sgsTotalRow" />
			</PanelBody>
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
