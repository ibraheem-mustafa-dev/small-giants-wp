// The walker's automatic check (GAP-CHECKLIST.md section 12): aligns every painted word of the
// draft with the live page's, and every control and media item, then reports what no config has to
// name: words on one side only, words that moved against their neighbour, text styles, controls
// missing or resized or moved, and controls cut off at a clipping edge.
import { sameValue } from './compare.mjs';
import { lcsPairs } from './auto-align.mjs';

// Consecutive indices grouped into runs: [[3,4,5],[9]].
const runsOf = ( idx ) => idx.reduce( ( out, i ) => {
	const last = out[ out.length - 1 ];
	if ( last && last[ last.length - 1 ] === i - 1 ) {
		last.push( i );
	} else {
		out.push( [ i ] );
	}
	return out;
}, [] );
const quote = ( ws ) => `"${ ws.map( ( w ) => w.t ).join( ' ' ).slice( 0, 60 ) }"`;

// Words matched in reading order, then words that moved to another place in the DOM (runs of two
// or more, so a lone common word is not paired across the page).
function matchWords( dw, lw ) {
	const first = lcsPairs( dw.map( ( w ) => w.t ), lw.map( ( w ) => w.t ) );
	if ( ! first ) {
		return null;
	}
	const usedD = new Set( first.map( ( p ) => p[ 0 ] ) );
	const usedL = new Set( first.map( ( p ) => p[ 1 ] ) );
	const restD = dw.map( ( w, i ) => i ).filter( ( i ) => ! usedD.has( i ) );
	const restL = lw.map( ( w, i ) => i ).filter( ( i ) => ! usedL.has( i ) );
	const second = ( lcsPairs( restD.map( ( i ) => dw[ i ].t ), restL.map( ( i ) => lw[ i ].t ) ) || [] ).map( ( [ a, b ] ) => [ restD[ a ], restL[ b ] ] );
	const kept = second.filter( ( p, i ) => {
		const linked = ( q ) => q && Math.abs( q[ 0 ] - p[ 0 ] ) === 1 && Math.abs( q[ 1 ] - p[ 1 ] ) === 1;
		return linked( second[ i - 1 ] ) || linked( second[ i + 1 ] );
	} );
	return [ ...first, ...kept ].sort( ( a, b ) => a[ 0 ] - b[ 0 ] );
}

const STYLE_KEYS = [ 'fs', 'fw', 'ff', 'fst', 'tt', 'ls', 'c' ];
const STYLE_NAMES = { fs: 'font-size', fw: 'font-weight', ff: 'font-family', fst: 'font-style', tt: 'text-transform', ls: 'letter-spacing', c: 'color' };
const px0 = ( v ) => ( 'normal' === v ? '0px' : v );
const sameStyle = ( k, a, b, tol ) => ( 'ls' === k ? sameValue( 'letter-spacing', px0( a ), px0( b ), tol.px ) : sameValue( STYLE_NAMES[ k ], a, b, tol.px ) );

