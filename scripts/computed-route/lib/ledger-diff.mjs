// The clone difference ledger's comparison (tools/clone-ledger.mjs): one paired element's draft and live reads at one width
// turned into difference rows with the parity walker's own judgement (parity/lib/compare.mjs::comparePair: a colour as a colour
// within 2/255, a length within TOLERANCE.px, the box within TOLERANCE.box), plus the element's presence, whether it shows, its
// place inside the enclosing pair (x, y: never its page position, which every height above it moves) and its picture.
// Pure functions: no browser, no site.
import { comparePair, tagClass } from '../../parity/lib/compare.mjs';
import { PX_TOL } from './css-equivalence/tolerance.mjs';

// A length within half a pixel (the pixel after rounding); a box within 1px.
export const TOLERANCE = { box: 1, px: PX_TOL };

const STATIC = new Set( [ 'static', 'relative', 'sticky', undefined ] );
const OUT_OF_FLOW = new Set( [ 'absolute', 'fixed' ] );
const OFFSETS = [ 'left', 'top', 'right', 'bottom' ];
// Offsets mean something only on an out-of-flow box (the walker drops left and top the same way), and where the two sides
// place the box differently the position row carries it. Static against relative or sticky places nothing by itself, and a
// stacking order matters only between out-of-flow boxes.
const unplaced = ( key, d, l ) => {
	const [ pd, pl ] = [ d?.styles?.position, l?.styles?.position ];
	if ( OFFSETS.includes( key ) ) {
		return [ pd, pl ].every( ( p ) => STATIC.has( p ) ) || pd !== pl;
	}
	if ( 'position' === key || 'z-index' === key ) {
		return ! OUT_OF_FLOW.has( pd ) && ! OUT_OF_FLOW.has( pl );
	}
	return false;
};
// An alignment keyword and its flex form place alike (`end` and `flex-end`, `start` and `flex-start`) unless either side
// lays out in a reversed flex direction, where the flex form follows the reversed main axis.
const ALIGN = new Set( [ 'align-items', 'justify-content', 'align-content', 'align-self', 'justify-items', 'justify-self' ] );
const alignWord = ( v ) => String( v ?? '' ).trim().replace( /^flex-(start|end)$/, '$1' );
function sameAlignment( r, ds, ls ) {
	if ( ! ALIGN.has( r.key ) || r.pseudo ) {
		return false;
	}
	const reversed = [ ds, ls ].some( ( s ) => /reverse/.test( String( s?.styles?.[ 'flex-direction' ] ?? '' ) ) );
	return ! reversed && alignWord( r.draft ) === alignWord( r.live );
}

// The properties read from the element painting the first text (collect.mjs::collectPair): absent on a side that paints no text.
export const TEXT_READ = new Set( [ 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'color', 'text-shadow', 'text-decoration-line', 'text-decoration-color', 'text-decoration-thickness', 'text-underline-offset' ] );

// One side paints text and the other none: one `text presence` row in place of a row per text property.
function foldTextPresence( rows ) {
	const lone = rows.filter( ( r ) => TEXT_READ.has( r.key ) && ! r.pseudo && ( undefined === r.draft || undefined === r.live ) );
	if ( ! lone.length ) {
		return rows;
	}
	const keep = rows.filter( ( r ) => ! lone.includes( r ) );
	if ( ! keep.some( ( r ) => 'text presence' === r.key ) ) {
		keep.push( { kind: 'style', key: 'text presence', draft: undefined === lone[ 0 ].draft ? 'none' : 'text', live: undefined === lone[ 0 ].live ? 'none' : 'text' } );
	}
	return keep;
}

