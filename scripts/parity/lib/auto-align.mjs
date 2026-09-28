// Word and control alignment for the walker's automatic check (auto-compare.mjs).

// Myers' O(ND) diff: the index pairs of a longest common subsequence of two token lists, or null
// when the lists differ by more than maxD edits (pages too different to align word by word).
export function lcsPairs( a, b, maxD = 3000 ) {
	const n = a.length;
	const m = b.length;
	const max = n + m;
	if ( ! n || ! m ) {
		return [];
	}
	const off = max + 1;
	const v = new Int32Array( 2 * max + 3 );
	const trace = [];
	let found = -1;
	outer: for ( let d = 0; d <= Math.min( max, maxD ); d++ ) {
		trace.push( v.slice( off - d - 1, off + d + 2 ) );
		for ( let k = -d; k <= d; k += 2 ) {
			let x = ( k === -d || ( k !== d && v[ off + k - 1 ] < v[ off + k + 1 ] ) ) ? v[ off + k + 1 ] : v[ off + k - 1 ] + 1;
			let y = x - k;
			while ( x < n && y < m && a[ x ] === b[ y ] ) {
				x++;
				y++;
			}
			v[ off + k ] = x;
			if ( x >= n && y >= m ) {
				found = d;
				break outer;
			}
		}
	}
	if ( found < 0 ) {
		return null;
	}
	const pairs = [];
	let x = n;
	let y = m;
	for ( let d = found; d > 0; d-- ) {
		const w = trace[ d ];
		const get = ( k ) => w[ k + d + 1 ];
		const k = x - y;
		const pk = ( k === -d || ( k !== d && get( k - 1 ) < get( k + 1 ) ) ) ? k + 1 : k - 1;
		const px = get( pk );
		const py = px - pk;
		while ( x > px && y > py ) {
			pairs.push( [ --x, --y ] );
		}
		x = px;
		y = py;
	}
	while ( x > 0 && y > 0 ) {
		pairs.push( [ --x, --y ] );
	}
	return pairs.reverse();
}

// Runs of matched words, consecutive on both sides: [{ d: [..], l: [..] }].
function matchedRuns( pairs ) {
	const runs = [];
	for ( const [ di, li ] of pairs ) {
		const last = runs[ runs.length - 1 ];
		if ( last && last.d[ last.d.length - 1 ] === di - 1 && last.l[ last.l.length - 1 ] === li - 1 ) {
			last.d.push( di );
			last.l.push( li );
		} else {
			runs.push( { d: [ di ], l: [ li ] } );
		}
	}
	return runs;
}

// The error of placing draft words `d` (a run, in order) on live words `l`: how far their offset from the
// matched pairs just outside them (in draft order, same fixed layer) differs between the two sides.
// `swap` gives partners as they would be after a move; the result is the mean over the neighbours found.
function fitter( dw, lw, pairs ) {
	const partner = new Map( pairs );
	const sorted = [ ...partner.keys() ].sort( ( a, b ) => a - b );
	return ( d, l, swap = new Map() ) => {
		const at = ( di ) => ( swap.has( di ) ? swap.get( di ) : partner.get( di ) );
		let err = 0;
		let seen = 0;
		const prev = sorted.filter( ( i ) => i < d[ 0 ] ).pop();
		const next = sorted.find( ( i ) => i > d[ d.length - 1 ] );
		for ( const [ n, own ] of [ [ prev, 0 ], [ next, d.length - 1 ] ] ) {
			if ( undefined === n || dw[ n ].fixed !== dw[ d[ own ] ].fixed ) {
				continue;
			}
			const ln = lw[ at( n ) ];
			err += Math.abs( ( dw[ d[ own ] ].x - dw[ n ].x ) - ( lw[ l[ own ] ].x - ln.x ) ) + Math.abs( ( dw[ d[ own ] ].y - dw[ n ].y ) - ( lw[ l[ own ] ].y - ln.y ) );
			seen++;
		}
		return seen ? err / seen : Infinity;
	};
}

