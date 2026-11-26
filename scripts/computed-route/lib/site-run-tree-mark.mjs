// The built-tree hash the site run records on a post it built (lib/site-build-apply.mjs::markTree), so the next site build finds the
// post built from the tree it plans from and does not rebuild it, dropping the Filled build and the applier's patches. The site build
// plans a post from `sites/<client>/build/trees/<postType>/<slug>.json` (lib/site-build-map.mjs::pageTreeFor) and hashes that tree with
// a choice flow's product id set (lib/site-build-flow-product.mjs::withFlowProduct); the site run keeps the tree it built in that file
// (lib/site-run-solve-tree.mjs::writeSolveTree, lib/site-run-flow-tree.mjs::writeFlowTree).
import fs from 'fs';
import { treeHash } from './site-build-map.mjs';
import { withFlowProduct } from './site-build-flow-product.mjs';
import { flowTreeFile } from './site-run-flow-tree.mjs';
import { solveTreeFile } from './site-run-solve-tree.mjs';

// The hash the site build computes for the post surface `entry` built from `builtFile`, or null when the post's tree is not the file
// the site build plans it from: a template copy (it records its own hash), a surface no page-map row names, a shop row (its page is
// built from the placeholder), or a kept file that does not hold the built tree (a half-written Fill never replaced a good copy).
// rows: the page map's rows. flowIds: a function giving { <flow row slug>: <product id> }, read only for a choice flow.
export function builtTreeHash( { buildDir, entry, builtFile, rows, flowIds = () => ( {} ) } ) {
	if ( entry?.target?.template ) {
		return null;
	}
	const named = /^trees\/([^/]+)\/([^/]+)\.json$/.exec( String( entry?.tree || '' ) );
	const row = named && rows.find( ( r ) => r.postType === named[ 1 ] && r.slug === named[ 2 ] );
	const file = flowTreeFile( buildDir, entry ) || solveTreeFile( buildDir, entry );
	if ( ! row || 'shop' === row.postType || ! file || ! fs.existsSync( file ) || ! fs.existsSync( builtFile ) ) {
		return null;
	}
	const kept = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	if ( JSON.stringify( kept ) !== JSON.stringify( JSON.parse( fs.readFileSync( builtFile, 'utf8' ) ) ) ) {
		return null;
	}
	return treeHash( withFlowProduct( kept, row, 'sgs_choice_flow' === row.postType ? flowIds() : {} ) );
}
