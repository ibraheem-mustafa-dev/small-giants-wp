// The layout around WooCommerce's working block on the cart and checkout templates (Spec 48 FR-48-87;
// lib/template-piece-woo-layout.mjs, lib/template-piece-frame.mjs through lib/template-pieces.mjs::placePieces). Where the
// element laying out the form beside the order summary holds only parts WooCommerce's block draws, the block stands in for
// it (no wrapper reads its column template, no static imitation of the phone's summary toggle is built beside it) and the
// form column's own eyebrow and heading stay the draft's own blocks above it. A planted checkout first, then Mama's and Eye
// Care's real inputs (the fact record elements saved as fixtures because facts.json is gitignored). Tests marked MUST FAIL
// fail without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { basketCounts, otherBranches, place, templateView } from '../lib/template-piece-woo-layout.mjs';
import { logicOf } from '../lib/shop-parts-logic.mjs';
import { BUILDERS, piecesPass, placedLint } from '../lib/template-pieces-context.mjs';
import { openDb } from '../lib/db.mjs';
import { checkPieces, countBlocks, loadPieces, placePieces } from '../lib/template-pieces.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '..', '..', '..' );
const FIX = path.join( HERE, 'fixtures', 'template-shell' );
const json = ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) );
const DATA = loadPieces();

// Every node of a tree, depth first.
const nodes = ( tree ) => ( tree || [] ).flatMap( ( n ) => [ n, ...nodes( n.innerBlocks ) ] );
const refs = ( tree ) => nodes( tree ).map( ( n ) => n.draftRef?.tpl ).filter( Boolean );
const shape = ( tree ) => ( tree || [] ).map( ( n ) => [ n.name, n.draftRef?.tpl ?? null, ...( n.innerBlocks?.length ? [ shape( n.innerBlocks ) ] : [] ) ] );

// A planted checkout page. `spec`: [ n, parent n, tag, { words, attrs, events, own, holes, via } ]; the component is `Pay`.
function plant( rows, { shown = {}, money = {} } = {} ) {
	const byN = Object.fromEntries( rows.map( ( r ) => [ r[ 0 ], r ] ) );
	const chain = ( n ) => {
		const out = [];
		for ( let p = byN[ n ][ 1 ]; null != p; p = byN[ p ][ 1 ] ) {
			out.push( `Pay/${ p }` );
		}
		return out;
	};
	const facts = { sources: { files: {} }, state: { Pay: { keys: [ 'bp', 'open', 'other' ] } }, elements: {} };
	for ( const [ n, parent, tag, o = {} ] of rows ) {
		facts.elements[ `Pay/${ n }` ] = { template: { key: `Pay/${ n }`, component: 'Pay', n: String( n ), tag, attrs: o.attrs || {}, parent: null == parent ? null : `Pay/${ parent }`, parentChain: chain( n ), words: o.words || '', holes: o.holes || [], events: o.events || [], own: o.own || {} }, ...( o.via ? { logic: { via: o.via } } : {} ) };
	}
	const all = { 375: true, 768: true, 1440: true };
	const elements = rows.filter( ( r ) => ! [ 'sc-if', 'sc-for' ].includes( r[ 2 ] ) ).map( ( [ n, , tag, o = {} ] ) => {
		let parent = byN[ n ][ 1 ];
		while ( null != parent && [ 'sc-if', 'sc-for' ].includes( byN[ parent ][ 2 ] ) ) {
			parent = byN[ parent ][ 1 ];
		}
		return { key: `Root/${ n }#0`, parentKey: null == parent ? null : `Root/${ parent }#0`, tag, template: 'Root', attrs: o.attrs || {}, words: o.words || '', allText: money[ n ] ?? o.words ?? '', visible: shown[ n ] ?? all, membership: [] };
	} ).filter( ( e ) => false !== shown[ e.key.split( '/' )[ 1 ].split( '#' )[ 0 ] ] );
	return { facts, inventory: { elements } };
}

