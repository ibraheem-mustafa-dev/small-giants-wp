// Part-look reads the shop chips' "All" chip and whether one chip is pressed at a time (shop investigation F-6: sgsChipAllLabel,
// sgsChipAllCount, sgsChipSingle on woocommerce/product-filter-chips). The All chip is the first chip of the row, pressed on load, whose
// count is larger than every other chip's count (positive evidence that it is the unfiltered choice; a row with no counts leaves the
// label unwritten); its words are the chip's words without the count, never a live value. One at a time is read by pressing a chip that is
// not pressed (lib/part-look-press.mjs::readPress) on a planted page whose own script replaces or adds to the choice. Tests marked MUST
// FAIL fail without the code they name. Planted pages; no site, no draft.
// Run: SGS_NO_SITE=1 node --test tests/part-look-shop-chips-choice.test.mjs (from scripts/computed-route)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import { READ_PROPS, findPartsInPage } from '../lib/fill-part-look.mjs';
import { evaluateModes } from '../lib/part-look-modes.mjs';
import { readPress } from '../lib/part-look-press.mjs';
import { readParts } from '../lib/part-look-run.mjs';
import { loadChromium } from '../lib/fill-read.mjs';

const DATA = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data' );
const LOC = JSON.parse( fs.readFileSync( path.join( DATA, 'part-locators.json' ), 'utf8' ) );
const MODES = JSON.parse( fs.readFileSync( path.join( DATA, 'part-look-modes.json' ), 'utf8' ) ).blocks[ 'woocommerce/product-filter-chips' ].rules;
const ROWS = [ 'sgsChipCountPill', 'sgsChipAllLabel', 'sgsChipAllCount', 'sgsChipSingle' ].map( ( attr_name ) => ( { attr_name } ) );
const PARTS = Object.keys( LOC.groups.shopchips.parts );

let browser;
let page;
before( async () => {
	const { chromium } = await loadChromium();
	browser = await chromium.launch( { headless: true } );
	page = await ( await browser.newContext( { viewport: { width: 1440, height: 900 } } ) ).newPage();
} );
after( async () => {
	await browser?.close();
} );

// A bakery's chip row: a label and a count each, the first pressed on load; the draft's own click either replaces the pressed chip
// ('single') or toggles the clicked one beside the others ('multiple'). `counts` are each chip's number, null for none.
const row = ( { mode = 'single', labels = [ 'All', 'Zookies', 'Gifts', 'Bundles' ], counts = [ 9, 4, 3, 2 ], pressed = 0 } = {} ) => `<div id="r" role="group" style="display:flex;gap:10px">${ labels.map( ( w, i ) => `<button aria-pressed="${ i === pressed }" style="min-height:46px;padding:0 18px;border:2px solid #3a2a22;border-radius:999px">${ w }${ null === counts[ i ] ? '' : `<span style="min-width:22px;height:22px">${ counts[ i ] }</span>` }</button>` ).join( '' ) }</div>
<script>
( () => {
	const mode = '${ mode }';
	document.querySelectorAll( '#r button' ).forEach( ( b ) => b.addEventListener( 'click', () => {
		if ( 'single' === mode ) {
			document.querySelectorAll( '#r button' ).forEach( ( o ) => o.setAttribute( 'aria-pressed', String( o === b ) ) );
		} else if ( 'multiple' === mode ) {
			b.setAttribute( 'aria-pressed', String( 'true' !== b.getAttribute( 'aria-pressed' ) ) );
		}
	} ) );
} )();
</script>`;

const find = async ( html ) => {
	await page.setContent( `<!doctype html><body><main>${ html }</main></body>` );
	return page.evaluate( findPartsInPage, { spec: LOC.groups.shopchips, names: PARTS, props: READ_PROPS, pages: {} } );
};
const reads = ( found ) => Object.fromEntries( Object.entries( found ).filter( ( [ , l ] ) => l.length ).map( ( [ part, list ] ) => [ part, { 1440: list } ] ) );
const decide = ( found ) => {
	const r = evaluateModes( { block: 'woocommerce/product-filter-chips', rules: MODES, rows: ROWS, reads: reads( found ) } );
	return { writes: Object.fromEntries( r.writes.map( ( w ) => [ w.attr, w.value ] ) ), settings: r.settings };
};

test( 'MUST FAIL: the All chip is the first pressed chip with the largest count; its words are written without the count, and its count pill is switched on', async () => {
	const found = await find( row() );
	assert.deepEqual( found[ 'chip-all' ].map( ( i ) => i.text ), [ 'All9' ] );
	assert.deepEqual( found[ 'chip-all-count' ].map( ( i ) => i.text ), [ '9' ] );
	assert.deepEqual( found[ 'chip-other-count' ].map( ( i ) => i.text ), [ '4', '3', '2' ] );
	const { writes } = decide( found );
	assert.equal( writes.sgsChipAllLabel, 'All' );
	assert.equal( writes.sgsChipAllCount, true );
} );

