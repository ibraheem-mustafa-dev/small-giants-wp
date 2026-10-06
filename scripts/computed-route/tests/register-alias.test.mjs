// A register row whose Fix is nothing but a pointer at another row is that row's ALIAS, not independent work.
// Only the site-wide tables carry a `Covers` column, so three rows held their pointer solely in the Fix cell and
// were modelled nowhere: `3` -> 17 (bag count pop), `61` -> 59 (card colour dots), `N8` -> N2B (wordmark wrap).
// Counted as independent rows they inflate the open-work figure by three.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerItems } from '../lib/register-sweep.mjs';

// The real register's shape: a per-section table with a Fix column and no Covers column.
const SECTION = [
	'## Header',
	'| Ref | What is wrong | Fix | Type | Status | Sweep |',
	'|---|---|---|---|---| --- |',
	'| 1 | Top bar sentences larger than the draft | trust-bar label size 12.5px, weight 400. | tree | proven | still open |',
	'| 3 | The bag count circle pops into view | See 17 | | | not walker-measurable |',
	'| 17 | The bag count circle has no load animation | add the pop | tree | proven | still open |',
	'| 61 | Card colour dots | Same as 59 | **Verified live with 59:** see 59 for the measurement | | not walker-measurable |',
	'| N8 | Opening the bag sets off the wordmark wrap | Same as N2B | tree | to prove | not walker-measurable |',
	// The over-match cases a looser pattern would wrongly claim as aliases.
	'| 70 | Something else | Rework the panel, then see 17 for the related animation | tree | proven | still open |',
	'| 71 | Another thing | See the spec | tree | proven | still open |',
].join( '\n' );

test( 'MUST FAIL: a Fix cell that is ONLY a pointer makes the row an alias, and feeds `covers`', () => {
	const items = registerItems( SECTION );
	const by = ( id ) => items.find( ( i ) => i.ids.includes( id ) );
	// Red on revert: reading `covers` from a Covers column alone leaves all three of these null.
	assert.equal( by( '3' ).aliasOf, '17', 'See 17' );
	assert.equal( by( '61' ).aliasOf, '59', 'Same as 59' );
	assert.equal( by( 'N8' ).aliasOf, 'N2B', 'Same as N2B — a letter-prefixed id' );
	// The alias must reach `covers`, because that is what the roll-up reads.
	assert.deepEqual( by( '3' ).covers, [ '17' ] );
	assert.deepEqual( by( 'N8' ).covers, [ 'N2B' ] );
} );

test( 'MUST FAIL TO CLAIM: a Fix cell that only MENTIONS another row is real work, not an alias', () => {
	const items = registerItems( SECTION );
	const by = ( id ) => items.find( ( i ) => i.ids.includes( id ) );
	// Not over-matching. Row 70's fix is its own work that happens to cite 17; row 61's EVIDENCE cell says
	// "see 59 for the measurement", which is the exact text a looser pattern would read as a pointer; row 1's
	// fix names a measurement; and row 71 points at a document, not a row.
	assert.equal( by( '70' ).aliasOf, null, 'a pointer inside prose is not an alias' );
	assert.deepEqual( by( '70' ).covers, [], 'and it must not roll up' );
	assert.equal( by( '1' ).aliasOf, null );
	assert.equal( by( '71' ).aliasOf, null, '"See the spec" names no row' );
	// A row that is nobody's alias keeps aliasOf null rather than undefined, so a consumer can test it.
	assert.equal( by( '17' ).aliasOf, null );
} );

test( 'MUST FAIL: an explicit Covers column still wins over a Fix-cell pointer', () => {
	// The site-wide tables carry Covers, and that column is the authored intent: a Fix cell pointer must never
	// override it, or a site-wide row would roll up to one row instead of its whole list.
	// The real column is COMMA-separated, with a ';' or '(' cutting any trailing prose or date — an actual S1
	// cell reads '50, 60, 104, 113, N14, N16a, N41, N36C'. An earlier draft of this test assumed semicolons and
	// failed against correct code, so the shape here is taken from the register itself.
	const siteWide = [
		'## Site-wide',
		'| ID | What it fixes | Fix | Type | Covers | Sweep |',
		'|---|---|---|---|---|---|',
		'| S7 | Focus rings missing | add them | tree | 12, 14, N16a | proven |',
		'| S8 | Something | Same as S7 | tree | 21, 22 | proven |',
		'| S9 | Another | do it | tree | 31, 32; measured 2026-10-05 | proven |',
	].join( '\n' );
	const items = registerItems( siteWide );
	const by = ( id ) => items.find( ( i ) => i.ids.includes( id ) );
	assert.deepEqual( by( 'S7' ).covers, [ '12', '14', 'N16a' ], 'every covered id is read, letter-prefixed included' );
	assert.deepEqual( by( 'S8' ).covers, [ '21', '22' ], 'the Covers column wins over the Fix-cell pointer' );
	assert.equal( by( 'S8' ).aliasOf, 'S7', 'the pointer is still recorded, so nothing is lost' );
	// A ';' ends the id list so a trailing date is never read as an id — the reason that split exists.
	assert.deepEqual( by( 'S9' ).covers, [ '31', '32' ], 'prose after a ";" is not read as ids' );
} );
