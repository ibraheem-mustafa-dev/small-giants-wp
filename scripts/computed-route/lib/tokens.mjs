// Declared design tokens from a Claude Design export's tokens/*.css, read with no render (Spec 48 FR-48-31, §11).
// parseTokenCss lists every custom property with its selector, at-rule context and line; resolveTokens follows each
// var() chain (fallbacks honoured; a cycle or a missing reference with no fallback is a problem and the value is null,
// never empty: R-48-3), types the value and normalises colours to #RRGGBB or #RRGGBBAA. readTokens reads a folder.
import fs from 'fs';
import path from 'path';

// Reads from i until one of `stops` at nesting depth 0, outside strings and comments. Returns the stop's index (or the
// end of the text) and the text read with comments replaced by a space.
function scan( s, i, stops ) {
	let depth = 0;
	let text = '';
	while ( i < s.length ) {
		const c = s[ i ];
		if ( '/' === c && '*' === s[ i + 1 ] ) {
			const e = s.indexOf( '*/', i + 2 );
			i = e < 0 ? s.length : e + 2;
			text += ' ';
			continue;
		}
		if ( '"' === c || "'" === c ) {
			let j = i + 1;
			while ( j < s.length && s[ j ] !== c && '\n' !== s[ j ] ) {
				j += '\\' === s[ j ] ? 2 : 1;
			}
			text += s.slice( i, j + 1 );
			i = j + 1;
			continue;
		}
		if ( '\\' === c ) {
			text += s.slice( i, i + 2 );
			i += 2;
			continue;
		}
		if ( 0 === depth && stops.includes( c ) ) {
			return { j: i, text };
		}
		if ( '([{'.includes( c ) ) {
			depth++;
		} else if ( ')]}'.includes( c ) ) {
			if ( 0 === depth ) {
				return { j: i, text };
			}
			depth--;
		}
		text += c;
		i++;
	}
	return { j: i, text };
}

// Skips whitespace and comments; returns the next significant index.
function skip( s, i ) {
	for ( ;; ) {
		while ( i < s.length && /\s/.test( s[ i ] ) ) {
			i++;
		}
		if ( '/' === s[ i ] && '*' === s[ i + 1 ] ) {
			const e = s.indexOf( '*/', i + 2 );
			i = e < 0 ? s.length : e + 2;
			continue;
		}
		return i;
	}
}

const GROUPING = /^@(media|supports|layer|container|scope|document)\b/i;

// One parsing context: the text, the file, line lookup and the output list.
function lineAt( starts, i ) {
	let lo = 0;
	let hi = starts.length - 1;
	while ( lo < hi ) {
		const mid = ( lo + hi + 1 ) >> 1;
		if ( starts[ mid ] <= i ) {
			lo = mid;
		} else {
			hi = mid - 1;
		}
	}
	return lo + 1;
}

// Rules from i until a closing brace (or the end); returns the index after that brace.
function parseRules( ctx, i, media ) {
	const s = ctx.s;
	while ( ( i = skip( s, i ) ) < s.length ) {
		if ( '}' === s[ i ] ) {
			return i + 1;
		}
		const { j, text } = scan( s, i, '{;}' );
		const prelude = text.trim().replace( /\s+/g, ' ' );
		if ( '{' !== s[ j ] ) {
			// A statement at-rule (@import, @charset, @layer a, b;) or a stray token: nothing declared.
			i = '}' === s[ j ] ? j : j + 1;
			continue;
		}
		if ( GROUPING.test( prelude ) ) {
			i = parseRules( ctx, j + 1, media ? `${ media } and ${ prelude }` : prelude );
		} else if ( prelude.startsWith( '@' ) ) {
			// @font-face, @keyframes, @page, @property: no custom property here is a site token.
			i = scan( s, j + 1, '' ).j + 1;
		} else {
			i = parseDeclarations( ctx, j + 1, prelude, media );
		}
	}
	return i;
}

