// FR-48-8 step 5: property_equivalents (lib/fill-equivalents.mjs), "same look, different setting". A child's align-self
// is its parent's Align items only when every child asks the same; a declared height is the min-height setting only when
// the element renders at it. Unit cases for each condition, then the hop end to end through fillTree on the real
// framework DB, its property_equivalents rows served from the seed file the DB is seeded from.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { everyChildSame, rendersAt, equivalentRows, fillEquivalent, intrinsicRatio, ratioOf } from '../lib/fill-equivalents.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { confirmRecords } from '../lib/fill-confirm.mjs';

const SEED = JSON.parse( readFileSync( fileURLToPath( new URL( '../../../plugins/sgs-blocks/scripts/data/property-equivalents.json', import.meta.url ) ), 'utf8' ) ).rows;
// The framework DB with property_equivalents answered from the seed file (the shared DB gains the table at its reseed).
const realDb = openDb();
const db = { prepare: ( sql ) => ( /property_equivalents/.test( sql ) ? { all: ( p ) => SEED.filter( ( r ) => r.draft_property === p ).sort( ( a, b ) => a.setting_property.localeCompare( b.setting_property ) ) } : realDb.prepare( sql ) ) };

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
	assert.deepEqual( equivalentRows( db, 'height' ).map( ( r ) => r.setting_property ), [ 'max-height', 'min-height' ] );
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

// intrinsic-ratio: an image, SVG or logo whose box keeps its ratio at every width.
const RATIO = 3741 / 848;
const snapAt = ( h, intrinsic = { ratio: RATIO } ) => ( { styles: {}, rect: { w: h * RATIO, h }, ...( intrinsic ? { intrinsic } : {} ) } );
const HEIGHTS = { 375: '40px', 768: '56px', 1440: '66px' };
function ratioState( { intrinsic, declared = {}, stretch = 1, heights = HEIGHTS } ) {
	const st = state( [] );
	st.reads.widths = Object.fromEntries( Object.entries( heights ).map( ( [ w, h ] ) => [ w, { '0:': { ...snapAt( parseFloat( h ), intrinsic ), rect: { w: parseFloat( h ) * RATIO * stretch, h: parseFloat( h ) } } } ] ) );
	st.reads.declared = Object.fromEntries( Object.keys( heights ).map( ( w ) => [ w, { '0:': declared } ] ) );
	st.calFor = () => ( { settings: {} } );
	return st;
}

test( 'ratioOf: reads "w / h", "auto w / h" and a bare number; anything else is no ratio', () => {
	assert.ok( Math.abs( ratioOf( '3741 / 848' ) - RATIO ) < 1e-9 );
	assert.ok( Math.abs( ratioOf( 'auto 3741/848' ) - RATIO ) < 1e-9 );
	assert.equal( ratioOf( '1.5' ), 1.5 );
	assert.equal( ratioOf( 'auto' ), null );
	assert.equal( ratioOf( undefined ), null );
} );

test( 'intrinsicRatio: MUST FAIL when the box leaves its ratio at one width, or no width states a ratio', () => {
	const snaps = { 375: snapAt( 40 ), 768: snapAt( 56 ) };
	assert.equal( intrinsicRatio( [ 375, 768 ], ( w ) => snaps[ w ], () => undefined ), true );
	snaps[ 768 ] = { ...snapAt( 56 ), rect: { w: 56 * RATIO * 1.2, h: 56 } };
	assert.equal( intrinsicRatio( [ 375, 768 ], ( w ) => snaps[ w ], () => undefined ), false, 'a stretched box is not the ratio' );
	assert.equal( intrinsicRatio( [ 375 ], () => snapAt( 40, null ), () => undefined ), false );
	assert.equal( intrinsicRatio( [ 375 ], () => snapAt( 40, null ), () => '3741 / 848' ), true, 'a declared aspect-ratio is a ratio' );
	assert.equal( intrinsicRatio( [], () => snapAt( 40 ), () => undefined ), false );
	assert.equal( intrinsicRatio( [ 375 ], () => undefined, () => '3741 / 848' ), false, 'an unmeasured box proves nothing' );
} );

test( 'MUST FAIL: an element of intrinsic ratio gets max-height at every width, the rendered height, never the plain-declared widths only', () => {
	const st = ratioState( { intrinsic: { ratio: RATIO } } );
	const x = hooks();
	const res = fillEquivalent( st, st.nodes[ 0 ], { slot: '', id: '0:' }, 'height', { 768: '56px' }, { ...x.h, rendered: HEIGHTS } );
	assert.equal( res.status, 'written' );
	assert.equal( res.condition, 'intrinsic-ratio' );
	assert.equal( x.calls.resolve[ 0 ].prop, 'max-height' );
	assert.deepEqual( x.calls.resolve[ 0 ].draft, HEIGHTS );
	assert.deepEqual( x.calls.apply, [ { at: 0, prop: 'height', how: 'equivalent:self', slot: '' } ] );
} );

test( 'MUST FAIL: an element with no intrinsic ratio, or a stretched one, never gets max-height from a height', () => {
	const plain = ratioState( { intrinsic: null } );
	const a = hooks();
	assert.equal( fillEquivalent( plain, plain.nodes[ 0 ], { slot: '', id: '0:' }, 'height', { 768: '57px' }, { ...a.h, rendered: HEIGHTS } ), null );
	assert.equal( a.calls.resolve.length, 0 );
	const stretched = ratioState( { intrinsic: { ratio: RATIO }, stretch: 1.3 } );
	const b = hooks();
	assert.equal( fillEquivalent( stretched, stretched.nodes[ 0 ], { slot: '', id: '0:' }, 'height', { 768: '57px' }, { ...b.h, rendered: HEIGHTS } ), null );
	assert.equal( b.calls.resolve.length, 0 );
	const declared = ratioState( { intrinsic: null, declared: { 'aspect-ratio': '3741 / 848' } } );
	const c = hooks();
	assert.equal( fillEquivalent( declared, declared.nodes[ 0 ], { slot: '', id: '0:' }, 'height', { 768: '57px' }, { ...c.h, rendered: HEIGHTS } ).condition, 'intrinsic-ratio', 'a declared ratio on a box that keeps it is a ratio element' );
} );