// Returns [{ kind: 'auto', key, draft, live }] for one state at one width.
export function compareAuto( D, L, tol = {} ) {
	const t = { move: 4, box: 3, px: 0.5, ...tol };
	const rows = [];
	const seen = new Map();
	const add = ( key, draft, live ) => {
		const n = ( seen.get( key ) || 0 ) + 1;
		seen.set( key, n );
		rows.push( { kind: 'auto', key: n > 1 ? `${ key } #${ n }` : key, draft, live } );
	};
	if ( ! D || ! L ) {
		return rows;
	}
	// Both sides show a modal: compare what is in it, not the page behind.
	if ( D.words.some( ( w ) => w.m ) && L.words.some( ( w ) => w.m ) ) {
		const only = ( x ) => ( { ...x, words: x.words.filter( ( w ) => w.m ), controls: x.controls.filter( ( c ) => c.m ) } );
		D = only( D );
		L = only( L );
	}
	const pairs = matchWords( D.words, L.words );
	if ( ! pairs ) {
		add( 'align', `${ D.words.length } words`, `${ L.words.length } words: too different to align word by word` );
		return rows;
	}
	const inD = new Set( pairs.map( ( p ) => p[ 0 ] ) );
	const inL = new Set( pairs.map( ( p ) => p[ 1 ] ) );
	for ( const run of runsOf( D.words.map( ( w, i ) => i ).filter( ( i ) => ! inD.has( i ) ) ) ) {
		add( `text-missing ${ quote( run.map( ( i ) => D.words[ i ] ) ) }`, 'shown', 'missing' );
	}
	for ( const run of runsOf( L.words.map( ( w, i ) => i ).filter( ( i ) => ! inL.has( i ) ) ) ) {
		add( `text-extra ${ quote( run.map( ( i ) => L.words[ i ] ) ) }`, 'missing', 'shown' );
	}

	// Position: each word's offset from the previous matched word (fixed layers compared on their own).
	for ( const fixed of [ false, true ] ) {
		let prev = null;
		for ( const [ di, li ] of pairs.filter( ( [ di ] ) => D.words[ di ].fixed === fixed ) ) {
			const d = D.words[ di ];
			const l = L.words[ li ];
			if ( prev ) {
				const rd = [ d.x - prev.d.x, d.y - prev.d.y ];
				const rl = [ l.x - prev.l.x, l.y - prev.l.y ];
				if ( Math.abs( rd[ 0 ] - rl[ 0 ] ) > t.move || Math.abs( rd[ 1 ] - rl[ 1 ] ) > t.move ) {
					const next = pairs.filter( ( p ) => p[ 0 ] > di ).slice( 0, 3 ).map( ( p ) => D.words[ p[ 0 ] ] );
					add( `moved "${ prev.d.t } → ${ [ d, ...next ].map( ( w ) => w.t ).join( ' ' ).slice( 0, 50 ) }"${ fixed ? ' (fixed layer)' : '' }`, `${ rd[ 0 ] },${ rd[ 1 ] }`, `${ rl[ 0 ] },${ rl[ 1 ] }` );
				}
			}
			prev = { d, l };
		}
	}

	// Text style: consecutive words sharing the same difference make one row.
	for ( const k of STYLE_KEYS ) {
		let run = null;
		const flush = () => run && add( `style:${ STYLE_NAMES[ k ] } ${ quote( run.ws ) }`, run.d, run.l );
		for ( const [ di, li ] of pairs ) {
			const a = D.words[ di ][ k ];
			const b = L.words[ li ][ k ];
			if ( sameStyle( k, a, b, t ) ) {
				flush();
				run = null;
			} else if ( run && run.d === a && run.l === b && run.last === di - 1 ) {
				run.ws.push( D.words[ di ] );
				run.last = di;
			} else {
				flush();
				run = { d: a, l: b, ws: [ D.words[ di ] ], last: di };
			}
		}
		flush();
	}
	rows.push( ...compareControls( D, L, pairs, t, add ) );
	return rows;
}

// The word nearest a control on its own side (edge to edge, same fixed layer): its anchor.
function anchorOf( c, words ) {
	let best = -1;
	let bestDist = Infinity;
	words.forEach( ( w, i ) => {
		if ( w.fixed !== c.fixed ) {
			return;
		}
		const dx = Math.max( 0, w.x - ( c.x + c.w ), c.x - ( w.x + w.w ) );
		const dy = Math.max( 0, w.y - ( c.y + c.h ), c.y - ( w.y + w.h ) );
		const dist = Math.hypot( dx, dy );
		if ( dist < bestDist ) {
			bestDist = dist;
			best = i;
		}
	} );
	return best;
}