// The page: a bar and a main whose grid (5) lays out the phone's summary toggle (6, 7), the phone's second summary (10), the
// form (14) and the order summary (28). `swap` replaces rows by number.
const PAGE = ( swap = {} ) => {
	const rows = [
		[ 1, null, 'div' ],
		[ 2, 1, 'header' ],
		[ 3, 2, 'a', { words: 'Back' } ],
		[ 4, 1, 'main' ],
		[ 5, 4, 'div' ],
		[ 6, 5, 'sc-if', { via: 'm' } ],
		[ 7, 6, 'button', { events: [ { name: 'onClick', expr: 'flip' } ] } ],
		[ 8, 7, 'span', { words: '{{ label }}', holes: [ { where: 'text' } ] } ],
		[ 9, 7, 'span', { words: '{{ total }}', holes: [ { where: 'text' } ] } ],
		[ 10, 5, 'sc-if', { via: 'm && S.open' } ],
		[ 11, 10, 'div' ],
		[ 12, 11, 'sc-for', { own: { list: '{{ items }}' } } ],
		[ 13, 12, 'div', { words: '{{ it.name }}', holes: [ { where: 'text' } ] } ],
		[ 14, 5, 'form' ],
		[ 15, 14, 'div' ],
		[ 16, 15, 'div', { words: 'almost there' } ],
		[ 17, 15, 'h1', { words: 'Pay', holes: [ { where: 'style:font-size' } ] } ],
		[ 18, 15, 'div' ],
		[ 19, 18, 'button', { words: 'Wallet A', attrs: { type: 'button' } } ],
		[ 20, 18, 'button', { words: 'Wallet B', attrs: { type: 'button' } } ],
		[ 21, 15, 'div', { words: 'or card' } ],
		[ 22, 21, 'span' ],
		[ 23, 21, 'span' ],
		[ 24, 14, 'fieldset' ],
		[ 25, 24, 'legend', { words: 'Details' } ],
		[ 26, 24, 'input', { attrs: { type: 'email' } } ],
		[ 27, 24, 'input', { attrs: { autocomplete: 'cc-number' } } ],
		[ 28, 5, 'sc-if', { via: '!m' } ],
		[ 29, 28, 'aside' ],
		[ 30, 29, 'sc-for', { own: { list: '{{ items }}' } } ],
		[ 31, 30, 'div', { words: '{{ it.price }}', holes: [ { where: 'text' } ] } ],
		[ 32, 29, 'input', { attrs: { placeholder: 'Discount code' } } ],
	];
	return rows.map( ( r ) => swap[ r[ 0 ] ] || r ).concat( swap.extra || [] );
};
const PLANT = ( swap = {}, money = { 7: 'Show £10.00', 29: 'Your order Box £10.00 Total £10.00' } ) => plant( PAGE( swap ), { shown: { 7: { 375: true }, 8: { 375: true }, 9: { 375: true }, 11: false, 13: false, 29: { 768: true, 1440: true }, 31: { 768: true, 1440: true } }, money } );
// The skeleton writer's tree read from <main>: the block at the region, the phone's toggle built beside it as its width variant.
const MAIN_TREE = () => [ { name: 'sgs/container', attributes: { tagName: 'main' }, draftRef: { tpl: 'Root/4#0' }, innerBlocks: [
	{ name: 'core/post-content', attributes: {}, innerBlocks: [], widthVariants: [ { key: 'Root/7#0', shown: [ 375 ] } ] },
	{ name: 'sgs/container', attributes: { tagName: 'div', layout: 'flex' }, draftRef: { tpl: 'Root/7#0' }, widthShown: [ 375 ], innerBlocks: [
		{ name: 'sgs/text', attributes: { text: 'Show' }, draftRef: { tpl: 'Root/8#0' } },
		{ name: 'sgs/text', attributes: { text: '£10.00' }, draftRef: { tpl: 'Root/9#0' } },
	] },
] } ];
// The flip handler opens `open` (the second summary's condition); `other` opens nothing a summary reads.
const OPENS = ( h ) => new Set( { flip: [ 'open' ], other: [ 'other' ] }[ h ] || [] );
const ctxOf = ( planted, extra = {} ) => ( { key: 'checkout', tree: MAIN_TREE(), inventory: planted.inventory, factRecord: planted.facts, rootComponent: 'Pay', region: 'Root/5#0', opens: OPENS, records: [], ...extra } );
const PIECE = { id: 'layout', block: 'core/post-content', required: false, kind: 'woo-layout' };

