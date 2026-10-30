// The second draft source of a block drawn in two surfaces' renders (Spec 48 §3.4 Fill, RC5, lib/fill-render-source.mjs). The
// Indus About mega panel's drawer look is drawn only in the mobile drawer's About section: intake reads that section as a
// render part with its state open (lib/intake-skeletons.mjs renderParts), and Fill reads the panel's drawer-only settings
// from it, each panel element paired with its drawer copy by draft identity (FR-48-10): the data its bindings show, read from
// the committed draft's logic (lib/render-identity.mjs). Inputs, all real: the panel's skeleton node and the mega-about
// inventory, the drawer section's inventory read with `{ mobileOpen: true, acc: 1 }` and the draft read of its paired
// elements (captured on the served draft, 2026-10-30), a slice of the fact record, and the local-indus mega-panel slot map
// (tests/fixtures/fill-render-source/). MUST FAIL: the drawer settings are written from the drawer, its elements paired by
// identity; negative controls: a same-words element of another template is not paired, a block with no setting of another
// render, no part of that render, a part of another kind and a part showing other data read nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs, refOf } from '../lib/tree.mjs';
import { inventoryModel } from '../lib/skeleton-model.mjs';
import { servedKey, translateElement } from '../lib/key-space.mjs';
import { loadSnapshot } from '../lib/normalise.mjs';
import { draftLogicOf } from '../lib/skeleton-narrowing.mjs';
import { renderScoped } from '../lib/fill-render.mjs';
import { bindingSource, pinIndexes } from '../lib/render-identity.mjs';
import { renderSource, renderSourceWrites, slotNode, tagBlocksOf, withParentKeys } from '../lib/fill-render-source.mjs';

const file = ( f ) => fileURLToPath( new URL( f, import.meta.url ) );
const json = ( f ) => JSON.parse( readFileSync( file( f ), 'utf8' ) );
const F = './fixtures/fill-render-source/';
const ROOT = 'Indus Foods Website v2';
const db = openDb();
const fixtures = json( '../calibration-fixtures.json' );
const cal = json( `${ F }mega-panel-cal.json` );
const panel = json( `${ F }mega-about.panel.json` );
const barM = inventoryModel( json( `${ F }mega-about.inventory.json` ) );
const drawerInv = json( `${ F }drawer-about.inventory.json` );
const PART_STATE = { mobileOpen: true, acc: 1 };
const drawer = { slug: 'part-drawer-accordion-about', context: 'drawer', state: PART_STATE, model: inventoryModel( drawerInv ) };
const reads = json( `${ F }drawer-about.reads.json` );
const records = json( `${ F }facts-slice.json` ).elements;
const folder = file( '../../../sites/indus-foods/handoff' );
const d = draftLogicOf( { folder, record: { sources: { files: { [ `${ ROOT }.dc.html` ]: crypto.createHash( 'sha256' ).update( readFileSync( `${ folder }/${ ROOT }.dc.html` ) ).digest( 'hex' ) } } }, component: ROOT } );
const identity = { d, records, keyOf: ( e ) => translateElement( e, ROOT ).templateKey ?? null, state: { active: 1 } };
const snapshotFile = file( '../../../sites/indus-foods/theme-snapshot.json' );
const snapshot = loadSnapshot( snapshotFile );
const rawSnapshot = JSON.parse( readFileSync( snapshotFile, 'utf8' ) );
const tagBlocks = tagBlocksOf( db );
const finderOf = ( e ) => ( { tpl: servedKey( e.key, ROOT ) } );
const loader = ( map ) => ( block ) => map[ block ] ?? null;
const full = loader( { 'sgs/mega-panel': cal } );
const calFor = renderScoped( full, { fixtures, surfaceKind: 'menu' } );
const drawerSettings = Object.fromEntries( Object.keys( calFor( 'sgs/mega-panel' ).otherRender ).map( ( a ) => [ a, cal.settings[ a ] ] ) );
const LABEL = '.sgs-mega-panel__content > .sgs-mega-group > .sgs-container > .sgs-container__inner > h3';
const DESC = '.sgs-mega-panel__content > .sgs-mega-group > .sgs-container > .sgs-container__inner > .sgs-container > .sgs-container__inner > p';

