// Width-gated content (Spec 48 FR-48-50, FR-48-79): content the draft's logic shows or hides by viewport width (an sc-if on
// `isM`, on `w >= 1260`) is written as a hiding rule on the block that holds it, never dropped. The fact record holds each
// sc-if's width condition (lib/read-logic-conditions.mjs::widthConditions, `elements[key].logic.width`) and each element's
// enclosing sc-ifs (`template.membership.scIf`). For a skeleton node whose draft element sits inside gated sc-ifs:
//   1. the widths the content is hidden at are the complement of the intersection of the gates' shown widths;
//   2. a boundary at or within 5% of a tier (768, 1024) snaps to the tier, with a `breakpoint-snap` ledger entry (distance in px);
//   3. a hidden range whose boundaries are all tiers writes the conditional-visibility flags (sgsHideOnMobile, sgsHideOnTablet,
//      sgsHideOnDesktop; the block must hold them, by the framework DB);
//   4. otherwise, when the block holds its own numeric breakpoint setting (the framework DB: collapsePoint) and the gate is one
//      threshold, that setting is written with the threshold;
//   5. otherwise a bounded `@media` rule in the block's Additional CSS (`sgsCustomCss`, scoped to the instance by
//      includes/custom-css.php), with the scope key `sgsCustomCssId` and the label `sgsCustomCssNote` naming the rule.
// A skeleton node whose parent is gated the same way is not written again (the parent hides it). Both branches of a width
// alternative are nodes of the skeleton, each hidden on the other's widths. A condition whose width part is only part of the
// condition (`partial`) hides only where its width part is false.

import { setAttr } from './tree.mjs';

export const TIERS = [ 768, 1024 ];
export const SNAP_TOLERANCE = 0.05;
export const HIDE_ATTR = { mobile: 'sgsHideOnMobile', tablet: 'sgsHideOnTablet', desktop: 'sgsHideOnDesktop' };
// The width range each tier covers: [ start, end ).
export const TIER_RANGES = { mobile: [ 0, TIERS[ 0 ] ], tablet: [ TIERS[ 0 ], TIERS[ 1 ] ], desktop: [ TIERS[ 1 ], Infinity ] };

const CMP = { '<': ( w, n ) => w < n, '<=': ( w, n ) => w <= n, '>': ( w, n ) => w > n, '>=': ( w, n ) => w >= n, '==': ( w, n ) => w === n };

// Whether a width condition holds (shows its content) at width `w`.
export function holds( c, w ) {
	if ( c.all ) {
		return c.all.every( ( x ) => holds( x, w ) );
	}
	if ( c.any ) {
		return c.any.some( ( x ) => holds( x, w ) );
	}
	if ( undefined !== c.bp ) {
		return c.is ? holds( c.when, w ) : ! holds( c.when, w );
	}
	return CMP[ c.w ]( w, c.n );
}

// The widths at which a condition changes, as whole pixels.
function boundaries( c ) {
	if ( c.all || c.any ) {
		return ( c.all || c.any ).flatMap( boundaries );
	}
	if ( undefined !== c.bp ) {
		return boundaries( c.when );
	}
	return [ '>', '<=' ].includes( c.w ) ? [ c.n + 1 ] : '==' === c.w ? [ c.n, c.n + 1 ] : [ c.n ];
}

// The ranges [ lo, hi ) of widths from 0 at which a condition shows its content, merged.
export function shownRanges( c ) {
	const pts = [ ...new Set( [ 0, ...boundaries( c ).filter( ( b ) => b > 0 ) ] ) ].sort( ( a, b ) => a - b );
	const out = [];
	pts.forEach( ( lo, i ) => {
		if ( ! holds( c, lo ) ) {
			return;
		}
		const hi = pts[ i + 1 ] ?? Infinity;
		out.length && out.at( -1 )[ 1 ] === lo ? ( out.at( -1 )[ 1 ] = hi ) : out.push( [ lo, hi ] );
	} );
	return out;
}

// The overlap of two lists of ranges.
export function intersect( a, b ) {
	return a.flatMap( ( [ l1, h1 ] ) => b.map( ( [ l2, h2 ] ) => [ Math.max( l1, l2 ), Math.min( h1, h2 ) ] ).filter( ( [ l, h ] ) => l < h ) );
}

// The complement of a list of ranges within [ 0, Infinity ).
export function complement( ranges ) {
	const out = [];
	let at = 0;
	for ( const [ lo, hi ] of [ ...ranges ].sort( ( x, y ) => x[ 0 ] - y[ 0 ] ) ) {
		lo > at && out.push( [ at, lo ] );
		at = Math.max( at, hi );
	}
	Infinity > at && out.push( [ at, Infinity ] );
	return out;
}

