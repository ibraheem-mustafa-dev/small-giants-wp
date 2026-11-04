/**
 * Shared inspector rows for the Cart and Checkout look extension: a colour, a card, a text style.
 *
 * Every row reads and writes the extension's `sgs*` attributes (attributes.js). A cleared value is removed from
 * the block (written as `undefined`) so an unset setting leaves no trace in the saved markup.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { DesignTokenPicker, ResponsiveBoxControl, ShadowControl, SgsBorderControl, TypographyControls } from '../../../components';

const TIERS = [ 'desktop', 'tablet', 'mobile' ];

/**
 * A tier object ({desktop, tablet, mobile}) read as the {base, tablet, mobile} shape the box controls take.
 *
 * @param {Object|undefined} value Stored tier object.
 * @return {{base: Object, tablet: Object, mobile: Object}} The box per device.
 */
const boxTiers = ( value ) => ( {
	base: value?.desktop ?? {},
	tablet: value?.tablet ?? {},
	mobile: value?.mobile ?? {},
} );

/**
 * Write one device of a tier object, dropping the whole attribute when no device holds a value.
 *
 * @param {Object|undefined} current Stored tier object.
 * @param {string}           tier    'base' | 'tablet' | 'mobile'.
 * @param {Object}           next    The box or corner object for that device.
 * @return {Object|undefined} The next stored value.
 */
export const writeTier = ( current, tier, next ) => {
	const key = 'base' === tier ? 'desktop' : tier;
	const merged = { ...( current || {} ), [ key ]: next };
	const filled = TIERS.some( ( t ) => merged[ t ] && Object.values( merged[ t ] ).some( ( v ) => '' !== v && undefined !== v && null !== v ) );
	return filled ? merged : undefined;
};

/**
 * A single colour row.
 *
 * @param {Object} props               Props.
 * @param {string} props.label         Row label.
 * @param {Object} props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @param {string} props.name          Attribute name.
 * @return {JSX.Element} The row.
 */
export function ColourRow( { label, attributes, setAttributes, name } ) {
	return (
		<DesignTokenPicker
			linked
			clearable
			label={ label }
			states={ [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: attributes[ name ] || '',
					onChange: ( picked ) => setAttributes( { [ name ]: picked || undefined } ),
					linked: true,
				},
			] }
		/>
	);
}

/**
 * A card: fill, border with per-device width and corner radius, shadow, per-device padding.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @param {string}   props.prefix        Attribute prefix (`sgsItem`, `sgsSummary`, ...).
 * @param {boolean}  [props.noPadding]   Omit the padding row.
 * @return {JSX.Element} The rows.
 */
export function CardControls( { attributes, setAttributes, prefix, noPadding = false } ) {
	const a = ( suffix ) => prefix + suffix;
	return (
		<>
			<ColourRow label={ __( 'Fill', 'sgs-blocks' ) } attributes={ attributes } setAttributes={ setAttributes } name={ a( 'Background' ) } />
			<SgsBorderControl
				widthValues={ attributes[ a( 'BorderWidth' ) ] ?? {} }
				onWidthChange={ ( next ) => setAttributes( { [ a( 'BorderWidth' ) ]: next } ) }
				styleValue={ attributes[ a( 'BorderStyle' ) ] }
				onStyleChange={ ( val ) => setAttributes( { [ a( 'BorderStyle' ) ]: val || undefined } ) }
				colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
				colourValue={ attributes[ a( 'BorderColour' ) ] }
				onColourChange={ ( val ) => setAttributes( { [ a( 'BorderColour' ) ]: val || undefined } ) }
				colourLinked
				radiusValues={ boxTiers( attributes[ a( 'BorderRadius' ) ] ) }
				onRadiusChange={ ( tier, next ) => setAttributes( { [ a( 'BorderRadius' ) ]: writeTier( attributes[ a( 'BorderRadius' ) ], tier, next ) } ) }
			/>
			<ShadowControl
				label={ __( 'Shadow', 'sgs-blocks' ) }
				attributes={ attributes }
				setAttributes={ setAttributes }
				attrNames={ { base: a( 'Shadow' ), colour: a( 'ShadowColour' ) } }
			/>
			{ ! noPadding && (
				<ResponsiveBoxControl
					label={ __( 'Padding', 'sgs-blocks' ) }
					values={ boxTiers( attributes[ a( 'Padding' ) ] ) }
					onChange={ ( tier, next ) => setAttributes( { [ a( 'Padding' ) ]: writeTier( attributes[ a( 'Padding' ) ], tier, next ) } ) }
				/>
			) }
		</>
	);
}

/**
 * A text style: the shared typography controls and a colour.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @param {string}   props.prefix        Attribute prefix (`sgsStepTitle`, ...).
 * @return {JSX.Element} The rows.
 */
export function TextControls( { attributes, setAttributes, prefix } ) {
	return (
		<>
			<TypographyControls
				showFontFamily
				showTransform
				showLetterSpacing
				attributes={ attributes }
				setAttributes={ setAttributes }
				prefix={ prefix }
			/>
			<ColourRow label={ __( 'Text colour', 'sgs-blocks' ) } attributes={ attributes } setAttributes={ setAttributes } name={ prefix + 'Colour' } />
		</>
	);
}
