// The mutation lists tools/mutate.mjs runs, checked statically: every entry's `find` must occur exactly once in its target
// file (line endings ignored, as mutate.mjs reads it), or mutate.mjs skips it and the test it should prove is unproven.
// A mutation list is a JSON array whose entries each carry string `file`, `find` and `replace` (`file` relative to the
// route directory). No browser, no network.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

// Every JSON file under dir (recursive), as absolute paths, sorted.
export function jsonFiles( dir ) {
	const out = [];
	for ( const d of readdirSync( dir, { withFileTypes: true } ) ) {
		const p = join( dir, d.name );
		if ( d.isDirectory() ) {
			'node_modules' === d.name || out.push( ...jsonFiles( p ) );
		} else if ( d.name.endsWith( '.json' ) ) {
			out.push( p );
		}
	}
	return out.sort();
}

// Whether parsed JSON is a mutation list: a non-empty array of { file, find, replace } strings.
export const isMutationList = ( data ) => Array.isArray( data ) && data.length > 0 && data.every( ( m ) => m && 'string' === typeof m.file && 'string' === typeof m.find && 'string' === typeof m.replace );

// How many times needle occurs in hay (non-overlapping, as String.prototype.split counts them).
const occurrences = ( hay, needle ) => ( needle ? hay.split( needle ).length - 1 : 0 );

// The problems of one list: [{ index, file, why, count }] for each entry whose find does not occur exactly once in its
// target, or whose target is missing. `read` reads a route-relative path (a stub in tests).
export function listProblems( list, routeDir, read = ( f ) => readFileSync( join( routeDir, f ), 'utf8' ) ) {
	const problems = [];
	const cache = new Map();
	list.forEach( ( m, index ) => {
		if ( ! cache.has( m.file ) ) {
			let text = null;
			try {
				text = read( m.file ).replace( /\r\n/g, '\n' );
			} catch {
				text = null;
			}
			cache.set( m.file, text );
		}
		const text = cache.get( m.file );
		if ( null === text ) {
			problems.push( { index, file: m.file, find: m.find, why: m.why ?? '', count: null } );
			return;
		}
		const count = occurrences( text, m.find.replace( /\r\n/g, '\n' ) );
		1 === count || problems.push( { index, file: m.file, find: m.find, why: m.why ?? '', count } );
	} );
	return problems;
}

// Every mutation list under testsDir checked against routeDir: { lists, problems: [{ list, index, file, why, count }] },
// `list` relative to routeDir.
export function checkMutationLists( routeDir, testsDir = join( routeDir, 'tests' ) ) {
	const lists = [];
	const problems = [];
	for ( const p of jsonFiles( testsDir ) ) {
		let data = null;
		try {
			data = JSON.parse( readFileSync( p, 'utf8' ) );
		} catch {
			continue;
		}
		if ( ! isMutationList( data ) ) {
			continue;
		}
		const list = relative( routeDir, p ).replace( /\\/g, '/' );
		lists.push( list );
		problems.push( ...listProblems( data, routeDir, ( f ) => {
			const target = join( routeDir, f );
			if ( ! existsSync( target ) ) {
				throw new Error( 'missing' );
			}
			return readFileSync( target, 'utf8' );
		} ).map( ( x ) => ( { list, ...x } ) ) );
	}
	return { lists, problems };
}

// The stale entries known when the guard was built (data/mutation-list-stale-baseline.json): { "<list>": [ find, ... ] },
// a list that may only shrink. Against the current problems: `fresh` are problems the baseline does not name (a list that
// went stale since), `fixed` are baseline entries no longer a problem (re-aimed or removed, so the baseline line goes).
// Entries are matched by list and find text, counted, so two stale entries with one find need two baseline lines.
export function compareBaseline( problems, baseline ) {
	const left = new Map();
	for ( const [ list, finds ] of Object.entries( baseline || {} ) ) {
		for ( const find of finds ) {
			const k = `${ list }\u0000${ find }`;
			left.set( k, ( left.get( k ) || 0 ) + 1 );
		}
	}
	const fresh = [];
	for ( const x of problems ) {
		const k = `${ x.list }\u0000${ x.find }`;
		if ( left.get( k ) ) {
			left.set( k, left.get( k ) - 1 );
		} else {
			fresh.push( x );
		}
	}
	const fixed = [];
	for ( const [ k, n ] of left ) {
		const [ list, find ] = k.split( '\u0000' );
		for ( let i = 0; i < n; i++ ) {
			fixed.push( { list, find } );
		}
	}
	return { fresh, fixed };
}

// The baseline object for a set of problems: lists sorted, finds in list order.
export function baselineOf( problems ) {
	const out = {};
	for ( const x of [ ...problems ].sort( ( a, b ) => ( a.list < b.list ? -1 : a.list > b.list ? 1 : a.index - b.index ) ) ) {
		( out[ x.list ] ||= [] ).push( x.find );
	}
	return out;
}

// One problem as a line a person can act on.
export const problemLine = ( x ) => `${ x.list } entry ${ x.index } (${ x.file }): ${ null === x.count ? 'the target file does not exist' : `its find matches ${ x.count } places, not 1` }${ x.why ? ` - "${ x.why }"` : '' }`;