// FR-48-50 step 1: the tier a threshold snaps to, with its distance in px, or null (no tier within 5% of the tier, or the
// threshold is the tier). The nearest tier wins.
export function snapThreshold( t ) {
	const near = TIERS.map( ( tier ) => ( { tier, distance: Math.abs( t - tier ) } ) ).sort( ( a, b ) => a.distance - b.distance )[ 0 ];
	return near.distance > 0 && near.distance <= SNAP_TOLERANCE * near.tier ? near : null;
}

// The template key a finder names (`<chain>/<n>#<copy>` -> `<component>/<n>`), or null.
export function tplKey( finder ) {
	const m = /^(.+)\/(\d+)#\d+$/.exec( finder?.tpl || '' );
	return m ? `${ m[ 1 ].split( '>' ).pop().replace( /^(.*?)(?:@\d+)?(?:#\d+)?$/, '$1' ) }/${ m[ 2 ] }` : null;
}

// The widths a template element is shown at, from the width conditions of its enclosing sc-ifs: { shown, via } or null
// when no enclosing sc-if is gated by width.
export function shownAt( facts, key ) {
	const gates = ( facts?.elements?.[ key ]?.template?.membership?.scIf || [] ).filter( ( g ) => facts.elements[ g.key ]?.logic?.width );
	if ( ! gates.length ) {
		return null;
	}
	const shown = gates.map( ( g ) => shownRanges( facts.elements[ g.key ].logic.width ) ).reduce( ( a, b ) => intersect( a, b ) );
	return { shown, via: gates.map( ( g ) => facts.elements[ g.key ].logic.via || g.value ) };
}

// The snapped hidden ranges of a shown list: { hidden: [ [ lo, hi ] ], snaps: [ { draft, tier, distance } ] }.
export function hiddenRanges( shown ) {
	const snaps = [];
	const snap = ( t ) => {
		if ( 0 === t || Infinity === t ) {
			return t;
		}
		const s = snapThreshold( t );
		s && snaps.push( { draft: t, tier: s.tier, distance: s.distance } );
		return s ? s.tier : t;
	};
	const hidden = complement( shown ).map( ( [ lo, hi ] ) => [ snap( lo ), snap( hi ) ] ).filter( ( [ lo, hi ] ) => lo < hi );
	return { hidden, snaps };
}

// The tiers a list of hidden ranges covers, or null when a boundary is off-tier.
export function tiersOf( hidden ) {
	const edges = new Set( [ 0, ...TIERS, Infinity ] );
	if ( ! hidden.every( ( [ lo, hi ] ) => edges.has( lo ) && edges.has( hi ) ) ) {
		return null;
	}
	return Object.keys( TIER_RANGES ).filter( ( t ) => hidden.some( ( [ lo, hi ] ) => lo <= TIER_RANGES[ t ][ 0 ] && hi >= TIER_RANGES[ t ][ 1 ] ) );
}

// The scoped @media rule hiding a range (width in whole px; the rule `&` is the instance, includes/custom-css.php).
export function mediaRule( [ lo, hi ] ) {
	const cond = [ lo > 0 ? `(min-width: ${ lo }px)` : null, Infinity > hi ? `(max-width: ${ hi - 1 }px)` : null ].filter( Boolean ).join( ' and ' );
	return `@media ${ cond } { & { display: none; } }`;
}

// The numeric breakpoint setting a block holds, by framework-DB query, or null.
export function ownBreakpoint( db, block ) {
	return db.prepare( "SELECT attr_name FROM block_attributes WHERE block_slug = ? AND attr_type = 'number' AND (attr_name LIKE '%reakpoint%' OR attr_name LIKE '%ollapsePoint%') ORDER BY attr_name" ).all( block )[ 0 ]?.attr_name ?? null;
}

