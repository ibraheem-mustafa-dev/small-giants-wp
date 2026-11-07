// Detectors C3 (real scrollbars), C5 (geometry after entrances) and C6 (connector endpoints), each on local HTML in a
// browser launched with classic scrollbars shown: a fixture that must FAIL (the fault) and a negative control that must PASS.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { launchReal } from '../detectors/lib-geometry.mjs';
import { readScrollers, judgeScroller } from '../detectors/c3-scrollbars.mjs';
import { readOverflow, readSliders, judgeOverflow, judgeSlider } from '../detectors/c5-geometry.mjs';
import { measureConnector, judgeConnector } from '../detectors/c6-connectors.mjs';
import { resolveFinder } from '../lib/collect.mjs';

let browser;
before( async () => {
	browser = await launchReal();
} );
after( () => browser?.close() );

const open = async ( html, width = 375, height = 667 ) => {
	const page = await browser.newPage( { viewport: { width, height } } );
	await page.setContent( `<!doctype html><body style="margin:0">${ html }</body>` );
	return page;
};
const base = { page: 'fixture', width: 375, state: 'test' };
const statuses = ( rows, kind ) => rows.filter( ( r ) => r.kind === kind ).map( ( r ) => r.status );

test( 'C3: a scroller with a classic scrollbar is measured wider than the draft overlay one', async () => {
	const live = await open( '<div class="body" style="height:300px;overflow-y:auto"><div style="height:625px"></div></div>' );
	const [ s ] = await live.evaluate( readScrollers, [ null, false ] );
	assert.ok( s.sbw >= 8, `classic scrollbar shows (got ${ s.sbw })` );
	const draft = { sbw: 0, cssWidth: 'thin', clientW: 375, scrollH: 540, clientH: 300, scrolls: true };
	const rows = judgeScroller( s, draft, base );
	assert.deepEqual( statuses( rows, 'scrollbar-width' ), [ 'fail' ] );
	assert.deepEqual( statuses( rows, 'scrollbar-style' ), [ 'fail' ] );
	assert.deepEqual( statuses( rows, 'content-height' ), [ 'fail' ] );
} );

test( 'C3 negative control: a container that does not scroll on either side passes', async () => {
	const live = await open( '<div class="body" style="height:800px;overflow-y:auto"><div style="height:625px"></div></div>', 375, 900 );
	const [ s ] = await live.evaluate( readScrollers, [ null, false ] );
	assert.equal( s.sbw, 0 );
	const rows = judgeScroller( s, { sbw: 0, cssWidth: 'auto', clientW: 375, scrollH: 625, clientH: 800, scrolls: false }, base );
	assert.ok( rows.length > 0 && rows.every( ( r ) => 'pass' === r.status ), JSON.stringify( rows ) );
} );

test( 'C3: a container that cannot be paired is unmeasured, never a pass', () => {
	const rows = judgeScroller( { role: 'x', ref: null, sbw: 10, scrolls: true, scrollH: 600, clientH: 300, clientW: 300, cssWidth: 'auto' }, null, base );
	assert.deepEqual( rows.map( ( r ) => r.status ), [ 'unmeasured' ] );
} );

test( 'C5: page overflow past the viewport fails and names the widest element; a fitting page passes', async () => {
	const wide = await open( '<div class="gs" style="width:1060px;height:20px"></div>', 1024, 700 );
	const live = await wide.evaluate( readOverflow );
	assert.ok( live.over > 0 && 1060 === live.scrollW, JSON.stringify( live ) );
	assert.equal( 'fail', judgeOverflow( live, { over: 0, wide: [], scrollW: 1024, innerW: 1024 }, base )[ 0 ].status );
	const fit = await open( '<div style="width:1000px;height:20px"></div>', 1024, 700 );
	assert.equal( 'pass', judgeOverflow( await fit.evaluate( readOverflow ), { over: 0, wide: [], scrollW: 1024, innerW: 1024 }, base )[ 0 ].status );
} );

const slider = ( shift ) => `<div class="track" style="width:300px;overflow:hidden"><div class="list" style="display:flex;transform:translateX(${ shift }px)">${ '<div class="slide" style="flex:0 0 300px;height:50px"></div>'.repeat( 4 ) }</div></div>`;

