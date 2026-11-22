// The tree a surface's run built, kept where surfaces.json names the surface's tree (`tree`). Solve (solve.mjs) reads and repairs that file, and a site
// run builds from the Filled tree, so without this copy Solve would repair a different tree from the one built (or find none, for a page run in a
// clean checkout). A choice flow's tree is recorded by lib/site-run-flow-tree.mjs::writeFlowTree, so it is left to that.
import fs from 'fs';
import path from 'path';
import { flowTreeFile } from './site-run-flow-tree.mjs';

// The file the surface's `tree` names inside `buildDir`, or null when it names none, names a path outside the build folder, or is a flow's.
export function solveTreeFile( buildDir, entry ) {
	const rel = String( entry?.tree || '' );
	if ( ! rel || flowTreeFile( buildDir, entry ) ) {
		return null;
	}
	const file = path.resolve( buildDir, ...rel.split( '/' ) );
	return file.startsWith( path.resolve( buildDir ) + path.sep ) ? file : null;
}

// Copies the tree the build used (`builtFile`, the JSON block list the run passed to wp-build-page.js) to the file `entry.tree` names and returns that
// path, or null when there is nothing to write (no tree named, the same file, or the built file is not a block list: a half-written Fill never
// replaces a good copy).
export function writeSolveTree( { buildDir, entry, builtFile } ) {
	const file = solveTreeFile( buildDir, entry );
	if ( ! file || path.resolve( builtFile ) === file ) {
		return null;
	}
	const tree = JSON.parse( fs.readFileSync( builtFile, 'utf8' ) );
	if ( ! Array.isArray( tree ) || ! tree.length ) {
		return null;
	}
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, `${ JSON.stringify( tree, null, 2 ) }\n` );
	return file;
}
