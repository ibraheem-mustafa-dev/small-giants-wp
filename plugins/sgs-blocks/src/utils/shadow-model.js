/**
 * Layered shadow MODEL for the ShadowControl panel: stored text <-> editable layers.
 *
 * A stored shadow is two text attributes (see `shadow-layers.js`): a SHAPE (layers separated by
 * top-level commas, or a bare preset slug, or `none`) and a COLOUR (one entry for every layer,
 * or a comma list matching the layers; an entry is `site`, a palette slug or a CSS colour, plus
 * an optional `N%` opacity). This file turns that text into layer objects the panel edits, and
 * back. It NEVER resets what it cannot understand: an unreadable layer is kept verbatim as a
 * `raw` layer and written back unchanged.
 *
 * Layer: { id, x, y, blur, spread, inset, colour, alpha, raw, valid }
 *   colour = the stored colour token ('site', a slug, '#RRGGBB', a CSS colour); alpha = 0 to 100.
 *   raw    = the layer's own text when the model cannot split it into fields ('' otherwise);
 *   valid  = whether the server will draw a raw layer (false = "won't display").
 *
 * Logic only, no React and no WordPress imports, so plain Node can load it.
 *
 * @package SGS\Blocks
 */
import { splitTop, parseLayer, formatLength, composeShadow, MAX_BYTES } from './shadow-layers.js';

export const UI_CAP = 6;
export const RAW_CAP = 8;
export const LOOKS = [ 'soft', 'crisp', 'long', 'glow', 'hard' ];

let counter = 0;
const nextId = () => `sl${ ++counter }`;
const round1 = ( v ) => Math.round( v * 10 ) / 10;
const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i;

function hexParts( hex ) {
	let digits = hex.slice( 1 );
	if ( digits.length <= 4 ) {
		digits = digits.replace( /./g, ( c ) => c + c );
	}
	const alpha = 8 === digits.length ? round1( ( parseInt( digits.slice( 6 ), 16 ) / 255 ) * 100 ) : 100;
	return { colour: `#${ digits.slice( 0, 6 ).toUpperCase() }`, alpha };
}

/**
 * Read one colour token (no opacity suffix) into { colour, alpha }, or null.
 *
 * @param {string} token Colour token.
 * @return {{colour:string,alpha:number}|null} Parsed colour.
 */
export function parseColourToken( token ) {
	const t = token.trim();
	if ( 'site' === t ) {
		return { colour: 'site', alpha: 100 };
	}
	if ( HEX.test( t ) ) {
		return hexParts( t );
	}
	let m = RGB.exec( t );
	if ( m ) {
		const raw = m[ 4 ] === undefined ? 1 : m[ 4 ].endsWith( '%' ) ? parseFloat( m[ 4 ] ) / 100 : parseFloat( m[ 4 ] );
		const hex = [ m[ 1 ], m[ 2 ], m[ 3 ] ].map( ( v ) => `0${ Math.min( 255, parseInt( v, 10 ) ).toString( 16 ) }`.slice( -2 ) ).join( '' );
		return { colour: `#${ hex.toUpperCase() }`, alpha: Math.min( 100, round1( raw * 100 ) ) };
	}
	if ( /^var\(--wp--custom--shadow-colour(?:\s*,[^)]*)?\)$/.test( t ) ) {
		return { colour: 'site', alpha: 100 };
	}
	m = /^var\(--wp--preset--color--([a-z0-9-]+)(?:\s*,[^)]*)?\)$/.exec( t );
	if ( m ) {
		return { colour: m[ 1 ], alpha: 100 };
	}
	m = /^color-mix\(in srgb,\s*(.+?)\s+(\d{1,3}(?:\.\d)?)%,\s*transparent\)$/.exec( t );
	if ( m ) {
		const inner = parseColourToken( m[ 1 ] );
		return inner ? { colour: inner.colour, alpha: Math.min( 100, parseFloat( m[ 2 ] ) ) } : null;
	}
	return /^[a-z][a-z0-9-]*$/i.test( t ) ? { colour: t, alpha: 100 } : null;
}

/**
 * Read one colour-list entry (`site 12%`, `#FF0000`, `primary`) into { colour, alpha }, or null.
 *
 * @param {string} entry Colour-list entry.
 * @return {{colour:string,alpha:number}|null} Parsed entry.
 */
export function parseColourEntry( entry ) {
	const tokens = splitTop( entry.trim(), ' ' );
	let alpha = null;
	const pct = tokens.length > 1 ? /^(\d{1,3}(?:\.\d)?)%$/.exec( tokens[ tokens.length - 1 ] ) : null;
	if ( pct ) {
		alpha = Math.min( 100, parseFloat( pct[ 1 ] ) );
		tokens.pop();
	}
	const base = 1 === tokens.length ? parseColourToken( tokens[ 0 ] ) : null;
	return base ? { colour: base.colour, alpha: alpha ?? base.alpha } : null;
}

