// rules.reviewPlatform (Bean, 2026-11-21): a review section that names a review platform is that platform's review block,
// one rule over the platform table held as data; reviews that name no platform stay the draft's own blocks (the
// testimonial slider where its controls make one). Synthetic inventories in the reader's shape (lib/skeleton-inventory.mjs).
// Tests marked MUST FAIL fail on the skeleton writer before the rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { inventoryModel } from '../lib/skeleton-model.mjs';
import { reviewPlatformRegions, signalsOf } from '../lib/skeleton-review-platform.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
const RULE = () => facts().decisions.rules.reviewPlatform;

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w = 300, h = 100 ) => {
	const b = { x, y, w, h };
	return { 375: b, 768: b, 1440: b };
};
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: words, membership: x.loop ? [ { kind: 'sc-for', list: '{{ reviews }}', as: 'r', tpl: String( x.loop ) } ] : [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || place( 0, 100 ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {}, ...( x.position ? { position: x.position } : {} ) } );
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const FIXED = { 375: 'fixed', 768: 'fixed', 1440: 'fixed' };
const QUOTES = [ 'The team were kind and patient and found the right frames for my daughter in no time at all.', 'Booked an eye test on the day, friendly staff, clear advice and my new glasses arrived within a week.', 'Great choice of frames and honest prices, I would recommend them to anyone who needs new glasses.' ];

// A page: a heading above a review card holding a header (whatever `head` gives) and a loop of reviews.
const page = ( head, { quotes = QUOTES, position, extra = [] } = {} ) => [
	el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
	el( 'Root/2#0', 'Root/1#0', 'section', '', { depth: 1 } ),
	el( 'Root/3#0', 'Root/2#0', 'h2', 'What our customers say', { depth: 2 } ),
	el( 'Root/4#0', 'Root/2#0', 'div', '', { depth: 2, position } ),
	el( 'Root/5#0', 'Root/4#0', 'div', '', { depth: 3 } ),
	...head,
	el( 'Root/9#0', 'Root/4#0', 'div', '', { depth: 3 } ),
	...quotes.flatMap( ( q, i ) => [
		el( `Root/10#${ i }`, 'Root/9#0', 'figure', '', { depth: 4, loop: 11, box: place( i * 320, 300 ) } ),
		el( `Root/12#${ i }`, `Root/10#${ i }`, 'span', `Reviewer ${ i }`, { depth: 5, loop: 11 } ),
		el( `Root/13#${ i }`, `Root/10#${ i }`, 'blockquote', q, { depth: 5, loop: 11 } ),
	] ),
	...extra,
	el( 'Root/20#0', 'Root/1#0', 'section', 'Visit us in store', { depth: 1 } ),
];
const GOOGLE = [
	el( 'Root/6#0', 'Root/5#0', 'img', '', { depth: 4, attrs: { srcBasename: 'google-g.svg' } } ),
	el( 'Root/7#0', 'Root/5#0', 'div', 'Google Reviews', { depth: 4 } ),
	el( 'Root/8#0', 'Root/5#0', 'a', 'See all reviews', { depth: 4, attrs: { href: 'https://share.google/abc' } } ),
];
const TRUSTPILOT_MENTION = [ el( 'Root/8#0', 'Root/5#0', 'a', '4.8 on Trustpilot', { depth: 4, attrs: { href: 'https://uk.trustpilot.com/review/example.com' } } ) ];
const TRUSTPILOT = [ el( 'Root/6#0', 'Root/5#0', 'img', '', { depth: 4, attrs: { srcBasename: 'trustpilot-stars.svg' } } ), ...TRUSTPILOT_MENTION ];
const run = ( elements ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'test', db } );
const all = ( tree, name, out = [] ) => {
	for ( const n of tree ) {
		n.name === name && out.push( n );
		all( n.innerBlocks || [], name, out );
	}
	return out;
};

