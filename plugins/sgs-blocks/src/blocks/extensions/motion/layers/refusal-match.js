/**
 * The matching half of the motion refusals (Spec 38A §10, §5.2): one element's layers as entries, the labels a
 * refusal names them by, how a rule side matches a layer, and which effects a target may hold, all read from the
 * schema extract (`motion-defs.js`: `x-sgs-refusals`, `x-sgs-effects`, `x-sgs-layer-labels`, `x-sgs-panels`).
 * `refusals.js` applies the pairs and limits over these; the twin rules are in
 * `scripts/computed-route/lib/motion-refusals.mjs`.
 *
 * @package
 */

import defs from '../../../../components/motion/motion-defs';

export const TABLE = defs[ 'x-sgs-refusals' ];
const EFFECTS = defs[ 'x-sgs-effects' ];
const LAYER_LABELS = defs[ 'x-sgs-layer-labels' ];
const PANELS = defs[ 'x-sgs-panels' ];
const TARGET_LEVEL_KEY = 'x-target-level';

// The target levels each kind of target can hold (§5.4 "Targeting levels"). The root is the block, paints the block's
// own background and is an element a part-level effect can attach to; a declared part holds part-level effects, and a
// part its declaration marks `"surface": true` (a background or media part) also holds surface-level effects.
const ROOT_LEVELS = Object.freeze( [ 'block', 'surface', 'part' ] );
const PART_LEVELS = Object.freeze( [ 'part' ] );
const SURFACE_PART_LEVELS = Object.freeze( [ 'surface', 'part' ] );

/**
 * The target levels one target offers.
 *
 * @param {string}      target     `root`, a part key or a `custom:<n>` target.
 * @param {Object|null} [elements] The block's `supports.sgs.elements`; a part declared with `"surface": true` offers
 *                                 the surface level.
 * @return {ReadonlyArray<string>} The levels.
 */
export function levelsForTarget( target, elements = null ) {
	if ( target === 'root' ) {
		return ROOT_LEVELS;
	}
	return elements?.[ target ]?.surface === true
		? SURFACE_PART_LEVELS
		: PART_LEVELS;
}

/**
 * The effect slugs a target may hold, keeping the given order: an effect whose `x-target-level` names a level the
 * target offers.
 *
 * @param {string[]}    effects    The candidate slugs.
 * @param {string}      target     `root`, a part key or a `custom:<n>` target.
 * @param {Object|null} [elements] The block's `supports.sgs.elements` (see `levelsForTarget`).
 * @return {string[]} The slugs valid for the target.
 */
export function effectsForTarget( effects, target, elements = null ) {
	const levels = levelsForTarget( target, elements );
	return effects.filter( ( effect ) =>
		( EFFECTS[ effect ]?.[ TARGET_LEVEL_KEY ] || [] ).some( ( level ) =>
			levels.includes( level )
		)
	);
}

export const SINGLE_KIND = 'single';

// Every layer list of an element in paint order, read from the panel table: `[ [ 'hover.state', 'single' ], ... ]`.
export const LIST_KINDS = Object.freeze(
	Object.values( PANELS ).flatMap( ( panel ) =>
		Object.entries( panel.layers )
	)
);

const isObject = ( value ) =>
	Boolean( value ) && typeof value === 'object' && ! Array.isArray( value );

const isOn = ( value ) =>
	value !== undefined && value !== null && value !== false;

// A zero amount (0, 0.0, '0deg', '-0turn').
const isZero = ( value ) =>
	( typeof value === 'number' && value === 0 ) ||
	( typeof value === 'string' &&
		/^-?(?:0+(?:\.0*)?|\.0+)(?:deg|turn|rad|grad|px)?$/.test( value ) );

/**
 * The layers stored at one list path of an element (`hover.state`, `hover.effects` ...).
 *
 * @param {Object} element One element of the motion value.
 * @param {string} list    The list path.
 * @return {Object[]} The layers, in order; a single layer is a list of one.
 */
export function layersAt( element, list ) {
	const [ panel, key ] = list.split( '.' );
	const holder = key === undefined ? element : element?.[ panel ];
	const stored = holder?.[ key === undefined ? panel : key ];
	if ( Array.isArray( stored ) ) {
		return stored.filter( isObject );
	}
	return isObject( stored ) ? [ stored ] : [];
}

/**
 * One element's layers in paint order, each `{ list, path, effect, layer }`.
 *
 * @param {Object} element One element of the motion value.
 * @return {Object[]} The entries.
 */
export function elementLayers( element ) {
	const out = [];
	LIST_KINDS.forEach( ( [ list, kind ] ) => {
		layersAt( element || {}, list ).forEach( ( layer, index ) => {
			out.push( {
				list,
				path: kind === SINGLE_KIND ? list : `${ list }[${ index }]`,
				effect: typeof layer.effect === 'string' ? layer.effect : null,
				layer,
			} );
		} );
	} );
	return out;
}

/**
 * The label an effect slug is named by in refusal texts and menus.
 *
 * @param {string} effect Effect slug.
 * @return {string} The schema's label, or the slug when the schema has no row.
 */
