// Spec 48 FR-48-81's done-when for the states wave: a planted draft using the states the coverage map now covers raises
// no seen-but-unsupported row (FR-48-34), and with only one entry's `write` reference removed the same draft raises that
// row again. The draft is read through the real usage read (lib/intake-usage.mjs::draftUsage) and judged against the real
// coverage map by intake's missing-features rule (lib/intake-missing.mjs::coverageMissing). The same page is then read
// by the real state reader (lib/fill-state-read.mjs::readStates) in a browser and written by lib/fill-state.mjs::fillStates
// into real framework DB settings, so a reference that points at a writer that writes nothing is found.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { allEntries, readInventoryFile } from '../lib/capabilities.mjs';
import { draftUsage } from '../lib/intake-usage.mjs';
import { coverageMissing } from '../lib/intake-missing.mjs';
import { loadCoverage } from '../lib/clone-coverage.mjs';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { openDevtools, declaredValues } from '../../parity/lib/devtools.mjs';
import { readStates } from '../lib/fill-state-read.mjs';
import { fillStates } from '../lib/fill-state.mjs';
import { resolveProperty } from '../lib/fill-prop.mjs';
import { openDb, statesVocabulary } from '../lib/db.mjs';

let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( async () => {
	await browser?.close();
} );

const db = openDb();
const VOCAB = statesVocabulary( db ).rows;
const RESOLVE = resolveFinder.toString();
const KNOWN = new Set( allEntries( readInventoryFile() ).map( ( e ) => e.id ) );
const snapshot = { palette: [], spacing: [], fontSizes: [] };

const CSS = [
	'.btn{color:rgb(10,10,10)} .btn:hover{color:rgb(200,0,0)} .btn:focus-visible{color:rgb(200,0,0)}',
	'.shov{color:rgb(0,0,0)} .shov:hover{color:rgb(0,0,200) !important}',
	'.crumb{color:rgb(0,0,0)} .crumb[aria-current="page"]{color:rgb(0,128,0)}',
	'.tab{color:rgb(0,0,0)} .tab[aria-selected="true"]{color:rgb(0,0,201)}',
	'.tog{color:rgb(0,0,0)} .tog[aria-pressed="true"]{color:rgb(1,2,3)}',
	'.rad{color:rgb(0,0,0)} .rad[aria-checked="true"]{color:rgb(4,5,6)}',
	'.pill{appearance:none;background-color:rgb(250,250,250)} .pill:checked{background-color:rgb(7,8,9)}',
	'.hdr{color:rgb(0,0,0)} .hdr[aria-expanded="true"]{color:rgb(9,0,9)}',
	'.acc>summary{background-color:rgb(240,240,240)} .acc:open>summary{background-color:rgb(8,8,0)}',
	'.dis{color:rgb(0,0,0)} .dis:disabled{color:rgb(150,150,150)}',
	'.slot{color:rgb(0,0,0)} .slot:empty{color:rgb(33,44,55)}',
	'#pop{background-color:rgb(9,9,9)} #pop:popover-open{background-color:rgb(1,2,3)}',
	'#dlg{background-color:rgb(9,9,9)} #dlg:modal{background-color:rgb(3,2,1)}',
	'.lnk{color:rgb(0,0,0)} .lnk:link{color:rgb(5,5,5)} .lnk:any-link{color:rgb(6,6,6)} .lnk:visited{color:rgb(7,7,7)} .lnk:active{color:rgb(8,8,8)}',
	'.lnk:focus{outline-color:rgb(0,9,0)} .box:focus-within{outline-color:rgb(0,0,9)} #t1:target{color:rgb(2,2,2)}',
	'.dec{color:rgb(0,0,0)} .dec[aria-hidden="true"]{color:rgb(3,3,3)}',
].join( '\n' );
// [ tag, attributes, inner html ]
const ELEMENTS = [
	[ 'button', { class: 'btn' }, 'Buy' ], [ 'button', { class: 'shov' }, 'Compiled' ], [ 'a', { class: 'crumb', href: '#c' }, 'Crumb' ],
	[ 'button', { class: 'tab', role: 'tab', 'aria-selected': 'false' }, 'Tab' ], [ 'button', { class: 'tog', 'aria-pressed': 'false' }, 'Toggle' ],
	[ 'button', { class: 'rad', role: 'radio', 'aria-checked': 'false' }, 'Radio' ], [ 'input', { class: 'pill', type: 'checkbox' }, '' ],
	[ 'button', { class: 'hdr', 'aria-expanded': 'false', 'aria-controls': 'p1' }, 'Header' ], [ 'details', { class: 'acc' }, '<summary class="sum">More</summary>Body' ],
	[ 'button', { class: 'dis' }, 'Go' ], [ 'div', { class: 'slot' }, '' ], [ 'div', { id: 'pop', popover: '' }, 'Pop' ], [ 'dialog', { id: 'dlg' }, 'Dialog' ],
	[ 'a', { class: 'here', href: '#h', 'aria-current': 'page' }, 'Here' ], [ 'a', { class: 'lnk', href: '#x' }, 'Link' ], [ 'div', { class: 'box', id: 't1' }, '<span class="dec" aria-hidden="true">x</span>' ],
];
const VOID = new Set( [ 'input' ] );
const attrText = ( a ) => Object.entries( a ).map( ( [ k, v ] ) => ( '' === v ? k : `${ k }="${ v }"` ) ).join( ' ' );
const HTML = `<!doctype html><html><head><style>${ CSS }</style></head><body>${ ELEMENTS.map( ( [ t, a, h ] ) => ( VOID.has( t ) ? `<${ t } ${ attrText( a ) }>` : `<${ t } ${ attrText( a ) }>${ h }</${ t }>` ) ).join( '' ) }</body></html>`;
const STAMPED = [ { n: '1', tag: 'style', attrs: [], body: CSS }, ...ELEMENTS.map( ( [ tag, a ], i ) => ( { n: String( i + 2 ), tag, attrs: Object.entries( a ) } ) ), { n: '99', tag: 'span', attrs: [ [ 'aria-hidden', 'true' ] ] } ];
const SOURCES = [ { component: 'Page', stamped: { elements: STAMPED } } ];
// The census rows the construct entries are judged by: a compiled `style-hover` attribute and a template `sc-if`.
const CENSUS = { rows: [ { kind: 'style-hover', draftId: 'Page:3', detail: { pseudo: 'hover', value: 'color:#00c' } }, { kind: 'sc-if', draftId: 'Page:4' } ] };
const rowsFor = ( coverage ) => coverageMissing( { census: CENSUS, coverage, usage: draftUsage( { sources: SOURCES, known: KNOWN } ).usage } );

