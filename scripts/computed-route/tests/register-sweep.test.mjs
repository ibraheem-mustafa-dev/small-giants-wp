// Proves the register <-> sweep step (A4): the register parses into items, items fall into the A4 groups, a verdict set is
// accepted only when every item has exactly one valid status and every clean claim agrees with the sweep, and the merge adds a
// Sweep column without changing any existing cell.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerItems, groupItems, checkStatuses, addSweepColumn, bundleGroup, itemSurfaces } from '../lib/register-sweep.mjs';

const REGISTER = [
	'# Register',
	'',
	'## Decisions',
	'',
	'- D1 a bullet that is not an item',
	'',
	'## Site-wide fixes (one change, many items)',
	'',
	'| ID | What it fixes | Fix | Type | Covers |',
	'|---|---|---|---|---|',
	'| S1 | Buttons | one setting | tree | 1, 2, 126 (prose 2026-10-03) |',
	'',
	'## Header',
	'',
	'| Ref | What is wrong | Fix | Type | Status |',
	'|---|---|---|---|---|',
	'| 1 | Top bar | size \\| weight | tree | proven |',
	'| 2 | Logo | gap | tree | proven |',
	'',
	'## Contact',
	'',
	'| Ref | What is wrong | Fix | Type | Status |',
	'|---|---|---|---|---|',
	'| 126, 137 | Columns | grid | tree | proven |',
	'',
	'## Mystery',
	'',
	'| Ref | What is wrong |',
	'|---|---|',
	'| N9 | Unknown section |',
	''
].join( '\n' );

const sweep = ( over = {} ) => ( {
	surfaces: { header: { report: 'r/header.json', issues: 1 }, contact: { report: 'r/contact.json', issues: 0 }, 'contact-form': { report: 'r/cf.json', issues: 0 } },
	unmeasured: [ 'footer' ],
	rows: [ { surface: 'header', ref: 'ref-h-1', path: '.x', property: 'gap', report: 'r/header.json', values: [ { draft: '12px', live: '0px' } ] } ],
	...over
} );
const ELEMENT = 'the item names the own element of this block';
const clean = ( id, ref, report = 'r/contact.json', extra = {} ) => ( { id, status: 'clean on the walker', evidence: { report, ref, element: ELEMENT, ...extra } } );
// A status that is neither clean nor still open (the fixtures' default: these tests are about clean claims and coverage).
const open = ( id ) => ( { id, status: 'partly measured', evidence: { reason: 'one surface unmeasured' } } );
const items = registerItems( REGISTER );

test( 'parsing: comma ids split, Covers read without prose, bullets and header rows ignored', () => {
	assert.deepEqual( items.map( ( x ) => x.ids ), [ [ 'S1' ], [ '1' ], [ '2' ], [ '126', '137' ], [ 'N9' ] ] );
	assert.deepEqual( items[ 0 ].covers, [ '1', '2', '126' ] );
	assert.deepEqual( items[ 1 ].cells, [ '1', 'Top bar', 'size \\| weight', 'tree', 'proven' ] );
	assert.equal( items[ 1 ].section, 'Header' );
} );

test( 'grouping: sections map to their A4 group and an unknown section is reported, not dropped', () => {
	const { groups, ungrouped } = groupItems( items );
	assert.equal( groups.length, 8 );
	assert.deepEqual( groups[ 0 ].items.map( ( x ) => x.ids[ 0 ] ), [ '1', '2' ] );
	assert.deepEqual( groups[ 4 ].items.map( ( x ) => x.ids[ 0 ] ), [ '126' ] );
	assert.deepEqual( groups[ 6 ].items.map( ( x ) => x.ids[ 0 ] ), [ 'S1' ] );
	assert.deepEqual( ungrouped.map( ( x ) => x.ids[ 0 ] ), [ 'N9' ] );
} );

const ALL_OPEN = [ open( 'S1' ), open( '1' ), open( '2' ), open( '126, 137' ), open( 'N9' ) ];

test( 'a full, valid verdict set has no problems', () => {
	assert.deepEqual( checkStatuses( items, ALL_OPEN, sweep() ), [] );
	assert.deepEqual( checkStatuses( items, [ ...ALL_OPEN.slice( 0, 3 ), clean( '126', 'ref-c-9' ), ALL_OPEN[ 4 ] ], sweep() ), [] );
} );

