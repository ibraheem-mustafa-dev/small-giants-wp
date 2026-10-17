// The capability inventory and the clone coverage gate (clone coverage plan Phase 1).
//   node capabilities.mjs --write   regenerate data/capabilities.json (needs the framework DB for its DB sections; run
//                                   without it, the DB sections keep what the committed file holds)
//   node capabilities.mjs --check   exit 1 when a fresh inventory differs from data/capabilities.json (needs the DB)
//   node capabilities.mjs --seed    add a gap stub ("unassigned") to data/clone-coverage.json for every inventory ID
//                                   with no entry; never changes an existing entry (the first run's gap list)
//   node capabilities.mjs --gaps    print the gap list: every ID neither covered nor excluded
//   node capabilities.mjs --gate    print every coverage problem; exit 1 when there is one
import fs from 'fs';
import { DB_PATH } from './lib/db.mjs';
import { CAPABILITIES_FILE, buildInventory, mergeInventory, readInventoryFile } from './lib/capabilities.mjs';
import { COVERAGE_FILE, loadCoverage, coverageProblems, gapList, seedGaps } from './lib/clone-coverage.mjs';

const mode = process.argv[ 2 ];
const json = ( o ) => `${ JSON.stringify( o, null, '\t' ) }\n`;
const dbHere = fs.existsSync( DB_PATH );

if ( '--write' === mode ) {
	const inv = mergeInventory( buildInventory(), readInventoryFile() );
	fs.writeFileSync( CAPABILITIES_FILE, json( inv ) );
	for ( const [ name, s ] of Object.entries( inv.sections ) ) {
		console.log( `${ name.padEnd( 14 ) } ${ s.status.padEnd( 6 ) } ${ s.entries.length }` );
	}
	console.log( dbHere ? `wrote ${ CAPABILITIES_FILE }` : `wrote ${ CAPABILITIES_FILE } (no framework DB at ${ DB_PATH }: the DB sections keep the committed entries)` );
} else if ( '--check' === mode ) {
	if ( ! dbHere ) {
		console.log( `skipped: no framework DB at ${ DB_PATH }` );
		process.exit( 0 );
	}
	const fresh = json( buildInventory() );
	const committed = fs.existsSync( CAPABILITIES_FILE ) ? fs.readFileSync( CAPABILITIES_FILE, 'utf8' ) : '';
	if ( fresh !== committed ) {
		console.error( 'data/capabilities.json is out of date: run node capabilities.mjs --write, then --gate' );
		process.exit( 1 );
	}
	console.log( 'data/capabilities.json is current' );
} else if ( '--seed' === mode ) {
	const today = new Date().toISOString().slice( 0, 10 );
	const { coverage, added } = seedGaps( readInventoryFile(), loadCoverage(), `seeded ${ today }, not yet triaged` );
	fs.writeFileSync( COVERAGE_FILE, json( coverage ) );
	console.log( `added ${ added } gap stub(s) to ${ COVERAGE_FILE }` );
} else if ( '--gaps' === mode ) {
	const gaps = gapList( readInventoryFile(), loadCoverage() );
	const bySection = new Map();
	gaps.forEach( ( g ) => bySection.set( g.section, [ ...( bySection.get( g.section ) || [] ), g ] ) );
	console.log( `# Clone coverage gap list: ${ gaps.length } capabilities neither covered nor excluded\n` );
	for ( const [ section, list ] of bySection ) {
		console.log( `## ${ section } (${ list.length })\n` );
		list.forEach( ( g ) => {
			const c = g.coverage || {};
			const has = [ 'recognise', 'write', 'check' ].filter( ( s ) => c[ s ] ).join( ', ' ) || 'nothing';
			const ex = g.examples.length ? `; e.g. ${ g.examples.join( ', ' ) }` : '';
			console.log( `- \`${ g.id }\`: ${ g.label } (${ g.count }${ g.motion ? ', motion' : '' }); has ${ has }; wave ${ c.wave || 'none' }${ c.waiting ? `, waits on ${ c.waiting }` : '' }${ ex }` );
		} );
		console.log( '' );
	}
} else if ( '--gate' === mode ) {
	const problems = coverageProblems( readInventoryFile(), loadCoverage() );
	problems.forEach( ( p ) => console.error( p ) );
	console.log( problems.length ? `${ problems.length } coverage problem(s)` : 'clone coverage: every capability has a coverage entry' );
	process.exit( problems.length ? 1 : 0 );
} else {
	console.error( 'usage: node capabilities.mjs --write | --check | --seed | --gaps | --gate' );
	process.exit( 2 );
}
