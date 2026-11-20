// A choice flow's built tree, kept where the site build reads it (Spec 48 FR-48-100). The site build adopts a page-map row's
// post from `sites/<client>/build/trees/<postType>/<slug>.json` (lib/site-build-map.mjs::treeFor), and sets the saved flow's
// `flowProductId` on that tree's flow block (lib/site-build-flow-product.mjs::withFlowProduct); a flow with no tree there is
// adopted as a one-heading placeholder with neither the flow nor its product. The site run builds a flow post from its Filled
// tree, so it records that tree at the path its manifest entry names (lib/manifest-build.mjs: `trees/<postType>/<slug>.json`).
import fs from 'fs';
import path from 'path';

export const FLOW_POST_TYPE = 'sgs_choice_flow';
const FLOW_TREE = /^trees\/sgs_choice_flow\/[^/\\]+\.json$/;

// The file a flow surface's built tree is kept in, or null for any other surface (a template copy, a page, a modal, a form:
// their trees are made elsewhere). buildDir: sites/<client>/build; entry: the surface's surfaces.json entry.
export function flowTreeFile( buildDir, entry ) {
	const rel = String( entry?.tree || '' );
	if ( entry?.target?.template || ! FLOW_TREE.test( rel ) ) {
		return null;
	}
	return path.join( buildDir, ...rel.split( '/' ) );
}

// Writes the tree a flow surface just built and returns its path, or null for a surface that is no flow. A tree that is
// not a block list is refused, so a half-written Fill never replaces a good copy with nothing.
export function writeFlowTree( { buildDir, entry, tree } ) {
	const file = flowTreeFile( buildDir, entry );
	if ( ! file ) {
		return null;
	}
	if ( ! Array.isArray( tree ) || ! tree.length ) {
		throw new Error( `the built tree of ${ entry.tree } is not a block list, so the flow's tree is not recorded` );
	}
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, `${ JSON.stringify( tree, null, 2 ) }\n` );
	return file;
}
