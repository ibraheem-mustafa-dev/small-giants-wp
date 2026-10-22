// rules.footerSlots (Spec 48 §3.4): the footer block always holds exactly three row blocks, top, columns and bottom. The
// grid of link groups is the columns row; an in-flow child stacked above it is the top row, one stacked below it the bottom
// row; a floating element (fixed or absolute), inside the footer root or read beside it, goes in the bottom row. Synthetic
// inventories in the reader's shape (lib/skeleton-inventory.mjs); the proposed tree is also run through
// scripts/lib/surface-tree-shape.js::slottedRootProblems, the check wp-build-page.js applies before the browser opens.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts, decisionsProblems } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { skeletonProblems } from '../lib/fill-skeleton.mjs';
import { lintSkeleton } from '../lint.mjs';
import { footerPlan, sideBySide } from '../lib/skeleton-footer-slots.mjs';

const require = createRequire( import.meta.url );
const shape = require( '../../lib/surface-tree-shape.js' );
const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w, h ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const FIXED = { 375: 'fixed', 768: 'fixed', 1440: 'fixed' };
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || place( 0, 100, 400, 100 ), visible: { 375: true, 768: true, 1440: true }, display: x.display || 'block', flexDirection: 'row', screenshots: {}, ...( x.position ? { position: x.position } : {} ), ...( x.strip ? { strip: x.strip } : {} ) } );

// A link group: a column div (n) holding a heading (n+1) and a link (n+2), drawn at the given box.
const column = ( n, parent, box, label = 'Shop', depth = 2 ) => [ el( `Root/${ n }#0`, parent, 'div', '', { depth, box } ), el( `Root/${ n + 1 }#0`, `Root/${ n }#0`, 'h4', label, { depth: depth + 1, box } ), el( `Root/${ n + 2 }#0`, `Root/${ n }#0`, 'a', `${ label } link`, { depth: depth + 1, box, attrs: { href: `/${ label }` } } ) ];
const root = () => el( 'Root/1#0', null, 'footer', '', { depth: 0, box: place( 0, 100, 400, 300 ) } );
// A grid child (Root/2) of two columns side by side.
const grid = () => [ el( 'Root/2#0', 'Root/1#0', 'div', '', { box: place( 0, 100, 400, 100 ), display: 'grid' } ), ...column( 3, 'Root/2#0', place( 0, 100, 100, 100 ), 'Shop' ), ...column( 6, 'Root/2#0', place( 150, 100, 100, 100 ), 'Help' ) ];
// A strip child of the footer root holding one text, stacked at y.
const strip = ( n, y, words ) => [ el( `Root/${ n }#0`, 'Root/1#0', 'div', '', { box: place( 0, y, 400, 30 ) } ), el( `Root/${ n + 1 }#0`, `Root/${ n }#0`, 'span', words, { depth: 2, box: place( 0, y, 400, 30 ) } ) ];
const fixedKid = ( n ) => [ el( `Root/${ n }#0`, 'Root/1#0', 'a', 'Chat', { box: place( 340, 340, 40, 40 ), attrs: { href: 'https://wa.me/1' }, position: FIXED } ) ];
const stripRoot = ( key, side ) => el( key, null, 'div', '', { strip: { side, distance: 1 }, box: place( 340, 340, 40, 40 ), position: FIXED } );
const near = ( key, side, o = {} ) => ( { key, side, distance: 1, position: 'fixed', renders: true, holdsOtherRoot: false, ...o } );
const inv = ( elements, beside = [] ) => ( { generated: 'fixture', source: 'fixture', root: 'footer', checks: { rootKey: 'Root/1#0' }, elements, ...( beside.length ? { beside } : {} ) } );
const run = ( inventory, f = facts() ) => proposeSkeleton( { inventory, facts: f, surface: 'footer', surfaceKind: 'footer', surfaceName: 'Footer', db } );
const rows = ( r ) => r.skeleton[ 0 ].innerBlocks;
const flat = ( list ) => list.flatMap( ( n ) => [ n, ...flat( n.innerBlocks || [] ) ] );
const slotOf = ( r, tpl ) => rows( r ).find( ( n ) => n.draftRef?.tpl === tpl || flat( n.innerBlocks ).some( ( c ) => c.draftRef?.tpl === tpl ) )?.attributes.rowSlot ?? null;
const shaped = ( r ) => assert.deepEqual( shape.slottedRootProblems( structuredClone( r.skeleton ) ), [], 'the tree passes the wp-build-page surface shape check' );

test( 'the decisions entry is sound: its blocks exist, its slot attribute is one the row block has, and its slots are the footer template\'s', () => {
	assert.deepEqual( decisionsProblems( facts() ), [] );
	const F = facts().decisions.rules.footerSlots;
	assert.deepEqual( F.slots, [ 'top', 'columns', 'bottom' ] );
	assert.deepEqual( shape.slottedContainers().get( 'sgs/site-footer' ).map( ( r ) => r.rowSlot ), F.slots );
	assert.ok( F.taughtBy.client && F.taughtBy.key && F.taughtBy.runtime_sha256 && F.confirm );
} );

