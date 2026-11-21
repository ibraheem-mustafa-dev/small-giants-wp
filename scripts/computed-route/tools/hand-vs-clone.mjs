#!/usr/bin/env node
// The answer sheet, first step of a live run on a surface the owner built by hand: the hand-built blocks against the
// clone's Fill tree, block by block and setting by setting (lib/hand-vs-clone.mjs).
//   node scripts/computed-route/tools/hand-vs-clone.mjs --saved <saved-blocks.txt> (--section <text> | --surface <name>)
//        (--clone <filled.tree.json> | --run <fill run folder> | --fill <build/qa/fill/<surface> folder>) [--content] [--json <file>]
// --saved   a hand-built site's saved blocks, sections starting `@@@ <what>` (read-only copies, kept outside the repo)
// --section the words of the section's `@@@` line, matched as whole words in order; --surface header, footer, drawer or
//           home picks the site option that names the surface (SECTION_OF). More than one matching section is an error.
// --clone   the clone's tree; --run a Fill run folder holding filled.tree.json; --fill the surface's Fill folder, whose
//           newest stamped run (YYYY-MM-DDTHH-MM-SS) holding filled.tree.json is taken (build/<surface>.tree.json is a
//           hand-built tree, never the clone)
// --content also list content rows (words, links, pictures, per-site ids); --json writes the full result
// Prints the totals, the block counts and every block's look and custom CSS rows. Exit 0, or 2 on a usage or input
// error (each says which). Reads the framework database read-only (lib/db.mjs::openDb) for which settings are content,
// each setting's default and its per-device shape. Never contacts a site.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { parseSavedSections } from '../lib/block-choice.mjs';
import { compareSurface, reportText, totals } from '../lib/hand-vs-clone.mjs';

// The site option whose `@@@` section holds each site-wide surface; the home page is the front page.
export const SECTION_OF = { header: 'sgs_active_header_cpt_id', footer: 'sgs_active_footer_cpt_id', drawer: 'sgs_active_drawer_cpt_id', home: 'page_on_front' };

// A Fill run folder's name (site-run.mjs::fillOutDir writes these).
export const RUN_STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/;

// The facts lib/hand-vs-clone.mjs reads, from the framework database, which is closed before returning: the settings
// classed content, and each setting's tier shape and parsed default.
export function contentFacts( db = null ) {
	const own = ! db;
	const handle = db ?? openDb();
	try {
		const content = new Map();
		const facts = new Map();
		const rows = handle.prepare( 'SELECT a.block_slug, a.attr_name, a.tier_shape, a.default_value, r.classification FROM block_attributes a LEFT JOIN roles r ON r.role_name = a.role' ).all();
		for ( const r of rows ) {
			if ( 'content-bearing' === r.classification ) {
				( content.get( r.block_slug ) ?? content.set( r.block_slug, new Set() ).get( r.block_slug ) ).add( r.attr_name );
			}
			let def;
			if ( null !== r.default_value && undefined !== r.default_value ) {
				try {
					def = JSON.parse( r.default_value );
				} catch {
					def = r.default_value;
				}
			}
			facts.set( `${ r.block_slug }|${ r.attr_name }`, { tier: r.tier_shape ?? null, def } );
		}
		return { contentAttrs: ( n ) => content.get( n ) ?? null, attrFact: ( n, a ) => facts.get( `${ n }|${ a }` ) ?? null };
	} finally {
		if ( own ) {
			handle.close();
		}
	}
}

// The newest stamped run folder under a surface's Fill folder that holds filled.tree.json, or null.
export function newestRun( fillDir ) {
	if ( ! fs.existsSync( fillDir ) ) {
		return null;
	}
	const runs = fs.readdirSync( fillDir ).filter( ( d ) => RUN_STAMP.test( d ) && fs.existsSync( path.join( fillDir, d, 'filled.tree.json' ) ) ).sort();
	return runs.length ? path.join( fillDir, runs[ runs.length - 1 ] ) : null;
}

// The sections of a saved-blocks text whose `@@@` line holds the needle's words as whole words, in order.
export function sectionsMatching( text, needle ) {
	const want = String( needle ).trim().split( /\s+/ );
	return parseSavedSections( text ).filter( ( s ) => {
		const words = s.head.split( /\s+/ );
		return words.some( ( _, i ) => want.every( ( w, j ) => words[ i + j ] === w ) );
	} );
}

// The one section matching the needle, or null when none does; throws when several do.
export function sectionOf( text, needle ) {
	const found = sectionsMatching( text, needle );
	if ( found.length > 1 ) {
		throw new Error( `"${ needle }" matches ${ found.length } sections: ${ found.map( ( s ) => s.head ).join( '; ' ) }` );
	}
	return found[ 0 ] ?? null;
}

function args( argv ) {
	const o = {};
	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( '--content' === a ) {
			o.content = true;
		} else if ( a.startsWith( '--' ) ) {
			o[ a.slice( 2 ) ] = argv[ ++i ];
		}
	}
	return o;
}

const fail = ( msg ) => {
	console.error( msg );
	return 2;
};

export function main( argv ) {
	const o = args( argv );
	const needle = o.section ?? SECTION_OF[ o.surface ];
	if ( ! o.saved || ! needle || ! ( o.clone || o.run || o.fill ) ) {
		return fail( 'usage: hand-vs-clone.mjs --saved <saved-blocks.txt> (--section <text> | --surface header|footer|drawer|home) (--clone <filled.tree.json> | --run <dir> | --fill <dir>) [--content] [--json <file>]' );
	}
	const run = o.run ?? ( o.fill ? newestRun( o.fill ) : null );
	if ( o.fill && ! o.run && ! o.clone && ! run ) {
		return fail( `no stamped Fill run holding filled.tree.json under ${ o.fill }` );
	}
	const treeFile = o.clone ?? path.join( run, 'filled.tree.json' );
	for ( const f of [ o.saved, treeFile ] ) {
		if ( ! fs.existsSync( f ) ) {
			return fail( `missing: ${ f }` );
		}
	}
	let section;
	let tree;
	let facts;
	try {
		section = sectionOf( fs.readFileSync( o.saved, 'utf8' ), needle );
	} catch ( e ) {
		return fail( e.message );
	}
	if ( ! section ) {
		return fail( `no section whose @@@ line holds "${ needle }" in ${ o.saved }` );
	}
	try {
		tree = JSON.parse( fs.readFileSync( treeFile, 'utf8' ) );
	} catch ( e ) {
		return fail( `${ treeFile } is not JSON: ${ e.message }` );
	}
	try {
		facts = contentFacts();
	} catch ( e ) {
		return fail( `the framework database could not be read: ${ e.message }` );
	}
	const result = compareSurface( section.blocks, Array.isArray( tree ) ? tree : tree.blocks ?? [ tree ], facts );
	console.log( `hand-built: ${ section.head }\nclone: ${ treeFile }` );
	console.log( reportText( result, { content: !! o.content } ) );
	if ( o.json ) {
		try {
			fs.writeFileSync( o.json, JSON.stringify( { section: section.head, clone: treeFile, totals: totals( result ), ...result }, null, '\t' ) );
		} catch ( e ) {
			return fail( `could not write ${ o.json }: ${ e.message }` );
		}
	}
	return 0;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	process.exitCode = main( process.argv.slice( 2 ) );
}