// Every state id the planted draft uses. COVERED have a write reference; OPEN are used by the draft but have no writer yet
// (the draftUsage test below proves the draft uses them; no row is asserted for them).
const PSEUDO = [ 'hover', 'checked', 'disabled', 'empty', 'open' ].map( ( n ) => `css-pseudo-class:${ n }` );
const ARIA = [ 'expanded', 'current', 'selected', 'pressed', 'checked' ].map( ( n ) => `aria-attr:aria-${ n }` );
const COVERED = [ ...PSEUDO, ...ARIA, 'construct:style-hover' ];
const OPEN = [ ...[ 'active', 'any-link', 'focus', 'focus-visible', 'focus-within', 'link', 'modal', 'popover-open', 'target', 'visited' ].map( ( n ) => `css-pseudo-class:${ n }` ), 'aria-attr:aria-hidden', 'construct:sc-if' ];

test( 'the planted draft uses every states capability it is meant to (so the tests below are not vacuous)', () => {
	const { usage, problems } = draftUsage( { sources: SOURCES, known: KNOWN } );
	assert.deepEqual( problems, [] );
	for ( const id of [ ...COVERED, ...OPEN ].filter( ( x ) => ! x.startsWith( 'construct:' ) ) ) {
		assert.ok( usage.has( id ), `${ id } is read from the draft` );
	}
	assert.deepEqual( [ 'construct:style-hover', 'construct:sc-if' ].filter( ( id ) => ! rowsFor( { entries: {} } ).some( ( r ) => r.construct === id ) ), [], 'both constructs are in the census rows' );
} );

test( 'MUST FAIL: the draft raises no seen-but-unsupported row for a covered state, and raises it again with only its write reference removed', () => {
	const coverage = loadCoverage();
	const raised = new Set( rowsFor( coverage ).map( ( r ) => r.construct ) );
	for ( const id of COVERED ) {
		const e = coverage.entries[ id ];
		assert.ok( e.recognise && e.write && e.check, `${ id } names recognise, write and check` );
		assert.ok( ! raised.has( id ), `${ id } raises no row while covered` );
		const nulled = { ...coverage, entries: { ...coverage.entries, [ id ]: { ...e, write: null, wave: 'states' } } };
		const row = rowsFor( nulled ).find( ( r ) => r.construct === id );
		assert.ok( row, `${ id } raises its row again with its write reference removed` );
		assert.match( row.why, /has recognise, check; wave states/, 'only the write reference was removed' );
		assert.equal( rowsFor( { ...coverage, entries: { ...coverage.entries, [ id ]: { ...e, recognise: null, wave: 'states' } } } ).some( ( r ) => r.construct === id ), true, `${ id }: its recognise reference is load-bearing too` );
		assert.equal( rowsFor( { ...coverage, entries: { ...coverage.entries, [ id ]: { ...e, check: null, wave: 'states' } } } ).some( ( r ) => r.construct === id ), true, `${ id }: its check reference is load-bearing too` );
	}
	assert.ok( COVERED.length >= 3 );
} );