// One Fill of the mega-about panel's render sources, the draft read answered by the captured drawer read.
async function run( { parts = [ drawer ], node = panel } = {} ) {
	const skeleton = [ structuredClone( node ) ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'mega-about' );
	const calls = [];
	const out = await renderSourceWrites( {
		tree, nodes: skeletonNodes( skeleton ), refOf, calFor, fullCalFor: full, parts, barM, tagBlocks, finderOf, identity,
		read: async ( x ) => calls.push( x.part.slug ) && reads,
		fill: ( x ) => fillTree( { db, snapshot, rawSnapshot, fixtures, origin: reads.origin, rootComponent: ROOT, ...x } ),
	} );
	return { ...out, calls, attrs: tree[ 0 ].attributes };
}

test( 'the panel\'s link label and the drawer\'s are two templates showing one piece of data, read from the draft\'s logic', () => {
	const bar = bindingSource( d, records, records[ `${ ROOT }/73` ], 'link.label' );
	const part = bindingSource( d, records, records[ `${ ROOT }/154` ], 'link.label' );
	assert.notEqual( bar, part, 'the code reaches the menu by the open panel on one surface and by the section\'s index on the other' );
	assert.equal( pinIndexes( d, bar, { active: 1 } ), 'this._menus[1].links[*].label' );
	assert.equal( pinIndexes( d, part, PART_STATE ), 'this._menus[1].links[*].label' );
	assert.equal( pinIndexes( d, part, { mobileOpen: true, acc: 2 } ), 'this._menus[2].links[*].label', 'another section shows another menu' );
	assert.equal( bindingSource( d, records, records[ `${ ROOT }/71` ], 'link.num' ), null, 'a number the code computes shows no data of its own' );
	assert.equal( pinIndexes( d, bindingSource( d, records, records[ `${ ROOT }/150` ], 'item.mobileLinks' ), PART_STATE ), 'this._menus[1].links', 'a mapped list stands for its source list, element for element' );
} );

test( 'MUST FAIL: the Indus About mega panel\'s drawer look is read from the drawer\'s About section, its elements paired by identity', async () => {
	const src = renderSource( { node: panel, settings: drawerSettings, kind: 'drawer', parts: [ drawer ], barM, tagBlocks, finderOf, identity } );
	assert.equal( src.part, drawer.slug );
	assert.equal( src.draftSlots[ LABEL ].tpl, 'Root/154#0', 'the first link\'s label' );
	assert.equal( src.draftSlots[ DESC ].tpl, 'Root/155#0' );
	assert.equal( src.draftSlots[ '.sgs-mega-panel__content > .sgs-mega-group > .sgs-container' ].tpl, 'Root/151#0', 'the first link row: the item of the loop over the same links' );
	assert.equal( src.draftSlots[ '.sgs-mega-panel__content > .sgs-mega-aside' ].tpl, 'Root/139#0', 'the card showing the same feature' );
	assert.equal( src.draftRef.tpl, 'Root/137#0', 'the panel is the element holding the links and the card' );
	assert.deepEqual( src.checks, [], 'every pair\'s words agree' );
	const r = await run();
	assert.deepEqual( r.calls, [ drawer.slug ] );
	assert.equal( r.attrs.drawerBgGradient, 'linear-gradient(135deg, rgb(235, 221, 120) 0%, rgb(227, 211, 95) 55%, rgb(216, 202, 80) 100%)', 'the section\'s gold ground' );
	assert.equal( r.attrs.drawerShellRadius, '22px' );
	assert.equal( r.attrs.drawerLinkLabelSize, '17.5px', 'the link label in the drawer' );
	assert.equal( r.attrs.drawerLinkDescSize, '15px' );
	assert.equal( r.attrs.drawerCardRadius, '16px', 'the drawer card' );
	assert.ok( r.writes.every( ( w ) => w.renderSource === drawer.slug && /^drawer/.test( w.attr ) ), 'only the drawer settings, each from the drawer part' );
	assert.equal( r.attrs.panelBg, undefined, 'the bar panel\'s own ground is not read from the drawer' );
	assert.ok( r.unread.every( ( u ) => u.settings.every( ( a ) => /^drawer/.test( a ) ) && u.reason ), 'a slot no element answers is listed with its reason' );
} );

