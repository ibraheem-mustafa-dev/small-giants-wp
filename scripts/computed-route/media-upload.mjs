// Media upload to an ID map (Spec 48 FR-48-58): lib/media-upload.mjs over one client and one site.
//   node media-upload.mjs <client> --site <secrets name, e.g. indus-test> [--apply] [--repo <root>]
// Without --apply it lists what it would upload (reading the site only to check the mapped attachments are live);
// with --apply it uploads and writes sites/<client>/build/media-map.json. Exit 0 done, 1 failure, 2 usage.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readMap, siteCredentials, uploadMedia } from './lib/media-upload.mjs';

const args = process.argv.slice( 2 );
const opt = ( name ) => ( args.includes( name ) ? args[ args.indexOf( name ) + 1 ] : null );
const client = args.find( ( a, i ) => ! a.startsWith( '--' ) && ! args[ i - 1 ]?.startsWith( '--' ) );
const site = opt( '--site' );
if ( ! client || ! site ) {
	console.error( 'usage: node media-upload.mjs <client> --site <site> [--apply] [--repo <root>]' );
	process.exit( 2 );
}
const repo = opt( '--repo' ) || path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../..' );
const mapFile = path.join( repo, 'sites', client, 'build', 'media-map.json' );
const apply = args.includes( '--apply' );
try {
	const r = await uploadMedia( { repo, client, site, map: readMap( mapFile ), creds: siteCredentials( repo, site ), apply, log: console.log } );
	if ( apply ) {
		fs.mkdirSync( path.dirname( mapFile ), { recursive: true } );
		fs.writeFileSync( mapFile, `${ JSON.stringify( r.map, null, '\t' ) }\n` );
	}
	r.wouldUpload.forEach( ( a ) => console.log( `would upload ${ a }` ) );
	r.sanitised.forEach( ( a ) => console.log( `REVIEW ${ a }: the SVG upload sanitiser changed the file (svg-upload.php); compare the stored attachment with the asset` ) );
	console.log( `${ r.uploaded.length } uploaded, ${ r.skipped.length } already live, ${ r.wouldUpload.length } to upload${ apply ? `; map ${ path.relative( repo, mapFile ) }` : ' (dry run: re-run with --apply)' }` );
} catch ( e ) {
	if ( apply && e.map ) {
		fs.mkdirSync( path.dirname( mapFile ), { recursive: true } );
		fs.writeFileSync( mapFile, `${ JSON.stringify( e.map, null, '\t' ) }\n` );
		console.error( `the map holds the files uploaded before the failure: ${ path.relative( repo, mapFile ) }` );
	}
	console.error( `FAILED: ${ e.message }` );
	process.exit( 1 );
}
