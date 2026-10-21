// Element identity across a re-export (lib/identity.mjs): a fingerprint carries tag, class, style hash, ancestor tags, a hash
// of the element's own words and its template line; fingerprintAgrees compares every field both sides carry; realign maps a
// previous export's keys to the next export's. A re-export that inserts one element renumbers every tpl after it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fingerprintOf, fingerprintsOf, fingerprintAgrees, fingerprintDiff, realign, tplLineOf, hashText } from '../lib/identity.mjs';
import { resolveApproval } from '../lib/approved-identity.mjs';
import { carryOver } from '../lib/intake-review.mjs';

// A header export: records in document order, [ tpl, parent tpl or null, tag, own words ], keys `Root/<tpl>#0`.
const el = ( [ tpl, parent, tag, words, cls = '' ], shift = 0, line = tpl * 2 + shift ) => ( { key: `Root/${ tpl + shift }#0`, parentKey: null === parent ? null : `Root/${ parent + shift }#0`, tag, words, attrs: cls ? { class: cls } : {}, srcLine: line } );
const HEADER = [ [ 1, null, 'header', '' ], [ 2, 1, 'a', 'Home', 'logo' ], [ 3, 1, 'nav', '' ], [ 4, 3, 'a', 'About' ], [ 5, 3, 'a', 'Contact' ], [ 6, 1, 'button', 'Book now', 'cta' ] ];
const inventory = ( rows, shift = 0 ) => ( { elements: rows.map( ( r ) => el( r, shift ) ) } );
const records = ( inv ) => Object.entries( fingerprintsOf( inv ) ).map( ( [ key, fingerprint ] ) => ( { key, fingerprint } ) );

test( 'a fingerprint carries the ancestor tags, a hash of the own words and the template line', () => {
	const inv = inventory( HEADER );
	const fp = fingerprintsOf( inv );
	assert.deepEqual( fp[ 'Root/4#0' ], { tag: 'a', cls: '', styleHash: hashText( '' ), parentTags: [ 'header', 'nav' ], textHash: hashText( 'About' ), line: 8 } );
	assert.equal( 'line' in fingerprintOf( { key: 'x', parentKey: null, tag: 'p', words: 'w', attrs: {} } ), false );
} );

test( 'tplLineOf finds the line of a stamped element, and not a longer tpl number', () => {
	const text = '<header data-dc-tpl="1">\n<a data-dc-tpl="12">x</a>\n<a data-dc-tpl="2">y</a>\n</header>';
	assert.equal( tplLineOf( text, 2 ), 3 );
	assert.equal( tplLineOf( text, 1 ), 1 );
	assert.equal( tplLineOf( text, 7 ), null );
} );

test( 'fingerprintAgrees compares every field both sides carry and skips a field one side lacks', () => {
	const a = { tag: 'a', cls: 'x', styleHash: '1', parentTags: [ 'nav' ], textHash: 'h', line: 4 };
	assert.equal( fingerprintAgrees( a, { ...a } ), true );
	assert.equal( fingerprintAgrees( { tag: 'a' }, a ), true, 'an old record compares by its tag' );
	assert.equal( fingerprintAgrees( a, { tag: 'a', cls: 'x' } ), true );
	for ( const [ field, value ] of [ [ 'tag', 'p' ], [ 'cls', 'y' ], [ 'styleHash', '2' ], [ 'parentTags', [ 'header' ] ], [ 'textHash', 'g' ], [ 'line', 9 ] ] ) {
		assert.equal( fingerprintAgrees( a, { ...a, [ field ]: value } ), false, `${ field } disagrees` );
	}
	assert.deepEqual( fingerprintDiff( a, { ...a, textHash: 'g', line: 9 }, [ 'line' ] ), [ 'textHash' ] );
	assert.equal( fingerprintAgrees( a, 'a' ), true, 'a live tag name compares the tag' );
	assert.equal( fingerprintAgrees( a, 'div' ), false );
} );

test( 'MUST FAIL a renumbered export re-aligns: every element moved by one id maps to its new key', () => {
	const prev = inventory( HEADER );
	const next = inventory( HEADER, 1 );
	const { map, refused } = realign( records( prev ), records( next ) );
	assert.deepEqual( refused, [] );
	assert.deepEqual( map, { 'Root/1#0': 'Root/2#0', 'Root/2#0': 'Root/3#0', 'Root/3#0': 'Root/4#0', 'Root/4#0': 'Root/5#0', 'Root/5#0': 'Root/6#0', 'Root/6#0': 'Root/7#0' } );
} );

