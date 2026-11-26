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

// A card the visitor cannot see though it has a box: at opacity 0 (a fade slider's resting cards) or visibility hidden.
const unseen = ( c ) => 0 === c.view?.opacity || [ 'hidden', 'collapse' ].includes( c.view?.visibility );

// The horizontal span [ left, right ] a read element shows through: its box cut to its nearest clipping ancestor's box and
// to the page (each when the read carries it). null for no box, or a box with no width (a track drawn as display: contents).
const spanOf = ( r ) => {
	if ( ! r?.rect || ! ( r.rect.w > 0 ) ) {
		return null;
	}
	let [ l, rt ] = [ r.rect.x, r.rect.x + r.rect.w ];
	r.view?.clip && ( [ l, rt ] = [ Math.max( l, r.view.clip.x ), Math.min( rt, r.view.clip.x + r.view.clip.w ) ] );
	r.view?.page > 0 && ( [ l, rt ] = [ Math.max( l, 0 ), Math.min( rt, r.view.page ) ] );
	return [ l, rt ];
};

// How many of `cards` (reads: { rect, inFlow, view }) a visitor sees side by side: the drawn, seen cards on the first card's
// row (boxes overlapping by more than half its height) whose box lies, up to a tolerance, inside the span `track` shows
// through, inside the card's own clipping ancestors and inside the page (a swipe track's cards past its edge, or peeking in at it, are not
// visible); a card overlapping one already counted by more than half its width is the same place (a stacked fade slider's
// cards). With no track box (or one with no width), the track span is not applied. 0 when no card is drawn or none lies
// inside; 1 when none fits because a card is wider than the span it shows through.
export function visibleCount( track, cards ) {
	const drawn = cards.filter( ( c ) => c?.rect && c.rect.w > 0 && false !== c.inFlow && ! unseen( c ) );
	if ( ! drawn.length ) {
		return 0;
	}
	const first = drawn[ 0 ].rect;
	const row = drawn.filter( ( c ) => Math.min( first.y + first.h, c.rect.y + c.rect.h ) - Math.max( first.y, c.rect.y ) > first.h / 2 );
	const t = spanOf( track );
	const spans = ( c ) => [ t, c.view?.clip ? [ c.view.clip.x, c.view.clip.x + c.view.clip.w ] : null, c.view?.page > 0 ? [ 0, c.view.page ] : null ].filter( Boolean );
	const fits = ( c ) => spans( c ).every( ( s ) => c.rect.x >= s[ 0 ] - TOL && c.rect.x + c.rect.w <= s[ 1 ] + TOL );
	const counted = [];
	for ( const c of row.filter( fits ) ) {
		const over = ( k ) => Math.min( k.rect.x + k.rect.w, c.rect.x + c.rect.w ) - Math.max( k.rect.x, c.rect.x );
		! counted.some( ( k ) => over( k ) > Math.min( k.rect.w, c.rect.w ) / 2 ) && counted.push( c );
	}
	// A card wider than the span it shows through, and partly inside every span, still shows one card; cards that are only off
	// a span (or behind one with no width) show none.
	const partly = ( c ) => spans( c ).every( ( s ) => Math.min( c.rect.x + c.rect.w, s[ 1 ] ) - Math.max( c.rect.x, s[ 0 ] ) > 0 );
	return counted.length || ( row.some( ( c ) => partly( c ) && spans( c ).some( ( s ) => c.rect.w > s[ 1 ] - s[ 0 ] + TOL ) ) ? 1 : 0 );
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
