// Walker W9 and effect layers (GAP-CHECKLIST.md section 29): the hover pass read only each pair's own element, so a nav
// bar's items, their underline and a button's draft effects (a sheen band appended on pointer enter, a ripple circle on
// press) were never measured; the 2026-10 header CTA has both in the draft and neither live. lib/parts.mjs reads every
// interactive part inside a pair under a real pointer and pairs the parts by name, in headless Chromium.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { readParts, compareParts } from '../../parity/lib/parts.mjs';

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
