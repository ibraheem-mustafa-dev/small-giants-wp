/**
 * kitShown: does a built-in button or carousel dots declaration's feature print on this block right now?
 *
 * A declaration in `supports.sgs.builtinButtons` or `supports.sgs.carouselDots` may carry `showWhen`: the condition under
 * which the PHP prints that part, written once in `block.json` so the editor never offers settings for a part that is not
 * drawn. `showWhen` is a list; every item must hold, and an empty list (or none) means the part always prints. An item is
 * a leaf `{ attr, op, value?, default? }` or a group `{ any: [ ... ] }` / `{ all: [ ... ] }` of items.
 *
 * Leaf ops (the list lives in `kit-show-when.json`, which the generators validate against):
 *   on / off      the attribute is truthy / falsy; an empty array or object is falsy, as PHP `empty()`.
 *   equals / notEquals   the attribute equals `value` (or not).
 *   notEmpty      a non-empty string, array or object.
 *   tierAny / tierAll    a `{desktop,tablet,mobile}` value whose resolved tiers include / all equal `value`; a tier that is
 *                 unset inherits the tier above, and an unset desktop is `default`. A plain value counts as desktop only.
 *   lacksItem     the array at `attr` holds no item whose `key` equals `value`.
 * `attr` may be a dotted path (`sgsMotion.elements.root.effects`). `default` stands in when the attribute is unset, and
 * mirrors the PHP's `?? default`.
 *
 * @package
 */

const TIERS = [ 'desktop', 'tablet', 'mobile' ];

/** PHP `! empty()` for the values a block attribute holds. */
function truthy( value ) {
	if ( Array.isArray( value ) ) {
		return value.length > 0;
	}
	if ( value && 'object' === typeof value ) {
		return Object.keys( value ).length > 0;
	}
	return Boolean( value );
}

/** The attribute at a dotted path, or undefined. */
function read( attributes, path ) {
	return String( path )
		.split( '.' )
		.reduce(
			( node, key ) =>
				node && 'object' === typeof node ? node[ key ] : undefined,
			attributes
		);
}

/** The three resolved tiers of a per-device value. */
function resolveTiers( raw, fallback ) {
	const isTiered =
		raw &&
		'object' === typeof raw &&
		! Array.isArray( raw ) &&
		TIERS.some( ( t ) => t in raw );
	const own = isTiered ? raw : { desktop: raw };
	const desktop = own.desktop ?? fallback;
	const tablet = own.tablet ?? desktop;
	const mobile = own.mobile ?? tablet;
	return [ desktop, tablet, mobile ];
}

function leafHolds( leaf, attributes ) {
	const raw = read( attributes, leaf.attr );
	const value = raw ?? leaf.default;
	switch ( leaf.op ) {
		case 'on':
			return truthy( value );
		case 'off':
			return ! truthy( value );
		case 'equals':
			return value === leaf.value;
		case 'notEquals':
			return value !== leaf.value;
		case 'notEmpty':
			return truthy( value );
		case 'tierAny':
			return resolveTiers( raw, leaf.default ).includes( leaf.value );
		case 'tierAll':
			return resolveTiers( raw, leaf.default ).every(
				( t ) => t === leaf.value
			);
		case 'lacksItem':
			return ! (
				Array.isArray( raw ) &&
				raw.some( ( item ) => item && item[ leaf.key ] === leaf.value )
			);
		default:
			// An op this reader does not know cannot be judged: show the part rather than hide a setting.
			return true;
	}
}

function itemHolds( item, attributes ) {
	if ( item && Array.isArray( item.any ) ) {
		return item.any.some( ( i ) => itemHolds( i, attributes ) );
	}
	if ( item && Array.isArray( item.all ) ) {
		return item.all.every( ( i ) => itemHolds( i, attributes ) );
	}
	return leafHolds( item, attributes );
}

/**
 * @param {Object|null} entry      A `builtinButtons` entry or the `carouselDots` object, as declared in block.json.
 * @param {Object}      attributes Block attributes.
 * @return {boolean} True when the declared part prints, so its rows and panels show.
 */
export function kitShown( entry, attributes ) {
	const when = entry && entry.showWhen;
	if ( ! Array.isArray( when ) || ! when.length ) {
		return true;
	}
	return when.every( ( item ) => itemHolds( item, attributes || {} ) );
}

export default kitShown;
