#!/usr/bin/env node
// Origin command (Spec 48 route-accuracy R4): the exact draft identity of a committed tree's blocks.
//   node scripts/computed-route/origin.mjs --client <slug> --surface <s> [--skeleton <file>] [--tree <file>]
// Aligns the skeleton writer's skeleton (default `sites/<client>/build/skeleton/<surface>.skeleton.json`) with the
// surface's committed tree (default its `surfaces.json` tree) by block names, level by level
// (lib/identity.mjs::originFromSkeleton), and writes `sites/<client>/build/<surface>.origin.json` (cr-ref to tpl key and
// fingerprint, the shape Fill writes for a tree it builds), each entry stamped with the draft hash of the handoff's
// MANIFEST.json (lib/origin-file.mjs; pairing refuses an origin from another export). A list block (one rendering a list
// from an array attribute: the framework DB's array_item_schema) takes its run's parent element through the surface's
// skeleton inventory (`skeleton/<surface>.inventory.json`), never its first item. Prints the counts and every unaligned
// block with why.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { originFromSkeleton } from './lib/identity.mjs';
import { draftHashOf, stampOrigin } from './lib/origin-file.mjs';
import { openDb } from './lib/db.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	const client = flag( '--client' );
	const surface = flag( '--surface' );
	if ( ! client || ! surface ) {
		console.error( 'usage: origin.mjs --client <slug> --surface <s> [--skeleton <file>] [--tree <file>]' );
		process.exit( 2 );
	}
	const buildDir = path.join( REPO, 'sites', client, 'build' );
	const entry = JSON.parse( fs.readFileSync( path.join( buildDir, 'surfaces.json' ), 'utf8' ) )[ surface ];
	const skeleton = JSON.parse( fs.readFileSync( flag( '--skeleton' ) || path.join( buildDir, 'skeleton', `${ surface }.skeleton.json` ), 'utf8' ) );
	const tree = JSON.parse( fs.readFileSync( flag( '--tree' ) || path.join( buildDir, entry.tree ), 'utf8' ) );
	const invFile = path.join( buildDir, 'skeleton', `${ surface }.inventory.json` );
	const inventory = fs.existsSync( invFile ) ? JSON.parse( fs.readFileSync( invFile, 'utf8' ) ) : null;
	const db = openDb();
	const listBlocks = new Set( db.prepare( 'SELECT DISTINCT block_slug FROM array_item_schema' ).all().map( ( r ) => r.block_slug ) );
	db.close();
	const { origin, unaligned } = originFromSkeleton( skeleton, tree, { inventory, listBlocks } );
	const manifestFile = path.join( REPO, entry.draftDir || path.join( 'sites', client, 'handoff' ), 'MANIFEST.json' );
	const hash = fs.existsSync( manifestFile ) ? draftHashOf( JSON.parse( fs.readFileSync( manifestFile, 'utf8' ) ) ) : null;
	fs.writeFileSync( path.join( buildDir, `${ surface }.origin.json` ), `${ JSON.stringify( hash ? stampOrigin( origin, hash ) : origin, null, 2 ) }\n` );
	hash || console.log( `no draft hash: ${ manifestFile } lists no .dc.html template, so the origin is unstamped` );
	console.log( `origin ${ surface }: ${ Object.keys( origin ).length } blocks with an identity, ${ unaligned.length } without` );
	unaligned.forEach( ( u ) => console.log( `  ${ u.ref } ${ u.block }: ${ u.why }` ) );
}
