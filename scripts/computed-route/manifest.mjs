// The surfaces manifest generator (Spec 48 section 2): sites/<client>/build/surfaces.json from the confirmed page map.
//   node manifest.mjs <client> --site <secrets name, e.g. indus-test> [--apply] [--repo <root>]
// Without --apply it prints the entries it would write and every row it could not settle, and writes nothing. With
// --apply it writes surfaces.json (entries already there keep every field they have). Exit 0 done, 1 a row with a match rule
// left unresolved, 2 usage.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildManifest } from './lib/manifest-build.mjs';
import { readPageMap } from './lib/site-build-map.mjs';
import { stateRows } from './lib/state-vocab.mjs';

const args = process.argv.slice( 2 );
const opt = ( name ) => ( args.includes( name ) ? args[ args.indexOf( name ) + 1 ] : null );
const client = args.find( ( a, i ) => ! a.startsWith( '--' ) && ! args[ i - 1 ]?.startsWith( '--' ) );
const site = opt( '--site' );
if ( ! client || ! site ) {
	console.error( 'usage: node manifest.mjs <client> --site <site> [--apply] [--repo <root>]' );
	process.exit( 2 );
}
const here = path.dirname( fileURLToPath( import.meta.url ) );
const repo = opt( '--repo' ) || path.resolve( here, '../..' );
const dir = path.join( repo, 'sites', client );
const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );
const optional = ( file ) => ( fs.existsSync( file ) ? readJson( file ) : null );

try {
	const target = readJson( path.join( here, 'calibration-targets.json' ) )[ site ];
	if ( ! target?.envFile || ! target?.envKey ) {
		throw new Error( `calibration-targets.json has no envFile and envKey for ${ site }` );
	}
	const drafts = readJson( path.join( dir, 'handoff', 'MANIFEST.json' ) ).entry_drafts || [];
	if ( 1 !== drafts.length ) {
		throw new Error( `handoff/MANIFEST.json entry_drafts names ${ drafts.length } files; exactly one is needed` );
	}
	const outFile = path.join( dir, 'build', 'surfaces.json' );
	const keep = optional( outFile ) || {};
	const result = buildManifest( {
		client,
		site,
		rows: readPageMap( path.join( dir, 'build', 'page-map.json' ) ),
		records: readJson( path.join( dir, 'handoff', 'surfaces.json' ) ).records,
		intake: optional( path.join( dir, 'build', 'intake', 'intake.json' ) ),
		target,
		entryFile: drafts[ 0 ],
		vocab: stateRows(),
		existing: keep,
	} );
	console.log( 'key | post id | canvas | states' );
	for ( const [ key, e ] of Object.entries( result.entries ) ) {
		const states = Object.entries( e.states ).map( ( [ k, v ] ) => `${ k }=${ v ?? 'null' }` ).join( ', ' );
		console.log( `${ key } | ${ e.target.postId } | ${ e.canvas ? 'yes' : 'no' } | ${ states }` );
	}
	Object.entries( result.added ).forEach( ( [ key, f ] ) => console.log( `added to existing ${ key }: ${ f.join( ', ' ) }` ) );
	result.unmatched.forEach( ( u ) => console.log( `${ u.reason } ${ u.key }: ${ u.why }` ) );
	result.pointer.forEach( ( d ) => console.log( `states-pointer ${ d.key }: ${ d.name }` ) );
	result.dropped.forEach( ( d ) => console.log( `states-dropped ${ d.key }: ${ d.name }` ) );
	result.skipped.forEach( ( s ) => console.log( `skipped ${ s.row }: ${ s.reason }` ) );
	result.disagree.forEach( ( d ) => console.log( `states-disagree ${ d.key }: handoff [${ d.handoff.join( ' | ' ) }] intake [${ d.intake.join( ' | ' ) }]` ) );
	result.unresolved.forEach( ( u ) => console.log( `${ u.reason } ${ u.key }: ${ u.why }` ) );
	if ( args.includes( '--apply' ) ) {
		fs.writeFileSync( `${ outFile }.tmp`, `${ JSON.stringify( { ...keep, ...result.entries }, null, 2 ) }\n` );
		fs.renameSync( `${ outFile }.tmp`, outFile );
		console.log( `wrote ${ path.relative( repo, outFile ) } (${ Object.keys( result.entries ).length } entries)` );
	} else {
		console.log( 'dry run: re-run with --apply to write' );
	}
	process.exit( result.unresolved.length ? 1 : 0 );
} catch ( e ) {
	console.error( `STOP ${ e.message }` );
	process.exit( 2 );
}
