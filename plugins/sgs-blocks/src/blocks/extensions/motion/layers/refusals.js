/**
 * The inspector's refusals (Spec 38A §5, §5.2, §10; FR-38A-10): the `x-sgs-refusals` pairs and limits of
 * `schemas/motion.schema.json`, applied to one element's layers before a layer is added or changed. Every text comes
 * from the schema; nothing here words a refusal.
 *
 * This is the editor twin of `scripts/computed-route/lib/motion-refusals.mjs` (the cloning tool) and
 * `includes/motion/class-sgs-motion-layers.php` with `class-sgs-motion-limits.php` (the renderer, which drops the
 * later layer). All three read the same table and match a rule the same way: a pair fires when one layer matches
 * side `a` and a different layer matches side `b`; a limit counts effect slugs per list, layer ids per element or
 * paint-slot claims per element, compares one value across two layers, or refuses one value.
 *
 * The layer entries, labels and side matching live in `refusal-match.js`.
 *
 * @package
 */

import {
	LIST_KINDS,
	SINGLE_KIND,
	TABLE,
	effectiveTiers,
	elementLayers,
	fill,
	layerLabel,
	layersAt,
	matches,
	sideLabel,
	slotClaims,
	tierSources,
} from './refusal-match';

export {
	effectLabel,
	effectsForPanel,
	effectsForTarget,
	elementLayers,
	layerLabel,
	layersAt,
} from './refusal-match';

function pairRefusals( rule, layers ) {
	const out = [];
	const seen = new Set();
	layers.forEach( ( a ) => {
		layers.forEach( ( b ) => {
			if ( a === b || ! matches( a, rule.a ) || ! matches( b, rule.b ) ) {
				return;
			}
			const key = [ a.path, b.path ].sort().join( '|' );
			if ( seen.has( key ) ) {
				return;
			}
			seen.add( key );
			const labels = {
				a: sideLabel( a, rule.a ),
				b: sideLabel( b, rule.b ),
			};
			out.push( {
				id: rule.id,
				text: fill( rule.text, rule.placeholders, labels ),
				layers: [ a.path, b.path ],
			} );
		} );
	} );
	return out;
}

function firstSeenRefusals( limit, entries, keyOf, labelsOf ) {
	const out = [];
	const seen = new Map();
	entries.forEach( ( entry ) => {
		const key = keyOf( entry );
		if ( seen.has( key ) ) {
			out.push( {
				id: limit.id,
				text: fill( limit.text, limit.placeholders, labelsOf( entry ) ),
				layers: [ seen.get( key ), entry.path ],
			} );
		} else {
			seen.set( key, entry.path );
		}
	} );
	return out;
}

function valueRefusals( limit, layers ) {
	const key = limit.value;
	const holders = layers.filter( ( entry ) =>
		limit.lists.includes( entry.list )
	);
	if ( limit.kind === 'refused-value' ) {
		return holders
			.filter( ( entry ) =>
				tierSources( entry.layer ).some(
					( source ) => source && source[ key ] === limit.equals
				)
			)
			.map( ( entry ) => ( {
				id: limit.id,
				text: fill( limit.text, limit.placeholders, {} ),
				layers: [ entry.path ],
			} ) );
	}
	const out = [];
	holders.forEach( ( a, index ) => {
		holders.slice( index + 1 ).forEach( ( b ) => {
			const ea = effectiveTiers( a.layer, key );
			const eb = effectiveTiers( b.layer, key );
			const differs = ea.some(
				( va, tier ) =>
					va !== null && eb[ tier ] !== null && va !== eb[ tier ]
			);
			if ( differs ) {
				const labels = {
					first: layerLabel( a ),
					second: layerLabel( b ),
				};
				out.push( {
					id: limit.id,
					text: fill( limit.text, limit.placeholders, labels ),
					layers: [ a.path, b.path ],
				} );
			}
		} );
	} );
	return out;
}

