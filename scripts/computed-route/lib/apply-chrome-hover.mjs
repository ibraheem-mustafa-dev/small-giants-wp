// Chrome rules, hover looks the draft's records state: the drawer's row shift and caret glow (sgs/nav-drawer-menu), the drawer
// panel's text shift, card lift and tilt (sgs/mega-panel), and the footer list's text shift (sgs/icon-list). Every value is the
// record's own `to`; a record that is absent leaves the setting alone.
import { reachOf } from './apply-skeleton.mjs';
import { hoverTo, recordsOf, rotation, scaleOf, settle, translate } from './apply-chrome-records.mjs';

const GLOW = /^(.*?)\s+((?:rgba?|hsla?)\([^)]*\)|#[0-9a-f]{3,8})$/i;

function drawerMenu( ctx ) {
	const records = recordsOf( ctx );
	const out = [];
	const shift = hoverTo( records, 'transform' );
	const px = shift && translate( shift.value );
	if ( null !== px && null !== shift ) {
		out.push( settle( { prop: 'itemPaddingShiftHover', why: `${ ctx.target.tpl } row text shifts ${ px }px on hover (${ shift.record.id })`, saved: ctx.saved, writes: [ { attr: 'itemPaddingShiftHover', value: `${ px }px` } ], record: shift.record.id, state: 'hover' } ) );
	}
	const glow = hoverTo( records, 'box-shadow' );
	const parts = glow && GLOW.exec( glow.value );
	if ( parts ) {
		out.push( settle( { prop: 'caretBoxShadowHover', why: `the caret circle takes a ${ parts[ 1 ] } glow on hover (${ glow.record.id })`, saved: ctx.saved, writes: [ { attr: 'caretBoxShadowHover', value: parts[ 1 ] }, { attr: 'caretBoxShadowColourHover', value: parts[ 2 ] } ], record: glow.record.id, state: 'hover' } ) );
	}
	return out;
}

// The drawer reuses the mega posts: a panel's rows, aside card, sector cards and arrows hover in the drawer as the drawer's skeleton
// surface records them. Its mega-aside and mega-group nodes name which records belong to the aside and which to the rows or cards;
// the panel's own content (an aside block, or none) says which of them it draws.
// The skeleton surface that holds the nav drawer: the one whose mega-panel renders inside it.
const drawerNodes = ( skeleton ) => skeleton?.find( ( s ) => s.nodes.some( ( n ) => 'sgs/nav-drawer' === n.b ) )?.nodes;
const hovers = ( records ) => records.filter( ( r ) => 'hover' === r.trigger?.type );
const describes = ( r, re ) => re.test( r.element?.description ?? '' );

