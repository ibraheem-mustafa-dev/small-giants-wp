#!/usr/bin/env node
// The per-draft Custom CSS log (Spec 48 FR-48-109, ruling F): merges every surface's latest Fill report's Custom CSS rules and
// refusals into sites/<client>/build/qa/custom-css-log.json and .md, and with --check exits 1 when a written rule has no
// justification (lib/custom-css-log.mjs::unjustifiedRules).
//   node scripts/computed-route/custom-css-log.mjs --client <slug> [--build <dir>] [--check]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeCustomCssLog } from './lib/custom-css-log.mjs';

const argv = process.argv.slice( 2 );
const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
const client = flag( '--client' );
if ( ! client ) {
	console.error( 'usage: custom-css-log.mjs --client <slug> [--build <dir>] [--check]' );
	process.exit( 2 );
}
const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..' );
const buildDir = path.resolve( flag( '--build' ) ?? path.join( root, 'sites', client, 'build' ) );
const { log, bad, files } = writeCustomCssLog( { client, buildDir } );
console.log( `${ log.rules.length } rule(s), ${ log.refused.length } refused, ${ bad.length } unjustified: ${ files.join( ', ' ) }` );
bad.forEach( ( r ) => console.error( `UNJUSTIFIED ${ r.surface } ${ r.node } ${ r.block } ${ r.part || 'root' } ${ r.declarations.join( '; ' ) }: ${ r.problems.join( '; ' ) }` ) );
log.unreadable.forEach( ( u ) => console.error( `UNREADABLE ${ u }` ) );
process.exit( argv.includes( '--check' ) && ( bad.length || log.unreadable.length ) ? 1 : 0 );