test( 'negative controls: no count to prove it, a count that does not exceed the others, a pressed chip that is not first, and a row with no pressed chip leave the label unwritten', async () => {
	// No counts at all: the chip may be a first tab, not the unfiltered choice.
	const bare = decide( await find( row( { counts: [ null, null, null, null ] } ) ) );
	assert.equal( bare.writes.sgsChipAllLabel, undefined );
	assert.equal( bare.settings.sgsChipAllLabel.code, 'notLargest' );
	// A first chip whose count equals another's, or is smaller: not the whole.
	assert.equal( decide( await find( row( { counts: [ 4, 4, 3, 2 ] } ) ) ).writes.sgsChipAllLabel, undefined );
	assert.equal( decide( await find( row( { counts: [ 3, 9, 3, 2 ] } ) ) ).writes.sgsChipAllLabel, undefined );
	// Only the first chip counted: nothing to compare its count with.
	assert.equal( decide( await find( row( { counts: [ 9, null, null, null ] } ) ) ).writes.sgsChipAllLabel, undefined );
	// The pressed chip is the second: the first is no All (it is not pressed on load).
	const second = await find( row( { pressed: 1 } ) );
	assert.equal( ( second[ 'chip-all' ] || [] ).length, 0 );
	assert.equal( decide( second ).writes.sgsChipAllLabel, undefined );
	// No chip pressed: the row is not the chips at all.
	assert.equal( ( await find( row( { pressed: -1 } ) ) )[ 'chip-all' ]?.length ?? 0, 0 );
} );

test( 'MUST FAIL: pressing a chip that is not pressed shows whether the draft replaces the pressed chip (one at a time) or keeps it (several at a time)', async () => {
	for ( const [ mode, verdict ] of [ [ 'single', 'single' ], [ 'multiple', 'multiple' ] ] ) {
		const found = await find( row( { mode } ) );
		assert.equal( await readPress( { page, found } ), verdict, mode );
		assert.deepEqual( found[ `chip-${ verdict }` ].map( ( i ) => i.text ), [ verdict ] );
	}
	// Each verdict decides the setting; the other is absent.
	const one = await find( row( { mode: 'single' } ) );
	await readPress( { page, found: one } );
	assert.equal( decide( one ).writes.sgsChipSingle, true );
	const many = await find( row( { mode: 'multiple' } ) );
	await readPress( { page, found: many } );
	assert.equal( decide( many ).writes.sgsChipSingle, false );
} );

test( 'negative controls: a press that changes nothing, or a row with no chip to press, reads neither verdict and writes nothing', async () => {
	const inert = await find( row( { mode: 'none' } ) );
	assert.equal( await readPress( { page, found: inert } ), null );
	assert.deepEqual( [ inert[ 'chip-single' ], inert[ 'chip-multiple' ] ], [ undefined, undefined ] );
	assert.equal( decide( inert ).writes.sgsChipSingle, undefined );
	assert.equal( await readPress( { page, found: {} } ), null );
	// A press that cannot be reached is logged, not thrown.
	const gone = await find( row() );
	await page.setContent( '<body></body>' );
	const logged = [];
	assert.equal( await readPress( { page, found: gone, log: ( m ) => logged.push( m ) } ), null );
	assert.equal( logged.length, 1 );
} );

test( 'MUST FAIL: the chips surface asks for the press probe and the run reads it on the served draft at every width', async () => {
	assert.equal( LOC.groups.shopchips.probe, 'press' );
	const cli = fs.readFileSync( path.join( DATA, '..', 'part-look.mjs' ), 'utf8' );
	assert.match( cli, /\.\.\.\( group\.probe \? \{ probe: group\.probe \} : \{\} \)/, 'the command hands the probe of the group to the read' );
	const fixtures = path.join( DATA, '..', 'tests', 'fixtures', 'part-look' );
	const spec = { anchors: LOC.groups.shopchips.anchors, parts: LOC.groups.shopchips.parts, probe: LOC.groups.shopchips.probe };
	const { reads } = await readParts( { draftDir: fixtures, files: [ 'shop-chips-single.html' ], spec, names: PARTS, pages: {} } );
	assert.deepEqual( Object.keys( reads[ 'chip-single' ] || {} ).sort(), [ '1440', '375', '768' ] );
	assert.equal( reads[ 'chip-multiple' ], undefined );
	// Without the probe in the spec, no verdict is read (the draft is read as before).
	const plain = await readParts( { draftDir: fixtures, files: [ 'shop-chips-single.html' ], spec: { ...spec, probe: undefined }, names: PARTS, pages: {} } );
	assert.equal( plain.reads[ 'chip-single' ], undefined );
	assert.ok( plain.reads[ 'chip-all' ], 'the chips are still read' );
} );
