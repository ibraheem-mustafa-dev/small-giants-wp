// The option-set standing rules split by universal signals (Spec 48 FR-48-6): a group of pressable chips inside a form element
// is that form's tiles field (optionSetForm); one whose choice narrows a list of the same component stays the option picker
// and carries the filter hand-over (optionSetFilter, read from the draft's logic syntax tree); any other is the option picker
// (optionSet). Each rule MUST FAIL with its decisions entry removed; each has negative fixtures proving where it must not fire.
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
import { narrowedLists } from '../lib/skeleton-narrowing.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
const db = openDb();
const facts = ( repo, ...off ) => {
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	off.forEach( ( id ) => delete f.decisions.rules[ id ] );
	return { ...f, repo };
};

// N( tag, { attrs, words, loop (true, or the loop list's name), real }, kids ) in the inventory's shape with its fact record.
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
		recs[ tk ] = record( tk, node.o.real || node.tag, node.o.attrs || {}, list ? `Root/f${ id }` : parentTk, parentTk, list ? [ { key: `Root/f${ id }`, list: `{{ ${ list } }}`, as: 'x' } ] : [], chain );
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
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'optset-' ) );
	const dir = path.join( repo, 'sites', 'fixture-client', 'handoff' );
	fs.mkdirSync( dir, { recursive: true } );
	const text = `<x-dc name="Root"><div></div></x-dc>\n<script data-dc-script>\n${ logic }\n</script>\n`;
	fs.writeFileSync( path.join( dir, 'Root.dc.html' ), text );
	return { repo, hash: crypto.createHash( 'sha256' ).update( text ).digest( 'hex' ) };
}
const LOGIC = ( o = {} ) => `class Component {
	state = { filter: 'all', other: 1 };
	renderVals() {
		const { filter } = this.state;
		const all = [ 'a', 'b' ];
		const shown = all.filter( ( p ) => 'all' === filter || p === filter );
		return {
			chips: [ 'a', 'b' ].map( ( id ) => ( { pick: () => this.setState( ${ o.write ?? '{ filter: id }' } ) } ) ),
			shown: ${ o.shown ?? 'shown.map( ( p ) => p )' },
		};
	}
}`;

