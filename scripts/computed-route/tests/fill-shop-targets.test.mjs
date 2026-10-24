// Fill measures the shop parts' draft elements by their locators (lib/fill-shop-targets.mjs): over the committed Mama's
// record and the real framework DB, a part whose settings paint one framework part gets that part's slot as a target on its
// block's node, and a read of that element is written to the part's settings.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { shopPartTargets, partElement, instanceOf, locatedElement } from '../lib/fill-shop-targets.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const record = JSON.parse( fs.readFileSync( path.join( HERE, '../../../sites/mamas-munches-redesign/build/shop-parts.json' ), 'utf8' ) );
const db = openDb();
const THREE = [ 375, 768, 1440 ];
const ROOT = 'Product';
const BASE = { display: 'block', direction: 'ltr', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'line-height': '24px', 'background-color': 'rgba(0, 0, 0, 0)' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const SLOT = '.sgs-cart__panel > .sgs-cart__item-thumb';
const cal = { block: 'sgs/cart', elements: { '': tiers( BASE ), [ SLOT ]: tiers( BASE ) }, settings: { itemThumbBg: { slot: SLOT, slots: [ SLOT ], reaches: [ SLOT ], property: 'background-color', state: null, forms: [], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ] } }, discovered: {} };
const calFor = ( b ) => ( 'sgs/cart' === b ? cal : null );
// The fact record's instance of every located element: copy 0 of the element in the entry draft.
const facts = { elements: Object.fromEntries( record.surfaces.flatMap( ( s ) => s.parts ).flatMap( ( p ) => p.locators || [] ).map( ( k ) => [ k, { instances: [ { key: `${ k }#0`, state: 'x' } ] } ] ) ) };
const part = ( id ) => record.surfaces.flatMap( ( s ) => s.parts ).find( ( p ) => p.id === id );
const surface = () => {
	const skeleton = [ { name: 'sgs/cart', draftRef: { tpl: 'Root/1#0' }, attributes: {}, innerBlocks: [] } ];
	return { skeleton, nodes: skeletonNodes( skeleton ) };
};
const snap = ( styles ) => ( { styles: { ...BASE, ...styles }, pseudo: {}, rect: { x: 0, y: 0, w: 60, h: 60 }, inFlow: true, words: '', href: null, layoutDisplay: 'block' } );

test( 'MUST FAIL: a part whose one setting paints the thumbnail part is measured at the thumbnail slot, from its locator', () => {
	const { nodes } = surface();
	const out = shopPartTargets( { record, nodes, facts, rootComponent: ROOT, db, calFor } );
	const added = out.added.filter( ( a ) => 'drawer-line-image' === a.part );
	assert.deepEqual( added.map( ( a ) => [ a.slot, a.finder ] ), [ [ SLOT, { tpl: `${ part( 'drawer-line-image' ).locators[ 0 ] }#0` } ] ] );
	assert.ok( nodes[ 0 ].targets.some( ( t ) => t.slot === SLOT && 'SiteHeader/141#0' === t.finder.tpl ) );
} );

test( 'MUST FAIL: the located element\'s background is written to the part\'s setting by the resting pass', () => {
	const { skeleton, nodes } = surface();
	shopPartTargets( { record, nodes, facts, rootComponent: ROOT, db, calFor } );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'shop' );
	const widths = Object.fromEntries( THREE.map( ( w ) => [ w, { '0:': snap( {} ), [ `0:${ SLOT }` ]: snap( { 'background-color': 'rgb(10, 126, 168)' } ) } ] ) );
	const reads = { widths, declared: {}, sweep: {}, origin: {}, states: {} };
	const r = fillTree( { tree, nodes, reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: { settings: { custom: {} } }, calFor, ledger: [], ledgerStates: [] } );
	const w = r.writes.filter( ( x ) => 'itemThumbBg' === x.attr );
	assert.equal( w.length, 1, JSON.stringify( r.writes.map( ( x ) => x.attr ) ) );
	assert.match( String( w[ 0 ].after ), /10|126|168|0a7ea8/i );
	// Negative control: without the part's target the same reads give the thumbnail setting nothing.
	const bare = surface();
	const tree2 = cleanTree( bare.skeleton );
	addRefs( tree2, 'shop' );
	const none = fillTree( { tree: tree2, nodes: bare.nodes, reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: { settings: { custom: {} } }, calFor, ledger: [], ledgerStates: [] } );
	assert.deepEqual( none.writes.filter( ( x ) => 'itemThumbBg' === x.attr ), [] );
} );

