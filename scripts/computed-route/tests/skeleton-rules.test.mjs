// The skeleton writer's standing rules (Spec 48 FR-48-6, lib/skeleton-rules.mjs, data/skeleton-decisions.json `rules`):
// each rule on a small fixture slice in the inventory's shape, then MUST FAIL with its decisions entry removed (every
// rule is switched on by its entry, so removing it is removing the rule).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { sgsOnly } from '../lib/skeleton-classify.mjs';
import { makeRules } from '../lib/skeleton-rules.mjs';
import { inventoryModel } from '../lib/skeleton-model.mjs';
import { skeletonProblems } from '../lib/fill-skeleton.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
// Facts for a client with no Site Info map and no decisions; `off` removes those rules from a copy of the decisions.
const facts = ( ...off ) => {
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	off.forEach( ( id ) => ( id.includes( '.' ) ? delete f.decisions[ id.split( '.' )[ 0 ] ][ id.split( '.' )[ 1 ] ] : delete f.decisions.rules[ id ] ) );
	return f;
};

// A fixture tree: E( tag, { words, attrs, style, snippet, display, box }, children ) -> an inventory in the shape
// lib/skeleton-inventory.mjs reads (keys Root/<n>#0, parent keys, depth, words, allText, boxes and visibility).
const E = ( tag, o = {}, kids = [] ) => ( { tag, o, kids } );
function inventory( root ) {
	const elements = [];
	let n = 0;
	const walk = ( node, parentKey, depth ) => {
		const id = ++n;
		const key = `Root/${ id }#0`;
		const attrs = { ...( node.o.attrs || {} ), ...( node.o.style ? { style: node.o.style } : {} ) };
		const words = node.o.words || '';
		const el = { key, parentKey, depth, tag: node.tag, template: 'Root', tpl: id, attrs, words, allText: words, membership: node.o.membership || [], srcTag: node.tag, srcOwnText: words,
			snippet: node.o.snippet || `<${ node.tag } data-dc-tpl="${ id }">${ words }</${ node.tag }>`,
			box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, node.o.box || { x: 0, y: node.o.y ?? 0, w: 100, h: 20 } ] ) ),
			visible: { 375: true, 768: true, 1440: true }, display: node.o.display || 'block', flexDirection: 'row', screenshots: {} };
		elements.push( el );
		const texts = node.kids.map( ( k ) => walk( k, key, depth + 1 ) );
		el.allText = [ words, ...texts ].filter( Boolean ).join( ' ' );
		return el.allText;
	};
	walk( root, null, 0 );
	return { checks: {}, source: 'fixture', root: root.tag, generated: 'fixture', elements };
}
const run = ( root, o = {} ) => proposeSkeleton( { inventory: inventory( root ), facts: o.facts || facts(), surface: 'fixture', surfaceKind: o.kind || 'page', surfaceName: o.name || 'Fixture', built: o.built || null, motion: o.motion || new Set(), db, factRecord: o.factRecord } );
const row = ( r, pred ) => r.proposal.rows.find( pred );
const byWords = ( r, w ) => row( r, ( x ) => x.words === w );
const byTag = ( r, t ) => row( r, ( x ) => x.tag === t );
const settled = ( x ) => ( x ? { block: x.block, action: x.action, rule: x.rule } : null );
const svg = () => E( 'svg', {}, [ E( 'path' ) ] );
const section = ( kids ) => E( 'section', { display: 'block' }, kids );

test( 'the decisions data names only real blocks and every rule pattern compiles', async () => {
	const { decisionsProblems } = await import( '../lib/skeleton-facts.mjs' );
	assert.deepEqual( decisionsProblems( facts() ), [] );
} );

test( 'surfaceRoot: a top bar surface is the header\'s top row; MUST FAIL without the rule', () => {
	const tree = E( 'div', { display: 'flex' }, [ E( 'a', { words: 'Call', attrs: { href: 'tel:01217714330' } } ), E( 'a', { words: 'Email', attrs: { href: 'mailto:a@b.co' } } ) ] );
	assert.equal( run( tree, { kind: 'global', name: 'Top bar' } ).proposal.rows[ 0 ].block, 'sgs/site-header-row' );
	assert.notEqual( run( tree, { kind: 'global', name: 'Top bar', facts: facts( 'surfaceRoot' ) } ).proposal.rows[ 0 ].block, 'sgs/site-header-row' );
} );

test( 'readingProgress: a fixed full-width 3px bar is removed (a Floating UI setting); MUST FAIL without the rule', () => {
	const tree = section( [ E( 'div', { style: 'position:fixed;left:0;top:0;height:3px;width:100%;background:linear-gradient(90deg,#EBDD78,#E7D768)', attrs: { 'aria-hidden': 'true' } } ), E( 'p', { words: 'Body' } ) ] );
	assert.deepEqual( settled( byTag( run( tree ), 'div' ) ), { block: null, action: 'remove', rule: 'readingProgress' } );
	assert.notEqual( byTag( run( tree, { facts: facts( 'readingProgress' ) } ), 'div' ).rule, 'readingProgress' );
} );

test( 'decorationLayer and decorativeShape: a glow layer folds into the background, a ring is a decorative image; MUST FAIL without each', () => {
	const tree = section( [ E( 'span', { style: 'position:absolute;inset:0;background:radial-gradient(circle,#fff,transparent)', attrs: { 'aria-hidden': 'true' } } ), E( 'i', { style: 'position:absolute;width:80px;height:80px;border:2px solid #E7D768;border-radius:50%' } ), E( 'p', { words: 'Body' } ) ] );
	assert.deepEqual( settled( byTag( run( tree ), 'span' ) ), { block: null, action: 'remove', rule: 'decorationLayer' } );
	assert.deepEqual( settled( byTag( run( tree ), 'i' ) ), { block: 'sgs/decorative-image', action: null, rule: 'decorativeShape' } );
	assert.notEqual( byTag( run( tree, { facts: facts( 'decorationLayer' ) } ), 'span' ).rule, 'decorationLayer' );
	assert.notEqual( byTag( run( tree, { facts: facts( 'decorativeShape' ) } ), 'i' ).block, 'sgs/decorative-image' );
} );

test( 'typedDivider: a typed "|" between items is removed (the separators setting); MUST FAIL without the rule', () => {
	const tree = section( [ E( 'span', { words: 'Copyright 2026' } ), E( 'span', { words: '|' } ), E( 'span', { words: 'Terms' } ) ] );
	assert.equal( byWords( run( tree ), '|' ).rule, 'typedDivider' );
	assert.notEqual( byWords( run( tree, { facts: facts( 'typedDivider' ) } ), '|' ).action, 'remove' );
} );

