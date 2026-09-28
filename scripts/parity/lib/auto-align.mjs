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
