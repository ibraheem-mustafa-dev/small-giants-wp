// T3's planted-draft proof (Spec 48 FR-48-50, FR-48-51, FR-48-14, FR-48-69, FR-48-1 row 8; handoff readers plan, Track T): a planted
// draft that uses each capability the T3 lane covers raises no seen-but-unsupported row (FR-48-34), and the same draft raises
// the row again with one write reference removed. The CSS groups are judged through the real usage read
// (lib/intake-usage.mjs::draftUsage) and the real coverage map by intake's missing-features rule (lib/intake-missing.mjs::coverageMissing).
// The lane's other writers (current nav item, width gates and per-device hiding, declared fluid values, button presets,
// loop-body parent writes, the draft-defect write) have no coverage ID of their own: they are run on one planted fact record
// and read, each writes what it should, and with that one input removed its write is gone, so no writer's proof is carried by another.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { allEntries, readInventoryFile } from '../lib/capabilities.mjs';
import { draftUsage } from '../lib/intake-usage.mjs';
import { coverageMissing, unreadProperties } from '../lib/intake-missing.mjs';
import { loadCoverage, statusOf } from '../lib/clone-coverage.mjs';
import { currentItemGroups, readCurrentItems } from '../lib/fill-current-item.mjs';
import { widthGateWrites } from '../lib/fill-width-gate.mjs';
import { presetWrites } from '../lib/fill-preset.mjs';
import { addDefectLooks } from '../lib/fill-state-defect.mjs';
import { fillStates } from '../lib/fill-state.mjs';
import { resolveProperty } from '../lib/fill-prop.mjs';
import { resolveViaAncestor } from '../lib/resolve.mjs';
import { loopBodyCheck, identityFromOrigin } from '../lib/loop-body.mjs';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { openDevtools } from '../../parity/lib/devtools.mjs';
import { parseColour } from '../lib/normalise.mjs';
import { openDb } from '../lib/db.mjs';

let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( async () => {
	await browser?.close();
} );

const db = openDb();
const KNOWN = new Set( allEntries( readInventoryFile() ).map( ( e ) => e.id ) );
const snapshot = { palette: [ { slug: 'primary', colour: parseColour( '#0a7ea8' ) } ], spacing: [], fontSizes: [] };

// One rule per covered CSS group, each on a property a setting paints (tests/fill-css-groups.test.mjs holds the group list),
// and two groups kept as gaps (their properties have no setting) so the planted draft also shows them still raised.
const GROUP_CSS = {
	'css-group:backgrounds-and-borders': 'background-repeat:no-repeat', 'css-group:box-sizing': 'max-width:1200px', 'css-group:display': 'order:2',
	'css-group:filter-effects': 'backdrop-filter:blur(8px)', 'css-group:flexible-box-layout': 'flex-direction:column', 'css-group:grid-layout': 'grid-template-columns:100px 100px 100px',
	'css-group:positioned-layout': 'top:10px', 'css-group:scalable-vector-graphics': 'stroke-width:2px', 'css-group:scrollbars-styling': 'scrollbar-width:thin',
	'css-group:text-decoration': 'text-decoration-thickness:2px', 'css-group:webkit-extensions': '-webkit-text-stroke-width:2px',
};
const KEPT_GAPS = { 'css-group:overflow': 'overflow-x:hidden', 'css-group:basic-user-interface': 'cursor:pointer', 'css-group:overscroll-behavior': 'overscroll-behavior-x:contain' };
const RULES = { ...GROUP_CSS, ...KEPT_GAPS };
const CSS = Object.values( RULES ).map( ( d, i ) => `.g${ i }{${ d }}` ).join( '\n' );
const SOURCES = [ { component: 'Page', stamped: { elements: [ { n: '1', tag: 'style', attrs: [], body: CSS }, ...Object.keys( RULES ).map( ( _, i ) => ( { n: String( i + 2 ), tag: 'div', attrs: [ [ 'class', `g${ i }` ] ] } ) ) ] } } ];
const rowsFor = ( coverage ) => coverageMissing( { census: { rows: [] }, coverage, usage: draftUsage( { sources: SOURCES, known: KNOWN } ).usage } );

test( 'the planted draft uses every CSS group the lane covers or keeps as a gap (so the tests below are not vacuous)', () => {
	const { usage, problems } = draftUsage( { sources: SOURCES, known: KNOWN } );
	assert.deepEqual( problems, [] );
	for ( const id of Object.keys( RULES ) ) {
		assert.ok( usage.has( id ), `${ id } is read from the draft` );
	}
} );

