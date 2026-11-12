/**
 * The inspector panel for the row-by-column settings of the Cart and Checkout look (the `columns` of each row in
 * includes/woocommerce/commerce-look/selectors.json): one collapsed section per WooCommerce part, one control per
 * column the part takes. A control writes the attribute named by the row prefix plus the column suffix, the same
 * name includes/woocommerce/commerce-look/table.php prints and scripts/generate-commerce-look-table.js registers.
 * The underline column of a row that already has a text panel is drawn by that panel (controls.js::TextControls).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { AlignItemsTierControl, ResponsiveBoxControl, ResponsiveLengthControl, ShadowControl, TierBorderControl } from '../../../components';
import TABLE from '../../../../includes/woocommerce/commerce-look/selectors.json';
import { boxTiers, TextControls, writeTier } from './controls';

const LENGTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
];

/**
 * A row's attribute prefix: its own `prefix`, else `sgs` plus the row id in PascalCase (mirrors table.php).
 *
 * @param {string} id  Row id.
 * @param {Object} row The row.
 * @return {string} The prefix.
 */
export const rowPrefix = ( id, row ) => row.prefix || 'sgs' + id.split( '_' ).map( ( p ) => p.charAt( 0 ).toUpperCase() + p.slice( 1 ) ).join( '' );

/**
 * The rows that carry settings for a block, each with the columns that draw their own control.
 *
 * @param {boolean} isCart Whether the block is the cart.
 * @return {Array<{id: string, label: string, prefix: string, columns: string[]}>} Rows in table order.
 */
export const tableRowsFor = ( isCart ) =>
	Object.entries( TABLE.rows )
		.filter( ( [ , row ] ) => ( row.columns || [] ).some( ( c ) => 'decoration' !== c ) && row[ isCart ? 'cart' : 'checkout' ] )
		.map( ( [ id, row ] ) => ( {
			id,
			label: row.label || id,
			prefix: rowPrefix( id, row ),
			columns: row.columns.filter( ( c ) => 'decoration' !== c ),
		} ) );

/**
 * One column's control.
 *
 * @param {Object}   props               Props.
 * @param {string}   props.column        Column id.
 * @param {string}   props.prefix        The row's attribute prefix.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @return {JSX.Element|null} The control.
 */
function ColumnControl( { column, prefix, attributes, setAttributes } ) {
	const def = TABLE.columns[ column ];
	const name = prefix + def.attrs[ 0 ][ 0 ];
	const label = def.label;
	switch ( def.kind ) {
		case 'box':
			return (
				<ResponsiveBoxControl
					presets
					label={ label }
					values={ boxTiers( attributes[ name ] ) }
					onChange={ ( tier, next ) => setAttributes( { [ name ]: writeTier( attributes[ name ], tier, next ) } ) }
				/>
			);
		case 'length':
			return (
				<ResponsiveLengthControl
					scale="spacing"
					label={ label }
					value={ attributes[ name ] }
					units={ LENGTH_UNITS }
					onChange={ ( next ) => setAttributes( { [ name ]: next } ) }
				/>
			);
		case 'border':
			return <TierBorderControl label={ label } value={ attributes[ name ] } onChange={ ( next ) => setAttributes( { [ name ]: next } ) } />;
		case 'shadow':
			return <ShadowControl label={ label } attributes={ attributes } setAttributes={ setAttributes } attrNames={ { base: name, colour: name + 'Colour' } } />;
		case 'keyword':
			return (
				<AlignItemsTierControl
					label={ label }
					value={ attributes[ name ] }
					options={ def.options.map( ( [ value, text ] ) => ( { value, label: __( text, 'sgs-blocks' ) } ) ) }
					onChange={ ( next ) => setAttributes( { [ name ]: next } ) }
				/>
			);
		case 'text':
			return <TextControls attributes={ attributes } setAttributes={ setAttributes } prefix={ name.slice( 0, -'FontSize'.length ) } noColour showTextAlign />;
		default:
			return null;
	}
}

/**
 * The fine-tuning panel: every part of the cart or checkout that takes settings from the table.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @param {boolean}  props.isCart        Whether the block is the cart.
 * @return {JSX.Element} The panel.
 */
export function TablePanel( { attributes, setAttributes, isCart } ) {
	return (
		<PanelBody title={ __( 'Spacing, size and text of each part', 'sgs-blocks' ) } initialOpen={ false }>
			{ tableRowsFor( isCart ).map( ( row ) => (
				<PanelBody key={ row.id } title={ row.label } initialOpen={ false }>
					{ row.columns.map( ( column ) => (
						<ColumnControl key={ column } column={ column } prefix={ row.prefix } attributes={ attributes } setAttributes={ setAttributes } />
					) ) }
				</PanelBody>
			) ) }
		</PanelBody>
	);
}
