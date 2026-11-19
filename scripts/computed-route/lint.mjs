#!/usr/bin/env node
// The route's own gate (R-47-1, R-47-10).
//   node scripts/computed-route/lint.mjs [--root <dir>] [--tree <tree.json> ...] [--skeleton <tree.json> ...] [--surfaces <surfaces.json> ...]
//     [--register <fix-register.md>] [--no-names]
// Fails (exit 1) when:
//   - a file or an exported name under the route folder is missing from its README.md (R-47-1);
//   - a route file imports from plugins/sgs-blocks/scripts/ (the converter; its db_lookup.py migrates the shared DB);
//   - a route file other than lib/site-targets.mjs and the tests names calibration-targets.json as a path in code (comments and
//     messages are fine): the site targets are read through lib/site-targets.mjs::readTargets, which adds the local scratch
//     entries and the protected rule (a direct read would see neither);
//   - a test under tests/ spawns a route entry point (a top-level .mjs command, wp-build-page.js, draft-live-walk.mjs) that
//     data/offline-test-spawns.json does not list with its reason, or lists and the test no longer spawns (lintTestSpawns);
//   - a route file (tests included) names the plugin's node_modules folder; the route imports its third-party packages
//     from its own pinned install (FR-48-75);
//   - a --tree carries a core `style` attribute or a native_wp setting (both serialise as inline style, Spec 32), or a
//     `content` or `text` markup string holding a tag with a style attribute (rich-text formats are class-only);
//   - a --skeleton carries any attribute whose css_property is not null (Fill skeletons hold no style values);
//   - a --surfaces manifest has a tree printing another post (a linked block, a modal or drawer reference, a template
//     part) that no surface owns (lib/references.mjs::lintSurfaces);
//   - the divergence ledger beside a --surfaces manifest has an entry citing no register item, or an item its register
//     does not hold (house-rule entries exempt), or has entries and no register: --register, else the "register" of
//     qa/ledger.config.json beside it (B4);
//   - calibration-fixtures.json in the route folder names a site object by a literal id with no URL fallback, or by a
//     token outside the vocabulary (lib/fixture-refs.mjs::checkFixtureRefs; fixture-refs.mjs --survey lists them);
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
import { checkFixtureRefs } from './lib/fixture-refs.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );
const IGNORED = [ 'cache', 'node_modules' ];
// FR-48-75: the plugin's node_modules, written as a path or as path.join() pieces.
const PLUGIN_MODULES = /plugins[\\/'"`,\s]+sgs-blocks[\\/'"`,\s]+node_modules/;

// The one module that may name the site targets file; the tests may plant it.
const TARGETS_READER = 'lib/site-targets.mjs';
// A quoted path ending in calibration-targets.json: 'calibration-targets.json', `${ dir }/calibration-targets.json`. A sentence that
// merely mentions the file (a message or a comment) has no slash before the name inside its quotes.
const TARGETS_PATH = /(['"`])(?:[^'"`\r\n]*[\\/])?calibration-targets\.json\1/;

// Whether a source file names the committed site targets file as a path in its code (comments dropped first).
export function readsTargetsFile( src ) {
	const code = src.replace( /\/\*[\s\S]*?\*\//g, '' ).replace( /^\s*\/\/.*$/gm, '' ).replace( /([;{}),])\s*\/\/.*$/gm, '$1' );
	return TARGETS_PATH.test( code );
}

// The route's entry points: every top-level .mjs command of the route folder, and the two scripts outside it that reach a site.
const OUTSIDE_ENTRY_POINTS = [ 'wp-build-page.js', 'draft-live-walk.mjs' ];
export const entryPoints = ( root ) => [ ...fs.readdirSync( root, { withFileTypes: true } ).filter( ( f ) => f.isFile() && /\.mjs$/.test( f.name ) ).map( ( f ) => f.name ), ...OUTSIDE_ENTRY_POINTS ];

// The part of `src` from the open parenthesis at `open` to its match.
function balanced( src, open ) {
	let depth = 0;
	for ( let i = open; i < src.length; i++ ) {
		if ( '(' === src[ i ] ) {
			depth++;
		} else if ( ')' === src[ i ] && 0 === --depth ) {
			return src.slice( open, i + 1 );
		}
	}
	return src.slice( open );
}

// Whether `text` names the script: as a quoted name or as the end of a path (`'x.mjs'`, `'../x.mjs'`, `${ dir }\x.mjs`).
const namesScript = ( text, name ) => [ `'${ name }'`, `"${ name }"`, `/${ name }`, `\\${ name }` ].some( ( t ) => text.includes( t ) );

// The entry points a test source spawns: a spawn, execFile, fork or exec call whose arguments name one, directly or through a
// constant bound to its path (`const CLI = path.join( HERE, '..', 'x.mjs' )`).
export function spawnedEntryPoints( src, entries ) {
	// Calls are found in `mask` (comments and string contents blanked, so a call written inside a string or a comment is no call);
	// their arguments and the constants' values are read from `src` at the same offsets.
	const mask = maskStringsAndComments( src );
	const bound = {};
	for ( const m of mask.matchAll( /(?:const|let)\s+(\w+)\s*=\s*([^;]*);/g ) ) {
		const named = entries.filter( ( e ) => namesScript( src.slice( m.index, m.index + m[ 0 ].length ), e ) );
		named.length && ( bound[ m[ 1 ] ] = named );
	}
	const out = new Set();
	for ( const call of mask.matchAll( /(?<![.\w])(?:spawn|spawnSync|execFile|execFileSync|fork|exec|execSync)\s*\(/g ) ) {
		const open = call.index + call[ 0 ].length - 1;
		const length = balanced( mask, open ).length;
		const args = src.slice( open, open + length );
		entries.filter( ( e ) => namesScript( args, e ) ).forEach( ( e ) => out.add( e ) );
		const code = mask.slice( open, open + length );
		for ( const [ id, named ] of Object.entries( bound ) ) {
			new RegExp( `\\b${ id }\\b` ).test( code ) && named.forEach( ( e ) => out.add( e ) );
		}
	}
	return [ ...out ].sort();
}

// `src` with the inside of every comment and string, single, double or template, replaced by spaces (newlines and offsets kept).
// A regular expression literal is not told apart from division: a quote inside one can blank code after it, so this is a
// heuristic for the test sources it reads, which a test of its own pins.
export function maskStringsAndComments( src ) {
	let out = '';
	let state = null;
	let inClass = false;
	for ( let i = 0; i < src.length; i++ ) {
		const c = src[ i ];
		const next = src[ i + 1 ];
		if ( null === state ) {
			if ( '/' === c && '/' === next ) {
				state = '//';
			} else if ( '/' === c && '*' === next ) {
				state = '/*';
			} else if ( [ "'", '"', '`' ].includes( c ) ) {
				state = c;
			} else if ( '/' === c && /(?:^|[(,=:[!&|?{};]|\breturn|\btypeof)\s*$/.test( out ) ) {
				// A slash after an operator, an opening bracket or a statement end starts a regular expression literal.
				state = 're';
				inClass = false;
			}
			out += c;
		} else if ( 're' === state ) {
			if ( '\\' === c ) {
				out += '  ';
				i++;
			} else {
				'[' === c && ( inClass = true );
				']' === c && ( inClass = false );
				'/' === c && ! inClass ? ( state = null, out += c ) : ( out += '\n' === c ? c : ' ' );
			}
		} else if ( '//' === state ) {
			'\n' === c ? ( state = null, out += c ) : ( out += ' ' );
		} else if ( '/*' === state ) {
			if ( '*' === c && '/' === next ) {
				state = null;
				out += '*/';
				i++;
			} else {
				out += '\n' === c ? c : ' ';
			}
		} else if ( '\\' === c ) {
			out += ' ' + ( '\n' === next ? '\n' : ' ' );
			i++;
		} else if ( c === state ) {
			state = null;
			out += c;
		} else {
			out += '\n' === c ? c : ' ';
		}
	}
	return out;
}

// A test never starts a route command: one that reaches a site would reach it from a test, and the mutation checker runs tests
// with their guards removed. A spawn is allowed only when data/offline-test-spawns.json lists the test and the script with the
// reason the command cannot reach a site on the arguments the test gives (`{ "x.test.mjs": { "x.mjs": "reason" } }`); an entry
// shaped `{ "live": "reason" }` is a test that reaches a site on purpose and must read SGS_NO_SITE to skip itself. An entry the
// test no longer matches is stale.
export function lintTestSpawns( root ) {
	const dir = path.join( root, 'tests' );
	const listFile = path.join( root, 'data', 'offline-test-spawns.json' );
	if ( ! fs.existsSync( dir ) ) {
		return [];
	}
	const allowed = fs.existsSync( listFile ) ? JSON.parse( fs.readFileSync( listFile, 'utf8' ) ) : {};
	const entries = entryPoints( root );
	const problems = [];
	const seen = new Set();
	for ( const f of fs.readdirSync( dir ).filter( ( x ) => /\.test\.mjs$/.test( x ) ) ) {
		const src = fs.readFileSync( path.join( dir, f ), 'utf8' );
		for ( const script of spawnedEntryPoints( src, entries ) ) {
			seen.add( `${ f }|${ script }` );
			const why = allowed[ f ]?.[ script ];
			const text = 'string' === typeof why ? why : why?.live;
			if ( ! text ) {
				problems.push( `tests/${ f } spawns ${ script }, a route entry point that can reach a site: call its functions instead, or list it with its reason in data/offline-test-spawns.json` );
			} else if ( 'string' !== typeof why && ! /SGS_NO_SITE/.test( src ) ) {
				problems.push( `tests/${ f } spawns ${ script } and reaches a site on purpose, but never reads SGS_NO_SITE to skip itself` );
			}
		}
	}
	for ( const [ f, scripts ] of Object.entries( allowed ) ) {
		Object.keys( scripts ).filter( ( s ) => ! seen.has( `${ f }|${ s }` ) ).forEach( ( s ) => problems.push( `data/offline-test-spawns.json lists ${ f } spawning ${ s }, which that test no longer does: remove the entry` ) );
	}
	return problems;
}

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

// R-47-1: README lists every file and every export; no converter imports. FR-48-75: no reach into the plugin's node_modules.
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
		if ( PLUGIN_MODULES.test( src ) ) {
			problems.push( `${ f } names the plugin's node_modules folder (FR-48-75: import third-party packages from scripts/computed-route/node_modules)` );
		}
		if ( TARGETS_READER !== f && ! f.startsWith( 'tests/' ) && readsTargetsFile( src ) ) {
			problems.push( `${ f } names calibration-targets.json as a path: read the site targets with lib/site-targets.mjs::readTargets (it adds the local scratch entries and the protected rule)` );
		}
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
	problems.push( ...lintTestSpawns( root ) );
	return problems;
}

// An HTML tag carrying a style attribute inside a rich-text string (`<span style=…>`, `<img STYLE = …>`).
const INLINE_STYLE_TAG = /<[a-z][^>]*\sstyle\s*=/i;

// R-47-10 on a tree the route writes: no core style attribute, no native_wp setting, and no inline style inside a
// `content` or `text` markup string (rich-text formats are class-only, Spec 02 FR-2-4 and FR-2-5).
export function lintTree( tree, db, label = 'tree' ) {
	const problems = [];
	walk( tree, ( n, i ) => {
		for ( const k of Object.keys( n.attributes || {} ) ) {
			const v = n.attributes[ k ];
			if ( ( 'content' === k || 'text' === k ) && 'string' === typeof v && INLINE_STYLE_TAG.test( v ) ) {
				problems.push( `${ label } node ${ i } (${ n.name }) writes an inline style attribute inside its ${ k } markup` );
			}
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
export const HOUSE_RULES = [ 'touch-target', 'accessibility', 'breakpoint-snap' ];

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
	const fixturesFile = path.join( root, 'calibration-fixtures.json' );
	fs.existsSync( fixturesFile ) && problems.push( ...checkFixtureRefs( JSON.parse( fs.readFileSync( fixturesFile, 'utf8' ) ) ) );
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
