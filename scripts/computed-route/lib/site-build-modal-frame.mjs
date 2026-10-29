// The page's modal frames take their look from the modal surface's Fill (Spec 48 FR-48-6, FR-48-57; register A1, Bean S8): a modal
// surface's Fill keeps the draft's backdrop, panel and close look in `modal-frame.json` ({ anchor, attributes },
// lib/fill-modal-frame.mjs), and the `sgs/modal` frame a page carries for that modal (lib/skeleton-opener.mjs::modalFrame) holds the
// same anchor. Before a page's tree is built, each frame with a matching anchor gets those settings; the settings the page's own
// frame already holds (the trigger style, the anchor, the carried `modalRef`) win.
import fs from 'node:fs';
import path from 'node:path';
import { walk } from './tree.mjs';

// The newest `modal-frame.json` of every surface under `<build>/qa/fill/<surface>/<stamp>/`, as { <anchor>: record }.
export function framesIn( fillDir ) {
	const out = {};
	if ( ! fs.existsSync( fillDir ) ) {
		return out;
	}
	for ( const surface of fs.readdirSync( fillDir ) ) {
		const dir = path.join( fillDir, surface );
		const stamps = fs.statSync( dir ).isDirectory() ? fs.readdirSync( dir ).sort().reverse() : [];
		const file = stamps.map( ( s ) => path.join( dir, s, 'modal-frame.json' ) ).find( ( f ) => fs.existsSync( f ) );
		const frame = file ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null;
		frame?.anchor && ( out[ frame.anchor ] = frame );
	}
	return out;
}

// A copy of `tree` whose `sgs/modal` frames take the look of the frame record with the same anchor. Returns { tree, merged: [anchor] }.
export function mergeModalFrames( tree, frames ) {
	const copy = structuredClone( tree );
	const merged = [];
	walk( copy, ( n ) => {
		const frame = 'sgs/modal' === n.name && n.attributes?.anchor ? frames[ n.attributes.anchor ] : null;
		if ( frame ) {
			n.attributes = { ...frame.attributes, ...n.attributes };
			merged.push( n.attributes.anchor );
		}
	} );
	return { tree: copy, merged };
}

// The tree file to build for a page: `<outDir>/framed.tree.json`, the tree at `treeFile` with its modal frames merged, or null when
// no frame of it has a record. Returns { file, merged } or null.
export function framedTreeFile( { treeFile, frames, outDir } ) {
	if ( ! Object.keys( frames ).length ) {
		return null;
	}
	const { tree, merged } = mergeModalFrames( JSON.parse( fs.readFileSync( treeFile, 'utf8' ) ), frames );
	if ( ! merged.length ) {
		return null;
	}
	const file = path.join( outDir, 'framed.tree.json' );
	fs.mkdirSync( outDir, { recursive: true } );
	fs.writeFileSync( file, `${ JSON.stringify( tree, null, 2 ) }\n` );
	return { file, merged };
}
