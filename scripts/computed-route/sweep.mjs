// Sweep command: reads every surface's latest Solve report (`<buildDir>/qa/solve/<surface>/<timestamp>/solve-report.json`)
// and writes `<buildDir>/qa/sweep/<date>/sweep.json`, one row per distinct open issue across the site. Prints one line.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { latestReport, aggregate } from './lib/sweep.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..' );

export function sweep( surfacesFile, date, out = null ) {
	const buildDir = path.dirname( path.resolve( surfacesFile ) );
	const manifest = JSON.parse( fs.readFileSync( surfacesFile, 'utf8' ) );
	const names = Object.keys( manifest );
	const entries = [];
	const unmeasured = [];
	for ( const surface of names ) {
		const file = latestReport( path.join( buildDir, 'qa', 'solve' ), surface );
		if ( ! file ) {
			unmeasured.push( surface );
			continue;
		}
		entries.push( { surface, config: manifest[ surface ].walker, reportPath: path.relative( REPO, file ).split( path.sep ).join( '/' ), report: JSON.parse( fs.readFileSync( file, 'utf8' ) ) } );
	}
	const result = aggregate( entries, unmeasured, date );
	const file = path.resolve( out || path.join( buildDir, 'qa', 'sweep', date, 'sweep.json' ) );
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, JSON.stringify( result, null, 1 ) );
	return { result, file };
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => {
		const i = argv.indexOf( n );
		return -1 === i ? null : argv[ i + 1 ];
	};
	const surfacesFile = flag( '--surfaces' );
	if ( ! surfacesFile ) {
		console.error( 'usage: node sweep.mjs --surfaces <path/to/surfaces.json> [--date YYYY-MM-DD] [--out <file>]' );
		process.exit( 2 );
	}
	const date = flag( '--date' ) || new Date().toISOString().slice( 0, 10 );
	let out;
	try {
		out = sweep( surfacesFile, date, flag( '--out' ) );
	} catch ( e ) {
		console.error( `[FAIL] sweep: ${ e.message }` );
		process.exit( 1 );
	}
	const { result, file } = out;
	const c = result.byClass;
	console.log( `sweep ${ date }: ${ result.total } open issues (hardcode ${ c.hardcode }, missing ${ c.missing }, unresolved ${ c.unresolved }, derived ${ c.derived }, unmapped-state ${ c[ 'unmapped-state' ] }, content ${ c.content }) across ${ Object.keys( result.surfaces ).length } surfaces; unmeasured: ${ result.unmeasured.join( ', ' ) || 'none' }; ${ file }` );
}
