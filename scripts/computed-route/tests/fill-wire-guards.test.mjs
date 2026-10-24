// Guards on three Fill writers, on planted fixtures only (no framework DB): a minimum the block's stylesheet declares is
// never read back as the initial value (lib/fill-prop.mjs::inOwnContext, ::calibratedContext); a shop part never
// overwrites a value another writer or another part put on the node (lib/fill-shop-parts.mjs::shopPartWrites); the
// copyright prefix is a short run of words that never holds the site name (lib/skeleton-write-content.mjs::copyrightPrefixParts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { tiersDiffering, inOwnContext, calibratedContext } from '../lib/fill-prop.mjs';
import { shopPartWrites } from '../lib/fill-shop-parts.mjs';
import { addRefs, refOf } from '../lib/tree.mjs';
import { copyrightPrefixOf, copyrightPrefixParts, makeContent } from '../lib/skeleton-write-content.mjs';

test( 'MUST FAIL: a min-height the block declares reads 0px off a flex item, and stays a 0px against a flex item\'s draft auto', () => {
	const block = { parentDisplay: 'block' };
	const declared = { parentDisplay: 'block', own: [ 'min-height' ] };
	assert.deepEqual( tiersDiffering( 'min-height', { 1440: 'auto' }, () => '0px', () => '0px', () => ( { parentDisplay: 'flex' } ), () => declared ), { 1440: 'auto' } );
	assert.equal( inOwnContext( 'min-height', '0px', declared ), '0px' );
	// Negative control: the browser's own 0px (no declaration marked) is still the initial value there.
	assert.deepEqual( tiersDiffering( 'min-height', { 1440: 'auto' }, () => '0px', () => '0px', () => ( { parentDisplay: 'flex' } ), () => block ), {} );
	// Another property marked own leaves this one's substitution alone.
	assert.equal( inOwnContext( 'min-height', '0px', { parentDisplay: 'block', own: [ 'color' ] } ), 'auto' );
} );

test( 'MUST FAIL: calibratedContext carries the properties the paint marks _own: as the context\'s own', () => {
	const cal = { elements: { '': { 1440: { 'min-height': '0px', '_own:min-height': '0px', _parentDisplay: 'block' }, 375: { 'min-height': '0px', _parentDisplay: 'block' } } } };
	assert.deepEqual( calibratedContext( cal, '', 1440 ), { parentDisplay: 'block', own: [ 'min-height' ] } );
	assert.deepEqual( calibratedContext( cal, '', 375 ), { parentDisplay: 'block' }, 'no _own: key, no own list' );
} );

const part = ( id, attr, value ) => ( { id, label: id, home: { type: 'setting', block: 'sgs/cart', settings: [ attr ] }, write: { [ attr ]: value }, by: [ 'structure' ], units: 1, sample: [] } );
const record = ( parts ) => ( { surfaces: [ { kind: 'drawer', parts } ] } );
const cart = ( attrs = {} ) => {
	const flat = [ { name: 'sgs/cart', attributes: { ...attrs } } ];
	addRefs( flat, 'fx' );
	return { flat, nodes: [ { index: 0, name: 'sgs/cart' } ] };
};
const attrExists = () => true;

test( 'MUST FAIL: two shop parts writing one setting differently: the first writes, the second is a conflict row', () => {
	const { flat, nodes } = cart();
	const r = shopPartWrites( { record: record( [ part( 'drawer-a', 'itemRemoveLabel', 'Take out' ), part( 'drawer-b', 'itemRemoveLabel', 'Remove' ) ] ), nodes, flat, refOf, attrExists } );
	assert.equal( flat[ 0 ].attributes.itemRemoveLabel, 'Take out' );
	assert.deepEqual( r.writes.map( ( w ) => w.attr ), [ 'itemRemoveLabel' ] );
	assert.equal( r.unmapped.length, 1 );
	assert.match( r.unmapped[ 0 ].reason, /^conflict: itemRemoveLabel already holds "Take out" \(written by shop part drawer-a \(drawer\)\)/ );
	// Positive: two parts agreeing on the value write once and leave no row.
	const same = cart();
	const s = shopPartWrites( { record: record( [ part( 'drawer-a', 'itemRemoveLabel', 'Take out' ), part( 'drawer-b', 'itemRemoveLabel', 'Take out' ) ] ), nodes: same.nodes, flat: same.flat, refOf, attrExists } );
	assert.equal( s.writes.length, 1 );
	assert.deepEqual( s.unmapped, [] );
} );