test( 'MUST FAIL WITHOUT THE WRITE REF: a covered CSS group raises no row, and with its write reference removed it is a gap again (a row where intake judges it)', () => {
	const coverage = loadCoverage();
	const raised = new Set( rowsFor( coverage ).map( ( r ) => r.construct ) );
	for ( const [ id, decl ] of Object.entries( GROUP_CSS ) ) {
		const e = coverage.entries[ id ];
		assert.ok( e.recognise && e.write && e.check && e.test, `${ id } names recognise, write, check and its test` );
		assert.ok( ! raised.has( id ), `${ id } raises no row while covered` );
		const nulled = { ...coverage, entries: { ...coverage.entries, [ id ]: { ...e, write: null, wave: 'draft reading' } } };
		assert.equal( statusOf( nulled.entries[ id ] ), 'gap', `${ id } is a gap with its write reference removed` );
		// Intake raises a row for a gap group only for the properties Fill does not read: the rest is judged cloned for this draft.
		const prop = decl.split( ':' )[ 0 ];
		const row = rowsFor( nulled ).find( ( r ) => r.construct === id );
		assert.equal( !! row, unreadProperties( [ prop ] ).length > 0, `${ id }: a row exactly when Fill does not read ${ prop }` );
		row && assert.match( row.why, /has recognise, check; wave draft reading|Fill does not read/ );
	}
	assert.ok( [ ...Object.keys( GROUP_CSS ) ].some( ( id ) => rowsFor( { ...coverage, entries: { ...coverage.entries, [ id ]: { ...coverage.entries[ id ], write: null, wave: 'draft reading' } } } ).some( ( r ) => r.construct === id ) ), 'at least one group is raised again, so the removal is observable' );
} );

test( 'the groups kept as gaps stay raised on the planted draft, with their wave', () => {
	const rows = rowsFor( loadCoverage() );
	for ( const id of Object.keys( KEPT_GAPS ) ) {
		const r = rows.find( ( x ) => x.construct === id );
		assert.ok( r, `${ id } is seen but unsupported` );
		assert.match( r.why, /wave draft reading/ );
	}
} );

// ---- The lane's other writers on one planted fact record. ----
const loopEl = ( loop, over = {} ) => ( { template: { tag: 'div', holes: [], membership: { scIf: [], scFor: loop ? [ { key: loop } ] : [] }, ...over }, logic: { holes: {}, ...( over.logic || {} ) } } );
const sc = ( width, via ) => ( { template: { tag: 'sc-if', membership: { scIf: [], scFor: [] } }, logic: { holes: {}, width, via } } );
const bools = [ { t: 'boolean', v: true }, { t: 'boolean', v: false } ];
const FACTS = { elements: {
	// the nav loop: item 47 with the current condition 51 and its mark 52
	'Page/47': loopEl( 'Page/46', { tag: 'button' } ),
	'Page/51': { template: { tag: 'sc-if', holes: [ { id: 'attr:value#0', where: 'attr:value', path: 'item.current', whole: true } ], parent: 'Page/47', realParent: 'Page/47', membership: { scIf: [], scFor: [ { key: 'Page/46' } ] } }, logic: { holes: { 'attr:value#0': { 375: { v: bools, n: 3, loop: true } } } } },
	'Page/52': loopEl( null, { tag: 'span', parent: 'Page/51', realParent: 'Page/47' } ),
	// width gates: mobile-only (12 -> 13), at least 1260 (53 -> 54)
	'Page/12': sc( { bp: 'm', is: true, when: { w: '<', n: 768 } }, 'm' ), 'Page/13': { template: { tag: 'a', membership: { scIf: [ { key: 'Page/12' } ], scFor: [] }, holes: [] }, logic: { holes: {} } },
	'Page/53': sc( { w: '>=', n: 1260 }, 'w >= 1260' ), 'Page/54': { template: { tag: 'a', membership: { scIf: [ { key: 'Page/53' } ], scFor: [] }, holes: [] }, logic: { holes: {} } },
	// the loop body for the parent write, and a bound hover colour the runtime drops
	'Page/60': loopEl( 'Page/59' ), 'Page/61': loopEl( 'Page/59' ), 'Page/62': loopEl( 'Page/59' ),
	'Page/87': { template: { tag: 'div', holes: [ { id: 'style-hover:color#3', where: 'style-hover:color' } ], membership: { scIf: [], scFor: [] } }, logic: { holes: { 'style-hover:color#3': { 375: { v: [ { t: 'string', v: '#00cc00' } ], n: 1, loop: false }, 768: { v: [ { t: 'string', v: '#00cc00' } ], n: 1, loop: false }, 1440: { v: [ { t: 'string', v: '#00cc00' } ], n: 1, loop: false } } } } },
} };
const setting = ( property, state = null, extra = {} ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state, forms: [], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ], ...extra } );
const calOf = ( block, attrs ) => ( { elements: { '': {} }, settings: Object.fromEntries( db.prepare( `SELECT attr_name, css_property, css_state FROM block_attributes WHERE block_slug = ? AND attr_name IN (${ attrs.map( () => '?' ).join( ',' ) })` ).all( block, ...attrs ).map( ( r ) => [ r.attr_name, setting( r.css_property, r.css_state ) ] ) ) } );
const flatStates = ( looks ) => ( { states: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { looks } ] ) ) } );

