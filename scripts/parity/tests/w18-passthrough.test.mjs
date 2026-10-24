// Walker Track W W18, in headless Chromium on local HTML. A draft box that paints nothing, on the cross axis of a
// single-line flex container (the Indus draft's `height: 100%` nav, 84px in an 84px row), against a live box of another
// size there (an auto-height 42px nav) is compared through its items: no `h` row while every item keeps its extent on
// that axis, the container keeps its own, and neither side paints the box (compare.mjs::passThroughHeld over
// collect.mjs::collectPair `passThrough`).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFinder, collectPair } from '../lib/collect.mjs';
import { PAINT_SRC } from '../lib/paint.mjs';
import { comparePair } from '../lib/compare.mjs';

const { chromium } = await import( new URL( '../../computed-route/node_modules/playwright/index.mjs', import.meta.url ).href );
const RESOLVE = resolveFinder.toString();
const TOL = { px: 0.5, box: 2 };
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const read = async ( html, finder = '#n' ) => {
	const page = await browser.newPage( { viewport: { width: 1000, height: 600 } } );
	await page.setContent( `<!doctype html><html><body style="margin:0">${ html }</body></html>` );
	const snap = await page.evaluate( collectPair, [ finder, [ 'display' ], RESOLVE, null, null, null, PAINT_SRC, null, { others: [], textOthers: [], paintPart: true } ] );
	await page.close();
	return snap;
};
const boxRows = ( d, l ) => comparePair( { text: false }, d, l, TOL ).filter( ( r ) => 'box' === r.kind ).map( ( r ) => [ r.key, r.draft, r.live ] );

const LINK = 'display:block;height:42px';
// The draft: the nav fills the 84px row (height: 100%) and centres its 42px links; About carries its caret (90px).
const DRAFT = ( nav = '', extra = '', row = 'display:flex;align-items:center;height:84px;padding:0 60px' ) => `<div id="row" style="${ row }">
	<a href="/" style="${ LINK };width:200px">Logo</a>
	<nav id="n" style="height:100%;display:flex;align-items:center;width:300px;${ nav }"><a href="/" style="${ LINK };width:73px">Home</a><a href="/about" style="${ LINK };width:90px">About</a>${ extra }</nav>
</div>`;
// The live clone: an auto-height nav inside a wrapper the row centres; About and its submenu toggle are two items.
const LIVE = ( nav = '', link = LINK, wrap = 'display:flex' ) => `<div id="row" style="display:flex;align-items:center;height:84px;padding:0 60px">
	<a href="/" style="${ LINK };width:200px">Logo</a>
	<div style="${ wrap }"><nav id="n" style="display:flex;align-items:center;width:300px;${ nav }"><a href="/" style="${ link };width:73px">Home</a><a href="/about" style="${ link };width:58px">About</a><button style="${ link };width:32px;border:0;padding:0;background:none">v</button></nav></div>
</div>`;

test( 'MUST FAIL: a draft height:100% nav that paints nothing, its links in the same boxes as the live auto-height nav\'s, is no h row', async () => {
	const d = await read( DRAFT() );
	const l = await read( LIVE() );
	assert.equal( d.box.h, 84 );
	assert.equal( l.box.h, 42 );
	assert.deepEqual( boxRows( d, l ), [] );
} );

test( 'control: the items move (live links 30px tall), so the nav\'s height is still a row', async () => {
	const d = await read( DRAFT() );
	const l = await read( LIVE( '', 'display:block;height:30px' ) );
	assert.deepEqual( boxRows( d, l ), [ [ 'h', 84, 30 ] ] );
} );

test( 'control: the live row places the nav at its top, so the links sit 21px higher and the height is a row', async () => {
	const d = await read( DRAFT() );
	const l = await read( LIVE().replace( 'align-items:center;height:84px', 'align-items:flex-start;height:84px' ) );
	assert.deepEqual( boxRows( d, l ), [ [ 'h', 84, 42 ] ] );
} );