test( 'MUST FAIL a changed element is refused, never matched to a neighbour', () => {
	const next = inventory( HEADER.map( ( r ) => ( 'Contact' === r[ 3 ] ? [ r[ 0 ], r[ 1 ], r[ 2 ], 'Get in touch' ] : r ) ), 1 );
	const { map, refused } = realign( records( inventory( HEADER ) ), records( next ) );
	assert.equal( 'Root/5#0' in map, false );
	assert.equal( refused.length, 1 );
	assert.equal( refused[ 0 ].key, 'Root/5#0' );
	assert.match( refused[ 0 ].why, /differs in textHash/ );
	assert.equal( map[ 'Root/4#0' ], 'Root/5#0', 'the unchanged sibling still maps' );
} );

test( 'MUST FAIL an element that is gone from the new export is refused', () => {
	const { map, refused } = realign( records( inventory( HEADER ) ), records( inventory( HEADER.filter( ( r ) => 6 !== r[ 0 ] ), 1 ) ) );
	assert.equal( 'Root/6#0' in map, false );
	assert.deepEqual( refused.map( ( r ) => r.key ), [ 'Root/6#0' ] );
} );

test( 'a duplicated sibling pairs in document order even though its template line moved', () => {
	const next = inventory( [ ...HEADER.slice( 0, 4 ), [ 7, 3, 'a', 'About' ], ...HEADER.slice( 4 ) ], 0 );
	next.elements.forEach( ( e, i ) => ( e.srcLine = 100 + i ) );
	const { map, refused } = realign( records( inventory( HEADER ) ), records( next ) );
	assert.deepEqual( refused, [] );
	assert.equal( map[ 'Root/4#0' ], 'Root/4#0' );
} );

test( 'an old record with only a tag still re-aligns by tag order within its ancestors', () => {
	const old = [ { key: 'Root/4#0', fingerprint: { tag: 'a' } }, { key: 'Root/5#0', fingerprint: { tag: 'a' } } ];
	const { map } = realign( old, records( inventory( HEADER, 1 ) ).filter( ( r ) => 'a' === r.fingerprint.tag && r.fingerprint.parentTags.includes( 'nav' ) ) );
	assert.deepEqual( map, { 'Root/4#0': 'Root/5#0', 'Root/5#0': 'Root/6#0' } );
} );

// An approval names the row by its key and carries the fingerprint of the element Bean approved.
const rowsOf = ( inv ) => Object.fromEntries( inv.elements.map( ( e ) => [ `skeleton:header:${ e.key }`, { key: e.key, tag: e.tag } ] ) );
test( 'MUST FAIL an approval whose key now names another element is realigned to the element it was, or refused', () => {
	const approvedFp = fingerprintsOf( inventory( HEADER ) )[ 'Root/4#0' ];
	const approval = { rowId: 'skeleton:header:Root/4#0', fingerprint: approvedFp };
	const renumbered = inventory( HEADER, 1 );
	const ctx = { rows: rowsOf( renumbered ), fingerprints: { header: fingerprintsOf( renumbered ) } };
	const hit = resolveApproval( approval, ctx );
	assert.equal( hit.how, 'realigned' );
	assert.equal( hit.row.key, 'Root/5#0', 'About moved from 4 to 5; the old key 4 now names the nav and is not matched' );
	const same = inventory( HEADER );
	assert.equal( resolveApproval( approval, { rows: rowsOf( same ), fingerprints: { header: fingerprintsOf( same ) } } ).how, 'exact' );
	const changed = inventory( HEADER.map( ( r ) => ( 'About' === r[ 3 ] ? [ r[ 0 ], r[ 1 ], r[ 2 ], 'Our story' ] : r ) ), 1 );
	const refused = resolveApproval( approval, { rows: rowsOf( changed ), fingerprints: { header: fingerprintsOf( changed ) } } );
	assert.match( refused.refused, /no element of the new export agrees/ );
	assert.equal( resolveApproval( { rowId: 'skeleton:header:Root/4#0' }, ctx ).how, 'unchecked', 'an approval with no fingerprint keeps its old behaviour' );
} );