test( 'MUST FAIL: the decisions check refuses a footer rule that does not name three slots', () => {
	const f = facts();
	const two = { ...f, decisions: { ...f.decisions, rules: { ...f.decisions.rules, footerSlots: { ...f.decisions.rules.footerSlots, slots: [ 'top', 'bottom' ] } } } };
	assert.ok( decisionsProblems( two ).some( ( p ) => /rules\.footerSlots must name three slots/.test( p ) ) );
} );

test( 'MUST FAIL: the grid is the columns row (the element is the row, its link groups the children) and the other two rows are empty', () => {
	const r = run( inv( [ root(), ...grid() ] ) );
	assert.equal( r.skeleton[ 0 ].name, 'sgs/site-footer' );
	assert.deepEqual( rows( r ).map( ( n ) => [ n.name, n.attributes.rowSlot ] ), [ [ 'sgs/site-footer-row', 'top' ], [ 'sgs/site-footer-row', 'columns' ], [ 'sgs/site-footer-row', 'bottom' ] ] );
	assert.equal( rows( r )[ 1 ].draftRef.tpl, 'Root/2#0' );
	assert.equal( rows( r )[ 1 ].innerBlocks.length, 2, 'the two link groups are the row\'s children' );
	assert.deepEqual( [ rows( r )[ 0 ], rows( r )[ 2 ] ].map( ( n ) => [ n.innerBlocks.length, n.draftRef ] ), [ [ 0, undefined ], [ 0, undefined ] ] );
	assert.deepEqual( r.problems, [] );
	shaped( r );
	assert.deepEqual( skeletonProblems( r.skeleton ), [] );
	assert.deepEqual( lintSkeleton( r.skeleton, db ), [] );
} );

test( 'MUST FAIL: a strip stacked above the grid is the top row and one stacked below it is the bottom row', () => {
	const r = run( inv( [ root(), ...strip( 10, 60, 'Join our newsletter' ), ...grid(), ...strip( 20, 300, 'Registered charity 12345' ) ] ) );
	assert.deepEqual( [ slotOf( r, 'Root/10#0' ), slotOf( r, 'Root/2#0' ), slotOf( r, 'Root/20#0' ) ], [ 'top', 'columns', 'bottom' ] );
	assert.equal( rows( r )[ 0 ].draftRef.tpl, 'Root/10#0', 'a single strip is the row' );
	assert.equal( rows( r )[ 2 ].draftRef.tpl, 'Root/20#0' );
	assert.deepEqual( r.problems, [] );
	shaped( r );
} );

test( 'MUST FAIL: more than one strip on a side all go inside that row, in document order, and there is no fourth row', () => {
	const r = run( inv( [ root(), ...strip( 10, 20, 'First' ), ...strip( 12, 60, 'Second' ), ...grid(), ...strip( 20, 300, 'Third' ), ...strip( 22, 340, 'Fourth' ) ] ) );
	assert.equal( rows( r ).length, 3 );
	assert.deepEqual( [ 'Root/10#0', 'Root/12#0' ].map( ( t ) => slotOf( r, t ) ), [ 'top', 'top' ] );
	assert.deepEqual( [ 'Root/20#0', 'Root/22#0' ].map( ( t ) => slotOf( r, t ) ), [ 'bottom', 'bottom' ] );
	assert.deepEqual( rows( r )[ 0 ].innerBlocks.map( ( n ) => n.draftRef?.tpl ), [ 'Root/10#0', 'Root/12#0' ], 'document order' );
	assert.equal( rows( r )[ 0 ].draftRef, undefined, 'a row holding two strips is keyless' );
	assert.deepEqual( r.problems, [] );
	shaped( r );
} );

test( 'MUST FAIL: a floating element that is a child of the footer root goes in the bottom row, after the bottom strips', () => {
	const r = run( inv( [ root(), ...grid(), ...fixedKid( 30 ), ...strip( 20, 300, 'Legal' ) ] ) );
	assert.equal( slotOf( r, 'Root/30#0' ), 'bottom' );
	assert.equal( slotOf( r, 'Root/20#0' ), 'bottom' );
	assert.deepEqual( rows( r )[ 2 ].innerBlocks.map( ( n ) => n.draftRef?.tpl ), [ 'Root/20#0', 'Root/30#0' ], 'strips first, then the floating element' );
	assert.equal( slotOf( r, 'Root/2#0' ), 'columns', 'the floating element is not in the columns' );
	shaped( r );
	const alone = run( inv( [ root(), ...grid(), ...fixedKid( 30 ) ] ) );
	assert.deepEqual( [ slotOf( alone, 'Root/30#0' ), alone.problems ], [ 'bottom', [] ], 'a floating element alone still makes the bottom row' );
} );

