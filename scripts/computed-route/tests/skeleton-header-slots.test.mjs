// rules.headerSlots (Spec 48 §3.4): the header block always holds exactly three row blocks, top, middle and bottom. The main
// bar (the bar holding navigation or the logo) is the middle row; a strip drawn above or below it, inside the header or
// beside it, is the top or bottom row. Synthetic inventories in the reader's shape (lib/skeleton-inventory.mjs): beside
// strips are listed in `beside` and carry a `strip` root; the proposal decides which of them are rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts, decisionsProblems } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { skeletonProblems, skeletonNodes, originMap, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs, refOf } from '../lib/tree.mjs';
import { lintSkeleton } from '../lint.mjs';
import { aliasAbsorbed, checkApproval } from '../lib/approved-check.mjs';
import { besideStrips, insideStrips } from '../lib/skeleton-header-slots.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
// A box at every read width: the header and its bar are drawn at y 100; a strip above is at 0, one below at 300.
const boxes = ( y, h = 20, w = 100, x = 0 ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || boxes( 100 ), visible: { 375: true, 768: true, 1440: true }, display: x.display || 'block', flexDirection: 'row', screenshots: {}, ...( x.strip ? { strip: x.strip } : {} ) } );
// A strip root read beside the header: no parent in the inventory, depth 1.
const stripRoot = ( key, side, distance = 1 ) => el( key, null, 'div', '', { strip: { side, distance }, box: boxes( 'before' === side ? 0 : 300 ) } );
const near = ( key, side, distance = 1, o = {} ) => ( { key, side, distance, position: 'relative', renders: true, holdsOtherRoot: false, ...o } );

// The header (Root/1) with its main bar: a bar (Root/2) holding a nav (Root/3) of two links.
const header = () => [ el( 'Root/1#0', null, 'header', '', { depth: 0, box: boxes( 90, 60 ) } ), el( 'Root/2#0', 'Root/1#0', 'div', '', { depth: 1, display: 'flex' } ), el( 'Root/3#0', 'Root/2#0', 'nav', '', { depth: 2 } ), el( 'Root/4#0', 'Root/3#0', 'a', 'Shop', { depth: 3, attrs: { href: '/shop' } } ), el( 'Root/5#0', 'Root/3#0', 'a', 'Help', { depth: 3, attrs: { href: '/help' } } ) ];
const stripText = ( root, text ) => el( `Root/${ num( root ) + 1 }#0`, root, 'span', text, { depth: 2 } );
const inv = ( elements, beside = [] ) => ( { generated: 'fixture', source: 'fixture', root: 'header', checks: { rootKey: 'Root/1#0' }, elements, ...( beside.length ? { beside } : {} ) } );
const run = ( inventory, f = facts() ) => proposeSkeleton( { inventory, facts: f, surface: 'header', surfaceKind: 'header', surfaceName: 'Header', db } );
const rows = ( r ) => r.skeleton[ 0 ].innerBlocks;
const slots = ( r ) => rows( r ).map( ( n ) => n.attributes.rowSlot );
const flat = ( list ) => list.flatMap( ( n ) => [ n, ...flat( n.innerBlocks || [] ) ] );
const noRoot = ( r ) => assert.deepEqual( r.problems.filter( ( p ) => /strip|row/i.test( p ) ), [] );

test( 'the decisions entry is sound: its blocks exist and its slot attribute is one the row block has', () => {
	assert.deepEqual( decisionsProblems( facts() ), [] );
	const H = facts().decisions.rules.headerSlots;
	assert.deepEqual( H.slots, [ 'top', 'middle', 'bottom' ] );
	assert.ok( H.taughtBy.client && H.taughtBy.key && H.taughtBy.runtime_sha256 && H.confirm, 'the ratchet carries its teacher and Bean\'s confirm' );
} );

