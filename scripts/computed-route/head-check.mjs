// The draft head check (Spec 48 FR-48-84): reads every entry draft's head through the census and checks it against
// the client's theme snapshot (fonts) and, given a page address, the live page's head.
//   node head-check.mjs <client> [--repo <root>] [--url <page address> [--site-title <confirmed title>]]
// Prints each problem; exits 1 when there is one.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { staticCensus } from './lib/intake-census.mjs';
import { loadExport } from './lib/intake-routing.mjs';
import { readHead } from './lib/intake-head.mjs';
import { fontCheck, headCheck, loadedFamilies } from './lib/head-check.mjs';

const args = process.argv.slice( 2 );
const opt = ( name ) => ( args.includes( name ) ? args[ args.indexOf( name ) + 1 ] : null );
const client = args.find( ( a, i ) => ! a.startsWith( '--' ) && ! args[ i - 1 ]?.startsWith( '--' ) );
if ( ! client ) {
	console.error( 'usage: node head-check.mjs <client> [--repo <root>] [--url <page address> [--site-title <title>]]' );
	process.exit( 2 );
}
const repo = opt( '--repo' ) || path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../..' );
const folder = path.join( repo, 'sites', client, 'handoff' );
const snapshotFile = path.join( repo, 'sites', client, 'theme-snapshot.json' );

// The census replays the export from intake's recorded network file (the newest in build/intake/replay).
const replayDir = path.join( repo, 'sites', client, 'build', 'intake', 'replay' );
const harPath = fs.existsSync( replayDir ) ? fs.readdirSync( replayDir ).filter( ( f ) => f.endsWith( '.har' ) ).map( ( f ) => path.join( replayDir, f ) )
	.sort( ( a, b ) => fs.statSync( b ).mtimeMs - fs.statSync( a ).mtimeMs )[ 0 ] : null;
if ( ! harPath ) {
	console.error( `no replay file in ${ replayDir }: run intake.mjs ${ client } --record first` );
	process.exit( 2 );
}
const head = { fonts: [], preconnects: [], metas: [], titles: [], unhandled: [] };
for ( const entry of loadExport( folder ).entries ) {
	const h = readHead( await staticCensus( { folder, entry, harPath } ) );
	Object.keys( head ).forEach( ( k ) => head[ k ].push( ...h[ k ] ) );
}
console.log( `fonts loaded: ${ loadedFamilies( head ).map( ( f ) => `${ f.family } ${ f.weights.join( '/' ) }${ f.italic ? ' italic' : '' }` ).join( '; ' ) || 'none' }` );
console.log( `titles: ${ head.titles.map( ( t ) => t.text ).join( ' | ' ) || 'none' }` );
const problems = [];
if ( fs.existsSync( snapshotFile ) ) {
	problems.push( ...fontCheck( head, JSON.parse( fs.readFileSync( snapshotFile, 'utf8' ) ) ) );
} else {
	problems.push( `no theme snapshot at ${ snapshotFile }` );
}
problems.push( ...head.unhandled.map( ( u ) => `${ u.draftId }: ${ u.line }` ) );
const url = opt( '--url' );
if ( url ) {
	const res = await fetch( url, { headers: { 'User-Agent': 'Mozilla/5.0 SGS head-check' } } );
	problems.push( ...headCheck( head, await res.text(), { siteTitle: opt( '--site-title' ) } ) );
}
problems.forEach( ( p ) => console.log( `PROBLEM ${ p }` ) );
console.log( problems.length ? `${ problems.length } problem${ 1 === problems.length ? '' : 's' }` : 'head check passes' );
process.exit( problems.length ? 1 : 0 );