test( 'MUST FAIL: the checkout block stands in for the element laying out the form beside the order summary, and the form column\'s own eyebrow and heading stay above it', () => {
	const ctx = ctxOf( PLANT() );
	const got = placePieces( { key: 'checkout', tree: ctx.tree, data: DATA, ctx, builders: BUILDERS } );
	assert.deepEqual( got.problems, [] );
	assert.deepEqual( shape( got.tree ), [ [ 'sgs/container', 'Root/4#0', [ [ 'sgs/text', 'Root/16#0' ], [ 'sgs/heading', 'Root/17#0' ], [ 'core/post-content', null ] ] ] ] );
	const block = nodes( got.tree ).find( ( n ) => 'core/post-content' === n.name );
	assert.deepEqual( block.draftStandsFor, { tpl: 'Root/5#0' } );
	assert.equal( block.widthVariants, undefined );
	const [ eyebrow, heading ] = got.tree[ 0 ].innerBlocks;
	assert.deepEqual( eyebrow.attributes, { text: 'almost there' } );
	assert.deepEqual( heading.attributes, { content: 'Pay', level: 'h1' } );
	assert.equal( heading.draftFingerprint.tag, 'h1' );
	assert.deepEqual( got.placed.find( ( p ) => 'layout' === p.id ), { id: 'layout', block: 'core/post-content', at: 'Root/5#0', run: [ 'Root/5#0' ] } );
	// The run is the region the block stands for, not the heading and eyebrow kept above it (their nodes read their own elements).
	assert.ok( ! got.placed.find( ( p ) => 'layout' === p.id ).run.some( ( k ) => [ 'Root/16#0', 'Root/17#0' ].includes( k ) ) );
	assert.deepEqual( checkPieces( { key: 'checkout', tree: got.tree, data: DATA } ), [] );
} );

test( 'MUST FAIL: each part the block stands in for is told by what it is, not by its words', () => {
	const got = place( ctxOf( PLANT() ), PIECE );
	const says = ( key, what ) => assert.ok( got.notes.some( ( n ) => n.startsWith( `checkout: ${ key } ` ) && n.includes( what ) ), `${ key }: ${ what }\n${ got.notes.join( '\n' ) }` );
	says( 'Pay/6', 'is the summary toggle WooCommerce\'s block draws (its control\'s onClick handler flip opens open' );
	says( 'Pay/10', 'is the duplicate summary WooCommerce\'s block draws (loops over {{ items }}' );
	says( 'Pay/14', 'is the form WooCommerce\'s block draws (holds 2 checkout entry field(s))' );
	says( 'Pay/28', 'is the order summary WooCommerce\'s block draws' );
	says( 'Pay/18', 'is an express-payment group' );
	says( 'Pay/21', 'is the divider between express payment and the fields' );
	says( 'Pay/16', '(text) at the head of the form column stays the draft\'s own' );
	says( 'Pay/17', '(heading) at the head of the form column stays the draft\'s own' );
	says( 'sgs/container', 'Root/7#0 is dropped' );
	assert.equal( refs( got.tree ).includes( 'Root/8#0' ), false );
} );

test( 'a two-column page that is not a WooCommerce page keeps its columns and its nodes', () => {
	const planted = PLANT();
	const tree = MAIN_TREE();
	const page = placePieces( { key: 'page', tree, data: DATA, ctx: ctxOf( planted ), builders: BUILDERS } );
	assert.deepEqual( page.tree, MAIN_TREE() );
	const none = place( ctxOf( planted, { region: undefined, commerce: null } ), PIECE );
	assert.deepEqual( none.tree, MAIN_TREE() );
	assert.match( none.notes[ 0 ], /no commerce region was found/ );
} );

