// Proves the walker's box-held rule (Bean, 2026-10-09): padding, margin, border widths and flex-grow that differ while
// the pair AND every pair measured inside it keep their painted box and text position paint nothing, so they are
// accepted (Lens 2026-10-08: the draft pads its outer panel, live the panel inside it, by the same amounts; every box
// and text lands on the same pixel). Never while the pair's text moves inside a same-size box, nor while a pair inside
// it moves. Transition timing is not box-held: it changes how motion feels, which no box can prove.
import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptHeld, pairSettled, inside, BOX_HELD } from '../../parity/lib/compare.mjs';

const snap = ( box, textX = 24, textY = 26, trace = null ) => ( { box, extras: { textX, textY }, ...( trace ? { trace } : {} ) } );
const BOX = { x: 0, y: 0, w: 425, h: 321 };
const panel = ( over = {} ) => ( {
	draft: snap( BOX ), live: snap( BOX, 24, 26, { ref: 'cr-ref-l-0', path: '.flow__aside', owners: [] } ),
	diffs: [ { kind: 'style', key: 'padding-top', draft: '32px', live: '0px' }, { kind: 'style', key: 'transition-duration', draft: '0.2s', live: '0.25s' } ],
	...over,
} );
const innerPair = ( dy = 0 ) => ( {
	draft: snap( { x: 0, y: 40, w: 361, h: 200 } ), live: snap( { x: 0, y: 40 + dy, w: 361, h: 200 }, 24, 26, { ref: 'cr-ref-l-0', path: '.flow__aside > .flow__panel', owners: [] } ),
	diffs: dy ? [ { kind: 'box', key: 'y-after-panel', draft: 40, live: 40 + dy } ] : [],
} );

test( 'MUST FAIL: outer-versus-inner padding that moves nothing is accepted, transition timing is not', () => {
	const pairs = { panel: panel(), inner: innerPair() };
	acceptHeld( pairs, 1 );
	assert.ok( pairs.panel.diffs[ 0 ].accepted, 'padding-top accepted' );
	assert.match( pairs.panel.diffs[ 0 ].accepted, /paints nothing/ );
	assert.equal( pairs.panel.diffs[ 1 ].accepted, undefined, 'transition timing stays open' );
} );

test( 'negative control: the same padding stays open when the text moves inside a same-size box', () => {
	const p = panel( { live: snap( BOX, 56, 26, { ref: 'cr-ref-l-0', path: '.flow__aside', owners: [] } ) } );
	const pairs = { panel: p, inner: innerPair() };
	acceptHeld( pairs, 1 );
	assert.equal( pairs.panel.diffs[ 0 ].accepted, undefined );
} );

test( 'negative control: the same padding stays open when a pair inside it moves', () => {
	const pairs = { panel: panel(), inner: innerPair( 18 ) };
	acceptHeld( pairs, 1 );
	assert.equal( pairs.panel.diffs[ 0 ].accepted, undefined );
} );

test( 'negative control: an open box row on the pair itself (a margin that moved it) keeps it open', () => {
	const p = panel();
	p.diffs.push( { kind: 'box', key: 'y-after-stage', draft: 96, live: 122 } );
	const pairs = { panel: p };
	acceptHeld( pairs, 1 );
	assert.equal( p.diffs[ 0 ].accepted, undefined );
} );

test( 'the pieces: which keys are box-held, what settles a pair, what sits inside it', () => {
	assert.ok( [ 'padding-left', 'margin-bottom', 'border-top-width', 'flex-grow' ].every( ( k ) => BOX_HELD.test( k ) ) );
	assert.ok( ! [ 'transition-duration', 'padding', 'color', 'width' ].some( ( k ) => BOX_HELD.test( k ) ) );
	assert.equal( pairSettled( panel(), 1 ), true );
	assert.equal( pairSettled( { ...panel(), live: snap( { ...BOX, h: 340 } ) }, 1 ), false );
	assert.equal( pairSettled( { ...panel(), draft: { box: BOX, extras: { textX: null, textY: null } } }, 1 ), false, 'text on one side only' );
	const root = { ref: 'cr-ref-a-1', path: '', owners: [] };
	assert.equal( inside( { ref: 'cr-ref-a-1', path: '.x', owners: [] }, root ), true );
	assert.equal( inside( { ref: 'cr-ref-a-2', path: '', owners: [ { ref: 'cr-ref-a-1', path: '.x > .y' } ] }, root ), true );
	assert.equal( inside( { ref: 'cr-ref-a-2', path: '', owners: [ { ref: 'cr-ref-a-9', path: '.x' } ] }, root ), false );
	assert.equal( inside( root, root ), false );
	assert.equal( inside( { ref: 'cr-ref-a-1', path: '.xa', owners: [] }, { ref: 'cr-ref-a-1', path: '.x', owners: [] } ), false, 'a sibling class prefix is not inside' );
} );
