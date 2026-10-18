// Clone coverage plan Phase 1 (step 1.2), lib/intake-missing.mjs rule 3: intake raises one missing-feature row per
// capability the draft uses that the clone coverage map does not cover ("seen but unsupported"), so nothing a draft
// holds is dropped silently. A covered capability raises nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { coverageMissing, proposeMissingFeatures, longhands, unreadProperties } from '../lib/intake-missing.mjs';

const COVERAGE = { _meta: {}, entries: {
	'html:div': { recognise: 'construct:handler', write: 'scripts/computed-route/lib/fill-motion.mjs#motionWrites', check: 'scripts/computed-route/lib/answer-sheet.mjs#scoreSurface' },
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

test( 'MUST FAIL: a CSS property group is judged by the properties the draft used: all read by Fill raises no row, one unread is named, and a shorthand counts only when every longhand is read', () => {
	const gap = ( wave ) => ( { recognise: null, write: null, check: null, wave } );
	const coverage = { _meta: {}, entries: { 'css-group:color': gap( 'draft reading' ), 'css-group:box-model': gap( 'draft reading' ), 'css-group:transforms': gap( 'motion writer (4.0)' ), 'css-group:custom-properties-for-cascading-variables': gap( 'draft reading' ) } };
	const usage = new Map( [
		[ 'css-group:color', { count: 3, draftId: 'Home:1', props: new Set( [ 'color' ] ) } ],
		[ 'css-group:box-model', { count: 2, draftId: 'Home:2', props: new Set( [ 'margin', 'padding-top' ] ) } ],
		[ 'css-group:transforms', { count: 1, draftId: 'Home:3', props: new Set( [ 'transform', 'perspective' ] ) } ],
		[ 'css-group:custom-properties-for-cascading-variables', { count: 4, draftId: 'Home:4', props: new Set( [ '--brand' ] ) } ],
	] );
	const rows = coverageMissing( { census: { rows: [] }, coverage, usage } );
	const by = Object.fromEntries( rows.map( ( r ) => [ r.construct, r ] ) );
	assert.ok( ! by[ 'css-group:color' ], 'color is read by Fill, so the group is cloned for this draft' );
	assert.ok( ! by[ 'css-group:box-model' ], 'margin counts as read: Fill reads all four of its longhands' );
	assert.ok( ! by[ 'css-group:custom-properties-for-cascading-variables' ], 'a custom property never paints on its own' );
	assert.ok( by[ 'css-group:transforms' ], 'perspective is not read, so the row stays' );
	assert.match( by[ 'css-group:transforms' ].why, /Fill does not read perspective/ );
	assert.match( by[ 'css-group:transforms' ].line, /partly supported/ );
	assert.deepEqual( longhands( 'border' ).length > 3, true );
	assert.deepEqual( unreadProperties( new Set( [ 'border', 'color' ] ) ).includes( 'color' ), false );
	const noProps = coverageMissing( { census: { rows: [] }, coverage, usage: new Map( [ [ 'css-group:color', { count: 1, draftId: 'Home:9', runtimeOnly: true } ] ] ) } );
	assert.equal( noProps.length, 1, 'with no recorded properties the row stays' );
} );

test( 'the proposal adds rule 3 only when a coverage map is passed', () => {
	const rows = ( coverage ) => proposeMissingFeatures( { skeletonRows: SKELETON, census: CENSUS, coverage, registry: { timer: { module: 'lib/intake-inventory.mjs', fn: 'readInventory' } } } ).rows;
	assert.ok( ! rows( null ).some( ( r ) => 'coverage' === r.from ) );
	assert.equal( rows( COVERAGE ).filter( ( r ) => 'coverage' === r.from ).length, 4 );
} );
