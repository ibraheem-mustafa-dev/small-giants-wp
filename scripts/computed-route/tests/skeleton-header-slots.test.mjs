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
import { besideStrips, insideStrips, mergeWidthAlternatives } from '../lib/skeleton-header-slots.mjs';

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

// The main bar as two width alternatives: a compact bar (M, shown at 375 and 768: burger, logo, icons) and a desktop bar (D,
// shown at 1440: logo, nav, icons). The menu block draws both the burger and the desktop nav and was placed at the burger.
const altBars = () => {
	const E = ( key, shown, kids = [] ) => ( { key, shown, kids } );
	const els = { b: E( 'b', [ 375, 768 ] ), lm: E( 'lm', [ 375, 768 ] ), im: E( 'im', [ 375, 768 ] ), ld: E( 'ld', [ 1440 ] ), nav: E( 'nav', [ 1440 ] ), id: E( 'id', [ 1440 ] ) };
	els.M = E( 'M', [ 375, 768 ], [ els.b, els.lm, els.im ] );
	els.D = E( 'D', [ 1440 ], [ els.ld, els.nav, els.id ] );
	const N = ( name, draws, innerBlocks = [] ) => ( { name, draws, attributes: {}, innerBlocks } );
	const menu = N( 'menu', [ els.b, els.nav ] );
	const nodes = { menu, logoM: N( 'logoM', [ els.lm ] ), iconsM: N( 'iconsM', [ els.im ] ), logoD: N( 'logoD', [ els.ld ] ), iconsD: N( 'iconsD', [ els.id ] ) };
	const M = { ...N( 'row', [ els.M ], [ menu, nodes.logoM, nodes.iconsM ] ), draftRef: { tpl: 'M' } };
	const D = { ...N( 'row', [ els.D ], [ nodes.logoD, nodes.iconsD ] ), draftRef: { tpl: 'D' } };
	const opts = { elOf: ( n ) => n.draws[ 0 ], kidsOf: ( e ) => e.kids, shownAt: ( e ) => e.shown, holds: ( n, e ) => n.draws.includes( e ) };
	return { els, nodes, M, D, opts };
};

test( 'MUST FAIL: a main bar drawn as width alternatives is the widest alternative\'s row, its children ordered so each alternative\'s own order holds at its widths', () => {
	const { nodes, M, D, opts } = altBars();
	const r = mergeWidthAlternatives( [ M, D ], opts );
	assert.equal( r.row, D, 'the desktop bar\'s row keeps its settings and draft element' );
	assert.deepEqual( r.innerBlocks.map( ( n ) => n.name ), [ 'logoD', 'menu', 'iconsD', 'logoM', 'iconsM' ] );
	assert.deepEqual( r.others, [ M ] );
	const at = ( shown ) => r.innerBlocks.filter( ( n ) => n.draws.some( ( e ) => e.shown.includes( shown ) ) ).map( ( n ) => n.name );
	assert.deepEqual( at( 1440 ), [ 'logoD', 'menu', 'iconsD' ], 'desktop: logo, nav, icons as the desktop bar draws them' );
	assert.deepEqual( at( 375 ), [ 'menu', 'logoM', 'iconsM' ], 'mobile: burger, logo, icons as the compact bar draws them' );
	assert.equal( mergeWidthAlternatives( [ D, M ], opts ).row, D, 'document order does not choose the row' );
	assert.ok( nodes.menu );
	// The shared child first in the desktop order and second in the compact one: the compact logo goes before it.
	const flip = altBars();
	flip.els.D.kids = [ flip.els.nav, flip.els.ld, flip.els.id ];
	flip.els.M.kids = [ flip.els.lm, flip.els.b, flip.els.im ];
	flip.M.innerBlocks = [ flip.nodes.logoM, flip.nodes.menu, flip.nodes.iconsM ];
	const f2 = mergeWidthAlternatives( [ flip.M, flip.D ], flip.opts );
	const at2 = ( shown ) => f2.innerBlocks.filter( ( n ) => n.draws.some( ( e ) => e.shown.includes( shown ) ) ).map( ( n ) => n.name );
	assert.deepEqual( [ at2( 1440 ), at2( 375 ) ], [ [ 'menu', 'logoD', 'iconsD' ], [ 'logoM', 'menu', 'iconsM' ] ] );
} );