test( 'control: draft padding that moves the links keeps the row', async () => {
	const d = await read( DRAFT( 'padding-top:20px;box-sizing:border-box' ) );
	const l = await read( LIVE() );
	assert.deepEqual( boxRows( d, l ), [ [ 'h', 84, 42 ] ] );
} );

test( 'control: a draft nav that paints anything (ground, image, border, shadow, outline, filter, clip, layer) keeps the row', async () => {
	const paints = [ 'background-color:#eee', 'background-image:linear-gradient(red,blue)', 'border-bottom:1px solid red', 'border-left:2px solid red', 'box-shadow:0 1px 0 red', 'outline:1px solid red', 'filter:blur(1px)', 'overflow:hidden', 'overflow-y:auto' ];
	for ( const nav of paints ) {
		const d = await read( DRAFT( nav ) );
		const l = await read( LIVE() );
		assert.deepEqual( boxRows( d, l ).filter( ( r ) => 'h' === r[ 0 ] ), [ [ 'h', d.box.h, 42 ] ], nav );
	}
	const d = await read( `<style>#n::after{content:"";display:block;width:4px;height:4px}</style>${ DRAFT() }` );
	assert.deepEqual( boxRows( d, await read( LIVE() ) ).filter( ( r ) => 'h' === r[ 0 ] ), [ [ 'h', 84, 42 ] ], '::after layer' );
} );

test( 'control: an underline positioned at the draft nav\'s foot sits 21px lower than at the live nav\'s, so the row stays', async () => {
	const span = '<span style="position:absolute;left:0;bottom:0;width:20px;height:2px"></span>';
	const d = await read( DRAFT( 'position:relative', span ) );
	const l = await read( LIVE( 'position:relative' ).replace( '</nav>', `${ span }</nav>` ) );
	assert.deepEqual( boxRows( d, l ), [ [ 'h', 84, 42 ] ] );
} );

test( 'control: only the live side differs (the live nav or its wrapper paints, the live wrapper has a second child), so the row stays', async () => {
	const d = await read( DRAFT() );
	assert.deepEqual( boxRows( d, await read( LIVE( 'background:#eee' ) ) ), [ [ 'h', 84, 42 ] ], 'live nav ground' );
	assert.deepEqual( boxRows( d, await read( LIVE( '', LINK, 'display:flex;border-bottom:2px solid red' ) ) ), [ [ 'h', 84, 42 ], [ 'paint-h', 84, 44 ] ], 'live wrapper border' );
	const twin = LIVE( '', LINK, 'display:block' ).replace( '</nav></div>', '</nav><span>Tagline</span></div>' );
	assert.equal( ( await read( twin ) ).passThrough.line.h, null );
	assert.deepEqual( boxRows( d, await read( twin ) ), [ [ 'h', 84, 42 ] ], 'live wrapper holds a second child' );
} );

test( 'control: no single-line flex container on the cross axis (a block parent, a wrapping row, a column) keeps the row', async () => {
	const l = await read( LIVE() );
	for ( const row of [ 'display:block;height:84px;padding:0 60px', 'display:flex;flex-wrap:wrap;align-items:center;height:84px;padding:0 60px', 'display:flex;flex-direction:column;justify-content:center;height:84px;padding:0 60px' ] ) {
		const d = await read( DRAFT( '', '', row ) );
		assert.equal( d.passThrough.line.h, null, row );
		assert.deepEqual( boxRows( d, l ).filter( ( r ) => 'h' === r[ 0 ] ), [ [ 'h', d.box.h, 42 ] ], row );
	}
} );

test( 'MUST FAIL: the same holds across the width of a column container (a width: 100% box whose items keep their place)', async () => {
	const col = ( w ) => `<div style="display:flex;flex-direction:column;align-items:flex-start;width:400px"><div id="n" style="${ w };display:flex"><a href="/" style="display:block;width:80px;height:20px">Home</a></div><p style="margin:0">Opening hours</p></div>`;
	const d = await read( col( 'width:100%' ) );
	const l = await read( col( '' ) );
	assert.deepEqual( [ d.box.w, l.box.w ], [ 400, 80 ] );
	assert.deepEqual( boxRows( d, l ), [] );
	// Control: the live item moves along that axis (centred), so the width is a row.
	const moved = await read( col( '' ).replace( 'align-items:flex-start', 'align-items:center' ) );
	assert.deepEqual( boxRows( d, moved ), [ [ 'w', 400, 80 ] ] );
} );