test( 'MUST FAIL: a clean verdict whose ref has an open sweep row is rejected', () => {
	const verdicts = [ ...ALL_OPEN.slice( 0, 1 ), clean( '1', 'ref-h-1', 'r/header.json' ), ...ALL_OPEN.slice( 2 ) ];
	assert.match( checkStatuses( items, verdicts, sweep() ).join( '\n' ), /1: clean, but 1 sweep row\(s\) touch ref-h-1/ );
	const other = [ ...ALL_OPEN.slice( 0, 1 ), clean( '1', 'ref-h-1', 'r/header.json', { property: 'colour' } ), ...ALL_OPEN.slice( 2 ) ];
	assert.deepEqual( checkStatuses( items, other, sweep() ), [] );
} );

test( 'a clean verdict must cite a report the sweep holds', () => {
	const verdicts = [ ...ALL_OPEN.slice( 0, 3 ), clean( '126', 'ref-c-9', 'r/nowhere.json' ), ALL_OPEN[ 4 ] ];
	assert.match( checkStatuses( items, verdicts, sweep() ).join( '\n' ), /does not hold/ );
} );

test( 'MUST FAIL: a site-wide item marked clean while a covered item is open or its surface unmeasured is rejected', () => {
	// S1 covers 1 and 2 (Header) and 126 (Contact).
	const verdicts = [ clean( 'S1', 'ref-x', 'r/contact.json' ), ...ALL_OPEN.slice( 1 ) ];
	assert.match( checkStatuses( items, verdicts, sweep() ).join( '\n' ), /S1: site-wide item is clean only when every covered item is clean and measured; unmeasured: none; not clean: 1; 2; 126, 137/ );
	const coveredClean = [ clean( 'S1', 'ref-x', 'r/contact.json' ), clean( '1', 'ref-h-2', 'r/header.json' ), clean( '2', 'ref-h-3', 'r/header.json' ), clean( '126', 'ref-c-9' ), ALL_OPEN[ 4 ] ];
	const unmeasured = sweep( { surfaces: { contact: sweep().surfaces.contact, 'contact-form': sweep().surfaces[ 'contact-form' ] }, unmeasured: [ 'header' ] } );
	assert.match( checkStatuses( items, coveredClean, unmeasured ).join( '\n' ), /S1: .*unmeasured: header/ );
} );

test( 'positive control: every covered item clean and measured makes the site-wide item clean, whatever else is open on those pages', () => {
	const coveredClean = [ clean( 'S1', 'ref-x', 'r/contact.json' ), clean( '1', 'ref-h-2', 'r/header.json' ), clean( '2', 'ref-h-3', 'r/header.json' ), clean( '126', 'ref-c-9' ), ALL_OPEN[ 4 ] ];
	assert.equal( sweep().surfaces.header.issues, 1, 'Header still has an unrelated open row' );
	assert.deepEqual( checkStatuses( items, coveredClean, sweep() ), [] );
} );

test( 'MUST FAIL: an item with no verdict, or two, is rejected; a bad status or no evidence too', () => {
	const none = ALL_OPEN.filter( ( v ) => '2' !== v.id );
	assert.match( checkStatuses( items, none, sweep() ).join( '\n' ), /2: 0 verdicts/ );
	const two = [ ...ALL_OPEN, open( '137' ) ];
	assert.match( checkStatuses( items, two, sweep() ).join( '\n' ), /126, 137: 2 verdicts/ );
	assert.match( checkStatuses( items, [ ...ALL_OPEN.slice( 0, 4 ), { id: 'N9', status: 'fine' } ], sweep() ).join( '\n' ), /status "fine"/ );
	assert.match( checkStatuses( items, [ ...ALL_OPEN.slice( 0, 4 ), { id: 'N9', status: 'still open' } ], sweep() ).join( '\n' ), /no evidence/ );
	assert.match( checkStatuses( items, [ ...ALL_OPEN, open( 'Z99' ) ], sweep() ).join( '\n' ), /unknown id Z99/ );
} );

test( 'merge adds a Sweep column and leaves every original cell byte-identical', () => {
	for ( const eol of [ '\n', '\r\n' ] ) {
		const text = REGISTER.replace( /\n/g, eol );
		const out = addSweepColumn( text, registerItems( text ), ALL_OPEN );
		const outLines = out.split( eol );
		const inLines = text.split( eol );
		assert.equal( outLines.length, inLines.length );
		outLines.forEach( ( line, i ) => {
			if ( inLines[ i ].startsWith( '|' ) ) {
				assert.ok( line.startsWith( inLines[ i ] ), `line ${ i } keeps its original text` );
			} else {
				assert.equal( line, inLines[ i ] );
			}
		} );
		assert.ok( outLines[ 8 ].endsWith( '| Covers | Sweep |' ) );
		assert.ok( outLines[ 9 ].endsWith( '|---|---|---|---|---| --- |' ) );
		assert.ok( outLines[ 16 ].endsWith( '| proven | partly measured |' ) );
		assert.ok( outLines[ 23 ].endsWith( '| proven | partly measured |' ) );
	}
} );