// A previous intake with a marked skeleton row, and the same surface after a re-export renumbered it.
const intakeOf = ( inv, block = 'sgs/button' ) => ( {
	takenOn: '2026-10-01', skeletons: { header: { rows: inv.elements.map( ( e ) => ( { rowId: `skeleton:header:${ e.key }`, key: e.key, tag: e.tag, words: e.words, block: 'button' === e.tag ? block : 'sgs/text', fingerprint: fingerprintsOf( inv )[ e.key ] } ) ) } },
} );
const marked = ( intake ) => ( { ...intake, review: carryOver( null, intake ).review.map( ( r ) => ( /Root\/6#0$/.test( r.rowId ) ? { ...r, mark: 'accept', markedOn: '2026-10-02' } : r ) ) } );
test( 'MUST FAIL a review mark follows its element to the renumbered row, and a changed element refuses it, listed', () => {
	const prev = marked( intakeOf( inventory( HEADER ) ) );
	assert.equal( prev.review.filter( ( r ) => null !== r.mark ).length, 1 );
	const kept = carryOver( prev, intakeOf( inventory( HEADER, 1 ) ) );
	assert.deepEqual( kept.realigned, [ 'skeleton:header:Root/6#0 -> skeleton:header:Root/7#0' ] );
	assert.deepEqual( kept.refused, [] );
	assert.equal( kept.review.find( ( r ) => 'skeleton:header:Root/7#0' === r.rowId ).mark, 'accept' );
	const lost = carryOver( prev, intakeOf( inventory( HEADER.map( ( r ) => ( 'Book now' === r[ 3 ] ? [ r[ 0 ], r[ 1 ], r[ 2 ], 'Reserve', r[ 4 ] ] : r ) ), 1 ) ) );
	assert.equal( lost.review.find( ( r ) => 'skeleton:header:Root/7#0' === r.rowId ).mark, null );
	assert.equal( lost.refused.length, 1 );
	assert.match( lost.refused[ 0 ], /^skeleton:header:Root\/6#0: mark "accept" not carried \(the element at .* differs in textHash\)/ );
	assert.match( carryOver( prev, intakeOf( inventory( HEADER, 1 ), 'sgs/cta' ) ).refused[ 0 ], /its proposal changed \(sgs\/button to sgs\/cta\)/ );
	assert.match( carryOver( prev, intakeOf( inventory( HEADER.filter( ( r ) => 6 !== r[ 0 ] ), 1 ) ) ).refused[ 0 ], /no element of the same tag and ancestors/ );
} );

test( 'MUST FAIL a mark never rides a row id whose content is unchanged but whose element is another', () => {
	const row = ( parentTags ) => ( { rowId: 'skeleton:header:Root/9#0', key: 'Root/9#0', tag: 'a', words: 'Home', block: 'sgs/text', fingerprint: { tag: 'a', cls: '', styleHash: '0', parentTags, textHash: 'h' } } );
	const intake = ( parentTags ) => ( { takenOn: '2026-10-01', skeletons: { header: { rows: [ row( parentTags ) ] } } } );
	const prev = { ...intake( [ 'header', 'nav' ] ) };
	prev.review = carryOver( null, prev ).review.map( ( r ) => ( { ...r, mark: 'accept', markedOn: '2026-10-02' } ) );
	const out = carryOver( prev, intake( [ 'footer' ] ) );
	assert.equal( out.review[ 0 ].mark, null );
	assert.equal( out.refused.length, 1 );
	assert.equal( carryOver( prev, intake( [ 'header', 'nav' ] ) ).review[ 0 ].mark, 'accept', 'the same element keeps its mark by row id' );
} );

test( 'MUST FAIL an approval that several elements agree with is refused, not given to the first', () => {
	const inv = inventory( [ ...HEADER, [ 7, 3, 'a', 'About' ] ], 1 );
	const approval = { rowId: 'skeleton:header:Root/90#0', fingerprint: fingerprintsOf( inventory( HEADER ) )[ 'Root/4#0' ] };
	const out = resolveApproval( approval, { rows: rowsOf( inv ), fingerprints: { header: fingerprintsOf( inv ) } } );
	assert.match( out.refused, /^2 elements of the new export agree/ );
} );
