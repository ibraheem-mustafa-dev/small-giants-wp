import { __ } from '@wordpress/i18n';
import { SelectControl, ToggleControl } from '@wordpress/components';
import { ToolsPanelItem } from '../../components/primitives';
import { ResponsiveOverride, SgsLengthControl, ShadowControl } from '../../components';

/** The card layouts offered per device. */
const CARD_LAYOUT_OPTIONS = [
	{ value: '', label: __( 'Text beside image (default)', 'sgs-blocks' ) },
	{ value: 'side', label: __( 'Text beside image', 'sgs-blocks' ) },
	{ value: 'stacked', label: __( 'Image on top, text below', 'sgs-blocks' ) },
];

/** The entry alignments offered per device. */
const CARD_ALIGN_OPTIONS = [
	{ value: '', label: __( 'Centred (default)', 'sgs-blocks' ) },
	{ value: 'center', label: __( 'Centred', 'sgs-blocks' ) },
	{ value: 'start', label: __( 'Start (left)', 'sgs-blocks' ) },
];

/** Attributes the device card controls own; the Entry card panel resets them with its own. */
export const CARD_DEVICE_ATTRS = {
	cardLayout: {},
	cardGap: {},
	cardRowGap: {},
	cardAlign: {},
	cardsShareRow: false,
	cardShadowTablet: '',
	cardShadowTabletColour: '',
	cardShadowMobile: '',
	cardShadowMobileColour: '',
};

const hasKeys = ( value ) => !! value && 'object' === typeof value && Object.keys( value ).length > 0;

/**
 * A per-device length setting stored as a tier object of CSS lengths.
 *
 * @param {Object}   props               Props.
 * @param {string}   props.label         Control and item label.
 * @param {string}   props.help          Help text.
 * @param {string}   props.name          Attribute name.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute writer.
 * @return {JSX.Element} The panel item.
 */
export function TierLengthItem( { label, help, name, attributes, setAttributes } ) {
	return (
		<ToolsPanelItem
			label={ label }
			hasValue={ () => hasKeys( attributes[ name ] ) }
			onDeselect={ () => setAttributes( { [ name ]: {} } ) }
		>
			<ResponsiveOverride
				label={ label }
				value={ attributes[ name ] }
				onChange={ ( obj ) => setAttributes( { [ name ]: obj } ) }
			>
				{ ( { ownValue, setOwnValue } ) => (
					<SgsLengthControl
						label={ label }
						hideLabelFromVision
						value={ 'string' === typeof ownValue || 'number' === typeof ownValue ? String( ownValue ) : '' }
						onChange={ ( val ) => setOwnValue( val ) }
						help={ help }
					/>
				) }
			</ResponsiveOverride>
		</ToolsPanelItem>
	);
}

/**
 * The card layout (text beside the image, or image on top) per device, the entry alignment per device, and the space
 * between cards and between rows per device.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute writer.
 * @return {JSX.Element} The panel items.
 */
