import { __ } from '@wordpress/i18n';
import { SelectControl } from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import {
	BOX_UNITS,
	normaliseResponsiveBox,
	ResponsiveBorderRadiusControl,
	ResponsiveOverride,
	SgsBorderControl,
	SgsBoxControl,
	SgsLengthControl,
	ShadowControl,
	TypographyControls,
} from '../../components';
import { CARD_DEVICE_ATTRS, CardDeviceShadowItems, CardLayoutItems, TierLengthItem } from './card-device-controls';

/** The image-slot ratios offered per device; empty keeps the picture at its natural shape. */
const MEDIA_RATIO_OPTIONS = [
	{ value: '', label: __( 'Natural shape', 'sgs-blocks' ) },
	{ value: '1 / 1', label: __( 'Square (1:1)', 'sgs-blocks' ) },
	{ value: '4 / 3', label: __( 'Landscape (4:3)', 'sgs-blocks' ) },
	{ value: '3 / 2', label: __( 'Landscape (3:2)', 'sgs-blocks' ) },
	{ value: '16 / 9', label: __( 'Wide (16:9)', 'sgs-blocks' ) },
	{ value: '4 / 5', label: __( 'Portrait (4:5)', 'sgs-blocks' ) },
	{ value: '3 / 4', label: __( 'Portrait (3:4)', 'sgs-blocks' ) },
	{ value: '2 / 3', label: __( 'Portrait (2:3)', 'sgs-blocks' ) },
];

const CARD_ATTRS = {
	cardBackgroundColour: '',
	cardBackgroundColourGradient: '',
	cardPadding: {},
	cardBorderRadius: {},
	cardBorderWidth: {},
	cardBorderStyle: 'solid',
	cardBorderColour: '',
	cardBorderColourGradient: '',
	cardShadow: '',
	cardShadowColour: '',
	cardMaxWidth: {},
	cardColumnGap: {},
	...CARD_DEVICE_ATTRS,
};

const hasKeys = ( value ) => !! value && 'object' === typeof value && Object.keys( value ).length > 0;

/**
 * The colour row for the card background, appended to the timeline's colour panel while the timeline is horizontal.
 *
 * @param {Object}   attributes    Block attributes.
 * @param {Function} setAttributes Attribute writer.
 * @return {Array} Rows for `SgsColourPanel`.
 */
export function cardColourRows( attributes, setAttributes ) {
	if ( 'horizontal' !== attributes.orientation ) {
		return [];
	}
	return [
		{
			key: 'cardBackground',
			label: __( 'Card background', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: attributes.cardBackgroundColour,
					onChange: ( val ) => setAttributes( { cardBackgroundColour: val ?? '' } ),
					linked: true,
					gradientValue: attributes.cardBackgroundColourGradient,
					onGradientChange: ( val ) => setAttributes( { cardBackgroundColourGradient: val ?? '' } ),
				},
			],
		},
	];
}

/**
 * One per-device box setting.
 *
 * @param {Object}   props               Props.
 * @param {string}   props.label         Control label.
 * @param {Object}   props.value         Stored tier object.
 * @param {Function} props.onChange      Receives the next tier object.
 * @return {JSX.Element} The control.
 */
function TierBox( { label, value, onChange } ) {
	return (
		<ResponsiveOverride value={ value } onChange={ onChange }>
			{ ( { ownValue, setOwnValue } ) => (
				<SgsBoxControl
					label={ label }
					values={ ownValue && 'object' === typeof ownValue ? ownValue : {} }
					units={ BOX_UNITS }
					presets
					onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
				/>
			) }
		</ResponsiveOverride>
	);
}

/**
 * The entry card of a horizontal timeline: its box (padding, border, radius, shadow, widest width) and the image slot.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute writer.
 * @return {JSX.Element|null} The panel, or null for a vertical timeline.
 */
