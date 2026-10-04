// Block pairing for full coverage (plan .claude/plans/2026-10-04-spec47-full-coverage.md): a block's draft partner
// is kept only when it holds its words and nothing that belongs outside it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { wordsByBlock, twinsByBlock, judgePairing, configText } from '../lib/pairs.mjs';

// Live words 0-3: 0-1 in a heading (ref h) inside a section (ref s), 2-3 in a text (ref t) inside the same section.
const liveRefs = [ [ 'h', 's' ], [ 'h', 's' ], [ 't', 's' ], [ 't', 's' ] ];
const blocks = wordsByBlock( liveRefs );
const matches = [ [ 10, 0 ], [ 11, 1 ], [ 12, 2 ], [ 13, 3 ] ];
const twins = twinsByBlock( matches, blocks );
const ofDraft = new Map( matches.map( ( [ d, l ] ) => [ d, liveRefs[ l ] ] ) );

test( 'a block holds every word inside it, nested blocks included, and its words\' draft twins', () => {
	assert.deepEqual( blocks.get( 's' ), [ 0, 1, 2, 3 ] );
	assert.deepEqual( twins.get( 'h' ), { live: [ 0, 1 ], draft: [ 10, 11 ] } );
} );

test( 'a partner holding exactly the block\'s words, at a similar size, is kept', () => {
	assert.deepEqual( judgePairing( { ref: 'h', ...twins.get( 'h' ), liveBox: { w: 400, h: 40 } }, { inside: [ 10, 11 ], box: { w: 420, h: 38 } }, ofDraft ), { ok: true, why: null } );
	assert.equal( judgePairing( { ref: 's', ...twins.get( 's' ), liveBox: { w: 800, h: 300 } }, { inside: [ 10, 11, 12, 13 ], box: { w: 820, h: 280 } }, ofDraft ).ok, true );
} );

test( 'MUST FAIL TO KEEP: a partner that also holds another block\'s words is left out', () => {
	const v = judgePairing( { ref: 'h', ...twins.get( 'h' ), liveBox: { w: 400, h: 40 } }, { inside: [ 10, 11, 12 ], box: { w: 420, h: 38 } }, ofDraft );
	assert.equal( v.ok, false );
	assert.match( v.why, /belong outside this block/ );
} );

test( 'MUST FAIL TO KEEP: too few matched words, or a box far from the block\'s, is left out', () => {
	assert.equal( judgePairing( { ref: 'h', live: [ 0, 1, 5, 6, 7 ], draft: [ 10 ], liveBox: { w: 400, h: 40 } }, { inside: [ 10 ], box: { w: 400, h: 40 } }, ofDraft ).ok, false );
	assert.equal( judgePairing( { ref: 'h', ...twins.get( 'h' ), liveBox: { w: 400, h: 40 } }, { inside: [ 10, 11 ], box: { w: 1200, h: 40 } }, ofDraft ).ok, false );
} );

test( 'the generated config keeps the hand config and adds one ref-finder pair per kept block', () => {
	const src = configText( 'about.mjs', 'about', [ { ref: 'cr-ref-about-0', draft: 'body > main:nth-child(2)' } ] );
	assert.match( src, /import base from '\.\/about\.mjs';/ );
	assert.match( src, /name: "gen-about-0", text: false, structure: false, draft: "body > main:nth-child\(2\)", live: "\.cr-ref-about-0"/ );
	assert.match( src, /refPrefix: base\.refPrefix/ );
} );
