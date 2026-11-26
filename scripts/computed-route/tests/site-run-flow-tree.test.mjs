// A site run records a choice flow's built tree where the site build reads it (lib/site-run-flow-tree.mjs::writeFlowTree,
// called by site-run.mjs's build step). Without that file lib/site-build-map.mjs::treeFor answers the one-heading placeholder,
// so the site build adopts the flow post with neither the flow nor its `flowProductId`. Every test works in a temporary folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { flowTreeFile, writeFlowTree } from '../lib/site-run-flow-tree.mjs';
import { treeFor } from '../lib/site-build-map.mjs';
import { withFlowProduct } from '../lib/site-build-flow-product.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FLOW_ROW = { slug: 'choice-flow-build-your-box', title: 'Build your box', postType: 'sgs_choice_flow' };
const FLOW_ENTRY = { tree: 'trees/sgs_choice_flow/choice-flow-build-your-box.json', target: { postId: 161 }, canvas: true };
const TREE = [ { name: 'sgs/choice-flow', attributes: { flowLayout: 'compact' }, innerBlocks: [ { name: 'sgs/form-step', attributes: {} } ] }, { name: 'sgs/text', attributes: { text: 'After the flow' } } ];

// A temporary client: { repo, buildDir }, removed after `fn`.
function inClient( fn ) {
	const repo = fs.mkdtempSync( path.join( process.env.SGS_TMP_ROOT || os.tmpdir(), 'flow-tree-' ) );
	const buildDir = path.join( repo, 'sites', 'acme', 'build' );
	fs.mkdirSync( buildDir, { recursive: true } );
	try {
		return fn( { repo, buildDir } );
	} finally {
		fs.rmSync( repo, { recursive: true, force: true } );
	}
}

test( 'MUST FAIL: the tree a flow surface built is the tree the site build reads for its row, and the product id lands on its flow block', () => {
	inClient( ( { repo, buildDir } ) => {
		assert.equal( 'placeholder', treeFor( repo, 'acme', FLOW_ROW, {} ).source, 'before the site run there is no tree' );
		const file = writeFlowTree( { buildDir, entry: FLOW_ENTRY, tree: TREE } );
		assert.equal( file, path.join( buildDir, 'trees', 'sgs_choice_flow', 'choice-flow-build-your-box.json' ) );
		const read = treeFor( repo, 'acme', FLOW_ROW, {} );
		assert.equal( read.source, 'sites/acme/build/trees/sgs_choice_flow/choice-flow-build-your-box.json' );
		assert.deepEqual( read.tree, TREE );
		const linked = withFlowProduct( read.tree, FLOW_ROW, { 'choice-flow-build-your-box': 257 } );
		assert.equal( linked[ 0 ].attributes.flowProductId, 257 );
	} );
} );

test( 'MUST FAIL: only a choice flow surface records a tree; a page, a template copy, a form and a modal write nothing', () => {
	inClient( ( { buildDir } ) => {
		const others = [
			{ tree: 'trees/page/home.json', target: { postId: 154 } },
			{ tree: 'trees/template/page.json', target: { template: 'page' } },
			{ tree: 'trees/sgs_form/form-send.json', target: { postId: 157 } },
			{ tree: 'trees/sgs_modal/size-guide.json', target: { postId: 170 } },
			{ tree: 'trees/sgs_choice_flow/flow.json', target: { template: 'page' } },
			{ tree: 'trees/sgs_choice_flow/../../page/x.json', target: { postId: 1 } },
			{ target: { postId: 9 } },
		];
		for ( const entry of others ) {
			assert.equal( writeFlowTree( { buildDir, entry, tree: TREE } ), null, JSON.stringify( entry ) );
			assert.equal( flowTreeFile( buildDir, entry ), null );
		}
		assert.equal( fs.existsSync( path.join( buildDir, 'trees' ) ), false, 'nothing was written' );
	} );
} );

test( 'MUST FAIL: an empty or non-list tree is refused and leaves the earlier copy as it was', () => {
	inClient( ( { repo, buildDir } ) => {
		writeFlowTree( { buildDir, entry: FLOW_ENTRY, tree: TREE } );
		for ( const bad of [ [], null, { name: 'sgs/choice-flow' } ] ) {
			assert.throws( () => writeFlowTree( { buildDir, entry: FLOW_ENTRY, tree: bad } ), /not a block list/ );
		}
		assert.deepEqual( treeFor( repo, 'acme', FLOW_ROW, {} ).tree, TREE );
	} );
} );

test( 'MUST FAIL: site-run.mjs records the flow tree in its build step, after the build succeeds', () => {
	const src = fs.readFileSync( path.join( HERE, '..', 'site-run.mjs' ), 'utf8' );
	const build = src.indexOf( "const said = await buildThenMarkPost( { build: () => exec( 'build', 'node', builder )" );
	const write = src.indexOf( 'writeFlowTree( { buildDir: build, entry' );
	assert.ok( build > 0 && write > build, 'the tree is written after the build command returns' );
	assert.match( src, /import \{ writeFlowTree \} from '\.\/lib\/site-run-flow-tree\.mjs'/ );
} );
