// Proves the walker's one shared "paints nothing" acceptance (GAP-CHECKLIST 8): a layout property is accepted on every
// surface only when the live walk proved it inert for that pair, state and width (lib/neutralise.mjs: the draft value
// set on the live element moves no box and no text), the `gap` shorthand included (Home 2026-10-08: a one-row flex step
// reads "0px 16px" live against the draft's "16px"). A matching box alone accepts nothing. The detector: no client
// walker config repeats the shared rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { isAccepted, INERT_LAYOUT } from '../../parity/lib/compare.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
const gapRow = () => ( { kind: 'style', key: 'gap', draft: '16px', live: '0px 16px' } );

test( 'a gap shorthand the live walk proved inert is accepted with no config entry', () => {
	const hit = isAccepted( [], { pair: 'about-step-1', state: 'opening', width: 375, boxMatches: false, inert: { gap: 'inert' } }, gapRow() );
	assert.ok( hit, 'the measured rule accepts it' );
	assert.match( hit.reason, /moves no box and no text/ );
} );

test( 'a value that would move a box already matching the draft is accepted; the same verdict with the box not matching stays open', () => {
	const hit = isAccepted( [], { pair: 'about-step-1', state: 'opening', width: 375, boxMatches: true, inert: { gap: 'breaks-box' } }, gapRow() );
	assert.match( hit.reason, /already matches the draft/ );
	assert.equal( isAccepted( [], { pair: 'about-step-1', boxMatches: false, inert: { gap: 'breaks-box' } }, gapRow() ), null );
} );

test( 'MUST FAIL (ba31e5157): a matching box alone no longer accepts a layout row; only a measured inert verdict does', () => {
	assert.equal( isAccepted( [], { pair: 'about-step-1', state: 'opening', width: 375, boxMatches: true }, gapRow() ), null );
	assert.equal( isAccepted( [], { pair: 'about-step-1', state: 'opening', width: 375, boxMatches: true, inert: { gap: 'moves', 'text-align': 'inert' } }, gapRow() ), null );
} );

test( 'negative control: a property outside the tested list is never accepted by the shared rule, inert or not', () => {
	assert.equal( isAccepted( [], { pair: 'x', boxMatches: true, inert: { 'padding-top': 'inert' } }, { kind: 'style', key: 'padding-top', draft: '8px', live: '0px' } ), null );
} );

test( 'a config accept still decides first and keeps its own reason', () => {
	const own = { pair: 'x', key: 'gap', reason: 'own reason' };
	assert.equal( isAccepted( [ own ], { pair: 'x', boxMatches: true }, gapRow() ).reason, 'own reason' );
} );

test( 'DETECTOR: no client walker config repeats the shared inert-layout accept', async () => {
	const dirs = fs.readdirSync( path.join( REPO, 'sites' ) ).map( ( c ) => path.join( REPO, 'sites', c, 'build', 'qa', 'parity' ) ).filter( ( d ) => fs.existsSync( d ) );
	const found = [];
	for ( const dir of dirs ) {
		for ( const f of fs.readdirSync( dir ).filter( ( x ) => /\.mjs$/.test( x ) && ! /\.full\.mjs$/.test( x ) ) ) {
			const cfg = ( await import( pathToFileURL( path.join( dir, f ) ).href ) ).default;
			for ( const a of cfg?.accept || [] ) {
				if ( a.notPainted && ! a.pair && ! a.when && INERT_LAYOUT.includes( a.key ) ) {
					found.push( `${ path.relative( REPO, path.join( dir, f ) ) }: ${ a.key }` );
				}
			}
		}
	}
	assert.deepEqual( found, [], 'the shared rule lives in scripts/parity/lib/compare.mjs::INERT_LAYOUT only' );
} );
