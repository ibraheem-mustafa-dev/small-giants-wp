// A node the skeleton marks `ownAlternativeBelow` (the filter rail: the theme's own drawer opens from the rail's element, below
// a threshold held in a theme option) is never hidden by a width-gate flag, takes the draft's own threshold unsnapped, and is
// pinned at the desktop tier only (lib/fill-width-gate.mjs, FR-48-50 step 3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { widthGateWrites, desktopOnlyPin } from '../lib/fill-width-gate.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const MARK = { setting: 'sgs_shop_filter_drawer_breakpoint', scope: 'theme-mod' };
const gate = ( key, width ) => [ key, { template: { tag: 'sc-if', membership: { scIf: [] } }, logic: { holes: {}, width, via: 'drawerFilters' } } ];
const leaf = ( key, scIf ) => [ key, { template: { tag: 'div', membership: { scIf: scIf.map( ( k ) => ( { key: k, value: '{{ x }}' } ) ) } }, logic: { holes: {} } } ];
const factsOf = ( ...pairs ) => ( { elements: Object.fromEntries( pairs ) } );
const STICKY = { desktop: 'top', tablet: 'top', mobile: 'top' };

// One container node under the sc-if `drawerFilters` (shown from 1060 up); `marked` puts the marker on the skeleton node.
function run( { marked, width = { w: '>=', n: 1060 }, pinEdge = STICKY, withGate = true } ) {
	const flat = [ { name: 'sgs/container', attributes: { pinEdge: { ...pinEdge } }, innerBlocks: [], ref: 'r0' } ];
	const nodes = [ { index: 0, name: 'sgs/container', parent: null, node: { draftRef: { tpl: 'Page/7#0' }, ...( marked ? { ownAlternativeBelow: { ...MARK } } : {} ) }, children: [], targets: [] } ];
	const facts = withGate ? factsOf( gate( 'Page/6', width ), leaf( 'Page/7', [ 'Page/6' ] ) ) : factsOf( leaf( 'Page/7', [] ) );
	const writes = [ { node: 'r0', attr: 'pinEdge', before: null, after: { ...pinEdge } } ];
	const r = widthGateWrites( { nodes, flat, refOf: ( n ) => n.ref, facts, db, scope: 'shop', entries: [], date: '2026-11-22', writes } );
	return { flat, r, writes };
}
const hideFlags = ( r ) => r.writes.filter( ( w ) => /^sgsHideOn/.test( w.attr ) );

test( 'MUST FAIL: a marked rail gets no hide flag and no scoped rule, and the draft\'s own 1060 goes on the node unsnapped', () => {
	const { flat, r } = run( { marked: true } );
	assert.deepEqual( hideFlags( r ), [] );
	assert.equal( flat[ 0 ].attributes.sgsHideOnMobile, undefined );
	assert.equal( flat[ 0 ].attributes.sgsHideOnTablet, undefined );
	assert.equal( flat[ 0 ].attributes.sgsCustomCss, undefined );
	assert.deepEqual( flat[ 0 ].ownAlternativeBelow, { ...MARK, value: 1060 } );
	assert.deepEqual( r.ledger, [], 'the threshold is not snapped to a tier, so no snap entry' );
} );

test( 'MUST FAIL: a marked rail is pinned at the desktop tier only, and the earlier write record follows', () => {
	const { flat, r, writes } = run( { marked: true } );
	assert.deepEqual( flat[ 0 ].attributes.pinEdge, { desktop: 'top', tablet: 'none', mobile: 'none' } );
	assert.deepEqual( writes[ 0 ].after, flat[ 0 ].attributes.pinEdge );
	assert.equal( r.writes.filter( ( w ) => 'pinEdge' === w.attr ).length, 1 );
	// A rail with no width gate at all is pinned at desktop only as well.
	assert.deepEqual( run( { marked: true, withGate: false } ).flat[ 0 ].attributes.pinEdge, { desktop: 'top', tablet: 'none', mobile: 'none' } );
} );

test( 'negative: an unmarked width-switched element keeps its hide flags, its snap and its pin', () => {
	const { flat, r } = run( { marked: false } );
	assert.deepEqual( hideFlags( r ).map( ( w ) => w.attr ).sort(), [ 'sgsHideOnMobile', 'sgsHideOnTablet' ] );
	assert.equal( flat[ 0 ].ownAlternativeBelow, undefined );
	assert.deepEqual( flat[ 0 ].attributes.pinEdge, STICKY );
	assert.equal( r.ledger.length, 1, 'the unmarked element snaps 1060 to the 1024 tier' );
} );

