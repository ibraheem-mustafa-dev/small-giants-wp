// The draftSlots of a draft element a drawing block absorbs that is one of the block's own parts (Spec 48 FR-48-6): the
// control that opens the drawer is the navigation block's burger part. Fill reads a part's settings from the draft element
// at the part's calibrated slot, so the absorbed element becomes the node's draftSlots entry at that slot, and the
// element's children become the slots of the part's own sub-parts (the burger's bars) where calibration measured them.
// The part is named by the absorbing rule (`rules.<rule>.part`, a framework DB css_element); its slot is the one most of
// its settings are calibrated at (lib/fill-part-pairing.mjs::partHome).
import { attrsFor } from './db.mjs';
import { LOOSE } from './resolve.mjs';
import { partHome } from './fill-part-pairing.mjs';

const NTH = /:nth-of-type\((\d+)\)\s*$/;

// The calibrated slot strings the block's settings hold on the part's descendants: { settings entries' slot and slots }
// under `homeSlot`, the settings of any other part (a sub-part, never the wrapper and never a state).
function subPartPaths( db, block, cal, part, homeSlot ) {
	const found = new Set();
	for ( const r of attrsFor( db, block ) ) {
		const s = cal?.settings?.[ r.attr_name ];
		if ( ! s || r.css_state || ! r.css_element || 'wrapper' === r.css_element || part === r.css_element ) {
			continue;
		}
		[ s.slot, ...( s.slots || [] ) ].filter( ( p ) => 'string' === typeof p && p.startsWith( `${ homeSlot } > ` ) ).forEach( ( p ) => found.add( p ) );
	}
	return [ ...found ].sort( ( a, b ) => a.length - b.length || a.localeCompare( b ) );
}

// The draft element a calibrated sub-part path is, walking down from the part's element: a repeated step
// (`:nth-of-type(k)`) is the k-th child; a lone step is the only child; a step with several children below it that
// the next steps count over is a box the draft does not draw (the burger's icon box when the bars sit straight in the
// button), and has no element of its own. Returns { el } or { note }.
function walk( steps, from, kids ) {
	let cur = from;
	for ( let i = 0; i < steps.length; i++ ) {
		const list = kids( cur );
		const nth = NTH.exec( steps[ i ] );
		if ( nth ) {
			cur = list[ Number( nth[ 1 ] ) - 1 ];
		} else if ( 1 === list.length ) {
			cur = list[ 0 ];
		} else if ( list.length > 1 && i < steps.length - 1 && NTH.test( steps[ i + 1 ] ) ) {
			continue;
		} else {
			return { note: `the draft has no element for ${ steps[ i ] }` };
		}
		if ( ! cur ) {
			return { note: `the draft has no element for ${ steps[ i ] }` };
		}
	}
	return cur === from ? { note: 'the draft has no element of its own for this step' } : { el: cur };
}

// opener: the absorbed draft element; part: the DB css_element it is; m: the inventory model; finder: the element's
// finder. Returns { slots: { <calibrated path>: finder }, notes: [text] }.
export function partSlots( { db, block, cal, part, opener, m, finder } ) {
	const out = { slots: {}, notes: [] };
	const home = partHome( db, block, cal, part, null );
	if ( null === home ) {
		out.notes.push( `the calibration has no slot for the ${ part } part of ${ block }, so the ${ opener.key } slot is not given` );
		return out;
	}
	const homeSlot = Object.values( cal.settings ).map( ( s ) => s.slot ).find( ( p ) => LOOSE( p ) === home );
	out.slots[ homeSlot ] = finder( opener );
	const kids = ( e ) => m.kids( e ).filter( ( k ) => ! m.isPart( k ) );
	for ( const p of subPartPaths( db, block, cal, part, homeSlot ) ) {
		const steps = p.slice( homeSlot.length + 3 ).split( ' > ' );
		const hit = walk( steps, opener, kids );
		hit.el ? ( out.slots[ p ] = finder( hit.el ) ) : out.notes.push( `${ p }: ${ hit.note }` );
	}
	return out;
}