test( 'MUST FAIL: a block a later step places at another pooled node (the menu placed at the burger wrapper) keeps its slot right after the wrapper, so it is still in each width order when the wrapper is dropped', () => {
	const { els, nodes, M, D, opts } = altBars();
	// Before the part placement: the menu still sits in the desktop row, and the compact bar's burger wrapper holds only the burger.
	const wrap = { name: 'wrap', draws: [ els.b, els.nav ], attributes: {}, innerBlocks: [] };
	M.innerBlocks = [ wrap, nodes.logoM, nodes.iconsM ];
	D.innerBlocks = [ nodes.logoD, nodes.menu, nodes.iconsD ];
	nodes.menu.draws = [ els.nav ];
	const r = mergeWidthAlternatives( [ D, M ], { ...opts, hostOf: ( n ) => ( n === nodes.menu ? wrap : null ) } );
	assert.deepEqual( r.innerBlocks.map( ( n ) => n.name ), [ 'logoD', 'wrap', 'menu', 'iconsD', 'logoM', 'iconsM' ], 'the wrapper is the place of the menu in both orders, and the menu stands right after it' );
	// The placement drops the wrapper (it held only the burger part): the menu is left where the wrapper stood, never at the tail.
	const left = r.innerBlocks.filter( ( n ) => n !== wrap );
	const at = ( shown ) => left.filter( ( n ) => n === nodes.menu || n.draws.some( ( e ) => e.shown.includes( shown ) ) ).map( ( n ) => n.name );
	assert.deepEqual( at( 1440 ), [ 'logoD', 'menu', 'iconsD', 'logoM', 'iconsM' ].filter( ( n ) => [ 'logoD', 'menu', 'iconsD' ].includes( n ) ), 'desktop: logo, nav, icons' );
	assert.deepEqual( at( 375 ), [ 'menu', 'logoM', 'iconsM' ], 'mobile: burger, logo, icons' );
	// Negative control: a block that no node hosts goes where its own element is found, and one a wrapper hosts that no order
	// lists falls to the tail with the other unplaced nodes.
	const stray = { name: 'stray', draws: [], attributes: {}, innerBlocks: [] };
	D.innerBlocks.push( stray );
	assert.equal( mergeWidthAlternatives( [ D, M ], { ...opts, hostOf: ( n ) => ( n === nodes.menu ? wrap : null ) } ).innerBlocks.at( -1 ), stray );
} );

test( 'two bars that are not width alternatives (one drawn at every width, or both at one width) are not merged', () => {
	const { els, M, D, opts } = altBars();
	els.M.shown = [ 375, 768, 1440 ];
	assert.equal( mergeWidthAlternatives( [ M, D ], opts ), null, 'a bar drawn at every width' );
	els.M.shown = [ 768, 1440 ];
	assert.equal( mergeWidthAlternatives( [ M, D ], opts ), null, 'two bars drawn at 1440' );
	els.M.shown = [];
	assert.equal( mergeWidthAlternatives( [ M, D ], opts ), null, 'a bar drawn at no width' );
	els.M.shown = [ 375, 768 ];
	assert.equal( mergeWidthAlternatives( [ D ], opts ), null, 'one row is not a merge' );
} );

