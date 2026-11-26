// Spec 43 FR-43-25 (Bean, 2026-11-19): a choice flow some buyers skip keeps the buy box's own Add to Cart. The route sets
// `sgs/buybox` `keepAddToCartWithFlow` on the placed buy box when the draft's buy box draws its own add-to-basket control AND
// a separate control that opens the flow the product page opens (lib/template-piece-buybox-flow.mjs::keepsAddToCart, called by
// lib/template-piece-buybox.mjs::place), and never when the draft's add-to-basket control is the one that opens the flow or
// the draft links no flow to its product page. Tests marked MUST FAIL fail on the code before this feature.
// Fixture tests/fixtures/surface-openers (the Eye Care shape): the product page's buy box holds a size picker, "Add my
// prescription" (opens the lens flow), and "Add frame only" (appends to the bag); a lower section's "Add lenses" opens the
// same flow outside the buy box. The page map rows come from the real page-map proposal over the fixture.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { place } from '../lib/template-piece-buybox.mjs';
import { keepsAddToCart, productFlow } from '../lib/template-piece-buybox-flow.mjs';
import { locateRun } from '../lib/template-piece-buybox.mjs';
import { pieceContext } from '../lib/template-pieces-context.mjs';
import { proposePageMap } from '../lib/intake-pagemap.mjs';

const FIX = path.join( path.dirname( fileURLToPath( import.meta.url ) ), 'fixtures', 'surface-openers' );
// The fixture's add control builds its bag with concat, which no reader counts as appending; the Eye Care draft pushes onto the bag.
const ADD = 'addFrame: () => this.setState(s => ({ bag: s.bag.concat([{ id: 1 }]) })),';
const PUSH = 'this.setState(s => { const bag = s.bag.slice(); bag.push({ id: 1 }); return { bag }; })';
const SOURCE = fs.readFileSync( path.join( FIX, 'Store.dc.html' ), 'utf8' );
assert.ok( SOURCE.includes( ADD ), 'the fixture holds the add control' );
const DRAFT = SOURCE.replace( ADD, `addFrame: () => ${ PUSH },` );
const ROWS = () => proposePageMap( { folder: FIX } ).rows.map( ( { opens, ...r } ) => ( void opens, { ...r } ) );
const PIECE = { id: 'buy-box', block: 'sgs/buybox', required: true, kind: 'buybox', find: { surface: 'buybox' } };

// An inventory element: [ tpl, parent tpl, tag, words, click handler ].
const el = ( tpl, parent, tag, words = '', handler = '' ) => ( {
	key: `Root/${ tpl }#0`, parentKey: `Root/${ parent ?? 0 }#0`, tag, template: 'Root', tpl, srcOwnText: words, words,
	snippet: `<${ tag }${ handler ? ` sc-camel-on-click="{{ ${ handler } }}"` : '' }>`, visible: { 1440: true }, membership: [], position: { 1440: 'static' },
} );
// main > [ grid > [ h1, size picker, "Add my prescription", "Add frame only" ], section > [ h2, "Add lenses" ] ].
const elements = ( over = {} ) => [
	el( 1, null, 'main' ), el( 2, 1, 'div' ), el( 3, 2, 'h1', 'Round frame' ),
	el( 4, 2, 'button', 'Which size am I?', over.picker ?? 'openSize' ),
	el( 5, 2, 'button', 'Add my prescription', over.opener ?? 'openLens' ),
	el( 6, 2, 'button', 'Add frame only', over.add ?? 'addFrame' ),
	el( 7, 1, 'section' ), el( 8, 7, 'h2', 'Lenses for any frame' ), el( 9, 7, 'button', 'Add lenses', 'moreLens' ),
].filter( ( e ) => ! over.drop?.includes( e.tpl ) );
const n = ( name, tpl, attributes = {}, innerBlocks = [] ) => ( { name, attributes, innerBlocks, draftRef: { tpl: `Root/${ tpl }#0` } } );
const TREE = ( drop = [] ) => [ n( 'sgs/container', 1, {}, [
	n( 'sgs/container', 2, {}, [ n( 'sgs/heading', 3 ), n( 'sgs/button', 4 ), n( 'sgs/button', 5 ), n( 'sgs/button', 6 ) ].filter( ( x ) => ! drop.includes( Number( x.draftRef.tpl.split( '/' )[ 1 ].split( '#' )[ 0 ] ) ) ) ),
	n( 'sgs/container', 7, {}, [ n( 'sgs/heading', 8 ), n( 'sgs/button', 9 ) ] ),
] ) ];
const part = ( id, home, locators, sample ) => ( { id, label: id, home, write: null, locators, sample } );
const RECORD = ( drop = [] ) => ( { surfaces: [ { kind: 'buybox', file: 'Page.dc.html', parts: [
	part( 'buybox-option-picker', { type: 'setting', block: 'sgs/buybox', settings: [ 'pickerStyle' ] }, [ 'Page/4' ], [ 'Which size am I?' ] ),
	...( drop.includes( 6 ) ? [] : [ part( 'buybox-add-to-basket', { type: 'setting', block: 'sgs/buybox', settings: [ 'addToCartLabel' ] }, [ 'Page/6' ], [ 'Add frame only' ] ) ] ),
] } ] } );
const ctx = ( over = {}, parts = {} ) => ( {
	key: 'single-product', tree: TREE( over.drop ), inventory: { elements: elements( { ...parts, drop: over.drop } ) }, shopParts: RECORD( over.drop ), draftFile: 'Page.dc.html',
	draftSource: DRAFT, handoffDir: FIX, pageRows: ROWS(), ...over,
} );
const buybox = ( got ) => JSON.stringify( got.tree ).includes( '"sgs/buybox"' ) ? ( function find( list ) {
	for ( const x of list ) {
		const hit = 'sgs/buybox' === x.name ? x : find( x.innerBlocks || [] );
		if ( hit ) {
			return hit;
		}
	}
	return null;
}( got.tree ) ) : null;

