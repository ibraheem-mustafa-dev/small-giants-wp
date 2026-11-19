// The mountWrapper standing rule (Spec 48 FR-48-6, lib/skeleton-rules.mjs::mountWrapper, data/skeleton-decisions.json
// `rules.mountWrapper`): a draft made under Spec 48A FR-48A-17 mounts its buttons and fields through `dc-import`, and the
// runtime adds the mount's host element and the component's own root around each. Those wrappers go when they are
// layout-neutral (one child, no words, no declared style but display, the same box as the child at every read width), so a
// mounted button is the block it would be if drawn where it stands. Mutations: tests/fixtures/skeleton-mount-wrapper/mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = ( ...off ) => {
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	off.forEach( ( id ) => delete f.decisions.rules[ id ] );
	return f;
};

// E( tag, { words, attrs, style, srcTag, box }, children ): an inventory element; `srcTag: 'dc-import'` marks a mount's host.
const E = ( tag, o = {}, kids = [] ) => ( { tag, o, kids } );
function inventory( root ) {
	const elements = [];
	let n = 0;
	const walk = ( node, parentKey, depth ) => {
		const id = ++n;
		const key = `Root/${ id }#0`;
		const words = node.o.words || '';
		const el = { key, parentKey, depth, tag: node.tag, template: 'Root', tpl: id, attrs: { ...( node.o.attrs || {} ), ...( node.o.style ? { style: node.o.style } : {} ) }, words, allText: words, membership: [], srcTag: node.o.srcTag || node.tag, srcOwnText: words,
			snippet: `<${ node.tag } data-dc-tpl="${ id }">${ words }</${ node.tag }>`,
			box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, node.o.box || { x: 0, y: 0, w: 200, h: 60 } ] ) ),
			visible: { 375: true, 768: true, 1440: true }, display: node.o.display || 'block', flexDirection: 'row', screenshots: {} };
		elements.push( el );
		const texts = node.kids.map( ( k ) => walk( k, key, depth + 1 ) );
		el.allText = [ words, ...texts ].filter( Boolean ).join( ' ' );
		return el.allText;
	};
	walk( root, null, 0 );
	return { checks: {}, source: 'fixture', root: root.tag, generated: 'fixture', elements };
}
const run = ( root, f = facts() ) => proposeSkeleton( { inventory: inventory( root ), facts: f, surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', built: null, motion: new Set(), db } );
const rowOf = ( r, key ) => r.proposal.rows.find( ( x ) => x.key === key );
const settled = ( x ) => ( x ? { block: x.block, action: x.action, rule: x.rule } : null );

// A section holding a row of two mounted link buttons: section(1) > div row(2) > host(3) > root div(4) > a(5), host(6) > root(7) > a(8).
const button = ( words, box ) => E( 'div', { srcTag: 'dc-import', attrs: { class: 'sc-host' }, box }, [ E( 'div', { style: 'display:flex', box }, [ E( 'a', { words, attrs: { href: '#build' }, style: 'display:flex;padding:0 30px;border-radius:999px;background:var(--yellow)', box } ) ] ) ] );
const hero = () => E( 'section', {}, [ E( 'div', { style: 'display:flex;gap:14px', box: { x: 0, y: 0, w: 600, h: 60 } }, [ button( 'Build your box', { x: 0, y: 0, w: 212, h: 60 } ), button( 'Send a gift', { x: 226, y: 0, w: 180, h: 60 } ) ] ) ] );

test( 'MUST FAIL: a mounted button\'s host and its component root go, and the link inside is the button it would be if drawn where it stands', () => {
	const r = run( hero() );
	for ( const key of [ 'Root/3#0', 'Root/4#0', 'Root/6#0', 'Root/7#0' ] ) {
		assert.deepEqual( settled( rowOf( r, key ) ), { block: null, action: 'unwrap', rule: 'mountWrapper' }, key );
	}
	assert.equal( rowOf( r, 'Root/5#0' ).block, 'sgs/button' );
	assert.equal( run( hero(), facts( 'mountWrapper' ) ).proposal.counts.skeletonNodes - r.proposal.counts.skeletonNodes, 4, 'one block fewer per wrapper' );
} );

test( 'MUST FAIL: without the rule each wrapper is a block of its own', () => {
	const r = run( hero(), facts( 'mountWrapper' ) );
	assert.ok( [ 'Root/3#0', 'Root/4#0' ].every( ( k ) => 'unwrap' !== rowOf( r, k ).action ) );
} );

test( 'negative control: a component root wider than its one child (a button that does not fill its row) stays, as does a host with a style of its own', () => {
	const wide = E( 'section', {}, [
		E( 'div', { srcTag: 'dc-import', attrs: { class: 'sc-host' }, box: { x: 0, y: 0, w: 631, h: 60 } }, [ E( 'div', { style: 'display:flex', box: { x: 0, y: 0, w: 631, h: 60 } }, [ E( 'button', { words: 'Send message', attrs: { type: 'submit' }, box: { x: 0, y: 0, w: 220, h: 60 } } ) ] ) ] ),
		E( 'div', { srcTag: 'dc-import', attrs: { class: 'sc-host' }, style: 'position:sticky;top:0', box: { x: 0, y: 80, w: 300, h: 60 } }, [ E( 'div', { box: { x: 0, y: 80, w: 300, h: 60 } }, [ E( 'a', { words: 'Sticky', attrs: { href: '/top' }, box: { x: 0, y: 80, w: 300, h: 60 } } ) ] ) ] ),
	] );
	const r = run( wide );
	assert.deepEqual( settled( rowOf( r, 'Root/2#0' ) ), { block: null, action: 'unwrap', rule: 'mountWrapper' }, 'the host matches its root, so it goes' );
	assert.notEqual( rowOf( r, 'Root/3#0' ).rule, 'mountWrapper', 'the root is wider than the button it holds' );
	assert.notEqual( rowOf( r, 'Root/5#0' ).rule, 'mountWrapper', 'a host declaring position stays' );
	assert.equal( rowOf( r, 'Root/6#0' ).rule, 'mountWrapper', 'the root inside that host is still neutral' );
} );

test( 'negative control: an ordinary wrapper of the same box that no mount stamped is not this rule\'s', () => {
	const r = run( E( 'section', {}, [ E( 'div', { style: 'display:flex' }, [ E( 'a', { words: 'Shop', attrs: { href: '/shop' } } ) ] ) ] ) );
	assert.notEqual( rowOf( r, 'Root/2#0' ).rule, 'mountWrapper' );
} );

test( 'negative control: a mounted component that is more than one control (a form, a card) keeps its wrappers, so an old-shape mount is proposed as before', () => {
	const box = { x: 0, y: 0, w: 600, h: 400 };
	const r = run( E( 'section', {}, [ E( 'div', { srcTag: 'dc-import', attrs: { class: 'sc-host' }, box }, [ E( 'div', { style: 'display:flex', box }, [ E( 'div', { box }, [ E( 'h2', { words: 'Enquiry' } ), E( 'p', { words: 'We reply within a day' } ) ] ) ] ) ] ) ] ) );
	assert.ok( [ 'Root/2#0', 'Root/3#0' ].every( ( k ) => 'mountWrapper' !== rowOf( r, k ).rule ) );
} );
