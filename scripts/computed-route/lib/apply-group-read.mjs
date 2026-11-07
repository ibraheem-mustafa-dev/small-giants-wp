// The applier's card-hover read. A card that is hovered as one (a hover group) changes its children together, so each such card
// is hovered once by a real pointer and every element inside it that is a block (a draft template element, or a live block's
// `cr-ref-*` class) is read at rest and under that hover with the same read the state families use (lib/apply-hover.mjs). The
// pointer lands on the card's own padding where it can, so no child sits under it and a child's own hover never counts.
import { HOVER_PROPS, hoverStyles } from '../../parity/lib/collect.mjs';
import { PAINT_SRC } from '../../parity/lib/paint.mjs';
import { attrRow } from './db.mjs';
import { recordsFor, stateLook } from './apply-records.mjs';

const FLAGS = [ 'hoverAsCard', 'sgsBlockLink', 'sgsBlockLinkAuto' ];

// The keys of the surface's cards to hover as one: a block already holding a hover group flag, or a block that can hold one
// (the DB row) whose own draft element has a hover record and whose box reaches another element with one.
export function groupHosts( { surface, saved, recordsIndex, db = null } ) {
	const hovers = ( tpl ) => recordsFor( recordsIndex, tpl ).some( ( r ) => 'hover' === stateLook( r )?.state );
	return surface.pairs.filter( ( t ) => {
		const b = saved?.[ t.ref ];
		if ( t.slot || ! b ) {
			return false;
		}
		if ( FLAGS.some( ( f ) => b.attrs?.[ f ] ) ) {
			return true;
		}
		const prefix = String( t.tpl ).replace( /\/\d+#\d+$/, '' );
		return Boolean( db && attrRow( db, b.block, 'hoverAsCard' ) && hovers( t.tpl ) && ( t.reach ?? [] ).some( ( id ) => hovers( `${ prefix }/${ id }#0` ) ) );
	} ).map( ( t ) => t.key ?? t.ref );
}

// A child's facts under its card's hover (`hoverHost` on a check): the card read's entry for the child, shaped as facts. `own` is the
// child's own read, whose `fx` (an ambient float, a magnet) the judge discounts from the hover pose: a floating child's scale and
// travel at the moment of the read are the float's as well as the hover's.
export function hostedFacts( host, ref, own = null ) {
	const child = host?.group?.children?.find( ( k ) => k.key === ref );
	return child ? { styles: child.rest, hover: child.hover, fx: own?.fx ?? null } : undefined;
}

// In-page: the blocks inside the card as [ { key, finder, box, text } ], and a point on the card no child holds.
export function groupScan( [ finder, resolveSrc, side ] ) {
	// eslint-disable-next-line no-new-func
	const el = new Function( `return (${ resolveSrc });` )()( finder );
	if ( ! el ) {
		return null;
	}
	el.scrollIntoView( { block: 'center', inline: 'nearest', behavior: 'instant' } );
	document.querySelectorAll( '[data-sgs-gscan]' ).forEach( ( n ) => n.removeAttribute( 'data-sgs-gscan' ) );
	const seen = new Set();
	const children = [];
	for ( const node of el.querySelectorAll( 'draft' === side ? '[data-dc-tpl]' : '[class*="cr-ref-"]' ) ) {
		let key = null;
		if ( 'draft' === side ) {
			const host = node.closest( '.sc-host' );
			const id = node.getAttribute( 'data-dc-tpl' );
			const nth = host ? [ ...host.querySelectorAll( `[data-dc-tpl="${ id }"]` ) ].filter( ( x ) => x.closest( '.sc-host' ) === host ).indexOf( node ) : 0;
			key = `${ host?.dataset.scName ?? 'Root' }/${ id }#${ nth }`;
		} else {
			key = /cr-ref-[\w-]+/.exec( node.getAttribute( 'class' ) )?.[ 0 ];
		}
		const r = node.getBoundingClientRect();
		if ( ! key || seen.has( key ) || r.width * r.height <= 0 || children.length >= 40 ) {
			continue;
		}
		seen.add( key );
		// The read finds each element by a mark set here: a draft element's address is only unique within its host.
		node.setAttribute( 'data-sgs-gscan', String( children.length ) );
		children.push( { key, finder: `[data-sgs-gscan="${ children.length }"]`, box: { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }, text: ( node.textContent || '' ).trim().slice( 0, 80 ) } );
	}
	const own = 'a,button,input,select,textarea,summary,[role="button"],[role="link"]';
	const r = el.getBoundingClientRect();
	const left = Math.max( r.left, 0 );
	const right = Math.min( r.right, document.documentElement.clientWidth );
	const top = Math.max( r.top, 0 );
	const bottom = Math.min( r.bottom, document.documentElement.clientHeight );
	const spots = [];
	for ( const fx of [ 0.04, 0.5, 0.96, 0.25, 0.75, 0.1, 0.9 ] ) {
		for ( const fy of [ 0.04, 0.96, 0.5, 0.25, 0.75, 0.1, 0.9 ] ) {
			spots.push( [ left + ( right - left ) * fx, top + ( bottom - top ) * fy ] );
		}
	}
	const free = ( x, y ) => {
		const hit = document.elementFromPoint( x, y );
		return hit && el.contains( hit ) ? hit : null;
	};
	const spot = spots.find( ( [ x, y ] ) => free( x, y ) === el ) ?? spots.find( ( [ x, y ] ) => {
		const hit = free( x, y );
		const holder = hit?.closest( own );
		// The card's own link is an overlay anchor covering it: the pointer on it is the pointer on the card.
		const cover = holder && holder.getBoundingClientRect();
		return hit && ( ! holder || holder === el || holder.contains( el ) || ( 'A' === holder.tagName && ! holder.children.length && cover.width >= r.width * 0.9 && cover.height >= r.height * 0.9 ) );
	} );
	const hits = spots.slice( 0, 6 ).map( ( [ x, y ] ) => { const h = document.elementFromPoint( x, y ); return `${ h?.tagName }.${ ( h?.getAttribute?.( 'class' ) || '' ).slice( 0, 30 ) }${ h && el.contains( h ) ? '+' : '-' }`; } );
	return { children, hits, card: { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }, box: [ r.left, r.top, r.width, r.height ], point: right > left && bottom > top && spot ? { x: spot[ 0 ], y: spot[ 1 ] } : null };
}

const read = ( page, child, resolveSrc ) => page.evaluate( hoverStyles, [ child.finder, [ ...HOVER_PROPS, 'border-top-width', 'transition-duration', 'transition-timing-function' ], resolveSrc, PAINT_SRC, { paintPart: true } ] );

// { cardKey: { unreached } | { card: box, children: [ { key, box, text, rest, hover } ] } } for each card key. `settled` is
// lib/apply-hover.mjs::settled, passed in so the two files do not import each other.
export async function groupRead( page, { keys, finderOf, resolveSrc, side, settled, wait = 700 } ) {
	const out = {};
	for ( const key of keys ) {
		await settled( page, finderOf( key ), resolveSrc );
		await page.mouse.move( 1, 1 );
		await page.waitForTimeout( 450 );
		const scan = await page.evaluate( groupScan, [ finderOf( key ), resolveSrc, side ] );
		if ( ! scan?.point || ! scan.children.length ) {
			out[ key ] = { unreached: true, why: scan ? `no free point ${ JSON.stringify( [ scan.box, scan.hits ] ) }` : 'card not found' };
			continue;
		}
		const rest = {};
		for ( const c of scan.children ) {
			rest[ c.key ] = await read( page, c, resolveSrc );
		}
		// Smooth scrolling can carry the page on after the scan, so each landing is confirmed and the point found again.
		let point = scan.point;
		let over = false;
		for ( let tries = 0; tries < 3 && ! over; tries++ ) {
			await page.mouse.move( point.x, point.y );
			await page.waitForTimeout( 120 );
			over = await page.evaluate( ( [ f, src ] ) => !! new Function( `return (${ src });` )()( f )?.matches( ':hover' ), [ finderOf( key ), resolveSrc ] );
			if ( ! over ) {
				await page.waitForTimeout( 400 );
				point = ( await page.evaluate( groupScan, [ finderOf( key ), resolveSrc, side ] ) )?.point ?? point;
			}
		}
		if ( ! over ) {
			out[ key ] = { unreached: true, why: 'the pointer never landed on the card' };
			await page.mouse.move( 1, 1 );
			continue;
		}
		await page.waitForTimeout( wait );
		const children = [];
		for ( const c of scan.children ) {
			children.push( { key: c.key, box: c.box, text: c.text, rest: rest[ c.key ], hover: await read( page, c, resolveSrc ) } );
		}
		out[ key ] = { children, card: scan.card };
		await page.mouse.move( 1, 1 );
		await page.waitForTimeout( 150 );
	}
	return out;
}
