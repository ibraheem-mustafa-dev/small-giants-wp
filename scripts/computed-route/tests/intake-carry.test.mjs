// Spec 48 FR-48-17, lib/intake-review-carry.mjs::carryOver: a re-run carries each of Bean's marks to the row its element
// is now, by content, never by row number. Planted pairs of intake records: an export that renumbers its rows, a strip
// surface a header now reads as its own row, rows written before rows carried a fingerprint, and rows that really changed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { carryOver, applyReview, renderReview } from '../lib/intake-review.mjs';
import { earlierIds } from '../lib/intake-review-carry.mjs';

const base = ( skeletons ) => ( { takenOn: '2026-10-01T09:00:00Z', skeletons, review: [] } );
// A skeleton row as an intake written before fingerprints records it: its tag, words and template source.
const row = ( surface, n, tag, words, block, extra = {} ) => ( { rowId: `skeleton:${ surface }:Site/${ n }#0`, key: `Site/${ n }#0`, tag, words, block,
	snippet: `<${ tag } style="color:red" data-dc-tpl="${ n }">${ words }</${ tag }>`, ...extra } );
const ELEMENTS = [ [ 'div', '', 'sgs/container' ], [ 'a', 'Call us', 'sgs/button' ], [ 'a', 'Email us', 'sgs/button' ], [ 'p', 'Since 1962', 'sgs/text' ] ];
const rows = ( surface, from, list = ELEMENTS ) => list.map( ( [ tag, words, block ], i ) => row( surface, from + i, tag, words, block ) );
// The previous record with every row marked accept.
const marked = ( intake ) => ( { ...intake, review: carryOver( null, intake ).review.map( ( r ) => ( { ...r, mark: 'accept', markedOn: '2026-10-02' } ) ) } );
const markOf = ( out, id ) => out.review.find( ( r ) => r.rowId === id )?.mark ?? null;

test( 'MUST FAIL: an export that renumbers its rows carries every mark to the row its element is now', () => {
	const prev = marked( base( { page: { rows: rows( 'page', 10 ) } } ) );
	// One element inserted before them: every template number moves on by one.
	const next = base( { page: { rows: [ row( 'page', 10, 'span', 'New', 'sgs/text' ), ...rows( 'page', 11 ) ] } } );
	const out = carryOver( prev, next );
	assert.deepEqual( out.refused, [] );
	assert.deepEqual( out.changed, [] );
	assert.deepEqual( out.realigned, [ 10, 11, 12, 13 ].map( ( n ) => `skeleton:page:Site/${ n }#0 -> skeleton:page:Site/${ n + 1 }#0` ) );
	assert.deepEqual( [ 11, 12, 13, 14 ].map( ( n ) => markOf( out, `skeleton:page:Site/${ n }#0` ) ), [ 'accept', 'accept', 'accept', 'accept' ] );
	assert.equal( markOf( out, 'skeleton:page:Site/10#0' ), null, 'the inserted element never takes the mark its number had' );
	assert.deepEqual( out.review.find( ( r ) => 'skeleton:page:Site/12#0' === r.rowId ).realignedFrom, [ 'skeleton:page:Site/11#0' ] );
} );

test( 'MUST FAIL: a strip surface the header now reads as its own row carries its marks to the header rows, by content', () => {
	const prev = marked( base( { strip: { rows: rows( 'strip', 1 ) }, header: { rows: [ row( 'header', 9, 'header', '', 'sgs/site-header' ) ] } } ) );
	const next = base( { header: { rows: [ row( 'header', 9, 'header', '', 'sgs/site-header' ), ...rows( 'header', 1 ) ] } } );
	const out = carryOver( prev, next );
	assert.deepEqual( out.refused, [] );
	assert.deepEqual( [ 1, 2, 3, 4, 9 ].map( ( n ) => markOf( out, `skeleton:header:Site/${ n }#0` ) ), [ 'accept', 'accept', 'accept', 'accept', 'accept' ] );
	assert.equal( out.realigned.length, 4 );
	// The row keeps the ID it had through Bean's next apply, so an approval naming it still finds it.
	const applied = applyReview( { ...next, review: out.review }, renderReview( { ...next, review: out.review } ) ).intake;
	assert.deepEqual( applied.review.find( ( r ) => 'skeleton:header:Site/1#0' === r.rowId ).realignedFrom, [ 'skeleton:strip:Site/1#0' ] );
	// And through the run after that, where the row keeps its ID.
	const again = carryOver( applied, next );
	assert.deepEqual( again.review.find( ( r ) => 'skeleton:header:Site/1#0' === r.rowId ).realignedFrom, [ 'skeleton:strip:Site/1#0' ] );
} );

test( 'MUST FAIL: a row whose proposal or words changed is never re-marked; it is listed changed and the lost mark is named', () => {
	const prev = marked( base( { strip: { rows: rows( 'strip', 1 ) }, page: { rows: rows( 'page', 20 ) } } ) );
	const swapped = ELEMENTS.map( ( e ) => ( 'Call us' === e[ 1 ] ? [ e[ 0 ], e[ 1 ], 'sgs/business-info' ] : e ) );
	const reworded = ELEMENTS.map( ( e ) => ( 'Since 1962' === e[ 1 ] ? [ e[ 0 ], 'Since 1963', e[ 2 ] ] : e ) );
	const out = carryOver( prev, base( { header: { rows: rows( 'header', 1, swapped ) }, page: { rows: rows( 'page', 20, reworded ) } } ) );
	assert.equal( markOf( out, 'skeleton:header:Site/2#0' ), null );
	assert.equal( markOf( out, 'skeleton:page:Site/23#0' ), null );
	assert.deepEqual( out.changed.sort(), [ 'skeleton:header:Site/2#0', 'skeleton:page:Site/23#0' ] );
	assert.deepEqual( out.refused, [ 'skeleton:strip:Site/2#0: mark "accept" not carried (the element moved to skeleton:header:Site/2#0 but its proposal changed (sgs/button to sgs/business-info))' ] );
	assert.equal( markOf( out, 'skeleton:header:Site/3#0' ), 'accept', 'the unchanged rows still carry' );
} );

