// Width-gated content (lib/fill-width-gate.mjs, Spec 48 FR-48-50): a draft element inside an sc-if on viewport width is hidden
// at the widths its condition does not hold, through the conditional-visibility settings when the boundaries are tiers (a
// threshold within 5% of 768 or 1024 snaps, with a `breakpoint-snap` ledger entry), through the block's own breakpoint setting
// when it holds one, else through a bounded, scoped, labelled @media rule in Additional CSS. Run against the real framework DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import { widthGateWrites, snapThreshold, shownRanges, hiddenRanges, mediaRule } from '../lib/fill-width-gate.mjs';
import { validate } from '../lib/ledger.mjs';
import { lintLedger } from '../lint.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const gate = ( key, width, via ) => [ key, { template: { tag: 'sc-if', membership: { scIf: [] } }, logic: { holes: {}, width, via } } ];
const leaf = ( key, scIf ) => [ key, { template: { tag: 'div', membership: { scIf: scIf.map( ( k ) => ( { key: k, value: '{{ x }}' } ) ) } }, logic: { holes: {} } } ];
const isM = { bp: 'm', is: true, when: { w: '<', n: 768 } };
const notM = { bp: 'm', is: false, when: { w: '<', n: 768 } };
const factsOf = ( ...pairs ) => ( { elements: Object.fromEntries( pairs ) } );

// Skeleton nodes (one per block name; `parent` is an index or null) and their tree nodes.
function skeleton( specs ) {
	const flat = specs.map( ( s, i ) => ( { name: s.name, attributes: {}, innerBlocks: [], ref: `r${ i }` } ) );
	const nodes = specs.map( ( s, index ) => ( { index, name: s.name, parent: s.parent ?? null, node: { draftRef: { tpl: `Page/${ s.n }#0` } }, children: [], targets: [] } ) );
	return { flat, nodes };
}
const run = ( specs, facts, entries = [] ) => {
	const { flat, nodes } = skeleton( specs );
	return { flat, ...widthGateWrites( { nodes, flat, refOf: ( n ) => n.ref, facts, db, scope: 'header', entries, date: '2026-10-22' } ) };
};
const attrsOf = ( r ) => Object.fromEntries( r.writes.map( ( w ) => [ w.attr, w.after ] ) );

test( 'the 5% snap: within 5% of the tier snaps to the nearest tier, outside it does not', () => {
	assert.deepEqual( snapThreshold( 1060 ), { tier: 1024, distance: 36 } );
	assert.deepEqual( snapThreshold( 1075 ), { tier: 1024, distance: 51 } );
	assert.equal( snapThreshold( 1076 ), null );
	assert.deepEqual( snapThreshold( 740 ), { tier: 768, distance: 28 } );
	assert.equal( snapThreshold( 1260 ), null );
	assert.equal( snapThreshold( 768 ), null, 'a tier itself is not a snap' );
} );

test( 'shown and hidden ranges follow the condition, including > and <= (whole pixels)', () => {
	assert.deepEqual( shownRanges( isM ), [ [ 0, 768 ] ] );
	assert.deepEqual( shownRanges( notM ), [ [ 768, Infinity ] ] );
	assert.deepEqual( shownRanges( { w: '>', n: 1259 } ), [ [ 1260, Infinity ] ] );
	assert.deepEqual( shownRanges( { all: [ { w: '>=', n: 768 }, { w: '<', n: 1024 } ] } ), [ [ 768, 1024 ] ] );
	assert.deepEqual( hiddenRanges( [ [ 768, 1024 ] ] ).hidden, [ [ 0, 768 ], [ 1024, Infinity ] ] );
	assert.equal( mediaRule( [ 0, 1260 ] ), '@media (max-width: 1259px) { & { display: none; } }' );
	assert.equal( mediaRule( [ 1100, 1260 ] ), '@media (min-width: 1100px) and (max-width: 1259px) { & { display: none; } }' );
} );

test( 'MUST FAIL WITHOUT THE WRITER: a mobile-only branch and a not-mobile branch are each hidden on the other tiers', () => {
	const facts = factsOf( gate( 'Page/12', isM, 'm' ), gate( 'Page/15', notM, '!m' ), leaf( 'Page/13', [ 'Page/12' ] ), leaf( 'Page/16', [ 'Page/15' ] ) );
	const r = run( [ { name: 'sgs/button', n: 13 }, { name: 'sgs/button', n: 16 } ], facts );
	assert.deepEqual( r.flat.map( ( n ) => n.attributes ), [ { sgsHideOnTablet: true, sgsHideOnDesktop: true }, { sgsHideOnMobile: true } ] );
	assert.deepEqual( r.ledger, [], 'tier boundaries snap nothing' );
	assert.ok( r.writes.every( ( w ) => 'width-gate' === w.how ) );
} );

