// Client data the chrome family reads (sites/<client>/build/): `logo-svgparts.json`, the logo's SVG part animation as block
// attributes under `attributes`. A client without the file gets no-setting rows from the family, never a guess.
import fs from 'node:fs';
import path from 'node:path';

const readJson = ( f ) => ( fs.existsSync( f ) ? JSON.parse( fs.readFileSync( f, 'utf8' ) ) : null );

export function loadClientData( repo, client ) {
	const dir = path.join( repo, 'sites', client, 'build' );
	return {
		logo: readJson( path.join( dir, 'logo-svgparts.json' ) )?.attributes ?? null,
	};
}
