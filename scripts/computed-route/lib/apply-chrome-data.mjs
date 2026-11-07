// Client data the chrome and drawer families read (sites/<client>/build/): `logo-svgparts.json`, the logo's SVG part animation as
// block attributes under `attributes`; and `skeleton/*.inventory.json`, the draft's elements with their boxes at each width
// (`inventory`: every file's `elements`, in file order). A client without a file gets no-setting rows, never a guess.
import fs from 'node:fs';
import path from 'node:path';

const readJson = ( f ) => ( fs.existsSync( f ) ? JSON.parse( fs.readFileSync( f, 'utf8' ) ) : null );

export function loadClientData( repo, client ) {
	const dir = path.join( repo, 'sites', client, 'build' );
	const skeletonDir = path.join( dir, 'skeleton' );
	const files = fs.existsSync( skeletonDir ) ? fs.readdirSync( skeletonDir ).filter( ( f ) => f.endsWith( '.inventory.json' ) ).sort() : [];
	return {
		logo: readJson( path.join( dir, 'logo-svgparts.json' ) )?.attributes ?? null,
		inventory: files.flatMap( ( f ) => readJson( path.join( skeletonDir, f ) )?.elements ?? [] ),
	};
}
