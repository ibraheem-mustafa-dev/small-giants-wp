// The bare decorative layers of a draft: one reading of which of them something else delivers (the skeleton rule
// `decorationDelivered` and the applier's layers family both read it), the ref a layer's block carries, and the edges
// its inline style declares.
import { specHit } from './skeleton-facts.mjs';

// The delivered kind (decisions `rules.decorationDelivered.kinds`) an inventory element or proposal row matches, or null.
export function deliveredKind( kinds, { snippet = '', attrs = {} } ) {
	const source = `${ snippet || '' } ${ attrs?.style || '' }`;
	return ( kinds || [] ).find( ( k ) => specHit( k, source ) ) || null;
}

// The class a layer's inserted block carries, one per draft element: `cr-ref-<surface>-L<tpl>`, with `-<copy>` for the copies
// of a repeated template element after the first (`Root/361#2` on `our-story` is `cr-ref-our-story-L361-2`).
export function layerRef( surface, key ) {
	const m = /^(.+)\/(\d+)#(\d+)$/.exec( String( key ) );
	if ( ! m ) {
		return null;
	}
	const chain = 'Root' === m[ 1 ] ? '' : m[ 1 ].replace( /[^A-Za-z0-9]+/g, '' ) + '-';
	const copy = Number( m[ 3 ] ) ? '-' + m[ 3 ] : '';
	return `cr-ref-${ surface }-L${ chain }${ m[ 2 ] }${ copy }`;
}

const SIDES = [ 'top', 'right', 'bottom', 'left' ];

// The sides an inline style places a layer by: { top, right, bottom, left } as booleans. `inset` is the shorthand for all four
// (one to four values, in top, right, bottom, left order).
export function declaredSides( style ) {
	const out = { top: false, right: false, bottom: false, left: false };
	for ( const part of String( style || '' ).split( ';' ) ) {
		const at = part.indexOf( ':' );
		if ( at < 1 ) {
			continue;
		}
		const name = part.slice( 0, at ).trim().toLowerCase();
		const value = part.slice( at + 1 ).trim();
		if ( 'inset' === name && value ) {
			const [ t, r = t, b = t, l = r ] = value.split( /\s+(?![^(]*\))/ );
			[ t, r, b, l ].forEach( ( token, i ) => ( out[ SIDES[ i ] ] = 'auto' !== token ) );
		} else if ( SIDES.includes( name ) && value && 'auto' !== value ) {
			out[ name ] = true;
		}
	}
	return out;
}