test( 'MUST FAIL: no strip anywhere is still three rows in order, the main bar the middle one and the two others empty', () => {
	const r = run( inv( header() ) );
	assert.equal( r.skeleton.length, 1 );
	assert.equal( r.skeleton[ 0 ].name, 'sgs/site-header' );
	assert.deepEqual( rows( r ).map( ( n ) => n.name ), Array( 3 ).fill( 'sgs/site-header-row' ) );
	assert.deepEqual( slots( r ), [ 'top', 'middle', 'bottom' ] );
	assert.deepEqual( [ rows( r )[ 0 ], rows( r )[ 2 ] ].map( ( n ) => [ n.innerBlocks.length, n.draftRef ] ), [ [ 0, undefined ], [ 0, undefined ] ], 'an empty row holds nothing and names no draft element' );
	assert.equal( rows( r )[ 1 ].draftRef.tpl, 'Root/2#0', 'the main bar is the middle row' );
	assert.ok( flat( rows( r )[ 1 ].innerBlocks ).length > 0 );
	assert.deepEqual( r.problems, [] );
} );

test( 'MUST FAIL: a strip beside the header, above it, is the top row and its elements are proposed inside it', () => {
	const strip = [ stripRoot( 'Root/10#0', 'before' ), stripText( 'Root/10#0', 'Free delivery over 50' ) ];
	const r = run( inv( [ ...header(), ...strip ], [ near( 'Root/10#0', 'before' ) ] ) );
	assert.deepEqual( slots( r ), [ 'top', 'middle', 'bottom' ] );
	assert.equal( rows( r )[ 0 ].draftRef.tpl, 'Root/10#0' );
	assert.equal( rows( r )[ 1 ].draftRef.tpl, 'Root/2#0' );
	assert.equal( rows( r )[ 2 ].innerBlocks.length, 0 );
	assert.ok( flat( rows( r )[ 0 ].innerBlocks ).some( ( n ) => 'Root/11#0' === n.draftRef?.tpl ), 'the strip\'s own text is inside the top row' );
	const row = r.proposal.rows.find( ( x ) => 'Root/10#0' === x.key );
	assert.deepEqual( [ row.block, row.rule, row.strip ], [ 'sgs/site-header-row', 'headerSlots', 'Root/10#0' ] );
	assert.equal( r.proposal.rows.find( ( x ) => 'Root/11#0' === x.key ).strip, 'Root/10#0' );
	assert.deepEqual( r.proposal.stripRoots, [ 'Root/10#0' ] );
	noRoot( r );
} );

test( 'MUST FAIL: a strip beside the header, below it, is the bottom row', () => {
	const strip = [ stripRoot( 'Root/10#0', 'after' ), stripText( 'Root/10#0', 'Registered charity 12345' ) ];
	const r = run( inv( [ ...header(), ...strip ], [ near( 'Root/10#0', 'after' ) ] ) );
	assert.deepEqual( rows( r ).map( ( n ) => [ n.attributes.rowSlot, n.draftRef?.tpl ?? null ] ), [ [ 'top', null ], [ 'middle', 'Root/2#0' ], [ 'bottom', 'Root/10#0' ] ] );
	noRoot( r );
} );

test( 'MUST FAIL: a direct child of the header that holds neither navigation nor logo, beside a child that does, is a strip by its place', () => {
	const kids = [ el( 'Root/6#0', 'Root/1#0', 'div', '', { depth: 1, box: boxes( 0 ) } ), el( 'Root/7#0', 'Root/6#0', 'span', 'Open late on Fridays', { depth: 2, box: boxes( 0 ) } ), el( 'Root/8#0', 'Root/1#0', 'div', '', { depth: 1, box: boxes( 300 ) } ), el( 'Root/9#0', 'Root/8#0', 'span', 'Registered charity', { depth: 2, box: boxes( 300 ) } ) ];
	const [ root, bar, ...rest ] = header();
	// document order: the top strip, the bar, the bottom strip
	const r = run( inv( [ root, kids[ 0 ], kids[ 1 ], bar, ...rest, kids[ 2 ], kids[ 3 ] ] ) );
	assert.deepEqual( rows( r ).map( ( n ) => [ n.attributes.rowSlot, n.draftRef?.tpl ?? null ] ), [ [ 'top', 'Root/6#0' ], [ 'middle', 'Root/2#0' ], [ 'bottom', 'Root/8#0' ] ] );
	assert.deepEqual( r.proposal.stripRoots, [] );
	noRoot( r );
} );

