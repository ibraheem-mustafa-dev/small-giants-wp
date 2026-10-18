/**
 * Shared judges, self-test and argument parsing for `probe-motion-nav-drawer.mjs` (the nav bar probes import the judges
 * through that probe, which re-exports them).
 *
 * @package
 */

import fs from 'node:fs';
import path from 'node:path';
import {
	ENGINES,
	WIDTHS,
	FIXTURE_DIR,
	isRest,
} from '../probe-motion-model-lib.mjs';

export const TREE = path.join( FIXTURE_DIR, 'nav-drawer-stagger.json' );

// ---- Pure judges ---------------------------------------------------------------------------------------------

/**
 * "80ms" / "0.08s" / "80" to milliseconds; NaN for anything else. A list ("0s, 0.1s") reads its first entry.
 * @param value
 */
export function toMs( value ) {
	const text = String( value ?? '' )
		.split( ',' )[ 0 ]
		.trim();
	const m = text.match( /^(-?\d*\.?\d+)(ms|s)?$/ );
	if ( ! m ) {
		return NaN;
	}
	return m[ 2 ] === 's' ? Number( m[ 1 ] ) * 1000 : Number( m[ 1 ] );
}

/**
 * Measured and expected lists agree item for item within 1ms, same length.
 * @param measured
 * @param expected
 */
export function judgeList( measured, expected ) {
	if (
		! Array.isArray( measured ) ||
		! Array.isArray( expected ) ||
		measured.length !== expected.length ||
		! expected.length
	) {
		return false;
	}
	return measured.every(
		( value, i ) =>
			Number.isFinite( value ) && Math.abs( value - expected[ i ] ) <= 1
	);
}

/**
 * The expectations from the fixture tree: the panel's close duration and each item's stored timing, in tree order.
 * @param tree
 */
export function expectationsFrom( tree ) {
	const out = { panelClose: null, items: [] };
	const walk = ( blocks ) => {
		for ( const b of blocks ) {
			const attrs = b.attributes || {};
			const base = attrs.sgsMotion?.elements?.root?.entrance?.base;
			const cls = attrs.className || '';
			if ( b.name === 'sgs/nav-drawer' && base ) {
				out.panelClose =
					base.close?.closeDuration ?? base.values?.duration ?? null;
			}
			if ( base && /\bm45-(item|custom)\b/.test( cls ) ) {
				out.items.push( {
					marker: cls.match( /\bm45-(item|custom)\b/ )[ 0 ],
					delay: base.values?.delay ?? 0,
					closeDelay: base.close?.closeDelay ?? 0,
					closeDuration:
						base.close?.closeDuration ??
						base.values?.duration ??
						null,
					customised: ( base.customised || [] ).includes(
						'values.delay'
					),
				} );
			}
			walk( b.innerBlocks || [] );
		}
	};
	walk( tree );
	return out;
}

/**
 * Positional delays the stagger helper writes on a single column: offset + i x step, capped (the cap includes the offset).
 * @param count
 * @param root0
 * @param root0.offset
 * @param root0.step
 * @param root0.cap
 */
export function helperDelays(
	count,
	{ offset = 0, step = 0, cap = null } = {}
) {
	return Array.from( { length: count }, ( unused, i ) => {
		const d = offset + i * step;
		return cap === null || cap === undefined ? d : Math.min( d, cap );
	} );
}

/**
 * Reduced motion: every item at 0 delay, nothing running, fully shown and at rest. Rows: { delay, running, opacity, translate }.
 * @param rows
 */
export function judgeReduced( rows ) {
	return (
		rows.length > 0 &&
		rows.every(
			( r ) =>
				toMs( r.delay ) === 0 &&
				r.running === 0 &&
				Number( r.opacity ) === 1 &&
				isRest( r.translate )
		)
	);
}

