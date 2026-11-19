// Spacing is judged between layout boxes (lib/fill-read-collect.mjs::collectMany `layoutRect`, read with transforms off),
// never between painted boxes a rotation enlarges. Real case: Mama's Contact cards (a grid with gap 18px, each card rotated
// by up to 1deg) measured painted gaps of 12 to 15px, so the declared gap was refused and the cards were built touching.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';
import { spacingOwnership } from '../lib/fill-spacing.mjs';

const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0 }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; padding: 20px }
.card { height: 200px; background: #eee; transition: transform .35s }
.a { transform: rotate(-1deg) } .b { transform: rotate(1deg) } .c { transform: rotate(-0.6deg) }
</style></head><body>
<div class="grid"><div class="card a">A</div><div class="card b">B</div><div class="card c">C</div></div>
</body></html>`;

const TREE = [ { name: 'sgs/container', draftRef: '.grid', attributes: {}, innerBlocks: [
	{ name: 'sgs/container', draftRef: '.a', attributes: {} }, { name: 'sgs/container', draftRef: '.b', attributes: {} }, { name: 'sgs/container', draftRef: '.c', attributes: {} },
] } ];

let served;
let read;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-layout-box-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
} );
after( () => served?.close() );

const gaps = ( key ) => [ '1:', '2:', '3:' ].map( ( id ) => read.widths[ 1440 ][ id ][ key ] ).map( ( r, i, a ) => ( i ? Math.round( ( r.x - ( a[ i - 1 ].x + a[ i - 1 ].w ) ) * 100 ) / 100 : null ) ).slice( 1 );
const DECLARED = { display: 'grid', 'column-gap': '18px', 'row-gap': '18px' };

test( 'MUST FAIL: the gap between rotated children is the declared gap between their layout boxes, so the parent owns it', () => {
	assert.deepEqual( gaps( 'layoutRect' ), [ 18, 18 ] );
	const own = spacingOwnership( [ '1:', '2:', '3:' ].map( ( id ) => read.widths[ 1440 ][ id ].layoutRect ), { declared: DECLARED } );
	assert.deepEqual( own.decisions.map( ( d ) => [ d.prop, d.owner, d.value, d.source ] ), [ [ 'column-gap', 'parent', '18px', 'declared' ] ] );
} );

test( 'negative control: the painted boxes of the same children are enlarged by the rotation, and the declared gap is not confirmed there', () => {
	assert.ok( gaps( 'rect' ).every( ( g ) => g < 17 ), `painted gaps ${ gaps( 'rect' ) }` );
	const own = spacingOwnership( [ '1:', '2:', '3:' ].map( ( id ) => read.widths[ 1440 ][ id ].rect ), { declared: DECLARED } );
	assert.ok( own.decisions[ 0 ].disagree, 'the painted read refuses the declared gap' );
} );

test( 'the read leaves the page as it was: the transforms are back and no transition is left running', async () => {
	// Every width is read in turn on the same page, so a later width's painted box shows whether an earlier read left the
	// transforms off.
	for ( const w of Object.keys( read.widths ) ) {
		const s = read.widths[ w ][ '1:' ];
		s?.layoutRect && assert.ok( s.rect.h > s.layoutRect.h + 1, `the rotation still paints at ${ w }` );
	}
} );

test( 'MUST FAIL: planSpacing judges the children\'s layout boxes where the read has them, else their painted boxes', async () => {
	const { planSpacing } = await import( '../lib/fill-resolve-state.mjs' );
	const { READ_WIDTHS } = await import( '../lib/fill-read.mjs' );
	const painted = ( x ) => ( { x, y: 0, w: 104, h: 210 } );
	const laid = ( x ) => ( { x, y: 0, w: 100, h: 200 } );
	const st = ( layout ) => ( {
		nodes: [ 0, 1, 2 ].map( ( i ) => ( { index: i, name: 'sgs/container', targets: [ { id: `${ i }:`, slot: '' } ], children: 0 === i ? [ 1, 2 ] : [] } ) ),
		flat: [ 0, 1, 2 ].map( ( i ) => ( { name: 'sgs/container', attributes: { className: `n${ i }` } } ) ),
		calFor: () => null,
		reads: { widths: Object.fromEntries( READ_WIDTHS.map( ( w ) => [ w, { '0:': { rect: laid( 0 ) }, '1:': { rect: painted( -2 ), ...( layout ? { layoutRect: laid( 0 ) } : {} ), inFlow: true }, '2:': { rect: painted( 114 ), ...( layout ? { layoutRect: laid( 118 ) } : {} ), inFlow: true } } ] ) ), declared: Object.fromEntries( READ_WIDTHS.map( ( w ) => [ w, { '0:': { display: 'grid', 'column-gap': '18px', 'row-gap': '18px' } } ] ) ) },
		out: { spacing: [] }, gapSet: new Map(), margins: new Map(),
	} );
	const withBoxes = st( true );
	planSpacing( withBoxes, withBoxes.nodes[ 0 ] );
	assert.equal( withBoxes.gapSet.get( '0|column-gap' )[ 1440 ], '18px', 'the declared gap, confirmed between the layout boxes' );
	const paintedOnly = st( false );
	planSpacing( paintedOnly, paintedOnly.nodes[ 0 ] );
	assert.equal( paintedOnly.gapSet.get( '0|column-gap' )[ 1440 ], '12px', 'negative control: a read with no layout box falls back to the painted box' );
} );

test( 'MUST FAIL: after the layout read the page paints its transforms again at once (no transition runs back from none)', async () => {
	const { loadChromium } = await import( '../lib/fill-read.mjs' );
	const { collectMany } = await import( '../lib/fill-read-collect.mjs' );
	const { chromium } = await loadChromium();
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
		await page.goto( served.url );
		const collect = String( () => ( { styles: {} } ) );
		const resolve = String( ( f ) => document.querySelector( f ) );
		await page.evaluate( collectMany, [ [ { id: 'a', finder: '.a', mark: null } ], collect, resolve, null, [], null, 'data-x' ] );
		const after = await page.evaluate( () => getComputedStyle( document.querySelector( '.a' ) ).transform );
		assert.notEqual( after, 'none', 'the rotation is back, and not mid-transition from none' );
		assert.match( after, /^matrix\(0\.99/, `the full rotation paints at once: ${ after }` );
	} finally {
		await browser.close();
	}
} );
