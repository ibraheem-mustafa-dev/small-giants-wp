// The draftSlots of a block that draws its entries from the draft's loop and styles one part of each entry with its own settings
// (data/skeleton-decisions.json `rules.itemFieldSlots`): a timeline's year ring is the element that prints the entry's date, and the
// settings the framework database places on the date and its ring (css_element `date`, `dateRing`) are read there. The part is
// found by the field it prints, never by its shape or position: the loop's first copy's element that prints a field of the
// item (lib/fill-list-items.mjs::loopFieldElements), the draft field taking the block's item key of that role the way the list
// pass does (lib/fill-list-content.mjs::matchFields).
import { attrsFor } from './db.mjs';
import { matchFields } from './fill-list-content.mjs';
import { loopFieldElements } from './fill-list-items.mjs';

// rule: `rules.itemFieldSlots` ({ blocks: [ { block, parts: [ { key, elements: [ css_element ] } ] } ] }); the node's draft element
// key `rootKey`; inventory and factRecord as the writer holds them; calibrated: the block's calibrated settings; finder( element ):
// the walker finder of a model element; byKey: the model's elements by key. Returns { slots: { <path>: finder }, notes }.
export function itemFieldSlots( { rule, db, block, rootKey, inventory, factRecord, rootComponent = null, calibrated = {}, finder, byKey } ) {
	const out = { slots: {}, notes: [] };
	const entry = ( rule?.blocks || [] ).find( ( b ) => b.block === block );
	if ( ! entry || ! db || ! factRecord ) {
		return out;
	}
	const printed = loopFieldElements( { inventory, facts: factRecord, rootKey, rootComponent } );
	const fields = Object.keys( printed ).map( ( name ) => ( { name, image: false } ) );
	if ( ! fields.length ) {
		return out;
	}
	const { map } = matchFields( fields, entry.parts.map( ( p ) => ( { key: p.key } ) ) );
	const rows = attrsFor( db, block ).filter( ( r ) => ! r.css_state );
	for ( const part of entry.parts ) {
		const field = Object.keys( map ).find( ( f ) => map[ f ] === part.key );
		const at = field ? byKey[ printed[ field ].key ] : null;
		if ( ! at ) {
			out.notes.push( `no element of the draft's first entry prints the ${ part.key } field, so its part's look is not read` );
			continue;
		}
		let read = 0;
		for ( const r of rows.filter( ( x ) => part.elements.includes( x.css_element ) ) ) {
			const slot = calibrated[ r.attr_name ]?.slot;
			'string' === typeof slot && '' !== slot && ! slot.includes( '::' ) && ( out.slots[ slot ] = finder( at ), read++ );
		}
		! read && out.notes.push( `the calibration has no element slot for the ${ part.key } part's settings, so the part's look is not read` );
	}
	return out;
}