test( 'a marked node hidden over a range that does not start at 0 writes no value and says so', () => {
	const { flat, r } = run( { marked: true, width: { any: [ { w: '<', n: 768 }, { w: '>=', n: 1060 } ] } } );
	assert.equal( flat[ 0 ].ownAlternativeBelow.value, undefined );
	assert.deepEqual( hideFlags( r ), [] );
	assert.equal( r.unmapped.length, 1 );
	assert.match( r.unmapped[ 0 ].reason, /sgs_shop_filter_drawer_breakpoint/ );
} );

// A gate the read made: the draft draws the rail's element at 1440 and not at 375 and 768 (no sc-if width logic), and the
// sweep saw it appear between 1056 and 1072.
function readGated( { thresholds, sweepAt = [ 1056, 1072 ], parentHolds = false } ) {
	const flat = [ { name: 'sgs/container', attributes: {}, innerBlocks: [], ref: 'r0' }, { name: 'sgs/container', attributes: {}, innerBlocks: [], ref: 'r1' } ];
	const nodes = [ { index: 0, name: 'sgs/container', parent: null, node: { draftRef: { tpl: 'Page/1#0' } }, children: [], targets: [ { id: 'a', slot: '' } ] }, { index: 1, name: 'sgs/container', parent: 0, node: { draftRef: { tpl: 'Page/7#0' }, ownAlternativeBelow: { ...MARK } }, children: [], targets: [ { id: 'b', slot: '' } ] } ];
	const live = { styles: {} };
	const reads = { widths: { 375: { a: live, b: { missing: true } }, 768: { a: live, b: { missing: true } }, 1440: { a: live, b: live } }, sweep: { [ parentHolds ? 'a' : 'b' ]: { '(rendered)': [ 1040, 1056, 1072, 1088 ].map( ( width ) => ( { width, value: width < sweepAt[ 1 ] ? 'absent' : 'present' } ) ) } } };
	const r = widthGateWrites( { nodes, flat, refOf: ( n ) => n.ref, facts: null, db, scope: 'shop', reads, entries: [], date: '2026-11-22', thresholds } );
	return { flat, r };
}

test( 'MUST FAIL: a gate the read made takes the one draft threshold the sweep step holds (1060), never a tier', () => {
	const { flat, r } = readGated( { thresholds: [ 768, 1060, 1160, 1280 ] } );
	assert.deepEqual( flat[ 1 ].ownAlternativeBelow, { ...MARK, value: 1060 } );
	assert.deepEqual( hideFlags( r ), [] );
	assert.deepEqual( r.unmapped, [] );
	assert.match( r.notes.join( ' ' ), /= 1060px \(the draft's code threshold, found between 1056 and 1072px/ );
	// The step may sit on an ancestor node that holds the rail.
	assert.equal( readGated( { thresholds: [ 1060, 1280 ], parentHolds: true } ).flat[ 1 ].ownAlternativeBelow.value, 1060 );
} );

test( 'a gate the read made with no single draft threshold in the sweep step writes no value and says why', () => {
	for ( const thresholds of [ [ 768, 1280 ], [ 1060, 1070 ], [] ] ) {
		const { flat, r } = readGated( { thresholds } );
		assert.equal( flat[ 1 ].ownAlternativeBelow.value, undefined, JSON.stringify( thresholds ) );
		assert.equal( r.unmapped.length, 1 );
		assert.deepEqual( hideFlags( r ), [] );
	}
} );

test( 'desktopOnlyPin: trims other tiers to none, leaves an already desktop-only pin and an empty pin alone', () => {
	assert.deepEqual( desktopOnlyPin( STICKY ), { desktop: 'top', tablet: 'none', mobile: 'none' } );
	assert.equal( desktopOnlyPin( { desktop: 'top', tablet: 'none', mobile: 'none' } ), null );
	assert.equal( desktopOnlyPin( {} ), null );
	assert.equal( desktopOnlyPin( undefined ), null );
	assert.deepEqual( desktopOnlyPin( { mobile: 'top' } ), { desktop: 'top', tablet: 'none', mobile: 'none' } );
} );
