#!/usr/bin/env node
// The palette answer keys for tests/palette-keys.test.mjs (Spec 48 FR-48-31), each token → the slugs it holds, read
// from its source and written to tests/fixtures/palette-keys/<client>.json:
//   node scripts/computed-route/tools/palette-keys.mjs [--check]
// - from-marks: Bean's marks in sites/<client>/build/intake/review.md's palette table (accept = the proposed role
//   column, role:a,b = those slugs, one-off = none).
// - from-snapshot: sites/<client>/theme-snapshot.json settings.color.palette: a slug goes to every colour token of
//   sites/<client>/handoff/tokens whose value equals the entry's colour.
// - ruled: a client with no written source (Bean's ruling in the session that built the key): the fixture is the source
//   and is never rewritten.
// --check writes nothing and exits 1 when a derived fixture differs from the one on disk.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readTokens } from '../lib/tokens.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const REPO = path.resolve( HERE, '..', '..', '..' );
export const KEYS_DIR = path.join( HERE, '..', 'tests', 'fixtures', 'palette-keys' );
export const KEYS = {
	'indus-foods': { source: 'from-marks' },
	'eye-care-ward-end': { source: 'from-snapshot' },
	'mamas-munches-redesign': { source: 'ruled' },
};

const colourTokens = ( client ) => readTokens( path.join( REPO, 'sites', client, 'handoff' ) ).tokens.filter( ( t ) => 'colour' === t.type && t.hex );

// Bean's palette marks: token → slugs.
export function fromMarks( client ) {
	const text = fs.readFileSync( path.join( REPO, 'sites', client, 'build', 'intake', 'review.md' ), 'utf8' );
	const roles = {};
	for ( const line of text.split( '\n' ) ) {
		const cells = line.split( '|' ).map( ( c ) => c.trim() );
		const m = /^`palette:(--[\w-]+)`$/.exec( cells[ 1 ] || '' );
		if ( ! m ) {
			continue;
		}
		const [ proposed, mark ] = [ cells[ 3 ], cells[ 5 ] ];
		const slugs = ( s ) => ( /^role:/.test( s ) ? s.slice( 5 ).split( ',' ).map( ( x ) => x.trim() ) : [] );
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

export function derive( client ) {
	const how = KEYS[ client ].source;
	return 'from-marks' === how ? fromMarks( client ) : 'from-snapshot' === how ? fromSnapshot( client ) : null;
}

const file = ( client ) => path.join( KEYS_DIR, `${ client }.json` );

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const check = process.argv.includes( '--check' );
	let bad = 0;
	for ( const client of Object.keys( KEYS ) ) {
		const roles = derive( client );
		if ( ! roles ) {
			continue;
		}
		const out = `${ JSON.stringify( { client, source: KEYS[ client ].source, roles }, null, '\t' ) }\n`;
		if ( check ) {
			const same = fs.existsSync( file( client ) ) && fs.readFileSync( file( client ), 'utf8' ) === out;
			bad += same ? 0 : 1;
			console.log( `${ client }: ${ same ? 'matches its source' : 'DIFFERS from its source' }` );
		} else {
			fs.mkdirSync( KEYS_DIR, { recursive: true } );
			fs.writeFileSync( file( client ), out );
			console.log( `${ client }: wrote ${ path.relative( REPO, file( client ) ) } (${ Object.keys( roles ).length } tokens)` );
		}
	}
	process.exitCode = bad ? 1 : 0;
}