test( 'logoElement and homeLink: a <brand-logo> is the logo block and its home link goes; MUST FAIL without each', () => {
	const tree = section( [ E( 'a', { attrs: { href: '#/' } }, [ E( 'acme-logo', { box: { x: 0, y: 0, w: 120, h: 40 } } ) ] ), E( 'p', { words: 'Body' } ) ] );
	const r = run( tree );
	assert.deepEqual( settled( byTag( r, 'a' ) ), { block: null, action: 'unwrap', rule: 'homeLink' } );
	assert.equal( byTag( r, 'acme-logo' ).block, facts().logoBlocks[ 0 ] );
	assert.ok( r.skeleton[ 0 ].innerBlocks.some( ( n ) => n.name === facts().logoBlocks[ 0 ] ), 'the logo takes the link\'s place' );
	assert.notEqual( byTag( run( tree, { facts: facts( 'homeLink' ) } ), 'a' ).action, 'unwrap' );
	assert.notEqual( byTag( run( tree, { facts: facts( 'logoElement' ) } ), 'acme-logo' ).rule, 'logoElement' );
} );

test( 'mediaElement and logoGrid: <image-slot> is media; links each holding one image are a gallery; MUST FAIL without each', () => {
	const tile = () => E( 'a', { attrs: { href: '/brand' } }, [ E( 'image-slot' ) ] );
	const tree = section( [ E( 'div', { display: 'grid' }, [ tile(), tile(), tile() ] ), E( 'image-slot' ) ] );
	const r = run( tree );
	assert.deepEqual( settled( byTag( r, 'div' ) ), { block: 'sgs/gallery', action: null, rule: 'logoGrid' } );
	assert.ok( r.proposal.rows.filter( ( x ) => 'a' === x.tag ).every( ( x ) => 'absorbed' === x.action ), 'the links are the gallery\'s items' );
	assert.equal( r.proposal.rows.at( -1 ).block, 'sgs/media' );
	assert.notEqual( byTag( run( tree, { facts: facts( 'logoGrid' ) } ), 'div' ).block, 'sgs/gallery' );
	assert.notEqual( run( tree, { facts: facts( 'mediaElement' ) } ).proposal.rows.at( -1 ).block, 'sgs/media' );
} );

test( 'widthWrapper: a centred block wrapper under a footer goes and its rows take its place; a centred grid there is the row; MUST FAIL without the rule', () => {
	const rowEl = ( w ) => E( 'div', { display: 'grid' }, [ E( 'p', { words: w } ), E( 'p', { words: `${ w } 2` } ) ] );
	const tree = E( 'footer', {}, [ E( 'div', { style: 'position:relative;max-width:1240px;margin:0 auto' }, [ rowEl( 'One' ), rowEl( 'Two' ) ] ) ] );
	const r = run( tree, { kind: 'footer' } );
	assert.deepEqual( settled( r.proposal.rows[ 1 ] ), { block: null, action: 'unwrap', rule: 'widthWrapper' } );
	assert.equal( r.skeleton[ 0 ].innerBlocks.length, 2, 'both rows sit directly in the footer' );
	assert.notEqual( run( tree, { kind: 'footer', facts: facts( 'widthWrapper' ) } ).proposal.rows[ 1 ].action, 'unwrap' );
	const grid = E( 'footer', {}, [ E( 'div', { style: 'max-width:1440px;margin:0 auto;display:grid', display: 'grid' }, [ E( 'div', {}, [ E( 'p', { words: 'A' } ) ] ), E( 'div', {}, [ E( 'p', { words: 'B' } ) ] ) ] ) ] );
	assert.notEqual( run( grid, { kind: 'footer' } ).proposal.rows[ 1 ].action, 'unwrap', 'a centred grid under the footer is its row' );
} );

test( 'backToTop: a back-to-top control holding a label and a glyph is a container linked to "top"; MUST FAIL without the rule', () => {
	const tree = section( [ E( 'button', { attrs: { 'aria-label': 'Back to top' }, snippet: '<button sc-camel-on-click="{{ toTop }}">' }, [ E( 'span', { words: 'Back to top' } ), E( 'span', {}, [ svg() ] ) ] ) ] );
	const r = byTag( run( tree ), 'button' );
	assert.deepEqual( [ r.block, r.rule, r.attributes.sgsBlockLinkSource ], [ 'sgs/container', 'backToTop', 'top' ] );
	assert.notEqual( byTag( run( tree, { facts: facts( 'backToTop' ) } ), 'button' ).rule, 'backToTop' );
} );

test( 'mapEmbed: an embedded Google map is business-info\'s map display; MUST FAIL without the rule', () => {
	const tree = section( [ E( 'iframe', { snippet: '<iframe title="Map" src="https://maps.google.com/maps?q=B11&amp;output=embed" data-dc-tpl="2"></iframe>' } ) ] );
	const r = byTag( run( tree ), 'iframe' );
	assert.deepEqual( [ r.block, r.attributes.displayType ], [ 'sgs/business-info', 'map' ] );
	assert.notEqual( byTag( run( tree, { facts: facts( 'mapEmbed' ) } ), 'iframe' ).block, 'sgs/business-info' );
} );

test( 'openStatus and hoursRows: a live open line is the open-status display, the next line part of it; an hours row is the hours display; MUST FAIL without each', () => {
	const tree = section( [ E( 'span', { words: 'Open now' }, [ E( 'span', { style: 'width:8px;height:8px;border-radius:50%' } ) ] ), E( 'span', { words: 'Closes at 5pm today' } ), E( 'div', { display: 'flex' }, [ E( 'span', { words: 'Monday – Thursday' } ), E( 'span', { words: '9:30am – 5pm' } ) ] ) ] );
	const r = run( tree );
	assert.deepEqual( [ byWords( r, 'Open now' ).block, byWords( r, 'Open now' ).attributes.displayType ], [ 'sgs/business-info', 'open-status' ] );
	assert.deepEqual( settled( byWords( r, 'Closes at 5pm today' ) ), { block: null, action: 'absorbed', rule: 'openStatus' } );
	const hours = row( r, ( x ) => 'div' === x.tag && x.depth === 1 );
	assert.deepEqual( [ hours.block, hours.attributes.displayType ], [ 'sgs/business-info', 'hours' ] );
	assert.equal( byWords( r, '9:30am – 5pm' ).action, 'absorbed' );
	assert.notEqual( byWords( run( tree, { facts: facts( 'openStatus' ) } ), 'Open now' ).rule, 'openStatus' );
	assert.notEqual( row( run( tree, { facts: facts( 'hoursRows' ) } ), ( x ) => 'div' === x.tag && x.depth === 1 ).rule, 'hoursRows' );
} );

