// Proves calibration names why a block can never reach the calibration page instead of burning a 60-second wait
// (CR12, sgs/theme-toggle). The failure is explicit; it does not make the block calibrate.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderedNothingReason } from '../lib/calibrate-container.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const toggleSrc = fs.readFileSync( path.join( REPO, 'plugins/sgs-blocks/src/blocks/theme-toggle/render.php' ), 'utf8' );

test( 'MUST FAIL (60s waitForSelector burn): theme-toggle on a snapshot with no dark palette is named, not waited out', () => {
	const why = renderedNothingReason( 'sgs/theme-toggle', { renderSource: toggleSrc, rawSnapshot: { settings: { custom: {} } } } );
	assert.match( why, /sgs\/theme-toggle renders nothing/ );
	assert.match( why, /_sgsDark/ );
	assert.match( renderedNothingReason( 'sgs/theme-toggle', { renderSource: toggleSrc, rawSnapshot: {} } ), /renders nothing/ );
} );

test( 'MUST FAIL TO FLAG: a derived palette, or _sgsDark enabled, clears the gate; other blocks are never flagged', () => {
	assert.equal( renderedNothingReason( 'sgs/theme-toggle', { renderSource: toggleSrc, rawSnapshot: { settings: { custom: { dark: { primary: '#fff' } } } } } ), null );
	assert.equal( renderedNothingReason( 'sgs/theme-toggle', { renderSource: toggleSrc, rawSnapshot: { _sgsDark: { enabled: true } } } ), null );
	assert.equal( renderedNothingReason( 'sgs/theme-toggle', { renderSource: toggleSrc, rawSnapshot: { _sgsDark: { enabled: false } } } ) === null, false );
	const heading = fs.readFileSync( path.join( REPO, 'plugins/sgs-blocks/src/blocks/heading/render.php' ), 'utf8' );
	assert.equal( renderedNothingReason( 'sgs/heading', { renderSource: heading, rawSnapshot: {} } ), null );
} );

test( 'finding: no committed client snapshot enables a dark palette, so theme-toggle cannot calibrate on any client yet', () => {
	const sites = path.join( REPO, 'sites' );
	const snaps = fs.readdirSync( sites ).map( ( d ) => path.join( sites, d, 'theme-snapshot.json' ) ).filter( ( f ) => fs.existsSync( f ) );
	assert.ok( snaps.length > 0 );
	for ( const f of snaps ) {
		const j = JSON.parse( fs.readFileSync( f, 'utf8' ) );
		assert.ok( renderedNothingReason( 'sgs/theme-toggle', { renderSource: toggleSrc, rawSnapshot: j } ), `${ path.basename( path.dirname( f ) ) } has a dark palette or _sgsDark: update the finding` );
	}
} );