test( 'bundle: a group carries its items, its surfaces and only their rows', () => {
	const b = bundleGroup( groupItems( items ).groups[ 0 ], items, sweep() );
	assert.deepEqual( b.items.map( ( x ) => x.id ), [ '1', '2' ] );
	assert.deepEqual( Object.keys( b.surfaces ), [ 'header' ] );
	assert.equal( b.rows.length, 1 );
	assert.match( b.rules, /still open/ );
	assert.equal( bundleGroup( groupItems( items ).groups[ 4 ], items, sweep() ).rows.length, 0 );
} );

test( 'MUST FAIL: with the pairings given, a clean claim must cite a ref its surface measured', async () => {
	const { measuredRefs } = await import( '../lib/register-sweep.mjs' );
	const measured = { contact: measuredRefs( { keptPairs: [ { ref: 'ref-c-9' } ], coveredByHand: [ 'ref-c-2' ] } ) };
	assert.deepEqual( measured.contact, [ 'ref-c-9', 'ref-c-2' ] );
	const verdicts = ( ref ) => [ ...ALL_OPEN.slice( 0, 3 ), clean( '126', ref ), ALL_OPEN[ 4 ] ];
	assert.deepEqual( checkStatuses( items, verdicts( 'ref-c-9' ), sweep(), measured ), [] );
	assert.match( checkStatuses( items, verdicts( 'ref-c-77' ), sweep(), measured ).join( '\n' ), /ref-c-77, which no pairing of its surfaces measured/ );
} );

// The 2026-10-05 A4 run: still-open verdicts cited any row on a wrapper (12 product items on one 107-word block) and
// gave no values; hover items were called unmeasurable although the walker forces :hover on every pair.
const stillOpen = ( id, extra ) => ( { id, status: 'still open', evidence: { report: 'r/header.json', ref: 'ref-h-1', path: '.x', property: 'gap', draft: '12px', live: '0px', element: ELEMENT, ...extra } } );
const withOne = ( v ) => [ ...ALL_OPEN.slice( 0, 1 ), v, ...ALL_OPEN.slice( 2 ) ];

test( 'positive control: a still-open verdict citing one exact row and quoting its values passes', () => {
	assert.deepEqual( checkStatuses( items, withOne( stillOpen( '1' ) ), sweep() ), [] );
} );

test( 'MUST FAIL: a still-open verdict on another element, with values the row does not hold, or with no element sentence is rejected', () => {
	assert.match( checkStatuses( items, withOne( stillOpen( '1', { path: '' } ) ), sweep() ).join( '\n' ), /1: still open cites ref-h-1 path "" gap, which is no row/ );
	assert.match( checkStatuses( items, withOne( stillOpen( '1', { live: '4px' } ) ), sweep() ).join( '\n' ), /1: still open quotes "12px" -> "4px"; the row reads "12px" -> "0px"/ );
	assert.match( checkStatuses( items, withOne( stillOpen( '1', { element: undefined } ) ), sweep() ).join( '\n' ), /1: still open needs evidence.element/ );
	assert.match( checkStatuses( items, withOne( { id: '1', status: 'still open', evidence: { reason: 'a row is there' } } ), sweep() ).join( '\n' ), /1: still open needs evidence.element/ );
} );

test( 'MUST FAIL: a still-open verdict on a walk must match an open diff of that walk', () => {
	const walk = { runs: [ { pairs: { 'page-heading': { diffs: [ { key: 'font-size', draft: '48px', live: '63.36px' } ] } } } ] };
	const onWalk = ( extra ) => withOne( { id: '1', status: 'still open', evidence: { walk: 'w/checkout', pair: 'page-heading', property: 'font-size', draft: '48px', live: '63.36px', element: ELEMENT, ...extra } } );
	assert.deepEqual( checkStatuses( items, onWalk(), sweep(), null, { 'w/checkout': walk } ), [] );
	assert.match( checkStatuses( items, onWalk( { live: '60px' } ), sweep(), null, { 'w/checkout': walk } ).join( '\n' ), /no open diff of walk w\/checkout/ );
	assert.match( checkStatuses( items, onWalk(), sweep() ).join( '\n' ), /whose report.json was not given/ );
} );

