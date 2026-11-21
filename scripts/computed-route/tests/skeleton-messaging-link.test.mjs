// rules.messagingLink: a link to a messaging app (WhatsApp: wa.me, whatsapp.com and below, the whatsapp: scheme) holding
// the app's mark is the app's button block (sgs/whatsapp-cta): fixed to the viewport the floating style, in the page flow
// the inline style, with a title over a line the card style; words with no mark are a text link reading the app's Site
// Info address. Synthetic inventories in the reader's shape (lib/skeleton-inventory.mjs). Tests marked MUST FAIL fail on
// the skeleton writer before the rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { messagingApp, messagingLink } from '../lib/skeleton-messaging-link.mjs';
import { inventoryModel } from '../lib/skeleton-model.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
const RULE = () => facts().decisions.rules.messagingLink;

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const ALL = { 375: true, 768: true, 1440: true };
const FIXED = { 375: 'fixed', 768: 'fixed', 1440: 'fixed' };
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: { 375: { x: 0, y: 100, w: 200, h: 48 }, 768: { x: 0, y: 100, w: 200, h: 48 }, 1440: { x: 0, y: 100, w: 200, h: 48 } }, visible: x.visible || ALL, display: 'block', flexDirection: 'row', screenshots: {}, ...( x.position ? { position: x.position } : {} ) } );
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const MARK = ( parent ) => el( 'Root/6#0', parent, 'img', '', { depth: 3, attrs: { srcBasename: 'whatsapp-ink.svg', 'aria-hidden': 'true' } } );
// A page: a section with a heading, a paragraph and the link (Root/5#0) holding what `inner` gives.
const page = ( { href = 'https://wa.me/447700900123', words = '', inner = [], position } = {} ) => [
	el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
	el( 'Root/2#0', 'Root/1#0', 'section', '', { depth: 1 } ),
	el( 'Root/3#0', 'Root/2#0', 'h2', 'Talk to me', { depth: 2 } ),
	el( 'Root/4#0', 'Root/2#0', 'p', 'I answer every message myself, usually within the hour.', { depth: 2 } ),
	el( 'Root/5#0', 'Root/2#0', 'a', words, { depth: 2, attrs: { href }, position } ),
	...inner,
];
const run = ( elements ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'test', db } );
const node = ( tree, key ) => {
	for ( const n of tree ) {
		if ( key === n.draftRef?.tpl ) {
			return n;
		}
		const hit = node( n.innerBlocks || [], key );
		if ( hit ) {
			return hit;
		}
	}
	return null;
};

test( 'MUST FAIL: a WhatsApp link holding the mark and a label in the page flow is sgs/whatsapp-cta inline, the number a Site Info handover', () => {
	const { skeleton, proposal } = run( page( { words: 'Message me on WhatsApp', inner: [ MARK( 'Root/5#0' ) ] } ) );
	const n = node( skeleton, 'Root/5#0' );
	assert.equal( n?.name, 'sgs/whatsapp-cta' );
	assert.deepEqual( n.attributes, { variant: 'inline', label: 'Message me on WhatsApp', message: '' } );
	assert.deepEqual( n.innerBlocks, [] );
	assert.equal( proposal.rows.find( ( r ) => 'Root/5#0' === r.key ).rule, 'messagingLink' );
	assert.ok( n.handover.some( ( h ) => 'site-info' === h.owner && /"socials\.whatsapp" must read: https:\/\/wa\.me\/447700900123/.test( h.detail ) ) );
} );

test( 'MUST FAIL: fixed to the viewport it is the floating style, its label hidden below the width it shows from', () => {
	const inner = [ MARK( 'Root/5#0' ), el( 'Root/7#0', 'Root/5#0', 'span', 'Ask me anything', { depth: 3, visible: { 375: false, 768: true, 1440: true } } ) ];
	const n = node( run( page( { inner, position: FIXED, href: 'https://api.whatsapp.com/send?phone=447700900123&text=Hello%20there' } ) ).skeleton, 'Root/5#0' );
	assert.equal( n?.name, 'sgs/whatsapp-cta' );
	assert.deepEqual( n.attributes, { variant: 'floating', label: 'Ask me anything', message: 'Hello there', floatingHideLabelBelow: 768 } );
	const always = [ MARK( 'Root/5#0' ), el( 'Root/7#0', 'Root/5#0', 'span', 'Ask me anything', { depth: 3 } ) ];
	assert.equal( node( run( page( { inner: always, position: FIXED } ) ).skeleton, 'Root/5#0' ).attributes.floatingHideLabelBelow, undefined, 'a label shown at every width is never hidden' );
} );

