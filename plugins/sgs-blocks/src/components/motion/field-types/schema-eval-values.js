/**
 * The value helpers of the motion schema evaluator (Spec 38A FR-38A-55): annotation keys, the `x-sgs-range` bound
 * check with its unit conversion, and the JSON type, enum, pattern and length predicates `createEvaluator` composes.
 *
 * Pure functions over plain values; never reads an sgsMotion path.
 */

// Keys that carry no assertion.
const ANNOTATIONS = new Set( [
	'description',
	'title',
	'$comment',
	'default',
	'examples',
] );

/**
 * Whether a key is an annotation (ignored by evaluation).
 *
 * @param {string} key Schema keyword.
 * @return {boolean} True for annotation keys and every `x-sgs-*` key.
 */
export function isAnnotation( key ) {
	return (
		ANNOTATIONS.has( key ) ||
		( key.startsWith( 'x-sgs' ) && key !== RANGE_KEY )
	);
}

// The one `x-sgs-*` keyword that asserts: `{ min, max, unit }` bounds in the base unit (ms, px or deg), checked on
// numbers and on unit strings converted to that unit, the same rule as the cloning tool's validator
// (`scripts/computed-route/lib/motion-schema.mjs::rangeProblem`).
export const RANGE_KEY = 'x-sgs-range';

// Conversion factors into each base unit.
const UNIT_FACTORS = Object.freeze( {
	ms: { ms: 1, s: 1000 },
	px: { px: 1 },
	deg: { deg: 1, turn: 360, rad: 180 / Math.PI },
} );

const UNIT_STRING_RE = /^(-?(?:\d+(?:\.\d+)?|\.\d+))([a-z%]+)$/;

// Bounds are compared with this tolerance, so a converted value a rounding step past a bound is not refused.
const RANGE_EPSILON = 1e-9;

/**
 * A value expressed in a range's base unit.
 *
 * @param {unknown} value    Candidate.
 * @param {string}  baseUnit The range's base unit.
 * @return {number|null|false} The amount; null when the value is not range-checked (a token, a negated token, a
 *                             `calc(` string, any other non-numeric string); false for a unit with no fixed conversion
 *                             into the base unit (em, rem, %, vh on a px range), which a ranged field refuses.
 */
export function toBaseUnit( value, baseUnit ) {
	if ( isJsonNumber( value ) ) {
		return value;
	}
	if (
		typeof value !== 'string' ||
		/^-?token:/.test( value ) ||
		value.startsWith( 'calc(' )
	) {
		return null;
	}
	const match = UNIT_STRING_RE.exec( value );
	if ( ! match ) {
		return null;
	}
	const factors = UNIT_FACTORS[ baseUnit ] || {};
	if ( ! Object.prototype.hasOwnProperty.call( factors, match[ 2 ] ) ) {
		return false;
	}
	return Number( match[ 1 ] ) * factors[ match[ 2 ] ];
}

export function rangeFailure( range, value ) {
	if ( ! isJsonObject( range ) ) {
		return 'unsupported:' + RANGE_KEY;
	}
	// A negated token is a negative length, so a range that starts at zero or above refuses it.
	if (
		typeof value === 'string' &&
		value.startsWith( '-token:' ) &&
		isJsonNumber( range.min ) &&
		range.min >= 0
	) {
		return RANGE_KEY;
	}
	const amount = toBaseUnit(
		value,
		typeof range.unit === 'string' ? range.unit : ''
	);
	if ( amount === null ) {
		return null;
	}
	if ( amount === false ) {
		return RANGE_KEY;
	}
	if ( isJsonNumber( range.min ) && amount < range.min - RANGE_EPSILON ) {
		return RANGE_KEY;
	}
	if ( isJsonNumber( range.max ) && amount > range.max + RANGE_EPSILON ) {
		return RANGE_KEY;
	}
	return null;
}

/**
 * Whether a value is a finite JSON number.
 *
 * @param {unknown} value Candidate.
 * @return {boolean} True for a finite number.
 */
export function isJsonNumber( value ) {
	return typeof value === 'number' && Number.isFinite( value );
}

/**
 * Whether a value is a JSON object (not an array, not null).
 *
 * @param {unknown} value Candidate.
 * @return {boolean} True for a plain object.
 */
export function isJsonObject( value ) {
	return (
		value !== null && typeof value === 'object' && ! Array.isArray( value )
	);
}

export function hasType( value, type ) {
	switch ( type ) {
		case 'string':
			return typeof value === 'string';
		case 'number':
			return isJsonNumber( value );
		case 'integer':
			return isJsonNumber( value ) && Number.isInteger( value );
		case 'boolean':
			return typeof value === 'boolean';
		case 'object':
			return isJsonObject( value );
		case 'array':
			return Array.isArray( value );
		case 'null':
			return value === null;
		default:
			return false;
	}
}

// Enum entries in the field types are scalars, so strict equality is JSON equality.
export function enumHas( list, value ) {
	return list.some( ( entry ) => entry === value );
}

const patternCache = new Map();

export function patternMatches( pattern, value ) {
	if ( ! patternCache.has( pattern ) ) {
		patternCache.set( pattern, new RegExp( pattern, 'u' ) );
	}
	return patternCache.get( pattern ).test( value );
}

// Code-point length, as JSON Schema counts string length.
export function codePointLength( value ) {
	return [ ...value ].length;
}

