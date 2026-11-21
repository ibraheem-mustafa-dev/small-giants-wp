// The padding of a wrapper the block absorbed (lib/skeleton-absorb-wrapper.mjs; Bean, 2026-11-21), summed with the block's own.
//
// In the draft the absorbed wrapper sits inside the node's own element, so its content starts at the element's padding plus
// the wrapper's on each side. The block has one padding setting, painted at the part the wrapper stands for (the content band
// of sgs/container), so the part's padding is the two summed per side and the root's own read of that side is moved there:
// a side either pads at some width is read at the part as root plus wrapper at every width, and the root no longer reads it
// (no row is asked of another setting for it, so nothing writes it twice). A side neither pads is left as the root reads it. The sum is made on the draft reads before Fill resolves anything (fill.mjs, beside maskHiddenVariants), so
// every pass reads the same values: the computed values per width, the 16px sweep, and the declared values (a declared form
// of a summed side is dropped: the sum is no value the code declares).
// Mutates `reads`; returns one line per node, part and side summed.

const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const SHORTHANDS = [ 'padding', 'padding-inline', 'padding-block' ];
const px = ( v ) => {
	const m = /^(-?\d*\.?\d+)px$/.exec( String( v ?? '' ).trim() );
	return m ? Number( m[ 1 ] ) : null;
};
const round = ( n ) => Math.round( n * 100 ) / 100;

// The nodes' absorbed parts: [ { index, rootId, partId, slot } ] for every skeletonNodes record whose node lists `draftAbsorbed`.
export function absorbedParts( nodes ) {
	return nodes.flatMap( ( rec ) => ( Array.isArray( rec.node?.draftAbsorbed ) ? rec.node.draftAbsorbed : [] ).filter( ( slot ) => rec.targets.some( ( t ) => t.slot === slot ) ).map( ( slot ) => ( { index: rec.index, rootId: `${ rec.index }:`, partId: `${ rec.index }:${ slot }`, slot } ) ) );
}

export function sumAbsorbedPadding( reads, nodes ) {
	const lines = [];
	const widths = Object.keys( reads?.widths || {} );
	for ( const p of absorbedParts( nodes ) ) {
		for ( const side of SIDES ) {
			const prop = `padding-${ side }`;
			const at = ( w, id ) => reads.widths[ w ]?.[ id ]?.styles;
			// A side neither pads at any width stays as the root reads it (a section's zero side padding is judged against the
			// page gutter there, lib/fill-gutter.mjs).
			if ( ! widths.some( ( w ) => ( px( at( w, p.partId )?.[ prop ] ) ?? 0 ) !== 0 || ( px( at( w, p.rootId )?.[ prop ] ) ?? 0 ) !== 0 ) ) {
				continue;
			}
			const summed = [];
			for ( const w of widths ) {
				const root = at( w, p.rootId );
				const part = at( w, p.partId );
				const a = px( root?.[ prop ] );
				const b = px( part?.[ prop ] );
				if ( null !== a && null !== b ) {
					part[ prop ] = `${ round( a + b ) }px`;
					a && summed.push( Number( w ) );
				}
				root && delete root[ prop ];
				const declared = reads.declared?.[ w ];
				if ( declared?.[ p.rootId ] ) {
					[ prop, ...SHORTHANDS ].forEach( ( n ) => delete declared[ p.rootId ][ n ] );
				}
				if ( a && declared?.[ p.partId ] ) {
					[ prop, ...SHORTHANDS ].forEach( ( n ) => delete declared[ p.partId ][ n ] );
				}
			}
			const rootSeries = reads.sweep?.[ p.rootId ]?.[ prop ];
			const partSeries = reads.sweep?.[ p.partId ]?.[ prop ];
			if ( Array.isArray( rootSeries ) && Array.isArray( partSeries ) ) {
				const byWidth = new Map( rootSeries.map( ( s ) => [ s.width, px( s.value ) ] ) );
				reads.sweep[ p.partId ][ prop ] = partSeries.map( ( s ) => ( null != byWidth.get( s.width ) && null !== px( s.value ) ? { ...s, value: `${ round( byWidth.get( s.width ) + px( s.value ) ) }px` } : s ) );
			}
			rootSeries && delete reads.sweep[ p.rootId ][ prop ];
			lines.push( `node ${ p.index }: ${ prop } read at "${ p.slot }" as the root's plus the absorbed wrapper's${ summed.length ? ` (both pad it at ${ [ ...new Set( summed ) ].sort( ( x, y ) => x - y ).join( ', ' ) }px)` : '' }` );
		}
	}
	return lines;
}
