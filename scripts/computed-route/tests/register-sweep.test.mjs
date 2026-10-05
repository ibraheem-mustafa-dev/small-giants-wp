// Proves the register <-> sweep step (A4): the register parses into items, items fall into the A4 groups, a verdict set is
// accepted only when every item has exactly one valid status and every clean claim agrees with the sweep, and the merge adds a
// Sweep column without changing any existing cell.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerItems, groupItems, checkStatuses, addSweepColumn, bundleGroup } from '../lib/register-sweep.mjs';

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
	rows: [ { surface: 'header', ref: 'ref-h-1', property: 'gap', report: 'r/header.json' } ],
	...over
} );
const clean = ( id, ref, report = 'r/contact.json', extra = {} ) => ( { id, status: 'clean on the walker', evidence: { report, ref, ...extra } } );
const open = ( id ) => ( { id, status: 'still open', evidence: { reason: 'row present' } } );
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
		assert.ok( outLines[ 16 ].endsWith( '| proven | still open |' ) );
		assert.ok( outLines[ 23 ].endsWith( '| proven | still open |' ) );
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
