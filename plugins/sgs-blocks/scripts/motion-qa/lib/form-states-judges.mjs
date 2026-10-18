/**
 * Pure judges, self-test and argument parsing for `probe-motion-form-states.mjs`.
 *
 * @package
 */

import {
	siteBase,
	ENGINES,
	WIDTHS,
	parseTranslate,
	near,
} from '../probe-motion-model-lib.mjs';

export const SHAKE = { duration: 320, tx: [ 0, -8, 8, 0 ] };
export const SLIDE = {
	distance: 36,
	duration: 480,
	easing: 'cubic-bezier(0.16, 0.84, 0.32, 1)',
};
export const FORM = '[data-wp-interactive="sgs/form"]';
export const FLOW = '[data-wp-interactive="sgs/choice-flow"]';

// ---- Pure judges ---------------------------------------------------------------------------------------------

/**
 * "-8px" / "8" / -8 to a number; NaN otherwise.
 * @param value
 */
export function px( value ) {
	const m = String( value ?? '' )
		.trim()
		.match( /^(-?\d*\.?\d+)(px)?$/ );
	return m ? Number( m[ 1 ] ) : NaN;
}

/**
 * Two failed submits gave two shakes: one sample per submit, each `{ id, duration, tx: [..] }` (id null when no
 * animation ran). Passes when there are two samples with distinct ids, each the stored duration and x keyframes.
 * @param samples
 */
export function judgeShakes( samples ) {
	if ( ! Array.isArray( samples ) || samples.length !== 2 ) {
		return false;
	}
	if (
		samples.some( ( s ) => ! s || null === s.id ) ||
		samples[ 0 ].id === samples[ 1 ].id
	) {
		return false;
	}
	return samples.every(
		( s ) =>
			near( s.duration, SHAKE.duration, 1 ) &&
			s.tx.length === SHAKE.tx.length &&
			s.tx.every( ( v, i ) => near( px( v ), SHAKE.tx[ i ], 0.5 ) )
	);
}

/**
 * A step slide's start: translate x equals the expected distance, and the stored duration and curve.
 * @param sample
 * @param expectedX
 */
export function judgeSlide( sample, expectedX ) {
	if ( ! sample || null === sample.translate ) {
		return false;
	}
	const t = parseTranslate( sample.translate );
	return (
		near( t.x, expectedX, 0.5 ) &&
		near( sample.duration, SLIDE.duration, 1 ) &&
		sample.easing.replace( /\s+/g, '' ) ===
			SLIDE.easing.replace( /\s+/g, '' )
	);
}

export function selfTest() {
	const out = [];
	const ok = ( label, cond ) => out.push( { label, pass: Boolean( cond ) } );
	const shake = ( id ) => ( {
		id,
		duration: 320,
		tx: [ '0px', '-8px', '8px', '0px' ],
	} );
	ok(
		'px parses px and bare numbers',
		px( '-8px' ) === -8 && px( 8 ) === 8 && Number.isNaN( px( 'none' ) )
	);
	ok(
		'judgeShakes passes two distinct 320ms shakes',
		judgeShakes( [ shake( 1 ), shake( 2 ) ] )
	);
	ok(
		'control: judgeShakes fails one animation seen twice (no replay)',
		! judgeShakes( [ shake( 1 ), shake( 1 ) ] )
	);
	ok(
		'control: judgeShakes fails a missing second shake',
		! judgeShakes( [ shake( 1 ), { id: null, duration: 0, tx: [] } ] )
	);
	ok(
		'control: judgeShakes fails a wrong duration',
		! judgeShakes( [ shake( 1 ), { ...shake( 2 ), duration: 500 } ] )
	);
	ok(
		'control: judgeShakes fails mirrored keyframes',
		! judgeShakes( [
			shake( 1 ),
			{ ...shake( 2 ), tx: [ '0px', '8px', '-8px', '0px' ] },
		] )
	);
	const slide = ( translate ) => ( {
		translate,
		duration: 480,
		easing: 'cubic-bezier(0.16, 0.84, 0.32, 1)',
	} );
	ok( 'judgeSlide passes 36px forward', judgeSlide( slide( '36px' ), 36 ) );
	ok(
		'judgeSlide passes -36px back with a y component',
		judgeSlide( slide( '-36px 0px' ), -36 )
	);
	ok(
		'control: judgeSlide fails an unmirrored back step',
		! judgeSlide( slide( '36px' ), -36 )
	);
	ok(
		'control: judgeSlide fails no animation',
		! judgeSlide( { translate: null, duration: 0, easing: '' }, 36 )
	);
	ok(
		'control: judgeSlide fails another curve',
		! judgeSlide( { ...slide( '36px' ), easing: 'ease' }, 36 )
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

// ---- Arguments -------------------------------------------------------------------------------------------------

export function parseArgv( argv ) {
	const args = {
		formUrl: null,
		flowUrl: null,
		engines: [],
		widths: [],
		site: 'sandybrown',
		selfTest: false,
	};
	for ( let i = 2; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( a === '--form-url' ) {
			args.formUrl = argv[ ++i ];
		} else if ( a === '--flow-url' ) {
			args.flowUrl = argv[ ++i ];
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
		args.widths = [ 1440, 375 ];
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

export const absolute = ( site, url ) =>
	/^https?:/.test( url )
		? url
		: `${ siteBase( site ) }${ url.startsWith( '/' ) ? '' : '/' }${ url }`;

// ---- Page actions and reads ------------------------------------------------------------------------------------