/**
 * Build a layer object.
 *
 * @param {Object} fields Any of the layer fields.
 * @return {Object} Layer with an id.
 */
export function makeLayer( fields = {} ) {
	return { id: nextId(), x: 0, y: 4, blur: 12, spread: 0, inset: false, colour: 'site', alpha: 10, raw: '', valid: true, ...fields };
}

function rawLayer( text ) {
	return makeLayer( { x: 0, y: 0, blur: 0, spread: 0, alpha: 100, raw: text, valid: '' !== composeShadow( text, null ) } );
}

/**
 * Read stored shape + colour text into { kind, slug?, layers }. kind is `default` (empty:
 * the block's own default), `none`, `preset` (a theme shadow, by name) or `layers`.
 *
 * @param {string} shape  Stored shape text.
 * @param {string} colour Stored colour text.
 * @return {{kind:string,slug?:string,layers:Object[]}} Parsed shadow.
 */
export function parseStored( shape, colour ) {
	const text = 'string' === typeof shape ? shape.trim() : '';
	if ( '' === text ) {
		return { kind: 'default', layers: [] };
	}
	if ( 'none' === text.toLowerCase() ) {
		return { kind: 'none', layers: [] };
	}
	if ( /^[a-z][a-z0-9-]*$/i.test( text ) && 'inset' !== text.toLowerCase() ) {
		return { kind: 'preset', slug: text.toLowerCase(), layers: [] };
	}
	const list = 'string' === typeof colour && '' !== colour.trim() ? splitTop( colour, ',' ) : [];
	let last = '';
	const layers = splitTop( text, ',' ).map( ( layerText, index ) => {
		if ( '' !== ( list[ index ] ?? '' ) ) {
			last = list[ index ];
		}
		const fields = parseLayer( layerText );
		if ( ! fields ) {
			return rawLayer( layerText );
		}
		const source = null !== fields.colour ? fields.colour : last;
		const parsed = '' === source ? { colour: '#000000', alpha: 10 } : parseColourEntry( source );
		if ( ! parsed ) {
			return rawLayer( layerText );
		}
		return makeLayer( { x: fields.x, y: fields.y, blur: fields.blur, spread: fields.spread, inset: fields.inset, ...parsed } );
	} );
	return { kind: 'layers', layers };
}

const shapeOf = ( l ) => `${ l.inset ? 'inset ' : '' }${ formatLength( l.x ) } ${ formatLength( l.y ) } ${ formatLength( l.blur ) } ${ formatLength( l.spread ) }`;
const entryOf = ( l ) => `${ l.colour }${ l.alpha < 100 ? ` ${ round1( l.alpha ) }%` : '' }`;

/**
 * Write layers back to stored text. One colour entry when every layer agrees, else a list.
 *
 * @param {Object[]} layers Layers.
 * @return {{shape:string,colour:string}} Stored shape and colour text.
 */
export function serialise( layers ) {
	const entries = layers.map( ( l ) => ( l.raw ? '' : entryOf( l ) ) );
	const uniform = entries.length > 0 && entries.every( ( e ) => '' !== e && e === entries[ 0 ] );
	return {
		shape: layers.map( ( l ) => ( l.raw ? l.raw : shapeOf( l ) ) ).join( ', ' ),
		colour: uniform ? entries[ 0 ] : entries.join( ', ' ),
	};
}

/**
 * Layers as editable CSS text (the Raw CSS view): each layer composed the way the page does,
 * a layer that cannot be split into fields verbatim.
 *
 * @param {Object[]} layers Layers.
 * @return {string} CSS value, or '' for no layers.
 */
export function toCss( layers ) {
	return layers.map( ( l ) => ( l.raw ? l.raw : composeShadow( shapeOf( l ), entryOf( l ) ) ) ).join( ', ' );
}

/**
 * Read pasted CSS (`box-shadow: ...;`) into layers. Anything unreadable stays a raw layer.
 *
 * @param {string} css Pasted text.
 * @return {Object[]} Layers.
 */
export function parseCss( css ) {
	const text = css.replace( /^\s*box-shadow\s*:\s*/i, '' ).replace( /;\s*$/, '' ).trim();
	if ( '' === text || 'none' === text.toLowerCase() ) {
		return [];
	}
	return splitTop( text, ',' ).map( ( layerText ) => {
		const fields = parseLayer( layerText );
		const parsed = fields && null !== fields.colour ? parseColourEntry( fields.colour ) : null;
		return fields && parsed
			? makeLayer( { x: fields.x, y: fields.y, blur: fields.blur, spread: fields.spread, inset: fields.inset, ...parsed } )
			: rawLayer( layerText );
	} );
}

