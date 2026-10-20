// FR-48-8 step 5: property_equivalents (lib/fill-equivalents.mjs), "same look, different setting". A child's align-self
// is its parent's Align items only when every child asks the same; a declared height is the min-height setting only when
// the element renders at it. Unit cases for each condition, then the hop end to end through fillTree on the real
// framework DB, its property_equivalents rows served from the seed file the DB is seeded from.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { everyChildSame, rendersAt, equivalentRows, fillEquivalent } from '../lib/fill-equivalents.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { confirmRecords } from '../lib/fill-confirm.mjs';

const SEED = JSON.parse( readFileSync( fileURLToPath( new URL( '../../../plugins/sgs-blocks/scripts/data/property-equivalents.json', import.meta.url ) ), 'utf8' ) ).rows;
// The framework DB with property_equivalents answered from the seed file (the shared DB gains the table at its reseed).
const realDb = openDb();
const db = { prepare: ( sql ) => ( /property_equivalents/.test( sql ) ? { all: ( p ) => SEED.filter( ( r ) => r.draft_property === p ) } : realDb.prepare( sql ) ) };

test( 'every-child-same: MUST FAIL when one sibling asks another value, or one sibling was not measured', () => {
	const styles = { 1: { 'align-self': 'center' }, 2: { 'align-self': 'center' }, 3: { 'align-self': 'flex-start' } };
	const at = ( c ) => styles[ c ];
	assert.equal( everyChildSame( [ 1, 2 ], 'align-self', { 1440: 'center' }, at ), true );
	assert.equal( everyChildSame( [ 1, 2, 3 ], 'align-self', { 1440: 'center' }, at ), false );
	assert.equal( everyChildSame( [ 1, 2, 4 ], 'align-self', { 1440: 'center' }, at ), false, 'an unmeasured child proves nothing' );
	assert.equal( everyChildSame( [], 'align-self', { 1440: 'center' }, at ), false );
} );

test( 'render-matches: MUST FAIL when the content pushes the box past the declared height, or the value is no length', () => {
	assert.equal( rendersAt( { 1440: '400px', 375: '400px' }, () => ( { h: 400.3 } ) ), true );
	assert.equal( rendersAt( { 1440: '400px', 375: '400px' }, ( w ) => ( { h: 375 === w ? 520 : 400 } ) ), false );
	assert.equal( rendersAt( { 1440: '50%' }, () => ( { h: 400 } ) ), false );
	assert.equal( rendersAt( { 1440: '400em' }, () => ( { h: 400 } ) ), false, 'the same number in another unit is no match' );
	assert.equal( rendersAt( { 1440: '400px' }, () => null ), false );
} );

test( 'equivalentRows: no table reads as no rows; any other error is thrown', () => {
	assert.deepEqual( equivalentRows( { prepare: () => {
		throw new Error( 'no such table: property_equivalents' );
	} }, 'height' ), [] );
	assert.throws( () => equivalentRows( { prepare: () => {
		throw new Error( 'database is locked' );
	} }, 'height' ), /locked/ );
	assert.deepEqual( equivalentRows( db, 'height' ).map( ( r ) => r.setting_property ), [ 'min-height' ] );
} );

// A Fill state for one parent (index 0) and its children, each child's root read at 1440.
function state( childStyles, rect = { h: 400 } ) {
	const kids = childStyles.map( ( _, i ) => i + 1 );
	const widths = { 1440: Object.fromEntries( [ [ '0:', { styles: {}, rect } ], ...childStyles.map( ( s, i ) => [ `${ i + 1 }:`, s ? { styles: s, rect } : { missing: true } ] ) ] ) };
	return {
		db,
		nodes: [ { index: 0, name: 'sgs/container', parent: null, children: kids }, ...kids.map( ( k ) => ( { index: k, name: 'sgs/text', parent: 0, children: [] } ) ) ],
		flat: [ 0, ...kids ].map( () => ( { attributes: {} } ) ),
		calFor: () => ( { settings: { alignItems: { property: 'align-items', slot: '.sgs-container__inner', slots: [ '.sgs-container__inner' ], state: null } } } ),
		reads: { widths },
		snaps: [],
		out: { writes: [] },
	};
}
function hooks() {
	const calls = { resolve: [], apply: [] };
	return { calls, h: {
		baselineFn: () => () => undefined,
		apply: ( st, rec, ref, target, prop, res ) => calls.apply.push( { at: rec.index, prop, how: res.how, slot: target.slot } ),
		resolve: ( c ) => {
			calls.resolve.push( c );
			return { status: 'written', slot: c.slots[ 0 ], writes: [ { attr: 'x', value: c.draft[ 1440 ] } ], included: c.draft };
		},
	} };
}

