// A list item's identity key (Spec 48 FR-48-82, lib/fill-list-content.mjs::identityKeys and ::withIdentity, the identity role
// of data/item-roles.json): a key the block declares technical whose words name the item (`key`, `_key`, `value`, `code`) is
// written from the item's words when the draft gives none, unique in the list. sgs/option-picker renders no pill for an item
// with no `key`, so a chip row of six labels printed nothing (MUST FAIL). Must NOT fire on: a technical key that is no identity
// (`linkRel`), a key the draft filled, a key the block does not declare technical, and a list carrying no words (still one
// row, never items holding only made-up keys). Pure functions only. Mutation list: tests/fixtures/fill-list-identity/mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { listDecisions, listTarget, keyRole } from '../lib/fill-list-content.mjs';

const SCHEMAS = {
	'sgs/picker': { optionItems: { type: 'array', default: [], items: { type: 'object', properties: { key: { type: 'string', role: 'technical' }, label: { type: 'string', role: 'text-content' } } } } },
	'sgs/strip': { items: { type: 'array', default: [], items: { type: 'object', properties: { _key: { type: 'string', role: 'technical' }, linkRel: { type: 'string', role: 'technical' }, title: { type: 'string', role: 'text-content' }, url: { type: 'string', role: 'link' } } } } },
	'sgs/stats': { stats: { type: 'array', default: [], items: { type: 'object', properties: { value: { type: 'string', role: 'text-content' }, label: { type: 'string', role: 'text-content' } } } } },
};
const db = new DatabaseSync( ':memory:' );
db.exec( 'CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, attr_type TEXT, role TEXT, css_property TEXT )' );
db.exec( 'CREATE TABLE block_composition ( block_slug TEXT, accepts_allowed_blocks TEXT )' );
db.exec( "INSERT INTO block_attributes VALUES ( 'sgs/picker', 'optionItems', 'array', 'content', NULL ), ( 'sgs/strip', 'items', 'array', 'content', NULL ), ( 'sgs/stats', 'stats', 'array', 'content', NULL )" );
const decide = ( block, items, fields ) => listDecisions( { block, target: listTarget( db, block, ( b ) => SCHEMAS[ b ] ), node: { innerBlocks: [] }, list: { items, fields: fields.map( ( name ) => ( { name, image: false } ) ), source: 'loop' } } );
const written = ( r ) => r.writes[ 0 ]?.value;

test( 'MUST FAIL: a chip row\'s items get a key from their labels, unique in the list', () => {
	const r = decide( 'sgs/picker', [ { label: 'All' }, { label: 'Ordering & delivery' }, { label: 'Gifting' }, { label: 'Gifting' }, { label: '' } ], [ 'label' ] );
	assert.deepEqual( written( r ), [ { label: 'All', key: 'all' }, { label: 'Ordering & delivery', key: 'ordering-delivery' }, { label: 'Gifting', key: 'gifting' }, { label: 'Gifting', key: 'gifting-2' } ], 'the fifth chip, with no words, holds only its made-up key and is left out' );
	assert.match( r.notes.join( ';' ), /1 item\(s\) holding nothing to show/ );
	assert.equal( keyRole( '_key' ), 'identity' );
} );

test( 'negative control: a technical key that is no identity, a key the draft filled, an untechnical value key and a wordless list', () => {
	const strip = written( decide( 'sgs/strip', [ { title: 'Fast delivery', url: '' } ], [ 'title' ] ) );
	assert.deepEqual( strip, [ { title: 'Fast delivery', _key: 'fast-delivery' } ], '_key is written, linkRel never' );
	const filled = written( decide( 'sgs/picker', [ { label: 'All', key: 'everything' } ], [ 'label', 'key' ] ) );
	assert.deepEqual( filled, [ { label: 'All', key: 'everything' } ], 'the draft\'s own key is kept' );
	const stats = written( decide( 'sgs/stats', [ { label: 'Rating' } ], [ 'label' ] ) );
	assert.deepEqual( stats, [ { label: 'Rating' } ], 'a value key the block does not declare technical is content, never a made-up name' );
	const empty = decide( 'sgs/picker', [ {}, {} ], [ 'label' ] );
	assert.equal( empty.writes.length, 0, 'items with no words are not written for their made-up keys' );
	assert.match( empty.rows[ 0 ].reason, /carry no words/ );
} );
