// Value normalisation and token snapping (R-47-7). Measured values arrive as computed styles (px lengths, rgb()
// colours). Tokens come from the site's theme-snapshot.json. Snap order: exact token, then (a colour only) the nearest within
// ΔE 2, then a literal flagged in the log: a length takes a token only when equal (Spec 48 R-47-7). Every snap is logged with its distance.
import fs from 'fs';
import path from 'path';
import { parseRatio, sameRatio, trackRatios } from '../../parity/lib/ratio.mjs';
import { assertSnapshotFresh } from './snapshot-freshness.mjs';
import { PX_TOL } from './css-equivalence/tolerance.mjs';

export const COVERAGE_WRITES = [
	'css-function:minmax',
	'css-function:repeat',
	'css-unit:fr',
];

export const COLOUR_DE = 2;
const ROOT_PX = 16;

export const round = ( n ) => Math.round( n * 1000 ) / 1000;

// "12.5px" → { n: 12.5, unit: 'px' }; "1.5" → { n: 1.5, unit: '' }; anything else → null.
export function parseLength( v ) {
	const m = String( v ).trim().match( /^(-?\d*\.?\d+)(px|em|rem|%|vw|vh|ch)?$/ );
	return m ? { n: Number( m[ 1 ] ), unit: m[ 2 ] || '' } : null;
}

// A length in px: em against the element's font size, rem against 16px.
export function toPx( v, fontPx = ROOT_PX ) {
	const l = typeof v === 'number' ? { n: v, unit: 'px' } : parseLength( v );
	if ( ! l ) {
		return null;
	}
	return { px: l.n, '': null, em: l.n * fontPx, rem: l.n * ROOT_PX }[ l.unit ] ?? null;
}

// A px length in another unit (em uses the element's font size).
export function pxTo( px, unit, fontPx = ROOT_PX ) {
	if ( 'em' === unit ) {
		return round( px / fontPx );
	}
	if ( 'rem' === unit ) {
		return round( px / ROOT_PX );
	}
	return 'px' === unit ? round( px ) : null;
}

// "#abc", "#aabbcc", "#aabbccdd", "rgb(1, 2, 3)", "rgba(1,2,3,0.5)" → { r, g, b, a }; anything else → null.
export function parseColour( v ) {
	const s = String( v ).trim();
	let m = s.match( /^#([0-9a-f]{3,8})$/i );
	if ( m ) {
		let h = m[ 1 ];
		if ( 3 === h.length || 4 === h.length ) {
			h = [ ...h ].map( ( c ) => c + c ).join( '' );
		}
		if ( 6 !== h.length && 8 !== h.length ) {
			return null;
		}
		const n = ( i ) => parseInt( h.slice( i, i + 2 ), 16 );
		return { r: n( 0 ), g: n( 2 ), b: n( 4 ), a: 8 === h.length ? round( n( 6 ) / 255 ) : 1 };
	}
	m = s.match( /^rgba?\(([^)]+)\)$/ );
	if ( m ) {
		const p = m[ 1 ].split( /[\s,/]+/ ).filter( Boolean ).map( Number );
		return p.length >= 3 && p.every( ( x ) => ! Number.isNaN( x ) ) ? { r: p[ 0 ], g: p[ 1 ], b: p[ 2 ], a: p[ 3 ] ?? 1 } : null;
	}
	return null;
}

export function toHex( c ) {
	const h = ( n ) => Math.round( n ).toString( 16 ).padStart( 2, '0' );
	return `#${ h( c.r ) }${ h( c.g ) }${ h( c.b ) }${ c.a < 1 ? h( c.a * 255 ) : '' }`.toUpperCase();
}