test( 'MUST FAIL: a child that holds neither beside no child that does is not a strip: nothing is invented', () => {
	const r = run( inv( [ el( 'Root/1#0', null, 'header', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'div', '', { depth: 1 } ), el( 'Root/3#0', 'Root/2#0', 'span', 'Just words', { depth: 2 } ) ] ) );
	assert.deepEqual( slots( r ), [ 'top', 'middle', 'bottom' ] );
	assert.equal( rows( r )[ 0 ].innerBlocks.length + rows( r )[ 2 ].innerBlocks.length, 0 );
} );

test( 'MUST FAIL: width alternatives that each hold the navigation are all the main bar, never a strip', () => {
	const alt = [ el( 'Root/6#0', 'Root/1#0', 'div', '', { depth: 1 } ), el( 'Root/7#0', 'Root/6#0', 'nav', '', { depth: 2 } ), el( 'Root/8#0', 'Root/7#0', 'a', 'Menu', { depth: 3, attrs: { href: '/m' } } ), el( 'Root/9#0', 'Root/7#0', 'a', 'Shop', { depth: 3, attrs: { href: '/s' } } ) ];
	const r = run( inv( [ ...header(), ...alt ] ) );
	assert.deepEqual( slots( r ), [ 'top', 'middle', 'bottom' ] );
	assert.equal( rows( r )[ 0 ].innerBlocks.length + rows( r )[ 2 ].innerBlocks.length, 0, 'neither alternative became a strip' );
	assert.equal( flat( rows( r )[ 1 ].innerBlocks ).filter( ( n ) => 'sgs/nav-bar-menu' === n.name ).length, 2, 'both alternatives are in the middle row' );
	assert.deepEqual( r.problems, [] );
} );

test( 'MUST FAIL: a fixed element, a hidden one and the sibling holding another surface\'s root are never strips', () => {
	const mk = ( key, extra ) => [ stripRoot( key, 'before', extra.distance ?? 1 ), stripText( key, 'x' ) ];
	const cases = [
		[ 'fixed', near( 'Root/10#0', 'before', 1, { position: 'fixed' } ) ],
		[ 'absolute', near( 'Root/10#0', 'before', 1, { position: 'absolute' } ) ],
		[ 'not rendering', near( 'Root/10#0', 'before', 1, { renders: false } ) ],
		[ 'a page root', near( 'Root/10#0', 'before', 1, { holdsOtherRoot: true } ) ],
	];
	for ( const [ name, b ] of cases ) {
		const r = run( inv( [ ...header(), ...mk( 'Root/10#0', {} ) ], [ b ] ) );
		assert.equal( rows( r )[ 0 ].innerBlocks.length, 0, `${ name } is not the top row` );
		assert.equal( rows( r )[ 0 ].draftRef, undefined, name );
		assert.deepEqual( r.proposal.stripRoots, [], name );
		assert.ok( ! r.proposal.rows.some( ( x ) => 'Root/10#0' === x.key ), `${ name } has no row` );
	}
	// The walk passes over an out-of-flow sibling but ends at one that holds another surface's root.
	const walk = besideStrips( inv( [ ...header(), ...mk( 'Root/10#0', {} ), ...mk( 'Root/20#0', {} ) ], [ near( 'Root/10#0', 'before', 1, { position: 'fixed' } ), near( 'Root/20#0', 'before', 2 ) ] ) );
	assert.deepEqual( walk.before.map( ( x ) => x.key ), [ 'Root/20#0' ], 'a fixed sibling is passed over' );
	const blocked = besideStrips( inv( [ ...header(), ...mk( 'Root/10#0', {} ), ...mk( 'Root/20#0', {} ) ], [ near( 'Root/10#0', 'before', 1, { holdsOtherRoot: true } ), near( 'Root/20#0', 'before', 2 ) ] ) );
	assert.deepEqual( blocked.before, [], 'a sibling holding a page root ends the walk: nothing beyond it is adjacent' );
	// A fixed or absolute child of the header root is not a strip either.
	const overlay = insideStrips( [ { key: 'a' }, { key: 'b' } ], { holdsMain: ( k ) => 'b' === k.key, declared: ( k ) => ( 'a' === k.key ? 'fixed' : null ) } );
	assert.deepEqual( [ overlay.top, overlay.bottom ], [ [], [] ] );
} );

