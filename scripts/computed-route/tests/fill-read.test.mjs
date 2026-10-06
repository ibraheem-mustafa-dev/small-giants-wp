// L9.2 step 1 and L9.7 reading (lib/fill-read.mjs, lib/draft.mjs): a local draft folder rendered in headless Chromium,
// every target read at the walker's widths through the walker's own collectors, the fluid samples and the 16px sweep.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft, requestAllowed, jobsFor, PROPS, READ_WIDTHS, PRESENT } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';
import { fitFluid, breakpointSteps, FLUID_WIDTHS } from '../lib/fill-values.mjs';

const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0; font-family: sans-serif }
main { display: flex; flex-direction: column; gap: 16px; padding: 24px; color: rgb(16, 32, 48); font-size: 16px }
h1 { color: rgb(200, 0, 0); font-size: calc(10px + 1vw); margin: 0 }
nav a { color: blue }
p.lead { margin: 10.4px 0 0 }
.card { padding: 10px }
.card .t { display: block }
.label { width: 50%; height: 20px }
@media (min-width: 768px) { .card { padding: 30px } }
@media (min-width: 800px) and (max-width: 1000px) { .label { display: none } }
</style></head><body>
<nav><a class="more" href="/nav-link/">Nav</a></nav>
<img alt="" src="https://example.invalid/never-loaded.png">
<main>
<h1>Hello there</h1>
<p class="lead">Lead words <a class="more" href="/shop/">Shop now</a></p>
<div class="card"><span class="t">Card title</span></div>
<div class="label">Label</div>
</main></body></html>`;

const TREE = [
	{ name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [
		{ name: 'sgs/heading', draftRef: { text: '^Hello there$', tag: 'h1', within: 'main' }, attributes: {} },
		{ name: 'sgs/text', draftRef: 'p.lead', draftSlots: { '.sgs-text__link': 'a.more', '.sgs-text__none': '.does-not-exist' }, attributes: {} },
		{ name: 'sgs/container', draftRef: '.card', draftSlots: { '.sgs-container__t': '.t' }, attributes: {}, innerBlocks: [] },
		{ name: 'sgs/container', draftRef: '.label', attributes: {} },
	] },
];

let served;
let read;
const nodes = skeletonNodes( TREE );
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes, headless: true } );
} );
after( () => served?.close() );

const snap = ( w, id ) => read.widths[ w ][ id ];

test( 'MUST FAIL: every target is read at 375, 768 and 1440 with every property, and 1024 and 1920 carry the lengths for the fluid fit', () => {
	assert.deepEqual( Object.keys( read.widths ).map( Number ).sort( ( a, b ) => a - b ), FLUID_WIDTHS );
	for ( const w of READ_WIDTHS ) {
		const s = snap( w, '1:' );
		assert.ok( ! s.missing );
		assert.ok( PROPS.every( ( p ) => undefined !== s.styles[ p ] || /^icon-|^animation-/.test( p ) ), `every property read at ${ w }` );
	}
	assert.ok( undefined !== snap( 1024, '1:' ).styles[ 'font-size' ] );
	assert.equal( undefined, snap( 1024, '1:' ).styles[ 'color' ], 'a fluid width reads lengths only' );
	assert.equal( snap( 375, '1:' ).styles[ 'font-size' ], '13.75px' );
	assert.equal( snap( 1440, '1:' ).styles[ 'font-size' ], '24.4px' );
} );

test( 'every side\'s border style is read, not only the top\'s: a border width written without its style would paint nothing', () => {
	for ( const p of [ 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style' ] ) {
		assert.ok( PROPS.includes( p ), p );
		assert.ok( undefined !== snap( 1440, '1:' ).styles[ p ], `${ p } is in the read` );
	}
	assert.ok( ! PROPS.some( ( p ) => /^(animation-|icon-)/.test( p ) || 'gap' === p ), 'entrance timings, icons and the gap shorthand are not generic properties' );
} );

test( 'the walker\'s rule: a text carrier gives a leaf its colour, and a block holding other blocks reads its own element', () => {
	assert.equal( snap( 1440, '1:' ).styles.color, 'rgb(200, 0, 0)', 'the heading\'s own colour' );
	assert.equal( snap( 1440, '0:' ).styles.color, 'rgb(16, 32, 48)', 'the container\'s own colour, not its first text descendant\'s red' );
	assert.equal( snap( 1440, '0:' ).styles[ 'font-size' ], '16px' );
} );

test( 'a slot finder resolves inside its node\'s element only, and one that finds nothing is { missing: true }', () => {
	assert.equal( snap( 1440, '2:.sgs-text__link' ).href, '/shop/', 'the link inside the paragraph, not the nav link that comes first in the page' );
	assert.equal( snap( 1440, '2:.sgs-text__link' ).words, 'Shop now' );
	assert.deepEqual( snap( 1440, '2:.sgs-text__none' ), { missing: true } );
	assert.equal( snap( 1440, '3:.sgs-container__t' ).words, 'Card title' );
} );

test( 'boxes are exact, not rounded, and the words and link are the element\'s own', () => {
	assert.equal( snap( 1440, '2:' ).rect.y % 1 !== 0 || snap( 1440, '2:' ).rect.h % 1 !== 0, true, 'a fractional margin leaves a fractional position' );
	assert.equal( snap( 1440, '2:' ).words, 'Lead words Shop now' );
	assert.equal( snap( 1440, '2:' ).href, null, 'a paragraph holding a link among other words is not itself a link' );
	assert.equal( snap( 1440, '2:' ).inFlow, true );
} );

test( 'the declared width is read from the matched rules where computed style gives only the used size', () => {
	assert.equal( read.declared[ 1440 ][ '4:' ].width, '50%' );
	assert.match( snap( 1440, '4:' ).styles.width, /px$/ );
} );

test( 'the fluid samples fit a straight line for the heading and not for the stepped card padding', () => {
	const sampled = ( id, prop ) => Object.fromEntries( FLUID_WIDTHS.map( ( w ) => [ w, snap( w, id ).styles[ prop ] ] ) );
	const fit = fitFluid( sampled( '1:', 'font-size' ) );
	assert.ok( fit, 'calc(10px + 1vw) is linear' );
	assert.equal( fitFluid( sampled( '3:', 'padding-top' ) ), null );
} );

test( 'the 16px sweep covers 320 to 1920 and logs the card\'s padding step at the SGS boundary', () => {
	const series = read.sweep[ '3:' ][ 'padding-top' ];
	assert.equal( series.length, 101 );
	assert.deepEqual( breakpointSteps( 'padding-top', series ).map( ( s ) => [ s.from, s.to, s.at, s.boundary, s.onBoundary ] ), [ [ '10px', '30px', 768, 768, true ] ] );
} );

test( 'the sweep sees an element disappear and reappear, at the widths between its samples', () => {
	const steps = breakpointSteps( PRESENT, read.sweep[ '4:' ][ PRESENT ] );
	assert.deepEqual( steps.map( ( s ) => [ s.from, s.to, s.at ] ), [ [ 'present', 'absent', 800 ], [ 'absent', 'present', 1008 ] ] );
	assert.equal( steps[ 0 ].boundary, 768 );
	assert.equal( steps[ 0 ].onBoundary, false, '800 is 32px past the boundary' );
} );

test( 'MUST FAIL: nothing beyond the draft\'s own origin is loaded unless asked', () => {
	const origin = 'http://127.0.0.1:5000';
	assert.equal( requestAllowed( 'https://fonts.googleapis.com/css2', origin, false ), false );
	assert.equal( requestAllowed( 'https://example.invalid/x.png', origin, false ), false );
	assert.equal( requestAllowed( 'http://127.0.0.1:5000/app.js', origin, false ), true );
	assert.equal( requestAllowed( 'http://127.0.0.1:50001/app.js', origin, false ), false, 'a different port is a different origin' );
	assert.equal( requestAllowed( 'data:image/png;base64,AA', origin, false ), true );
	assert.equal( requestAllowed( 'https://fonts.googleapis.com/css2', origin, true ), true );
} );

test( 'jobsFor lists roots before their slots, marks only roots, scopes only slots', () => {
	const jobs = jobsFor( nodes );
	assert.deepEqual( jobs.map( ( j ) => j.id ), [ '0:', '1:', '2:', '2:.sgs-text__link', '2:.sgs-text__none', '3:', '3:.sgs-container__t', '4:' ] );
	assert.equal( jobs.find( ( j ) => '2:' === j.id ).mark, 2 );
	assert.equal( jobs.find( ( j ) => '2:.sgs-text__link' === j.id ).mark, null );
	assert.match( jobs.find( ( j ) => '2:.sgs-text__link' === j.id ).finder, /^\[data-fill-scope="2"\] :is\(a\.more\)$/ );
	assert.equal( jobs.find( ( j ) => '0:' === j.id ).own, true, 'a block with children reads its own text styles' );
	assert.equal( jobs.find( ( j ) => '1:' === j.id ).own, false );
} );