test( 'C5: a slider whose active slide is 18.8px off the track edge fails; an aligned one passes', async () => {
	const off = ( await ( await open( slider( -18.8 ), 1440, 700 ) ).evaluate( readSliders ) )[ 0 ];
	const ok = ( await ( await open( slider( 0 ), 1440, 700 ) ).evaluate( readSliders ) )[ 0 ];
	assert.ok( off && ok, 'both sliders found by geometry' );
	assert.equal( Math.abs( off.offset ), 18.8 );
	assert.equal( ok.offset, 0 );
	const aligned = { ...ok, offset: 0, shown: 1 };
	assert.ok( judgeSlider( off, aligned, base ).some( ( r ) => 'fail' === r.status && 'slide-offset' === r.kind ) );
	assert.ok( judgeSlider( ok, aligned, base ).every( ( r ) => 'pass' === r.status ) );
	assert.equal( 'info', judgeSlider( off, aligned, { ...base, state: 'mid-entrance' } )[ 0 ].status, 'mid-entrance is informational' );
} );

test( 'C5: a neighbour slide showing beside the active one fails when the draft shows one slide', async () => {
	const html = '<div class="track" style="width:300px;overflow:hidden"><div style="display:flex">' + '<div style="flex:0 0 280px;height:50px"></div>'.repeat( 4 ) + '</div></div>';
	const s = ( await ( await open( html, 1440, 700 ) ).evaluate( readSliders ) )[ 0 ];
	assert.equal( s.shown, 2 );
	assert.ok( judgeSlider( s, { ...s, offset: 0, shown: 1 }, base ).some( ( r ) => 'fail' === r.status && 'neighbour-shown' === r.kind ) );
} );

test( 'C5: a draft that swaps one card in place is read as a card, and a live slide off its left edge fails', async () => {
	const draftPage = await open( '<div class="stage"><div class="card" style="margin-left:50px;width:300px;height:100px"></div></div>', 1440, 700 );
	const d = ( await draftPage.evaluate( readSliders, [ { js: '(r) => r.querySelector(".stage")' }, resolveFinder.toString(), 300 ] ) )[ 0 ];
	assert.deepEqual( [ d.card, d.slideLeft ], [ true, 50 ] );
	const live = ( await ( await open( '<div style="padding-left:50px"><div class="track" style="width:300px;overflow:hidden"><div style="display:flex;transform:translateX(-18.8px)">' + '<div style="flex:0 0 300px;height:50px"></div>'.repeat( 4 ) + '</div></div></div>', 1440, 700 ) ).evaluate( readSliders ) )[ 0 ];
	assert.ok( judgeSlider( live, d, base ).some( ( r ) => 'fail' === r.status && 'slide-offset' === r.kind ) );
	assert.ok( judgeSlider( { ...live, slideLeft: 50, shown: 1 }, d, base ).every( ( r ) => 'pass' === r.status ) );
} );

const steps = ( left, width ) => `<div class="steps" style="position:relative;width:700px;display:flex;justify-content:space-between"><div class="line" style="position:absolute;top:30px;left:${ left }px;width:${ width }px;height:2px;background:#000"></div>${ '<div style="width:100px;height:100px;text-align:center"><div style="width:60px;height:60px;border-radius:50%;margin:0 auto;background:#ccc"></div></div>'.repeat( 3 ) }</div>`;
const finderFor = { js: '(r) => r.querySelector(".steps")' };
const measure = async ( html ) => ( await open( html, 1440, 700 ) ).evaluate( measureConnector, [ { finder: finderFor }, resolveFinder.toString() ] );

test( 'C6: a line from the section edge that stops short of the last step fails; one joining the centres passes', async () => {
	// Item centres: 50 and 650 (items at 0..100 and 600..700).
	const bad = await measure( steps( 0, 480 ) );
	const good = await measure( steps( 50, 600 ) );
	assert.equal( bad.items, 3 );
	assert.equal( bad.marker, true );
	const draft = good;
	const failed = judgeConnector( bad, draft, base );
	assert.deepEqual( statuses( failed, 'connector-start' ), [ 'fail' ] );
	assert.deepEqual( statuses( failed, 'connector-end' ), [ 'fail' ] );
	assert.ok( judgeConnector( good, draft, base ).every( ( r ) => 'pass' === r.status ) );
} );

test( 'C6: a block with no line, or no draft pairing, is unmeasured', async () => {
	const none = await measure( '<div class="steps" style="width:300px;display:flex"><div style="width:100px;height:100px"></div><div style="width:100px;height:100px"></div></div>' );
	assert.equal( none.noLine, true );
	assert.equal( judgeConnector( none, none, base )[ 0 ].status, 'unmeasured' );
	assert.equal( judgeConnector( await measure( steps( 50, 600 ) ), null, base )[ 0 ].status, 'unmeasured' );
} );
