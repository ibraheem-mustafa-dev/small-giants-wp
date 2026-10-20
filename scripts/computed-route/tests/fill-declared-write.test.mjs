// Spec 48 FR-48-36 "What is written": a confirmed row (declared and rendered agree within tolerance) writes the value the
// draft's code declares, in the form the setting holds; a value the browser computes at run time, a disagreement, and a
// declared form the setting cannot hold keep the rendered value (FR-48-8 plan step 3(a)).
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fillSurface } from '../fill.mjs';
import { splitCalibration, writeSlotMap, writePaint } from '../lib/cache.mjs';

// sgs/heading and sgs/text pair each typography setting with a unit setting (font size px, letter spacing and line height
// em). h1: a rem font size, an em letter spacing and a unitless line height; p.plain: an em letter spacing; p.runtime: a
// var() letter spacing; p.px: a px letter spacing; p.render: a declared colour a held animation overrides.
const DRAFT = `<!doctype html><html><head><meta charset="utf-8"><style>
:root { --ls: 2px }
body { margin: 0 }
@keyframes paint { to { color: rgb(0, 0, 255) } }
h1 { margin: 0; font-size: 2rem; letter-spacing: 0.05em; line-height: 1.25 }
p { margin: 0 }
p.plain { letter-spacing: 0.1em }
p.runtime { letter-spacing: var(--ls) }
p.px { letter-spacing: 3px }
p.render { color: rgb(255, 0, 0); animation: paint 1ms linear forwards }
</style></head><body><main><h1>Hello</h1><p class="plain">Plain</p><p class="runtime">Runtime</p><p class="px">Px</p><p class="render">Render</p></main></body></html>`;
const DEFAULT = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'margin-top': '0px', 'margin-right': '0px', 'margin-bottom': '0px', 'margin-left': '0px' };
const tiers = ( paint ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { ...paint } ] ) );
const setting = ( property, forms = [] ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms, transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ] } );
const STRING = [ 'clamp', 'vw' ];
const CAL = {
	heading: { block: 'sgs/heading', elements: { '': tiers( DEFAULT ) }, settings: { fontSize: setting( 'font-size', STRING ), letterSpacing: setting( 'letter-spacing', STRING ), lineHeight: setting( 'line-height', STRING ), margin: setting( 'margin' ) }, discovered: {}, text: { content: { path: '', reachedAt: [ 375, 768, 1440 ] } } },
	text: { block: 'sgs/text', elements: { '': tiers( DEFAULT ) }, settings: { textColour: setting( 'color', [ 'hex', 'slug' ] ), letterSpacing: setting( 'letter-spacing' ), margin: setting( 'margin' ) }, discovered: {}, text: { text: { path: '', reachedAt: [ 375, 768, 1440 ] } } },
	container: { block: 'sgs/container', elements: { '': tiers( DEFAULT ) }, settings: { margin: setting( 'margin' ) }, discovered: {} },
};
const p = ( cls ) => ( { name: 'sgs/text', draftRef: `p.${ cls }`, attributes: {} } );
const SKELETON = [ { name: 'sgs/container', draftRef: 'main', attributes: { tagName: 'main' }, innerBlocks: [ { name: 'sgs/heading', draftRef: 'h1', attributes: { level: 'h1' } }, p( 'plain' ), p( 'runtime' ), p( 'px' ), p( 'render' ) ] } ];

let result;
before( async () => {
	const work = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-declared-write-' ) );
	const repo = path.join( work, 'repo' );
	const build = path.join( repo, 'sites', 'acme', 'build' );
	fs.mkdirSync( path.join( build, 'qa' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { home: { site: 'acme-test', tree: 'home.tree.json', states: { opening: null } } } ) );
	fs.writeFileSync( path.join( build, 'home.tree.json' ), '[]\n' );
	fs.writeFileSync( path.join( build, 'qa', 'divergences.json' ), '[]\n' );
	fs.writeFileSync( path.join( repo, 'sites', 'acme', 'theme-snapshot.json' ), JSON.stringify( { settings: { color: { palette: [ { slug: 'ink', color: '#141414' } ] } } } ) );
	const cache = path.join( work, 'cache' );
	fs.mkdirSync( cache );
	for ( const cal of Object.values( CAL ) ) {
		const { slotMap, paint } = splitCalibration( { ...cal, site: 'acme-test' } );
		writeSlotMap( cache, cal.block, slotMap );
		writePaint( cache, 'acme-test', cal.block, paint );
	}
	const draft = path.join( work, 'draft' );
	fs.mkdirSync( draft );
	fs.writeFileSync( path.join( draft, 'Home.dc.html' ), DRAFT );
	fs.writeFileSync( path.join( work, 'skeleton.json' ), JSON.stringify( SKELETON ) );
	result = await fillSurface( { repo, client: 'acme', surface: 'home', skeleton: path.join( work, 'skeleton.json' ), draftDir: draft, draftIndex: 'Home.dc.html', liveUrl: 'http://127.0.0.1:9/home/', out: path.join( work, 'out' ), cache, sweep: false } );
} );

const textOf = ( v ) => JSON.stringify( v );
const writesOf = ( block, index ) => Object.fromEntries( result.writes.filter( ( w ) => w.block === block && ( undefined === index || w.index === index ) ).map( ( w ) => [ w.attr, w.after ] ) );
// The text nodes in skeleton order: plain, runtime, px, render (index 0 is the container, 1 the heading).
const TEXT = { plain: 2, runtime: 3, px: 4, render: 5 };