test( 'MUST FAIL: Eye Care shape, a size picker, a control that opens the flow and a separate add control: the placed buy box keeps Add to Cart', () => {
	const got = place( ctx(), PIECE );
	assert.equal( got.problems, undefined );
	assert.equal( buybox( got ).attributes.keepAddToCartWithFlow, true );
	assert.match( got.notes.join( '\n' ), /keeps its own add-to-basket control \(Root\/6#0\) beside the control that opens the flow "choice-flow-lens-configurator" \(Root\/5#0\)/ );
} );

test( 'Mama\'s shape: the product page opens no flow (no row links one), so the setting is not written', () => {
	const rows = ROWS().map( ( { opensFlow, ...r } ) => ( void opensFlow, { ...r } ) );
	assert.ok( ! rows.some( ( r ) => r.opensFlow ), 'the rows link no flow' );
	const got = place( ctx( { pageRows: rows } ), PIECE );
	assert.deepEqual( buybox( got ).attributes, {} );
	assert.match( productFlow( rows, FIX ).why, /no product row of the page map opens a choice flow/ );
} );

test( 'MUST FAIL: a draft whose add control is the one that opens the flow does not keep a button beside it', () => {
	// The only add control also opens the flow (the opener's handler adds too, and the separate opener is gone); the other
	// control is a size link. No control adds without opening the flow.
	const source = DRAFT.replace( 'openLens: () => setL({ open: true, step: 0, use: null }),', `openLens: () => { ${ PUSH }; setL({ open: true, step: 0, use: null }); },` );
	assert.notEqual( source, DRAFT );
	const c = ctx( { draftSource: source, drop: [ 5 ] }, { add: 'openLens' } );
	assert.deepEqual( buybox( place( c, PIECE ) ).attributes, {} );
	const keep = keepsAddToCart( c, locateRun( c, 'buybox', 'sgs/buybox' ) );
	assert.match( keep.why, /no add-to-basket control apart from the one that opens the flow/ );
	assert.deepEqual( keep.openers, [ 'Root/6#0' ] );
} );

test( 'MUST FAIL: a buy box whose only buttons are a flow opener and size links has no add control to keep', () => {
	const c = ctx( {}, { add: 'openSize' } );
	assert.deepEqual( buybox( place( c, PIECE ) ).attributes, {} );
	const keep = keepsAddToCart( c, locateRun( c, 'buybox', 'sgs/buybox' ) );
	assert.match( keep.why, /no add-to-basket control apart from the one that opens the flow/ );
	assert.deepEqual( keep.openers, [ 'Root/5#0' ] );
} );

test( 'MUST FAIL: a control that writes only part of the flow\'s opening writes does not open it', () => {
	const source = DRAFT.replace( `addFrame: () => ${ PUSH },`, `addFrame: () => { ${ PUSH }; setL({ step: 0 }); },` );
	assert.notEqual( source, DRAFT );
	const got = place( ctx( { draftSource: source } ), PIECE );
	assert.equal( buybox( got ).attributes.keepAddToCartWithFlow, true, 'writing step 0 alone is not opening the flow, so the add control still adds without opening it' );
} );

test( 'a flow opener outside the buy box (a lower section\'s "Add lenses") does not count', () => {
	const got = place( ctx( { drop: [ 5 ] } ), PIECE );
	assert.deepEqual( buybox( got ).attributes, {}, 'the run holds the size picker and the add control; the section\'s opener is outside it' );
} );

test( 'MUST FAIL: only a live product row\'s flow counts, and two different flows are refused', () => {
	const stat = ROWS().map( ( r ) => ( 'product' === r.postType ? { ...r, collection: 'static' } : r ) );
	assert.match( productFlow( stat, FIX ).why, /no product row/ );
	const two = [ ...ROWS(), { route: 'p2', slug: 'p2', title: 'P2', postType: 'product', collection: 'live', opensFlow: 'another-flow' } ];
	assert.match( productFlow( two, FIX ).why, /open 2 different flows/ );
	assert.equal( buybox( place( ctx( { pageRows: two } ), PIECE ) ).attributes.keepAddToCartWithFlow, undefined );
	assert.equal( productFlow( ROWS(), FIX ).flow, 'choice-flow-lens-configurator' );
	assert.deepEqual( productFlow( ROWS(), FIX ).writes, [ 'lens.open=true', 'lens.step=0' ] );
} );

test( 'a draft with no readable logic says what its buttons do nowhere, so nothing is written', () => {
	const got = place( ctx( { draftSource: null } ), PIECE );
	assert.deepEqual( buybox( got ).attributes, {} );
	assert.match( keepsAddToCart( ctx( { draftSource: null } ), locateRun( ctx(), 'buybox', 'sgs/buybox' ) ).why, /no readable logic/ );
} );

test( 'MUST FAIL: a sticky bar repeating the add button is not the buy box\'s own add control', () => {
	// The run's own add control (Root/6) only opens a size dialog; the only control that appends to the basket sits in a
	// fixed bar inside the run (a sticky bar repeating the add button, which locateRun leaves out of `located`).
	const base = ctx( {}, { add: 'openSize' } );
	const bar = [ el( 10, 2, 'div' ), el( 11, 10, 'button', 'Add frame only', 'addFrame' ) ];
	bar[ 0 ].position = { 1440: 'fixed' };
	const at = base.inventory.elements.findIndex( ( e ) => 'Root/6#0' === e.key );
	base.inventory.elements.splice( at, 0, ...bar );
	const found = locateRun( base, 'buybox', 'sgs/buybox' );
	assert.ok( found.inRun( 'Root/11#0' ), 'the bar sits inside the run, which is the case the old reading got wrong' );
	const keep = keepsAddToCart( base, found );
	assert.equal( keep.keep, false );
	assert.deepEqual( keep.adds, [] );
	assert.deepEqual( keep.openers, [ 'Root/5#0' ] );
	assert.match( keep.why, /no add-to-basket control apart from the one that opens the flow/ );
} );

test( 'MUST FAIL: a decline for a reason other than "the draft draws no flow" is named in the notes', () => {
	const notes = ( c ) => place( c, PIECE ).notes.join( '\n' );
	const two = [ ...ROWS(), { route: 'p2', slug: 'p2', title: 'P2', postType: 'product', collection: 'live', opensFlow: 'another-flow' } ];
	assert.match( notes( ctx( { pageRows: two } ) ), /single-product: .*does not keep Add to Cart beside a flow opener: the product rows open 2 different flows/ );
	assert.match( notes( ctx( { drop: [ 5 ] } ) ), /does not keep Add to Cart beside a flow opener: no control in the buy box opens the flow "choice-flow-lens-configurator"/ );
	assert.match( notes( ctx( { draftSource: null } ) ), /does not keep Add to Cart beside a flow opener: the draft has no readable logic/ );
	assert.match( notes( ctx( { handoffDir: path.join( FIX, 'nowhere' ) } ) ), /does not keep Add to Cart beside a flow opener: the flow "choice-flow-lens-configurator" has no record in surfaces\.json/ );
} );

test( 'Mama\'s shape stays silent: a product row with no flow adds no note about the buy box\'s Add to Cart', () => {
	const rows = ROWS().map( ( { opensFlow, ...r } ) => ( void opensFlow, { ...r } ) );
	assert.doesNotMatch( ( place( ctx( { pageRows: rows } ), PIECE ).notes || [] ).join( '\n' ), /Add to Cart/ );
	assert.equal( keepsAddToCart( ctx( { pageRows: rows } ), locateRun( ctx(), 'buybox', 'sgs/buybox' ) ).silent, true );
} );

test( 'MUST FAIL: the template-piece context carries the page map rows the rule reads', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'keep-cart-' ) );
	fs.mkdirSync( path.join( repo, 'sites', 'c', 'build' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'c', 'build', 'page-map.json' ), JSON.stringify( ROWS() ) );
	const c = pieceContext( { repo, client: 'c', entry: null, inventory: { elements: [] }, pieces: [] } );
	assert.deepEqual( c.pageRows.map( ( r ) => r.slug ).sort(), ROWS().map( ( r ) => r.slug ).sort() );
	const none = pieceContext( { repo: fs.mkdtempSync( path.join( os.tmpdir(), 'keep-cart-' ) ), client: 'c', entry: null, inventory: { elements: [] }, pieces: [] } );
	assert.deepEqual( none.pageRows, [] );
} );

