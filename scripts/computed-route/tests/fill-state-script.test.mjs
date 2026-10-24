// The looks a draft sets from its script (lib/fill-state-script.mjs): a pointer or focus handler changes state that the
// element's style holes read. MUST FAIL: the stylesheet reader alone (lib/fill-state-read.mjs::readStates) reads none of
// them; with the script reader each item's look is read on its own copy, an item whose handler changes nothing on it gets
// none, the look's kind follows whether the event shows a panel, and fillStates writes or raises it by the setting states
// the block holds.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { openDevtools } from '../../parity/lib/devtools.mjs';
import { readStates } from '../lib/fill-state-read.mjs';
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

// A planted draft in the runtime's shape: handlers are React props on the element (`__reactProps$…`), called from
// delegated pointerover/mouseover/focusin listeners as React does. Items with a panel tint themselves and show their
// panel; Contact has no panel and only closes the others; the tint button changes its own colour and shows a mark inside itself, never a panel; the
// control's handler changes nothing visible.
const HTML = `<!doctype html><style>.p{display:none;height:40px}.p.on{display:block}</style>
<div class="sc-host" data-sc-name="Page"><nav>
<button data-dc-tpl="47" data-panel="a" style="background:transparent;color:rgb(30, 42, 60)">About</button>
<button data-dc-tpl="47" data-panel="b" style="background:transparent;color:rgb(30, 42, 60)">Sectors</button>
<button data-dc-tpl="47" style="background:transparent;color:rgb(30, 42, 60)">Contact</button>
<button data-dc-tpl="60" style="color:rgb(30, 42, 60)">Tint<span data-dc-tpl="61" style="display:none">_</span></button>
<button data-dc-tpl="70" style="color:rgb(30, 42, 60)">Control</button></nav>
<div class="p" id="a" data-dc-tpl="80">A panel</div><div class="p" id="b" data-dc-tpl="81">B panel</div></div>
<script>
const items = [ ...document.querySelectorAll( '[data-dc-tpl="47"]' ) ];
const open = ( el ) => {
	items.forEach( ( b ) => { b.style.background = 'transparent'; b.style.color = 'rgb(30, 42, 60)'; } );
	document.querySelectorAll( '.p' ).forEach( ( p ) => p.classList.remove( 'on' ) );
	if ( el.dataset.panel ) {
		el.style.background = 'rgba(10, 126, 168, 0.12)';
		el.style.color = 'rgb(10, 126, 168)';
		document.getElementById( el.dataset.panel ).classList.add( 'on' );
	}
};
const shut = () => open( { dataset: {} } );
items.forEach( ( b ) => ( b.__reactProps$t = { onMouseEnter: () => open( b ), onFocus: () => open( b ), onMouseLeave: shut, onBlur: shut } ) );
const tint = document.querySelector( '[data-dc-tpl="60"]' );
const mark = tint.firstElementChild;
tint.__reactProps$t = { onMouseEnter: () => { tint.style.color = 'rgb(200, 30, 30)'; mark.style.display = 'inline'; }, onMouseLeave: () => { tint.style.color = 'rgb(30, 42, 60)'; mark.style.display = 'none'; } };
const ctl = document.querySelector( '[data-dc-tpl="70"]' );
ctl.__reactProps$t = { onMouseEnter: () => ( ctl.dataset.seen = '1' ), onFocus: () => ( ctl.style.color = 'rgb(30, 42, 60)' ) };
const call = ( name ) => ( e ) => {
	for ( let n = e.target; n && n !== document; n = n.parentNode ) {
		n.__reactProps$t?.[ name ]?.( e );
	}
};
document.addEventListener( 'mouseover', call( 'onMouseEnter' ) );
document.addEventListener( 'mouseout', call( 'onMouseLeave' ) );
document.addEventListener( 'focusin', call( 'onFocus' ) );
document.addEventListener( 'focusout', call( 'onBlur' ) );
</script>`;

const JOBS = [ { id: 'about', finder: { tpl: 'Page/47#0' } }, { id: 'contact', finder: { tpl: 'Page/47#2' } }, { id: 'tint', finder: { tpl: 'Page/60#0' } }, { id: 'control', finder: { tpl: 'Page/70#0' } } ];

let readCache = null;
async function readPlanted() {
	if ( readCache ) {
		return readCache;
	}
	const page = await browser.newPage( { viewport: { width: 1200, height: 800 } } );
	await page.setContent( HTML );
	const cdp = await openDevtools( page );
	const out = await readStates( { page, cdp, jobs: JOBS, rows: [], rest: {}, resolveSrc: RESOLVE } );
	const after = await page.evaluate( () => ( { bg: document.querySelector( '[data-dc-tpl="47"]' ).style.background, shown: document.querySelectorAll( '.p.on' ).length, tint: document.querySelector( '[data-dc-tpl="60"]' ).style.color } ) );
	await page.close();
	readCache = { out, after };
	return readCache;
}