// Controls and media: a draft control pairs with the live control of its type anchored to the matched
// partner of its own anchor word (so one missing row does not shift every later pairing); the rest pair
// by type in reading order.
function pairControls( D, L, pairs ) {
	const partner = new Map( pairs );
	const da = D.controls.map( ( c ) => anchorOf( c, D.words ) );
	const la = L.controls.map( ( c ) => anchorOf( c, L.words ) );
	const used = new Set();
	const cp = [];
	D.controls.forEach( ( d, i ) => {
		const target = partner.get( da[ i ] );
		if ( undefined === target ) {
			return;
		}
		let best = null;
		L.controls.forEach( ( l, j ) => {
			if ( used.has( j ) || l.type !== d.type || la[ j ] !== target ) {
				return;
			}
			const off = Math.abs( ( l.x - L.words[ target ].x ) - ( d.x - D.words[ da[ i ] ].x ) ) + Math.abs( ( l.y - L.words[ target ].y ) - ( d.y - D.words[ da[ i ] ].y ) );
			if ( ! best || off < best.off ) {
				best = { j, off };
			}
		} );
		if ( best ) {
			used.add( best.j );
			cp.push( [ i, best.j ] );
		}
	} );
	const restD = D.controls.map( ( c, i ) => i ).filter( ( i ) => ! cp.some( ( p ) => p[ 0 ] === i ) );
	const restL = L.controls.map( ( c, j ) => j ).filter( ( j ) => ! used.has( j ) );
	const rest = ( lcsPairs( restD.map( ( i ) => D.controls[ i ].type ), restL.map( ( j ) => L.controls[ j ].type ) ) || [] ).map( ( [ a, b ] ) => [ restD[ a ], restL[ b ] ] );
	return { cp: [ ...cp, ...rest ].sort( ( a, b ) => a[ 0 ] - b[ 0 ] ), da };
}

function compareControls( D, L, pairs, t, add ) {
	const dc = D.controls;
	const lc = L.controls;
	const { cp, da } = pairControls( D, L, pairs );
	const inD = new Set( cp.map( ( p ) => p[ 0 ] ) );
	const inL = new Set( cp.map( ( p ) => p[ 1 ] ) );
	const name = ( c ) => `${ c.type }${ c.label ? ` "${ c.label }"` : '' }`;
	dc.forEach( ( c, i ) => ! inD.has( i ) && add( `control-missing ${ name( c ) }`, `${ c.w }x${ c.h }`, 'missing' ) );
	lc.forEach( ( c, i ) => ! inL.has( i ) && add( `control-extra ${ name( c ) }`, 'missing', `${ c.w }x${ c.h }` ) );
	const partner = new Map( pairs );
	// How far the text around a control moved: its anchor word's shift, else the nearest matched word's.
	const shift = ( c, i ) => {
		if ( partner.has( da[ i ] ) ) {
			const w = D.words[ da[ i ] ];
			const lw = L.words[ partner.get( da[ i ] ) ];
			return { dx: lw.x - w.x, dy: lw.y - w.y, t: w.t };
		}
		let best = null;
		for ( const [ di, li ] of pairs ) {
			const w = D.words[ di ];
			const dist = w.fixed === c.fixed ? Math.hypot( w.x - c.x, w.y - c.y ) : Infinity;
			if ( ! best || dist < best.dist ) {
				best = { dist, dx: L.words[ li ].x - w.x, dy: L.words[ li ].y - w.y, t: w.t };
			}
		}
		return best;
	};
	for ( const [ di, li ] of cp ) {
		const d = dc[ di ];
		const l = lc[ li ];
		// A range input's height does not paint (its handles do), so only its width is compared.
		if ( Math.abs( d.w - l.w ) > t.box || ( 'input:range' !== d.type && Math.abs( d.h - l.h ) > t.box ) ) {
			add( `control-size ${ name( d ) }`, `${ d.w }x${ d.h }`, `${ l.w }x${ l.h }` );
		}
		const s = shift( d, di );
		if ( s && ( Math.abs( l.x - d.x - s.dx ) > t.move || Math.abs( l.y - d.y - s.dy ) > t.move ) ) {
			// Draft 0,0 is where live would sit had it moved with the text; live is how far off it is.
			add( `control-moved ${ name( d ) } (against "${ s.t }")`, '0,0', `${ l.x - d.x - s.dx },${ l.y - d.y - s.dy }` );
		}
		if ( d.cut !== undefined && l.cut !== undefined && d.cut !== l.cut ) {
			add( `clipped ${ name( d ) }`, d.cut || 'whole', l.cut || 'whole' );
		}
	}
	return [];
}
