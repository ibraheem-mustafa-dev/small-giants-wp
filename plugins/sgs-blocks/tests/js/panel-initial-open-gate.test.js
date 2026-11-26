/**
 * Only the first panel of each inspector tab starts open (Spec 49 section 9.1). `scripts/check-panel-initial-open.js
 * --check` is the source check: every `PanelBody` says `initialOpen` outright, a literal open flag sits only on a
 * block's named first panel, a shared panel takes the flag as a prop, and no media panel opens by default. On the
 * branch before Stage E2 item 1 it reported 178 findings.
 */
const { spawnSync } = require( 'child_process' );
const path = require( 'path' );

const scripts = path.join( __dirname, '..', '..', 'scripts' );
const run = ( file, ...args ) => spawnSync( process.execPath, [ path.join( scripts, file ), ...args ], { encoding: 'utf8' } );

describe( 'only each tab\'s first panel opens', () => {
	it( 'finds no PanelBody without an explicit initialOpen and no panel opening off its tab\'s first slot', () => {
		const result = run( 'check-panel-initial-open.js', '--check' );
		expect( result.stdout ).toContain( '[check-panel-initial-open] OK' );
		expect( result.status ).toBe( 0 );
	} );

	it( 'the codemod has nothing left to rewrite', () => {
		const result = run( 'migrate-panel-initial-open.js', '--fix' );
		expect( result.stdout ).toMatch( /0 PanelBody tags would be rewritten/ );
	} );

	it( 'both scripts pass their own self-test, so the check can fail', () => {
		expect( run( 'check-panel-initial-open.js', '--self-test' ).status ).toBe( 0 );
		expect( run( 'migrate-panel-initial-open.js', '--self-test' ).status ).toBe( 0 );
	} );
} );
