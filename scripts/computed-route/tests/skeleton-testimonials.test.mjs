// rules.loopBlocks.testimonials (Spec 48 §3.4, FR-48-83; lib/skeleton-loop-blocks.mjs): a loop of review cards with no
// provider link and no script moving it, each card naming the person who wrote it and showing no price, each with a rating
// and a quote or with a quotation, is the testimonial family: sgs/testimonial-slider in its still form (autoplay, arrows and
// dots off, the cards per row at 1440 visible), each card an sgs/testimonial absorbing its parts.
// MUST FAIL on the slice of Mama's real product page (tests/fixtures/skeleton-identity/mama-product-reviews.json: three
// `article` cards each holding stars, a title, the quote and a reviewer line `KA · June 2026`, read against the committed
// draft). Negative controls: a product grid with star ratings (a price), a team-member grid and a blog post grid (no rating
// or quotation) stay as they were; a provider link still picks the provider's block.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
const db = openDb();
const flat = ( nodes ) => nodes.flatMap( ( n ) => [ n, ...flat( n.innerBlocks || [] ) ] );
const hashOf = ( file ) => crypto.createHash( 'sha256' ).update( fs.readFileSync( file ) ).digest( 'hex' );
const LOOPS = { rows: [], brands: [], carousels: new Set() };

test( "MUST FAIL: Mama's product review cards (stars, a quote and a reviewer line each, in a grid) are an sgs/testimonial-slider of sgs/testimonial cards", () => {
	const fix = JSON.parse( fs.readFileSync( path.join( HERE, 'fixtures', 'skeleton-identity', 'mama-product-reviews.json' ), 'utf8' ) );
	const sources = { files: { [ fix.draft ]: hashOf( path.join( REPO, 'sites', fix.client, 'handoff', fix.draft ) ) } };
	const r = proposeSkeleton( { inventory: fix.inventory, facts: loadFacts( { db, client: fix.client, repo: REPO } ), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', db, rootComponent: fix.inventory.checks.rootName, loops: LOOPS, factRecord: { schema: '1', client: fix.client, elements: fix.record, surfaces: {}, sources } } );
	const holder = r.proposal.rows.find( ( x ) => 'Product/126#0' === x.key );
	assert.deepEqual( [ holder.block, holder.rule ], [ 'sgs/testimonial-slider', 'loopBlocks' ], holder.reason );
	assert.match( holder.reason, /3 cards each naming its reviewer, 3 side by side at 1440, a swiped track at 375/ );
	const slider = flat( r.skeleton ).find( ( n ) => 'sgs/testimonial-slider' === n.name );
	assert.deepEqual( slider.attributes, { autoplay: false, showArrows: false, showDots: false, slidesVisible: 3 }, 'the still form: nothing moves it' );
	assert.equal( slider.innerBlocks.filter( ( n ) => 'sgs/testimonial' === n.name ).length, 3, 'one testimonial per card' );
	assert.deepEqual( [ 129, 130, 131, 132 ].map( ( n ) => r.proposal.rows.find( ( x ) => `Product/${ n }` === x.key || `Product/${ n }#0` === x.key ).action ), [ 'absorbed', 'absorbed', 'absorbed', 'absorbed' ], "the stars, title, quote and reviewer line are the testimonial's own fields" );
} );

// Synthetic grids of three cards side by side.
const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const box = ( x, y, w = 300, h = 100 ) => {
	const b = { x, y, w, h };
	return { 375: b, 768: b, 1440: b };
};
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: x.all ?? words, membership: x.loop ? [ { kind: 'sc-for', list: '{{ items }}', as: 'it', tpl: String( x.loop ) } ] : [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || box( 0, 0, 1200 ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} } );
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const QUOTE = 'Had a lovely experience taking my daughter here, very friendly and helpful.';
// Each card: its parts in order, as [ tag, words, attrs? ].
const grid = ( parts ) => [
	el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
	el( 'Root/30#0', 'Root/1#0', 'div', '', { depth: 1, box: box( 0, 0, 1200, 300 ) } ),
	...[ 0, 1, 2 ].flatMap( ( i ) => [
		el( `Root/31#${ i }`, 'Root/30#0', 'article', '', { depth: 2, loop: 31, box: box( i * 400, 0, 380, 300 ) } ),
		...parts( i ).map( ( [ tag, words, attrs ], j ) => el( `Root/${ 32 + j }#${ i }`, `Root/31#${ i }`, tag, words, { depth: 3, loop: 31, attrs, box: box( i * 400, j * 40, 380, 40 ) } ) ),
	] ),
];
const NAMES = [ 'KA · June 2026', 'Sarah M.', 'mariahzaini · January 2026' ];
const run = ( elements, loops = LOOPS ) => proposeSkeleton( { inventory: inv( elements ), facts: loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } ), surface: 'test', surfaceKind: 'page', commerce: null, loops, db } );
const sliderOf = ( r ) => flat( r.skeleton ).find( ( n ) => 'sgs/testimonial-slider' === n.name ) ?? null;

