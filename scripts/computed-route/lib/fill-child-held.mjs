// A parent's read of an element a block inside it reads itself (Spec 48 FR-48-6). A block that keeps its children's parts'
// look as its own settings (an accordion's item background when open, its answer padding) reads the draft's unit elements
// at its calibrated child paths (lib/skeleton-child-slots.mjs::unitSlots); the same draft element is a block inside it's own
// draftRef (the item's row, the answer's text). A property the parent has no setting for there, which that block's own read
// of the element also met, is that block's to write or report: the parent's row is settled `child-held`, naming the block,
// so one value is never reported twice. A property the inner block's read never met stays the parent's row.
import { refOf } from './tree.mjs';

const json = ( v ) => JSON.stringify( v );
// The reasons of a parent row an inner block's read stands for: the parent holds no setting for the property there.
const OWN = /^(?:no-setting|unpaired-part)\b/;

// Every node below `index`.
function below( st, index ) {
	return st.nodes.filter( ( r ) => {
		for ( let i = r.parent; null !== i && undefined !== i; i = st.nodes[ i ].parent ) {
			if ( i === index ) {
				return true;
			}
		}
		return false;
	} );
}

// Moves each such parent row into st.out.settled. Returns the number settled.
export function childHeld( st ) {
	let moved = 0;
	for ( const rec of st.nodes ) {
		const inner = below( st, rec.index ).filter( ( r ) => r.targets.some( ( t ) => '' === t.slot ) );
		for ( const t of rec.targets.filter( ( x ) => '' !== x.slot ) ) {
			const child = inner.find( ( r ) => json( r.targets.find( ( x ) => '' === x.slot ).finder ) === json( t.finder ) );
			if ( ! child ) {
				continue;
			}
			const ref = refOf( st.flat[ rec.index ] );
			const cref = refOf( st.flat[ child.index ] );
			const met = new Set( [ ...st.out.writes, ...st.out.unmapped, ...( st.out.settled || [] ) ].filter( ( x ) => x.node === cref && '' === ( x.slot ?? '' ) ).map( ( x ) => x.prop ?? x.property ) );
			for ( const row of st.out.unmapped.filter( ( u ) => u.node === ref && u.slot === t.slot && OWN.test( String( u.reason ) ) && met.has( u.property ) ) ) {
				st.out.unmapped.splice( st.out.unmapped.indexOf( row ), 1 );
				( st.out.settled ??= [] ).push( { node: ref, block: rec.name, slot: t.slot, property: row.property, value: row.value, widths: row.widths, reason: 'child-held', detail: `${ child.name } ${ cref } reads this draft element itself (its draftRef), so its own write or row there stands for this value (${ String( row.reason ).split( ';' )[ 0 ] })` } );
				moved++;
			}
		}
	}
	return moved;
}
