// A heading whose children are all inline phrasing content stays the heading block at its level (Spec 48 FR-48-97,
// decisions structural.inlineHeading, lib/skeleton-classify.mjs and lib/skeleton-write-content.mjs): its words in order, an
// inline image as the Inline photo format resolved through the media map (a handover row when it cannot be), a word
// underlined by a bare positioned layer as the Highlight format. MUST FAIL with the entry removed. Pure functions only.
// Mutation list: tests/fixtures/skeleton-inline-heading/mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { handoverProblems } from '../lib/fill-handover.mjs';
import { N, run, row, find } from './fixtures/skeleton-widgets/build.mjs';

// ---- heading with inline children ----
// "Made for the mum [photo chip] who needs it [most, underlined by a positioned bar]".
function headingPage() {
	const chip = N( 'span', { style: 'display:inline-block' }, [ N( 'img', { attrs: { src: 'assets/pair.jpg', alt: '' } } ) ] );
	const most = N( 'span', { style: 'position:relative', words: 'most' }, [ N( 'span', { attrs: { 'aria-hidden': 'true' }, style: 'position:absolute;bottom:0' } ) ] );
	return N( 'section', {}, [ N( 'div', {}, [ N( 'h1', { words: 'Made for the mum who needs it', parts: [ 'Made for the mum ', 0, ' who needs it ', 1 ] }, [ chip, most ] ) ] ) ] );
}

test( 'inline heading: a heading holding only inline content stays the heading with its words in order, the photo carried as the Inline photo format and the decorated word as the Highlight format; MUST FAIL without the entry', () => {
	const go = ( o = {} ) => run( headingPage(), 'class Component { renderVals() { return {}; } }', o );
	const r = go( { carried: { logo: ( e ) => ( 'img' === e.tag ? { id: 7, url: 'https://x.test/pair.jpg', asset: 'pair.jpg' } : null ), menu: () => null } } );
	const h = row( r, 'Root/3#0' );
	assert.deepEqual( [ h.tag, h.block, h.confidence, h.low ], [ 'h1', 'sgs/heading', 1, false ] );
	assert.equal( h.attributes.content, 'Made for the mum <img class="sgs-inline-photo wp-image-7" src="https://x.test/pair.jpg" alt=""/> who needs it <span class="sgs-highlight">most</span>', 'MUST FAIL: words in order, the photo where it sits, the decorated word highlighted' );
	assert.ok( r.proposal.rows.filter( ( x ) => /^Root\/[4-7]#0$/.test( x.key ) ).every( ( x ) => 'absorbed' === x.action && 'Root/3#0' === x.into ), 'the inline children are the heading\'s own rich text' );
	const offline = go();
	assert.equal( row( offline, 'Root/3#0' ).attributes.content, 'Made for the mum who needs it <span class="sgs-highlight">most</span>', 'with no media map the words stay' );
	const node = find( offline.skeleton, ( x ) => 'sgs/heading' === x.name )[ 0 ];
	assert.match( node.handover[ 0 ].detail, /inline photo \S*pair\.jpg .*Inline photo format/, 'and the photo is a handover row, never a silent drop' );
	assert.deepEqual( handoverProblems( node.handover, 'heading' ), [] );
	assert.equal( row( go( { off: [ 'structural.inlineHeading' ] } ), 'Root/3#0' ).block, 'sgs/container', 'without the entry the heading is a wrapper again' );
} );

test( 'NEGATIVE inline heading: a heading holding a block element is not inline; a heading whose words the code fills keeps its rendered words with a handover', () => {
	const block = N( 'section', {}, [ N( 'h2', { words: 'Title' }, [ N( 'div', { words: 'Block' } ) ] ) ] );
	assert.notEqual( run( block, 'class Component { renderVals() { return {}; } }' ).proposal.rows.find( ( x ) => 'h2' === x.tag ).rule, 'never' );
	assert.equal( run( block, 'class Component { renderVals() { return {}; } }' ).proposal.rows.find( ( x ) => 'h2' === x.tag ).block, 'sgs/container', 'a div is no phrasing content' );
	const bound = N( 'section', {}, [ N( 'h2', { words: 'Your basket', text: 'title', parts: [ '{{ title }} ', 0 ] }, [ N( 'span', { style: 'padding:4px', words: '2', text: 'count' } ) ] ) ] );
	const r = run( bound, 'class Component { renderVals() { return { title: "Your basket", count: 2 }; } }' );
	const h = r.proposal.rows.find( ( x ) => 'h2' === x.tag );
	assert.equal( h.block, 'sgs/heading' );
	assert.equal( h.attributes.content, 'Your basket 2', 'the rendered words in order' );
	assert.match( find( r.skeleton, ( x ) => 'sgs/heading' === x.name )[ 0 ].handover[ 0 ].detail, /holds words the draft's code fills/ );
} );
