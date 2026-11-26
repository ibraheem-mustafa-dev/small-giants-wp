// The shop's category chips are the shop's category filter (rules.optionSetFilter.categoryFilter): on a WooCommerce shop template, a
// row of chips whose choice narrows the product listing's loop and whose labels are the catalogue's categories is WooCommerce's
// taxonomy filter for product_cat in the chips display style, read at the draft's chip row; anywhere else the row stays the option
// picker with the filter hand-over. Each test fails on the code before the rule (the row was an option picker).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
const db = openDb();
const SHOP = { role: 'shop', checkout: null, filters: { facets: [], brands: [], categories: [ 'Zookies', 'Vegan', 'Gifts' ] } };
// `off` names a rule, or `rule.entry` for one entry of a rule, to remove from a copy of the decisions.
const facts = ( repo, ...off ) => {
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	off.forEach( ( id ) => ( id.includes( '.' ) ? delete f.decisions.rules[ id.split( '.' )[ 0 ] ][ id.split( '.' )[ 1 ] ] : delete f.decisions.rules[ id ] ) );
	return { ...f, repo };
};

// N( tag, { attrs, words, loop (true, or the loop list's name) }, kids ) in the inventory's shape with its fact record.
const N = ( tag, o = {}, kids = [] ) => ( { tag, o, kids } );
function build( root ) {
	const elements = [];
	const recs = {};
	let n = 0;
	const walk = ( node, parentKey, depth, chain ) => {
		const id = ++n;
		const key = `Root/${ id }#0`;
		const tk = `Root/${ id }`;
		const words = node.o.words || '';
		const el = { key, parentKey, depth, tag: node.tag, template: 'Root', tpl: id, attrs: node.o.attrs || {}, words, allText: words, membership: [], srcTag: node.tag, srcOwnText: words, snippet: `<${ node.tag } data-dc-tpl="${ id }">${ words }</${ node.tag }>`,
			box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 0, y: id * 30, w: 100, h: 20 } ] ) ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} };
		elements.push( el );
		const parentTk = parentKey ? parentKey.replace( /#0$/, '' ) : null;
		const list = node.o.loop ? ( true === node.o.loop ? 'xs' : node.o.loop ) : null;
		list && ( recs[ `Root/f${ id }` ] = record( `Root/f${ id }`, 'sc-for', {}, parentTk, parentTk, [], chain ) );
		recs[ tk ] = record( tk, node.tag, node.o.attrs || {}, list ? `Root/f${ id }` : parentTk, parentTk, list ? [ { key: `Root/f${ id }`, list: `{{ ${ list } }}`, as: 'x' } ] : [], chain );
		const texts = node.kids.map( ( k ) => walk( k, key, depth + 1, [ tk, ...chain ] ) );
		el.allText = [ words, ...texts ].filter( Boolean ).join( ' ' );
		return el.allText;
	};
	walk( root, null, 0, [] );
	return { inventory: { checks: {}, source: 'fixture', root: root.tag, generated: 'fixture', elements }, recs };
}
function record( key, realTag, attrs, parent, realParent, scFor, chain ) {
	return {
		template: { key, component: 'Root', n: key.split( '/' ).pop(), tag: realTag, realTag, attrs, style: { static: [], holes: [] }, pseudo: {}, holes: [], parent, realParent, parentChain: chain,
			membership: { scIf: [], scFor, dcImport: [] }, own: {}, inHelmet: false, inFor: !! scFor.length, ref: null, hooks: {}, events: [], words: '', srcLine: 1 },
		logic: { holes: {} }, surfaces: [], instances: [], fingerprint: {},
	};
}

// A temp repo holding the client's draft `Root.dc.html` whose logic is `logic`; returns { repo, hash }.
function draftRepo( logic ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'shopcat-' ) );
	const dir = path.join( repo, 'sites', 'fixture-client', 'handoff' );
	fs.mkdirSync( dir, { recursive: true } );
	const text = `<x-dc name="Root"><div></div></x-dc>\n<script data-dc-script>\n${ logic }\n</script>\n`;
	fs.writeFileSync( path.join( dir, 'Root.dc.html' ), text );
	return { repo, hash: crypto.createHash( 'sha256' ).update( text ).digest( 'hex' ) };
}
// The chips loop `chips` and write the `filter` state key the list `shown` is filtered by; `list` is another list of the component.
const LOGIC = ( list ) => `class Component {
	state = { filter: 'all' };
	renderVals() {
		const { filter } = this.state;
		const all = [ 'a', 'b' ];
		const shown = all.filter( ( p ) => 'all' === filter || p === filter );
		return {
			chips: [ 'a', 'b' ].map( ( id ) => ( { pick: () => this.setState( { filter: id } ) } ) ),
			shown: shown.map( ( p ) => p ),
			${ list }: [ 1, 2 ],
		};
	}
}`;