test( 'MUST FAIL: a header whose main bar is two width alternatives proposes the desktop bar as the middle row, with a handover entry for the compact bar and a tree the skeleton checks accept', () => {
	const only = ( e, widths ) => {
		e.visible = { 375: widths.includes( 375 ), 768: widths.includes( 768 ), 1440: widths.includes( 1440 ) };
		e.box = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, widths.includes( w ) ? { x: 0, y: 100, w: 100, h: 20 } : { x: 0, y: 0, w: 0, h: 0 } ] ) );
		return e;
	};
	const [ root, bar, nav, a, b ] = header();
	[ bar, nav, a, b ].forEach( ( e ) => only( e, [ 1440 ] ) );
	const compact = [ el( 'Root/6#0', 'Root/1#0', 'div', '', { depth: 1, display: 'flex' } ), el( 'Root/7#0', 'Root/6#0', 'nav', '', { depth: 2 } ), el( 'Root/8#0', 'Root/7#0', 'a', 'Menu', { depth: 3, attrs: { href: '/m' } } ), el( 'Root/9#0', 'Root/7#0', 'a', 'Shop', { depth: 3, attrs: { href: '/s' } } ) ].map( ( e ) => only( e, [ 375, 768 ] ) );
	const r = run( inv( [ root, bar, nav, a, b, ...compact ] ) );
	const mid = rows( r )[ 1 ];
	assert.equal( mid.draftRef?.tpl, 'Root/2#0', 'the desktop bar\'s row is the middle row' );
	assert.ok( ( mid.handover || [] ).some( ( h ) => 'behaviour' === h.kind && /Root\/6#0: the main bar's alternative shown at 375 and 768px/.test( h.detail ) ), JSON.stringify( mid.handover ) );
	assert.deepEqual( [ mid.innerBlocks.length, mid.innerBlocks[ 0 ].draftRef?.tpl ], [ 2, 'Root/3#0' ], 'each bar\'s content, the desktop bar\'s first' );
	assert.deepEqual( skeletonProblems( r.skeleton ), [], 'the merged middle row passes the skeleton checks' );
	assert.deepEqual( lintSkeleton( r.skeleton, db ), [] );
} );

test( 'MUST FAIL: a grid row merged from width alternatives takes each bar\'s column count at its widths; a flex row takes none', () => {
	const only = ( e, widths, x = 0, w = 100 ) => {
		e.visible = { 375: widths.includes( 375 ), 768: widths.includes( 768 ), 1440: widths.includes( 1440 ) };
		e.box = Object.fromEntries( [ 375, 768, 1440 ].map( ( v ) => [ v, widths.includes( v ) ? { x, y: 100, w, h: 20 } : { x: 0, y: 0, w: 0, h: 0 } ] ) );
		return e;
	};
	const D = [ 1440 ];
	const C = [ 375, 768 ];
	const root = el( 'Root/1#0', null, 'header', '', { depth: 0, box: boxes( 90, 60 ) } );
	const desk = [ only( el( 'Root/2#0', 'Root/1#0', 'div', '', { depth: 1, display: 'grid' } ), D, 0, 1000 ), only( el( 'Root/20#0', 'Root/2#0', 'a', 'Acme', { depth: 2, attrs: { href: '/' } } ), D, 0, 150 ), only( el( 'Root/3#0', 'Root/2#0', 'nav', '', { depth: 2 } ), D, 200, 600 ), only( el( 'Root/4#0', 'Root/3#0', 'a', 'Shop', { depth: 3, attrs: { href: '/shop' } } ), D, 200, 60 ), only( el( 'Root/5#0', 'Root/3#0', 'a', 'Help', { depth: 3, attrs: { href: '/help' } } ), D, 300, 60 ) ];
	const comp = [ only( el( 'Root/6#0', 'Root/1#0', 'div', '', { depth: 1, display: 'grid' } ), C, 0, 375 ), only( el( 'Root/7#0', 'Root/6#0', 'nav', '', { depth: 2 } ), C, 0, 100 ), only( el( 'Root/8#0', 'Root/7#0', 'a', 'Menu', { depth: 3, attrs: { href: '/m' } } ), C, 0, 100 ), only( el( 'Root/9#0', 'Root/6#0', 'a', 'Acme', { depth: 2, attrs: { href: '/' } } ), C, 120, 100 ), only( el( 'Root/10#0', 'Root/6#0', 'span', 'Open', { depth: 2 } ), C, 260, 100 ) ];
	const r = run( inv( [ root, ...desk, ...comp ] ) );
	const mid = rows( r )[ 1 ];
	assert.equal( mid.draftRef?.tpl, 'Root/2#0' );
	assert.equal( mid.attributes.layout, 'grid' );
	assert.deepEqual( mid.attributes.columns, { desktop: 2, tablet: 3, mobile: 3 } );
	assert.deepEqual( lintSkeleton( r.skeleton, db ), [] );
	const stacked = comp.map( ( e ) => ( e.parentKey === 'Root/6#0' ? { ...e, box: Object.fromEntries( Object.entries( e.box ).map( ( [ w, b ] ) => [ w, b.w ? { ...b, x: 0, y: 100 + 30 * comp.indexOf( e ) } : b ] ) ) } : e ) );
	assert.deepEqual( rows( run( inv( [ root, ...desk, ...stacked ] ) ) )[ 1 ].attributes.columns, { desktop: 2 }, 'a bar whose children stack gives no count' );
	const flex = run( inv( [ root, ...desk.map( ( e, i ) => ( 0 === i ? { ...e, display: 'flex' } : e ) ), ...comp ] ) );
	assert.equal( rows( flex )[ 1 ].attributes.columns, undefined, 'a flex row has no column count to set' );
	const f = facts();
	f.decisions = structuredClone( f.decisions );
	f.decisions.rules.headerSlots.columnsSetting = 'gap';
	assert.ok( decisionsProblems( f ).some( ( p ) => /headerSlots\.columnsSetting must name a structural setting/.test( p ) ) );
} );

