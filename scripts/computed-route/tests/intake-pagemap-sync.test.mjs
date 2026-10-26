// Spec 48 FR-48-30: `intake.mjs --page-map` and `--apply-review` never diverge. A regeneration puts its proposal into
// intake.json's pageMap and renders review.md again, so applying the review afterwards confirms the regenerated map
// instead of writing the stale proposal back over page-map.json. Run on a scratch repo: the shop export fixture as the
// handoff, the wholesale food client's committed intake record and review (their palette, skeleton and other rows)
// with a stale page-map proposal in place of the export's.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { applyIntakeReview, pathsFor, REPO } from '../lib/intake-run.mjs';
import { runPageMap } from '../lib/intake-pagemap-regen.mjs';
import { proposePageMap } from '../lib/intake-pagemap.mjs';
import { renderReview } from '../lib/intake-review.mjs';
import { carryOver, withUnappliedMarks } from '../lib/intake-review-carry.mjs';
import { rowKey } from '../lib/site-build-map.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = path.join( HERE, 'fixtures', 'intake-pagemap', 'shop-files' );
const CLIENT = 'indus-foods';
const quiet = { log: () => {}, today: '2026-10-26', knownBlock: () => true };

function scratch() {
	const src = pathsFor( REPO, CLIENT );
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'pagemap-sync-' ) );
	const at = pathsFor( repo, CLIENT );
	fs.mkdirSync( at.dir, { recursive: true } );
	fs.cpSync( FIX, at.folder, { recursive: true } );
	const proposal = proposePageMap( { folder: at.folder } ).rows;
	// The stale proposal: the export's map less its last row, as an earlier intake proposed it.
	const stale = proposal.slice( 0, -1 );
	const committed = withUnappliedMarks( JSON.parse( fs.readFileSync( src.intake, 'utf8' ) ), fs.readFileSync( src.review, 'utf8' ) ).intake;
	const record = { ...committed, pageMap: stale };
	record.review = carryOver( committed, record ).review.map( ( r ) => ( 'page-map' === r.rowType ? { ...r, mark: 'accept', markedOn: '2026-10-25' } : r ) );
	fs.writeFileSync( at.intake, `${ JSON.stringify( record, null, 1 ) }\n` );
	fs.writeFileSync( at.review, renderReview( record ) );
	fs.writeFileSync( at.pageMap, `${ JSON.stringify( stale, null, 2 ) }\n` );
	return { repo, at, proposal };
}

test( 'MUST FAIL: --apply-review after --page-map confirms the regenerated map, never the stale proposal', () => {
	const { repo, at, proposal } = scratch();
	try {
		const said = [];
		assert.equal( runPageMap( { client: CLIENT, repo }, { log: ( l ) => said.push( l ) } ), 0, said.join( '\n' ) );
		const regenerated = JSON.parse( fs.readFileSync( at.pageMap, 'utf8' ) ).map( rowKey );
		assert.deepEqual( regenerated, proposal.map( rowKey ), 'the regeneration wrote the export\'s whole map' );
		const intake = JSON.parse( fs.readFileSync( at.intake, 'utf8' ) );
		assert.deepEqual( intake.pageMap.map( rowKey ), proposal.map( rowKey ), 'intake.json holds the regenerated proposal' );
		assert.match( fs.readFileSync( at.review, 'utf8' ), new RegExp( proposal.at( -1 ).slug ), 'review.md lists the regenerated rows' );
		assert.ok( intake.review.filter( ( r ) => 'page-map' === r.rowType && r.mark ).length >= proposal.length - 1, 'the unchanged rows keep their marks' );
		// Bean accepts the new row in the review.
		intake.review = intake.review.map( ( r ) => ( 'page-map' === r.rowType && ! r.mark ? { ...r, mark: 'accept', markedOn: '2026-10-26' } : r ) );
		fs.writeFileSync( at.intake, `${ JSON.stringify( intake, null, 1 ) }\n` );
		fs.writeFileSync( at.review, renderReview( intake ) );
		const lines = [];
		const code = applyIntakeReview( { repo, client: CLIENT }, { ...quiet, log: ( l ) => lines.push( l ) } );
		assert.equal( code, 0, lines.join( '\n' ) );
		assert.deepEqual( JSON.parse( fs.readFileSync( at.pageMap, 'utf8' ) ).map( rowKey ), regenerated, 'applying the review keeps the regenerated map' );
	} finally {
		fs.rmSync( repo, { recursive: true, force: true } );
	}
} );
