/**
 * The one stagger delay function (Spec 38A §8, FR-38A-24). Pure: no React, no DOM, nothing measured from a rendered
 * page, so the delays it returns never change with the viewport width. The stagger helper atom calls it to preview and
 * to write each child's delay; M4's re-run reuses it; `includes/motion/class-sgs-motion-stagger.php` mirrors it for
 * server-written loops and `tests/js/stagger-delays.test.js` fixes its contract.
 *
 * Contract
 * --------
 * `computeStaggerDelays( settings )` returns an array of `count` whole-number delays in milliseconds, in document
 * order (index 0 is the first child). Inputs, all plain numbers, booleans or strings:
 *
 * - `count`   Number of children (a whole number; below 0 is treated as 0).
 * - `columns` Column count of the container at the device being written. 1, 0, a missing or an invalid value means
 *             "no column count": a single column, with no row restart.
 * - `offset`  Start offset in ms: the delay of the first position (default 0).
 * - `step`    Step in ms between neighbouring positions (default 0).
 * - `order`   A name in `STAGGER_ORDERS`: `row-first`, `column-first`, `from-centre`, `reverse` (the schema's
 *             `Stagger.order` enum) or `flatten` (see below). An unknown name falls back to `row-first`.
 * - `perRow`  Restart the sequence at each visual line (default true). It only matters when `columns` is above 1.
 * - `cap`     Maximum total delay in ms; the cap INCLUDES the offset (D7). A missing, null or non-finite cap means no
 *             cap. A cap below the offset gives every child the cap.
 *
 * Every number is clamped to be finite and at least 0; delays are rounded to whole milliseconds.
 *
 * Positions. Each child gets a position, and its delay is `min( offset + position * step, cap )`.
 *
 * - `row-first`: with columns and a restart, the position is the child's column (3 columns, 6 children: 0 1 2 0 1 2).
 *   With no restart or no column count it is the child's index (a single running ladder).
 * - `column-first`: the sequence runs down the columns, so with columns and a restart the position is the child's row
 *   (3 columns, 6 children: 0 0 0 1 1 1). With columns and no restart it is the child's rank when the grid is read
 *   column by column. With no column count it is the child's index.
 * - `from-centre`: the position is the distance from the middle of the line (a row of `columns` children, or all
 *   children when there is no restart): the middle starts first, outwards from there. 5 in a line: 2 1 0 1 2; 4 in a
 *   line: 1 0 0 1.
 * - `reverse`: `row-first` counted backwards: the last position of each line starts first.
 * - `flatten`: one running index across every child regardless of columns or restart. A container whose items sit in
 *   nested containers (Spec 38A v1.6, for example a footer whose columns each hold a list of links) passes the nested items' total as `count`, in document order,
 *   and gets one ladder across them. It is not in the schema's order list yet, so the helper atom does not offer it
 *   until the schema enum names it; the function already accepts it.
 *
 * Adding an order is one entry in `STAGGER_ORDERS`: a function from the normalised grid to the positions. Nothing else
 * in this file or in the helper atom changes (the atom offers whatever the schema enum lists, and a test fails for an
 * enum value this file does not implement).
 *
 * `computeCloseDelays( delays, direction )` derives the close delays for an `open`-trigger entrance from the open
 * delays: `same` repeats them, `reversed` mirrors them inside their own range so the last child to open is the first
 * to close and the cap still holds, and `together` closes every child at once (every delay 0).
 *
 * @package
 */

const toCount = ( value ) => {
	const num = Number( value );
	return Number.isFinite( num ) ? Math.max( 0, Math.floor( num ) ) : 0;
};

const isBlank = ( value ) =>
	value === null || value === undefined || value === '';

const toMs = ( value, fallback = 0 ) => {
	if ( isBlank( value ) ) {
		return fallback;
	}
	const num = Number( value );
	return Number.isFinite( num ) ? Math.max( 0, num ) : fallback;
};

// The grid every order reads. `restart` is true only when there is more than one column and the sequence restarts at
// each line. `lineSize` is how many children a line holds in that case, else all of them.
function gridOf( count, columns, restart ) {
	const indices = Array.from( { length: count }, ( _, i ) => i );
	return {
		count,
		columns,
		restart,
		indices,
		column: indices.map( ( i ) => i % columns ),
		row: indices.map( ( i ) => Math.floor( i / columns ) ),
		rows: Math.ceil( count / columns ),
		lineSize: restart ? columns : count,
		indexInLine: restart
			? indices.map( ( i ) => i % columns )
			: indices.slice(),
	};
}

/**
 * Every stagger order: a function from the normalised grid to one position per child.
 */
export const STAGGER_ORDERS = Object.freeze( {
	'row-first': ( grid ) => grid.indexInLine,
	'column-first': ( grid ) => {
		if ( grid.columns === 1 ) {
			return grid.indices.slice();
		}
		return grid.restart
			? grid.row
			: grid.indices.map(
					( i ) => grid.column[ i ] * grid.rows + grid.row[ i ]
			  );
	},
	'from-centre': ( grid ) =>
		grid.indexInLine.map( ( j ) =>
			Math.floor( Math.abs( j - ( grid.lineSize - 1 ) / 2 ) )
		),
	reverse: ( grid ) =>
		grid.indexInLine.map( ( j ) => grid.lineSize - 1 - j ),
	flatten: ( grid ) => grid.indices.slice(),
} );

/**
 * The delay of every child, in milliseconds.
 *
 * @param {Object}  settings
 * @param {number}  settings.count     Number of children.
 * @param {number}  [settings.columns] Column count at this device; 1 or missing means a single column.
 * @param {number}  [settings.offset]  Start offset in ms (default 0).
 * @param {number}  [settings.step]    Step in ms (default 0).
 * @param {string}  [settings.order]   A name in `STAGGER_ORDERS` (default `row-first`).
 * @param {boolean} [settings.perRow]  Restart at each visual line when there are columns (default true).
 * @param {number}  [settings.cap]     Maximum total delay in ms, counting the offset; none when missing.
 * @return {number[]} The delays in document order, `count` long.
 */
export function computeStaggerDelays( {
	count,
	columns,
	offset,
	step,
	order = 'row-first',
	perRow = true,
	cap,
} = {} ) {
	const total = toCount( count );
	const columnCount = Math.max( 1, toCount( columns ) );
	const startAt = toMs( offset );
	const stepBy = toMs( step );
	const ceiling = isBlank( cap ) ? Infinity : toMs( cap, Infinity );
	const pick = Object.prototype.hasOwnProperty.call( STAGGER_ORDERS, order )
		? STAGGER_ORDERS[ order ]
		: STAGGER_ORDERS[ 'row-first' ];
	const grid = gridOf(
		total,
		columnCount,
		columnCount > 1 && perRow !== false && order !== 'flatten'
	);
	return pick( grid ).map( ( position ) =>
		Math.round( Math.min( startAt + position * stepBy, ceiling ) )
	);
}

/**
 * Close delays for an `open`-trigger entrance, from its open delays.
 *
 * @param {number[]} delays    The open delays.
 * @param {string}   direction `same` repeats them; `reversed` mirrors them inside their own range; `together` is 0
 *                             for every child.
 * @return {number[]} The close delays, one per child.
 */
export function computeCloseDelays( delays, direction = 'same' ) {
	if ( direction === 'together' ) {
		return delays.map( () => 0 );
	}
	if ( direction !== 'reversed' || delays.length === 0 ) {
		return delays.slice();
	}
	const low = Math.min( ...delays );
	const high = Math.max( ...delays );
	return delays.map( ( delay ) => high + low - delay );
}