// CIE76 ΔE between two sRGB colours (through CIELAB, D65).
export function deltaE( a, b ) {
	const lab = ( c ) => {
		const lin = [ c.r, c.g, c.b ].map( ( v ) => {
			const x = v / 255;
			return x <= 0.04045 ? x / 12.92 : ( ( x + 0.055 ) / 1.055 ) ** 2.4;
		} );
		const xyz = [
			( lin[ 0 ] * 0.4124 + lin[ 1 ] * 0.3576 + lin[ 2 ] * 0.1805 ) / 0.95047,
			lin[ 0 ] * 0.2126 + lin[ 1 ] * 0.7152 + lin[ 2 ] * 0.0722,
			( lin[ 0 ] * 0.0193 + lin[ 1 ] * 0.1192 + lin[ 2 ] * 0.9505 ) / 1.08883,
		].map( ( t ) => ( t > 0.008856 ? Math.cbrt( t ) : 7.787 * t + 16 / 116 ) );
		return [ 116 * xyz[ 1 ] - 16, 500 * ( xyz[ 0 ] - xyz[ 1 ] ), 200 * ( xyz[ 1 ] - xyz[ 2 ] ) ];
	};
	const [ x, y ] = [ lab( a ), lab( b ) ];
	return Math.hypot( x[ 0 ] - y[ 0 ], x[ 1 ] - y[ 1 ], x[ 2 ] - y[ 2 ] );
}

// A measured aspect-ratio in the setting's form. "auto" is the empty setting where one exists; a ratio is the enum value
// painting the same ratio, or "w / h" for a free string. "auto 16 / 9" (the image's own ratio first) cannot be held.
export function ratioSetting( raw, def ) {
	const unset = 'auto' === String( raw ).trim();
	if ( Array.isArray( def?.enum ) ) {
		const hit = def.enum.find( ( v ) => ( unset ? '' === v : '' !== v && sameRatio( v, raw ) ) );
		return undefined !== hit ? { value: hit } : { error: `${ raw } is not one of ${ def.enum.join( ', ' ) }` };
	}
	const r = parseRatio( raw );
	if ( unset ) {
		return { value: '' === def?.default ? '' : 'auto' };
	}
	return r && ! r.auto ? { value: `${ r.w } / ${ r.h }` } : { error: `${ raw } cannot be held` };
}

// Measured grid tracks in px as the setting's fr proportions, each floored at 0 as the framework's own tracks are (a
// long word never widens a track past its share): "496.562px 451.438px" → "minmax(0, 1.1fr) minmax(0, 1fr)", equal
// tracks → "repeat(3, minmax(0, 1fr))". Tracks not all in px cannot be held.
export function tracksSetting( raw ) {
	const r = trackRatios( raw );
	if ( ! r ) {
		return { error: `${ raw } cannot be held as track proportions` };
	}
	return { value: r.every( ( n ) => 1 === n ) ? `repeat(${ r.length }, minmax(0, 1fr))` : r.map( ( n ) => `minmax(0, ${ n }fr)` ).join( ' ' ) };
}

// The number of tracks a measured grid-template-columns lists, as the whole number a column-count setting holds: "1fr 1fr 1fr"
// computed at a width ("160px 160px 160px") is 3. Tracks not all in px cannot be counted.
export function trackCount( raw ) {
	const r = trackRatios( raw );
	return r ? { value: r.length } : { error: `${ raw } cannot be held as a track count` };
}

// One track of a declared list: a flexible, fixed or content-sized size, alone or inside minmax()/fit-content().
const TRACK_LENGTH = /^(?:0|-?\d*\.?\d+(?:px|em|rem|%|vw|vh|ch|ex))$/;
const TRACK_SIZE = /^(?:\d*\.?\d+fr|auto|min-content|max-content)$/;
const MIN_MAX = /^(?:min|max|clamp)\((.*)\)$/;
const isLengthish = ( t ) => TRACK_LENGTH.test( t ) || ( MIN_MAX.test( t ) && splitTop( MIN_MAX.exec( t )[ 1 ], ',' ).every( isLengthish ) );
function isTrack( t ) {
	if ( TRACK_SIZE.test( t ) || isLengthish( t ) ) {
		return true;
	}
	const mm = /^minmax\((.*)\)$/.exec( t );
	if ( mm ) {
		const args = splitTop( mm[ 1 ], ',' );
		return 2 === args.length && args.every( isTrack );
	}
	const fc = /^fit-content\((.*)\)$/.exec( t );
	return !! fc && isLengthish( fc[ 1 ] );
}

