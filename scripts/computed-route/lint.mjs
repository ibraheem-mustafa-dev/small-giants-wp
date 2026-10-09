#!/usr/bin/env node
// The route's own gate (R-47-1, R-47-10).
//   node scripts/computed-route/lint.mjs [--root <dir>] [--tree <tree.json> ...] [--skeleton <tree.json> ...] [--surfaces <surfaces.json> ...]
//     [--register <fix-register.md>] [--no-names]
// Fails (exit 1) when:
//   - a file or an exported name under the route folder is missing from its README.md (R-47-1);
//   - a route file imports from plugins/sgs-blocks/scripts/ (the converter; its db_lookup.py migrates the shared DB);
//   - a --tree carries a core `style` attribute or a native_wp setting (both serialise as inline style, Spec 32);
//   - a --skeleton carries any attribute whose css_property is not null (Fill skeletons hold no style values);
//   - a --surfaces manifest has a tree printing another post (a linked block, a modal or drawer reference, a template
//     part) that no surface owns (lib/references.mjs::lintSurfaces);
//   - the divergence ledger beside a --surfaces manifest has an entry citing no register item, or an item its register
//     does not hold (house-rule entries exempt), or has entries and no register: --register, else the "register" of
//     qa/ledger.config.json beside it (B4);
//   - check-no-client-names.py reports a hit inside the route folder (--no-names skips it: tests on temp copies).
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { openDb, attrRow } from './lib/db.mjs';
import { readTree, walk } from './lib/tree.mjs';
import { lintSurfaces } from './lib/references.mjs';
import { load } from './lib/ledger.mjs';
import { brandBySlug, brandOwnsAddress } from './lib/brand-registry.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );
const IGNORED = [ 'cache', 'node_modules' ];

// Every file under the route folder, relative and with forward slashes.
export function routeFiles( root ) {
	const out = [];
	const go = ( dir ) => {
		for ( const f of fs.readdirSync( dir, { withFileTypes: true } ) ) {
			const rel = path.relative( root, path.join( dir, f.name ) ).split( path.sep ).join( '/' );
			if ( f.isDirectory() ) {
				if ( ! IGNORED.includes( rel ) ) {
					go( path.join( dir, f.name ) );
				}
			} else if ( '.gitignore' !== f.name ) {
				out.push( rel );
			}
		}
	};
	go( root );
	return out.sort();
}

// Exported names of one module (export function/const/let/class, and export { a, b }).
export function exportsOf( src ) {
	const names = [ ...src.matchAll( /^export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm ) ].map( ( m ) => m[ 1 ] );
	for ( const m of src.matchAll( /^export\s*\{([^}]+)\}/gm ) ) {
		names.push( ...m[ 1 ].split( ',' ).map( ( s ) => s.trim().split( /\s+as\s+/ ).pop() ).filter( Boolean ) );
	}
	return names;
}

// R-47-1: README lists every file and every export; no converter imports.
export function lintFolder( root ) {
	const problems = [];
	const readmePath = path.join( root, 'README.md' );
	const readme = fs.existsSync( readmePath ) ? fs.readFileSync( readmePath, 'utf8' ) : '';
	if ( ! readme ) {
		return [ 'README.md is missing' ];
	}
	for ( const f of routeFiles( root ).filter( ( x ) => 'README.md' !== x ) ) {
		if ( ! readme.includes( `\`${ f }\`` ) ) {
			problems.push( `${ f } is not listed in README.md` );
		}
		if ( ! /\.m?js$/.test( f ) ) {
			continue;
		}
		const src = fs.readFileSync( path.join( root, f ), 'utf8' );
		for ( const name of exportsOf( src ) ) {
			// Listed as `name` or `name(...)`.
			if ( ! readme.includes( `\`${ name }\`` ) && ! readme.includes( `\`${ name }(` ) ) {
				problems.push( `${ f } exports ${ name }, which README.md does not list` );
			}
		}
		for ( const m of src.matchAll( /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"`]([^'"`]+)['"`]/g ) ) {
			if ( /sgs-blocks[\\/]+scripts|(^|\/)converter\// .test( m[ 1 ] ) ) {
				problems.push( `${ f } imports ${ m[ 1 ] } (R-47-1: nothing from plugins/sgs-blocks/scripts/)` );
			}
		}
	}
	return problems;
}

