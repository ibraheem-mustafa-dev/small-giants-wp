// The current item of a repeated list (lib/fill-current-item.mjs): the fact record names the loop's current condition, the
// reader compares the copy that shows it with a copy that does not, and fillStates writes the difference into the nav block's
// `current` setting. MUST FAIL: with no group, or no comparison copy, nothing is written.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { openDevtools } from '../../parity/lib/devtools.mjs';
import { currentItemGroups, groupOfJob, currentSelectors, readCurrentItems } from '../lib/fill-current-item.mjs';
import { fillStates } from '../lib/fill-state.mjs';
import { openDb } from '../lib/db.mjs';

const RESOLVE = resolveFinder.toString();
const db = openDb();
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( async () => {
	await browser?.close();
} );

const bools = [ { t: 'boolean', v: true }, { t: 'boolean', v: false } ];
const holes = { 'attr:value#0': { 375: { v: bools, n: 3, loop: true } } };
const el = ( over ) => ( { template: { tag: 'div', holes: [], membership: { scIf: [], scFor: [] }, ...over }, logic: { holes: {} } } );
const FACTS = {
	elements: {
		'Page/47': el( { tag: 'button' } ),
		'Page/51': { template: { tag: 'sc-if', holes: [ { id: 'attr:value#0', where: 'attr:value', expr: 'item.current', path: 'item.current', whole: true } ], parent: 'Page/47', realParent: 'Page/47', membership: { scIf: [], scFor: [ { key: 'Page/46', list: '{{ items }}', as: 'item' } ] } }, logic: { holes } },
		'Page/52': el( { tag: 'span', parent: 'Page/51', realParent: 'Page/47' } ),
	},
};
const HTML = `<!doctype html><style>.it{font-weight:600;color:rgb(10,10,10);background-color:rgb(255,255,255)} .it.cur{color:rgb(10,126,168);background-color:rgb(234,244,247)}</style>
<div class="sc-host" data-sc-name="Page"><nav>
<button class="it" data-dc-tpl="47">Home</button>
<button class="it cur" data-dc-tpl="47">About<span data-dc-tpl="52" style="display:block;height:2px"></span></button>
<button class="it" data-dc-tpl="47">Contact</button></nav></div>`;
const JOB = { id: '0:', finder: { tpl: 'Page/47#0' } };

test( 'the fact record names the current-item group, and only a loop condition answered both ways', () => {
	const g = currentItemGroups( FACTS );
	assert.equal( g.length, 1 );
	assert.deepEqual( [ g[ 0 ].itemKey, g[ 0 ].markKey, g[ 0 ].path ], [ 'Page/47', 'Page/52', 'item.current' ] );
	assert.equal( groupOfJob( g, JOB ), g[ 0 ] );
	assert.equal( groupOfJob( g, { id: 'x', finder: { tpl: 'Page/9#0' } } ), undefined );
	const once = structuredClone( FACTS );
	once.elements[ 'Page/51' ].logic.holes = { 'attr:value#0': { 375: { v: [ { t: 'boolean', v: true } ], n: 1, loop: true } } };
	assert.deepEqual( currentItemGroups( once ), [], 'a condition true in every copy marks no item' );
	const outside = structuredClone( FACTS );
	outside.elements[ 'Page/51' ].template.membership.scFor = [];
	assert.deepEqual( currentItemGroups( outside ), [], 'outside a loop it is no list item' );
	const notIf = structuredClone( FACTS );
	notIf.elements[ 'Page/51' ].template.tag = 'div';
	assert.deepEqual( currentItemGroups( notIf ), [], 'only an sc-if is a condition' );
	assert.match( currentSelectors( g[ 0 ] ).current, /:has\(\[data-dc-tpl="52"\]\)/ );
} );

async function readPlanted( groups, html = HTML ) {
	const page = await browser.newPage( { viewport: { width: 800, height: 600 } } );
	await page.setContent( html );
	const cdp = await openDevtools( page );
	const out = await readCurrentItems( { page, cdp, jobs: [ JOB ], groups, resolveSrc: RESOLVE } );
	await page.close();
	return out;
}

test( 'MUST FAIL WITHOUT THE READER: the current copy is read against a non-current copy and fillStates writes it to the current setting', async () => {
	const { looks, gaps } = await readPlanted( currentItemGroups( FACTS ) );
	const l = looks[ JOB.id ];
	assert.equal( l.length, 1 );
	assert.deepEqual( l[ 0 ].states, [ 'current' ] );
	assert.equal( l[ 0 ].declared.color, 'rgb(10, 126, 168)' );
	assert.equal( l[ 0 ].declared[ 'font-weight' ], undefined, 'a value both copies share is no look' );
	assert.equal( l[ 0 ].declared[ 'background-color' ], 'rgb(234, 244, 247)' );
	assert.ok( gaps.some( ( x ) => /^current-indicator/.test( x.reason ) ), 'the underline is listed, not dropped' );
	const setting = ( property, state ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state, forms: [], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ] } );
	const named = new Set( [ 'itemColourCurrent', 'itemBgCurrent' ] );
	const rows = db.prepare( 'SELECT attr_name, css_property, css_state FROM block_attributes WHERE block_slug = ? AND css_property IS NOT NULL' ).all( 'sgs/nav-bar-menu' );
	const cal = { elements: { '': {} }, settings: Object.fromEntries( rows.filter( ( r ) => named.has( r.attr_name ) ).map( ( r ) => [ r.attr_name, setting( r.css_property, r.css_state ) ] ) ) };
	const tree = [ { name: 'sgs/nav-bar-menu', attributes: { className: 'cr-ref-n-0' }, innerBlocks: [] } ];
	const nodes = [ { index: 0, name: 'sgs/nav-bar-menu', targets: [ { id: JOB.id, slot: '' } ] } ];
	const reads = { states: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { looks } ] ) ) };
	const res = fillStates( { tree, nodes, reads, calFor: () => cal, db, snapshot: { palette: [], spacing: [], fontSizes: [] } } );
	assert.deepEqual( res.writes.map( ( w ) => w.attr ).sort(), [ 'itemBgCurrent', 'itemColourCurrent' ] );
} );

test( 'a page with no group, or no non-current copy, reads no look', async () => {
	assert.deepEqual( ( await readPlanted( [] ) ).looks, {} );
	const out = await readPlanted( currentItemGroups( FACTS ), HTML.replace( /<button class="it" data-dc-tpl="47">(Home|Contact)<\/button>/g, '' ) );
	assert.deepEqual( out.looks, {} );
	assert.match( out.gaps[ 0 ].reason, /no non-current copy/ );
} );
