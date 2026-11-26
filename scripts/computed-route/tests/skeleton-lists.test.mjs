// A list is a stacked run of rows that each hold one piece of text with at most one leading marker (re-applies 3b1708969's rule
// on today's code; Spec 48 §3.4, FR-48-6; lib/skeleton-write-units.mjs `itemRun`): whatever its tags it is ONE list unit placed as the framework DB's list
// block (the tag map's `ul` block), its marker type and number style from the block's own enums, each item the row's text
// with the marker left out; a row with no marker counts only inside a `ul` or `ol`.
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

test( 'MUST FAIL: ec-steps (Eye Care Birmingham/222#0), numbers typed beside sentences, is one sgs/process-steps, not a numbered list (rules.numberedSteps)', () => {
	const r = propose( fixture( 'skeleton-lists', 'ec-steps' ) );
	assert.equal( lists( r ).length, 0, 'no list block' );
	const [ steps ] = flat( r.skeleton ).filter( ( n ) => 'sgs/process-steps' === n.name );
	assert.ok( steps, 'the steps are one process-steps block' );
	assert.equal( rowOf( r, `${ EC }/222#0` ).rule, 'numberedSteps' );
	// The steps are style-valued: they travel as the node's `decided` (which Fill writes), never among its attributes (RF2, R-47-10).
	assert.equal( steps.attributes.steps, undefined, 'the steps are not among the skeleton attributes' );
	assert.deepEqual( steps.decided.steps.map( ( s ) => s.number ), [ '1', '2', '3' ] );
	assert.ok( steps.decided.steps[ 0 ].title.startsWith( 'Pick a frame, then' ) );
	assert.equal( steps.attributes.layout, 'list' );
} );

test( 'negative control: Mama\'s checklist rows (a marker, a title and a description) stay containers', () => {
	const r = propose( fixture( 'skeleton-lists', 'mama-checklist' ) );
	assert.equal( lists( r ).length, 0 );
	assert.equal( rowOf( r, 'Home/168#0' ).block, 'sgs/container' );
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
const run = ( elements ) => proposeSkeleton( { inventory: inv( elements ), facts: loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } ), surface: 'test', surfaceKind: 'page', surfaceName: 'Test', db } );

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

// ---- what is not one list: each control differs from a list by one fact ----
// n rows under a holder; `build( i, key )` returns the row's elements (the row first, each at depth 2 or more).
const rowsOf = ( n, build, holder = {} ) => [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', holder.tag || 'div', '', { display: holder.display || 'block' } ), ...Array.from( { length: n }, ( _, i ) => build( i ) ).flat() ];
const bulleted = ( words, extra = [], x = {} ) => ( i ) => [
	el( `Root/3#${ i }`, 'Root/2#0', 'div', x.own || '', { depth: 2, display: x.display || 'flex', box: x.box ? x.box( i ) : place( 0, 100 + i * 40 ) } ),
	el( `Root/4#${ i }`, `Root/3#${ i }`, 'span', '•', { depth: 3, box: place( 0, 100 + i * 40, 12, 12 ) } ),
	...( x.text === false ? [] : [ el( `Root/5#${ i }`, `Root/3#${ i }`, 'span', words, { depth: 3, box: place( 24, 100 + i * 40, 200, 20 ) } ) ] ),
	...extra.map( ( f ) => f( i ) ),
];

test( 'MUST FAIL: bullet rows of one piece of text each are a list (the control of the next test)', () => {
	const [ list ] = lists( run( rowsOf( 3, bulleted( 'A point' ) ) ) );
	assert.equal( list?.attributes.markerType, 'bullet' );
	assert.equal( list.attributes.items.length, 3 );
} );

test( 'negative controls: a row with a title and a description, a text child holding more text blocks or no text at all is no list item', () => {
	const block = ( parent, key, words, i ) => el( `Root/${ key }#${ i }`, parent, 'div', words, { depth: 4, box: place( 24, 120 + i * 40, 200, 16 ) } );
	// the row's own words beside a block child (a title and a description)
	assert.equal( lists( run( rowsOf( 3, bulleted( '', [ ( i ) => block( `Root/3#${ i }`, 6, 'The description', i ) ], { own: 'The title', text: false } ) ) ) ).length, 0, 'own words and a block child' );
	// the text child holds a title of its own and a block child with more words
	assert.equal( lists( run( rowsOf( 3, bulleted( 'The title', [ ( i ) => block( `Root/5#${ i }`, 6, 'The description', i ) ] ) ) ) ).length, 0, 'a text child with a block child holding words' );
	// a marker and an empty box
	assert.equal( lists( run( rowsOf( 3, bulleted( '' ) ) ) ).length, 0, 'a marker and no words' );
} );

test( 'negative controls: one row, mixed marker kinds, ordinals not counting up from 1 and rows side by side are no list', () => {
	assert.equal( lists( run( rowsOf( 1, bulleted( 'A point' ) ) ) ).length, 0, 'one row' );
	const mixed = ( i ) => bulleted( 'A point' )( i ).map( ( x ) => ( x.key.startsWith( 'Root/4#' ) && 1 === i ? { ...x, words: '🍪', allText: '🍪', srcOwnText: '🍪' } : x ) );
	assert.equal( lists( run( rowsOf( 3, mixed ) ) ).length, 0, 'a bullet, an emoji and a bullet' );
	for ( const marks of [ [ '2.', '3.', '4.' ], [ '1.', '3.', '2.' ] ] ) {
		const ordered = ( i ) => bulleted( 'A point' )( i ).map( ( x ) => ( x.key.startsWith( 'Root/4#' ) ? { ...x, words: marks[ i ], allText: marks[ i ], srcOwnText: marks[ i ] } : x ) );
		assert.equal( lists( run( rowsOf( 3, ordered ) ) ).length, 0, `ordinals ${ marks.join( ' ' ) }` );
	}
	assert.equal( lists( run( rowsOf( 3, bulleted( 'A point', [], { box: ( i ) => place( i * 320, 100 ) } ), { display: 'flex' } ) ) ).length, 0, 'rows side by side in a flex row' );
} );

test( 'MUST FAIL: the number style is the one every row prints: 01, 02, 03 are decimal-leading-zero, 01, 2, 3 print no common style', () => {
	for ( const [ marks, format ] of [ [ [ '01', '02', '03' ], 'decimal-leading-zero' ], [ [ '01', '2', '3' ], undefined ] ] ) {
		const typed = ( i ) => bulleted( 'A point' )( i ).map( ( x ) => ( x.key.startsWith( 'Root/4#' ) ? { ...x, words: marks[ i ], allText: marks[ i ], srcOwnText: marks[ i ] } : x ) );
		const [ list ] = lists( run( rowsOf( 3, typed ) ) );
		assert.equal( list?.attributes.markerType, 'numbered', marks.join( ' ' ) );
		assert.equal( list.attributes.numberFormat, format, marks.join( ' ' ) );
	}
} );

test( 'MUST FAIL: bullet rows beside other content in their holder are a list of that marker, the other content stays', () => {
	const lead = () => [ el( 'Root/6#0', 'Root/2#0', 'p', 'What is included', { depth: 2, box: place( 0, 60 ) } ) ];
	const els = rowsOf( 3, bulleted( 'A point' ) );
	els.splice( 2, 0, ...lead() );
	const [ list ] = lists( run( els ) );
	assert.equal( list?.attributes.markerType, 'bullet' );
	assert.deepEqual( list.attributes.items.map( ( it ) => it.text ), [ 'A point', 'A point', 'A point' ] );
} );

// ---- a row with no marker element: its own CSS draws the marker, so the item part is read at the row ----
const ITEM = '.sgs-icon-list > .sgs-icon-list__item:nth-of-type(1)';
const CAL = { iconColour: { slot: `${ ITEM } > .sgs-icon-list__icon`, slots: [ `${ ITEM } > .sgs-icon-list__icon` ] }, iconColourGradient: { slot: `${ ITEM } > .sgs-icon-list__icon > svg` } };
const runCal = ( elements ) => proposeSkeleton( { inventory: inv( elements ), facts: loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } ), surface: 'test', surfaceKind: 'page', surfaceName: 'Test', db, calSettings: ( b ) => ( LIST === b ? CAL : {} ) } );
const plainRows = ( tag, display ) => rowsOf( 3, ( i ) => [ el( `Root/3#${ i }`, 'Root/2#0', tag, `Plain point ${ i + 1 }`, { depth: 2, display, box: place( 0, 100 + i * 30 ) } ) ], { tag: 'ul' } );
const itemSlots = ( r ) => Object.entries( lists( r )[ 0 ]?.draftSlots || {} ).filter( ( [ s ] ) => s.endsWith( ')' ) ).map( ( [ s, f ] ) => [ s, f.tpl ] );

