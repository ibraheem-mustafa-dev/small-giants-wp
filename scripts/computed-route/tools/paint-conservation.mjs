#!/usr/bin/env node
// Lists every painted draft element that no skeleton node reads (lib/skeleton-paint-conservation.mjs::conservationRows), over
// the saved inventory, proposal and skeleton of each surface, grouped by what dropped it. Reads files only: no browser, no
// site, no database.
//   node scripts/computed-route/tools/paint-conservation.mjs (--client <slug>[,<slug>...] | --all) [--root <repo>]
//        [--dir <client>=<folder>]... [--skip <client>/<surface>[,...]] [--out <folder>] [--json] [--check [--strict]] [--cache <folder>]
//   --dir: read that client's <surface>.inventory.json, .proposal.json and .skeleton.json from <folder> (a regeneration kept
//   outside the repo), not from sites/<client>/build/skeleton. --skip: surfaces left out (and not counted as other surfaces).
//   --out: writes list.json (every row) and LIST.md (the groups) there. --json prints the result as JSON.
//   Every count is three numbers: READ (a block reads the look, a delivering record's destination verified), RECORDED-UNREAD
//   (a record that delivers nothing to the clone: no-part, not-calibrated, handover, own-surface, site-decision) and FAILING.
//   --check: exit 1 when any row is FAILING; --strict (STRICT_DEFAULT when absent) fails RECORDED-UNREAD rows too. Without
//   --check the exit is 0: the list is a report. --cache: the calibration slot maps a no-part record is verified against
//   (the route's cache folder by default).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { conservationRows, namedIdentities, heldIdentities, groupRows, STRICT_DEFAULT } from '../lib/skeleton-paint-conservation.mjs';
import { readSlotMap } from '../lib/cache.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );

// The surfaces of one client that the client's surfaces.json lists and that hold all three files: [ { surface, inventory,
// proposal, skeleton, component } ]. A surface the folder holds an inventory for and the manifest does not list (a stale
// regeneration) is never read, so it is never another surface either: its name goes to `unlisted` (an array, when given).
export function loadClient( { repo, client, dir = null, skip = new Set(), unlisted = null } ) {
	const folder = dir ?? path.join( repo, 'sites', client, 'build', 'skeleton' );
	const manifestFile = path.join( repo, 'sites', client, 'build', 'surfaces.json' );
	const manifest = fs.existsSync( manifestFile ) ? readJson( manifestFile ) : {};
	const out = [];
	for ( const f of fs.existsSync( folder ) ? fs.readdirSync( folder ).sort() : [] ) {
		const surface = /^(.+)\.inventory\.json$/.exec( f )?.[ 1 ];
		const files = surface ? [ 'inventory', 'proposal', 'skeleton' ].map( ( k ) => path.join( folder, `${ surface }.${ k }.json` ) ) : [];
		if ( ! surface || skip.has( `${ client }/${ surface }` ) ) {
			continue;
		}
		if ( ! Object.hasOwn( manifest, surface ) ) {
			unlisted?.push( surface );
			continue;
		}
		if ( ! files.every( ( x ) => fs.existsSync( x ) ) ) {
			continue;
		}
		const [ inventory, proposal, skeleton ] = files.map( readJson );
		out.push( { surface, inventory, proposal, skeleton, component: String( manifest[ surface ]?.draftIndex ?? surface ).replace( /\.dc\.html$/, '' ) } );
	}
	return out;
}

// Every client's rows and counts: { rows, counts: { client: { surface: counts } }, unlisted: { client: [ surface ] } }. Each row
// carries its client and surface; `unlisted` names the surfaces left unread because the manifest does not list them.
// calibration( block ): the block's calibrated settings from the cache's slot map, or null where it has none.
export const calibrationFrom = ( dir ) => ( block ) => ( block ? readSlotMap( dir, block )?.settings ?? null : null );