// A value's parts split on `sep` outside brackets, each trimmed.
function splitTop( v, sep ) {
	const out = [];
	let depth = 0;
	let buf = '';
	for ( const ch of v ) {
		depth += '(' === ch ? 1 : ')' === ch ? -1 : 0;
		if ( 0 === depth && ( ' ' === sep ? /\s/.test( ch ) : ch === sep ) ) {
			buf.trim() && out.push( buf.trim() );
			buf = '';
		} else {
			buf += ch;
		}
	}
	buf.trim() && out.push( buf.trim() );
	return out;
}

// The tracks a declared list lays out ([track]), repeat(N, …) expanded; null when it is no list of tracks a setting holds
// as written; { auto: true } for a repeat(auto-fit|auto-fill, …), whose count the browser decides from the width.
function declaredTrackList( v ) {
	const out = [];
	for ( const t of splitTop( v, ' ' ) ) {
		const rep = /^repeat\(\s*(\d+|auto-fit|auto-fill)\s*,(.*)\)$/.exec( t );
		if ( rep ) {
			const inner = declaredTrackList( rep[ 2 ] );
			if ( ! Array.isArray( inner ) || ! inner.length ) {
				return null;
			}
			if ( ! /^\d+$/.test( rep[ 1 ] ) ) {
				return { auto: true };
			}
			for ( let i = 0; i < Number( rep[ 1 ] ); i++ ) {
				out.push( ...inner );
			}
		} else if ( isTrack( t ) ) {
			out.push( t );
		} else {
			return null;
		}
	}
	return out.length ? out : null;
}

// The number of equal flexible tracks a declared column list lays out (`repeat(6, minmax(0, 1fr))`, `1fr 1fr 1fr`): a count
// of columns sharing the row, which a column-count setting holds exactly. Null for any other list (unequal, fixed, content-sized,
// auto-fit or not a list).
export function equalFlexTracks( declared ) {
	const list = declaredTrackList( String( declared ?? '' ).trim().replace( /\s*!important$/, '' ).replace( /\s+/g, ' ' ) );
	const flex = ( t ) => /^\d*\.?\d+fr$/.test( t ) || /^minmax\(\s*(?:0|0px|auto)\s*,\s*\d*\.?\d+fr\s*\)$/.test( t );
	return Array.isArray( list ) && list.length > 0 && list.every( ( t ) => t === list[ 0 ] ) && flex( list[ 0 ] ) ? list.length : null;
}

// The column tracks the draft's code declares, as the setting's value, where the declaration can be held as written and
// is what the draft renders: { value } or null. A grid template setting prints its string through
// includes/helpers-container.php::sgs_sanitize_grid_template, so a list of `fr`, `auto`, `min-content`, `max-content`,
// lengths, minmax(), fit-content(), min()/max()/clamp() of lengths and repeat() of these is held as declared (each is
// written in characters the sanitiser keeps); a variable, a calc(), named lines, a slash or `none` is not. The
// declaration is what the draft renders (`rendered`: the computed px tracks at the same width) when it lays out as many
// tracks and each fixed px track is the rendered one (±0.5px); a repeat(auto-fit|auto-fill) lays out a count the width
// decides, so it agrees with any rendered track list. Written as declared, a content-sized track stays content-sized and
// a bare `1fr` keeps its min-content floor at every width the device tier covers, where measured shares would fix each
// track to the proportion one width happened to give.
export function declaredTracks( declared, rendered ) {
	const d = String( declared ?? '' ).trim().replace( /\s*!important$/, '' ).replace( /\s+/g, ' ' );
	const list = d ? declaredTrackList( d ) : null;
	const px = String( rendered ?? '' ).trim().split( /\s+/ ).map( ( t ) => ( /^-?\d*\.?\d+px$/.test( t ) ? parseFloat( t ) : NaN ) );
	if ( ! list || px.some( Number.isNaN ) ) {
		return null;
	}
	if ( ! list.auto && ( list.length !== px.length || list.some( ( t, i ) => /^-?\d*\.?\d+px$/.test( t ) && Math.abs( parseFloat( t ) - px[ i ] ) > PX_TOL ) ) ) {
		return null;
	}
	return { value: d };
}