export function EntryCardControls( { attributes, setAttributes } ) {
	if ( 'horizontal' !== attributes.orientation ) {
		return null;
	}
	const radius = attributes.cardBorderRadius || {};
	// The border-contrast check compares against a flat card colour only; a card gradient paints instead of it.
	const cardContrastAgainst =
		attributes.cardBackgroundColour && ! attributes.cardBackgroundColourGradient
			? attributes.cardBackgroundColour
			: '';
	return (
		<ToolsPanel
			label={ __( 'Entry card', 'sgs-blocks' ) }
			resetAll={ () => setAttributes( CARD_ATTRS ) }
		>
			<ToolsPanelItem
				label={ __( 'Card padding', 'sgs-blocks' ) }
				hasValue={ () => hasKeys( attributes.cardPadding ) }
				onDeselect={ () => setAttributes( { cardPadding: {} } ) }
				isShownByDefault
			>
				<TierBox
					label={ __( 'Card padding', 'sgs-blocks' ) }
					value={ attributes.cardPadding }
					onChange={ ( obj ) => setAttributes( { cardPadding: obj } ) }
				/>
			</ToolsPanelItem>
			<ToolsPanelItem
				label={ __( 'Card border and corners', 'sgs-blocks' ) }
				hasValue={ () =>
					hasKeys( attributes.cardBorderWidth ) ||
					!! attributes.cardBorderColour ||
					!! attributes.cardBorderColourGradient ||
					hasKeys( radius )
				}
				onDeselect={ () =>
					setAttributes( {
						cardBorderWidth: {},
						cardBorderStyle: 'solid',
						cardBorderColour: '',
						cardBorderColourGradient: '',
						cardBorderRadius: {},
					} )
				}
				isShownByDefault
			>
				<SgsBorderControl
					widthValues={ attributes.cardBorderWidth ?? {} }
					onWidthChange={ ( next ) => setAttributes( { cardBorderWidth: next } ) }
					widthPresets={ [ '10', '20', '30' ] }
					styleValue={ attributes.cardBorderStyle }
					onStyleChange={ ( val ) => setAttributes( { cardBorderStyle: val } ) }
					colourLabel={ __( 'Card border colour', 'sgs-blocks' ) }
					colourValue={ attributes.cardBorderColour }
					onColourChange={ ( val ) => setAttributes( { cardBorderColour: val ?? '' } ) }
					colourGradientValue={ attributes.cardBorderColourGradient }
					onColourGradientChange={ ( val ) => setAttributes( { cardBorderColourGradient: val ?? '' } ) }
					colourLinked
					contrastAgainst={ cardContrastAgainst }
					radiusLabel={ __( 'Card corner radius', 'sgs-blocks' ) }
					radiusValues={ {
						base: radius.desktop ?? {},
						tablet: radius.tablet ?? {},
						mobile: radius.mobile ?? {},
					} }
					onRadiusChange={ ( tier, next ) =>
						setAttributes( { cardBorderRadius: { ...radius, [ 'base' === tier ? 'desktop' : tier ]: next } } )
					}
				/>
			</ToolsPanelItem>
			<ToolsPanelItem
				label={ __( 'Card shadow', 'sgs-blocks' ) }
				hasValue={ () => !! attributes.cardShadow }
				onDeselect={ () => setAttributes( { cardShadow: '', cardShadowColour: '' } ) }
				isShownByDefault
			>
				<ShadowControl
					label={ __( 'Card shadow', 'sgs-blocks' ) }
					attributes={ attributes }
					setAttributes={ setAttributes }
					attrNames={ { base: 'cardShadow', colour: 'cardShadowColour' } }
				/>
			</ToolsPanelItem>
			<CardDeviceShadowItems attributes={ attributes } setAttributes={ setAttributes } />
			<CardLayoutItems attributes={ attributes } setAttributes={ setAttributes } />
			<ToolsPanelItem
				label={ __( 'Gap between text and image', 'sgs-blocks' ) }
				hasValue={ () => hasKeys( attributes.cardColumnGap ) }
				onDeselect={ () => setAttributes( { cardColumnGap: {} } ) }
			>
				<ResponsiveOverride
					label={ __( 'Gap between text and image', 'sgs-blocks' ) }
					value={ attributes.cardColumnGap }
					onChange={ ( obj ) => setAttributes( { cardColumnGap: obj } ) }
				>
					{ ( { ownValue, setOwnValue } ) => (
						<SgsLengthControl
							label={ __( 'Gap between text and image', 'sgs-blocks' ) }
							hideLabelFromVision
							value={ 'string' === typeof ownValue ? ownValue : '' }
							onChange={ ( val ) => setOwnValue( val ) }
							help={ __( 'Used with the Text beside image layout. The image column width is the Milestone image width setting.', 'sgs-blocks' ) }
						/>
					) }
				</ResponsiveOverride>
			</ToolsPanelItem>
			<ToolsPanelItem
				label={ __( 'Widest card', 'sgs-blocks' ) }
				hasValue={ () => hasKeys( attributes.cardMaxWidth ) }
				onDeselect={ () => setAttributes( { cardMaxWidth: {} } ) }
			>
				<ResponsiveOverride
					label={ __( 'Widest card', 'sgs-blocks' ) }
					value={ attributes.cardMaxWidth }
					onChange={ ( obj ) => setAttributes( { cardMaxWidth: obj } ) }
				>
					{ ( { ownValue, setOwnValue } ) => (
						<SgsLengthControl
							label={ __( 'Widest card', 'sgs-blocks' ) }
							hideLabelFromVision
							value={ 'string' === typeof ownValue ? ownValue : '' }
							onChange={ ( val ) => setOwnValue( val ) }
							help={ __( 'The most a card may grow to, for example 900px. Empty means no cap.', 'sgs-blocks' ) }
						/>
					) }
				</ResponsiveOverride>
			</ToolsPanelItem>
		</ToolsPanel>
	);
}