test( 'MUST FAIL: a review section naming Google by its mark, name and links is sgs/google-reviews, drawing the whole card', () => {
	const { skeleton, proposal } = run( page( GOOGLE ) );
	const blocks = all( skeleton, 'sgs/google-reviews' );
	assert.equal( blocks.length, 1 );
	assert.equal( blocks[ 0 ].draftRef?.tpl, 'Root/4#0', 'placed at the lowest element holding the reviews and every signal' );
	assert.deepEqual( blocks[ 0 ].innerBlocks, [] );
	const row = proposal.rows.find( ( r ) => 'Root/4#0' === r.key );
	assert.equal( row.rule, 'reviewPlatform' );
	assert.deepEqual( proposal.reviewPlatforms, { regions: { 'Root/4#0': 'Google' }, notes: [] } );
	assert.match( row.reason, /3 reviews .* naming Google by its mark, name, link/ );
	assert.match( blocks[ 0 ].handover?.[ 0 ] ?? '', /place ID/ );
	assert.equal( proposal.rows.find( ( r ) => 'Root/13#0' === r.key )?.rule, 'reviewPlatform', 'the reviews are drawn by the block' );
	assert.ok( all( skeleton, 'sgs/heading' ).length, 'the section heading outside the card stays' );
} );

test( 'MUST FAIL: the same rule names Trustpilot from its row of the table (its mark, a link to its domain and its name)', () => {
	const { skeleton } = run( page( TRUSTPILOT ) );
	assert.equal( all( skeleton, 'sgs/trustpilot-reviews' ).length, 1 );
	assert.equal( all( skeleton, 'sgs/google-reviews' ).length, 0 );
} );

// The owner's own review cards with the platform's name after each date and a link to it are a testimonial slider on the
// hand-built site; the section that shows the platform's mark is its block (rules.reviewPlatform.needs).
test( 'MUST FAIL: reviews that name and link a platform without showing its mark stay the draft\'s own blocks, with a note', () => {
	const { skeleton, proposal } = run( page( TRUSTPILOT_MENTION ) );
	assert.equal( all( skeleton, 'sgs/trustpilot-reviews' ).length, 0 );
	assert.deepEqual( proposal.reviewPlatforms?.regions, {} );
	assert.match( proposal.reviewPlatforms?.notes[ 0 ] ?? '', /names Trustpilot without its mark/ );
	assert.notEqual( proposal.rows.find( ( r ) => 'Root/13#0' === r.key )?.rule, 'reviewPlatform', 'the reviews are built as the draft has them' );
	// Negative control: without the condition in the rule's data the same section is the platform's block.
	const m = inventoryModel( inv( page( TRUSTPILOT_MENTION ) ) );
	assert.equal( reviewPlatformRegions( { m, rule: { ...RULE(), needs: [] } } ).regions.size, 1 );
} );

test( 'negative controls: no platform signal, a quote that mentions the platform, a fixed panel, a lone review', () => {
	const plain = [ el( 'Root/7#0', 'Root/5#0', 'div', 'Customer reviews', { depth: 4 } ) ];
	assert.equal( all( run( page( plain ) ).skeleton, 'sgs/google-reviews' ).length, 0, 'reviews in the client\'s own style stay the draft\'s blocks' );
	const mention = [ 'I found them on Google and the team were kind and patient with my daughter every single time.', ...QUOTES.slice( 1 ) ];
	assert.equal( all( run( page( plain, { quotes: mention } ) ).skeleton, 'sgs/google-reviews' ).length, 0, 'a quote naming Google is no platform signal' );
	assert.equal( all( run( page( GOOGLE, { position: FIXED } ) ).skeleton, 'sgs/google-reviews' ).length, 0, 'a fixed panel is an overlay' );
	assert.equal( all( run( page( GOOGLE, { quotes: QUOTES.slice( 0, 1 ) } ) ).skeleton, 'sgs/google-reviews' ).length, 0, 'one review is no loop' );
	const short = [ 'Great.', 'Lovely.', QUOTES[ 0 ] ];
	assert.equal( all( run( page( GOOGLE, { quotes: short } ) ).skeleton, 'sgs/google-reviews' ).length, 0, 'mostly one-word tiles are not reviews' );
} );

