// L9.4 (FR-47-4 step 4): every skeleton node with a draftRef is a walker pair on its own ref class, the generated config
// carries refPrefix 'cr-ref-' (Solve refuses a config without a literal refPrefix:) and the divergence ledger path, and the
// walker's own config lint accepts it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { walkerPairs, baseConfigText, walkerConfigs, surfaceRoots } from '../lib/fill-config.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { lintConfig } from '../../parity/lib/lint.mjs';

const SKEL = () => [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [
	{ name: 'sgs/heading', draftRef: { text: '^Hello$', tag: 'h1', within: 'main' }, attributes: {} },
	{ name: 'sgs/container', attributes: {}, innerBlocks: [ { name: 'sgs/text', draftRef: 'p.lead', draftSlots: { '.sgs-text__a': 'a' }, attributes: {} } ] },
] } ];
const prepared = () => {
	const skeleton = SKEL();
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	return { nodes: skeletonNodes( skeleton ), tree };
};

test( 'MUST FAIL: a pair for every node with a draftRef on its own ref, none for a node without one, finders as written', () => {
	const { nodes, tree } = prepared();
	assert.deepEqual( walkerPairs( nodes, tree ), [
		{ ref: 'cr-ref-fx-0', draft: 'main' },
		{ ref: 'cr-ref-fx-1', draft: { text: '^Hello$', tag: 'h1', within: 'main' } },
		{ ref: 'cr-ref-fx-3', draft: 'p.lead' },
	] );
} );

async function load( texts ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-config-' ) );
	fs.writeFileSync( path.join( dir, texts.baseFile ), texts.baseText );
	fs.writeFileSync( path.join( dir, texts.fullFile ), texts.fullText );
	return ( await import( pathToFileURL( path.join( dir, texts.fullFile ) ).href ) ).default;
}

test( 'the generated config loads, restates a literal refPrefix, names the ledger, pairs every ref, and passes the walker\'s lint', async () => {
	const { nodes, tree } = prepared();
	const t = walkerConfigs( { surface: 'fx', nodes, tree, draftUrl: 'http://127.0.0.1:5000/', liveUrl: 'http://127.0.0.1:6000/fx/', open: '^about$', divergences: '../divergences.json' } );
	assert.equal( t.fullFile, 'fx.fill.mjs' );
	assert.match( t.fullText, /refPrefix\s*:/, 'solve.mjs refuses a config without a literal refPrefix:' );
	const cfg = await load( t );
	assert.equal( cfg.refPrefix, 'cr-ref-' );
	assert.equal( cfg.divergences, '../divergences.json' );
	assert.deepEqual( cfg.pairs.map( ( p ) => [ p.name, p.live ] ), [ [ 'gen-fx-0', '.cr-ref-fx-0' ], [ 'gen-fx-1', '.cr-ref-fx-1' ], [ 'gen-fx-3', '.cr-ref-fx-3' ] ] );
	assert.equal( cfg.pairs[ 0 ].draft, 'main' );
	assert.deepEqual( cfg.pairs[ 1 ].draft, { text: '^Hello$', tag: 'h1', within: 'main' } );
	assert.deepEqual( lintConfig( cfg ), [], 'the walker accepts the generated config' );
} );

test( 'the draft url can be overridden for a locally served draft, and the open step is the clicked text', async () => {
	const { nodes, tree } = prepared();
	const base = baseConfigText( { surface: 'fx', draftUrl: 'http://127.0.0.1:5000/', liveUrl: 'http://x/', open: '^about$', divergences: null } );
	assert.match( base, /process\.env\.SGS_DRAFT_URL \|\| "http:\/\/127\.0\.0\.1:5000\/"/ );
	assert.match( base, /h\.clickText\( "\^about\$", \{ wait: 900 \} \)/ );
	assert.doesNotMatch( base, /divergences/, 'no ledger path, no divergences key' );
	const noOpen = baseConfigText( { surface: 'fx', draftUrl: 'http://d/', liveUrl: 'http://l/' } );
	assert.doesNotMatch( noOpen, /open:/ );
	const cfg = await load( walkerConfigs( { surface: 'fx', nodes, tree, draftUrl: 'http://d/', liveUrl: 'http://l/' } ) );
	assert.equal( cfg.draft.url, 'http://d/' );
	assert.equal( cfg.divergences, undefined );
} );

