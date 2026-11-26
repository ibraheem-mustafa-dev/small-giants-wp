// How many items a track shows side by side (Spec 48 FR-48-1 declared forms, R-47-3 one engine, R-47-10): a block whose
// setting holds that count (a number setting the framework database ties to `flex`, such as the testimonial slider's
// `slidesVisible`) is never given the count by the skeleton, which carries no attribute with a css_property. Fill reads it
// from the draft's render instead: at each read width, the children's cards that sit on the first card's row and lie inside
// the track's box (a swipe track's cards that run past its edge, or peek in at it, are not visible). A setting that holds a
// per-device object (`{ desktop, tablet, mobile }`) takes each width's count; a setting that holds one number takes it when
// every width agrees, and counts that differ are a reported `shape` gap.
import { blockSchema } from './resolve.mjs';
import { setAttr } from './tree.mjs';

// The device tiers in the order a per-device object holds them, each with the width it is read at.
const TIERS = [ [ 'desktop', 1440 ], [ 'tablet', 768 ], [ 'mobile', 375 ] ];
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
// setting was judged (written or reported), else null: a node with no child cards, no such setting, or no card drawn at
// 1440 is left as it is. st: Fill's state (lib/fill-resolve-state.mjs::makeState).
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
	const tiers = {};
	for ( const [ tier, w ] of TIERS ) {
		const read = ( t ) => st.reads.widths?.[ w ]?.[ t.id ];
		const n = visibleCount( read( root ), kids.map( read ) );
		n > 0 && ( tiers[ tier ] = n );
	}
	if ( undefined === tiers.desktop ) {
		return null;
	}
	const shown = TIERS.filter( ( [ t ] ) => undefined !== tiers[ t ] ).map( ( [ t, w ] ) => `${ w }: ${ tiers[ t ] }` ).join( ', ' );
	const widths = TIERS.filter( ( [ t ] ) => undefined !== tiers[ t ] ).map( ( [ , w ] ) => w ).sort( ( a, b ) => a - b );
	const perDevice = [].concat( blockSchema( rec.name )?.[ setting.attr ]?.type || [] ).includes( 'object' );
	const counts = [ ...new Set( Object.values( tiers ) ) ];
	if ( ! perDevice && counts.length > 1 ) {
		st.out.unmapped.push( { node: ref, block: rec.name, slot: setting.slot, property: 'flex', value: shown, reason: `shape: ${ setting.attr } holds one value for every width; draft has ${ counts.join( ', ' ) } (cards side by side at ${ shown })` } );
		return { attr: setting.attr };
	}
	const { before, after } = setAttr( node, { attr: setting.attr, value: perDevice ? tiers : counts[ 0 ], merge: 'replace' } );
	st.out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: setting.slot, prop: 'flex', attr: setting.attr, before, after, widths, how: 'visible-count', note: `cards side by side at ${ shown }` } );
	return { attr: setting.attr };
}