const textOf = ( idx, words ) => idx.map( ( i ) => words[ i ].t ).join( ' ' );

// Words that repeat ("from £59" on two cards, "frame" in a stage line and a footer link) pair by DOM order,
// so when the two sides order a card's parts or a page's blocks differently, a run can take the twin of
// its partner. A matched run moves to another live run with the same words when that fits the geometry of
// its matched neighbours far better: to live words left unmatched, or by swapping partners with the run
// that holds them. Then repeated words left over on both sides pair where the geometry says so.
export function repairRepeats( dw, lw, pairs ) {
	for ( let pass = 0; pass < 3; pass++ ) {
		const fit = fitter( dw, lw, pairs );
		const owner = new Map( pairs.map( ( [ di, li ] ) => [ li, di ] ) );
		const runs = matchedRuns( pairs );
		let best = null;
		for ( const run of runs ) {
			const t = textOf( run.d, dw );
			const k = run.d.length;
			const now = fit( run.d, run.l );
			if ( now <= 16 ) {
				continue;
			}
			for ( let s = 0; s + k <= lw.length; s++ ) {
				const alt = Array.from( { length: k }, ( _, n ) => s + n );
				if ( alt[ 0 ] === run.l[ 0 ] || textOf( alt, lw ) !== t ) {
					continue;
				}
				const free = alt.every( ( li ) => undefined === owner.get( li ) );
				// Held by exactly one other run of the same words: the two swap partners.
				const other = ! free && runs.find( ( r ) => r !== run && r.l.length === k && r.l[ 0 ] === alt[ 0 ] );
				if ( ! free && ! other ) {
					continue;
				}
				const swap = new Map( run.d.map( ( di, n ) => [ di, alt[ n ] ] ) );
				let before = now;
				let after;
				if ( other ) {
					other.d.forEach( ( di, n ) => swap.set( di, run.l[ n ] ) );
					before += fit( other.d, other.l );
					after = fit( run.d, alt, swap ) + fit( other.d, run.l, swap );
				} else {
					after = fit( run.d, alt, swap );
				}
				// Far better only: a quarter of the error and at least 24px less.
				if ( after <= before / 4 && before - after >= 24 && ( ! best || after < best.after ) ) {
					best = { swap, after };
				}
			}
			if ( best ) {
				break;
			}
		}
		if ( ! best ) {
			break;
		}
		pairs = pairs.map( ( [ di, li ] ) => [ di, best.swap.has( di ) ? best.swap.get( di ) : li ] );
	}
	return pairLeftoverTwins( dw, lw, pairs );
}

// A repeated word left over on both sides ("included" on two cards, never paired alone because it
// repeats) pairs with the one live twin that sits where its matched neighbours say (within 24px), when
// the next best twin is at least three times further off.
function pairLeftoverTwins( dw, lw, pairs ) {
	const fit = fitter( dw, lw, pairs );
	const usedD = new Set( pairs.map( ( p ) => p[ 0 ] ) );
	const usedL = new Set( pairs.map( ( p ) => p[ 1 ] ) );
	const added = [];
	for ( let di = 0; di < dw.length; di++ ) {
		if ( usedD.has( di ) ) {
			continue;
		}
		const scored = lw.map( ( w, li ) => ( ! usedL.has( li ) && w.t === dw[ di ].t && w.fixed === dw[ di ].fixed ? { li, err: fit( [ di ], [ li ] ) } : null ) )
			.filter( Boolean ).sort( ( x, y ) => x.err - y.err );
		if ( scored.length && scored[ 0 ].err <= 24 && ( scored.length < 2 || scored[ 1 ].err >= 3 * Math.max( scored[ 0 ].err, 8 ) ) ) {
			added.push( [ di, scored[ 0 ].li ] );
			usedL.add( scored[ 0 ].li );
		}
	}
	return [ ...pairs, ...added ].sort( ( x, y ) => x[ 0 ] - y[ 0 ] );
}