function limitRefusals( limit, layers, focus ) {
	if ( limit.kind === 'unique-effect' ) {
		return limit.lists.flatMap( ( list ) =>
			firstSeenRefusals(
				limit,
				layers.filter(
					( entry ) => entry.list === list && entry.effect
				),
				( entry ) => entry.effect,
				( entry ) => ( { effect: layerLabel( entry ) } )
			)
		);
	}
	if ( limit.kind === 'unique-id' ) {
		return firstSeenRefusals(
			limit,
			layers.filter(
				( entry ) =>
					limit.lists.includes( entry.list ) &&
					typeof entry.layer.id === 'string'
			),
			( entry ) => entry.layer.id,
			( entry ) => ( { id: entry.layer.id } )
		);
	}
	if ( limit.kind === 'slot-max' ) {
		const claims = layers.flatMap( ( entry ) =>
			slotClaims( entry )
				.filter( ( claim ) => claim.slot === limit.slot )
				.map( ( claim ) => ( {
					label: claim.label,
					path: entry.path,
				} ) )
		);
		const named = ( kept, extra ) => ( {
			id: limit.id,
			text: fill( limit.text, limit.placeholders, {
				first: kept[ 0 ].label,
				second: kept[ 1 ].label,
				extra: extra.label,
			} ),
			layers: [ kept[ 0 ].path, kept[ 1 ].path, extra.path ],
		} );
		// The inspector names the layer being added or edited as the one to drop; the renderer drops in paint order.
		const edited = claims.find( ( claim ) => claim.path === focus );
		if ( edited && claims.length > limit.max ) {
			return [
				named(
					claims.filter( ( claim ) => claim !== edited ),
					edited
				),
			];
		}
		return claims
			.slice( limit.max )
			.map( ( extra ) => named( claims, extra ) );
	}
	if ( limit.kind === 'same-value' || limit.kind === 'refused-value' ) {
		return valueRefusals( limit, layers );
	}
	throw new Error(
		`motion refusals: unknown limit kind "${ limit.kind }" in ${ limit.id }`
	);
}

/**
 * Every refusal on one element: pairs first in table order, then limits.
 *
 * @param {Object} element One element of the motion value.
 * @param {string} [focus] The path of the layer being added or edited; a paint-slot refusal names it as the extra.
 * @return {{id: string, text: string, layers: string[]}[]} The refusals, each naming the layer paths it involves.
 */
export function elementRefusals( element, focus ) {
	const layers = elementLayers( element );
	return [
		...TABLE.pairs.flatMap( ( rule ) => pairRefusals( rule, layers ) ),
		...TABLE.limits.flatMap( ( limit ) =>
			limitRefusals( limit, layers, focus )
		),
	];
}

const refusalKey = ( refusal ) =>
	`${ refusal.id }|${ refusal.text }|${ refusal.layers.join( ',' ) }`;

/**
 * The refusals an edit introduces: those on the element after the edit that it did not already carry.
 *
 * @param {Object} before  The element before the edit.
 * @param {Object} after   The element after the edit.
 * @param {string} [focus] The path of the layer the edit adds or changes.
 * @return {{id: string, text: string, layers: string[]}[]} The new refusals.
 */
export function newRefusals( before, after, focus ) {
	const existing = new Set(
		elementRefusals( before, focus ).map( refusalKey )
	);
	return elementRefusals( after, focus ).filter(
		( refusal ) => ! existing.has( refusalKey( refusal ) )
	);
}

/**
 * The element with one layer added at the end of a list (or set, for a single layer).
 *
 * @param {Object} element The element.
 * @param {string} list    The list path.
 * @param {Object} layer   The layer.
 * @return {Object} A new element; the given one is unchanged.
 */
export function withLayer( element, list, layer ) {
	const [ panel, key ] = list.split( '.' );
	const kind = LIST_KINDS.find( ( [ path ] ) => path === list )?.[ 1 ];
	const next =
		kind === SINGLE_KIND ? layer : [ ...layersAt( element, list ), layer ];
	if ( key === undefined ) {
		return { ...( element || {} ), [ panel ]: next };
	}
	return {
		...( element || {} ),
		[ panel ]: { ...( element?.[ panel ] || {} ), [ key ]: next },
	};
}

/**
 * Why a layer may not be added to an element, as the schema words it.
 *
 * @param {Object} element The element the layer would join.
 * @param {string} list    The list path.
 * @param {Object} layer   The layer, already stamped.
 * @return {string|null} The first refusal text that names the new layer, or null when it may be added.
 */
export function refusalForAdd( element, list, layer ) {
	const kind = LIST_KINDS.find( ( [ path ] ) => path === list )?.[ 1 ];
	const path =
		kind === SINGLE_KIND
			? list
			: `${ list }[${ layersAt( element, list ).length }]`;
	const found = newRefusals(
		element || {},
		withLayer( element, list, layer ),
		path
	).find( ( refusal ) => refusal.layers.includes( path ) );
	return found ? found.text : null;
}
