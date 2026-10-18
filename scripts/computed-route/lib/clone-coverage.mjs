// The clone coverage map (clone coverage plan Phase 1, steps 1.3 and 1.4): for every capability ID in
// data/capabilities.json, how the route recognises it in a draft, writes it and checks it, or the exclusion Bean
// signed. An entry missing any of the three is a gap and names the Phase 4 wave that closes it ("unassigned" until the
// gap list is triaged). `coverageProblems` is the
// gate: it fails on an inventory ID with no entry, an entry for an ID the inventory does not hold, a reference to a
// file, export or construct reader that does not exist, an unsigned exclusion, and a gap with no wave.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadAjv, readJson as readJsonResult, schemaProblems } from './handoff.mjs';
import { REPO, allEntries, sectionOf } from './capabilities.mjs';
import { loadRegistry } from './intake-registry.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
export const COVERAGE_FILE = path.join( ROUTE, 'data', 'clone-coverage.json' );
export const COVERAGE_SCHEMA = path.join( ROUTE, 'data', 'clone-coverage.schema.json' );
export const STEPS = [ 'recognise', 'write', 'check' ];

// The coverage map, schema-validated. Throws on a malformed file.
export function loadCoverage( file = COVERAGE_FILE ) {
	const r = readJsonResult( file );
	if ( r.error ) {
		throw new Error( `${ file }: ${ r.error }` );
	}
	const problems = schemaProblems( loadAjv(), COVERAGE_SCHEMA, r.data );
	if ( problems.length ) {
		throw new Error( `${ file } does not match clone-coverage.schema.json:\n${ problems.join( '\n' ) }` );
	}
	return r.data;
}

// 'excluded', 'covered' (all three steps name a reference) or 'gap'.
export function statusOf( entry ) {
	if ( ! entry ) {
		return 'gap';
	}
	if ( entry.excluded ) {
		return 'excluded';
	}
	return STEPS.every( ( s ) => entry[ s ] ) ? 'covered' : 'gap';
}

// Whether a source file defines `symbol`: an export in JS, a def in Python, a function, class or const in PHP.
function defines( src, file, symbol ) {
	const s = symbol.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
	if ( /\.(?:m?js|cjs)$/.test( file ) ) {
		return new RegExp( `export\\s+(?:async\\s+)?(?:function\\*?|const|let|var|class)\\s+${ s }\\b` ).test( src ) || new RegExp( `export\\s*\\{[^}]*\\b${ s }\\b[^}]*\\}` ).test( src );
	}
	if ( file.endsWith( '.py' ) ) {
		return new RegExp( `^\\s*(?:async\\s+)?(?:def|class)\\s+${ s }\\b`, 'm' ).test( src );
	}
	if ( file.endsWith( '.php' ) ) {
		return new RegExp( `(?:function|class|const)\\s+${ s }\\b` ).test( src );
	}
	return src.includes( symbol );
}

// The problem with one reference, or null. A reference is `construct:<kind>` (a registry kind with a reader) or a
// repo-relative path with an optional `#symbol`.
export function referenceProblem( ref, { root = REPO, registry } = {} ) {
	if ( ref.startsWith( 'construct:' ) ) {
		const kind = ref.slice( 'construct:'.length );
		const e = ( registry || loadRegistry() )[ kind ];
		if ( ! e ) {
			return `${ ref }: no such construct kind in the construct registry`;
		}
		return e.gap ? `${ ref }: the construct registry has no reader for it (${ e.gap })` : null;
	}
	const [ rel, symbol ] = ref.split( '#' );
	const file = path.join( root, rel );
	if ( ! fs.existsSync( file ) ) {
		return `${ ref }: ${ rel } does not exist`;
	}
	if ( symbol && ! defines( fs.readFileSync( file, 'utf8' ), file, symbol ) ) {
		return `${ ref }: ${ rel } does not define ${ symbol }`;
	}
	return null;
}

// Every reason the coverage map does not cover the inventory, as sentences; empty when it does. A DB section the
// inventory records as absent (it was written without the DB) is not checked for unknown IDs.
export function coverageProblems( inventory, coverage, { root = REPO, registry } = {} ) {
	const reg = registry || loadRegistry();
	const problems = [];
	const entries = coverage.entries || {};
	const ids = new Set( allEntries( inventory ).map( ( e ) => e.id ) );
	const absent = new Set( Object.entries( inventory.sections ).filter( ( [ , s ] ) => 'absent' === s.status ).map( ( [ n ] ) => n ) );
	for ( const id of ids ) {
		if ( ! entries[ id ] ) {
			problems.push( `${ id }: in the inventory with no coverage entry (add how it is recognised, written and checked, a gap with its wave, or Bean's exclusion)` );
		}
	}
	for ( const [ id, e ] of Object.entries( entries ) ) {
		if ( ! ids.has( id ) && ! absent.has( sectionOf( id ) ) ) {
			problems.push( `${ id }: a coverage entry for an ID the inventory does not hold` );
		}
		if ( e.excluded ) {
			if ( 'Bean' !== e.excluded.signedBy || ! /^\d{4}-\d{2}-\d{2}$/.test( e.excluded.date || '' ) || ! String( e.excluded.reason || '' ).trim() ) {
				problems.push( `${ id }: an exclusion needs a reason, signedBy "Bean" and a YYYY-MM-DD date` );
			}
			continue;
		}
		for ( const s of STEPS ) {
			const p = e[ s ] ? referenceProblem( e[ s ], { root, registry: reg } ) : null;
			if ( p ) {
				problems.push( `${ id } ${ s }: ${ p }` );
			}
		}
		if ( 'gap' === statusOf( e ) ) {
			if ( ! String( e.wave || '' ).trim() ) {
				problems.push( `${ id }: a gap names its Phase 4 wave ("unassigned" until triaged)` );
			}
		}
	}
	return problems;
}

// The gap list: every inventory entry not covered and not excluded, with its coverage entry.
export function gapList( inventory, coverage ) {
	return allEntries( inventory ).map( ( e ) => ( { ...e, coverage: coverage.entries?.[ e.id ] || null } ) ).filter( ( e ) => 'gap' === statusOf( e.coverage ) );
}

// A gap stub for every inventory ID with no entry (the first run's seed); existing entries are never touched.
export function seedGaps( inventory, coverage, note ) {
	const entries = { ...( coverage.entries || {} ) };
	let added = 0;
	for ( const e of allEntries( inventory ) ) {
		if ( ! entries[ e.id ] ) {
			entries[ e.id ] = { recognise: null, write: null, check: null, wave: 'unassigned', note };
			added++;
		}
	}
	const sorted = Object.fromEntries( Object.keys( entries ).sort().map( ( k ) => [ k, entries[ k ] ] ) );
	return { coverage: { ...coverage, entries: sorted }, added };
}