// rules.headerStripBar: a strip above the main bar whose track holds labels side by side, each drawing an icon beside its
// words (`svg`: the rendered markup the inventory keeps, lib/skeleton-inventory.mjs::svgMarkupOf), and a copy of the run the
// draft draws only on a phone (its marquee loop).
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2 4 5v6"></path></svg>';
const CLAIMS = [ 'Genuine, supplied direct by the brands', 'Free UK delivery over 75', 'Lenses glazed here in 7 days' ];
const SIZED = ICON.replace( '<svg ', '<svg width="15" height="15" ' );
const stripBar = ( { icons = true, tag = 'span', copy = false, attrs = {}, sep = false, icon = ICON } = {} ) => {
	const out = [ stripRoot( 'Root/10#0', 'before' ), el( 'Root/11#0', 'Root/10#0', 'div', '', { depth: 2, display: 'flex' } ) ];
	const label = ( i, n, only ) => {
		const key = `Root/${ 20 + n }#0`;
		const k = el( key, 'Root/11#0', tag, CLAIMS[ i ], { depth: 3, attrs, box: boxes( 0, 20, 300, i * 320 ) } );
		only && ( k.visible = { 375: true, 768: false, 1440: false } );
		const kids = icons ? [ { ...el( `Root/${ 60 + n }#0`, key, 'svg', '', { depth: 4 } ), svg: icon, ...( only ? { visible: { 375: true, 768: false, 1440: false } } : {} ) } ] : [];
		return [ k, ...kids ];
	};
	CLAIMS.forEach( ( c, i ) => out.push( ...( sep && i ? [ el( `Root/${ 40 + i }#0`, 'Root/11#0', 'span', '·', { depth: 3, box: boxes( 0, 20, 10, i * 320 - 10 ) } ) ] : [] ), ...label( i, i ) ) );
	copy && CLAIMS.forEach( ( c, i ) => out.push( ...label( i, 10 + i, true ) ) );
	return out;
};
const noStripBar = () => {
	const f = facts();
	f.decisions = structuredClone( f.decisions );
	delete f.decisions.rules.headerStripBar;
	return f;
};

