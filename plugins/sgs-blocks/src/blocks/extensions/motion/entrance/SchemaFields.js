/**
 * SchemaFields: draws the value fields of one schema `$def` (an entrance's close values, a text effect's values, a
 * keyframe) with the M1 atom for each field type, so no field is hand-wired per effect. Every field reads its value from
 * the layer at `<prefix>.<key>`, shows the Customised tag against the preset's stamped value, and writes through
 * `onEdit( path, value )`. A nested object (for example `from` or `to`) draws as a labelled group.
 *
 * Fields of a type with no stand-alone atom here (a part or asset reference, a property row list) are left to the
 * panel that owns them.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import defs from '../../../../components/motion/motion-defs';
import { ATOM_FOR_FIELD_TYPE } from '../../../../components/motion/atom-registry';
import { stampedValue, valueAtPath } from '../layers/stamp';

const DEFS = defs.$defs;
const REF_PREFIX = '#/$defs/';
const NUMBER_TYPES = Object.freeze( [
	'ratio',
	'scale',
	'percentage',
	'opacity',
] );
const DRAWN = Object.freeze( [
	'duration',
	'easing',
	'distance',
	'angle',
	'choice',
	'boolean',
	'colourReference',
	...NUMBER_TYPES,
] );

const refName = ( node ) =>
	String( node?.$ref || '' ).replace( REF_PREFIX, '' );

// The field type of a node: its declared type, or the name of the `$def` it points at.
function fieldTypeOf( node ) {
	return node?.[ 'x-sgs-field' ]?.fieldType || refName( node );
}

/** Shown on Tablet and Mobile beside a field the schema stores once, for every device. */
export function AllDevicesNote() {
	return (
		<p className="sgs-motion-atom__help">
			{ __( 'Applies to all devices.', 'sgs-blocks' ) }
		</p>
	);
}

/**
 * A key as a label: `revealDelay` becomes "Reveal delay".
 *
 * @param {string} key A schema key.
 * @return {string} The label.
 */
export function labelFor( key ) {
	const words = key.replace( /([A-Z])/g, ' $1' ).toLowerCase();
	return words.charAt( 0 ).toUpperCase() + words.slice( 1 );
}

/**
 * @param {Object}   props
 * @param {string}   props.defName   The `$def` whose properties are drawn.
 * @param {string}   props.prefix    The layer path the `$def` is stored at (`values`, `close`, `devices.tablet.close`).
 * @param {Object}   props.layer     The layer.
 * @param {Function} props.onEdit    `( path, value )`: the edit, with `undefined` clearing the field.
 * @param {string[]} [props.keys]    Only these keys, in this order; every property when omitted.
 * @param {string[]} [props.skip]    Keys to leave out.
 * @param {boolean}  [props.stamped] Whether to compare against the preset (false for a tier override).
 * @param {string}   [props.label]   The group's accessible name; every group on the panel needs its own.
 * @param {boolean}  [props.nested]  Drawn inside a labelled fieldset, so it adds no group of its own.
 * @return {Element|null} The fields, or null when the `$def` has nothing to draw.
 */
export default function SchemaFields( {
	defName,
	prefix,
	layer,
	onEdit,
	keys,
	skip = [],
	stamped = true,
	label = __( 'Values', 'sgs-blocks' ),
	nested: insideGroup = false,
} ) {
	const properties = DEFS[ defName ]?.properties || {};
	const required = DEFS[ defName ]?.required || [];
	const order = ( keys || Object.keys( properties ) ).filter(
		( key ) => properties[ key ] && ! skip.includes( key )
	);
	const drawn = order
		.map( ( key ) => {
			const node = properties[ key ];
			const path = `${ prefix }.${ key }`;
			const type = fieldTypeOf( node );
			const nested = DEFS[ refName( node ) ];
			if ( DRAWN.includes( type ) ) {
				const Atom = ATOM_FOR_FIELD_TYPE[ type ];
				return (
					<Atom
						key={ key }
						label={ labelFor( key ) }
						type={
							NUMBER_TYPES.includes( type ) ? type : undefined
						}
						fieldNode={ node }
						value={ valueAtPath( layer, path ) }
						presetValue={
							stamped ? stampedValue( layer, path ) : undefined
						}
						onChange={ ( next ) => {
							// A required field (a keyframe's offset) is never cleared: the old value stays.
							if (
								next === undefined &&
								required.includes( key )
							) {
								return;
							}
							onEdit( path, next );
						} }
					/>
				);
			}
			if ( nested?.properties && type !== 'propertyRow' ) {
				return (
					<fieldset key={ key } className="sgs-motion-fields__group">
						<legend>{ labelFor( key ) }</legend>
						<SchemaFields
							defName={ refName( node ) }
							prefix={ path }
							layer={ layer }
							onEdit={ onEdit }
							stamped={ stamped }
							nested
						/>
					</fieldset>
				);
			}
			return null;
		} )
		.filter( Boolean );
	if ( ! drawn.length ) {
		return null;
	}
	return insideGroup ? (
		<>{ drawn }</>
	) : (
		<div className="sgs-motion-fields" role="group" aria-label={ label }>
			{ drawn }
		</div>
	);
}
