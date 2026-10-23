// Walker W9 and effect layers (GAP-CHECKLIST.md section 29): the hover pass read only each pair's own element, so a nav
// bar's items, their underline and a button's draft effects (a sheen band appended on pointer enter, a ripple circle on
// press) were never measured; the 2026-10 header CTA has both in the draft and neither live. lib/parts.mjs reads every
// interactive part inside a pair under a real pointer and pairs the parts by name, in headless Chromium.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { readParts, compareParts } from '../../parity/lib/parts.mjs';
import { compareState } from '../../parity/lib/compare-state.mjs';

const { chromium } = await import( 'playwright' );
const RESOLVE = resolveFinder.toString();
const TOL = { px: 0.5, box: 2 };
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const BASE = `<style>body{margin:0;font:16px/20px sans-serif}nav{display:flex;gap:20px;padding:20px}
	nav a{position:relative;display:inline-block;padding:10px;color:#123;text-decoration:none;transition:color .1s}nav a:hover{color:rgb(200,0,0)}
	#cta{position:relative;overflow:hidden;display:inline-block;margin:20px;padding:12px 22px;background:#0a7ea8;color:#fff}
	@keyframes sweep{from{transform:translateX(-120%)}to{transform:translateX(260%)}}@keyframes grow{from{transform:scale(0)}to{transform:scale(1)}}</style>`;
// The draft's underline is an empty positioned span; its effects are spans its script appends.
const DRAFT = `${ BASE }<nav id="nav"><a href="#a">Home<span style="position:absolute;left:10px;right:10px;bottom:3px;height:2px;background:rgb(216,202,80)"></span></a><a href="#b">About</a></nav>
	<a id="cta" href="#c">Register</a>
	<script>const c = document.getElementById( 'cta' );
	c.addEventListener( 'pointerenter', () => { const s = document.createElement( 'span' ); s.style.cssText = 'position:absolute;top:0;bottom:0;left:0;width:60%;background:linear-gradient(100deg,transparent,#fff,transparent);animation:sweep .75s'; c.appendChild( s ); } );
	c.addEventListener( 'pointerdown', () => { const s = document.createElement( 'span' ); s.style.cssText = 'position:absolute;left:10px;top:0;width:40px;height:40px;border-radius:50%;background:#fff;animation:grow .5s'; c.appendChild( s ); } );</script>`;
// A faithful clone: the underline is the link's ::after, the sheen a layer's animated ::before, the ripple the ::after.
const FAITHFUL = `${ BASE }<style>#nav a.cur::after{content:"";position:absolute;left:10px;bottom:3px;width:calc(100% - 20px);height:2px;background:rgb(216,202,80)}
	.layer{position:absolute;inset:0;overflow:hidden;pointer-events:none}.layer::before{content:"";position:absolute;top:0;bottom:0;left:0;width:60%;background:linear-gradient(100deg,transparent,#fff,transparent);transform:translateX(-120%)}
	#cta:hover .layer::before{animation:sweep .75s}#cta::after{content:"";position:absolute;left:10px;top:0;width:40px;height:40px;border-radius:50%;background:#fff;opacity:0}
	#cta:active::after{animation:grow .5s}</style>
	<nav id="nav"><a class="cur" href="#a">Home</a><a href="#b">About</a></nav><a id="cta" href="#c">Register<span class="layer" aria-hidden="true"></span></a>`;
const read = async ( html, finder ) => {
	const page = await browser.newPage( { viewport: { width: 1000, height: 600 } } );
	await page.setContent( `<!doctype html><html><body>${ html }</body></html>` );
	const parts = await readParts( page, finder, [], RESOLVE, 300 );
	await page.close();
	return parts;
};
const rows = async ( live, finder = '#nav' ) => compareParts( await read( DRAFT, finder ), await read( live, finder ), TOL );

test( 'MUST FAIL (header walk 2026-10: nav items never hovered): a nav item whose hover colour differs inside a pair is a part row', async () => {
	const r = await rows( FAITHFUL.replace( '<nav id="nav">', '<style>#nav a:hover{color:rgb(0,0,200)}</style><nav id="nav">' ) );
	assert.deepEqual( r.map( ( x ) => x.key ), [ 'home hover:color', 'about hover:color' ] );
	assert.equal( r[ 0 ].draft, 'rgb(200, 0, 0)' );
	assert.equal( r[ 0 ].live, 'rgb(0, 0, 200)' );
} );

