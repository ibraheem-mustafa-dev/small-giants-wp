// Walker Track W wave 2 fix 1, in headless Chromium on local HTML. A gap compares where a side lays out two or more flex
// or grid items (paint.mjs::layoutComparable over collect.mjs::collectPair's layoutChildren); a painting ::before or
// ::after is an item, and a display: contents child is stepped into (its children are the items).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFinder, collectPair } from '../lib/collect.mjs';
import { PAINT_SRC, layoutElement } from '../lib/paint.mjs';
import { comparePair } from '../lib/compare.mjs';

const { chromium } = await import( new URL( '../../computed-route/node_modules/playwright/index.mjs', import.meta.url ).href );
const RESOLVE = resolveFinder.toString();
const TOL = { px: 0.5, box: 2 };
const PROPS = [ 'display', 'gap', 'row-gap', 'column-gap' ];
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const read = async ( html, finder ) => {
	const page = await browser.newPage( { viewport: { width: 1000, height: 600 } } );
	await page.setContent( `<!doctype html><html><body style="margin:0">${ html }</body></html>` );
	const snap = await page.evaluate( collectPair, [ finder, PROPS, RESOLVE, null, null, null, PAINT_SRC, null, { others: [], textOthers: [], paintPart: true } ] );
	await page.close();
	return snap;
};
const gapRows = ( d, l ) => comparePair( { text: false, box: [] }, d, l, TOL ).filter( ( r ) => 'column-gap' === r.key ).map( ( r ) => [ r.key, r.draft, r.live ] );

const ICON = ( gap, before = 'content:"";width:16px;height:16px;background:red' ) => `<style>#b::before{${ before }}</style><a id="b" style="display:inline-flex;gap:${ gap };width:200px">Call us</a>`;

test( 'MUST FAIL (rater A): an inline-flex link\'s ::before icon and its label are two items, so gap 12 against 0 is a row', async () => {
	const d = await read( ICON( '12px' ), '#b' );
	const l = await read( ICON( '0px' ), '#b' );
	assert.equal( d.layoutChildren, 2 );
	assert.deepEqual( gapRows( d, l ), [ [ 'column-gap', '12px', '0px' ] ] );
} );

test( 'control: a ::before that paints no box (content none, display none, positioned) is no item, and that gap is no row', async () => {
	for ( const before of [ 'content:none', 'content:"";display:none', 'content:"";position:absolute;width:4px;height:4px' ] ) {
		const d = await read( ICON( '12px', before ), '#b' );
		const l = await read( ICON( '0px', before ), '#b' );
		assert.equal( d.layoutChildren, 1, before );
		assert.deepEqual( gapRows( d, l ), [], before );
	}
	// An ::after counts the same as a ::before.
	const after = ( gap ) => `<style>#b::after{content:"→"}</style><a id="b" style="display:inline-flex;gap:${ gap }">Next</a>`;
	assert.deepEqual( gapRows( await read( after( '6px' ), '#b' ), await read( after( '0px' ), '#b' ) ), [ [ 'column-gap', '6px', '0px' ] ] );
} );

const LIST = ( gap, items = 3 ) => `<div id="n" style="display:flex;gap:${ gap };width:400px"><ul style="display:contents">${ '<li style="display:block">Item</li>'.repeat( items ) }</ul></div>`;

test( 'MUST FAIL (rater A): a display: contents list\'s three items are the flex row\'s items, so gap 32 against 0 is a row', async () => {
	const d = await read( LIST( '32px' ), '#n' );
	const l = await read( LIST( '0px' ), '#n' );
	assert.equal( d.layoutChildren, 3 );
	assert.deepEqual( gapRows( d, l ), [ [ 'column-gap', '32px', '0px' ] ] );
} );

test( 'control: a display: contents wrapper holding one item lays out one item, and that gap is no row', async () => {
	const d = await read( LIST( '32px', 1 ), '#n' );
	const l = await read( LIST( '0px', 1 ), '#n' );
	assert.equal( d.layoutChildren, 1 );
	assert.deepEqual( gapRows( d, l ), [] );
} );

test( 'layoutElement steps through display: contents and counts painting pseudo items before descending a single child', async () => {
	const page = await browser.newPage();
	await page.setContent( `<!doctype html>
		<div id="a"><ul style="display:contents"><li id="a-band" style="display:flex;gap:9px"><b>1</b><b>2</b></li></ul></div>
		<style>#c::before{content:"";width:8px;height:8px}</style><a id="c" style="display:flex;gap:5px"><span id="c-in" style="display:flex"><b>x</b><b>y</b></span></a>
		<a id="e" style="display:flex;gap:5px"><span id="e-in" style="display:flex"><b>x</b><b>y</b></span></a>` );
	const ids = await page.evaluate( ( src ) => {
		const { layoutElement: le } = new Function( `${ src }; return { layoutElement };` )();
		return [ 'a', 'c', 'e' ].map( ( id ) => le( document.getElementById( id ) ).id );
	}, PAINT_SRC );
	await page.close();
	// a: the contents list's one item is a's single child, so its band lays out; c: the ::before plus the span are two
	// items, so c lays them out; e (control): one span child, so the walk descends into it.
	assert.deepEqual( ids, [ 'a-band', 'c', 'e-in' ] );
	assert.equal( typeof layoutElement, 'function' );
} );
