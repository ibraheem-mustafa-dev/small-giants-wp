// Scores a Solve run (Spec 47 §5) against one surface's register items. Each item maps to (pair, properties[, walker
// states]) rows; an item is closed when none is open at any width, and handled when closed or when it is a register
// framework item whose open rows Solve classified as a gap (Hardcode or Missing setting).
// Usage: node sites/eye-care-ward-end/build/qa/solve-score.mjs <solve out dir> <score-items/<surface>.json>
// Items file: { "surface", "source", "items": { "<name>": [ [ "<pair>", [ "<prop>", ... ], [ "<state>", ... ]? ] ] },
// "framework": [ "<item name>", ... ] }.
import fs from 'fs';
import path from 'path';

const [ dir, itemsFile ] = process.argv.slice( 2 );
if ( ! dir || ! itemsFile ) {
	console.error( 'Usage: solve-score.mjs <solve out dir> <items file>' );
	process.exit( 2 );
}
const { items: ITEMS, framework = [] } = JSON.parse( fs.readFileSync( itemsFile, 'utf8' ) );
const rounds = fs.readdirSync( dir ).filter( ( d ) => /^round-\d+$/.test( d ) ).sort( ( a, b ) => Number( a.split( '-' )[ 1 ] ) - Number( b.split( '-' )[ 1 ] ) );
const load = ( d ) => JSON.parse( fs.readFileSync( path.join( dir, d, 'report.json' ), 'utf8' ) );
const before = load( rounds[ 0 ] );
const after = load( rounds.at( -1 ) );
const openFor = ( report, pair, keys, states ) => report.runs.filter( ( r ) => ! states || states.includes( r.state ) ).flatMap( ( r ) => ( r.pairs[ pair ]?.diffs || [] ).filter( ( d ) => ! d.accepted && keys.includes( d.key ) && [ 'style', 'box' ].includes( d.kind ) ).map( ( d ) => ( { width: r.width, state: r.state, pair, key: d.key, draft: d.draft, live: d.live } ) ) );
const FRAMEWORK = new Set( framework );
const sr = JSON.parse( fs.readFileSync( path.join( dir, 'solve-report.json' ), 'utf8' ) );
const gapRows = new Set( [ ...sr.classes.hardcode, ...sr.classes.missing ].map( ( r ) => `${ r.pair }|${ r.key }|${ r.width }` ) );
let handled = 0;
let closed = 0;
let openBefore = 0;
const lines = [];
for ( const [ name, parts ] of Object.entries( ITEMS ) ) {
	const b = parts.flatMap( ( [ pair, keys, states ] ) => openFor( before, pair, keys, states ) );
	const a = parts.flatMap( ( [ pair, keys, states ] ) => openFor( after, pair, keys, states ) );
	if ( b.length ) {
		openBefore++;
	}
	const asGap = a.length > 0 && FRAMEWORK.has( name ) && a.every( ( x ) => gapRows.has( `${ x.pair }|${ x.key }|${ x.width }` ) );
	if ( ! a.length ) {
		closed++;
	}
	if ( ! a.length || asGap ) {
		handled++;
	}
	lines.push( `| ${ name } | ${ b.length } | ${ a.length } | ${ a.length ? ( asGap ? 'gap, identified' : 'open' ) : 'closed' } | ${ a.slice( 0, 4 ).map( ( x ) => `${ x.pair } ${ x.key }@${ x.width } ${ x.draft }→${ x.live }` ).join( '; ' ) } |` );
}
// Regressions: a (pair, state, key, width) row closed before and open after.
const keyOf = ( x ) => `${ x.pair }|${ x.state }|${ x.key }|${ x.width }`;
const all = ( report ) => report.runs.flatMap( ( r ) => Object.entries( r.pairs ).flatMap( ( [ pair, p ] ) => ( p.diffs || [] ).filter( ( d ) => ! d.accepted && [ 'style', 'box' ].includes( d.kind ) ).map( ( d ) => ( { width: r.width, state: r.state, pair, key: d.key, draft: d.draft, live: d.live } ) ) ) );
const beforeKeys = new Set( all( before ).map( keyOf ) );
const regressions = all( after ).filter( ( x ) => ! beforeKeys.has( keyOf( x ) ) );
const total = Object.keys( ITEMS ).length;
console.log( `| Item | Open rows before | Open rows after | Result | Still open (first 4) |\n|---|---|---|---|---|\n${ lines.join( '\n' ) }` );
console.log( `\nScored items: ${ total } (${ openBefore } open before). Closed after: ${ closed }. Handled (closed, or an identified framework gap): ${ handled } (${ total ? Math.round( 100 * handled / total ) : 0 }%). Wrong writes: ${ sr.wrong.length } of ${ sr.writes.length }.` );
console.log( `Style/box rows open before: ${ all( before ).length }, after: ${ all( after ).length }. New rows after (regressions): ${ regressions.length }` );
regressions.slice( 0, 30 ).forEach( ( x ) => console.log( `  new: ${ x.pair } ${ x.key }@${ x.width } (${ x.state }) ${ x.draft } → ${ x.live }` ) );
