#!/usr/bin/env node
// Lists the rows of saved Fill runs that a block already has a setting for and Fill left unwritten, by family
// (lib/setting-families.mjs). Reads saved files only: each fill-report.json given, and the setting record in the
// client's look.
//   node tools/setting-families.mjs --client <slug> <fill-report.json> [...] [--rows]
// Prints one line per family and report with its row count; --rows prints every row.
import fs from 'node:fs';
import { calibrationsAt } from '../lib/skeleton-context.mjs';
import { settingFamilyRows } from '../lib/setting-families.mjs';

const argv = process.argv.slice( 2 );
const client = argv[ argv.indexOf( '--client' ) + 1 ];
const files = argv.filter( ( a, i ) => a.endsWith( '.json' ) && '--client' !== argv[ i - 1 ] );
if ( ! argv.includes( '--client' ) || ! client || ! files.length ) {
	console.error( 'usage: node tools/setting-families.mjs --client <slug> <fill-report.json> [...] [--rows]' );
	process.exit( 2 );
}
const calFor = calibrationsAt( client );
let total = 0;
for ( const f of files ) {
	const rows = settingFamilyRows( JSON.parse( fs.readFileSync( f, 'utf8' ) ), calFor );
	total += rows.length;
	const by = {};
	rows.forEach( ( r ) => ( by[ r.family ] = ( by[ r.family ] || 0 ) + 1 ) );
	console.log( `${ f }: ${ Object.entries( by ).map( ( [ k, n ] ) => `${ k } ${ n }` ).join( ', ' ) || 'none' }` );
	argv.includes( '--rows' ) && rows.forEach( ( r ) => console.log( `  ${ r.family } ${ r.node } ${ r.block } ${ r.slot || '(root)' } ${ r.property }: ${ r.value } (${ r.via })` ) );
}
console.log( `${ total } rows` );