test( 'a section naming two platforms is listed in a note and left to the scoring', () => {
	const m = inventoryModel( inv( page( [ ...GOOGLE, el( 'Root/14#0', 'Root/5#0', 'a', 'Trustpilot', { depth: 4, attrs: { href: 'https://www.trustpilot.com/review/x' } } ) ] ) ) );
	const r = reviewPlatformRegions( { m, rule: RULE() } );
	assert.equal( r.regions.size, 0 );
	assert.match( r.notes[ 0 ], /names Google and Trustpilot/ );
} );

test( 'a platform named in the next section, or beyond the section\'s word limit, does not reach the reviews', () => {
	const head = [ el( 'Root/7#0', 'Root/5#0', 'div', 'Customer reviews', { depth: 4 } ) ];
	const next = [ el( 'Root/21#0', 'Root/20#0', 'a', 'Find us on Google', { depth: 2, attrs: { href: 'https://g.page/x' } } ), el( 'Root/24#0', 'Root/20#0', 'img', '', { depth: 2, attrs: { alt: 'Google' } } ) ];
	assert.deepEqual( reviewPlatformRegions( { m: inventoryModel( inv( [ ...page( head ), ...next ] ) ), rule: RULE() } ), { regions: new Map(), notes: [] } );
	const wide = [ el( 'Root/22#0', 'Root/2#0', 'p', 'word '.repeat( 60 ).trim(), { depth: 2 } ), el( 'Root/23#0', 'Root/2#0', 'a', 'Find us on Google', { depth: 2, attrs: { href: 'https://g.page/x' } } ), el( 'Root/25#0', 'Root/2#0', 'img', '', { depth: 2, attrs: { alt: 'Google' } } ) ];
	assert.deepEqual( reviewPlatformRegions( { m: inventoryModel( inv( page( head, { extra: wide } ) ) ), rule: RULE() } ), { regions: new Map(), notes: [] } );
	const near = reviewPlatformRegions( { m: inventoryModel( inv( page( head, { extra: wide.slice( 1 ) } ) ) ), rule: RULE() } );
	assert.deepEqual( [ ...near.regions.keys() ], [ 'Root/2#0' ], 'within the limit the section\'s own mark and link name the platform' );
} );

test( 'a third platform is a row of the table, never code; signalsOf reads marks, links and short words only', () => {
	const rule = { ...RULE(), platforms: [ ...RULE().platforms, { name: 'Feefo', block: 'sgs/testimonial-slider', marks: [ 'feefo' ], words: [ 'feefo' ], domains: [ 'feefo.com' ] } ] };
	const m = inventoryModel( inv( page( [ el( 'Root/6#0', 'Root/5#0', 'img', '', { depth: 4, attrs: { srcBasename: 'feefo-logo.png' } } ) ] ) ) );
	assert.deepEqual( [ ...reviewPlatformRegions( { m, rule } ).regions.values() ].map( ( x ) => x.platform ), [ 'Feefo' ] );
	const words = ( e ) => e.words;
	assert.deepEqual( signalsOf( { key: 'k', tag: 'img', attrs: { alt: 'Google logo' }, words: '' }, words, RULE() ).map( ( s ) => s.kind ), [ 'mark' ] );
	assert.deepEqual( signalsOf( { key: 'k', tag: 'a', attrs: { href: 'https://notgoogle.com/x' }, words: 'More' }, words, RULE() ), [], 'a host merely ending in the letters is not the domain' );
	assert.deepEqual( signalsOf( { key: 'k', tag: 'span', attrs: {}, words: 'Googled' }, words, RULE() ), [], 'the name as a whole word only' );
	assert.deepEqual( signalsOf( { key: 'k', tag: 'span', attrs: {}, words: 'Google Reviews' }, words, RULE() ).map( ( s ) => s.kind ), [ 'name' ] );
	assert.deepEqual( signalsOf( { key: 'k', tag: 'blockquote', attrs: {}, words: 'I found them on Google and the team were kind and patient every time.' }, words, RULE() ), [], 'a quote that mentions the platform is no signal' );
} );