test( 'MUST FAIL: the template\'s declared position counts: a strip the template declares fixed is not a row even when it rendered in flow', () => {
	const strip = [ stripRoot( 'Root/10#0', 'before' ), stripText( 'Root/10#0', 'x' ) ];
	const walk = besideStrips( inv( [ ...header(), ...strip ], [ near( 'Root/10#0', 'before' ) ] ), { declared: () => 'fixed' } );
	assert.deepEqual( walk.before, [] );
	assert.match( walk.skipped[ 0 ].why, /out of flow \(fixed\)/ );
	const apart = besideStrips( inv( [ ...header(), ...strip ], [ near( 'Root/10#0', 'before' ) ] ), { sameParent: () => false } );
	assert.deepEqual( apart.before, [], 'a sibling in another template parent is not a strip' );
} );

test( 'MUST FAIL: two strips on one side: the nearer is the row, the other is named in a problem and never built (no fourth row)', () => {
	const strips = [ stripRoot( 'Root/10#0', 'before', 1 ), stripText( 'Root/10#0', 'Near' ), stripRoot( 'Root/20#0', 'before', 2 ), stripText( 'Root/20#0', 'Far' ) ];
	const r = run( inv( [ ...header(), ...strips ], [ near( 'Root/10#0', 'before', 1 ), near( 'Root/20#0', 'before', 2 ) ] ) );
	assert.equal( rows( r ).length, 3, 'a header holds exactly three rows' );
	assert.equal( rows( r )[ 0 ].draftRef.tpl, 'Root/10#0', 'the strip nearest the header is the row' );
	assert.ok( ! flat( r.skeleton ).some( ( n ) => 'Root/20#0' === n.draftRef?.tpl || 'Root/21#0' === n.draftRef?.tpl ) );
	assert.equal( r.problems.filter( ( p ) => p.includes( 'Root/20#0' ) && /second strip above/.test( p ) && p.includes( 'Root/10#0' ) ).length, 1 );
	assert.equal( r.proposal.rows.find( ( x ) => 'Root/20#0' === x.key ).action, 'unresolved' );
} );

test( 'MUST FAIL: a strip above and one below, each beside the header, take the top and the bottom row', () => {
	const strips = [ stripRoot( 'Root/10#0', 'before' ), stripText( 'Root/10#0', 'Above' ), stripRoot( 'Root/20#0', 'after' ), stripText( 'Root/20#0', 'Below' ) ];
	const r = run( inv( [ ...header(), ...strips ], [ near( 'Root/10#0', 'before' ), near( 'Root/20#0', 'after' ) ] ) );
	assert.deepEqual( rows( r ).map( ( n ) => n.draftRef?.tpl ), [ 'Root/10#0', 'Root/2#0', 'Root/20#0' ] );
	assert.deepEqual( r.problems, [] );
} );

test( 'a skeleton with empty and keyless rows is accepted by the skeleton checks, the origin map, refs and the clean tree', () => {
	const strip = [ stripRoot( 'Root/10#0', 'before' ), stripText( 'Root/10#0', 'Free delivery' ) ];
	const keyless = run( inv( [ ...header(), ...strip ] ) );
	assert.deepEqual( skeletonProblems( keyless.skeleton ), [] );
	assert.deepEqual( lintSkeleton( keyless.skeleton, db ), [], 'the lint accepts the empty rows' );
	const wrapped = run( inv( [ el( 'Root/1#0', null, 'header', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'nav', '', { depth: 1 } ), el( 'Root/3#0', 'Root/2#0', 'a', 'Shop', { depth: 2, attrs: { href: '/s' } } ), el( 'Root/4#0', 'Root/1#0', 'a', 'Help', { depth: 1, attrs: { href: '/h' } } ) ] ) );
	assert.equal( rows( wrapped ).length, 3 );
	assert.equal( rows( wrapped )[ 1 ].draftRef, undefined, 'a middle row the draft has no element for is keyless' );
	for ( const r of [ keyless, wrapped ] ) {
		assert.deepEqual( skeletonProblems( r.skeleton ), [] );
		const tree = structuredClone( r.skeleton );
		addRefs( tree, 'header' );
		const nodes = skeletonNodes( tree );
		const refs = nodes.map( ( n ) => refOf( n.node ) );
		assert.ok( refs.every( Boolean ), 'every node, keyless ones too, takes a ref' );
		const origin = originMap( nodes, refs );
		assert.ok( Object.values( origin ).every( ( o ) => o.tpl ), 'only nodes with an element are in the origin map' );
		assert.ok( nodes.filter( ( n ) => 'sgs/site-header-row' === n.name && undefined === n.node.draftRef ).every( ( n ) => ! n.targets.length ), 'a keyless row has no measuring target' );
		assert.deepEqual( cleanTree( tree ).map( ( n ) => n.innerBlocks.map( ( c ) => c.attributes.rowSlot ) ), [ [ 'top', 'middle', 'bottom' ] ] );
	}
} );

