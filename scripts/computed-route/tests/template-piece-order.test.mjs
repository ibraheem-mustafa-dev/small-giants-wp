// The order confirmation's working pieces (Spec 48 FR-48-96; lib/template-piece-order-read.mjs, lib/template-piece-order.mjs,
// lib/template-piece-order-plugin.mjs): the order lines become one sgs/order-items, the order's values become bindings to
// the sgs/order source, the branches that test the order take its Show-to rules, and what fits no key is a problem row.
// Planted drafts first, then Mama's and Eye Care's real inputs (their committed drafts and skeleton, and the fact record
// elements saved as fixtures because facts.json is gitignored). Tests marked MUST FAIL fail without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDraft } from '../lib/intake-ast.mjs';
import { readOrder, sourceText } from '../lib/template-piece-order-read.mjs';
import { place } from '../lib/template-piece-order.mjs';
import { bindingSourceOf, boundAttr, loadOrderFacts, orderFactsProblems, pluginFacts, supportedAttributesOf } from '../lib/template-piece-order-plugin.mjs';
import { checkPieces, loadPieces, placePieces } from '../lib/template-pieces.mjs';
import { openDb } from '../lib/db.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '..', '..', '..' );
const FIX = path.join( HERE, 'fixtures', 'template-piece-order' );
const FACTS = loadOrderFacts();

// A planted draft: its template, logic and the hole samples the fact record would hold.
const TEMPLATE = `<main>
<section><h1>Thanks</h1><p>Order <b>{{ no }}</b>. We emailed you.</p><p>Baked on {{ when }}</p></section>
<div><sc-for list="{{ steps }}" as="s"><div><b>{{ s.t }}</b><span>{{ s.n }}</span></div></sc-for></div>
<div><div>Your items</div><sc-for list="{{ items }}" as="it"><div><span style="background-image:{{ it.bg }}"></span><span>{{ it.qty }} × {{ it.name }}</span><span>{{ it.variant }}</span><b>{{ it.total }}</b></div></sc-for><div><b>Paid</b><span>{{ totalText }}</span></div></div>
<p>Free delivery over {{ threshold }}</p><p>You paid {{ paidText }}</p>
<sc-if value="{{ hasCard }}"><div><div>Card</div><div>{{ cardText }}</div></div></sc-if>
<sc-if value="{{ hasNote }}"><div><div>Your note</div><sc-if value="{{ hasTo }}"><div>Dear {{ giftTo }},</div></sc-if><div>{{ note }}</div></div></sc-if>
<sc-if value="{{ noNote }}"><a href="Product.dc.html"><span>Send a gift</span></a></sc-if>
<sc-if value="{{ hasAcct }}"><a href="{{ orderHref }}"><span>View order</span></a></sc-if>
<sc-if value="{{ noAcct }}"><a href="SignIn.dc.html"><span>Create an account</span></a></sc-if>
<p>{{ mood }}</p>
</main>`;
const LOGIC = `class Component extends DCLogic {
  renderVals() {
    const M = window.STORE;
    const cfg = { free: 40 };
    const money = n => '£' + n.toFixed(2);
    const o = (M && M.order()) || { no: 'AB-1001', items: [ { name: 'Box', variant: 'Large', qty: 2, price: 5, img: 'a.jpg' } ], total: 10, gift: { on: false }, bake: { date: 'Friday' } };
    const note = o.gift && o.gift.on && o.gift.message;
    return {
      no: o.no,
      when: o.bake.date,
      steps: [ { t: 'Placed', n: 1 }, { t: 'Packed', n: 2 } ],
      items: (o.items || []).map(it => ({ ...it, bg: 'url(' + it.img + ')', total: money(it.price * it.qty) })),
      totalText: money(o.total || 0),
      threshold: money(cfg.free),
      paidText: money(o.paid || 0),
      hasCard: !!(o.gift && o.gift.message), cardText: (o.gift && o.gift.message) || '',
      hasNote: !!note, noNote: !note, note: note || '',
      hasTo: !!(o.gift && o.gift.to), giftTo: (o.gift && o.gift.to) || '',
      hasAcct: !!o.account, noAcct: !o.account, orderHref: 'Account.dc.html?order=' + o.no,
      mood: o.fresh ? 'Fresh today' : 'Baked soon'
    };
  }
}`;
const SAMPLES = { no: [ 'AB-1001' ], 's.n': [ 1, 2 ], 's.t': [ 'Placed', 'Packed' ], 'it.qty': [ 2 ], 'it.total': [ '£10.00' ], totalText: [ '£10.00' ], threshold: [ '£40.00' ], paidText: [ '£10.00' ], when: [ 'Friday' ] };

