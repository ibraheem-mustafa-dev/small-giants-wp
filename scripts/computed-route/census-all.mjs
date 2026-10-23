// The mechanism census across every surface and client: groups each surface's newest walker report and Fill run by
// mechanism signature (block family, property family, state, tier pattern, side, Fill reason class).
//   node census-all.mjs [--clients a,b] [--root <repo root>] [--out <file>] [--json] [--check]
// --out writes Markdown, or JSON when the file ends in .json. --check exits 1 when a row has no signature (a part the
// framework DB, the property families or data/census-classes.json cannot name). Exit 2 on usage.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './lib/db.mjs';
import { loadRules } from './lib/fill-census.mjs';
import { blockLookup, surfaceRows, groupRows, SIGNATURE_PARTS } from './lib/census-mechanism.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const args = process.argv.slice( 2 );
const flag = ( name ) => ( args.includes( name ) ? args[ args.indexOf( name ) + 1 ] : null );
const root = path.resolve( flag( '--root' ) || path.join( HERE, '..', '..' ) );
const dirs = ( d ) => ( fs.existsSync( d ) ? fs.readdirSync( d, { withFileTypes: true } ).filter( ( e ) => e.isDirectory() ).map( ( e ) => e.name ).sort() : [] );
const readJson = ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) );
const mtime = ( f ) => fs.statSync( f ).mtimeMs;

// The surface's newest walker report: the walker's own out folder, or the final round of the newest Solve run.
function walkerReport( qa, surface ) {
	const found = [];
	const own = path.join( qa, 'parity', 'out', surface, 'report.json' );
	fs.existsSync( own ) && found.push( own );
	const solve = path.join( qa, 'solve', surface );
	for ( const stamp of dirs( solve ) ) {
		const rounds = dirs( path.join( solve, stamp ) ).filter( ( d ) => /^round-\d+$/.test( d ) && fs.existsSync( path.join( solve, stamp, d, 'report.json' ) ) ).sort( ( a, b ) => Number( a.slice( 6 ) ) - Number( b.slice( 6 ) ) );
		rounds.length && found.push( path.join( solve, stamp, rounds[ rounds.length - 1 ], 'report.json' ) );
	}
	return found.sort( ( a, b ) => mtime( b ) - mtime( a ) )[ 0 ] ?? null;
}

// The surface's newest Fill run, read into { unmapped, held, writes, confirm, tree }.
function fillRun( qa, surface ) {
	const base = path.join( qa, 'fill', surface );
	const stamp = dirs( base ).filter( ( d ) => fs.existsSync( path.join( base, d, 'unmapped.json' ) ) ).pop();
	if ( ! stamp ) {
		return null;
	}
	const dir = path.join( base, stamp );
	const reportFile = path.join( dir, 'fill-report.json' );
	const report = fs.existsSync( reportFile ) ? readJson( reportFile ) : {};
	const treeFile = path.join( dir, 'filled.tree.json' );
	return { dir, unmapped: readJson( path.join( dir, 'unmapped.json' ) ), held: report.alreadyHeld ?? [], writes: report.writes ?? [], confirm: report.confirm ?? [], tree: fs.existsSync( treeFile ) ? readJson( treeFile ) : [] };
}

// Every surface's census rows of one client: [ { client, surface, rows, walk, sources } ].
export function clientRows( client, qa, lookup, rules ) {
	const surfaces = [ ...new Set( [ ...dirs( path.join( qa, 'parity', 'out' ) ), ...dirs( path.join( qa, 'fill' ) ), ...dirs( path.join( qa, 'solve' ) ) ] ) ].sort();
	const out = [];
	for ( const surface of surfaces ) {
		const reportFile = walkerReport( qa, surface );
		const run = fillRun( qa, surface );
		if ( ! reportFile && ! run ) {
			continue;
		}
		const report = reportFile ? readJson( reportFile ) : null;
		const { rows, walk } = surfaceRows( { client, surface, report, run, lookup, rules } );
		out.push( { client, surface, rows, walk, sources: { walker: reportFile, fill: run?.dir ?? null } } );
	}
	return out;
}

const cell = ( v ) => String( v ?? '' ).replace( /\|/g, '\\|' ).replace( /\s+/g, ' ' ).slice( 0, 60 );

