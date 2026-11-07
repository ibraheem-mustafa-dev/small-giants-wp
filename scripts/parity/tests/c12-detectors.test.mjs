// C1 (extra effect) and C2 (hover trigger region) detectors on fixture pages: each fault fixture must FAIL (the finding is
// reported) and each negative control must PASS (no finding for that element). Fixture pages stand in for the draft and the
// live site: elements carry the cr-ref class the live pairing uses, and both sides are marked the same way.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchReal } from '../detectors/lib-geometry.mjs';
import { readPage } from '../detectors/c12-session.mjs';
import { judgeC1 } from '../detectors/c1-extra-effect.mjs';
import { judgeC2 } from '../detectors/c2-hover-region.mjs';
import { changeSet, scrollRange, scrollMoves } from '../detectors/c12-diff.mjs';
import * as inpage from '../detectors/c12-inpage.mjs';
import { scrollSweep, hoverSweep, triggerScan, hoverTargets } from '../detectors/c12-session.mjs';

const PAGE = ( css, body, js = '' ) => `<!doctype html><meta charset=utf-8><style>*{box-sizing:border-box}body{margin:0;font:16px sans-serif}${ css }</style>${ body }<script>${ js }</script>`;
const PARALLAX = ( sel, k ) => `addEventListener('scroll',()=>{const e=document.querySelector('${ sel }');e.style.transform='translateY('+(-scrollY*${ k })+'px)'});`;

// Page fixtures: [ draft, live ] pairs. Refs: t-1 hero label, t-2 hero frame, t-3 cards wrapper, t-4 card, t-5 button.
const BODY = '<section style="height:700px"><h2 class="cr-ref-t-1">Label</h2><div class="cr-ref-t-2" style="width:200px;height:120px;background:#cde"></div></section>'
	+ '<section style="height:300px"><div class="cr-ref-t-3" style="display:flex;gap:30px;padding:20px"><div class="cr-ref-t-4 card" style="width:160px;height:120px;background:#eee">Card</div></div><a class="cr-ref-t-5 btn" href="#" style="display:inline-block;padding:10px 20px;background:#123;color:#fff">Go</a></section><section style="height:1200px"></section>';
const CSS = '.cr-ref-t-1,.cr-ref-t-2{position:relative}.card{transition:transform .2s}.btn{transition:background .2s}.btn:hover{background:#c90}';
const DRAFT_JS = PARALLAX( '.cr-ref-t-2', 0.2 );
const draftHtml = PAGE( CSS + '.card:hover{transform:rotate(3deg)}', BODY, DRAFT_JS );
const liveHtml = PAGE( CSS + '.card:hover{transform:rotate(3deg)}.cr-ref-t-3{transition:transform .2s}.cr-ref-t-3:hover{transform:scale(1.05) translateY(-6px)}', BODY, DRAFT_JS + PARALLAX( '.cr-ref-t-1', 0.3 ) );

const show = ( rows ) => ' ' + JSON.stringify( rows.map( ( r ) => [ r.kind, r.ref, r.categories, r.pointers, r.live, r.draft ] ) ).slice( 0, 900 );
const pairs = Object.fromEntries( [ 1, 2, 3, 4, 5 ].map( ( n ) => [ `cr-ref-t-${ n }`, null ] ) );
const ids = Object.keys( pairs );

async function fixtureReading( browser, html, need, width = 1000 ) {
	const ctx = await browser.newContext( { viewport: { width, height: 700 } } );
	const page = await ctx.newPage();
	await page.setContent( html );
	await page.evaluate( inpage.markPairs, [ 'live', pairs, '' ] );
	const out = { found: Object.fromEntries( ids.map( ( i ) => [ i, true ] ) ) };
	if ( need.scroll ) {
		out.scroll = await scrollSweep( page, 150 );
	}
	const targets = await hoverTargets( page, ids, { all: true } );
	out.targets = targets;
	if ( need.hover ) {
		out.hover = await hoverSweep( page, targets, { wait: 400 } );
	}
	if ( need.triggers ) {
		out.triggers = await triggerScan( page, targets, { withRules: true } );
	}
	await ctx.close();
	return out;
}

let browser;
test.before( async () => {
	browser = await launchReal();
} );
test.after( async () => {
	await browser.close();
} );

test( 'diff helpers: a changed transform, a moved box and an unchanged element', () => {
	const r = { vis: true, inView: true, x: 0, y: 0, w: 10, h: 10, tf: [ 0, 0, 1, 1, 0 ], color: 'rgb(0, 0, 0)', bg: 'rgba(0, 0, 0, 0)', bc: 'rgb(0, 0, 0)', sh: 'none', op: '1', fl: 'none', td: 'none' };
	assert.deepEqual( Object.keys( changeSet( r, r ) ), [] );
	assert.ok( changeSet( r, { ...r, tf: [ 0, -4, 1.05, 1.05, 0 ] } ).transform );
	assert.ok( changeSet( r, { ...r, color: 'rgb(200, 0, 0)' } ).colour );
	assert.equal( scrollMoves( scrollRange( [ r, { ...r, tf: [ 0, -30, 1, 1, 0 ] } ] ) ), true );
	assert.equal( scrollMoves( scrollRange( [ r, r ] ) ), false );
} );