export function selfTest() {
	const out = [];
	const ok = ( label, cond ) => out.push( { label, pass: Boolean( cond ) } );
	ok(
		'toMs parses ms, s and a list',
		toMs( '80ms' ) === 80 &&
			toMs( '0.05s' ) === 50 &&
			toMs( '0.1s, 0s' ) === 100 &&
			Number.isNaN( toMs( 'auto' ) )
	);
	ok( 'judgeList passes equal lists', judgeList( [ 50, 100 ], [ 50, 100 ] ) );
	ok(
		'control: judgeList fails a shifted list',
		! judgeList( [ 50, 170 ], [ 50, 100 ] )
	);
	ok(
		'control: judgeList fails a short or empty list',
		! judgeList( [ 50 ], [ 50, 100 ] ) && ! judgeList( [], [] )
	);
	ok(
		'judgeReduced passes a still, shown item',
		judgeReduced( [
			{ delay: '0s', running: 0, opacity: '1', translate: 'none' },
		] )
	);
	ok(
		'control: judgeReduced fails a delayed, running or moved item',
		! judgeReduced( [
			{ delay: '0.05s', running: 0, opacity: '1', translate: 'none' },
		] ) &&
			! judgeReduced( [
				{ delay: '0s', running: 1, opacity: '1', translate: 'none' },
			] ) &&
			! judgeReduced( [
				{
					delay: '0s',
					running: 0,
					opacity: '1',
					translate: '0px 18px',
				},
			] )
	);
	const tree = JSON.parse( fs.readFileSync( TREE, 'utf8' ) );
	const exp = expectationsFrom( tree );
	const items = exp.items.filter( ( i ) => i.marker === 'm45-item' );
	const custom = exp.items.find( ( i ) => i.marker === 'm45-custom' );
	const stagger =
		tree.find( ( b ) => b.name === 'sgs/nav-drawer' )?.attributes?.sgsMotion
			?.stagger || {};
	ok(
		'the tree: four helper items stored at offset 50, step 50 (50, 100, 150, 200)',
		judgeList(
			items.map( ( i ) => i.delay ),
			helperDelays( 4, stagger )
		) &&
			judgeList(
				items.map( ( i ) => i.delay ),
				[ 50, 100, 150, 200 ]
			)
	);
	ok(
		'the tree: the fifth item is a customised 300ms the helper would have written as 250',
		custom &&
			custom.delay === 300 &&
			custom.customised &&
			helperDelays( 5, stagger )[ 4 ] === 250
	);
	ok(
		'the tree: the panel closes in 200ms and every item in 250ms',
		exp.panelClose === 200 &&
			exp.items.every( ( i ) => i.closeDuration === 250 )
	);
	ok(
		'the tree: closeOrder reversed, the helper items close at 200, 150, 100, 50 (the open delays mirrored)',
		stagger.closeOrder === 'reversed' &&
			judgeList(
				items.map( ( i ) => i.closeDelay ),
				[ 200, 150, 100, 50 ]
			)
	);
	for ( const row of out ) {
		console.log(
			JSON.stringify( {
				check: row.label,
				verdict: row.pass ? 'PASS' : 'FAIL',
			} )
		);
	}
	const failed = out.filter( ( r ) => ! r.pass ).length;
	console.log(
		JSON.stringify( {
			summary: true,
			selfTest: true,
			pass: out.length - failed,
			fail: failed,
		} )
	);
	return failed ? 1 : 0;
}

export function parseArgv( argv ) {
	const args = {
		url: null,
		engines: [],
		widths: [],
		site: 'sandybrown',
		selfTest: false,
	};
	for ( let i = 2; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( a === '--page' ) {
			args.url = `/?p=${ argv[ ++i ] }`;
		} else if ( a === '--url' ) {
			args.url = argv[ ++i ];
		} else if ( a === '--engine' ) {
			args.engines.push( argv[ ++i ] );
		} else if ( a === '--width' ) {
			args.widths.push( Number( argv[ ++i ] ) );
		} else if ( a === '--site' ) {
			args.site = argv[ ++i ];
		} else if ( a === '--self-test' ) {
			args.selfTest = true;
		} else {
			throw new Error( `Unknown argument ${ a }` );
		}
	}
	if ( ! args.engines.length ) {
		args.engines = [ 'chromium' ];
	}
	if ( ! args.widths.length ) {
		args.widths = [ 375, 768, 1440 ];
	}
	for ( const e of args.engines ) {
		if ( ! ENGINES.includes( e ) ) {
			throw new Error(
				`--engine must be one of ${ ENGINES.join( ', ' ) }`
			);
		}
	}
	for ( const w of args.widths ) {
		if ( ! WIDTHS.includes( w ) ) {
			throw new Error(
				`--width must be one of ${ WIDTHS.join( ', ' ) }`
			);
		}
	}
	return args;
}
