// Proves the walker's one shared "paints nothing" rule (GAP-CHECKLIST 8): a layout property that differs while the
// pair's painted box matches is accepted on every surface, the `gap` shorthand included (Home 2026-10-08: a one-row flex
// step reads "0px 16px" live against the draft's "16px", the row half painting nothing), and never while a box
// difference is unexplained. The detector: no client walker config repeats the shared rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { isAccepted, INERT_LAYOUT } from '../../parity/lib/compare.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
const gapRow = () => ( { kind: 'style', key: 'gap', draft: '16px', live: '0px 16px' } );

test( 'MUST FAIL: a gap shorthand on a pair whose box matches is accepted with no config entry', () => {
	const hit = isAccepted( [], { pair: 'about-step-1', state: 'opening', width: 375, boxMatches: true }, gapRow() );
	assert.ok( hit, 'the shared rule accepts it' );
	assert.match( hit.reason, /painted box/ );
} );

test( 'negative control: the same row is open while a box difference on the pair is unexplained', () => {
	assert.equal( isAccepted( [], { pair: 'about-step-1', state: 'opening', width: 375, boxMatches: false }, gapRow() ), null );
} );

test( 'negative control: a painting property is never accepted by the shared rule', () => {
	assert.equal( isAccepted( [], { pair: 'x', boxMatches: true }, { kind: 'style', key: 'padding-top', draft: '8px', live: '0px' } ), null );
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
