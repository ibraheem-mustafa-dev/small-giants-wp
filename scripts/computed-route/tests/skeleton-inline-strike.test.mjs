// A phrasing child an element's rich text holds keeps the format its declared style draws (Spec 48 FR-48-97,
// lib/skeleton-write-content.mjs::makeContent): a span with `text-decoration: line-through` is the text's strikethrough
// (`<s>`), as an `<s>` or `<del>` child is, and its row records where its look went (`conserve` kind `format`, verified by
// lib/skeleton-paint-conservation.mjs::checkRecords against the node's rich text), so paint conservation reads the struck
// price. Before, the span's words were written bare: the clone showed the RRP unstruck and the proposal failed on an
// unread text-decoration. Pure functions only. Mutation list: tests/skeleton-inline-strike.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRecords } from '../lib/skeleton-paint-conservation.mjs';
import { N, run, row } from './fixtures/skeleton-widgets/build.mjs';

const LOGIC = 'class Component { renderVals() { return {}; } }';
const page = ( el ) => N( 'section', {}, [ N( 'div', {}, [ el ] ) ] );
const price = ( style ) => N( 'span', { style: 'font-size:15px', words: 'RRP', parts: [ 'RRP ', 0 ] }, [ N( 'span', { style, words: '£171' } ) ] );
const paintLines = ( r ) => ( r.problems || [] ).filter( ( p ) => /paint conservation/.test( p ) && /Root\/4#0/.test( p ) );

test( 'MUST FAIL: a span struck through by its style is the text\'s strikethrough, and its row records the format the text holds', () => {
	const r = run( page( price( 'text-decoration:line-through' ) ), LOGIC );
	assert.equal( row( r, 'Root/3#0' ).block, 'sgs/text' );
	assert.equal( row( r, 'Root/3#0' ).attributes.text, 'RRP <s>£171</s>', 'MUST FAIL: the struck words keep their strikethrough' );
	assert.deepEqual( row( r, 'Root/4#0' ).conserve, [ { kind: 'format', node: 'Root/3#0', format: 's', looks: [ 'text-decoration' ] } ], 'MUST FAIL: the row names the format that carries its look' );
	assert.deepEqual( paintLines( r ), [], 'MUST FAIL: paint conservation reads the strike-through' );
} );

test( 'a text-decoration-line longhand strikes through too', () => {
	const r = run( page( price( 'text-decoration-line:line-through' ) ), LOGIC );
	assert.equal( row( r, 'Root/3#0' ).attributes.text, 'RRP <s>£171</s>' );
} );

test( 'NEGATIVE: an underlined span is no strikethrough: its words stay bare and it records no format', () => {
	const r = run( page( price( 'text-decoration:underline' ) ), LOGIC );
	assert.equal( row( r, 'Root/3#0' ).attributes.text, 'RRP £171' );
	assert.ok( ! [].concat( row( r, 'Root/4#0' ).conserve || [] ).some( ( x ) => 'format' === x.kind ), 'no format carries an underline' );
} );

test( 'NEGATIVE: a struck-through link keeps its address and is no strikethrough', () => {
	const a = N( 'span', { words: 'See', parts: [ 'See ', 0 ] }, [ N( 'a', { style: 'text-decoration:line-through', attrs: { href: '/old' }, words: 'old price' } ) ] );
	const r = run( page( a ), LOGIC );
	assert.ok( ! /<s>/.test( row( r, 'Root/3#0' ).attributes?.text ?? '' ) );
} );

test( 'NEGATIVE checkRecords: a format record is verified against the node\'s rich text, and refused where the text does not hold the format', () => {
	const nodes = new Map( [ [ 'Root/3#0', { attributes: { text: 'RRP <s>£171</s>' } } ], [ 'Root/9#0', { attributes: { text: 'RRP £171' } } ] ] );
	const ok = checkRecords( [ { kind: 'format', node: 'Root/3#0', format: 's', looks: [ 'text-decoration' ] } ], { looks: [ 'text-decoration' ], nodes } );
	assert.deepEqual( [ ok.delivered, ok.bad ], [ [ 'text-decoration' ], [] ] );
	const bare = checkRecords( [ { kind: 'format', node: 'Root/9#0', format: 's', looks: [ 'text-decoration' ] } ], { looks: [ 'text-decoration' ], nodes } );
	assert.deepEqual( bare.delivered, [] );
	assert.equal( bare.bad.length, 1 );
	const none = checkRecords( [ { kind: 'format', node: 'Root/3#0', looks: [ 'text-decoration' ] } ], { looks: [ 'text-decoration' ], nodes } );
	assert.match( none.bad[ 0 ], /names no format/ );
} );