/**
 * Elevation builder: layers for elevation 1 to 6 in one of the looks. Numbers are derived from
 * published layered-shadow tiers (Comeau, Tailwind), tuned by eye; it is stateless, and the
 * panel recognises its own output by regenerating.
 *
 * @param {number} n         Elevation 0 to 6 (0 = none).
 * @param {string} look      One of LOOKS.
 * @param {number} intensity 0.2 to 1.
 * @param {string} colour    Colour token for every layer.
 * @return {Object[]} Layers.
 */
export function generate( n, look, intensity, colour ) {
	if ( n <= 0 ) {
		return [];
	}
	const L = ( x, y, blur, spread, alpha ) => makeLayer( { x, y, blur, spread, colour, alpha } );
	const Y = Math.pow( 2, n - 1 );
	if ( 'hard' === look ) {
		return [ L( n + 1, n + 1, 0, 0, 100 ) ];
	}
	if ( 'glow' === look ) {
		const blur = 6 + Y * 2;
		return [ L( 0, 0, blur, 0, Math.min( 100, Math.round( 120 * intensity ) ) ), L( 0, 0, Math.min( 100, blur * 2 ), 0, Math.min( 100, Math.round( 60 * intensity ) ) ) ];
	}
	const k = Math.min( 6, Math.max( 2, Math.round( Math.log2( Y ) ) + 2 ) );
	const spreadOf = { soft: 2, crisp: 0.75, long: 0.5 }[ look ];
	const tilt = { soft: -0.4, crisp: 0.67, long: 0 }[ look ];
	const out = [];
	for ( let i = 1; i <= k; i++ ) {
		const y = Y * Math.pow( i / k, 2.5 );
		if ( y < 0.5 ) {
			continue;
		}
		const blur = y * spreadOf;
		out.push( L( 0, round1( y ), round1( blur ), round1( -0.15 * blur ), round1( ( intensity / k ) * ( 1 + tilt * ( 1 - ( 2 * ( i - 1 ) ) / ( k - 1 ) ) ) * 100 ) ) );
	}
	return out;
}

const sameFields = ( a, b ) => a.x === b.x && a.y === b.y && a.blur === b.blur && a.spread === b.spread && a.inset === b.inset && a.colour === b.colour && a.alpha === b.alpha;

/**
 * Work out whether layers are exactly what the elevation builder would write.
 *
 * @param {Object[]} layers Layers.
 * @return {{n:number,look?:string,intensity?:number,colour?:string}|null} The settings, or null for custom.
 */
export function recognise( layers ) {
	if ( ! layers.length ) {
		return { n: 0 };
	}
	if ( layers.some( ( l ) => l.raw ) ) {
		return null;
	}
	const colours = [ ...new Set( [ 'site', layers[ 0 ].colour ] ) ];
	for ( let n = 1; n <= 6; n++ ) {
		for ( const look of LOOKS ) {
			for ( let i = 2; i <= 10; i++ ) {
				for ( const colour of colours ) {
					const made = generate( n, look, i / 10, colour );
					if ( made.length === layers.length && made.every( ( l, k ) => sameFields( l, layers[ k ] ) ) ) {
						return { n, look, intensity: i / 10, colour };
					}
				}
			}
		}
	}
	return null;
}

/**
 * Plain-English one-line summary of a layer.
 *
 * @param {Object} l Layer.
 * @return {string} Summary.
 */
export function summarise( l ) {
	if ( l.raw ) {
		return l.valid ? 'As written' : "Won't display";
	}
	const dir = l.y > 0 ? `${ l.y }px down` : l.y < 0 ? `${ -l.y }px up` : 'no offset';
	return `${ l.inset ? 'Inner' : 'Drop' } · ${ dir } · ${ l.blur }px blur`;
}

/**
 * Problems the server would act on, for one warning line in the panel.
 *
 * @param {string} shape Stored shape text.
 * @return {string} Warning, or ''.
 */
export function problemOf( shape ) {
	const text = 'string' === typeof shape ? shape : '';
	if ( text.length > MAX_BYTES ) {
		return 'This shadow is too long and will not display.';
	}
	const layers = parseStored( text, '' ).layers;
	if ( layers.length > RAW_CAP ) {
		return `More than ${ RAW_CAP } layers: none will display.`;
	}
	if ( layers.some( ( l ) => l.raw && ! l.valid ) ) {
		return "A layer that cannot be read will not display. Fix or delete it.";
	}
	return layers.some( ( l ) => l.blur > 60 ) ? 'Blur above 60px can look heavy and slow scrolling.' : '';
}