// The blocks whose settings hold each state, and the setting the planted look must land on: [ finder, block, state, prop, attr ].
const CASES = [
	[ '.btn', 'sgs/button', 'hover', 'color', 'colourTextHover' ],
	[ '.shov', 'sgs/button', 'hover', 'color', 'colourTextHover' ],
	[ '.crumb', 'sgs/nav-bar-menu', 'current', 'color', 'itemColourCurrent' ],
	[ '.tab', 'sgs/tabs', 'current', 'color', 'tabActiveTextColour' ],
	[ '.tog', 'sgs/theme-toggle', 'current', 'color', 'textColourPressed' ],
	[ '.rad', 'sgs/option-picker', 'current', 'color', 'pillSelectedTextColour' ],
	[ '.pill', 'sgs/product-card', 'current', 'background-color', 'pickerPillSelectedBgColour' ],
	[ '.hdr', 'sgs/accordion', 'open', 'color', 'headerColourOpen' ],
	[ '.sum', 'sgs/accordion', 'open', 'background-color', 'headerBackgroundOpen' ],
	[ '.dis', 'sgs/nav-bar-menu', 'disabled', 'color', 'itemDisabledColour' ],
];
const setting = ( property, state ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state, forms: [], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ] } );
// A calibration holding the real settings of the block that paint a CSS property (from block_attributes): the ones the
// cases name and the resting colour, so a property is not ambiguous between a text and an icon colour.
const NAMED = new Set( [ ...CASES.map( ( c ) => c[ 4 ] ), 'colourText' ] );
const calFor = ( block ) => ( {
	elements: { '': {} },
	settings: Object.fromEntries( db.prepare( 'SELECT attr_name, css_property, css_state FROM block_attributes WHERE block_slug = ? AND css_property IS NOT NULL' ).all( block ).filter( ( r ) => NAMED.has( r.attr_name ) ).map( ( r ) => [ r.attr_name, setting( r.css_property, r.css_state ) ] ) ),
} );

async function readPlanted() {
	const page = await browser.newPage( { viewport: { width: 800, height: 600 } } );
	await page.setContent( HTML );
	const cdp = await openDevtools( page );
	const ids = [ ...CASES.map( ( c ) => c[ 0 ] ), '#pop', '#dlg', '.lnk', '.slot', '.box' ];
	const jobs = ids.map( ( f ) => ( { id: f, finder: f } ) );
	const rest = {};
	for ( const j of jobs ) {
		rest[ j.id ] = await declaredValues( cdp, j.finder, RESOLVE, null );
	}
	const result = await readStates( { page, cdp, jobs, rows: VOCAB, rest, resolveSrc: RESOLVE } );
	await page.close();
	return { result, rest };
}

function fillPlanted( result, extra = [] ) {
	const all = [ ...CASES.map( ( c ) => [ c[ 0 ], c[ 1 ] ] ), ...extra ];
	const tree = all.map( ( [ , block ], i ) => ( { name: block, attributes: { className: `cr-ref-x-${ i }` }, innerBlocks: [] } ) );
	const nodes = all.map( ( [ finder, name ], index ) => ( { index, name, targets: [ { id: finder, slot: '' } ] } ) );
	const reads = { states: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, result ] ) ) };
	return { ...fillStates( { tree, nodes, reads, calFor, db, snapshot } ), tree };
}

test( 'MUST FAIL WITHOUT THE WRITER: fillStates writes every planted state look into the setting that holds that state', async () => {
	const { result } = await readPlanted();
	const out = fillPlanted( result );
	for ( const [ finder, block, state, prop, attr ] of CASES ) {
		const w = out.writes.find( ( x ) => x.block === block && x.slot === '' && x.attr === attr );
		assert.ok( w, `${ finder } (${ state }) is written to ${ block }.${ attr }; unmapped: ${ JSON.stringify( out.unmapped.filter( ( u ) => u.block === block ) ) }` );
		assert.equal( w.state, state );
		assert.equal( w.prop, prop );
		assert.ok( out.tree[ CASES.findIndex( ( c ) => c[ 0 ] === finder ) ].attributes[ attr ], `${ attr } is in the tree` );
	}
} );

