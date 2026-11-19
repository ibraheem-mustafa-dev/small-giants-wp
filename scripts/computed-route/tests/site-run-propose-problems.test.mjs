// A proposal problem is reported and the surface goes on; --strict fails the stage (Spec 48 section 8).
import test from 'node:test';
import assert from 'node:assert/strict';
import { proposeDetail } from '../site-run.mjs';

const clean = { problems: [], proposal: { counts: { skeletonNodes: 35, low: 5 } } };
const noted = { ...clean, problems: [ 'Root/132#0: a slider of 4 slides that no listed slider block takes' ] };

test( 'MUST FAIL: a proposal problem is in the result line and does not stop the surface', () => {
	const said = proposeDetail( noted );
	assert.match( said, /^35 nodes, 5 low; 1 proposal problem: Root\/132#0/ );
} );

test( 'with --strict a proposal problem fails the stage, naming it', () => {
	assert.throws( () => proposeDetail( noted, { strict: true } ), /1 proposal problem: Root\/132#0/ );
} );

test( 'negative control: a proposal with no problem reads the same with and without --strict', () => {
	assert.equal( proposeDetail( clean ), '35 nodes, 5 low' );
	assert.equal( proposeDetail( clean, { strict: true } ), '35 nodes, 5 low' );
} );
