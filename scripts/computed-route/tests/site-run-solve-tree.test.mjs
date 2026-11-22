// The tree a surface's run built is kept where surfaces.json names it (lib/site-run-solve-tree.mjs), so Solve repairs what was built.
// Run: node --test tests/site-run-solve-tree.test.mjs
import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { solveTreeFile, writeSolveTree } from '../lib/site-run-solve-tree.mjs';

const source = fs.readFileSync( new URL( '../site-run.mjs', import.meta.url ), 'utf8' );
const made = [];
after( () => made.forEach( ( d ) => fs.rmSync( d, { recursive: true, force: true } ) ) );
const build = () => {
	const d = fs.mkdtempSync( path.join( os.tmpdir(), 'solve-tree-' ) );
	made.push( d );
	return d;
};
const built = ( dir, tree ) => {
	const f = path.join( dir, 'filled.tree.json' );
	fs.writeFileSync( f, JSON.stringify( tree ) );
	return f;
};
const TREE = [ { name: 'sgs/container', attributes: { className: 'cr-ref-a-0' }, innerBlocks: [] } ];

test( 'MUST FAIL: site-run.mjs keeps the built tree where surfaces.json names it, right after the build', () => {
	assert.ok( source.indexOf( 'writeSolveTree( {' ) > source.indexOf( "builtTrees.set( key" ), 'after the build recorded the tree' );
	assert.ok( source.indexOf( 'writeSolveTree( {' ) < source.indexOf( 'await applyStage( {' ), 'before the apply stage' );
} );

test( 'MUST FAIL: a page surface\'s built tree is written to the path its entry names, for Solve to read', () => {
	const dir = build();
	const file = writeSolveTree( { buildDir: dir, entry: { tree: 'trees/page/my-account.json' }, builtFile: built( dir, TREE ) } );
	assert.equal( file, path.join( dir, 'trees', 'page', 'my-account.json' ) );
	assert.deepEqual( JSON.parse( fs.readFileSync( file, 'utf8' ) ), TREE );
} );

test( 'negative controls: no tree named, the same file, a path outside the build folder, a flow\'s tree and a built file that is no block list write nothing', () => {
	const dir = build();
	const from = built( dir, TREE );
	assert.equal( writeSolveTree( { buildDir: dir, entry: {}, builtFile: from } ), null );
	assert.equal( writeSolveTree( { buildDir: dir, entry: { tree: 'filled.tree.json' }, builtFile: from } ), null, 'the built file is already the named one' );
	assert.equal( solveTreeFile( dir, { tree: '../outside.json' } ), null );
	assert.equal( solveTreeFile( dir, { tree: 'trees/sgs_choice_flow/build-your-zookie.json' } ), null, 'recorded by writeFlowTree' );
	const empty = writeSolveTree( { buildDir: dir, entry: { tree: 'trees/page/x.json' }, builtFile: built( dir, [] ) } );
	assert.equal( empty, null );
	assert.equal( fs.existsSync( path.join( dir, 'trees', 'page', 'x.json' ) ), false );
} );
