// Part-look's current-state looks (shop investigation F-16, lib/fill-part-look.mjs::lookRowsOf): a setting whose css_state is `current` is
// read from the element its part's own locator finds when that locator finds only the current element (a menu item marked aria-current,
// data/part-locators.json accountIn menuActive), as the hover reader reads a hovered one; every other state row stays unread. Planted
// rows, and one planted account menu read with the real locators: no site, no draft.
// Run: SGS_NO_SITE=1 node --test tests/part-look-current.test.mjs (from scripts/computed-route)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { after, before } from 'node:test';
import { READ_PROPS, buildLook, findPartsInPage, lookRowsOf, readsCurrent } from '../lib/fill-part-look.mjs';
import { loadChromium } from '../lib/fill-read.mjs';

const LOCATORS = JSON.parse( fs.readFileSync( new URL( '../data/part-locators.json', import.meta.url ), 'utf8' ) );
const GROUP = LOCATORS.groups.accountIn;
const row = ( attr, property, part, state = null ) => ( { attr_name: attr, attr_type: 'string', css_property: property, css_element: part, css_state: state, css_tier: null, is_responsive: 0, tier_shape: null, enum_values: null, default_value: null } );
const ROWS = [
	row( 'menuActiveTextColour', 'color', 'menuActive', 'current' ),
	row( 'menuActiveBackgroundColour', 'background-color', 'menuActive', 'current' ),
	row( 'menuActiveBackgroundColourGradient', 'background-image', 'menuActive', 'current' ),
	row( 'menuTextColourHover', 'color', 'menuLink', 'hover' ),
	row( 'menuActiveTextColourHover', 'color', 'menuActive', 'hover' ),
	row( 'menuTextColour', 'color', 'menuLink' ),
];
const writeOf = ( out, attr ) => out.writes.find( ( w ) => w.attr === attr );

test( 'MUST FAIL: a current-state row of a part whose locator finds the current element is read from that element', () => {
	assert.equal( readsCurrent( GROUP, 'menuActive' ), true );
	assert.deepEqual( lookRowsOf( ROWS, GROUP ).map( ( r ) => r.attr_name ), [ 'menuActiveTextColour', 'menuActiveBackgroundColour', 'menuActiveBackgroundColourGradient', 'menuTextColour' ] );
	const styles = { color: 'rgb(58, 42, 34)', 'background-color': 'rgb(249, 207, 110)' };
	const el = { key: 'k', tag: 'button', text: 'Orders', styles };
	const out = buildLook( { block: 'sgs/account', rows: ROWS, names: ROWS.map( ( r ) => r.attr_name ), locators: GROUP, reads: { menuActive: { 1440: [ el ], 768: [ el ], 375: [ el ] } } } );
	assert.equal( writeOf( out, 'menuActiveTextColour' ).value, '#3A2A22' );
	assert.equal( writeOf( out, 'menuActiveBackgroundColour' ).value, '#F9CF6E' );
	assert.equal( out.settings.menuActiveBackgroundColourGradient.code, 'unsupported', 'a gradient is no look the route reads' );
	assert.equal( out.settings.menuActiveTextColourHover.code, 'state', 'a hover row of the current item is still not read from its resting look' );
	assert.equal( out.noSetting.filter( ( n ) => 'menuActive' === n.part ).length, 0, 'the current item\'s other looks are the menu item\'s' );
} );

test( 'negative control: a hover row, and a current row whose locator finds every item, stay unread', () => {
	const locators = { anchors: {}, parts: { thumb: { from: 'page', match: { repeats: true } }, alias: { sameAs: 'thumb' } } };
	const rows = [ row( 'thumbBorderCurrent', 'border-color', 'thumb', 'current' ), row( 'aliasColourCurrent', 'color', 'alias', 'current' ), row( 'thumbColourHover', 'color', 'thumb', 'hover' ) ];
	assert.equal( readsCurrent( locators, 'alias' ), false );
	const el = { key: 'k', tag: 'button', text: 'x', styles: { color: 'rgb(0, 0, 0)' } };
	const out = buildLook( { block: 'sgs/buybox', rows, names: rows.map( ( r ) => r.attr_name ), locators, reads: { thumb: { 1440: [ el ] }, alias: { 1440: [ el ] } } } );
	assert.deepEqual( out.writes, [] );
	assert.deepEqual( Object.values( out.settings ).map( ( s ) => s.code ), [ 'state', 'state', 'state' ] );
	const named = { anchors: { cur: { from: 'page', match: { ariaCurrent: true } } }, parts: { item: { sameAs: 'cur' } } };
	assert.equal( readsCurrent( named, 'item' ), true, 'a locator naming an anchor that finds the current element reads it' );
} );

let browser;
let page;
before( async () => {
	const { chromium } = await loadChromium();
	browser = await chromium.launch( { headless: true } );
	page = await ( await browser.newContext( { viewport: { width: 1200, height: 900 } } ) ).newPage();
} );
after( async () => {
	await browser?.close();
} );

const tab = ( label, current ) => `<button${ current ? ' aria-current="page" style="display:flex;height:52px;background:#F9CF6E;color:#3A2A22"' : ' style="display:flex;height:52px;color:#5A4A42"' }><span>${ label }</span><span><span>2</span></span></button>`;
const PAGE = `<!doctype html><body style="margin:0;font:16px sans-serif"><main><section><div style="display:grid;grid-template-columns:260px 1fr"><nav style="width:260px">${ tab( 'One', true ) }${ tab( 'Two' ) }${ tab( 'Three' ) }<button style="height:48px">Leave</button></nav><div><h2>Orders</h2></div></div></section></main></body>`;

test( 'MUST FAIL: the account menu\'s current tab, located by the real locators, gives its yellow fill and cocoa text to the current-state settings', async () => {
	await page.setContent( PAGE );
	const found = await page.evaluate( findPartsInPage, { spec: { anchors: GROUP.anchors, parts: GROUP.parts }, names: [ 'menuActive' ], props: READ_PROPS, pages: {} } );
	assert.deepEqual( found.menuActive.map( ( i ) => i.text ), [ 'One2' ] );
	const reads = { menuActive: { 1440: found.menuActive, 768: found.menuActive, 375: found.menuActive } };
	const out = buildLook( { block: 'sgs/account', rows: ROWS, names: ROWS.map( ( r ) => r.attr_name ), locators: GROUP, reads } );
	assert.equal( writeOf( out, 'menuActiveBackgroundColour' ).value, '#F9CF6E' );
	assert.equal( writeOf( out, 'menuActiveTextColour' ).value, '#3A2A22' );
} );