// The site's tokens: palette colours, spacing sizes and font sizes, each with a px value where it has one. A snapshot that was
// not extracted from the site's current handoff export is refused (FR-33-12).
export function loadSnapshot( file ) {
	assertSnapshotFresh( file );
	const s = JSON.parse( fs.readFileSync( path.resolve( file ), 'utf8' ) ).settings || {};
	const len = ( list, key ) => ( list || [] ).map( ( t ) => ( { slug: t.slug, px: toPx( t[ key ] ) } ) ).filter( ( t ) => null !== t.px );
	return {
		palette: ( s.color?.palette || [] ).map( ( t ) => ( { slug: t.slug, colour: parseColour( t.color ) } ) ).filter( ( t ) => t.colour ),
		spacing: len( s.spacing?.spacingSizes, 'size' ),
		fontSizes: len( s.typography?.fontSizes, 'size' ),
		fontFamilies: ( s.typography?.fontFamilies || [] ).map( ( t ) => ( { slug: t.slug, family: primaryFamily( t.fontFamily ) } ) ).filter( ( t ) => t.family ),
	};
}

// The first family of a font stack, unquoted and lower-cased ("\"Playfair Display\", serif" is "playfair display").
const primaryFamily = ( stack ) => String( stack ?? '' ).split( ',' )[ 0 ].trim().replace( /^["']|["']$/g, '' ).toLowerCase();

// Snaps a measured font stack to the font-family preset whose first family matches: `prefer` (the slug the node already
// holds) first, then the theme's order. Returns the slug, or null (the caller writes the stack as measured). Logs it.
export function snapFontFamily( value, snapshot, { log = [], where = '', prefer = null } = {} ) {
	const fam = primaryFamily( value );
	const matches = ( snapshot.fontFamilies || [] ).filter( ( t ) => t.family === fam );
	const out = ( matches.find( ( t ) => t.slug === prefer ) || matches[ 0 ] )?.slug ?? null;
	log.push( { where, from: value, to: out ?? value, distance: null, kind: out ? 'exact' : 'literal' } );
	return out;
}

// Snaps a colour to a palette slug: exact first (ΔE 0, alpha equal), then nearest within ΔE 2; `prefer` (the slug the
// node already holds) wins a tie. Otherwise a hex literal, flagged. Logs every result to `log` with `where`.
export function snapColour( value, snapshot, { log = [], where = '', prefer = null } = {} ) {
	const c = parseColour( value );
	if ( ! c ) {
		return null;
	}
	const ranked = snapshot.palette.filter( ( t ) => Math.abs( t.colour.a - c.a ) < 0.02 )
		.map( ( t ) => ( { slug: t.slug, d: round( deltaE( t.colour, c ) ) } ) )
		.sort( ( a, b ) => a.d - b.d || ( b.slug === prefer ) - ( a.slug === prefer ) );
	const best = ranked[ 0 ];
	const out = best && best.d <= COLOUR_DE
		? { form: 'slug', value: best.slug, distance: best.d, kind: 0 === best.d ? 'exact' : 'nearest' }
		: { form: 'hex', value: toHex( c ), distance: best ? best.d : null, kind: 'literal' };
	log.push( { where, from: value, to: out.value, distance: out.distance, kind: out.kind } );
	return out;
}

// Snaps a px length to a token list (spacing or font sizes): a token of the same px, else null (the caller
// writes a literal and logs it).
export function snapLength( px, tokens, { log = [], where = '' } = {} ) {
	const ranked = tokens.map( ( t ) => ( { slug: t.slug, d: round( Math.abs( t.px - px ) ) } ) ).sort( ( a, b ) => a.d - b.d );
	const best = ranked[ 0 ];
	const out = best && 0 === best.d ? { slug: best.slug, distance: 0, kind: 'exact' } : null;
	log.push( { where, from: `${ px }px`, to: out ? out.slug : `${ round( px ) }px`, distance: out ? out.distance : null, kind: out ? out.kind : 'literal' } );
	return out;
}
