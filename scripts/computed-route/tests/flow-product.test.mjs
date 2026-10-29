// RC15 (Spec 48 FR-48-55 and FR-48-92, Spec 43 FR-43-10): what a choice flow sells, read through the logic's syntax tree
// (lib/flow-product.mjs), and its questions written as the product's attribute steps (lib/skeleton-choice-flow.mjs). Before
// the fix the route never wrote `productAttribute`: every question carried the draft's option words, and a question showing
// prices was handed to the add-on price list even when the prices were the flow product's own variation prices.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readCatalogue } from '../lib/catalogue-read.mjs';
import { addedIds, flowSale, sameValues } from '../lib/flow-product.mjs';
import { repoWith } from './fixtures/catalogue/repo.mjs';
import { FLOW_ROWS, withFlow } from './fixtures/catalogue/flow.mjs';
import { E, R0, R01, FLOW_ROW, run } from './fixtures/choice-flow-fixture.mjs';
import fs from 'node:fs';
import path from 'node:path';

test( 'MUST FAIL: the ids a script\'s basket calls add are read from its syntax tree, never from its text', () => {
	assert.deepEqual( addedIds( 'class C { go() { const it = this.x ? { key: "a", id: "jar" } : { id: "box" }; D.basket.add(it); } }' ), [ 'jar', 'box' ], 'a basket object reached through a variable and a conditional' );
	assert.deepEqual( addedIds( '<x-dc><p>.add({ id: "words" })</p></x-dc><script type="text/x-dc" data-dc-script>M.cart.add({ key: "k", id: "zookies" });</script>' ), [ 'zookies' ], 'the template\'s words are never read' );
	// Negative control: an id that is no literal, a comment and a script that does not parse add nothing.
	assert.deepEqual( addedIds( 'M.cart.add({ ...it, id: x }); // cart.add({ id: "no" })' ), [] );
	assert.deepEqual( addedIds( 'cart.add({ id: "a" ' ), [] );
	assert.deepEqual( addedIds( 'list.remove({ id: "gone" }); log({ id: "said" })' ), [], 'only an add call is a basket call' );
	assert.deepEqual( addedIds( null ), [] );
} );

test( 'MUST FAIL: a flow component sells the one catalogue product its basket call adds, and each loop list it asks is that product\'s attribute', () => {
	const repo = repoWith( 'shared', withFlow );
	const { catalogue } = readCatalogue( { repo, client: 'demo', rows: FLOW_ROWS } );
	const folder = path.join( repo, 'sites', 'demo', 'handoff' );
	const sale = flowSale( { folder, component: 'Builder', catalogue } );
	assert.equal( sale.product.draftId, 'jar' );
	assert.deepEqual( sale.steps.map( ( s ) => [ s.binding, s.key, s.kind, s.attribute.slug, s.attribute.variation ] ), [ [ 'grains', 'grain', 'choice', 'grain', false ], [ 'tops', 'tops', 'multi', 'top', false ], [ 'packs', 'pack', 'choice', 'pack-size', true ] ] );
	assert.deepEqual( [ sameValues( [ 1, 2 ], [ 2, 1 ] ), sameValues( [ 1, 2 ], [ 1 ] ), sameValues( [ 1, 2 ], [ 1, 3 ] ), sameValues( [], [] ) ], [ true, false, false, false ] );
	// An id the catalogue lacks is no product; a choice read only behind another choice is not asked.
	const edit = ( from, to ) => repoWith( 'shared', ( dir ) => {
		withFlow( dir );
		const f = path.join( dir, 'Builder.dc.html' );
		fs.writeFileSync( f, fs.readFileSync( f, 'utf8' ).replace( from, to ) );
	} );
	const gated = edit( "add: () => D.basket.add({ key: 'jar', id: 'jar', grain: S.grain, tops: S.tops, pack: S.pack })", "add: () => { D.basket.add({ key: 'jar', id: 'jar', grain: S.grain, tops: S.tops, pack: S.tops.length ? S.pack : 6 }); D.basket.add({ id: 'mystery' }); }" );
	const g = flowSale( { folder: path.join( gated, 'sites', 'demo', 'handoff' ), component: 'Builder', catalogue } );
	assert.deepEqual( [ g.product?.draftId, g.steps.map( ( s ) => s.binding ) ], [ 'jar', [ 'grains', 'tops' ] ] );
	// Negative control: a component adding two catalogue products sells neither; one adding none sells none, and says so.
	const two = edit( "add: () => D.basket.add({ key: 'jar', id: 'jar', grain: S.grain, tops: S.tops, pack: S.pack })", "add: () => { D.basket.add({ key: 'jar', id: 'jar', grain: S.grain, tops: S.tops, pack: S.pack }); D.basket.add({ id: 'box' }); }" );
	const t = flowSale( { folder: path.join( two, 'sites', 'demo', 'handoff' ), component: 'Builder', catalogue } );
	assert.deepEqual( [ t.product, t.steps ], [ null, [] ] );
	assert.match( t.note, /adds 2 catalogue products \(jar, box\)/ );
	const none = flowSale( { folder, component: 'Shop', catalogue } );
	assert.deepEqual( [ none.product, none.steps ], [ null, [] ] );
	assert.match( none.note, /adds no catalogue product/ );
} );