test( 'MUST FAIL: hover is no reason for not walker-measurable, and a clean claim needs its element sentence', () => {
	const hover = withOne( { id: '1', status: 'not walker-measurable', evidence: { reason: 'A hover colour is a hover state.' } } );
	assert.match( checkStatuses( items, hover, sweep() ).join( '\n' ), /1: not walker-measurable gives hover as the reason/ );
	const keyboard = withOne( { id: '1', status: 'not walker-measurable', evidence: { reason: 'Keyboard focus order.' } } );
	assert.deepEqual( checkStatuses( items, keyboard, sweep() ), [] );
	const pauseOnHover = withOne( { id: '1', status: 'not walker-measurable', evidence: { reason: 'Behaviour: a strip that scrolls and pauses on hover.' } } );
	assert.deepEqual( checkStatuses( items, pauseOnHover, sweep() ), [] );
	const onRoot = [ ...ALL_OPEN.slice( 0, 1 ), clean( '1', 'ref-h-1', 'r/header.json', { property: 'gap', path: '' } ), ...ALL_OPEN.slice( 2 ) ];
	assert.deepEqual( checkStatuses( items, onRoot, sweep() ), [], 'the row sits on path .x, not the block root' );
	const onChild = [ ...ALL_OPEN.slice( 0, 1 ), clean( '1', 'ref-h-1', 'r/header.json', { property: 'gap', path: '.x' } ), ...ALL_OPEN.slice( 2 ) ];
	assert.match( checkStatuses( items, onChild, sweep() ).join( ' ' ), /1: clean, but 1 sweep row/ );
	const bare = [ ...ALL_OPEN.slice( 0, 3 ), clean( '126', 'ref-c-9', 'r/contact.json', { element: '' } ), ALL_OPEN[ 4 ] ];
	assert.match( checkStatuses( items, bare, sweep() ).join( '\n' ), /126, 137: clean needs evidence.element/ );
} );

// The 2026-10-05 redo merged onto a register that already had a Sweep column and stacked a second one beside it.
test( 'MUST FAIL: a second merge rewrites the Sweep column instead of adding another', () => {
	const once = addSweepColumn( REGISTER, items, ALL_OPEN );
	const redo = [ ALL_OPEN[ 0 ], { id: '1', status: 'not walker-measurable', evidence: { reason: 'Keyboard focus order.' } }, ...ALL_OPEN.slice( 2 ) ];
	const twice = addSweepColumn( once, registerItems( once ), redo );
	const header = twice.split( /\n/ ).find( ( l ) => l.startsWith( '| Ref | What is wrong' ) );
	assert.equal( ( header.match( /Sweep/g ) || [] ).length, 1 );
	assert.ok( twice.split( /\n/ ).some( ( l ) => l.startsWith( '| 1 | Top bar' ) && l.endsWith( '| proven | not walker-measurable |' ) ) );
	assert.equal( twice.split( /\n/ ).length, once.split( /\n/ ).length );
} );

// 2026-10-05: Help's and the product page's size pop-up items were judged without the size-guide surface's rows.
test( 'MUST FAIL: Help and product page items sit on the size-guide surface too', () => {
	const reg = [ '## Help', '', '| Ref | What is wrong |', '|---|---|', '| 115 | Pop-up text |', '', '## Product page', '', '| Ref | What is wrong |', '|---|---|', '| 69 | Size pop-up |', '' ].join( String.fromCharCode( 10 ) );
	const its = registerItems( reg );
	assert.ok( itemSurfaces( its[ 0 ], its ).includes( 'size-guide' ) );
	assert.ok( itemSurfaces( its[ 1 ], its ).includes( 'size-guide' ) );
} );

test( 'MUST FAIL: measuredRefs also reads handMeasured, and a report without it behaves as before', async () => {
	const { measuredRefs } = await import( '../lib/register-sweep.mjs' );
	assert.deepEqual( measuredRefs( { keptPairs: [ { ref: 'r1' } ], coveredByHand: [ 'r2' ], handMeasured: [ 'r3', 'r1' ] } ), [ 'r1', 'r2', 'r3' ] );
	assert.deepEqual( measuredRefs( { keptPairs: [ { ref: 'r1' } ], coveredByHand: [] } ), [ 'r1' ] );
	assert.deepEqual( measuredRefs( null ), [] );
	assert.deepEqual( measuredRefs( { keptPairs: [], coveredByHand: [], handMeasured: [ 'cr-ref-lenses-28' ] } ), [ 'cr-ref-lenses-28' ] );
} );

