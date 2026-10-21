// Skeleton rules read through the fact record (Spec 48 FR-48-6, FR-48-7): the header disclosure panel's children
// (megaGroup, megaAside, megaContainer), the drawer's top-row icon run (drawerIconRun), the marquee whose items are built in
// code (marqueeCodeItems), the wrapper margin that keeps a gap (alignWrapper.siblingGap) and the record reads that replaced
// the snippet reads. Each rule MUST FAIL with its decisions entry removed; each has negative fixtures proving where it must
// not fire. Fixtures are written in the inventory's shape with a matching fact record (no browser).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { recordView, gridTracks, fractionalTrack, fixedTrack } from '../lib/skeleton-record.mjs';
import { loopingKeys } from '../lib/skeleton-rerun.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
const db = openDb();
const facts = ( ...off ) => {
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	off.forEach( ( id ) => ( id.includes( '.' ) ? delete f.decisions.rules[ id.split( '.' )[ 0 ] ][ id.split( '.' )[ 1 ] ] : delete f.decisions.rules[ id ] ) );
	return f;
};

// N( tag, { style, words, attrs, loop, holes, hole, kids } ): style is a CSS declaration string (rendered and recorded);
// `loop` makes the node the item of a loop under its parent; `holes` are style-bound properties; `hole` a text binding.
const N = ( tag, o = {}, kids = [] ) => ( { tag, o, kids } );
const decl = ( css ) => String( css || '' ).split( ';' ).map( ( p ) => p.split( /:(.+)/ ).slice( 0, 2 ).map( ( x ) => x.trim() ) ).filter( ( p ) => p[ 0 ] && p[ 1 ] );
function build( root ) {
	const elements = [];
	const recs = {};
	let n = 0;
	const walk = ( node, parentKey, depth ) => {
		const id = ++n;
		const key = `Root/${ id }#0`;
		const tk = `Root/${ id }`;
		const attrs = { ...( node.o.attrs || {} ), ...( node.o.style ? { style: node.o.style } : {} ) };
		const words = node.o.words || '';
		const el = { key, parentKey, depth, tag: node.tag, template: 'Root', tpl: id, attrs, words, allText: words, membership: [], srcTag: node.tag, srcOwnText: words, snippet: `<${ node.tag } data-dc-tpl="${ id }">${ words }</${ node.tag }>`,
			box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 0, y: id * 30, w: 100, h: 20 } ] ) ), visible: { 375: true, 768: true, 1440: true }, display: /display:\s*(flex|grid)/.exec( node.o.style || '' )?.[ 1 ] || 'block', flexDirection: 'row', screenshots: {} };
		elements.push( el );
		const parentTk = parentKey ? parentKey.replace( /#0$/, '' ) : null;
		const loopKey = node.o.loop ? `Root/f${ id }` : null;
		loopKey && ( recs[ loopKey ] = entry( loopKey, 'sc-for', {}, [], [], parentTk, parentTk ) );
		recs[ tk ] = entry( tk, node.o.real || node.tag, node.o.attrs || {}, decl( node.o.style ), ( node.o.holes || [] ).map( ( h ) => `style:${ h }#0` ), loopKey || parentTk, parentTk, loopKey, node.o.hole );
		const texts = node.kids.map( ( k ) => walk( k, key, depth + 1 ) );
		el.allText = [ words, ...texts ].filter( Boolean ).join( ' ' );
		return el.allText;
	};
	walk( root, null, 0 );
	return { inventory: { checks: {}, source: 'fixture', root: root.tag, generated: 'fixture', elements }, recs };
}
function entry( key, realTag, attrs, st, holes, parent, realParent, loopKey = null, textHole = null ) {
	return {
		template: { key, component: 'Root', n: key.split( '/' ).pop(), tag: realTag, realTag, attrs, style: { static: st, holes }, pseudo: {}, holes: textHole ? [ { id: 'text#0', where: 'text', expr: textHole, path: textHole, whole: true } ] : [],
			parent, realParent, parentChain: [], membership: { scIf: [], scFor: loopKey ? [ { key: loopKey, list: '{{ xs }}', as: 'x' } ] : [], dcImport: [] }, own: {}, inHelmet: false, inFor: !! loopKey, ref: null, hooks: {}, events: [], words: textHole ? `{{ ${ textHole } }}` : '', srcLine: 1 },
		logic: { holes: {} }, surfaces: [], instances: [], fingerprint: {},
	};
}
// The record for a built tree: its elements, and the surfaces given as { id: { kind, name, parent, roots } }.
const record = ( recs, surfaces = {} ) => ( { schema: '1', client: 'fixture-client', elements: recs, surfaces: Object.fromEntries( Object.entries( surfaces ).map( ( [ id, s ] ) => [ id, { id, kind: s.kind, name: s.name, dc: 'Root', parent: s.parent || null, roots: s.roots || [], parts: [], states: [] } ] ) ) } );
const run = ( root, o = {} ) => {
	const b = build( root );
	return proposeSkeleton( { inventory: b.inventory, facts: o.facts || facts(), surface: 'fixture', surfaceKind: o.kind || 'page', surfaceName: o.name || 'Fixture', motion: o.motion || new Set(), db, factRecord: 'record' in o ? o.record : record( b.recs, o.surfaces ), openers: o.openers || {} } );
};
const rows = ( r ) => r.proposal.rows;
const byWords = ( r, w ) => rows( r ).find( ( x ) => x.words === w );
const outcome = ( x ) => ( x ? x.block || x.action : null );
const header = { 'S-1': { kind: 'header', name: 'Header' }, 'S-2': { kind: 'menu', name: 'Panel', parent: 'S-1' } };
const OPEN = { 'S-2': 'mouseenter or focus on the nav link' };