test( 'C1 scroll: a label that moves on scroll on live only FAILS; the hero frame both sides move PASSES', async () => {
	const d = await fixtureReading( browser, draftHtml, { scroll: true } );
	const l = await fixtureReading( browser, liveHtml, { scroll: true } );
	const rows = judgeC1( l, d, ids, { page: 't', width: 1000 } ).filter( ( r ) => 'fail' === r.status );
	assert.ok( rows.some( ( r ) => 'scroll-driven' === r.kind && 'cr-ref-t-1' === r.ref ), 'label parallax reported' + show( rows ) );
	assert.ok( ! rows.some( ( r ) => 'cr-ref-t-2' === r.ref ), 'frame parallax (draft has it) not reported' + show( rows ) );
} );

test( 'C1 hover: a wrapper that tilts on live only FAILS; a card that tilts on both PASSES; a button with the same hover PASSES', async () => {
	const d = await fixtureReading( browser, draftHtml, { hover: true } );
	const l = await fixtureReading( browser, liveHtml, { hover: true } );
	const rows = judgeC1( l, d, ids, { page: 't', width: 1000 } ).filter( ( r ) => 'fail' === r.status );
	assert.ok( rows.some( ( r ) => 'hover-effect' === r.kind && 'cr-ref-t-3' === r.ref && r.categories.includes( 'transform' ) ), 'wrapper hover transform reported' + show( rows ) );
	assert.ok( ! rows.some( ( r ) => 'cr-ref-t-4' === r.ref ), 'card tilt (draft has it) not reported' + show( rows ) );
	assert.ok( ! rows.some( ( r ) => 'cr-ref-t-5' === r.ref ), 'faithful button hover not reported' + show( rows ) );
} );

// C2 fixtures: a link row whose live hover area is the whole row item, a card paragraph with its own hover colour.
const ROW = '<ul style="list-style:none;padding:0;margin:0;width:400px"><li class="cr-ref-t-3 item" style="padding:8px 0"><a class="cr-ref-t-1 lnk" href="#">Certifications</a></li></ul>'
	+ '<div class="cr-ref-t-4 card2" style="width:300px;padding:20px;background:#c90;margin-top:30px"><p class="cr-ref-t-2">Paragraph</p></div>'
	+ '<button class="cr-ref-t-5 gobtn">Go</button>';
const C2CSS = '.lnk{color:#000;text-decoration:none;transition:color .1s}.card2 p{margin:0;color:#fff}.card2{width:300px;padding:20px;background:#c90;margin-top:30px}.card2{transition:background .1s}.gobtn{margin-top:30px;padding:10px 20px;background:#123;color:#fff;border:0}.gobtn:hover{background:#c90}';
const c2Draft = PAGE( C2CSS + '.lnk:hover{color:#c90}.card2:hover{background:#fc3}.card2:hover p{color:#123}', ROW );
const c2Live = PAGE( C2CSS + '.item:hover .lnk{color:#00c}.lnk:hover{color:#c90}.card2:hover{background:#fc3}.card2:hover p{color:#123}.card2 p:hover{color:#00338d}', ROW );

test( 'C2: footer-style link hovered beside the text and a card paragraph with its own hover colour FAIL; the single button PASSES', async () => {
	const d = await fixtureReading( browser, c2Draft, { hover: true, triggers: true } );
	const l = await fixtureReading( browser, c2Live, { hover: true, triggers: true } );
	const rows = judgeC2( l, d, { page: 't', width: 1000 } ).filter( ( r ) => 'fail' === r.status );
	assert.ok( rows.some( ( r ) => 'trigger-extra-live' === r.kind && 'cr-ref-t-1' === r.ref ), 'link: the live row item is an extra trigger' + show( rows ) );
	assert.ok( rows.some( ( r ) => 'hover-outcome' === r.kind && 'cr-ref-t-1' === r.ref && /gap/.test( r.pointers.join() ) ), 'link: hovering beside the text turns it on live only' + show( rows ) );
	assert.ok( rows.some( ( r ) => 'trigger-extra-live' === r.kind && 'cr-ref-t-2' === r.ref ), 'paragraph: its own hover rule is an extra trigger' + show( rows ) );
	assert.ok( rows.some( ( r ) => 'hover-outcome' === r.kind && 'cr-ref-t-2' === r.ref ), 'paragraph: pointer over it ends in another colour on live' + show( rows ) );
	assert.ok( ! rows.some( ( r ) => 'cr-ref-t-5' === r.ref ), 'a draft-faithful button hover is not reported' + show( rows ) );
} );

test( 'C2: identical pages report nothing', async () => {
	const d = await fixtureReading( browser, c2Draft, { hover: true, triggers: true } );
	const l = await fixtureReading( browser, c2Draft, { hover: true, triggers: true } );
	assert.deepEqual( judgeC2( l, d, { page: 't', width: 1000 } ).filter( ( r ) => 'fail' === r.status ), [] );
} );

test( 'readPage is exported for the CLI', () => {
	assert.equal( typeof readPage, 'function' );
} );