test( 'negative control: an element of another template showing the same words is not the label\'s copy', () => {
	const moved = { ...drawerInv, elements: drawerInv.elements.map( ( e ) => ( `${ ROOT }/154#0` === e.key ? { ...e, key: `${ ROOT }/999#0`, tpl: 999 } : e ) ) };
	const part = { ...drawer, model: inventoryModel( moved ) };
	assert.equal( part.model.words( part.model.byKey[ `${ ROOT }/999#0` ] ), 'Our Story', 'the stranger shows the label\'s words' );
	const src = renderSource( { node: panel, settings: drawerSettings, kind: 'drawer', parts: [ part ], barM, tagBlocks, finderOf, identity } );
	assert.equal( src.draftSlots[ LABEL ], undefined );
	assert.ok( src.unpaired.some( ( u ) => LABEL === u.slot && /identity/.test( u.reason ) ) );
	// Words only cross-check: the label's own copy showing other words stays the pair, flagged as a disagreement.
	const reworded = { ...drawer, model: inventoryModel( { ...drawerInv, elements: drawerInv.elements.map( ( e ) => ( `${ ROOT }/154#0` === e.key ? { ...e, words: 'Our Heritage', allText: 'Our Heritage' } : e ) ) } ) };
	const checked = renderSource( { node: panel, settings: drawerSettings, kind: 'drawer', parts: [ reworded ], barM, tagBlocks, finderOf, identity } );
	assert.equal( checked.draftSlots[ LABEL ].tpl, 'Root/154#0' );
	assert.deepEqual( checked.checks.map( ( c ) => c.slot ), [ LABEL ] );
} );

test( 'a part opens inside the surfaces it shows in: the drawer section\'s state holds the drawer\'s open keys', () => {
	const surfaces = json( '../../../sites/indus-foods/handoff/surfaces.json' ).records;
	const own = withParentKeys( surfaces.find( ( r ) => 'S-10' === r.id ), surfaces );
	assert.deepEqual( own.states.find( ( st ) => 'expanded' === st.name ).state_keys, PART_STATE );
	assert.equal( withParentKeys( null, surfaces ), null );
	assert.equal( slotNode( panel, LABEL, tagBlocks ).node.name, 'sgs/heading' );
	assert.match( slotNode( panel, '.sgs-mega-panel__content > .sgs-mega-aside > .sgs-container:nth-of-type(9)', tagBlocks ).reason, /no node/ );
} );

test( 'negative controls: no setting of another render, no part of that render, a part of another kind, a part showing another menu', async () => {
	const noOther = await run( { node: { ...panel, name: 'sgs/mega-group' } } );
	assert.deepEqual( [ noOther.calls, noOther.writes ], [ [], [] ], 'a block with no drawer-only setting reads one surface' );
	const none = await run( { parts: [] } );
	assert.deepEqual( none.calls, [] );
	assert.match( none.unread[ 0 ].reason, /no drawer part shows the data/ );
	assert.deepEqual( ( await run( { parts: [ { ...drawer, context: 'menu' } ] } ) ).calls, [], 'a part of another render kind is not the drawer\'s' );
	const sectors = await run( { parts: [ { ...drawer, state: { mobileOpen: true, acc: 2 } } ] } );
	assert.deepEqual( sectors.calls, [], 'the same section read as another menu\'s shows no data of this panel' );
	assert.match( sectors.unread[ 0 ].reason, /no drawer part shows the data/ );
} );