test( 'with the rule\'s slot attribute removed, a strip beside the header is raised as a problem instead of being placed', () => {
	const f = facts();
	const nulled = { ...f, decisions: { ...f.decisions, rules: { ...f.decisions.rules, headerSlots: { ...f.decisions.rules.headerSlots, slotAttribute: null } } } };
	const strip = [ stripRoot( 'Root/10#0', 'before' ), stripText( 'Root/10#0', 'Free delivery' ) ];
	const r = run( inv( [ ...header(), ...strip ], [ near( 'Root/10#0', 'before' ) ] ), nulled );
	assert.ok( r.problems.some( ( p ) => p.includes( 'Root/10#0' ) && /no row: rules\.headerSlots names no slot attribute/.test( p ) ) );
	assert.ok( ! flat( r.skeleton ).some( ( n ) => 'Root/10#0' === n.draftRef?.tpl ) );
} );

test( 'MUST FAIL: Bean\'s approvals of an absorbed surface\'s rows are found by element key in the surface that holds them now', () => {
	const row = ( surface, key, block, extra = {} ) => ( { surface, key, block, rule: 'x', attributes: {}, ...extra } );
	const rows2 = {
		'skeleton:header:Root/1#0': row( 'header', 'Root/1#0', 'sgs/site-header' ),
		'skeleton:header:Root/10#0': row( 'header', 'Root/10#0', 'sgs/site-header-row', { strip: 'Root/10#0' } ),
		'skeleton:header:Root/11#0': row( 'header', 'Root/11#0', 'sgs/button', { strip: 'Root/10#0' } ),
	};
	const fingerprints = { header: { 'Root/10#0': { tag: 'div', cls: '' }, 'Root/11#0': { tag: 'span', cls: '' } } };
	const ctx = { rows: rows2, fingerprints };
	const approval = { rowId: 'skeleton:top-bar:Root/11#0', approvedBlock: 'sgs/button' };
	assert.equal( checkApproval( approval, ctx ).noRow, true, 'without the alias the approval names no row' );
	aliasAbsorbed( ctx, { 'top-bar': { into: 'header', root: 'Root/10#0' } } );
	assert.equal( checkApproval( approval, ctx ).match, true );
	assert.equal( checkApproval( { rowId: 'skeleton:top-bar:Root/10#0', approvedBlock: 'sgs/site-header-row (top row)' }, ctx ).match, true );
	assert.equal( checkApproval( { rowId: 'skeleton:top-bar:Root/1#0', approvedBlock: 'sgs/site-header' }, ctx ).noRow, true, 'a row outside the strip is not the absorbed surface\'s' );
	assert.equal( checkApproval( { ...approval, approvedBlock: 'sgs/heading' }, ctx ).mismatches.length, 1, 'a disagreeing approval is still a mismatch' );
	assert.deepEqual( Object.keys( ctx.fingerprints[ 'top-bar' ] ), [ 'Root/10#0', 'Root/11#0' ] );
} );

