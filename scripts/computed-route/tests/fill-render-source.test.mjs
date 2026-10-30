// The second draft source of a block drawn in two surfaces' renders (Spec 48 §3.4 Fill, RC5, lib/fill-render-source.mjs). The
// Indus About mega panel's drawer look is drawn only in the mobile drawer's About section: intake reads that section as a
// render part with its state open (lib/intake-skeletons.mjs renderParts), and Fill reads the panel's drawer-only settings
// from it. Inputs, all real: the panel's skeleton node and the mega-about inventory, the drawer section's inventory read with
// `{ mobileOpen: true, acc: 1 }` and the draft read of its paired elements (captured on the served draft, 2026-10-30), and
// the local-indus mega-panel slot map (tests/fixtures/fill-render-source/). MUST FAIL: the drawer settings are written from
// the drawer; negative controls: a block with no setting of another render, no part of that render, and a part whose words
// are not the panel's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs, refOf } from '../lib/tree.mjs';
import { inventoryModel } from '../lib/skeleton-model.mjs';
import { servedKey } from '../lib/key-space.mjs';
import { loadSnapshot } from '../lib/normalise.mjs';
import { renderScoped } from '../lib/fill-render.mjs';
import { renderSource, renderSourceWrites, slotNode, choosePart, tagBlocksOf, withParentKeys } from '../lib/fill-render-source.mjs';

const json = ( f ) => JSON.parse( readFileSync( new URL( f, import.meta.url ), 'utf8' ) );
const F = './fixtures/fill-render-source/';
const db = openDb();
const fixtures = json( '../calibration-fixtures.json' );
const cal = json( `${ F }mega-panel-cal.json` );
const panel = json( `${ F }mega-about.panel.json` );
const barM = inventoryModel( json( `${ F }mega-about.inventory.json` ) );
const drawer = { slug: 'part-drawer-accordion-about', context: 'drawer', model: inventoryModel( json( `${ F }drawer-about.inventory.json` ) ) };
const reads = json( `${ F }drawer-about.reads.json` );
const snapshotFile = fileURLToPath( new URL( '../../../sites/indus-foods/theme-snapshot.json', import.meta.url ) );
const snapshot = loadSnapshot( snapshotFile );
const rawSnapshot = JSON.parse( readFileSync( snapshotFile, 'utf8' ) );
const tagBlocks = tagBlocksOf( db );
const ROOT = 'Indus Foods Website v2';
const finderOf = ( e ) => ( { tpl: servedKey( e.key, ROOT ) } );
const loader = ( map ) => ( block ) => map[ block ] ?? null;
const full = loader( { 'sgs/mega-panel': cal } );
const calFor = renderScoped( full, { fixtures, surfaceKind: 'menu' } );
const drawerSettings = Object.fromEntries( Object.keys( calFor( 'sgs/mega-panel' ).otherRender ).map( ( a ) => [ a, cal.settings[ a ] ] ) );

// One Fill of the mega-about panel's render sources, the draft read answered by the captured drawer read.
async function run( { parts = [ drawer ], node = panel } = {} ) {
	const skeleton = [ structuredClone( node ) ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'mega-about' );
	const calls = [];
	const out = await renderSourceWrites( {
		tree, nodes: skeletonNodes( skeleton ), refOf, calFor, fullCalFor: full, parts, barM, tagBlocks, finderOf,
		read: async ( x ) => calls.push( x.part.slug ) && reads,
		fill: ( x ) => fillTree( { db, snapshot, rawSnapshot, fixtures, origin: reads.origin, rootComponent: ROOT, ...x } ),
	} );
	return { ...out, calls, attrs: tree[ 0 ].attributes };
}

test( 'MUST FAIL: the Indus About mega panel\'s drawer look is read from the drawer\'s About section', async () => {
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

test( 'the panel\'s parts pair with their copies in the drawer section by the words they show', () => {
	const src = renderSource( { node: panel, settings: drawerSettings, kind: 'drawer', parts: [ drawer ], barM, tagBlocks, finderOf } );
	const words = ( slot ) => drawer.model.words( drawer.model.byKey[ src.draftSlots[ slot ].tpl.replace( 'Root/', `${ ROOT }/` ) ] );
	assert.equal( words( '.sgs-mega-panel__content > .sgs-mega-group > .sgs-container > .sgs-container__inner > h3' ), 'Our Story' );
	assert.equal( words( '.sgs-mega-panel__content > .sgs-mega-group > .sgs-container > .sgs-container__inner > .sgs-container > .sgs-container__inner > p' ), 'Six decades of family heritage' );
	assert.equal( src.draftSlots[ '.sgs-mega-panel__content > .sgs-mega-group > .sgs-container' ].tpl, 'Root/151#0', 'the first link row holds its number, label and description' );
	assert.equal( src.draftSlots[ '.sgs-mega-panel__content > .sgs-mega-aside' ].tpl, 'Root/139#0', 'the aside is the card' );
	assert.equal( src.draftRef.tpl, 'Root/137#0', 'the panel is the element holding the links and the card' );
	assert.equal( slotNode( panel, '.sgs-mega-panel__content > .sgs-mega-group > .sgs-container > .sgs-container__inner > h3', tagBlocks ).node.name, 'sgs/heading' );
	assert.match( slotNode( panel, '.sgs-mega-panel__content > .sgs-mega-aside > .sgs-container:nth-of-type(9)', tagBlocks ).reason, /no node/ );
} );

test( 'a part opens inside the surfaces it shows in: the drawer section\'s state holds the drawer\'s open keys', () => {
	const records = json( '../../../sites/indus-foods/handoff/surfaces.json' ).records;
	const own = withParentKeys( records.find( ( r ) => 'S-10' === r.id ), records );
	assert.deepEqual( own.states.find( ( st ) => 'expanded' === st.name ).state_keys, { mobileOpen: true, acc: 1 } );
	assert.equal( withParentKeys( null, records ), null );
} );

test( 'negative controls: no setting of another render, no part of that render, a part showing other words', async () => {
	const noOther = await run( { node: { ...panel, name: 'sgs/mega-group' } } );
	assert.deepEqual( [ noOther.calls, noOther.writes ], [ [], [] ], 'a block with no drawer-only setting reads one surface' );
	const none = await run( { parts: [] } );
	assert.deepEqual( none.calls, [] );
	assert.match( none.unread[ 0 ].reason, /no drawer part shows half/ );
	const menuPart = await run( { parts: [ { ...drawer, context: 'menu' } ] } );
	assert.deepEqual( menuPart.calls, [], 'a part of another render kind is not the drawer\'s' );
	const other = choosePart( { node: panel, barM, kind: 'drawer', parts: [ { ...drawer, model: barM } ] } );
	assert.ok( other.part, 'the panel\'s own words match' );
	const stranger = choosePart( { node: panel, barM, kind: 'drawer', parts: [ { ...drawer, model: inventoryModel( { elements: [ { key: 'X/1#0', parentKey: null, depth: 0, tag: 'div', words: 'Unrelated words', visible: { 375: true } } ] } ) } ] } );
	assert.match( stranger.reason, /no drawer part shows half/ );
} );