// Declarations of one style rule from i (just after its brace); nested rules (CSS nesting) recurse with their
// selector joined to the parent's. Returns the index after the closing brace.
function parseDeclarations( ctx, i, selector, media ) {
	const s = ctx.s;
	while ( ( i = skip( s, i ) ) < s.length ) {
		if ( '}' === s[ i ] ) {
			return i + 1;
		}
		if ( ';' === s[ i ] ) {
			i++;
			continue;
		}
		const start = i;
		let { j, text } = scan( s, i, ';{}' );
		if ( '{' === s[ j ] && ! text.trim().startsWith( '--' ) ) {
			const nested = text.trim().replace( /\s+/g, ' ' );
			const sel = nested.includes( '&' ) ? nested.replace( /&/g, selector ) : `${ selector } ${ nested }`;
			i = parseDeclarations( ctx, j + 1, sel, media );
			continue;
		}
		if ( '{' === s[ j ] ) {
			// A custom property whose value holds a brace block: read it whole.
			( { j, text } = scan( s, start, ';}' ) );
		}
		const colon = text.indexOf( ':' );
		const name = colon < 0 ? '' : text.slice( 0, colon ).trim();
		if ( name.startsWith( '--' ) ) {
			const value = text.slice( colon + 1 ).replace( /!\s*important\s*$/i, '' ).trim();
			ctx.out.push( { name, value, file: ctx.file, selector, media: media || null, line: lineAt( ctx.starts, start ) } );
		}
		i = '}' === s[ j ] ? j : j + 1;
	}
	return i;
}

// Every custom property declared in a CSS text, in source order:
// [{ name, value (raw, comments removed), file, selector, media (the grouping at-rule or null), line }].
export function parseTokenCss( text, file = '' ) {
	const s = String( text ).replace( /^﻿/, '' );
	const starts = [ 0 ];
	for ( let k = 0; k < s.length; k++ ) {
		if ( '\n' === s[ k ] ) {
			starts.push( k + 1 );
		}
	}
	const ctx = { s, file, starts, out: [] };
	let i = 0;
	while ( i < s.length ) {
		i = parseRules( ctx, i, null );
	}
	return ctx.out;
}

// CSS named colours (CSS Color 4), as name:hex pairs.
const NAMED = Object.fromEntries( ( 'aliceblue:f0f8ff antiquewhite:faebd7 aqua:00ffff aquamarine:7fffd4 azure:f0ffff beige:f5f5dc bisque:ffe4c4 black:000000 blanchedalmond:ffebcd ' +
	'blue:0000ff blueviolet:8a2be2 brown:a52a2a burlywood:deb887 cadetblue:5f9ea0 chartreuse:7fff00 chocolate:d2691e coral:ff7f50 cornflowerblue:6495ed ' +
	'cornsilk:fff8dc crimson:dc143c cyan:00ffff darkblue:00008b darkcyan:008b8b darkgoldenrod:b8860b darkgray:a9a9a9 darkgreen:006400 darkgrey:a9a9a9 ' +
	'darkkhaki:bdb76b darkmagenta:8b008b darkolivegreen:556b2f darkorange:ff8c00 darkorchid:9932cc darkred:8b0000 darksalmon:e9967a darkseagreen:8fbc8f ' +
	'darkslateblue:483d8b darkslategray:2f4f4f darkslategrey:2f4f4f darkturquoise:00ced1 darkviolet:9400d3 deeppink:ff1493 deepskyblue:00bfff ' +
	'dimgray:696969 dimgrey:696969 dodgerblue:1e90ff firebrick:b22222 floralwhite:fffaf0 forestgreen:228b22 fuchsia:ff00ff gainsboro:dcdcdc ' +
	'ghostwhite:f8f8ff gold:ffd700 goldenrod:daa520 gray:808080 green:008000 greenyellow:adff2f grey:808080 honeydew:f0fff0 hotpink:ff69b4 indianred:cd5c5c ' +
	'indigo:4b0082 ivory:fffff0 khaki:f0e68c lavender:e6e6fa lavenderblush:fff0f5 lawngreen:7cfc00 lemonchiffon:fffacd lightblue:add8e6 lightcoral:f08080 ' +
	'lightcyan:e0ffff lightgoldenrodyellow:fafad2 lightgray:d3d3d3 lightgreen:90ee90 lightgrey:d3d3d3 lightpink:ffb6c1 lightsalmon:ffa07a ' +
	'lightseagreen:20b2aa lightskyblue:87cefa lightslategray:778899 lightslategrey:778899 lightsteelblue:b0c4de lightyellow:ffffe0 lime:00ff00 ' +
	'limegreen:32cd32 linen:faf0e6 magenta:ff00ff maroon:800000 mediumaquamarine:66cdaa mediumblue:0000cd mediumorchid:ba55d3 mediumpurple:9370db ' +
	'mediumseagreen:3cb371 mediumslateblue:7b68ee mediumspringgreen:00fa9a mediumturquoise:48d1cc mediumvioletred:c71585 midnightblue:191970 ' +
	'mintcream:f5fffa mistyrose:ffe4e1 moccasin:ffe4b5 navajowhite:ffdead navy:000080 oldlace:fdf5e6 olive:808000 olivedrab:6b8e23 orange:ffa500 ' +
	'orangered:ff4500 orchid:da70d6 palegoldenrod:eee8aa palegreen:98fb98 paleturquoise:afeeee palevioletred:db7093 papayawhip:ffefd5 peachpuff:ffdab9 ' +
	'peru:cd853f pink:ffc0cb plum:dda0dd powderblue:b0e0e6 purple:800080 rebeccapurple:663399 red:ff0000 rosybrown:bc8f8f royalblue:4169e1 ' +
	'saddlebrown:8b4513 salmon:fa8072 sandybrown:f4a460 seagreen:2e8b57 seashell:fff5ee sienna:a0522d silver:c0c0c0 skyblue:87ceeb slateblue:6a5acd ' +
	'slategray:708090 slategrey:708090 snow:fffafa springgreen:00ff7f steelblue:4682b4 tan:d2b48c teal:008080 thistle:d8bfd8 tomato:ff6347 turquoise:40e0d0 ' +
	'violet:ee82ee wheat:f5deb3 white:ffffff whitesmoke:f5f5f5 yellow:ffff00 yellowgreen:9acd32 transparent:00000000' ).split( ' ' ).map( ( p ) => p.split( ':' ) ) );

