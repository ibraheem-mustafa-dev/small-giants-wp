// Spec 48 FR-48-6, FR-48-77, register row C5 (skeleton): block choice follows the motion the draft's code runs. A marquee
// strip of labels that is not a page's own section is the layout block that offers the marquee effect (`sgs/brand-strip`
// showing the names as text), never the button group a run of links would be (rules.marquee.textBlock); a loop of review
// cards in a scroll track the draft's script steps is the testimonial slider with a testimonial per card
// (rules.loopBlocks.carousel; lib/skeleton-rerun.mjs::carouselKeys names the tracks). Synthetic inventories in the reader's shape.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts, decisionsProblems } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { carouselKeys, loopingKeys } from '../lib/skeleton-rerun.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
const db = openDb();
const facts = ( edit = ( f ) => f ) => {
	const f = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
	f.decisions = structuredClone( f.decisions );
	return edit( f );
};

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w = 300, h = 100 ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const el = ( key, parentKey, tag, words = '', x = {} ) => {
	const attrs = x.attrs || {};
	const own = Object.entries( attrs ).map( ( [ k, v ] ) => ` ${ k }="${ v }"` ).join( '' );
	return { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.keep ? attrs : {}, words, allText: x.all ?? words, membership: x.loop ? [ { kind: 'sc-for', list: '{{ items }}', as: 'it', tpl: String( x.loop ) } ] : [], srcTag: tag, srcOwnText: words, snippet: `<${ tag }${ own } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || place( 0, 100 ), visible: { 375: true, 768: true, 1440: true }, display: x.display || 'block', flexDirection: 'row', screenshots: {} };
};
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const run = ( elements, o = {} ) => proposeSkeleton( { inventory: inv( elements ), facts: o.facts || facts(), surface: 'test', surfaceKind: 'page', commerce: null, loops: o.loops ?? { rows: [], brands: [] }, motion: o.motion || new Set(), db } );
const find = ( tree, name ) => {
	for ( const n of tree ) {
		if ( n.name === name ) {
			return n;
		}
		const inner = find( n.innerBlocks || [], name );
		if ( inner ) {
			return inner;
		}
	}
	return null;
};
const all = ( tree, name ) => tree.flatMap( ( n ) => [ ...( n.name === name ? [ n ] : [] ), ...all( n.innerBlocks || [], name ) ] );

// ---- item 11: a marquee of labels inside another block ----
// root > main > section > div (the wrapper, not a page section) > strip (loops) > links
const links = ( parent, depth ) => [ 'Acme', 'Bolt', 'Crest', 'Acme', 'Bolt', 'Crest' ].map( ( n, i ) => el( `Root/5#${ i }`, parent, 'a', n, { depth, attrs: { href: '#' }, keep: true, loop: 5 } ) );
const strip = ( inside ) => inside
	? [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'section', '', { depth: 1 } ), el( 'Root/3#0', 'Root/2#0', 'div', '', { depth: 2 } ), el( 'Root/4#0', 'Root/3#0', 'div', '', { depth: 3, display: 'flex' } ), ...links( 'Root/4#0', 4 ) ]
	: [ el( 'Root/2#0', null, 'section', '', { depth: 0 } ), el( 'Root/4#0', 'Root/2#0', 'div', '', { depth: 1, display: 'flex' } ), ...links( 'Root/4#0', 2 ) ];
const LOOPING = new Set( [ 'Root/4' ] );

test( 'MUST FAIL (C5 skeleton 11): a looping strip of link labels inside another block is the brand strip showing names as text, the block that offers the marquee, not a row of buttons', () => {
	const { skeleton, proposal, problems } = run( strip( true ), { motion: LOOPING } );
	assert.deepEqual( problems, [] );
	const brand = find( skeleton, 'sgs/brand-strip' );
	assert.ok( brand, JSON.stringify( skeleton.map( ( n ) => n.name ) ) );
	assert.equal( brand.attributes.brandDisplay, 'text' );
	assert.equal( find( skeleton, 'sgs/multi-button' ), null, 'no button group imitates the strip' );
	const rows = proposal.rows.filter( ( r ) => 'marquee' === r.rule );
	assert.equal( rows[ 0 ].block, 'sgs/brand-strip' );
	assert.equal( rows[ 0 ].handover.owner, 'content-page' );
	assert.ok( proposal.rows.filter( ( r ) => 'a' === r.tag ).every( ( r ) => 'absorbed' === r.action ), 'the labels are its items' );
	assert.deepEqual( [ brand.innerBlocks.length, find( skeleton, 'sgs/button' ) ], [ 0, null ], 'no button is left beside the strip' );
} );

test( 'negative control (C5 skeleton 11): a page-level strip of labels is still the trust bar, a strip nothing loops is no marquee, and without the decision the old outcome stands', () => {
	const bar = run( strip( false ), { motion: new Set( [ 'Root/4' ] ) } );
	assert.ok( find( bar.skeleton, 'sgs/trust-bar' ), 'a strip directly under a page section keeps the trust bar' );
	assert.equal( find( bar.skeleton, 'sgs/brand-strip' ), null );
	const still = run( strip( true ) );
	assert.equal( find( still.skeleton, 'sgs/brand-strip' ), null, 'never a marquee read from a name' );
	assert.equal( still.proposal.rows.filter( ( r ) => 'marquee' === r.rule ).length, 0 );
	const without = run( strip( true ), { motion: LOOPING, facts: facts( ( f ) => { delete f.decisions.rules.marquee.textBlock; return f; } ) } );
	assert.equal( without.proposal.rows.filter( ( r ) => 'marquee' === r.rule ).length, 0, 'with no text block in the decisions the rule declines, as before' );
} );

test( 'MUST FAIL (C5 skeleton 11): every block the marquee rule names offers the marquee effect', () => {
	const offers = JSON.parse( fs.readFileSync( path.join( REPO, 'plugins', 'sgs-blocks', 'src', 'blocks', 'extensions', 'generated-fx-qualifying-blocks.json' ), 'utf8' ) );
	const rule = facts().decisions.rules.marquee;
	for ( const key of [ 'logoBlock', 'itemBlock', 'textBlock' ] ) {
		assert.ok( ( offers[ rule[ key ] ] || [] ).includes( 'marquee' ), `${ key } ${ rule[ key ] } must offer the marquee effect` );
	}
	assert.ok( ! ( offers[ 'sgs/multi-button' ] || [] ).includes( 'marquee' ), 'control: the block a link run lands on offers none' );
	assert.deepEqual( decisionsProblems( facts() ), [] );
	const bad = decisionsProblems( facts( ( f ) => { f.decisions.rules.loopBlocks.carousel.cardBlock = 'sgs/not-a-block'; return f; } ) );
	assert.ok( bad.some( ( p ) => /rules\.loopBlocks\.carousel\.cardBlock/.test( p ) ), `a carousel card block that is no block is refused: ${ bad }` );
} );

// ---- item 12: a review carousel ----
const reviews = ( o = {} ) => [
	el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
	el( 'Root/30#0', 'Root/1#0', 'div', '', { depth: 1 } ),
	...[ 0, 1, 2 ].flatMap( ( i ) => [
		el( `Root/31#${ i }`, 'Root/30#0', 'figure', '', { depth: 2, loop: 31 } ),
		el( `Root/32#${ i }`, `Root/31#${ i }`, 'div', o.rating ?? '★★★★★', { depth: 3, loop: 31 } ),
		el( `Root/33#${ i }`, `Root/31#${ i }`, 'blockquote', o.quote ?? 'Had a lovely experience taking my daughter here, very friendly and helpful.', { depth: 3, loop: 31 } ),
		...( o.href ? [ el( `Root/34#${ i }`, `Root/31#${ i }`, 'a', 'Read on the provider', { depth: 3, loop: 31, attrs: { href: o.href }, keep: true } ) ] : [] ),
	] ),
];
const CAROUSEL = { rows: [], brands: [], carousels: new Set( [ 'Root/30' ] ) };

test( 'MUST FAIL (C5 skeleton 12): a loop of review cards in a scroll track the draft\'s script steps is the testimonial slider with a testimonial per card', () => {
	const { skeleton, proposal, problems } = run( reviews(), { loops: CAROUSEL } );
	assert.deepEqual( problems, [] );
	const slider = find( skeleton, 'sgs/testimonial-slider' );
	assert.ok( slider, JSON.stringify( skeleton.map( ( n ) => n.name ) ) );
	assert.equal( all( slider.innerBlocks, 'sgs/testimonial' ).length, 3, 'one testimonial per card' );
	const rows = proposal.rows.filter( ( r ) => 'loopBlocks' === r.rule );
	const holder = rows.find( ( r ) => 'Root/30#0' === r.key );
	assert.deepEqual( [ holder.block, holder.action ], [ 'sgs/testimonial-slider', null ], 'the holder is the slider, not absorbed into it: its cards stay rows' );
	assert.ok( rows.filter( ( r ) => 'sgs/testimonial' === r.block ).length >= 3, 'each card is a testimonial row' );
	assert.ok( proposal.rows.filter( ( r ) => 'blockquote' === r.tag ).every( ( r ) => 'absorbed' === r.action ), 'the quote is the testimonial\'s' );
} );

test( 'negative control (C5 skeleton 12): no stepped track, a provider link, a short quote or no rating leaves the loop as it was', () => {
	const none = ( elements, loops ) => {
		const { skeleton } = run( elements, { loops } );
		assert.equal( find( skeleton, 'sgs/testimonial-slider' ), null );
		assert.equal( find( skeleton, 'sgs/testimonial' ), null );
	};
	none( reviews(), { rows: [], brands: [], carousels: new Set() } );
	none( reviews(), { rows: [], brands: [] } );
	none( reviews( { quote: 'Great' } ), CAROUSEL );
	none( reviews( { rating: '2 years ago' } ), CAROUSEL );
	none( reviews(), { rows: [], brands: [], carousels: new Set( [ 'Root/99' ] ) } );
	const provider = run( reviews( { href: 'https://share.google/abc' } ), { loops: CAROUSEL } );
	// Bean 2026-10-31: a platform's block locks the platform's own look, so a link to the platform on cards the draft paints in
	// no platform colours does not make the platform's block; the cards are the testimonial slider. The cards painted in the
	// platform's colours stay the platform's block (tests/skeleton-loop-blocks.test.mjs, tests/skeleton-testimonials.test.mjs).
	assert.equal( find( provider.skeleton, 'sgs/google-reviews' ), null );
	assert.ok( find( provider.skeleton, 'sgs/testimonial-slider' ), 'a provider link on unpainted cards is the testimonial slider' );
	const without = run( reviews(), { loops: CAROUSEL, facts: facts( ( f ) => { delete f.decisions.rules.loopBlocks.carousel; return f; } ) } );
	assert.equal( find( without.skeleton, 'sgs/testimonial-slider' ), null, 'with no carousel decision the old outcome stands' );
} );

// ---- the tracks come from the motion inventory ----
const TRACK = { dc: 'Home', template_tpl_id: '150', selector: 'track' };
const stepRec = ( id, trigger, detail, over = {} ) => ( { id, mechanism: 'js-scroll', status: 'active', element: TRACK, source: { function: 'step', code: 't.scrollTo({ left: 0 })' }, trigger: { type: trigger, detail }, properties: [ { property: 'scroll-position' } ], ...over } );

test( 'MUST FAIL (C5 skeleton 12): the stepped tracks are the elements a timer-stepped scroll writer names, its nearest element when it names none', () => {
	const timer = stepRec( 'J-07', 'interval', 'setInterval every 6000ms via step' );
	assert.deepEqual( [ ...carouselKeys( { records: [ timer ] } ) ], [ 'Home/150' ] );
	const near = stepRec( 'J-08', 'interval', 'setInterval every 6000ms via step', { element: { dc: 'Home', template_tpl_id: null, nearest_tpl_id: [ '7', '8' ] } } );
	assert.deepEqual( [ ...carouselKeys( { records: [ near ] } ) ], [ 'Home/7', 'Home/8' ] );
	assert.equal( carouselKeys( { records: [ stepRec( 'J-09', 'press', 'onClick (step)' ) ] } ).size, 0, 'arrows alone are not a carousel' );
	assert.equal( carouselKeys( { records: [ { ...timer, status: 'dead-code' } ] } ).size, 0 );
	assert.equal( carouselKeys( null ).size, 0 );
	const parallax = { id: 'J-15', mechanism: 'js-style-write', status: 'active', element: { dc: 'Home', template_tpl_id: '113' }, source: { function: 'parallax', code: '' }, trigger: { type: 'scroll-position', detail: 'scroll listener on window' }, properties: [ { property: 'transform', formula: "'translate3d(0,' + y * 0.18 + 'px,0)'" } ] };
	assert.equal( carouselKeys( { records: [ parallax ] } ).size, 0, 'a recognised parallax is not a carousel' );
	assert.equal( loopingKeys( { records: [ timer ] } ).size, 0, 'control: a scroll writer is not a looping translate' );
} );
