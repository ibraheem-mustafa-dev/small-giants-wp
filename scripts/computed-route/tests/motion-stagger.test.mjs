// A list entrance whose delay the draft computes from the item's index is the stagger of the block holding the items
// (Spec 38A §8 container helper; lib/fill-motion-stagger.mjs, called by lib/fill-motion.mjs::motionWrites): the
// formula's start offset, step and maximum total delay go into `sgsMotion.stagger` with Apply on, and the items' own
// entrance becomes that block's root entrance, its trigger the state the block publishes. The planted records are
// shaped like the re-derived inventory's three staggered lists: the mega panel items (`Math.min(i * 26, 320)`, held by
// a panel part), the drawer rows (`140 + i * 55`) and the drawer accordion sub-items (`80 + Math.min(k * 45, 360)`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema, enumerateFields } from '../lib/motion-schema.mjs';
import { motionWrites } from '../lib/fill-motion.mjs';
import { staggerOf } from '../lib/fill-motion-stagger.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const schema = loadMotionSchema();
const FIELDS = enumerateFields( schema ).filter( ( f ) => 'entrance.base' === f.layer ).map( ( f ) => ( {
	def_name: f.node, field: f.path.split( '.' ).pop(), panel: f.layer.split( '.' )[ 0 ], layer: f.layer, effect: f.effect,
	field_path: `elements.<target>.${ f.layer }.${ f.path.replace( '[]', '' ) }`, field_type: f.fieldType, css_property: f.cssProperty, state: f.state, per_device: f.perDevice ? 1 : 0,
} ) );
const target = ( block, name, support ) => ( { block_slug: block, target: name, css_element: name, kind: 'root' === name ? 'root' : 'part', motion_support: JSON.stringify( support ) } );
const OPENS = { opens: [ 'root' ] };
const NAV = { opens: [ 'panel' ] };
const mdb = motionDb( openDb( fixtureDb( {
	motion_targets: [ target( 'sgs/nav-drawer', 'root', OPENS ), target( 'sgs/accordion-item', 'root', OPENS ), target( 'sgs/container', 'root', {} ), target( 'sgs/nav-bar-menu', 'root', NAV ), target( 'sgs/nav-bar-menu', 'panel', NAV ) ],
	motion_fields: FIELDS,
} ) ) );
const VOCAB = [ { state: 'open', kind: 'attribute', token: '[aria-expanded="true"]' }, { state: 'open', kind: 'class', token: 'is-open' } ];
const EASE = 'cubic-bezier(.16,.84,.32,1)';

const rec = ( id, tpls, delay, over = {} ) => ( {
	id, name: `Web Animation on ${ id }`, mechanism: 'waapi', status: 'active',
	element: { dc: 'Site', template_tpl_id: tpls, selector: '[data-item]', selection_rule: "each element of this._listEl.querySelectorAll('[data-item]')" },
	trigger: { type: 'state', detail: 'componentDidUpdate when mobileOpen changes', state_keys: [ 'mobileOpen' ] },
	properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateX(32px)', to: 'translateX(0)' } ],
	duration_ms: 520, delay_ms: delay, stagger: null, easing: EASE, iterations: 1, direction: 'normal', fill: 'backwards', ...over,
} );
// A template whose list element `holder` holds the items through an unnamed wrapper (the loop's own element).
const template = ( holder, items, above = [] ) => ( { elements: {
	[ `Site/${ holder }` ]: { tag: 'div', parentChain: above.map( ( k ) => `Site/${ k }` ) },
	[ `Site/${ holder }w` ]: { tag: 'div', parentChain: [ holder, ...above ].map( ( k ) => `Site/${ k }` ) },
	...Object.fromEntries( items.map( ( i ) => [ `Site/${ i }`, { tag: 'a', parentChain: [ `${ holder }w`, holder, ...above ].map( ( k ) => `Site/${ k }` ) } ] ) ),
} } );
const node = ( index, name, tpl, slots = {} ) => ( { index, name, targets: [ { id: `${ index }:`, slot: '', finder: { tpl: `Site/${ tpl }#0` } }, ...Object.entries( slots ).map( ( [ slot, t ] ) => ( { id: `${ index }:${ slot }`, slot, finder: { tpl: `Site/${ t }#0` } } ) ) ] } );
const run = ( nodes, records, tpl ) => {
	const flat = nodes.map( ( n ) => ( { name: n.name, attributes: {}, ref: `r${ n.index }` } ) );
	const out = motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records, mdb, schema, rawSnapshot: { settings: { custom: {} } }, template: tpl, stateVocab: VOCAB } );
	return { flat, out };
};
const rows = ( out ) => out.unmapped.map( ( u ) => `${ u.value }: ${ u.reason }` );

