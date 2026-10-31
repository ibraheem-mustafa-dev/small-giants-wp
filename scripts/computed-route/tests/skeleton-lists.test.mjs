// A list is a stacked run of rows that each hold one piece of text with at most one leading marker (Spec 48 §3.4, FR-48-6,
// root R1; lib/skeleton-write-units.mjs `itemRun`): whatever its tags it is ONE list unit placed as the framework DB's list
// block (the tag map's `ul` block), its marker type and number style from the block's own enums, each item the row's text
// with the marker left out; a `ul` or `ol` element's implied `list` role ranks that block in the identity matcher.
// MUST FAIL on slices of the saved inventories (tests/fixtures/skeleton-lists/*.json, read against the committed drafts):
// Eye Care's typed-ordinal steps (`ol` of `li` = `<span>1</span>` + own words, and `ol` of `li` = number span + text span),
// its plain `ul` feature lists, Indus's dot rows in a grid and its `01`-numbered terms index. Negative controls: Mama's
// checklist rows (a marker plus a title and a description) stay containers; stacked paragraphs with no marker outside a
// `ul`/`ol`, rows holding a control (form rows, buttons) and a card grid are never lists.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { proposeFixture } from './fixtures/fixture-facts.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
const db = openDb();
const fixture = ( dir, name ) => JSON.parse( fs.readFileSync( path.join( HERE, 'fixtures', dir, `${ name }.json` ), 'utf8' ) );
const hashOf = ( file ) => crypto.createHash( 'sha256' ).update( fs.readFileSync( file ) ).digest( 'hex' );
const flat = ( nodes ) => nodes.flatMap( ( n ) => [ n, ...flat( n.innerBlocks || [] ) ] );
function propose( fix ) {
	const facts = loadFacts( { db, client: fix.client, repo: REPO } );
	const sources = { files: { [ fix.draft ]: hashOf( path.join( REPO, 'sites', fix.client, 'handoff', fix.draft ) ) } };
	return proposeSkeleton( { inventory: fix.inventory, facts, surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', db, rootComponent: fix.inventory.checks.rootName, factRecord: { schema: '1', client: fix.client, elements: fix.record, surfaces: {}, sources } } );
}
const LIST = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO } ).listSlug;
const lists = ( r ) => flat( r.skeleton ).filter( ( n ) => n.name === LIST );
const rowOf = ( r, key ) => r.proposal.rows.find( ( x ) => x.key === key );
const EC = 'Eye Care Birmingham';
const IN = 'Indus Foods Website v2';

for ( const [ name, holder, marker, format, first ] of [
	[ 'ec-steps', `${ EC }/222#0`, 'numbered', 'decimal', 'Pick a frame, then' ],
	[ 'ec-lens-steps', `${ EC }/583#0`, 'numbered', 'decimal', 'Choose a frame and tap' ],
	[ 'ec-features', `${ EC }/422#0`, 'none', null, 'Pilot shape in Metal' ],
	[ 'ec-lens-list', `${ EC }/574#0`, 'none', null, 'UV400 protection' ],
	[ 'indus-dots', `${ IN }/388#0`, 'bullet', null, 'Dried herbs' ],
	[ 'indus-terms', `${ IN }/643#0`, 'numbered', 'decimal-leading-zero', 'Trade accounts' ],
] ) {
	test( `MUST FAIL: ${ name } (${ holder }) is one ${ LIST } with marker ${ marker }${ format ? ` (${ format })` : '' }, each item its text without the marker`, () => {
		const r = propose( fixture( 'skeleton-lists', name ) );
		const [ list, ...more ] = lists( r );
		assert.ok( list, 'the rows are one list block' );
		assert.equal( more.length, 0, 'one list, not one per row' );
		assert.equal( rowOf( r, holder ).action, 'unwrap', 'the holder is the list itself (a bare wrapper of one list)' );
		assert.equal( list.attributes.markerType, marker );
		format ? assert.equal( list.attributes.numberFormat, format ) : assert.equal( list.attributes.numberFormat, undefined );
		assert.ok( list.attributes.items.length >= 2 );
		assert.ok( String( list.attributes.items[ 0 ].text ).startsWith( first ), `item 1 is "${ first }…", got "${ list.attributes.items[ 0 ].text }"` );
		assert.ok( list.attributes.items.every( ( it ) => ! /^\(?\d{1,3}[.)]?\s/.test( String( it.text ) ) ), 'no item repeats its typed number' );
	} );
}

test( 'negative control: Mama\'s checklist rows (a marker, a title and a description) stay containers', () => {
	const r = propose( fixture( 'skeleton-lists', 'mama-checklist' ) );
	assert.equal( lists( r ).length, 0 );
	assert.equal( rowOf( r, 'Home/168#0' ).block, 'sgs/container' );
} );