test( 'pillButton and wholeCardLink: a label and an icon is one button reading Site Info; two pieces of text are a linked card; MUST FAIL without each', () => {
	const pill = E( 'a', { attrs: { href: 'tel:01217714330' } }, [ E( 'span', {}, [ svg() ] ), E( 'span', { words: '0121 771 4330' } ) ] );
	const card = E( 'a', { attrs: { href: 'mailto:sales@example.co.uk' } }, [ E( 'span', { words: 'Email us' } ), E( 'span', { words: 'We reply within a day' } ) ] );
	const r = run( section( [ pill, card ] ) );
	const p = r.proposal.rows[ 1 ];
	assert.deepEqual( [ p.block, p.rule, p.attributes.linkSource, p.attributes.labelFromSiteInfo ], [ 'sgs/button', 'pillButton', 'phone', true ] );
	assert.ok( r.proposal.rows.filter( ( x ) => x.into === p.key ).length >= 2, 'the label and glyph are the button\'s own' );
	const c = row( r, ( x ) => 'a' === x.tag && x.key !== p.key );
	assert.deepEqual( [ c.block, c.rule, c.attributes.sgsBlockLinkSource ], [ 'sgs/container', 'wholeCardLink', 'email' ] );
	assert.notEqual( run( section( [ pill, card ] ), { facts: facts( 'pillButton' ) } ).proposal.rows[ 1 ].rule, 'pillButton' );
	assert.notEqual( row( run( section( [ pill, card ] ), { facts: facts( 'wholeCardLink' ) } ), ( x ) => 'a' === x.tag && x.words === '' && x.order > 3 )?.rule, 'wholeCardLink' );
} );

test( 'siteInfoLink: a lone link to a maps host is a button linked to directions; MUST FAIL without the rule', () => {
	const tree = section( [ E( 'a', { words: 'Get directions', attrs: { href: 'https://maps.google.com/?q=B11' } } ) ] );
	const r = byWords( run( tree ), 'Get directions' );
	assert.deepEqual( [ r.block, r.attributes.linkSource ], [ 'sgs/button', 'directions' ] );
	assert.notEqual( byWords( run( tree, { facts: facts( 'siteInfoLink' ) } ), 'Get directions' ).rule, 'siteInfoLink' );
} );

test( 'navigation: a header nav is the menu bar block and draws its items; MUST FAIL without the rule', () => {
	const tree = E( 'header', {}, [ E( 'nav', { display: 'flex' }, [ E( 'button', { words: 'About' } ), E( 'button', { words: 'Sectors' } ) ] ) ] );
	const r = run( tree, { kind: 'header' } );
	assert.equal( byTag( r, 'nav' ).block, 'sgs/nav-bar-menu' );
	assert.ok( r.proposal.rows.filter( ( x ) => 'button' === x.tag ).every( ( x ) => 'absorbed' === x.action ) );
	assert.notEqual( byTag( run( tree, { kind: 'header', facts: facts( 'navigation' ) } ), 'nav' ).rule, 'navigation' );
} );

test( 'solitaryIcon: a glyph injected from a script value and an emoji alone are sgs/icon, an emoji in a sentence stays text; MUST FAIL without the rule', () => {
	const tree = section( [ E( 'span', { snippet: '<span style="width:40px;height:40px" data-dc-tpl="2">{{ arrowIcon }}</span>', box: { x: 0, y: 0, w: 40, h: 40 } } ), E( 'span', { words: '🔥' } ), E( 'p', { words: 'Hot deals this week 🔥' } ) ] );
	const r = run( tree );
	assert.equal( r.proposal.rows[ 1 ].block, 'sgs/icon' );
	assert.equal( byWords( r, '🔥' ).block, 'sgs/icon' );
	assert.equal( byWords( r, 'Hot deals this week 🔥' ).block, 'sgs/text' );
	assert.notEqual( run( tree, { facts: facts( 'solitaryIcon' ) } ).proposal.rows[ 1 ].block, 'sgs/icon' );
} );

test( 'label, columnHeading and cardTitle: a kicker is a label, a footer column\'s first text heads it, a card\'s first text titles it; MUST FAIL without each', () => {
	const kicker = 'font-weight:700;letter-spacing:.14em;text-transform:uppercase';
	// The links sit in their own wrapper (so the column-label decision, which needs the links beside the text, does not
	// apply) and a button follows.
	const col = E( 'div', {}, [ E( 'div', { words: 'Quick links', style: kicker } ), E( 'div', { display: 'grid' }, [ E( 'a', { words: 'Trade', attrs: { href: '/trade' }, y: 30 } ), E( 'a', { words: 'Blog', attrs: { href: '/blog' }, y: 60 } ) ] ), E( 'a', { words: 'Apply now', attrs: { href: '/apply' }, y: 90 } ) ] );
	const footer = E( 'footer', {}, [ E( 'div', { display: 'grid' }, [ col, E( 'div', {}, [ E( 'p', { words: 'About us' } ) ] ) ] ) ] );
	assert.deepEqual( settled( byWords( run( footer, { kind: 'footer' } ), 'Quick links' ) ), { block: 'sgs/heading', action: null, rule: 'columnHeading' } );
	assert.notEqual( byWords( run( footer, { kind: 'footer', facts: facts( 'columnHeading' ) } ), 'Quick links' ).block, 'sgs/heading' );
	const page = section( [ E( 'span', { words: 'Call us', style: kicker } ), E( 'a', { attrs: { href: '/story' } }, [ E( 'span', { words: 'Our Story' } ), E( 'span', { words: 'Six decades of family heritage' } ) ] ) ] );
	assert.equal( byWords( run( page ), 'Call us' ).block, 'sgs/label' );
	assert.equal( byWords( run( page, { facts: facts( 'label' ) } ), 'Call us' ).rule, null );
	assert.deepEqual( settled( byWords( run( page ), 'Our Story' ) ), { block: 'sgs/heading', action: null, rule: 'cardTitle' } );
	assert.notEqual( byWords( run( page, { facts: facts( 'cardTitle' ) } ), 'Our Story' ).rule, 'cardTitle' );
} );

test( 'listWrapper: a bare wrapper of stacked links, or of a grid of links each with a marker dot, is the list itself; MUST FAIL without the rule', () => {
	const link = ( w, y ) => E( 'a', { attrs: { href: `/${ w }` }, y }, [ E( 'span', { style: 'width:6px;height:6px;border-radius:50%' } ), E( 'span', { words: w } ) ] );
	const tree = section( [ E( 'div', { display: 'grid', style: 'display:grid;grid-template-columns:repeat(2,1fr)' }, [ link( 'Trade', 0 ), link( 'Brands', 0 ), link( 'Blog', 30 ) ] ) ] );
	const r = run( tree );
	assert.deepEqual( settled( byTag( r, 'div' ) ), { block: null, action: 'unwrap', rule: 'listWrapper' } );
	assert.equal( r.skeleton[ 0 ].innerBlocks[ 0 ].name, facts().listSlug );
	assert.deepEqual( r.skeleton[ 0 ].innerBlocks[ 0 ].attributes.items.map( ( i ) => i.text ), [ 'Trade', 'Brands', 'Blog' ] );
	assert.notEqual( byTag( run( tree, { facts: facts( 'listWrapper' ) } ), 'div' ).action, 'unwrap' );
} );

