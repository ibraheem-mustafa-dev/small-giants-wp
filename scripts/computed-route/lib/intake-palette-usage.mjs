// The palette roles read from where each value paints in the draft (Spec 48 FR-48-31, §11 FR-33-2), for
// lib/intake-palette.mjs::proposePalette. Each rule picks the token value (a dedupe group) that a rendered fact names:
// the page ground and page text (the body), the footer's ground, the heading and link text colours, the divider lines,
// the grounds buttons paint, the other grounds, and the text colour most used on each ground. One value may fill
// several roles; each role goes to one value. For the divider lines and the muted text every colour competes, token or
// not: when the colour the draft uses most for that job is no token's (a one-off hex, R-47-7), no token takes the role.
// No token name is read here. A role read only from a count where the
// direct fact is missing (the page text when the body colour is no token's) is `weak`: a name hint may take its slug.
import { hexToLab } from './intake-palette.mjs';

export const SATURATED_C = 20;
const HEADING_TAG = /^h[1-6]$/i;
const BASE_TAG = /^(html|body|:root)$/i;
const BUTTON_TAG = /^(button|input|select|textarea)$/i;
export const isBackground = ( p ) => /^background(-color)?$/.test( p );
export const isBorder = ( p ) => /^(border|outline)(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?$/.test( p );

export const chroma = ( hex ) => {
	const l = hexToLab( hex );
	return Math.hypot( l.a, l.b );
};
const lightness = ( hex ) => hexToLab( hex ).L;
const opaque = ( hex ) => 1 === hexToLab( hex ).alpha;

// WCAG 2 contrast ratio between two hexes (alpha ignored).
export function contrast( x, y ) {
	const lum = ( hex ) => {
		const [ r, g, b ] = [ 1, 3, 5 ].map( ( k ) => {
			const c = parseInt( hex.slice( k, k + 2 ), 16 ) / 255;
			return c <= 0.04045 ? c / 12.92 : ( ( c + 0.055 ) / 1.055 ) ** 2.4;
		} );
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	};
	const [ a, b ] = [ lum( x ), lum( y ) ].sort( ( p, q ) => q - p );
	return ( a + 0.05 ) / ( b + 0.05 );
}

// The usage roles: { roles: Map group → [{ role, why, weak? }] in rule order, blocked: { role: hex } (a role whose job a
// one-off colour does most) }. `groups` are lib/intake-palette.mjs's
// dedupe groups ({ hex, hexes }); `uses` the normalised usage rows ({ hex, property, count, tag?, ground?, text? }).
// When no row says whether its element holds text, every colour row counts as text.
export function usageRoles( groups, uses ) {
	const of = new Map();
	groups.forEach( ( g ) => g.hexes.forEach( ( h ) => of.set( h, g ) ) );
	const valueOf = ( hex ) => of.get( hex ) || of.set( hex, { hex, hexes: new Set( [ hex ] ), oneOff: true } ).get( hex );
	const tally = ( keep, weight = ( u ) => u.count ?? 1, every = false ) => {
		const m = new Map();
		for ( const u of uses.filter( keep ) ) {
			const g = every ? valueOf( u.hex ) : of.get( u.hex );
			g && ! ( g.oneOff && ! every ) && m.set( g, ( m.get( g ) || 0 ) + weight( u ) );
		}
		return m;
	};
	const best = ( m, ok = () => true ) => [ ...m.entries() ].filter( ( [ g, n ] ) => n > 0 && ok( g ) )
		.sort( ( a, b ) => b[ 1 ] - a[ 1 ] || groups.indexOf( a[ 0 ] ) - groups.indexOf( b[ 0 ] ) )[ 0 ] ?? null;
	const out = new Map();
	const blocked = {};
	const give = ( role, hit, why, weak = false ) => {
		if ( hit?.[ 0 ].oneOff ) {
			blocked[ role ] = hit[ 0 ].hex;
			return null;
		}
		if ( hit ) {
			out.set( hit[ 0 ], [ ...( out.get( hit[ 0 ] ) || [] ), { role, why: why( hit[ 1 ] ), ...( weak ? { weak } : {} ) } ] );
		}
		return hit?.[ 0 ] ?? null;
	};
	const flagged = uses.some( ( u ) => u.text );
	const isText = ( u ) => 'color' === u.property && ( ! flagged || u.text );
	const tag = ( u ) => ( u.tag || '' ).toLowerCase();
	const sum = ( m ) => [ ...m.values() ].reduce( ( s, n ) => s + n, 0 );

	const surface = give( 'surface', best( tally( ( u ) => isBackground( u.property ) && BASE_TAG.test( tag( u ) ) ) ), ( n ) => `the page ground: the body background on ${ n } page(s)` );
	const page = surface?.hex.slice( 0, 7 );
	const readable = ( g ) => ! page || contrast( g.hex, page ) >= 3;
	const pageText = best( tally( ( u ) => 'color' === u.property && BASE_TAG.test( tag( u ) ) ) );
	const text = pageText ? give( 'text', pageText, ( n ) => `the page text: the body colour on ${ n } page(s)` )
		: give( 'text', best( tally( ( u ) => isText( u ) && ( ! surface || ! u.ground || surface.hexes.has( u.ground ) ) ), ( g ) => opaque( g.hex ) && chroma( g.hex ) <= SATURATED_C && readable( g ) ),
			( n ) => `the most used text colour on the page ground (${ n } elements; the body colour is no token's)`, true );
	give( 'footer-bg', best( tally( ( u ) => 'footer-ground' === u.property ) ), ( n ) => `the footer's ground on ${ n } page(s)` );
	// Headings and links count on a light, opaque ground: on a strong ground they take that ground's text colour.
	const light = ( hex ) => !! hex && 1 === hexToLab( hex ).alpha && ( ! page || contrast( hex, page ) < 3 ) && chroma( hex ) <= SATURATED_C;
	const heading = give( 'heading', best( tally( ( u ) => 'color' === u.property && HEADING_TAG.test( tag( u ) ) && ( ! u.ground || light( u.ground ) ) ) ), ( n ) => `the most used heading colour on light grounds (${ n } headings)` );
	const links = tally( ( u ) => 'color' === u.property && 'a' === tag( u ) && ( ! u.ground || light( u.ground ) ) );
	const linkTotal = sum( links );
	give( 'link', best( links, ( g ) => g !== text && links.get( g ) * 10 >= linkTotal ) || best( links ),
		( n ) => `the most used link colour on light grounds that is not the page text, or the page text when no other colour holds a tenth of them (${ n } of ${ linkTotal } links)` );
	const lines = tally( ( u ) => isBorder( u.property ) && 'a' !== tag( u ), undefined, true );
	const divider = ( g ) => g !== surface && opaque( g.hex ) && chroma( g.hex ) <= SATURATED_C;
	const border = give( 'border', best( lines, divider ), ( n ) => `the most used divider line colour (${ n } lines; a link's underline and a line in the page ground's colour are not dividers)` );
	border && give( 'border-light', best( lines, ( g ) => g !== border && divider( g ) && lightness( g.hex ) > lightness( border.hex ) ), ( n ) => `the next divider line colour, lighter than the border (${ n } lines)` );
	const grounds = tally( ( u ) => isBackground( u.property ) && ! BASE_TAG.test( tag( u ) ) );
	const buttons = tally( ( u ) => isBackground( u.property ) && BUTTON_TAG.test( tag( u ) ) );
	const linkGrounds = tally( ( u ) => isBackground( u.property ) && 'a' === tag( u ) );
	const strong = ( g ) => opaque( g.hex ) && g !== surface && ( chroma( g.hex ) > SATURATED_C || ( !! page && contrast( g.hex, page ) >= 3 ) );
	// A strong ground by where it paints: buttons first, then links styled as buttons, then any element.
	const strongest = ( ok ) => ( [ [ buttons, 'buttons' ], [ linkGrounds, 'links' ], [ grounds, 'elements' ] ].map( ( [ m, what ] ) => {
		const hit = best( m, ( g ) => strong( g ) && ok( g ) );
		return hit ? [ hit[ 0 ], `${ hit[ 1 ] } ${ what }` ] : null;
	} ).find( Boolean ) ) ?? null;
	const primary = give( 'primary', strongest( () => true ), ( n ) => `the most used strong ground (${ n })` );
	const accent = give( 'accent', strongest( ( g ) => g !== primary ), ( n ) => `the next most used strong ground (${ n })` );
	const alt = give( 'surface-alt', best( grounds, ( g ) => opaque( g.hex ) && ! strong( g ) && g !== surface ), ( n ) => `the most used light ground after the page ground (${ n } elements)` );
	const section = give( 'section', best( grounds, ( g ) => opaque( g.hex ) && ! [ surface, alt, primary ].includes( g ) ), ( n ) => `the most used ground after the page, raised and primary grounds (${ n } elements)` );
	const dark = best( grounds, ( g ) => opaque( g.hex ) && lightness( g.hex ) < 40 )?.[ 0 ] ?? null;
	// The most used colour on elements sitting on a ground (an element holding text counts twice), readable on it.
	const on = ( g ) => ( g ? best( tally( ( u ) => 'color' === u.property && g.hexes.has( u.ground ), ( u ) => ( u.count ?? 1 ) * ( u.text ? 2 : 1 ) ),
		( x ) => x !== g && opaque( x.hex ) && contrast( x.hex, g.hex ) >= 3 ) : null );
	give( 'primary-text', on( primary ), ( n ) => `the most used text colour on the primary ground (weight ${ n })` );
	give( 'accent-text', on( accent ), ( n ) => `the most used text colour on the accent ground (weight ${ n })` );
	give( 'section-text', on( section ), ( n ) => `the most used text colour on the section ground (weight ${ n })` );
	give( 'text-inverse', on( dark ), ( n ) => `the most used text colour on the dark ground ${ dark.hex } (weight ${ n })` );
	give( 'text-muted', best( tally( isText, undefined, true ), ( g ) => g !== text && g !== heading && opaque( g.hex ) && chroma( g.hex ) <= SATURATED_C && readable( g ) && ( ! text || lightness( g.hex ) > lightness( text.hex ) ) ),
		( n ) => `the most used text colour after the text and heading colours, lighter than the text (${ n } elements)` );
	return { roles: out, blocked };
}
