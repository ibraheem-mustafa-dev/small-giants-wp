/**
 * Every `MediaElementPanel` mount inside a parent `InspectorControls` renders its panels in place (`inGroup`), and none
 * sits inside a `PanelBody` (its panels would nest in that panel). `scripts/check-background-panel-mount.js --check` is
 * the source check; on the branch before item 7 it reported 13 mounts (7 without `inGroup`, 6 inside a wrapper panel).
 */
const { spawnSync } = require( 'child_process' );
const path = require( 'path' );

const script = path.join( __dirname, '..', '..', 'scripts', 'check-background-panel-mount.js' );
const run = ( ...args ) => spawnSync( process.execPath, [ script, ...args ], { encoding: 'utf8' } );

describe( 'MediaElementPanel mounts render in place', () => {
	it( 'has no mount in a parent InspectorControls without a matching inGroup, and none inside a PanelBody', () => {
		const result = run( '--check' );
		expect( result.stdout ).toContain( '[check-background-panel-mount] OK' );
		expect( result.status ).toBe( 0 );
	} );

	it( 'the survey finds 30 mounts and none that needs a change', () => {
		const result = run( '--survey' );
		expect( result.stdout ).toMatch( /30 MediaElementPanel mounts in 26 files; \d+ sit inside a parent InspectorControls \(0 need a change\)/ );
	} );

	it( 'passes its own self-test, so the check can fail', () => {
		expect( run( '--self-test' ).status ).toBe( 0 );
	} );
} );