export function CardLayoutItems( { attributes, setAttributes } ) {
	return (
		<>
			<ToolsPanelItem
				label={ __( 'Card layout', 'sgs-blocks' ) }
				hasValue={ () => hasKeys( attributes.cardLayout ) }
				onDeselect={ () => setAttributes( { cardLayout: {} } ) }
			>
				<ResponsiveOverride
					label={ __( 'Card layout', 'sgs-blocks' ) }
					value={ attributes.cardLayout }
					onChange={ ( obj ) => setAttributes( { cardLayout: obj } ) }
				>
					{ ( { ownValue, setOwnValue } ) => (
						<SelectControl
							label={ __( 'Card layout', 'sgs-blocks' ) }
							hideLabelFromVision
							value={ 'string' === typeof ownValue ? ownValue : '' }
							options={ CARD_LAYOUT_OPTIONS }
							onChange={ ( val ) => setOwnValue( val ) }
							help={ __( 'Used with the Text beside image content layout. Image on top puts the picture first, then the date and the text.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</ResponsiveOverride>
			</ToolsPanelItem>
			{ 'horizontal' === attributes.orientation && (
				<ToolsPanelItem
					label={ __( 'Entries share the row equally', 'sgs-blocks' ) }
					hasValue={ () => !! attributes.cardsShareRow }
					onDeselect={ () => setAttributes( { cardsShareRow: false } ) }
					isShownByDefault
				>
					<ToggleControl
						label={ __( 'Entries share the row equally', 'sgs-blocks' ) }
						checked={ !! attributes.cardsShareRow }
						onChange={ ( val ) => setAttributes( { cardsShareRow: val } ) }
						help={ __(
							'768px and up: every entry takes an equal column of the row, so any number of entries fits without scrolling sideways. Off keeps the card width set under Layout. Not used while the scroll effect is pinned horizontal.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</ToolsPanelItem>
			) }
			<ToolsPanelItem
				label={ __( 'Entry alignment', 'sgs-blocks' ) }
				hasValue={ () => hasKeys( attributes.cardAlign ) }
				onDeselect={ () => setAttributes( { cardAlign: {} } ) }
			>
				<ResponsiveOverride
					label={ __( 'Entry alignment', 'sgs-blocks' ) }
					value={ attributes.cardAlign }
					onChange={ ( obj ) => setAttributes( { cardAlign: obj } ) }
				>
					{ ( { ownValue, setOwnValue } ) => (
						<SelectControl
							label={ __( 'Entry alignment', 'sgs-blocks' ) }
							hideLabelFromVision
							value={ 'string' === typeof ownValue ? ownValue : '' }
							options={ CARD_ALIGN_OPTIONS }
							onChange={ ( val ) => setOwnValue( val ) }
							help={ __( 'Start left-aligns the date, title and description and puts the date at the start of the entry. Not used by the Text beside image layout.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</ResponsiveOverride>
			</ToolsPanelItem>
			<TierLengthItem
				name="cardGap"
				label={ __( 'Space between cards', 'sgs-blocks' ) }
				help={ __( 'The gap between neighbouring cards for each device. Empty keeps no gap on the pinned row and the theme spacing on swipeable cards.', 'sgs-blocks' ) }
				attributes={ attributes }
				setAttributes={ setAttributes }
			/>
			<TierLengthItem
				name="cardRowGap"
				label={ __( 'Space between card rows', 'sgs-blocks' ) }
				help={ __( 'The gap between rows of cards for each device. It shows where the cards stack, at 767px and below. Empty keeps no row gap.', 'sgs-blocks' ) }
				attributes={ attributes }
				setAttributes={ setAttributes }
			/>
		</>
	);
}

/**
 * The card shadow for tablet and for mobile.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute writer.
 * @return {JSX.Element} The panel items.
 */
export function CardDeviceShadowItems( { attributes, setAttributes } ) {
	return (
		<>
			<ToolsPanelItem
				label={ __( 'Card shadow on tablet', 'sgs-blocks' ) }
				hasValue={ () => !! attributes.cardShadowTablet }
				onDeselect={ () => setAttributes( { cardShadowTablet: '', cardShadowTabletColour: '' } ) }
			>
				<ShadowControl
					label={ __( 'Card shadow on tablet', 'sgs-blocks' ) }
					attributes={ attributes }
					setAttributes={ setAttributes }
					attrNames={ { base: 'cardShadowTablet', colour: 'cardShadowTabletColour' } }
				/>
			</ToolsPanelItem>
			<ToolsPanelItem
				label={ __( 'Card shadow on mobile', 'sgs-blocks' ) }
				hasValue={ () => !! attributes.cardShadowMobile }
				onDeselect={ () => setAttributes( { cardShadowMobile: '', cardShadowMobileColour: '' } ) }
			>
				<ShadowControl
					label={ __( 'Card shadow on mobile', 'sgs-blocks' ) }
					attributes={ attributes }
					setAttributes={ setAttributes }
					attrNames={ { base: 'cardShadowMobile', colour: 'cardShadowMobileColour' } }
				/>
			</ToolsPanelItem>
		</>
	);
}