test( 'MUST FAIL: a grid of rated or quoted cards each naming its reviewer (initials, a name or a handle with a date) is the still testimonial slider', () => {
	const rated = run( grid( ( i ) => [ [ 'span', '★★★★★' ], [ 'p', QUOTE ], [ 'div', NAMES[ i ] ] ] ) );
	assert.ok( sliderOf( rated ), JSON.stringify( rated.proposal.rows.map( ( x ) => [ x.key, x.block, x.action ] ) ) );
	assert.equal( sliderOf( rated ).attributes.slidesVisible, 3 );
	const quoted = run( grid( ( i ) => [ [ 'blockquote', QUOTE ], [ 'cite', NAMES[ i ] ] ] ) );
	assert.ok( sliderOf( quoted ), 'a quotation stands for a rating' );
} );

test( 'negative control: a product grid with star ratings, a team-member grid, a blog post grid and unnamed reviews are not testimonials; a provider link still wins', () => {
	const none = ( elements, why ) => {
		const r = run( elements );
		assert.equal( sliderOf( r ), null, why );
		assert.equal( flat( r.skeleton ).filter( ( n ) => 'sgs/testimonial' === n.name ).length, 0, why );
	};
	none( grid( ( i ) => [ [ 'span', '★★★★★' ], [ 'h3', 'Oat Cookie Box' ], [ 'p', 'Twelve soft oat cookies baked fresh to order and boxed by hand.' ], [ 'div', `Mama's Kitchen · £9.0${ i }` ] ] ), 'a product grid shows a price' );
	none( grid( ( i ) => [ [ 'h3', NAMES[ i ] ], [ 'div', 'Head Baker' ], [ 'p', 'Has baked for twenty years and runs the kitchen with a smile every single day.' ] ] ), 'a team grid shows no rating or quotation' );
	none( grid( ( i ) => [ [ 'h3', 'How we bake our cookies' ], [ 'p', 'A look behind the scenes at the kitchen, the ovens and the people who bake them.' ], [ 'div', `By Jane Smith · June 202${ i }` ] ] ), 'a blog grid shows no rating or quotation' );
	none( grid( () => [ [ 'span', '★★★★★' ], [ 'p', QUOTE ] ] ), 'reviews that name nobody keep their own blocks' );
	const provider = run( grid( ( i ) => [ [ 'span', '★★★★★' ], [ 'p', QUOTE ], [ 'div', NAMES[ i ] ], [ 'a', 'Read on Google', { href: 'https://share.google/abc' } ] ] ) );
	assert.ok( flat( provider.skeleton ).find( ( n ) => 'sgs/google-reviews' === n.name ), 'a provider link picks the provider block' );
	assert.equal( sliderOf( provider ), null );
} );
