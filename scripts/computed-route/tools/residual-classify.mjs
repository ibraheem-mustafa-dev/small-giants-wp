#!/usr/bin/env node
// Classifies a Fill run's UNMAPPED rows the way the residual Custom CSS pass does (lib/fill-residual-css.mjs::classifyRow):
// residual (class a: all five equivalence layers failed and no setting paints it on that part), route (class b: a setting
// paints or reaches it, or the row is a shape, pairing, reach or conflict verdict), unneeded (class c: held, inert or an
// unpainted initial value) and outside (content, motion and walker rows). Reads the run's unmapped.json, the route's
// calibration cache and the framework DB; contacts no site and writes nothing.
//   node scripts/computed-route/tools/residual-classify.mjs <run folder or unmapped.json> [...] --paint-site <site> [--rows <class>] [--json]
import fs from 'fs';
import path from 'path';
import { classifyRow } from '../lib/fill-residual-css.mjs';
import { calibrationForSite } from '../solve.mjs';
import { openDb } from '../lib/db.mjs';

const argv = process.argv.slice( 2 );
const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
const site = flag( '--paint-site' );
const files = argv.filter( ( a, i ) => ! a.startsWith( '--' ) && ! [ '--paint-site', '--rows' ].includes( argv[ i - 1 ] ) );
if ( ! site || ! files.length ) {
	console.error( 'usage: residual-classify.mjs <run folder or unmapped.json> [...] --paint-site <site> [--rows <class>] [--json]' );
	process.exit( 2 );
}
const calFor = calibrationForSite( site );
const db = openDb();
const report = [];
for ( const f of files ) {
	const file = fs.statSync( f ).isDirectory() ? path.join( f, 'unmapped.json' ) : f;
	const rows = JSON.parse( fs.readFileSync( file, 'utf8' ) ).flatMap( ( r ) => ( r.nodes?.length > 1 ? r.nodes.map( ( node ) => ( { ...r, node } ) ) : [ r ] ) );
	const counts = { residual: 0, route: 0, unneeded: 0, outside: 0 };
	const causes = {};
	const listed = [];
	for ( const r of rows ) {
		const { cls, cause } = classifyRow( r, { calFor, db } );
		counts[ cls ]++;
		const key = `${ cls } | ${ cause.split( ':' )[ 0 ] }`;
		causes[ key ] = ( causes[ key ] || 0 ) + 1;
		flag( '--rows' ) === cls && listed.push( { node: r.node, block: r.block, slot: r.slot, property: r.property, state: r.state, value: r.value, cause } );
	}
	report.push( { file, rows: rows.length, counts, causes, listed } );
}
if ( argv.includes( '--json' ) ) {
	console.log( JSON.stringify( report, null, 1 ) );
} else {
	for ( const r of report ) {
		console.log( `${ r.file }: ${ r.rows } rows; residual (a) ${ r.counts.residual }, route (b) ${ r.counts.route }, unneeded (c) ${ r.counts.unneeded }, outside ${ r.counts.outside }` );
		Object.entries( r.causes ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] ).forEach( ( [ k, v ] ) => console.log( `  ${ String( v ).padStart( 4 ) }  ${ k }` ) );
		r.listed.forEach( ( x ) => console.log( `    ${ x.node } ${ x.block } [${ x.slot }] ${ x.property }${ x.state ? `:${ x.state }` : '' } = ${ String( x.value ).slice( 0, 60 ) }  (${ x.cause.slice( 0, 110 ) })` ) );
	}
}
