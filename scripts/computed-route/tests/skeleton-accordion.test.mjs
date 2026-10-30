// A loop of disclosures is an accordion (Spec 48 §3.4, the `accordion` standing rule, RC6, lib/skeleton-accordion.mjs): a loop
// whose items each hold a control writing a state the item's own conditional panel reads, read from the fact record and the
// logic's syntax tree with aria-expanded as the rendered confirmation, is sgs/accordion with one sgs/accordion-item per item,
// its title the control's words and its content the panel's text per copy. MUST FAIL on Mama's home FAQ (the committed draft
// Home.dc.html, its saved inventory and fact record: tests/fixtures/skeleton-accordion/home-faq.json); negative controls on
// small drafts written for the test: a loop of controls opening a drawer and a static loop are no accordion.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeFixture } from './fixtures/fixture-facts.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
const db = openDb();
const FAQ = JSON.parse( fs.readFileSync( path.join( HERE, 'fixtures', 'skeleton-accordion', 'home-faq.json' ), 'utf8' ) );
const hashOf = ( file ) => crypto.createHash( 'sha256' ).update( fs.readFileSync( file ) ).digest( 'hex' );
const flat = ( nodes ) => nodes.flatMap( ( n ) => [ n, ...flat( n.innerBlocks || [] ) ] );

// The FAQ section proposed as the surface, against the client's draft folder in `repo` (its `Home.dc.html` hashed).
function propose( { repo = REPO, client = 'mamas-munches-redesign', inventory = FAQ.inventory, record = FAQ.record, edit = null } = {} ) {
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	edit && edit( f.decisions.rules );
	const sources = { files: { 'Home.dc.html': hashOf( path.join( repo, 'sites', client, 'handoff', 'Home.dc.html' ) ) } };
	const root = { ...inventory, elements: inventory.elements.map( ( e, i ) => ( 0 === i ? { ...e, parentKey: null } : e ) ) };
	return proposeFixture( { inventory: root, facts: { ...f, repo, client }, surface: 'fixture', surfaceKind: 'page', surfaceName: 'Home', db, rootComponent: 'Home', factRecord: { schema: '1', client, elements: record, surfaces: {}, sources } } );
}

// A copy of the client's draft folder in a temp repo, its Home.dc.html logic changed by `edit` (text in, text out).
function draftRepo( edit ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'accordion-' ) );
	const dir = path.join( repo, 'sites', 'fixture-client', 'handoff' );
	fs.mkdirSync( dir, { recursive: true } );
	const text = fs.readFileSync( path.join( REPO, 'sites', 'mamas-munches-redesign', 'handoff', 'Home.dc.html' ), 'utf8' );
	const changed = edit( text );
	assert.notEqual( changed, text, 'the edit changes the draft' );
	fs.writeFileSync( path.join( dir, 'Home.dc.html' ), changed );
	return { repo, client: 'fixture-client' };
}
const recordWith = ( key, change ) => {
	const record = structuredClone( FAQ.record );
	change( record[ key ].template );
	return record;
};
const accordionOf = ( r ) => flat( r.skeleton ).find( ( n ) => 'sgs/accordion' === n.name ) ?? null;
const rowOf = ( r, key ) => r.proposal.rows.find( ( x ) => x.key === key );

test( 'MUST FAIL: Mama\'s home FAQ is sgs/accordion with one item per question, each holding its own answer, one open at a time and the first open at rest', () => {
	const r = propose();
	const acc = accordionOf( r );
	assert.ok( acc, 'the FAQ loop is an accordion' );
	assert.equal( rowOf( r, 'Root/243#0' ).rule, 'accordion' );
	assert.deepEqual( [ acc.attributes.allowMultiple, acc.attributes.defaultOpen ], [ false, 0 ], 'faq holds one open index, 0 at rest' );
	assert.deepEqual( acc.innerBlocks.map( ( n ) => n.name ), Array( 4 ).fill( 'sgs/accordion-item' ) );
	assert.deepEqual( acc.innerBlocks.map( ( n ) => n.attributes.title ), [ 'When will my order arrive?', 'Are they OK to eat while breastfeeding?', 'How does Subscribe & save work?', 'What allergens do they contain?' ] );
	assert.deepEqual( acc.innerBlocks.map( ( n ) => true === n.attributes.isOpen ), [ true, false, false, false ] );
	const answers = acc.innerBlocks.map( ( n ) => n.innerBlocks.map( ( k ) => [ k.name, k.attributes.text ] ) );
	assert.deepEqual( answers.map( ( a ) => a.length ), [ 1, 1, 1, 1 ], 'every item holds its answer, the closed ones too' );
	assert.ok( answers.every( ( a ) => 'sgs/text' === a[ 0 ][ 0 ] ) );
	assert.match( answers[ 0 ][ 0 ][ 1 ], /^Zainab bakes every order fresh/ );
	assert.match( answers[ 1 ][ 0 ][ 1 ], /^They’re made from everyday food ingredients/, 'a closed item\'s answer comes from the code, copy by copy' );
	assert.match( answers[ 3 ][ 0 ][ 1 ], /^Oats \(gluten\)/ );
	assert.ok( acc.innerBlocks.every( ( n ) => n.innerBlocks[ 0 ].draftRef ), 'each answer reads the draft\'s rendered answer for its look' );
	assert.deepEqual( [ 'Root/246#1', 'Root/247#1', 'Root/249#0' ].map( ( k ) => [ rowOf( r, k ).action, rowOf( r, k ).rule ] ), Array( 3 ).fill( [ 'absorbed', 'accordionItem' ] ), 'the question button, its glyph and the answer are the item\'s own' );
	const off = propose( { edit: ( rules ) => delete rules.accordion } );
	assert.equal( accordionOf( off ), null, 'the rule is switched on by its decisions entry' );
} );