// The picture's name without its folder, size suffix and extension: an upload of the same picture keeps its name.
export const pictureName = ( src ) => String( src || '' ).split( /[?#]/ )[ 0 ].split( '/' ).pop().replace( /-\d+x\d+(?=\.)/, '' ).replace( /-scaled(?=\.)/, '' ).replace( /\.[a-z0-9]+$/i, '' ).toLowerCase();

const boxOf = ( r ) => r?.snap?.box || r?.box || null;

// Difference rows for one target at one width: [ { key, pseudo?, kind, draft, live } ]. d, l: readBatchInPage records (or
// undefined); pd, pl: the enclosing pair's records, for the relative place.
export function pairDiffs( d, l, pd = null, pl = null, tol = TOLERANCE ) {
	const rows = [];
	const add = ( kind, key, draft, live, extra = {} ) => rows.push( { kind, key, draft, live, ...extra } );
	const dFound = !! d?.found;
	const lFound = !! l?.found;
	if ( ! dFound && ! lFound ) {
		return rows;
	}
	if ( dFound !== lFound ) {
		const shown = dFound ? d.shown : l.shown;
		if ( shown ) {
			add( 'presence', 'element', dFound ? 'present' : 'missing', lFound ? 'present' : 'missing' );
		}
		return rows;
	}
	if ( !! d.shown !== !! l.shown ) {
		add( 'presence', 'shown', d.shown ? 'shown' : 'hidden', l.shown ? 'shown' : 'hidden' );
		return rows;
	}
	if ( ! d.shown ) {
		return rows;
	}
	const [ ds, ls ] = [ d.snap, l.snap ];
	if ( ds && ls ) {
		// An element kind that differs is its own row (tagClass, as the walker judges it) and never stops the look's
		// comparison: a layer printed as a span still paints a box, a ground and a place.
		if ( ds.tag && ls.tag && tagClass( ds.tag ) !== tagClass( ls.tag ) ) {
			add( 'tag', 'tag', `<${ ds.tag }> (${ tagClass( ds.tag ) })`, `<${ ls.tag }> (${ tagClass( ls.tag ) })` );
		}
		for ( const r of comparePair( { draft: 'draft', live: 'live', box: [ 'w', 'h' ] }, { ...ds, tag: null }, { ...ls, tag: null }, tol ) ) {
			if ( unplaced( r.key, ds, ls ) || sameAlignment( r, ds, ls ) ) {
				continue;
			}
			add( r.kind, r.key, r.draft, r.live, r.pseudo ? { pseudo: r.pseudo } : {} );
		}
		if ( ds.img && ls.img && pictureName( ds.img.src ) !== pictureName( ls.img.src ) ) {
			add( 'content', 'img', ds.img.src, ls.img.src );
		}
	} else {
		const [ bd, bl ] = [ boxOf( d ), boxOf( l ) ];
		for ( const k of [ 'w', 'h' ] ) {
			if ( bd && bl && Math.abs( bd[ k ] - bl[ k ] ) > tol.box ) {
				add( 'box', k, bd[ k ], bl[ k ] );
			}
		}
	}
	// The place inside the enclosing pair.
	const [ bd, bl, bpd, bpl ] = [ boxOf( d ), boxOf( l ), boxOf( pd ), boxOf( pl ) ];
	if ( bd && bl && bpd && bpl ) {
		for ( const k of [ 'x', 'y' ] ) {
			const [ a, b ] = [ bd[ k ] - bpd[ k ], bl[ k ] - bpl[ k ] ];
			if ( Math.abs( a - b ) > tol.box ) {
				add( 'box', k, a, b );
			}
		}
	}
	return foldTextPresence( rows );
}

// Whether an unpaired draft element paints anything a visitor sees at that width: words, a picture, a ground, a border or a
// shadow. Returns the list of what it paints (empty for a bare layout wrapper).
export function paintsOf( rec ) {
	const s = rec?.snap;
	if ( ! rec?.shown || ! s ) {
		return [];
	}
	const st = s.styles || {};
	const out = [];
	if ( s.text && 'own' === s.textFrom ) {
		out.push( 'text' );
	}
	if ( s.img ) {
		out.push( 'picture' );
	}
	if ( st[ 'background-color' ] && ! /rgba\(0, 0, 0, 0\)|transparent/.test( st[ 'background-color' ] ) ) {
		out.push( 'background-color' );
	}
	if ( st[ 'background-image' ] && 'none' !== st[ 'background-image' ] ) {
		out.push( 'background-image' );
	}
	if ( [ 'top', 'bottom', 'left', 'right' ].some( ( side ) => parseFloat( st[ `border-${ side }-width` ] ) > 0 && 'none' !== ( st[ `border-${ side }-style` ] ?? st[ 'border-top-style' ] ) ) ) {
		out.push( 'border' );
	}
	if ( st[ 'box-shadow' ] && 'none' !== st[ 'box-shadow' ] ) {
		out.push( 'box-shadow' );
	}
	if ( s.pseudo && Object.keys( s.pseudo ).length ) {
		out.push( ...Object.keys( s.pseudo ) );
	}
	if ( 'svg' === s.tag || 'svg' === s.iconKind ) {
		out.push( 'icon' );
	}
	return out;
}
