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
import { handoverProblems } from '../lib/fill-handover.mjs';

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
			box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, node.o.boxes?.[ w ] || node.o.box || { x: 0, y: node.o.y ?? 0, w: 100, h: 20 } ] ) ),
			visible: node.o.visible || { 375: true, 768: true, 1440: true }, display: node.o.display || 'block', flexDirection: 'row', screenshots: {} };
		elements.push( el );
		const texts = node.kids.map( ( k ) => walk( k, key, depth + 1 ) );
		el.allText = [ words, ...texts ].filter( Boolean ).join( ' ' );
		return el.allText;
	};
	walk( root, null, 0 );
	return { checks: {}, source: 'fixture', root: root.tag, generated: 'fixture', elements };
}
const run = ( root, o = {} ) => proposeSkeleton( { inventory: inventory( root ), facts: o.facts || facts(), surface: 'fixture', surfaceKind: o.kind || 'page', surfaceName: o.name || 'Fixture', built: o.built || null, motion: o.motion || new Set(), db, factRecord: o.factRecord, ...( o.calSettings ? { calSettings: o.calSettings } : {} ) } );
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

test( 'surfaceRoot: a drawer surface is the navigation drawer and a global surface is not given a block by its name (rules.headerSlots places a header strip); MUST FAIL without the rule', () => {
	const tree = E( 'div', { display: 'flex' }, [ E( 'a', { words: 'Call', attrs: { href: 'tel:01217714330' } } ), E( 'a', { words: 'Email', attrs: { href: 'mailto:a@b.co' } } ) ] );
	assert.equal( run( tree, { kind: 'drawer', name: 'Mobile drawer' } ).proposal.rows[ 0 ].block, 'sgs/nav-drawer' );
	assert.notEqual( run( tree, { kind: 'drawer', name: 'Mobile drawer', facts: facts( 'surfaceRoot' ) } ).proposal.rows[ 0 ].block, 'sgs/nav-drawer' );
	assert.notEqual( run( tree, { kind: 'global', name: 'Top bar' } ).proposal.rows[ 0 ].block, 'sgs/site-header-row' );
} );

test( 'readingProgress: a fixed full-width 3px bar is removed (a Floating UI setting); MUST FAIL without the rule', () => {
	const tree = section( [ E( 'div', { style: 'position:fixed;left:0;top:0;height:3px;width:100%;background:linear-gradient(90deg,#EBDD78,#E7D768)', attrs: { 'aria-hidden': 'true' } } ), E( 'p', { words: 'Body' } ) ] );
	assert.deepEqual( settled( byTag( run( tree ), 'div' ) ), { block: null, action: 'remove', rule: 'readingProgress' } );
	assert.notEqual( byTag( run( tree, { facts: facts( 'readingProgress' ) } ), 'div' ).rule, 'readingProgress' );
} );

test( 'decorationLayer and decorativeShape: a glow layer and a ring are both decorative images; MUST FAIL without each', () => {
	const tree = section( [ E( 'span', { style: 'position:absolute;inset:0;background:radial-gradient(circle,#fff,transparent)', attrs: { 'aria-hidden': 'true' } } ), E( 'i', { style: 'position:absolute;width:80px;height:80px;border:2px solid #E7D768;border-radius:50%' } ), E( 'p', { words: 'Body' } ) ] );
	assert.deepEqual( settled( byTag( run( tree ), 'span' ) ), { block: 'sgs/decorative-image', action: null, rule: 'decorationLayer' } );
	assert.deepEqual( settled( byTag( run( tree ), 'i' ) ), { block: 'sgs/decorative-image', action: null, rule: 'decorativeShape' } );
	assert.notEqual( byTag( run( tree, { facts: facts( 'decorationLayer' ) } ), 'span' ).rule, 'decorationLayer' );
	assert.notEqual( byTag( run( tree, { facts: facts( 'decorativeShape' ) } ), 'i' ).block, 'sgs/decorative-image' );
} );

test( 'decorationDelivered: a pointer glare, the hero animation and a drawn line are removed with a handover to their owner, never a block; MUST FAIL without the rule', () => {
	const layer = ( attrs, style ) => E( 'span', { style, attrs: { 'aria-hidden': 'true' }, snippet: `<span ${ attrs } style="${ style }" data-dc-tpl="9"></span>` } );
	const glare = layer( '', 'position:absolute;inset:0;background:radial-gradient(circle at var(--gx,100%) var(--gy,0%),rgba(255,255,255,.36),rgba(255,255,255,0) 55%)' );
	const hero = layer( 'ref="{{ setHeroSvgEl }}" data-src="{{ hero.animSrc }}"', 'position:absolute;inset:0' );
	const line = layer( 'data-draw=""', 'position:absolute;left:0;right:0;top:27px;height:2px;background:linear-gradient(90deg,#D8CA50,#2EADE2)' );
	const glow = layer( '', 'position:absolute;inset:0;background:radial-gradient(70% 90% at 0% 100%,rgba(255,255,255,.12),rgba(255,255,255,0) 60%)' );
	const verdicts = ( node, o ) => settled( byTag( run( section( [ node, E( 'p', { words: 'Body' } ) ] ), o ), 'span' ) );
	for ( const node of [ glare, hero, line ] ) {
		const r = byTag( run( section( [ node ] ) ), 'span' );
		assert.deepEqual( settled( r ), { block: null, action: 'remove', rule: 'decorationDelivered' } );
		assert.equal( r.handover?.owner, 'behaviour', 'the handover names its owner' );
		assert.notEqual( verdicts( node, { facts: facts( 'decorationDelivered' ) } ).rule, 'decorationDelivered' );
		assert.deepEqual( verdicts( node, { facts: facts( 'decorationDelivered' ) } ), { block: 'sgs/decorative-image', action: null, rule: 'decorationLayer' } );
	}
	assert.deepEqual( verdicts( glow ), { block: 'sgs/decorative-image', action: null, rule: 'decorationLayer' } );
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
	const tree = E( 'footer', {}, [ E( 'div', { style: 'position:relative;max-width:1240px;margin:0 auto;padding:0 24px' }, [ rowEl( 'One' ), rowEl( 'Two' ) ] ) ] );
	// The host's calibrated content-width slot reads the wrapper (rules.widthWrapper.hostSetting); with no calibration nothing
	// reads its cap, so the paint conservation of an unwrap keeps it (the last assertion).
	const inner = { calSettings: () => ( { contentWidth: { slot: '.sgs-inner', property: 'max-width' } } ) };
	const r = run( tree, { kind: 'footer', ...inner } );
	assert.deepEqual( settled( r.proposal.rows[ 1 ] ), { block: null, action: 'unwrap', rule: 'widthWrapper' } );
	assert.deepEqual( r.skeleton[ 0 ].innerBlocks.map( ( n ) => n.attributes.rowSlot ), [ 'top', 'columns', 'bottom' ], 'the footer holds its three rows (rules.footerSlots); the wrapper is not one of them' );
	assert.equal( r.skeleton[ 0 ].innerBlocks[ 1 ].innerBlocks.length, 4, 'the unwrapped wrapper two rows give their four paragraphs to the columns row' );
	assert.notEqual( run( tree, { kind: 'footer', facts: facts( 'widthWrapper' ), ...inner } ).proposal.rows[ 1 ].action, 'unwrap' );
	assert.notEqual( run( tree, { kind: 'footer' } ).proposal.rows[ 1 ].action, 'unwrap', 'no slot reads the cap: the wrapper stays' );
	// A wrapper that paints only its cap and centring: with no slot and no band finder reading the cap (no calibration), the
	// guard keeps it (MUST FAIL where any cap is taken as read); with the calibrated slot it goes.
	const capOnly = E( 'footer', {}, [ E( 'div', { style: 'max-width:1240px;margin:0 auto' }, [ rowEl( 'One' ), rowEl( 'Two' ) ] ) ] );
	assert.notEqual( run( capOnly, { kind: 'footer' } ).proposal.rows[ 1 ].action, 'unwrap', 'a cap nothing reads keeps the wrapper' );
	assert.equal( run( capOnly, { kind: 'footer', ...inner } ).proposal.rows[ 1 ].action, 'unwrap', 'negative control: the calibrated slot reads the cap' );
	const grid = E( 'footer', {}, [ E( 'div', { style: 'max-width:1440px;margin:0 auto;display:grid', display: 'grid' }, [ E( 'div', {}, [ E( 'p', { words: 'A' } ) ] ), E( 'div', {}, [ E( 'p', { words: 'B' } ) ] ) ] ) ] );
	assert.notEqual( run( grid, { kind: 'footer' } ).proposal.rows[ 1 ].action, 'unwrap', 'a centred grid under the footer is its row' );
} );

test( 'backToTop: a back-to-top control holding a label and a glyph is a container linked to "top"; MUST FAIL without the rule', () => {
	const tree = section( [ E( 'button', { attrs: { 'aria-label': 'Back to top' }, snippet: '<button sc-camel-on-click="{{ toTop }}">' }, [ E( 'span', { words: 'Back to top' } ), E( 'span', {}, [ svg() ] ) ] ) ] );
	const r = byTag( run( tree ), 'button' );
	assert.deepEqual( [ r.block, r.rule, r.attributes.sgsBlockLinkSource ], [ 'sgs/container', 'backToTop', 'top' ] );
	assert.notEqual( byTag( run( tree, { facts: facts( 'backToTop' ) } ), 'button' ).rule, 'backToTop' );
} );

