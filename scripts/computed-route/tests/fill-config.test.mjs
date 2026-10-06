// L9.4 (FR-47-4 step 4): every skeleton node with a draftRef is a walker pair on its own ref class, the generated config
// carries refPrefix 'cr-ref-' (Solve refuses a config without a literal refPrefix:) and the divergence ledger path, and the
// walker's own config lint accepts it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { walkerPairs, baseConfigText, walkerConfigs } from '../lib/fill-config.mjs';
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
