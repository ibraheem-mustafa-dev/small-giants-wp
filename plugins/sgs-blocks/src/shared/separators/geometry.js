/**
 * Separators — where the lines go, from measured item boxes.
 *
 * Pure geometry, no DOM, so it can be tested in Node. Given the boxes of a list's
 * items (relative to the list) it returns the line segments a gap-decoration
 * engine would draw: a vertical line centred in each gap between two items of a
 * row, and a horizontal line centred between a row and the row above it, drawn
 * only above an item that has something above it. Rows are found by vertical
 * overlap, so a wrapped flex line, an auto-fit grid and an incomplete last row
 * all work, and a line never dangles beside an empty cell (the behaviour of
 * `rule-visibility-items: between`).
 *
 * @package SGS\Blocks
 */

const EPS = 1;

/**
 * Group boxes into rows by vertical overlap, each row left to right.
 *
 * @param {Array<{left:number,top:number,right:number,bottom:number}>} boxes Item boxes.
 * @return {Array<{items:Array,top:number,bottom:number}>} Rows, top to bottom.
 */
export function groupRows( boxes ) {
	const sorted = [ ...boxes ].sort( ( a, b ) => a.top - b.top || a.left - b.left );
	const rows = [];
	for ( const box of sorted ) {
		const row = rows[ rows.length - 1 ];
		if ( row && box.top < row.bottom - EPS ) {
			row.items.push( box );
			row.bottom = Math.max( row.bottom, box.bottom );
		} else {
			rows.push( { items: [ box ], top: box.top, bottom: box.bottom } );
		}
	}
	rows.forEach( ( row ) => row.items.sort( ( a, b ) => a.left - b.left ) );
	return rows;
}

/**
 * Whether a row has an item on both sides of x (so a line there is flanked, not dangling).
 *
 * @param {{items:Array}|undefined} row Row.
 * @param {number}                  x   Horizontal position.
 * @return {boolean} True when flanked on both sides.
 */
function flankedAt( row, x ) {
	return !! row && row.items.some( ( b ) => b.right <= x + EPS ) && row.items.some( ( b ) => b.left >= x - EPS );
}

/**
 * Merge segments that touch end to end on the same line, so a dashed line stays one line.
 *
 * @param {Array<{at:number,from:number,to:number}>} segments Segments on one axis.
 * @return {Array<{at:number,from:number,to:number}>} Merged segments.
 */
function mergeSegments( segments ) {
	const sorted = [ ...segments ].sort( ( a, b ) => a.at - b.at || a.from - b.from );
	const merged = [];
	for ( const seg of sorted ) {
		const last = merged[ merged.length - 1 ];
		if ( last && Math.abs( last.at - seg.at ) <= EPS && seg.from <= last.to + EPS ) {
			last.to = Math.max( last.to, seg.to );
		} else {
			merged.push( { ...seg } );
		}
	}
	return merged;
}

/**
 * The vertical lines: one in each gap between neighbours of a row, running the
 * row's height and on through half the row gap towards a flanked neighbour row.
 *
 * @param {Array} rows Rows from groupRows().
 * @return {Array<{at:number,from:number,to:number}>} Segments (at = x, from/to = y).
 */
function columnSegments( rows ) {
	const out = [];
	rows.forEach( ( row, i ) => {
		for ( let k = 1; k < row.items.length; k++ ) {
			const a = row.items[ k - 1 ];
			const b = row.items[ k ];
			if ( b.left - a.right <= EPS ) {
				continue;
			}
			const x = ( a.right + b.left ) / 2;
			const above = rows[ i - 1 ];
			const below = rows[ i + 1 ];
			out.push( {
				at: x,
				from: flankedAt( above, x ) ? row.top - ( row.top - above.bottom ) / 2 : row.top,
				to: flankedAt( below, x ) ? row.bottom + ( below.top - row.bottom ) / 2 : row.bottom,
			} );
		}
	} );
	return mergeSegments( out );
}

/**
 * The horizontal lines: between a row and the one above it, only above an item
 * that has an item above it, stretching half a column gap towards each neighbour.
 *
 * @param {Array} rows Rows from groupRows().
 * @return {Array<{at:number,from:number,to:number}>} Segments (at = y, from/to = x).
 */
function rowSegments( rows ) {
	const out = [];
	for ( let i = 1; i < rows.length; i++ ) {
		const row = rows[ i ];
		const prev = rows[ i - 1 ];
		row.items.forEach( ( b, k ) => {
			const over = prev.items.filter( ( a ) => Math.min( a.right, b.right ) - Math.max( a.left, b.left ) > EPS );
			if ( ! over.length ) {
				return;
			}
			const left = row.items[ k - 1 ];
			const right = row.items[ k + 1 ];
			out.push( {
				at: ( Math.max( ...over.map( ( a ) => a.bottom ) ) + b.top ) / 2,
				from: left && b.left - left.right > EPS ? b.left - ( b.left - left.right ) / 2 : b.left,
				to: right && right.left - b.right > EPS ? b.right + ( right.left - b.right ) / 2 : b.right,
			} );
		} );
	}
	return mergeSegments( out );
}

/**
 * The line segments for a list.
 *
 * @param {Array<{left:number,top:number,right:number,bottom:number}>} boxes Item boxes, relative to the list.
 * @param {{column:boolean,row:boolean}}                                axes  Which axes draw.
 * @return {{column:Array,row:Array}} Segments per axis: `column` lines are vertical
 *                                    ({at:x, from:y1, to:y2}), `row` lines horizontal ({at:y, from:x1, to:x2}).
 */
export function separatorSegments( boxes, axes ) {
	const rows = groupRows( boxes );
	return {
		column: axes.column ? columnSegments( rows ) : [],
		row: axes.row ? rowSegments( rows ) : [],
	};
}
