// Scores the footer proof (Spec 47 §5 stage 2) from a Solve run folder: each register item maps to (pair, property)
// rows; an item is handled when none is open at any width, or when it is a register framework item whose open rows
// Solve classified as a gap. Usage: node sites/eye-care-ward-end/build/qa/solve-score-footer.mjs <solve out dir>
import fs from 'fs';
import path from 'path';

const dir = process.argv[ 2 ];
const rounds = fs.readdirSync( dir ).filter( ( d ) => /^round-\d+$/.test( d ) ).sort( ( a, b ) => Number( a.split( '-' )[ 1 ] ) - Number( b.split( '-' )[ 1 ] ) );
const load = ( d ) => JSON.parse( fs.readFileSync( path.join( dir, d, 'report.json' ), 'utf8' ) );
const before = load( rounds[ 0 ] );
const after = load( rounds.at( -1 ) );
const P = ( ...s ) => s;
const ITEMS = {
	'25 main row, footer and bottom row padding': [ [ 'footer-root', P( 'padding-left', 'padding-right', 'h' ) ], [ 'columns-row', P( 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'h' ) ], [ 'bottom-bar', P( 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'h' ) ] ],
	'26 wordmark weight, line height, margins': [ [ 'brand-wordmark', P( 'font-weight', 'line-height', 'margin-top', 'margin-bottom', 'h' ) ] ],
	'27 BIRMINGHAM 4px top margin': [ [ 'brand-tagline', P( 'margin-top' ) ] ],
	'27 BIRMINGHAM size and tracking': [ [ 'brand-tagline', P( 'font-size', 'letter-spacing' ) ] ],
	'27 tagline 18px top margin': [ [ 'brand-description', P( 'margin-top' ) ] ],
	'27 social row 20px top margin': [ [ 'social-row', P( 'margin-top' ) ] ],
	'27 brand column gap 0': [ [ 'col-brand', P( 'row-gap', 'gap' ) ] ],
	'28 tagline width and wrap': [ [ 'brand-description', P( 'width', 'max-width', 'text-wrap' ) ] ],
	'29 headings 11.5px': [ [ 'col-shop-heading', P( 'font-size' ) ], [ 'col-help-heading', P( 'font-size' ) ], [ 'col-visit-heading', P( 'font-size' ) ] ],
	'29 headings 0.2em tracking': [ [ 'col-shop-heading', P( 'letter-spacing' ) ], [ 'col-help-heading', P( 'letter-spacing' ) ], [ 'col-visit-heading', P( 'letter-spacing' ) ] ],
	'29 headings weight 400': [ [ 'col-shop-heading', P( 'font-weight' ) ], [ 'col-help-heading', P( 'font-weight' ) ], [ 'col-visit-heading', P( 'font-weight' ) ] ],
	'29 headings line height 1.5': [ [ 'col-shop-heading', P( 'line-height' ) ], [ 'col-help-heading', P( 'line-height' ) ], [ 'col-visit-heading', P( 'line-height' ) ] ],
	'29 headings 4px bottom margin': [ [ 'col-shop-heading', P( 'margin-bottom' ) ], [ 'col-help-heading', P( 'margin-bottom' ) ], [ 'col-visit-heading', P( 'margin-bottom' ) ] ],
	'29 columns 10px gap': [ [ 'col-shop', P( 'row-gap', 'gap' ) ], [ 'col-help', P( 'row-gap', 'gap' ) ], [ 'col-visit', P( 'row-gap', 'gap' ) ] ],
	'38 hours weight 400': [ [ 'hours', P( 'font-weight' ) ] ],
};
const openFor = ( report, pair, keys ) => report.runs.flatMap( ( r ) => ( r.pairs[ pair ]?.diffs || [] ).filter( ( d ) => ! d.accepted && keys.includes( d.key ) && [ 'style', 'box' ].includes( d.kind ) ).map( ( d ) => ( { width: r.width, pair, key: d.key, draft: d.draft, live: d.live } ) ) );
// Items the register (2026-10-03) types as framework: open and classified a gap (Hardcode or Missing setting) = handled.
const FRAMEWORK = new Set( [ '38 hours weight 400' ] );
const sr = JSON.parse( fs.readFileSync( path.join( dir, 'solve-report.json' ), 'utf8' ) );
const gapRows = new Set( [ ...sr.classes.hardcode, ...sr.classes.missing ].map( ( r ) => `${ r.pair }|${ r.key }|${ r.width }` ) );
let handled = 0;
let closed = 0;
let openBefore = 0;
const lines = [];
for ( const [ name, parts ] of Object.entries( ITEMS ) ) {
	const b = parts.flatMap( ( [ pair, keys ] ) => openFor( before, pair, keys ) );
	const a = parts.flatMap( ( [ pair, keys ] ) => openFor( after, pair, keys ) );
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
// Regressions: a (pair, key, width) row closed before and open after.
const keyOf = ( x ) => `${ x.pair }|${ x.key }|${ x.width }`;
const all = ( report ) => report.runs.flatMap( ( r ) => Object.entries( r.pairs ).flatMap( ( [ pair, p ] ) => ( p.diffs || [] ).filter( ( d ) => ! d.accepted && [ 'style', 'box' ].includes( d.kind ) ).map( ( d ) => ( { width: r.width, pair, key: d.key, draft: d.draft, live: d.live } ) ) ) );
const beforeKeys = new Set( all( before ).map( keyOf ) );
const regressions = all( after ).filter( ( x ) => ! beforeKeys.has( keyOf( x ) ) );
const total = Object.keys( ITEMS ).length;
console.log( `| Item | Open rows before | Open rows after | Result | Still open (first 4) |\n|---|---|---|---|---|\n${ lines.join( '\n' ) }` );
console.log( `\nScored items: ${ total } (${ openBefore } open before). Closed after: ${ closed }. Handled (closed, or an identified framework gap): ${ handled } (${ Math.round( 100 * handled / total ) }%). Wrong writes: ${ sr.wrong.length } of ${ sr.writes.length }.` );
console.log( `Style/box rows open before: ${ all( before ).length }, after: ${ all( after ).length }. New rows after (regressions): ${ regressions.length }` );
regressions.slice( 0, 30 ).forEach( ( x ) => console.log( `  new: ${ x.pair } ${ x.key }@${ x.width } ${ x.draft } → ${ x.live }` ) );