test( 'MUST FAIL (a sibling asking another alignment is never written): the parent hop writes only when every child agrees, once', () => {
	const mixed = state( [ { 'align-self': 'center' }, { 'align-self': 'flex-end' } ] );
	const m = hooks();
	assert.equal( fillEquivalent( mixed, mixed.nodes[ 1 ], { slot: '', id: '1:' }, 'align-self', { 1440: 'center' }, m.h ), null );
	assert.equal( m.calls.resolve.length + m.calls.apply.length, 0 );
	const agreed = state( [ { 'align-self': 'center' }, { 'align-self': 'center' } ] );
	const a = hooks();
	const first = fillEquivalent( agreed, agreed.nodes[ 1 ], { slot: '', id: '1:' }, 'align-self', { 1440: 'center' }, a.h );
	assert.equal( first.status, 'written' );
	assert.deepEqual( a.calls.resolve[ 0 ].slots, [ '.sgs-container__inner', '' ], 'the parent setting\'s calibrated layout slot first' );
	assert.equal( a.calls.resolve[ 0 ].prop, 'align-items' );
	assert.deepEqual( a.calls.apply, [ { at: 0, prop: 'align-self', how: 'equivalent:parent', slot: '.sgs-container__inner' } ] );
	// The second sibling finds the parent written: held, no second write.
	assert.equal( fillEquivalent( agreed, agreed.nodes[ 2 ], { slot: '', id: '2:' }, 'align-self', { 1440: 'center' }, a.h ).status, 'held' );
	assert.equal( a.calls.apply.length, 1 );
} );

test( 'MUST FAIL: the parent hop never fires for an inner element, a root node, or an unmeasured sibling', () => {
	const st = state( [ { 'align-self': 'center' }, { 'align-self': 'center' } ] );
	const x = hooks();
	assert.equal( fillEquivalent( st, st.nodes[ 1 ], { slot: '.sgs-text__inner', id: '1:x' }, 'align-self', { 1440: 'center' }, x.h ), null );
	assert.equal( fillEquivalent( st, st.nodes[ 0 ], { slot: '', id: '0:' }, 'align-self', { 1440: 'center' }, x.h ), null );
	const gap = state( [ { 'align-self': 'center' }, null ] );
	assert.equal( fillEquivalent( gap, gap.nodes[ 1 ], { slot: '', id: '1:' }, 'align-self', { 1440: 'center' }, x.h ), null );
	assert.equal( x.calls.resolve.length, 0 );
} );

test( 'MUST FAIL: a declared height becomes min-height on the element itself only when it renders at that height', () => {
	const fits = state( [ {} ], { h: 400 } );
	const f = hooks();
	assert.equal( fillEquivalent( fits, fits.nodes[ 0 ], { slot: '', id: '0:' }, 'height', { 1440: '400px' }, f.h ).status, 'written' );
	assert.equal( f.calls.resolve[ 0 ].prop, 'min-height' );
	assert.deepEqual( f.calls.resolve[ 0 ].slots, [ '' ] );
	assert.equal( f.calls.apply[ 0 ].how, 'equivalent:self' );
	const grows = state( [ {} ], { h: 460 } );
	const g = hooks();
	assert.equal( fillEquivalent( grows, grows.nodes[ 0 ], { slot: '', id: '0:' }, 'height', { 1440: '400px' }, g.h ), null );
	assert.equal( g.calls.resolve.length, 0 );
} );

test( 'MUST FAIL: the parent hop never overrides a setting the parent wrote from its own draft, nor covers a width the child leaves out', () => {
	const own = state( [ { 'align-self': 'center' }, { 'align-self': 'center' } ] );
	own.out.writes.push( { index: 0, attr: 'x', prop: 'align-items' } );
	const o = hooks();
	assert.equal( fillEquivalent( own, own.nodes[ 1 ], { slot: '', id: '1:' }, 'align-self', { 1440: 'center' }, o.h ), null );
	assert.equal( o.calls.apply.length, 0 );
	// Siblings read at 375 and 1440; this child's draft names only 1440, so the parent would paint 375 unasked.
	const wide = state( [ { 'align-self': 'center' }, { 'align-self': 'center' } ] );
	wide.reads.widths[ 375 ] = { '1:': { styles: { 'align-self': 'center' } }, '2:': { styles: { 'align-self': 'flex-end' } } };
	const w = hooks();
	assert.equal( fillEquivalent( wide, wide.nodes[ 1 ], { slot: '', id: '1:' }, 'align-self', { 1440: 'center' }, w.h ), null );
	assert.equal( w.calls.resolve.length, 0 );
} );