test( 'clientBuiltSurface: every row of a surface the client built as a post names that post; MUST FAIL without the rule', () => {
	const built = { site: 'canary', postType: 'sgs_drawer', postId: 1 };
	const tree = E( 'div', {}, [ E( 'span', { words: 'Menu' } ) ] );
	assert.ok( run( tree, { kind: 'drawer', built } ).proposal.rows.every( ( x ) => 'clientBuiltSurface' === x.rule && x.builtPost === built && ! x.low ), 'every row is settled by the post, so none awaits the finaliser' );
	assert.ok( run( tree, { kind: 'drawer' } ).proposal.rows.some( ( x ) => x.low ), 'the same surface unbuilt has a row the finaliser would be asked about' );
	assert.ok( run( tree, { kind: 'drawer', built, facts: facts( 'clientBuiltSurface' ) } ).proposal.rows.every( ( x ) => 'clientBuiltSurface' !== x.rule ) );
} );

test( 'marquee: a strip whose own animation loops a translate for ever is a brand strip (logos) or trust bar (labels); MUST FAIL without the rule or the motion record', () => {
	const logos = section( [ E( 'div', {}, [ E( 'a', { attrs: { href: '/a' } }, [ E( 'image-slot' ) ] ), E( 'a', { attrs: { href: '/b' } }, [ E( 'image-slot' ) ] ) ] ) ] );
	const loopKey = 'Root/2';
	const strip = byTag( run( logos, { motion: new Set( [ loopKey ] ) } ), 'div' );
	assert.deepEqual( [ strip.block, strip.rule, strip.attributes ], [ 'sgs/brand-strip', 'marquee', {} ] );
	assert.notEqual( byTag( run( logos ), 'div' ).rule, 'marquee', 'no motion record, no marquee (never read from a name)' );
	assert.notEqual( byTag( run( logos, { motion: new Set( [ loopKey ] ), facts: facts( 'marquee' ) } ), 'div' ).rule, 'marquee' );
	const labels = section( [ E( 'div', {}, [ E( 'span', { words: 'Free delivery' } ), E( 'span', { words: 'Next day' } ) ] ) ] );
	const ticker = byTag( run( labels, { motion: new Set( [ loopKey ] ) } ), 'div' );
	assert.deepEqual( [ ticker.block, ticker.attributes ], [ 'sgs/trust-bar', {} ] );
} );

test( 'trustBar: a row of short labels naming a trust-bar capability is a trust bar; hours rows, numbered steps and job tags are not; MUST FAIL without the rule', () => {
	const bar = ( ...words ) => section( [ E( 'div', { display: 'flex' }, words.map( ( w, i ) => E( 'span', { words: w, box: { x: i * 120, y: 0, w: 110, h: 30 } }, [ E( 'span', { style: 'width:7px;height:7px;border-radius:50%' } ) ] ) ) ) ] );
	const badges = bar( 'BRC certified', 'Halal certified', 'Family run' );
	const r = run( badges );
	assert.deepEqual( [ row( r, ( x ) => 'div' === x.tag ).block, row( r, ( x ) => 'div' === x.tag ).rule ], [ 'sgs/trust-bar', 'trustBar' ] );
	assert.ok( r.proposal.rows.filter( ( x ) => 'span' === x.tag ).every( ( x ) => 'absorbed' === x.action ), 'the badges are its items' );
	assert.notEqual( row( run( badges, { facts: facts( 'trustBar' ) } ), ( x ) => 'div' === x.tag ).block, 'sgs/trust-bar' );
	for ( const look of [ bar( 'Sunday', 'Closed' ), bar( '01', 'Halal' ), bar( 'Warehouse', 'Full-time', 'Birmingham' ) ] ) {
		assert.notEqual( row( run( look ), ( x ) => 'div' === x.tag ).rule, 'trustBar', 'not a trust bar' );
	}
} );

test( 'hero and heroInner: a page\'s first section holding its h1 is the split hero; its wrappers go, its image is its media, its buttons stay a group; MUST FAIL without each', () => {
	const page = E( 'main', {}, [ E( 'section', {}, [ E( 'div', { display: 'grid' }, [
		E( 'div', {}, [ E( 'h1', { words: 'Fresh food, delivered', y: 0 } ), E( 'p', { words: 'Family run since 1962.', y: 40 } ), E( 'div', { display: 'flex', y: 80 }, [ E( 'a', { words: 'Apply', attrs: { href: '/apply' }, box: { x: 0, y: 80, w: 100, h: 20 } } ), E( 'a', { words: 'Catalogue', attrs: { href: '/catalogue' }, box: { x: 120, y: 80, w: 100, h: 20 } } ) ] ), E( 'div', { display: 'flex', y: 120 }, [ E( 'span', { words: 'BRC certified', style: 'text-transform:uppercase', box: { x: 0, y: 120, w: 100, h: 20 } } ), E( 'span', { words: 'Halal certified', style: 'text-transform:uppercase', box: { x: 120, y: 120, w: 100, h: 20 } } ) ] ) ] ),
		E( 'div', {}, [ E( 'image-slot' ) ] ),
	] ) ] ), E( 'section', {}, [ E( 'h2', { words: 'More' } ) ] ) ] );
	const r = run( page );
	const hero = byTag( r, 'section' );
	assert.deepEqual( [ hero.block, hero.rule, hero.attributes.variant ], [ 'sgs/hero', 'hero', 'split' ] );
	assert.deepEqual( settled( byTag( r, 'image-slot' ) ), { block: null, action: 'absorbed', rule: 'heroInner' } );
	assert.ok( r.proposal.rows.filter( ( x ) => 'div' === x.tag && 'unwrap' === x.action ).length >= 2, 'the layout wrappers go' );
	const heroNode = r.skeleton[ 0 ].innerBlocks[ 0 ];
	assert.deepEqual( heroNode.innerBlocks.map( ( n ) => n.name ), [ 'sgs/heading', 'sgs/text', 'sgs/multi-button', 'sgs/container' ], 'heading, text, the button group and the badge row sit directly in the hero' );
	assert.deepEqual( heroNode.innerBlocks[ 3 ].innerBlocks.map( ( n ) => n.name ), [ 'sgs/label', 'sgs/label' ], 'badges inside a section are labels side by side, never a trust bar (a section block)' );
	assert.equal( r.proposal.rows.filter( ( x ) => 'hero' === x.rule ).length, 1, 'only the first section holding the h1' );
	assert.notEqual( byTag( run( page, { facts: facts( 'hero' ) } ), 'section' ).block, 'sgs/hero' );
	assert.notEqual( byTag( run( page, { facts: facts( 'heroInner' ) } ), 'image-slot' ).rule, 'heroInner' );
	assert.notEqual( byTag( run( page, { kind: 'header' } ), 'section' ).rule, 'hero', 'a hero is a page section' );
} );

test( 'marqueeFrame: the frame that clips and fades a logo marquee goes; MUST FAIL without the rule', () => {
	const tree = section( [ E( 'div', { style: 'overflow:hidden;mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent)' }, [ E( 'div', {}, [ E( 'a', { attrs: { href: '/a' } }, [ E( 'image-slot' ) ] ), E( 'a', { attrs: { href: '/b' } }, [ E( 'image-slot' ) ] ) ] ) ] ) ] );
	const motion = new Set( [ 'Root/3' ] );
	const r = run( tree, { motion } );
	assert.deepEqual( settled( r.proposal.rows[ 1 ] ), { block: null, action: 'unwrap', rule: 'marqueeFrame' } );
	const strip = r.skeleton[ 0 ].innerBlocks[ 0 ];
	assert.deepEqual( [ strip.name, strip.attributes ], [ 'sgs/brand-strip', {} ], 'the strip carries no old scrolling or edge-fade attribute' );
	assert.notEqual( run( tree, { motion, facts: facts( 'marqueeFrame' ) } ).proposal.rows[ 1 ].action, 'unwrap' );
} );

