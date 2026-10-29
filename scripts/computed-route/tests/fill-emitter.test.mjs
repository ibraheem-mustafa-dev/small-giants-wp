// Spec 48 FR-48-76 (setting level): the confirm record compares what a written setting will paint (lib/fill-emitter.mjs)
// with the draft's render before it calls a value confirmed (lib/fill-confirm.mjs::confirmRecords). D–R agreeing proves the
// draft's code and render match, not that the setting emits that value.
import test from 'node:test';
import assert from 'node:assert/strict';
import { predictedPaint, emitterCheck } from '../lib/fill-emitter.mjs';
import { confirmRecords } from '../lib/fill-confirm.mjs';
import { liveVerdict } from '../lib/confirm-live.mjs';

const PALETTE = [ { slug: 'primary', colour: { r: 170, g: 0, b: 0, a: 1 } }, { slug: 'heading', colour: { r: 44, g: 62, b: 80, a: 1 } } ];
const cal = ( paint = {} ) => ( { elements: { '': { 1440: { 'padding-left': '40px', ...paint[ 1440 ] }, 768: { 'padding-left': '24px', ...paint[ 768 ] }, 375: { 'padding-left': '24px', ...paint[ 375 ] } } } } );
const write = ( over ) => ( { node: 'n', index: 0, block: 'sgs/container', slot: '', prop: 'color', attr: 'textColour', after: 'primary', how: 'single', widths: [ 1440 ], ...over } );

test( 'predictedPaint: a palette slug is the colour the site gives it, only on a colour property', () => {
	assert.deepEqual( predictedPaint( write(), 1440, cal(), PALETTE ), { value: 'rgb(170, 0, 0)' } );
	assert.equal( predictedPaint( write( { prop: 'font-family', attr: 'fontFamily', after: 'heading' } ), 1440, cal(), PALETTE ), null, 'a font family slug named like a colour slug is not that colour' );
	assert.equal( predictedPaint( write( { after: 'tertiary' } ), 1440, cal(), PALETTE ), null, 'an unresolved token name is not predicted' );
	assert.deepEqual( predictedPaint( write( { after: '#0A6E93' } ), 1440, cal(), PALETTE ), { value: '#0A6E93' } );
} );

test( 'predictedPaint: a tier the write leaves to the block shows the block\'s own paint; an edge box prints only its stated sides', () => {
	const pad = ( after ) => write( { prop: 'padding-left', attr: 'padding', after, how: 'tiers' } );
	assert.deepEqual( predictedPaint( pad( { desktop: { left: '0px' } } ), 1440, cal(), PALETTE ), { value: '0px' } );
	assert.deepEqual( predictedPaint( pad( { desktop: { left: '0px' } } ), 375, cal(), PALETTE ), { value: '24px' }, 'the block keeps a different default at 375, so the desktop value does not carry' );
	assert.deepEqual( predictedPaint( pad( { desktop: { top: '8px' } } ), 1440, cal(), PALETTE ), { value: '40px' }, 'an unstated side is the block\'s own' );
	assert.equal( predictedPaint( pad( { desktop: { left: '2rem' } } ), 1440, cal(), PALETTE ), null, 'a relative unit is not predicted' );
	assert.equal( predictedPaint( write( { prop: 'font-size', attr: 'fontSize', after: { desktop: 15 } } ), 1440, cal(), PALETTE ), null, 'a bare number is a size in its own unit, not predicted here' );
	assert.equal( predictedPaint( write(), 1440, null, PALETTE ), null, 'no calibration, no prediction' );
	assert.equal( predictedPaint( write( { from: { slot: '' } } ), 1440, cal(), PALETTE ), null, 'a write made through another setting is not predicted' );
} );