const chip = ( words ) => N( 'button', { attrs: { 'aria-pressed': 'false' }, words } );
const chips = () => N( 'div', {}, [ chip( 'A' ), chip( 'B' ) ] );
const item = ( list ) => N( 'li', { loop: list, words: 'item' } );
const run = ( root, o = {} ) => {
	const b = build( root );
	const draft = o.logic ? draftRepo( o.logic ) : { repo: REPO, hash: '' };
	const rec = { schema: '1', client: 'fixture-client', elements: b.recs, surfaces: {}, sources: { files: { 'Root.dc.html': o.hash ?? draft.hash } } };
	return proposeSkeleton( { inventory: b.inventory, facts: facts( draft.repo, ...( o.off || [] ) ), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', motion: new Set(), db, factRecord: rec, openers: {} } );
};
const rows = ( r ) => r.proposal.rows;
const group = ( r ) => rows( r ).find( ( x ) => 'div' === x.tag && 1 === x.depth ) ?? rows( r ).find( ( x ) => 'div' === x.tag );
const inForm = ( inner ) => N( 'section', {}, [ N( 'form', {}, [ inner ] ) ] );
const chipLoop = () => N( 'div', {}, [ N( 'button', { loop: 'chips', attrs: { 'aria-pressed': '{{ x.on }}' }, words: 'A' } ) ] );
const withList = ( inner ) => N( 'section', {}, [ inner, N( 'ul', {}, [ item( 'shown' ) ] ) ] );
const FILTER = { owner: 'site-build', kind: 'filter', detail: 'the choice narrows a list on this page: wire it to the list\'s filter' };

test( 'optionSetForm: a group of pressable chips inside a form element is the tiles field that absorbs its chips; MUST FAIL without the entry', () => {
	const r = run( inForm( chips() ) );
	assert.deepEqual( [ group( r ).block, group( r ).rule ], [ 'sgs/form-field-tiles', 'optionSetForm' ] );
	assert.ok( rows( r ).filter( ( x ) => 'button' === x.tag ).every( ( x ) => 'absorbed' === x.action && x.into === group( r ).key ), 'the chips are the field\'s' );
	const off = run( inForm( chips() ), { off: [ 'optionSetForm' ] } );
	assert.deepEqual( [ group( off ).block, group( off ).rule ], [ 'sgs/option-picker', 'optionSet' ] );
	assert.deepEqual( [ group( run( inForm( chipLoop() ) ) ).block, group( run( inForm( chipLoop() ) ) ).rule ], [ 'sgs/form-field-tiles', 'optionSetForm' ], 'a loop of chips in a form is one too' );
} );

test( 'NEGATIVE optionSetForm: a form group that is not a toggle-chip group, and a chip group outside a form, are not tiles', () => {
	const plain = N( 'div', {}, [ N( 'button', { words: 'A' } ), N( 'button', { words: 'B' } ) ] );
	assert.ok( rows( run( inForm( plain ) ) ).every( ( x ) => ! /^optionSet/.test( x.rule || '' ) ), 'buttons with no pressed state in a form are untouched' );
	const disclosure = N( 'div', {}, [ N( 'button', { attrs: { 'aria-expanded': 'false' }, words: 'A' } ), N( 'button', { attrs: { 'aria-expanded': 'false' }, words: 'B' } ) ] );
	assert.ok( rows( run( inForm( disclosure ) ) ).every( ( x ) => ! /^optionSet/.test( x.rule || '' ) ), 'disclosure buttons in a form are untouched' );
	const out = run( N( 'section', {}, [ chips() ] ) );
	assert.deepEqual( [ group( out ).block, group( out ).rule ], [ 'sgs/option-picker', 'optionSet' ], 'outside a form it stays the option picker' );
	const label = run( N( 'section', {}, [ N( 'label', {}, [ chips() ] ) ] ) );
	assert.equal( group( label ).block, 'sgs/option-picker', 'a label is not a form element' );
} );

test( 'optionSetFilter: chips whose handlers write a state key another list is filtered by stay the option picker and carry the filter hand-over; MUST FAIL without the entry', () => {
	const r = run( withList( chipLoop() ), { logic: LOGIC() } );
	assert.deepEqual( [ group( r ).block, group( r ).rule ], [ 'sgs/option-picker', 'optionSetFilter' ] );
	assert.deepEqual( group( r ).handover, FILTER );
	const off = run( withList( chipLoop() ), { logic: LOGIC(), off: [ 'optionSetFilter' ] } );
	assert.deepEqual( [ group( off ).block, group( off ).rule, group( off ).handover ], [ 'sgs/option-picker', 'optionSet', undefined ] );
} );

test( 'NEGATIVE optionSetFilter: no filtered list, no shared key, a computed key, an unreached list, a changed draft or static chips narrow nothing', () => {
	const plain = ( o ) => {
		const g = group( run( withList( chipLoop() ), o ) );
		return [ g.rule, g.handover ];
	};
	assert.deepEqual( plain( { logic: LOGIC( { write: '{ other: id }' } ) } ), [ 'optionSet', undefined ], 'the handlers write a key no filter reads' );
	assert.deepEqual( plain( { logic: LOGIC( { write: '{ [ id ]: 1 }' } ) } ), [ 'optionSet', undefined ], 'a computed key is unknown' );
	assert.deepEqual( plain( { logic: LOGIC( { shown: '[ 1, 2 ]' } ) } ), [ 'optionSet', undefined ], 'a list no filter produces' );
	assert.deepEqual( plain( { logic: LOGIC(), hash: 'stale' } ), [ 'optionSet', undefined ], 'a draft that is not the record\'s' );
	assert.deepEqual( [ group( run( N( 'section', {}, [ chipLoop(), N( 'ul', {}, [ item( 'other' ) ] ) ] ), { logic: LOGIC() } ) ).rule ], [ 'optionSet' ], 'the filtered list is iterated by no sc-for' );
	const stat = group( run( withList( N( 'div', {}, [ chip( 'A' ), chip( 'B' ) ] ) ), { logic: LOGIC() } ) );
	assert.deepEqual( [ stat.rule, stat.handover ], [ 'optionSet', undefined ], 'static chips name no loop list' );
	const form = group( run( withList( inForm( chipLoop() ) ), { logic: LOGIC() } ) );
	assert.equal( form.rule, 'optionSetForm', 'inside a form the field wins over the filter hand-over' );
} );

test( 'narrowedLists: the draft\'s filtered lists read through a local variable, a map chain and a state alias', () => {
	const { repo, hash } = draftRepo( LOGIC() );
	const at = ( listKey, component = 'Root' ) => narrowedLists( { folder: path.join( repo, 'sites', 'fixture-client', 'handoff' ), record: { sources: { files: { 'Root.dc.html': hash } } }, component, listKey } );
	assert.deepEqual( at( 'chips' ), [ 'shown' ] );
	assert.deepEqual( at( 'shown' ), [], 'a list that writes no state narrows nothing' );
	assert.deepEqual( at( 'chips', 'Missing' ), [], 'a component with no draft file' );
	const self = draftRepo( LOGIC().replace( "chips: [ 'a', 'b' ].map(", "chips: [ 'a', 'b' ].filter( ( p ) => p !== filter ).map(" ) );
	assert.deepEqual( narrowedLists( { folder: path.join( self.repo, 'sites', 'fixture-client', 'handoff' ), record: { sources: { files: { 'Root.dc.html': self.hash } } }, component: 'Root', listKey: 'chips' } ), [ 'shown' ], "a chip group's own list is never the one it narrows" );
	const alias = draftRepo( LOGIC().replace( 'const { filter } = this.state;', 'const S = this.state;' ).replace( "'all' === filter || p === filter", "'all' === S.filter" ) );
	assert.deepEqual( narrowedLists( { folder: path.join( alias.repo, 'sites', 'fixture-client', 'handoff' ), record: { sources: { files: { 'Root.dc.html': alias.hash } } }, component: 'Root', listKey: 'chips' } ), [ 'shown' ], 'an alias of this.state' );
} );

test( 'optionSet: a group outside any form that narrows nothing is the option picker', () => {
	const r = run( N( 'section', {}, [ chips() ] ) );
	assert.deepEqual( [ group( r ).block, group( r ).rule, group( r ).handover ], [ 'sgs/option-picker', 'optionSet', undefined ] );
	assert.equal( group( run( N( 'section', {}, [ chips() ] ), { off: [ 'optionSet' ] } ) ).rule === 'optionSet', false, 'MUST FAIL without the entry' );
} );