test( 'MUST FAIL: an index delay is a start offset, a step and a maximum total delay (the offset included); any other formula is refused', () => {
	assert.deepEqual( staggerOf( { delay_ms: 'Math.min(i * 26, 320)' } ), { offset: 0, step: 26, cap: 320 } );
	assert.deepEqual( staggerOf( { delay_ms: '140 + i * 55' } ), { offset: 140, step: 55 } );
	assert.deepEqual( staggerOf( { delay_ms: '80 + Math.min(k * 45, 360)' } ), { offset: 80, step: 45, cap: 440 } );
	assert.deepEqual( staggerOf( { delay_ms: 'Math.min(80 + k * 45, 440)' } ), { offset: 80, step: 45, cap: 440 } );
	assert.deepEqual( staggerOf( { delay_ms: '(rv.i || 0) * 80' } ), { offset: 0, step: 80 } );
	assert.deepEqual( staggerOf( { delay_ms: 'i * 110 + 80' } ), { offset: 80, step: 110 } );
	assert.deepEqual( staggerOf( { delay_ms: 0, stagger: { ms: 55, base_ms: 140, cap_ms: null, basis: 'index' } } ), { offset: 140, step: 55 } );
	for ( const f of [ '-Math.random() * dur', 'i * i * 10', 'Math.max(i * 26, 320)', 'delay || 0', 'i * 26 + j * 4', '10 - i * 5', 'i * 5000' ] ) {
		assert.match( String( staggerOf( { delay_ms: f } )?.refused ), /stagger helper/, f );
	}
	for ( const d of [ 0, 240, 'per property', '120', null ] ) {
		assert.equal( staggerOf( { delay_ms: d } ), null, String( d ) );
	}
} );

test( 'MUST FAIL: the drawer rows\' index delay is the stagger of the block holding them, with the rows\' entrance on its root; the rows take no entrance of their own', () => {
	const { flat, out } = run( [ node( 0, 'sgs/nav-drawer', '121' ), node( 1, 'sgs/container', '124' ) ], [ rec( 'A-18', [ '124', '178' ], '140 + i * 55' ) ], template( '121', [ '124', '178' ], [ '108' ] ) );
	assert.deepEqual( rows( out ), [] );
	const doc = flat[ 0 ].attributes.sgsMotion;
	assert.deepEqual( doc.stagger, { apply: true, offset: 140, step: 55 } );
	const base = doc.elements.root.entrance.base;
	assert.equal( base.trigger, 'open' );
	assert.deepEqual( [ base.values.from, base.values.to, base.values.duration, base.values.delay ], [ { opacity: 0, translateX: 32 }, { opacity: 1, translateX: 0 }, 520, undefined ] );
	assert.equal( flat[ 1 ].attributes.sgsMotion, undefined, 'the row takes the block\'s entrance through the helper' );
} );

test( 'MUST FAIL: items in separate groups are held by the element every group shares, not by the first item\'s own group', () => {
	const tpl = { elements: {
		'Site/121': { tag: 'div', parentChain: [] },
		'Site/122': { tag: 'div', parentChain: [ 'Site/121' ] }, 'Site/150': { tag: 'div', parentChain: [ 'Site/121' ] },
		'Site/124': { tag: 'a', parentChain: [ 'Site/122', 'Site/121' ] }, 'Site/178': { tag: 'a', parentChain: [ 'Site/150', 'Site/121' ] },
	} };
	const { flat } = run( [ node( 0, 'sgs/nav-drawer', '121' ), node( 1, 'sgs/container', '122' ) ], [ rec( 'A-18', [ '124', '178' ], '140 + i * 55' ) ], tpl );
	assert.deepEqual( flat[ 0 ].attributes.sgsMotion?.stagger, { apply: true, offset: 140, step: 55 } );
	assert.equal( flat[ 1 ].attributes.sgsMotion, undefined, 'the first group is not the list' );
} );