// The order of the two (sgs/buybox openerBeforeAddToCart): the draft's first innermost opener against its first innermost add
// control, in document order. The fixture draws "Add my prescription" (5) before "Add frame only" (6), as Eye Care's draft does.
const reorder = ( list, order ) => order.map( ( tpl ) => list.find( ( e ) => e.tpl === tpl ) );

test( 'MUST FAIL: the draft draws the opener before its add control, so the placed buy box puts the opener first', () => {
	const c = ctx();
	assert.equal( keepsAddToCart( c, locateRun( c, 'buybox', 'sgs/buybox' ) ).openerFirst, true );
	const got = place( ctx(), PIECE );
	assert.equal( buybox( got ).attributes.openerBeforeAddToCart, true );
	assert.match( got.notes.join( '\n' ), /draws the flow's opener before its add-to-basket control, so sgs\/buybox puts the opener first \(openerBeforeAddToCart\)/ );
} );

test( 'negative control: the add control drawn first leaves the opener after it, and the setting is not written', () => {
	// Add, opener, then the size picker: the buy box's run spans its located parts (picker and add), so the opener stays inside it.
	const c = ctx( { inventory: { elements: reorder( elements(), [ 1, 2, 3, 6, 5, 4, 7, 8, 9 ] ) } } );
	const keep = keepsAddToCart( c, locateRun( c, 'buybox', 'sgs/buybox' ) );
	assert.equal( keep.keep, true, keep.why );
	assert.equal( keep.openerFirst, false );
	const got = place( c, PIECE );
	assert.equal( buybox( got ).attributes.keepAddToCartWithFlow, true );
	assert.equal( buybox( got ).attributes.openerBeforeAddToCart, undefined );
} );

test( 'MUST FAIL: a wrapper holding both controls, add first, is set aside for the controls themselves', () => {
	// main > grid > [ h1, size picker, column (its snippet holds the opener's handler) > [ "Add frame only", "Add my prescription" ] ].
	const list = elements().map( ( e ) => ( [ 5, 6 ].includes( e.tpl ) ? { ...e, parentKey: 'Root/10#0' } : e ) );
	const column = { ...el( 10, 2, 'div', '', 'openLens' ) };
	const ordered = [ ...reorder( list, [ 1, 2, 3, 4 ] ), column, ...reorder( list, [ 6, 5, 7, 8, 9 ] ) ];
	const c = ctx( { inventory: { elements: ordered } } );
	const keep = keepsAddToCart( c, locateRun( c, 'buybox', 'sgs/buybox' ) );
	assert.equal( keep.keep, true );
	assert.ok( keep.openers.includes( 'Root/10#0' ), 'the column reads as an opener through its snippet' );
	assert.equal( keep.openerFirst, false, 'the opener itself follows the add control' );
} );


// fnWrites tags a write made through dcLogic('<X>').setState(…) with X; the buy box reads the draft page's own writes
// (lib/intake-pagemap-flow-openers.mjs::ownWrites with the draft file's component, Page here), so an opener written through
// dcLogic('Page') is still the flow's opener, and one written on another component is not.
const LENS = 'openLens: () => setL({ open: true, step: 0, use: null }),';
const lookup = ( name ) => DRAFT.replace( LENS, `openLens: () => dcLogic('${ name }').setState({ lens: { open: true, step: 0 } }),` );

test( 'MUST FAIL: a buy-box opener written through dcLogic on the page\'s own component opens the flow, so Add to Cart is kept', () => {
	assert.notEqual( lookup( 'Page' ), DRAFT );
	const c = ctx( { draftSource: lookup( 'Page' ) } );
	const keep = keepsAddToCart( c, locateRun( c, 'buybox', 'sgs/buybox' ) );
	assert.equal( keep.keep, true, keep.why );
	assert.deepEqual( keep.openers, [ 'Root/5#0' ] );
} );

test( 'negative control: the same opener written on another component opens no flow of this page', () => {
	const c = ctx( { draftSource: lookup( 'Home' ) } );
	const keep = keepsAddToCart( c, locateRun( c, 'buybox', 'sgs/buybox' ) );
	assert.equal( keep.keep, false );
	assert.match( keep.why, /no control in the buy box opens the flow/ );
} );
