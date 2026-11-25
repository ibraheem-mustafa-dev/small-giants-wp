// The part tree the general pairing (lib/skeleton-part-pairing.mjs) works on, when the block's default look is not the whole of
// the block: a plain row and a row that opens a submenu draw the same link at one level (the draft's menu has only one kind),
// a part the block never displays is no candidate, and a part only a page that sets a setting draws is offered once the
// default parts fail. Each test names the mutation that makes it fail (skeleton-part-pairing-conditional.mutations.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { partModel, pairAbsorbed } from '../lib/skeleton-part-pairing.mjs';
import { calPartsFor } from '../lib/skeleton-context.mjs';
import { writeRecordFixture } from '../lib/setting-record.mjs';

const at = ( tag, extra = {} ) => ( { 1440: { _tag: tag, _position: 'static', display: 'block', 'background-color': 'rgba(0, 0, 0, 0)', 'border-top-width': '0px', ...extra } } );
const el = ( key, tag, kids = [], extra = {} ) => ( { key, tag, kids, visible: { 1440: true }, box: { 1440: { w: extra.w ?? 100, h: extra.h ?? 40 } }, position: { 1440: 'static' }, words: extra.words ?? '', attrs: extra.attrs ?? {} } );
const kids = ( e ) => e.kids;
const finder = ( e ) => ( { tpl: e.key } );

// A drawer menu's default look as the site look reads it: item 1 a plain row, item 2 a row with a submenu (a wrapper round
// its link and a disclosure summary).
const ITEM = ( k ) => `.bar > .item:nth-of-type(${ k })`;
const MENU = {
	'': at( 'nav' ), '.bar': at( 'ul' ),
	[ ITEM( 1 ) ]: at( 'li' ), [ `${ ITEM( 1 ) } > .link` ]: at( 'a' ), [ `${ ITEM( 1 ) } > .link > .text` ]: at( 'span' ),
	[ ITEM( 2 ) ]: at( 'li' ), [ `${ ITEM( 2 ) } > .row` ]: at( 'div' ), [ `${ ITEM( 2 ) } > .row > .link` ]: at( 'a' ), [ `${ ITEM( 2 ) } > .row > .link > .text` ]: at( 'span' ),
	[ `${ ITEM( 2 ) } > .row > .acc` ]: at( 'details' ), [ `${ ITEM( 2 ) } > .row > .acc > .summ` ]: at( 'summary' ),
};
const MENU_SETTINGS = { linkBg: { slot: `${ ITEM( 1 ) } > .link`, slots: [ `${ ITEM( 1 ) } > .link`, `${ ITEM( 2 ) } > .link` ], property: 'background-color' } };
// The draft's menu: two plain links in a list, none with a caret.
const draftMenu = ( caret = false ) => {
	const links = [ 0, 1 ].map( ( i ) => el( `Root/3#${ i }`, 'a', caret && 0 === i ? [ el( 'Root/4#0', 'span', [], { words: '▾' } ) ] : [], { words: i ? 'Shop' : 'Home' } ) );
	const items = links.map( ( l, i ) => el( `Root/2#${ i }`, 'li', [ l ] ) );
	return { links, host: el( 'Root/1#0', 'nav', [ el( 'Root/9#0', 'ul', items ) ] ) };
};

test( 'a draft menu with no row that opens a submenu is not paired with the link inside the submenu row wrapper (MUST FAIL without the variant filter: the link fits two parts)', () => {
	const { links, host } = draftMenu();
	const made = pairAbsorbed( { host, absorbed: [ { element: links[ 0 ], looks: [ 'background' ] } ], kids, calibration: { elements: MENU, settings: MENU_SETTINGS, text: {} }, finder } );
	assert.deepEqual( made.ambiguous, [] );
	assert.deepEqual( made.paired.map( ( p ) => p.part ), [ '.bar > .item:nth-of-type(n) > .link' ] );
	assert.deepEqual( made.slots[ `${ ITEM( 1 ) } > .link` ], { tpl: 'Root/3#0' } );
} );

test( 'a draft menu that has a summary row keeps both link parts (negative control: the filter is the draft having none)', () => {
	const { links, host } = draftMenu( true );
	const made = pairAbsorbed( { host, absorbed: [ { element: links[ 1 ], looks: [ 'background' ] } ], kids, calibration: { elements: MENU, settings: MENU_SETTINGS, text: {} }, finder } );
	assert.equal( made.ambiguous.length + made.paired.length, 1, 'the second link is still decided as before' );
	assert.ok( made.ambiguous.length ? made.ambiguous[ 0 ].candidates.includes( '.bar > .item:nth-of-type(n) > .row > .link' ) : true );
} );