test( 'alignWrapper: a wrapper that only aligns or pads its content goes; one that paints stays; MUST FAIL without the rule', () => {
	const tree = section( [ E( 'div', { style: 'text-align:center;padding:0 40px' }, [ E( 'h2', { words: 'Our Brands' } ), E( 'p', { words: 'Trusted names' } ) ] ), E( 'div', { style: 'text-align:center;background:#0A7EA8' }, [ E( 'h2', { words: 'Band' } ) ] ) ] );
	const r = run( tree );
	assert.deepEqual( settled( r.proposal.rows[ 1 ] ), { block: null, action: 'unwrap', rule: 'alignWrapper' } );
	assert.notEqual( row( r, ( x ) => 'div' === x.tag && x.order > 1 && x.depth === 1 )?.action, 'unwrap', 'a wrapper with a background stays' );
	assert.notEqual( run( tree, { facts: facts( 'alignWrapper' ) } ).proposal.rows[ 1 ].action, 'unwrap' );
} );

// ---------- what the rules must NOT do (QC council, 2026-10-13) ----------
test( 'a link holding two logo images and no words is never a pill button: the home link goes and both logos stay', () => {
	const tree = section( [ E( 'a', { attrs: { href: '/', 'aria-label': 'Home' } }, [ E( 'img', { attrs: { srcBasename: 'logo-mark.svg', alt: 'Acme' } } ), E( 'img', { attrs: { srcBasename: 'logo-wordmark.svg', alt: 'Acme' } } ) ] ) ] );
	const r = run( tree );
	assert.deepEqual( settled( byTag( r, 'a' ) ), { block: null, action: 'unwrap', rule: 'homeLink' } );
	assert.equal( r.proposal.rows.filter( ( x ) => 'img' === x.tag && 'absorbed' !== x.action ).length, 2, 'both logos are kept' );
	assert.notEqual( byTag( run( section( [ E( 'a', { attrs: { href: '/shop' } }, [ E( 'img' ), E( 'img' ) ] ) ] ) ), 'a' ).block, 'sgs/button', 'no words, no pill' );
} );

test( 'a control the visitor operates is never a label, a toggle or slider arrow is never a pill, and a bare number is never a label or title', () => {
	const kicker = 'text-transform:uppercase;letter-spacing:.14em';
	const r = run( section( [ E( 'button', { words: 'Continue', style: kicker } ), E( 'span', { words: '01', style: kicker } ), E( 'button', { attrs: { 'aria-expanded': 'false' } }, [ E( 'span', { words: 'Delivery times' } ), E( 'span', {}, [ svg() ] ) ] ) ] ) );
	assert.notEqual( byWords( r, 'Continue' ).block, 'sgs/label' );
	assert.notEqual( byWords( r, '01' ).block, 'sgs/label' );
	assert.notEqual( row( r, ( x ) => 'button' === x.tag && ! x.words ).rule, 'pillButton', 'a disclosure toggle is not a pill' );
} );

test( 'cardAction: a card link ending in a call to action is a plain card and the action holds the link (Bean, 2026-10-13); MUST FAIL without the rule', () => {
	const card = section( [ E( 'a', { attrs: { href: '/food-service' } }, [ E( 'h3', { words: 'Food Service' } ), E( 'p', { words: 'Kitchens that never stop' } ), E( 'div', { words: 'Explore Food Service' }, [ svg() ] ) ] ) ] );
	const r = run( card );
	const link = byTag( r, 'a' );
	assert.deepEqual( [ link.block, link.attributes.sgsBlockLink ], [ 'sgs/container', undefined ], 'the card itself is not linked' );
	const action = byWords( r, 'Explore Food Service' );
	assert.deepEqual( [ action.block, action.rule, action.attributes.url ], [ 'sgs/button', 'cardAction', '/food-service' ] );
	const off = run( card, { facts: facts( 'cardAction' ) } );
	assert.notEqual( byWords( off, 'Explore Food Service' ).block, 'sgs/button' );
	assert.equal( byTag( off, 'a' ).attributes.sgsBlockLink, '/food-service', 'without the rule the whole card is the link again' );
} );

test( 'openStatus: a second open-status line in a cousin position joins the first display and takes no text attribute', () => {
	const tree = section( [ E( 'div', {}, [ E( 'div', {}, [ E( 'span', { words: 'Open now' } ) ] ), E( 'div', {}, [ E( 'span', { words: 'Closes at 5pm today' } ) ] ) ] ) ] );
	const r = run( tree );
	const displays = r.proposal.rows.filter( ( x ) => 'sgs/business-info' === x.block && 'open-status' === x.attributes?.displayType );
	assert.equal( displays.length, 1, 'one open-status display, not two' );
	assert.deepEqual( settled( byWords( r, 'Closes at 5pm today' ) ), { block: null, action: 'absorbed', rule: 'openStatus' } );
	assert.equal( byWords( r, 'Closes at 5pm today' ).into, displays[ 0 ].key );
	assert.deepEqual( Object.keys( displays[ 0 ].attributes ), [ 'displayType' ], 'no generic text attribute (copyrightPrefix) on a rule-set display' );
} );

test( 'readingProgress hands the bar over as a Floating UI site setting; without the rule no such handover exists', () => {
	const tree = section( [ E( 'div', { style: 'position:fixed;left:0;top:0;height:3px;width:100%', attrs: { 'aria-hidden': 'true' } } ), E( 'p', { words: 'Body' } ) ] );
	assert.equal( byTag( run( tree ), 'div' ).handover?.kind, 'floating-ui' );
	assert.notEqual( byTag( run( tree, { facts: facts( 'readingProgress' ) } ), 'div' ).handover?.kind, 'floating-ui' );
} );

test( 'an emoji alone is an icon whether or not its characters are spaced', () => {
	const r = run( section( [ E( 'span', { words: '⭐ ⭐ ⭐' } ), E( 'span', { words: '⭐⭐⭐' } ) ] ) );
	assert.deepEqual( [ byWords( r, '⭐ ⭐ ⭐' ).block, byWords( r, '⭐⭐⭐' ).block ], [ 'sgs/icon', 'sgs/icon' ] );
} );