test( 'negative control: a frame-card grid and a button row are never lists', () => {
	for ( const [ name, key ] of [ [ 'ec-cards', `${ EC }/539#0` ], [ 'ec-google', `${ EC }/185#0` ] ] ) {
		const fix = fixture( 'skeleton-identity', name );
		const r = propose( fix );
		assert.ok( ! lists( r ).some( ( n ) => n.draftRef && rowOf( r, key ) && 'unwrap' === rowOf( r, key ).action ), `${ name }: ${ key } stays` );
		assert.notEqual( rowOf( r, key )?.action, 'unwrap' );
	}
} );

// ---- synthetic rows ----
const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w = 300, h = 24 ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const el = ( key, parentKey, tag, words = '', x = {} ) => {
	const attrs = x.attrs || {};
	const own = Object.entries( attrs ).map( ( [ k, v ] ) => ` ${ k }="${ v }"` ).join( '' );
	return { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag }${ own } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || place( 0, 100 ), visible: { 375: true, 768: true, 1440: true }, display: x.display || 'block', flexDirection: 'row', screenshots: {} };
};
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const run = ( elements ) => proposeFixture( { inventory: inv( elements ), facts: loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } ), surface: 'test', surfaceKind: 'page', db } );

test( 'MUST FAIL: rows of an emoji or a glyph marker and one text are a list of that marker; a roman ordinal is numbered, its style written only where the block\'s enum holds it', () => {
	const styles = JSON.parse( db.prepare( "SELECT enum_values FROM block_attributes WHERE block_slug = ? AND attr_name = 'numberFormat'" ).get( LIST )?.enum_values ?? '[]' );
	for ( const [ marks, kind, format ] of [ [ [ '🍪', '🍪', '🍪' ], 'emoji', null ], [ [ 'i.', 'ii.', 'iii.' ], 'numbered', 'lower-roman' ] ] ) {
		const ELS = [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'div' ), ...marks.flatMap( ( g, i ) => [
			el( `Root/3#${ i }`, 'Root/2#0', 'div', '', { depth: 2, display: 'flex', box: place( 0, 100 + i * 30 ) } ),
			el( `Root/4#${ i }`, `Root/3#${ i }`, 'span', g, { depth: 3, box: place( 0, 100 + i * 30, 18, 18 ) } ),
			el( `Root/5#${ i }`, `Root/3#${ i }`, 'span', `Point number ${ i + 1 }`, { depth: 3, box: place( 24, 100 + i * 30, 200, 20 ) } ),
		] ) ];
		const [ list ] = lists( run( ELS ) );
		assert.ok( list, `${ kind } rows are a list` );
		assert.equal( list.attributes.markerType, kind );
		format && assert.equal( list.attributes.numberFormat, styles.includes( format ) ? format : undefined, 'a style the enum lacks is left to the block default' );
		assert.deepEqual( list.attributes.items.map( ( it ) => it.text ), [ 'Point number 1', 'Point number 2', 'Point number 3' ] );
	}
} );

test( 'negative controls: stacked paragraphs with no marker outside a list, form rows and rows of buttons are never lists', () => {
	const paras = [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'div' ), el( 'Root/3#0', 'Root/2#0', 'p', 'A first paragraph of words.', { depth: 2, box: place( 0, 100 ) } ), el( 'Root/3#1', 'Root/2#0', 'p', 'A second paragraph of words.', { depth: 2, box: place( 0, 140 ) } ) ];
	assert.equal( lists( run( paras ) ).length, 0, 'paragraphs are no list' );
	const form = [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'div' ), ...[ 0, 1 ].flatMap( ( i ) => [
		el( `Root/3#${ i }`, 'Root/2#0', 'div', '', { depth: 2, box: place( 0, 100 + i * 40 ) } ),
		el( `Root/4#${ i }`, `Root/3#${ i }`, 'span', '•', { depth: 3, box: place( 0, 100 + i * 40, 6, 6 ) } ),
		el( `Root/5#${ i }`, `Root/3#${ i }`, 'label', `Field ${ i + 1 }`, { depth: 3 } ),
	] ) ];
	assert.equal( lists( run( form ) ).length, 0, 'rows holding a form control are no list' );
	const buttons = [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'ul' ), ...[ 0, 1 ].map( ( i ) => el( `Root/3#${ i }`, 'Root/2#0', 'button', `Action ${ i + 1 }`, { depth: 2, box: place( 0, 100 + i * 40 ) } ) ) ];
	assert.equal( lists( run( buttons ) ).length, 0, 'buttons are no list items' );
} );
