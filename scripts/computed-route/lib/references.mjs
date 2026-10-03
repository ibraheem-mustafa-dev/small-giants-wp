// Blocks that render another post (Spec 47 §3.3, reference blocks), found by reading each block's render.php, never
// listed by hand, so a new block is covered when it is built.
//   linked: the block is a whole placeholder once its `<x>IsLinked` flag is on; its own settings are not used and the
//           referenced post's block renders instead (form/render.php: "this embed's own wrapper/attributes below are
//           NOT used at all"; choice-flow the same). Solve never writes to it.
//   frame:  the block keeps its own frame (a modal's trigger and dialog) and prints another post's blocks inside it
//           through a `<x>Ref` post ID. Its frame settings are written as usual; rows inside the borrowed content
//           trace to that post's own tree once it has ref classes, or to no calibrated element of the frame.
// Core blocks that print another post or template part hold no SGS setting, so Solve never writes them anyway; the
// surfaces lint checks that whatever they print has its own surface.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { walk } from './tree.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const BLOCKS_SRC = path.resolve( HERE, '../../../plugins/sgs-blocks/src/blocks' );

// Core blocks that print another post: block name → the attribute naming what they print (null: the current post).
export const CORE_PLACEHOLDERS = { 'core/template-part': 'slug', 'core/post-content': null, 'core/block': 'ref' };

// Reads one render.php source: { kind: 'linked', flag, key } | { kind: 'frame', key } | null.
export function referenceKind( src ) {
	const linked = src.match( /\$attributes\[\s*'(\w+)IsLinked'\s*\]/ );
	if ( linked ) {
		return { kind: 'linked', flag: `${ linked[ 1 ] }IsLinked`, key: `${ linked[ 1 ] }Id` };
	}
	const ref = src.match( /\$attributes\[\s*'(\w+Ref)'\s*\]/ );
	if ( ref && /do_blocks\s*\(/.test( src ) ) {
		return { kind: 'frame', key: ref[ 1 ] };
	}
	return null;
}

// Every reference block in the plugin: { 'sgs/<block>': { kind, key, flag? } }.
export function detectReferences( dir = BLOCKS_SRC ) {
	const out = {};
	for ( const b of fs.readdirSync( dir ) ) {
		const f = path.join( dir, b, 'render.php' );
		if ( fs.existsSync( f ) ) {
			const k = referenceKind( fs.readFileSync( f, 'utf8' ) );
			if ( k ) {
				out[ `sgs/${ b }` ] = k;
			}
		}
	}
	return out;
}

// The reference a tree node holds: { kind, key, value } or null (a linked block counts only with its flag on).
export function referenceOf( node, refs ) {
	if ( Object.hasOwn( CORE_PLACEHOLDERS, node.name ) ) {
		const key = CORE_PLACEHOLDERS[ node.name ];
		return { kind: 'core', key, value: key ? node.attributes?.[ key ] ?? null : null };
	}
	const r = refs[ node.name ];
	if ( ! r ) {
		return null;
	}
	const value = node.attributes?.[ r.key ];
	if ( undefined === value || '' === value || 0 === value || ( 'linked' === r.kind && ! node.attributes?.[ r.flag ] ) ) {
		return null;
	}
	return { kind: r.kind, key: r.key, value };
}

// Surfaces lint: every post a surface's tree prints through a reference has a surface of its own. A frame's post ID
// matches a surface target; a linked block or a template part matches a surface's `provides` entry
// ("<block>:<value>"). core/post-content prints the current post's own content (product data), never a layout.
// surfaces: the parsed surfaces.json; buildDir: where its trees live. Returns problems (strings).
export function lintSurfaces( surfaces, buildDir, refs = detectReferences() ) {
	const posts = new Set( Object.values( surfaces ).map( ( s ) => s.target?.postId ).filter( Boolean ).map( Number ) );
	const provided = new Set( Object.values( surfaces ).flatMap( ( s ) => s.provides || [] ) );
	const problems = [];
	for ( const [ name, s ] of Object.entries( surfaces ) ) {
		const tree = JSON.parse( fs.readFileSync( path.join( buildDir, s.tree ), 'utf8' ) );
		walk( tree, ( node ) => {
			const r = referenceOf( node, refs );
			if ( ! r || ( 'core' === r.kind && null === r.key ) ) {
				return;
			}
			const ok = 'frame' === r.kind ? posts.has( Number( r.value ) ) : provided.has( `${ node.name }:${ r.value }` );
			if ( ! ok ) {
				problems.push( `${ name }: ${ node.name } prints ${ r.key } ${ r.value }, which no surface ${ 'frame' === r.kind ? 'targets' : 'provides' }` );
			}
		} );
	}
	return problems;
}
