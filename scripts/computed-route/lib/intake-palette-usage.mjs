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
// The CIELAB hue angle in degrees, and the distance between two hues.
const hue = ( hex ) => {
	const l = hexToLab( hex );
	return ( ( Math.atan2( l.b, l.a ) * 180 ) / Math.PI + 360 ) % 360;
};
const hueGap = ( x, y ) => Math.min( Math.abs( hue( x ) - hue( y ) ), 360 - Math.abs( hue( x ) - hue( y ) ) );
// A status colour of the success family: a saturated green (CIELAB hue 110 to 170 degrees).
const isGreen = ( hex ) => chroma( hex ) > SATURATED_C && hue( hex ) >= 110 && hue( hex ) <= 170;
const SAME_HUE = 15;
const MUTED_STEP = 10;
// A light ground: text on it reads as dark copy (CIELAB L* 70 or more and low chroma).
const LIGHT_L = 70;
// A saturated ground this pale (L* 88 or more) is a tint and still light.
const PALE_L = 88;
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
	// Text weighs by the characters an element holds (its count when the row does not say).
	const chars = ( u ) => u.chars ?? u.count ?? 1;
	const text = pageText ? give( 'text', pageText, ( n ) => `the page text: the body colour on ${ n } page(s)` )
		: give( 'text', best( tally( ( u ) => isText( u ) && ( ! surface || ! u.ground || surface.hexes.has( u.ground ) ), chars ), ( g ) => opaque( g.hex ) && chroma( g.hex ) <= SATURATED_C && readable( g ) ),
			( n ) => `the colour of the most text on the page ground (${ n } characters; the body colour is no token's)`, true );
	give( 'footer-bg', best( tally( ( u ) => 'footer-ground' === u.property ) ), ( n ) => `the footer's ground on ${ n } page(s)` );
	// Headings, links and muted text count on a light, opaque ground: on a strong ground they take that ground's text colour.
	const light = ( hex ) => !! hex && 1 === hexToLab( hex ).alpha && lightness( hex ) >= LIGHT_L && ( chroma( hex ) <= SATURATED_C || lightness( hex ) >= PALE_L );
	const heading = give( 'heading', best( tally( ( u ) => 'color' === u.property && HEADING_TAG.test( tag( u ) ) && ( ! u.ground || light( u.ground ) ) ) ), ( n ) => `the most used heading colour on light grounds (${ n } headings)` );
	const links = tally( ( u ) => 'color' === u.property && 'a' === tag( u ) && ( ! u.ground || light( u.ground ) ) );
	const linkTotal = sum( links );
	give( 'link', best( links, ( g ) => g !== text && links.get( g ) * 10 >= linkTotal ) || best( links ),
		( n ) => `the most used link colour on light grounds that is not the page text, or the page text when no other colour holds a tenth of them (${ n } of ${ linkTotal } links)` );
	// Lines weigh by the pixels they draw (their count when no row says).
	const lines = tally( ( u ) => isBorder( u.property ) && 'a' !== tag( u ), ( u ) => u.length ?? u.count ?? 1, true );
	const divider = ( g ) => g !== surface && opaque( g.hex ) && chroma( g.hex ) <= SATURATED_C;
	const border = give( 'border', best( lines, divider ), ( n ) => `the divider line colour that draws the most (${ n } px; a link's underline and a line in the page ground's colour are not dividers)` );
	border && give( 'border-light', best( lines, ( g ) => g !== border && divider( g ) && lightness( g.hex ) > lightness( border.hex ) ), ( n ) => `the next divider line colour by length, lighter than the border (${ n } px)` );
	// A colour painted as the ground of a link that opens WhatsApp is that channel's colour, never a brand ground.
	const channel = give( 'whatsapp', best( tally( ( u ) => 'whatsapp' === u.channel && isBackground( u.property ) ), ( g ) => opaque( g.hex ) && chroma( g.hex ) > SATURATED_C ),
		( n ) => `the ground of the links that open WhatsApp (${ n } elements)` );
	const grounds = tally( ( u ) => isBackground( u.property ) && ! BASE_TAG.test( tag( u ) ) );
	const buttons = tally( ( u ) => isBackground( u.property ) && BUTTON_TAG.test( tag( u ) ) );
	const linkGrounds = tally( ( u ) => isBackground( u.property ) && 'a' === tag( u ) );
	const strong = ( g ) => opaque( g.hex ) && g !== surface && ( chroma( g.hex ) > SATURATED_C || ( !! page && contrast( g.hex, page ) >= 3 ) );
	// A strong ground by where it paints: buttons first, then links styled as buttons, then any element.
	const strongest = ( ok ) => ( [ [ buttons, 'buttons' ], [ linkGrounds, 'links' ], [ grounds, 'elements' ] ].map( ( [ m, what ] ) => {
		const hit = best( m, ( g ) => strong( g ) && g !== channel && ok( g ) );
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
	// Accent text: the text that sits on the accent fill; when the fill holds none, the accent's own ink (a text colour
	// of its hue, at least six tenths of its chroma, readable on the page ground) by the characters it sets.
	// On a content ground (the accent and section fills) the text colour is the colour of the most text set on it.
	const copyOn = ( g ) => ( g && flagged ? best( tally( ( u ) => isText( u ) && g.hexes.has( u.ground ), chars ), ( x ) => x !== g && opaque( x.hex ) && contrast( x.hex, g.hex ) >= 3 ) : null );
	const onFill = copyOn( accent );
	const inkOf = ( g ) => best( tally( isText, chars ), ( x ) => x !== g && ! [ text, heading ].includes( x ) && opaque( x.hex ) && hueGap( x.hex, g.hex ) <= SAME_HUE
		&& chroma( x.hex ) >= 0.6 * chroma( g.hex ) && ( ! page || contrast( x.hex, page ) >= 4.5 ) );
	const ink = accent ? inkOf( accent ) : null;
	const accentText = onFill ? give( 'accent-text', onFill, ( n ) => `the colour of the most text on the accent ground (${ n } characters)` )
		: give( 'accent-text', ink, ( n ) => `the accent's own ink: the text colour of its hue (${ n } characters; the accent ground holds no text)` );
	// Accent light: a light ground of the accent's hue (L* 85 or more) that no other ground role holds, ranked by the
	// accent ink it carries, then by the grounds and lines it paints.
	const tints = accent ? tally( ( u ) => ( isBackground( u.property ) || isBorder( u.property ) ) && ! BASE_TAG.test( tag( u ) ) ) : new Map();
	const carried = new Map();
	for ( const u of uses.filter( ( x ) => 'color' === x.property && accentText?.hexes.has( x.hex ) && x.ground ) ) {
		const g = of.get( u.ground );
		g && carried.set( g, ( carried.get( g ) || 0 ) + ( u.chars || 0 ) + 1 );
	}
	const tintOk = ( g ) => opaque( g.hex ) && lightness( g.hex ) >= 85 && chroma( g.hex ) >= 2 && hueGap( g.hex, accent.hex ) <= SAME_HUE && ! [ surface, alt, section, primary, accent ].includes( g );
	const tint = [ ...tints.keys() ].filter( ( g ) => ! g.oneOff && tintOk( g ) ).sort( ( a, b ) => ( carried.get( b ) || 0 ) - ( carried.get( a ) || 0 ) || tints.get( b ) - tints.get( a ) || groups.indexOf( a ) - groups.indexOf( b ) )[ 0 ];
	tint && give( 'accent-light', [ tint, tints.get( tint ) ], ( n ) => `the light ground of the accent's hue (${ n } grounds and lines${ carried.get( tint ) ? ', carrying the accent ink' : '' })` );
	const sectionCopy = copyOn( section );
	give( 'section-text', sectionCopy || on( section ), ( n ) => ( sectionCopy ? `the colour of the most text on the section ground (${ n } characters)` : `the most used text colour on the section ground (weight ${ n })` ) );
	give( 'text-inverse', on( dark ), ( n ) => `the most used text colour on the dark ground ${ dark.hex } (weight ${ n })` );
	give( 'text-muted', best( tally( ( u ) => isText( u ) && ( ! u.ground || light( u.ground ) ), chars, true ), ( g ) => ! [ text, heading, accentText ].includes( g ) && opaque( g.hex ) && chroma( g.hex ) <= SATURATED_C && readable( g )
		&& ( ! text || lightness( g.hex ) >= lightness( text.hex ) + MUTED_STEP ) ),
	( n ) => `the colour of the most text after the text, heading and accent text, at least ${ MUTED_STEP } L* lighter than the text (${ n } characters)` );
	// A live status message the code colours green is the success colour, painted at rest or not.
	give( 'success', best( tally( ( u ) => 'status-color' === u.property && 'status' === tag( u ) ), ( g ) => opaque( g.hex ) && isGreen( g.hex ) ),
		( n ) => `the green the draft's code gives its status messages (${ n } in the code)` );
	return { roles: out, blocked };
}
