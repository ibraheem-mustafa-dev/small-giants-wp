/**
 * Layered box-shadow composer — the JS twin of `includes/helpers-shadow-layers.php`.
 *
 * A stored shadow is two ordinary text attributes: a SHAPE (layers separated by top-level
 * commas, each `[inset] X Y [BLUR [SPREAD]]`, or a bare theme preset slug, or `none`) and a
 * COLOUR (one entry for every layer, or a comma list matching the layers; an entry is `site`,
 * a palette slug or a CSS colour, plus an optional `N%` opacity).
 *
 * Both halves are pinned to `tests/shared/shadow-compose-cases.json`: the PHP test and the JS
 * test read the same input-to-output table, so they cannot drift apart.
 *
 * Known, deliberate difference: PHP normalises `rgb()`/`hsl()` colours to hex (WordPress's
 * inline-style filter would strip them). The canvas never goes through that filter, so this
 * twin passes them through; the shared cases mark those inputs `phpOnly`.
 *
 * Logic only, no React and no WordPress imports, so plain Node can load it.
 *
 * @package SGS\Blocks
 */

export const MAX_BYTES = 2000;
export const MAX_LAYERS = 8;
export const DEFAULT_COLOUR = '#0000001A';
export const SITE_COLOUR = 'var(--wp--custom--shadow-colour, #000000)';

const NAMED_FALLBACK = /^(red|green|blue|black|white|transparent|currentcolor|gray|grey)$/i;

/**
 * Split on top-level separators only, counting parentheses. Comma splits keep empty entries
 * (a colour list needs them); whitespace splits drop them.
 *
 * @param {string} value Text to split.
 * @param {string} sep   ',' or ' ' (any whitespace).
 * @return {string[]} Trimmed parts.
 */
export function splitTop( value, sep ) {
	const parts = [];
	let depth = 0;
	let buf = '';
	for ( const c of value ) {
		if ( '(' === c ) {
			depth++;
		} else if ( ')' === c && depth > 0 ) {
			depth--;
		}
		if ( 0 === depth && ( ',' === sep ? ',' === c : /\s/.test( c ) ) ) {
			parts.push( buf.trim() );
			buf = '';
			continue;
		}
		buf += c;
	}
	parts.push( buf.trim() );
	return ',' === sep ? parts : parts.filter( ( part ) => '' !== part );
}

/**
 * @param {string} token Candidate length token.
 * @return {number|null} The number, or null when it is not a legal length.
 */
export function parseLength( token ) {
	return /^-?(?:\d{1,4}(?:\.\d{1,3})?|\.\d{1,3})(?:px)?$/.test( token ) ? parseFloat( token ) : null;
}

/**
 * @param {number} value Number.
 * @return {string} px length with no trailing zeros ("4px", "0.5px", "0px").
 */
export function formatLength( value ) {
	let text = value.toFixed( 3 ).replace( /0+$/, '' ).replace( /\.$/, '' );
	if ( '' === text || '-0' === text ) {
		text = '0';
	}
	return `${ text }px`;
}

