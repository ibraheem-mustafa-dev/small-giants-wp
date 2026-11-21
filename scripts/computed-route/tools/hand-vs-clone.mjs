#!/usr/bin/env node
// The answer sheet, first step of a live run on a surface the owner built by hand: the hand-built blocks against the
// clone's Fill tree, block by block and setting by setting (lib/hand-vs-clone.mjs).
//   node scripts/computed-route/tools/hand-vs-clone.mjs --saved <saved-blocks.txt> (--section <text> | --surface <name>)
//        (--clone <filled.tree.json> | --run <fill run folder> | --fill <build/qa/fill/<surface> folder>) [--content] [--json <file>]
// --saved   a hand-built site's saved blocks, sections starting `@@@ <what>` (read-only copies, kept outside the repo)
// --section the text the section's `@@@` line contains; --surface header, footer, drawer or home picks the site option
//           that names the surface (SECTION_OF)
// --clone   the clone's tree; --run a Fill run folder holding filled.tree.json; --fill the surface's Fill folder, whose
//           newest run holding filled.tree.json is taken (build/<surface>.tree.json is a hand-built tree, never the clone)
// --content also list content rows (words, links, pictures, per-site ids); --json writes the full result
// Prints the totals, the block counts and every block's look and custom CSS rows. Exit 0, or 2 on a usage error.
// Reads the framework database read-only (lib/db.mjs::openDb) for which settings are content. Never contacts a site.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { parseSavedSections } from '../lib/block-choice.mjs';
import { compareSurface, reportText, totals } from '../lib/hand-vs-clone.mjs';

// The site option whose `@@@` section holds each site-wide surface; the home page is the front page.
export const SECTION_OF = { header: 'sgs_active_header_cpt_id', footer: 'sgs_active_footer_cpt_id', drawer: 'sgs_active_drawer_cpt_id', home: 'page_on_front' };

// The settings the framework database classes as content, per block.
export function contentFacts( db = openDb() ) {
	const content = new Map();
	const rows = db.prepare( "SELECT a.block_slug, a.attr_name FROM block_attributes a JOIN roles r ON r.role_name = a.role WHERE r.classification = 'content-bearing'" ).all();
	for ( const r of rows ) {
		( content.get( r.block_slug ) ?? content.set( r.block_slug, new Set() ).get( r.block_slug ) ).add( r.attr_name );
	}
	return { contentAttrs: ( n ) => content.get( n ) ?? null };
}

// The newest run folder under a surface's Fill folder that holds filled.tree.json, or null.
export function newestRun( fillDir ) {
	if ( ! fs.existsSync( fillDir ) ) {
		return null;
	}
	const runs = fs.readdirSync( fillDir ).filter( ( d ) => fs.existsSync( path.join( fillDir, d, 'filled.tree.json' ) ) ).sort();
	return runs.length ? path.join( fillDir, runs[ runs.length - 1 ] ) : null;
}

// The section of a saved-blocks text whose `@@@` line contains `needle`, or null.
export function sectionOf( text, needle ) {
	return parseSavedSections( text ).find( ( s ) => s.head.includes( needle ) ) ?? null;
}

function args( argv ) {
	const o = {};
	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( [ '--content' ].includes( a ) ) {
			o[ a.slice( 2 ) ] = true;
		} else if ( a.startsWith( '--' ) ) {
			o[ a.slice( 2 ) ] = argv[ ++i ];
		}
	}
	return o;
}

export function main( argv ) {
	const o = args( argv );
	const needle = o.section ?? SECTION_OF[ o.surface ];
	const run = o.run ?? ( o.fill ? newestRun( o.fill ) : null );
	const treeFile = o.clone ?? ( run ? path.join( run, 'filled.tree.json' ) : null );
	if ( ! o.saved || ! needle || ! treeFile ) {
		console.error( 'usage: hand-vs-clone.mjs --saved <saved-blocks.txt> (--section <text> | --surface header|footer|drawer|home) (--clone <filled.tree.json> | --run <dir> | --fill <dir>) [--content] [--json <file>]' );
		return 2;
	}
	if ( ! fs.existsSync( o.saved ) || ! fs.existsSync( treeFile ) ) {
		console.error( `missing: ${ fs.existsSync( o.saved ) ? treeFile : o.saved }` );
		return 2;
	}
	const section = sectionOf( fs.readFileSync( o.saved, 'utf8' ), needle );
	if ( ! section ) {
		console.error( `no section whose @@@ line contains "${ needle }" in ${ o.saved }` );
		return 2;
	}
	const tree = JSON.parse( fs.readFileSync( treeFile, 'utf8' ) );
	const result = compareSurface( section.blocks, Array.isArray( tree ) ? tree : tree.blocks ?? [ tree ], contentFacts() );
	console.log( `hand-built: ${ section.head }\nclone: ${ treeFile }` );
	console.log( reportText( result, { content: !! o.content } ) );
	if ( o.json ) {
		fs.writeFileSync( o.json, JSON.stringify( { section: section.head, clone: treeFile, totals: totals( result ), ...result }, null, '\t' ) );
	}
	return 0;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	process.exitCode = main( process.argv.slice( 2 ) );
}