// A link that is a card (two pieces of text), repeated by a loop.
const card = ( a, href ) => N( 'a', { loop: true, attrs: { href } }, [ N( 'span', { words: a } ), N( 'span', { words: 'About ' + a } ) ] );

// A header panel: a flex root with a growing column of a link loop, a fixed painted box, and a growing column without links.
const panel = () => N( 'div', { style: 'display:flex' }, [
	N( 'div', { style: 'flex-grow:1;display:flex' }, [ card( 'One', '/one' ), card( 'Two', '/two' ) ] ),
	N( 'div', { style: 'width:300px;flex-shrink:0;background-color:rgb(10, 126, 168)' }, [ N( 'p', { words: 'Feature' } ) ] ),
	N( 'div', { style: 'flex-grow:1' }, [ N( 'p', { words: 'Heading' } ), N( 'div', { style: 'display:grid;grid-template-columns:repeat(4, 1fr)' }, [ N( 'img', { attrs: { src: 'a.png', alt: '' } } ) ] ) ] ),
] );
const disclosure = ( o = {} ) => run( panel(), { kind: 'menu', name: 'Panel', surfaces: header, openers: OPEN, ...o } );
const kidAt = ( r, i ) => rows( r ).filter( ( x ) => 1 === x.depth )[ i ];

test( 'megaGroup, megaAside, megaContainer: a header disclosure panel\'s children are told apart by sizing, paint and a link loop; MUST FAIL without each entry', () => {
	const r = disclosure();
	assert.deepEqual( [ 0, 1, 2 ].map( ( i ) => [ outcome( kidAt( r, i ) ), kidAt( r, i ).rule ] ), [ [ 'sgs/mega-group', 'megaGroup' ], [ 'sgs/mega-aside', 'megaAside' ], [ 'sgs/container', 'megaContainer' ] ] );
	assert.equal( kidAt( disclosure( { facts: facts( 'megaGroup' ) } ), 0 ).rule === 'megaGroup', false );
	assert.equal( kidAt( disclosure( { facts: facts( 'megaAside' ) } ), 1 ).rule === 'megaAside', false );
	assert.equal( kidAt( disclosure( { facts: facts( 'megaContainer' ) } ), 2 ).rule === 'megaContainer', false );
} );

test( 'megaAside: a style-bound background is own paint', () => {
	const tree = N( 'div', { style: 'display:flex' }, [ N( 'div', { style: 'width:300px;flex-shrink:0', holes: [ 'background' ] }, [ N( 'p', { words: 'Feature' } ) ] ) ] );
	assert.equal( outcome( kidAt( run( tree, { kind: 'menu', name: 'Panel', surfaces: header, openers: OPEN } ), 0 ) ), 'sgs/mega-aside' );
	const bare = N( 'div', { style: 'display:flex' }, [ N( 'div', { style: 'width:300px;flex-shrink:0' }, [ N( 'p', { words: 'Feature' } ) ] ) ] );
	assert.notEqual( outcome( kidAt( run( bare, { kind: 'menu', name: 'Panel', surfaces: header, openers: OPEN } ), 0 ) ), 'sgs/mega-aside' );
} );