function colourIsSafe( css ) {
	if ( ! css || css.length > 200 || /[;{}<>"'`\\@!]|\/\*|\*\/|url\s*\(|expression\s*\(|[\x00-\x1F]/i.test( css ) ) {
		return false;
	}
	let depth = 0;
	let deepest = 0;
	for ( const c of css ) {
		if ( '(' === c ) {
			deepest = Math.max( deepest, ++depth );
		} else if ( ')' === c && --depth < 0 ) {
			return false;
		}
	}
	return 0 === depth && deepest <= 3;
}

// The one `color-mix()` a theme preset may carry: the site colour, a palette variable or a hex,
// mixed with transparent. Anything else that starts `color-mix(` is not a colour.
const PRESET_MIX = /^color-mix\(in srgb, (?:var\(--wp--custom--shadow-colour\)|var\(--wp--preset--color--[a-z0-9-]+\)|#[0-9a-f]{6}(?:[0-9a-f]{2})?) \d{1,3}(?:\.\d)?%, transparent\)$/i;

function colourToCss( token ) {
	if ( 'site' === token ) {
		return SITE_COLOUR;
	}
	if ( /^color-mix\(/i.test( token ) ) {
		return PRESET_MIX.test( token ) ? token : '';
	}
	// Same order as sgs_colour_value(): var(), then a real colour, then everything else is a
	// palette slug (a `#` that is not a valid hex code is a slug with its junk stripped).
	if (
		token.startsWith( 'var(' ) ||
		/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test( token ) ||
		/^(rgb|rgba|hsl|hsla|oklch|lch|oklab|lab|hwb)\s*\(/i.test( token )
	) {
		return token;
	}
	const named = typeof CSS !== 'undefined' && 'function' === typeof CSS.supports ? CSS.supports( 'color', token ) : NAMED_FALLBACK.test( token );
	if ( named ) {
		return token;
	}
	const slug = token.toLowerCase().replace( /[^a-z0-9-]/g, '' );
	return slug ? `var(--wp--preset--color--${ slug }, currentColor)` : '';
}

/**
 * Resolve ONE colour-list entry to a CSS colour. Opacity below 100 becomes a color-mix().
 *
 * @param {string} entry Colour-list entry.
 * @return {string|null} CSS colour, or null when the entry is not understood.
 */
export function resolveColour( entry ) {
	const tokens = splitTop( entry.trim(), ' ' );
	let alpha = 100;
	const match = tokens.length > 1 ? /^(\d{1,3}(?:\.\d)?)%$/.exec( tokens[ tokens.length - 1 ] ) : null;
	if ( match ) {
		alpha = Math.min( 100, parseFloat( match[ 1 ] ) );
		tokens.pop();
	}
	if ( 1 !== tokens.length || ! /^[#a-z]/i.test( tokens[ 0 ] ) ) {
		return null;
	}
	const css = colourToCss( tokens[ 0 ] );
	if ( ! colourIsSafe( css ) ) {
		return null;
	}
	if ( alpha >= 100 ) {
		return css;
	}
	const pct = alpha.toFixed( 1 ).replace( /0+$/, '' ).replace( /\.$/, '' );
	return `color-mix(in srgb, ${ css } ${ pct }%, transparent)`;
}

/**
 * Parse one layer into fields, or null when it does not parse. Values are clamped: blur 0 to
 * 100, offsets and spread -200 to 200. `inset` may be first or last, in any case.
 *
 * @param {string} layer One layer of text.
 * @return {{inset:boolean,x:number,y:number,blur:number,spread:number,colour:(string|null)}|null} Fields.
 */
export function parseLayer( layer ) {
	const tokens = splitTop( layer.trim(), ' ' );
	const last = tokens.length - 1;
	const nums = [];
	let inset = false;
	let colour = null;
	for ( let i = 0; i <= last; i++ ) {
		if ( 'inset' === tokens[ i ].toLowerCase() ) {
			if ( inset || ( 0 !== i && last !== i ) ) {
				return null;
			}
			inset = true;
			continue;
		}
		const length = parseLength( tokens[ i ] );
		if ( null !== length ) {
			nums.push( length );
		} else if ( null === colour ) {
			colour = tokens[ i ];
		} else {
			return null;
		}
	}
	if ( nums.length < 2 || nums.length > 4 || ( nums[ 2 ] ?? 0 ) < 0 ) {
		return null;
	}
	const clamp = ( v, lo, hi ) => Math.max( lo, Math.min( hi, v ) );
	return {
		inset,
		x: clamp( nums[ 0 ], -200, 200 ),
		y: clamp( nums[ 1 ], -200, 200 ),
		blur: clamp( nums[ 2 ] ?? 0, 0, 100 ),
		spread: clamp( nums[ 3 ] ?? 0, -200, 200 ),
		colour,
	};
}

/**
 * Compose a stored shadow (shape text + colour text) into a CSS `box-shadow` value.
 *
 * @param {string|null|undefined} shape  Layers, a bare preset slug, or `none`.
 * @param {string|null|undefined} colour One colour entry for all layers, or a list.
 * @return {string} CSS value, or '' when there is nothing to draw.
 */
export function composeShadow( shape, colour ) {
	const text = 'string' === typeof shape ? shape.trim() : '';
	if ( '' === text || text.length > MAX_BYTES ) {
		return '';
	}
	if ( 'none' === text.toLowerCase() ) {
		return 'none';
	}
	if ( /^[a-z][a-z0-9-]*$/i.test( text ) && 'inset' !== text.toLowerCase() ) {
		return `var(--wp--preset--shadow--${ text.toLowerCase() })`;
	}
	const layers = splitTop( text, ',' );
	if ( layers.length > MAX_LAYERS ) {
		return '';
	}
	const list = 'string' === typeof colour && '' !== colour.trim() ? splitTop( colour, ',' ).slice( 0, 64 ) : [];
	const out = [];
	let last = '';
	layers.forEach( ( layerText, index ) => {
		const fields = parseLayer( layerText );
		const entry = list[ index ] ?? '';
		if ( '' !== entry ) {
			last = entry;
		}
		if ( ! fields ) {
			return;
		}
		let css = DEFAULT_COLOUR;
		if ( null !== fields.colour ) {
			css = resolveColour( fields.colour );
		} else if ( '' !== last ) {
			css = resolveColour( last );
		}
		if ( null === css ) {
			return;
		}
		out.push(
			`${ fields.inset ? 'inset ' : '' }${ formatLength( fields.x ) } ${ formatLength( fields.y ) } ${ formatLength( fields.blur ) } ${ formatLength( fields.spread ) } ${ css }`
		);
	} );
	return out.join( ', ' );
}
