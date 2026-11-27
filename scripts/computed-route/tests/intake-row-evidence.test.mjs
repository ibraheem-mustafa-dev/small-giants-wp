// intake.json keeps each skeleton row's top three candidates with their evidence lines, so the skeleton finaliser
// (prompts/skeleton-finaliser.md rule 1) reads why each block was scored.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rowsOf } from '../lib/intake-skeletons.mjs';

test( 'MUST FAIL: an intake row keeps the evidence lines of its candidates', () => {
	const inventory = { elements: [ { key: 'Root/1#0', parentKey: null, tag: 'p', words: 'Hello' } ] };
	const candidates = [
		{ block: 'sgs/text', score: 0.4, share: 0.6, evidence: [ { kind: 'tag', w: 0.4, text: 'tag p maps to sgs/text (block_tags)' } ] },
		{ block: 'sgs/label', score: 0.2, share: 0.3, evidence: [ { kind: 'role', w: 0.2, text: 'short line above a heading' } ] },
		{ block: 'sgs/heading', score: 0.1, share: 0.1, evidence: [] },
		{ block: 'sgs/button', score: 0.05, share: 0, evidence: [ { kind: 'x', w: 0.05, text: 'dropped: fourth' } ] },
	];
	const proposal = { rows: [ { key: 'Root/1#0', tag: 'p', words: 'Hello', block: 'sgs/text', confidence: 0.4, low: true, reason: 'r', candidates } ] };
	const [ row ] = rowsOf( 'home', proposal, inventory );
	assert.deepEqual( row.candidates.map( ( c ) => c.evidence ), [ [ 'tag p maps to sgs/text (block_tags)' ], [ 'short line above a heading' ], [] ] );
} );
