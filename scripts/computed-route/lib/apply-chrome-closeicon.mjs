// The nav drawer's close glyph size (closeIconSize): the draft draws the cross as two rotated bars of a set length; the live glyph is
// the svg saved in the block's closeIcon (source custom), drawn in its viewBox and scaled to the size setting, so the size that gives
// a bar the draft's length is that length divided by the drawn stroke length per viewBox unit (its centreline plus one stroke width
// for round caps). The glyph geometry comes from the saved svg; a glyph that is not a saved custom svg of straight strokes is no-setting.
import { settle } from './apply-chrome-records.mjs';

const attr = ( tag, name ) => new RegExp( `\\b${ name }="([^"]*)"`, 'i' ).exec( tag )?.[ 1 ];

// The straight strokes of an svg as [x1, y1, x2, y2]: path data of M and L commands, and line elements. null when any other shape is drawn.
function strokes( svg ) {
	const out = [];
	for ( const m of svg.matchAll( /<path\b[^>]*>/gi ) ) {
		const d = attr( m[ 0 ], 'd' ) ?? '';
		if ( /[a-df-z]/i.test( d.replace( /[MLZ]/g, '' ) ) ) {
			return null;
		}
		let at = null;
		for ( const seg of d.matchAll( /([MLZ])([^MLZ]*)/g ) ) {
			const n = seg[ 2 ].trim().split( /[\s,]+/ ).filter( Boolean ).map( Number );
			if ( 'Z' === seg[ 1 ] ) {
				continue;
			}
			if ( n.length < 2 || n.some( ( v ) => ! Number.isFinite( v ) ) ) {
				return null;
			}
			for ( let i = 0; i + 1 < n.length; i += 2 ) {
				const p = [ n[ i ], n[ i + 1 ] ];
				if ( at && ( 'L' === seg[ 1 ] || i > 0 ) ) {
					out.push( [ ...at, ...p ] );
				}
				at = p;
			}
		}
	}
	for ( const m of svg.matchAll( /<line\b[^>]*>/gi ) ) {
		const v = [ 'x1', 'y1', 'x2', 'y2' ].map( ( k ) => Number( attr( m[ 0 ], k ) ) );
		if ( v.some( ( x ) => ! Number.isFinite( x ) ) ) {
			return null;
		}
		out.push( v );
	}
	return /<(circle|rect|polyline|polygon|ellipse)\b/i.test( svg ) ? null : out;
}

// Drawn length of the glyph's longest stroke per viewBox unit, or null when the svg's geometry cannot be read.
export function strokeLengthPerUnit( svg ) {
	const tag = /<svg\b[^>]*>/i.exec( svg )?.[ 0 ] ?? '';
	const box = ( attr( tag, 'viewBox' ) ?? '' ).trim().split( /[\s,]+/ ).map( Number );
	const list = strokes( svg );
	if ( 4 !== box.length || ! ( box[ 2 ] > 0 ) || ! list?.length ) {
		return null;
	}
	const width = Number( attr( tag, 'stroke-width' ) ?? 1 );
	const cap = 'butt' === ( attr( tag, 'stroke-linecap' ) ?? 'butt' ) ? 0 : width;
	const longest = Math.max( ...list.map( ( [ a, b, c, d ] ) => Math.hypot( c - a, d - b ) ) );
	return ( longest + cap ) / box[ 2 ];
}

// The draft's close bars: two siblings inside the drawer, rotated plus and minus 45 degrees, each a set px long. Returns the length or null.
export function draftBarLength( inventory, target ) {
	const within = ( e ) => {
		for ( let k = e.parentKey, hops = 0; k && hops < 12; hops++ ) {
			if ( k === target.tpl ) {
				return true;
			}
			k = inventory.find( ( p ) => p.key === k )?.parentKey;
		}
		return false;
	};
	const bars = inventory.filter( ( e ) => 'span' === e.tag && /rotate\(-?45deg\)/.test( e.attrs?.style ?? '' ) && within( e ) );
	const sides = new Set( bars.map( ( e ) => /rotate\((-?)45deg\)/.exec( e.attrs.style )[ 1 ] ) );
	const lengths = [ ...new Set( bars.map( ( e ) => /(?:^|[\s;])width:\s*([\d.]+)px/.exec( e.attrs.style )?.[ 1 ] ) ) ];
	return 2 === sides.size && 1 === lengths.length && lengths[ 0 ] ? Number( lengths[ 0 ] ) : null;
}

export function closeIconSize( { saved, target, clientData } ) {
	const bar = draftBarLength( clientData?.inventory ?? [], target );
	if ( null === bar ) {
		return [];
	}
	const svg = 'custom' === saved.closeIcon?.source ? String( saved.closeIcon.svg ?? '' ) : '';
	const per = svg ? strokeLengthPerUnit( svg ) : null;
	if ( ! per ) {
		return [ { status: 'no-setting', prop: 'closeIconSize', why: `${ target.tpl } the draft close glyph is two ${ bar }px bars; the saved closeIcon is not a custom svg of straight strokes, so its drawn length per pixel of size is not in the saved settings` } ];
	}
	const px = `${ Math.round( ( bar / per ) * 2 ) / 2 }px`;
	const tiers = [ 'desktop', ...[ 'tablet', 'mobile' ].filter( ( t ) => saved.closeIconSize?.[ t ] ) ];
	const value = { ...( saved.closeIconSize ?? {} ), ...Object.fromEntries( tiers.map( ( t ) => [ t, px ] ) ) };
	return [ settle( { prop: 'closeIconSize', why: `${ target.tpl } the draft close bars are ${ bar }px long; the saved glyph draws ${ ( per * 100 ).toFixed( 1 ) }% of its size as stroke length, so ${ px } draws ${ bar }px`, saved, writes: [ { attr: 'closeIconSize', value } ] } ) ];
}