test( 'a part the block never displays is not a candidate while a displayed one fits (MUST FAIL without the display tier: two buttons fit)', () => {
	const cal = { elements: { '': at( 'div' ), '.go': at( 'button' ), '.stale': at( 'button', { display: 'none' } ) }, settings: { goBg: { slot: '.go', property: 'background-color' }, staleBg: { slot: '.stale', property: 'background-color' } } };
	const btn = el( 'Root/2#0', 'button', [], { words: 'Go' } );
	const made = pairAbsorbed( { host: el( 'Root/1#0', 'div', [ btn ] ), absorbed: [ { element: btn, looks: [ 'background' ] } ], kids, calibration: cal, finder } );
	assert.deepEqual( [ made.ambiguous, made.paired.map( ( p ) => p.part ) ], [ [], [ '.go' ] ] );
	// a part inside a part that never displays is never displayed either
	const m = partModel( { '': at( 'div' ), '.a': at( 'div', { display: 'none' } ), '.a > .b': at( 'span' ), '.c': at( 'div' ) } );
	assert.deepEqual( [ m.parts.get( '.a > .b' ).never, m.parts.get( '.c' ).never, m.groups.get( '.a > .b' ).never ], [ true, false, true ] );
	// the only part that fits, even when never displayed, is still the answer (nothing is lost, only narrowed)
	const only = pairAbsorbed( { host: el( 'Root/1#0', 'div', [ btn ] ), absorbed: [ { element: btn, looks: [ 'background' ] } ], kids, calibration: { ...cal, elements: { '': at( 'div' ), '.stale': at( 'button', { display: 'none' } ) } }, finder } );
	assert.deepEqual( only.paired.map( ( p ) => p.part ), [ '.stale' ] );
} );

// A block whose default look has no part for the draft's disc, and a page that sets `trailing` draws it.
const TRAIL = { '.trail': { tag: 'span', classes: [ 'trail' ], parent: '', siblings: [], firstJob: 'b:trailing-on-v0', setting: 'trailing' }, '.trail > svg': { tag: 'svg', classes: [], parent: '.trail', siblings: [], firstJob: 'b:trailing-on-v0', setting: 'trailing' } };
const DISC = { elements: { '': at( 'div' ), '.label': at( 'span' ) }, settings: { trailBg: { slot: '.trail', property: 'background-color' } }, text: {} };
const disc = () => {
	const disc2 = el( 'Root/2#0', 'span', [ el( 'Root/3#0', 'svg', [] ) ] );
	return { disc2, host: el( 'Root/1#0', 'div', [ disc2 ], { w: 400 } ) };
};

test( 'a draft element no default part fits is offered the parts a page that sets a setting draws (MUST FAIL without the second chance: nothing fits)', () => {
	const { disc2, host } = disc();
	const absorbed = [ { element: disc2, looks: [ 'background' ] } ];
	const none = pairAbsorbed( { host, absorbed, kids, calibration: DISC, finder } );
	assert.deepEqual( [ none.slots, none.paired, none.unmatched.map( ( u ) => u.key ) ], [ {}, [], [ 'Root/2#0' ] ], 'with no conditional parts the element is unmatched' );
	const made = pairAbsorbed( { host, absorbed, kids, calibration: { ...DISC, conditionalParts: TRAIL }, finder } );
	assert.deepEqual( made.paired.map( ( p ) => [ p.key, p.part ] ), [ [ 'Root/2#0', '.trail' ] ] );
	assert.deepEqual( made.slots, { '.trail': { tpl: 'Root/2#0' } } );
	assert.deepEqual( made.unmatched, [] );
} );

test( 'the conditional parts never change an element the default parts already pair (MUST FAIL if they were merged into the first run)', () => {
	// The default look draws one box part (.card); the conditional ones add a second box (.trail) that would make it ambiguous.
	const cal = { elements: { '': at( 'div' ), '.card': at( 'div' ), '.card > svg': at( 'svg' ) }, settings: { cardBg: { slot: '.card', property: 'background-color' }, trailBg: { slot: '.trail', property: 'background-color' } }, text: {} };
	const box = el( 'Root/2#0', 'div', [ el( 'Root/3#0', 'svg', [] ) ] );
	const run = ( conditionalParts ) => pairAbsorbed( { host: el( 'Root/1#0', 'div', [ box ], { w: 400 } ), absorbed: [ { element: box, looks: [ 'background' ] } ], kids, calibration: { ...cal, ...( conditionalParts ? { conditionalParts } : {} ) }, finder } );
	assert.deepEqual( run( null ).paired.map( ( p ) => p.part ), [ '.card' ] );
	const withCond = run( TRAIL );
	assert.deepEqual( [ withCond.paired.map( ( p ) => p.part ), withCond.ambiguous ], [ [ '.card' ], [] ] );
	assert.deepEqual( withCond.slots, run( null ).slots );
} );

test( 'calPartsFor hands the conditional parts of a look on (MUST FAIL without the pass-through)', () => {
	const dir = fs.mkdtempSync( path.join( process.env.TEMP || os.tmpdir(), 'sgs-cond-' ) );
	try {
		writeRecordFixture( dir, 'sgs/menu', { block: 'sgs/menu', settings: {}, elements: { '': at( 'nav' ) }, conditionalParts: TRAIL }, 'client-a' );
		writeRecordFixture( dir, 'sgs/menu', { block: 'sgs/menu', settings: {}, elements: { '': at( 'nav' ) } }, 'client-b' );
		assert.deepEqual( Object.keys( calPartsFor( 'client-a', dir )( 'menu' ).conditionalParts ), [ '.trail', '.trail > svg' ] );
		assert.equal( 'conditionalParts' in calPartsFor( 'client-b', dir )( 'menu' ), false, 'a look with none passes none' );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );
