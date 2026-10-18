// Clone coverage plan Phase 1 (step 1.2), lib/intake-missing.mjs rule 3: intake raises one missing-feature row per
// capability the draft uses that the clone coverage map does not cover ("seen but unsupported"), so nothing a draft
// holds is dropped silently. A covered capability raises nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { coverageMissing, proposeMissingFeatures } from '../lib/intake-missing.mjs';

const COVERAGE = { _meta: {}, entries: {
	'html:div': { recognise: 'construct:handler', write: 'scripts/computed-route/lib/fill-entrance.mjs#entranceWrites', check: 'scripts/computed-route/lib/answer-sheet.mjs#scoreSurface' },
	'html:video': { recognise: null, write: null, check: null, wave: 'media' },
	'html:canvas': { excluded: { reason: 'drawn by script', signedBy: 'Bean', date: '2026-10-17' } },
	'construct:timer': { recognise: 'construct:timer', write: null, check: null, wave: 'behaviour recognisers' },
} };
const SKELETON = [
	{ key: 'Home/1#0', draftId: 'Home:1', tag: 'div', block: 'sgs/container' },
	{ key: 'Home/2#0', draftId: 'Home:2', tag: 'VIDEO', block: 'sgs/media' },
	{ key: 'Home/3#0', draftId: 'Home:3', tag: 'video', block: 'sgs/media' },
	{ key: 'Home/4#0', draftId: 'Home:4', tag: 'canvas' },
	{ key: 'Home/5#0', draftId: 'Home:5', tag: 'marquee', action: 'remove' },
	{ key: 'Home/6#0', draftId: 'Home:6', tag: 'sgs-widget', block: 'sgs/container' },
];
const CENSUS = { rows: [ { id: 'timer@Home:7', kind: 'timer', draftId: 'Home:7' } ], sources: [] };

test( 'POSITIVE: one row per uncovered capability with its count; covered and removed elements raise nothing', () => {
	const rows = coverageMissing( { skeletonRows: SKELETON, census: CENSUS, coverage: COVERAGE } );
	assert.deepEqual( rows.map( ( r ) => [ r.construct, r.count, r.draftId ] ), [ [ 'html:video', 2, 'Home:2' ], [ 'html:canvas', 1, 'Home:4' ], [ 'html:custom-element', 1, 'Home:6' ], [ 'construct:timer', 1, 'Home:7' ] ] );
	assert.match( rows[ 0 ].why, /no clone path yet \(has nothing; wave media\)/ );
	assert.match( rows[ 1 ].why, /excluded from cloning \(Bean, 2026-10-17: drawn by script\)/ );
	assert.match( rows[ 2 ].why, /not in the clone coverage map/ );
	assert.match( rows[ 3 ].why, /has recognise; wave behaviour recognisers/ );
	rows.forEach( ( r ) => assert.equal( r.from, 'coverage' ) );
} );

test( 'MUST FAIL: an uncovered element the draft uses is never dropped silently', () => {
	const covered = { ...COVERAGE, entries: { ...COVERAGE.entries, 'html:video': COVERAGE.entries[ 'html:div' ] } };
	assert.ok( ! coverageMissing( { skeletonRows: SKELETON, census: CENSUS, coverage: covered } ).some( ( r ) => 'html:video' === r.construct ) );
	assert.ok( coverageMissing( { skeletonRows: SKELETON, census: CENSUS, coverage: COVERAGE } ).some( ( r ) => 'html:video' === r.construct ) );
} );

test( 'MUST FAIL: every custom element on a skeleton row is the one custom-element capability with its wave, never its own name; a hyphenated tag the map holds stays itself', () => {
	const coverage = { ...COVERAGE, entries: { ...COVERAGE.entries, 'html:custom-element': { recognise: null, write: null, check: null, wave: 'draft reading' }, 'html:font-face': { recognise: null, write: null, check: null, wave: 'content, media and icons' } } };
	const skeleton = [ { key: 'Home/8#0', draftId: 'Home:8', tag: 'image-slot' }, { key: 'Home/9#0', draftId: 'Home:9', tag: 'acme-logo' }, { key: 'Home/10#0', draftId: 'Home:10', tag: 'font-face' } ];
	const rows = coverageMissing( { skeletonRows: skeleton, census: { rows: [] }, coverage } );
	assert.deepEqual( rows.map( ( r ) => [ r.construct, r.count, r.wave ] ), [ [ 'html:custom-element', 2, 'draft reading' ], [ 'html:font-face', 1, 'content, media and icons' ] ] );
	assert.ok( ! rows.some( ( r ) => /image-slot|acme-logo/.test( r.construct ) ) );
} );

test( 'the proposal adds rule 3 only when a coverage map is passed', () => {
	const rows = ( coverage ) => proposeMissingFeatures( { skeletonRows: SKELETON, census: CENSUS, coverage, registry: { timer: { module: 'lib/intake-inventory.mjs', fn: 'readInventory' } } } ).rows;
	assert.ok( ! rows( null ).some( ( r ) => 'coverage' === r.from ) );
	assert.equal( rows( COVERAGE ).filter( ( r ) => 'coverage' === r.from ).length, 4 );
} );
