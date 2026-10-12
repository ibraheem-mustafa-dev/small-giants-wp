/**
 * The motion field types (Spec 38A FR-38A-55): one definition per field type in `schemas/motion.schema.json`
 * (duration, easing, distance, angle, ratio, scale, percentage, opacity, colourReference, partReference,
 * assetReference, choice, boolean, propertyRow, tokenReference), each giving editor validation, token resolution and
 * CSS emission. Every range, unit, enum and pattern is read from the schema's `$defs` and from the field's own schema
 * node (its narrowing `minimum`, `maximum`, `enum`, `multipleOf` and `x-sgs-range`); nothing here restates a bound.
 *
 * The PHP twin is `includes/motion/class-sgs-motion-field-types.php`; `tests/js/motion-field-types-parity.test.js`
 * proves both give the same verdict and the same CSS for the same value.
 *
 * Every function takes a plain value and an optional field node, never an sgsMotion path.
 */

import schema from '../../../schemas/motion.schema.json';
import {
	createEvaluator,
	isAnnotation,
	isJsonNumber,
	isJsonObject,
	RANGE_KEY,
} from './field-types/schema-eval';
import {
	colourCss,
	looksLikeToken,
	numberCss,
	tokenCss,
} from './field-types/css-values';

const DEFS = schema.$defs;
const evaluate = createEvaluator( DEFS );
const TOKENS = Object.freeze( [ ...DEFS.tokenReference.enum ] );

/** Every field type name, in schema order (the `$defs` entries marked `x-sgs-kind: fieldType`). */
export const FIELD_TYPE_NAMES = Object.freeze(
	Object.keys( DEFS ).filter(
		( name ) => DEFS[ name ][ 'x-sgs-kind' ] === 'fieldType'
	)
);

// Field types that drive markup or behaviour rather than a CSS value; their CSS is null.
const NON_CSS_TYPES = Object.freeze( [
	'boolean',
	'partReference',
	'assetReference',
] );

// Keywords a field node may add beside its `$ref` to narrow its type.
const NARROWING_KEYS = Object.freeze( [
	'minimum',
	'maximum',
	'exclusiveMinimum',
	'exclusiveMaximum',
	'multipleOf',
	'enum',
	'minLength',
	'maxLength',
	'pattern',
	RANGE_KEY,
] );

const REF_PREFIX = '#/$defs/';

/**
 * The schema node a value of this type is checked against: the type's `$def`, narrowed by the field node's own
 * keywords. A field node may reference the type directly or a list whose items are the type (a property-row list).
 *
 * @param {string}      type      Field type name.
 * @param {Object|null} fieldNode The field's schema node (for example `HoverStateValues.properties.scale`), or null.
 * @return {{node: Object}|{error: string}} The node to evaluate, or why the field node cannot be read.
 */
export function fieldSchemaNode( type, fieldNode = null ) {
	if ( ! FIELD_TYPE_NAMES.includes( type ) ) {
		return { error: `unknown field type ${ String( type ) }` };
	}
	const node = { $ref: REF_PREFIX + type };
	if ( fieldNode === null || fieldNode === undefined ) {
		return { node };
	}
	if ( ! isJsonObject( fieldNode ) ) {
		return { error: 'field node is not an object' };
	}
	const meta = fieldNode[ 'x-sgs-field' ];
	if ( isJsonObject( meta ) && meta.fieldType !== type ) {
		return {
			error: `field node is a ${ String(
				meta.fieldType
			) }, not a ${ type }`,
		};
	}
	if ( fieldNode.$ref !== undefined && fieldNode.$ref !== node.$ref ) {
		const listName = String( fieldNode.$ref ).replace( REF_PREFIX, '' );
		const list = DEFS[ listName ];
		const isListOfType =
			isJsonObject( list ) &&
			list[ 'x-sgs-kind' ] === 'list' &&
			isJsonObject( list.items ) &&
			list.items.$ref === node.$ref;
		if ( ! isListOfType ) {
			return { error: `field node does not reference ${ type }` };
		}
	}
	for ( const [ key, arg ] of Object.entries( fieldNode ) ) {
		if ( key === '$ref' || isAnnotation( key ) ) {
			continue;
		}
		if ( ! NARROWING_KEYS.includes( key ) ) {
			return { error: `unsupported field keyword ${ key }` };
		}
		node[ key ] = arg;
	}
	return { node };
}

/**
 * Validate one value against a field type (and the field's own narrowing).
 *
 * @param {string}      type      Field type name.
 * @param {unknown}     value     The stored or typed value.
 * @param {Object|null} fieldNode The field's schema node, or null for the bare type.
 * @return {{ok: true, value: unknown}|{ok: false, error: string}} The verdict; a valid value is returned unchanged.
 */
export function validateField( type, value, fieldNode = null ) {
	const built = fieldSchemaNode( type, fieldNode );
	if ( built.error ) {
		return { ok: false, error: built.error };
	}
	const failure = evaluate( built.node, value );
	return failure === null
		? { ok: true, value }
		: { ok: false, error: `${ type }: ${ failure }` };
}

/**
 * Resolve a token reference (`token:<family>.<key>` or the negated `-token:<family>.<key>`) to CSS.
 *
 * @param {unknown} ref Candidate reference.
 * @return {string|null} `var(--wp--custom--<family>--<key>)` (or `calc(-1 * ...)`), or null for an unknown key.
 */