test( 'MUST FAIL: a value the skeleton put on the node, which no write this run names, is never overwritten silently', () => {
	const { flat, nodes } = cart( { emptyCartMessage: 'Your bag is empty' } );
	const r = shopPartWrites( { record: record( [ part( 'drawer-empty', 'emptyCartMessage', 'Nothing here' ) ] ), nodes, flat, refOf, attrExists } );
	assert.equal( flat[ 0 ].attributes.emptyCartMessage, 'Your bag is empty' );
	assert.deepEqual( r.writes, [] );
	assert.match( r.unmapped[ 0 ]?.reason || '', /^conflict: emptyCartMessage already holds "Your bag is empty" \(written by the skeleton\)/ );
	// A writer this run names is the one the row cites.
	const named = cart( { emptyCartMessage: 'Your bag is empty' } );
	const n = shopPartWrites( { record: record( [ part( 'drawer-empty', 'emptyCartMessage', 'Nothing here' ) ] ), nodes: named.nodes, flat: named.flat, refOf, attrExists, writes: [ { index: 0, attr: 'emptyCartMessage', how: 'content' } ] } );
	assert.match( n.unmapped[ 0 ].reason, /\(written by content\)/ );
	// An empty node takes the part's value.
	const empty = cart();
	assert.equal( shopPartWrites( { record: record( [ part( 'drawer-empty', 'emptyCartMessage', 'Nothing here' ) ] ), nodes: empty.nodes, flat: empty.flat, refOf, attrExists } ).writes.length, 1 );
} );

test( 'MUST FAIL: a copyright prefix is a short run of words that never holds the site name; anything else is leftover', () => {
	assert.deepEqual( copyrightPrefixParts( 'Acme Foods 1998 - 2026', 'Acme Foods' ), { prefix: '', leftover: 'Acme Foods' } );
	assert.deepEqual( copyrightPrefixParts( 'Acme Ltd, est. 2005. © 2026' ), { prefix: '', leftover: 'Acme Ltd, est. 2005.' } );
	assert.equal( copyrightPrefixOf( 'The Acme Foods Company Limited © 2026' ), '', 'more than a short run of words' );
	assert.deepEqual( copyrightPrefixParts( 'Acme, Inc. © 2026' ), { prefix: '', leftover: 'Acme, Inc.' }, 'punctuation is no run of words' );
	assert.equal( copyrightPrefixOf( 'Copyright © 2026 Acme', 'Acme' ), 'Copyright', 'a prefix that does not hold the name stays' );
	assert.equal( copyrightPrefixOf( 'All rights reserved © 2026' ), 'All rights reserved' );
	assert.deepEqual( copyrightPrefixParts( '© 2026 Acme' ), { prefix: '', leftover: '' } );
} );

test( 'MUST FAIL: contentAttrs leaves a rejected prefix out and hands its words to the Site Info line', () => {
	const facts = { composition: {}, enumOf: ( b, a ) => ( 'displayType' === a ? [ 'copyright' ] : null ), attr: ( b, a ) => 'copyrightPrefix' === a, wrapperShells: [], displayTypes: [ 'copyright' ], logoBlocks: [], firstAttrByRole: () => null, siteName: 'Acme Foods' };
	const m = { words: ( e ) => e.text, textWithBreaks: ( e ) => e.text, blockKids: () => [] };
	const { contentAttrs } = makeContent( { m, facts, view: null, carried: null, surfaceKind: 'footer' } );
	const r = contentAttrs( 'sgs/business-info', { text: 'Acme Foods 1998 - 2026', tag: 'p' }, { siteInfoKind: 'copyright' } );
	assert.equal( r.a.copyrightPrefix, '' );
	assert.ok( r.handover.some( ( h ) => /"Acme Foods", are no prefix/.test( h.detail ) ), JSON.stringify( r.handover ) );
	const ok = contentAttrs( 'sgs/business-info', { text: 'Copyright © 2026 Acme Foods', tag: 'p' }, { siteInfoKind: 'copyright' } );
	assert.equal( ok.a.copyrightPrefix, 'Copyright' );
	assert.ok( ! ok.handover.some( ( h ) => /no prefix/.test( h.detail ) ) );
} );