test( 'negative control: with the state vocabulary missing the checked and aria-current tokens, those looks are not read, so nothing is written', async () => {
	const keep = VOCAB;
	const page = await browser.newPage();
	await page.setContent( HTML );
	const cdp = await openDevtools( page );
	const jobs = [ { id: '.crumb', finder: '.crumb' }, { id: '.pill', finder: '.pill' } ];
	const rest = {};
	for ( const j of jobs ) {
		rest[ j.id ] = await declaredValues( cdp, j.finder, RESOLVE, null );
	}
	const rows = keep.filter( ( r ) => ! [ '[aria-current]', ':checked' ].includes( r.token ) );
	const result = await readStates( { page, cdp, jobs, rows, rest, resolveSrc: RESOLVE } );
	await page.close();
	assert.deepEqual( result.looks, {} );
} );

test( 'a keyboard-focus look that paints like hover is held by the hover write; a different one is a named gap, not a write', async () => {
	const { result } = await readPlanted();
	const out = fillPlanted( result );
	assert.ok( out.held.some( ( h ) => '.btn' === CASES.find( ( c ) => c[ 4 ] === 'colourTextHover' )?.[ 0 ] && 'focus' === h.state ), 'focus equal to hover is held' );
	const other = { states: { 375: { looks: { '.f': [ { states: [ 'hover' ], declared: { color: 'rgb(1, 1, 1)' }, rendered: { color: 'rgb(1, 1, 1)' } }, { states: [ 'focus' ], declared: { color: 'rgb(2, 2, 2)' }, rendered: { color: 'rgb(2, 2, 2)' } } ] } } } };
	const tree = [ { name: 'sgs/button', attributes: { className: 'cr-ref-x-0' }, innerBlocks: [] } ];
	const r = fillStates( { tree, nodes: [ { index: 0, name: 'sgs/button', targets: [ { id: '.f', slot: '' } ] } ], reads: other, calFor, db, snapshot } );
	assert.match( r.unmapped.find( ( u ) => 'focus' === u.state )?.reason || '', /^focus-differs/ );
} );

test( 'the open look of a popover or dialog panel has no setting that holds it (why :popover-open and :modal stay open)', async () => {
	const { result } = await readPlanted();
	assert.ok( ( result.looks[ '#pop' ] || [] ).some( ( l ) => l.states.includes( 'open' ) ), 'the reader enters the popover and reads its look' );
	assert.ok( ( result.looks[ '#dlg' ] || [] ).some( ( l ) => l.states.includes( 'open' ) ), 'the reader enters the dialog modally and reads its look' );
	const out = fillPlanted( result, [ [ '#pop', 'sgs/modal' ], [ '#dlg', 'sgs/modal' ] ] );
	assert.ok( out.unmapped.filter( ( u ) => u.block === 'sgs/modal' ).every( ( u ) => /^no-state-setting/.test( u.reason ) ), 'the panel look is a named gap' );
	assert.equal( out.writes.filter( ( w ) => 'sgs/modal' === w.block ).length, 0 );
} );

test( ':empty matches at rest: the resting read holds its look and the resting resolver writes it; a non-empty element holds none', async () => {
	const page = await browser.newPage( { viewport: { width: 800, height: 600 } } );
	await page.setContent( `${ HTML }<div class="slot" id="full">text</div>` );
	const cdp = await openDevtools( page );
	const empty = await declaredValues( cdp, '.slot', RESOLVE, null );
	const full = await declaredValues( cdp, '#full', RESOLVE, null );
	await page.close();
	assert.equal( empty.color, 'rgb(33, 44, 55)', 'the :empty rule is in the resting read of the empty element' );
	assert.equal( full.color, 'rgb(0, 0, 0)', 'a non-empty element does not match :empty' );
	const node = { name: 'sgs/button', attributes: {}, innerBlocks: [] };
	const res = resolveProperty( { node, block: 'sgs/button', prop: 'color', draft: { 375: empty.color, 768: empty.color, 1440: empty.color }, baseline: () => undefined, slots: [ '' ], calibration: calFor( 'sgs/button' ), db, snapshot, log: [], state: null } );
	assert.equal( res.status, 'written' );
	assert.ok( res.writes.some( ( w ) => 'colourText' === w.attr ), 'written to the resting colour setting' );
} );