test( 'MUST FAIL WITHOUT THE SNAP: a 1060 threshold writes the 1024 tier and one breakpoint-snap ledger entry of distance 36', () => {
	const facts = factsOf( gate( 'Page/53', { w: '>=', n: 1060 }, 'w >= 1060' ), leaf( 'Page/54', [ 'Page/53' ] ) );
	const r = run( [ { name: 'sgs/button', n: 54 } ], facts, [ { id: 'D-4', scope: 'header', node: 'x', property: 'p' } ] );
	assert.deepEqual( r.flat[ 0 ].attributes, { sgsHideOnMobile: true, sgsHideOnTablet: true } );
	assert.equal( r.ledger.length, 1 );
	assert.deepEqual( [ r.ledger[ 0 ].id, r.ledger[ 0 ].property, r.ledger[ 0 ].expected.rule, r.ledger[ 0 ].snap ], [ 'D-5', 'breakpoint', 'breakpoint-snap', { draft: 1060, tier: 1024, distance: 36 } ] );
	assert.match( r.ledger[ 0 ].reason, /1060px snapped to the 1024px tier \(distance 36px/ );
	assert.equal( validate( r.ledger ), true, 'the entry is a valid ledger entry' );
	assert.deepEqual( lintLedger( r.ledger, new Set() ), [], 'a house rule cites no register item' );
	assert.equal( run( [ { name: 'sgs/button', n: 54 } ], facts, r.ledger ).ledger.length, 0, 'a re-run adds no second entry' );
} );

test( 'MUST FAIL WITHOUT THE CSS PATH: an off-tier threshold (1260) on a block with no breakpoint setting is a scoped, labelled @media rule', () => {
	const facts = factsOf( gate( 'Page/53', { w: '>=', n: 1260 }, 'w >= 1260' ), leaf( 'Page/54', [ 'Page/53' ] ) );
	const r = run( [ { name: 'sgs/button', n: 54 } ], facts );
	const a = attrsOf( r );
	assert.equal( a.sgsCustomCss, '@media (max-width: 1259px) { & { display: none; } }' );
	assert.match( a.sgsCustomCssId, /^[a-z0-9]{4,16}$/ );
	assert.match( a.sgsCustomCssNote, /Width gate w >= 1260: hidden at 0-1259px/ );
	assert.equal( a.sgsHideOnMobile, undefined, 'no tier flag is written for an off-tier boundary' );
	assert.deepEqual( r.ledger, [], 'nothing snapped' );
	assert.equal( run( [ { name: 'sgs/button', n: 54 } ], facts ).writes.length, 3, 'one rule, one key, one label' );
} );

test( 'MUST FAIL WITHOUT THE OWN SETTING: a block holding a breakpoint setting gets the threshold in it', () => {
	const facts = factsOf( gate( 'Page/53', { w: '>=', n: 1260 }, 'w >= 1260' ), leaf( 'Page/54', [ 'Page/53' ] ) );
	const r = run( [ { name: 'sgs/nav-bar-menu', n: 54 } ], facts );
	assert.deepEqual( r.flat[ 0 ].attributes, { collapsePoint: 1260 } );
} );

test( 'a child gated like its parent is not written again; one gated further is', () => {
	const facts = factsOf( gate( 'Page/12', isM, 'm' ), gate( 'Page/20', { w: '>=', n: 1260 }, 'w >= 1260' ), leaf( 'Page/13', [ 'Page/12' ] ), leaf( 'Page/14', [ 'Page/12' ] ), leaf( 'Page/21', [ 'Page/12', 'Page/20' ] ) );
	const r = run( [ { name: 'sgs/button', n: 13 }, { name: 'sgs/button', n: 14, parent: 0 }, { name: 'sgs/button', n: 21, parent: 0 } ], facts );
	assert.deepEqual( r.flat[ 1 ].attributes, {}, 'same gate as its parent' );
	assert.deepEqual( r.unmapped.map( ( u ) => u.property ), [ 'width gate' ], 'mobile-only and 1260-up never overlap: reported, not written' );
	assert.deepEqual( r.flat[ 2 ].attributes, {} );
} );

test( 'an element with no width-gated sc-if, or no fact record, is untouched', () => {
	const facts = factsOf( leaf( 'Page/13', [] ), [ 'Page/9', { template: { tag: 'sc-if', membership: { scIf: [] } }, logic: { holes: {} } } ], leaf( 'Page/10', [ 'Page/9' ] ) );
	assert.equal( run( [ { name: 'sgs/button', n: 13 }, { name: 'sgs/button', n: 10 } ], facts ).writes.length, 0 );
	assert.equal( run( [ { name: 'sgs/button', n: 13 } ], null ).writes.length, 0 );
} );