test( 'NEGATIVE: the panel rules do not fire on a page panel (review slider, gifts carousel), a panel with no header parent or opener, or an accordion', () => {
	const none = ( r ) => rows( r ).every( ( x ) => ! [ 'megaGroup', 'megaAside', 'megaContainer' ].includes( x.rule ) );
	// kind panel under a page surface (a review slider)
	assert.ok( none( run( panel(), { kind: 'panel', name: 'Panel', surfaces: { 'S-1': { kind: 'page', name: 'Home' }, 'S-2': { kind: 'panel', name: 'Panel', parent: 'S-1' } }, openers: { 'S-2': 'Scroll' } } ) ) );
	// kind panel, header parent, but nothing opens it and the header has no aria-expanded control
	assert.ok( none( run( panel(), { kind: 'panel', name: 'Panel', surfaces: { 'S-1': { kind: 'header', name: 'Header' }, 'S-2': { kind: 'panel', name: 'Panel', parent: 'S-1' } } } ) ) );
	// an accordion under a header
	assert.ok( none( run( panel(), { kind: 'accordion', name: 'Panel', surfaces: { 'S-1': { kind: 'header', name: 'Header' }, 'S-2': { kind: 'accordion', name: 'Panel', parent: 'S-1' } }, openers: OPEN } ) ) );
	// no fact record at all
	assert.ok( none( run( panel(), { kind: 'menu', name: 'Panel', record: null } ) ) );
	// a repeated painted card is the card grid's, never a group, aside or container
	const cards = N( 'div', { style: 'display:grid;grid-template-columns:repeat(4, 1fr)' }, [ N( 'a', { loop: true, style: 'background-color:rgb(1, 2, 3)', words: 'Card', attrs: { href: '/c' } } ) ] );
	assert.ok( none( run( cards, { kind: 'menu', name: 'Panel', surfaces: header, openers: OPEN } ) ) );
} );

test( 'megaGroup / megaAside: a grid panel is read by its tracks (a fractional track grows, a fixed track is a fixed box)', () => {
	assert.deepEqual( gridTracks( 'repeat(2, 1fr) minmax(0, 2fr) 300px' ), [ '1fr', '1fr', 'minmax(0, 2fr)', '300px' ] );
	assert.ok( fractionalTrack( 'minmax(0, 2fr)' ) && fractionalTrack( '1fr' ) && ! fractionalTrack( '300px' ) );
	assert.ok( fixedTrack( '300px' ) && ! fixedTrack( '1fr' ) );
	const grid = N( 'div', { style: 'display:grid;grid-template-columns:1fr 300px' }, [
		N( 'div', {}, [ card( 'One', '/one' ), card( 'Two', '/two' ) ] ),
		N( 'div', { style: 'aspect-ratio:4 / 3;box-shadow:0 1px 2px #000' }, [ N( 'p', { words: 'Feature' } ) ] ),
	] );
	const r = run( grid, { kind: 'menu', name: 'Panel', surfaces: header, openers: OPEN } );
	assert.deepEqual( [ outcome( kidAt( r, 0 ) ), outcome( kidAt( r, 1 ) ) ], [ 'sgs/mega-group', 'sgs/mega-aside' ] );
} );

