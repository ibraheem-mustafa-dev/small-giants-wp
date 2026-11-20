// A skeleton node drawn from width alternatives (a header's main bar: one bar below a width, another above it, merged into one
// row block by lib/skeleton-header-slots.mjs::mergeWidthAlternatives) keeps its widest bar as its draft element and lists the
// others in `widthAlternatives: [ { key, shown } ]`. Fill reads the node's layout from the element drawn at each width, so the
// row's per-device settings (its grid tracks, gap, padding) follow the bar the draft shows there, not the one bar that
// exists at 1440.
//   alternateJobs( nodes )         the extra read jobs: one per alternative, an id of the node's root id plus `>alt:<n>`;
//                                  lib/fill-read.mjs::readDraft reads them with every other target
//   mergeAlternates( result, jobs ) moves each alternative's read onto its node's root read at the widths the root element is not
//                                  drawn (isAbsent) and the alternative is, then removes the alternatives' ids from the result
import { parseTplKey } from './fill-skeleton.mjs';

export const ALT_SLOT = '>alt:';

// { id, finder, mark: null, owner, root: true, own, alt: { of, key } } for each alternative of each node with a root target.
export function alternateJobs( nodes ) {
	return nodes.flatMap( ( n ) => {
		const root = n.targets.find( ( t ) => '' === ( t.slot ?? '' ) );
		const list = Array.isArray( n.node?.widthAlternatives ) ? n.node.widthAlternatives : [];
		return root ? list.filter( ( a ) => parseTplKey( a?.key ) ).map( ( a, i ) => ( {
			id: `${ root.id }${ ALT_SLOT }${ i }`,
			finder: { tpl: a.key },
			mark: null,
			owner: n.index,
			root: true,
			own: n.children.length > 0 || !! n.itemChildren,
			alt: { of: root.id, key: a.key },
		} ) ) : [];
	} );
}

// A read of an element the draft does not draw at that width: no element, display none, or a box with no size (an ancestor hides it).
export const isAbsent = ( v ) => ! v || v.missing || 'none' === v.styles?.display || ( v.box && 0 === v.box.w && 0 === v.box.h );

// Mutates `result` (readDraft's result). A root read that is missing at a width and an alternative read that is not: the
// alternative's snapshot, declared values, written declarations and state looks stand for the root at that width, and the sweep
// series take its value at each swept width the root is absent at. Every alternative id is dropped from the result afterwards.
export function mergeAlternates( result, jobs ) {
	const alts = jobs.filter( ( j ) => j.alt );
	if ( ! alts.length ) {
		return result;
	}
	for ( const j of alts ) {
		const root = j.alt.of;
		for ( const [ w, byId ] of Object.entries( result.widths || {} ) ) {
			if ( ! isAbsent( byId[ root ] ) || isAbsent( byId[ j.id ] ) ) {
				continue;
			}
			byId[ root ] = byId[ j.id ];
			result.declared?.[ w ] && result.declared[ w ][ j.id ] && ( result.declared[ w ][ root ] = result.declared[ w ][ j.id ] );
			result.declaredWritten?.[ w ] && result.declaredWritten[ w ][ j.id ] && ( result.declaredWritten[ w ][ root ] = result.declaredWritten[ w ][ j.id ] );
			const looks = result.states?.[ w ]?.looks;
			looks?.[ j.id ] && ! looks[ root ]?.length && ( looks[ root ] = looks[ j.id ] );
		}
		const sweep = result.sweep || {};
		const mine = sweep[ j.id ];
		const own = sweep[ root ];
		if ( mine && own ) {
			// The swept widths the root is absent at and this alternative is present at, found before any series changes.
			const take = ( own[ '(rendered)' ] || [] ).map( ( e, i ) => 'absent' === e.value && 'present' === mine[ '(rendered)' ]?.[ i ]?.value && mine[ '(rendered)' ][ i ].width === e.width );
			for ( const [ prop, series ] of Object.entries( own ) ) {
				series.forEach( ( entry, i ) => {
					take[ i ] && ( series[ i ] = { ...( mine[ prop ]?.[ i ] ?? entry ) } );
				} );
			}
		}
	}
	for ( const j of alts ) {
		for ( const byId of Object.values( result.widths || {} ) ) {
			delete byId[ j.id ];
		}
		Object.values( result.declared || {} ).forEach( ( byId ) => delete byId[ j.id ] );
		Object.values( result.declaredWritten || {} ).forEach( ( byId ) => delete byId[ j.id ] );
		Object.values( result.states || {} ).forEach( ( s ) => s?.looks && delete s.looks[ j.id ] );
		result.sweep && delete result.sweep[ j.id ];
		result.failures = ( result.failures || [] ).map( ( f ) => ( f.id === j.id ? { ...f, id: j.alt.of } : f ) );
	}
	return result;
}