// The fact record of a planted template, as intake's template reader writes it: each start tag an element (`n` its place
// among the template's tags), its parent chain, the loops and branches it sits in, and its holes with their samples.
function plant( template = TEMPLATE, logic = LOGIC, samples = SAMPLES ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'order-piece-' ) );
	fs.writeFileSync( path.join( dir, 'Page.dc.html' ), `<!DOCTYPE html><html><body><x-dc>${ template }</x-dc><script type="text/x-dc" data-dc-script>${ logic }</script></body></html>` );
	const draft = loadDraft( dir, 'Page.dc.html' );
	const elements = {};
	const stack = [];
	const VOID = new Set( [ 'img', 'br', 'input' ] );
	let n = 0;
	const text = draft.text.slice( 0, draft.text.indexOf( '</x-dc>' ) );
	for ( const m of text.slice( text.indexOf( '<x-dc>' ) + 6 ).matchAll( /<(\/)?([a-z][\w-]*)([^>]*)>|([^<]+)/g ) ) {
		if ( m[ 4 ] ) {
			const top = stack.at( -1 );
			top && ( top.template.words += m[ 4 ] );
			continue;
		}
		if ( m[ 1 ] ) {
			stack.pop();
			continue;
		}
		const key = `Page/${ n }`;
		const attrs = Object.fromEntries( [ ...m[ 3 ].matchAll( /([\w-]+)="([^"]*)"/g ) ].map( ( a ) => [ a[ 1 ], a[ 2 ] ] ) );
		const e = { template: { tag: m[ 2 ], n: String( n ), parent: stack.at( -1 )?.key ?? null, parentChain: stack.map( ( s ) => s.key ).reverse(), membership: { scFor: stack.filter( ( s ) => 'sc-for' === s.template.tag ).map( ( s ) => ( { key: s.key, list: s.template.own.list, as: s.template.own.as } ) ).reverse(), scIf: stack.filter( ( s ) => 'sc-if' === s.template.tag ).map( ( s ) => ( { key: s.key, value: s.template.own.value } ) ).reverse() }, own: { list: attrs.list, as: attrs.as, value: attrs.value }, holes: [], words: '' }, logic: { holes: {} } };
		e.key = key;
		Object.entries( attrs ).forEach( ( [ a, v ] ) => /\{\{/.test( v ) && ! /^style$/.test( a ) && e.template.holes.push( { id: `attr:${ a }#0`, where: `attr:${ a }`, expr: v.replace( /^\{\{\s*|\s*\}\}$/g, '' ) } ) );
		/\{\{/.test( attrs.style || '' ) && e.template.holes.push( { id: 'style:background-image#0', where: 'style:background-image', expr: /\{\{\s*([\w.]+)\s*\}\}/.exec( attrs.style )[ 1 ] } );
		elements[ key ] = e;
		n++;
		VOID.has( m[ 2 ] ) || stack.push( e );
	}
	for ( const e of Object.values( elements ) ) {
		[ ...e.template.words.matchAll( /\{\{\s*([\w.]+)\s*\}\}/g ) ].forEach( ( h, i ) => e.template.holes.push( { id: `text#${ i }`, where: 'text', expr: h[ 1 ] } ) );
		for ( const h of e.template.holes ) {
			const vs = samples[ h.expr ];
			vs && ( e.logic.holes[ h.id ] = { 1440: { v: vs.map( ( v ) => ( { t: typeof v, v } ) ) } } );
		}
		delete e.key;
	}
	return { draft, record: { elements }, dir };
}
const keyOf = ( record, tag, words = null ) => Object.keys( record.elements ).find( ( k ) => record.elements[ k ].template.tag === tag && ( null === words || record.elements[ k ].template.words.includes( words ) ) );

// The database rows the order builder reads, planted (a block's words and address settings, the Show-to setting, the
// order-items settings).
const RULES = JSON.stringify( [ 'none', 'order-owner', 'order-has-gift', 'order-no-gift', 'order-guest', 'order-viewable' ] );
const ROWS = [
	...[ 'sgs/text', 'sgs/container', 'sgs/button', 'sgs/heading', 'sgs/order-items' ].map( ( b ) => ( { block_slug: b, attr_name: 'sgsConditionLoggedIn', attr_type: 'string', role: 'behaviour', enum_values: RULES } ) ),
	{ block_slug: 'sgs/text', attr_name: 'text', attr_type: 'string', role: 'text-content' },
	{ block_slug: 'sgs/heading', attr_name: 'content', attr_type: 'string', role: 'text-content' },
	{ block_slug: 'sgs/button', attr_name: 'label', attr_type: 'string', role: 'text-content' },
	{ block_slug: 'sgs/button', attr_name: 'url', attr_type: 'string', role: 'link-href' },
	...[ 'showThumbnail', 'showMeta', 'showSubtotal', 'showDelivery', 'showDiscount', 'showGiftCard', 'showTotal' ].map( ( a ) => ( { block_slug: 'sgs/order-items', attr_name: a, attr_type: 'boolean' } ) ),
	{ block_slug: 'sgs/order-items', attr_name: 'totalLabel', attr_type: 'string' },
].map( ( r, id ) => ( { id, enum_values: null, role: null, ...r } ) );
function fakeDb( rows = ROWS ) {
	return { prepare: ( sql ) => {
		const cols = [ ...sql.matchAll( /(\w+) = \?/g ) ].map( ( m ) => m[ 1 ] );
		const notNull = [ ...sql.matchAll( /(\w+) IS NOT NULL/g ) ].map( ( m ) => m[ 1 ] );
		const lits = [ ...sql.matchAll( /(\w+) = '([^']*)'/g ) ];
		const pick = ( args ) => rows.filter( ( r ) => cols.every( ( c, i ) => r[ c ] === args[ i ] ) && notNull.every( ( c ) => null != r[ c ] ) && lits.every( ( m ) => r[ m[ 1 ] ] === m[ 2 ] ) );
		return { all: ( ...a ) => pick( a ), get: ( ...a ) => pick( a )[ 0 ] };
	} };
}
const PLUGIN = { source: 'sgs/order', keys: [ 'number', 'email', 'delivery_method', 'total', 'date', 'view_url', 'gift_to', 'gift_message', 'item_count', 'shipping_name', 'shipping_address', 'billing_name', 'billing_address', 'phone', 'payment_method' ], supported: { 'sgs/text': [ 'text' ], 'sgs/heading': [ 'content' ], 'sgs/button': [ 'url', 'label' ] } };

// A skeleton of the planted page: a node per drafted element that the proposer would build, keyed `Root/<n>#0`.
function plantedTree( record ) {
	const ref = ( k ) => ( { tpl: `Root/${ k.split( '/' )[ 1 ] }#0` } );
	const node = ( name, k, attributes = {}, innerBlocks = [] ) => ( { name, attributes, draftRef: ref( k ), innerBlocks } );
	const k = ( tag, words ) => keyOf( record, tag, words );
	const kids = ( parent ) => Object.keys( record.elements ).filter( ( x ) => record.elements[ x ].template.parent === parent );
	const lineItem = kids( k( 'sc-for', null ) );
	const itemsLoop = Object.keys( record.elements ).filter( ( x ) => 'sc-for' === record.elements[ x ].template.tag )[ 1 ];
	const lineRow = kids( itemsLoop )[ 0 ];
	const branch = ( test ) => kids( Object.keys( record.elements ).find( ( x ) => record.elements[ x ].template.own.value === `{{ ${ test } }}` ) )[ 0 ];
	const gift = branch( 'hasNote' );
	const toDiv = kids( Object.keys( record.elements ).find( ( x ) => record.elements[ x ].template.own.value === '{{ hasTo }}' ) )[ 0 ];
	return [ node( 'sgs/container', k( 'main' ), { tagName: 'main' }, [
		node( 'sgs/container', k( 'section' ), {}, [ node( 'sgs/heading', k( 'h1' ), { content: 'Thanks' } ), node( 'sgs/text', k( 'p', 'Order' ), { text: 'Order <strong>AB-1001</strong>. We emailed you.' } ), node( 'sgs/text', k( 'p', 'aked on' ), { text: 'Baked on Friday' } ) ] ),
		node( 'sgs/container', record.elements[ lineItem[ 0 ] ].template.parent, {}, lineItem.map( ( x ) => node( 'sgs/container', x, {}, [ node( 'sgs/text', kids( x )[ 0 ], { text: 'Placed' } ) ] ) ) ),
		node( 'sgs/container', record.elements[ itemsLoop ].template.parent, {}, [ node( 'sgs/text', k( 'div', 'Your items' ), { text: 'Your items' } ), node( 'sgs/container', lineRow, {}, kids( lineRow ).map( ( x ) => node( 'sgs/text', x, { text: 'x' } ) ) ), node( 'sgs/container', k( 'div', 'Paid' ) ?? kids( record.elements[ itemsLoop ].template.parent ).at( -1 ), {}, [ node( 'sgs/text', k( 'b', 'Paid' ), { text: 'Paid' } ) ] ) ] ),
		node( 'sgs/text', k( 'p', 'Free delivery' ), { text: 'Free delivery over £40.00' } ),
		node( 'sgs/text', k( 'p', 'You paid' ), { text: 'You paid £10.00' } ),
		node( 'sgs/container', gift, {}, [ node( 'sgs/text', k( 'div', 'Your note' ), { text: 'Your note' } ), node( 'sgs/text', toDiv, { text: 'Dear Sam,' } ), node( 'sgs/text', kids( gift ).at( -1 ), { text: 'Hello' } ) ] ),
		node( 'sgs/container', branch( 'noNote' ), {}, [ node( 'sgs/button', kids( branch( 'noNote' ) )[ 0 ], { label: 'Send a gift', url: '/product/' } ) ] ),
		node( 'sgs/container', branch( 'hasAcct' ), {}, [ node( 'sgs/button', kids( branch( 'hasAcct' ) )[ 0 ], { label: 'View order', url: '/my-account/' } ) ] ),
		node( 'sgs/container', branch( 'noAcct' ), {}, [ node( 'sgs/button', kids( branch( 'noAcct' ) )[ 0 ], { label: 'Create an account', url: '/my-account/' } ) ] ),
		node( 'sgs/text', k( 'p', 'mood' ), { text: 'Baked soon' } ),
	] ) ];
}

test( 'MUST FAIL: the order lines are the loop whose items show a quantity and a currency amount; a loop of fixed steps is not', () => {
	const { draft, record } = plant();
	const r = readOrder( { record, tops: [ keyOf( record, 'main' ) ], draft, facts: FACTS } );
	const loops = Object.keys( record.elements ).filter( ( x ) => 'sc-for' === record.elements[ x ].template.tag );
	assert.equal( r.lines.key, loops[ 1 ] );
	assert.equal( r.lines.thumbnail, true );
	assert.equal( r.lines.options, true );
	assert.equal( r.order.name, 'o' );
	assert.deepEqual( r.order.listPath, [ 'items' ] );
	// Negative control: the steps loop shows a whole number and no currency amount.
	assert.ok( ! r.lines.items.some( ( k ) => record.elements[ k ].template.membership.scFor.some( ( f ) => f.key === loops[ 0 ] ) ) );
	// Without a currency amount in the items there are no order lines.
	const plain = plant( TEMPLATE, LOGIC.replace( 'total: money(it.price * it.qty)', 'total: it.price' ), { ...SAMPLES, 'it.total': [ 'ten' ] } );
	assert.equal( readOrder( { record: plain.record, tops: [ keyOf( plain.record, 'main' ) ], draft: plain.draft, facts: FACTS } ).lines, null );
	// Without a quantity there are none either.
	const noQty = plant( TEMPLATE, LOGIC, { ...SAMPLES, 'it.qty': [ 'two' ] } );
	assert.equal( readOrder( { record: noQty.record, tops: [ keyOf( noQty.record, 'main' ) ], draft: noQty.draft, facts: FACTS } ).lines, null );
} );

test( 'MUST FAIL: each order value takes its key by how the logic derives it; a currency amount outside the order is not bound', () => {
	const { draft, record } = plant();
	const r = readOrder( { record, tops: [ keyOf( record, 'main' ) ], draft, facts: FACTS } );
	const by = Object.fromEntries( r.holes.map( ( h ) => [ h.expr, h ] ) );
	assert.equal( by.no.key, 'number' );
	assert.equal( by.orderHref.key, 'view_url' );
	assert.equal( by.giftTo.key, 'gift_to' );
	assert.equal( by.note.key, 'gift_message' );
	// A currency amount read from the order outside the totals rows is the order's total; its words alone would also fit the
	// payment method, which is no currency amount.
	assert.equal( by.paidText.key, 'total' );
	assert.deepEqual( r.numberPath, [ 'no' ] );
	// The total row after the lines is the block's own total row, with the row's words as its label.
	assert.equal( by.totalText.absorbed, keyOf( record, 'div', 'Paid' ) ?? by.totalText.absorbed );
	assert.deepEqual( r.rows.map( ( x ) => [ x.kind, x.label ] ), [ [ 'total', 'Paid' ] ] );
	// Negative controls: a currency amount the logic makes from a constant reads no order; the step's number is no value.
	assert.equal( by.threshold, undefined );
	assert.equal( by[ 's.n' ], undefined );
	// A field under a part of the order no group names is not the order's own field (`bake.date` is not the order date).
	assert.match( by.when.problem, /reads the order's bake\.date, which no key of the order binding holds/ );
	assert.equal( by.when.key, undefined );
	// Words chosen by an order field are no value of it.
	assert.match( by.mood.problem, /chooses fixed words by the order's fresh/ );
} );

test( 'MUST FAIL: a branch testing the order takes the Show-to rule of the part it tests, by its sign; a guard takes none', () => {
	const { draft, record } = plant();
	const r = readOrder( { record, tops: [ keyOf( record, 'main' ) ], draft, facts: FACTS } );
	const by = Object.fromEntries( r.branches.map( ( b ) => [ b.test, b ] ) );
	assert.equal( by.hasNote.rule, 'order-has-gift' );
	assert.equal( by.noNote.rule, 'order-no-gift' );
	assert.equal( by.hasAcct.rule, 'order-owner' );
	assert.equal( by.noAcct.rule, 'order-guest' );
	assert.deepEqual( by.hasNote.reads, [ 'gift.message', 'gift', 'gift.on' ] );
	// A branch reading only what its content binds is still ruled when it holds more than that value (the card's own words).
	assert.equal( by.hasCard.rule, 'order-has-gift' );
	assert.equal( by.hasTo.guard, true );
	assert.equal( by.hasTo.rule, undefined );
	assert.match( r.notes.join( '\n' ), /only hides an order value its own content binds/ );
} );

test( 'MUST FAIL: place puts one sgs/order-items in place of the lines and the total row, and binds and rules the rest', () => {
	const { draft, record } = plant();
	const tree = plantedTree( record );
	const ctx = { factRecord: record, rootComponent: 'Page', draft, db: fakeDb(), plugin: PLUGIN, orderFacts: FACTS };
	const data = { templates: { 'order-confirmation': { pieces: [
		{ id: 'order-number', binds: { source: 'sgs/order', key: 'number' }, required: true, once: false, kind: 'order', find: 'order-values' },
		{ id: 'order-items', block: 'sgs/order-items', required: false, kind: 'order', find: 'order-lines' },
	] } } };
	const got = placePieces( { key: 'order-confirmation', tree, data, ctx, builders: { order: { place } } } );
	const all = [];
	const visit = ( list, up = [] ) => ( list || [] ).forEach( ( n ) => {
		all.push( { n, up } );
		visit( n.innerBlocks, [ ...up, n ] );
	} );
	visit( got.tree );
	const items = all.filter( ( x ) => 'sgs/order-items' === x.n.name );
	assert.equal( items.length, 1 );
	assert.deepEqual( items[ 0 ].n.attributes, { showThumbnail: true, showMeta: true, showSubtotal: false, showDelivery: false, showDiscount: false, showGiftCard: false, showTotal: true, totalLabel: 'Paid' } );
	// The lines and the total row are gone; the heading beside them stays, and the block stands where the first row stood.
	const card = items[ 0 ].up.at( -1 );
	assert.deepEqual( card.innerBlocks.map( ( n ) => n.name ), [ 'sgs/text', 'sgs/order-items' ] );
	const bound = all.filter( ( x ) => x.n.attributes?.metadata?.bindings ).map( ( x ) => [ x.n.name, Object.entries( x.n.attributes.metadata.bindings ).map( ( [ a, b ] ) => `${ a }:${ b.source }:${ b.args.key }:${ b.args.format ?? '' }` )[ 0 ] ] );
	assert.deepEqual( bound, [
		[ 'sgs/text', 'text:sgs/order:number:Order %s. We emailed you.' ],
		[ 'sgs/text', 'text:sgs/order:total:You paid %s' ],
		[ 'sgs/text', 'text:sgs/order:gift_to:Dear %s,' ],
		[ 'sgs/text', 'text:sgs/order:gift_message:' ],
		[ 'sgs/button', 'url:sgs/order:view_url:' ],
	] );
	const rules = all.filter( ( x ) => x.n.attributes?.sgsConditionLoggedIn ).map( ( x ) => [ x.n.name, x.n.attributes.sgsConditionLoggedIn ] );
	assert.deepEqual( rules, [ [ 'sgs/text', 'order-viewable' ], [ 'sgs/text', 'order-viewable' ], [ 'sgs/container', 'order-has-gift' ], [ 'sgs/container', 'order-no-gift' ], [ 'sgs/container', 'order-owner' ], [ 'sgs/container', 'order-guest' ] ] );
	// Negative control: the currency amount outside the order keeps its words and gets no binding or rule.
	const free = all.find( ( x ) => /Free delivery/.test( x.n.attributes?.text || '' ) ).n;
	assert.deepEqual( free.attributes, { text: 'Free delivery over £40.00' } );
	assert.match( got.notes.join( '\n' ), /number in Page\/\d+ sat inside <b>/ );
	assert.equal( got.problems.filter( ( p ) => /bake\.date|chooses fixed words/.test( p ) ).length, 2 );
	assert.deepEqual( checkPieces( { key: 'order-confirmation', tree: got.tree, data } ), [] );
	assert.deepEqual( got.placed.filter( ( p ) => p.key ).map( ( p ) => p.key ), [ 'number', 'total', 'gift_to', 'gift_message', 'view_url' ] );
} );

test( 'MUST FAIL: a value whose block cannot hold it, or a branch the skeleton lacks, is a problem row and nothing is guessed', () => {
	const { draft, record } = plant();
	const tree = plantedTree( record );
	// The gift branch was not shown when the draft was read: its blocks are not in the tree.
	const main = tree[ 0 ];
	main.innerBlocks = main.innerBlocks.filter( ( n ) => ! n.innerBlocks.some( ( c ) => /Your note/.test( c.attributes?.text || '' ) ) );
	// The order number's paragraph became a heading block whose words take no binding in this database.
	const rows = ROWS.filter( ( r ) => ! ( 'sgs/heading' === r.block_slug && 'content' === r.attr_name ) );
	main.innerBlocks[ 0 ].innerBlocks[ 1 ].name = 'sgs/heading';
	// The guest branch's block already shows only for account holders.
	main.innerBlocks.find( ( n ) => /Create an account/.test( JSON.stringify( n ) ) ).attributes.sgsConditionLoggedIn = 'order-owner';
	const got = place( { key: 'order-confirmation', tree, factRecord: record, rootComponent: 'Page', draft, db: fakeDb( rows ), plugin: PLUGIN, orderFacts: FACTS }, { id: 'order-number', find: 'order-values' } );
	const said = got.problems.join( '\n' );
	assert.match( said, /sgs\/container \(Page\/\d+\) already shows only for order-owner, and the branch Page\/\d+ asks for order-guest/ );
	// A setting the database does not list for sgs/order-items is never written.
	const lines = place( { key: 'order-confirmation', tree: plantedTree( record ), factRecord: record, rootComponent: 'Page', draft, db: fakeDb( ROWS.filter( ( r ) => 'showGiftCard' !== r.attr_name ) ), plugin: PLUGIN, orderFacts: FACTS }, { id: 'order-items', block: 'sgs/order-items', find: 'order-lines' } );
	assert.equal( Object.hasOwn( lines.placed[ 0 ].attributes, 'showGiftCard' ), false );
	assert.equal( lines.placed[ 0 ].attributes.showTotal, true );
	assert.match( said, /the branch Page\/\d+ \(\{\{ hasNote \}\}, order-has-gift\) is not in the skeleton: the inventory holds none of its elements \(no data branch read for it/ );
	// When the inventory read the branch and the proposal dropped it, the row says so.
	const giftEl = Object.keys( record.elements ).find( ( k ) => record.elements[ k ].template.words.includes( 'Your note' ) );
	const read = place( { key: 'order-confirmation', tree, factRecord: record, inventory: { elements: [ { key: `Root/${ giftEl.split( '/' )[ 1 ] }#0`, branch: { component: 'Page', keys: { hasNote: true } } } ] }, rootComponent: 'Page', draft, db: fakeDb( rows ), plugin: PLUGIN, orderFacts: FACTS }, { id: 'order-number', find: 'order-values' } );
	assert.match( read.problems.join( '\n' ), /hasNote \}\}, order-has-gift\) is not in the skeleton: the inventory read its elements and the proposal kept none of them/ );
	assert.match( said, /the value \{\{ giftTo \}\} \(Page\/\d+, gift_to\) is not in the skeleton/ );
	assert.match( said, /sgs\/heading \(Page\/\d+\) has no words setting a binding can write, so the order's number/ );
	assert.ok( ! JSON.stringify( got.tree ).includes( '"key":"number"' ) );
	assert.deepEqual( place( { key: 'k', tree, factRecord: null }, { id: 'x', find: 'order-values' } ).problems, [ 'k: piece "x" needs the surface\'s fact record, and none was read' ] );
	assert.match( place( { key: 'k', tree, factRecord: record, rootComponent: 'Page', draft, db: fakeDb(), plugin: PLUGIN, orderFacts: FACTS }, { id: 'x', find: 'nothing' } ).problems[ 0 ], /names find "nothing", which the order builder does not know/ );
} );

test( 'MUST FAIL: the words around a value come from the draft source, and a second value in the same words is refused', () => {
	const { draft, record } = plant( TEMPLATE.replace( 'Baked on {{ when }}', 'Order {{ no }} baked on {{ when }}' ) );
	const p = keyOf( record, 'p', 'baked on' );
	assert.equal( sourceText( draft, record.elements[ p ] ), 'Order {{ no }} baked on {{ when }}' );
	const tree = plantedTree( record );
	tree[ 0 ].innerBlocks[ 0 ].innerBlocks[ 2 ].draftRef = { tpl: `Root/${ p.split( '/' )[ 1 ] }#0` };
	const got = place( { key: 'order-confirmation', tree, factRecord: record, rootComponent: 'Page', draft, db: fakeDb(), plugin: PLUGIN, orderFacts: FACTS }, { id: 'order-number', find: 'order-values' } );
	assert.match( got.problems.join( '\n' ), /holds another value beside \{\{ no \}\} \("Order \{\{ no \}\} baked on \{\{ when \}\}"\): one binding shows one order fact/ );
} );

test( 'MUST FAIL: the plugin facts are read from the plugin, and the order facts file is refused where the plugin or database disagree', () => {
	assert.deepEqual( bindingSourceOf( "register_block_bindings_source(\n'sgs/order', array() );\nconst KEYS = array( 'number', 'total' );" ), { source: 'sgs/order', keys: [ 'number', 'total' ] } );
	assert.deepEqual( supportedAttributesOf( "private const SUPPORTED_ATTRIBUTES = array(\n\t\t'sgs/text' => array( 'text' ),\n\t\t'sgs/button' => array( 'url', 'label' ),\n\t);" ), { 'sgs/text': [ 'text' ], 'sgs/button': [ 'url', 'label' ] } );
	const real = pluginFacts();
	assert.equal( real.source, 'sgs/order' );
	for ( const key of Object.keys( FACTS.keys ) ) {
		assert.ok( real.keys.includes( key ), `the plugin holds ${ key }` );
	}
	assert.deepEqual( real.supported[ 'sgs/button' ].slice( 0, 2 ), [ 'url', 'label' ] );
	assert.deepEqual( orderFactsProblems( { facts: FACTS, plugin: PLUGIN, db: fakeDb() } ), [] );
	// The words setting a binding writes is one the bindings support lists, not merely the first of its role.
	const noteFirst = [ { id: -1, block_slug: 'sgs/button', attr_name: 'note', attr_type: 'string', role: 'text-content', enum_values: null }, ...ROWS ];
	assert.equal( boundAttr( fakeDb( noteFirst ), PLUGIN.supported, 'sgs/button', 'text-content' ), 'label' );
	assert.equal( boundAttr( fakeDb( noteFirst ), PLUGIN.supported, 'sgs/container', 'link-href' ), null );
	const bad = { ...FACTS, keys: { ...FACTS.keys, bake_date: { words: [ 'bake' ] } }, groups: { ...FACTS.groups, gift: { ...FACTS.groups.gift, shown: 'order-is-gift' } } };
	const said = orderFactsProblems( { facts: bad, plugin: PLUGIN, db: fakeDb( ROWS.filter( ( r ) => 'totalLabel' !== r.attr_name ) ) } );
	assert.deepEqual( said, [
		'order-facts.json: key "bake_date" is not a key of the sgs/order binding source (number, email, delivery_method, total, date, view_url, gift_to, gift_message, item_count, shipping_name, shipping_address, billing_name, billing_address, phone, payment_method)',
		'order-facts.json: group "gift" names the Show-to rule "order-is-gift", which no setting of sgs/text lists',
		'order-facts.json: sgs/order-items holds no setting totalLabel',
	] );
} );

// Mama's real inputs: the committed Confirmation draft, its fact record elements (fixture), and the inventory and skeleton the
// route's own commands made from it (fixtures: skeleton.mjs inventory with the data branch reader, lib/skeleton-data-branches.mjs,
// then proposeSurface), so the gift note and the view-order card are in the skeleton at their place in the draft.
test( "Mama's confirmation: one sgs/order-items, the number, gift name, gift note and view-order link bound, each branch ruled", () => {
	const handoff = path.join( REPO, 'sites', 'mamas-munches-redesign', 'handoff' );
	const factRecord = JSON.parse( fs.readFileSync( path.join( FIX, 'mamas-confirmation-facts.json' ), 'utf8' ) );
	const tree = JSON.parse( fs.readFileSync( path.join( FIX, 'mamas-confirmation-skeleton.json' ), 'utf8' ) );
	const inventory = JSON.parse( fs.readFileSync( path.join( FIX, 'mamas-confirmation-inventory.json' ), 'utf8' ) );
	assert.deepEqual( inventory.elements.filter( ( e ) => e.branch ).map( ( e ) => e.key ), [ 'Root/42#0', 'Root/43#0', 'Root/44#0', 'Root/46#0', 'Root/47#0', 'Root/55#0', 'Root/56#0', 'Root/57#0', 'Root/58#0', 'Root/59#0' ] );
	const got = placePieces( { key: 'order-confirmation', tree, data: loadPieces(), ctx: { factRecord, inventory, rootComponent: 'Confirmation', handoffDir: handoff, db: openDb() }, builders: { order: { place } } } );
	// The view-order card stands where the draft puts it: after the items and note row, before the guest card and the two links.
	const find = ( list, tpl ) => list.reduce( ( hit, n ) => hit || ( n.draftRef?.tpl === tpl ? n : find( n.innerBlocks || [], tpl ) ), null );
	const kidsOf = ( list, tpl ) => find( list, tpl )?.innerBlocks.map( ( c ) => c.draftRef?.tpl ?? c.name );
	assert.deepEqual( kidsOf( got.tree, 'Root/21#0' ), [ 'Root/22#0', 'Root/28#0', 'Root/55#0', 'Root/61#0', 'Root/66#0' ] );
	assert.deepEqual( kidsOf( got.tree, 'Root/28#0' ), [ 'Root/29#0', 'Root/42#0', 'Root/49#0' ] );
	const s = JSON.stringify( got.tree );
	assert.equal( ( s.match( /"name":"sgs\/order-items"/g ) || [] ).length, 1 );
	const binds = got.placed.filter( ( p ) => p.key ).map( ( p ) => `${ p.block } ${ p.attribute } ${ p.key } ${ p.format ?? '' }`.trim() );
	assert.deepEqual( binds, [ 'sgs/text text number Order %s. We’ve emailed your receipt, and you’ll get a tracking link as soon as it’s posted.', 'sgs/text text gift_to Dear %s,', 'sgs/text text gift_message', 'sgs/button url view_url' ] );
	assert.deepEqual( got.placed.filter( ( p ) => p.rule ).map( ( p ) => `${ p.at } ${ p.rule }` ), [ 'Confirmation/42 order-has-gift', 'Confirmation/49 order-no-gift', 'Confirmation/55 order-owner', 'Confirmation/61 order-guest', 'Confirmation/14 order-viewable' ] );
	assert.deepEqual( got.placed.find( ( p ) => 'sgs/order-items' === p.block ).attributes, { showThumbnail: true, showMeta: true, showSubtotal: false, showDelivery: false, showDiscount: false, showGiftCard: false, showTotal: true, totalLabel: 'Paid' } );
	assert.deepEqual( checkPieces( { key: 'order-confirmation', tree: got.tree, data: loadPieces() } ), [] );
	// What no key holds is named, never bound: the bake and arrival dates, the step that reads the bake date, the eyebrow chosen by createAccount.
	assert.deepEqual( got.problems.map( ( p ) => /\{\{ ([\w.]+) \}\}/.exec( p )?.[ 1 ] ), [ 'arrive', 'bakeDate', 's.d', 'acctEyebrow' ] );
	// The draft's other blocks are kept: only the line row's nodes and the total row's went, for one block.
	const refs = ( t ) => JSON.stringify( t ).match( /"tpl":"[^"]+"/g ).map( ( x ) => x.slice( 7, -1 ) );
	assert.deepEqual( refs( tree ).filter( ( x ) => ! refs( got.tree ).includes( x ) ), [ 'Root/32#0', 'Root/34#0', 'Root/35#0', 'Root/36#0', 'Root/37#0', 'Root/38#0', 'Root/39#0', 'Root/40#0' ] );
	assert.equal( refs( got.tree ).length, refs( tree ).length - 8 );
} );

test( "Eye Care's confirmation: the reference is fixed words, so the number is a problem row and no binding is guessed", () => {
	const factRecord = JSON.parse( fs.readFileSync( path.join( FIX, 'eye-care-done-facts.json' ), 'utf8' ) );
	const tree = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', 'eye-care-ward-end', 'build', 'skeleton', 'template-order-confirmation.skeleton.json' ), 'utf8' ) );
	const got = placePieces( { key: 'order-confirmation', tree, data: loadPieces(), ctx: { factRecord, rootComponent: 'Eye Care Birmingham', handoffDir: path.join( REPO, 'sites', 'eye-care-ward-end', 'handoff' ), db: openDb() }, builders: { order: { place } } } );
	assert.deepEqual( got.placed, [] );
	assert.match( got.problems[ 0 ], /the draft writes the order reference "EC-10482" as fixed words in <h1> Eye Care Birmingham\/845/ );
	assert.match( got.problems.at( -1 ), /the working piece "order-number" is missing: no block bound to sgs\/order number/ );
	assert.deepEqual( got.tree, tree );
} );
