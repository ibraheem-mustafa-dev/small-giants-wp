// The walker pairs a skeleton's own draft identities give (lib/fill-config.mjs::walkerPairs; the config text is
// lib/pairs.mjs::configText's). One pair per node with a draftRef, measured on the node's ref class, except:
// - a node whose draft element provably does not hold one of its children's draft elements
//   (lib/identity.mjs::childrenOutside) is left out: its block holds more than that element, so every box, gap and
//   ground row would compare a part of the draft with the whole block;
// - a width variant written as a block of its own (lib/skeleton-write-record.mjs: `variantKey` on the variant,
//   `widthVariants` on the default) shares the default's draft element, so each of the two pairs is scoped to resolve
//   only while its own words are rendered (variantScope). Unscoped, the variant's pair compares the draft element with
//   a hidden block at every width the default shows, and the default's at every width the variant shows.
import { childrenOutside } from './identity.mjs';

// The selector, document-wide, for the element a tpl key names inside its own import host (an element inside a deeper
// host is excluded), or null when a selector cannot name it alone: a copy past the first in its chain (querySelector
// and a loop's copies share one selector). `inner` drops the host prefix, for use inside :has() on an element already in
// that host.
export function tplSelector( key, { inner = false } = {} ) {
	const m = /^(.+)\/(\d+)#(\d+)$/.exec( key || '' );
	if ( ! m || '0' !== m[ 3 ] ) {
		return null;
	}
	const parts = m[ 1 ].split( '>' );
	const hosts = [ `.sc-host[data-sc-name=${ JSON.stringify( parts[ 0 ] ) }]` ];
	for ( const part of parts.slice( 1 ) ) {
		const p = /^(.*?)(?:@(\d+))?#(\d+)$/.exec( part );
		if ( ! p || '0' !== p[ 3 ] ) {
			return null;
		}
		hosts.push( `.sc-host[data-sc-name=${ JSON.stringify( p[ 1 ] ) }]${ undefined === p[ 2 ] ? '' : `[data-dc-tpl="${ p[ 2 ] }"]` }` );
	}
	const own = `[data-dc-tpl="${ m[ 2 ] }"]:not(${ '.sc-host '.repeat( parts.length + 1 ) }*)`;
	return inner ? own : `${ hosts.join( ' ' ) } ${ own }`;
}

const chainOf = ( key ) => /^(.+)\/\d+#\d+$/.exec( key || '' )?.[ 1 ] ?? null;
const keyOf = ( f ) => ( f && 'object' === typeof f && 'string' === typeof f.tpl ? f.tpl : null );

// A shared draft finder scoped to one width variant. finder: the shared draftRef (a tpl finder or a CSS selector);
// mine: the variant's words key, or null for the default; others: the variants' words keys (for the default). The
// variant resolves only while its words element is inside the shared element; the default only while none is. Returns
// the scoped finder, or null when a selector cannot name the elements (tplSelector) or a words key is in another host.
export function variantScope( finder, mine, others = [] ) {
	const base = keyOf( finder );
	const words = ( mine ? [ mine ] : others ).map( ( k ) => ( base && chainOf( k ) !== chainOf( base ) ? null : tplSelector( k, { inner: true } ) ) );
	if ( ! words.length || words.some( ( w ) => ! w ) ) {
		return null;
	}
	const cond = mine ? `:has(${ words[ 0 ] })` : words.map( ( w ) => `:not(:has(${ w }))` ).join( '' );
	if ( base ) {
		const at = tplSelector( base );
		return at ? { ...finder, within: `${ at }${ cond }` } : null;
	}
	return 'string' === typeof finder ? `:is(${ finder })${ cond }` : null;
}

// Whether the draft element `key` sits inside the draft element `outer` (both inventory keys); null when the chain is
// unknown. parentOf: inventory key -> parent key.
function inside( key, outer, parentOf ) {
	if ( ! parentOf.has( key ) || ! parentOf.has( outer ) ) {
		return null;
	}
	for ( let k = parentOf.get( key ); k; k = parentOf.get( k ) ) {
		if ( k === outer ) {
			return true;
		}
	}
	return false;
}

// The parts a block renders inside itself whose draft elements the draft draws outside the block's own element (a
// navigation's burger the draft places in another row): the block's pair cannot reach them on the draft, and the draft
// element's nearest paired ancestor would count it as its own part. Each pairs on its own: the skeleton's draft element
// for that slot against the slot inside the block. A part inside another such part goes with it. Returns [ { ref, slot,
// draft } ].
export function outsideSlotPairs( node, ref, parentOf ) {
	const base = keyOf( node.draftRef );
	if ( ! base || ! parentOf?.size ) {
		return [];
	}
	const out = Object.entries( node.draftSlots || {} ).filter( ( [ , f ] ) => keyOf( f ) && false === inside( keyOf( f ), base, parentOf ) );
	return out.filter( ( [ , f ] ) => ! out.some( ( [ , g ] ) => g !== f && inside( keyOf( f ), keyOf( g ), parentOf ) ) ).map( ( [ slot, f ] ) => ( { ref, slot, draft: f } ) );
}

// nodes: lib/fill-skeleton.mjs::skeletonNodes( skeleton ); refs: the ref of each node by index; inventory: the surface's
// skeleton inventory ({ elements: [ { key, parentKey } ] }), which places each slot's draft element (outsideSlotPairs).
// Returns { pairs: [ { ref, draft, slot? } ], left: [ { ref, why } ], unscoped: [ { ref, why } ] } (unscoped: a width
// variant pair kept as the shared finder because no selector names its elements).
export function skeletonPairs( nodes, refs, { inventory = null } = {} ) {
	const parentOf = new Map( ( inventory?.elements || [] ).map( ( e ) => [ e.key, e.parentKey ?? null ] ) );
	const pairs = [];
	const left = [];
	const unscoped = [];
	for ( const n of nodes.filter( ( x ) => undefined !== x.node.draftRef && refs[ x.index ] ) ) {
		const ref = refs[ n.index ];
		const outside = childrenOutside( n.node );
		if ( outside.length ) {
			left.push( { ref, why: `its draft element <${ n.node.draftFingerprint.tag }> does not hold its child ${ outside.map( ( o ) => `${ o.name } <${ o.tag }>` ).join( ', ' ) }` } );
			continue;
		}
		const variant = n.node.variantKey || null;
		const others = ( n.node.widthVariants || [] ).map( ( v ) => v.key );
		pairs.push( ...outsideSlotPairs( n.node, ref, parentOf ) );
		if ( ! variant && ! others.length ) {
			pairs.push( { ref, draft: n.node.draftRef } );
			continue;
		}
		const scoped = variantScope( n.node.draftRef, variant, others );
		scoped || unscoped.push( { ref, why: 'no selector names its width variant\'s words element alone' } );
		pairs.push( { ref, draft: scoped || n.node.draftRef } );
	}
	return { pairs, left, unscoped };
}
