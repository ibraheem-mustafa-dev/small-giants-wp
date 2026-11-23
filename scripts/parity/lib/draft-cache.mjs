import { createHash } from 'node:crypto';
import fs from 'fs';
import path from 'path';
// The key a draft walk is cached under (draft-live-walk.mjs `--draft-cache`): the config, width, states walked, lean and
// self flags, and the snapshot schema. Bump SNAPSHOT_VERSION whenever collect.mjs or a state pass adds or changes a
// snapshot field: a rule reading a field an older cached draft lacks (`textless`, `bare`, a state's `icon`) would read
// its absence as "nothing there", so a cache written by an older walker must miss and the draft be walked afresh.
export const SNAPSHOT_VERSION = 2;
// A cache file that outlives one run (computed-route site-run.mjs walk stage) is read by a later walker, so the key also names what the
// draft walk was made from: `draft` (hashTree of the folder the draft is served from), `code` (codeHash of the walker's modules) and
// `configHash` (draftSideHash of the walker config). A change to any of them is a different key and the draft is walked afresh. Each is
// null when the caller does not pass it (solve.mjs reuses a cache within one run, where none can change).
export const draftCacheKey = ( { config, width, states = null, lean = false, self = false, draft = null, code = null, configHash = null } ) => JSON.stringify( { config, width, states, lean, self, snapshot: SNAPSHOT_VERSION, draft, code, configHash } );
// The entries of a loaded cache file written under the current schema: an older entry is never read, and is not
// written back either (a reader that takes a file's first entry, computed-route lib/trial-run.mjs::draftBoxes, then
// reads the fresh walk).
export const currentEntries = ( cache ) => Object.fromEntries( Object.entries( cache || {} ).filter( ( [ k ] ) => {
	try {
		return SNAPSHOT_VERSION === JSON.parse( k ).snapshot;
	} catch {
		return false;
	}
} ) );

// The key without what the walk was made from: two keys with the same slot are the same walk of different inputs, so storing one
// replaces the other and a cache file kept across runs holds one entry per walk, never one per code or draft change.
const slotOf = ( key ) => {
	try {
		const { draft, code, configHash, ...slot } = JSON.parse( key );
		return JSON.stringify( slot );
	} catch {
		return key;
	}
};

// Sets cache[key] = value and drops the entries of the same walk made from other inputs.
export function storeEntry( cache, key, value ) {
	const slot = slotOf( key );
	for ( const k of Object.keys( cache ) ) {
		if ( k !== key && slotOf( k ) === slot ) {
			delete cache[ k ];
		}
	}
	cache[ key ] = value;
	return cache;
}

const sha = ( ...parts ) => parts.reduce( ( h, p ) => h.update( p ).update( ';' ), createHash( 'sha256' ) ).digest( 'hex' );
const slashed = ( p ) => p.split( path.sep ).join( '/' );

// One hash of every file under `dir` (relative path and bytes, in path order): the draft's served files.
export function hashTree( dir ) {
	const files = [];
	const walk = ( d ) => {
		for ( const e of fs.readdirSync( d, { withFileTypes: true } ).sort( ( a, b ) => ( a.name < b.name ? -1 : 1 ) ) ) {
			const f = path.join( d, e.name );
			// A linked folder or file is followed (statSync reads through the link); anything else that is not a file is left out.
			const st = e.isSymbolicLink() ? fs.statSync( f, { throwIfNoEntry: false } ) : e;
			st?.isDirectory() ? walk( f ) : st?.isFile() && files.push( f );
		}
	};
	walk( dir );
	return sha( ...files.flatMap( ( f ) => [ slashed( path.relative( dir, f ) ), fs.readFileSync( f ) ] ) );
}

const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]+)\1/g;

// One hash of `entry` and every file it imports by a relative path, followed transitively (static `import ... from`, bare
// `import '...'` and `import( '...' )`). A package under node_modules is pinned by the lock file and is not read.
export function codeHash( entry ) {
	const seen = new Map();
	const visit = ( file ) => {
		const real = path.resolve( file );
		if ( seen.has( real ) || ! fs.existsSync( real ) || ! fs.statSync( real ).isFile() ) {
			return;
		}
		const text = fs.readFileSync( real );
		seen.set( real, text );
		if ( /\.(?:mjs|js|cjs)$/.test( real ) ) {
			for ( const m of text.toString( 'utf8' ).matchAll( IMPORT ) ) {
				visit( path.resolve( path.dirname( real ), m[ 2 ] ) );
			}
		}
	};
	visit( entry );
	const root = path.dirname( path.resolve( entry ) );
	return sha( ...[ ...seen.keys() ].sort().flatMap( ( f ) => [ slashed( path.relative( root, f ) ), seen.get( f ) ] ) );
}

// The walker config as the draft walk reads it: an object holding both `draft` and `live` (a pair, a state, a root, the config itself) loses its `live` and the
// draft address loses its port (a draft served from a folder listens on a new port per run). A change to a live-only field (the
// live selectors a new Fill writes) does not change it.
export function draftSideHash( cfg, { keepLive = false } = {} ) {
	const lift = ( v ) => {
		// A state action or an opener is a function, which JSON drops: its source text stands for it.
		if ( 'function' === typeof v ) {
			return `function:${ v.toString() }`;
		}
		if ( Array.isArray( v ) ) {
			return v.map( lift );
		}
		if ( v && 'object' === typeof v ) {
			const { live, ...kept } = v;
			const o = ! keepLive && 'draft' in v && 'live' in v ? kept : v;
			return Object.fromEntries( Object.entries( o ).map( ( [ k, x ] ) => [ k, lift( x ) ] ) );
		}
		return v;
	};
	const side = lift( cfg );
	if ( 'string' === typeof side.draft?.url ) {
		side.draft = { ...side.draft, url: side.draft.url.replace( /^(https?:\/\/[^/?#]+)/, ( origin ) => origin.replace( /:\d+$/, '' ) ) };
	}
	return sha( JSON.stringify( side ) );
}

// The key parts a walk that a later run may reuse is stored under (draftCacheKey's draft, code and configHash). `draftDir` is the
// folder the draft is served from (null: not given, so the key cannot say the draft's files are unchanged); `walker` the walker's
// own file. A walk with `self` live reads the live site on both sides, which no file hash covers: its key carries no draft hash and its
// config hash keeps the live half. Call it on the config as loaded, before the walker changes it.
export const cacheParts = ( { cfg, draftDir, walker, self } ) => ( { draft: draftDir && 'live' !== self ? hashTree( draftDir ) : null, code: codeHash( walker ), configHash: draftSideHash( cfg, { keepLive: 'live' === self } ) } );