export function listAll( { repo, clients, dirs = {}, skip = new Set(), calibration = calibrationFrom( path.join( HERE, '..', 'cache' ) ) } ) {
	const rows = [];
	const counts = {};
	const unlisted = {};
	for ( const client of clients ) {
		unlisted[ client ] = [];
		const surfaces = loadClient( { repo, client, dir: dirs[ client ] ?? null, skip, unlisted: unlisted[ client ] } );
		const named = surfaces.map( ( s ) => ( { surface: s.surface, identities: namedIdentities( s ), held: heldIdentities( s ), size: s.inventory.elements.length } ) );
		counts[ client ] = {};
		for ( const s of surfaces ) {
			// A narrower surface (fewer elements; the earlier name on a tie) that holds an element lists it, so it is listed once.
			const size = s.inventory.elements.length;
			const narrower = named.filter( ( n ) => n.surface !== s.surface && ( n.size < size || ( n.size === size && n.surface < s.surface ) ) );
			const ownedElsewhere = new Set( narrower.flatMap( ( n ) => [ ...n.held ] ) );
			const r = conservationRows( { ...s, otherSurfaces: named.filter( ( n ) => n.surface !== s.surface ), ownedElsewhere, calibration } );
			counts[ client ][ s.surface ] = r.counts;
			rows.push( ...r.rows.map( ( row ) => ( { client, surface: s.surface, ...row } ) ) );
		}
	}
	return { rows, counts, unlisted };
}

const cell = ( v ) => String( v ?? '' ).replace( /\|/g, '\\|' ).replace( /\n/g, ' ' );

// The groups as markdown: a totals line per client, then one table row per (class, dropped by, rule).
export function markdown( { rows, counts, unlisted = {} }, title ) {
	const total = ( client, k ) => Object.values( counts[ client ] ).reduce( ( n, c ) => n + c[ k ], 0 );
	const sum = ( client, keys ) => keys.reduce( ( n, k ) => n + total( client, k ), 0 );
	const READ = [ 'exact', 'loopCopy', 'instanceCopy', 'siblingCopy', 'otherSurface', 'ownedElsewhere', 'recorded' ];
	const head = [ `# ${ title }`, '', '| Client | Painted | READ | RECORDED-UNREAD | FAILING |', '|---|---|---|---|---|', ...Object.keys( counts ).map( ( client ) => `| ${ client } | ${ total( client, 'painted' ) } | ${ sum( client, READ ) } | ${ total( client, 'listedApart' ) } | ${ total( client, 'unread' ) } |` ), '', 'READ: a block reads the look (a delivering record counts only where its destination is verified). RECORDED-UNREAD: a record says why no block reads it; the clone does not show these looks. FAILING: neither.', '' ];
	const lines = [ ...head, '| Client | Surfaces | Painted | Read exactly | Read as a loop copy | Read under another host copy | Read through a like sibling | Read by another surface | Listed under a narrower surface | Delivered by a record | RECORDED-UNREAD | FAILING |', '|---|---|---|---|---|---|---|---|---|---|---|---|' ];
	for ( const client of Object.keys( counts ) ) {
		lines.push( `| ${ client } | ${ Object.keys( counts[ client ] ).length } | ${ [ 'painted', 'exact', 'loopCopy', 'instanceCopy', 'siblingCopy', 'otherSurface', 'ownedElsewhere', 'recorded', 'listedApart', 'unread' ].map( ( k ) => total( client, k ) ).join( ' | ' ) } |` );
	}
	const stale = Object.entries( unlisted ).flatMap( ( [ client, names ] ) => names.map( ( n ) => `${ client }/${ n }` ) );
	stale.length && lines.push( '', `Surfaces the manifest does not list (not read): ${ stale.join( ', ' ) }` );
	const unread = rows.filter( ( r ) => 'recorded' === r.state );
	const byBlock = {};
	unread.forEach( ( r ) => Object.keys( r.looks ).forEach( ( l ) => {
		const id = JSON.stringify( [ r.record?.block ?? r.hostBlock ?? '', r.class, l ] );
		byBlock[ id ] = ( byBlock[ id ] ?? 0 ) + 1;
	} ) );
	lines.push( '', '## RECORDED-UNREAD by block and look (looks the clone does not show)', '', '| Block | Record | Look | Elements |', '|---|---|---|---|', ...Object.entries( byBlock ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] ).map( ( [ id, n ] ) => `| ${ JSON.parse( id ).map( cell ).join( ' | ' ) } | ${ n } |` ) );
	lines.push( '', '| Rows | Class | Dropped by | Rule | Surfaces | Looks | Examples |', '|---|---|---|---|---|---|---|' );
	for ( const g of groupRows( rows ) ) {
		lines.push( `| ${ g.count } | ${ g.class } | ${ g.by } | ${ cell( g.rule ) } | ${ g.surfaces.length } | ${ cell( Object.entries( g.looks ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] ).map( ( [ k, n ] ) => `${ k } ${ n }` ).join( ', ' ) ) } | ${ cell( g.examples.join( '; ' ) ) } |` );
	}
	return `${ lines.join( '\n' ) }\n`;
}

