// A committed page map is the one today's reader proposes (lib/page-map-fresh.mjs), and a run refuses one that is older than its reader.
// Fixtures are the real committed maps and draft exports of the three clients; the old map is the committed one with the `opens` field
// the rewound reader did not write taken out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pageMapFreshness, pageMapStaleProblem } from '../lib/page-map-fresh.mjs';
import { runPageMap } from '../lib/intake-pagemap-regen.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
const CLIENTS = fs.readdirSync( path.join( REPO, 'sites' ) ).filter( ( c ) => fs.existsSync( path.join( REPO, 'sites', c, 'build', 'page-map.json' ) ) && fs.existsSync( path.join( REPO, 'sites', c, 'handoff' ) ) );

test( "every committed page map equals a fresh proposal of today's reader (regenerate with intake.mjs --page-map <client>)", { timeout: 120000 }, () => {
	assert.ok( CLIENTS.length >= 3, `the three clients' maps are read (${ CLIENTS.join( ', ' ) })` );
	for ( const client of CLIENTS ) {
		assert.equal( pageMapStaleProblem( { repo: REPO, client } ), '', `${ client }'s committed page map is current` );
	}
} );

test( 'a page map the rewound reader wrote (no `opens`) is refused, naming the regenerating command; regenerating clears it', { timeout: 120000 }, () => {
	const client = 'eye-care-ward-end';
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'pagemap-fresh-' ) );
	try {
		fs.cpSync( path.join( REPO, 'sites', client, 'handoff' ), path.join( repo, 'sites', client, 'handoff' ), { recursive: true } );
		const build = path.join( repo, 'sites', client, 'build' );
		fs.mkdirSync( build, { recursive: true } );
		const committed = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', client, 'build', 'page-map.json' ), 'utf8' ) );
		assert.ok( committed.some( ( r ) => r.opens?.length ), 'the committed map places openers' );
		const old = committed.map( ( { opens, ...row } ) => row );
		fs.writeFileSync( path.join( build, 'page-map.json' ), JSON.stringify( old, null, 2 ) );
		const problem = pageMapStaleProblem( { repo, client } );
		assert.match( problem, /older than the reader/ );
		assert.match( problem, /opens/ );
		assert.ok( problem.includes( `node scripts/computed-route/intake.mjs --page-map ${ client }` ), 'it names the command that regenerates the map' );
		assert.equal( runPageMap( { repo, client }, { log: () => {} } ), 0 );
		assert.equal( pageMapStaleProblem( { repo, client } ), '', 'the regenerated map is current' );
		assert.deepEqual( pageMapFreshness( { repo, client } ).changes, [] );
	} finally {
		fs.rmSync( repo, { recursive: true, force: true } );
	}
} );

test( 'a client with no draft export or no page map has nothing to compare', () => {
	assert.equal( pageMapFreshness( { repo: REPO, client: 'no-such-client' } ), null );
	assert.equal( pageMapStaleProblem( { repo: REPO, client: 'no-such-client' } ), '' );
} );

test( 'site-run stops on a stale page map before any stage', () => {
	const source = fs.readFileSync( path.join( REPO, 'scripts', 'computed-route', 'site-run.mjs' ), 'utf8' );
	assert.match( source, /const staleMap = pageMapStaleProblem\( \{ repo: REPO, client \} \);\r?\n\s*if \( staleMap \) \{\r?\n\s*throw new Error\( staleMap \);/ );
	assert.ok( source.indexOf( 'pageMapStaleProblem( {' ) < source.indexOf( 'intakeInputsMissing( {' ), 'it runs ahead of the other input checks' );
} );
