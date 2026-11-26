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
import { loadFacts, decisionsProblems } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { recordView, gridTracks, fractionalTrack, fixedTrack } from '../lib/skeleton-record.mjs';
import * as recordLib from '../lib/skeleton-record.mjs';
import { loopingKeys } from '../lib/skeleton-rerun.mjs';
import { blockPadding } from '../lib/skeleton-rules.mjs';

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
// `loop` makes the node the item of a loop under its parent; `holes` are style-bound properties; `hole` a text binding;
// `resolved` the browser's computed read per width ({ 1440: { 'padding-top': '36px', ... } }).
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
			box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 0, y: id * 30, w: 100, h: 20 } ] ) ), visible: { 375: true, 768: true, 1440: true }, display: /display:\s*(flex|grid)/.exec( node.o.style || '' )?.[ 1 ] || 'block', flexDirection: 'row', screenshots: {} , ...( node.o.codeItems ? { codeItems: node.o.codeItems } : {} ), ...( node.o.resolved ? { resolved: node.o.resolved } : {} ) };
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
	return proposeSkeleton( { inventory: b.inventory, facts: o.facts || facts(), surface: 'fixture', surfaceKind: o.kind || 'page', surfaceName: o.name || 'Fixture', motion: o.motion || new Set(), db, factRecord: 'record' in o ? o.record : record( b.recs, o.surfaces ), openers: o.openers || {}, ...( o.calSettings ? { calSettings: o.calSettings } : {} ) } );
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