test( 'a heading inside a fieldset stays with the block: only the column\'s head before its fields is kept', () => {
	// The eyebrow, heading, wallets and divider all sit inside the fieldset holding the fields, so the column has no head of its own.
	const got = place( ctxOf( PLANT( { 15: [ 15, 24, 'div' ], 17: [ 17, 15, 'h2', { words: 'Your details' } ] } ) ), PIECE );
	assert.equal( countBlocks( got.tree, 'sgs/heading' ), 0 );
	assert.equal( countBlocks( got.tree, 'sgs/text' ), 0 );
	assert.deepEqual( nodes( got.tree ).find( ( n ) => 'core/post-content' === n.name ).draftStandsFor, { tpl: 'Root/5#0' } );
} );

test( 'a heading whose words are a live value is not copied above the block', () => {
	const got = place( ctxOf( PLANT( { 17: [ 17, 15, 'h1', { words: 'Hello {{ name }}', holes: [ { where: 'text' } ] } ] } ) ), PIECE );
	assert.deepEqual( shape( got.tree ), [ [ 'sgs/container', 'Root/4#0', [ [ 'sgs/text', 'Root/16#0' ], [ 'core/post-content', null ] ] ] ] );
} );

test( 'a region that also lays out a part WooCommerce does not draw is left as it is, naming the part', () => {
	const planted = PLANT( { extra: [ [ 33, 5, 'div', { words: 'Join the club' } ] ] } );
	const got = place( ctxOf( planted ), PIECE );
	assert.deepEqual( got.tree, MAIN_TREE() );
	assert.match( got.notes[ 0 ], /also lays out Pay\/33 \(<div> is no part/ );
} );

test( 'a control whose handler opens nothing a summary shows under is no summary toggle, so the region is left', () => {
	const got = place( ctxOf( PLANT( { 7: [ 7, 6, 'button', { events: [ { name: 'onClick', expr: 'other' } ] } ] }, { 7: 'Show', 29: 'Your order Box £10.00 Total £10.00' } ) ), PIECE );
	assert.deepEqual( got.tree, MAIN_TREE() );
	assert.match( got.notes[ 0 ], /Pay\/6/ );
} );

test( 'a second loop over a list no order summary loops over is no duplicate summary', () => {
	const got = place( ctxOf( PLANT( { 12: [ 12, 11, 'sc-for', { own: { list: '{{ tips }}' } } ] } ) ), PIECE );
	assert.deepEqual( got.tree, MAIN_TREE() );
	assert.match( got.notes[ 0 ], /Pay\/10/ );
} );

test( 'buttons that submit the form are no express-payment group', () => {
	const got = place( ctxOf( PLANT( { 19: [ 19, 18, 'button', { words: 'Go' } ], 20: [ 20, 18, 'button', { words: 'Go too' } ] } ) ), PIECE );
	assert.equal( got.notes.some( ( n ) => n.includes( 'express-payment' ) ), false );
	assert.ok( got.notes.some( ( n ) => n.startsWith( 'checkout: Pay/19 at the head of the form column is other' ) ), got.notes.join( '\n' ) );
} );

test( 'a discount code box in the order summary is no checkout entry field; an email field there would make it a form', () => {
	const plain = place( ctxOf( PLANT() ), PIECE );
	assert.ok( plain.notes.some( ( n ) => n.startsWith( 'checkout: Pay/28 is the order summary' ) ), plain.notes.join( '\n' ) );
	const got = place( ctxOf( PLANT( { 32: [ 32, 29, 'input', { attrs: { autocomplete: 'email' } } ] } ) ), PIECE );
	// The aside is then a second form: no part shows the order, so the phone's second copy matches no summary and the region is left.
	assert.deepEqual( got.tree, MAIN_TREE() );
	assert.match( got.notes[ 0 ], /also lays out Pay\/10/ );
} );

// The real inputs: the fact record extracts in tests/fixtures/template-shell and the committed drafts.
const MAMAS = 'mamas-munches-redesign';
const EYE = 'eye-care-ward-end';
const committed = ( client, surface ) => ( { tree: json( path.join( REPO, 'sites', client, 'build', 'skeleton', `${ surface }.skeleton.json` ) ), inventory: json( path.join( REPO, 'sites', client, 'build', 'skeleton', `${ surface }.inventory.json` ) ) } );
const realCtx = ( client, component, key, input, facts, commerce ) => ( { key, tree: input.tree, inventory: input.inventory, factRecord: facts, rootComponent: component, handoffDir: path.join( REPO, 'sites', client, 'handoff' ), commerce } );

test( 'MUST FAIL: Mama\'s checkout read from its page: its own bar as the template\'s part, then a main holding the eyebrow, the h1 and the Checkout block standing in for the column grid, with no footer', () => {
	const input = { tree: json( path.join( FIX, 'mamas-checkout-pageroot.skeleton.json' ) ), inventory: json( path.join( FIX, 'mamas-checkout-pageroot.inventory.json' ) ) };
	const ctx = realCtx( MAMAS, 'Checkout', 'checkout', input, json( path.join( FIX, 'mamas-facts.json' ) ), { role: 'checkout', checkout: 'Checkout.dc.html' } );
	const got = placePieces( { key: 'checkout', tree: input.tree, data: DATA, ctx, builders: BUILDERS } );
	assert.deepEqual( got.problems, [] );
	assert.deepEqual( got.tree.map( ( n ) => [ n.name, n.draftRef?.tpl, n.templatePart ?? null, n.templateFrame ?? null ] ), [
		[ 'sgs/container', 'Root/7#0', 'checkout-header', null ],
		[ 'sgs/container', 'Root/16#0', null, { header: 'checkout-header', footer: null } ],
	] );
	assert.deepEqual( got.tree[ 1 ].innerBlocks.map( ( n ) => [ n.name, n.draftRef?.tpl ?? null, n.attributes ] ), [
		[ 'sgs/text', 'Root/33#0', { text: 'last bit, promise' } ],
		[ 'sgs/heading', 'Root/34#0', { content: 'Checkout', level: 'h1' } ],
		[ 'core/post-content', null, {} ],
	] );
	assert.deepEqual( got.tree[ 1 ].innerBlocks[ 2 ].draftStandsFor, { tpl: 'Root/17#0' } );
	assert.equal( got.tree[ 1 ].innerBlocks[ 2 ].widthVariants, undefined );
	for ( const gone of [ 'Root/19#0', 'Root/20#0', 'Root/21#0', 'Root/6#0' ] ) {
		assert.equal( refs( got.tree ).includes( gone ), false, gone );
	}
	// The bar keeps the draft's back link, logo and secure note.
	assert.deepEqual( refs( [ got.tree[ 0 ] ] ), [ 'Root/7#0', 'Root/8#0', 'Root/9#0', 'Root/10#0', 'Root/11#0', 'Root/12#0' ] );
	// MUST FAIL: the frame names the page wrapper it dropped (`own`), so its paint is the frame's missing feature.
	assert.deepEqual( got.placed.find( ( p ) => 'core/template-part' === p.block ), { id: 'frame', block: 'core/template-part', at: 'Root/7#0', own: [ 'Root/6#0' ] } );
} );

test( 'Mama\'s checkout read from <main> (the committed inventory): the block stands in and the head stays, and the frame is left for the page read', () => {
	const input = committed( MAMAS, 'template-checkout' );
	const ctx = realCtx( MAMAS, 'Checkout', 'checkout', input, json( path.join( FIX, 'mamas-facts.json' ) ), { role: 'checkout', checkout: 'Checkout.dc.html' } );
	const got = placePieces( { key: 'checkout', tree: input.tree, data: DATA, ctx, builders: BUILDERS } );
	assert.deepEqual( shape( got.tree ), [ [ 'sgs/container', 'Root/16#0', [ [ 'sgs/text', 'Root/33#0' ], [ 'sgs/heading', 'Root/34#0' ], [ 'core/post-content', null ] ] ] ] );
	assert.equal( got.tree[ 0 ].templateFrame, undefined );
	assert.ok( got.notes.some( ( n ) => /holds no node for its top bar Root\/7#0/.test( n ) ), got.notes.join( '\n' ) );
} );

test( 'MUST FAIL: the pieces pass reads the commerce role from the page map and hands the fact record to the layout and frame builders', () => {
	const input = committed( MAMAS, 'template-checkout' );
	const entry = json( path.join( REPO, 'sites', MAMAS, 'build', 'surfaces.json' ) )[ 'template-checkout' ];
	const got = piecesPass( { repo: REPO, client: MAMAS, entry, tree: input.tree, inventory: input.inventory, facts: json( path.join( FIX, 'mamas-facts.json' ) ) } );
	assert.deepEqual( got.problems, [] );
	assert.deepEqual( nodes( got.tree ).find( ( n ) => 'core/post-content' === n.name ).draftStandsFor, { tpl: 'Root/17#0' } );
	assert.deepEqual( got.placed.map( ( p ) => p.id ), [ 'layout' ] );
} );

test( 'what the layout and frame pieces place passes the skeleton lint the pass guards with (placedLint): the stand-in mark, the kept heading and the marked bar', () => {
	const tree = json( path.join( FIX, 'mamas-checkout-pageroot.skeleton.json' ) );
	const entry = json( path.join( REPO, 'sites', MAMAS, 'build', 'surfaces.json' ) )[ 'template-checkout' ];
	const got = piecesPass( { repo: REPO, client: MAMAS, entry, tree, inventory: json( path.join( FIX, 'mamas-checkout-pageroot.inventory.json' ) ), facts: json( path.join( FIX, 'mamas-facts.json' ) ) } );
	assert.deepEqual( got.placed.map( ( p ) => p.id ), [ 'layout', 'frame' ] );
	assert.deepEqual( got.problems, [] );
	assert.deepEqual( placedLint( tree, got.tree, openDb() ), [] );
} );

test( 'Mama\'s basket: the Cart block stands in for the grid of lines and summary; the heading above it and the shared frame stay', () => {
	const input = committed( MAMAS, 'template-cart' );
	const ctx = realCtx( MAMAS, 'Basket', 'cart', input, json( path.join( FIX, 'mamas-facts.json' ) ), { role: 'cart', checkout: 'Checkout.dc.html' } );
	const got = placePieces( { key: 'cart', tree: input.tree, data: DATA, ctx, builders: BUILDERS } );
	assert.deepEqual( got.problems, [] );
	const block = nodes( got.tree ).find( ( n ) => 'core/post-content' === n.name );
	assert.deepEqual( block.draftStandsFor, { tpl: 'Root/22#0' } );
	const strip = ( tree ) => JSON.parse( JSON.stringify( tree, ( k, val ) => ( 'draftStandsFor' === k ? undefined : val ) ) );
	assert.deepEqual( strip( got.tree ), input.tree );
	assert.ok( got.notes.some( ( n ) => /keeps the shared header and footer parts/.test( n ) ) );
	// MUST FAIL: the empty basket (sc-if empty, items.length === 0, beside the grid's hasItems, items.length > 0) is the block's
	// drawing too, so its draft elements are in the run.
	assert.deepEqual( got.placed.find( ( p ) => 'core/post-content' === p.block ).run, [ 'Root/22#0', 'Root/14#0' ] );
	assert.ok( got.notes.some( ( n ) => /Root\/14#0 is the region's other data branch/.test( n ) ) );
} );

test( 'MUST FAIL: a region\'s other data branch is the sc-else after its branch or a sibling branch counting the same list; another sibling is not', () => {
	const t = ( key, tag, parent ) => ( { key, tag, parent } );
	const els = [ t( 'P/1', 'div', null ), t( 'P/2', 'sc-if', 'P/1' ), t( 'P/3', 'div', 'P/2' ), t( 'P/4', 'sc-if', 'P/1' ), t( 'P/5', 'div', 'P/4' ), t( 'P/6', 'sc-else', 'P/1' ), t( 'P/7', 'p', 'P/6' ), t( 'P/8', 'sc-if', 'P/1' ), t( 'P/9', 'div', 'P/8' ) ];
	const via = { 'P/2': 'M ? lines.length === 0 : false', 'P/4': 'lines.length > 0', 'P/8': 'promo.length > 0' };
	const v = { byKey: Object.fromEntries( els.map( ( e ) => [ e.key, e ] ) ), children: ( k ) => els.filter( ( e ) => e.parent === k ), via: ( k ) => via[ k ] ?? '' };
	// The region P/5 shows under P/4: P/2 counts the same list, P/6 is P/4's else; P/8 counts another list.
	assert.deepEqual( otherBranches( v, 'P/5' ), [ 'P/3', 'P/7' ] );
	// Negative controls: a region under a branch counting no list, and a region under no branch, have none.
	assert.deepEqual( otherBranches( { ...v, via: ( k ) => ( 'P/4' === k ? 'open' : via[ k ] ?? '' ) }, 'P/5' ), [] );
	assert.deepEqual( otherBranches( v, 'P/1' ), [] );
} );

test( 'Eye Care\'s checkout: the block stands in for the grid; its h1 above the grid and the shared frame stay', () => {
	const input = { tree: json( path.join( FIX, 'eye-care-checkout.skeleton.json' ) ), inventory: json( path.join( FIX, 'eye-care-checkout.inventory.json' ) ) };
	const ctx = realCtx( EYE, 'Eye Care Birmingham', 'checkout', input, json( path.join( FIX, 'eye-care-facts.json' ) ), { role: 'checkout', checkout: 'checkout' } );
	const got = placePieces( { key: 'checkout', tree: input.tree, data: DATA, ctx, builders: BUILDERS } );
	assert.deepEqual( got.problems, [] );
	assert.deepEqual( shape( got.tree ), [ [ 'sgs/container', 'Root/737#0', [ [ 'sgs/heading', 'Root/738#0' ], [ 'core/post-content', null ] ] ] ] );
	assert.deepEqual( nodes( got.tree ).find( ( n ) => 'core/post-content' === n.name ).draftStandsFor, { tpl: 'Root/739#0' } );
	assert.equal( got.tree[ 0 ].templateFrame, undefined );
	assert.ok( got.notes.some( ( n ) => /Eye Care Birmingham\/742 at the head of the form column is an express-payment group/.test( n ) ), got.notes.join( '\n' ) );
} );

// Mama's basket as the skeleton writes it today (the 2026-11-21 lab propose, saved as fixtures: the inventory without its
// screenshots and revealed states): the h1 "Your basket" holds the count chip `<span>{{ count }}</span>` (Root/12#0).
const BASKET = () => ( { tree: json( path.join( FIX, 'mamas-basket.skeleton.json' ) ), inventory: json( path.join( FIX, 'mamas-basket.inventory.json' ) ) } );
const basketCtx = ( input, extra = {} ) => ( { ...realCtx( MAMAS, 'Basket', 'cart', input, json( path.join( FIX, 'mamas-facts.json' ) ), { role: 'cart', checkout: 'Checkout.dc.html' } ), draftSource: fs.readFileSync( path.join( REPO, 'sites', MAMAS, 'handoff', 'Basket.dc.html' ), 'utf8' ), ...extra } );

test( 'MUST FAIL: a piece counting the basket\'s lines beside the heading becomes the live basket count, in a row with the heading\'s own words', () => {
	const input = BASKET();
	const got = placePieces( { key: 'cart', tree: input.tree, data: DATA, ctx: basketCtx( input ), builders: BUILDERS } );
	assert.deepEqual( got.problems, [] );
	const hero = got.tree[ 0 ].innerBlocks[ 0 ];
	assert.deepEqual( shape( hero.innerBlocks ), [ [ 'sgs/text', 'Root/10#0' ], [ 'sgs/container', null, [ [ 'sgs/heading', 'Root/11#0' ], [ 'sgs/text', 'Root/12#0' ] ] ], [ 'core/post-content', null ] ] );
	const row = hero.innerBlocks[ 1 ];
	// The row carries no style value (the skeleton lint); its gap and alignment are handed over.
	assert.deepEqual( row.attributes, { tagName: 'div', layout: 'flex' } );
	assert.equal( row.draftRef, undefined );
	assert.match( row.handover[ 0 ].detail, /Root\/12#0 sits in the line of Root\/11#0's words \(a word space before it/ );
	const [ heading, chip ] = row.innerBlocks;
	assert.equal( heading.attributes.content, 'Your basket' );
	assert.equal( heading.draftFingerprint.tag, 'h1' );
	// The two handover notes about the count (its own piece, its code-filled words) are settled by the split.
	assert.equal( heading.handover, undefined );
	assert.deepEqual( chip.attributes, { text: '<span class="sgs-basket-count">0</span>' } );
	assert.equal( chip.draftFingerprint.tag, 'span' );
	assert.ok( got.notes.some( ( n ) => /Root\/12#0 in Root\/11#0 counts the region's lines \(\{\{ count \}\}\)/.test( n ) ), got.notes.join( '\n' ) );
	// What the piece placed passes the lint the pieces pass guards with.
	assert.deepEqual( placedLint( input.tree, got.tree, openDb() ), [] );
	// The rest of the tree is as before: only the heading changed.
	assert.deepEqual( got.placed.find( ( p ) => 'core/post-content' === p.block ).run, [ 'Root/22#0', 'Root/14#0' ] );
} );

test( 'basketCounts: only a text hole counting a list the region loops over, held by an element with words of its own outside the region', () => {
	const input = BASKET();
	const facts = json( path.join( FIX, 'mamas-facts.json' ) );
	const src = fs.readFileSync( path.join( REPO, 'sites', MAMAS, 'handoff', 'Basket.dc.html' ), 'utf8' );
	const L = logicOf( src );
	const v = templateView( facts, 'Basket' );
	assert.deepEqual( basketCounts( v, 'Basket/22', L ), [ { host: 'Basket/11', chip: 'Basket/12', expr: 'count' } ] );
	// Negative controls: no logic; a region looping over no list; a count of another list (the same words over `others`).
	assert.deepEqual( basketCounts( v, 'Basket/22', null ), [] );
	assert.deepEqual( basketCounts( v, 'Basket/10', L ), [] );
	const other = logicOf( src.replace( 'const items = M ?', 'const gifts = [], items = M ?' ).replace( 'count: items.reduce(', 'count: gifts.reduce(' ) );
	assert.deepEqual( basketCounts( v, 'Basket/22', other ), [] );
	// A name the logic also gives a value counting nothing is no count.
	assert.deepEqual( basketCounts( v, 'Basket/22', logicOf( src.replace( 'freePct:', 'other: { count: 3 }, freePct:' ) ) ), [] );
	// A count inside the region is the block's own drawing (here the region is the hero holding the heading too).
	assert.deepEqual( basketCounts( v, 'Basket/9', L ), [] );
	// A count bound to an attribute, not to the words, is no piece of words.
	const attr = structuredClone( facts );
	attr.elements[ 'Basket/12' ].template.holes = [ { where: 'attr:title', expr: 'count' } ];
	assert.deepEqual( basketCounts( templateView( attr, 'Basket' ), 'Basket/22', L ), [] );
	// A count whose holder has no words of its own (a bare count box) is not split.
	const bare = structuredClone( facts );
	bare.elements[ 'Basket/11' ].template.words = '{{ count }}';
	assert.deepEqual( basketCounts( templateView( bare, 'Basket' ), 'Basket/22', L ), [] );
	// Without the draft's source the tree is left as it is.
	const plain = placePieces( { key: 'cart', tree: input.tree, data: DATA, ctx: basketCtx( input, { draftSource: null } ), builders: BUILDERS } );
	assert.equal( plain.tree[ 0 ].innerBlocks[ 0 ].innerBlocks[ 1 ].name, 'sgs/heading' );
} );