test( 'a part whose settings paint no part, or several, or have no instance in the fact record, is a note and no target', () => {
	assert.match( partElement( db, part( 'drawer-empty-message' ) ).why, /none of its settings paints a part/ );
	assert.deepEqual( partElement( db, part( 'drawer-line-image' ) ), { element: 'itemThumb' } );
	assert.deepEqual( partElement( db, { home: { block: 'sgs/cart', settings: [ 'itemThumbBg', 'iconColour' ] } } ).why, 'its settings paint several parts (icon, itemThumb)' );
	const { nodes } = surface();
	const out = shopPartTargets( { record, nodes, facts: { elements: {} }, rootComponent: ROOT, db, calFor } );
	assert.deepEqual( out.added, [] );
	assert.ok( out.notes.some( ( n ) => /drawer-line-image .*no instance of/.test( n ) ), out.notes.join( '\n' ) );
	assert.equal( instanceOf( facts, 'nowhere/1', ROOT ), null );
	assert.equal( instanceOf( { elements: { 'a/1': { instances: [ { key: 'a/1#2' }, { key: 'a/1#0' } ] } } }, 'a/1', null ), 'a/1#0' );
	assert.equal( instanceOf( { elements: { [ `${ ROOT }/1` ]: { instances: [ { key: `${ ROOT }/1#0` } ] } } }, `${ ROOT }/1`, ROOT ), 'Root/1#0' );
} );

test( 'a node that already measures the slot keeps its own target, and a block absent from the surface gets none', () => {
	const { nodes } = surface();
	nodes[ 0 ].targets.push( { id: `0:${ SLOT }`, index: 0, slot: SLOT, finder: { tpl: 'Root/9#0' }, scoped: true } );
	const out = shopPartTargets( { record, nodes, facts, rootComponent: ROOT, db, calFor } );
	assert.deepEqual( out.added.filter( ( a ) => 'drawer-line-image' === a.part ), [] );
	assert.equal( nodes[ 0 ].targets.find( ( t ) => t.slot === SLOT ).finder.tpl, 'Root/9#0' );
	const none = shopPartTargets( { record, nodes: skeletonNodes( [ { name: 'sgs/container', draftRef: { tpl: 'Root/1#0' }, attributes: {}, innerBlocks: [] } ] ), facts, rootComponent: ROOT, db, calFor } );
	assert.deepEqual( none.added, [] );
} );

test( 'the block\'s wrapper settings do not make a part ambiguous, and locators with no recorded ancestry are a note, not the first one', () => {
	const base = part( 'drawer-line-image' );
	const extra = { ...base, id: 'synthetic', home: { ...base.home, settings: [ 'itemThumbBg', 'margin' ] }, locators: [ 'SiteHeader/141', 'SiteHeader/142' ] };
	assert.deepEqual( partElement( db, extra ), { element: 'itemThumb' } );
	const { nodes } = surface();
	const more = { elements: { ...facts.elements, 'SiteHeader/142': { instances: [ { key: 'SiteHeader/142#0' } ] } } };
	const out = shopPartTargets( { record: { surfaces: [ { kind: 'drawer', parts: [ extra ] } ] }, nodes, facts: more, rootComponent: ROOT, db, calFor } );
	assert.deepEqual( out.added, [] );
	assert.ok( out.notes.some( ( n ) => /synthetic .*no template ancestry for SiteHeader\/141, SiteHeader\/142/.test( n ) ), out.notes.join( '\n' ) );
} );

