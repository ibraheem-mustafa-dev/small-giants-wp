// Route-accuracy R6, try before write: the pure judgement. The 2026-10-09 home cards: Solve wrote 22px side padding on
// cards -31, -35 and -39 whose inner box already carried it, so each card's content went 291 -> 247px at 375 against
// the draft's 291. A trial measuring that change must reject it before anything is saved.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { uidsIn, mapUids, ruleDiff, selfCheck, untriable, withWrite, judgeTrial } from '../lib/trial.mjs';

const BLOCKS = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../../plugins/sgs-blocks/src/blocks' );
const box = ( w, x = 20 ) => ( { box: { x, y: 0, w, h: 100 } } );
const at = ( v ) => ( { 375: v } );
const blockX = at( { live: 0, draft: 0 } );

test( 'MUST FAIL (home cards, 2026-10-09): a write that narrows the card content away from the draft is rejected', () => {
	const v = judgeTrial( { before: at( { item: box( 291, 42 ) } ), after: at( { item: box( 247, 64 ) } ), draft: at( { item: box( 291, 42 ) } ), blockX } );
	assert.equal( v.keep, false );
	assert.deepEqual( v.worse.map( ( x ) => [ x.width, x.pair ] ), [ [ 375, 'item' ] ] );
} );

test( 'positive control: the same change in the other direction moves the page toward the draft and is kept', () => {
	const v = judgeTrial( { before: at( { item: box( 247, 64 ) } ), after: at( { item: box( 291, 42 ) } ), draft: at( { item: box( 291, 42 ) } ), blockX } );
	assert.equal( v.keep, true );
	assert.ok( v.delta < 0 );
} );

test( 'a write that helps one pair and hurts another by more than a pixel is rejected; one that changes nothing is not kept', () => {
	const draft = at( { a: box( 100 ), b: box( 100 ) } );
	assert.equal( judgeTrial( { before: at( { a: box( 80 ), b: box( 100 ) } ), after: at( { a: box( 100 ), b: box( 90 ) } ), draft, blockX } ).keep, false );
	assert.equal( judgeTrial( { before: at( { a: box( 80 ) } ), after: at( { a: box( 80 ) } ), draft, blockX } ).keep, false );
} );

test( 'uids map by prefix; rules diff as text; the self-check refuses a render whose uid or rules differ from live', () => {
	assert.deepEqual( uidsIn( 'sgs-container cr-ref-home-31 sgs-container-6e38e035 sgs-cst-0a1b2c3d' ), [ 'sgs-container-6e38e035', 'sgs-cst-0a1b2c3d' ] );
	assert.equal( mapUids( '.sgs-container-aaaaaaaa{padding:1px}', [ 'sgs-container-aaaaaaaa' ], [ 'sgs-container-6e38e035' ] ), '.sgs-container-6e38e035{padding:1px}' );
	assert.deepEqual( ruleDiff( [ 'x', 'y' ], [ 'y', 'z' ] ), { added: [ 'z' ], removed: [ 'x' ] } );
	assert.equal( selfCheck( { liveUids: [ 'sgs-container-6e38e035' ], renderUids: [ 'sgs-container-6e38e035' ], liveRules: [ 'r' ], renderRules: [ 'r' ] } ).ok, true );
	assert.match( selfCheck( { liveUids: [ 'sgs-container-6e38e035' ], renderUids: [ 'sgs-container-11111111' ], liveRules: [], renderRules: [] } ).why, /tree and the live page differ/ );
	assert.match( selfCheck( { liveUids: [ 'u-1' ], renderUids: [ 'u-1' ], liveRules: [ 'a' ], renderRules: [ 'b' ] } ).why, /only in the render/ );
} );

test( 'a block reading its parent (usesContext) or minting classes per request is never trialled; the container is', () => {
	assert.match( untriable( 'sgs/accordion-item', BLOCKS ) || '', /usesContext|per request/ );
	assert.equal( untriable( 'sgs/container', BLOCKS ), null );
	assert.deepEqual( withWrite( { a: 1, padding: { top: '0' } }, { attr: 'padding', after: { top: '22px' } } ), { a: 1, padding: { top: '22px' } } );
	assert.deepEqual( withWrite( { a: 1, b: 2 }, { attr: 'b', after: null } ), { a: 1 } );
} );

test( 'the replay tries the last write of each setting on each block in the round, and nothing from other rounds', async () => {
	const { candidatesOf } = await import( '../trial.mjs' );
	const w = ( ref, attr, round, after ) => ( { ref, attr, round, after, group: `${ ref }||${ attr }|` } );
	const c = candidatesOf( [ w( 'r1', 'padding', 1, 'a' ), w( 'r1', 'padding', 1, 'b' ), w( 'r1', 'gap', 1, 'g' ), w( 'r2', 'padding', 2, 'x' ) ], 1 );
	assert.deepEqual( c.map( ( x ) => [ x.ref, x.attr, x.after ] ), [ [ 'r1', 'padding', 'b' ], [ 'r1', 'gap', 'g' ] ] );
} );