export function main( argv, { log = console.log } = {} ) {
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	const all = ( n ) => argv.flatMap( ( a, i ) => ( a === n ? [ argv[ i + 1 ] ] : [] ) );
	const repo = path.resolve( flag( '--root' ) ?? path.join( HERE, '..', '..', '..' ) );
	const dirs = Object.fromEntries( all( '--dir' ).map( ( d ) => [ d.slice( 0, d.indexOf( '=' ) ), path.resolve( d.slice( d.indexOf( '=' ) + 1 ) ) ] ) );
	const skip = new Set( String( flag( '--skip' ) ?? '' ).split( ',' ).filter( Boolean ) );
	const sites = path.join( repo, 'sites' );
	const clients = argv.includes( '--all' ) ? fs.readdirSync( sites ).filter( ( c ) => fs.existsSync( path.join( sites, c, 'build', 'skeleton' ) ) ).sort() : String( flag( '--client' ) ?? '' ).split( ',' ).filter( Boolean );
	if ( ! clients.length ) {
		log( 'usage: paint-conservation.mjs (--client <slug>[,<slug>...] | --all) [--root <repo>] [--dir <client>=<folder>]... [--skip <client>/<surface>[,...]] [--out <folder>] [--json] [--check [--strict]] [--cache <folder>]' );
		return 2;
	}
	const result = listAll( { repo, clients, dirs, skip, ...( flag( '--cache' ) ? { calibration: calibrationFrom( path.resolve( flag( '--cache' ) ) ) } : {} ) } );
	const out = flag( '--out' );
	if ( out ) {
		fs.mkdirSync( out, { recursive: true } );
		fs.writeFileSync( path.join( out, 'list.json' ), `${ JSON.stringify( result, null, '\t' ) }\n` );
		fs.writeFileSync( path.join( out, 'LIST.md' ), markdown( result, 'Painted draft elements no block reads' ) );
	}
	log( argv.includes( '--json' ) ? JSON.stringify( result ) : markdown( result, 'Painted draft elements no block reads' ) );
	const strict = argv.includes( '--strict' ) || STRICT_DEFAULT;
	const failing = result.rows.filter( ( r ) => 'unrecorded' === r.state ).length;
	const recorded = result.rows.length - failing;
	argv.includes( '--check' ) && log( `paint conservation check: ${ failing } painted element${ 1 === failing ? '' : 's' } FAILING (neither read nor recorded), ${ recorded } RECORDED-UNREAD${ strict ? ' (strict: these fail too)' : '' }` );
	return argv.includes( '--check' ) && ( failing || ( strict && recorded ) ) ? 1 : 0;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	process.exit( main( process.argv.slice( 2 ) ) );
}