// The Markdown table of the groups.
export function renderTable( { groups, unclassified, surfaces, clients } ) {
	const lines = [ `# Mechanism census`, '', `${ groups.reduce( ( n, g ) => n + g.total, 0 ) } rows in ${ groups.length } groups across ${ surfaces } surface(s) of ${ clients.join( ', ' ) }; ${ unclassified.length } with no signature.`, '', `| ${ SIGNATURE_PARTS.join( ' | ' ) } | rows per client | examples (client, surface, element: draft → live) | Fill reason | owner |`, `|${ '---|'.repeat( SIGNATURE_PARTS.length + 4 ) }` ];
	for ( const g of groups ) {
		const per = Object.entries( g.byClient ).map( ( [ c, n ] ) => `${ c } ${ n }` ).join( ', ' );
		const ex = g.examples.map( ( e ) => `${ e.client } ${ e.surface } ${ cell( e.element ) }: ${ cell( e.draft ) } → ${ cell( e.live ) }` ).join( '<br>' );
		lines.push( `| ${ SIGNATURE_PARTS.map( ( p ) => g.parts[ p ] ).join( ' | ' ) } | ${ per } | ${ ex } | ${ cell( g.reasonText ) } | ${ cell( g.owner ) } |` );
	}
	// Rows with no signature: counted by client, surface and the part that is missing, then the first few in full.
	const missing = ( u ) => SIGNATURE_PARTS.filter( ( p ) => null === u[ p ] || undefined === u[ p ] || '' === u[ p ] ).join( '+' );
	const counts = new Map();
	for ( const u of unclassified ) {
		const k = `${ u.client } ${ u.surface } missing ${ missing( u ) }`;
		counts.set( k, ( counts.get( k ) ?? 0 ) + 1 );
	}
	counts.size && lines.push( '', '## Rows with no signature', '', ...[ ...counts ].sort( ( a, b ) => b[ 1 ] - a[ 1 ] ).map( ( [ k, n ] ) => `- ${ n }  ${ k }` ), '' );
	for ( const u of unclassified.slice( 0, 10 ) ) {
		lines.push( `NO SIGNATURE: ${ u.client } ${ u.surface } ${ u.element } ${ u.kind }:${ u.key } (block ${ u.block }, property ${ u.property }, reason ${ u.reason })` );
	}
	return lines.join( '\n' ) + '\n';
}

// Runs the census over the given clients' folders under `root`.
export function censusAll( { root: repo, clients, db = openDb() } ) {
	const lookup = blockLookup( db );
	const rules = loadRules();
	const all = clients ?? dirs( path.join( repo, 'sites' ) ).filter( ( c ) => fs.existsSync( path.join( repo, 'sites', c, 'build', 'qa' ) ) );
	const surfaces = all.flatMap( ( c ) => clientRows( c, path.join( repo, 'sites', c, 'build', 'qa' ), lookup, rules ) );
	const { groups, unclassified } = groupRows( surfaces.flatMap( ( s ) => s.rows ) );
	return { clients: all, surfaces, groups, unclassified };
}

if ( process.argv[ 1 ] === fileURLToPath( import.meta.url ) ) {
	if ( args.includes( '--help' ) || args.some( ( a ) => a.startsWith( '--' ) && ! [ '--clients', '--root', '--out', '--json', '--check', '--help' ].includes( a ) ) ) {
		console.error( 'usage: node census-all.mjs [--clients a,b] [--root <repo root>] [--out <file>] [--json] [--check]' );
		process.exit( 2 );
	}
	const result = censusAll( { root, clients: flag( '--clients' )?.split( ',' ) ?? null } );
	const summary = { clients: result.clients, surfaces: result.surfaces.length, groups: result.groups, unclassified: result.unclassified };
	const out = flag( '--out' );
	if ( out ) {
		fs.writeFileSync( out, out.endsWith( '.json' ) ? JSON.stringify( summary, null, 1 ) : renderTable( { ...summary, surfaces: result.surfaces.length } ) );
	}
	console.log( args.includes( '--json' ) ? JSON.stringify( summary, null, 1 ) : renderTable( { ...summary, surfaces: result.surfaces.length } ) );
	if ( args.includes( '--check' ) && result.unclassified.length ) {
		process.exit( 1 );
	}
}
