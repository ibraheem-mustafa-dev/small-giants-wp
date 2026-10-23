// Spec 48 FR-48-34 test 2 on a forced state that never settles (lib/intake-defects-force.mjs::bounded and forcedVisits),
// on the fixture export tests/fixtures/intake-hang/: sc-if Home:2 `{{ spinning }}` reads state.spin, which no code
// sets, so the defects pass forces it; with spin true, componentDidUpdate loops for ever, so the page never answers
// again. The pass must end within its call bound with a gap row naming the visit, the forcing step and the call that
// timed out, and the row must stay undecided (never a defect). Unbounded, the pass never ends and the test's own timeout
// turns it red. The fixture's HAR is recorded once into the OS temp folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { staticCensus, applyRuntime } from '../lib/intake-census.mjs';
import { runtimeCensus } from '../lib/intake-census-runtime.mjs';
import { unreachedDefects } from '../lib/intake-defects.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FOLDER = path.join( HERE, 'fixtures', 'intake-hang' );
const ENTRY = 'Home.dc.html';
const BOUND = 8000;

test( 'a forced state that never settles ends its visit as a gap row within the call bound, never a hang', { timeout: 180000 }, async () => {
	const { manifestHash } = recheckManifest( FOLDER );
	const harPath = path.join( os.tmpdir(), 'sgs-intake-hang-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: FOLDER, index: ENTRY, harPath } );
	}
	const st = await staticCensus( { folder: FOLDER, entry: ENTRY, harPath } );
	const rt = await runtimeCensus( { folder: FOLDER, entry: ENTRY, harPath, census: st, widths: [ 1440 ] } );
	const census = { rows: applyRuntime( st.rows, rt ), sources: st.sources };
	const row = census.rows.find( ( r ) => 'sc-if' === r.kind && true === r.unreached );
	assert.ok( row, 'the fixture has an unreached sc-if to force' );
	const lines = [];
	const t0 = Date.now();
	const res = await unreachedDefects( { folder: FOLDER, entry: ENTRY, harPath, census, widths: [ 1440 ], timeout: BOUND, log: ( l ) => lines.push( l ) } );
	const took = Date.now() - t0;
	const gap = res.gaps.find( ( g ) => 'defect-visit' === g.construct );
	assert.ok( gap, `a defect-visit gap row (gaps: ${ JSON.stringify( res.gaps ) })` );
	assert.equal( gap.draftId, `${ ENTRY }@1440` );
	assert.match( gap.error, /^the forced visit timed out: (page|cdp)\.\S+.* during (\S+ after )?setState Home \{"spin":true\} did not return within 8s$/ );
	assert.ok( took < 4 * BOUND, `the pass ended within its bound (${ took }ms)` );
	assert.ok( ! res.rows.some( ( r ) => r.censusId === row.id ), 'the stuck row is not a defect' );
	assert.deepEqual( lines.map( ( l ) => l.replace( / \(.*\)$/, '' ) ), [ `${ ENTRY } at 1440: started`, `${ ENTRY } at 1440: timed out` ] );
} );