test( 'control: a box with no items, or a snapshot without the pass-through record, keeps the row', async () => {
	const empty = ( h ) => `<div style="display:flex;align-items:center;height:84px"><div id="n" style="${ h };width:50px"></div><a href="/" style="${ LINK }">x</a></div>`;
	assert.deepEqual( boxRows( await read( empty( 'height:100%' ) ), await read( empty( 'height:42px' ) ) ), [ [ 'h', 84, 42 ] ] );
	const d = await read( DRAFT() );
	const l = await read( LIVE() );
	delete d.passThrough;
	assert.deepEqual( boxRows( d, l ), [ [ 'h', 84, 42 ] ] );
} );

test( 'control: an item whose one edge moves (the far edge, then the near edge) keeps the row', async () => {
	const d = await read( DRAFT() );
	const far = LIVE( 'margin-top:21px', 'display:block;height:50px' ).replace( 'align-items:center;height:84px', 'align-items:flex-start;height:84px' );
	assert.deepEqual( boxRows( d, await read( far ) ), [ [ 'h', 84, 50 ] ], 'far edge' );
	const near = LIVE( 'margin-bottom:21px', 'display:block;height:50px' ).replace( 'align-items:center;height:84px', 'align-items:flex-end;height:84px' );
	assert.deepEqual( boxRows( d, await read( near ) ), [ [ 'h', 84, 50 ] ], 'near edge' );
} );

test( 'control: an item on one side only at another extent (a 20px toggle in the live nav, then in the draft nav) keeps the row', async () => {
	const toggle = '<button style="display:block;height:20px;width:20px;border:0;padding:0;background:none">v</button>';
	const d = await read( DRAFT() );
	assert.deepEqual( boxRows( d, await read( LIVE().replace( '</nav>', `${ toggle }</nav>` ).replace( 'width:58px', 'width:38px' ) ) ), [ [ 'h', 84, 42 ] ], 'live extra item' );
	const dx = await read( DRAFT( '', toggle ).replace( 'width:90px', 'width:70px' ) );
	assert.deepEqual( boxRows( dx, await read( LIVE() ) ), [ [ 'h', 84, 42 ] ], 'draft extra item' );
} );

test( 'control: a live wrapper holding text beside the nav, or painting a layer, is no pass-through wrapper', async () => {
	const d = await read( DRAFT() );
	const text = LIVE( '', LINK, 'display:block' ).replace( '</nav></div>', '</nav>Tagline</div>' );
	assert.equal( ( await read( text ) ).passThrough.line.h, null, 'text' );
	assert.deepEqual( boxRows( d, await read( text ) ), [ [ 'h', 84, 42 ] ], 'text' );
	const layer = `<style>.w::after{content:"";display:block;width:4px;height:4px}</style>${ LIVE( '', LINK, 'display:block" class="w' ) }`;
	assert.equal( ( await read( layer ) ).passThrough.line.h, null, 'layer' );
	assert.deepEqual( boxRows( d, await read( layer ) ), [ [ 'h', 84, 42 ] ], 'layer' );
} );

test( 'MUST FAIL: a box holding no links is compared through its in-flow children; a child that moves keeps the row', async () => {
	const box = ( h, kid = 'height:20px' ) => `<div style="display:flex;align-items:center;height:84px"><div style="width:80px;height:40px">Logo</div><div id="n" style="${ h };display:flex;align-items:center"><span style="display:block;width:60px;${ kid }">Open</span></div></div>`;
	const d = await read( box( 'height:100%' ) );
	assert.deepEqual( boxRows( d, await read( box( '' ) ) ), [] );
	assert.deepEqual( boxRows( d, await read( box( '', 'height:30px' ) ) ), [ [ 'h', 84, 30 ] ] );
} );

