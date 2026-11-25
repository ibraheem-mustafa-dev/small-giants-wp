// The capability inventory and the clone coverage gate (clone coverage plan Phase 1).
//   node capabilities.mjs --write   regenerate data/capabilities.json (needs the framework DB for its DB sections; run
//                                   without it, the DB sections keep what the committed file holds)
//   node capabilities.mjs --check   exit 1 when a fresh inventory differs from data/capabilities.json (needs the DB)
//   node capabilities.mjs --seed    add a gap stub ("unassigned") to data/clone-coverage.json for every inventory ID
//                                   with no entry; never changes an existing entry (the first run's gap list)
//   node capabilities.mjs --gaps    print the gap list: every ID neither covered nor excluded
//   node capabilities.mjs --like <id>   covered entries solved the way <id> would be (same write reference, or the same
//                                   id prefix when <id> has no write reference): worked examples for a new gap
//   node capabilities.mjs --drafts  gaps named in sites/*/build/intake/review.md, grouped by wave with the drafts that hit them
//   node capabilities.mjs --backfill-tests  set "test" from the test file a covered note names; the rest becomes
//                                   data/coverage-test-baseline.json
//   node capabilities.mjs --gate    print every coverage problem; exit 1 when there is one
import fs from 'fs';
import { DB_PATH } from './lib/db.mjs';
import { CAPABILITIES_FILE, buildInventory, mergeInventory, readInventoryFile } from './lib/capabilities.mjs';
import { COVERAGE_FILE, BASELINE_FILE, loadCoverage, coverageProblems, gapList, seedGaps } from './lib/clone-coverage.mjs';
import { likeEntries, readReviews, draftGaps, backfillTests } from './lib/coverage-register.mjs';

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
	const waves = new Map();
	gaps.forEach( ( g ) => waves.set( g.coverage?.wave || 'none', ( waves.get( g.coverage?.wave || 'none' ) || 0 ) + 1 ) );
	console.log( `# Clone coverage gap list: ${ gaps.length } capabilities neither covered nor excluded\n` );
	console.log( '| Wave | Gaps |\n|---|---|' );
	[ ...waves ].sort( ( a, b ) => b[ 1 ] - a[ 1 ] ).forEach( ( [ w, n ] ) => console.log( `| ${ w } | ${ n } |` ) );
	console.log( '' );
	for ( const [ section, list ] of bySection ) {
		console.log( `## ${ section } (${ list.length })\n` );
		list.forEach( ( g ) => {
			const c = g.coverage || {};
			const has = [ 'recognise', 'write', 'check' ].filter( ( s ) => c[ s ] ).join( ', ' ) || 'nothing';
			const ex = g.examples.length ? `; e.g. ${ g.examples.join( ', ' ) }` : '';
			console.log( `- \`${ g.id }\`: ${ g.label } (${ g.count }${ g.motion ? ', motion' : '' }); has ${ has }; wave ${ c.wave || 'none' }${ ex }` );
		} );
		console.log( '' );
	}
} else if ( '--like' === mode ) {
	const id = process.argv[ 3 ];
	const found = id ? likeEntries( loadCoverage(), id ) : null;
	if ( ! found ) {
		console.error( 'usage: node capabilities.mjs --like <capability id that has an entry in data/clone-coverage.json>' );
		process.exit( 2 );
	}
	console.log( `# ${ found.length } covered entr${ 1 === found.length ? 'y' : 'ies' } solved like ${ id }\n` );
	found.forEach( ( { id: k, entry: e } ) => console.log( `- \`${ k }\`: recognise ${ e.recognise }; write ${ e.write }; check ${ e.check }; test ${ e.test || 'none' }\n  ${ e.note || '' }` ) );
} else if ( '--drafts' === mode ) {
	const { byWave, ids, drafts } = draftGaps( loadCoverage(), readReviews() );
	for ( const [ wave, list ] of Object.entries( byWave ).sort() ) {
		console.log( `## ${ wave } (${ Object.keys( list ).length })\n` );
		Object.entries( list ).sort().forEach( ( [ k, d ] ) => console.log( `- \`${ k }\`: ${ d.join( ', ' ) }` ) );
		console.log( '' );
	}
	console.log( `${ ids } open gap(s) named by draft reviews; per draft: ${ Object.entries( drafts ).map( ( [ d, n ] ) => `${ d } ${ n }` ).join( ', ' ) || 'none' }` );
} else if ( '--backfill-tests' === mode ) {
	const { coverage, backfilled, baseline } = backfillTests( loadCoverage() );
	fs.writeFileSync( COVERAGE_FILE, json( coverage ) );
	fs.writeFileSync( BASELINE_FILE, json( { _meta: { purpose: 'Covered entries in data/clone-coverage.json that name no test yet. The list may only shrink: set a test on an entry and remove it here (the gate refuses a stale id, and a covered entry with no test that is not listed).' }, ids: baseline } ) );
	console.log( `backfilled ${ backfilled } test reference(s); ${ baseline.length } covered entr${ 1 === baseline.length ? 'y' : 'ies' } in the baseline` );
} else if ( '--gate' === mode ) {
	const problems = coverageProblems( readInventoryFile(), loadCoverage() );
	problems.forEach( ( p ) => console.error( p ) );
	console.log( problems.length ? `${ problems.length } coverage problem(s)` : 'clone coverage: every capability has a coverage entry' );
	process.exit( problems.length ? 1 : 0 );
} else {
	console.error( 'usage: node capabilities.mjs --write | --check | --seed | --gaps | --like <id> | --drafts | --backfill-tests | --gate' );
	process.exit( 2 );
}