// A direct child of the header root with one text inside it, drawn at the given boxes (default: inline with the bar).
const kid = ( n, words, x = {} ) => [ el( `Root/${ n }#0`, 'Root/1#0', x.tag || 'div', '', { depth: 1, box: x.box, display: 'flex' } ), el( `Root/${ n + 1 }#0`, `Root/${ n }#0`, 'span', words, { depth: 2, box: x.box } ) ];
const withKids = ( ...lists ) => { const [ root, ...rest ] = header(); return inv( [ root, ...lists.flat(), ...rest ] ); };
const slotOf = ( r, tpl ) => rows( r ).find( ( n ) => flat( n.innerBlocks ).some( ( c ) => c.draftRef?.tpl === tpl ) || n.draftRef?.tpl === tpl )?.attributes.rowSlot ?? null;

test( 'MUST FAIL: a child inline with the main bar is part of the bar, never a strip: a call to action after the nav, a burger, social links before the logo', () => {
	const cta = kid( 6, 'Book now', { box: boxes( 100, 20, 80, 200 ) } );
	let r = run( withKids( cta ) );
	assert.equal( slotOf( r, 'Root/7#0' ), 'middle', 'the call to action after the bar stays in the middle row' );
	assert.equal( rows( r )[ 2 ].innerBlocks.length, 0, 'no bottom row' );
	const social = kid( 6, 'Follow us', { box: boxes( 100, 20, 80, 0 ) } );
	const burger = kid( 8, 'Menu', { box: boxes( 100, 20, 40, 300 ) } );
	const [ root, ...rest ] = header();
	r = run( inv( [ root, ...social, ...rest, ...burger ] ) );
	assert.deepEqual( [ slotOf( r, 'Root/7#0' ), slotOf( r, 'Root/9#0' ) ], [ 'middle', 'middle' ] );
	assert.deepEqual( [ rows( r )[ 0 ].innerBlocks.length, rows( r )[ 2 ].innerBlocks.length ], [ 0, 0 ], 'no top and no bottom row' );
	assert.deepEqual( insideStrips( [ { key: 'a', box: boxes( 100 ) }, { key: 'b', box: boxes( 100, 20, 80, 200 ) } ], { holdsMain: ( k ) => 'a' === k.key } ).bottom, [] );
} );

test( 'MUST FAIL: a full-width bar stacked above the main bar is the top row; one stacked below is the bottom row', () => {
	const above = kid( 6, 'Announcement', { box: boxes( 0, 30, 1400 ) } );
	const below = kid( 8, 'Legal line', { box: boxes( 300, 30, 1400 ) } );
	const [ root, ...rest ] = header();
	const r = run( inv( [ root, ...above, ...rest, ...below ] ) );
	assert.deepEqual( [ slotOf( r, 'Root/6#0' ), slotOf( r, 'Root/8#0' ) ], [ 'top', 'bottom' ] );
} );

test( 'MUST FAIL: a strip is stacked at every width where both render; a strip hidden at some widths is still a strip where it renders; one rendering at none is not', () => {
	const bar = { key: 'bar', box: boxes( 100 ) };
	const main = ( k ) => 'bar' === k.key;
	const hiddenNarrow = { key: 's', box: { ...boxes( 0 ), 375: null }, visible: { 375: false, 768: true, 1440: true } };
	assert.deepEqual( insideStrips( [ hiddenNarrow, bar ], { holdsMain: main } ).top.map( ( k ) => k.key ), [ 's' ], 'drawn above where it renders' );
	const nowhere = { key: 's', box: { 375: null, 768: null, 1440: null }, visible: { 375: false, 768: false, 1440: false } };
	assert.deepEqual( insideStrips( [ nowhere, bar ], { holdsMain: main } ).top, [], 'renders at no width' );
	const inlineNarrow = { key: 's', box: { ...boxes( 0 ), 375: boxes( 100 )[ 375 ] } };
	assert.deepEqual( insideStrips( [ inlineNarrow, bar ], { holdsMain: main } ).top, [], 'beside the bar at one width is inline with it' );
	const fixedNarrow = { key: 's', box: boxes( 0 ), position: { 375: 'fixed', 768: 'static', 1440: 'static' } };
	assert.deepEqual( insideStrips( [ fixedNarrow, bar ], { holdsMain: main } ).top, [], 'computed fixed where it renders' );
	const fixedHidden = { key: 's', box: { ...boxes( 0 ), 375: null }, position: { 375: 'fixed', 768: 'static', 1440: 'static' } };
	assert.deepEqual( insideStrips( [ fixedHidden, bar ], { holdsMain: main } ).top.map( ( k ) => k.key ), [ 's' ], 'fixed only where it does not render' );
	const absolute = { key: 's', box: boxes( 0 ), position: { 375: 'absolute', 768: 'absolute', 1440: 'absolute' } };
	assert.deepEqual( insideStrips( [ absolute, bar ], { holdsMain: main } ).top, [] );
} );