test( 'MUST FAIL: a confirmed length is written as the code declares it, the unit setting switched to the declared unit', () => {
	const h = writesOf( 'sgs/heading', 1 );
	assert.deepEqual( [ h.fontSize, h.fontSizeUnit ], [ { desktop: 2 }, 'rem' ], `2rem, not the rendered 32px: ${ textOf( h ) }` );
	assert.deepEqual( [ h.lineHeight, h.lineHeightUnit ], [ { desktop: 1.25 }, '' ], `a unitless 1.25, not 1.25em: ${ textOf( h ) }` );
	assert.deepEqual( [ h.letterSpacing, 'letterSpacingUnit' in h ], [ { desktop: 0.05 }, false ], 'a declared em already held in em: no unit write' );
	const px = writesOf( 'sgs/text', TEXT.px );
	assert.deepEqual( [ px.letterSpacing, px.letterSpacingUnit ], [ { desktop: 3 }, 'px' ], `3px, not 0.188em: ${ textOf( px ) }` );
} );

test( 'MUST FAIL: the confirm record states the declared value and the written one', () => {
	const recs = result.confirm.filter( ( c ) => 'sgs/heading' === c.block && 'fontSize' === c.attribute );
	assert.ok( recs.length && recs.every( ( c ) => 'confirmed' === c.verdict && '2rem' === c.declared ), textOf( recs ) );
	assert.deepEqual( recs[ 0 ].emitted, { desktop: 2 } );
} );

test( 'MUST FAIL: a run-time value and a disagreement keep the rendered value and the setting\'s unit', () => {
	const plain = writesOf( 'sgs/text', TEXT.plain );
	assert.deepEqual( [ plain.letterSpacing, 'letterSpacingUnit' in plain ], [ { desktop: 0.1 }, false ] );
	const runtime = writesOf( 'sgs/text', TEXT.runtime );
	assert.deepEqual( [ runtime.letterSpacing, 'letterSpacingUnit' in runtime ], [ { desktop: 0.125 }, false ], `var() is computed at run time: the rendered 2px in the setting's em (${ textOf( runtime ) })` );
	assert.match( textOf( writesOf( 'sgs/text', TEXT.render ).textColour ), /0000ff/i, 'render-wins keeps the rendered blue' );
} );

test( 'MUST FAIL: a setting with no unit partner holds a relative length only where calibration proved a string form', async () => {
	const { declaredLength, declaredUnit } = await import( '../lib/resolve-declared.mjs' );
	const def = { type: 'string' };
	assert.deepEqual( declaredLength( { prop: 'letter-spacing', declared: '.05em', def, forms: [ 'clamp', 'vw' ] } ), { value: '0.05em' }, 'written as <digits><unit>, which a font-size tier needs' );
	assert.equal( declaredLength( { prop: 'letter-spacing', declared: '0.05em', def, forms: [] } ), null, 'no proven string form: the rendered value' );
	assert.equal( declaredLength( { prop: 'padding-top', declared: '1.5rem', def, forms: [ 'clamp' ], box: true } ), null, 'a box setting' );
	assert.equal( declaredLength( { prop: 'letter-spacing', declared: '3px', def, forms: [ 'clamp' ] } ), null, 'a px length is formatted as before' );
	assert.deepEqual( declaredLength( { prop: 'line-height', declared: '1.5 !important', def, forms: [ 'vw' ] } ), { value: '1.5' } );
	assert.equal( declaredLength( { prop: 'font-size', declared: '2rem', def: { type: 'number' }, unit: 'px' } ), null, 'a unit setting in another unit, not switched' );
	const tiers = { desktop: '32px', mobile: '24px' };
	assert.equal( declaredUnit( { prop: 'font-size', decl: { desktop: '2rem', mobile: '1.5rem' }, tiers, unit: 'px', attr: 'fontSize' } ), 'rem' );
	assert.equal( declaredUnit( { prop: 'font-size', decl: { desktop: '2rem', mobile: '24px' }, tiers, unit: 'px', attr: 'fontSize' } ), null, 'tiers declaring two units keep the setting\'s unit' );
	assert.equal( declaredUnit( { prop: 'font-size', decl: { desktop: '2rem' }, tiers, unit: 'px', attr: 'fontSize' } ), null, 'a tier with no agreeing declared value keeps the unit' );
	assert.equal( declaredUnit( { prop: 'font-size', decl: { desktop: '2rem', mobile: '1.5rem' }, tiers, unit: 'px', attr: 'fontSize', current: { fontSize: { tablet: 20 } } } ), null, 'a tier the write leaves alone would be reinterpreted' );
	assert.equal( declaredUnit( { prop: 'letter-spacing', decl: { desktop: '0', mobile: '0' }, tiers, unit: 'em', attr: 'letterSpacing' } ), null, 'a bare 0 states no unit' );
	assert.equal( declaredUnit( { prop: 'font-size', decl: { desktop: '2rem', mobile: '1.5rem' }, tiers, unit: 'px', attr: 'fontSize', flat: true } ), null, 'flat Tablet/Mobile siblings never switch' );
} );
