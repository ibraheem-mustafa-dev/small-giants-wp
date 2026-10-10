#!/usr/bin/env node
// Origin command (Spec 47 route-accuracy R4): the exact draft identity of a committed tree's blocks.
//   node scripts/computed-route/origin.mjs --client <slug> --surface <s> [--skeleton <file>] [--tree <file>]
// Aligns the skeleton writer's skeleton (default `sites/<client>/build/skeleton/<surface>.skeleton.json`) with the
// surface's committed tree (default its `surfaces.json` tree) by block names, level by level
// (lib/identity.mjs::originFromSkeleton), and writes `sites/<client>/build/<surface>.origin.json` (cr-ref to tpl key and
// fingerprint, the shape Fill writes for a tree it builds). Prints the counts and every unaligned block with why.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { originFromSkeleton } from './lib/identity.mjs';

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
	const { origin, unaligned } = originFromSkeleton( skeleton, tree );
	fs.writeFileSync( path.join( buildDir, `${ surface }.origin.json` ), `${ JSON.stringify( origin, null, 2 ) }\n` );
	console.log( `origin ${ surface }: ${ Object.keys( origin ).length } blocks with an identity, ${ unaligned.length } without` );
	unaligned.forEach( ( u ) => console.log( `  ${ u.ref } ${ u.block }: ${ u.why }` ) );
}
