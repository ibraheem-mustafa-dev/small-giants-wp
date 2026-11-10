/**
 * Writes `schemas/media-slot.schema.json` (Spec 49 FR-49-34): the one JSON Schema of a media slot that the cloner and
 * `scripts/wp-build-page.js` write through. Built from the adopted settings (`ADOPTED_SETTINGS`) and the value shapes in
 * `scripts/data/media-slot-properties.json` by `scripts/lib/media-slot-schema.mjs`.
 *
 * USAGE
 *   node scripts/generate-media-slot-schema.mjs             # write
 *   node scripts/generate-media-slot-schema.mjs --check     # fail when the file differs from a run
 *   node scripts/generate-media-slot-schema.mjs --self-test
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { buildSchema } from './lib/media-slot-schema.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const PLUGIN_DIR = path.resolve( HERE, '..' );
const OUT_FILE = path.join( PLUGIN_DIR, 'schemas', 'media-slot.schema.json' );
const SHAPES_FILE = path.join( HERE, 'data', 'media-slot-properties.json' );

async function adoptedSettings() {
	const mod = await import( pathToFileURL( path.join( PLUGIN_DIR, 'src', 'components', 'media', 'emit', 'adopted-settings.js' ) ).href );
	return Object.values( mod.ADOPTED_SETTINGS ).flat();
}

async function render() {
	const shapes = JSON.parse( fs.readFileSync( SHAPES_FILE, 'utf8' ) );
	return JSON.stringify( buildSchema( await adoptedSettings(), shapes ), null, '\t' ) + '\n';
}

function selfTest() {
	let failed = 0;
	const ck = ( name, ok ) => {
		console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ name }` );
		failed += ok ? 0 : 1;
	};
	const set = [ { base: 'Fit', type: 'string', responsive: true, role: 'visual' }, { base: 'Alt', type: 'string', responsive: false, role: 'image-alt' } ];
	const shapes = { Fit: { type: 'string', enum: [ 'cover' ] }, Alt: { type: 'string' } };
	const s = buildSchema( set, shapes );
	ck( 'a responsive base is a tier object', 'object' === s.$defs.Fit.type && s.$defs.Fit.properties.mobile.enum[ 0 ] === 'cover' );
	ck( 'a plain base is its value shape', 'string' === s.$defs.Alt.type );
	const throws = ( fn ) => { try { fn(); return false; } catch ( e ) { return true; } };
	ck( 'a base with no shape fails', throws( () => buildSchema( set, { Fit: shapes.Fit } ) ) );
	ck( 'a shape for a base nothing adopts fails', throws( () => buildSchema( set, { ...shapes, Nope: { type: 'string' } } ) ) );
	ck( 'a type clash fails', throws( () => buildSchema( set, { Fit: { type: 'number' }, Alt: shapes.Alt } ) ) );
	process.exit( failed ? 1 : 0 );
}

async function main() {
	const arg = process.argv[ 2 ];
	if ( '--self-test' === arg ) {
		selfTest();
		return;
	}
	const next = await render();
	if ( '--check' === arg ) {
		const current = fs.existsSync( OUT_FILE ) ? fs.readFileSync( OUT_FILE, 'utf8' ) : '';
		if ( current !== next ) {
			console.error( 'schemas/media-slot.schema.json is stale; run node scripts/generate-media-slot-schema.mjs' );
			process.exit( 1 );
		}
		console.log( 'media-slot.schema.json is current' );
		return;
	}
	fs.mkdirSync( path.dirname( OUT_FILE ), { recursive: true } );
	fs.writeFileSync( OUT_FILE, next );
	console.log( `wrote ${ path.relative( PLUGIN_DIR, OUT_FILE ) }` );
}

main().catch( ( e ) => {
	console.error( e.message );
	process.exit( 1 );
} );