// A flow of three questions over the lists `packs` (prices, a per-unit price and a badge), `grains` and `tops`, then add to bag.
const SOLD = [
	E( 1, 'div', null, { attrs: { role: 'dialog' }, rendered: R0 } ),
	E( 2, 'div', 1, { rendered: R0 } ),
	E( 3, 'h2', 2, { words: 'How many', rendered: R0 } ),
	E( 4, 'div', 2, { rendered: R0 } ),
	E( 5, 'sc-for', 4, { items: 2, as: 'o', binds: 'packs' } ),
	E( 6, 'button', 5, { click: 'o.pick', rendered: R01 } ),
	E( 7, 'span', 6, { text: [ '6', '12' ], rendered: R01 } ),
	E( 8, 'span', 6, { text: [ '£4.00', '£7.50' ], rendered: R01 } ),
	E( 9, 'span', 6, { text: [ '£0.67 each', '£0.63 each' ], rendered: R01 } ),
	E( 10, 'sc-if', 6, { attrs: { value: '{{ o.tag }}' } } ),
	E( 11, 'span', 10, { text: [ 'Popular' ] } ),
	E( 12, 'div', 1, { rendered: R0 } ),
	E( 13, 'h2', 12, { words: 'Grain', rendered: R0 } ),
	E( 14, 'div', 12, { rendered: R0 } ),
	E( 15, 'sc-for', 14, { items: 2, as: 'o', binds: 'grains' } ),
	E( 16, 'button', 15, { click: 'o.pick', text: [ 'Fine set', 'Coarse set' ], rendered: R01 } ),
	E( 17, 'div', 1, { rendered: R0 } ),
	E( 18, 'h2', 17, { words: 'Tops', rendered: R0 } ),
	E( 19, 'div', 17, { rendered: R0 } ),
	E( 20, 'sc-for', 19, { items: 0, as: 'o', binds: 'tops' } ),
	E( 21, 'button', 20, { click: 'o.pick', rendered: [] } ),
	E( 22, 'div', 1, { rendered: R0 } ),
	E( 23, 'button', 22, { click: 'addAll', words: 'Add to bag', rendered: R0 } ),
];
const option = ( term, extra = {} ) => ( { value: term, term, price: null, swatch: null, badge: null, ...extra } );
const attribute = ( slug, variation, options, def = null ) => ( { key: slug, label: slug, slug, packSize: 'pack-size' === slug, variesBy: null, variation, options, default: def } );
const PACKS = attribute( 'pack-size', true, [ option( '6', { price: 4 } ), option( '12', { price: 7.5, badge: 'Popular' } ) ], '6' );
const sale = ( packs = PACKS ) => () => ( { product: { draftId: 'jar' }, steps: [
	{ binding: 'packs', key: 'pack', kind: 'choice', attribute: packs },
	{ binding: 'grains', key: 'grain', kind: 'choice', attribute: attribute( 'grain', false, [ option( 'Fine set' ), option( 'Coarse set' ) ], 'Fine set' ) },
	{ binding: 'tops', key: 'tops', kind: 'multi', attribute: attribute( 'top', false, [ option( 'Nuts' ), option( 'Seeds' ) ] ) },
], note: null } );
const questions = ( skeleton ) => skeleton[ 0 ].innerBlocks.flatMap( ( s ) => s.innerBlocks ).filter( ( b ) => 'sgs/choice-flow-question' === b.name ).map( ( b ) => b.attributes );

