// Rule: phrasing content inside a text element stays that element's inline HTML, in whichever SGS block receives the text
// (lib/skeleton-model.mjs::inlinePart, lib/inline-text.mjs::inlineText, the markup the receiving setting's RichText holds). A paragraph holding an inline <b>, <a> or styled <span> is one text block whose
// text is the rebuilt inline HTML: kept tags as they stand, links through the route's draft-link resolver, a bold or slanted
// span as the format that draws it, and any other paint difference a handover naming the words (never an inline style,
// Spec 32). MUST FAIL cases fail on the old code (the paragraph was a container of pieces). Negative controls: a real block
// child inside a text element (a button, an image) still splits it, an inline-block pill and an inline badge with a padded
// ground stay their own blocks, and children a flex row lays out are never inline.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { richTextSettings, inlineAllowance, plainTextSettings, formatLists } from '../lib/inline-text.mjs';
import { fixtureRecord, fixtureResolved } from './fixtures/fixture-facts.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'fixture-client', repo: REPO } );

// A fixture tree: E( tag, { words, attrs, style, display, y, flow }, children ). `flow` is the recorded run order: strings
// and child indices (a child's index becomes its key); `display` is the element's display at every width.
const E = ( tag, o = {}, kids = [] ) => ( { tag, o, kids } );
function inventory( root ) {
	const elements = [];
	let n = 0;
	const walk = ( node, parentKey, depth ) => {
		const id = ++n;
		const key = `Root/${ id }#0`;
		const attrs = { ...( node.o.attrs || {} ), ...( node.o.style ? { style: node.o.style } : {} ) };
		const words = node.o.words || '';
		const display = node.o.display || 'block';
		const el = { key, parentKey, depth, tag: node.tag, template: 'Root', tpl: id, attrs, words, allText: words, membership: [], srcTag: node.tag, srcOwnText: words,
			snippet: `<${ node.tag } data-dc-tpl="${ id }">${ words }</${ node.tag }>`,
			box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 0, y: node.o.y ?? 0, w: 100, h: 20 } ] ) ),
			visible: { 375: true, 768: true, 1440: true }, display, displayAt: { 375: display, 768: display, 1440: display }, flexDirection: 'row', screenshots: {} };
		elements.push( el );
		const kids = node.kids.map( ( k ) => walk( k, key, depth + 1 ) );
		node.o.flow && ( el.flow = node.o.flow.map( ( x ) => ( 'number' === typeof x ? { key: kids[ x ].key } : x ) ) );
		el.allText = [ words, ...kids.map( ( k ) => k.allText ) ].filter( Boolean ).join( ' ' );
		return el;
	};
	walk( root, null, 0 );
	return fixtureResolved( { checks: {}, source: 'fixture', root: root.tag, generated: 'fixture', elements } );
}
const run = ( root ) => {
	const inv = inventory( root );
	return proposeSkeleton( { inventory: inv, facts: facts(), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', motion: new Set(), db, factRecord: fixtureRecord( inv ) } );
};
const nodes = ( list ) => list.flatMap( ( n ) => [ n, ...nodes( n.innerBlocks || [] ) ] );
const nodeOf = ( r, key ) => nodes( r.skeleton ).find( ( n ) => ( n.draftRef?.tpl ?? n.draftRef ) === key );
const rowOf = ( r, key ) => r.proposal.rows.find( ( x ) => x.key === key );
const section = ( kids ) => E( 'section', { display: 'block' }, kids );
const TEXT = 'sgs/text';

test( 'MUST FAIL: a paragraph holding an inline <b> is one text block whose text keeps it in its place, as the <strong> the bold format saves', () => {
	const p = E( 'p', { words: 'no eggs or dairy.', flow: [ 0, ' no eggs or dairy.' ] }, [ E( 'b', { words: 'Vegan base:', display: 'inline' } ) ] );
	const r = run( section( [ p ] ) );
	const node = nodeOf( r, 'Root/2#0' );
	assert.equal( node.name, TEXT );
	assert.equal( node.attributes.text, '<strong>Vegan base:</strong> no eggs or dairy.' );
	assert.equal( rowOf( r, 'Root/2#0' ).words, 'Vegan base: no eggs or dairy.', 'the paragraph\'s words hold its inline child\'s words in their place' );
	assert.equal( rowOf( r, 'Root/3#0' ), undefined, 'the <b> is part of the paragraph, never a row of its own' );
} );

test( 'MUST FAIL: an inline link goes through the draft-link resolver; a draft route is never typed into the text', () => {
	const p = E( 'p', { words: 'Read our or the .', flow: [ 'Read our ', 0, ' or the ', 1, '.' ] }, [ E( 'a', { words: 'guide', display: 'inline', attrs: { href: 'https://example.org/guide' } } ), E( 'a', { words: 'help page', display: 'inline', attrs: { href: 'Help.dc.html' } } ) ] );
	const node = nodeOf( run( section( [ p ] ) ), 'Root/2#0' );
	assert.equal( node.name, TEXT );
	assert.match( node.attributes.text, /^Read our <a href="https:\/\/example\.org\/guide">guide<\/a> or the .*help page.*\.$/ );
	assert.doesNotMatch( node.attributes.text, /dc\.html/ );
} );

test( 'MUST FAIL: a bold span becomes <strong>; a coloured word is a handover naming it, never an inline style', () => {
	const p = E( 'p', { words: 'Bake the batch .', flow: [ 'Bake the ', 0, ' batch ', 1, '.' ] }, [ E( 'span', { words: 'whole', display: 'inline', style: 'font-weight:700' } ), E( 'span', { words: 'today', display: 'inline', style: 'color:#c00' } ) ] );
	const node = nodeOf( run( section( [ p ] ) ), 'Root/2#0' );
	assert.equal( node.name, TEXT );
	assert.equal( node.attributes.text, 'Bake the <strong>whole</strong> batch today.' );
	assert.doesNotMatch( node.attributes.text, /style=/ );
	assert.ok( ( node.handover || [] ).some( ( h ) => 'text' === h.kind && /"today"/.test( h.detail ) && /color/.test( h.detail ) ) );
} );

test( 'MUST FAIL: an inventory read before it recorded the run order places the words by textLeads, with a line break kept', () => {
	const p = E( 'p', { words: 'after the break' }, [ E( 'b', { words: 'First line', display: 'inline' } ), E( 'br', { display: 'inline' } ) ] );
	const inv = inventory( section( [ p ] ) );
	const el = inv.elements.find( ( x ) => 'p' === x.tag );
	el.textLeads = false;
	inv.elements.find( ( x ) => 'br' === x.tag ).visible = { 375: false, 768: false, 1440: false };
	const r = proposeSkeleton( { inventory: inv, facts: facts(), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', motion: new Set(), db, factRecord: fixtureRecord( inv ) } );
	assert.equal( nodeOf( r, 'Root/2#0' ).attributes.text, '<strong>First line</strong><br>after the break' );
} );

test( 'negative control: a button or an image inside a text element still splits it', () => {
	const withButton = E( 'p', { words: 'Ready?', flow: [ 'Ready? ', 0 ] }, [ E( 'button', { words: 'Order now', display: 'inline-block' } ) ] );
	const withImage = E( 'p', { words: 'Our team', flow: [ 0, 'Our team' ] }, [ E( 'img', { display: 'inline', attrs: { alt: 'Team photo', srcBasename: 'team.jpg' } } ) ] );
	const r = run( section( [ withButton, withImage ] ) );
	assert.notEqual( nodeOf( r, 'Root/2#0' ).name, TEXT );
	assert.ok( rowOf( r, 'Root/3#0' )?.block, 'the button is a block of its own' );
	assert.ok( rowOf( r, 'Root/5#0' ), 'the image is a row of its own' );
} );

test( 'negative control: an inline-block pill and an inline badge with a padded ground stay their own blocks; flex children are never inline', () => {
	const pill = E( 'h2', { words: 'Your basket', flow: [ 'Your basket ', 0 ] }, [ E( 'span', { words: '2', display: 'inline-block', style: 'padding:2px 8px;background:#f9cf6e' } ) ] );
	const badge = E( 'h2', { words: 'Offers', flow: [ 'Offers ', 0 ] }, [ E( 'span', { words: 'New', display: 'inline', style: 'padding:2px 8px;background:#f9cf6e' } ) ] );
	const row = E( 'div', { display: 'flex' }, [ E( 'span', { words: 'Left' } ), E( 'span', { words: 'Right' } ) ] );
	const r = run( section( [ pill, badge, row ] ) );
	assert.ok( rowOf( r, 'Root/3#0' )?.block || rowOf( r, 'Root/3#0' )?.action, 'the inline-block pill has a row of its own' );
	assert.ok( rowOf( r, 'Root/5#0' )?.block || rowOf( r, 'Root/5#0' )?.action, 'the padded inline badge has a row of its own' );
	assert.ok( rowOf( r, 'Root/7#0' ) && rowOf( r, 'Root/8#0' ), 'each flex child is a row of its own' );
} );

test( 'MUST FAIL: a heading keeps its italic word and its link; a button label keeps bold and italic and names what it cannot hold', () => {
	const h = E( 'h2', { words: 'Bake it, then .', flow: [ 'Bake ', 0, ', then ', 1, '.' ] }, [ E( 'em', { words: 'slowly', display: 'inline' } ), E( 'a', { words: 'read more', display: 'inline', attrs: { href: 'https://example.org/more' } } ) ] );
	const button = E( 'a', { words: 'Shop', style: 'padding:12px 24px;background:#141414', attrs: { href: 'https://example.org/shop' }, flow: [ 'Shop ', 0, ' ', 1 ] }, [ E( 'strong', { words: 'now', display: 'inline' } ), E( 'code', { words: 'SALE', display: 'inline' } ) ] );
	const r = run( section( [ h, button ] ) );
	const heading = nodeOf( r, 'Root/2#0' );
	assert.equal( heading.name, 'sgs/heading' );
	assert.equal( heading.attributes.content, 'Bake <em>slowly</em>, then <a href="https://example.org/more">read more</a>.' );
	const b = nodeOf( r, 'Root/5#0' );
	assert.equal( b.name, 'sgs/button' );
	assert.equal( b.attributes.label, 'Shop <strong>now</strong> SALE' );
	assert.ok( ( b.handover || [] ).some( ( x ) => /sgs\/button label holds only core\/bold, core\/italic/.test( x.detail ) && /<code> "SALE"/.test( x.detail ) ), JSON.stringify( b.handover ) );
} );

test( 'MUST FAIL: list items whose text holds plain text only keep their words and name the markup they cannot hold', () => {
	const item = ( y, w ) => E( 'a', { words: `${ w } box`, y, attrs: { href: `https://example.org/${ w }` }, flow: [ 0, ' box' ] }, [ E( 'b', { words: w, display: 'inline' } ) ] );
	const r = run( section( [ E( 'div', {}, [ item( 0, 'Taster' ), item( 30, 'Family' ) ] ) ] ) );
	const list = nodes( r.skeleton ).find( ( n ) => n.name === facts().listSlug );
	assert.ok( list, 'the stacked links are one list' );
	assert.deepEqual( list.attributes.items.map( ( i ) => i.text ), [ 'Taster box', 'Family box' ] );
	assert.ok( ( list.handover || [] ).some( ( x ) => /holds plain text only/.test( x.detail ) && /bold "Taster"/.test( x.detail ) ), JSON.stringify( list.handover ) );
} );

test( 'the settings that hold inline markup come from the RichText record of the framework, every other text setting is a named plain finding', () => {
	const { formats, problems } = richTextSettings( REPO );
	assert.deepEqual( problems, [] );
	assert.deepEqual( inlineAllowance( REPO, 'sgs/text', 'text' ).formats.slice( 0, 4 ), [ 'core/bold', 'core/italic', 'core/link', 'core/strikethrough' ] );
	assert.deepEqual( inlineAllowance( REPO, 'sgs/button', 'label' ).formats, [ 'core/bold', 'core/italic' ] );
	assert.ok( ! inlineAllowance( REPO, 'sgs/accordion-item', 'title' ).formats.includes( 'core/link' ) );
	assert.ok( formats.size > 20 );
	const plain = plainTextSettings( { db, codeRepo: REPO } );
	assert.ok( plain.some( ( p ) => 'sgs/tab' === p.block && 'label' === p.attr ), 'a tab title holds plain text: a finding' );
	assert.ok( plain.some( ( p ) => 'sgs/testimonial' === p.block && 'reviewerRole' === p.attr && /RICH_TEXT_PLAIN/.test( p.why ) ) );
	assert.ok( ! plain.some( ( p ) => 'sgs/heading' === p.block && 'content' === p.attr ), 'negative control: a RichText with formats is no finding' );
	assert.throws( () => formatLists( 'export const X = Object.freeze( makeList() );' ), /X is no list/ );
} );

test( 'negative control: a paragraph with no inline markup is written as before, with no handover', () => {
	const r = run( section( [ E( 'p', { words: 'Just words.' } ) ] ) );
	const node = nodeOf( r, 'Root/2#0' );
	assert.equal( node.attributes.text, 'Just words.' );
	assert.equal( ( node.handover || [] ).length, 0 );
} );