test( 'drawerIconRun: a run of icon-only Site Info links in a drawer\'s top row is one social icons group in the icons slot; MUST FAIL without the entry', () => {
	const icon = ( href ) => N( 'a', { attrs: { href, 'aria-label': 'x' }, style: 'width:44px;height:44px' }, [ N( 'svg', {}, [ N( 'path' ) ] ) ] );
	const drawer = ( top ) => N( 'div', { style: 'display:flex' }, [
		N( 'span', { style: 'position:absolute', attrs: { 'aria-hidden': 'true' } } ),
		N( 'div', { style: 'display:flex' }, top ),
		N( 'div', { style: 'overflow-y:auto' }, [ N( 'p', { words: 'Body' } ) ] ),
	] );
	const r = run( drawer( [ N( 'div', {}, [ icon( 'tel:01217714330' ), icon( 'mailto:a@b.co' ), N( 'button', { words: 'Close' } ) ] ) ] ), { kind: 'drawer', name: 'Drawer' } );
	const tel = rows( r ).find( ( x ) => x.rule === 'drawerIconRun' && ! x.action );
	assert.equal( tel.block, 'sgs/social-icons' );
	assert.deepEqual( tel.slot, { block: 'sgs/nav-drawer', attribute: 'chromeSlotType', value: 'icons' } );
	assert.equal( rows( r ).find( ( x ) => 'absorbed' === x.action && 'drawerIconRun' === x.rule ).into, tel.key );
	const node = JSON.stringify( r.skeleton );
	assert.match( node, /"siteInfoRow":\["phone","email"\]/ );
	assert.deepEqual( r.problems, [] );
	const without = run( drawer( [ N( 'div', {}, [ icon( 'tel:01217714330' ), icon( 'mailto:a@b.co' ) ] ) ] ), { kind: 'drawer', name: 'Drawer', facts: facts( 'drawerIconRun' ) } );
	assert.ok( rows( without ).every( ( x ) => 'drawerIconRun' !== x.rule ) );
} );

test( 'NEGATIVE: drawerIconRun does not fire outside a drawer\'s top row, on one icon, on non-Site-Info targets or on a page', () => {
	const icon = ( href ) => N( 'a', { attrs: { href, 'aria-label': 'x' } }, [ N( 'svg', {}, [ N( 'path' ) ] ) ] );
	const tree = ( top, body ) => N( 'div', { style: 'display:flex' }, [ N( 'div', { style: 'display:flex' }, top ), N( 'div', {}, body ) ] );
	const fires = ( r ) => rows( r ).some( ( x ) => 'drawerIconRun' === x.rule );
	assert.equal( fires( run( tree( [ N( 'p', { words: 'Logo' } ) ], [ icon( 'tel:01217714330' ), icon( 'mailto:a@b.co' ), N( 'p', { words: 'Call us' } ) ] ), { kind: 'drawer', name: 'Drawer' } ) ), false, 'in the body' );
	assert.equal( fires( run( tree( [ icon( 'tel:01217714330' ), N( 'p', { words: 'Call' } ) ], [] ), { kind: 'drawer', name: 'Drawer' } ) ), false, 'one icon' );
	assert.equal( fires( run( tree( [ icon( 'https://example.com/a' ), icon( 'https://example.org/b' ) ], [] ), { kind: 'drawer', name: 'Drawer' } ) ), false, 'not Site Info targets' );
	assert.equal( fires( run( tree( [ icon( 'tel:01217714330' ), icon( 'mailto:a@b.co' ) ], [] ), { kind: 'page', name: 'Page' } ) ), false, 'not a drawer' );
} );

test( 'marqueeCodeItems: a strip whose items are built in code and whose animation loops a translate for ever is a scrolling trust bar; MUST FAIL without the entry', () => {
	const strip = () => N( 'section', {}, [ N( 'div', { style: 'overflow-x:hidden', hole: 'trustBar', words: 'Fresh Baked Local' } ) ] );
	const motion = new Set( [ 'Root/2' ] );
	const r = run( strip(), { motion } );
	assert.deepEqual( [ outcome( rows( r )[ 1 ] ), rows( r )[ 1 ].rule ], [ 'sgs/trust-bar', 'marqueeCodeItems' ] );
	assert.equal( rows( run( strip(), { motion, facts: facts( 'marqueeCodeItems' ) } ) )[ 1 ].rule === 'marqueeCodeItems', false );
	// negative: the strip's animation is not an endless translate (it is not in the looping keys)
	assert.equal( rows( run( strip(), { motion: new Set() } ) )[ 1 ].rule === 'marqueeCodeItems', false );
	// negative: no text binding to build from, and a strip with stamped children keeps the template-items rule
	assert.equal( rows( run( N( 'section', {}, [ N( 'div', { style: 'overflow-x:hidden', words: 'Static' } ) ] ), { motion } ) )[ 1 ].rule === 'marqueeCodeItems', false );
} );

