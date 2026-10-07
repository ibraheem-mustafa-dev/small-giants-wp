// A measured diagram (plan archive/2026-10-07-measured-diagram-block.md §C) in a real browser (headless Chromium on local HTML,
// never a site): the walker reads a drawn line's weight and dash, and where a positioned label sits, and Solve writes a
// label position only from the draft's declared value. Without these reads a diagram's line style and label positions
// produce no row at all, so the route could neither compare nor fill them.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { DEFAULT_PROPS, resolveFinder, collectPair } from '../../parity/lib/collect.mjs';
import { PAINT_SRC } from '../../parity/lib/paint.mjs';
import { comparePair } from '../../parity/lib/compare.mjs';
import { openDevtools, declaredValues, DECLARED_PROPS } from '../../parity/lib/devtools.mjs';
import { READ_PROPS } from '../lib/calibrate.mjs';
import { usedValueTarget } from '../lib/solve-rows.mjs';
import { USED_VALUES } from '../solve.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const { chromium } = await import( pathToFileURL( path.join( HERE, '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
const RESOLVE = resolveFinder.toString();
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const DIAGRAM = ( { width = '1.4px', dash = 'none', left = '30%' } = {} ) => `<style>
	.frame { position: relative; width: 600px; height: 300px }
	.line path { stroke: rgb(156, 139, 120); stroke-width: ${ width }; stroke-dasharray: ${ dash }; fill: none }
	.label { position: absolute; left: ${ left }; top: 80% }
	.flow { left: 10px }
</style><div class="frame"><svg class="line" viewBox="0 0 600 300" width="600" height="300"><path d="M120 238L290 238"/></svg>
<span class="label">56 mm</span></div><p class="flow">In flow</p>`;

const read = async ( html, finder ) => {
	const page = await browser.newPage( { viewport: { width: 800, height: 600 } } );
	await page.setContent( `<!doctype html><html><body>${ html }</body></html>` );
	const snap = await page.evaluate( collectPair, [ finder, DEFAULT_PROPS, RESOLVE, null, null, null, PAINT_SRC, null ] );
	return { page, snap };
};

test( 'MUST FAIL: the walker and calibration read stroke weight, dash and a positioned offset', () => {
	for ( const p of [ 'icon-stroke-width', 'icon-stroke-dasharray', 'left', 'top' ] ) {
		assert.ok( DEFAULT_PROPS.includes( p ), `walker reads ${ p }` );
	}
	for ( const p of [ 'stroke-width', 'stroke-dasharray', 'left', 'top' ] ) {
		assert.ok( READ_PROPS.includes( p ), `calibration reads ${ p }` );
	}
	assert.ok( DECLARED_PROPS.includes( 'left' ) && DECLARED_PROPS.includes( 'top' ), 'declared offsets are read' );
	assert.ok( USED_VALUES.includes( 'left' ) && USED_VALUES.includes( 'top' ), 'Solve writes offsets only as declared' );
} );

test( 'MUST FAIL TO MISS: a thicker or dashed dimension line is a row', async () => {
	const a = await read( DIAGRAM(), '.line' );
	const b = await read( DIAGRAM( { width: '3px', dash: '4px, 4px' } ), '.line' );
	assert.equal( a.snap.styles[ 'icon-stroke-width' ], '1.4px' );
	assert.equal( b.snap.styles[ 'icon-stroke-dasharray' ], '4px, 4px' );
	const keys = comparePair( { text: false }, a.snap, b.snap, { box: 2, px: 0.5 } ).map( ( d ) => d.key ).sort();
	assert.ok( keys.includes( 'icon-stroke-width' ) && keys.includes( 'icon-stroke-dasharray' ), keys.join( ', ' ) );
	await a.page.close();
	await b.page.close();
} );

test( 'MUST FAIL TO MISS: a positioned label sitting elsewhere is a left row; an in-flow offset is not read', async () => {
	const a = await read( DIAGRAM(), '.label' );
	const b = await read( DIAGRAM( { left: '40%' } ), '.label' );
	assert.equal( a.snap.styles.left, '180px', 'computed left is the used pixel value' );
	assert.ok( comparePair( { text: false }, a.snap, b.snap, { box: 2, px: 0.5 } ).some( ( d ) => 'left' === d.key ) );
	const flow = await read( DIAGRAM(), '.flow' );
	assert.equal( flow.snap.styles.left, undefined, 'a static element reads no offset' );
	await Promise.all( [ a.page.close(), b.page.close(), flow.page.close() ] );
} );

test( 'MUST FAIL TO FREEZE: Solve writes the declared percentage, never the used pixels', async () => {
	const page = await browser.newPage();
	await page.setContent( `<!doctype html><html><body>${ DIAGRAM() }</body></html>` );
	const cdp = await openDevtools( page );
	const declared = await declaredValues( cdp, '.label', RESOLVE );
	assert.equal( declared.left, '30%' );
	const target = usedValueTarget( 'left', { perWidth: { 375: '180px', 768: '180px' }, declared: { 375: '30%', 768: '30%' } } );
	assert.deepEqual( target.perWidth, { 375: '30%', 768: '30%' } );
	assert.equal( usedValueTarget( 'left', { perWidth: { 375: '180px' }, declared: {} } ).gap, 'used-value', 'negative control: nothing declared is a gap, not a pixel write' );
	await page.close();
} );