test( 'MUST FAIL WITHOUT PART PAIRS: a part a block renders inside itself whose draft element sits outside the block\'s pairs on its own; parts inside it and inside the block do not', async () => {
	// The draft draws the navigation's burger (R/9) in the row (R/5), outside the <nav> (R/3); its bars (R/10) sit inside
	// the burger and the link (R/4) inside the nav.
	const skeleton = [ { name: 'sgs/container', draftRef: { tpl: 'R/5#0' }, attributes: {}, innerBlocks: [
		{ name: 'sgs/nav', draftRef: { tpl: 'R/3#0' }, attributes: {}, draftSlots: { '.sgs-nav__link': { tpl: 'R/4#0' }, '.sgs-nav__wrap > .sgs-nav__burger': { tpl: 'R/9#0' }, '.sgs-nav__burger > .sgs-nav__bar:nth-of-type(1)': { tpl: 'R/10#0' } } },
	] } ];
	const inventory = { elements: [ { key: 'R/5#0', parentKey: null }, { key: 'R/3#0', parentKey: 'R/5#0' }, { key: 'R/4#0', parentKey: 'R/3#0' }, { key: 'R/9#0', parentKey: 'R/5#0' }, { key: 'R/10#0', parentKey: 'R/9#0' } ] };
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const nodes = skeletonNodes( skeleton );
	assert.deepEqual( walkerPairs( nodes, tree, inventory ), [
		{ ref: 'cr-ref-fx-0', draft: { tpl: 'R/5#0' } },
		{ ref: 'cr-ref-fx-1', slot: '.sgs-nav__wrap > .sgs-nav__burger', draft: { tpl: 'R/9#0' } },
		{ ref: 'cr-ref-fx-1', draft: { tpl: 'R/3#0' } },
	] );
	assert.equal( walkerPairs( nodes, tree ).length, 2, 'no inventory: no part pair' );
	const cfg = await load( walkerConfigs( { surface: 'fx', nodes, tree, inventory, draftUrl: 'http://d/', liveUrl: 'http://l/' } ) );
	assert.deepEqual( cfg.pairs.map( ( p ) => [ p.name, p.live ] ), [ [ 'gen-fx-0', '.cr-ref-fx-0' ], [ 'gen-fx-1__burger', '.cr-ref-fx-1 .sgs-nav__wrap > .sgs-nav__burger' ], [ 'gen-fx-1', '.cr-ref-fx-1' ] ] );
	assert.deepEqual( lintConfig( cfg ), [], 'the walker accepts the part pair' );
} );

test( 'MUST FAIL WITHOUT ROOTS: the generated config roots the automatic text, link and moved-run collection at the surface\'s own element on each side', async () => {
	const skeleton = [ { name: 'sgs/site-header', draftRef: { tpl: 'Root/39#0' }, attributes: {}, innerBlocks: [ { name: 'sgs/site-header-row', draftRef: { tpl: 'Root/40#0' }, attributes: {} } ] } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'header' );
	const t = walkerConfigs( { surface: 'header', nodes: skeletonNodes( skeleton ), tree, draftUrl: 'http://d/', liveUrl: 'http://l/' } );
	const draft = '.sc-host[data-sc-name="Root"] [data-dc-tpl="39"]:not(.sc-host .sc-host *)';
	assert.match( t.baseText, /auto: \{ root: \{"draft":".+","live":"\.cr-ref-header-0"\} \}/ );
	assert.match( t.baseText, /linkRoot: \{"draft":".+","live":"\.cr-ref-header-0"\}/ );
	const cfg = await load( t );
	assert.deepEqual( cfg.auto.root, { draft, live: '.cr-ref-header-0' } );
	assert.deepEqual( cfg.linkRoot, { draft, live: '.cr-ref-header-0' } );
	assert.deepEqual( lintConfig( cfg ), [] );
} );

test( 'MUST FAIL WITHOUT ROOTS: several root blocks (a page) root at the element holding them all; a root no selector names leaves both sides unrooted', () => {
	const page = [ { name: 'sgs/container', draftRef: 'section.hero', attributes: {} }, { name: 'sgs/container', draftRef: { tpl: 'Root/7#0' }, attributes: {} } ];
	const tree = cleanTree( page );
	addRefs( tree, 'pg' );
	assert.deepEqual( surfaceRoots( skeletonNodes( page ), tree ), {
		draft: ':has(> :is(section.hero)):has(> :is(.sc-host[data-sc-name="Root"] [data-dc-tpl="7"]:not(.sc-host .sc-host *)))',
		live: ':has(> :is(.cr-ref-pg-0)):has(> :is(.cr-ref-pg-1))',
	} );
	// Negative control: a text finder and a tpl copy past the first name no element by selector, so neither side is rooted.
	for ( const draftRef of [ { text: '^Hi$' }, { tpl: 'Root/7#1' }, { tpl: 'Root/7#0', within: 'main' } ] ) {
		const one = [ { name: 'sgs/container', draftRef, attributes: {} } ];
		const t1 = cleanTree( one );
		addRefs( t1, 'pg' );
		assert.equal( surfaceRoots( skeletonNodes( one ), t1 ), null );
		assert.doesNotMatch( baseConfigText( { surface: 'pg', draftUrl: 'http://d/', liveUrl: 'http://l/', roots: surfaceRoots( skeletonNodes( one ), t1 ) } ), /auto:|linkRoot/ );
	}
	// A tree with no ref classes names no live element, and an empty surface has no root.
	assert.equal( surfaceRoots( skeletonNodes( page ), cleanTree( page ) ), null );
	assert.equal( surfaceRoots( [], [] ), null );
} );