test( 'MUST FAIL: a run of labels with icons in a header strip is one trust bar in the top row, each label an item with its icon, drawn bare', () => {
	const r = run( inv( [ ...header(), ...stripBar() ], [ near( 'Root/10#0', 'before' ) ] ) );
	const top = rows( r )[ 0 ];
	assert.deepEqual( top.innerBlocks.map( ( n ) => n.name ), [ 'sgs/trust-bar' ], 'one block in the top row' );
	const bar = top.innerBlocks[ 0 ];
	assert.equal( bar.draftRef.tpl, 'Root/11#0' );
	assert.deepEqual( bar.attributes.items.map( ( x ) => x.label ), CLAIMS );
	assert.ok( bar.attributes.items.every( ( x ) => /<path d="M12 2 4 5v6"/.test( x.iconSvg ) ), 'each item keeps its icon' );
	assert.deepEqual( [ bar.attributes.badgeStyle, bar.decided ], [ 'icon-bare', { badgeStyle: 'icon-bare' } ] );
	assert.equal( r.proposal.rows.find( ( x ) => 'Root/11#0' === x.key ).rule, 'headerStripBar' );
	noRoot( r );
	const off = run( inv( [ ...header(), ...stripBar() ], [ near( 'Root/10#0', 'before' ) ] ), noStripBar() );
	assert.ok( ! flat( rows( off )[ 0 ].innerBlocks ).some( ( n ) => 'sgs/trust-bar' === n.name ), 'without the rule the labels stay loose' );
} );

// A bare icon is drawn at the size the draft's SVGs state on their root; the kept markup drops it, so the size is a decided
// setting of the bar (iconBareSize paints a width and a height, so it never sits among the attributes).
test( 'MUST FAIL: a header strip whose icons state a size on their root decides the bare icon size from it', () => {
	const r = run( inv( [ ...header(), ...stripBar( { icon: SIZED } ) ], [ near( 'Root/10#0', 'before' ) ] ) );
	const bar = rows( r )[ 0 ].innerBlocks[ 0 ];
	assert.deepEqual( bar.decided, { badgeStyle: 'icon-bare', iconBareSize: 15 } );
	assert.equal( bar.attributes.iconBareSize, undefined, 'a setting that paints a size is decided, never an attribute' );
	assert.ok( bar.attributes.items.every( ( x ) => ! /width=/.test( x.iconSvg ) ), 'the kept icon carries no size of its own' );
	noRoot( r );
	assert.deepEqual( r.problems.filter( ( p ) => /iconBareSize|decided/i.test( p ) ), [] );
	// The proposal's lint accepts the decided size.
	assert.deepEqual( lintSkeleton( r.skeleton, db ), [] );
} );

test( 'negative control: icons that state no size, two sizes, or a size in another unit decide no bare icon size', () => {
	const none = run( inv( [ ...header(), ...stripBar() ], [ near( 'Root/10#0', 'before' ) ] ) );
	assert.deepEqual( rows( none )[ 0 ].innerBlocks[ 0 ].decided, { badgeStyle: 'icon-bare' } );
	const mixed = stripBar( { icon: SIZED } );
	const second = mixed.find( ( x ) => 'Root/61#0' === x.key );
	second.svg = ICON.replace( '<svg ', '<svg width="20" height="20" ' );
	assert.deepEqual( rows( run( inv( [ ...header(), ...mixed ], [ near( 'Root/10#0', 'before' ) ] ) ) )[ 0 ].innerBlocks[ 0 ].decided, { badgeStyle: 'icon-bare' }, 'labels that disagree decide nothing' );
	const em = run( inv( [ ...header(), ...stripBar( { icon: ICON.replace( '<svg ', '<svg width="1em" height="1em" ' ) } ) ], [ near( 'Root/10#0', 'before' ) ] ) );
	assert.deepEqual( rows( em )[ 0 ].innerBlocks[ 0 ].decided, { badgeStyle: 'icon-bare' } );
	// Word-only labels have no icon to size.
	const plain = run( inv( [ ...header(), ...stripBar( { icons: false } ) ], [ near( 'Root/10#0', 'before' ) ] ) );
	assert.deepEqual( rows( plain )[ 0 ].innerBlocks[ 0 ].decided, { badgeStyle: 'text-only' } );
} );

