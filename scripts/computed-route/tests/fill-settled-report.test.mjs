// The settled list in Fill's report (lib/fill-report.mjs::SETTLED): every value Fill read that ends with nothing written
// and nothing unwritten, counted by reason in fill-report.json and the reader's summary table.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillReport } from '../lib/fill-report.mjs';

test( 'the report counts and lists the settled rows by reason', () => {
	const base = { client: 'c', surface: 's', draft: 'd', nodes: 1, targets: 1, writes: [], unmapped: [], notes: [], handover: [], spacing: [], fluid: [], held: [], snaps: [], steps: [], entrances: [] };
	const settled = [ { node: 'n', block: 'sgs/text', slot: '', property: 'display', value: 'block', reason: 'equal' }, { node: 'n', block: 'sgs/text', slot: '', property: 'width', value: '13px', reason: 'used-size' } ];
	const { json, markdown } = fillReport( { ...base, settled } );
	assert.deepEqual( json.counts.settled, { total: 2, equal: 1, 'already-set': 0, 'used-size': 1 } );
	assert.equal( json.settled.length, 2 );
	assert.match( markdown, /Settled .*\| 2 \(equal 1, already-set 0, used-size 1\) \|/ );
} );
