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
<button data-dc-tpl="70" style="color:rgb(30, 42, 60)">Control</button>
<button data-dc-tpl="90" style="color:rgb(30, 42, 60)">Late</button></nav>
<div class="p" id="a" data-dc-tpl="80">A panel</div><div class="p" id="b" data-dc-tpl="81">B panel</div><div class="p" id="c" data-dc-tpl="82">C panel</div></div>
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
// The Late item shows its tint and panel 300 ms after the pointer arrives (a hover-intent timer) and cancels the timer when it leaves.
const late = document.querySelector( '[data-dc-tpl="90"]' );
let lateTimer = null;
const lateShut = () => {
	clearTimeout( lateTimer );
	late.style.color = 'rgb(30, 42, 60)';
	document.getElementById( 'c' ).classList.remove( 'on' );
};
late.__reactProps$t = { onMouseEnter: () => {
	lateTimer = setTimeout( () => {
		late.style.color = 'rgb(10, 126, 168)';
		document.getElementById( 'c' ).classList.add( 'on' );
	}, 300 );
}, onMouseLeave: lateShut };
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

const JOBS = [ { id: 'about', finder: { tpl: 'Page/47#0' } }, { id: 'contact', finder: { tpl: 'Page/47#2' } }, { id: 'tint', finder: { tpl: 'Page/60#0' } }, { id: 'control', finder: { tpl: 'Page/70#0' } }, { id: 'late', finder: { tpl: 'Page/90#0' } } ];

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

test( 'MUST FAIL: a panel a timer opens 300 ms after the pointer arrives is still read as the open-panel look', async () => {
	const { out, after } = await readPlanted();
	const l = out.looks.late;
	assert.ok( l, 'the read waits for the panel to open' );
	assert.equal( l[ 0 ].script.kind, 'open-panel' );
	assert.deepEqual( l[ 0 ].states, [ 'open' ] );
	assert.equal( l[ 0 ].rendered.color, 'rgb(10, 126, 168)' );
	assert.equal( out.looks.control, undefined, 'a handler that shows nothing is still no look, after the wait' );
	assert.equal( after.tint, 'rgb(30, 42, 60)', 'the page is put back' );
} );

// An opener's open look of a property the block holds no open setting for (sgs/nav-bar-menu has itemBorderColourHover and no open
// border colour), as the planted draft's Late item shows it.
const openLook = ( items ) => [ { states: [ 'open' ], family: 'script', selector: 'script hover (Page/90)', tokens: [], declared: { 'border-bottom-color': 'rgb(20, 20, 20)' }, rendered: { 'border-bottom-color': 'rgb(20, 20, 20)' }, read: 'script', script: { kind: 'open-panel', events: [ 'hover' ], element: 'Page/90', items } } ];
const one = [ { copy: 0, label: 'Late', look: true } ];

test( 'MUST FAIL: an opener open-panel look the block holds no open setting for is written through the hover setting', () => {
	const nav = fillOne( 'sgs/nav-bar-menu', [ 'itemBorderColourHover' ], openLook( one ) );
	assert.deepEqual( nav.writes.map( ( w ) => [ w.attr, w.state, w.script ] ), [ [ 'itemBorderColourHover', 'hover', 'open-panel' ] ] );
	assert.deepEqual( nav.unmapped.filter( ( u ) => 'border-bottom-color' === u.property ), [] );
} );

test( 'negative controls: an open setting the block holds, a copy without the look, a property with no hover setting and a hover look of its own keep the row', () => {
	// The block holds an open colour setting (uncalibrated here): the row says so, nothing goes to the hover setting.
	const held = fillOne( 'sgs/nav-bar-menu', [ 'itemColourHover' ], [ { ...openLook( one )[ 0 ], declared: { color: 'rgb(10, 126, 168)' }, rendered: { color: 'rgb(10, 126, 168)' } } ] );
	assert.equal( held.writes.length, 0 );
	assert.match( held.unmapped.find( ( u ) => 'color' === u.property ).reason, /not calibrated/ );
	// A copy of the repeated element has no look: a block-wide hover setting would paint it too.
	const mixed = fillOne( 'sgs/nav-bar-menu', [ 'itemBorderColourHover' ], openLook( [ ...one, { copy: 1, label: 'Contact', look: false } ] ) );
	assert.equal( mixed.writes.length, 0 );
	assert.match( mixed.unmapped[ 0 ].reason, /^script-look: open on Page\/90 \(open-panel look\): no-setting/ );
	// No hover setting for the property either.
	const none = fillOne( 'sgs/nav-bar-menu', [ 'itemColourHover' ], openLook( one ) );
	assert.equal( none.writes.length, 0 );
	assert.equal( none.unmapped.filter( ( u ) => 'border-bottom-color' === u.property ).length, 1 );
	// The draft's own hover look for the same property on the element: one setting cannot hold both.
	const both = fillOne( 'sgs/nav-bar-menu', [ 'itemBorderColourHover' ], [ ...openLook( one ), { states: [ 'hover' ], family: 'stylesheet', selector: 'a:hover', tokens: [], declared: { 'border-bottom-color': 'rgb(1, 2, 3)' }, rendered: { 'border-bottom-color': 'rgb(1, 2, 3)' }, read: 'stylesheet' } ] );
	assert.deepEqual( both.writes.map( ( w ) => [ w.attr, w.state, w.script ?? null ] ), [ [ 'itemBorderColourHover', 'hover', null ] ] );
} );

// openAsHover (lib/fill-state-script.mjs): an open-panel look is a hover look only when the draft's handler that opened the panel
// follows the pointer; a panel a focus alone opens is not shown on hover. No browser: the decision on a script record.
import { openAsHover } from '../lib/fill-state-script.mjs';
const asHover = ( events ) => openAsHover( { script: { kind: 'open-panel', events, items: [ { look: true } ] }, state: 'open', held: new Set( [ 'hover' ] ), hasHover: true, hasOpen: false, hoverLook: false } );

test( 'MUST FAIL: an open-panel look opened by focus alone is not written through the hover setting', () => {
	assert.equal( asHover( [ 'focus' ] ), false );
} );

test( 'negative controls: a pointer-opened panel, or one both events open, is still a hover look', () => {
	assert.equal( asHover( [ 'hover' ] ), true );
	assert.equal( asHover( [ 'hover', 'focus' ] ), true );
	assert.equal( asHover( undefined ), false );
} );