test( 'MUST FAIL: a floating sibling read beside the footer goes in the bottom row and its surface is absorbed (stripRoots); one holding another surface\'s root, a hidden one and an in-flow one do not', () => {
	const beside = [ stripRoot( 'Root/50#0', 'after' ), el( 'Root/51#0', 'Root/50#0', 'a', 'Back to top', { depth: 2, attrs: { href: '#top' } } ) ];
	const r = run( inv( [ root(), ...grid(), ...beside ], [ near( 'Root/50#0', 'after' ) ] ) );
	assert.equal( slotOf( r, 'Root/50#0' ), 'bottom' );
	assert.deepEqual( r.proposal.stripRoots, [ 'Root/50#0' ] );
	assert.equal( r.proposal.rows.find( ( x ) => 'Root/51#0' === x.key ).strip, 'Root/50#0' );
	shaped( r );
	const holds = run( inv( [ root(), ...grid(), ...beside ], [ near( 'Root/50#0', 'after', { holdsOtherRoot: true } ) ] ) );
	assert.deepEqual( [ holds.proposal.stripRoots, rows( holds )[ 2 ].innerBlocks.length ], [ [], 0 ] );
	const hidden = run( inv( [ root(), ...grid(), ...beside ], [ near( 'Root/50#0', 'after', { renders: false } ) ] ) );
	assert.deepEqual( hidden.proposal.stripRoots, [] );
	const flow = run( inv( [ root(), ...grid(), ...beside ], [ near( 'Root/50#0', 'after', { position: 'static' } ) ] ) );
	assert.deepEqual( flow.proposal.stripRoots, [], 'an in-flow sibling is not the footer\'s' );
} );

test( 'MUST FAIL: an empty footer, and one with no grid, are still three rows; with no grid everything in flow is in the columns row', () => {
	const empty = run( inv( [ root() ] ) );
	assert.deepEqual( rows( empty ).map( ( n ) => [ n.attributes.rowSlot, n.innerBlocks.length ] ), [ [ 'top', 0 ], [ 'columns', 0 ], [ 'bottom', 0 ] ] );
	shaped( empty );
	const plain = run( inv( [ root(), ...strip( 10, 60, 'Above' ), ...strip( 20, 300, 'Below' ) ] ) );
	assert.deepEqual( rows( plain ).map( ( n ) => n.attributes.rowSlot ), [ 'top', 'columns', 'bottom' ] );
	assert.deepEqual( [ slotOf( plain, 'Root/11#0' ), slotOf( plain, 'Root/21#0' ) ], [ 'columns', 'columns' ], 'with no grid nothing is split off' );
	assert.deepEqual( [ rows( plain )[ 0 ].innerBlocks.length, rows( plain )[ 2 ].innerBlocks.length ], [ 0, 0 ] );
	shaped( plain );
} );

test( 'MUST FAIL: link groups that are children of the root itself, side by side, are the columns (the band) with strips around them', () => {
	const cols = [ ...column( 3, 'Root/1#0', place( 0, 100, 100, 100 ), 'Shop', 1 ), ...column( 6, 'Root/1#0', place( 150, 100, 100, 100 ), 'Help', 1 ) ];
	const r = run( inv( [ root(), ...strip( 10, 60, 'Above' ), ...cols, ...strip( 20, 300, 'Below' ) ] ) );
	assert.deepEqual( [ slotOf( r, 'Root/10#0' ), slotOf( r, 'Root/3#0' ), slotOf( r, 'Root/6#0' ), slotOf( r, 'Root/20#0' ) ], [ 'top', 'columns', 'columns', 'bottom' ] );
	shaped( r );
} );

test( 'the plan\'s signals: side by side needs separate horizontal extents with shared vertical extent; a stacked pair is not a grid', () => {
	const a = { key: 'a', box: place( 0, 0, 100, 50 ) };
	const b = { key: 'b', box: place( 150, 0, 100, 50 ) };
	const c = { key: 'c', box: place( 0, 100, 100, 50 ) };
	assert.deepEqual( sideBySide( [ a, b ] ).map( ( x ) => x.key ), [ 'a', 'b' ] );
	assert.deepEqual( sideBySide( [ a, c ] ), [] );
	assert.deepEqual( sideBySide( [ a, { key: 'd', box: place( 150, 100, 100, 50 ) } ] ), [], 'diagonal: apart horizontally but not on one row' );
	const kids = [ { key: 'k', tag: 'div', box: place( 0, 0, 400, 100 ) } ];
	assert.equal( footerPlan( kids, { subtree: ( x ) => [ x ], kidsOf: () => [] } ).mode, 'none' );
} );

test( 'with the rule\'s slot attribute removed, the footer is built as before and each element that would have had a row is raised', () => {
	const f = facts();
	const nulled = { ...f, decisions: { ...f.decisions, rules: { ...f.decisions.rules, footerSlots: { ...f.decisions.rules.footerSlots, slotAttribute: null } } } };
	const r = run( inv( [ root(), ...grid(), ...fixedKid( 30 ) ] ), nulled );
	assert.ok( r.problems.some( ( p ) => p.startsWith( 'Root/30#0' ) && /no row: rules\.footerSlots names no slot attribute/.test( p ) ), JSON.stringify( r.problems ) );
	assert.ok( rows( r ).every( ( n ) => undefined === n.attributes?.rowSlot ) );
	assert.ok( flat( r.skeleton ).some( ( n ) => 'Root/2#0' === n.draftRef?.tpl ), 'the content is still built' );
} );
