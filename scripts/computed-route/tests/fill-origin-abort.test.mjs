// A Fill run that aborts leaves the tracked sites/<client>/build/<surface>.origin.json as it was (fill.mjs::fillSurface writes
// it with the run's outputs): a draft folder with no page to serve is refused after the skeleton is read, and the half-resolved
// origin map is never written. The skeleton's one block has a fixture record with an empty look, so the paint gate
// (lib/paint-gate.mjs) has nothing to stop on.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fillSurface } from '../fill.mjs';
import { writeRecordFixture } from '../lib/setting-record.mjs';

function fixture() {
	const work = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-origin-' ) );
	const repo = path.join( work, 'repo' );
	const build = path.join( repo, 'sites', 'acme', 'build' );
	fs.mkdirSync( path.join( build, 'qa' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { home: { site: 'acme-test', states: { opening: null } } } ) );
	fs.writeFileSync( path.join( repo, 'sites', 'acme', 'theme-snapshot.json' ), JSON.stringify( { settings: { color: { palette: [] } } } ) );
	fs.writeFileSync( path.join( work, 'skeleton.json' ), JSON.stringify( [ { name: 'sgs/text', draftRef: { tpl: 'Root/1#0' }, attributes: {} } ] ) );
	fs.mkdirSync( path.join( work, 'draft' ) );
	writeRecordFixture( path.join( work, 'cache' ), 'sgs/text', { block: 'sgs/text', settings: {}, elements: {} } );
	return { work, repo, origin: path.join( build, 'home.origin.json' ) };
}

test( 'MUST FAIL: a run refused for its draft page writes no origin file, and one already there is left unchanged', async () => {
	const f = fixture();
	try {
		const run = () => fillSurface( { repo: f.repo, client: 'acme', surface: 'home', skeleton: path.join( f.work, 'skeleton.json' ), draftDir: path.join( f.work, 'draft' ), liveUrl: 'http://127.0.0.1:9/', out: path.join( f.work, 'out' ), cache: path.join( f.work, 'cache' ) } );
		await assert.rejects( run, /serves no page at its root/ );
		assert.equal( fs.existsSync( f.origin ), false, 'no origin file from an aborted run' );
		fs.writeFileSync( f.origin, '{"kept":true}\n' );
		await assert.rejects( run, /serves no page at its root/ );
		assert.equal( fs.readFileSync( f.origin, 'utf8' ), '{"kept":true}\n' );
	} finally {
		fs.rmSync( f.work, { recursive: true, force: true } );
	}
} );