test( 'MUST FAIL: the copy of the run a header strip draws only on a phone is absorbed by the trust bar, never built beside it', () => {
	const r = run( inv( [ ...header(), ...stripBar( { copy: true } ) ], [ near( 'Root/10#0', 'before' ) ] ) );
	const top = rows( r )[ 0 ];
	assert.deepEqual( top.innerBlocks.map( ( n ) => n.name ), [ 'sgs/trust-bar' ] );
	assert.equal( top.innerBlocks[ 0 ].attributes.items.length, CLAIMS.length, 'the items once' );
	assert.ok( [ 30, 31, 32 ].every( ( n ) => 'absorbed' === r.proposal.rows.find( ( x ) => `Root/${ n }#0` === x.key )?.action ), 'the phone copy is absorbed' );
	assert.equal( top.innerBlocks[ 0 ].widthVariants, undefined, 'and is no width variation' );
} );

test( 'MUST FAIL: the glyph a word-only strip repeats between its labels is the textBadgeSeparator setting and the separator part of the trust bar; no glyph, or icons on the items, writes none', () => {
	const bar = rows( run( inv( [ ...header(), ...stripBar( { icons: false, sep: true } ) ], [ near( 'Root/10#0', 'before' ) ] ) ) )[ 0 ].innerBlocks[ 0 ];
	assert.equal( bar.attributes.textBadgeSeparator, '·' );
	const sepRun = run( inv( [ ...header(), ...stripBar( { icons: false, sep: true } ) ], [ near( 'Root/10#0', 'before' ) ] ) );
	assert.equal( sepRun.proposal.rows.find( ( x ) => 'headerStripBar' === x.rule )?.separator, 'Root/41#0', 'the first glyph is named as the draft element of the separator part' );
	const none = rows( run( inv( [ ...header(), ...stripBar( { icons: false } ) ], [ near( 'Root/10#0', 'before' ) ] ) ) )[ 0 ].innerBlocks[ 0 ];
	assert.equal( none.attributes.textBadgeSeparator, undefined, 'no glyph between the labels: no separator' );
	const iconed = rows( run( inv( [ ...header(), ...stripBar( { sep: true } ) ], [ near( 'Root/10#0', 'before' ) ] ) ) )[ 0 ].innerBlocks[ 0 ];
	assert.equal( iconed.attributes.textBadgeSeparator, undefined, 'the icon style prints no separator' );
} );

test( 'a header strip of plain labels is a word-only trust bar; links, a page section and the main bar are not this rule', () => {
	const plain = run( inv( [ ...header(), ...stripBar( { icons: false, sep: true } ) ], [ near( 'Root/10#0', 'before' ) ] ) );
	const bar = rows( plain )[ 0 ].innerBlocks[ 0 ];
	assert.deepEqual( [ bar.name, bar.attributes.badgeStyle ], [ 'sgs/trust-bar', 'text-only' ] );
	assert.ok( bar.attributes.items.every( ( x ) => ! x.iconSvg ) );
	assert.deepEqual( bar.attributes.items.map( ( x ) => x.label ), CLAIMS, 'a glyph between labels is their separator, never an item' );
	// Links in the strip are links, not trust claims.
	const links = run( inv( [ ...header(), ...stripBar( { tag: 'a', attrs: { href: '/x' } } ) ], [ near( 'Root/10#0', 'before' ) ] ) );
	assert.ok( ! links.proposal.rows.some( ( x ) => 'headerStripBar' === x.rule ) );
	// The same run on a page (no header, no strip) is not this rule.
	const page = proposeSkeleton( { inventory: inv( [ el( 'Root/1#0', null, 'section', '', { depth: 0 } ), ...stripBar().slice( 1 ).map( ( x ) => ( 'Root/11#0' === x.key ? { ...x, parentKey: 'Root/1#0', depth: 1 } : x ) ) ] ), facts: facts(), surface: 'home', surfaceKind: 'page', surfaceName: 'Home', db } );
	assert.ok( ! page.proposal.rows.some( ( x ) => 'headerStripBar' === x.rule ) );
	// The main bar's own children are never a strip, even a run of plain labels beside its navigation.
	const bar2 = run( inv( [ ...header(), el( 'Root/6#0', 'Root/2#0', 'div', '', { depth: 2, display: 'flex' } ), el( 'Root/7#0', 'Root/6#0', 'span', 'Family run since 1962', { depth: 3, box: boxes( 100, 20, 100, 0 ) } ), el( 'Root/8#0', 'Root/6#0', 'span', 'Fitted by hand here', { depth: 3, box: boxes( 100, 20, 100, 120 ) } ) ] ) );
	assert.ok( ! bar2.proposal.rows.some( ( x ) => 'headerStripBar' === x.rule ) );
} );