test( 'MUST FAIL WITHOUT THE READER: the current nav item is read from the draft and written to the current-state settings', async () => {
	const page = await browser.newPage( { viewport: { width: 800, height: 600 } } );
	await page.setContent( '<!doctype html><style>.it{color:rgb(10,10,10)} .it.cur{color:rgb(10,126,168)}</style><div class="sc-host" data-sc-name="Page"><button class="it" data-dc-tpl="47">Home</button><button class="it cur" data-dc-tpl="47">About<span data-dc-tpl="52"></span></button></div>' );
	const cdp = await openDevtools( page );
	const jobs = [ { id: '0:', finder: { tpl: 'Page/47#0' } } ];
	const read = ( groups ) => readCurrentItems( { page, cdp, jobs, groups, resolveSrc: resolveFinder.toString() } );
	const { looks } = await read( currentItemGroups( FACTS ) );
	const none = await read( currentItemGroups( { elements: {} } ) );
	await page.close();
	assert.deepEqual( none.looks, {}, 'with no group in the fact record nothing is read' );
	const tree = [ { name: 'sgs/nav-bar-menu', attributes: {}, innerBlocks: [] } ];
	const out = fillStates( { tree, nodes: [ { index: 0, name: 'sgs/nav-bar-menu', targets: [ { id: '0:', slot: '' } ] } ], reads: flatStates( looks ), calFor: () => calOf( 'sgs/nav-bar-menu', [ 'itemColourCurrent' ] ), db, snapshot } );
	assert.deepEqual( out.writes.map( ( w ) => w.attr ), [ 'itemColourCurrent' ] );
} );

test( 'MUST FAIL WITHOUT THE WRITER: width-gated content is hidden per device, off-tier thresholds become a scoped rule, and no fact record writes nothing', () => {
	const flat = [ { name: 'sgs/button', attributes: {}, ref: 'a' }, { name: 'sgs/button', attributes: {}, ref: 'b' } ];
	const nodes = [ 13, 54 ].map( ( n, index ) => ( { index, name: 'sgs/button', parent: null, node: { draftRef: { tpl: `Page/${ n }#0` } }, targets: [], children: [] } ) );
	const run = ( facts ) => widthGateWrites( { nodes, flat: structuredClone( flat ), refOf: ( n ) => n.ref, facts, db, scope: 's', entries: [], date: '2026-10-22' } );
	const r = run( FACTS );
	assert.deepEqual( r.writes.filter( ( w ) => 'a' === w.node ).map( ( w ) => w.attr ).sort(), [ 'sgsHideOnDesktop', 'sgsHideOnTablet' ] );
	assert.ok( r.writes.some( ( w ) => 'b' === w.node && 'sgsCustomCss' === w.attr && /max-width: 1259px/.test( w.after ) ) );
	assert.equal( run( null ).writes.length, 0 );
	const navFlat = [ { name: 'sgs/nav-bar-menu', attributes: {}, ref: 'n' } ];
	const navNodes = [ { index: 0, name: 'sgs/nav-bar-menu', parent: null, node: { draftRef: { tpl: 'Page/54#0' } }, targets: [], children: [] } ];
	const nav = widthGateWrites( { nodes: navNodes, flat: navFlat, refOf: ( n ) => n.ref, facts: FACTS, db, scope: 's', entries: [], date: '2026-10-22' } );
	assert.deepEqual( nav.writes.map( ( w ) => [ w.attr, w.after ] ), [ [ 'collapsePoint', 1260 ] ], 'a block drawing its own alternative takes the threshold, no hiding flag' );
	const sel = [ { index: 0, name: 'sgs/button', parent: null, node: { draftRef: 'div[data-dc-tpl="9"] [data-dc-tpl="13"]' }, targets: [], children: [] } ];
	const viaSelector = ( rootComponent ) => widthGateWrites( { nodes: sel, flat: structuredClone( flat ).slice( 0, 1 ), refOf: ( n ) => n.ref, facts: FACTS, db, scope: 's', entries: [], rootComponent, date: '2026-10-22' } ).writes.length;
	assert.equal( viaSelector( 'Page' ), 2, 'a selector draftRef resolves to its last data-dc-tpl' );
	assert.equal( viaSelector( null ), 0 );
} );