function megaPanel( ctx ) {
	const nodes = drawerNodes( ctx.skeleton );
	if ( ! nodes ) {
		return [];
	}
	const within = ( block ) => nodes.filter( ( n ) => block === n.b ).flatMap( ( n ) => reachOf( nodes, n ) );
	const named = ( ids ) => hovers( recordsOf( { target: { owns: ids, tpl: ctx.target.tpl }, recordsIndex: ctx.recordsIndex } ) );
	const aside = named( within( 'sgs/mega-aside' ) );
	const group = named( within( 'sgs/mega-group' ) );
	const hasAside = Object.values( ctx.all?.blocks ?? {} ).some( ( b ) => 'sgs/mega-aside' === b.block );
	const out = [];
	const add = ( prop, value, record ) => out.push( settle( { prop, why: `${ ctx.target.tpl } ${ prop } ${ value } from the drawer's ${ record.id }`, saved: ctx.saved, writes: [ { attr: prop, value } ], record: record.id, state: 'hover' } ) );
	const pick = ( list, re, axis ) => {
		for ( const r of list.filter( ( x ) => ! re || describes( x, re ) ) ) {
			const t = hoverTo( [ r ], 'transform' );
			if ( t && null !== ( 'rot' === axis ? rotation( t.value ) : translate( t.value, axis ) ) ) {
				return { r, t };
			}
		}
		return null;
	};
	const text = pick( group, /\.label/, 'X' );
	text && add( 'drawerLinkTextShiftHover', translate( text.t.value ), text.r );
	const lift = hasAside ? pick( aside, null, 'Y' ) : pick( group.filter( ( r ) => /^a\b/.test( r.element?.description ?? '' ) ), null, 'Y' );
	lift && add( 'drawerCardHoverLift', Math.abs( translate( lift.t.value, 'Y' ) ), lift.r );
	const tilt = hasAside ? null : pick( group.filter( ( r ) => /^a\b/.test( r.element?.description ?? '' ) ), null, 'rot' );
	tilt && add( 'drawerCardHoverRotate', rotation( tilt.t.value ), tilt.r );
	const arrow = pick( hasAside ? aside : group, /^span \{\{ arrowIcon \}\}$/, 'X' );
	arrow && add( 'drawerCardLinkShiftHover', translate( arrow.t.value ), arrow.r );
	const fade = group.find( ( r ) => describes( r, /arrowIcon/ ) && hoverTo( [ r ], 'opacity' ) );
	if ( fade && ! hoverTo( [ fade ], 'color' ) ) {
		out.push( { status: 'no-setting', prop: 'drawerLinkTrailingColourHover', why: `${ fade.id } gives the row arrow's opacity only; its hover colour needs a pointer read inside the opened accordion, which the drawer config does not open for this surface` } );
	}
	return out;
}

// A brand tile's hover in the drawer: scale and shadow have gallery settings; the lift and border go through sgsMotion hover on
// the gallery's item part (the motion family), not a gallery attribute.
function gallery( ctx ) {
	const nodes = drawerNodes( ctx.skeleton );
	if ( ! nodes ) {
		return [];
	}
	const panel = nodes.find( ( n ) => 'sgs/mega-panel' === n.b );
	const tile = hovers( recordsOf( { target: { owns: reachOf( nodes, panel ), tpl: ctx.target.tpl }, recordsIndex: ctx.recordsIndex } ) ).find( ( r ) => hoverTo( [ r ], 'border-color' ) && scaleOf( hoverTo( [ r ], 'transform' )?.value ) );
	if ( ! tile ) {
		return [];
	}
	const scale = scaleOf( hoverTo( [ tile ], 'transform' ).value );
	const glow = GLOW.exec( hoverTo( [ tile ], 'box-shadow' )?.value ?? '' );
	const writes = [ { attr: 'scaleHover', value: String( scale ) }, ...( glow ? [ { attr: 'shadowHover', value: glow[ 1 ] }, { attr: 'shadowHoverColour', value: glow[ 2 ] } ] : [] ) ];
	return [ settle( { prop: 'scaleHover', why: `${ ctx.target.tpl } tile scales ${ scale } with a shadow on hover (${ tile.id })`, saved: ctx.saved, writes, record: tile.id, state: 'hover' } ) ];
}

// A list item whose gap widens on hover: the text moves away from its bullet by the difference.
function iconList( ctx ) {
	const gap = hoverTo( recordsOf( ctx ), 'gap' );
	const grow = gap && parseFloat( gap.value ) - parseFloat( gap.from );
	return Number.isFinite( grow ) && grow > 0 ? [ settle( { prop: 'itemTextShiftHover', why: `${ ctx.target.tpl } list text moves ${ grow }px from its bullet on hover (${ gap.record.id })`, saved: ctx.saved, writes: [ { attr: 'itemTextShiftHover', value: grow } ], record: gap.record.id, state: 'hover' } ) ] : [];
}

export function hoverRule( ctx ) {
	if ( ctx.target.slot ) {
		return [];
	}
	return { 'sgs/nav-drawer-menu': drawerMenu, 'sgs/mega-panel': megaPanel, 'sgs/gallery': gallery, 'sgs/icon-list': iconList }[ ctx.block ]?.( ctx ) ?? [];
}
