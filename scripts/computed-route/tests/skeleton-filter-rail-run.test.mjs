// The draft's own filter button and the rail's run (rules.filterRail, lib/skeleton-filter-rail.mjs::railToggle, railPass, railRun;
// Spec 48 FR-48-61): the rail the rules placed stands for the draft's rail element, so that element's unread paint is the filter's
// missing features, and the draft's filter button, which runs the handler the rail's own controls run, leaves the skeleton for the
// theme's own drawer trigger. Tests marked MUST FAIL fail without the code they name. Synthetic inventories; no browser, no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { railPass, railRun, railToggle } from '../lib/skeleton-filter-rail.mjs';

test( 'MUST FAIL: railRun names the draft element of the placed rail as the run the filter replaced; no rail, a note, or a rail with no node of its own names none', () => {
	const tree = [ { name: 'sgs/container', attributes: {}, draftRef: { tpl: 'Root/9#0' }, innerBlocks: [ { name: 'woocommerce/product-filters', attributes: {}, innerBlocks: [] } ] } ];
	assert.deepEqual( railRun( { proposal: { filterRail: { key: 'Root/9#0', groups: [] } }, skeleton: tree } ), { id: 'filter-rail', block: 'sgs/container', at: 'Root/9#0', run: [ 'Root/9#0' ] } );
	assert.equal( railRun( { proposal: { filterRail: { note: 'the labels sit apart' } }, skeleton: tree } ), null );
	assert.equal( railRun( { proposal: {}, skeleton: tree } ), null );
	assert.equal( railRun( { proposal: { filterRail: { key: 'Root/10#0' } }, skeleton: tree } ), null );
	assert.equal( railRun( { proposal: { filterRail: { key: 'Root/9#0' } }, skeleton: [] } ), null );
} );

// The draft's own filter button (rules.filterRail, lib/skeleton-filter-rail.mjs::railToggle, railPass): the theme's filter drawer builds
// its own trigger, so the button that runs the handler the rail's own controls run is left out and its paint is the filter's.
const px = ( key, parentKey, tag, snippet, shownAt = [ 375, 768, 1440 ] ) => ( { key, parentKey, tag, snippet, words: 'x', visible: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, shownAt.includes( w ) ] ) ) } );
const click = ( handler ) => `<button sc-camel-on-click="{{ ${ handler } }}" data-dc-tpl="1">Filter {{ n }}</button>`;
const RAIL_INV = ( over = [] ) => ( { elements: [
	px( 'Root/1#0', null, 'div', '<div>' ), px( 'Root/5#0', 'Root/1#0', 'button', click( 'toggleFilters' ), [ 375, 768 ] ), px( 'Root/6#0', 'Root/1#0', 'select', '<select>' ),
	px( 'Root/9#0', 'Root/1#0', 'aside', '<aside>', [ 1440 ] ), ...over,
], revealed: [ px( 'Root/11#0', 'Root/9#0', 'button', click( 'toggleFilters' ).replace( 'Filter {{ n }}', '×' ), [ 375 ] ), px( 'Root/12#0', 'Root/9#0', 'button', click( 'clearAll' ), [ 375 ] ) ] } );
const RAIL_TREE = () => [ { name: 'sgs/container', attributes: {}, draftRef: { tpl: 'Root/1#0' }, innerBlocks: [
	{ name: 'sgs/button', attributes: { label: 'Filter' }, innerBlocks: [], draftRef: { tpl: 'Root/5#0' } },
	{ name: 'sgs/container', attributes: {}, innerBlocks: [ { name: 'woocommerce/product-filters', attributes: {}, innerBlocks: [] } ], draftRef: { tpl: 'Root/9#0' } },
] } ];
const RAIL_PROPOSAL = () => ( { filterRail: { key: 'Root/9#0', groups: [], notes: [] }, counts: { skeletonNodes: 3, expandedNodes: 3, removed: 0 }, rows: [ { key: 'Root/5#0', block: 'sgs/button', action: null, rule: null, reason: null }, { key: 'Root/6#0', block: 'sgs/form-field-select', action: null } ] } );

