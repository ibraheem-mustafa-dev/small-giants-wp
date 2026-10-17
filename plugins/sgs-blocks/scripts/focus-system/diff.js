'use strict';

/**
 * A line-based unified diff (Myers O(ND)) for check-focus-system.js --fix. The diff is the
 * artefact the owner inspects, so it carries three lines of context like `git diff`.
 *
 * @package SGS\Blocks
 */

/** Edit script between two line arrays: a list of [op, line] with op ' ', '-' or '+'. */
function editScript( a, b ) {
	const n = a.length;
	const m = b.length;
	const max = n + m;
	const v = new Map( [ [ 1, 0 ] ] );
	const trace = [];
	for ( let d = 0; d <= max; d++ ) {
		trace.push( new Map( v ) );
		for ( let k = -d; k <= d; k += 2 ) {
			let x;
			if ( k === -d || ( k !== d && ( v.get( k - 1 ) || 0 ) < ( v.get( k + 1 ) || 0 ) ) ) {
				x = v.get( k + 1 ) || 0;
			} else {
				x = ( v.get( k - 1 ) || 0 ) + 1;
			}
			let y = x - k;
			while ( x < n && y < m && a[ x ] === b[ y ] ) {
				x++;
				y++;
			}
			v.set( k, x );
			if ( x >= n && y >= m ) {
				return backtrack( trace, a, b, d );
			}
		}
	}
	return [];
}

function backtrack( trace, a, b, dEnd ) {
	const ops = [];
	let x = a.length;
	let y = b.length;
	for ( let d = dEnd; d > 0; d-- ) {
		const v = trace[ d ];
		const k = x - y;
		const down = k === -d || ( k !== d && ( v.get( k - 1 ) || 0 ) < ( v.get( k + 1 ) || 0 ) );
		const prevK = down ? k + 1 : k - 1;
		const prevX = v.get( prevK ) || 0;
		const prevY = prevX - prevK;
		while ( x > prevX && y > prevY ) {
			ops.push( [ ' ', a[ --x ] ] );
			y--;
		}
		if ( down ) {
			ops.push( [ '+', b[ --y ] ] );
		} else {
			ops.push( [ '-', a[ --x ] ] );
		}
	}
	while ( x > 0 && y > 0 ) {
		ops.push( [ ' ', a[ --x ] ] );
		y--;
	}
	return ops.reverse();
}

/**
 * @param {string} before
 * @param {string} after
 * @param {string} rel
 * @returns {string} unified diff, or '' when the texts are equal
 */
function unifiedDiff( before, after, rel ) {
	if ( before === after ) {
		return '';
	}
	const a = before.split( '\n' );
	const b = after.split( '\n' );
	const ops = editScript( a, b );
	const ctx = 3;
	const out = [ `--- a/${ rel }`, `+++ b/${ rel }` ];
	let i = 0;
	let aLine = 1;
	let bLine = 1;
	while ( i < ops.length ) {
		if ( ' ' === ops[ i ][ 0 ] ) {
			i++;
			aLine++;
			bLine++;
			continue;
		}
		let start = i;
		let sa = aLine;
		let sb = bLine;
		for ( let c = 0; c < ctx && start > 0 && ' ' === ops[ start - 1 ][ 0 ]; c++ ) {
			start--;
			sa--;
			sb--;
		}
		let end = i;
		let tail = 0;
		while ( end < ops.length && tail <= 2 * ctx ) {
			tail = ' ' === ops[ end ][ 0 ] ? tail + 1 : 0;
			end++;
		}
		end = Math.min( ops.length, end - Math.max( 0, tail - ctx ) );
		const hunk = ops.slice( start, end );
		const aCount = hunk.filter( ( o ) => '+' !== o[ 0 ] ).length;
		const bCount = hunk.filter( ( o ) => '-' !== o[ 0 ] ).length;
		out.push( `@@ -${ sa },${ aCount } +${ sb },${ bCount } @@` );
		for ( const [ op, line ] of hunk ) {
			out.push( op + line.replace( /\r$/, '' ) );
		}
		for ( let j = i; j < end; j++ ) {
			if ( '+' !== ops[ j ][ 0 ] ) {
				aLine++;
			}
			if ( '-' !== ops[ j ][ 0 ] ) {
				bLine++;
			}
		}
		i = end;
	}
	return out.join( '\n' ) + '\n';
}

module.exports = { unifiedDiff };