test( 'MUST FAIL (header CTA: sheen and ripple in the draft, none live): an element with no effect layers is an effect row per state', async () => {
	const r = await rows( FAITHFUL.replace( /<span class="layer"[^>]*><\/span>/, '' ).replace( '#cta:active::after{animation:grow .5s}', '' ), '#cta' );
	assert.deepEqual( r.map( ( x ) => `${ x.kind } ${ x.key } ${ x.live }` ), [ 'effect register hover none', 'effect register press none' ] );
	assert.match( r[ 0 ].draft, /added band/ );
	assert.match( r[ 1 ].draft, /added circle/ );
} );

test( 'positive control: a faithful clone (underline as ::after, sheen and ripple as layers) makes no row', async () => {
	assert.deepEqual( await rows( FAITHFUL ), [] );
	assert.deepEqual( await rows( FAITHFUL, '#cta' ), [] );
} );

test( 'negative control: a missing underline on the current item is a rest:layers row', async () => {
	const r = await rows( FAITHFUL.replace( 'class="cur" ', '' ) );
	assert.deepEqual( r.map( ( x ) => x.key ), [ 'home rest:layers' ] );
	assert.equal( r[ 0 ].live, 'none' );
} );

test( 'negative control: a nav item with no hover colour on one side is a part row (only the draft moves)', async () => {
	const r = await rows( FAITHFUL.replace( '<nav id="nav">', '<style>#nav a:hover{color:#123}</style><nav id="nav">' ) );
	assert.deepEqual( r.map( ( x ) => `${ x.key } ${ x.live }` ), [ 'home hover:color rgb(17, 34, 51)', 'about hover:color rgb(17, 34, 51)' ] );
} );

test( 'a part inside an element another pair measures is that pair\'s, never this one\'s', async () => {
	const page = await browser.newPage( { viewport: { width: 1000, height: 600 } } );
	await page.setContent( `<!doctype html><html><body><div id="outer">${ DRAFT }</div></body></html>` );
	const names = ( await readParts( page, '#outer', [ '#nav' ], RESOLVE, 50 ) ).map( ( x ) => x.name );
	await page.close();
	assert.deepEqual( names, [ 'register' ] );
} );

test( 'negative control: a sheen still sweeping when the press starts is the hover effect, not a press effect (no ripple live is a press row)', async () => {
	const r = await rows( FAITHFUL.replace( '#cta:active::after{animation:grow .5s}', '' ), '#cta' );
	assert.deepEqual( r.map( ( x ) => `${ x.kind } ${ x.key } ${ x.live }` ), [ 'effect register press none' ] );
} );

test( 'the marks a pointer script leaves (an inline transition, an appended span) are put back once the parts are read', async () => {
	const page = await browser.newPage( { viewport: { width: 1000, height: 600 } } );
	await page.setContent( `<!doctype html><html><body>${ DRAFT }<script>document.getElementById( 'cta' ).addEventListener( 'pointerenter', ( e ) => ( e.target.style.transition = 'transform .25s' ) );</script></body></html>` );
	const before = await page.evaluate( () => document.getElementById( 'cta' ).outerHTML );
	await readParts( page, '#cta', [], RESOLVE, 50 );
	assert.equal( await page.evaluate( () => document.getElementById( 'cta' ).outerHTML ), before );
	await page.close();
} );

// Phase 0 review (rater 1, finding 7): parts pair by name and then by where they sit in the pair, a part on one side
// only is a row, the pose properties compare as one composed pose, a part's resting look is compared and a filter on
// hover is read. Effect layers: every part's layers on hover and press, matched or not, are on the report's pair.
const LOOK = { color: 'rgb(0, 0, 0)', 'background-color': 'rgba(0, 0, 0, 0)', 'border-top-width': '0px', transform: 'none', scale: 'none', translate: 'none', rotate: 'none', 'transform-origin': '20px 10px', opacity: '1', filter: 'none' };
const part = ( name, x, hover = {}, rest = {}, extra = {} ) => ( { name, root: false, pos: { x, y: 0.5 }, box: { w: 40, h: 20 }, rest: { ...LOOK, ...rest }, hover: { ...LOOK, ...rest, ...hover }, layers: { rest: [], hover: [] }, effects: { hover: [], press: [] }, ...extra } );

test( 'MUST FAIL (review 7): two parts of one name listed in another order pair by where they sit', () => {
	const d = [ part( 'home', 0.1, { color: 'rgb(200, 0, 0)' } ), part( 'home#1', 0.9, { color: 'rgb(0, 0, 200)' } ) ];
	const l = [ part( 'home', 0.9, { color: 'rgb(0, 0, 200)' } ), part( 'home#1', 0.1, { color: 'rgb(200, 0, 0)' } ) ];
	assert.deepEqual( compareParts( d, l, TOL ), [] );
} );