test( 'a client decision on an element a block absorbs is flagged stale, never silently dropped', () => {
	const nav = E( 'header', {}, [ E( 'nav', { display: 'flex' }, [ E( 'button', { words: 'About' } ), E( 'button', { words: 'Sectors' } ) ] ) ] );
	const tree = inventory( nav );
	const key = tree.elements.find( ( x ) => 'About' === x.words ).key;
	const r = proposeSkeleton( { inventory: tree, facts: facts(), surface: 'fixture', surfaceKind: 'header', clientDecisions: { surfaces: { fixture: { [ key ]: { block: 'sgs/button', signature: 'button|About' } } } }, db } );
	const about = byWords( r, 'About' );
	assert.equal( about.action, 'absorbed' );
	assert.match( about.stale || '', /client decision .* no longer applies/ );
} );

test( 'a client decision with attributes on a rule-eligible element puts them on its node and the nav still absorbs its items; MUST FAIL without applying a decision\'s attributes', () => {
	const nav = E( 'header', {}, [ E( 'nav', { display: 'flex' }, [ E( 'button', { words: 'About' } ), E( 'button', { words: 'Sectors' } ) ] ) ] );
	const tree = inventory( nav );
	const navEl = tree.elements.find( ( x ) => 'nav' === x.tag );
	const decision = { block: 'sgs/nav-bar-menu', attributes: { ref: 5 }, signature: `nav|${ navEl.words }` };
	const r = proposeSkeleton( { inventory: tree, facts: facts(), surface: 'fixture', surfaceKind: 'header', clientDecisions: { surfaces: { fixture: { [ navEl.key ]: decision } } }, db } );
	assert.equal( byTag( r, 'nav' ).source, 'client decision' );
	const flat = ( list ) => list.flatMap( ( n ) => [ n, ...flat( n.innerBlocks || [] ) ] );
	assert.equal( flat( r.skeleton ).find( ( n ) => 'sgs/nav-bar-menu' === n.name )?.attributes?.ref, 5, 'the node carries the decision attributes' );
	assert.ok( r.proposal.rows.filter( ( x ) => 'button' === x.tag ).every( ( x ) => 'absorbed' === x.action ) );
} );

// A header whose nav (shown by sc-if 44) draws two items; the second item renders sc-if 51 (the current-section look).
const IF = ( tpl ) => ( { kind: 'sc-if', tpl: String( tpl ) } );
const navTree = () => E( 'header', {}, [ E( 'nav', { display: 'flex', membership: [ IF( 44 ) ] }, [
	E( 'button', { words: 'Home', membership: [ IF( 44 ) ] }, [ E( 'span', { membership: [ IF( 44 ), IF( 51 ) ] } ) ] ),
	E( 'button', { words: 'About', membership: [ IF( 44 ) ] } ),
] ) ] );
const SETTINGS = { itemColour: { slot: '.bar > .item:nth-of-type(3) > .link', state: null }, itemColourCurrent: { slot: '.bar > .item:nth-of-type(7) > .link', state: 'current' } };
const STATES = [ { name: 'desktop nav (≥ 1024)', how_to_reach: 'state.w ≥ 1024', sc_if_tpl_ids: [ '44', '49', '51' ] }, { name: 'current section', how_to_reach: 'route', sc_if_tpl_ids: [ '51' ] }, { name: 'tablet (≥ 768)', how_to_reach: 'state.w ≥ 768', sc_if_tpl_ids: [ '57' ] }, { name: 'compact (< 1024)', how_to_reach: 'state.w < 1024', sc_if_tpl_ids: [ '55' ] } ];
const navRun = ( o = {} ) => {
	const tree = inventory( navTree() );
	const r = proposeSkeleton( { inventory: tree, facts: facts(), surface: 'fixture', surfaceKind: 'header', calSettings: () => SETTINGS, states: STATES, thresholds: [ 768, 1024 ], db, ...o } );
	const flat = ( list ) => list.flatMap( ( n ) => [ n, ...flat( n.innerBlocks || [] ) ] );
	return { r, node: flat( r.skeleton ).find( ( n ) => 'sgs/nav-bar-menu' === n.name ), tree };
};

test( 'a block that draws its children gets draftSlots from its calibration: the resting child and the child a current-state sc-if renders in; MUST FAIL without them', () => {
	const { node, tree } = navRun();
	const key = ( w ) => tree.elements.find( ( x ) => 'button' === x.tag && w === x.allText ).key;
	assert.deepEqual( node.draftSlots, { [ SETTINGS.itemColour.slot ]: { tpl: key( 'About' ) }, [ SETTINGS.itemColourCurrent.slot ]: { tpl: key( 'Home' ) } } );
} );

test( 'a drawing block with no calibration gets no child slots and the row says why', () => {
	const { node, r } = navRun( { calSettings: () => ( {} ) } );
	assert.equal( node.draftSlots, undefined );
	assert.match( r.proposal.rows.find( ( x ) => 'nav' === x.tag ).slotNotes.join( ' ' ), /no slot for itemColour, so/ );
	const none = navRun( { states: [] } );
	assert.deepEqual( Object.keys( none.node.draftSlots ), [ SETTINGS.itemColour.slot ], 'no current-state sc-if known: only the resting child' );
} );

test( 'a navigation block collapses at the one >= width threshold of the states that show it; MUST FAIL without the rule', () => {
	assert.equal( navRun().node.attributes.collapsePoint, 1024 );
	assert.equal( 'collapsePoint' in navRun( { thresholds: [ 768 ] } ).node.attributes, false, 'a width the draft code never uses is not taken' );
	const two = navRun( { states: [ ...STATES, { name: 'wide', how_to_reach: 'state.w ≥ 1260', sc_if_tpl_ids: [ '44' ] } ], thresholds: [ 1024, 1260 ] } );
	assert.equal( 'collapsePoint' in two.node.attributes, false, 'two thresholds are not picked between' );
	assert.match( two.r.proposal.rows.find( ( x ) => 'nav' === x.tag ).slotNotes.join( ' ' ), /2 width thresholds/ );
} );

test( 'drawsChildren: a leaf, an array-item block and a named block draw their children; MUST FAIL with the name removed', () => {
	const m = inventoryModel( inventory( E( 'div' ) ) );
	const hooks = { siteInfoKinds: () => new Map(), isColumnLabel: () => false, topBlock: () => null, blockOfKey: () => null };
	const on = makeRules( { m, facts: facts(), hooks } );
	assert.match( on.drawsChildren( 'sgs/button' ), /leaf/ );
	assert.match( on.drawsChildren( 'sgs/icon-list' ), /array_item_schema/ );
	assert.match( on.drawsChildren( 'sgs/business-info' ), /Site Info/ );
	assert.equal( on.drawsChildren( 'sgs/container' ), null );
	const f = facts();
	f.decisions.rules.drawsChildren.blocks = f.decisions.rules.drawsChildren.blocks.filter( ( b ) => 'sgs/business-info' !== b.block );
	assert.equal( makeRules( { m, facts: f, hooks } ).drawsChildren( 'sgs/business-info' ), null );
} );