export function resolveToken( ref ) {
	return tokenCss( ref, TOKENS );
}

// The field type of a property row's `from` and `to`, per property, read from the propertyRow `$def`'s if/then rules.
const ROW_VALUE_TYPES = Object.freeze(
	( DEFS.propertyRow.allOf || [] ).reduce( ( map, rule ) => {
		const properties = rule.if?.properties?.property?.enum || [];
		const ref = rule.then?.properties?.from?.$ref;
		if ( typeof ref === 'string' ) {
			properties.forEach( ( property ) => {
				map[ property ] = ref.replace( REF_PREFIX, '' );
			} );
		}
		return map;
	}, {} )
);

// The CSS for an already-valid value.
function valueCss( type, value ) {
	if ( NON_CSS_TYPES.includes( type ) ) {
		return null;
	}
	if ( type === 'propertyRow' ) {
		const rowType = ROW_VALUE_TYPES[ value.property ];
		const row = { property: value.property };
		[ 'from', 'to' ].forEach( ( end ) => {
			if ( Object.prototype.hasOwnProperty.call( value, end ) ) {
				row[ end ] = rowType ? valueCss( rowType, value[ end ] ) : null;
			}
		} );
		return row;
	}
	if ( type === 'colourReference' ) {
		return colourCss( value );
	}
	if ( isJsonNumber( value ) ) {
		return numberCss( value, DEFS[ type ][ 'x-sgs-unit' ] || '' );
	}
	if ( looksLikeToken( value ) ) {
		return resolveToken( value );
	}
	return typeof value === 'string' ? value : null;
}

/**
 * Validate a value and print its CSS: a number with its type's unit, a token as its custom property, a colour slug as
 * its palette variable, a property row as `{ property, from, to }` CSS, and null for boolean, part and asset references.
 *
 * @param {string}      type      Field type name.
 * @param {unknown}     value     The stored or typed value.
 * @param {Object|null} fieldNode The field's schema node, or null for the bare type.
 * @return {{ok: true, value: unknown, css: (string|Object|null)}|{ok: false, error: string}} The verdict and CSS.
 */
export function fieldCss( type, value, fieldNode = null ) {
	const verdict = validateField( type, value, fieldNode );
	return verdict.ok
		? { ok: true, value, css: valueCss( type, value ) }
		: verdict;
}

/**
 * What an editor control needs to bound its input: the numeric range (the field's `x-sgs-range`, else its
 * `minimum`/`maximum`, else the type's), the unit and accepted units, the enum and the tokens the type accepts.
 *
 * @param {string}      type      Field type name.
 * @param {Object|null} fieldNode The field's schema node, or null for the bare type.
 * @return {{min: (number|null), max: (number|null), unit: string, units: string[], options: (string[]|null), tokens: string[]}|{error: string}} The bounds.
 */
export function fieldRange( type, fieldNode = null ) {
	const built = fieldSchemaNode( type, fieldNode );
	if ( built.error ) {
		return { error: built.error };
	}
	const def = DEFS[ type ];
	const numeric =
		( def.anyOf || [ def ] ).find( ( branch ) =>
			[ 'number', 'integer' ].includes( branch.type )
		) || {};
	const pick = ( key ) => {
		const ownRange = built.node[ RANGE_KEY ] || def[ RANGE_KEY ];
		const rangeKey = key === 'minimum' ? 'min' : 'max';
		if ( ownRange && isJsonNumber( ownRange[ rangeKey ] ) ) {
			return ownRange[ rangeKey ];
		}
		if ( isJsonNumber( built.node[ key ] ) ) {
			return built.node[ key ];
		}
		return isJsonNumber( numeric[ key ] ) ? numeric[ key ] : null;
	};
	const tokens = TOKENS.filter(
		( token ) => validateField( type, token, fieldNode ).ok
	);
	return {
		min: pick( 'minimum' ),
		max: pick( 'maximum' ),
		unit: def[ 'x-sgs-unit' ] || '',
		units:
			def[ 'x-sgs-units' ] ||
			( def[ 'x-sgs-unit' ] ? [ def[ 'x-sgs-unit' ] ] : [] ),
		options: Array.isArray( built.node.enum )
			? [ ...built.node.enum ]
			: null,
		tokens,
	};
}

/**
 * Whether a string is a valid `cubic-bezier()` curve under the easing field type.
 *
 * @param {unknown} value Candidate curve.
 * @return {boolean} True for a schema-valid `cubic-bezier(...)` easing.
 */
export function isValidCubicBezier( value ) {
	return (
		typeof value === 'string' &&
		value.startsWith( 'cubic-bezier(' ) &&
		validateField( 'easing', value ).ok
	);
}

/**
 * One definition per field type: `validate( value, fieldNode )` and `css( value, fieldNode )`, plus its unit.
 */
export const FIELD_TYPES = Object.freeze(
	Object.fromEntries(
		FIELD_TYPE_NAMES.map( ( type ) => [
			type,
			Object.freeze( {
				type,
				unit: DEFS[ type ][ 'x-sgs-unit' ] || '',
				validate: ( value, fieldNode = null ) =>
					validateField( type, value, fieldNode ),
				css: ( value, fieldNode = null ) =>
					fieldCss( type, value, fieldNode ),
				range: ( fieldNode = null ) => fieldRange( type, fieldNode ),
			} ),
		] )
	)
);
