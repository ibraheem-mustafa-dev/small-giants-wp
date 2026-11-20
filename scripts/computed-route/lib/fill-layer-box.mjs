// Fill's reading of a decorative layer's own box (sgs/decorative-image): its stacking, its anchor, a size drawn by both sides, a size declared as a percentage and a width the draft never declares (shrink to fit).
// The values come from lib/layer-box.mjs, the code the applier's layers family shares. Returns the properties it wrote, which
// the resolver loop then skips. `apply` is lib/fill-resolve-element.mjs::apply.
import { LAYER_BLOCK, anchorFor, declaredSizes, directWrite, shrinkSizes, sidesOfDeclared, stretchedSize } from './layer-box.mjs';


export function fillLayerBox( { st, rec, ref, target, snaps, apply } ) {
	const handled = new Set();
	if ( LAYER_BLOCK !== rec.name || '' !== target.slot ) {
		return handled;
	}
	const widths = Object.keys( snaps );
	const declared = ( w ) => st.reads.declared?.[ w ]?.[ target.id ] ?? {};
	const write = ( prop, res ) => {
		if ( res.writes ) {
			apply( st, rec, ref, target, prop, { status: 'written', slot: '', writes: res.writes, how: 'single', answers: widths.map( Number ) }, '' );
			handled.add( prop );
		}
	};
	const parent = null === rec.parent ? null : st.nodes[ rec.parent ];
	const anchor = parent ? anchorFor( parent.name ) : null;
	anchor && apply( st, rec, ref, target, 'position', { status: 'written', slot: '', writes: [ { attr: 'anchorTo', value: anchor } ], how: 'single', answers: [] }, '' );
	write( 'z-index', directWrite( st.db, 'z-index', Object.fromEntries( widths.map( ( w ) => [ w, snaps[ w ].styles?.[ 'z-index' ] ?? declared( w )[ 'z-index' ] ?? 'auto' ] ) ) ) );
	for ( const [ prop, axis ] of [ [ 'width', [ 'left', 'right' ] ], [ 'height', [ 'top', 'bottom' ] ] ] ) {
		const stretched = Object.fromEntries( widths.map( ( w ) => [ w, stretchedSize( sidesOfDeclared( declared( w ) ), axis, snaps[ w ].styles?.[ axis[ 0 ] ], snaps[ w ].styles?.[ axis[ 1 ] ] ) ] ) );
		// An axis placed by one side takes the size the draft declares when that is a percentage of the containing box.
		const declaredAt = Object.fromEntries( widths.map( ( w ) => [ w, declared( w ) ] ) );
		// A layer holding blocks whose width the draft never declares shrinks to fit them (lib/layer-box.mjs::shrinkSizes).
		const shrunk = 'width' === prop && rec.children?.length ? shrinkSizes( declaredAt, Object.fromEntries( widths.map( ( w ) => [ w, snaps[ w ].styles ] ) ) ) : null;
		const sizes = widths.length && Object.values( stretched ).every( Boolean ) ? stretched : declaredSizes( declaredAt, prop ) ?? shrunk;
		if ( sizes ) {
			write( prop, directWrite( st.db, prop, sizes ) );
		}
	}
	return handled;
}