test( 'MUST FAIL: a back-to-top control whose words are its own beside a glyph is a button labelled with them, the glyph absorbed', () => {
	const tree = section( [ E( 'button', { words: 'Back to top', attrs: { 'aria-label': 'Back to top' }, snippet: '<button sc-camel-on-click="{{ toTop }}">' }, [ E( 'span', {}, [ svg() ] ) ] ) ] );
	const r = byTag( run( tree ), 'button' );
	assert.deepEqual( [ r.block, r.rule, r.attributes.linkSource, r.attributes.label ], [ 'sgs/button', 'backToTop', 'top', 'Back to top' ] );
	assert.equal( byTag( run( tree ), 'span' ).action, 'absorbed' );
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

test( 'MUST FAIL: a run of sibling hours rows is one hours display (the first row), the later rows absorbed into it; a row in another list is its own display', () => {
	const dayRow = ( day, time ) => E( 'div', { display: 'flex' }, [ E( 'span', { words: day } ), E( 'span', { words: time } ) ] );
	const tree = section( [
		E( 'div', { display: 'flex', words: '' }, [ dayRow( 'Monday – Thursday', '9:30am – 5pm' ), dayRow( 'Friday', '9:30am – 12pm, 2:30 – 5pm' ), dayRow( 'Saturday', '10am – 3pm' ), dayRow( 'Sunday', 'Closed 9am' ) ] ),
		E( 'div', { display: 'flex' }, [ dayRow( 'Tuesday', '8am – 6pm' ) ] ),
	] );
	const r = run( tree );
	const rows = r.proposal.rows.filter( ( x ) => 'div' === x.tag && 2 === x.depth );
	assert.equal( rows.length, 5 );
	const shown = rows.filter( ( x ) => 'sgs/business-info' === x.block );
	assert.deepEqual( shown.map( ( x ) => [ x.attributes.displayType, x.rule ] ), [ [ 'hours', 'hoursRows' ], [ 'hours', 'hoursRows' ] ], 'one display per list of rows' );
	const later = rows.filter( ( x ) => 'absorbed' === x.action && 'hoursRows' === x.rule );
	assert.equal( later.length, 3 );
	assert.ok( later.every( ( x ) => x.into === shown[ 0 ].key ), 'each later row is absorbed into the first row of its list' );
	assert.equal( byWords( r, 'Tuesday' ).action, 'absorbed', 'the other list\'s row text belongs to its own display' );
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

test( 'marquee textItems: a looping strip of brand-name links inside its own section is the brand strip showing names, a doubled loop read once; MUST FAIL without textItems or the motion record', () => {
	const names = [ 'Ray-Ban', 'Gucci', 'Oakley' ];
	const link = ( w ) => E( 'a', { attrs: { href: '#' }, words: w } );
	// The page's root, a section of its own (not a page wrapper) and the track inside it: the track is two deep (Eye Care's brand marquee).
	const tree = E( 'div', {}, [ section( [ E( 'div', {}, [ ...names, ...names ].map( link ) ) ] ), section( [ E( 'h2', { words: 'Best sellers' } ) ] ) ] );
	const loopKey = 'Root/3';
	const strip = row( run( tree, { motion: new Set( [ loopKey ] ) } ), ( x ) => 'Root/3#0' === x.key );
	assert.deepEqual( [ strip.block, strip.rule ], [ 'sgs/brand-strip', 'marquee' ] );
	assert.deepEqual( strip.attributes, { brandDisplay: 'text', logoLayout: 'row', logos: names.map( ( name ) => ( { name } ) ) } );
	assert.notEqual( row( run( tree ), ( x ) => 'Root/3#0' === x.key ).block, 'sgs/brand-strip', 'no motion record, no strip' );
	const off = facts();
	delete off.decisions.rules.marquee.textItems;
	assert.notEqual( row( run( tree, { motion: new Set( [ loopKey ] ), facts: off } ), ( x ) => 'Root/3#0' === x.key ).block, 'sgs/brand-strip' );
	// Negative control: a looping row of plain labels (no links) is not taken for a brand strip.
	const labels = E( 'div', {}, [ section( [ E( 'div', {}, [ E( 'span', { words: 'Free delivery' } ), E( 'span', { words: 'Next day' } ) ] ) ] ) ] );
	assert.notEqual( row( run( labels, { motion: new Set( [ loopKey ] ) } ), ( x ) => 'Root/3#0' === x.key ).block, 'sgs/brand-strip' );
} );

test( 'onceOfLoop reads a list rendered twice once, and leaves any other list whole', async () => {
	const { onceOfLoop } = await import( '../lib/skeleton-rules.mjs' );
	assert.deepEqual( onceOfLoop( [ 'a', 'b', 'a', 'b' ] ), [ 'a', 'b' ] );
	assert.deepEqual( onceOfLoop( [ 'a', 'b', 'c', 'b' ] ), [ 'a', 'b', 'c', 'b' ] );
	assert.deepEqual( onceOfLoop( [ 'a', 'b', 'c' ] ), [ 'a', 'b', 'c' ] );
} );

test( 'brandImageLink: image links each to a different brand are the social icons row, not a gallery; image links all to one brand stay a gallery; MUST FAIL without the entry', () => {
	const icon = ( href, label ) => E( 'a', { attrs: { href, 'aria-label': label } }, [ E( 'img', { attrs: { src: `assets/${ label.toLowerCase() }.svg` } } ) ] );
	// Eye Care's footer: Instagram, Google and WhatsApp profile links, each holding the brand's glyph as an <img>.
	const socials = section( [ E( 'div', {}, [ icon( 'https://www.instagram.com/eyecare.birmingham/', 'Instagram' ), icon( 'https://share.google/abc', 'Google Business profile' ), icon( 'https://wa.me/4479605978', 'WhatsApp' ) ] ) ] );
	const row = byTag( run( socials ), 'div' );
	assert.equal( row.block, 'sgs/social-icons' );
	assert.notEqual( row.rule, 'logoGrid' );
	assert.equal( byTag( run( socials, { facts: facts( 'structural.brandImageLink' ) } ), 'div' ).block, 'sgs/gallery', 'without the entry the run is a logo wall again' );
	// Negative control: photos that each link to an Instagram post (Mama's feed tiles) are one brand's links: still a gallery.
	const post = ( n ) => E( 'a', { attrs: { href: `https://www.instagram.com/p/${ n }/` } }, [ E( 'img', { attrs: { src: `assets/feed-${ n }.jpg` } } ) ] );
	const feed = section( [ E( 'div', { display: 'grid' }, [ post( 1 ), post( 2 ), post( 3 ) ] ) ] );
	assert.deepEqual( settled( byTag( run( feed ), 'div' ) ), { block: 'sgs/gallery', action: null, rule: 'logoGrid' } );
} );

test( 'wrappedWords: the own words of a blockquote are the body child of its quote block, never its attribution; MUST FAIL without the entry', () => {
	const words = 'Had a lovely experience taking my daughter here.';
	const tree = section( [ E( 'figure', {}, [ E( 'span', { words: 'Anonymous M.' } ), E( 'blockquote', { words } ) ] ) ] );
	const find = ( r ) => {
		const out = [];
		const walk = ( ns ) => ns.forEach( ( n ) => ( 'sgs/quote' === n.name && out.push( n ), walk( n.innerBlocks || [] ) ) );
		walk( r.skeleton );
		return out[ 0 ];
	};
	const quote = find( run( tree ) );
	assert.ok( quote, 'the blockquote is the quote block' );
	assert.equal( quote.attributes.attribution, undefined, 'the words are not the attribution' );
	assert.deepEqual( quote.innerBlocks.map( ( n ) => [ n.name, n.attributes.text ] ), [ [ 'sgs/text', words ] ] );
	const off = facts();
	delete off.decisions.rules.wrappedWords;
	assert.equal( find( run( tree, { facts: off } ) ).attributes.attribution, words, 'without the entry the old writing stands' );
	// Negative control: a leaf block (a heading) keeps its words in its own text setting, with no body child.
	const heading = byTag( run( section( [ E( 'h2', { words: 'What people say' } ) ] ) ), 'h2' );
	assert.deepEqual( [ heading.block, heading.attributes ], [ 'sgs/heading', { content: 'What people say' } ] );
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

test( 'hero: sections inside one page wrapper (`<main>`) make the first section holding the h1 the hero, never the wrapper, and a later section is not unwrapped as inside a hero; a page whose sections sit directly under the root keeps its hero; MUST FAIL without the wrapper test', () => {
	const at = ( y ) => ( { y, box: { x: 0, y, w: 100, h: 100 } } );
	const sections = () => [
		E( 'section', at( 0 ), [ E( 'div', {}, [ E( 'h1', { words: 'Baked fresh' } ), E( 'p', { words: 'To order.' } ) ] ) ] ),
		E( 'section', { id: 'gifts', ...at( 200 ) }, [ E( 'div', {}, [ E( 'h2', { words: 'Gifts' } ), E( 'p', { words: 'Boxes.' } ) ] ) ] ),
		E( 'section', at( 400 ), [ E( 'div', {}, [ E( 'h2', { words: 'Reviews' } ), E( 'p', { words: 'Kind words.' } ) ] ) ] ),
	];
	const wrapped = E( 'div', {}, [ E( 'div', { words: 'Menu' } ), E( 'main', at( 0 ), sections() ) ] );
	const r = run( wrapped );
	const heroRows = r.proposal.rows.filter( ( x ) => 'hero' === x.rule );
	assert.deepEqual( heroRows.map( ( x ) => [ x.tag, x.block ] ), [ [ 'section', 'sgs/hero' ] ], 'one hero, the first section' );
	assert.equal( heroRows[ 0 ].words, '', 'the section, not the h1' );
	assert.notEqual( byTag( r, 'main' ).block, 'sgs/hero', 'the wrapper is not the hero' );
	const later = r.proposal.rows.filter( ( x ) => 'section' === x.tag ).slice( 1 );
	assert.equal( later.length, 2 );
	assert.ok( later.every( ( x ) => 'heroInner' !== x.rule ), 'a later section is not inside the hero' );
	// A `<main>` whose only child is the page's content container (heading and everything else inside it) has no sections: no hero.
	const single = run( E( 'div', {}, [ E( 'main', at( 0 ), [ E( 'div', at( 0 ), [ E( 'h1', { words: 'Your basket' } ), E( 'div', { ...at( 200 ) }, [ E( 'p', { words: 'Empty.' } ) ] ) ] ) ] ) ] ) );
	assert.equal( single.proposal.rows.filter( ( x ) => 'hero' === x.rule ).length, 0, 'a lone content container is not a hero' );
	assert.ok( single.proposal.rows.every( ( x ) => 'heroInner' !== x.rule ), 'nothing is unwrapped as inside a hero' );
	const flat = run( E( 'div', {}, sections() ) );
	assert.deepEqual( flat.proposal.rows.filter( ( x ) => 'hero' === x.rule ).map( ( x ) => x.tag ), [ 'section' ], 'sections directly under the root: the first holding the h1 is the hero' );
} );

test( 'pageSection: a trust bar that is a section of a page wrapper (`<main>`) is proposed as the trust bar, the wrapper itself is not; MUST FAIL without the wrapper test', () => {
	const at = ( y ) => ( { y, box: { x: 0, y, w: 100, h: 100 } } );
	const badges = E( 'div', { display: 'flex', ...at( 200 ) }, [ 'BRC certified', 'Halal certified', 'Family run' ].map( ( w, i ) => E( 'span', { words: w, box: { x: i * 120, y: 200, w: 110, h: 30 } }, [ E( 'span', { style: 'width:7px;height:7px;border-radius:50%' } ) ] ) ) );
	const page = E( 'div', {}, [ E( 'main', at( 0 ), [ E( 'section', at( 0 ), [ E( 'div', {}, [ E( 'h1', { words: 'Baked fresh' } ), E( 'p', { words: 'To order.' } ) ] ) ] ), badges, E( 'section', at( 400 ), [ E( 'h2', { words: 'Gifts' } ) ] ) ] ) ] );
	const r = run( page );
	const bar = row( r, ( x ) => 'div' === x.tag && 'trustBar' === x.rule );
	assert.equal( bar?.block, 'sgs/trust-bar' );
	assert.notEqual( byTag( r, 'main' ).rule, 'trustBar', 'the wrapper is never a page section' );
	assert.ok( r.proposal.rows.filter( ( x ) => 'span' === x.tag ).every( ( x ) => 'absorbed' === x.action ), 'the badges are its items' );
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

test( 'heroInner cell: the column of a side-by-side row inside a hero whose other cell holds no picture stays a container (its items must not become cells of the row); with a picture in the row it still unwraps; MUST FAIL without the cell check', () => {
	const at = ( x, y, w = 500 ) => ( { box: { x, y, w, h: 40 } } );
	const page = ( art ) => E( 'main', {}, [ E( 'section', {}, [ E( 'div', { display: 'grid', style: 'display:grid;grid-template-columns:1fr 1fr' }, [
		E( 'div', { style: 'display:flex;flex-direction:column;gap:18px', ...at( 0, 0 ) }, [ E( 'h1', { words: 'Gifts she will eat', ...at( 0, 0 ) } ), E( 'p', { words: 'Baked fresh.', ...at( 0, 80 ) } ) ] ),
		E( 'div', { ...at( 600, 0 ) }, art ),
	] ) ] ), E( 'section', {}, [ E( 'h2', { words: 'More' } ) ] ) ] );
	const column = ( r ) => r.proposal.rows[ byWords( r, 'Gifts she will eat' ).order - 1 ];
	const noPicture = run( page( [ E( 'p', { words: 'A note card', ...at( 600, 0 ) } ), E( 'p', { words: 'Dear Aisha', ...at( 600, 90 ) } ) ] ) );
	assert.notEqual( column( noPicture ).action, 'unwrap', 'the column of a row with no picture stays' );
	assert.ok( 'sgs/container' === column( noPicture ).block || null === column( noPicture ).action );
	const withPicture = run( page( [ E( 'image-slot', at( 600, 0 ) ) ] ) );
	assert.equal( column( withPicture ).action, 'unwrap', 'negative control: the column of the hero split with a picture still unwraps' );
} );

test( 'drawsChildren: an array attribute whose fields are all behaviour or technical (sgs/hero bgSvgParts) is no item list, so the block still holds inner blocks; a block with a content array draws its own items; MUST FAIL without the role filter', () => {
	const rules = ( f ) => makeRules( { m: { els: [], byKey: {}, blockKids: () => [] }, facts: f, surface: { kind: 'page' }, hooks: {} } );
	assert.equal( rules( facts() ).drawsChildren( 'sgs/hero' ), null, 'the hero holds its content as inner blocks' );
	assert.match( rules( facts() ).drawsChildren( 'sgs/icon-list' ) || '', /array_item_schema/, 'an items array is drawn by the block' );
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
	const tree = section( [ E( 'div', { style: 'text-align:center' }, [ E( 'h2', { words: 'Our Brands' } ), E( 'p', { words: 'Trusted names' } ) ] ), E( 'div', { style: 'text-align:center;background:#0A7EA8' }, [ E( 'h2', { words: 'Band' } ) ] ) ] );
	const r = run( tree );
	assert.deepEqual( settled( r.proposal.rows[ 1 ] ), { block: null, action: 'unwrap', rule: 'alignWrapper' } );
	assert.notEqual( row( r, ( x ) => 'div' === x.tag && x.order > 1 && x.depth === 1 )?.action, 'unwrap', 'a wrapper with a background stays' );
	assert.notEqual( run( tree, { facts: facts( 'alignWrapper' ) } ).proposal.rows[ 1 ].action, 'unwrap' );
} );

// ---------- what the rules must NOT do (QC council, 2026-10-13) ----------
test( 'a link holding two logo images and no words is never a pill button: the home link stays as the container of the pair and both logos stay in it', () => {
	const tree = section( [ E( 'a', { attrs: { href: '/', 'aria-label': 'Home' } }, [ E( 'img', { attrs: { srcBasename: 'logo-mark.svg', alt: 'Acme' } } ), E( 'img', { attrs: { srcBasename: 'logo-wordmark.svg', alt: 'Acme' } } ) ] ) ] );
	const r = run( tree );
	assert.deepEqual( settled( byTag( r, 'a' ) ), { block: 'sgs/container', action: null, rule: 'homeLink' } );
	assert.equal( r.proposal.rows.filter( ( x ) => 'img' === x.tag && 'absorbed' !== x.action ).length, 2, 'both logos are kept' );
	const group = r.skeleton[ 0 ].innerBlocks.find( ( n ) => 'sgs/container' === n.name );
	assert.equal( group.innerBlocks.length, 2, 'the pair is one container of the row' );
	assert.deepEqual( group.innerBlocks.map( ( n ) => n.name ), Array( 2 ).fill( facts().logoBlocks[ 0 ] ) );
	assert.notEqual( byTag( run( section( [ E( 'a', { attrs: { href: '/shop' } }, [ E( 'img' ), E( 'img' ) ] ) ] ) ), 'a' ).block, 'sgs/button', 'no words, no pill' );
	// Negative controls: one logo still goes with its link; with the rule's group setting off, two logos go too.
	const one = run( section( [ E( 'a', { attrs: { href: '/', 'aria-label': 'Home' } }, [ E( 'img', { attrs: { srcBasename: 'logo.svg', alt: 'Acme' } } ) ] ) ] ) );
	assert.deepEqual( settled( byTag( one, 'a' ) ), { block: null, action: 'unwrap', rule: 'homeLink' } );
	const f = facts();
	f.decisions = structuredClone( f.decisions );
	delete f.decisions.rules.homeLink.groupBlock;
	assert.deepEqual( settled( byTag( run( tree, { facts: f } ), 'a' ) ), { block: null, action: 'unwrap', rule: 'homeLink' } );
} );

test( 'a control the visitor operates is never a label, a toggle or slider arrow is never a pill, and a bare number is never a label or title', () => {
	const kicker = 'text-transform:uppercase;letter-spacing:.14em';
	const r = run( section( [ E( 'button', { words: 'Continue', style: kicker } ), E( 'span', { words: '01', style: kicker } ), E( 'button', { attrs: { 'aria-expanded': 'false' } }, [ E( 'span', { words: 'Delivery times' } ), E( 'span', {}, [ svg() ] ) ] ) ] ) );
	assert.notEqual( byWords( r, 'Continue' ).block, 'sgs/label' );
	assert.notEqual( byWords( r, '01' ).block, 'sgs/label' );
	assert.notEqual( row( r, ( x ) => 'button' === x.tag && ! x.words ).rule, 'pillButton', 'a disclosure toggle is not a pill' );
} );

test( 'cardAction: a card the draft draws as one link is one whole-card link, the call to action ending it a cue with no link (Bean, 2026-11-22); MUST FAIL on the old rule that put the link on the button', () => {
	const card = section( [ E( 'a', { attrs: { href: '/food-service' } }, [ E( 'h3', { words: 'Food Service' } ), E( 'p', { words: 'Kitchens that never stop' } ), E( 'div', { words: 'Explore Food Service' }, [ svg() ] ) ] ) ] );
	const r = run( card );
	const link = byTag( r, 'a' );
	assert.deepEqual( [ link.block, link.rule, link.attributes.sgsBlockLink ], [ 'sgs/container', 'wholeCardLink', '/food-service' ], 'the box of the card is the link' );
	const action = byWords( r, 'Explore Food Service' );
	assert.deepEqual( [ action.block, action.rule, action.attributes.label, action.attributes.visualOnly ], [ 'sgs/button', 'cardAction', 'Explore Food Service', true ], 'the call to action is the button of the card, drawn as a cue' );
	assert.ok( ! action.attributes.url && ! action.attributes.linkSource, 'a button inside the card link holds no link of its own' );
	const off = run( card, { facts: facts( 'cardAction' ) } );
	assert.notEqual( byWords( off, 'Explore Food Service' ).block, 'sgs/button' );
	assert.equal( byTag( off, 'a' ).attributes.sgsBlockLink, '/food-service', 'without the rule no button is made and the card is the link' );
} );

test( 'cardAction: a card whose address is a script value keeps it on the button for the later order stage, the card unlinked (rules.cardAction.boundLink); MUST FAIL when the card takes the link', () => {
	const bound = section( [ E( 'a', { attrs: { href: 'Account.dc.html?order=MM-1042' }, snippet: '<a href="{{ orderHref }}" data-dc-tpl="2"></a>' }, [ E( 'span', { words: 'all in one place' } ), E( 'span', { words: 'Follow this order in your account' } ), E( 'span', { words: 'View order →' } ) ] ) ] );
	const r = run( bound );
	const link = byTag( r, 'a' );
	assert.equal( link.block, 'sgs/container' );
	assert.ok( ! link.attributes.sgsBlockLink && ! link.attributes.sgsBlockLinkSource, 'the card holds no link: the binding is placed on the button' );
	const action = byWords( r, 'View order →' );
	assert.equal( action?.rule, 'cardAction' );
	assert.ok( ! action.attributes.visualOnly, 'the button stays the link, not a cue' );
	// A member of a loop's item is not a state value of its own: a card linked so, ending in a call to action, takes the card link.
	const item = section( [ E( 'a', { attrs: { href: '/a' }, snippet: '<a href="{{ t.href }}" data-dc-tpl="2"></a>' }, [ E( 'h3', { words: 'Alpha' } ), E( 'p', { words: 'About alpha' } ), E( 'span', { words: 'Explore Alpha →' } ) ] ) ] );
	assert.equal( byTag( run( item ), 'a' ).attributes.sgsBlockLink, '/a' );
	assert.equal( byWords( run( item ), 'Explore Alpha →' ).attributes.visualOnly, true );
	const off = run( bound, { facts: ( () => { const f = facts(); delete f.decisions.rules.cardAction.boundLink; return f; } )() } );
	assert.equal( byWords( off, 'View order →' ).attributes.visualOnly, true, 'with the flag removed the card is the link and the button a cue' );
} );

test( 'cardAction negative: a card whose draft links only its button keeps the button as the link; a card with no call to action is one linked container as before', () => {
	const buttonOnly = section( [ E( 'div', {}, [ E( 'h3', { words: 'Food Service' } ), E( 'p', { words: 'Kitchens that never stop' } ), E( 'a', { words: 'Explore Food Service', attrs: { href: '/food-service' } }, [ svg() ] ) ] ) ] );
	const r = run( buttonOnly );
	const button = byTag( r, 'a' );
	assert.deepEqual( [ button.block, button.attributes.url ], [ 'sgs/button', '/food-service' ], 'the button holds the link of the draft' );
	assert.ok( ! button.attributes.visualOnly );
	assert.ok( ! byTag( r, 'div' ).attributes?.sgsBlockLink, 'the card is not linked' );
	const plain = run( section( [ E( 'a', { attrs: { href: '/about' } }, [ E( 'h3', { words: 'About us' } ), E( 'p', { words: 'Who we are and how we began' } ) ] ) ] ) );
	assert.deepEqual( [ byTag( plain, 'a' ).block, byTag( plain, 'a' ).attributes.sgsBlockLink ], [ 'sgs/container', '/about' ] );
	assert.ok( ! row( plain, ( x ) => 'cardAction' === x.rule ), 'no call to action, no button' );
} );

test( 'cardAction: every copy of one template element takes one verdict, a button only when every copy ends its card in a call to action; MUST FAIL when a copy is judged alone', () => {
	const copies = ( second ) => {
		const tree = section( [
			E( 'a', { attrs: { href: '/a' } }, [ E( 'h3', { words: 'Alpha' } ), E( 'p', { words: 'About alpha' } ), E( 'div', { words: 'Explore Alpha' }, [ svg() ] ) ] ),
			E( 'a', { attrs: { href: '/b' } }, [ E( 'h3', { words: 'Beta' } ), E( 'div', { words: 'Explore Beta' }, second ? [ svg() ] : [] ) ] ),
		] );
		const inv = inventory( tree );
		// The two call-to-action divs are the same template element: copy 0 and copy 1.
		const [ first, last ] = [ 'Explore Alpha', 'Explore Beta' ].map( ( w ) => inv.elements.find( ( x ) => x.words === w ) );
		const was = last.key;
		last.tpl = first.tpl;
		last.key = `Root/${ first.tpl }#1`;
		inv.elements.filter( ( x ) => x.parentKey === was ).forEach( ( x ) => ( x.parentKey = last.key ) );
		return proposeSkeleton( { inventory: inv, facts: facts(), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', built: null, motion: new Set(), db } );
	};
	const kind = ( r ) => [ 'Explore Alpha', 'Explore Beta' ].map( ( w ) => byWords( r, w ).rule );
	assert.deepEqual( kind( copies( true ) ), [ 'cardAction', 'cardAction' ], 'both copies end their card in an action' );
	const mixed = copies( false );
	assert.deepEqual( kind( mixed ).map( ( x ) => 'cardAction' === x ), [ false, false ], 'one copy does not, so neither is a button' );
	assert.equal( byWords( mixed, 'Alpha' ) ? byTag( mixed, 'a' ).attributes.sgsBlockLink : null, '/a', 'the card whose action is not a button keeps its own link' );
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
	const bar = byTag( run( tree ), 'div' );
	assert.equal( bar.rule, 'readingProgress' );
	assert.match( bar.handover?.detail || '', /reading progress/i );
	assert.deepEqual( handoverProblems( [ bar.handover ], 'the bar' ), [], 'MUST FAIL: the hand-over names a handover owner and kind Fill accepts' );
	assert.equal( byTag( run( tree, { facts: facts( 'readingProgress' ) } ), 'div' ).handover, undefined );
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

test( 'formControl: a text beside a select in a row that also holds a button (a results count; the button shown at one width only) is no label of the select and stays; a <label> or an aria-labelledby target there is; MUST FAIL on the old reading (the count became the label of the select and was removed)', () => {
	const bar = ( ...kids ) => section( [ E( 'form', {}, [ E( 'div', { style: 'display:flex;gap:10px', y: 0 }, [ ...kids, E( 'button', { words: 'Filter', visible: { 375: true, 768: false, 1440: false } } ), E( 'select', { attrs: { id: 'sort' }, y: 60 } ) ] ) ] ) ] );
	const count = run( bar( E( 'span', { words: '16 frames' } ) ) );
	assert.equal( byWords( count, '16 frames' ).action, null, 'the count is no field text' );
	assert.equal( byWords( count, '16 frames' ).rule, null );
	assert.equal( byTag( count, 'select' ).block, 'sgs/form-field-select' );
	assert.equal( byTag( count, 'select' ).attributes.label, undefined, 'the count is not the label of the select' );
	// Negative controls: a <label> naming the select, and a text the select names with aria-labelledby, are its label even beside a button.
	const named = run( bar( E( 'label', { words: 'Sort by', attrs: { for: 'sort' } } ) ) );
	assert.equal( byWords( named, 'Sort by' ).action, 'remove' );
	assert.equal( byTag( named, 'select' ).attributes.label, 'Sort by' );
	const labelled = run( section( [ E( 'form', {}, [ E( 'div', { y: 0 }, [ E( 'span', { words: 'Sort by', attrs: { id: 'lab' } } ), E( 'button', { words: 'Filter' } ), E( 'select', { attrs: { 'aria-labelledby': 'lab' }, y: 60 } ) ] ) ] ) ] ) );
	assert.equal( byWords( labelled, 'Sort by' ).action, 'remove' );
	assert.equal( byTag( labelled, 'select' ).attributes.label, 'Sort by' );
	// A wrapper holding only the field and its texts keeps the old reading: a plain text beside the select is its label.
	const plain = run( section( [ E( 'form', {}, [ E( 'div', { y: 0 }, [ E( 'span', { words: 'Sort by' } ), E( 'select', { y: 60 } ) ] ) ] ) ] ) );
	assert.equal( byWords( plain, 'Sort by' ).action, 'remove' );
	assert.equal( byTag( plain, 'select' ).attributes.label, 'Sort by' );
} );

test( 'formControl fieldIcon: a mark drawn inside a text field box is the field leadingIcon (the nearest Lucide icon) and goes; MUST FAIL without the rule', () => {
	const mag = '<svg width="20" height="20" sc-camel-view-box="0 0 24 24" data-dc-tpl="4"><circle cx="11" cy="11" r="7" data-dc-tpl="5"></circle><path d="m20 20-4-4" data-dc-tpl="6"></path></svg>';
	const search = ( { markup = mag, iconBox = { x: 20, y: 20, w: 20, h: 24 }, type = 'text', tag = 'input' } = {} ) => E( 'label', { style: 'position:relative;display:block', box: { x: 0, y: 0, w: 640, h: 62 } }, [
		E( 'span', { style: 'position:absolute;left:20px;top:50%', box: iconBox }, [ E( 'svg', { snippet: markup, box: iconBox } ) ] ),
		E( tag, { attrs: { type, 'aria-label': 'Search FAQs' }, box: { x: 0, y: 0, w: 640, h: 62 } } ) ] );
	const r = run( section( [ search() ] ) );
	assert.deepEqual( settled( byTag( r, 'span' ) ), { block: null, action: 'remove', rule: 'formControl' } );
	assert.equal( byTag( r, 'input' ).block, 'sgs/form-field-text' );
	const field = JSON.stringify( r.skeleton ).match( /"name":"sgs\/form-field-text","attributes":(\{[^}]*\})/ );
	assert.equal( JSON.parse( field[ 1 ] ).leadingIcon, 'search' );
	assert.ok( ! r.proposal.rows.some( ( x ) => 'sgs/icon' === x.block ) );
	// The rule's entry off: the mark stays its own icon block and the field holds no icon.
	const f = facts();
	f.decisions = structuredClone( f.decisions );
	delete f.decisions.rules.formControl.fieldIcon;
	const off = run( section( [ search() ] ), { facts: f } );
	assert.equal( byTag( off, 'span' ).block, 'sgs/icon' );
	assert.ok( ! JSON.stringify( off.skeleton ).includes( 'leadingIcon' ) );
	// Negative controls: a mark outside the control's box, a drawing no Lucide icon is near, and a field block with no leadingIcon.
	assert.equal( byTag( run( section( [ search( { iconBox: { x: 20, y: -40, w: 20, h: 24 } } ) ] ) ), 'span' ).block, 'sgs/icon' );
	assert.equal( byTag( run( section( [ search( { iconBox: { x: 0, y: 0, w: 0, h: 0 } } ) ] ) ), 'span' ).block, 'sgs/icon', 'a mark with no box is not seen inside the control' );
	const odd = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m5 5-9-9"></path></svg>';
	assert.equal( byTag( run( section( [ search( { markup: odd } ) ] ) ), 'span' ).block, 'sgs/icon' );
	const twin = E( 'label', { style: 'position:relative', box: { x: 0, y: 0, w: 640, h: 62 } }, [ E( 'span', { box: { x: 20, y: 20, w: 20, h: 24 } }, [ E( 'svg', { snippet: mag, box: { x: 20, y: 20, w: 20, h: 24 } } ) ] ), E( 'input', { attrs: { type: 'text' }, box: { x: 0, y: 0, w: 640, h: 62 } } ), E( 'input', { attrs: { type: 'text' }, box: { x: 0, y: 0, w: 640, h: 62 } } ) ] );
	assert.equal( byTag( run( section( [ twin ] ) ), 'span' ).block, 'sgs/icon', 'a mark inside two controls belongs to neither' );
	const area = run( section( [ search( { tag: 'textarea' } ) ] ) );
	assert.equal( byTag( area, 'span' ).block, 'sgs/icon' );
	assert.ok( ! JSON.stringify( area.skeleton ).includes( 'leadingIcon' ) );
} );

test( 'formHost: a draft <form> element is the form block with its fields inside; MUST FAIL without the rule', () => {
	const form = E( 'form', {}, [ E( 'input', { attrs: { type: 'text' } } ), E( 'input', { attrs: { type: 'email' }, y: 40 } ) ] );
	const r = run( section( [ form ] ) );
	assert.deepEqual( settled( row( r, ( x ) => 'form' === x.tag ) ), { block: 'sgs/form', action: null, rule: 'formHost' } );
	const host = r.skeleton[ 0 ].innerBlocks[ 0 ];
	assert.deepEqual( [ host.name, ...host.innerBlocks.map( ( n ) => n.name ) ], [ 'sgs/form', 'sgs/form-field-text', 'sgs/form-field-email' ] );
	const off = run( section( [ form ] ), { facts: facts( 'formHost' ) } );
	assert.notEqual( row( off, ( x ) => 'form' === x.tag ).block, 'sgs/form' );
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
	// A required checkbox among others is in a checkbox group (one checkbox field holding both), not the consent field; a
	// password is a text field; a submit is not a field.
	const group = E( 'fieldset', {}, [ E( 'label', {}, [ E( 'input', { attrs: { type: 'checkbox', required: '' } } ), E( 'span', { words: 'Rice' } ) ] ), E( 'label', { y: 30 }, [ E( 'input', { attrs: { type: 'checkbox' } } ), E( 'span', { words: 'Flour' } ) ] ) ] );
	const g = run( section( [ E( 'form', {}, [ group, E( 'input', { attrs: { type: 'email' }, y: 80 } ) ] ) ] ) );
	assert.deepEqual( [ byTag( g, 'fieldset' ).block, byTag( g, 'fieldset' ).attributes.required, byTag( g, 'fieldset' ).attributes.options.map( ( o ) => o.label ) ], [ 'sgs/form-field-checkbox', true, [ 'Rice', 'Flour' ] ] );
	const misc = run( section( [ E( 'form', {}, [ E( 'input', { attrs: { type: 'password' } } ), E( 'input', { attrs: { type: 'submit', value: 'Send' }, y: 40 } ) ] ) ] ) );
	const inputs = misc.proposal.rows.filter( ( x ) => 'input' === x.tag );
	assert.equal( inputs[ 0 ].block, 'sgs/form-field-text' );
	assert.notEqual( inputs[ 1 ].rule, 'formControl' );
} );

test( 'formControl reads each field\'s text in its own wrapper, never in an element holding other controls; MUST FAIL with the label\'s parent or the form as the wrapper', () => {
	const at = ( r, t, i = 0 ) => r.proposal.rows.filter( ( x ) => x.tag === t )[ i ];
	const said = ( x ) => [ x.attributes?.label, x.attributes?.helpText ];
	// A <label> holding its own words round the control, two of them in one grid row and two straight under the form.
	const labelled = ( words, type, y ) => E( 'label', { words, y }, [ E( type, 'textarea' === type ? {} : { attrs: { type: 'email' === words.toLowerCase() ? 'email' : 'text' } } ) ] );
	const own = run( section( [ E( 'form', {}, [ E( 'h2', { words: 'Send a message' } ), E( 'div', { display: 'grid', y: 40 }, [ labelled( 'Your name', 'input', 40 ), labelled( 'Email', 'input', 40 ) ] ), labelled( 'Order number', 'input', 120 ), labelled( 'Message', 'textarea', 200 ), E( 'button', { words: 'Send message', attrs: { type: 'submit' }, y: 300 } ) ] ) ] ) );
	assert.deepEqual( [ 0, 1, 2 ].map( ( i ) => said( at( own, 'input', i ) ) ), [ [ 'Your name', undefined ], [ 'Email', undefined ], [ 'Order number', undefined ] ] );
	assert.deepEqual( said( at( own, 'textarea' ) ), [ 'Message', undefined ] );
	// A <label> holding a text span (with its star) and the control, the labels side by side in one grid; a consent tick
	// straight under the form takes its own words, not the form's.
	const spanned = ( words, y ) => E( 'label', { y }, [ E( 'span', { words }, [ E( 'span', { words: '*' } ) ] ), E( 'input', { attrs: { type: 'text' } } ) ] );
	const tick = E( 'label', { y: 200 }, [ E( 'input', { attrs: { type: 'checkbox', required: '' } } ), E( 'span', { words: 'I agree to be contacted.' } ) ] );
	const spans = run( section( [ E( 'form', {}, [ E( 'h3', { words: 'Register' } ), E( 'p', { words: 'Tell us about yourself.', y: 20 } ), E( 'div', { display: 'grid', y: 40 }, [ spanned( 'Full name', 40 ), spanned( 'Phone', 80 ) ] ), tick ] ) ] ) );
	assert.deepEqual( [ said( at( spans, 'input', 0 ) ), said( at( spans, 'input', 1 ) ), said( at( spans, 'input', 2 ) ) ], [ [ 'Full name', undefined ], [ 'Phone', undefined ], [ 'I agree to be contacted.', undefined ] ] );
	// A control straight under the form beside the form's own intro and its submit row: no label, and the intro and the
	// submit row stay (they are no field's text).
	const bare = run( section( [ E( 'form', {}, [ E( 'h2', { words: 'Or send me a message' } ), E( 'p', { words: 'I answer these myself.', y: 20 } ), E( 'div', { y: 40 }, [ E( 'input', { attrs: { type: 'text' } } ), E( 'input', { attrs: { type: 'email' }, y: 40 } ) ] ), E( 'textarea', { y: 100 } ), E( 'div', { y: 200 }, [ E( 'button', { words: 'Send message', attrs: { type: 'submit' } } ) ] ) ] ) ] ) );
	assert.deepEqual( said( at( bare, 'textarea' ) ), [ undefined, undefined ] );
	assert.notEqual( byWords( bare, 'I answer these myself.' ).action, 'remove' );
	assert.notEqual( row( bare, ( x ) => 'div' === x.tag && 'Send message' === x.words )?.action, 'remove' );
	assert.equal( byWords( bare, 'Send message' ).action, null );
	// A search box beside a list of ticks in one panel: the ticks stay fields with their own names, and the search box
	// takes none of their words.
	const tickRow = ( w, y ) => E( 'label', { y }, [ E( 'span', {}, [ E( 'input', { attrs: { type: 'checkbox' } } ), E( 'span', { words: w } ) ] ), E( 'span', { words: '12' } ) ] );
	const panel = run( section( [ E( 'div', {}, [ E( 'input', { attrs: { 'aria-label': 'Search brands' } } ), E( 'div', { y: 40 }, [ tickRow( 'Acme', 40 ), tickRow( 'Bolt', 80 ) ] ) ] ) ] ) );
	assert.deepEqual( said( at( panel, 'input', 0 ) ), [ undefined, undefined ] );
	assert.deepEqual( [ 1, 2 ].map( ( i ) => [ at( panel, 'input', i ).block, at( panel, 'input', i ).attributes?.label ] ), [ [ 'sgs/form-field-checkbox', 'Acme' ], [ 'sgs/form-field-checkbox', 'Bolt' ] ] );
	// Negative control: a wrapper holding one control still gives it the label and the hint beside it.
	const one = run( section( [ E( 'form', {}, [ E( 'div', {}, [ E( 'label', { words: 'Trading name' } ), E( 'input', { attrs: { type: 'text' } } ), E( 'span', { words: 'As on your invoices', y: 40 } ) ] ), E( 'input', { attrs: { type: 'email' }, y: 80 } ) ] ) ] ) );
	assert.deepEqual( said( at( one, 'input', 0 ) ), [ 'Trading name', 'As on your invoices' ] );
	assert.equal( byWords( one, 'As on your invoices' ).action, 'remove' );
	// The wrapper's own words stay its own (the wrapper is not removed), so they are never the field's hint as well.
	const worded = run( section( [ E( 'form', {}, [ E( 'div', { words: 'Step one' }, [ E( 'label', { words: 'Trading name' } ), E( 'input', { attrs: { type: 'text' } } ) ] ), E( 'input', { attrs: { type: 'email' }, y: 80 } ) ] ) ] ) );
	assert.deepEqual( said( at( worded, 'input', 0 ) ), [ 'Trading name', undefined ] );
} );

// A field group (a tiles field, a radio or checkbox group) is one field of several controls (lib/skeleton-field-groups.mjs).
const said3 = ( x ) => ( { label: x?.attributes?.label, required: x?.attributes?.required, helpText: x?.attributes?.helpText } );
const chip = ( words ) => E( 'button', { words, attrs: { 'aria-pressed': 'false' } } );
const starred = ( words, y = 0 ) => E( 'label', { words, y }, [ E( 'span', { words: '*' } ) ] );

test( 'MUST FAIL: a tiles field\'s label, required marker and hint are the field\'s own, and the container round them goes with them', () => {
	// A wizard drawn in a <div> (a form surface): the chip group is the tiles field (rule optionSetForm).
	const tiles = E( 'div', { y: 40 }, [ chip( 'Shop' ), chip( 'Cafe' ) ] );
	const r = run( E( 'div', {}, [ E( 'div', {}, [ starred( 'What kind of business are you?' ), tiles, E( 'span', { words: 'Pick the closest.', y: 80 } ) ] ), E( 'div', { y: 120 }, [ E( 'label', { words: 'Trading name' } ), E( 'input', { attrs: { type: 'text' }, y: 140 } ) ] ) ] ), { kind: 'form' } );
	const field = row( r, ( x ) => 'optionSetForm' === x.rule );
	assert.equal( field?.block, 'sgs/form-field-tiles' );
	assert.deepEqual( said3( field ), { label: 'What kind of business are you?', required: true, helpText: 'Pick the closest.' } );
	for ( const w of [ 'What kind of business are you?', '*', 'Pick the closest.' ] ) {
		assert.equal( byWords( r, w ).action, 'remove', `"${ w }" is the field's own text` );
	}
	assert.deepEqual( said3( byTag( r, 'input' ) ), { label: 'Trading name', required: undefined, helpText: undefined }, 'the field beside it keeps its own label' );
	// Fill reads every attribute the skeleton writes on the node: no inline style or unknown attribute reaches it.
	assert.deepEqual( skeletonProblems( r.skeleton ), [] );
	// A <label> wrapped round the chip group names it and goes, as one wrapped round a control does.
	const wrapped = run( E( 'div', {}, [ E( 'label', {}, [ E( 'span', { words: 'Delivery window' } ), E( 'div', { y: 20 }, [ chip( 'AM' ), chip( 'PM' ) ] ) ] ), E( 'input', { attrs: { type: 'text' }, y: 80 } ) ] ), { kind: 'form' } );
	assert.equal( said3( row( wrapped, ( x ) => 'optionSetForm' === x.rule ) ).label, 'Delivery window' );
	assert.equal( byTag( wrapped, 'label' ).action, 'unwrap' );
} );

test( 'MUST FAIL: a radio group and a checkbox group in a form are each one field, their legend or label its label', () => {
	const radio = ( w, y ) => E( 'label', { y }, [ E( 'input', { attrs: { type: 'radio', name: 'size', value: w.toLowerCase() } } ), E( 'span', { words: w } ) ] );
	const r = run( section( [ E( 'form', {}, [ E( 'fieldset', {}, [ E( 'legend', { words: 'Business size' }, [ E( 'span', { words: '*' } ) ] ), radio( 'Small', 20 ), radio( 'Large', 40 ), E( 'span', { words: 'Pick one', y: 60 } ) ] ), E( 'input', { attrs: { type: 'email' }, y: 100 } ) ] ) ] ) );
	const set = byTag( r, 'fieldset' );
	assert.deepEqual( [ set.block, set.rule ], [ 'sgs/form-field-radio', 'formControl' ] );
	assert.deepEqual( said3( set ), { label: 'Business size', required: true, helpText: 'Pick one' } );
	assert.deepEqual( set.attributes.options, [ { value: 'small', label: 'Small' }, { value: 'large', label: 'Large' } ] );
	assert.deepEqual( r.proposal.rows.filter( ( x ) => 'input' === x.tag ).map( ( x ) => x.action || x.block ), [ 'absorbed', 'absorbed', 'sgs/form-field-email' ], 'no radio is a field of its own' );
	assert.deepEqual( said3( row( r, ( x ) => 'input' === x.tag && 'sgs/form-field-email' === x.block ) ), { label: undefined, required: undefined, helpText: undefined }, 'the email beside the group takes none of its words' );
	// Ticks with no name, under a wrapper whose label names the group.
	const tick = ( w, y ) => E( 'label', { y }, [ E( 'input', { attrs: { type: 'checkbox' } } ), E( 'span', { words: w } ) ] );
	const c = run( section( [ E( 'form', {}, [ E( 'div', {}, [ E( 'label', { words: 'Dietary needs' } ), E( 'div', { y: 20 }, [ tick( 'Halal', 20 ), tick( 'Vegan', 40 ) ] ) ] ), E( 'input', { attrs: { type: 'email' }, y: 100 } ) ] ) ] ) );
	const ticks = row( c, ( x ) => 'sgs/form-field-checkbox' === x.block );
	assert.deepEqual( [ ticks.tag, said3( ticks ).label, ticks.attributes.options ], [ 'div', 'Dietary needs', [ { value: 'Halal', label: 'Halal' }, { value: 'Vegan', label: 'Vegan' } ] ] );
	assert.equal( byWords( c, 'Dietary needs' ).action, 'remove' );
	// Radios of one name split over two rows are one group, held by the element round both rows; the words of the group's
	// own element are its label.
	const split = run( section( [ E( 'form', {}, [ E( 'div', { words: 'Delivery day' }, [ E( 'div', {}, [ radio( 'Monday', 20 ) ] ), E( 'div', { y: 40 }, [ radio( 'Friday', 40 ) ] ) ] ), E( 'input', { attrs: { type: 'email' }, y: 100 } ) ] ) ] ) );
	const day = row( split, ( x ) => 'sgs/form-field-radio' === x.block );
	assert.deepEqual( [ day.words, day.attributes.label, day.attributes.options.map( ( o ) => o.label ) ], [ 'Delivery day', 'Delivery day', [ 'Monday', 'Friday' ] ] );
} );

test( 'MUST FAIL: a wrapper holding two different fields gives neither its text, a field group counted as one field', () => {
	const tiles = E( 'div', { y: 40 }, [ chip( 'Shop' ), chip( 'Cafe' ) ] );
	// The form's own row holding a tiles field and a text input: its text is neither field's, and it stays.
	const two = run( E( 'div', {}, [ E( 'div', {}, [ E( 'label', { words: 'Contact' } ), tiles, E( 'input', { attrs: { type: 'text' }, y: 80 } ) ] ) ] ), { kind: 'form' } );
	assert.deepEqual( said3( row( two, ( x ) => 'optionSetForm' === x.rule ) ), { label: undefined, required: undefined, helpText: undefined } );
	assert.deepEqual( said3( byTag( two, 'input' ) ), { label: undefined, required: undefined, helpText: undefined } );
	assert.notEqual( byWords( two, 'Contact' ).action, 'remove' );
	// A tiles field's wrapper beside an input straight under the form: the form holds two fields, so the input takes none of the
	// tiles field's words (it took "Kind" and the chips' words when the chip group counted as no field).
	const apart = run( E( 'div', {}, [ E( 'div', {}, [ E( 'label', { words: 'Kind' } ), E( 'div', { y: 20 }, [ chip( 'Shop' ), chip( 'Cafe' ) ] ) ] ), E( 'input', { attrs: { type: 'email' }, y: 100 } ) ] ), { kind: 'form' } );
	assert.deepEqual( said3( byTag( apart, 'input' ) ), { label: undefined, required: undefined, helpText: undefined } );
	assert.equal( said3( row( apart, ( x ) => 'optionSetForm' === x.rule ) ).label, 'Kind' );
	// Two radio groups in one fieldset: the fieldset holds two fields, so it is neither group and gives neither its legend.
	const radio = ( n, w, y ) => E( 'label', { y }, [ E( 'input', { attrs: { type: 'radio', name: n } } ), E( 'span', { words: w } ) ] );
	const pair = run( section( [ E( 'form', {}, [ E( 'fieldset', {}, [ E( 'legend', { words: 'Preferences' } ), E( 'div', { y: 20 }, [ radio( 'a', 'Yes', 20 ), radio( 'a', 'No', 30 ) ] ), E( 'div', { y: 60 }, [ radio( 'b', 'Day', 60 ), radio( 'b', 'Night', 70 ) ] ) ] ), E( 'input', { attrs: { type: 'email' }, y: 100 } ) ] ) ] ) );
	assert.notEqual( byTag( pair, 'fieldset' ).block, 'sgs/form-field-radio' );
	assert.deepEqual( pair.proposal.rows.filter( ( x ) => 'sgs/form-field-radio' === x.block ).map( ( x ) => [ x.tag, x.attributes?.label ] ), [ [ 'div', undefined ], [ 'div', undefined ] ] );
	assert.notEqual( byWords( pair, 'Preferences' ).action, 'remove' );
	// Radios of one name whose lowest common element also holds a text input are no group: each stays a field of its own.
	const other = run( section( [ E( 'form', {}, [ E( 'div', {}, [ radio( 'c', 'Phone', 0 ), E( 'input', { attrs: { type: 'text' }, y: 20 } ), radio( 'c', 'Email', 40 ) ] ), E( 'input', { attrs: { type: 'email' }, y: 100 } ) ] ) ] ) );
	assert.deepEqual( other.proposal.rows.filter( ( x ) => 'sgs/form-field-radio' === x.block ).map( ( x ) => [ x.tag, x.attributes?.label ] ), [ [ 'input', 'Phone' ], [ 'input', 'Email' ] ] );
} );

test( 'NEGATIVE: a chip group or radios outside a form, and a lone radio, are no field group; a field without a marker is not required', () => {
	// On a page with no form the chip group is the option picker and the text beside it stays.
	const page = run( section( [ E( 'div', {}, [ E( 'label', { words: 'Size' } ), E( 'div', { y: 20 }, [ chip( 'S' ), chip( 'M' ) ] ) ] ) ] ) );
	assert.equal( row( page, ( x ) => 'optionSet' === x.rule )?.block, 'sgs/option-picker' );
	assert.notEqual( byWords( page, 'Size' ).action, 'remove' );
	// Radios outside a form stay one field each, named by their own words.
	const radio = ( w, y ) => E( 'label', { y }, [ E( 'input', { attrs: { type: 'radio', name: 'v' } } ), E( 'span', { words: w } ) ] );
	const loose = run( section( [ E( 'div', {}, [ radio( 'Grid', 0 ), radio( 'List', 20 ) ] ) ] ) );
	assert.deepEqual( loose.proposal.rows.filter( ( x ) => 'sgs/form-field-radio' === x.block ).map( ( x ) => [ x.tag, x.attributes?.label ] ), [ [ 'input', 'Grid' ], [ 'input', 'List' ] ] );
	// A lone radio in a form is its own field.
	const lone = run( section( [ E( 'form', {}, [ E( 'div', {}, [ radio( 'Only', 0 ) ] ), E( 'input', { attrs: { type: 'email' }, y: 40 } ) ] ) ] ) );
	assert.deepEqual( lone.proposal.rows.filter( ( x ) => 'sgs/form-field-radio' === x.block ).map( ( x ) => [ x.tag, x.attributes?.label ] ), [ [ 'input', 'Only' ] ] );
	// Radios straight under the form, or under a form surface's root, have the form as their common element: no group, each
	// radio its own field named by its own label.
	const bare = run( section( [ E( 'form', {}, [ radio( 'Yes', 0 ), radio( 'No', 20 ) ] ) ] ) );
	const root = run( E( 'div', {}, [ radio( 'Yes', 0 ), radio( 'No', 20 ) ] ), { kind: 'form' } );
	for ( const r of [ bare, root ] ) {
		assert.deepEqual( r.proposal.rows.filter( ( x ) => 'sgs/form-field-radio' === x.block ).map( ( x ) => [ x.tag, x.attributes?.label ] ), [ [ 'input', 'Yes' ], [ 'input', 'No' ] ] );
	}
	// A field whose label carries the required marker is required; one without it (and no required attribute) is not.
	const marked = run( section( [ E( 'form', {}, [ E( 'div', {}, [ starred( 'Trading name' ), E( 'input', { attrs: { type: 'text' }, y: 20 } ) ] ), E( 'div', { y: 60 }, [ E( 'label', { words: 'VAT number' } ), E( 'input', { attrs: { type: 'text' }, y: 80 } ) ] ) ] ) ] ) );
	assert.deepEqual( [ 0, 1 ].map( ( i ) => said3( marked.proposal.rows.filter( ( x ) => 'input' === x.tag )[ i ] ) ), [ { label: 'Trading name', required: true, helpText: undefined }, { label: 'VAT number', required: undefined, helpText: undefined } ] );
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

// Paint conservation of an unwrap (lib/skeleton-rules.mjs::ruleFor): a wrapper whose look no reader takes is not dissolved.
test( 'an unwrap whose wrapper paints a look no reader takes is refused and the wrapper stays a node: a card in the hero, a padded align wrapper; a plain or centring wrapper still goes and records where its look goes; MUST FAIL without the guard', () => {
	const card = 'background:#FFFAF0;border:2px solid #3A2A22;border-radius:26px;padding:20px;box-shadow:6px 6px 0 #3A2A22';
	const page = ( style ) => E( 'main', {}, [ E( 'section', {}, [ E( 'div', { display: 'grid' }, [
		E( 'div', {}, [ E( 'h1', { words: 'Gifts she will eat', y: 0 } ), E( 'p', { words: 'Baked fresh.', y: 40 } ),
			E( 'div', { style, y: 80 }, [ E( 'div', { words: 'What is the moment?', y: 90 } ), E( 'a', { words: 'Show 4 gifts', attrs: { href: '#results' }, y: 130 } ) ] ) ] ),
		E( 'div', {}, [ E( 'image-slot' ) ] ),
	] ) ] ), E( 'section', {}, [ E( 'h2', { words: 'More' } ) ] ) ] );
	// The panel is the sixth element in document order (main, section, grid, column, h1, p, panel).
	const panelOf = ( r ) => r.proposal.rows.find( ( x ) => 'Root/7#0' === x.key );
	const r = run( page( card ) );
	assert.notEqual( panelOf( r ).action, 'unwrap', 'the painted card is not dissolved' );
	assert.ok( panelOf( r ).block, 'the card is a block node' );
	const plain = panelOf( run( page( 'margin-top:12px' ) ) );
	assert.deepEqual( [ plain.rule, plain.action ], [ 'heroInner', 'unwrap' ], 'negative control: the same wrapper with no paint unwraps' );
	// Centred text is read at the nodes inside (inherited); padding beside it is read by nothing, so that wrapper stays.
	const centred = run( section( [ E( 'div', { style: 'text-align:center' }, [ E( 'h2', { words: 'Our Brands' } ), E( 'p', { words: 'Trusted names' } ) ] ) ] ) );
	assert.deepEqual( settled( centred.proposal.rows[ 1 ] ), { block: null, action: 'unwrap', rule: 'alignWrapper' } );
	assert.deepEqual( centred.proposal.rows[ 1 ].conserve, [ { kind: 'inherited', looks: [ 'text-centre' ] } ] );
	const padded = run( section( [ E( 'div', { style: 'text-align:center;padding:0 40px' }, [ E( 'h2', { words: 'Our Brands' } ), E( 'p', { words: 'Trusted names' } ) ] ) ] ) );
	assert.notEqual( padded.proposal.rows[ 1 ].action, 'unwrap', 'a wrapper whose side padding nothing reads stays' );
} );

test( 'the propose-time check: a painted element a rule removes with no record is a proposal problem; a removal that names its handover is listed, not a problem; MUST FAIL without the check', () => {
	const glare = run( section( [ E( 'h2', { words: 'Title' } ), E( 'span', { style: 'position:absolute;inset:0;background:radial-gradient(circle at var(--gx) var(--gy),#fff,transparent)', attrs: { 'aria-hidden': 'true' } } ) ] ) );
	const layer = glare.proposal.rows.find( ( x ) => 'span' === x.tag );
	assert.deepEqual( [ layer.action, layer.rule, layer.conserve?.[ 0 ]?.kind ], [ 'remove', 'decorationDelivered', 'handover' ] );
	assert.ok( ! glare.problems.some( ( p ) => /paint conservation/.test( p ) ), glare.problems.join( '\n' ) );
	const dot = run( section( [ E( 'div', { display: 'flex' }, [ E( 'span', { style: 'width:8px;height:8px;border-radius:50%;background:#E85D75', box: { x: 0, y: 6, w: 8, h: 8 } } ), E( 'p', { words: 'Vegan friendly', box: { x: 16, y: 0, w: 90, h: 20 } } ) ] ) ] ) );
	const marker = dot.proposal.rows.find( ( x ) => 'span' === x.tag );
	assert.deepEqual( [ marker.action, marker.rule, marker.conserve ], [ 'remove', 'dotMarker', undefined ] );
	assert.ok( dot.problems.some( ( p ) => /^paint conservation: 1 painted element removed \(rule dotMarker\)/.test( p ) ), dot.problems.join( '\n' ) );
} );

test( 'formControl wrapperCap: the max-width a label declares round a lone control that renders as the control\'s own box is the field\'s maxWidth, and the label\'s row records it; a named label, a wider box or no cap writes none; MUST FAIL without the rule', () => {
	const field = ( { words = '', style = 'width:100%;max-width:640px;position:relative;display:block', box = { x: 400, y: 321, w: 640, h: 62 }, tag = 'input', wrap = 'label' } = {} ) => E( wrap, { words, style, box }, [
		E( tag, { attrs: { type: 'text', 'aria-label': 'Search FAQs' }, box: { x: 400, y: 321, w: 640, h: 62 } } ) ] );
	const fieldOf = ( r ) => {
		let hit = null;
		const go = ( n ) => ( /^sgs\/form-field-/.test( n.name ) ? ( hit = n ) : ( n.innerBlocks || [] ).forEach( go ) );
		r.skeleton.forEach( go );
		return hit;
	};
	const capOf = ( r ) => fieldOf( r ).decided?.maxWidth;
	const main = run( section( [ field() ] ) );
	assert.deepEqual( capOf( main ), { desktop: '640px' }, 'the label\'s cap is the field\'s' );
	assert.equal( fieldOf( main ).attributes.maxWidth, undefined, 'a style value is never a skeleton attribute (R-47-10): it travels as decided' );
	assert.deepEqual( main.problems, [], 'the skeleton lints clean and the label\'s cap is recorded where it goes' );
	assert.deepEqual( main.proposal.rows[ 1 ].conserve, [ { kind: 'setting', node: 'Root/3#0', setting: 'maxWidth', looks: [ 'max-width' ] } ] );
	assert.equal( capOf( run( section( [ field( { style: 'position:relative;display:block' } ) ] ) ) ), undefined, 'a label with no cap writes none' );
	assert.equal( capOf( run( section( [ field( { box: { x: 400, y: 321, w: 640, h: 70 } } ) ] ) ) ), undefined, 'a label taller than the control is not its box' );
	assert.equal( capOf( run( section( [ field( { box: { x: 380, y: 321, w: 680, h: 62 } } ) ] ) ) ), undefined, 'a label wider than the control is not its box' );
	assert.equal( capOf( run( section( [ field( { box: { x: 380, y: 321, w: 640, h: 62 } } ) ] ) ) ), undefined, 'a label that starts earlier than the control is not its box' );
	assert.equal( capOf( run( section( [ field( { tag: 'select' } ) ] ) ) ), undefined, 'a field block with no maxWidth setting is given none' );
	assert.equal( capOf( run( section( [ field( { words: 'Search' } ) ] ) ) ), undefined, 'a label that names the field is a label, not the field' );
	assert.equal( capOf( run( section( [ field( { style: 'max-width:50%' } ) ] ) ) ), undefined, 'a cap that is no length is not written' );
	const off = facts();
	delete off.decisions.rules.formControl.wrapperCap;
	assert.equal( capOf( run( section( [ field() ] ), { facts: off } ) ), undefined, 'the rule\'s entry off writes none' );
} );

test( 'formControl: a <label> that lays its label text and control out as a column unwraps, its row records that the field block lays them out (host-layout), and the field is the grid\'s cell; a removed label text that lays out its title over its hint records the same; a label that paints a box stays; MUST FAIL without the host-layout record', () => {
	const label = ( style, kids ) => E( 'label', { style, display: 'flex' }, kids );
	const grid = ( style = 'display:flex;flex-direction:column;gap:8px' ) => section( [ E( 'div', { style: 'display:grid;grid-template-columns:repeat(2,1fr);gap:18px', display: 'grid' }, [
		label( style, [ E( 'span', { words: 'Full name' } ), E( 'input', { attrs: { type: 'text' } } ) ] ),
		label( style, [ E( 'span', { words: 'Email' } ), E( 'input', { attrs: { type: 'email' } } ) ] ),
	] ) ] );
	const r = run( grid() );
	const labels = r.proposal.rows.filter( ( x ) => 'label' === x.tag );
	assert.deepEqual( labels.map( ( x ) => [ x.action, x.rule ] ), [ [ 'unwrap', 'formControl' ], [ 'unwrap', 'formControl' ] ], 'the label wrappers go' );
	assert.deepEqual( labels[ 0 ].conserve, [ { kind: 'host-layout', node: 'Root/5#0', looks: [ 'layout' ] } ], 'the field block at the input lays the label and control out' );
	const cells = r.skeleton[ 0 ].innerBlocks[ 0 ].innerBlocks.map( ( n ) => n.name );
	assert.deepEqual( cells, [ 'sgs/form-field-text', 'sgs/form-field-email' ], 'the fields are the grid\'s cells, with no container between' );
	assert.ok( ! r.problems.some( ( p ) => /paint conservation/.test( p ) ), r.problems.join( '\n' ) );
	// Negative control: a label that draws a box of its own (a border) keeps it, since no field setting reads the label's border.
	const boxed = run( grid( 'display:flex;flex-direction:column;gap:8px;border:2px dashed #3A2A22;padding:10px' ) );
	assert.ok( boxed.proposal.rows.filter( ( x ) => 'label' === x.tag ).every( ( x ) => 'unwrap' !== x.action ), 'a painted label is not dissolved' );
	// A checkbox whose label text is a column of a title over a hint: the field draws its label and help text, so the removed column records the field.
	const tick = run( section( [ label( 'display:flex;align-items:center;gap:12px', [ E( 'input', { attrs: { type: 'checkbox' } } ), E( 'span', { style: 'display:flex;flex-direction:column', display: 'flex' }, [ E( 'span', { words: 'This is a gift' } ), E( 'span', { words: 'Add a note.' } ) ] ) ] ) ] ) );
	const column = tick.proposal.rows.find( ( x ) => 'Root/4#0' === x.key );
	assert.deepEqual( [ column.action, column.rule, column.conserve ], [ 'remove', 'formControl', [ { kind: 'host-layout', node: 'Root/3#0', looks: [ 'layout' ] } ] ] );
	assert.ok( ! tick.problems.some( ( p ) => /paint conservation/.test( p ) ), tick.problems.join( '\n' ) );
} );

// A pill (one label and a glyph) holds the draft's destination, and its words keep the draft's order: the rating link of a
// product page is `<a href="#reviews"><span>stars</span> 4.3 reviews</a>`, a button reading "stars 4.3 reviews" that goes to
// the reviews on the page. Its glyph is a text span the button absorbs, so the writer never read the link from the element.
const rating = ( href ) => {
	const root = section( [ E( 'a', { words: '4.3 · 8 reviews', attrs: href ? { href } : {} }, [ E( 'span', { words: '★★★★★' } ) ] ) ] );
	const inv = inventory( root );
	inv.elements[ 1 ].allText = '★★★★★ 4.3 · 8 reviews';
	inv.elements[ 0 ].allText = inv.elements[ 1 ].allText;
	return proposeSkeleton( { inventory: inv, facts: facts(), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', db } );
};
const buttonOf = ( r ) => r.skeleton[ 0 ].innerBlocks.find( ( n ) => 'sgs/button' === n.name );

test( 'MUST FAIL: a pill whose glyph is a text span keeps its in-page address and a site address, and the stars come first', () => {
	assert.deepEqual( buttonOf( rating( '#reviews' ) ).attributes, { label: '★★★★★ 4.3 · 8 reviews', url: '#reviews' } );
	assert.equal( buttonOf( rating( '/shop/' ) ).attributes.url, '/shop/' );
	// Negative controls: no href writes no url.
	assert.equal( 'url' in buttonOf( rating( null ) ).attributes, false );
} );

// rules.solitaryIcon.glyphDisc: a typed glyph alone in a painted round box of equal width and height is sgs/icon with the glyph
// as its emoji character, never text and never the brand name (an emoji written there drew a star).
const DISC = 'width:32px;height:32px;border-radius:999px;background:#f9cf6e;border:2px solid #3a2a22;display:flex;align-items:center;justify-content:center';
const disc = ( words, o = {} ) => {
	const box = o.box || { x: 0, y: 0, w: 32, h: 32 };
	const glyph = E( 'span', { words, style: o.style ?? DISC, box, ...( o.tag ? {} : {} ) } );
	const root = section( [ o.wrap ? E( o.wrap, { attrs: o.wrap === 'a' ? { href: '/x' } : {} }, [ glyph ] ) : glyph, E( 'p', { words: 'Brewer\u2019s yeast gives you B-vitamins' } ) ] );
	return run( root );
};
const iconAt = ( r, words ) => row( r, ( x ) => x.words === words );
const nodes = ( r ) => r.skeleton.flatMap( function flat( n ) { return [ n, ...( n.innerBlocks || [] ).flatMap( flat ) ]; } );

test( 'MUST FAIL: a tick or a star in a painted round box is an icon with the glyph as its emoji character; an emoji disc is never written as a brand name', () => {
	for ( const g of [ '\u2713', '\u2726', '\u2190', '\u00a3' ] ) {
		const r = disc( g );
		assert.deepEqual( settled( iconAt( r, g ) ), { block: 'sgs/icon', action: null, rule: 'solitaryIcon' }, g );
		const n = nodes( r ).find( ( x ) => 'sgs/icon' === x.name );
		assert.deepEqual( n.attributes, { iconSource: 'emoji', emojiChar: g }, g );
	}
	const heart = nodes( disc( '\u2665\uFE0F' ) ).find( ( x ) => 'sgs/icon' === x.name );
	assert.deepEqual( heart.attributes, { iconSource: 'emoji', emojiChar: '\u2665\uFE0F' } );
	assert.equal( 'brandName' in heart.attributes, false );
} );

test( 'MUST FAIL: a disc the draft squeezes at a narrow width is judged at the widest width it renders; one that is not round at the widest stays text', () => {
	const squeezed = { 375: { x: 0, y: 0, w: 27.4, h: 36 }, 768: { x: 0, y: 0, w: 36, h: 36 }, 1440: { x: 0, y: 0, w: 36, h: 36 } };
	const at = ( boxes, g = '✦' ) => run( section( [ E( 'span', { words: g, style: DISC, boxes } ), E( 'p', { words: 'Baking on, with you from Wednesday' } ) ] ) );
	assert.equal( iconAt( at( squeezed ), '✦' ).block, 'sgs/icon', 'round where it is not squeezed' );
	const wide = { ...squeezed, 1440: { x: 0, y: 0, w: 60, h: 36 } };
	assert.notEqual( iconAt( at( wide ), '✦' ).block, 'sgs/icon', 'not round at the widest width' );
} );

// A disc inside a link that is a whole card (two or more other pieces of text, or a heading) is part of the card; a glyph that is a
// link's only content, or beside one label, is an arrow link, not a disc.
const discIn = ( kids ) => run( section( [ E( 'a', { attrs: { href: '/home' } }, [ E( 'span', { words: '←', style: DISC, box: { x: 0, y: 0, w: 56, h: 56 } } ), ...kids ] ) ] ) );
test( 'MUST FAIL: a glyph disc inside a whole-card link is an icon; a glyph that is the only content of a link, or sits beside one label, stays text', () => {
	const card = discIn( [ E( 'span', {}, [ E( 'b', { words: 'Back to the kitchen' } ), E( 'span', { words: 'Keep browsing' } ) ] ) ] );
	assert.deepEqual( settled( iconAt( card, '←' ) ), { block: 'sgs/icon', action: null, rule: 'solitaryIcon' } );
	assert.equal( nodes( card ).find( ( x ) => 'sgs/container' === x.name && x.attributes.sgsBlockLink )?.attributes.sgsBlockLink, '/home', 'the card is still the link' );
	assert.notEqual( iconAt( discIn( [] ), '←' )?.block, 'sgs/icon', 'a bare arrow link' );
	assert.notEqual( iconAt( discIn( [ E( 'span', { words: 'Back' } ) ] ), '←' )?.block, 'sgs/icon', 'an arrow beside one label' );
} );

test( 'MUST FAIL: when the icon block cannot hold an emoji (no emoji settings in the rule), a glyph disc and a lone emoji stay text, never an empty icon', () => {
	const noEmoji = () => { const f = facts(); delete f.decisions.rules.solitaryIcon.emoji; return f; };
	const bare = ( words, style ) => run( section( [ E( 'span', { words, style, box: { x: 0, y: 0, w: 32, h: 32 } } ), E( 'p', { words: 'Brewer’s yeast gives you B-vitamins' } ) ] ), { facts: noEmoji() } );
	assert.notEqual( iconAt( bare( '✓', DISC ), '✓' )?.block, 'sgs/icon', 'a disc with no emoji settings' );
	assert.notEqual( iconAt( bare( '❤️', 'color:#c00' ), '❤️' )?.block, 'sgs/icon', 'a lone emoji with no emoji settings' );
	assert.deepEqual( nodes( bare( '✓', DISC ) ).filter( ( x ) => 'sgs/icon' === x.name ), [] );
	// Negative control: with the rule present the same disc is the emoji icon.
	assert.equal( iconAt( disc( '✓' ), '✓' ).block, 'sgs/icon' );
} );

test( 'negative control: a plus, an opening quote, a glyph in an unpainted box, a box that is not round or square, a glyph in a link or button and the rule removed stay text', () => {
	const text = ( r, g ) => 'sgs/icon' !== iconAt( r, g )?.block;
	assert.ok( text( disc( '+' ), '+' ), 'a plus is a control' );
	assert.ok( text( disc( '\u201c' ), '\u201c' ), 'an opening quote' );
	assert.ok( text( disc( '\u2713', { style: 'color:#f9cf6e;font-size:20px' } ), '\u2713' ), 'no painted box' );
	assert.ok( text( disc( '\u2713', { style: 'width:32px;height:32px;border-radius:4px;background:#f9cf6e;border:2px solid #3a2a22' } ), '\u2713' ), 'not round' );
	assert.ok( text( disc( '\u2713', { box: { x: 0, y: 0, w: 60, h: 32 } } ), '\u2713' ), 'not square' );
	assert.ok( text( disc( '\u2713', { wrap: 'button' } ), '\u2713' ), 'inside a button' );
	assert.ok( text( disc( '\u2713', { wrap: 'a' } ), '\u2713' ), 'inside a link' );
	const off = run( section( [ E( 'span', { words: '\u2713', style: DISC, box: { x: 0, y: 0, w: 32, h: 32 } } ), E( 'p', { words: 'Brewer\u2019s yeast' } ) ] ), { facts: ( () => { const f = facts(); delete f.decisions.rules.solitaryIcon.glyphDisc; return f; } )() } );
	assert.ok( text( off, '\u2713' ), 'the rule removed' );
} );
