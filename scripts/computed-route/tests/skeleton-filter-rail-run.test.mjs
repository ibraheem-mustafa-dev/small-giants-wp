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

// The handler is the moustache's contents with its spaces trimmed (lib/skeleton-filter-rail.mjs::handlerOf): a handler whose name
// starts or ends with the letter s, written with or without the spaces, is the same handler.
test( 'MUST FAIL: railToggle reads a handler named with a leading or trailing s, spaced or not, as one handler', () => {
	const tight = ( h ) => `<button sc-camel-on-click="{{${ h }}}" data-dc-tpl="1">Filter</button>`;
	const inv = { elements: [
		px( 'Root/1#0', null, 'div', '<div>' ), px( 'Root/5#0', 'Root/1#0', 'button', tight( 'showFilters' ), [ 375 ] ),
		px( 'Root/9#0', 'Root/1#0', 'aside', '<aside>', [ 1440 ] ),
	], revealed: [ px( 'Root/11#0', 'Root/9#0', 'button', click( 'showFilters' ).replace( 'Filter {{ n }}', '×' ), [ 375 ] ) ] };
	assert.deepEqual( railToggle( { inventory: inv, railKey: 'Root/9#0' } ), { key: 'Root/5#0' } );
	// Negative control: a handler that differs only by its letters is another handler.
	const other = { ...inv, elements: inv.elements.map( ( e ) => ( 'Root/5#0' === e.key ? px( e.key, e.parentKey, 'button', tight( 'howFilter' ), [ 375 ] ) : e ) ) };
	assert.equal( railToggle( { inventory: other, railKey: 'Root/9#0' } ), null );
} );

// Eye Care's saved shop inventory (tests/fixtures/skeleton-commerce/ec-shop-rail-inventory.json: the rail, its subtree, the draft's
// FILTER button and their ancestors, trimmed from what `skeleton.mjs inventory --saved` wrote) holds no revealed drawer controls: the
// drawer's close and apply buttons are read from the rail's template element in the draft's own file, so the draft's FILTER button
// is found and leaves the tree for the theme's own trigger.
test( 'MUST FAIL: on Eye Care\'s saved shop inventory the draft\'s filter button is found from the rail\'s template; without the draft it is not', async () => {
	const fs = await import( 'node:fs' );
	const path = await import( 'node:path' );
	const { fileURLToPath } = await import( 'node:url' );
	const here = path.dirname( fileURLToPath( import.meta.url ) );
	const inventory = JSON.parse( fs.readFileSync( path.join( here, 'fixtures', 'skeleton-commerce', 'ec-shop-rail-inventory.json' ), 'utf8' ) );
	const source = fs.readFileSync( path.join( here, '..', '..', '..', 'sites', 'eye-care-ward-end', 'handoff', 'Eye Care Birmingham.dc.html' ), 'utf8' );
	const railKey = inventory.elements.find( ( e ) => 'aside' === e.tag ).key;
	assert.equal( ( inventory.revealed || [] ).length, 0, 'the saved inventory revealed nothing' );
	assert.deepEqual( railToggle( { inventory, railKey, source } ), { key: 'Root/254#0' } );
	// Negative controls: no draft file finds nothing, and an inventory numbered from another version of the draft (its rail's stamp
	// names a template element of another tag) reads no handler from the template.
	assert.equal( railToggle( { inventory, railKey } ), null );
	const shifted = { ...inventory, elements: inventory.elements.map( ( e ) => ( e.key === railKey ? { ...e, tpl: e.tpl + 2 } : e ) ) };
	assert.equal( railToggle( { inventory: shifted, railKey, source } ), null );
	// The pass drops the button from the tree and records the removal.
	const tree = [ { name: 'sgs/container', attributes: {}, innerBlocks: [ { name: 'sgs/button', attributes: { label: 'Filter' }, innerBlocks: [], draftRef: { tpl: 'Root/254#0' } }, { name: 'sgs/container', attributes: {}, innerBlocks: [], draftRef: { tpl: railKey } } ] } ];
	const proposal = { filterRail: { key: railKey, groups: [], notes: [] }, counts: { skeletonNodes: 3, expandedNodes: 3, removed: 0 }, rows: [ { key: 'Root/254#0', block: 'sgs/button', action: null } ] };
	const out = railPass( { inventory, proposal, skeleton: tree, source } );
	assert.equal( JSON.stringify( out.skeleton ).includes( 'Root/254#0' ), false );
	assert.equal( out.proposal.counts.removed, 1 );
	assert.deepEqual( out.run.run, [ railKey, 'Root/254#0' ] );
	// skeleton.mjs hands the pass the surface's own draft file.
	assert.match( fs.readFileSync( path.join( here, '..', 'skeleton.mjs' ), 'utf8' ), /railPass\( \{ inventory, proposal: r\.proposal, skeleton: r\.skeleton, source: draftFile && fs\.existsSync\( draftFile \) \? fs\.readFileSync\( draftFile, 'utf8' \) : null \} \)/ );
} );