test( 'MUST FAIL: a question whose loop draws the flow product\'s attribute is that attribute\'s step: the product\'s terms, its badges, no add-on price hand-over', () => {
	const { skeleton, proposal } = run( SOLD, { saleOf: sale() } );
	const [ packs, grains, tops ] = questions( skeleton );
	assert.deepEqual( packs, { question: 'How many', productAttribute: 'pa_pack-size', options: [ { label: '6', value: '6', isDefault: true }, { label: '12', value: '12', badge: 'Popular' } ] } );
	assert.deepEqual( grains, { question: 'Grain', productAttribute: 'pa_grain', options: [ { label: 'Fine set', value: 'fine-set', isDefault: true }, { label: 'Coarse set', value: 'coarse-set' } ] } );
	assert.deepEqual( tops, { question: 'Tops', productAttribute: 'pa_top', options: [ { label: 'Nuts', value: 'nuts' }, { label: 'Seeds', value: 'seeds' } ] }, 'a loop that recorded no labels still lists the product\'s terms' );
	const handover = skeleton[ 0 ].handover || [];
	assert.ok( ! handover.some( ( h ) => /add-on price list|badge/.test( h.detail ) ), JSON.stringify( handover ) );
	// What the step cannot draw is a missing feature on the question's row: several picks, a second price per option.
	const missing = proposal.rows.filter( ( r ) => r.missingFeature ).map( ( r ) => [ r.key, r.missingFeature.why ] );
	assert.deepEqual( missing.map( ( [ k ] ) => k ), [ 'Root/2#0', 'Root/17#0' ] );
	assert.match( missing[ 0 ][ 1 ], /second price \(£0\.67 each, £0\.63 each\)/ );
	assert.match( missing[ 1 ][ 1 ], /several of its options/ );
} );

test( 'NEGATIVE: a flow that sells no product keeps the draft\'s options; prices the product does not hold keep the add-on hand-over', () => {
	const plain = run( SOLD );
	const [ packs ] = questions( plain.skeleton );
	assert.deepEqual( packs.options.map( ( o ) => o.label ), [ '6', '12' ] );
	assert.equal( packs.productAttribute, undefined );
	assert.ok( plain.skeleton[ 0 ].handover.some( ( h ) => /How many.*£4\.00, £7\.50.*add-on price list/.test( h.detail ) ) );
	assert.ok( ! plain.proposal.rows.some( ( r ) => r.missingFeature ) );
	// An answer attribute the draft shows prices for: the product holds no price, so the hand-over stays, and so does the badge's.
	const answer = run( SOLD, { saleOf: sale( { ...PACKS, variation: false, options: PACKS.options.map( ( o ) => ( { ...o, price: null, badge: null } ) ) } ) } );
	assert.equal( questions( answer.skeleton )[ 0 ].productAttribute, 'pa_pack-size' );
	assert.ok( answer.skeleton[ 0 ].handover.some( ( h ) => /add-on price list/.test( h.detail ) ) );
	assert.ok( answer.skeleton[ 0 ].handover.some( ( h ) => /badge "Popular"/.test( h.detail ) ) );
	// A sale whose steps name lists no loop draws binds nothing.
	const other = run( SOLD, { saleOf: () => ( { product: { draftId: 'jar' }, steps: [ { binding: 'sizes', key: 'size', kind: 'choice', attribute: PACKS } ], note: null } ) } );
	assert.ok( questions( other.skeleton ).every( ( q ) => ! q.productAttribute ) );
	assert.deepEqual( FLOW_ROW.postType, 'sgs_choice_flow' );
} );