export function effectLabel( effect ) {
	return EFFECTS[ effect ]?.label || effect;
}

/**
 * The effect slugs a panel may hold, in schema order.
 *
 * @param {string} panel `hover`, `entrance` or `effects`.
 * @return {string[]} The slugs whose `panels` list the panel.
 */
export function effectsForPanel( panel ) {
	return Object.keys( EFFECTS ).filter( ( effect ) =>
		EFFECTS[ effect ].panels.includes( panel )
	);
}

/**
 * The label a layer entry is named by: its effect's label, else its list's label.
 *
 * @param {Object} entry An `elementLayers` entry.
 * @return {string} The label.
 */
export function layerLabel( entry ) {
	if ( entry.effect ) {
		return effectLabel( entry.effect );
	}
	return LAYER_LABELS[ entry.list ] || entry.list;
}

// Every value at a dot path; a list on the way fans out to each item.
function valuesAt( source, dotted ) {
	let current = [ source ];
	dotted.split( '.' ).forEach( ( key ) => {
		const next = [];
		current.forEach( ( node ) => {
			const items = Array.isArray( node ) ? node : [ node ];
			items.forEach( ( item ) => {
				if ( isObject( item ) && key in item ) {
					next.push( item[ key ] );
				}
			} );
		} );
		current = next;
	} );
	return current;
}

// A layer's value sources by tier position (values, then the Tablet and Mobile overrides); a missing one is null.
export function tierSources( layer ) {
	const devices = layer.devices || {};
	return [ layer.values, devices.tablet, devices.mobile ].map( ( source ) =>
		isObject( source ) ? source : null
	);
}

const valueSources = ( layer ) => tierSources( layer ).filter( Boolean );

// The paint slots a layer claims: its effect's `slots`, a `when` slot only while that value is on.
export function slotClaims( entry ) {
	const row = entry.effect ? EFFECTS[ entry.effect ] : null;
	if ( ! row ) {
		return [];
	}
	return row.slots.filter(
		( slot ) =>
			! slot.when ||
			valueSources( entry.layer ).some( ( source ) =>
				isOn( source[ slot.when ] )
			)
	);
}

// The side's value paths this layer sets; with `nonZero`, a zero amount is unset.
function matchedValues( entry, side ) {
	const sources = valueSources( entry.layer );
	return ( side.values || [] ).filter( ( path ) =>
		sources.some( ( source ) =>
			valuesAt( source, path ).some(
				( value ) =>
					isOn( value ) && ! ( side.nonZero && isZero( value ) )
			)
		)
	);
}

// The label a refusal names a layer by for one side: a `valueLabels` label when every matched value maps to it.
export function sideLabel( entry, side ) {
	if ( side.values && side.valueLabels ) {
		const labels = [
			...new Set(
				matchedValues( entry, side ).map(
					( path ) => side.valueLabels[ path ] ?? null
				)
			),
		];
		if ( labels.length === 1 && typeof labels[ 0 ] === 'string' ) {
			return labels[ 0 ];
		}
	}
	return layerLabel( entry );
}

export function matches( entry, side ) {
	if ( side.layers && ! side.layers.includes( entry.list ) ) {
		return false;
	}
	if ( side.effects && ! side.effects.includes( entry.effect ) ) {
		return false;
	}
	if ( side.excludeEffects && side.excludeEffects.includes( entry.effect ) ) {
		return false;
	}
	if ( side.triggers && ! side.triggers.includes( entry.layer.trigger ) ) {
		return false;
	}
	if (
		side.slot &&
		! slotClaims( entry ).some( ( claim ) => claim.slot === side.slot )
	) {
		return false;
	}
	if ( side.values && ! matchedValues( entry, side ).length ) {
		return false;
	}
	if ( side.rows ) {
		const rows = valueSources( entry.layer ).flatMap( ( source ) =>
			Array.isArray( source.rows ) ? source.rows : []
		);
		if (
			! rows.some( ( row ) => row && side.rows.includes( row.property ) )
		) {
			return false;
		}
	}
	return true;
}

// The schema text with each placeholder replaced by the label its entry names.
export function fill( text, placeholders, labels ) {
	return Object.entries( placeholders || {} ).reduce(
		( out, [ token, from ] ) => out.split( token ).join( labels[ from ] ),
		text
	);
}

// A length in comparable form: 800, '800px' and 800.0 are equal; any other value as a string.
function normaliseLength( value ) {
	if ( typeof value === 'number' ) {
		return value;
	}
	const match =
		typeof value === 'string'
			? /^(-?(?:\d+(?:\.\d+)?|\.\d+))px$/.exec( value )
			: null;
	if ( match ) {
		return Number( match[ 1 ] );
	}
	return typeof value === 'string' ? value : JSON.stringify( value );
}

// One value's effective, normalised value on each device tier: a tier's own override, else the wider tier's.
export function effectiveTiers( layer, key ) {
	let current = null;
	return tierSources( layer ).map( ( source ) => {
		const value = source ? source[ key ] : undefined;
		if ( isOn( value ) ) {
			current = normaliseLength( value );
		}
		return current;
	} );
}