// The listing's items are members of one loop and each holds an element of another component (a mounted card).
const run = ( root, o = {} ) => {
	const b = build( root );
	b.inventory.elements.filter( ( e ) => 'li' === e.tag ).forEach( ( li ) => {
		li.membership = [ { kind: 'sc-for', tpl: 'cards' } ];
		b.inventory.elements.filter( ( k ) => k.parentKey === li.key ).forEach( ( k ) => ( k.template = 'Card' ) );
	} );
	const draft = draftRepo( o.logic );
	const rec = { schema: '1', client: 'fixture-client', elements: b.recs, surfaces: {}, sources: { files: { 'Root.dc.html': draft.hash } } };
	return proposeSkeleton( { inventory: b.inventory, facts: facts( draft.repo, ...( o.off || [] ) ), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', motion: new Set(), db, factRecord: rec, openers: {}, commerce: undefined === o.commerce ? SHOP : o.commerce } );
};
const rows = ( r ) => r.proposal.rows;
const cat = ( words, count ) => N( 'button', { loop: 'chips', attrs: { 'aria-pressed': '{{ x.on }}' }, words }, count ? [ N( 'span', { words: count } ) ] : [] );
const chipRow = ( labels, counted ) => N( 'div', { attrs: { id: 'chips' } }, labels.map( ( l, i ) => cat( l, counted ? String( i + 1 ) : '' ) ) );
const card = ( list ) => N( 'li', { loop: list, words: '£9.50' }, [ N( 'span', { words: 'Zookies' } ) ] );
// The chip row above a listing of two cards looping `list`.
const page = ( chips, list = 'shown', ...more ) => N( 'section', {}, [ chips, N( 'ul', {}, [ card( list ), card( list ) ] ), ...more ] );
const picked = ( r ) => rows( r ).find( ( x ) => 'div' === x.tag && 1 === x.depth );
const node = ( r, name ) => {
	const walk = ( l ) => l.flatMap( ( n ) => [ n, ...walk( n.innerBlocks || [] ) ] );
	return walk( r.skeleton ).find( ( n ) => n.name === name );
};
const LABELS = [ 'All', 'Zookies', 'Vegan', 'Gifts' ];

test( 'shop category chips: chips narrowing the shop listing by the catalogue categories are the product_cat filter in the chips style, read at the chip row, with counts only when the chips show a number; MUST FAIL on the old rule (an option picker with a hand-over)', () => {
	const r = run( page( chipRow( LABELS, true ) ), { logic: LOGIC( 'other' ) } );
	const g = picked( r );
	assert.deepEqual( [ g.block, g.rule, g.handover ], [ 'woocommerce/product-filters', 'optionSetFilter', undefined ] );
	const n = node( r, 'woocommerce/product-filter-taxonomy' );
	assert.deepEqual( n.attributes, { taxonomy: 'product_cat', displayStyle: 'woocommerce/product-filter-chips', showCounts: true } );
	assert.deepEqual( n.innerBlocks.map( ( x ) => x.name ), [ 'woocommerce/product-filter-chips' ] );
	assert.equal( n.draftRef.tpl, g.key, 'its paint is read at the chip row' );
	// RF7: the taxonomy filter sits in WooCommerce's product-filters wrapper (overlay off), which reads nothing from the draft.
	const wrapper = node( r, 'woocommerce/product-filters' );
	assert.deepEqual( [ wrapper.attributes, wrapper.innerBlocks.map( ( x ) => x.name ), wrapper.draftRef ], [ { overlayMode: 'off' }, [ 'woocommerce/product-filter-taxonomy' ], undefined ] );
	assert.equal( node( r, 'sgs/option-picker' ), undefined );
	assert.ok( rows( r ).filter( ( x ) => 'button' === x.tag ).every( ( x ) => 'absorbed' === x.action && x.into === g.key ), 'the chips are the filter\'s own' );
	// Chips that show no number give showCounts false.
	const plain = node( run( page( chipRow( LABELS, false ) ), { logic: LOGIC( 'other' ) } ), 'woocommerce/product-filter-taxonomy' );
	assert.equal( plain.attributes.showCounts, false );
} );

test( 'NEGATIVE shop category chips: another surface, labels that are not the categories, a list that is not the listing\'s and the entry removed keep the option picker and its hand-over', () => {
	const kept = ( r ) => [ picked( r ).block, picked( r ).rule, !! picked( r ).handover ];
	const PICKER = [ 'sgs/option-picker', 'optionSetFilter', true ];
	const on = { logic: LOGIC( 'other' ) };
	assert.deepEqual( kept( run( page( chipRow( LABELS, true ) ), { ...on, commerce: null } ) ), PICKER, 'a surface with no commerce role (Gifts, Help)' );
	assert.deepEqual( kept( run( page( chipRow( LABELS, true ) ), { ...on, commerce: { role: 'cart', checkout: null } } ) ), PICKER, 'a commerce role that is not the shop' );
	assert.deepEqual( kept( run( page( chipRow( [ 'All', 'Red', 'Blue', 'Green' ], true ) ), on ) ), PICKER, 'chips that are not the catalogue\'s categories' );
	assert.deepEqual( kept( run( page( chipRow( [ 'All', 'Zookies', 'Red', 'Blue' ], true ) ), on ) ), PICKER, 'one category among several others' );
	assert.deepEqual( kept( run( page( chipRow( LABELS, true ), 'cards', N( 'p', { loop: 'shown', words: 'note' } ) ), { logic: LOGIC( 'cards' ) } ) ), PICKER, 'the chips narrow "shown", which a note iterates and no listing item does' );
	assert.deepEqual( kept( run( page( chipRow( LABELS, true ) ), { ...on, off: [ 'optionSetFilter.categoryFilter' ] } ) ), PICKER, 'the entry removed' );
} );
