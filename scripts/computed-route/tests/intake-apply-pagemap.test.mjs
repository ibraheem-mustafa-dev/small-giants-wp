// Spec 48 FR-48-17, FR-48-30, FR-48-55: `--apply-review` keeps the WordPress id the site build wrote into each row of
// page-map.json. Run on a scratch copy of the wholesale food client's intake record and review (lib/intake-run.mjs::confirmedPageMap gives the built map).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { applyIntakeReview, confirmedPageMap, pathsFor, REPO } from '../lib/intake-run.mjs';
import { applyReview } from '../lib/intake-review.mjs';
import { rowKey } from '../lib/site-build-map.mjs';

const CLIENT = 'indus-foods';

// The client's intake record and review, with every section's Accept all ticked (a fresh intake leaves rows unmarked
// until Bean reviews them, and the marks are not what this test is about), and as the current page map the map those
// marks confirm with a WordPress id in every row, as a site build writes it.
function scratch() {
	const src = pathsFor( REPO, CLIENT );
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'apply-pagemap-' ) );
	const at = pathsFor( repo, CLIENT );
	fs.mkdirSync( at.dir, { recursive: true } );
	fs.copyFileSync( src.intake, at.intake );
	fs.writeFileSync( at.review, fs.readFileSync( src.review, 'utf8' ).replace( /^Accept all:\s*\[\s*\]\s*$/gim, 'Accept all: [x]' ) );
	const res = applyReview( JSON.parse( fs.readFileSync( at.intake, 'utf8' ) ), fs.readFileSync( at.review, 'utf8' ), { today: quiet.today } );
	assert.deepEqual( [ ...res.problems, ...res.missing.map( ( r ) => r.rowId ) ], [], 'fixture: the ticked review marks every row' );
	const committed = confirmedPageMap( res.intake ).map( ( r, i ) => ( { ...r, id: 90000 + i } ) );
	fs.writeFileSync( at.pageMap, `${ JSON.stringify( committed, null, 2 ) }\n` );
	return { repo, at, committed };
}
const quiet = { log: () => {}, today: '2026-10-24', knownBlock: () => true };

test( 'MUST FAIL: --apply-review keeps every row\'s WordPress id when no page-map mark changed', () => {
	const { repo, at, committed } = scratch();
	try {
		assert.ok( committed.length && committed.every( ( r ) => Number.isInteger( r.id ) ), 'fixture: every committed row holds an id' );
		assert.equal( applyIntakeReview( { repo, client: CLIENT }, quiet ), 0 );
		const after = JSON.parse( fs.readFileSync( at.pageMap, 'utf8' ) );
		assert.deepEqual( new Map( after.map( ( r ) => [ rowKey( r ), r.id ] ) ), new Map( committed.map( ( r ) => [ rowKey( r ), r.id ] ) ) );
		assert.deepEqual( after, committed, 'nothing else in the confirmed rows changed either' );
	} finally {
		fs.rmSync( repo, { recursive: true, force: true } );
	}
} );

test( 'MUST FAIL: a confirmed map that would lose a row holding an id is refused and nothing is written', () => {
	const { repo, at, committed } = scratch();
	try {
		const extra = { ...committed[ 0 ], slug: 'built-only', route: '/built-only', title: 'Built only', id: 99999 };
		fs.writeFileSync( at.pageMap, JSON.stringify( [ ...committed, extra ], null, 2 ) );
		const before = fs.readFileSync( at.pageMap, 'utf8' );
		const lines = [];
		assert.equal( applyIntakeReview( { repo, client: CLIENT }, { ...quiet, log: ( l ) => lines.push( l ) } ), 1 );
		assert.match( lines.join( '\n' ), /loses the WordPress id of .*built-only.*\(id 99999\)/ );
		assert.equal( fs.readFileSync( at.pageMap, 'utf8' ), before );
	} finally {
		fs.rmSync( repo, { recursive: true, force: true } );
	}
} );
