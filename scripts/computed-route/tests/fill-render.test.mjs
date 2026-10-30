// One block, two surfaces' renders (Spec 48 §3.4 Fill, RC5, lib/fill-render.mjs): the mega panel's drawer look is drawn
// only while the drawer menu renders the panel, and calibration measures it under the fixture variants rendered in the
// drawer context (calibration-fixtures.json, data/render-contexts.json). On the Indus mega panel's slot map (a slice of the
// local-indus cache/mega-panel.json: the settings painting the panel root) the bar panel's ground was ambiguous between the
// panel's `panelBg` and the drawer's `drawerBg`, so Fill wrote neither (the 2026-10-28 mega-about Fill report: 0 of 285
// writes a drawer setting, and the root's ground, radius, shadow and padding rows "ambiguous"). A Fill run on the menu
// surface reads only the settings its render draws and lists the drawer's as drawn in the drawer surface.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openDb } from '../lib/db.mjs';
import { resolveProperty } from '../lib/fill-prop.mjs';
import { variantContexts, otherRenderSettings, renderScoped, otherRenderRows } from '../lib/fill-render.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const fixtures = JSON.parse( readFileSync( new URL( '../calibration-fixtures.json', import.meta.url ), 'utf8' ) );
const cal = JSON.parse( readFileSync( new URL( './fixtures/fill-render/mega-panel-cal.json', import.meta.url ), 'utf8' ) );
const icon = JSON.parse( readFileSync( new URL( './fixtures/fill-state-gradient-ground/icon-cal.json', import.meta.url ), 'utf8' ) );
const DRAWER = [ 'drawerBg', 'drawerBgGradient', 'drawerShellRadius', 'drawerShellPadding', 'drawerShellShadow', 'drawerShellShadowColour' ];
const loader = ( map ) => ( block ) => map[ block ] ?? null;
const ground = ( calibration ) => resolveProperty( { node: { name: 'sgs/mega-panel', attributes: {} }, block: 'sgs/mega-panel', prop: 'background-color', draft: { 375: 'rgb(255, 255, 255)', 768: 'rgb(255, 255, 255)', 1440: 'rgb(255, 255, 255)' }, baseline: () => undefined, slots: [ '' ], calibration, db, snapshot, log: [] } );

test( 'the drawer-context fixture variants of sgs/mega-panel are the ones data/render-contexts.json names, read from calibration-fixtures.json', () => {
	assert.deepEqual( variantContexts( fixtures, 'sgs/mega-panel' ), { 3: 'drawer', 4: 'drawer', 5: 'drawer' } );
	assert.deepEqual( variantContexts( fixtures, 'sgs/icon' ), {} );
} );

test( 'MUST FAIL: on the menu surface the Indus mega panel\'s root ground is the panel\'s own setting, the drawer\'s settings left to the drawer surface', () => {
	const before = ground( cal );
	assert.deepEqual( [ before.status, before.gap, before.detail ], [ 'gap', 'ambiguous', 'panelBg, drawerBg all paint background-color on ""' ], 'the unscoped slot map cannot tell the two grounds apart' );
	const calFor = renderScoped( loader( { 'sgs/mega-panel': cal } ), { fixtures, surfaceKind: 'menu' } );
	const scoped = calFor( 'sgs/mega-panel' );
	const res = ground( scoped );
	assert.equal( res.status, 'written' );
	assert.deepEqual( res.writes.map( ( w ) => w.attr ), [ 'panelBg' ] );
	assert.deepEqual( Object.keys( scoped.otherRender ).sort(), [ ...DRAWER ].sort() );
	assert.ok( DRAWER.every( ( a ) => ! scoped.settings[ a ] ), 'no drawer setting answers on the menu surface' );
	assert.ok( scoped.settings.borderColour && scoped.settings.sgsHideOnMobile, 'a setting reached in both renders stays' );
	const rows = otherRenderRows( [ { name: 'sgs/mega-panel', ref: 'cr-ref-mega-about-0' } ], calFor );
	assert.deepEqual( rows.map( ( r ) => [ r.node, r.surfaceKind, r.settings.length ] ), [ [ 'cr-ref-mega-about-0', 'drawer', DRAWER.length ] ] );
} );

test( 'on the drawer surface the drawer settings stay; a block with no drawer-context variant reads one surface (negative controls)', () => {
	assert.deepEqual( otherRenderSettings( cal, variantContexts( fixtures, 'sgs/mega-panel' ), 'drawer' ), {} );
	const calFor = renderScoped( loader( { 'sgs/icon': icon, 'sgs/mega-panel': cal } ), { fixtures, surfaceKind: 'menu' } );
	assert.equal( calFor( 'sgs/icon' ), icon, 'the icon\'s slot map is unchanged' );
	assert.deepEqual( otherRenderRows( [ { name: 'sgs/icon', ref: 'x' } ], calFor ), [] );
	assert.equal( calFor( 'sgs/none' ), null );
} );
