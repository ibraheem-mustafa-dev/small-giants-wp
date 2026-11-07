// A hover look held by a part of a block is read on the part under a real pointer (lib/apply-part-hover.mjs), and the judge keeps
// the write only where the part shows the draft's value.
// Run: node --test tests/apply-part-hover.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { judge } from '../apply.mjs';
import { attachStateReads, settled } from '../lib/apply-hover.mjs';
import { partFinder, partReads, partsOf } from '../lib/apply-part-hover.mjs';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { loadChromium } from '../lib/fill-read.mjs';

const GOLD = 'rgb(216, 202, 80)';
const TEXT = '.list > .item:nth-of-type(1) > .text';
const ICON = '.list > .item:nth-of-type(1) > .icon';
const check = ( part, want = GOLD ) => ( { width: 1440, prop: 'color', want, state: 'hover', part } );
const op = ( checks ) => ( { surface: 's', ref: 'cr-ref-t-1', checks } );
const reads = ( parts ) => ( { s: { 1440: { facts: { 'cr-ref-t-1': { parts } } } } } );

test( 'judge reads a part check on the part, at hover', () => {
	const o = op( [ check( TEXT ) ] );
	assert.equal( judge( [ o ], reads( { [ TEXT ]: { rest: { color: 'rgb(0, 0, 0)' }, hover: { color: GOLD } } } ) )[ 0 ].ok, true );
} );

test( 'negative control: a part that does not change under the hover fails and is rolled back', () => {
	const o = op( [ check( TEXT ) ] );
	const j = judge( [ o ], reads( { [ TEXT ]: { rest: { color: 'rgb(0, 0, 0)' }, hover: { color: 'rgb(0, 0, 0)' } } } ) )[ 0 ];
	assert.equal( j.ok, false );
	assert.equal( j.unchecked, false );
} );

test( 'negative control: one part showing the value does not excuse the other that does not', () => {
	const o = op( [ check( TEXT ), check( ICON ) ] );
	const j = judge( [ o ], reads( { [ TEXT ]: { hover: { color: GOLD } }, [ ICON ]: { hover: { color: 'rgb(1, 1, 1)' } } } ) )[ 0 ];
	assert.equal( j.ok, false );
} );

test( 'a part the pointer never reached is unchecked, not ok-by-default and not failed', () => {
	const j = judge( [ op( [ check( TEXT ) ] ) ], reads( { [ TEXT ]: { unreached: true } } ) )[ 0 ];
	assert.equal( j.unchecked, true );
} );

test( 'partsOf collects each part and its props from the ops; partFinder needs a selector root and a slot', () => {
	assert.deepEqual( partsOf( [ op( [ check( TEXT ), check( TEXT ), check( ICON ), { width: 1440, prop: 'gap', want: '1px' } ] ) ] ), { 'cr-ref-t-1': { [ TEXT ]: [ 'color' ], [ ICON ]: [ 'color' ] } } );
	assert.equal( partFinder( { tpl: 'a' }, TEXT ), null );
	assert.equal( partFinder( '.x', '' ), null );
	assert.equal( partFinder( '.x', TEXT ).within, '.x' );
} );

test( 'attachStateReads folds parts into the key facts', () => {
	const read = { facts: { k: {} } };
	attachStateReads( read, { hover: {}, probes: {}, parts: { k: { a: { hover: {} } }, gone: {} } } );
	assert.deepEqual( Object.keys( read.facts.k.parts ), [ 'a' ] );
} );

const PAGE = `<style>.item{display:block;padding:10px}.text{color:rgb(10,10,10)}.icon{color:rgb(20,20,20)}
.item:hover .text{color:${ GOLD }}</style>
<div class="cr-ref-t-1 list"><div class="item"><span class="text">Name</span> <span class="icon">x</span></div></div>`;

test( 'a real pointer on the part: the part with a hover rule changes, the one without does not (negative control)', { timeout: 60000 }, async () => {
	const browser = await ( await loadChromium() ).chromium.launch();
	try {
		const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
		await page.setContent( PAGE );
		const done = await partReads( page, { parts: { 'cr-ref-t-1': { [ TEXT ]: [ 'color' ], [ ICON ]: [ 'color' ], '.list > .item:nth-of-type(1) > .absent': [ 'color' ] } }, finderOf: () => '.cr-ref-t-1', resolveSrc: resolveFinder.toString(), settled, wait: 100 } );
		const parts = done[ "cr-ref-t-1" ];
		assert.equal( parts[ TEXT ].rest.color, 'rgb(10, 10, 10)' );
		assert.equal( parts[ TEXT ].hover.color, GOLD );
		assert.equal( parts[ ICON ].hover.color, 'rgb(20, 20, 20)' );
		assert.equal( parts[ '.list > .item:nth-of-type(1) > .absent' ].unreached, true );
		// A slot naming an ancestor this instance lacks is found by its last compound; one whose last compound is absent too is not.
		assert.equal( ( await partReads( page, { parts: { 'cr-ref-t-1': { '.nolink > .text': [ 'color' ] } }, finderOf: () => '.cr-ref-t-1', resolveSrc: resolveFinder.toString(), settled, wait: 100 } ) )[ 'cr-ref-t-1' ][ '.nolink > .text' ].hover.color, GOLD );
		const o = op( [ check( TEXT ) ] );
		const live = reads( parts );
		assert.equal( judge( [ o ], live )[ 0 ].ok, true );
		assert.equal( judge( [ op( [ check( ICON ) ] ) ], live )[ 0 ].ok, false );
	} finally {
		await browser.close();
	}
} );