// R-47-10 on a tree the route writes: no core style attribute, no native_wp setting.
export function lintTree( tree, db, label = 'tree' ) {
	const problems = [];
	walk( tree, ( n, i ) => {
		for ( const k of Object.keys( n.attributes || {} ) ) {
			if ( 'style' === k ) {
				problems.push( `${ label } node ${ i } (${ n.name }) carries a core style attribute` );
			} else if ( 'native_wp' === attrRow( db, n.name, k )?.source && attrRow( db, n.name, k )?.css_property ) {
				// A native setting that paints CSS serialises as inline style (Spec 32); content and markup settings do not.
				problems.push( `${ label } node ${ i } (${ n.name }) writes native_wp style setting ${ k }` );
			}
		}
	} );
	return problems;
}

// R-47-10 on a Fill skeleton: no attribute that paints a CSS property. Also, a brand icon (sgs/icon, iconSource
// "brand") that types its own brand's address in linkUrl must bind linkUrl to Site Info, so the address stays editable
// in one place; ordinary icons and every other block are not checked (lib/brand-registry.mjs derives ownership).
export function lintSkeleton( tree, db, label = 'skeleton' ) {
	const problems = [];
	walk( tree, ( n, i ) => {
		const a = n.attributes || {};
		const brand = 'sgs/icon' === n.name && 'brand' === a.iconSource ? brandBySlug( a.brandName ) : null;
		if ( brand && brandOwnsAddress( brand, a.linkUrl ) && ! a.metadata?.bindings?.linkUrl ) {
			problems.push( `${ label } node ${ i } (${ n.name }) types ${ brand.label }'s address in linkUrl for brand "${ brand.slug }" with no metadata.bindings.linkUrl to Site Info "${ brand.siteInfoKey }"` );
		}
		for ( const k of Object.keys( n.attributes || {} ) ) {
			if ( 'style' === k || attrRow( db, n.name, k )?.css_property ) {
				problems.push( `${ label } node ${ i } (${ n.name }) carries style value ${ k }` );
			}
		}
	} );
	return problems;
}

// A register item id: a number, or letters then a number (S1, CR15, N16a, N36C).
const ITEM_ID = /^[A-Z]{0,3}\d+[A-Za-z]{0,2}$/;
// A numbered range one row covers ("39-43"): the range itself and each number in it are ids.
const ITEM_RANGE = /^(\d+)-(\d+)$/;

// Every item id a fix register holds: each table row's first cell (comma-separated ids, "126, 137") and the ids that
// lead a bullet ("- 132, 141 map strip ...", "- D1: a general ...").
export function registerIds( markdown ) {
	const ids = new Set();
	for ( const line of markdown.split( /\r?\n/ ) ) {
		const cell = line.match( /^\|\s*([^|]+?)\s*\|/ );
		const bullet = line.match( /^- ([A-Za-z0-9]+(?:,\s*[A-Za-z0-9]+)*)[\s:]/ );
		const first = cell?.[ 1 ] ?? bullet?.[ 1 ];
		for ( const id of first ? first.split( ',' ).map( ( s ) => s.trim() ) : [] ) {
			const range = id.match( ITEM_RANGE );
			if ( ITEM_ID.test( id ) ) {
				ids.add( id );
			} else if ( range && Number( range[ 1 ] ) < Number( range[ 2 ] ) ) {
				ids.add( id );
				for ( let n = Number( range[ 1 ] ); n <= Number( range[ 2 ] ); n++ ) {
					ids.add( String( n ) );
				}
			}
		}
	}
	return ids;
}