test( 'several open at once where the panel\'s field reads a list, and the code\'s initial state (not the render) names the item open at rest', () => {
	const multi = propose( draftRepo( ( t ) => t.replace( 'const open = S.faq === i', 'const open = S.faq.includes( i )' ).replace( 'faq: 0, base', 'faq: [ 2 ], base' ) ) );
	const acc = accordionOf( multi );
	assert.equal( acc.attributes.allowMultiple, true );
	assert.equal( acc.attributes.defaultOpen, undefined );
	assert.deepEqual( acc.innerBlocks.map( ( n ) => true === n.attributes.isOpen ), [ false, false, true, false ] );
	const third = accordionOf( propose( draftRepo( ( t ) => t.replace( 'faq: 0, base', 'faq: 2, base' ) ) ) );
	assert.deepEqual( [ third.attributes.allowMultiple, third.attributes.defaultOpen ], [ false, 2 ] );
} );

test( 'negative controls: a control opening a state the item\'s panel never reads (a drawer), a loop with no control, a control the render does not confirm; a holder holding more than the loop keeps that content beside one accordion', () => {
	assert.equal( accordionOf( propose( draftRepo( ( t ) => t.replace( 'toggle: () => this.setState({ faq: open ? -1 : i })', 'toggle: () => this.setState({ menuOpen: true })' ) ) ) ), null, 'a drawer opener' );
	const still = { ...FAQ.inventory, elements: FAQ.inventory.elements.map( ( e ) => ( { ...e, snippet: String( e.snippet ).replace( ' sc-camel-on-click="{{ f.toggle }}"', '' ) } ) ) };
	assert.ok( still.elements.some( ( e, i ) => e.snippet !== FAQ.inventory.elements[ i ].snippet ) );
	assert.equal( accordionOf( propose( { inventory: still, record: recordWith( 'Home/246', ( t ) => {
		t.events = [];
		delete t.attrs.onClick;
	} ) } ) ), null, 'a static list' );
	const unconfirmed = { ...FAQ.inventory, elements: FAQ.inventory.elements.map( ( e ) => ( { ...e, snippet: String( e.snippet ).replace( ' aria-expanded="{{ f.open }}"', '' ) } ) ) };
	assert.ok( unconfirmed.elements.some( ( e, i ) => e.snippet !== FAQ.inventory.elements[ i ].snippet ) );
	assert.equal( accordionOf( propose( { inventory: unconfirmed, record: recordWith( 'Home/246', ( t ) => delete t.attrs[ 'aria-expanded' ] ) } ) ), null, 'no aria-expanded' );
	const extra = { ...FAQ.inventory.elements.find( ( e ) => 'Root/241#0' === e.key ), key: 'Root/241#1', parentKey: 'Root/243#0', membership: [] };
	const beside = propose( { inventory: { ...FAQ.inventory, elements: [ ...FAQ.inventory.elements, extra ] } } );
	const acc = accordionOf( beside );
	assert.ok( acc, 'the items are still one accordion' );
	assert.notEqual( rowOf( beside, 'Root/243#0' ).rule, 'accordion', 'a holder with a paragraph beside its items is not the accordion' );
	assert.equal( acc.innerBlocks.length, 4, 'the accordion holds the items only' );
	assert.equal( rowOf( beside, 'Root/241#1' ).action, null, 'the paragraph stays its own block beside the accordion' );
} );
