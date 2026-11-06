// A block's stage timings for one calibration run: where its minutes went, summed in seconds per stage, printed in the
// block's result line. `time` wraps a stage; `add` folds in the sub-stages a child or a reader reports in milliseconds.
export function stageClock( now = Date.now ) {
	const started = now();
	const ms = {};
	const add = ( stage, value ) => {
		ms[ stage ] = ( ms[ stage ] || 0 ) + ( Number( value ) || 0 );
	};
	return {
		add,
		// Each width of a read runs at once, so the longest width is what the stage cost; the others are kept per stage.
		addReads( timing = {} ) {
			const widths = Object.values( timing );
			for ( const stage of [ 'loadMs', 'readMs', 'stateMs', 'scrollMs' ] ) {
				add( `reads.${ stage.replace( /Ms$/, '' ) }`, Math.max( 0, ...widths.map( ( t ) => t[ stage ] || 0 ) ) );
			}
		},
		async time( stage, run ) {
			const t0 = now();
			try {
				return await run();
			} finally {
				add( stage, now() - t0 );
			}
		},
		summary() {
			const seconds = ( v ) => Math.round( v / 100 ) / 10;
			return { totalS: seconds( now() - started ), ...Object.fromEntries( Object.entries( ms ).map( ( [ k, v ] ) => [ k, seconds( v ) ] ) ) };
		},
	};
}