test( 'MUST FAIL: railToggle finds the draft button that runs the handler the rail\'s own controls run, by the handler and never by its words', () => {
	assert.deepEqual( railToggle( { inventory: RAIL_INV(), railKey: 'Root/9#0' } ), { key: 'Root/5#0' } );
	// Negative controls: a button outside the rail whose handler no control of the rail runs, and a button with the same words but no handler, are not it.
	const other = px( 'Root/7#0', 'Root/1#0', 'button', click( 'openCart' ) );
	const words = px( 'Root/8#0', 'Root/1#0', 'button', '<button>Filter</button>' );
	// An element that is no button or link running the same handler (the draft's select, a wrapper) is not it either.
	const wrapper = px( 'Root/10#0', 'Root/1#0', 'div', '<div onClick="{{ toggleFilters }}">' );
	assert.deepEqual( railToggle( { inventory: RAIL_INV( [ other, words, wrapper ] ), railKey: 'Root/9#0' } ), { key: 'Root/5#0' } );
	const none = RAIL_INV().elements.filter( ( e ) => 'Root/5#0' !== e.key );
	assert.equal( railToggle( { inventory: { ...RAIL_INV(), elements: none }, railKey: 'Root/9#0' } ), null );
	// A button inside the rail is the drawer's own, a button never shown is no trigger, and a rail the inventory does not hold has none.
	assert.equal( railToggle( { inventory: { ...RAIL_INV(), elements: RAIL_INV().elements.map( ( e ) => ( 'Root/5#0' === e.key ? { ...e, parentKey: 'Root/9#0' } : e ) ) }, railKey: 'Root/9#0' } ), null );
	assert.equal( railToggle( { inventory: { ...RAIL_INV(), elements: RAIL_INV().elements.map( ( e ) => ( 'Root/5#0' === e.key ? px( e.key, e.parentKey, 'button', e.snippet, [] ) : e ) ) }, railKey: 'Root/9#0' } ), null );
	assert.equal( railToggle( { inventory: RAIL_INV(), railKey: 'Root/99#0' } ), null );
	// A draft written with a plain onClick is read the same way.
	const plain = RAIL_INV().elements.map( ( e ) => ( 'Root/5#0' === e.key ? px( e.key, e.parentKey, 'button', '<button onClick="{{ toggleFilters }}">Filter</button>', [ 375 ] ) : e ) );
	assert.deepEqual( railToggle( { inventory: { ...RAIL_INV(), elements: plain }, railKey: 'Root/9#0' } ), { key: 'Root/5#0' } );
	// Two buttons run it: none is taken, and a note says so.
	const two = railToggle( { inventory: RAIL_INV( [ px( 'Root/7#0', 'Root/1#0', 'a', click( 'toggleFilters' ) ) ] ), railKey: 'Root/9#0' } );
	assert.equal( two.key, undefined );
	assert.match( two.notes[ 0 ], /2 buttons outside it running the handler its own controls run \(Root\/5#0, Root\/7#0\)/ );
} );

test( 'MUST FAIL: railPass leaves the draft\'s filter button out of the skeleton and names it with the rail as the filter\'s run; with no such button the tree stays', () => {
	const tree = RAIL_TREE();
	const proposal = RAIL_PROPOSAL();
	const snapshot = structuredClone( { tree, proposal } );
	const got = railPass( { inventory: RAIL_INV(), proposal, skeleton: tree } );
	assert.deepEqual( got.skeleton[ 0 ].innerBlocks.map( ( n ) => n.draftRef.tpl ), [ 'Root/9#0' ] );
	assert.deepEqual( got.run, { id: 'filter-rail', block: 'sgs/container', at: 'Root/9#0', run: [ 'Root/9#0', 'Root/5#0' ] } );
	const row = got.proposal.rows.find( ( r ) => 'Root/5#0' === r.key );
	assert.deepEqual( [ row.action, row.rule ], [ 'remove', 'filterRail' ] );
	assert.match( row.reason, /theme's drawer trigger/ );
	assert.equal( got.proposal.rows.find( ( r ) => 'Root/6#0' === r.key ).action, null );
	assert.deepEqual( got.proposal.counts, { skeletonNodes: 2, expandedNodes: 2, removed: 1 } );
	assert.equal( got.proposal.filterRail.toggle, 'Root/5#0' );
	assert.match( got.proposal.filterRail.notes[ 0 ], /no second button is built/ );
	assert.deepEqual( { tree, proposal }, snapshot, 'the inputs are not changed' );
	// Negative controls: no button runs the rail's handler, no rail was placed, or the button has no node of its own: the tree stays as it is.
	const noButton = railPass( { inventory: RAIL_INV( [] ).elements.length ? { ...RAIL_INV(), elements: RAIL_INV().elements.filter( ( e ) => 'Root/5#0' !== e.key ) } : null, proposal, skeleton: tree } );
	assert.equal( noButton.skeleton, tree );
	assert.deepEqual( noButton.run.run, [ 'Root/9#0' ] );
	assert.deepEqual( railPass( { inventory: RAIL_INV(), proposal: { counts: {}, rows: [] }, skeleton: tree } ), { skeleton: tree, proposal: {}, run: null } );
	const noNode = railPass( { inventory: RAIL_INV(), proposal, skeleton: [ tree[ 0 ].innerBlocks[ 1 ] ] } );
	assert.deepEqual( noNode.proposal, {} );
	assert.deepEqual( noNode.run.run, [ 'Root/9#0' ] );
} );