test( 'a list whose scope (the element the script holds by a ref) is no target of the surface gives a block further up nothing', () => {
	const tpl = { elements: {
		'Site/39': { tag: 'header', attrs: { ref: '{{ setHeaderEl }}' }, parentChain: [] },
		'Site/65': { tag: 'div', attrs: { ref: '{{ setPanelEl }}' }, parentChain: [ 'Site/64', 'Site/39' ] },
		'Site/64': { tag: 'div', parentChain: [ 'Site/39' ] },
		'Site/70': { tag: 'a', parentChain: [ 'Site/65', 'Site/64', 'Site/39' ] }, 'Site/87': { tag: 'a', parentChain: [ 'Site/65', 'Site/64', 'Site/39' ] },
	} };
	const { flat, out } = run( [ node( 0, 'sgs/nav-drawer', '39' ) ], [ rec( 'A-14', [ '70', '87' ], 'Math.min(i * 26, 320)' ) ], tpl );
	assert.equal( flat[ 0 ].attributes.sgsMotion, undefined );
	assert.deepEqual( rows( out ).filter( ( r ) => r.startsWith( 'A-14' ) ), [] );
} );

test( 'MUST FAIL: the accordion sub-items\' capped delay is a stagger whose maximum includes its start offset', () => {
	const r = rec( 'A-19', [ '139', '151', '160' ], '80 + Math.min(k * 45, 360)', { trigger: { type: 'state', detail: 'componentDidUpdate when acc, mobileOpen changes', state_keys: [ 'acc', 'mobileOpen' ] }, properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateY(14px)', to: 'none' } ] } );
	const { flat, out } = run( [ node( 0, 'sgs/accordion-item', '135' ) ], [ r ], template( '135', [ '139', '151', '160' ] ) );
	assert.deepEqual( rows( out ), [] );
	assert.deepEqual( flat[ 0 ].attributes.sgsMotion.stagger, { apply: true, offset: 80, step: 45, cap: 440 } );
	assert.deepEqual( flat[ 0 ].attributes.sgsMotion.elements.root.entrance.base.values.from, { opacity: 0, translateY: 14 } );
} );

test( 'MUST FAIL: a list held by a part (the mega panel items in the nav bar\'s panel) has no stagger home and is named, not written', () => {
	const r = rec( 'A-14', [ '70', '87', '100' ], 'Math.min(i * 26, 320)', { trigger: { type: 'state', detail: 'componentDidUpdate when active changes', state_keys: [ 'active' ] } } );
	const { flat, out } = run( [ node( 0, 'sgs/nav-bar-menu', '60', { panel: '65' } ) ], [ r ], template( '65', [ '70', '87', '100' ], [ '60' ] ) );
	assert.equal( flat[ 0 ].attributes.sgsMotion?.stagger, undefined );
	assert.match( rows( out ).join( '\n' ), /A-14: the items' list is held by the panel part of sgs\/nav-bar-menu, not by a block: the stagger helper staggers a block's own items .* 0ms \+ 26ms per item up to 320ms has no home/ );
} );

test( 'MUST FAIL: an index formula the helper cannot hold, a holder with its own entrance and a second list are each a named row', () => {
	const random = run( [ node( 0, 'sgs/nav-drawer', '121' ) ], [ rec( 'A-40', [ '124' ], '-Math.random() * 400' ) ], template( '121', [ '124' ] ) );
	assert.match( rows( random.out ).join( '\n' ), /A-40: the delay "-Math.random\(\) \* 400" is not a start offset plus a step times the item's index/ );
	assert.equal( random.flat[ 0 ].attributes.sgsMotion?.stagger, undefined );
	const own = rec( 'A-16', '121', 0, { selector: 'ref setDrawerEl', properties: [ { property: 'opacity', from: 0, to: 1 } ] } );
	const both = run( [ node( 0, 'sgs/nav-drawer', '121' ) ], [ own, rec( 'A-18', [ '124', '178' ], '140 + i * 55' ) ], template( '121', [ '124', '178' ] ) );
	assert.match( rows( both.out ).join( '\n' ), /A-18: sgs\/nav-drawer plays an entrance of its own/ );
	assert.equal( both.flat[ 0 ].attributes.sgsMotion.stagger, undefined );
	assert.deepEqual( both.flat[ 0 ].attributes.sgsMotion.elements.root.entrance.base.values.from, { opacity: 0 }, 'the block keeps its own entrance' );
	const two = run( [ node( 0, 'sgs/nav-drawer', '121' ) ], [ rec( 'A-18', [ '124' ], '140 + i * 55' ), rec( 'A-19', [ '178' ], 'i * 30' ) ], template( '121', [ '124', '178' ] ) );
	assert.deepEqual( two.flat[ 0 ].attributes.sgsMotion.stagger, { apply: true, offset: 140, step: 55 } );
	assert.match( rows( two.out ).join( '\n' ), /A-19: a second staggered list in sgs\/nav-drawer/ );
} );