test( 'MUST FAIL: the mark with a title over a line is the card style', () => {
	const inner = [
		el( 'Root/8#0', 'Root/5#0', 'span', '', { depth: 3 } ),
		MARK( 'Root/8#0' ),
		el( 'Root/9#0', 'Root/5#0', 'span', 'Need advice?', { depth: 3 } ),
		el( 'Root/10#0', 'Root/9#0', 'span', 'Message me, I reply within the hour', { depth: 4 } ),
	];
	const n = node( run( page( { inner } ) ).skeleton, 'Root/5#0' );
	assert.equal( n?.name, 'sgs/whatsapp-cta' );
	assert.deepEqual( n.attributes, { variant: 'card', cardTitle: 'Need advice?', cardSubline: 'Message me, I reply within the hour', message: '' } );
} );

test( 'MUST FAIL: words with no mark are a text link whose link reads the WhatsApp Site Info address', () => {
	const n = node( run( page( { words: 'WhatsApp me', href: 'whatsapp://send?phone=447700900123' } ) ).skeleton, 'Root/5#0' );
	assert.equal( n?.name, 'sgs/button' );
	assert.equal( n.attributes.linkSource, 'whatsapp' );
	assert.equal( n.attributes.label, 'WhatsApp me' );
} );

test( 'negative controls: a phone link, a look-alike host, a mark with no words, three runs of words, a paragraph', () => {
	const rule = RULE();
	assert.equal( messagingApp( 'tel:+447700900123', rule ), null, 'a link to a phone number is not WhatsApp' );
	assert.equal( messagingApp( 'https://wa.me.example.com/447700900123', rule ), null );
	assert.equal( messagingApp( 'https://notwhatsapp.com/x', rule ), null );
	assert.equal( messagingApp( 'https://web.whatsapp.com/send', rule )?.name, 'WhatsApp' );
	assert.notEqual( node( run( page( { words: 'Call me', href: 'tel:+447700900123', inner: [ MARK( 'Root/5#0' ) ] } ) ).skeleton, 'Root/5#0' )?.name, 'sgs/whatsapp-cta' );
	const iconOnly = run( page( { inner: [ MARK( 'Root/5#0' ) ] } ) );
	assert.notEqual( iconOnly.proposal.rows.find( ( r ) => 'Root/5#0' === r.key )?.rule, 'messagingLink', 'a social icon is not the button block' );
	const three = [ MARK( 'Root/5#0' ), el( 'Root/7#0', 'Root/5#0', 'span', 'WhatsApp', { depth: 3 } ), el( 'Root/8#0', 'Root/5#0', 'span', 'Quick replies', { depth: 3 } ), el( 'Root/9#0', 'Root/5#0', 'span', 'Mon to Sat', { depth: 3 } ) ];
	assert.notEqual( run( page( { inner: three } ) ).proposal.rows.find( ( r ) => 'Root/5#0' === r.key )?.rule, 'messagingLink', 'a contact card of three runs is not decided here' );
	const long = [ MARK( 'Root/5#0' ), el( 'Root/7#0', 'Root/5#0', 'span', 'Send me a photo of the inside of the arm and I will read the numbers for you', { depth: 3 } ) ];
	assert.notEqual( run( page( { inner: long } ) ).proposal.rows.find( ( r ) => 'Root/5#0' === r.key )?.rule, 'messagingLink', 'a paragraph is no label' );
} );

test( 'a card\'s line may run longer than a label, up to its own limit', () => {
	const card = ( line ) => [
		el( 'Root/8#0', 'Root/5#0', 'span', '', { depth: 3 } ),
		MARK( 'Root/8#0' ),
		el( 'Root/9#0', 'Root/5#0', 'span', 'Can\'t find the numbers?', { depth: 3 } ),
		el( 'Root/10#0', 'Root/9#0', 'span', line, { depth: 4 } ),
	];
	const rule = RULE();
	const words = ( n ) => Array.from( { length: n }, ( _, i ) => `word${ i }` ).join( ' ' );
	assert.equal( node( run( page( { inner: card( words( rule.maxRunWords + 5 ) ) } ) ).skeleton, 'Root/5#0' )?.attributes?.variant, 'card' );
	assert.notEqual( node( run( page( { inner: card( words( rule.maxLineWords + 1 ) ) } ) ).skeleton, 'Root/5#0' )?.name, 'sgs/whatsapp-cta', 'a paragraph is no card line' );
} );

test( 'only a link is decided, and words with no mark are a text link only as one run', () => {
	const rule = RULE();
	const m = inventoryModel( inv( [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), el( 'Root/5#0', 'Root/1#0', 'div', 'Message me', { attrs: { href: 'https://wa.me/447700900123' } } ) ] ) );
	assert.equal( messagingLink( { e: m.byKey[ 'Root/5#0' ], m, rule } ), null, 'an element that is not a link' );
	const two = inventoryModel( inv( page( { words: 'WhatsApp', inner: [ el( 'Root/7#0', 'Root/5#0', 'span', 'Mon to Sat', { depth: 3 } ) ] } ) ) );
	assert.equal( messagingLink( { e: two.byKey[ 'Root/5#0' ], m: two, rule } ), null, 'two runs with no mark are a contact card, not a text link' );
} );