const clamp01 = ( n ) => Math.min( 1, Math.max( 0, n ) );
const hex2 = ( n ) => Math.round( n ).toString( 16 ).padStart( 2, '0' );

// A channel or alpha value: "50%" → its fraction of `scale`, a number as is; "none" → 0.
function channel( p, scale ) {
	if ( 'none' === p ) {
		return 0;
	}
	const m = p.match( /^(-?\d*\.?\d+(?:e-?\d+)?)(%?)$/i );
	if ( ! m ) {
		return NaN;
	}
	return m[ 2 ] ? ( Number( m[ 1 ] ) / 100 ) * scale : Number( m[ 1 ] );
}

function hue( p ) {
	const m = p.match( /^(-?\d*\.?\d+)(deg|turn|rad|grad)?$/i );
	if ( ! m ) {
		return 'none' === p ? 0 : NaN;
	}
	const n = Number( m[ 1 ] );
	return { turn: n * 360, rad: ( n * 180 ) / Math.PI, grad: n * 0.9 }[ ( m[ 2 ] || '' ).toLowerCase() ] ?? n;
}

// Any CSS colour literal (hex, rgb()/rgba(), hsl()/hsla(), a named colour, transparent) → "#RRGGBB", or "#RRGGBBAA"
// when its alpha is below 1; anything else (currentcolor, a gradient, a var()) → null.
export function colourHex( value ) {
	const v = String( value ?? '' ).trim().toLowerCase();
	let rgb = null;
	let a = 1;
	let m = v.match( /^#([0-9a-f]{3,8})$/ );
	if ( m ) {
		let h = m[ 1 ];
		if ( 3 === h.length || 4 === h.length ) {
			h = [ ...h ].map( ( c ) => c + c ).join( '' );
		}
		if ( 6 !== h.length && 8 !== h.length ) {
			return null;
		}
		rgb = [ 0, 2, 4 ].map( ( k ) => parseInt( h.slice( k, k + 2 ), 16 ) );
		a = 8 === h.length ? parseInt( h.slice( 6 ), 16 ) / 255 : 1;
	} else if ( NAMED[ v ] ) {
		return colourHex( `#${ NAMED[ v ] }` );
	} else if ( ( m = v.match( /^(rgba?|hsla?)\(([^()]*)\)$/ ) ) ) {
		const parts = m[ 2 ].split( /[\s,/]+/ ).filter( Boolean );
		if ( parts.length < 3 || parts.length > 4 ) {
			return null;
		}
		if ( 4 === parts.length ) {
			a = clamp01( channel( parts[ 3 ], 1 ) );
		}
		if ( m[ 1 ].startsWith( 'rgb' ) ) {
			rgb = parts.slice( 0, 3 ).map( ( p ) => Math.min( 255, Math.max( 0, channel( p, 255 ) ) ) );
		} else {
			// CSS Color 4 hslToRgb: h in degrees, s and l as fractions.
			const h = ( ( hue( parts[ 0 ] ) % 360 ) + 360 ) % 360;
			const l = clamp01( channel( parts[ 2 ], 1 ) );
			const k = clamp01( channel( parts[ 1 ], 1 ) ) * Math.min( l, 1 - l );
			const f = ( n ) => l - k * Math.max( -1, Math.min( ( ( n + h / 30 ) % 12 ) - 3, 9 - ( ( n + h / 30 ) % 12 ), 1 ) );
			rgb = [ 0, 8, 4 ].map( ( n ) => f( n ) * 255 );
		}
	} else {
		return null;
	}
	if ( rgb.some( Number.isNaN ) || Number.isNaN( a ) ) {
		return null;
	}
	const alpha = Math.round( a * 255 );
	return `#${ rgb.map( hex2 ).join( '' ) }${ alpha < 255 ? hex2( alpha ) : '' }`.toUpperCase();
}

const GENERIC_FAMILY = /\b(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math)\b/i;
const LENGTH = /^-?\d*\.?\d+(px|rem|em|%|vw|vh|vmin|vmax|svh|lvh|dvh|ch|ex|lh|pt|cm|mm|in)$/i;
const LENGTH_FN = /^(clamp|min|max|calc)\(/i;

// The kind of a resolved value: colour, gradient, length, font-family, font-size, shadow, easing, number or other.
export function tokenType( name, resolved ) {
	if ( null === resolved || undefined === resolved ) {
		return 'unresolved';
	}
	const v = String( resolved ).trim();
	if ( /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( v ) ) {
		return 'gradient';
	}
	if ( null !== colourHex( v ) ) {
		return 'colour';
	}
	if ( /^(cubic-bezier|steps|linear)\(|^(ease|ease-in|ease-out|ease-in-out|step-start|step-end)$/i.test( v ) ) {
		return 'easing';
	}
	if ( /^(inset\s+)?-?\d*\.?\d+(px|rem|em)?\s+-?\d*\.?\d+(px|rem|em)?(\s+-?\d*\.?\d+(px|rem|em)?){0,2}\s+(#|rgba?\(|hsla?\(|[a-z]+$)/i.test( v ) ) {
		return 'shadow';
	}
	if ( /^["']/.test( v ) || ( v.includes( ',' ) && GENERIC_FAMILY.test( v ) ) || /^(serif|sans-serif|monospace|system-ui)$/i.test( v ) ) {
		return 'font-family';
	}
	if ( LENGTH.test( v ) || LENGTH_FN.test( v ) ) {
		return /^--(fs|font-size|text-size)(-|$)|-(fs|font-size)(-|$)/i.test( name ) ? 'font-size' : 'length';
	}
	return /^-?\d*\.?\d+$/.test( v ) ? 'number' : 'other';
}

// The first var( ... ) in a value from `from`: its span, the referenced name and the fallback (undefined when absent).
function findVar( v, from ) {
	const re = /var\(/gi;
	re.lastIndex = from;
	let m;
	while ( ( m = re.exec( v ) ) && m.index > 0 && /[\w-]/.test( v[ m.index - 1 ] ) ) {
		// "my-var(" is not a var() call.
	}
	if ( ! m ) {
		return null;
	}
	const start = m.index;
	const { j, text } = scan( v, start + 4, ')' );
	const comma = scan( text, 0, ',' ).j;
	return { start, end: j + 1, name: text.slice( 0, comma ).trim(), fallback: comma < text.length ? text.slice( comma + 1 ).trim() : undefined };
}

// The value with every var() substituted; throws { kind, chain } for a cycle or a missing reference with no fallback.
function substitute( value, defs, stack, chain, used ) {
	let out = '';
	let i = 0;
	let ref;
	while ( ( ref = findVar( value, i ) ) ) {
		out += value.slice( i, ref.start );
		let sub;
		try {
			sub = follow( ref.name, defs, stack, chain, used );
		} catch ( err ) {
			if ( undefined === ref.fallback ) {
				throw err;
			}
			used.fallback = true;
			sub = substitute( ref.fallback, defs, stack, chain, used );
		}
		out += sub;
		i = ref.end;
	}
	return ( out + value.slice( i ) ).trim();
}

function follow( name, defs, stack, chain, used ) {
	if ( ! chain.includes( name ) ) {
		chain.push( name );
	}
	if ( stack.includes( name ) ) {
		throw { kind: 'cycle', chain: [ ...stack, name ] };
	}
	const def = defs.get( name );
	if ( ! def ) {
		throw { kind: 'missing', chain: [ ...stack, name ] };
	}
	return substitute( def.value, defs, [ ...stack, name ], chain, used );
}

const ROOTISH = /^(:root|html|:host)$/i;

// Each token with `resolved` (null on a problem), `chain` (the names followed), `type`, `hex` (colours only) and
// `fallback` (true when a var() fallback supplied the value); problems: [{ token, file, line, kind, chain, error }].
// A reference resolves to the last declaration at :root/html outside any at-rule, else the first declaration of it.
export function resolveTokens( tokens ) {
	const defs = new Map();
	for ( const t of tokens ) {
		const rootish = ROOTISH.test( t.selector ) && ! t.media;
		if ( rootish || ! defs.has( t.name ) ) {
			defs.set( t.name, { value: t.value } );
		}
	}
	const problems = [];
	const out = tokens.map( ( t ) => {
		const chain = [];
		const used = { fallback: false };
		let resolved = null;
		try {
			resolved = substitute( t.value, defs, [ t.name ], chain, used );
		} catch ( err ) {
			const text = 'cycle' === err.kind ? `var() cycle ${ err.chain.join( ' -> ' ) }` : `${ err.chain.at( -1 ) } is not declared (${ err.chain.join( ' -> ' ) })`;
			problems.push( { token: t.name, file: t.file, line: t.line, kind: err.kind, chain: err.chain, error: text } );
		}
		if ( '' === resolved ) {
			problems.push( { token: t.name, file: t.file, line: t.line, kind: 'empty', chain, error: `${ t.name } resolves to an empty value` } );
			resolved = null;
		}
		const type = tokenType( t.name, resolved );
		const row = { ...t, resolved, chain, type, fallback: used.fallback };
		if ( 'colour' === type ) {
			row.hex = colourHex( resolved );
		}
		return row;
	} );
	return { tokens: out, problems };
}

// Every tokens/*.css file of an export folder, parsed and resolved together (a var() may cross files):
// { tokens, problems, files: { 'tokens/colors.css': count } }. A folder with no tokens/ is a problem, not an empty list.
export function readTokens( folder ) {
	const dir = path.join( folder, 'tokens' );
	if ( ! fs.existsSync( dir ) ) {
		return { tokens: [], problems: [ { token: null, file: 'tokens/', line: 0, kind: 'missing-folder', chain: [], error: `${ dir } does not exist` } ], files: {} };
	}
	const files = {};
	const all = [];
	for ( const f of fs.readdirSync( dir ).filter( ( n ) => n.toLowerCase().endsWith( '.css' ) ).sort() ) {
		const rel = `tokens/${ f }`;
		const found = parseTokenCss( fs.readFileSync( path.join( dir, f ), 'utf8' ), rel );
		files[ rel ] = found.length;
		all.push( ...found );
	}
	return { ...resolveTokens( all ), files };
}