// Mama's real buybox-sticky-bar part (build/shop-parts.json): locators Product/143 (the price text), 144 (the sub line) and
// 145 (the button); the fact record's template ancestry (fixture copied from its facts.json) puts 143 and 144 under 142,
// and 142 and 145 under the bar, Product/141. The record's instances are empty (the bar renders behind an sc-if); the
// measuring case gives each element its copy 0, as the drawer cases above do.
const STICKY = JSON.parse( fs.readFileSync( path.join( HERE, 'fixtures/fill-shop-targets/mamas-sticky-bar-facts.json' ), 'utf8' ) );
const BAR = '.sgs-buybox__sticky-bar';
const buyCal = { block: 'sgs/buybox', elements: { '': tiers( BASE ), [ BAR ]: tiers( BASE ) }, settings: { stickyBarBackground: { slot: BAR, slots: [ BAR ], reaches: [ BAR ], property: 'background-color', state: null, forms: [], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ] } }, discovered: {} };
const buySurface = () => skeletonNodes( [ { name: 'sgs/buybox', draftRef: { tpl: 'Root/1#0' }, attributes: {}, innerBlocks: [] } ] );
const withCopies = { elements: Object.fromEntries( Object.entries( STICKY.elements ).map( ( [ k, e ] ) => [ k, { ...e, instances: [ { key: `${ k }#0` } ] } ] ) ) };

test( 'MUST FAIL: a part located by several units is measured at the element they share, not at its first unit (Mama\'s sticky bar)', () => {
	const sticky = part( 'buybox-sticky-bar' );
	assert.deepEqual( sticky.locators, [ 'Product/143', 'Product/144', 'Product/145' ] );
	const nodes = buySurface();
	const out = shopPartTargets( { record: { surfaces: [ { kind: 'buybox', parts: [ sticky ] } ] }, nodes, facts: withCopies, rootComponent: ROOT, db, calFor: () => buyCal } );
	assert.deepEqual( out.added.map( ( a ) => [ a.slot, a.finder.tpl ] ), [ [ BAR, 'Root/141#0' ] ] );
} );

test( 'negative control: one locator is measured as itself; the record\'s empty instances of the bar are a note; a wrapper is never the shared element', () => {
	assert.deepEqual( locatedElement( STICKY, [ 'Product/143' ] ), { key: 'Product/143' } );
	assert.deepEqual( locatedElement( STICKY, [ 'Product/143', 'Product/144' ] ), { key: 'Product/142' } );
	assert.deepEqual( locatedElement( STICKY, [ 'Product/142', 'Product/143' ] ), { key: 'Product/142' }, 'a locator that holds the others is the shared element' );
	assert.deepEqual( locatedElement( STICKY, [ 'Product/143', 'Product/144', 'Product/145' ] ), { key: 'Product/141' } );
	// With the bar a loop wrapper, the shared element passes it and the sc-if (Product/140) to the page root.
	const looped = { elements: { ...STICKY.elements, 'Product/141': { template: { ...STICKY.elements[ 'Product/141' ].template, tag: 'sc-for' } } } };
	assert.deepEqual( locatedElement( looped, [ 'Product/143', 'Product/145' ] ), { key: 'Product/5' } );
	const nodes = buySurface();
	const out = shopPartTargets( { record: { surfaces: [ { kind: 'buybox', parts: [ part( 'buybox-sticky-bar' ) ] } ] }, nodes, facts: STICKY, rootComponent: ROOT, db, calFor: () => buyCal } );
	assert.deepEqual( out.added, [] );
	assert.ok( out.notes.some( ( n ) => /buybox-sticky-bar .*no instance of Product\/141/.test( n ) ), out.notes.join( '\n' ) );
} );

test( 'a part whose home is a built-in or a template block is not measured', () => {
	const base = part( 'drawer-line-image' );
	const { nodes } = surface();
	const built = { ...base, home: { ...base.home, type: 'built-in' } };
	const out = shopPartTargets( { record: { surfaces: [ { kind: 'drawer', parts: [ built ] } ] }, nodes, facts, rootComponent: ROOT, db, calFor } );
	assert.deepEqual( out.added, [] );
} );
