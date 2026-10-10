// Route-accuracy R4 (Spec 47 §3.6): a block whose two independent pairings disagree (the draft's own identity and the
// word matcher) is listed in qa/pairs/<surface>.json `mispaired`. Its rows stay in the report, flagged, so a real
// problem is never hidden; Solve never writes through them (lib/solve-rows.mjs::writableGroups) and triage labels them
// W / mispaired. The 2026-10-09 header case: the draft's inner row compared with the live header root, three wrong writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mispairedRefs, markMispaired } from '../../parity/lib/ref-trace.mjs';
import { writableGroups } from '../lib/solve-rows.mjs';
import { triage } from '../lib/triage.mjs';

const WHY = 'identity [data-dc-tpl] 4/12#0 and words body > div > header > div disagree';
const pairing = { keptPairs: [ { ref: 'cr-ref-header-0' } ], mispaired: [ { ref: 'cr-ref-header-0', why: WHY } ] };
const rows = () => [
	{ kind: 'style', key: 'padding-top', draft: '12px', live: '0px', ref: 'cr-ref-header-0', path: '', accepted: null },
	{ kind: 'style', key: 'font-size', draft: '15px', live: '14px', ref: 'cr-ref-header-3', path: '', accepted: null },
];

test( 'MUST FAIL (2026-10-09 header: three writes through a mispaired root): a mispaired block keeps its rows, each flagged with why', () => {
	const marked = markMispaired( rows(), mispairedRefs( pairing ) );
	assert.equal( marked.length, 2, 'no row is dropped' );
	assert.equal( marked[ 0 ].mispaired, WHY );
	assert.equal( marked[ 1 ].mispaired, undefined );
	assert.equal( mispairedRefs( { mispaired: [ { ref: 'header-0', why: 'x' } ] } ).get( 'header-0' ), 'x' );
} );

test( 'MUST FAIL TO WRITE: Solve never groups a flagged row; the same row unflagged is written (negative control)', () => {
	const report = ( diffs ) => ( { runs: [ { state: 'opening', width: 1440, pairs: { 'header-root': { draft: { styles: { 'padding-top': '12px' } }, diffs } } } ] } );
	const flagged = writableGroups( report( markMispaired( rows().slice( 0, 1 ), mispairedRefs( pairing ) ) ), { opening: null } );
	assert.equal( flagged.groups.length, 0 );
	assert.equal( flagged.other.length, 1 );
	assert.equal( writableGroups( report( rows().slice( 0, 1 ) ), { opening: null } ).groups.length, 1 );
} );

test( 'triage labels a flagged row W / mispaired from the identity check, before any setting lookup', () => {
	const r = { ...rows()[ 0 ], pair: 'header-root', state: 'opening', width: 1440, owners: [], mispaired: WHY };
	const walk = { runs: [ { state: 'opening', width: 1440, pairs: { 'header-root': { draft: { styles: {}, box: { w: 1200, h: 60 }, text: 'Shop' }, live: { trace: { ref: r.ref }, box: { w: 1440, h: 72 }, text: 'Shop' }, diffs: [ r ] } } } ] };
	let asked = 0;
	const ctx = { nodeFor: () => ( { name: 'sgs/site-header' } ), resolver: () => ( asked++, { gap: 'no-setting', detail: 'none' } ) };
	const v = triage( { classes: { hardcode: [], missing: [ r ], unresolved: [], derived: [], other: [] }, gaps: {}, writes: [] }, walk, 'header', ctx ).verdicts[ 0 ];
	assert.equal( v.class, 'W' );
	assert.equal( v.decidedBy, 'mispaired' );
	assert.equal( v.evidence[ 0 ].source, 'identity' );
	assert.equal( asked, 0 );
} );
