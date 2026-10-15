/**
 * The layer lists of a motion element and the element-level helpers the layer operations share (Spec 38A §6.2): each
 * list's kind, layer `$def`, panel and item limit read from the schema extract's `Element` `$def`, the element
 * read and write helpers that drop empty lists, panels and elements, and the stable layer id.
 *
 * @package
 */

import defs from '../../../../components/motion/motion-defs';
import { createEvaluator } from '../../../../components/motion/field-types/schema-eval';
import { layersAt } from './refusal-match';

export const DEFS = defs.$defs;
const evaluate = createEvaluator( DEFS );
const REF_PREFIX = '#/$defs/';
const SCHEMA_VERSION = DEFS.schemaVersion.const;
const ID_SUFFIX_SPACE = 36 ** 6;

const refName = ( node ) =>
	String( node?.$ref || '' ).replace( REF_PREFIX, '' );

export const isObject = ( value ) =>
	Boolean( value ) && typeof value === 'object' && ! Array.isArray( value );

// One list's facts: its kind, layer `$def`, panel and item limit.
function listEntry( defName, def ) {
	const kind = def[ 'x-sgs-kind' ];
	const layerDef = kind === 'list' ? refName( def.items ) : defName;
	return {
		kind: kind === 'list' ? 'list' : 'single',
		layerDef,
		panel: DEFS[ layerDef ][ 'x-sgs-panel' ],
		maxItems: Number.isFinite( def.maxItems ) ? def.maxItems : null,
	};
}

/** Every layer list of an element by its path (`hover.state`, `hover.effects`, `entrance.base`, `entrance.text`, `effects`). */
export const LAYER_LISTS = Object.freeze(
	Object.entries( DEFS.Element.properties ).reduce(
		( out, [ key, node ] ) => {
			const def = DEFS[ refName( node ) ];
			if ( def[ 'x-sgs-kind' ] === 'list' ) {
				out[ key ] = listEntry( refName( node ), def );
			} else {
				Object.entries( def.properties ).forEach(
					( [ sub, subNode ] ) => {
						const subDef = DEFS[ refName( subNode ) ];
						if (
							[ 'list', 'layer' ].includes(
								subDef[ 'x-sgs-kind' ]
							)
						) {
							out[ `${ key }.${ sub }` ] = listEntry(
								refName( subNode ),
								subDef
							);
						}
					}
				);
			}
			return out;
		},
		{}
	)
);

/**
 * The layer list paths of one panel.
 *
 * @param {string} panel `hover`, `entrance` or `effects`.
 * @return {string[]} The list paths.
 */
export function listsForPanel( panel ) {
	return Object.keys( LAYER_LISTS ).filter(
		( list ) => LAYER_LISTS[ list ].panel === panel
	);
}

/**
 * The effect slugs a list accepts, from its layer `$def`.
 *
 * @param {string} list List path.
 * @return {string[]} The slugs; empty for a single-layer list.
 */
export function effectsForList( list ) {
	const node = DEFS[ LAYER_LISTS[ list ]?.layerDef ]?.properties?.effect;
	return Array.isArray( node?.enum ) ? [ ...node.enum ] : [];
}

export const isTarget = ( target ) =>
	typeof target === 'string' &&
	Object.keys( DEFS.Elements.patternProperties ).some( ( pattern ) =>
		new RegExp( pattern ).test( target )
	);

/**
 * One target's element.
 *
 * @param {Object|undefined} motion The motion value.
 * @param {string}           target `root` or a part key.
 * @return {Object} The element, or an empty object.
 */
export function elementOf( motion, target ) {
	const element = motion?.elements?.[ target ];
	return isObject( element ) ? element : {};
}

// The element without empty lists and without panels left empty.
function pruneElement( element ) {
	const out = { ...element };
	Object.keys( LAYER_LISTS ).forEach( ( list ) => {
		if ( layersAt( out, list ).length ) {
			return;
		}
		const [ panel, key ] = list.split( '.' );
		if ( key === undefined ) {
			delete out[ panel ];
			return;
		}
		const holder = { ...( isObject( out[ panel ] ) ? out[ panel ] : {} ) };
		delete holder[ key ];
		if ( Object.keys( holder ).length ) {
			out[ panel ] = holder;
		} else {
			delete out[ panel ];
		}
	} );
	return out;
}

/**
 * The motion value with one target's element replaced; an element left empty is removed, and a value left with no
 * element and no stagger settings becomes undefined (the attribute is cleared).
 *
 * @param {Object|undefined} motion  The motion value.
 * @param {string}           target  The target.
 * @param {Object}           element The new element.
 * @return {Object|undefined} The new motion value.
 */
export function withElement( motion, target, element ) {
	const elements = {
		...( isObject( motion?.elements ) ? motion.elements : {} ),
	};
	const pruned = pruneElement( element );
	if ( Object.keys( pruned ).length ) {
		elements[ target ] = pruned;
	} else {
		delete elements[ target ];
	}
	const next = { ...( isObject( motion ) ? motion : {} ), v: SCHEMA_VERSION };
	if ( Object.keys( elements ).length ) {
		next.elements = elements;
	} else {
		delete next.elements;
	}
	return next.elements || next.stagger ? next : undefined;
}

/**
 * A new layer id: the effect slug and a short random suffix, valid under the schema's `layerId` and unused on the
 * element.
 *
 * @param {string}   effect Effect slug.
 * @param {string[]} taken  Ids already on the element.
 * @param {Function} random Returns a number in [0, 1).
 * @return {string} The id.
 */
export function newLayerId( effect, taken, random = Math.random ) {
	const base = String( effect || 'layer' ).slice( 0, 24 );
	let id;
	do {
		const suffix = Math.floor( random() * ID_SUFFIX_SPACE )
			.toString( 36 )
			.padStart( 6, '0' );
		id = `${ base }-${ suffix }`;
		if ( evaluate( { $ref: `${ REF_PREFIX }layerId` }, id ) !== null ) {
			throw new Error( `newLayerId: ${ id } is not a valid layer id` );
		}
	} while ( taken.includes( id ) );
	return id;
}

export const elementIds = ( element ) =>
	Object.keys( LAYER_LISTS ).flatMap( ( list ) =>
		layersAt( element, list )
			.map( ( layer ) => layer.id )
			.filter( ( id ) => typeof id === 'string' )
	);

// The element with one list replaced (a single list by its one layer, or removed when empty).
export function withList( element, list, layers ) {
	const [ panel, key ] = list.split( '.' );
	const single = LAYER_LISTS[ list ].kind === 'single';
	const value = single ? layers[ 0 ] : layers;
	if ( key === undefined ) {
		return { ...element, [ panel ]: value };
	}
	return {
		...element,
		[ panel ]: { ...( element[ panel ] || {} ), [ key ]: value },
	};
}

export function listOf( list ) {
	const entry = LAYER_LISTS[ list ];
	if ( ! entry ) {
		throw new Error( `motion layers: unknown list ${ list }` );
	}
	return entry;
}