test( 'NEGATIVE: loopingKeys takes a code-built strip only for an infinite translate (a one-shot or non-translate animation gives no key)', () => {
	const rec = ( iterations, property, to ) => ( { iterations, element: { dc: 'Home', template_tpl_id: null, nearest_tpl_id: '42' }, properties: [ { property, from: 'translateX(0)', to } ] } );
	assert.deepEqual( [ ...loopingKeys( { records: [ rec( 'infinite', 'transform', 'translateX(-50%)' ) ] } ) ], [ 'Home/42' ] );
	assert.equal( loopingKeys( { records: [ rec( '1', 'transform', 'translateX(-50%)' ) ] } ).size, 0 );
	assert.equal( loopingKeys( { records: [ rec( 'infinite', 'opacity', '1' ) ] } ).size, 0 );
} );

test( 'alignWrapper.siblingGap: a wrapper declaring a margin against its previous sibling stays; MUST FAIL without the entry', () => {
	const tree = () => N( 'section', {}, [ N( 'div', { style: 'display:flex' }, [ N( 'p', { words: 'Before' } ), N( 'div', { style: 'margin-top:18px' }, [ N( 'p', { words: 'A' } ), N( 'p', { words: 'B' } ) ] ) ] ) ] );
	const wrapper = ( r ) => rows( r ).find( ( x ) => 'div' === x.tag && x.depth === 2 );
	assert.equal( wrapper( run( tree() ) ).action, null );
	assert.equal( wrapper( run( tree(), { facts: facts( 'alignWrapper.siblingGap' ) } ) ).action, 'unwrap' );
	// the first child with a margin still goes: no sibling precedes it
	const first = N( 'section', {}, [ N( 'div', { style: 'display:flex' }, [ N( 'div', { style: 'margin-top:18px' }, [ N( 'p', { words: 'A' } ), N( 'p', { words: 'B' } ) ] ) ] ) ] );
	assert.equal( wrapper( run( first ) ).action, 'unwrap' );
} );

test( 'record reads: aria-expanded, aria-pressed, required and the real tag come from the fact record, the render confirms', () => {
	// A toggle button the render shows no aria-pressed on: the record's pressed state keeps it from being a pill.
	const toggle = () => N( 'section', {}, [ N( 'div', { style: 'display:flex' }, [ N( 'button', { attrs: { 'aria-pressed': '{{ on }}' } }, [ N( 'span', { words: 'Vegan' } ) ] ) ] ) ] );
	const b = build( toggle() );
	const strip = ( rec ) => proposeSkeleton( { inventory: structuredClone( b.inventory ), facts: facts(), surface: 'fixture', surfaceKind: 'page', surfaceName: 'F', db, factRecord: rec, openers: {} } );
	b.inventory.elements.forEach( ( e ) => delete e.attrs[ 'aria-pressed' ] );
	const withRec = strip( record( b.recs ) );
	const noAttr = structuredClone( b.recs );
	delete noAttr[ 'Root/3' ].template.attrs[ 'aria-pressed' ];
	assert.notEqual( rows( withRec ).find( ( x ) => 'button' === x.tag ).block, 'sgs/button' );
	assert.equal( rows( strip( record( noAttr ) ) ).find( ( x ) => 'button' === x.tag ).block, 'sgs/button' );
	// the render disagrees: the proposal lists the row
	assert.ok( withRec.proposal.recordDisagreements.some( ( d ) => 'aria-pressed' === d.field && d.record && ! d.render ) );
	// required: a literal `{{ true }}` in the template makes the lone checkbox the consent field
	const consent = N( 'section', {}, [ N( 'div', {}, [ N( 'input', { attrs: { type: 'checkbox', required: '{{ true }}' } } ) ] ) ] );
	const cb = build( consent );
	cb.inventory.elements.forEach( ( e ) => delete e.attrs.required );
	const asConsent = ( rec ) => rows( proposeSkeleton( { inventory: cb.inventory, facts: facts(), surface: 'fixture', surfaceKind: 'page', surfaceName: 'F', db, factRecord: rec, openers: {} } ) ).find( ( x ) => 'input' === x.tag ).block;
	assert.equal( asConsent( record( cb.recs ) ), 'sgs/form-field-consent' );
	assert.notEqual( asConsent( record( Object.fromEntries( Object.entries( cb.recs ).map( ( [ k, v ] ) => [ k, { ...v, template: { ...v.template, attrs: {} } } ] ) ) ) ), 'sgs/form-field-consent' );
} );