test( 'MUST FAIL WITHOUT THE WIRING: a declared clamp() is one value; a button equal to a preset is the preset; a loop body gets one parent write', () => {
	const CLAMP = 'clamp(24px, 2.4vw, 30px)';
	const draft = { 375: '24px', 768: '24px', 1440: '30px' };
	const fontCal = { elements: { '': {} }, settings: { fontSize: setting( 'font-size', null, { forms: [ 'clamp' ] } ) } };
	const call = ( declaredFluid ) => resolveProperty( { node: { attributes: {} }, block: 'sgs/heading', prop: 'font-size', draft, baseline: () => undefined, slots: [ '' ], calibration: fontCal, db, snapshot, log: [], fontPx: { 375: 16, 768: 16, 1440: 16 }, declaredFluid } );
	assert.equal( call( { 375: CLAMP, 768: CLAMP, 1440: CLAMP } ).writes[ 0 ].value.desktop, CLAMP );
	assert.notEqual( call( null ).writes[ 0 ].value.desktop, CLAMP );

	const presets = { secondary: { background: '#0a7ea8', text: '#ffffff', 'font-size': '17px' } };
	const styles = { 'background-color': 'rgb(10, 126, 168)', color: 'rgb(255, 255, 255)', 'font-size': '17px' };
	const reads = { widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': { styles } } ] ) ), states: {} };
	const button = ( p ) => {
		const flat = [ { name: 'sgs/button', attributes: { colourBackground: 'x' }, ref: 'r' } ];
		const res = presetWrites( { nodes: [ { index: 0, name: 'sgs/button', targets: [ { id: '0:', slot: '' } ] } ], flat, refOf: ( n ) => n.ref, reads, rawSnapshot: { settings: { custom: { buttonPresets: p } } }, snapshot, writes: [ { node: 'r', slot: '', prop: 'background-color', attr: 'colourBackground', before: null } ], db } );
		return { flat, ...res };
	};
	assert.deepEqual( [ button( presets ).flat[ 0 ].attributes, button( presets ).writes.length ], [ { inheritStyle: 'secondary' }, 1 ] );
	assert.equal( button( {} ).flat[ 0 ].attributes.inheritStyle, undefined );

	const PATHS = [ '.t > h3:nth-of-type(1)', '.t > h3:nth-of-type(2)', '.t > h3:nth-of-type(3)' ];
	const ancestor = { ref: 'p', block: 'sgs/container', path: PATHS[ 0 ], tag: 'h3', attributes: {}, measuredRefs: { [ PATHS[ 0 ] ]: 'r0', [ PATHS[ 1 ] ]: 'r1', [ PATHS[ 2 ] ]: 'r2' }, calibration: { settings: { textColour: { property: 'color', slot: '', slots: [ '' ], reaches: [ '', ...PATHS ] } } } };
	const origin = { r0: { tpl: 'Root/60#0' }, r1: { tpl: 'Root/61#1' }, r2: { tpl: 'Root/62#2' } };
	const hop = ( loopBody ) => resolveViaAncestor( { block: 'sgs/heading', slot: '', prop: 'color', state: null, perWidth: { 1440: 'rgb(138, 130, 120)' } }, { db, snapshot, canvas: true, ancestors: [ ancestor ], measuredSlots: PATHS, loopBody } );
	assert.equal( hop( loopBodyCheck( { facts: FACTS, identityOf: identityFromOrigin( origin, 'Page' ) } ) ).writes[ 0 ].attr, 'textColour' );
	assert.equal( hop( undefined ).writes, undefined );
} );

test( 'MUST FAIL WITHOUT THE DEFECT LIST: a hover colour the draft never paints is built from the code, and with no listed defect nothing is built', () => {
	const defects = [ { draftId: 'Page:87', rows: [ { draftId: 'Page:87', test: 'unresolved-binding', evidence: { pseudo: 'hover', decls: [ { prop: 'color', declared: '{{ x }}', state: 'dropped' } ] } } ] } ];
	const build = ( draftDefects ) => {
		const reads = flatStates( {} );
		reads.states = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { looks: {} } ] ) );
		const listed = addDefectLooks( { reads, jobs: [ { id: '0:', finder: { tpl: 'Page/87#0' } } ], facts: FACTS, draftDefects, rootComponent: 'Page' } ).listed;
		const out = fillStates( { tree: [ { name: 'sgs/button', attributes: {}, innerBlocks: [] } ], nodes: [ { index: 0, name: 'sgs/button', targets: [ { id: '0:', slot: '' } ] } ], reads, calFor: () => calOf( 'sgs/button', [ 'colourTextHover' ] ), db, snapshot } );
		return { listed, writes: out.writes };
	};
	const withDefect = build( defects );
	assert.deepEqual( [ withDefect.listed.length, withDefect.writes.map( ( w ) => [ w.attr, w.draftDefect ] ) ], [ 1, [ [ 'colourTextHover', 'Page:87' ] ] ] );
	assert.deepEqual( build( [] ), { listed: [], writes: [] } );
} );
