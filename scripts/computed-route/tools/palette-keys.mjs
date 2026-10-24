#!/usr/bin/env node
// A client's palette answer key for tests/palette-keys.test.mjs (Spec 48 FR-48-31): each colour token → the slugs it
// holds, read from its source and written to sites/<client>/build/intake/palette-key.json:
//   node scripts/computed-route/tools/palette-keys.mjs <client> --from-marks|--from-snapshot [--check]
// - --from-marks: Bean's marks in sites/<client>/build/intake/review.md's palette table (accept = the proposed role
//   column, role:a,b = those slugs, one-off = none).
// - --from-snapshot: sites/<client>/theme-snapshot.json settings.color.palette: a slug goes to every colour token of
//   sites/<client>/handoff/tokens whose value equals the entry's colour.
// A key with no written source (Bean's ruling) is written by hand with `source: 'ruled'` and never derived.
// --check writes nothing and exits 1 when the derived key differs from the file.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readTokens } from '../lib/tokens.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const REPO = path.resolve( HERE, '..', '..', '..' );
export const keyFile = ( client ) => path.join( REPO, 'sites', client, 'build', 'intake', 'palette-key.json' );

const colourTokens = ( client ) => readTokens( path.join( REPO, 'sites', client, 'handoff' ) ).tokens.filter( ( t ) => 'colour' === t.type && t.hex );

// Bean's palette marks: token → slugs.
export function fromMarks( client ) {
	const text = fs.readFileSync( path.join( REPO, 'sites', client, 'build', 'intake', 'review.md' ), 'utf8' );
	const roles = {};
	const slugs = ( s ) => ( /^role:/.test( s ) ? s.slice( 5 ).split( ',' ).map( ( x ) => x.trim() ) : [] );
	for ( const line of text.split( '\n' ) ) {
		const cells = line.split( '|' ).map( ( c ) => c.trim() );
		const m = /^`palette:(--[\w-]+)`$/.exec( cells[ 1 ] || '' );
		if ( ! m ) {
			continue;
		}
		const [ proposed, mark ] = [ cells[ 3 ], cells[ 5 ] ];
		if ( 'accept' === mark ) {
			roles[ m[ 1 ] ] = slugs( proposed );
		} else if ( 'one-off' === mark ) {
			roles[ m[ 1 ] ] = [];
		} else if ( /^role:/.test( mark ) ) {
			roles[ m[ 1 ] ] = slugs( mark );
		} else {
			throw new Error( `${ client }: ${ m[ 1 ] } has no mark (${ JSON.stringify( mark ) })` );
		}
	}
	return roles;
}

// The built site's palette: token → the snapshot slugs whose colour equals the token's value.
export function fromSnapshot( client ) {
	const snap = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', client, 'theme-snapshot.json' ), 'utf8' ) );
	const roles = {};
	for ( const t of colourTokens( client ) ) {
		roles[ t.name ] = snap.settings.color.palette.filter( ( p ) => String( p.color ).toUpperCase() === t.hex.toUpperCase() ).map( ( p ) => p.slug );
	}
	return roles;
}

export const derive = ( client, source ) => ( 'from-marks' === source ? fromMarks( client ) : 'from-snapshot' === source ? fromSnapshot( client ) : null );

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const args = process.argv.slice( 2 );
	const client = args.find( ( a ) => ! a.startsWith( '--' ) );
	const source = [ 'from-marks', 'from-snapshot' ].find( ( s ) => args.includes( `--${ s }` ) );
	if ( ! client || ! source ) {
		console.error( 'usage: node scripts/computed-route/tools/palette-keys.mjs <client> --from-marks|--from-snapshot [--check]' );
		process.exit( 2 );
	}
	const out = `${ JSON.stringify( { client, source, roles: derive( client, source ) }, null, '\t' ) }\n`;
	if ( args.includes( '--check' ) ) {
		const same = fs.existsSync( keyFile( client ) ) && fs.readFileSync( keyFile( client ), 'utf8' ) === out;
		console.log( `${ client }: ${ same ? 'matches its source' : 'DIFFERS from its source' }` );
		process.exitCode = same ? 0 : 1;
	} else {
		fs.writeFileSync( keyFile( client ), out );
		console.log( `${ client }: wrote ${ path.relative( REPO, keyFile( client ) ) }` );
	}
}