test( 'MUST FAIL: only a strip that got a row is absorbed: the extra strip beside the header is in no stripRoots and keeps its own surface', () => {
	const strips = [ stripRoot( 'Root/10#0', 'before', 1 ), stripText( 'Root/10#0', 'Near' ), stripRoot( 'Root/20#0', 'before', 2 ), stripText( 'Root/20#0', 'Far' ), stripRoot( 'Root/30#0', 'after', 1 ), stripText( 'Root/30#0', 'Below' ) ];
	const r = run( inv( [ ...header(), ...strips ], [ near( 'Root/10#0', 'before', 1 ), near( 'Root/20#0', 'before', 2 ), near( 'Root/30#0', 'after', 1 ) ] ) );
	assert.deepEqual( r.proposal.stripRoots, [ 'Root/10#0', 'Root/30#0' ], 'the rows\' strips only' );
	const bare = run( inv( [ ...header(), ...strips ], [ near( 'Root/20#0', 'before', 2 ) ] ) );
	assert.deepEqual( bare.proposal.stripRoots, [ 'Root/20#0' ], 'a lone strip is the row' );
} );

test( 'MUST FAIL: a sibling beside the header is a strip only when stacked above or below the header root; a plain content block with no surface that is stacked is read as a strip', () => {
	const plain = [ stripRoot( 'Root/10#0', 'after' ), stripText( 'Root/10#0', 'Some content' ) ];
	const stackedBelow = besideStrips( inv( [ ...header(), ...plain ], [ near( 'Root/10#0', 'after' ) ] ) );
	assert.deepEqual( stackedBelow.after.map( ( x ) => x.key ), [ 'Root/10#0' ], 'no surface holds it and it is stacked: a strip, listed for review' );
	const inlineEl = el( 'Root/10#0', null, 'div', '', { strip: { side: 'after', distance: 1 }, box: boxes( 90, 60, 100, 500 ) } );
	const inline = besideStrips( inv( [ ...header(), inlineEl ], [ near( 'Root/10#0', 'after' ) ] ) );
	assert.deepEqual( inline.after, [], 'beside the header root in one row: not stacked' );
	assert.match( inline.skipped[ 0 ].why, /not stacked below the header root/ );
	const above = el( 'Root/10#0', null, 'div', '', { strip: { side: 'before', distance: 1 }, box: boxes( 120, 20 ) } );
	assert.deepEqual( besideStrips( inv( [ ...header(), above ], [ near( 'Root/10#0', 'before' ) ] ) ).before, [], 'listed before but drawn below the header: not above it' );
} );

test( 'MUST FAIL: the middle row keeps the main bar\'s attributes and draft element when the bar is the row block, with a sibling inline beside it inside; a keyless row only when no row block is the bar', () => {
	const sib = [ el( 'Root/6#0', 'Root/1#0', 'span', 'Open late', { depth: 1, box: boxes( 100, 20, 80, 200 ) } ) ];
	const r = run( withKids( sib ) );
	assert.equal( rows( r ).length, 3 );
	assert.equal( rows( r )[ 1 ].draftRef.tpl, 'Root/2#0', 'the bar\'s draft element stays on the middle row' );
	assert.ok( flat( rows( r )[ 1 ].innerBlocks ).some( ( n ) => 'Root/6#0' === n.draftRef?.tpl ), 'the sibling is inside the middle row' );
	assert.equal( rows( r )[ 1 ].attributes.rowSlot, 'middle' );
} );