test( 'coreExceptions: a named core block survives the core ban, any other core block is rewritten or refused; MUST FAIL without the entry', () => {
	const result = { candidates: [ { block: 'core/list', score: 1, share: 1, evidence: [ { kind: 'db', w: 1, text: 'tag map' } ] } ], confidence: 1 };
	assert.equal( sgsOnly( result, { 'core/list': 'sgs/icon-list' } ).candidates[ 0 ].block, 'sgs/icon-list' );
	assert.equal( sgsOnly( result, { 'core/list': 'sgs/icon-list' }, [ { block: 'core/list', reason: 'fixture' } ] ).candidates[ 0 ].block, 'core/list' );
	assert.deepEqual( sgsOnly( result, {} ).rejectedCore, [ 'core/list' ] );
} );

test( 'siteInfoPatterns: a typed phone number and email address are Site Info; MUST FAIL without the patterns', () => {
	const tree = section( [ E( 'span', { words: '0121 771 4330' } ), E( 'span', { words: 'sales@example.co.uk' } ) ] );
	const r = run( tree );
	assert.deepEqual( [ byWords( r, '0121 771 4330' ).block, byWords( r, 'sales@example.co.uk' ).block ], [ 'sgs/business-info', 'sgs/business-info' ] );
	const off = run( tree, { facts: facts( 'siteInfoPatterns.phone', 'siteInfoPatterns.email' ) } );
	assert.notEqual( byWords( off, '0121 771 4330' ).block, 'sgs/business-info' );
} );

test( 'briefOnlyLines: a placeholder photography credit is removed; MUST FAIL without the line', () => {
	const tree = section( [ E( 'span', { words: 'Placeholder photography via Unsplash' } ) ] );
	assert.equal( run( tree ).proposal.rows[ 1 ].action, 'remove' );
	const f = facts();
	f.decisions.briefOnlyLines = f.decisions.briefOnlyLines.filter( ( b ) => 'photo-credit-note' !== b.id );
	assert.notEqual( run( tree, { facts: f } ).proposal.rows[ 1 ].action, 'remove' );
} );

test( 'every fixture skeleton passes the skeleton rules (no style value, valid handovers)', () => {
	const trees = [ section( [ E( 'iframe', { snippet: '<iframe src="https://maps.google.com/maps?q=B11" data-dc-tpl="2"></iframe>' } ), E( 'acme-logo' ) ] ) ];
	trees.forEach( ( t ) => assert.deepEqual( skeletonProblems( run( t ).skeleton ), [] ) );
} );

test( 'formControl: each control is the field block for its rendered type, its label, star and hint go, a wrapping <label> unwraps; MUST FAIL without the rule', () => {
	const field = ( type, words, y ) => E( 'div', { style: 'display:flex;flex-direction:column;gap:8px', y }, [ E( 'label', { words, attrs: { for: `f-${ type }` } }, [ E( 'span', { words: '*', style: 'color:#C8412B' } ) ] ), E( 'input', { attrs: { id: `f-${ type }`, type } } ), E( 'span', { words: `Hint for ${ type }`, style: 'font-size:15px' } ) ] );
	const consent = E( 'label', { style: 'display:flex;gap:10px', y: 200 }, [ E( 'input', { attrs: { type: 'checkbox', required: '' } } ), E( 'span', { words: 'I agree to the terms' } ) ] );
	const form = E( 'form', {}, [ field( 'text', 'Business name', 0 ), field( 'email', 'Email', 60 ), field( 'tel', 'Phone', 120 ), E( 'select', { y: 160 } ), E( 'textarea', { y: 180 } ), consent ] );
	const r = run( section( [ form ] ) );
	const types = r.proposal.rows.filter( ( x ) => [ 'input', 'select', 'textarea' ].includes( x.tag ) ).map( ( x ) => [ x.block, x.rule ] );
	assert.deepEqual( types, [ [ 'sgs/form-field-text', 'formControl' ], [ 'sgs/form-field-email', 'formControl' ], [ 'sgs/form-field-phone', 'formControl' ], [ 'sgs/form-field-select', 'formControl' ], [ 'sgs/form-field-textarea', 'formControl' ], [ 'sgs/form-field-consent', 'formControl' ] ] );
	assert.deepEqual( settled( byWords( r, 'Hint for email' ) ), { block: null, action: 'remove', rule: 'formControl' } );
	assert.equal( byWords( r, 'Business name' ).action, 'remove' );
	assert.deepEqual( settled( row( r, ( x ) => 'label' === x.tag && ! x.words ) ), { block: null, action: 'unwrap', rule: 'formControl' } );
	// A consent tick whose required flag is only in the template (the fact record holds `required="{{ true }}"`) is still the consent field.
	const tick = E( 'label', {}, [ E( 'input', { attrs: { type: 'checkbox' } } ), E( 'span', { words: 'I agree' } ) ] );
	const tpl = ( attrs ) => ( { template: { realTag: 'input', attrs, style: { static: [], holes: [] }, holes: [], membership: { scIf: [], scFor: [], dcImport: [] } } } );
	assert.equal( byTag( run( section( [ tick ] ), { factRecord: { elements: { 'Root/3': tpl( { type: 'checkbox', required: '{{ true }}' } ) }, surfaces: {} } } ), 'input' ).block, 'sgs/form-field-consent' );
	assert.notEqual( byTag( run( section( [ tick ] ), { factRecord: { elements: { 'Root/3': tpl( { type: 'checkbox', required: '{{ r.req }}' } ) }, surfaces: {} } } ), 'input' ).block, 'sgs/form-field-consent' );
	const off = run( section( [ form ] ), { facts: facts( 'formControl' ) } );
	assert.ok( off.proposal.rows.filter( ( x ) => 'input' === x.tag ).every( ( x ) => 'formControl' !== x.rule && ! /form-field/.test( x.block || '' ) ) );
	assert.notEqual( byWords( off, 'Hint for email' ).action, 'remove' );
} );

test( 'cardHeading: a card\'s bold, larger first text (after its number) is a heading; a bold line beside a same-size line is not; MUST FAIL without the rule', () => {
	const card = ( y ) => E( 'div', { style: 'padding:24px;display:flex;flex-direction:column', y }, [ E( 'span', { words: '01', style: 'font-weight:700;font-size:13px' } ), E( 'div', { words: `Food Service ${ y }`, style: 'font-weight:700;font-size:19px' } ), E( 'div', { words: 'Quality ingredients for venues and caterers.', style: 'font-size:15px' } ) ] );
	const grid = E( 'div', { display: 'grid', style: 'display:grid;grid-template-columns:repeat(2,1fr)' }, [ card( 0 ), card( 1 ) ] );
	const flat = E( 'div', {}, [ E( 'div', { words: 'Same size line', style: 'font-weight:700;font-size:16px' } ), E( 'div', { words: 'Its neighbour', style: 'font-size:16px' } ) ] );
	const r = run( section( [ grid, flat ] ) );
	assert.deepEqual( settled( byWords( r, 'Food Service 0' ) ), { block: 'sgs/heading', action: null, rule: 'cardHeading' } );
	assert.equal( byWords( r, '01' ).rule, null );
	assert.notEqual( byWords( r, 'Same size line' ).rule, 'cardHeading' );
	const quote = E( 'div', {}, [ E( 'span', { words: '“', style: 'font-weight:800;font-size:60px' } ), E( 'p', { words: 'Reliable every week.', style: 'font-size:18px' } ) ] );
	assert.notEqual( byWords( run( section( [ quote ] ) ), '“' ).rule, 'cardHeading' );
	assert.notEqual( byWords( run( section( [ grid ] ), { facts: facts( 'cardHeading' ) } ), 'Food Service 0' ).rule, 'cardHeading' );
} );

