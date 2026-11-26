// Client data the chrome and drawer families read (sites/<client>/build/): `logo-svgparts.json`, the logo's SVG part animation as
// block attributes under `attributes`; and `skeleton/*.inventory.json`, the draft's elements with their boxes at each width
// (`inventory`: every file's `elements`, in file order). A client without a file gets no-setting rows, never a guess.
import fs from 'node:fs';
import path from 'node:path';

const readJson = ( f ) => ( fs.existsSync( f ) ? JSON.parse( fs.readFileSync( f, 'utf8' ) ) : null );

// The client's logo part animation file (sites/<client>/build/<LOGO_PARTS>): when it exists the apply stage owns the logo's
// inline SVG and part motion (lib/apply-chrome-logo.mjs::LOGO_INLINE).
export const LOGO_PARTS = 'logo-svgparts.json';

export function loadClientData( repo, client ) {
	const dir = path.join( repo, 'sites', client, 'build' );
	const skeletonDir = path.join( dir, 'skeleton' );
	const files = fs.existsSync( skeletonDir ) ? fs.readdirSync( skeletonDir ).filter( ( f ) => f.endsWith( '.inventory.json' ) ).sort() : [];
	return {
		logo: readJson( path.join( dir, LOGO_PARTS ) )?.attributes ?? null,
		inventory: files.flatMap( ( f ) => readJson( path.join( skeletonDir, f ) )?.elements ?? [] ),
	};
}