test( 'control: a live link inside a wrapper that keeps the draft link\'s box moves itself, so the row stays', async () => {
	const d = await read( DRAFT() );
	const l = await read( LIVE().replace( /<a href="\/about"[^>]*>About<\/a>/, '<span style="display:flex;align-items:center;height:42px;width:58px"><a href="/about" style="display:block;height:30px">About</a></span>' ) );
	assert.deepEqual( boxRows( d, l ), [ [ 'h', 84, 42 ] ] );
} );

test( 'control: the column container is wider on the live side, so the width row stays', async () => {
	const col = ( w, cw ) => `<div style="display:flex;flex-direction:column;align-items:flex-start;width:${ cw }px;height:60px"><div id="n" style="${ w };display:flex"><a href="/" style="display:block;width:80px;height:20px">Home</a></div><p style="margin:0">Opening hours</p></div>`;
	assert.deepEqual( boxRows( await read( col( 'width:100%', 400 ) ), await read( col( '', 500 ) ) ), [ [ 'w', 400, 80 ] ] );
} );

test( 'control: an item 4px shorter whose edges each move 2px (a 54px logo against a 50px one) keeps the row', async () => {
	const logo = ( h, a ) => `<div style="display:flex;align-items:center;height:72px"><div style="width:80px;height:40px">Menu</div><div id="n" style="${ h };display:flex;align-items:center"><a href="/" style="display:block;width:200px;height:${ a }px">Logo</a></div></div>`;
	assert.deepEqual( boxRows( await read( logo( 'height:54px', 54 ) ), await read( logo( '', 50 ) ) ), [ [ 'h', 54, 50 ] ] );
} );

test( 'MUST FAIL: the container sits lower on the live page (a sticky header at another scroll), so extents are read from its start', async () => {
	const d = await read( DRAFT() );
	const l = await read( `<div style="height:46px"></div>${ LIVE() }` );
	assert.equal( l.passThrough.line.h[ 0 ] - d.passThrough.line.h[ 0 ], 46 );
	assert.deepEqual( boxRows( d, l ), [] );
	// Control: the live container is taller, so its items sit lower in it.
	assert.deepEqual( boxRows( d, await read( LIVE().replace( 'height:84px', 'height:100px' ) ) ), [ [ 'h', 84, 42 ] ] );
} );

test( 'MUST FAIL: an underline placed against a link inside the nav moves with the link, so it is no item of the nav', async () => {
	const line = '<span style="position:absolute;left:0;bottom:3px;width:40px;height:2px"></span>';
	const d = await read( DRAFT().replace( 'width:73px">Home</a>', `width:73px;position:relative">Home${ line }</a>` ) );
	assert.equal( d.passThrough.items.length, 2 );
	assert.deepEqual( boxRows( d, await read( LIVE() ) ), [] );
} );

test( 'control: a box hugging its link (66px) against a 63px box whose link overflows to 64px takes the size of the link, so the row stays', async () => {
	const hug = ( h, a ) => `<div style="display:flex;align-items:center;height:72px"><div style="width:80px;height:40px">Menu</div><div id="n" style="${ h };display:flex;align-items:center"><a href="/" style="display:block;width:200px;height:${ a }px;flex:none">Logo</a></div></div>`;
	const d = await read( hug( '', 66 ) );
	const l = await read( hug( 'height:63px', 64 ) );
	assert.deepEqual( boxRows( d, l ), [ [ 'h', 66, 63 ] ] );
} );

test( 'control: a draft nav whose effect changes what it shows (clip-path, paint containment, a mask, opacity, a blend mode, overflow clip) keeps the row', async () => {
	const l = await read( LIVE() );
	for ( const nav of [ 'clip-path:inset(0 0 60px 0)', 'contain:paint', 'contain:content', 'mask-image:linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5))', '-webkit-mask-image:linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5))', '-webkit-mask-box-image:linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5))', 'opacity:.2', 'mix-blend-mode:multiply', 'overflow:clip' ] ) {
		assert.deepEqual( boxRows( await read( DRAFT( nav ) ), l ), [ [ 'h', 84, 42 ] ], nav );
	}
	// Control: the live nav carries the effect and the draft does not, so the row stays too.
	assert.deepEqual( boxRows( await read( DRAFT() ), await read( LIVE( 'opacity:.2' ) ) ), [ [ 'h', 84, 42 ] ], 'live opacity' );
} );