test( 'MUST FAIL (review 7): a part on one side only is a presence row', () => {
	const r = compareParts( [ part( 'home', 0.1 ), part( 'home#1', 0.9 ) ], [ part( 'home', 0.1 ) ], TOL );
	assert.deepEqual( r.map( ( x ) => `${ x.key } ${ x.draft } ${ x.live }` ), [ 'home#1 presence present missing' ] );
	assert.deepEqual( compareParts( [ part( 'home', 0.1 ) ], [ part( 'home', 0.1 ), part( 'shop', 0.5 ) ], TOL ).map( ( x ) => `${ x.key } ${ x.draft } ${ x.live }` ), [ 'shop presence missing present' ] );
} );

test( 'MUST FAIL (review 7): an equal lift written as scale and as a matrix is no part row; a different one is one hover:transform row', () => {
	assert.deepEqual( compareParts( [ part( 'go', 0.5, { scale: '1.1' } ) ], [ part( 'go', 0.5, { transform: 'matrix(1.1, 0, 0, 1.1, 0, 0)' } ) ], TOL ), [] );
	const r = compareParts( [ part( 'go', 0.5, { scale: '1.1' } ) ], [ part( 'go', 0.5, { scale: '1.2' } ) ], TOL );
	assert.deepEqual( r.map( ( x ) => x.key ), [ 'go hover:transform' ] );
} );

test( 'MUST FAIL (review 7): a part whose resting colour differs is a rest row', () => {
	const r = compareParts( [ part( 'go', 0.5, {}, { color: 'rgb(200, 0, 0)' } ) ], [ part( 'go', 0.5 ) ], TOL );
	assert.deepEqual( r.map( ( x ) => `${ x.key } ${ x.draft }` ), [ 'go rest:color rgb(200, 0, 0)' ] );
} );

test( 'MUST FAIL (review 7): a part that brightens on hover with a filter is read and is a hover:filter row against one that does not', async () => {
	const css = '<style>#nav a:hover{filter:brightness(1.2)}</style>';
	const r = await rows( FAITHFUL.replace( '<nav id="nav">', `${ css }<nav id="nav">` ) );
	const d = await read( DRAFT.replace( '<nav id="nav">', `${ css }<nav id="nav">` ), '#nav' );
	assert.equal( d[ 0 ].hover.filter, 'brightness(1.2)' );
	assert.deepEqual( compareParts( d, await read( FAITHFUL, '#nav' ), TOL ).map( ( x ) => x.key ), [ 'home hover:filter', 'about hover:filter' ] );
	assert.deepEqual( r.filter( ( x ) => /filter/.test( x.key ) ).map( ( x ) => x.key ), [ 'home hover:filter', 'about hover:filter' ] );
} );

test( 'MUST FAIL (effect layers on the report): each side\'s effect layers on hover and press are on the pair, matched or not', () => {
	const fx = ( hover, press ) => ( { effects: { hover, press } } );
	const d = { snap: { cta: { box: { w: 100, h: 40 }, styles: {}, motion: {}, parts: [ part( 'register', 0.5, {}, {}, fx( [ 'added band' ], [ 'added circle' ] ) ), part( 'about', 0.2 ) ] } }, log: [] };
	const l = { snap: { cta: { box: { w: 100, h: 40 }, styles: {}, motion: {}, parts: [ part( 'register', 0.5, {}, {}, fx( [ 'animated band' ], [] ) ), part( 'about', 0.2 ) ] } }, log: [] };
	const run = { pairs: {} };
	compareState( run, d, l, { state: { name: 'rest' }, width: 1440, cfg: {}, accept: [], tol: TOL, header: false, autoOn: false, pairsFor: () => [ { name: 'cta', draft: '#cta', live: '#cta' } ], origins: {}, linksSeen: new Set(), allLiveLinks: [] } );
	assert.deepEqual( run.pairs.cta.effects, { draft: { register: { hover: [ 'added band' ], press: [ 'added circle' ] } }, live: { register: { hover: [ 'animated band' ], press: [] } } } );
	assert.deepEqual( run.pairs.cta.diffs.filter( ( x ) => 'effect' === x.kind ).map( ( x ) => x.key ), [ 'register press' ], 'the difference rows stay' );
} );
