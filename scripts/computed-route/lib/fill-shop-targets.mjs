// The draft elements of the shop parts (Spec 48 FR-48-60 to FR-48-62), found by their locators and given to Fill to read.
// `build/shop-parts.json` carries, for each part, the template key (`<dc>/<data-dc-tpl>`, lib/fact-key.mjs::templateKey) of
// every draft element its units were found on. A part whose home settings paint one framework part (the settings' shared
// DB css_element: the basket line's thumbnail, the sticky bar) has a calibrated slot on the block (lib/fill-part-pairing.mjs::partHome);
// the part's first located element becomes the measuring target of that slot on every node of the block, so the resting pass
// writes its style values to the settings of that part like any other target. A part whose settings paint no part, or
// several, or whose element the fact record has no instance for, is a note naming why it is not measured.
import { attrsFor } from './db.mjs';
import { LOOSE } from './resolve.mjs';
import { partHome } from './fill-part-pairing.mjs';
import { servedKey } from './key-space.mjs';
import { parseInstanceKey } from './fact-key.mjs';

// The framework part a record part's home settings paint: { element } when exactly one DB css_element (not the wrapper, not
// a state) is shared by them, else { why }.
export function partElement( db, part ) {
	const names = new Set( part.home?.settings || [] );
	const rows = attrsFor( db, part.home?.block ).filter( ( r ) => names.has( r.attr_name ) && r.css_element && 'wrapper' !== r.css_element && ! r.css_state );
	const elements = [ ...new Set( rows.map( ( r ) => r.css_element ) ) ].sort();
	if ( 1 === elements.length ) {
		return { element: elements[ 0 ] };
	}
	return { why: elements.length ? `its settings paint several parts (${ elements.join( ', ' ) })` : 'none of its settings paints a part of the block' };
}

// The served-space instance key of a template key: the fact record's first instance (lowest copy) of that element, in the
// served draft's key space. Null when the record has none.
export function instanceOf( facts, key, rootComponent ) {
	const list = ( facts?.elements?.[ key ]?.instances || [] ).map( ( i ) => i.key ).filter( ( k ) => parseInstanceKey( k ) );
	list.sort( ( a, b ) => parseInstanceKey( a ).copy - parseInstanceKey( b ).copy );
	return list.length ? servedKey( list[ 0 ], rootComponent ) : null;
}

// Adds the located parts' targets to the surface's nodes, in place. record: the shop parts record; nodes: skeletonNodes;
// calFor( block ): the block's calibration. Returns { added: [ { part, node, slot, finder } ], notes }.
export function shopPartTargets( { record, nodes, facts, rootComponent, db, calFor } ) {
	const out = { added: [], notes: [] };
	for ( const s of record?.surfaces || [] ) {
		for ( const part of s.parts || [] ) {
			const block = part.home?.block;
			if ( 'setting' !== part.home?.type || ! block || ! ( part.locators || [] ).length ) {
				continue;
			}
			const homes = nodes.filter( ( n ) => n.name === block );
			if ( ! homes.length ) {
				continue;
			}
			const named = partElement( db, part );
			if ( ! named.element ) {
				out.notes.push( `shop part ${ part.id } (${ s.kind }): ${ named.why }, so its draft elements are not measured` );
				continue;
			}
			const key = part.locators[ 0 ];
			const instance = instanceOf( facts, key, rootComponent );
			if ( ! instance ) {
				out.notes.push( `shop part ${ part.id } (${ s.kind }): the fact record has no instance of ${ key }, so the ${ named.element } part of ${ block } is not measured` );
				continue;
			}
			const cal = calFor( block );
			const home = partHome( db, block, cal, named.element, null );
			const slot = null === home ? null : Object.values( cal.settings ).map( ( x ) => x.slot ).find( ( p ) => LOOSE( p ) === home );
			if ( ! slot ) {
				out.notes.push( `shop part ${ part.id } (${ s.kind }): the calibration of ${ block } has no slot for its ${ named.element } part` );
				continue;
			}
			for ( const n of homes ) {
				if ( n.targets.some( ( t ) => t.slot === slot ) ) {
					continue;
				}
				const finder = { tpl: instance };
				n.targets.push( { id: `${ n.index }:${ slot }`, index: n.index, slot, finder, scoped: true, shopPart: part.id } );
				out.added.push( { part: part.id, node: n.index, slot, finder } );
			}
		}
	}
	return out;
}