test( 'MUST FAIL WITHOUT THE SCRIPT READER: a panel item\'s script tint is read as its open-panel look, per item', async () => {
	const { out, after } = await readPlanted();
	const l = out.looks.about;
	assert.ok( l, 'the panel item has a script look' );
	assert.equal( l.length, 1, 'the pointer and focus events give one look' );
	assert.deepEqual( l[ 0 ].states, [ 'open' ] );
	assert.equal( l[ 0 ].read, 'script' );
	assert.equal( l[ 0 ].script.kind, 'open-panel' );
	assert.deepEqual( l[ 0 ].script.events.sort(), [ 'focus', 'hover' ] );
	assert.equal( l[ 0 ].rendered[ 'background-color' ], 'rgba(10, 126, 168, 0.12)' );
	assert.equal( l[ 0 ].rendered.color, 'rgb(10, 126, 168)' );
	assert.deepEqual( l[ 0 ].script.items.map( ( i ) => [ i.label, i.look ] ), [ [ 'About', true ], [ 'Sectors', true ], [ 'Contact', false ] ] );
	assert.equal( out.looks.contact, undefined, 'the item with no panel has no look' );
	assert.deepEqual( after, { bg: 'transparent', shown: 0, tint: 'rgb(30, 42, 60)' }, 'the page is put back' );
} );

test( 'MUST FAIL: a script look that shows nothing outside its element is a hover look; a handler that changes nothing visible gives none', async () => {
	const { out } = await readPlanted();
	assert.deepEqual( out.looks.tint?.map( ( l ) => [ l.states[ 0 ], l.script.kind, l.rendered.color ] ), [ [ 'hover', 'hover', 'rgb(200, 30, 30)' ] ] );
	assert.equal( out.looks.control, undefined );
} );

const setting = ( property, state ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state, forms: [], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ] } );
const calOf = ( block, names ) => {
	const rows = db.prepare( 'SELECT attr_name, css_property, css_state FROM block_attributes WHERE block_slug = ? AND css_property IS NOT NULL' ).all( block );
	return { elements: { '': {} }, settings: Object.fromEntries( rows.filter( ( r ) => names.includes( r.attr_name ) ).map( ( r ) => [ r.attr_name, setting( r.css_property, r.css_state ) ] ) ) };
};
const fillOne = ( block, names, looks ) => fillStates( {
	tree: [ { name: block, attributes: { className: 'cr-ref-n-0' }, innerBlocks: [] } ],
	nodes: [ { index: 0, name: block, targets: [ { id: 't', slot: '' } ] } ],
	reads: { states: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { looks: { t: looks } } ] ) ) },
	calFor: () => calOf( block, names ), db, snapshot: { palette: [], spacing: [], fontSizes: [] },
} );

test( 'MUST FAIL: fillStates raises an open-panel look no calibrated setting holds as script-look, and writes it where the block holds open', async () => {
	const { out } = await readPlanted();
	const nav = fillOne( 'sgs/nav-bar-menu', [ 'itemBgHover', 'itemColourHover' ], out.looks.about );
	assert.equal( nav.writes.length, 0, 'the hover settings never take the open look' );
	const rows = nav.unmapped.filter( ( u ) => 'open' === u.state );
	assert.deepEqual( rows.map( ( u ) => u.property ).sort(), [ 'background-color', 'color' ] );
	rows.forEach( ( u ) => assert.match( u.reason, /^script-look: open on Page\/47#0 \(open-panel look\): uncalibrated: sgs\/nav-bar-menu item(Bg|Colour)Open \(open\) not calibrated; items with it: About, Sectors; without it: Contact$/ ) );
	const acc = fillOne( 'sgs/accordion', [ 'headerBackgroundOpen', 'headerColourOpen' ], out.looks.about );
	assert.deepEqual( acc.writes.map( ( w ) => [ w.attr, w.state, w.script ] ).sort(), [ [ 'headerBackgroundOpen', 'open', 'open-panel' ], [ 'headerColourOpen', 'open', 'open-panel' ] ] );
	const hover = fillOne( 'sgs/nav-bar-menu', [ 'itemColourHover' ], out.looks.tint );
	assert.deepEqual( hover.writes.map( ( w ) => [ w.attr, w.state, w.script ] ), [ [ 'itemColourHover', 'hover', 'hover' ] ], 'a script hover look goes through the hover writer' );
} );
