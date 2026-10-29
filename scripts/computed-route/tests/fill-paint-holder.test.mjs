// Register C2 PI-6 (FR-48-36): a state surface's root names the element holding the panel's content, while the draft paints
// the panel's border, radius, ground and shadow on a wrapper around it (lib/fill-paint-holder.mjs). The wrapper's paint is
// read as the root's, never the root's own nothing, and a wrapper that is not the surface's own is never taken.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { jobsFor, PROPS } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';
import { PAINT_GROUPS, PAINT_ATTR, paintHoldersInPage, applyPaintHolders } from '../lib/fill-paint-holder.mjs';

let shared = null;
after( async () => shared && ( await shared ).close() );
async function holdersFor( html, job = {} ) {
	shared ??= import( 'playwright' ).then( ( { chromium } ) => chromium.launch() );
	const page = await ( await shared ).newPage();
	try {
		await page.setContent( html );
		const jobs = [ { id: '0:', finder: '.root', owner: 0, root: true, surfaceRoot: true, ...job } ];
		const out = await page.evaluate( paintHoldersInPage, [ jobs, resolveFinder.toString(), PAINT_GROUPS, PAINT_ATTR ] );
		return { out, stamped: await page.evaluate( ( a ) => [ ...document.querySelectorAll( `[${ a }]` ) ].map( ( e ) => e.className ), PAINT_ATTR ) };
	} finally {
		await page.close();
	}
}

const PANEL = 'border:1px solid rgb(200,200,200);border-radius:12px;background:rgb(255,255,255);box-shadow:0 2px 8px rgb(0,0,0)';
// The mega panel as the draft draws it: header > absolute wrapper > painting panel > the root holding the content.
const MEGA = `<header><div class="top">menu</div><div class="wrap" style="position:absolute"><div class="panel" style="${ PANEL }"><div class="root" style="display:flex"><p>content</p></div></div></div></header>`;

test( 'PROPS holds every property a paint group reads', () => {
	for ( const p of Object.values( PAINT_GROUPS ).flat() ) {
		assert.ok( PROPS.includes( p ), p );
	}
} );

test( 'MUST FAIL: a surface root with no paint of its own takes its single-child wrapper border, radius, ground and shadow', async () => {
	const { out, stamped } = await holdersFor( MEGA );
	assert.deepEqual( out[ '0:' ].groups.sort(), [ 'border', 'ground', 'radius', 'shadow' ] );
	assert.equal( out[ '0:' ].depth, 1 );
	assert.equal( out[ '0:' ].styles[ 'border-top-width' ], '1px' );
	assert.equal( out[ '0:' ].styles[ 'border-top-style' ], 'solid' );
	assert.equal( out[ '0:' ].styles[ 'border-radius' ], '12px' );
	assert.equal( out[ '0:' ].styles[ 'background-color' ], 'rgb(255, 255, 255)' );
	assert.deepEqual( stamped, [ 'panel' ], 'the painting wrapper is stamped once for the declared read' );
	assert.deepEqual( [ ...new Set( Object.values( out[ '0:' ].stamps ) ) ], [ '[data-fill-paint="0-1"]' ], 'every group names the same wrapper' );
	assert.match( out[ '0:' ].stamps.border, /^\[data-fill-paint="0-1"\]$/ );
} );

test( 'negative control: a root that paints a group itself keeps it; only the groups it leaves unpainted come from the wrapper', async () => {
	const own = MEGA.replace( 'class="root" style="display:flex"', 'class="root" style="display:flex;border-radius:4px"' );
	const { out } = await holdersFor( own );
	assert.deepEqual( out[ '0:' ].groups.sort(), [ 'border', 'ground', 'shadow' ] );
	assert.ok( ! ( 'border-radius' in out[ '0:' ].styles ) );
	const painted = await holdersFor( MEGA.replace( 'class="root" style="display:flex"', `class="root" style="${ PANEL }"` ) );
	assert.deepEqual( painted.out, {}, 'a root that paints everything the wrapper does takes nothing' );
} );

test( 'negative control: a wrapper holding a sibling, another node element, or nothing that paints is never taken', async () => {
	const sibling = await holdersFor( MEGA.replace( '<p>content</p></div></div>', '<p>content</p></div><b>x</b></div>' ) );
	assert.deepEqual( sibling.out, {}, 'a wrapper with a second child paints for more than the root' );
	const other = await holdersFor( MEGA.replace( 'class="panel"', 'class="panel" data-fill-owner="3"' ) );
	assert.deepEqual( other.out, {}, 'a wrapper another node owns is that node paint' );
	const bare = await holdersFor( '<header><div class="wrap"><div class="root"><p>c</p></div></div></header>' );
	assert.deepEqual( bare.out, {}, 'no wrapper paints' );
	const notSurface = await holdersFor( MEGA, { surfaceRoot: false } );
	assert.deepEqual( notSurface.out, {}, 'only the root of a state-driven surface reads its wrapper' );
} );

test( 'MUST FAIL: the wrapper paint replaces the root read in the snapshot and its declared values reach the root declared read', () => {
	const widths = { '0:': { styles: { 'border-top-width': '0px', 'border-top-style': 'none', 'border-radius': '0px', color: 'red' } } };
	const declared = { '0:': { display: 'flex' } };
	const held = { '0:': { groups: [ 'border', 'radius' ], depth: 1, stamps: {}, styles: { 'border-top-width': '1px', 'border-top-style': 'solid', 'border-radius': '12px' } } };
	applyPaintHolders( widths, declared, held, { '0:': { border: { 'border-top-width': '1px', 'border-top-style': 'solid', display: 'block' }, radius: { 'border-top-left-radius': '12px', 'border-top-width': '9px' } } } );
	assert.equal( widths[ '0:' ].styles[ 'border-top-width' ], '1px' );
	assert.equal( widths[ '0:' ].styles[ 'border-radius' ], '12px' );
	assert.equal( widths[ '0:' ].styles.color, 'red', 'a property outside the groups is the root own' );
	assert.deepEqual( widths[ '0:' ].paintHolder, { depth: 1, groups: [ 'border', 'radius' ] } );
	assert.deepEqual( declared[ '0:' ], { display: 'flex', 'border-top-width': '1px', 'border-top-style': 'solid', 'border-top-left-radius': '12px' }, 'only each group own longhands move, from that group wrapper' );
	const untouched = { '1:': { styles: { 'border-top-width': '0px' } } };
	applyPaintHolders( untouched, {}, {}, {} );
	applyPaintHolders( { '2:': { missing: true } }, {}, { '2:': held[ '0:' ] }, {} );
	assert.equal( untouched[ '1:' ].styles[ 'border-top-width' ], '0px', 'no wrapper held, no change' );
} );

test( 'jobsFor marks only the root target of the parentless node of a state-driven surface', () => {
	const nodes = skeletonNodes( [ { name: 'sgs/mega-panel', draftRef: { tpl: 'Root/67#0' }, draftSlots: { '.x': { tpl: 'Root/70#0' } }, attributes: {}, innerBlocks: [ { name: 'sgs/text', draftRef: { tpl: 'Root/71#0' }, attributes: {} } ] } ] );
	assert.deepEqual( jobsFor( nodes, { surface: true } ).filter( ( j ) => j.surfaceRoot ).map( ( j ) => j.id ), [ '0:' ] );
	assert.deepEqual( jobsFor( nodes ).filter( ( j ) => j.surfaceRoot ), [], 'a page surface has no surface root' );
} );
