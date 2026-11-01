// How many items a track shows side by side (Spec 48 FR-48-1 declared forms, R-47-3 one engine, R-47-10): a block whose
// setting holds that count (a number setting the framework database ties to `flex`, such as a slider's visible cards) is
// never given the count by the skeleton, which carries no attribute with a css_property. Fill reads it from the draft's
// render instead: at each read width, the children's cards that sit on the first card's row and lie inside the track's
// box (a swipe track's cards that run past its edge are not visible). The count goes to the resolver
// (lib/resolve.mjs::resolve with `count: true`), which writes one value when every width agrees and returns a `shape`
// gap when the counts differ, because a number setting without per-width siblings holds one value (R-47-3, §3.1).
import { resolve, blockSchema } from './resolve.mjs';
import { setAttr } from './tree.mjs';

const WIDTHS = [ 375, 768, 1440 ];
const TOL = 2;

// The number settings of a block the framework database ties to `flex` whose slot calibration measured: [{ attr, slot }].
export function countSettings( db, block, cal ) {
	const schema = blockSchema( block ) || {};
	return db.prepare( "SELECT attr_name FROM block_attributes WHERE block_slug = ? AND css_property = 'flex' AND css_state IS NULL" ).all( block )
		.map( ( r ) => r.attr_name )
		.filter( ( attr ) => [].concat( schema[ attr ]?.type || [] ).includes( 'number' ) && 'string' === typeof cal?.settings?.[ attr ]?.slot )
		.map( ( attr ) => ( { attr, slot: cal.settings[ attr ].slot } ) );
}

// The cards of `cards` ({ rect }) on the first card's row (their boxes overlap by more than half its height) that lie
// inside `track` ({ rect }) up to a tolerance; with no track box, the cards on the row. 0 when no card is drawn.
export function visibleCount( track, cards ) {
	const drawn = cards.filter( ( c ) => c?.rect && c.rect.w > 0 && false !== c.inFlow );
	if ( ! drawn.length ) {
		return 0;
	}
	const first = drawn[ 0 ].rect;
	const row = drawn.filter( ( c ) => Math.min( first.y + first.h, c.rect.y + c.rect.h ) - Math.max( first.y, c.rect.y ) > first.h / 2 );
	const t = track?.rect;
	return t ? row.filter( ( c ) => c.rect.x >= t.x - TOL && c.rect.x + c.rect.w <= t.x + t.w + TOL ).length : row.length;
}

// Fill's pass for one node: decides and writes the node's count setting from the draft's render. Returns { attr } when a
// setting was judged, else null. st: Fill's state (lib/fill-resolve-state.mjs::makeState).
export function fillVisibleCount( st, rec, ref, cal ) {
	const node = st.flat[ rec.index ];
	const root = rec.targets.find( ( t ) => '' === t.slot );
	if ( ! st.db || ! root || ! rec.children?.length ) {
		return null;
	}
	const setting = countSettings( st.db, rec.name, cal )[ 0 ];
	if ( ! setting ) {
		return null;
	}
	const kids = rec.children.map( ( i ) => st.nodes[ i ]?.targets.find( ( t ) => '' === t.slot ) ).filter( Boolean );
	const perWidth = {};
	for ( const w of WIDTHS ) {
		const read = ( t ) => st.reads.widths?.[ w ]?.[ t.id ];
		const n = visibleCount( read( root ), kids.map( read ) );
		n > 0 && ( perWidth[ w ] = n );
	}
	if ( ! Object.keys( perWidth ).length ) {
		return null;
	}
	const shown = Object.entries( perWidth ).map( ( [ w, n ] ) => `${ w }: ${ n }` ).join( ', ' );
	const res = resolve( { block: rec.name, prop: 'flex', slot: setting.slot, count: true, perWidth, current: node.attributes || {} }, { db: st.db, calibration: cal, snapshot: st.snapshot ?? null, log: [] } );
	const write = res.writes?.find( ( w ) => w.attr === setting.attr );
	if ( ! write ) {
		st.out.unmapped.push( { node: ref, block: rec.name, slot: setting.slot, property: 'flex', value: shown, reason: `${ res.gap ?? 'gap' }: ${ res.detail ?? `the resolver wrote no ${ setting.attr }` } (cards side by side at ${ shown })`, ...( res.code ? { code: res.code } : {} ) } );
		return { attr: setting.attr };
	}
	const { before, after } = setAttr( node, { ...write, merge: 'replace' } );
	st.out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: setting.slot, prop: 'flex', attr: setting.attr, before, after, widths: Object.keys( perWidth ).map( Number ), how: 'visible-count', note: `cards side by side at ${ shown }` } );
	return { attr: setting.attr };
}
