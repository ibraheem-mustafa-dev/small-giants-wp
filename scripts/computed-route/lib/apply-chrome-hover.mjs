// Chrome rules, hover looks the draft's records state: the drawer's row shift and caret glow (sgs/nav-drawer-menu), the drawer
// panel's text shift, card lift and tilt (sgs/mega-panel), and the footer list's text shift (sgs/icon-list). Every value is the
// record's own `to`; a record that is absent leaves the setting alone.
import { reachOf } from './apply-skeleton.mjs';
import { hoverTo, recordsOf, rotation, scaleOf, settle, translate } from './apply-chrome-records.mjs';
import { rowIndentOff } from './apply-chrome-rows.mjs';
import { singleShadow } from './apply-chrome-cards.mjs';
import { asideCard, ownPanel } from './apply-chrome-aside.mjs';

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
	const parts = glow && singleShadow( glow.value ) && GLOW.exec( glow.value );
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
	// The draft draws link rows (and so the row arrow) only in a panel whose own drawer node holds a mega-group; a cards or brands panel has none.
	const own = ownPanel( nodes, ctx.surface );
	const ownRows = ! own || nodes.slice( own.index + 1, own.last + 1 ).some( ( n ) => 'sgs/mega-group' === n.b );
	const hasAside = Object.values( ctx.all?.blocks ?? {} ).some( ( b ) => 'sgs/mega-aside' === b.block );
	const out = hasAside ? asideCard( ctx, nodes ) : [];
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
	text && out.push( ...rowIndentOff( { all: ctx.all, shift: translate( text.t.value ), record: text.r.id } ) );
	const lift = hasAside ? pick( aside, null, 'Y' ) : pick( group.filter( ( r ) => /^a\b/.test( r.element?.description ?? '' ) ), null, 'Y' );
	lift && add( 'drawerCardHoverLift', Math.abs( translate( lift.t.value, 'Y' ) ), lift.r );
	const tilt = hasAside ? null : pick( group.filter( ( r ) => /^a\b/.test( r.element?.description ?? '' ) ), null, 'rot' );
	tilt && add( 'drawerCardHoverRotate', rotation( tilt.t.value ), tilt.r );
	const arrow = pick( hasAside ? aside : group, /^span \{\{ arrowIcon \}\}$/, 'X' );
	arrow && add( 'drawerCardLinkShiftHover', translate( arrow.t.value ), arrow.r );
	const fade = ownRows && group.find( ( r ) => describes( r, /arrowIcon/ ) && hoverTo( [ r ], 'opacity' ) );
	if ( fade && ! hoverTo( [ fade ], 'color' ) ) {
		// The record gives opacity only: the arrow keeps its own colour (the row's text colour, or the colour set for it) and reaches full opacity.
		const keep = ctx.saved.drawerLinkTrailingColour || ctx.saved.drawerLinkLabelColour;
		if ( keep ) {
			const writes = [ ...( 'arrow' === ctx.saved.drawerLinkTrailingIcon ? [] : [ { attr: 'drawerLinkTrailingIcon', value: 'arrow' } ] ), { attr: 'drawerLinkTrailingColourHover', value: keep } ];
			out.push( settle( { prop: 'drawerLinkTrailingColourHover', why: `${ ctx.target.tpl } the row arrow goes from 40% to full opacity on hover (${ fade.id }) in its own colour ${ keep }`, saved: ctx.saved, writes, record: fade.id, state: 'hover' } ) );
		} else {
			// The draft's row has an arrow: it is drawn even where its hover colour has no value to keep it at.
			out.push( settle( { prop: 'drawerLinkTrailingIcon', why: `${ ctx.target.tpl } the draft's link rows end in an arrow (${ fade.id })`, saved: ctx.saved, writes: [ { attr: 'drawerLinkTrailingIcon', value: 'arrow' } ], record: fade.id, state: 'hover' } ) );
			out.push( { status: 'no-setting', prop: 'drawerLinkTrailingColourHover', why: `${ fade.id } gives the row arrow's opacity only and the saved panel holds no row text colour to keep it at` } );
		}
	}
	out.push( ...tileBorder( ctx, nodes, own ) );
	return out;
}

// A gallery's tile in the panel's drawer copy turns its border to the colour the draft's drawer tile hover names (the tile record
// holds a scale and a border-colour), through the panel's drawer-only setting; the gallery's own hover colour stays the desktop's.
function tileBorder( ctx, nodes, own ) {
	if ( ! Object.values( ctx.all?.blocks ?? {} ).some( ( b ) => 'sgs/gallery' === b.block ) ) {
		return [];
	}
	const panels = own ? [ own ] : nodes.filter( ( n ) => 'sgs/mega-panel' === n.b );
	// Only a gallery drawn inside the panel has tiles the panel's setting governs; its tile is a record on that gallery's own draft ids.
	const owns = panels.flatMap( ( p ) => nodes.slice( p.index + 1, p.last + 1 ).filter( ( n ) => 'sgs/gallery' === n.b ).flatMap( ( g ) => reachOf( nodes, g ) ) );
	const tile = owns.length && hovers( recordsOf( { target: { owns, tpl: ctx.target.tpl }, recordsIndex: ctx.recordsIndex } ) ).find( ( r ) => hoverTo( [ r ], 'border-color' ) && scaleOf( hoverTo( [ r ], 'transform' )?.value ) );
	const colour = tile && hoverTo( [ tile ], 'border-color' ).value;
	return colour ? [ settle( { prop: 'drawerTileBorderColourHover', why: `${ ctx.target.tpl } the gallery tile border turns ${ colour } on hover in the drawer (${ tile.id })`, saved: ctx.saved, writes: [ { attr: 'drawerTileBorderColourHover', value: colour } ], record: tile.id, state: 'hover' } ) ] : [];
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
	const tileShadow = hoverTo( [ tile ], 'box-shadow' )?.value ?? '';
	const glow = singleShadow( tileShadow ) ? GLOW.exec( tileShadow ) : null;
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
