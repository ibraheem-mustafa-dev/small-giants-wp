// The ground each colour sits on, read in the page beside the 1440 rest reading (lib/intake-reading.mjs::readSurface's
// `probe`) for the palette proposal (lib/intake-palette.mjs). A ground is the nearest painted background colour at or
// above an element (its own, else an ancestor's, else the page ground); the page ground is the canvas colour (the
// html background, else the body background that propagates to the canvas, else the browser's white canvas) and the
// page text is the body's colour. Footers are the `footer` elements and `role="contentinfo"` landmarks not inside
// another one, each with its ground (its own background or the one it inherits). An element "holds text" when one of
// its own child nodes is visible, non-blank text. Everything is read from rendered
// structure; no class or token name is consulted.
import { colourHex } from './tokens.mjs';

// In-page. in: [ rootSelector ]. { page: { ground, text, htmlBg, bodyBg }, grounds: { [path]: colour }, texts: [path],
// footers: [{ path, ground, own }] } with raw computed colour strings; `path` is the reading record's path for the same
// element and `texts` lists the elements that hold text.
export function readGrounds( [ rootSelector ] ) {
	const painted = ( c ) => !! c && 'transparent' !== c && ! /^rgba\([^)]*,\s*0\)$/.test( c );
	const bg = ( e ) => getComputedStyle( e ).backgroundColor;
	const html = document.documentElement;
	const body = document.body;
	const ground = painted( bg( html ) ) ? bg( html ) : body && painted( bg( body ) ) ? bg( body ) : 'rgb(255, 255, 255)';
	const groundOf = ( e ) => {
		for ( let x = e; x && x !== html; x = x.parentElement ) {
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
	const holdsText = ( e ) => e.getClientRects().length > 0 && [ ...e.childNodes ].some( ( n ) => 3 === n.nodeType && n.textContent.trim() );
	const grounds = {};
	const texts = [];
	if ( root ) {
		for ( const e of [ root, ...root.querySelectorAll( '[data-dc-tpl]' ) ] ) {
			if ( e.hasAttribute( 'data-dc-tpl' ) ) {
				grounds[ pathOf( e ) ] = groundOf( e );
				holdsText( e ) && texts.push( pathOf( e ) );
			}
		}
	}
	const marks = [ ...document.querySelectorAll( 'footer, [role="contentinfo"]' ) ];
	const footers = marks.filter( ( f ) => ! marks.some( ( o ) => o !== f && o.contains( f ) ) ).filter( ( f ) => f.getClientRects().length > 0 )
		.map( ( f ) => ( { path: root && root.contains( f ) ? pathOf( f ) : f.tagName.toLowerCase(), ground: groundOf( f ), own: painted( bg( f ) ) } ) );
	return { page: { ground, text: body ? getComputedStyle( body ).color : getComputedStyle( html ).color, htmlBg: bg( html ), bodyBg: body ? bg( body ) : null }, grounds, texts, footers };
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