test( 'emitterCheck: agree, differs, and nothing predicted or nothing rendered', () => {
	assert.equal( emitterCheck( write( { after: '#0A6E93' } ), 1440, 'rgb(10, 110, 147)', cal(), PALETTE ).ep, 'agree', 'a hex value against the browser\'s rgb()' );
	assert.equal( emitterCheck( write(), 1440, 'rgb(10, 110, 147)', cal(), PALETTE ).ep, 'differs' );
	assert.equal( emitterCheck( write( { after: 'tertiary' } ), 1440, 'rgb(10, 110, 147)', cal(), PALETTE ).ep, null );
	assert.equal( emitterCheck( write(), 1440, null, cal(), PALETTE ).ep, null );
} );

// One colour write on a node whose draft declares and renders rgb(10, 110, 147), so D–R agrees at every width.
function records( palette, declared = 'rgb(10, 110, 147)' ) {
	const snap = { styles: { color: 'rgb(10, 110, 147)', 'font-size': '16px' } };
	const reads = { widths: { 375: { '0:': snap }, 768: { '0:': snap }, 1440: { '0:': snap } }, declared: { 375: { '0:': { color: declared } }, 768: { '0:': { color: declared } }, 1440: { '0:': { color: declared } } } };
	const nodes = [ { targets: [ { id: '0:', slot: '', finder: { tpl: 'Root/1#0' } } ] } ];
	return confirmRecords( { writes: [ write( { how: 'single' } ) ], nodes, reads, rootComponent: 'Root', calFor: () => cal(), palette } );
}

test( 'MUST FAIL: a value D–R confirms is not confirmed when its setting is predicted to paint another colour', () => {
	const bad = records( PALETTE );
	assert.deepEqual( bad.map( ( r ) => [ r.dr, r.ep, r.verdict ] ), [ [ 'agree', 'differs', 'open' ], [ 'agree', 'differs', 'open' ], [ 'agree', 'differs', 'open' ] ] );
	assert.match( bad[ 0 ].reason, /^emitter: textColour is predicted to paint rgb\(170, 0, 0\) here, the draft renders rgb\(10, 110, 147\)/ );
	assert.equal( bad[ 0 ].predicted, 'rgb(170, 0, 0)' );
	// The live half keeps it open: an R–L agreement does not confirm what the setting does not emit.
	assert.equal( liveVerdict( 'agree', false, 'agree', 'differs' ).verdict, 'open' );
	assert.match( liveVerdict( 'agree', false, 'agree', 'differs' ).reason, /^emitter/ );
} );

test( 'negative control: the same write with the slug resolving to the draft\'s colour, or nothing predicted, stays confirmed', () => {
	const good = records( [ { slug: 'primary', colour: { r: 10, g: 110, b: 147, a: 1 } } ] );
	assert.deepEqual( good.map( ( r ) => [ r.ep, r.verdict ] ), [ [ 'agree', 'confirmed' ], [ 'agree', 'confirmed' ], [ 'agree', 'confirmed' ] ] );
	const unknown = records( [] );
	assert.deepEqual( unknown.map( ( r ) => [ r.ep, r.verdict ] ), [ [ null, 'confirmed' ], [ null, 'confirmed' ], [ null, 'confirmed' ] ], 'an unresolved slug predicts nothing, so D–R alone decides' );
	assert.deepEqual( records( PALETTE, 'rgb(1, 2, 3)' ).map( ( r ) => [ r.dr, r.ep, r.verdict ] ), [ [ 'disagree', 'differs', 'render-wins' ], [ 'disagree', 'differs', 'render-wins' ], [ 'disagree', 'differs', 'render-wins' ] ], 'only a confirmation is withheld at Fill too' );
	assert.equal( liveVerdict( 'agree', false, 'agree', 'agree' ).verdict, 'confirmed' );
	assert.equal( liveVerdict( 'agree', false, 'agree' ).verdict, 'confirmed' );
	assert.equal( liveVerdict( 'agree', false, 'disagree', 'differs' ).verdict, 'open', 'an open verdict is not made anything else' );
	assert.equal( liveVerdict( 'disagree', false, 'agree', 'differs' ).verdict, 'render-wins', 'only a confirmation is withheld' );
} );
