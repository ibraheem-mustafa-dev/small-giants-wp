// The surfaces manifest generator (Spec 48 section 2): sites/<client>/build/surfaces.json from the confirmed page map.
//   node manifest.mjs <client> --site <secrets name, e.g. indus-test> [--apply] [--repo <root>] [--db <framework db>] [--only <key,key>]
// Without --apply it prints the entries it would write and every row it could not settle, and writes nothing. With
// --apply it writes surfaces.json (entries already there keep every field they have). Exit 0 done, 1 a row with a match
// rule left unresolved, 2 usage or an input it cannot use.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildManifest, surfaceKey } from './lib/manifest-build.mjs';
import { openDb } from './lib/db.mjs';
import { readPageMap } from './lib/site-build-map.mjs';
import { stateRows } from './lib/state-vocab.mjs';

const USAGE = 'usage: node manifest.mjs <client> --site <site> [--apply] [--repo <root>] [--db <file>] [--only <key,key>]';
const usage = ( why ) => {
	console.error( `${ why }\n${ USAGE }` );
	process.exit( 2 );
};

// Flags with a value, flags without, and the one positional (the client).
const VALUE_FLAGS = [ '--site', '--repo', '--db', '--only' ];
const BOOLEAN_FLAGS = [ '--apply' ];
const given = {};
const positional = [];
const argv = process.argv.slice( 2 );
for ( let i = 0; i < argv.length; i++ ) {
	const a = argv[ i ];
	if ( VALUE_FLAGS.includes( a ) ) {
		const value = argv[ i + 1 ];
		( undefined === value || value.startsWith( '--' ) ) && usage( `${ a } needs a value` );
		given[ a ] = value;
		i++;
	} else if ( BOOLEAN_FLAGS.includes( a ) ) {
		given[ a ] = true;
	} else if ( a.startsWith( '--' ) ) {
		usage( `unknown option ${ a }` );
	} else {
		positional.push( a );
	}
}
positional.length > 1 && usage( `unexpected argument "${ positional[ 1 ] }" (the client is the only positional argument)` );
const client = positional[ 0 ];
const site = given[ '--site' ];
! client && usage( 'the client is missing' );
! site && usage( '--site is missing' );

const here = path.dirname( fileURLToPath( import.meta.url ) );
const repo = given[ '--repo' ] || path.resolve( here, '../..' );
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
	const vocab = stateRows( given[ '--db' ] ? openDb( given[ '--db' ] ) : null );
	if ( ! vocab.length ) {
		throw new Error( 'the states table of the framework DB has no rows: reseed it (sgs-update-v2.py) so state looks can be read' );
	}
	const outFile = path.join( dir, 'build', 'surfaces.json' );
	const keep = optional( outFile ) || {};
	const rows = readPageMap( path.join( dir, 'build', 'page-map.json' ) );
	const only = given[ '--only' ] ? given[ '--only' ].split( ',' ).filter( Boolean ) : null;
	if ( only ) {
		const valid = rows.filter( ( r ) => null != r.id ).map( surfaceKey );
		const unknown = only.filter( ( k ) => ! valid.includes( k ) );
		unknown.length && usage( `--only names ${ unknown.join( ', ' ) }, which no page-map row with an id generates; valid keys: ${ valid.join( ', ' ) }` );
	}
	const result = buildManifest( {
		client,
		site,
		rows,
		only,
		records: readJson( path.join( dir, 'handoff', 'surfaces.json' ) ).records,
		intake: optional( path.join( dir, 'build', 'intake', 'intake.json' ) ),
		target,
		entryFile: drafts[ 0 ],
		vocab,
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
	result.stale.forEach( ( k ) => console.log( `stale ${ k }: in surfaces.json but not in the page map (kept)` ) );
	result.skipped.forEach( ( s ) => console.log( `skipped ${ s.row }: ${ s.reason }` ) );
	result.disagree.forEach( ( d ) => console.log( `states-disagree ${ d.key }: handoff [${ d.handoff.join( ' | ' ) }] intake [${ d.intake.join( ' | ' ) }]` ) );
	result.unresolved.forEach( ( u ) => console.log( `${ u.reason } ${ u.key }: ${ u.why }` ) );
	if ( given[ '--apply' ] ) {
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
