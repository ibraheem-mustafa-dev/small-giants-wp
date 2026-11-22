// rules.cardAction.typedArrows: a call to action that ends a card link and draws an arrow typed as a character in a box of
// its own ("Shop gifts" beside a "→" in a filled circle) is one sgs/button holding the card's link, the arrow its icon.
// Before the rule the arrow leaf was taken as the call to action, which became no button, so the card kept no link at all.
// Synthetic inventories in the reader's shape (lib/skeleton-inventory.mjs). Tests marked MUST FAIL fail on the skeleton writer
// before the rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w = 300, h = 40 ) => {
	const b = { x, y, w, h };
	return { 375: b, 768: b, 1440: b };
};
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: x.allText ?? words, membership: [], srcTag: tag, srcOwnText: words, snippet: x.snippet ?? `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || place( 0, 100, 1200, 80 ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} } );
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );

// A page with one card link: a heading and a line, then a call to action `cta` words with `glyph` typed in a span of its own.
const page = ( { cta = 'Shop gifts', glyph = '→', ctaTag = 'span' } = {} ) => [
	el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
	el( 'Root/2#0', 'Root/1#0', 'section', '', { depth: 1 } ),
	el( 'Root/3#0', 'Root/2#0', 'a', '', { depth: 2, attrs: { href: 'https://example.com/gifts/' }, allText: `For her ${ cta } ${ glyph }`, box: place( 0, 100, 300, 240 ) } ),
	el( 'Root/4#0', 'Root/3#0', 'h3', 'For her', { depth: 3, box: place( 0, 100, 300, 40 ) } ),
	el( 'Root/5#0', 'Root/3#0', 'span', 'Gift boxes and cards, with the prices left off.', { depth: 3, box: place( 0, 150, 300, 60 ) } ),
	el( 'Root/6#0', 'Root/3#0', ctaTag, cta, { depth: 3, box: place( 0, 220, 200, 34 ), allText: `${ cta } ${ glyph }` } ),
	el( 'Root/7#0', 'Root/6#0', 'span', glyph, { depth: 4, box: place( 120, 220, 32, 32 ), snippet: '<span aria-hidden="true" style="width:32px;height:32px;border-radius:999px;background:#3A2A22;color:#FCEBBE" data-dc-tpl="7">' + glyph + '</span>' } ),
	el( 'Root/20#0', 'Root/1#0', 'section', 'Visit us in store', { depth: 1 } ),
];
const run = ( elements ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'test', db } );
const all = ( tree, name, out = [] ) => {
	for ( const n of tree ) {
		n.name === name && out.push( n );
		all( n.innerBlocks || [], name, out );
	}
	return out;
};

test( 'MUST FAIL: a call to action with a typed arrow beside its words is one button drawn as the card cue, the arrow its icon', () => {
	const { skeleton, proposal } = run( page() );
	const buttons = all( skeleton, 'sgs/button' );
	assert.equal( buttons.length, 1 );
	assert.equal( buttons[ 0 ].draftRef?.tpl, 'Root/6#0' );
	assert.equal( buttons[ 0 ].attributes.label, 'Shop gifts', 'the label is the words alone' );
	assert.equal( buttons[ 0 ].attributes.icon, 'arrow-right' );
	assert.equal( buttons[ 0 ].attributes.visualOnly, true, 'the button is the cue of the card' );
	assert.ok( ! buttons[ 0 ].attributes.url, 'the link of the card is on the card, not the button' );
	assert.equal( all( skeleton, 'sgs/container' ).find( ( c ) => 'Root/3#0' === c.draftRef?.tpl )?.attributes.sgsBlockLink, 'https://example.com/gifts/' );
	assert.ok( ! all( skeleton, 'sgs/text' ).some( ( t ) => [ 'Root/6#0', 'Root/7#0' ].includes( t.draftRef?.tpl ) ), 'the call to action is no text' );
	assert.equal( proposal.rows.find( ( r ) => 'Root/7#0' === r.key )?.action, 'absorbed', 'the arrow is absorbed into the button as its icon' );
} );

test( 'MUST FAIL: a left arrow sits before the words', () => {
	const { skeleton } = run( page( { glyph: '←' } ) );
	const [ button ] = all( skeleton, 'sgs/button' );
	assert.equal( button?.attributes.icon, 'arrow-left' );
	assert.equal( button?.attributes.iconPosition, 'before' );
} );

test( 'negative control: a character that is not a listed arrow stays a text leaf and the call to action is not claimed by it', () => {
	const { skeleton } = run( page( { glyph: '★' } ) );
	assert.ok( ! all( skeleton, 'sgs/button' ).some( ( b ) => b.attributes.icon ), 'no icon is invented for an unlisted glyph' );
} );

test( 'negative control: words and an arrow in a link of their own (no card) are not changed by the rule', () => {
	const elements = [
		el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
		el( 'Root/2#0', 'Root/1#0', 'section', '', { depth: 1 } ),
		el( 'Root/3#0', 'Root/2#0', 'a', 'Shop gifts', { depth: 2, attrs: { href: 'https://example.com/gifts/' }, allText: 'Shop gifts →', box: place( 0, 100, 200, 34 ) } ),
		el( 'Root/4#0', 'Root/3#0', 'span', '→', { depth: 3, box: place( 120, 100, 32, 32 ) } ),
		el( 'Root/20#0', 'Root/1#0', 'section', 'Visit us in store', { depth: 1 } ),
	];
	const { skeleton } = run( elements );
	const buttons = all( skeleton, 'sgs/button' );
	assert.equal( buttons.length, 1, 'a lone link with its glyph is still one pill button' );
	assert.ok( ! buttons[ 0 ].attributes.icon );
} );
