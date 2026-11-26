// A failed stage's class is recorded in status.json beside its message (lib/failure-class.mjs, site-run.mjs::stageRecord), so a
// run's failures are counted by class and never reconstructed from free text. The messages are real ones from the 2026-11-24 proof
// runs' status.json files. Contacts no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { failureClass, failureCounts, OTHER_FAILURE } from '../lib/failure-class.mjs';
import { stageRecord, stageLine } from '../site-run.mjs';

const REAL = [
	[ 'not-at-rest', 'walk failed: run "auto-scrolled" at 768 was refused, not measured (live not at rest after a fresh load: scroll: 0,17 at rest, 0,0 now)' ],
	[ 'live-element-absent', 'walk failed: the live page has no element for the surface\'s root (gen-flow-choice-flow-add-prescription-lenses-0) in run "open-side-by-side" at 1440' ],
	[ 'no-setting-row', '0 ops, 2 no-setting, 1 unresolved, 0 no-effect, 0 unchecked: a no-setting row names a setting the block has (no-setting-review.json)' ],
	[ 'tree-rejected', 'exit 4: [FAIL] tree rejected: |   [1] sgs/container >[0] sgs/container >[0] sgs/heading: setting "level" must be string, got 1' ],
	[ 'paint-conservation', '1 proposal problem: paint conservation: 6 painted elements kept-unnamed (no rule) no node reads and no record carries: Root/706#0 border/padding' ],
	[ 'paint-pairing', '2 proposal problems: paint pairing: Root/1168#0 fits several measured parts of sgs/nav-drawer-menu' ],
	[ 'skeleton-lint', 'exit 2: the skeleton is not valid (R-47-10): | - node 12 (sgs/heading) carries `headingLevel`' ],
	[ 'handover-shape', 'exit 2: - node 62 (sgs/google-reviews) handover #0 kind "undefined" is not one of text, presence, link, behaviour' ],
	[ 'stale-intake', 'handoff/home is stale: the export changed since it was written (support.js changed; x.dc.html added); run intake again' ],
	[ 'stale-intake', 'exit 1: the saved inventory is stale and its instance keys are not used (a.dc.html changed); run intake again' ],
	[ 'stale-intake', 'intake.json hashes differ from MANIFEST.json: x.dc.html, support.js' ],
	[ 'handover-shape', 'exit 2: - node 4 (sgs/hero) handover owner "nobody" is not one of fill, walker, framework' ],
	[ 'handover-shape', 'exit 2: - node 4 (sgs/hero) handover #1 needs a detail saying what lives outside the tree' ],
	[ 'no-intake-surface', 'no intake surface: no handoff record matched' ],
	[ 'missing-input', 'exit 1: [FAIL] cannot read tree: ENOENT: no such file or directory, open \'sites\indus-foods\build\qa\fill\footer\filled.tree.json\'' ],
	[ 'browser-timeout', 'page.evaluate: Execution context was destroyed, most likely because of a navigation' ],
	[ OTHER_FAILURE, 'first is not defined' ],
];

test( 'MUST FAIL: each real failure message is classed, and an unknown one is `other`', () => {
	for ( const [ cls, message ] of REAL ) {
		assert.equal( failureClass( message ), cls, message );
	}
} );

test( 'MUST FAIL: a message that only mentions intake, staleness or a handover in passing is not that class', () => {
	assert.equal( failureClass( 'the stale cache of the intake folder was cleared' ), OTHER_FAILURE );
	assert.equal( failureClass( 'exit 1: no handover notes were written for the hero' ), OTHER_FAILURE );
	assert.equal( failureClass( 'walk failed: run "auto" at 768 was refused, not measured' ), OTHER_FAILURE, 'the refusal wording alone is not a class; the reason it carries is' );
} );

test( 'an error\'s own class wins over the message', () => {
	assert.equal( failureClass( 'first is not defined', 'not-at-rest' ), 'not-at-rest' );
} );

test( 'MUST FAIL: a failed stage record carries its class, and a stage that passed or was skipped carries none', () => {
	const failed = stageRecord( { ok: false, ms: 1200, detail: REAL[ 0 ][ 1 ] } );
	assert.equal( failed.failureClass, 'not-at-rest' );
	assert.equal( stageRecord( { ok: false, detail: 'x', failureClass: 'walk-x' } ).failureClass, 'walk-x' );
	assert.equal( 'failureClass' in stageRecord( { ok: true, ms: 1000 } ), false );
	assert.equal( 'failureClass' in stageRecord( { ok: true, skipped: 'not in --stages' } ), false );
	assert.equal( 'failureClass' in stageRecord( { ok: false, detail: 'a', skipped: 'x' } ), false, 'a skipped stage did not fail' );
	assert.match( stageLine( 'home', 'walk', failed ), /^FAIL home walk 1s - walk failed/ );
} );

test( 'failureCounts totals the failed stages by class, most frequent first, classing an old record by its detail', () => {
	const status = {
		home: { walk: stageRecord( { ok: false, detail: REAL[ 0 ][ 1 ] } ), apply: stageRecord( { ok: false, detail: REAL[ 2 ][ 1 ] } ) },
		about: { walk: stageRecord( { ok: false, detail: REAL[ 0 ][ 1 ] } ), fill: { ok: false, seconds: 3, detail: REAL[ 7 ][ 1 ] }, build: stageRecord( { ok: true, ms: 10 } ) },
	};
	assert.deepEqual( failureCounts( status ), { 'not-at-rest': 2, 'no-setting-row': 1, 'handover-shape': 1 } );
	assert.deepEqual( failureCounts( { home: { walk: stageRecord( { ok: true, ms: 1 } ) } } ), {} );
} );