test( 'a row whose setting the resolver cannot reach is passed over, not written', () => {
	const st = state( [ { 'align-self': 'center' } ] );
	const r = hooks();
	r.h.resolve = () => ( { status: 'gap', gap: 'no-setting' } );
	assert.equal( fillEquivalent( st, st.nodes[ 1 ], { slot: '', id: '1:' }, 'align-self', { 1440: 'center' }, r.h ), null );
	assert.equal( r.calls.apply.length, 0 );
} );

// End to end: three text children of a container, each declaring align-self: center, through fillTree.
const THREE = [ 375, 768, 1440 ];
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const BASE = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'background-color': 'rgba(0, 0, 0, 0)' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ], ...extra } );
const CAL = {
	'sgs/container': { block: 'sgs/container', elements: { '': tiers( BASE ), '.sgs-container__inner': tiers( { ...BASE, 'align-items': 'normal' } ) }, settings: { alignItems: setting( 'align-items', { slot: '.sgs-container__inner', slots: [ '.sgs-container__inner' ], reaches: [ '.sgs-container__inner' ] } ) }, discovered: {} },
	'sgs/text': { block: 'sgs/text', elements: { '': tiers( BASE ) }, settings: {}, discovered: {} },
};
function fillWith( alignments ) {
	const skeleton = [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: alignments.map( ( _, i ) => ( { name: 'sgs/text', draftRef: `.t${ i }`, attributes: { text: `T${ i }` } } ) ) } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'eq' );
	const kid = ( a, i ) => ( { styles: { ...BASE, 'align-self': a }, pseudo: {}, rect: { x: 0, y: i * 40, w: 300, h: 40 }, inFlow: true, words: `T${ i }`, href: null } );
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': { styles: BASE, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 200 }, inFlow: true, words: '', href: null }, ...Object.fromEntries( alignments.map( ( a, i ) => [ `${ i + 1 }:`, kid( a, i ) ] ) ) } ] ) );
	const declared = Object.fromEntries( FIVE.map( ( w ) => [ w, Object.fromEntries( alignments.map( ( a, i ) => [ `${ i + 1 }:`, { 'align-self': a } ] ) ) ] ) );
	const nodes = skeletonNodes( skeleton );
	const reads = { widths, declared, sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes, reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => CAL[ b ] ?? null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { tree, nodes, reads, ...out };
}

test( 'MUST FAIL (end to end): children all asking align-self centre write the container\'s Align items once; a dissenting child leaves every row unmapped', () => {
	const agreed = fillWith( [ 'center', 'center', 'center' ] );
	const writes = agreed.writes.filter( ( w ) => 'align-self' === w.prop );
	assert.deepEqual( writes.map( ( w ) => [ w.block, w.attr, w.how ] ), [ [ 'sgs/container', 'alignItems', 'equivalent:parent' ] ] );
	assert.equal( agreed.tree[ 0 ].attributes.alignItems, 'center' );
	assert.equal( agreed.unmapped.filter( ( u ) => 'align-self' === u.property ).length, 0 );
	// The confirm record reads the child that asked align-self, not the container's inner element (which has no target).
	const rec = confirmRecords( { writes: writes, nodes: agreed.nodes, reads: agreed.reads } ).filter( ( r ) => 'align-self' === r.property );
	assert.ok( rec.length > 0 && rec.every( ( r ) => 'center' === r.declared && 'center' === r.renderedDraft && 'open' !== r.verdict ), JSON.stringify( rec ) );
	const mixed = fillWith( [ 'center', 'flex-end', 'center' ] );
	assert.equal( mixed.writes.filter( ( w ) => 'align-self' === w.prop ).length, 0 );
	assert.equal( mixed.tree[ 0 ].attributes.alignItems, undefined );
	assert.equal( mixed.unmapped.filter( ( u ) => 'align-self' === u.property ).length, 3 );
} );