test( 'MUST FAIL loopingKeys names a template record by its own template_tpl_id only; its nearest_tpl_id adds no key', () => {
	const rec = ( own, near ) => ( { iterations: 'infinite', element: { dc: 'Home', template_tpl_id: own, nearest_tpl_id: near }, properties: [ { property: 'transform', from: 'translateX(0)', to: 'translateX(-50%)' } ] } );
	assert.deepEqual( [ ...loopingKeys( { records: [ rec( '7', '42' ) ] } ) ], [ 'Home/7' ], 'a template record: its own element, not the one near it' );
	assert.deepEqual( [ ...loopingKeys( { records: [ rec( null, '42' ) ] } ) ], [ 'Home/42' ], 'a code-built strip: the host of its hole' );
	assert.deepEqual( [ ...loopingKeys( { records: [ rec( [ '7', '8' ], '42' ) ] } ) ].sort(), [ 'Home/7', 'Home/8' ] );
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

test( 'alignWrapper.blockPadding: a wrapper padding above or below its content stays; one with no padding still goes, and side padding is a look the unwrap guard keeps', () => {
	const tree = ( pad ) => N( 'section', {}, [ N( 'div', { style: 'display:flex;flex-direction:column' }, [ N( 'p', { words: 'Before' } ), N( 'section', { style: `padding:${ pad }` }, [ N( 'p', { words: 'A' } ), N( 'p', { words: 'B' } ) ] ) ] ) ] );
	const wrapper = ( r ) => rows( r ).find( ( x ) => 'section' === x.tag && x.depth === 2 );
	assert.equal( wrapper( run( tree( '72px 40px 104px' ) ) ).action, null, 'the section keeps its top and bottom padding' );
	assert.equal( wrapper( run( tree( '0 0 64px' ) ) ).action, null, 'bottom padding alone is space too' );
	// Without the entry the rule's own verdict is unwrap, and the unwrap guard (paint conservation) refuses it: the padding is
	// paint no reader takes. The entry and the guard agree on a padded wrapper; the guard alone keeps side padding (below).
	assert.equal( wrapper( run( tree( '72px 40px 104px' ), { facts: facts( 'alignWrapper.blockPadding' ) } ) ).action, null );
	// Negative control: no padding, the wrapper still goes.
	assert.equal( wrapper( run( tree( '0' ) ) ).action, 'unwrap' );
	assert.equal( wrapper( run( tree( '0px 0px 0px' ) ) ).action, 'unwrap' );
	// Side padding alone is not this entry's (blockPadding is 0), yet it is paint no reader takes once the wrapper is
	// dissolved, so the unwrap guard (paint conservation, lib/skeleton-rules.mjs::ruleFor) keeps the wrapper as a node.
	assert.equal( wrapper( run( tree( '0 40px' ) ) ).action, null );
	assert.equal( wrapper( run( tree( '0 40px' ) ) ).rule, null, 'kept by the guard, not by the blockPadding entry' );
} );

test( 'blockPadding reads the shorthand, the block shorthand and the longhands', () => {
	assert.equal( blockPadding( { padding: '72px 40px 104px' } ), 104 );
	assert.equal( blockPadding( { padding: '12px' } ), 12 );
	assert.equal( blockPadding( { padding: '0 40px' } ), 0 );
	assert.equal( blockPadding( { 'padding-block': '8px 0' } ), 8 );
	assert.equal( blockPadding( { 'padding-bottom': '30px' } ), 30 );
	assert.equal( blockPadding( { padding: '{{ L.pad }}' } ), 0, 'a binding is no plain length' );
} );

test( 'record reads: aria-expanded, aria-pressed, required and the real tag come from the fact record, the render confirms', () => {
	// A toggle button the render shows no aria-pressed on: the record's pressed state keeps it from being a pill.
	const toggle = () => N( 'section', {}, [ N( 'div', { style: 'display:flex' }, [ N( 'button', { attrs: { 'aria-pressed': '{{ on }}' } }, [ N( 'span', { words: 'Vegan' } ) ] ) ] ) ] );
	const b = build( toggle() );
	b.recs[ 'Root/3' ].logic.holes = { 'attr:aria-pressed#0': { 375: { v: [ { t: 'boolean', v: true }, { t: 'boolean', v: false } ], n: 2, loop: true } } };
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
	cb.inventory.elements.forEach( ( e ) => delete e.attrs.required );	const asConsent = ( rec ) => rows( proposeSkeleton( { inventory: cb.inventory, facts: facts(), surface: 'fixture', surfaceKind: 'page', surfaceName: 'F', db, factRecord: rec, openers: {} } ) ).find( ( x ) => 'input' === x.tag ).block;
	assert.equal( asConsent( record( cb.recs ) ), 'sgs/form-field-consent' );
	assert.notEqual( asConsent( record( Object.fromEntries( Object.entries( cb.recs ).map( ( [ k, v ] ) => [ k, { ...v, template: { ...v.template, attrs: {} } } ] ) ) ) ), 'sgs/form-field-consent' );
} );

test( 'MUST FAIL an attribute bound to a draft value is present only when the record resolves it or the render shows it', () => {
	const hole = { id: 'attr:aria-pressed#0', where: 'attr:aria-pressed', expr: 'o.on', path: 'o.on', whole: true };
	const answers = ( v, err ) => ( { 375: { v, n: v.length, loop: true, ...( err ? { err } : {} ) } } );
	const viewOf = ( holes, attrs = {}, text = '{{ o.on }}' ) => {
		const rec = entry( 'Root/3', 'button', { 'aria-pressed': text }, [], [], 'Root/2', 'Root/2' );
		rec.template.holes = [ hole ];
		rec.logic.holes = holes;
		const el = { template: 'Root', tpl: 3, tag: 'button', attrs };
		return { view: recordView( { schema: '1', elements: { 'Root/3': rec }, surfaces: {} } ), el };
	};
	const read = ( o ) => o.view.attr( o.el, 'aria-pressed' );
	assert.equal( read( viewOf( { 'attr:aria-pressed#0': answers( [ { t: 'boolean', v: false } ] ) } ) ), '{{ o.on }}', 'resolved to false is still a set state' );
	assert.equal( read( viewOf( { 'attr:aria-pressed#0': answers( [ { t: 'undefined' } ] ) } ) ), null, 'resolved to undefined everywhere' );
	assert.equal( read( viewOf( {} ) ), null, 'the record holds no answer' );
	assert.equal( read( viewOf( { 'attr:aria-pressed#0': answers( [ { t: 'boolean', v: true } ], 'boom' ) } ) ), null, 'a failed read resolves nothing' );
	assert.equal( read( viewOf( {}, { 'aria-pressed': 'true' } ) ), '{{ o.on }}', 'the render shows it' );
	assert.equal( read( viewOf( {}, {}, '{{ true }}' ) ), '{{ true }}', 'a constant expression is its own value' );
	assert.equal( read( viewOf( {}, {}, 'false' ) ), 'false', 'a literal attribute is not a binding' );
} );

test( 'megaGridContainer: a header panel root that lays its own grid out with its own padding or paint is a container, not the shell; MUST FAIL without the entry', () => {
	const kids = [ card( 'One', '/one' ), card( 'Two', '/two' ) ];
	const rootOf = ( style, o = {} ) => rows( run( N( 'div', { style }, kids ), { kind: 'menu', name: 'Panel', surfaces: header, openers: OPEN, ...o } ) ).find( ( x ) => 0 === x.depth );
	const grid = 'display:grid;grid-template-columns:repeat(2, 1fr);padding-top:28px;padding-left:28px;background-color:rgb(10, 126, 168)';
	assert.deepEqual( [ rootOf( grid ).block, rootOf( grid ).rule ], [ 'sgs/container', 'megaGridContainer' ] );
	assert.deepEqual( [ rootOf( 'display:grid;grid-template-columns:repeat(2, 1fr);padding-top:28px' ).block, rootOf( 'display:grid;grid-template-columns:repeat(2, 1fr);background-color:rgb(1, 2, 3)' ).block ], [ 'sgs/container', 'sgs/container' ], 'padding alone, or paint alone, is enough' );
	assert.equal( rootOf( grid, { facts: facts( 'megaGridContainer' ) } ).block, 'sgs/mega-panel', 'without the entry the root is the shell' );
	assert.equal( rootOf( 'display:grid;grid-template-columns:repeat(2, 1fr);padding-top:0px' ).block, 'sgs/mega-panel', 'a grid with no padding and no paint stays the shell' );
	assert.equal( rootOf( 'display:flex;padding-top:28px;background-color:rgb(10, 126, 168)' ).block, 'sgs/mega-panel', 'a flex root stays the shell' );
	const page = rows( run( N( 'div', { style: grid }, kids ), { kind: 'panel', name: 'Panel', surfaces: { 'S-1': { kind: 'page', name: 'Home' }, 'S-2': { kind: 'panel', name: 'Panel', parent: 'S-1' } }, openers: { 'S-2': 'Scroll' } } ) ).find( ( x ) => 0 === x.depth );
	assert.notEqual( page.rule, 'megaGridContainer', 'a panel of a page is not a header disclosure' );
} );

test( 'optionSet: a group whose children are all pressable buttons (a loop, or two or more) is one option picker that absorbs its chips; MUST FAIL without the entry', () => {
	const chip = ( words, o = {} ) => N( 'button', { attrs: { 'aria-pressed': 'false' }, ...o }, [ N( 'span', { words } ), N( 'span', { attrs: { 'aria-hidden': 'true' }, words: 'ok' } ) ] );
	const group = ( kids ) => N( 'section', {}, [ N( 'div', { style: 'display:flex' }, kids ) ] );
	const picker = ( r ) => rows( r ).find( ( x ) => 'sgs/option-picker' === x.block );
	const r = run( group( [ chip( 'Small' ), chip( 'Large' ) ] ) );
	assert.equal( picker( r ).rule, 'optionSet' );
	assert.equal( picker( r ).tag, 'div' );
	const inside = rows( r ).filter( ( x ) => 'button' === x.tag || 'span' === x.tag );
	assert.equal( inside.length, 6 );
	assert.ok( inside.every( ( x ) => 'absorbed' === x.action && x.into === picker( r ).key && 'optionSet' === x.rule ), 'the chips and their text and tick spans are the picker\'s' );
	assert.equal( picker( run( group( [ chip( 'Small' ) ] ) ) ), undefined, 'a lone toggle button is no option set' );
	assert.ok( picker( run( group( [ chip( 'Small', { loop: true } ) ] ) ) ), 'a loop of chips is one, even when it renders one copy' );
	assert.equal( picker( run( group( [ chip( 'Small' ), chip( 'Large' ) ] ), { facts: facts( 'optionSet' ) } ) ), undefined );
	const plain = ( words ) => N( 'button', {}, [ N( 'span', { words } ) ] );
	assert.equal( picker( run( group( [ plain( 'Small' ), plain( 'Large' ) ] ) ) ), undefined, 'buttons with no pressed state' );
	const disclosure = ( words ) => N( 'button', { attrs: { 'aria-expanded': 'false' } }, [ N( 'span', { words } ) ] );
	assert.equal( picker( run( group( [ disclosure( 'One' ), disclosure( 'Two' ) ] ) ) ), undefined, 'disclosure buttons stay as they are' );
	assert.equal( picker( run( group( [ chip( 'Small' ), chip( 'Large' ), N( 'p', { words: 'Pick a size' } ) ] ) ) ), undefined, 'a group with another kind of child is not an option set' );
	assert.equal( picker( run( group( [ N( 'a', { attrs: { 'aria-pressed': 'false', href: '/x' }, words: 'Link' } ), N( 'a', { attrs: { 'aria-pressed': 'false', href: '/y' }, words: 'Link2' } ) ] ) ) ), undefined, 'links are not buttons' );
	const box = ( words ) => N( 'div', { attrs: { 'aria-pressed': 'false' } }, [ N( 'span', { words } ) ] );
	assert.equal( picker( run( group( [ box( 'One' ), box( 'Two' ) ] ) ) ), undefined, 'only buttons are chips' );
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
	for ( const f of [ 'skeleton-rules.mjs', 'skeleton-panel-rules.mjs', 'skeleton-record.mjs', 'skeleton-widgets.mjs' ] ) {
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

test( 'MUST FAIL: a code-built marquee whose rendered items the inventory read gets them as the block items (words and kept icon), the title cleared and no handover', () => {
	const STAR = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" style="fill:none"><path d="M20 6 9 17l-5-5" stroke="currentColor" fill="none" onclick="x()"></path></svg>';
	const strip = ( codeItems ) => N( 'section', {}, [ N( 'div', { style: 'overflow-x:hidden', hole: 'trustBar', words: 'Baked fresh Handmade', codeItems } ) ] );
	const motion = new Set( [ 'Root/2' ] );
	const r = run( strip( [ { text: 'Baked fresh', svg: STAR }, { text: 'Handmade', svg: null } ] ), { motion } );
	const row = rows( r )[ 1 ];
	assert.equal( row.rule, 'marqueeCodeItems' );
	const node = JSON.parse( JSON.stringify( r.skeleton ) )[ 0 ].innerBlocks[ 0 ];
	assert.equal( node.name, 'sgs/trust-bar' );
	assert.equal( node.attributes.title, '' );
	assert.deepEqual( node.attributes.items.map( ( i ) => i.label ), [ 'Baked fresh', 'Handmade' ] );
	assert.match( node.attributes.items[ 0 ].iconSvg, /^<svg[^>]*viewBox="0 0 24 24"[^>]*><path / );
	assert.doesNotMatch( node.attributes.items[ 0 ].iconSvg, /style=|onclick|width=/, 'the icon writer keeps no style, handler or root width' );
	assert.equal( node.attributes.items[ 1 ].iconSvg, undefined );
	assert.ok( ! JSON.stringify( row ).includes( 'add each item to the trust bar' ), 'no handover when the items were read' );
} );

test( 'a code-built marquee with fewer than two items read keeps the handover, and the items rule never writes without its decisions entry', () => {
	const strip = ( codeItems ) => N( 'section', {}, [ N( 'div', { style: 'overflow-x:hidden', hole: 'trustBar', words: 'One', codeItems } ) ] );
	const motion = new Set( [ 'Root/2' ] );
	const one = run( strip( [ { text: 'One', svg: null } ] ), { motion } );
	assert.ok( JSON.stringify( rows( one )[ 1 ] ).includes( 'add each item to the trust bar' ) );
	const off = run( strip( [ { text: 'A', svg: null }, { text: 'B', svg: null } ] ), { motion, facts: facts( 'marqueeCodeItems.items' ) } );
	assert.equal( JSON.parse( JSON.stringify( off.skeleton ) )[ 0 ].innerBlocks[ 0 ].attributes.items, undefined );
	const f = facts();
	f.decisions.rules.marqueeCodeItems.items = { ...f.decisions.rules.marqueeCodeItems.items, setting: 'noSuchItems' };
	assert.ok( decisionsProblems( f ).some( ( p ) => /rules\.marqueeCodeItems\.items must name/.test( p ) ) );
} );

test( 'MUST FAIL: a code-built marquee reads its items’ look at the first item’s element (the item and label slots), takes the word-only style when no item has an icon, and names a separator glyph no setting holds', () => {
	const strip = ( codeItems ) => N( 'section', {}, [ N( 'div', { style: 'overflow-x:hidden', hole: 'trustBar', words: 'Baked fresh Handmade', codeItems } ) ] );
	const motion = new Set( [ 'Root/2' ] );
	const CAL = { itemGap: { slot: '.sgs-trust-bar__badge:nth-of-type(1)' }, labelFontSize: { slot: '.sgs-trust-bar__badge:nth-of-type(1) > .sgs-trust-bar__label' } };
	const items = [ { text: 'Baked fresh', svg: null, marks: '✦', at: [ 0, 0 ] }, { text: 'Handmade', svg: null, marks: '✦', at: [ 0, 1 ] } ];
	const r = run( strip( items ), { motion, calSettings: () => CAL } );
	const node = JSON.parse( JSON.stringify( r.skeleton ) )[ 0 ].innerBlocks[ 0 ];
	assert.equal( node.attributes.badgeStyle, 'text-only', 'no item draws an icon' );
	assert.deepEqual( Object.keys( node.draftSlots || {} ).sort(), Object.values( CAL ).map( ( c ) => c.slot ).sort() );
	const f = node.draftSlots[ CAL.itemGap.slot ];
	assert.match( f.js, /\[ 0, 0 \]/, 'the finder walks the first item’s child-index path' );
	// eslint-disable-next-line no-new-func
	const walk = new Function( `return (${ f.js })` )();
	const leaf = { children: [] };
	assert.equal( walk( { children: [ { children: [ leaf ] } ] } ), leaf );
	assert.equal( walk( { children: [] } ), null );
	assert.ok( rows( r )[ 1 ].slotNotes.some( ( n ) => /no separator setting.*"✦"/.test( n ) ) );
	const bad = facts();
	bad.decisions.rules.marqueeCodeItems.items = { ...bad.decisions.rules.marqueeCodeItems.items, slots: [ 'noSuchLook' ] };
	assert.ok( decisionsProblems( bad ).some( ( p ) => /rules\.marqueeCodeItems\.items must name/.test( p ) ), 'a look setting the block lacks is a decisions problem' );
} );

test( 'NEGATIVE: items that draw an icon keep the block’s icon style, differing glyphs or none give no separator note, and an item path that is no index list gives no slots', () => {
	const STAR = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg>';
	const strip = ( codeItems ) => N( 'section', {}, [ N( 'div', { style: 'overflow-x:hidden', hole: 'trustBar', words: 'A B', codeItems } ) ] );
	const motion = new Set( [ 'Root/2' ] );
	const CAL = { itemGap: { slot: '.sgs-trust-bar__badge:nth-of-type(1)' }, labelFontSize: { slot: '::before' } };
	const icons = run( strip( [ { text: 'A', svg: STAR, marks: '', at: [ 0 ] }, { text: 'B', svg: null, marks: '', at: [ 1 ] } ] ), { motion, calSettings: () => CAL } );
	const node = JSON.parse( JSON.stringify( icons.skeleton ) )[ 0 ].innerBlocks[ 0 ];
	assert.equal( node.attributes.badgeStyle, undefined, 'an item with an icon keeps the icon style' );
	assert.deepEqual( Object.keys( node.draftSlots ), [ '.sgs-trust-bar__badge:nth-of-type(1)' ], 'a pseudo-element slot is never given' );
	assert.ok( ! ( rows( icons )[ 1 ].slotNotes || [] ).some( ( n ) => /separator/.test( n ) ), 'no glyph, no separator note' );
	const mixed = run( strip( [ { text: 'A', svg: null, marks: '✦', at: [ 0 ] }, { text: 'B', svg: null, marks: '•', at: [ 1 ] } ] ), { motion, calSettings: () => CAL } );
	assert.ok( ! ( rows( mixed )[ 1 ].slotNotes || [] ).some( ( n ) => /separator/.test( n ) ), 'two different glyphs are no one separator' );
	const noPath = run( strip( [ { text: 'A', svg: null }, { text: 'B', svg: null } ] ), { motion, calSettings: () => CAL } );
	assert.equal( JSON.parse( JSON.stringify( noPath.skeleton ) )[ 0 ].innerBlocks[ 0 ].draftSlots, undefined );
} );


test( 'MUST FAIL: a drawer\'s <nav> whose only children are a loop of links is the drawer menu block (the navigation rule), not unwrapped as a bare list wrapper; a bare div and a page\'s nav still are', () => {
	const links = () => [ N( 'a', { loop: true, words: 'Shop all', attrs: { href: '/shop/' } } ), N( 'a', { loop: true, words: 'Gifts', attrs: { href: '/gifts/' } } ) ];
	const drawer = { 'S-1': { kind: 'drawer', name: 'Menu' } };
	const navRow = ( r ) => rows( r ).find( ( x ) => 'nav' === x.tag || 'div' === x.tag && 1 === x.depth );
	const inDrawer = run( N( 'aside', {}, [ N( 'nav', { attrs: { 'aria-label': 'Menu links' } }, links() ) ] ), { kind: 'drawer', name: 'Menu', surfaces: drawer } );
	const nav = rows( inDrawer ).find( ( x ) => 'nav' === x.tag );
	assert.deepEqual( [ nav.block, nav.rule ], [ 'sgs/nav-drawer-menu', 'navigation' ], JSON.stringify( rows( inDrawer ).map( ( x ) => [ x.tag, x.block, x.action, x.rule ] ) ) );
	const div = navRow( run( N( 'aside', {}, [ N( 'div', {}, links() ) ] ), { kind: 'drawer', name: 'Menu', surfaces: drawer } ) );
	assert.deepEqual( [ div.action, div.rule ], [ 'unwrap', 'listWrapper' ], 'negative control: a bare div holding the list is still unwrapped' );
	const page = rows( run( N( 'section', {}, [ N( 'nav', {}, links() ) ] ) ) ).find( ( x ) => 'nav' === x.tag );
	assert.deepEqual( [ page.action, page.rule ], [ 'unwrap', 'listWrapper' ], 'negative control: no navigation block on a page, so its nav is still unwrapped' );
} );

test( 'MUST FAIL: a grid of image links (logoGrid) reads its tiles\' look at the first link: the tile settings\' calibrated element is that link; a decisions entry naming a setting the block lacks is a problem', () => {
	const tile = ( src ) => N( 'a', { loop: true, attrs: { href: 'https://example.com/' } }, [ N( 'img', { attrs: { src, alt: '' } } ) ] );
	const grid = N( 'section', {}, [ N( 'div', { style: 'display:grid' }, [ tile( 'a.jpg' ), tile( 'b.jpg' ), tile( 'c.jpg' ) ] ) ] );
	const CAL = { tileBorderRadius: { slot: '.sgs-gallery__grid > .sgs-gallery__item:nth-of-type(1)' } };
	const r = run( grid, { calSettings: () => CAL } );
	const row = rows( r ).find( ( x ) => 'logoGrid' === x.rule );
	assert.ok( row, JSON.stringify( rows( r ).map( ( x ) => [ x.tag, x.block, x.rule ] ) ) );
	const find = ( list ) => list.flatMap( ( n ) => ( 'sgs/gallery' === n.name ? [ n ] : find( n.innerBlocks || [] ) ) );
	const node = find( JSON.parse( JSON.stringify( r.skeleton ) ) )[ 0 ];
	assert.deepEqual( node.draftSlots, { [ CAL.tileBorderRadius.slot ]: { tpl: 'Root/3#0' } }, 'the first link is the first tile' );
	assert.equal( find( JSON.parse( JSON.stringify( run( grid, { calSettings: () => ( {} ) } ).skeleton ) ) )[ 0 ].draftSlots, undefined, 'negative control: no calibrated tile element, no slot' );
	const bad = facts();
	bad.decisions.rules.logoGrid = { ...bad.decisions.rules.logoGrid, itemSlots: [ 'noSuchTile' ] };
	assert.ok( decisionsProblems( bad ).some( ( p ) => /rules\.logoGrid\.itemSlots names noSuchTile/.test( p ) ) );
} );

test( 'MUST FAIL: a list block made from a run of links reads its link part (the underline) at its first link, the node\'s own draft element; with no calibrated link part it gets no slot', () => {
	const LINK = '.sgs-icon-list > .sgs-icon-list__item:nth-of-type(1) > .sgs-icon-list__text > .sgs-icon-list__item-link';
	const col = N( 'section', {}, [ N( 'nav', { attrs: { 'aria-label': 'Shop' } }, [ N( 'div', { words: 'shop' } ), N( 'a', { words: 'All Zookies', attrs: { href: '/shop/' } } ), N( 'a', { words: 'Gifts', attrs: { href: '/gifts/' } } ), N( 'a', { words: 'Taster Trio', attrs: { href: '/trio/' } } ) ] ) ] );
	const find = ( list ) => list.flatMap( ( n ) => ( 'sgs/icon-list' === n.name ? [ n ] : find( n.innerBlocks || [] ) ) );
	const listOf = ( cal ) => find( JSON.parse( JSON.stringify( run( col, { calSettings: ( b ) => ( 'sgs/icon-list' === b ? cal : {} ) } ).skeleton ) ) )[ 0 ];
	const list = listOf( { linkUnderline: { slot: LINK } } );
	assert.ok( list, 'the links are one list block' );
	assert.deepEqual( list.draftSlots, { [ LINK ]: list.draftRef }, 'the link part is the first link, the node\'s draft element' );
	assert.equal( listOf( {} ).draftSlots, undefined, 'negative control: no calibrated link part, no slot' );
} );

test( 'MUST FAIL: a list block made from a run of links reads its item padding at the first link too, so the padding each link carries is read by the list and never kept unnamed', () => {
	const ITEM = '.sgs-icon-list > .sgs-icon-list__item:nth-of-type(1)';
	const link = ( words, href ) => N( 'a', { words, attrs: { href }, style: 'padding:5px 0' } );
	const col = N( 'section', {}, [ N( 'nav', { attrs: { 'aria-label': 'Shop' } }, [ N( 'div', { words: 'shop' } ), link( 'All Zookies', '/shop/' ), link( 'Gifts', '/gifts/' ), link( 'Taster Trio', '/trio/' ) ] ) ] );
	const find = ( list ) => list.flatMap( ( n ) => ( 'sgs/icon-list' === n.name ? [ n ] : find( n.innerBlocks || [] ) ) );
	const list = find( JSON.parse( JSON.stringify( run( col, { calSettings: ( b ) => ( 'sgs/icon-list' === b ? { itemPaddingBlock: { slot: ITEM } } : {} ) } ).skeleton ) ) )[ 0 ];
	assert.deepEqual( list.draftSlots, { [ ITEM ]: list.draftRef }, 'the item padding is read at the first link' );
} );

test( 'MUST FAIL: a code-built marquee whose items hold no icon marks its word-only style as decided, and one with an icon marks nothing', () => {
	const strip = ( codeItems ) => N( 'section', {}, [ N( 'div', { style: 'overflow-x:hidden', hole: 'trustBar', words: 'Baked fresh Handmade', codeItems } ) ] );
	const motion = new Set( [ 'Root/2' ] );
	const STAR = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" stroke="currentColor" fill="none"></path></svg>';
	const node = ( items ) => JSON.parse( JSON.stringify( run( strip( items ), { motion } ).skeleton ) )[ 0 ].innerBlocks[ 0 ];
	const plain = node( [ { text: 'Baked fresh', svg: null }, { text: 'Handmade', svg: null } ] );
	assert.deepEqual( plain.decided, { badgeStyle: 'text-only' }, 'Fill may not swap the style the rule chose' );
	const iconed = node( [ { text: 'Baked fresh', svg: STAR }, { text: 'Handmade', svg: null } ] );
	assert.equal( iconed.decided, undefined, 'negative control: no style was chosen, so none is protected' );
} );

// A panel whose columns sit inside plain wrappers (a width cap, then the row that lays the columns out): the root paints, the
// wrappers do not, and the row's own tracks size the columns.
const behind = ( o = {} ) => N( 'div', { style: 'background-color:rgb(1, 2, 3)' }, [
	N( 'div', { style: o.cap ?? 'max-width:1440px;margin-left:auto;margin-right:auto;padding-top:36px;padding-right:52px;padding-bottom:40px;padding-left:52px' }, [
		...( o.inner ?? [ N( 'div', { style: 'display:grid;grid-template-columns:minmax(0, 1fr) 300px' }, [
			N( 'div', {}, [ card( 'One', '/one' ), card( 'Two', '/two' ) ] ),
			N( 'div', { style: 'aspect-ratio:4 / 3;box-shadow:0 1px 2px #000' }, [ N( 'p', { words: 'Feature' } ) ] ),
		] ) ] ),
	] ),
] );
const behindRun = ( tree, o = {} ) => run( tree, { kind: 'menu', name: 'Panel', surfaces: header, openers: OPEN, ...o } );
const ruleOf = ( r, key ) => rows( r ).find( ( x ) => x.key === key );

test( 'megaPanelRow: columns one or two plain wrappers below the panel root are the panel\'s mega group and aside, read against the row\'s own tracks, and the wrappers go; MUST FAIL without the entry', () => {
	const r = behindRun( behind() );
	assert.deepEqual( [ 'Root/2#0', 'Root/3#0' ].map( ( k ) => [ ruleOf( r, k ).action, ruleOf( r, k ).rule ] ), [ [ 'unwrap', 'megaPanelRow' ], [ 'unwrap', 'megaPanelRow' ] ] );
	assert.deepEqual( r.skeleton[ 0 ].innerBlocks.map( ( x ) => x.name ), [ 'sgs/mega-group', 'sgs/mega-aside' ], 'the columns are the panel\'s own children' );
	// one wrapper only: the row sits directly under the root
	const one = behindRun( N( 'div', { style: 'background-color:rgb(1, 2, 3)' }, [ N( 'div', { style: 'display:flex' }, [ N( 'div', { style: 'flex-grow:1' }, [ card( 'One', '/one' ), card( 'Two', '/two' ) ] ), N( 'div', { style: 'width:300px;flex-shrink:0;box-shadow:0 1px 2px #000' }, [ N( 'p', { words: 'Feature' } ) ] ) ] ) ] ) );
	assert.deepEqual( one.skeleton[ 0 ].innerBlocks.map( ( x ) => x.name ), [ 'sgs/mega-group', 'sgs/mega-aside' ] );
	const off = behindRun( behind(), { facts: facts( 'megaPanelRow' ) } );
	assert.ok( ! rows( off ).some( ( x ) => 'megaPanelRow' === x.rule || 'megaGroup' === x.rule ), 'no columns are found without the rule' );
} );

test( 'megaPanelRow: the cap\'s width and padding are recorded as the panel\'s own maxWidth and panelPadding, and a cap that paints stays a node', () => {
	const r = behindRun( behind() );
	const cap = ruleOf( r, 'Root/2#0' );
	assert.deepEqual( cap.conserve.map( ( x ) => [ x.kind, x.node, x.setting ] ), [ [ 'setting', 'Root/1#0', 'maxWidth' ], [ 'setting', 'Root/1#0', 'panelPadding' ] ] );
	const painted = behindRun( behind( { cap: 'max-width:1440px;margin-left:auto;margin-right:auto;padding-top:36px;padding-right:52px;padding-bottom:40px;padding-left:52px;background-color:rgb(9, 9, 9)' } ) );
	assert.ok( rows( painted ).every( ( x ) => 'megaPanelRow' !== x.rule ), 'a wrapper with a background of its own is not a plain cap' );
	assert.ok( rows( painted ).every( ( x ) => 'megaGroup' !== x.rule ) );
} );

test( 'MUST FAIL: the cap wrapper\'s width and padding reach the panel node as decided settings per device, and a cap that declares neither adds none', () => {
	const r = behindRun( behind() );
	const panel = r.skeleton[ 0 ];
	assert.equal( panel.name, 'sgs/mega-panel' );
	assert.deepEqual( panel.decided, { maxWidth: { desktop: '1440px' }, panelPadding: { desktop: { top: '36px', right: '52px', bottom: '40px', left: '52px' } } } );
	assert.equal( panel.attributes?.maxWidth, undefined, 'a style value never sits among the skeleton\'s attributes (R-47-10)' );
	const capOnly = behindRun( behind( { cap: 'max-width:1100px;margin-left:auto;margin-right:auto' } ) ).skeleton[ 0 ];
	assert.deepEqual( capOnly.decided, { maxWidth: { desktop: '1100px' } }, 'no padding declared: no padding setting' );
	const bare = behindRun( behind( { cap: 'display:block' } ) ).skeleton[ 0 ];
	assert.equal( bare.decided, undefined, 'a wrapper declaring neither a cap nor padding decides nothing' );
} );

test( 'MUST FAIL: the cap wrapper\'s width and padding are written per device as the browser read of the draft gives them, a narrower device only where it differs from what it inherits', () => {
	const side = ( top, right ) => ( { 'padding-top': top, 'padding-right': right, 'padding-bottom': top, 'padding-left': right } );
	const withRead = ( resolved ) => N( 'div', { style: 'background-color:rgb(1, 2, 3)' }, [
		N( 'div', { style: 'max-width:1440px;margin-left:auto;margin-right:auto;padding-top:36px;padding-right:52px;padding-bottom:36px;padding-left:52px', resolved }, [
			N( 'div', { style: 'display:grid;grid-template-columns:minmax(0, 1fr) 300px' }, [
				N( 'div', {}, [ card( 'One', '/one' ), card( 'Two', '/two' ) ] ),
				N( 'div', { style: 'aspect-ratio:4 / 3;box-shadow:0 1px 2px #000' }, [ N( 'p', { words: 'Feature' } ) ] ),
			] ),
		] ),
	] );
	const read = { 1440: { 'max-width': '1440px', ...side( '36px', '52px' ) }, 768: { 'max-width': '1440px', ...side( '36px', '52px' ) }, 375: { 'max-width': '100%', ...side( '20px', '16px' ) } };
	const mobileOnly = behindRun( withRead( read ) ).skeleton[ 0 ].decided;
	assert.deepEqual( mobileOnly.panelPadding, { desktop: { top: '36px', right: '52px', bottom: '36px', left: '52px' }, mobile: { top: '20px', right: '16px', bottom: '20px', left: '16px' } }, 'tablet matches desktop so it writes none; the phone differs' );
	assert.deepEqual( mobileOnly.maxWidth, { desktop: '1440px', mobile: '100%' } );
	const tabletToo = behindRun( withRead( { ...read, 768: { 'max-width': '960px', ...side( '28px', '40px' ) } } ) ).skeleton[ 0 ].decided;
	assert.deepEqual( Object.keys( tabletToo.panelPadding ), [ 'desktop', 'tablet', 'mobile' ] );
	assert.deepEqual( tabletToo.maxWidth, { desktop: '1440px', tablet: '960px', mobile: '100%' } );
	const same = behindRun( withRead( { 1440: read[ 1440 ], 768: read[ 1440 ], 375: read[ 1440 ] } ) ).skeleton[ 0 ].decided;
	assert.deepEqual( Object.keys( same.panelPadding ), [ 'desktop' ], 'a draft whose padding never changes writes the desktop tier alone' );
	assert.deepEqual( Object.keys( same.maxWidth ), [ 'desktop' ] );
	const none = behindRun( withRead( { 1440: read[ 1440 ], 768: { ...side( '36px', '52px' ) }, 375: { ...side( '36px', '52px' ) } } ) ).skeleton[ 0 ].decided;
	assert.deepEqual( Object.keys( none.maxWidth ), [ 'desktop' ], 'a device the draft leaves uncapped adds no width cap' );
	// A device the draft was not read at inherits from the one above it, never from desktop.
	const noPhone = behindRun( withRead( { 1440: read[ 1440 ], 768: { 'max-width': '960px', ...side( '28px', '40px' ) } } ) ).skeleton[ 0 ].decided;
	assert.deepEqual( Object.keys( noPhone.panelPadding ), [ 'desktop', 'tablet' ], 'no read at 375: no phone value' );
	assert.deepEqual( noPhone.maxWidth, { desktop: '1440px', tablet: '960px' } );
	// A padding the draft writes through a variable is the browser's px, not the variable's name; a width the read holds no cap for keeps the declared one.
	const viaVar = ( resolved ) => N( 'div', { style: 'background-color:rgb(1, 2, 3)' }, [
		N( 'div', { style: 'max-width:1440px;padding-top:var(--band);padding-right:var(--band);padding-bottom:var(--band);padding-left:var(--band)', resolved }, [
			N( 'div', { style: 'display:grid;grid-template-columns:minmax(0, 1fr) 300px' }, [ N( 'div', {}, [ card( 'One', '/one' ), card( 'Two', '/two' ) ] ), N( 'div', { style: 'aspect-ratio:4 / 3;box-shadow:0 1px 2px #000' }, [ N( 'p', { words: 'Feature' } ) ] ) ] ),
		] ),
	] );
	const vars = behindRun( viaVar( { 1440: side( '44px', '44px' ) } ) ).skeleton[ 0 ].decided;
	assert.deepEqual( vars.panelPadding.desktop, { top: '44px', right: '44px', bottom: '44px', left: '44px' } );
	assert.deepEqual( vars.maxWidth, { desktop: '1440px' } );
} );

test( 'MUST FAIL: a cap wrapper whose style is declared in rem, clamp() or a variable is compared with the browser reads only, never with the declared words', () => {
	const side = ( top, right ) => ( { 'padding-top': top, 'padding-right': right, 'padding-bottom': top, 'padding-left': right } );
	const declared = ( resolved ) => N( 'div', { style: 'background-color:rgb(1, 2, 3)' }, [
		N( 'div', { style: 'max-width:clamp(900px, 90vw, 1440px);margin-left:auto;margin-right:auto;padding-top:2.75rem;padding-right:var(--band);padding-bottom:2.75rem;padding-left:var(--band)', resolved }, [
			N( 'div', { style: 'display:grid;grid-template-columns:minmax(0, 1fr) 300px' }, [
				N( 'div', {}, [ card( 'One', '/one' ), card( 'Two', '/two' ) ] ),
				N( 'div', { style: 'aspect-ratio:4 / 3;box-shadow:0 1px 2px #000' }, [ N( 'p', { words: 'Feature' } ) ] ),
			] ),
		] ),
	] );
	const px = { 'max-width': '1296px', ...side( '44px', '52px' ) };
	// Every width reads the same px: no device differs, so none is written, whatever the declared words are.
	const same = behindRun( declared( { 1440: px, 768: px, 375: px } ) ).skeleton[ 0 ].decided;
	assert.deepEqual( Object.keys( same.panelPadding ), [ 'desktop' ] );
	assert.deepEqual( Object.keys( same.maxWidth ), [ 'desktop' ] );
	assert.equal( same.maxWidth.desktop, '1296px' );
	// A read that holds no padding says nothing about it: the declared words stand in for no device.
	const noPad = behindRun( declared( { 1440: px, 768: { 'max-width': '1296px' } } ) ).skeleton[ 0 ].decided;
	assert.deepEqual( Object.keys( noPad.panelPadding ), [ 'desktop' ] );
	// No read at 1440: the declared desktop value cannot be compared with a px read, so the first read device is not written, and the next
	// is compared with it.
	const noDesktop = behindRun( declared( { 768: px, 375: px } ) ).skeleton[ 0 ].decided;
	assert.deepEqual( Object.keys( noDesktop.panelPadding ), [ 'desktop' ], 'two equal reads at the narrower widths write no device' );
	assert.deepEqual( Object.keys( noDesktop.maxWidth ), [ 'desktop' ] );
	// A real difference between two reads is still written.
	const narrower = behindRun( declared( { 768: px, 375: { 'max-width': '100%', ...side( '20px', '16px' ) } } ) ).skeleton[ 0 ].decided;
	assert.deepEqual( Object.keys( narrower.panelPadding ), [ 'desktop', 'mobile' ], 'the phone differs from the tablet read' );
	assert.deepEqual( narrower.maxWidth, { desktop: 'clamp(900px, 90vw, 1440px)', mobile: '100%' } );
} );

test( 'MUST FAIL: a 1440 read that lacks a padding side or the max-width is no value to compare the narrower reads with, and a missing 1440 read is reported', () => {
	const side = ( top, right ) => ( { 'padding-top': top, 'padding-right': right, 'padding-bottom': top, 'padding-left': right } );
	const declared = ( resolved ) => N( 'div', { style: 'background-color:rgb(1, 2, 3)' }, [
		N( 'div', { style: 'max-width:clamp(900px, 90vw, 1440px);margin-left:auto;margin-right:auto;padding-top:2.75rem;padding-right:var(--band);padding-bottom:2.75rem;padding-left:var(--band)', resolved }, [
			N( 'div', { style: 'display:grid;grid-template-columns:minmax(0, 1fr) 300px' }, [
				N( 'div', {}, [ card( 'One', '/one' ), card( 'Two', '/two' ) ] ),
				N( 'div', { style: 'aspect-ratio:4 / 3;box-shadow:0 1px 2px #000' }, [ N( 'p', { words: 'Feature' } ) ] ),
			] ),
		] ),
	] );
	const full = { 'max-width': '1296px', ...side( '44px', '52px' ) };
	// The 1440 read holds the vertical sides only and no max-width: the tablet read's horizontal sides and width have nothing to differ from.
	const partial = { 'padding-top': '44px', 'padding-bottom': '44px' };
	const same = behindRun( declared( { 1440: partial, 768: full, 375: full } ) );
	assert.deepEqual( Object.keys( same.skeleton[ 0 ].decided.panelPadding ), [ 'desktop' ], 'tablet and phone read the same as each other and as the vertical sides at 1440: nothing is written' );
	assert.deepEqual( Object.keys( same.skeleton[ 0 ].decided.maxWidth ), [ 'desktop' ] );
	// A side the 1440 read does hold still compares: the phone differs from the tablet read it follows.
	const real = behindRun( declared( { 1440: partial, 768: full, 375: { ...full, 'max-width': '100%', 'padding-top': '20px', 'padding-bottom': '20px' } } ) ).skeleton[ 0 ].decided;
	assert.deepEqual( Object.keys( real.panelPadding ), [ 'desktop', 'mobile' ], 'a real difference between two reads is still written' );
	assert.deepEqual( real.maxWidth, { desktop: 'clamp(900px, 90vw, 1440px)', mobile: '100%' } );
	// A draft with no 1440 read has its first read device skipped: that is reported, and a draft with the 1440 read reports nothing.
	const note = ( resolved ) => behindRun( declared( resolved ) ).problems.filter( ( p ) => /not read at 1440/.test( p ) );
	assert.equal( note( { 768: full, 375: full } ).length, 1, 'no 1440 read: one problem line' );
	assert.deepEqual( note( { 1440: full, 768: full, 375: full } ), [], 'negative control: read at 1440' );
	assert.deepEqual( note( {} ), [], 'negative control: no read at any width says nothing about a skipped device' );
} );

test( 'NEGATIVE megaPanelRow: a root that lays its columns out itself keeps the direct rule; a wrapper over a loop\'s cards, over a row with no column, or more than three levels up is left alone', () => {
	assert.ok( rows( behindRun( panel() ) ).every( ( x ) => 'megaPanelRow' !== x.rule ), 'the panel root is the row: nothing to unwrap' );
	const cards = behind( { inner: [ N( 'div', { style: 'display:grid;grid-template-columns:repeat(4, 1fr)' }, [ N( 'a', { loop: true, style: 'background-color:rgb(1, 2, 3)', words: 'Card', attrs: { href: '/c' } } ) ] ) ] } );
	assert.ok( rows( behindRun( cards ) ).every( ( x ) => ! [ 'megaPanelRow', 'megaGroup', 'megaAside', 'megaContainer' ].includes( x.rule ) ) );
	const lone = behind( { inner: [ N( 'div', { style: 'display:grid;grid-template-columns:1fr 1fr' }, [ N( 'img', { attrs: { src: 'a.png', alt: '' } } ), N( 'img', { attrs: { src: 'b.png', alt: '' } } ) ] ) ] } );
	assert.ok( rows( behindRun( lone ) ).every( ( x ) => 'megaPanelRow' !== x.rule ), 'a row none of whose children is a column (two pictures) is not the panel row' );
	const twoCols = [ N( 'div', { style: 'flex-grow:1' }, [ card( 'One', '/one' ), card( 'Two', '/two' ) ] ), N( 'div', { style: 'flex-grow:1' }, [ card( 'Three', '/three' ), card( 'Four', '/four' ) ] ) ];
	const deep = N( 'div', { style: 'background-color:rgb(1, 2, 3)' }, [ N( 'div', {}, [ N( 'div', {}, [ N( 'div', {}, [ N( 'div', { style: 'display:flex' }, twoCols ) ] ) ] ) ] ) ] );
	assert.ok( rows( behindRun( deep ) ).every( ( x ) => 'megaPanelRow' !== x.rule ), 'a row more than three wrappers down is out of reach' );
} );

test( 'surfaceContext: a surface that is one state of a record ("<record name>: <state>") is the record\'s own surface, so the panel rules run on it; MUST FAIL on the exact-name match', () => {
	const stated = run( panel(), { kind: 'menu', name: 'Panel: Sunglasses', surfaces: header, openers: OPEN } );
	assert.deepEqual( [ 0, 1, 2 ].map( ( i ) => outcome( kidAt( stated, i ) ) ), [ 'sgs/mega-group', 'sgs/mega-aside', 'sgs/container' ] );
	const other = run( panel(), { kind: 'menu', name: 'Panelled: Sunglasses', surfaces: header, openers: OPEN } );
	assert.ok( rows( other ).every( ( x ) => ! [ 'megaGroup', 'megaAside', 'megaContainer' ].includes( x.rule ) ), 'a name that only begins with the record name is another surface' );
} );

// A column of a header panel: growing, a heading (or label) leaf, then one element holding a loop of text links.
const linkLoop = ( css = 'display:flex;flex-direction:column' ) => N( 'div', { style: css }, [ N( 'a', { loop: true, words: 'One', attrs: { href: '/one' } } ) ] );
const headedPanel = ( col ) => N( 'div', { style: 'display:flex' }, [ col, N( 'div', { style: 'flex-grow:1' }, [ card( 'Two', '/two' ), card( 'Three', '/three' ) ] ) ] );
const headedCol = ( kids ) => N( 'div', { style: 'flex-grow:1' }, kids );
const firstColumn = ( col, o = {} ) => kidAt( run( headedPanel( col ), { kind: 'menu', name: 'Panel', surfaces: header, openers: OPEN, ...o } ), 0 );

test( 'megaGroup.headedRun: a column of a heading over a stack of text links one wrapper down is a mega group; MUST FAIL on the direct-run-only rule', () => {
	const col = headedCol( [ N( 'p', { words: 'Heading' } ), linkLoop() ] );
	const hit = firstColumn( col );
	assert.deepEqual( [ outcome( hit ), hit.rule ], [ 'sgs/mega-group', 'megaGroup' ] );
	assert.notEqual( firstColumn( col, { facts: facts( 'megaGroup.headedRun' ) } ).rule, 'megaGroup', 'without its entry the column is the plain container' );
	// a plain wrapper around the heading and the run (the one wrapper the rule allows) is still the group
	const wrapped = headedCol( [ N( 'div', {}, [ N( 'p', { words: 'Heading' } ), linkLoop() ] ) ] );
	assert.equal( firstColumn( wrapped ).rule, 'megaGroup' );
} );

test( 'NEGATIVE megaGroup.headedRun: a label over a gallery of picture links, a grid of cards, a run with no heading above, a run two wrappers down and a direct run stay as they were', () => {
	const gallery = headedCol( [ N( 'p', { words: 'Label' } ), N( 'div', { style: 'display:grid' }, [ N( 'a', { loop: true, attrs: { href: '/b' } }, [ N( 'img', { attrs: { src: 'a.png', alt: '' } } ) ] ) ] ) ] );
	assert.deepEqual( [ outcome( firstColumn( gallery ) ), firstColumn( gallery ).rule ], [ 'sgs/container', 'megaContainer' ], 'picture links are a gallery' );
	const cards = headedCol( [ N( 'p', { words: 'Label' } ), N( 'div', { style: 'display:grid' }, [ card( 'One', '/one' ), card( 'Two', '/two' ) ] ) ] );
	assert.equal( firstColumn( cards ).rule, 'megaContainer', 'a grid of two-text cards is not a run of text links' );
	const unheaded = headedCol( [ linkLoop(), N( 'p', { words: 'Note' } ) ] );
	assert.equal( firstColumn( unheaded ).rule, 'megaContainer', 'the heading must sit above the run' );
	const deep = headedCol( [ N( 'div', {}, [ N( 'div', {}, [ N( 'p', { words: 'Heading' } ), linkLoop() ] ) ] ) ] );
	assert.notEqual( firstColumn( deep ).rule, 'megaGroup', 'more than one wrapper down is out of reach' );
	const direct = headedCol( [ card( 'One', '/one' ), card( 'Two', '/two' ) ] );
	assert.equal( firstColumn( direct ).rule, 'megaGroup', 'a direct run stays a group' );
	assert.equal( firstColumn( direct, { facts: facts( 'megaGroup.headedRun' ) } ).rule, 'megaGroup', 'and needs no headedRun entry' );
} );

// A column title set in capitals: with a run of text links below it (directly, or one wrapper down) it is the column's heading,
// the same reading as megaGroup.headedRun; a kicker over more text stays a label.
const capsTitle = ( words ) => N( 'p', { words, style: 'text-transform:uppercase' } );
const blockOf = ( col, words ) => byWords( run( headedPanel( col ), { kind: 'menu', name: 'Panel', surfaces: header, openers: OPEN } ), words )?.block;

test( 'column title: a caps title over one wrapper holding a run of text links is a heading, like a direct run; MUST FAIL on the direct-siblings-only reading', () => {
	const wrapped = headedCol( [ capsTitle( 'By style' ), linkLoop() ] );
	assert.equal( firstColumn( wrapped ).rule, 'megaGroup', 'the panel rule takes the column as a group' );
	assert.equal( blockOf( wrapped, 'By style' ), 'sgs/heading', 'so its title is the heading of the group' );
	const direct = headedCol( [ capsTitle( 'Shop by' ), N( 'a', { words: 'One', attrs: { href: '/one' } } ), N( 'a', { words: 'Two', attrs: { href: '/two' } } ) ] );
	assert.equal( blockOf( direct, 'Shop by' ), 'sgs/heading', 'direct sibling links: unchanged' );
	const inWrapper = headedCol( [ N( 'div', {}, [ capsTitle( 'Help' ), linkLoop() ] ) ] );
	assert.equal( blockOf( inWrapper, 'Help' ), 'sgs/heading', 'the heading and the run together inside one wrapper' );
	const second = headedCol( [ capsTitle( 'Most asked for' ), N( 'p', { words: 'Twelve frames people ask for most' } ), linkLoop(), capsTitle( 'All brands' ), linkLoop() ] );
	assert.equal( blockOf( second, 'Most asked for' ), 'sgs/heading', 'the first title with a line of text before its run: the reading of the panel rule' );
	assert.equal( blockOf( second, 'All brands' ), 'sgs/heading', 'a second title directly above its own run heads that run' );
} );

test( 'column title: the first leaf is the head of a run only when no later title sits between it and the run; a second title followed by bare links is a heading; MUST FAIL when the first leaf takes any later run', () => {
	const kicker = headedCol( [ capsTitle( 'NEW' ), N( 'p', { words: 'Our latest frames' } ), capsTitle( 'All brands' ), linkLoop() ] );
	assert.equal( blockOf( kicker, 'NEW' ), 'sgs/label', 'a kicker over text with a titled run further down is still a kicker' );
	assert.equal( blockOf( kicker, 'All brands' ), 'sgs/heading', 'the title directly above the run heads it' );
	const bare = ( words, href ) => N( 'a', { words, attrs: { href } } );
	const links = headedCol( [ capsTitle( 'Most asked' ), bare( 'One', '/one' ), bare( 'Two', '/two' ), capsTitle( 'All brands' ), bare( 'Three', '/three' ), bare( 'Four', '/four' ) ] );
	assert.equal( blockOf( links, 'Most asked' ), 'sgs/heading' );
	assert.equal( blockOf( links, 'All brands' ), 'sgs/heading', 'a second title directly above bare text links heads them' );
	const one = headedCol( [ capsTitle( 'Most asked' ), bare( 'One', '/one' ), bare( 'Two', '/two' ), capsTitle( 'Note' ), bare( 'Three', '/three' ) ] );
	assert.equal( blockOf( one, 'Note' ), 'sgs/label', 'a title above one bare link is no run' );
} );

test( 'column title: one heading per run: of a kicker, a title and the run, or a title, a line of text and the run, only one leaf is the heading (the one that reads as a title by its style when only one does, else the nearest); MUST FAIL when every leaf above a run heads it', () => {
	const kick = headedCol( [ capsTitle( 'NEW' ), capsTitle( 'Our latest frames' ), linkLoop() ] );
	assert.notEqual( blockOf( kick, 'NEW' ), 'sgs/heading', 'two titles: the kicker above the nearer title is no second heading' );
	assert.equal( blockOf( kick, 'Our latest frames' ), 'sgs/heading', 'the nearest title heads the run' );
	const line = headedCol( [ capsTitle( 'Most asked' ), N( 'p', { words: 'Twelve frames people ask for most' } ), linkLoop() ] );
	assert.equal( blockOf( line, 'Most asked' ), 'sgs/heading', 'the caps title heads the run, not the line of text under it' );
	assert.notEqual( blockOf( line, 'Twelve frames people ask for most' ), 'sgs/heading', 'the line of text stays text' );
	const intro = headedCol( [ N( 'p', { words: 'Intro line' } ), capsTitle( 'Sunglasses' ), linkLoop() ] );
	assert.equal( blockOf( intro, 'Sunglasses' ), 'sgs/heading', 'a plain line above a caps title: the title heads' );
	assert.notEqual( blockOf( intro, 'Intro line' ), 'sgs/heading' );
	const bare = ( words, href ) => N( 'a', { words, attrs: { href } } );
	const links = headedCol( [ capsTitle( 'Shop by' ), N( 'p', { words: 'Pick one below' } ), bare( 'One', '/one' ), bare( 'Two', '/two' ) ] );
	assert.equal( blockOf( links, 'Shop by' ), 'sgs/heading' );
	assert.notEqual( blockOf( links, 'Pick one below' ), 'sgs/heading', 'a line above bare links is no second heading' );
	const two = headedCol( [ capsTitle( 'Most asked' ), linkLoop(), capsTitle( 'All brands' ), linkLoop() ] );
	assert.equal( blockOf( two, 'All brands' ), 'sgs/heading', 'a second title above its own run still heads it' );
} );

test( 'column title: outside a header panel only the direct-sibling-links reading applies (a hero line above its button loop, a title above one wrapper of links on a page stay as they were); MUST FAIL when the panel readings run everywhere', () => {
	const asPage = ( col ) => byWords( run( headedPanel( col ), { kind: 'page', name: 'Home' } ), 'Sunglasses' )?.block;
	const wrapped = headedCol( [ capsTitle( 'Sunglasses' ), linkLoop() ] );
	assert.equal( asPage( wrapped ), 'sgs/label', 'a caps title over a wrapper of links on a page is a label' );
	const second = headedCol( [ N( 'p', { words: 'Intro line' } ), capsTitle( 'Sunglasses' ), linkLoop() ] );
	assert.equal( asPage( second ), 'sgs/label', 'a leaf above a link run, not first in its column, is no column title on a page' );
	assert.equal( blockOf( second, 'Sunglasses' ), 'sgs/heading', 'the same column in a header panel: the title of the run is a heading' );
} );

test( 'NEGATIVE column title: a caps kicker over text, a title over a picture gallery, a title with its run two wrappers below and a lone link stay labels', () => {
	const kicker = headedCol( [ capsTitle( 'Single vision' ), N( 'p', { words: 'From 99' } ), N( 'p', { words: 'One pair of lenses' } ) ] );
	assert.equal( blockOf( kicker, 'Single vision' ), 'sgs/label', 'a kicker followed by text lines is a kicker' );
	const gallery = headedCol( [ capsTitle( 'Gallery' ), N( 'div', { style: 'display:grid' }, [ N( 'a', { loop: true, attrs: { href: '/b' } }, [ N( 'img', { attrs: { src: 'a.png', alt: '' } } ) ] ) ] ) ] );
	assert.equal( blockOf( gallery, 'Gallery' ), 'sgs/label' );
	const deep = headedCol( [ capsTitle( 'Deep' ), N( 'div', {}, [ N( 'div', {}, [ linkLoop() ] ) ] ) ] );
	assert.equal( blockOf( deep, 'Deep' ), 'sgs/label', 'a run two wrappers below the title is out of reach of both readings' );
	const lone = headedCol( [ capsTitle( 'Only' ), N( 'div', {}, [ N( 'a', { words: 'One', attrs: { href: '/one' } } ) ] ) ] );
	assert.equal( blockOf( lone, 'Only' ), 'sgs/label', 'one link is no run' );
} );

// Columns of a panel row whose grid is an auto-fit or auto-fill repeat, a loop of text cards, a painted hairline row and a sole
// column behind a width cap.
const AUTO = 'display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 200px), 1fr))';
const links = ( list, style ) => N( 'div', { style: 'display:flex;flex-direction:column' }, list.map( ( [ words, href, own ] ) => N( 'a', { words, style: own ?? style, attrs: { href } } ) ) );
const headedStatic = ( list, style ) => N( 'div', {}, [ N( 'p', { words: 'Heading' } ), links( list, style ) ] );
const rowIn = ( style, cols, o = {} ) => behindRun( behind( { inner: [ N( 'div', { style }, cols ) ] } ), o );
const groupsOf = ( r ) => rows( r ).filter( ( x ) => 'megaGroup' === x.rule );

test( 'MUST FAIL: an auto-fit or auto-fill repeat of a fraction gives every column of the row the repeated track, so the columns share the free space and are found', () => {
	assert.deepEqual( recordLib.trackAt?.( 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', 2 ), { track: 'minmax(min(100%, 200px), 1fr)', auto: true } );
	assert.equal( recordLib.sharesSpace?.( recordLib.trackAt( 'repeat(auto-fill, minmax(150px, 1fr))', 0 ) ), true );
	const two = [ headedStatic( [ [ 'One', '/one' ], [ 'Two', '/two' ] ] ), headedStatic( [ [ 'Three', '/three' ], [ 'Four', '/four' ] ] ) ];
	const r = rowIn( AUTO, two );
	assert.equal( groupsOf( r ).length, 2, 'both columns are mega groups' );
	assert.deepEqual( r.skeleton[ 0 ].innerBlocks.map( ( x ) => x.name ), [ 'sgs/mega-group', 'sgs/mega-group' ] );
} );

test( 'NEGATIVE auto tracks: a fixed repeated track, an explicit track list and a bare fixed-minimum minmax in an explicit list keep their old reading', () => {
	const two = [ headedStatic( [ [ 'One', '/one' ], [ 'Two', '/two' ] ] ), headedStatic( [ [ 'Three', '/three' ], [ 'Four', '/four' ] ] ) ];
	assert.equal( groupsOf( rowIn( 'display:grid;grid-template-columns:repeat(auto-fill, 200px)', two ) ).length, 0, 'a fixed repeated track grows nothing' );
	assert.equal( recordLib.sharesSpace?.( recordLib.trackAt( 'minmax(150px, 1fr) 300px', 0 ) ), false, 'an explicit minmax with a non-zero minimum is not auto-read' );
	assert.equal( recordLib.sharesSpace?.( recordLib.trackAt( 'minmax(0, 1fr) 300px', 0 ) ), true );
	assert.equal( groupsOf( rowIn( 'display:grid;grid-template-columns:minmax(0, 1fr) minmax(0, 1fr)', two ) ).length, 2, 'explicit fractional tracks still find the columns' );
} );

// A loop of cards under the row: each an `a` holding the given leaves.
const cardsOf = ( leaves ) => N( 'a', { loop: true, style: 'display:flex;flex-direction:column;background-color:rgb(255, 255, 255);padding-top:26px', attrs: { href: '/x' } }, leaves );
const text = ( w ) => N( 'span', { words: w } );

test( 'MUST FAIL megaGroup.textColumn: a loop item holding a stack of text leaves (a label, a heading, a line) is a mega group in the panel row; a static text column is too', () => {
	const leaves = () => [ text( 'Label' ), text( 'Heading' ), text( 'Line' ) ];
	const r = rowIn( AUTO, [ cardsOf( leaves() ), cardsOf( leaves() ) ] );
	assert.equal( groupsOf( r ).length, 2, 'each loop item is a group' );
	assert.deepEqual( r.skeleton[ 0 ].innerBlocks.map( ( x ) => x.name ), [ 'sgs/mega-group', 'sgs/mega-group' ], 'the row and cap go, the items are the panel\'s own columns' );
	const stat = rowIn( 'display:grid;grid-template-columns:minmax(0, 1fr) minmax(0, 1fr)', [ N( 'div', {}, [ text( 'A' ), text( 'B' ) ] ), N( 'div', {}, [ text( 'C' ), text( 'D' ) ] ) ] );
	assert.equal( groupsOf( stat ).length, 2 );
	assert.equal( groupsOf( rowIn( AUTO, [ cardsOf( [ N( 'svg', {} ), ...leaves() ] ), cardsOf( [ N( 'svg', {} ), ...leaves() ] ) ] ) ).length, 2, 'an inline icon is a part of the card, not a block inside it' );
	assert.equal( groupsOf( rowIn( AUTO, [ cardsOf( leaves() ), cardsOf( leaves() ) ], { facts: facts( 'megaGroup.textColumn' ) } ) ).length, 0, 'without its entry the item is no group' );
} );

test( 'NEGATIVE megaGroup.textColumn: a loop card with a picture or a link inside, a card of one leaf and a column that is not in the panel row are not text columns', () => {
	const none = ( cards, why ) => assert.equal( groupsOf( rowIn( AUTO, [ cards, cards ] ) ).length, 0, why );
	none( cardsOf( [ N( 'img', { attrs: { src: 'a.png', alt: '' } } ), text( 'Title' ), text( 'Line' ) ] ), 'a picture' );
	none( cardsOf( [ text( 'Title' ), N( 'a', { words: 'Read more', attrs: { href: '/m' } } ) ] ), 'a link inside' );
	none( cardsOf( [ text( 'Only one leaf' ) ] ), 'one leaf' );
	none( cardsOf( [ N( 'span', { words: 'Title' }, [ N( 'img', { attrs: { src: 'a.png', alt: '' } } ) ] ), text( 'Line' ) ] ), 'a leaf holding a picture' );
	assert.equal( groupsOf( rowIn( 'display:grid;grid-template-columns:repeat(auto-fill, 200px)', [ cardsOf( [ text( 'Label' ), text( 'Heading' ) ] ), cardsOf( [ text( 'Label' ), text( 'Heading' ) ] ) ] ) ).length, 0, 'a fixed track is no growing column' );
	// the same cards one level down (inside a column) are not read by the row at all
	const column = N( 'div', { style: 'flex-grow:1' }, [ cardsOf( [ text( 'Label' ), text( 'Heading' ) ] ), cardsOf( [ text( 'Label' ), text( 'Heading' ) ] ) ] );
	const inner = behindRun( behind( { inner: [ N( 'div', { style: 'display:flex' }, [ column, N( 'div', { style: 'flex-grow:1' }, [ card( 'One', '/one' ), card( 'Two', '/two' ) ] ) ] ) ] } ) );
	assert.ok( groupsOf( inner ).every( ( x ) => ! /Heading/.test( x.words ) ), 'cards inside a column stay the column\'s content' );
} );

test( 'MUST FAIL megaPanelRow.rowPaint: a painted row (a hairline grid) is unwrapped and its background and border recorded on the panel\'s group border colour; without the entry it stays a node', () => {
	const painted = AUTO + ';background-color:rgb(230, 225, 218)';
	const cols = [ headedStatic( [ [ 'One', '/one' ], [ 'Two', '/two' ] ] ), headedStatic( [ [ 'Three', '/three' ], [ 'Four', '/four' ] ] ) ];
	const r = rowIn( painted, cols );
	const row = ruleOf( r, 'Root/3#0' );
	assert.equal( row.action, 'unwrap' );
	assert.deepEqual( row.conserve.filter( ( x ) => 'setting' === x.kind ).map( ( x ) => [ x.kind, x.node, x.setting, x.looks.join() ] ), [ [ 'setting', 'Root/1#0', 'groupBorderColour', 'background,border' ] ] );
	assert.deepEqual( r.skeleton[ 0 ].innerBlocks.map( ( x ) => x.name ), [ 'sgs/mega-group', 'sgs/mega-group' ] );
	const off = rowIn( painted, cols, { facts: facts( 'megaPanelRow.rowPaint' ) } );
	assert.notEqual( ruleOf( off, 'Root/3#0' ).action, 'unwrap', 'without the entry the painted row stays a node' );
	assert.deepEqual( ( ruleOf( rowIn( AUTO, cols ), 'Root/3#0' ).conserve ?? [] ).filter( ( x ) => 'setting' === x.kind ), [], 'an unpainted row records no setting' );
} );

test( 'MUST FAIL megaPanelRow.soleColumn: a block-flow column of a heading, a grid of tiles and a grid of text links behind a width cap is the panel\'s one mega group, the cap going; without the entry nothing is found', () => {
	const tiles = N( 'div', { style: 'display:grid;grid-template-columns:repeat(5, minmax(0, 1fr))' }, [ N( 'a', { loop: true, attrs: { href: '/t' } }, [ N( 'span', { words: 'Name' } ), N( 'span', { words: 'Count' } ) ] ) ] );
	const col = N( 'div', {}, [ N( 'p', { words: 'Most asked' } ), tiles, N( 'p', { words: 'All brands' } ), N( 'div', { style: 'display:grid;grid-template-columns:repeat(auto-fill, minmax(150px, 1fr))' }, [ N( 'a', { loop: true, words: 'Name', attrs: { href: '/n' } } ) ] ) ] );
	const r = behindRun( behind( { inner: [ col ] } ) );
	assert.equal( ruleOf( r, 'Root/2#0' ).action, 'unwrap', 'the cap goes' );
	assert.equal( ruleOf( r, 'Root/3#0' ).rule, 'megaGroup' );
	assert.deepEqual( r.skeleton[ 0 ].innerBlocks.map( ( x ) => x.name ), [ 'sgs/mega-group' ] );
	assert.ok( ruleOf( r, 'Root/2#0' ).conserve.some( ( x ) => 'maxWidth' === x.setting ), 'the cap\'s width reaches the panel' );
	const pair = N( 'div', {}, [ N( 'p', { words: 'Heading' } ), links( [ [ 'One', '/one' ], [ 'Two', '/two' ] ] ) ] );
	assert.equal( ruleOf( behindRun( behind( { inner: [ pair ] } ) ), 'Root/3#0' ).rule, 'megaGroup', 'a heading and its links are enough' );
	const off = behindRun( behind( { inner: [ col ] } ), { facts: facts( 'megaPanelRow.soleColumn' ) } );
	assert.ok( rows( off ).every( ( x ) => 'megaPanelRow' !== x.rule && 'megaGroup' !== x.rule ) );
} );

test( 'NEGATIVE megaPanelRow.soleColumn: a heading over a gallery of picture links, a lone column with no links, and the root\'s own children are not a sole column', () => {
	const gallery = N( 'div', {}, [ N( 'p', { words: 'Label' } ), N( 'div', { style: 'display:grid' }, [ N( 'a', { loop: true, attrs: { href: '/b' } }, [ N( 'img', { attrs: { src: 'a.png', alt: '' } } ) ] ) ] ) ] );
	assert.ok( rows( behindRun( behind( { inner: [ gallery ] } ) ) ).every( ( x ) => 'megaPanelRow' !== x.rule && 'megaGroup' !== x.rule ), 'picture links are a gallery' );
	const plain = N( 'div', {}, [ N( 'p', { words: 'Heading' } ), N( 'p', { words: 'A note' } ) ] );
	assert.ok( rows( behindRun( behind( { inner: [ plain ] } ) ) ).every( ( x ) => 'megaPanelRow' !== x.rule && 'megaGroup' !== x.rule ), 'text alone, behind a cap, is no link column' );
	const direct = N( 'div', { style: 'background-color:rgb(1, 2, 3)' }, [ N( 'p', { words: 'Heading' } ), links( [ [ 'One', '/one' ], [ 'Two', '/two' ] ] ) ] );
	assert.ok( rows( behindRun( direct ) ).every( ( x ) => 'megaPanelRow' !== x.rule && 'megaGroup' !== x.rule ), 'the root\'s own children with no wrapper above are no sole column' );
} );

test( 'MUST FAIL megaGroup.headedRun: under a heading, two or more text links are a run whatever their styles (one coloured link in the stack); with no heading above they are not', () => {
	const mixed = [ [ 'One', '/one', 'font-size:14px' ], [ 'Two', '/two', 'font-size:14px' ], [ 'Three', '/three', 'font-size:14px;color:rgb(27, 127, 67)' ] ];
	const col = N( 'div', { style: 'flex-grow:1' }, [ N( 'p', { words: 'Heading' } ), links( mixed ) ] );
	assert.equal( firstColumn( col ).rule, 'megaGroup' );
	const bare = N( 'div', { style: 'flex-grow:1' }, [ links( mixed ), N( 'p', { words: 'Note' } ) ] );
	assert.notEqual( firstColumn( bare ).rule, 'megaGroup', 'the heading must sit above the run' );
	const single = N( 'div', { style: 'flex-grow:1' }, [ N( 'p', { words: 'Heading' } ), links( [ [ 'One', '/one' ] ] ) ] );
	assert.notEqual( firstColumn( single ).rule, 'megaGroup', 'one link is no run' );
} );