// rules.headerStripBar.loneLabel: one label whose glyph comes before its words, in a header (a header surface, or a page
// template's own `<header>`), is a trust bar of one item with its icon: the lock before "Secure checkout" in a checkout
// template's top bar. Its words at each width are `wordsAt` (lib/skeleton-inventory.mjs::summarise).
const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="5" y="11" width="14" height="10" rx="2"></rect></svg>';
const withGlyph = ( x ) => ( { ...x, snippet: x.snippet.replace( /^(<span[^>]*>)/, `$1${ LOCK.replace( '<svg', '<svg data-dc-tpl="31"' ) }` ) } );
const lone = ( { words = 'Secure checkout', tag = 'span', glyphFirst = true, wordsAt = null, inLink = false, glyph = true } = {} ) => {
	const label = el( 'Root/30#0', inLink ? 'Root/29#0' : 'Root/28#0', tag, words, { depth: 3, display: 'flex', box: boxes( 100, 20, 120, 600 ) } );
	glyphFirst && glyph && ( label.snippet = label.snippet.replace( />/, `>${ LOCK }` ) );
	! glyphFirst && ( label.snippet = label.snippet.replace( `>${ words }<`, `>${ words }${ LOCK }<` ) );
	wordsAt && ( label.wordsAt = wordsAt );
	const svg = glyph ? [ { ...el( 'Root/31#0', 'Root/30#0', 'svg', '', { depth: 4 } ), svg: LOCK } ] : [];
	return [ el( 'Root/28#0', 'Root/1#0', 'div', '', { depth: 1, display: 'grid' } ), ...( inLink ? [ el( 'Root/29#0', 'Root/28#0', 'a', '', { depth: 2, attrs: { href: '/x' } } ) ] : [] ), label, ...svg ];
};
const pageHeader = ( kids, tag = 'header' ) => [ el( 'Root/1#0', null, tag, '', { depth: 0, box: boxes( 90, 60 ) } ), ...kids ];
const onPage = ( elements ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'checkout', surfaceKind: 'page', surfaceName: 'Checkout', db } );
const nodeFor = ( r, key ) => flat( r.skeleton ).find( ( n ) => key === n.draftRef?.tpl );
const noLone = () => {
	const f = facts();
	f.decisions = structuredClone( f.decisions );
	delete f.decisions.rules.headerStripBar.loneLabel;
	return f;
};

test( 'MUST FAIL: a lone label with its glyph before its words in a template\'s header is a trust bar of one item with its icon, and the glyph is no longer unread', () => {
	const r = onPage( pageHeader( lone() ) );
	const bar = nodeFor( r, 'Root/30#0' );
	assert.equal( bar?.name, 'sgs/trust-bar' );
	assert.deepEqual( bar.attributes.items.map( ( x ) => x.label ), [ 'Secure checkout' ] );
	assert.match( bar.attributes.items[ 0 ].iconSvg, /<rect x="5"/ );
	assert.deepEqual( [ bar.attributes.badgeStyle, bar.decided.badgeStyle ], [ 'icon-bare', 'icon-bare' ] );
	assert.deepEqual( bar.innerBlocks, [], 'the item draws the words: no text block is built for them' );
	assert.equal( r.proposal.rows.find( ( x ) => 'Root/30#0' === x.key ).rule, 'headerStripBar' );
	assert.deepEqual( r.problems.filter( ( p ) => /unread/.test( p ) ), [] );
	// The rule removed: the label is text again, as before.
	assert.equal( nodeFor( proposeSkeleton( { inventory: inv( pageHeader( lone() ) ), facts: noLone(), surface: 'checkout', surfaceKind: 'page', surfaceName: 'Checkout', db } ), 'Root/30#0' )?.name, 'sgs/text' );
} );

