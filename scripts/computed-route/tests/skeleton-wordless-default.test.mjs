// A wordless control writes its text setting empty (Spec 48 FR-48-97 "Default text does not survive"): a slider dot or a swatch
// has no words, so without this the skeleton's `contentAttrs` (lib/skeleton-write-content.mjs) leaves the block's text setting
// unwritten and `sgs/button` prints its framework default "Click Here". Any leaf block (the element is its text) whose text
// setting has a non-empty default in the framework database takes the empty write (`printsDefaultText`); an element with
// words keeps them, an element holding a block gets none, a composite block's text setting (the cart's panel heading) is
// left, and a setting whose default is empty gets no extra write. Run on the real framework DB.
// Run: node --test tests/skeleton-wordless-default.test.mjs
// Mutations (each must turn it red): node tools/mutate.mjs . tests/fixtures/skeleton-wordless-default/mutations.json tests/skeleton-wordless-default.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { makeContent, printsDefaultText } from '../lib/skeleton-write-content.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Example Co' } );

const at = ( x, w ) => ( { x, y: 0, w, h: 20 } );
const el = ( id, parent, tag, words, x = {} ) => {
	const vis = { 375: true, 768: true, 1440: true };
	const box = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, x.box ] ) );
	return { key: `Root/${ id }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth: x.depth ?? 1, tag, template: 'Root', tpl: id, attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag }>${ words }</${ tag }>`, box, visible: vis, display: x.display || 'block', flexDirection: 'row', screenshots: {} };
};
const walk = ( list ) => list.flatMap( ( n ) => [ n, ...walk( n.innerBlocks || [] ) ] );
const run = ( elements ) => proposeSkeleton( { inventory: { checks: {}, source: 'fixture', root: 'main', generated: 'fixture', elements }, facts, surface: 'page', surfaceKind: 'page', surfaceName: 'Page', db, factRecord: null } );
const nodeAt = ( r, id ) => walk( r.skeleton ).find( ( n ) => n.draftRef?.tpl === `Root/${ id }#0` );

// A slider's dots: wordless buttons that carry an aria-label, beside one button with words.
const SLIDER = [
	el( 1, null, 'main', '', { depth: 0, box: at( 0, 800 ), display: 'flex' } ),
	el( 2, 1, 'div', '', { box: at( 0, 300 ), display: 'flex' } ),
	el( 3, 2, 'button', '', { depth: 2, box: at( 0, 12 ), attrs: { 'aria-label': 'Go to slide 1' } } ),
	el( 4, 2, 'button', '', { depth: 2, box: at( 20, 12 ), attrs: { 'aria-label': 'Go to slide 2' } } ),
	el( 5, 2, 'button', 'Shop now', { depth: 2, box: at( 40, 100 ) } ),
];

test( 'MUST FAIL (G-6): a wordless control writes its label empty, so the block never prints "Click Here"', () => {
	const r = run( SLIDER );
	for ( const id of [ 3, 4 ] ) {
		const n = nodeAt( r, id );
		assert.equal( n.name, 'sgs/button' );
		assert.equal( n.attributes.label, '', `Root/${ id }#0 holds an explicit empty label` );
	}
} );

test( 'negative control: a control with words keeps its words', () => {
	assert.equal( nodeAt( run( SLIDER ), 5 ).attributes.label, 'Shop now' );
} );

test( 'MUST FAIL (any leaf block): every leaf block whose text setting has a non-empty default takes the empty write', () => {
	const m = { words: ( e ) => e.words, blockKids: ( e ) => e.kids || [], textWithBreaks: ( e ) => e.words };
	const { contentAttrs } = makeContent( { m, facts, view: null, carried: null, surfaceKind: 'page', siteLink: () => ( { kind: 'none' } ) } );
	const leaves = db.prepare( "SELECT block_slug FROM block_composition WHERE composition_role = 'leaf'" ).all().map( ( r ) => r.block_slug );
	const defaulted = leaves.map( ( block ) => [ block, facts.firstAttrByRole( block, 'text-content' ) ] ).filter( ( [ block, attr ] ) => printsDefaultText( facts, block, attr ) );
	assert.ok( defaulted.some( ( [ block, attr ] ) => 'sgs/button' === block && 'label' === attr ), 'the button prints a default label' );
	for ( const [ block, attr ] of defaulted ) {
		assert.equal( contentAttrs( block, { tag: 'span', words: '', attrs: {} }, {} ).a[ attr ], '', `${ block } wordless` );
		assert.equal( contentAttrs( block, { tag: 'span', words: 'Mine', attrs: {} }, {} ).a[ attr ], 'Mine', `${ block } with words` );
		assert.equal( attr in contentAttrs( block, { tag: 'span', words: '', attrs: {}, kids: [ {} ] }, {} ).a, false, `${ block } holding a block is no wordless control` );
	}
} );

test( 'negative control: a composite block text setting is another part words, so a wordless trigger leaves it (the cart panel heading)', () => {
	const m = { words: ( e ) => e.words, blockKids: () => [], textWithBreaks: ( e ) => e.words };
	const { contentAttrs } = makeContent( { m, facts, view: null, carried: null, surfaceKind: 'page', siteLink: () => ( { kind: 'none' } ) } );
	for ( const [ block, attr ] of [ [ 'sgs/cart', 'panelHeading' ], [ 'sgs/modal', 'triggerText' ], [ 'sgs/form', 'submitLabel' ] ] ) {
		assert.equal( printsDefaultText( facts, block, attr ), true, `${ block } ${ attr } has a default` );
		assert.equal( attr in contentAttrs( block, { tag: 'span', words: '', attrs: {} }, {} ).a, false, `${ block } wordless` );
	}
} );

test( 'negative control: a text setting with an empty default, a non-string setting and a missing setting get no write', () => {
	const rows = db.prepare( "SELECT DISTINCT block_slug, attr_name FROM block_attributes WHERE role = 'text-content' AND source IN ( 'sgs', 'sgs-ext' ) AND default_value IN ( '', '\"\"' )" ).all();
	assert.ok( rows.length > 0, 'the database holds text settings whose default is empty' );
	const m = { words: ( e ) => e.words, blockKids: () => [], textWithBreaks: ( e ) => e.words };
	const { contentAttrs } = makeContent( { m, facts, view: null, carried: null, surfaceKind: 'page', siteLink: () => ( { kind: 'none' } ) } );
	for ( const r of rows ) {
		assert.equal( printsDefaultText( facts, r.block_slug, r.attr_name ), false, `${ r.block_slug } ${ r.attr_name }` );
		facts.firstAttrByRole( r.block_slug, 'text-content' ) === r.attr_name && assert.equal( r.attr_name in contentAttrs( r.block_slug, { tag: 'span', words: '', attrs: {} }, {} ).a, false, `${ r.block_slug } wordless gets no extra write` );
	}
	assert.equal( printsDefaultText( facts, 'sgs/counter', 'number' ), false, 'a number default is no words' );
	assert.equal( printsDefaultText( facts, 'sgs/button', 'noSuchSetting' ), false );
	assert.equal( printsDefaultText( facts, 'sgs/button', null ), false );
} );