test( 'MUST FAIL WITHOUT BESIDE STRIPS: a top bar the skeleton draws from beside the <header> widens the draft root to the element holding both, less the siblings the surface does not use', async () => {
	// The draft draws its top bar (R/9) beside the sticky <header> (R/39); the main content (R/201) and a fixed layer (R/38) are siblings too.
	const skeleton = [ { name: 'sgs/site-header', draftRef: { tpl: 'R/39#0' }, attributes: {}, innerBlocks: [
		{ name: 'sgs/site-header-row', draftRef: { tpl: 'R/9#0' }, attributes: {}, innerBlocks: [ { name: 'sgs/text', draftRef: { tpl: 'R/11#0' }, attributes: {} } ] },
		{ name: 'sgs/site-header-row', draftRef: { tpl: 'R/40#0' }, attributes: {} },
	] } ];
	const elements = [ { key: 'R/39#0', parentKey: 'R/8#0' }, { key: 'R/40#0', parentKey: 'R/39#0' }, { key: 'R/9#0', parentKey: null }, { key: 'R/10#0', parentKey: 'R/9#0' }, { key: 'R/11#0', parentKey: 'R/10#0' } ];
	const beside = [ { key: 'R/38#0', side: 'before' }, { key: 'R/9#0', side: 'before' }, { key: 'R/201#0', side: 'after' } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'header' );
	const at = ( n ) => `.sc-host[data-sc-name="R"] [data-dc-tpl="${ n }"]:not(.sc-host .sc-host *)`;
	const t = walkerConfigs( { surface: 'header', nodes: skeletonNodes( skeleton ), tree, inventory: { elements, beside }, draftUrl: 'http://d/', liveUrl: 'http://l/' } );
	const cfg = await load( t );
	const draft = `:has(> :is(${ at( 39 ) })):has(> :is(${ at( 9 ) }))`;
	assert.deepEqual( cfg.auto, { root: { draft, live: '.cr-ref-header-0' }, exclude: { draft: [ at( 38 ), at( 201 ) ] } } );
	assert.deepEqual( cfg.linkRoot, { draft, live: '.cr-ref-header-0' } );
	assert.deepEqual( lintConfig( cfg ), [] );
	// Negative control: with no strip of the surface beside it (the top bar not in the skeleton), the root is the <header> alone and nothing is excluded.
	const alone = [ { ...skeleton[ 0 ], innerBlocks: [ skeleton[ 0 ].innerBlocks[ 1 ] ] } ];
	const t2 = cleanTree( alone );
	addRefs( t2, 'header' );
	assert.deepEqual( surfaceRoots( skeletonNodes( alone ), t2, { elements, beside } ), { draft: at( 39 ), live: '.cr-ref-header-0' } );
	// A strip only a descendant of which is drawn (the row has no draftRef, its text sits two levels inside the bar) is still used.
	const deep = [ { ...skeleton[ 0 ], innerBlocks: [ { ...skeleton[ 0 ].innerBlocks[ 0 ], draftRef: undefined }, skeleton[ 0 ].innerBlocks[ 1 ] ] } ];
	const t3 = cleanTree( deep );
	addRefs( t3, 'header' );
	assert.equal( surfaceRoots( skeletonNodes( deep ), t3, { elements, beside } ).draft, draft );
	// A sibling no selector names (a loop copy past the first) cannot be excluded, so neither side is rooted.
	assert.equal( surfaceRoots( skeletonNodes( skeleton ), tree, { elements, beside: [ ...beside, { key: 'R/300#1', side: 'after' } ] } ), null );
} );

test( 'MUST FAIL: a state-driven surface\'s walker opens the same draft state Fill read, in place of the click-text open', async () => {
	const { nodes, tree } = prepared();
	const opener = { state: 'open', component: 'Root', keys: { active: 1 } };
	const cfg = await load( walkerConfigs( { surface: 'fx', nodes, tree, draftUrl: 'http://127.0.0.1:1/draft.html', liveUrl: 'http://live/', open: 'About', opener, divergences: null, state: 'open' } ) );
	assert.equal( typeof cfg.draft.open, 'function' );
	const calls = [];
	const h = { page: { evaluate: async ( fn, arg ) => calls.push( [ fn.name, arg ] ), waitForTimeout: async () => {} }, clickText: async () => calls.push( 'clickText' ) };
	await cfg.draft.open( h );
	assert.deepEqual( calls, [ [ 'setStateInPage', { component: 'Root', keys: { active: 1 } } ] ] );
	const plain = await load( walkerConfigs( { surface: 'fx', nodes, tree, draftUrl: 'http://127.0.0.1:1/draft.html', liveUrl: 'http://live/', open: 'About', divergences: null, state: 'opening' } ) );
	const clicked = [];
	await plain.draft.open( { clickText: async ( re ) => clicked.push( re ) } );
	assert.deepEqual( clicked, [ 'About' ], 'a surface with no state keeps the click-text open' );
} );
