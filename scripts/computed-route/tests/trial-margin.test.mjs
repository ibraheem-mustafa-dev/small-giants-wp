// Spec 48 FR-48-4: try before write also catches a margin write that moves boxes. A margin changes where the boxes after it
// sit, not their size, so the trial judges every pair's top offset from an anchor the write cannot move (the last pair
// before the block, lib/trial-page.mjs::anchorInPage), as well as its size and left offset (lib/trial.mjs::judgeTrial).
import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeTrial, anchorTops, pairDistance } from '../lib/trial.mjs';
import { anchorInPage, scopeInPage, measureInPage, applyTrialInPage, undoTrialInPage } from '../lib/trial-page.mjs';
import { resolveFinder } from '../../parity/lib/collect.mjs';

const box = ( y, h = 100 ) => ( { box: { x: 0, y, w: 300, h } } );
const at = ( v ) => ( { 1440: v } );
const blockX = at( { live: 0, draft: 0 } );
// The draft: a heading above (y 0), the written block at 120, its next sibling at 240. Live before the write matches it;
// the planted margin write leaves the block where it is (its own margin matches) and pushes the sibling 20px down.
const draft = at( { head: box( 1000 ), block: box( 1120 ), next: box( 1240 ) } );
const before = at( { head: box( 0 ), block: box( 120 ), next: box( 240 ) } );
const pushed = at( { head: box( 0 ), block: box( 120 ), next: box( 260 ) } );
const anchors = at( 'head' );
const judge = ( after, b = before ) => judgeTrial( { before: b, after, draft, blockX, anchorY: anchorTops( { before: b, after, draft, anchors } ) } );

test( 'MUST FAIL WITHOUT POSITIONS: a margin write that moves the next sibling 20px off the draft is rejected', () => {
	const v = judge( pushed );
	assert.equal( v.verdict, 'reject' );
	assert.deepEqual( v.worse, [ { width: 1440, pair: 'next', by: 20 } ] );
	assert.equal( judgeTrial( { before, after: pushed, draft, blockX } ).verdict, 'no-box-change', 'sizes alone never see it' );
} );

test( 'positive control: the same margin moving the sibling onto the draft is kept', () => {
	const short = at( { head: box( 0 ), block: box( 120 ), next: box( 220 ) } );
	assert.equal( judge( before, short ).verdict, 'keep' );
} );

test( 'a margin on the block itself is judged from the pair before it; with no anchor on the draft only sizes are judged', () => {
	const moved = at( { head: box( 0 ), block: box( 140 ), next: box( 260 ) } );
	assert.equal( judge( moved ).verdict, 'reject' );
	assert.deepEqual( anchorTops( { before, after: moved, draft: at( { block: box( 1120 ) } ), anchors } ), {} );
	assert.deepEqual( anchorTops( { before, after: moved, draft, anchors: at( null ) } ), {} );
	assert.equal( pairDistance( box( 140 ), box( 1120 ), { live: 0, draft: 0 }, { live: 0, draft: 1000 } ), 20 );
	assert.equal( pairDistance( box( 140 ), box( 1120 ), { live: 0, draft: 0 } ), 0 );
} );

// The page half, in a real browser: the anchor is the last pair before the block (never its ancestor or a pair inside it),
// and the trial's own CSS apply/measure/undo turns a margin into a rejected verdict.
const HTML = `<style>body{margin:0}section{display:block}.cr-ref-b{height:100px}h2,h3,p{margin:0;height:20px}</style>
<main class="wrap"><h2 class="head">Head</h2><h3 class="sub">Sub</h3><section class="cr-ref-b"><p class="in">In</p></section><p class="next">Next</p></main>`;
const FINDERS = { wrap: '.wrap', head: '.head', sub: '.sub', block: '.cr-ref-b', inner: '.in', next: '.next' };

test( 'MUST FAIL WITHOUT POSITIONS: in the page, the trial rejects a margin that pushes the next sibling off the draft', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
		await page.setContent( HTML );
		const src = resolveFinder.toString();
		const anchor = await page.evaluate( anchorInPage, [ src, FINDERS, '.cr-ref-b' ] );
		assert.equal( anchor, 'sub', 'the nearest pair before the block, not its container' );
		assert.equal( await page.evaluate( anchorInPage, [ src, { wrap: '.wrap', block: '.cr-ref-b', next: '.next' }, '.cr-ref-b' ] ), 'block', 'with no pair before it, the block\'s own pair' );
		const scope = await page.evaluate( scopeInPage, [ src, FINDERS, '.cr-ref-b' ] );
		const pick = Object.fromEntries( [ ...scope, anchor ].map( ( n ) => [ n, FINDERS[ n ] ] ) );
		const m0 = await page.evaluate( measureInPage, [ src, pick, '.cr-ref-b' ] );
		await page.evaluate( applyTrialInPage, [ '.cr-ref-b{margin-bottom:20px}', [] ] );
		const m1 = await page.evaluate( measureInPage, [ src, pick, '.cr-ref-b' ] );
		await page.evaluate( undoTrialInPage );
		const only = ( pairs ) => Object.fromEntries( Object.entries( pairs ).filter( ( [ n ] ) => scope.includes( n ) ) );
		const pageDraft = at( m0.pairs );
		const v = judgeTrial( { before: at( only( m0.pairs ) ), after: at( only( m1.pairs ) ), draft: pageDraft, blockX: at( { live: 0, draft: 0 } ), anchorY: anchorTops( { before: at( m0.pairs ), after: at( m1.pairs ), draft: pageDraft, anchors: at( anchor ) } ) } );
		assert.equal( v.verdict, 'reject' );
		assert.deepEqual( v.worse.map( ( x ) => [ x.pair, x.by ] ), [ [ 'next', 20 ] ] );
	} finally {
		await browser.close();
	}
} );