// Rules that are house rules (CLAUDE.md non-negotiables), not decisions: their entries cite no register item.
export const HOUSE_RULES = [ 'touch-target', 'accessibility' ];

// B4: every divergence-ledger entry is a decision Bean made, so each cites the register items it implements
// (`register: [ids]`), and every id is in the register. House-rule entries are exempt.
export function lintLedger( entries, ids, label = 'ledger' ) {
	const problems = [];
	for ( const e of entries ) {
		if ( HOUSE_RULES.includes( e.expected?.rule ) ) {
			continue;
		}
		if ( ! Array.isArray( e.register ) || ! e.register.length ) {
			problems.push( `${ label } entry ${ e.id } cites no register decision (register: [ids])` );
			continue;
		}
		e.register.filter( ( id ) => ! ids.has( String( id ) ) ).forEach( ( id ) => problems.push( `${ label } entry ${ e.id } cites register item ${ id }, which the register does not hold` ) );
	}
	return problems;
}

// The ledger beside a surfaces manifest (<build>/qa/divergences.json) checked against its fix register: --register
// when given, else the register its ledger.config.json names ({ "register": "<path from the repo root>" }, beside the
// ledger, so the client's register path stays in the client's folder). A ledger with entries and no register to check
// them against, or a named register that does not exist, is itself a problem.
export function lintSurfaceLedger( surfacesFile, registerFile = null, repo = REPO ) {
	const qa = path.join( path.dirname( path.resolve( surfacesFile ) ), 'qa' );
	const file = path.join( qa, 'divergences.json' );
	const entries = load( file );
	if ( ! entries.length ) {
		return [];
	}
	const config = path.join( qa, 'ledger.config.json' );
	const named = registerFile || ( fs.existsSync( config ) ? JSON.parse( fs.readFileSync( config, 'utf8' ) ).register : null );
	if ( ! named ) {
		return [ `${ file } has ${ entries.length } entries and no register to check their decisions against (--register, or "register" in ${ config })` ];
	}
	const register = registerFile ? path.resolve( named ) : path.resolve( repo, named );
	if ( ! fs.existsSync( register ) ) {
		return [ `${ file }: register ${ register } does not exist` ];
	}
	return lintLedger( entries, registerIds( fs.readFileSync( register, 'utf8' ) ), file );
}

function clientNameHits() {
	try {
		execFileSync( 'python', [ path.join( REPO, 'scripts', 'check-no-client-names.py' ), '--check' ], { cwd: REPO, encoding: 'utf8', stdio: 'pipe' } );
		return [];
	} catch ( e ) {
		return String( e.stdout || '' ).split( /\r?\n/ ).filter( ( l ) => l.includes( 'scripts/computed-route' ) ).map( ( l ) => `client name: ${ l.trim() }` );
	}
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const all = ( name ) => argv.flatMap( ( a, i ) => ( a === name ? [ argv[ i + 1 ] ] : [] ) );
	const root = path.resolve( all( '--root' )[ 0 ] || HERE );
	const problems = lintFolder( root );
	const db = openDb();
	all( '--tree' ).forEach( ( f ) => problems.push( ...lintTree( readTree( f ), db, f ) ) );
	all( '--skeleton' ).forEach( ( f ) => problems.push( ...lintSkeleton( readTree( f ), db, f ) ) );
	all( '--surfaces' ).forEach( ( f ) => problems.push( ...lintSurfaces( JSON.parse( fs.readFileSync( f, 'utf8' ) ), path.dirname( path.resolve( f ) ) ), ...lintSurfaceLedger( f, all( '--register' )[ 0 ] ) ) );
	if ( ! argv.includes( '--no-names' ) ) {
		problems.push( ...clientNameHits() );
	}
	console.log( problems.length ? `computed-route lint failed:\n- ${ problems.join( '\n- ' ) }` : 'computed-route lint passed.' );
	process.exit( problems.length ? 1 : 0 );
}
