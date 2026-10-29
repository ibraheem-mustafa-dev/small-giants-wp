// The ground each colour sits on, read in the page beside the 1440 rest reading (lib/intake-reading.mjs::readSurface's
// `probe`) for the palette proposal (lib/intake-palette.mjs). A ground is the nearest painted background at or above an
// element (its own, else an ancestor's, else the page ground): a colour, a gradient's stop nearest its middle, or
// unknown (null) for an image; the page ground is the canvas colour (the
// html background, else the body background that propagates to the canvas, else the browser's white canvas) and the
// page text is the body's colour. Footers are the `footer` elements and `role="contentinfo"` landmarks not inside
// another one, each with its ground (its own background or the one it inherits). An element "holds text" when one of
// its own child nodes is visible, non-blank text; its character count is that text's length. An element is on a
// brand channel when it is, or sits inside, a link: the page records the link's address and the route names the
// registry brand that address opens (lib/intake-siteinfo-shape.mjs::channelOfAddress). Everything is read from rendered
// structure and the links' own addresses; no class or token name is consulted.
import fs from 'fs';
import path from 'path';
import { colourHex } from './tokens.mjs';

// In-page. in: [ rootSelector ]. { page: { ground, text, htmlBg, bodyBg }, grounds: { [path]: colour }, texts: { [path]:
// characters }, channels: { [path]: the address of the link the element sits in }, footers: [{ path, ground, own }] } with raw computed colour strings;
// `path` is the reading record's path for the same element.
export function readGrounds( [ rootSelector ] ) {
	const painted = ( c ) => !! c && 'transparent' !== c && ! /^rgba\([^)]*,\s*0\)$/.test( c );
	const bg = ( e ) => getComputedStyle( e ).backgroundColor;
	const html = document.documentElement;
	const body = document.body;
	const ground = painted( bg( html ) ) ? bg( html ) : body && painted( bg( body ) ) ? bg( body ) : 'rgb(255, 255, 255)';
	// A gradient ground is its stop nearest the middle; an image ground is unknown (null).
	const middleStop = ( image ) => {
		const stops = [ ...image.matchAll( /(rgba?\([^)]*\))\s*([\d.]+%)?/g ) ].map( ( m, i, all ) => ( { colour: m[ 1 ], at: m[ 2 ] ? parseFloat( m[ 2 ] ) : ( 100 * i ) / Math.max( 1, all.length - 1 ) } ) );
		return stops.sort( ( a, b ) => Math.abs( a.at - 50 ) - Math.abs( b.at - 50 ) )[ 0 ]?.colour ?? null;
	};
	const groundOf = ( e ) => {
		for ( let x = e; x && x !== html; x = x.parentElement ) {
			const image = getComputedStyle( x ).backgroundImage;
			if ( image && 'none' !== image && /url\(|gradient\(/.test( image ) ) {
				return /url\(/.test( image ) ? null : middleStop( image );
			}
			if ( painted( bg( x ) ) ) {
				return bg( x );
			}
		}
		return ground;
	};
	const root = document.querySelector( rootSelector );
	const pathOf = ( e ) => {
		const parts = [];
		for ( let x = e; x && x !== root; x = x.parentElement ) {
			parts.unshift( `${ x.tagName.toLowerCase() }:nth-child(${ [ ...x.parentElement.children ].indexOf( x ) + 1 })` );
		}
		return [ rootSelector, ...parts ].join( ' > ' );
	};
	const ownText = ( e ) => ( e.getClientRects().length > 0 ? [ ...e.childNodes ].filter( ( n ) => 3 === n.nodeType ).map( ( n ) => n.textContent.trim() ).join( ' ' ).trim().length : 0 );
	const linkOf = ( e ) => { const a = e.closest( 'a[href]' ); return a ? a.getAttribute( 'href' ).trim() : ''; };
	const grounds = {};
	const texts = {};
	const channels = {};
	if ( root ) {
		for ( const e of [ root, ...root.querySelectorAll( '[data-dc-tpl]' ) ] ) {
			if ( e.hasAttribute( 'data-dc-tpl' ) ) {
				const at = pathOf( e );
				grounds[ at ] = groundOf( e );
				const n = ownText( e );
				n && ( texts[ at ] = n );
				linkOf( e ) && ( channels[ at ] = linkOf( e ) );
			}
		}
	}
	const marks = [ ...document.querySelectorAll( 'footer, [role="contentinfo"]' ) ];
	const footers = marks.filter( ( f ) => ! marks.some( ( o ) => o !== f && o.contains( f ) ) ).filter( ( f ) => f.getClientRects().length > 0 )
		.map( ( f ) => ( { path: root && root.contains( f ) ? pathOf( f ) : f.tagName.toLowerCase(), ground: groundOf( f ), own: painted( bg( f ) ) } ) );
	return { page: { ground, text: body ? getComputedStyle( body ).color : getComputedStyle( html ).color, htmlBg: bg( html ), bodyBg: body ? bg( body ) : null }, grounds, texts, channels, footers };
}

// The colours the draft's code gives its live status messages, painted or not at rest: an element whose markup is a
// status (`role="status"`, `aria-live="polite"`) or an alert (`role="alert"`, `aria-live="assertive"`) and whose inline
// style sets `color`. Rows { hex, property: 'status-color', draftId: '<file>:code', count, tag: 'status'|'alert' }.
export function statusUsage( folder ) {
	const rows = new Map();
	for ( const file of fs.readdirSync( folder ).filter( ( f ) => f.endsWith( '.dc.html' ) ) ) {
		const text = fs.readFileSync( path.join( folder, file ), 'utf8' );
		for ( const tagText of text.match( /<[a-z][a-z0-9-]*\b[^<>]*>/gi ) || [] ) {
			const kind = /\brole\s*=\s*["']status["']|\baria-live\s*=\s*["']polite["']/i.test( tagText ) ? 'status'
				: /\brole\s*=\s*["']alert["']|\baria-live\s*=\s*["']assertive["']/i.test( tagText ) ? 'alert' : null;
			const colour = kind ? /\bstyle\s*=\s*["'](?:[^"']*[;\s])?color\s*:\s*([^;"']+)/i.exec( tagText )?.[ 1 ] : null;
			const hex = colour ? colourHex( colour.trim() ) : null;
			if ( hex ) {
				const k = `${ hex }\u0000${ file }\u0000${ kind }`;
				const r = rows.get( k ) || { hex, property: 'status-color', draftId: `${ file }:code`, count: 0, tag: kind };
				r.count++;
				rows.set( k, r );
			}
		}
	}
	return [ ...rows.values() ];
}

// The usage rows the probe adds for one surface: the page ground as the body's background and the page text as the
// body's colour (tag `body`), and each footer's ground as `footer-ground` (with `inherited` when the footer paints no
// background of its own). `surface` names the draft ID of the page rows.
export function groundUsage( probed, surface ) {
	const rows = [];
	const page = colourHex( probed?.page?.ground );
	const text = colourHex( probed?.page?.text );
	page && rows.push( { hex: page, property: 'background-color', draftId: `${ surface }:page`, count: 1, tag: 'body' } );
	text && rows.push( { hex: text, property: 'color', draftId: `${ surface }:page`, count: 1, tag: 'body', ground: page } );
	for ( const f of probed?.footers ?? [] ) {
		const hex = colourHex( f.ground );
		hex && rows.push( { hex, property: 'footer-ground', draftId: `${ surface }:${ f.path }`, count: 1, tag: 'footer', ...( f.own ? {} : { inherited: true } ) } );
	}
	return rows;
}