test( 'MUST FAIL: a row whose condition Fill does not know is never applied; it is named', () => {
	const row = { draft_property: 'height', setting_property: 'max-height', hop: 'self', condition: 'always', note: 'x' };
	const st = { ...ratioState( { intrinsic: { ratio: RATIO } } ), db: { prepare: () => ( { all: () => [ row ] } ) } };
	const x = hooks();
	const res = fillEquivalent( st, st.nodes[ 0 ], { slot: '', id: '0:' }, 'height', { 768: '56px' }, { ...x.h, rendered: HEIGHTS } );
	assert.equal( res.status, 'gap' );
	assert.equal( res.gap, 'unknown-condition' );
	assert.match( res.detail, /height to max-height \(always\)/ );
	assert.equal( x.calls.resolve.length + x.calls.apply.length, 0 );
} );

test( 'MUST FAIL (end to end): a logo of intrinsic ratio takes its rendered height per tier as maxHeight, with no not-plain row left for the clamp', () => {
	const skeleton = [ { name: 'sgs/responsive-logo', draftRef: 'main', attributes: {} } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'eq' );
	const heights = { 375: 40, 768: 56, 1440: 66, 1920: 66, 1024: 60 };
	const declaredHeight = { 375: 'min(54px, -26.2443px + 22.6244vw)', 768: '56px', 1440: 'clamp(54px, 4.4vw, 66px)', 1024: '60px', 1920: 'clamp(54px, 4.4vw, 66px)' };
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': { styles: { ...BASE, height: `${ heights[ w ] }px` }, pseudo: {}, rect: { x: 0, y: 0, w: heights[ w ] * RATIO, h: heights[ w ] }, inFlow: true, words: '', href: null, intrinsic: { ratio: RATIO } } } ] ) );
	const declared = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': { height: declaredHeight[ w ], 'aspect-ratio': '3741 / 848' } } ] ) );
	const nodes = skeletonNodes( skeleton );
	const cal = { block: 'sgs/responsive-logo', elements: { '': tiers( { ...BASE, 'max-height': 'none' } ) }, settings: { maxHeight: setting( 'max-height' ) }, discovered: {} };
	const reads = { widths, declared, sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes, reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => ( 'sgs/responsive-logo' === b ? cal : null ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	const writes = out.writes.filter( ( w ) => 'height' === w.prop );
	assert.deepEqual( writes.map( ( w ) => [ w.attr, w.how ] ), [ [ 'maxHeight', 'equivalent:self' ] ] );
	const mh = tree[ 0 ].attributes.maxHeight;
	assert.deepEqual( [ mh.mobile, mh.tablet, mh.desktop ].map( Number ), [ 40, 56, 66 ] );
	assert.equal( out.unmapped.filter( ( u ) => 'height' === u.property ).length, 0, JSON.stringify( out.unmapped ) );
	assert.match( writes[ 0 ].note, /replaces the not-plain declared values .*height clamp\(54px, 4\.4vw, 66px\)/, 'the not-plain values the write replaces stay on its note' );
	assert.match( writes[ 0 ].note, /min\(54px, -26\.2443px \+ 22\.6244vw\)/ );
} );

test( 'MUST FAIL: a ratio element whose maximum height already holds the rendered heights writes nothing, and its not-plain rows stay rows', () => {
	const skeleton = [ { name: 'sgs/responsive-logo', draftRef: 'main', attributes: {} } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'eq' );
	tree[ 0 ].attributes.maxHeight = { mobile: 40, tablet: 56, desktop: 66 };
	const heights = { 375: 40, 768: 56, 1440: 66, 1920: 66, 1024: 60 };
	const declaredHeight = { 375: 'min(54px, -26.2443px + 22.6244vw)', 768: '56px', 1440: 'clamp(54px, 4.4vw, 66px)', 1024: '60px', 1920: 'clamp(54px, 4.4vw, 66px)' };
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': { styles: { ...BASE, height: `${ heights[ w ] }px` }, pseudo: {}, rect: { x: 0, y: 0, w: heights[ w ] * RATIO, h: heights[ w ] }, inFlow: true, words: '', href: null, intrinsic: { ratio: RATIO } } } ] ) );
	const declared = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': { height: declaredHeight[ w ], 'aspect-ratio': '3741 / 848' } } ] ) );
	const cal = { block: 'sgs/responsive-logo', elements: { '': tiers( { ...BASE, 'max-height': 'none' } ) }, settings: { maxHeight: setting( 'max-height' ) }, discovered: {} };
	const reads = { widths, declared, sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes: skeletonNodes( skeleton ), reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => ( 'sgs/responsive-logo' === b ? cal : null ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	assert.equal( out.writes.filter( ( w ) => 'height' === w.prop ).length, 0, JSON.stringify( out.writes ) );
	const rows = out.unmapped.filter( ( u ) => 'height' === u.property );
	assert.ok( rows.length >= 2 && rows.every( ( u ) => /^not-plain/.test( u.reason ) ), JSON.stringify( out.unmapped ) );
	assert.ok( rows.some( ( u ) => /clamp\(54px, 4\.4vw, 66px\)/.test( u.value ) ) );
} );
