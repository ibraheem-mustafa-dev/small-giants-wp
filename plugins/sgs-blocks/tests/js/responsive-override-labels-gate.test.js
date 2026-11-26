/**
 * Every `ResponsiveOverride` mount passes a `label`, so the Tablet and Mobile markers sit on the label's row and never
 * alone above the control. `scripts/report-label-less-responsive-overrides.py --check` is the source check; on the
 * branch before Stage E2 item 5 it reported 154 label-less mounts (W1's survey).
 */
const { spawnSync } = require( 'child_process' );
const path = require( 'path' );

const script = path.join( __dirname, '..', '..', 'scripts', 'report-label-less-responsive-overrides.py' );
const run = ( ...args ) => spawnSync( 'python', [ script, ...args ], { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } } );

describe( 'every ResponsiveOverride mount has a label', () => {
	it( 'finds no label-less mount', () => {
		const result = run( '--check' );
		expect( result.stdout ).toMatch( /0 label-less, 0 unknown/ );
		expect( result.status ).toBe( 0 );
	} );

	it( 'passes its own self-test, so the check can fail', () => {
		expect( run( '--self-test' ).status ).toBe( 0 );
	} );
} );