test( 'control: a draft nav holding three identical links against a live nav holding one keeps the row (the items are counted)', async () => {
	const home = `<a href="/" style="${ LINK };width:73px">Home</a>`;
	const d = await read( DRAFT().replace( /<a href="\/about"[^>]*>About<\/a>/, `${ home }${ home }` ) );
	const l = await read( LIVE().replace( /<a href="\/about"[^>]*>About<\/a><button[^>]*>v<\/button>/, '' ) );
	assert.equal( d.passThrough.items.length, 3 );
	assert.equal( l.passThrough.items.length, 1 );
	assert.deepEqual( boxRows( d, l ), [ [ 'h', 84, 42 ] ] );
} );

test( 'control: draft text or a non-interactive child beside the links, absent from the live nav, keeps the row', async () => {
	const l = await read( LIVE() );
	assert.deepEqual( boxRows( await read( DRAFT( '', 'Menu text' ) ), l ), [ [ 'h', 84, 42 ] ], 'bare text' );
	assert.deepEqual( boxRows( await read( DRAFT( '', '<span style="display:block;width:20px;height:42px"></span>' ).replace( 'width:90px', 'width:70px' ) ), l ), [ [ 'h', 84, 42 ] ], 'empty span at the links\' extent' );
	// Control: the same text on both sides is an item of each, so the row still drops.
	assert.deepEqual( boxRows( await read( DRAFT( '', '<span>Menu text</span>' ) ), await read( LIVE().replace( '</nav>', '<span>Menu text</span></nav>' ) ) ), [] );
} );

test( 'control: a draft nav overflowing its row (120px in an 84px row, unclipped) keeps the row', async () => {
	const d = await read( DRAFT().replace( 'height:100%;', 'height:120px;' ) );
	assert.equal( d.box.h, 120 );
	assert.deepEqual( boxRows( d, await read( LIVE() ) ), [ [ 'h', 120, 42 ] ] );
	// One edge at a time: the nav starts at the row's top and runs past its foot, then ends at its foot and starts above
	// its top, its padding keeping the links where the live row centres them.
	const far = await read( DRAFT( 'align-self:flex-start;align-items:flex-start;padding-top:21px;box-sizing:border-box' ).replace( 'height:100%;', 'height:120px;' ) );
	const near = await read( DRAFT( 'align-self:flex-end;align-items:flex-end;padding-bottom:21px;box-sizing:border-box' ).replace( 'height:100%;', 'height:120px;' ) );
	assert.deepEqual( [ far.passThrough.items[ 0 ][ 0 ] - far.passThrough.line.h[ 0 ], near.passThrough.items[ 0 ][ 0 ] - near.passThrough.line.h[ 0 ] ], [ 21, 21 ] );
	assert.deepEqual( boxRows( far, await read( LIVE() ) ), [ [ 'h', 120, 42 ] ], 'far edge' );
	assert.deepEqual( boxRows( near, await read( LIVE() ) ), [ [ 'h', 120, 42 ] ], 'near edge' );
} );

test( 'control: draft text inside a wrapper holding the links, or a draft control the live nav lacks, keeps the row', async () => {
	const l = await read( LIVE() );
	const wrapped = DRAFT().replace( /(<nav id="n"[^>]*>)(.*)(<\/nav>)/, '$1<div style="display:flex;align-items:center">$2Menu text</div>$3' );
	assert.deepEqual( boxRows( await read( wrapped ), l ), [ [ 'h', 84, 42 ] ], 'text beside the links in a wrapper' );
	const button = `<button style="${ LINK };width:32px;border:0;padding:0;background:none">v</button>`;
	const two = await read( DRAFT( '', `${ button }${ button }` ).replace( 'width:90px', 'width:58px' ) );
	assert.deepEqual( boxRows( two, l ), [ [ 'h', 84, 42 ] ], 'two draft controls against one live' );
} );