test( 'MUST FAIL: a fingerprinted element whose words changed at the same row ID is that row changed; another element at the ID never takes the mark', () => {
	const fp = ( parentTags, textHash ) => ( { tag: 'p', cls: '', styleHash: '1', parentTags, textHash, line: 4 } );
	const one = ( words, f ) => base( { page: { rows: [ { rowId: 'skeleton:page:Site/5#0', key: 'Site/5#0', tag: 'p', words, block: 'sgs/text', fingerprint: f } ] } } );
	const prev = marked( one( 'Since 1962', fp( [ 'main' ], 'a' ) ) );
	const out = carryOver( prev, one( 'Since 1963', fp( [ 'main' ], 'b' ) ) );
	assert.deepEqual( out.changed, [ 'skeleton:page:Site/5#0' ] );
	assert.equal( out.review[ 0 ].mark, null );
	const other = carryOver( prev, one( 'Since 1962', fp( [ 'footer' ], 'a' ) ) );
	assert.deepEqual( other.changed, [], 'another element is a new row, not a changed one' );
	assert.equal( other.review[ 0 ].mark, null );
	assert.equal( other.refused.length, 1 );
} );

test( 'MUST FAIL: rows of equal content pair in document order only when both exports hold the same number of them', () => {
	const pair = [ [ 'a', 'Shop', 'sgs/button' ], [ 'a', 'Shop', 'sgs/button' ] ];
	const prev = marked( base( { strip: { rows: rows( 'strip', 1, pair ) } } ) );
	const kept = carryOver( prev, base( { header: { rows: rows( 'header', 1, pair ) } } ) );
	assert.deepEqual( [ 1, 2 ].map( ( n ) => markOf( kept, `skeleton:header:Site/${ n }#0` ) ), [ 'accept', 'accept' ] );
	const three = carryOver( prev, base( { header: { rows: rows( 'header', 1, [ ...pair, pair[ 0 ] ] ) } } ) );
	assert.deepEqual( three.review.filter( ( r ) => r.mark ).length, 0 );
	assert.match( three.refused[ 0 ], /3 elements of the new export hold its content where the previous export held 2/ );
} );

test( 'MUST FAIL: a row moved twice keeps every earlier ID, so an approval made under the first still finds it', () => {
	const prev = marked( base( { page: { rows: rows( 'page', 1 ) } } ) );
	const middle = base( { page: { rows: [ row( 'page', 1, 'span', 'New', 'sgs/text' ), ...rows( 'page', 2 ) ] } } );
	const once = carryOver( prev, middle );
	const twice = carryOver( { ...middle, review: once.review }, base( { page: { rows: [ row( 'page', 1, 'span', 'New', 'sgs/text' ), row( 'page', 2, 'span', 'Newer', 'sgs/text' ), ...rows( 'page', 3 ) ] } } ) );
	assert.deepEqual( twice.review.find( ( r ) => 'skeleton:page:Site/3#0' === r.rowId ).realignedFrom, [ 'skeleton:page:Site/1#0', 'skeleton:page:Site/2#0' ] );
	assert.deepEqual( earlierIds( { realignedFrom: 'skeleton:page:Site/1#0' }, 'skeleton:page:Site/2#0' ), [ 'skeleton:page:Site/1#0', 'skeleton:page:Site/2#0' ], 'an older intake holds one ID' );
} );

test( 'MUST FAIL: among rows of equal content, a row that keeps its ID keeps its mark, and an ambiguous rest is refused, never carried', () => {
	const pair = [ [ 'a', 'Shop', 'sgs/button' ], [ 'a', 'Shop', 'sgs/button' ] ];
	const prev = base( { page: { rows: rows( 'page', 1, pair ) } } );
	prev.review = carryOver( null, prev ).review.map( ( r, i ) => ( { ...r, mark: 0 === i ? 'accept' : 'remove', markedOn: '2026-10-02' } ) );
	// Site/2 is gone and a new equal element Site/3 sits before Site/1.
	const next = base( { page: { rows: [ row( 'page', 3, 'a', 'Shop', 'sgs/button' ), row( 'page', 1, 'a', 'Shop', 'sgs/button' ) ] } } );
	const out = carryOver( prev, next );
	assert.equal( markOf( out, 'skeleton:page:Site/1#0' ), 'accept' );
	assert.equal( markOf( out, 'skeleton:page:Site/3#0' ), null );
	assert.equal( out.refused.length, 1 );
	assert.match( out.refused[ 0 ], /^skeleton:page:Site\/2#0: mark "remove" not carried \(2 elements of equal content cannot be told apart/ );
	// Control: the new element after Site/1 keeps document order, so the rest pairs.
	const after = carryOver( prev, base( { page: { rows: [ row( 'page', 1, 'a', 'Shop', 'sgs/button' ), row( 'page', 3, 'a', 'Shop', 'sgs/button' ) ] } } ) );
	assert.deepEqual( [ markOf( after, 'skeleton:page:Site/1#0' ), markOf( after, 'skeleton:page:Site/3#0' ) ], [ 'accept', 'remove' ] );
} );