test( 'recordView.describe carries every field the rules read; the parent chain sits beside the rendered parent', () => {
	const b = build( N( 'div', { style: 'display:flex;flex-grow:1;flex-shrink:0;flex-basis:0%;width:10px;min-width:0px;position:relative;aspect-ratio:2 / 1;background-color:rgb(1, 2, 3)', attrs: { 'aria-current': 'page', 'aria-expanded': 'false', 'aria-pressed': 'true', tabindex: '0', required: '' } }, [ N( 'span', { real: 'select' } ) ] ) );
	const view = recordView( record( b.recs ) );
	const d = view.describe( b.inventory.elements[ 0 ] );
	assert.deepEqual( [ d.ariaCurrent, d.ariaExpanded, d.ariaPressed, d.tabindex, d.required, d.display, d.position, d.width, d.minWidth, d.aspectRatio, d.ownPaint ], [ 'page', 'false', 'true', '0', '', 'flex', 'relative', '10px', '0px', '2 / 1', true ] );
	assert.deepEqual( [ d.flex.grow, d.flex.shrink, d.flex.basis ], [ '1', '0', '0%' ] );
	assert.equal( view.describe( b.inventory.elements[ 1 ] ).realTag, 'select' );
	assert.equal( view.describe( b.inventory.elements[ 1 ] ).templateParents.realParent, 'Root/1' );
	view.checkParent( b.inventory.elements[ 1 ], { ...b.inventory.elements[ 0 ], template: 'Root', tpl: 9 } );
	assert.deepEqual( view.disagreements.map( ( x ) => x.field ), [ 'parent' ] );
} );

test( 'lint: the rule modules read no literal pixel value, author logic key or client name, and no snippet read of aria or required', () => {
	const lib = path.join( HERE, '..', 'lib' );
	const strip = ( t ) => t.replace( /\/\*[\s\S]*?\*\//g, '' ).replace( /(^|[^:])\/\/.*$/gm, '$1' );
	for ( const f of [ 'skeleton-rules.mjs', 'skeleton-panel-rules.mjs', 'skeleton-record.mjs' ] ) {
		const code = strip( fs.readFileSync( path.join( lib, f ), 'utf8' ) );
		assert.equal( /\b\d+(?:\.\d+)?\s*px\b/.test( code ), false, `${ f } holds a literal pixel value` );
		assert.equal( /\b(?:_menus|activePanel|activeMenu|showHeaderCta|logoH|isSimple|isM|accOpen|faqOpen)\b|item\.current|cur\.shop/.test( code ), false, `${ f } names an author logic key` );
		assert.equal( /indus|mama|eye ?care/i.test( code ), false, `${ f } names a client` );
	}
	const rules = strip( fs.readFileSync( path.join( lib, 'skeleton-rules.mjs' ), 'utf8' ) );
	assert.equal( /attrs\?\.\[ 'aria-(?:expanded|pressed)' \]/.test( rules ), false );
	assert.equal( /\\srequired/.test( rules ), false );
	assert.match( rules, /view\.attr\( e, 'aria-expanded' \)/ );
	assert.match( rules, /view\.attr\( e, 'required' \)/ );
} );

test( 'a grid panel child\'s track counts each rendered child, so a loop\'s copies take consecutive tracks; MUST FAIL when tracks are counted per template element', () => {
	// Root grid `1fr 1fr 300px`: a loop of two copies fills tracks 0 and 1, the painted aside is on track 2.
	const grid = N( 'div', { style: 'display:grid;grid-template-columns:1fr 1fr 300px' }, [
		N( 'div', { loop: true } ),
		N( 'div', { style: 'width:300px;background-color:rgb(10, 126, 168)' }, [ N( 'p', { words: 'Feature' } ) ] ),
	] );
	const b = build( grid );
	const loopEl = b.inventory.elements.find( ( x ) => 'Root/2#0' === x.key );
	b.inventory.elements.splice( b.inventory.elements.indexOf( loopEl ) + 1, 0, { ...loopEl, key: 'Root/2#1', box: structuredClone( loopEl.box ) } );
	const r = proposeSkeleton( { inventory: b.inventory, facts: facts(), surface: 'fixture', surfaceKind: 'menu', surfaceName: 'Panel', motion: new Set(), db, factRecord: record( b.recs, header ), openers: OPEN } );
	assert.equal( rows( r ).filter( ( x ) => 1 === x.depth ).length, 3, 'two loop copies and the aside' );
	assert.equal( rows( r ).find( ( x ) => 'Root/3#0' === x.key ).rule, 'megaAside' );
} );