const slotAt = ( k ) => `.sgs-icon-list > .sgs-icon-list__item:nth-of-type(${ k })`;

test( 'MUST FAIL: the li rows of a ul that draw no marker element are read at the item part of each copy', () => {
	const r = runCal( plainRows( 'li', 'list-item' ) );
	assert.equal( lists( r ).length, 1 );
	assert.deepEqual( itemSlots( r ), [ 0, 1, 2 ].map( ( i ) => [ slotAt( i + 1 ), `Root/3#${ i }` ] ) );
	// the marker's owner is a list item by its tag or by its display
	assert.equal( itemSlots( runCal( plainRows( 'li', 'block' ) ) ).length, 3, 'an li whose display was reset' );
	assert.equal( itemSlots( runCal( plainRows( 'div', 'list-item' ) ) ).length, 3, 'a div displayed as a list item' );
} );

test( 'negative controls: plain div rows of a ul have no item slot, and a row that draws its marker element has only the marker slot', () => {
	const r = runCal( plainRows( 'div', 'block' ) );
	assert.equal( lists( r ).length, 1, 'still one list' );
	assert.deepEqual( itemSlots( r ), [] );
	const marked = lists( runCal( rowsOf( 3, bulleted( 'A point' ) ) ) )[ 0 ];
	assert.deepEqual( Object.keys( marked.draftSlots || {} ).filter( ( s ) => ! s.endsWith( '__icon' ) ), [], 'a drawn marker has no item slot' );
	assert.equal( Object.keys( marked.draftSlots || {} ).length, 3 );
} );

test( 'a list row that lays its marker and text out records that the list block lays them out (host-layout on the list node); MUST FAIL without the record', () => {
	const r = runCal( rowsOf( 3, bulleted( 'A point' ) ) );
	const list = lists( r )[ 0 ];
	const row = r.proposal.rows.find( ( x ) => 'Root/3#1' === x.key );
	assert.deepEqual( row.conserve, [ { kind: 'host-layout', node: list.draftRef.tpl, looks: [ 'layout' ] } ] );
	const plain = runCal( plainRows( 'div', 'block' ) );
	assert.equal( plain.proposal.rows.find( ( x ) => 'Root/3#1' === x.key ).conserve, undefined, 'negative control: a block row lays nothing out' );
} );