test( 'dotMarker: a dot or short bar beside text is removed, stacked dot rows are one list, an absolute glow is not a marker; MUST FAIL without the rule', () => {
	const dot = ( s = 'width:8px;height:8px;border-radius:50%;background:#D8CA50' ) => E( 'span', { style: s } );
	const bullet = ( w, y ) => E( 'div', { style: 'display:flex;gap:12px', y }, [ dot(), E( 'span', { words: w } ) ] );
	const list = E( 'div', {}, [ bullet( 'Halal certified', 0 ), bullet( 'Next-day delivery', 30 ), bullet( 'Trade prices', 60 ) ] );
	const meta = E( 'div', { display: 'flex' }, [ E( 'span', { words: 'Feb 2026' } ), dot( 'width:4px;height:4px;border-radius:50%' ), E( 'span', { words: '2 min read' } ) ] );
	const kicker = E( 'div', { display: 'flex' }, [ dot( 'width:28px;height:2px;background:#D8CA50;display:inline-block' ), E( 'span', { words: 'Accreditations' } ) ] );
	const r = run( section( [ list, meta, kicker ] ) );
	assert.equal( r.skeleton[ 0 ].innerBlocks[ 0 ].name, facts().listSlug );
	assert.deepEqual( r.skeleton[ 0 ].innerBlocks[ 0 ].attributes.items.map( ( i ) => i.text ), [ 'Halal certified', 'Next-day delivery', 'Trade prices' ] );
	const removed = r.proposal.rows.filter( ( x ) => 'span' === x.tag && ! x.words && 'remove' === x.action && 'dotMarker' === x.rule );
	assert.equal( removed.length, 2 );
	const off = run( section( [ list, meta, kicker ] ), { facts: facts( 'dotMarker' ) } );
	assert.ok( off.proposal.rows.every( ( x ) => 'dotMarker' !== x.rule ) );
	assert.notEqual( off.skeleton[ 0 ].innerBlocks[ 0 ].name, facts().listSlug );
	const glow = run( section( [ E( 'div', {}, [ dot( 'position:absolute;width:8px;height:8px;background:#fff' ), E( 'p', { words: 'Body' } ) ] ) ] ) );
	assert.notEqual( row( glow, ( x ) => 'span' === x.tag ).rule, 'dotMarker' );
} );

test( 'formControl carries the field text into the block and stays inside real fields (QC council 2026-10-19); each case MUST FAIL without its guard', () => {
	// The label, required flag and hint reach the field block's own settings.
	const field = E( 'div', { style: 'display:flex;flex-direction:column' }, [ E( 'label', { words: 'Business name', attrs: { for: 'b' } }, [ E( 'span', { words: '*' } ) ] ), E( 'input', { attrs: { id: 'b', type: 'text', required: '' } } ), E( 'span', { words: 'As shown on your invoices', y: 40 } ) ] );
	const f = byTag( run( section( [ E( 'form', {}, [ field ] ) ] ) ), 'input' );
	assert.deepEqual( [ f.block, f.attributes.label, f.attributes.required, f.attributes.helpText ], [ 'sgs/form-field-text', 'Business name', true, 'As shown on your invoices' ] );
	// A heading beside a lone newsletter input, and text beside a hidden input, are not field text.
	const news = E( 'div', {}, [ E( 'h3', { words: 'Subscribe' } ), E( 'input', { attrs: { type: 'email' }, y: 30 } ) ] );
	const hid = E( 'div', {}, [ E( 'input', { attrs: { type: 'hidden' } } ), E( 'p', { words: 'We reply within a day' } ) ] );
	const r = run( section( [ news, hid ] ) );
	assert.notEqual( byWords( r, 'Subscribe' ).action, 'remove' );
	assert.notEqual( byWords( r, 'We reply within a day' ).action, 'remove' );
	// A required checkbox among others is a checkbox, not the consent field; a password is a text field; a submit is not a field.
	const group = E( 'fieldset', {}, [ E( 'label', {}, [ E( 'input', { attrs: { type: 'checkbox', required: '' } } ), E( 'span', { words: 'Rice' } ) ] ), E( 'label', { y: 30 }, [ E( 'input', { attrs: { type: 'checkbox' } } ), E( 'span', { words: 'Flour' } ) ] ) ] );
	const g = run( section( [ E( 'form', {}, [ group ] ) ] ) );
	assert.deepEqual( g.proposal.rows.filter( ( x ) => 'input' === x.tag ).map( ( x ) => x.block ), [ 'sgs/form-field-checkbox', 'sgs/form-field-checkbox' ] );
	const misc = run( section( [ E( 'form', {}, [ E( 'input', { attrs: { type: 'password' } } ), E( 'input', { attrs: { type: 'submit', value: 'Send' }, y: 40 } ) ] ) ] ) );
	const inputs = misc.proposal.rows.filter( ( x ) => 'input' === x.tag );
	assert.equal( inputs[ 0 ].block, 'sgs/form-field-text' );
	assert.notEqual( inputs[ 1 ].rule, 'formControl' );
} );

test( 'dotMarker never takes a control and needs text beside it; cardHeading reads rem and keyword weights (QC council 2026-10-19); MUST FAIL without each guard', () => {
	// A slider's pagination dots: labelled buttons with no text beside them stay controls.
	const dots = E( 'div', { display: 'flex' }, [ 0, 1, 2 ].map( ( i ) => E( 'button', { attrs: { 'aria-label': `Slide ${ i + 1 }` }, style: 'width:12px;height:12px;border-radius:999px', snippet: `<button sc-camel-on-click="{{ d.go }}" data-dc-tpl="${ i }"></button>` } ) ) );
	assert.ok( run( section( [ dots ] ) ).proposal.rows.every( ( x ) => 'dotMarker' !== x.rule ) );
	// An empty swatch with nothing written beside it is not a marker either.
	const swatch = E( 'div', {}, [ E( 'span', { style: 'width:10px;height:10px;background:#D8CA50' } ) ] );
	assert.notEqual( byTag( run( section( [ swatch ] ) ), 'span' ).rule, 'dotMarker' );
	const card = ( y ) => E( 'div', { y }, [ E( 'div', { words: `Wholesale ${ y }`, style: 'font-weight:bold;font-size:1.25rem' } ), E( 'div', { words: 'Pallet volumes for cash and carries.', style: 'font-size:1rem' } ) ] );
	assert.equal( byWords( run( section( [ E( 'div', { display: 'grid' }, [ card( 0 ), card( 1 ) ] ) ] ) ), 'Wholesale 0' ).rule, 'cardHeading' );
} );