test( 'MUST FAIL: the same label on a header surface is a trust bar too, and a label whose words differ by width is noted for the content page', () => {
	const r = run( inv( pageHeader( lone( { wordsAt: { 375: 'Secure', 768: 'Secure checkout', 1440: 'Secure checkout' } } ) ) ) );
	const bar = nodeFor( r, 'Root/30#0' );
	assert.equal( bar?.name, 'sgs/trust-bar' );
	assert.match( JSON.stringify( bar.handover ), /Secure\\" at 375px/ );
	assert.deepEqual( bar.attributes.items.map( ( x ) => x.label ), [ 'Secure checkout' ], 'the item holds the widest words' );
	assert.equal( nodeFor( run( inv( pageHeader( lone() ) ) ), 'Root/30#0' ).handover, undefined, 'words alike at every width need no note' );
} );

test( 'negative control: the glyph after the words, no glyph, a link or button around the label, a heading, outside any header and a label of a page body are not this rule', () => {
	const is = ( r ) => 'sgs/trust-bar' === nodeFor( r, 'Root/30#0' )?.name;
	assert.equal( is( onPage( pageHeader( lone( { glyphFirst: false } ) ) ) ), false, 'the glyph after its words' );
	assert.equal( is( onPage( pageHeader( lone( { glyph: false } ) ) ) ), false, 'no glyph' );
	assert.equal( is( onPage( pageHeader( lone( { inLink: true } ) ) ) ), false, 'inside a link' );
	assert.equal( is( onPage( pageHeader( lone( { tag: 'a' } ) ) ) ), false, 'a link' );
	assert.equal( is( onPage( pageHeader( lone( { tag: 'h2' } ) ) ) ), false, 'a heading' );
	assert.equal( is( onPage( pageHeader( lone(), 'main' ) ) ), false, 'a page body that is no header' );
	assert.equal( is( onPage( pageHeader( lone( { words: '2' } ) ) ) ), false, 'a number' );
} );

test( 'MUST FAIL: a byline label in an article header is no trust bar, while the top-level page header still makes one', () => {
	// An article `<header>` (a post's title and byline) is no site header: "5 min read" beside its clock stays text.
	const inArticle = ( [ top, ...kids ] ) => [ { ...top, tag: 'article', srcTag: 'article', snippet: '<article data-dc-tpl="1">' }, el( 'Root/27#0', 'Root/1#0', 'header', '', { depth: 1 } ), ...kids.map( ( k ) => ( 'Root/28#0' === k.key ? { ...k, parentKey: 'Root/27#0', depth: 2 } : k ) ) ];
	const r = onPage( inArticle( pageHeader( lone( { words: '5 min read' } ) ) ) );
	assert.equal( nodeFor( r, 'Root/30#0' )?.name, 'sgs/text', 'a label in an article header stays text' );
	assert.ok( ! r.proposal.rows.some( ( x ) => 'headerStripBar' === x.rule ) );
	// The same label in the template's top-level header is a trust bar, and a header inside a main or section is not.
	assert.equal( nodeFor( onPage( pageHeader( lone( { words: '5 min read' } ) ) ), 'Root/30#0' )?.name, 'sgs/trust-bar' );
	for ( const tag of [ 'section', 'main', 'aside' ] ) {
		const wrapped = inArticle( pageHeader( lone( { words: '5 min read' } ) ) ).map( ( x ) => ( 'Root/1#0' === x.key ? { ...x, tag, srcTag: tag } : x ) );
		assert.equal( nodeFor( onPage( wrapped ), 'Root/30#0' )?.name, 'sgs/text', `a header inside a ${ tag }` );
	}
} );
