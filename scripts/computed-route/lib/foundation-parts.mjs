// The pure parts of the foundation command (build-foundation.mjs): the facts it reads from files and command output, each tested on its own.
//   - paintGapsOf: the blocks a stage names as having no default look for the client, read from the message lib/paint-gate.mjs
//     builds (a propose stage's detail, or a Fill log's tail), so the foundation calibrates exactly those blocks.
//   - layoutSurfaces: the surfaces whose built post is a page-map layout row (header, footer, nav drawer), in that order, and the layout rows
//     the manifest has no surface for. The basket drawer is not a row of its own: it is `sgs/cart`'s panel, set by the header's Fill.
//   - intakeCurrent: whether intake.json was taken from the handoff folder as it now stands (its recorded file hashes equal MANIFEST.json's).
//   - pageMapBuilt: whether every page-map row already has its WordPress id on the site (page-map.site names the site the ids belong to).
//   - tokenOutput: where the token extraction is written. A client with no theme-snapshot.json gets the extraction as its snapshot; a client
//     that has one keeps it (the extraction goes to a scratch file and is compared), unless `--replace-snapshot` is given and the checkout is
//     a worktree, never the main checkout.
//   - snapshotDiff: the leaves two theme snapshots hold equal, differently, and only on one side (a list of named entries is keyed by slug).
//   - wslPath: a Windows drive path as WSL sees it.
import { LAYOUT_TYPES } from './site-build-map.mjs';
import { sharesIds } from './site-targets.mjs';

// Every block name a text lists as having no default look (the message of lib/paint-gate.mjs::paintGapMessage; an older
// message said `paint`), each once, in first-seen order.
export function paintGapsOf( text ) {
	const out = new Set();
	for ( const m of String( text ?? '' ).matchAll( /no default (?:paint|look) for \S+ \(([^)]*)\)/g ) ) {
		m[ 1 ].split( ',' ).map( ( b ) => b.trim() ).filter( ( b ) => /^[a-z0-9-]+\/[a-z0-9-]+$/.test( b ) ).forEach( ( b ) => out.add( b ) );
	}
	return [ ...out ];
}

const AREA_ORDER = [ 'header', 'footer', 'drawer' ];

// { found: [ { key, area, id } ], missing: [ { slug, area, id } ] }: the page-map rows that are layout rows (lib/site-build-map.mjs::LAYOUT_TYPES), each with the
// surface key of surfaces.json whose target post is that row's id, ordered header, footer, then drawers; a layout row with no such surface is `missing`.
export function layoutSurfaces( { rows, surfaces } ) {
	const found = [];
	const missing = [];
	for ( const row of rows ?? [] ) {
		const area = LAYOUT_TYPES[ row.postType ];
		if ( ! area ) {
			continue;
		}
		const key = Object.keys( surfaces ?? {} ).find( ( k ) => Number.isInteger( row.id ) && surfaces[ k ]?.target?.postId === row.id );
		key ? found.push( { key, area, id: row.id } ) : missing.push( { slug: row.slug, area, id: row.id ?? null } );
	}
	found.sort( ( a, b ) => AREA_ORDER.indexOf( a.area ) - AREA_ORDER.indexOf( b.area ) );
	return { found, missing };
}

// Whether intake.json was taken from the handoff as it stands: the file hashes it recorded (`manifest.files`, name to sha256) equal the
// handoff MANIFEST.json's (`files`, a list of { path, sha256 }).
export function intakeCurrent( { intake, manifest } ) {
	const taken = intake?.manifest?.files;
	const now = Object.fromEntries( ( manifest?.files ?? [] ).map( ( f ) => [ f.path, f.sha256 ] ) );
	if ( ! taken || ! Object.keys( now ).length ) {
		return false;
	}
	const a = Object.keys( taken ).sort();
	const b = Object.keys( now ).sort();
	return a.length === b.length && a.every( ( k, i ) => k === b[ i ] && taken[ k ] === now[ k ] );
}

// Whether every page-map row of `rows` has its id on `site`: `siteFile` is the text of page-map.site (the site the ids were written for), and a
// site shares ids with it when it is that site or another copy of the same test site.
export function pageMapBuilt( { rows, siteFile, site, targets } ) {
	const recorded = String( siteFile ?? '' ).trim();
	return Boolean( rows?.length ) && rows.every( ( r ) => Number.isInteger( r.id ) ) && Boolean( recorded ) && ( recorded === site || sharesIds( recorded, site, targets ) );
}

// Where the token extraction goes: { to: 'committed' | 'scratch', why }. Throws when --replace-snapshot is asked in the main checkout.
export function tokenOutput( { committedExists, replace = false, mainCheckout = false } ) {
	if ( replace && mainCheckout ) {
		throw new Error( '--replace-snapshot overwrites sites/<client>/theme-snapshot.json: run the command from a worktree, not the main checkout, so the committed snapshot is replaced where nothing else reads it' );
	}
	if ( ! committedExists ) {
		return { to: 'committed', why: 'the client has no theme-snapshot.json, so the extraction is its snapshot' };
	}
	return replace
		? { to: 'committed', why: '--replace-snapshot: the extraction replaces the committed snapshot in this worktree' }
		: { to: 'scratch', why: 'the client keeps its committed theme-snapshot.json; the extraction is written beside the run and compared with it' };
}

// The leaves of a snapshot as { path: value }; a list whose entries all carry a slug is keyed by it, and any other list is one leaf.
export function snapshotLeaves( node, at = '', out = {} ) {
	if ( Array.isArray( node ) ) {
		if ( node.length && node.every( ( x ) => x && 'object' === typeof x && 'slug' in x ) ) {
			node.forEach( ( x ) => snapshotLeaves( x, `${ at }[${ x.slug }]`, out ) );
		} else {
			out[ at ] = JSON.stringify( node );
		}
	} else if ( node && 'object' === typeof node ) {
		Object.entries( node ).forEach( ( [ k, v ] ) => snapshotLeaves( v, at ? `${ at }.${ k }` : k, out ) );
	} else {
		out[ at ] = node;
	}
	return out;
}

// { equal, differ, onlyA, onlyB }: counts of the leaves two snapshots hold equal, hold with different values, and hold on one side only
// (the extractor's own `_sgsExtractor` provenance is left out).
export function snapshotDiff( a, b ) {
	const x = snapshotLeaves( a );
	const y = snapshotLeaves( b );
	const own = ( p ) => p.startsWith( '_sgsExtractor' );
	const paths = new Set( [ ...Object.keys( x ), ...Object.keys( y ) ].filter( ( p ) => ! own( p ) ) );
	const out = { equal: 0, differ: 0, onlyA: 0, onlyB: 0 };
	for ( const p of paths ) {
		if ( p in x && p in y ) {
			x[ p ] === y[ p ] ? out.equal++ : out.differ++;
		} else {
			p in x ? out.onlyA++ : out.onlyB++;
		}
	}
	return out;
}

// A Windows drive path as WSL sees it (E:\a\b to /mnt/e/a/b); a path already in WSL's form is returned as it is.
export function wslPath( p ) {
	const m = /^([A-Za-z]):[\\/](.*)$/.exec( String( p ) );
	return m ? `/mnt/${ m[ 1 ].toLowerCase() }/${ m[ 2 ].replace( /\\/g, '/' ) }` : String( p );
}
