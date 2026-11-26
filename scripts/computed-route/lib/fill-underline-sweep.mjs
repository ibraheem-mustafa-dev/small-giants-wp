// The animated underline (Spec 48 FR-48-81; the "sweep" look of the three underline looks): a link drawn with no line of its own
// whose underline grows on hover, either a gradient background whose width grows (`background-size: 0 2px` to `100% 2px`) or a
// ::before or ::after line whose width or horizontal scale grows, with a transition on the property that grows. sgs/button and
// every block with a link underline setting hold it as `linkUnderline: sweep` (includes/helpers-link-underline.php::
// sgs_link_underline_css). The plain underline (`always`, `hover`) is read from text-decoration-line and the keyword underline
// of a wrapper from `textDecoration`; those go through the resolver's enum readings (lib/resolve-enum.mjs).
import { LOOSE } from './resolve.mjs';
import { candidates } from './db.mjs';
import { enumValues } from './resolve-enum.mjs';
import { READ_WIDTHS } from './fill-read.mjs';
import { stateDrafts } from './fill-state-reach.mjs';

const ZERO = /^0(px|%|em|rem)?$/;
const firstToken = ( v ) => String( v ?? '' ).trim().split( /\s+/ )[ 0 ];
const isGradient = ( v ) => /gradient\(/.test( String( v ?? '' ) );
// A size that draws nothing: a zero width (the first value of a background-size, a layer's width).
export const sizeZero = ( v ) => ZERO.test( firstToken( v ) );
const sizeGrown = ( v ) => '' !== firstToken( v ) && ! sizeZero( v ) && 'auto' !== firstToken( v );
// The horizontal scale of a computed transform (`matrix(a, b, c, d, e, f)`), 1 when none is set.
export function scaleX( v ) {
	const m = /^matrix\(([^)]+)\)$/.exec( String( v ?? '' ).trim() );
	return m ? Math.hypot( ...m[ 1 ].split( ',' ).slice( 0, 2 ).map( Number ) ) : 'none' === String( v ?? 'none' ).trim() ? 1 : null;
}

// Whether a transition covers the property that grows: its transition-property names it (or `all`) and the duration is not zero.
export const transitions = ( styles, props ) => {
	const named = String( styles?.[ 'transition-property' ] ?? '' ).split( ',' ).map( ( s ) => s.trim() );
	const lasts = String( styles?.[ 'transition-duration' ] ?? '' ).split( ',' ).some( ( d ) => parseFloat( d ) > 0 );
	return lasts && named.some( ( n ) => 'all' === n || props.includes( n ) );
};

// One width: the look a link's reads give. rest: the link's resting styles; hover: { prop: value } its hover state declares;
// layers: { '::before': { rest: styles, hover: { prop: value } } }. Returns 'background', 'layer' or null.
export function sweepAt( { rest = {}, hover = {}, layers = {} } ) {
	if ( 'none' !== String( rest[ 'text-decoration-line' ] ?? 'none' ).trim() ) {
		return null;
	}
	if ( isGradient( rest[ 'background-image' ] ) && sizeZero( rest[ 'background-size' ] ) && sizeGrown( hover[ 'background-size' ] ) && transitions( rest, [ 'background-size', 'background-position' ] ) ) {
		return 'background';
	}
	for ( const layer of Object.values( layers ) ) {
		const r = layer.rest || {};
		const h = layer.hover || {};
		const grows = ( sizeZero( r.width ) && sizeGrown( h.width ) && transitions( rest, [ 'width' ] ) ) || ( null !== scaleX( r.transform ) && scaleX( r.transform ) < 0.05 && null !== scaleX( h.transform ) && scaleX( h.transform ) > 0.05 && transitions( rest, [ 'transform', 'scale' ] ) );
		if ( 'none' !== String( r.content ?? 'none' ).trim() && grows ) {
			return 'layer';
		}
	}
	return null;
}

// The sweep a draft element draws, read at every width it was read at: { widths } when it draws one at every width, else null.
// snaps: { width: snapshot } (styles, pseudo); looks: stateDrafts( reads, id ) (the draft's declared hover looks).
export function sweepLook( snaps, looks ) {
	const hoverAt = ( w, pseudo ) => Object.fromEntries( [ ...looks.values() ].filter( ( l ) => 'hover' === l.state && ( l.pseudo || '' ) === pseudo && undefined !== l.perWidth[ w ] ).map( ( l ) => [ l.prop, l.perWidth[ w ] ] ) );
	const widths = Object.keys( snaps ).map( Number ).filter( ( w ) => READ_WIDTHS.includes( w ) );
	const kinds = widths.map( ( w ) => sweepAt( {
		rest: snaps[ w ].styles || {},
		hover: hoverAt( w, '' ),
		layers: Object.fromEntries( [ '::before', '::after' ].map( ( l ) => [ l, { rest: snaps[ w ].pseudo?.[ l ] || {}, hover: hoverAt( w, l ) } ] ) ),
	} ) );
	return widths.length && kinds.every( Boolean ) ? { widths, kinds: [ ...new Set( kinds ) ] } : null;
}

// The setting that holds a sweep on `slot`: a setting of the block painting text-decoration-line there whose list holds `sweep`.
// Returns { attr, slot } or null.
export function sweepSetting( { db, cal, block, slot } ) {
	for ( const row of candidates( db, block, 'text-decoration-line', null ) ) {
		const s = cal?.settings?.[ row.attr_name ];
		if ( s && ! s.state && enumValues( row, undefined ).includes( 'sweep' ) && ( s.slots || [ s.slot ] ).some( ( p ) => LOOSE( p ) === LOOSE( slot ) ) ) {
			return { attr: row.attr_name, slot: s.slot };
		}
	}
	return null;
}

// The resolver-shaped result for an element that draws a sweep, or null: `linkUnderline: sweep` where the block holds one.
export function sweepResult( { db, cal, block, slot, snaps, reads, id } ) {
	const look = sweepLook( snaps, stateDrafts( reads, id ) );
	const setting = look ? sweepSetting( { db, cal, block, slot } ) : null;
	return setting ? { status: 'written', writes: [ { attr: setting.attr, value: 'sweep', merge: 'replace' } ], included: Object.fromEntries( look.widths.map( ( w ) => [ w, 'sweep' ] ) ), how: 'underline-sweep', slot: setting.slot, kinds: look.kinds } : null;
}