/**
 * The shape of the entry image slot: a per-device aspect ratio and corner radius.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute writer.
 * @return {JSX.Element} The panel.
 */
export function EntryImageShapeControls( { attributes, setAttributes } ) {
	const radius = attributes.mediaBorderRadius || {};
	return (
		<ToolsPanel
			label={ __( 'Entry image shape', 'sgs-blocks' ) }
			resetAll={ () => setAttributes( { mediaAspectRatio: {}, mediaHeight: {}, mediaBorderRadius: {} } ) }
		>
			<ToolsPanelItem
				label={ __( 'Image aspect ratio', 'sgs-blocks' ) }
				hasValue={ () => hasKeys( attributes.mediaAspectRatio ) }
				onDeselect={ () => setAttributes( { mediaAspectRatio: {} } ) }
				isShownByDefault
			>
				<ResponsiveOverride
					label={ __( 'Image aspect ratio', 'sgs-blocks' ) }
					value={ attributes.mediaAspectRatio }
					onChange={ ( obj ) => setAttributes( { mediaAspectRatio: obj } ) }
				>
					{ ( { ownValue, setOwnValue } ) => (
						<SelectControl
							label={ __( 'Image aspect ratio', 'sgs-blocks' ) }
							hideLabelFromVision
							value={ 'string' === typeof ownValue ? ownValue : '' }
							options={ MEDIA_RATIO_OPTIONS }
							onChange={ ( val ) => setOwnValue( val ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</ResponsiveOverride>
			</ToolsPanelItem>
			<TierLengthItem
				name="mediaHeight"
				label={ __( 'Image height', 'sgs-blocks' ) }
				help={ __( 'A fixed height for the picture band, for example 190px; the picture fills and crops to it and the aspect ratio is ignored where a height is set. Empty keeps the aspect ratio.', 'sgs-blocks' ) }
				attributes={ attributes }
				setAttributes={ setAttributes }
			/>
			<ToolsPanelItem
				label={ __( 'Image corner radius', 'sgs-blocks' ) }
				hasValue={ () => hasKeys( radius ) }
				onDeselect={ () => setAttributes( { mediaBorderRadius: {} } ) }
				isShownByDefault
			>
				<ResponsiveBorderRadiusControl
					label={ __( 'Image corner radius', 'sgs-blocks' ) }
					values={ {
						base: radius.desktop ?? {},
						tablet: radius.tablet ?? {},
						mobile: radius.mobile ?? {},
					} }
					onChange={ ( tier, next ) =>
						setAttributes( { mediaBorderRadius: { ...radius, [ 'base' === tier ? 'desktop' : tier ]: next } } )
					}
				/>
			</ToolsPanelItem>
		</ToolsPanel>
	);
}

/**
 * The entry date typography: the shared TypographyControls on the `date` prefix.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute writer.
 * @return {JSX.Element} The controls.
 */
export function EntryDateTypography( { attributes, setAttributes } ) {
	return (
		<TypographyControls
			fontSizePresets
			showFontFamily
			showLetterSpacing
			showTextStroke
			attributes={ attributes }
			setAttributes={ setAttributes }
			prefix="date"
		/>
	);
}

/**
 * The entry description typography: the shared TypographyControls on the `descriptionText` prefix.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute writer.
 * @return {JSX.Element} The controls.
 */
export function EntryDescriptionTypography( { attributes, setAttributes } ) {
	return (
		<TypographyControls
			fontSizePresets
			showFontFamily
			attributes={ attributes }
			setAttributes={ setAttributes }
			prefix="descriptionText"
		/>
	);
}