// Whether a block holds an attribute, by framework-DB query.
const holdsAttr = ( db, block, attr ) => !! db.prepare( 'SELECT 1 FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( block, attr );

// A divergence-ledger entry for one snap (FR-48-50 step 1), numbered after the entries already in the ledger.
function snapEntry( { scope, ref, snap, entries, date } ) {
	const reason = `the draft's width threshold ${ snap.draft }px snapped to the ${ snap.tier }px tier (distance ${ snap.distance }px, within 5% of the tier)`;
	if ( entries.some( ( e ) => e.node === ref && 'breakpoint' === e.property && e.reason === reason ) ) {
		return null;
	}
	const next = 1 + Math.max( 0, ...entries.map( ( e ) => Number( String( e.id ).replace( /^D-/, '' ) ) || 0 ) );
	return { id: `D-${ next }`, scope, node: ref, state: '*', property: 'breakpoint', expected: { rule: 'breakpoint-snap' }, reason, decided: `${ date } FR-48-50`, snap };
}

// Writes the width gates of every skeleton node. nodes: skeletonNodes(); flat: tree nodes by index; refOf: tree node to
// ref; facts: the fact record (null: nothing written); db: the framework DB; scope: the surface; entries: the ledger's
// entries (the snap entries continue its numbering). Returns { writes, unmapped, notes, ledger } in the shapes
// lib/fill-resolve.mjs uses; `ledger` holds the new snap entries.
export function widthGateWrites( { nodes, flat, refOf, facts, db, scope, entries = [], date = new Date().toISOString().slice( 0, 10 ) } ) {
	const out = { writes: [], unmapped: [], notes: [], ledger: [] };
	if ( ! facts ) {
		return out;
	}
	const gate = new Map();
	for ( const n of nodes ) {
		const key = tplKey( n.node.draftRef );
		const at = key ? shownAt( facts, key ) : null;
		at && gate.set( n.index, at );
	}
	for ( const n of nodes ) {
		const at = gate.get( n.index );
		const up = null === n.parent ? null : gate.get( n.parent );
		if ( ! at || ( up && JSON.stringify( up.shown ) === JSON.stringify( at.shown ) ) ) {
			continue;
		}
		const node = flat[ n.index ];
		const ref = refOf( node );
		const put = ( attr, value, prop ) => {
			const { before, after } = setAttr( node, { attr, value } );
			out.writes.push( { node: ref, index: n.index, block: n.name, slot: '', prop, attr, before, after, widths: [], how: 'width-gate' } );
		};
		const { hidden, snaps } = hiddenRanges( at.shown );
		const via = at.via.join( ' and ' );
		if ( ! hidden.length ) {
			continue;
		}
		if ( ! at.shown.length ) {
			out.unmapped.push( { node: ref, block: n.name, slot: '', property: 'width gate', value: via, reason: `width-gate: the draft's conditions (${ via }) hold at no width, so the content is never shown; nothing is written` } );
			continue;
		}
		for ( const s of snaps ) {
			const e = snapEntry( { scope, ref, snap: s, entries: [ ...entries, ...out.ledger ], date } );
			e && out.ledger.push( e );
		}
		const tiers = tiersOf( hidden );
		if ( tiers && tiers.length && tiers.every( ( t ) => holdsAttr( db, n.name, HIDE_ATTR[ t ] ) ) ) {
			tiers.forEach( ( t ) => put( HIDE_ATTR[ t ], true, `width gate (${ via }): hide on ${ t }` ) );
			out.notes.push( `${ ref } ${ n.name }: shown only at ${ at.shown.map( ( [ lo, hi ] ) => `${ lo }-${ Infinity === hi ? 'up' : hi - 1 }` ).join( ', ' ) } (${ via }); hidden on ${ tiers.join( ', ' ) }${ snaps.length ? `; snapped ${ snaps.map( ( s ) => `${ s.draft } to ${ s.tier }` ).join( ', ' ) }` : '' }` );
			continue;
		}
		const own = ownBreakpoint( db, n.name );
		const edges = hidden.flat().filter( ( x ) => x > 0 && Infinity > x );
		if ( own && 1 === new Set( edges ).size ) {
			put( own, edges[ 0 ], `width gate (${ via }): the block's own breakpoint` );
			out.notes.push( `${ ref } ${ n.name }: ${ via } written to its own setting ${ own } = ${ edges[ 0 ] }` );
			continue;
		}
		const css = hidden.map( mediaRule ).join( ' ' );
		const had = ( a ) => node.attributes?.[ a ] || '';
		if ( had( 'sgsCustomCss' ).includes( css ) ) {
			continue;
		}
		put( 'sgsCustomCss', [ had( 'sgsCustomCss' ), css ].filter( Boolean ).join( ' ' ), `width gate (${ via }): scoped @media rule` );
		put( 'sgsCustomCssId', had( 'sgsCustomCssId' ) || `wgate${ n.index }`.slice( 0, 16 ), 'width gate: scope key' );
		put( 'sgsCustomCssNote', [ had( 'sgsCustomCssNote' ), `Width gate ${ via }: hidden at ${ hidden.map( ( [ lo, hi ] ) => `${ lo }-${ Infinity === hi ? 'up' : hi - 1 }px` ).join( ', ' ) }` ].filter( Boolean ).join( '; ' ), 'width gate: label' );
		out.notes.push( `${ ref } ${ n.name }: ${ via } has no tier-aligned hiding setting and no breakpoint setting; written as a scoped @media rule in Additional CSS` );
	}
	return out;
}
