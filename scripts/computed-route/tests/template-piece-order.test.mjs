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
		[ ...e.template.words.matchAll( /\{\{\s*([^}]+?)\s*\}\}/g ) ].forEach( ( h, i ) => e.template.holes.push( { id: `text#${ i }`, where: 'text', expr: h[ 1 ] } ) );
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
	// The card holding the lines and its title shows only while the visitor may view the order, so it is never an empty box.
	assert.deepEqual( rules, [ [ 'sgs/text', 'order-viewable' ], [ 'sgs/container', 'order-viewable' ], [ 'sgs/text', 'order-viewable' ], [ 'sgs/container', 'order-has-gift' ], [ 'sgs/container', 'order-no-gift' ], [ 'sgs/container', 'order-owner' ], [ 'sgs/container', 'order-guest' ] ] );
	// Negative control: the currency amount outside the order keeps its words and gets no binding or rule.
	const free = all.find( ( x ) => /Free delivery/.test( x.n.attributes?.text || '' ) ).n;
	assert.deepEqual( free.attributes, { text: 'Free delivery over £40.00' } );
	assert.match( got.notes.join( '\n' ), /number in Page\/\d+ sat inside <b>/ );
	assert.equal( got.problems.filter( ( p ) => /bake\.date|chooses fixed words/.test( p ) ).length, 2 );
	assert.deepEqual( checkPieces( { key: 'order-confirmation', tree: got.tree, data } ), [] );
	assert.deepEqual( got.placed.filter( ( p ) => p.key ).map( ( p ) => p.key ), [ 'number', 'total', 'gift_to', 'gift_message', 'view_url' ] );
} );

// The values piece then the lines piece over one tree, as the route runs them (data/template-pieces.json order).
function runBoth( { draft, record }, tree ) {
	const base = { key: 'order-confirmation', factRecord: record, rootComponent: 'Page', draft, db: fakeDb(), plugin: PLUGIN, orderFacts: FACTS };
	const values = place( { ...base, tree }, { id: 'order-number', find: 'order-values' } );
	const lines = place( { ...base, tree: values.tree }, { id: 'order-items', block: 'sgs/order-items', find: 'order-lines' } );
	return { ...lines, valuesPlaced: values.placed };
}
const nodesOf = ( tree ) => tree.flatMap( ( n ) => [ n, ...nodesOf( n.innerBlocks || [] ) ] );
const cardOf = ( tree ) => nodesOf( tree ).find( ( n ) => ( n.innerBlocks || [] ).some( ( c ) => 'sgs/order-items' === c.name ) );

test( 'MUST FAIL: the card holding sgs/order-items (and its title) or only bound values takes the viewable rule; a container with other content of its own does not', () => {
	const planted = plant();
	const { record } = planted;
	// The card whose only content is the order lines and its title is an empty box when the order cannot be viewed: it takes the rule.
	const got = runBoth( planted, plantedTree( record ) );
	const card = cardOf( got.tree );
	assert.equal( card.attributes.sgsConditionLoggedIn, 'order-viewable' );
	assert.ok( got.placed.some( ( p ) => 'sgs/container' === p.block && /^Page\/\d+$/.test( p.at ) && 'order-viewable' === p.rule ), 'the card is reported as placed with the rule' );
	// The tree the lines piece is given is not changed by the rule it adds.
	const input = plantedTree( record );
	const snapshot = structuredClone( input );
	place( { key: 'order-confirmation', tree: input, factRecord: record, rootComponent: 'Page', draft: planted.draft, db: fakeDb(), plugin: PLUGIN, orderFacts: FACTS }, { id: 'order-items', block: 'sgs/order-items', find: 'order-lines' } );
	assert.deepEqual( input, snapshot );
	// Negative control: a button of its own beside the lines keeps the card visible, and the builder says so.
	const withButton = plantedTree( record );
	const pre = nodesOf( withButton ).find( ( n ) => ( n.innerBlocks || [] ).some( ( c ) => /Your items/.test( c.attributes?.text || '' ) ) );
	pre.innerBlocks.push( { name: 'sgs/button', attributes: { label: 'Keep browsing', url: '/shop/' }, innerBlocks: [] } );
	const kept = runBoth( planted, withButton );
	assert.equal( cardOf( kept.tree ).attributes.sgsConditionLoggedIn, undefined );
	assert.match( kept.notes.join( '\n' ), /the card around sgs\/order-items \(Page\/\d+\) also holds sgs\/button, so it stays visible when the order cannot be viewed/ );
	// A card inside a block that already shows for an order rule is left alone (that block decides), and a card with its own
	// Show-to value keeps it.
	const ruledAbove = plantedTree( record );
	ruledAbove[ 0 ].attributes.sgsConditionLoggedIn = 'order-owner';
	assert.equal( cardOf( runBoth( planted, ruledAbove ).tree ).attributes.sgsConditionLoggedIn, undefined );
	const own = plantedTree( record );
	nodesOf( own ).find( ( n ) => ( n.innerBlocks || [] ).some( ( c ) => /Your items/.test( c.attributes?.text || '' ) ) ).attributes.sgsConditionLoggedIn = 'logged-in';
	assert.equal( cardOf( runBoth( planted, own ).tree ).attributes.sgsConditionLoggedIn, 'logged-in' );
	// A container whose only content is a bound value takes the rule too; one with a static text beside the bound value does not.
	const alone = plantedTree( record );
	const section = alone[ 0 ].innerBlocks[ 0 ];
	section.innerBlocks.splice( 1, 1, { name: 'sgs/container', attributes: {}, innerBlocks: [ section.innerBlocks[ 1 ] ] } );
	const wrapped = runBoth( planted, alone );
	const wrapper = nodesOf( wrapped.tree ).find( ( n ) => 'sgs/container' === n.name && ! n.draftRef && n.innerBlocks?.[ 0 ]?.attributes?.metadata?.bindings );
	assert.equal( wrapper.attributes.sgsConditionLoggedIn, 'order-viewable' );
	assert.equal( nodesOf( wrapped.tree ).find( ( n ) => n.draftRef?.tpl === section.draftRef.tpl ).attributes.sgsConditionLoggedIn, undefined, 'the section with the static heading is not hidden' );
	const mixed = plantedTree( record );
	const sec = mixed[ 0 ].innerBlocks[ 0 ];
	sec.innerBlocks.splice( 1, 2, { name: 'sgs/container', attributes: {}, innerBlocks: [ sec.innerBlocks[ 1 ], sec.innerBlocks[ 2 ] ] } );
	const mixedGot = runBoth( planted, mixed );
	assert.equal( nodesOf( mixedGot.tree ).find( ( n ) => 'sgs/container' === n.name && ! n.draftRef ).attributes.sgsConditionLoggedIn, undefined );
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

test( 'MUST FAIL: a value whose expression holds regular-expression characters is found in the draft source and bound like any other', () => {
	// `no || ''` and `+no` name the order number the way `no` does (lib/shop-parts-logic.mjs::valuesOf reads the name inside them),
	// and their `|`, `+` and `(` are not pattern characters when the words around the value are found.
	for ( const expr of [ "no || ''", '+no', '(no)' ] ) {
		const { draft, record } = plant( TEMPLATE.replace( '{{ no }}', `{{ ${ expr } }}` ), LOGIC, { ...SAMPLES, [ expr ]: [ 'AB-1001' ] } );
		const got = place( { key: 'order-confirmation', tree: plantedTree( record ), factRecord: record, rootComponent: 'Page', draft, db: fakeDb(), plugin: PLUGIN, orderFacts: FACTS }, { id: 'order-number', find: 'order-values' } );
		assert.deepEqual( got.problems.filter( ( p ) => /\{\{ no|\{\{ \+no|\{\{ \(no/.test( p ) ), [], expr );
		const bound = got.placed.find( ( p ) => 'number' === p.key );
		assert.equal( bound?.format, 'Order %s. We emailed you.', expr );
	}
	// Negative control: a plain name binds as before, and a text whose braces do not hold the value is still refused.
	const plain = plant();
	const ok = place( { key: 'order-confirmation', tree: plantedTree( plain.record ), factRecord: plain.record, rootComponent: 'Page', draft: plain.draft, db: fakeDb(), plugin: PLUGIN, orderFacts: FACTS }, { id: 'order-number', find: 'order-values' } );
	assert.equal( ok.placed.find( ( p ) => 'number' === p.key )?.format, 'Order %s. We emailed you.' );
	const other = plant( TEMPLATE.replace( '{{ no }}', '{{ no || \'\' }}' ), LOGIC, { ...SAMPLES, "no || ''": [ 'AB-1001' ] } );
	const wrong = structuredClone( other.record );
	Object.values( wrong.elements ).forEach( ( e ) => e.template.holes.forEach( ( h ) => "no || ''" === h.expr && ( h.expr = "no || 'x'" ) ) );
	const refused = place( { key: 'order-confirmation', tree: plantedTree( wrong ), factRecord: wrong, rootComponent: 'Page', draft: other.draft, db: fakeDb(), plugin: PLUGIN, orderFacts: FACTS }, { id: 'order-number', find: 'order-values' } );
	assert.equal( refused.placed.find( ( p ) => 'number' === p.key ), undefined );
} );

test( 'MUST FAIL: the plugin facts are read from the plugin, and the order facts file is refused where the plugin or database disagree', () => {
	assert.deepEqual( bindingSourceOf( "register_block_bindings_source(\n'sgs/order', array() );\nconst KEYS = array( 'number', 'total' );" ), { source: 'sgs/order', keys: [ 'number', 'total' ], factPrefix: null, factFilter: null } );
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
	assert.deepEqual( binds, [ 'sgs/text text number Order %s. We’ve emailed your receipt, and you’ll get a tracking link as soon as it’s posted.', 'sgs/text text gift_to Dear %s,', 'sgs/text text gift_message', 'sgs/button url view_url', 'sgs/text text fact:bake_arrive Baking on {fact:bake_date} · with you from %s', 'sgs/text text fact:bake_date Zainab bakes it fresh on %s' ] );
	assert.deepEqual( got.placed.filter( ( p ) => p.rule ).map( ( p ) => `${ p.at } ${ p.rule }` ), [ 'Confirmation/42 order-has-gift', 'Confirmation/49 order-no-gift', 'Confirmation/55 order-owner', 'Confirmation/61 order-guest', 'Confirmation/14 order-viewable', 'Confirmation/18 order-viewable', 'Confirmation/27 order-viewable', 'Confirmation/29 order-viewable' ] );
	// The "What’s coming" card (the title and the order lines) is the one container ruled for the lines: it is no empty box under a wrong key.
	assert.equal( find( got.tree, 'Root/29#0' ).attributes.sgsConditionLoggedIn, 'order-viewable' );
	assert.equal( find( got.tree, 'Root/28#0' ).attributes.sgsConditionLoggedIn, undefined );
	assert.deepEqual( got.placed.find( ( p ) => 'sgs/order-items' === p.block ).attributes, { showThumbnail: true, showMeta: true, showSubtotal: false, showDelivery: false, showDiscount: false, showGiftCard: false, showTotal: true, totalLabel: 'Paid' } );
	assert.deepEqual( checkPieces( { key: 'order-confirmation', tree: got.tree, data: loadPieces() } ), [] );
	// What no key holds: the bake and arrival dates (one block, one binding) and the step that reads the bake date (the second step
	// only) are facts the site supplies, each listed for the owner. The eyebrow chosen by createAccount is no fact: it picks one of
	// two fixed phrases by whether the order made an account, which no Show-to rule of the order says, so it stays a problem row.
	assert.deepEqual( got.problems.map( ( p ) => /\{\{ ([\w.]+) \}\}/.exec( p )?.[ 1 ] ), [ 'acctEyebrow' ] );
	assert.deepEqual( got.notes.filter( ( n ) => /site-supplied fact/.test( n ) ).map( ( n ) => /site-supplied fact (\S+): \{\{ ([\w.]+) \}\}/.exec( n ).slice( 1 ).join( ' ' ) ), [ 'fact:bake_arrive arrive', 'fact:bake_date bakeDate', 'fact:bake_date s.d' ] );
	assert.equal( find( got.tree, 'Root/27#1' ).attributes.metadata.bindings.text.args.key, 'fact:bake_date' );
	assert.deepEqual( [ 'Root/27#0', 'Root/27#2', 'Root/27#3' ].map( ( t ) => find( got.tree, t ).attributes.metadata ), [ undefined, undefined, undefined ] );
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

// Site-supplied facts (FR-48-96): an order value no key of the sgs/order source holds, which the logic reads from the order,
// is bound to `fact:<name>` for the site to supply; any other value stays a problem row. A planted draft: a bake line holding
// two such values, a step line that joins one to fixed words, an order number (a key), words chosen by an order field, and a
// currency amount from a constant.
const FACT_TEMPLATE = `<main>
<section><p>Baking on <b>{{ bakeDate }}</b> · with you from {{ arrive }}</p><p>Order {{ no }}</p></section>
<div><sc-for list="{{ steps }}" as="s"><div><b>{{ s.t }}</b><span>{{ s.d }}</span></div></sc-for></div>
<div><sc-for list="{{ items }}" as="it"><div><span>{{ it.qty }} × {{ it.name }}</span><b>{{ it.total }}</b></div></sc-for></div>
<p>{{ eyebrow }}</p><p>Free over {{ threshold }}</p>
</main>`;
const FACT_LOGIC = `class Component extends DCLogic {
  renderVals() {
    const cfg = { free: 40 };
    const money = n => '£' + n.toFixed(2);
    const o = (M && M.order()) || { no: 'AB-1001', items: [ { name: 'Box', qty: 2, price: 5 } ], bake: { date: 'Mon 23 Nov', arrive: 'Wed 25 Nov' } };
    const bake = o.bake || { date: 'Monday', arrive: 'Wednesday' };
    return {
      no: o.no, bakeDate: bake.date, arrive: bake.arrive,
      steps: [ { t: 'Placed', d: 'Just now' }, { t: 'Baking', d: 'Baked on ' + bake.date }, { t: 'Posted', d: 'By courier' } ],
      items: (o.items || []).map(it => ({ ...it, total: money(it.price * it.qty) })),
      eyebrow: o.fresh ? 'Fresh today' : 'Baked soon', threshold: money(cfg.free)
    };
  }
}`;
const FACT_SAMPLES = { no: [ 'AB-1001' ], bakeDate: [ 'Mon 23 Nov' ], arrive: [ 'Wed 25 Nov' ], 's.d': [ 'Just now', 'Baked on Mon 23 Nov', 'By courier' ], 's.t': [ 'Placed', 'Baking', 'Posted' ], 'it.qty': [ 2 ], 'it.total': [ '£10.00' ], threshold: [ '£40.00' ] };
const FACT_PLUGIN = { ...PLUGIN, factPrefix: 'fact:', factFilter: 'sgs_order_fact' };
const nodesIn = ( tree ) => tree.flatMap( ( n ) => [ n, ...nodesIn( n.innerBlocks || [] ) ] );

// The skeleton of the planted page: the bake line one block holding both values, the steps loop one container per step
// (`Root/<n>#<step>`), the order number, the eyebrow and the threshold line.
function factTree( record, steps = 3 ) {
	const k = ( tag, words ) => keyOf( record, tag, words );
	const num = ( key ) => key.split( '/' )[ 1 ];
	const node = ( name, key, attributes = {}, innerBlocks = [], i = 0 ) => ( { name, attributes, draftRef: { tpl: `Root/${ num( key ) }#${ i }` }, innerBlocks } );
	const loop = Object.keys( record.elements ).find( ( x ) => 'sc-for' === record.elements[ x ].template.tag );
	const step = Object.keys( record.elements ).find( ( x ) => record.elements[ x ].template.parent === loop );
	const [ title, line ] = Object.keys( record.elements ).filter( ( x ) => record.elements[ x ].template.parent === step );
	const words = [ [ 'Placed', 'Just now' ], [ 'Baking', 'Baked on Mon 23 Nov' ], [ 'Posted', 'By courier' ] ];
	const eyebrow = Object.keys( record.elements ).find( ( x ) => record.elements[ x ].template.holes.some( ( h ) => 'eyebrow' === h.expr ) );
	return [ node( 'sgs/container', k( 'main' ), { tagName: 'main' }, [
		node( 'sgs/container', k( 'section' ), {}, [ node( 'sgs/text', k( 'p', 'Baking on' ), { text: 'Baking on Mon 23 Nov · with you from Wed 25 Nov' } ), node( 'sgs/text', k( 'p', 'Order' ), { text: 'Order <strong>AB-1001</strong>' } ) ] ),
		node( 'sgs/container', record.elements[ loop ].template.parent, {}, words.slice( 0, steps ).map( ( w, i ) => node( 'sgs/container', step, {}, [ node( 'sgs/text', title, { text: w[ 0 ] }, [], i ), node( 'sgs/text', line, { text: w[ 1 ] }, [], i ) ], i ) ) ),
		node( 'sgs/text', eyebrow, { text: 'Baked soon' } ),
		node( 'sgs/text', k( 'p', 'Free over' ), { text: 'Free over £40.00' } ),
	] ) ];
}
const factCtx = ( planted, plugin = FACT_PLUGIN ) => ( { key: 'order-confirmation', factRecord: planted.record, rootComponent: 'Page', draft: planted.draft, db: fakeDb(), plugin, orderFacts: FACTS } );
const bindingsOf = ( tree ) => nodesIn( tree ).filter( ( n ) => n.attributes?.metadata?.bindings ).map( ( n ) => [ n.draftRef.tpl, ...Object.values( n.attributes.metadata.bindings ).map( ( b ) => `${ b.args.key }|${ b.args.format ?? '' }` ) ] );
const holesBy = ( r ) => Object.fromEntries( r.holes.map( ( h ) => [ `${ h.expr }${ undefined === h.instance ? '' : `@${ h.instance }` }`, h ] ) );

test( 'MUST FAIL: the reader names a value no key holds as a site-supplied fact, one per step that reads the order, and nothing else', () => {
	const planted = plant( FACT_TEMPLATE, FACT_LOGIC, FACT_SAMPLES );
	const { draft, record } = planted;
	const read = ( plugin ) => readOrder( { record, tops: [ keyOf( record, 'main' ) ], draft, facts: FACTS, plugin } );
	const got = read( FACT_PLUGIN );
	const h = holesBy( got );
	assert.equal( h.bakeDate.key, 'fact:bake_date' );
	assert.equal( h.arrive.key, 'fact:bake_arrive' );
	assert.equal( h.bakeDate.fact, true );
	// The step line is read per step: only the step whose own value reads the order is a hole, with the words the logic joins to it.
	assert.deepEqual( Object.keys( h ).filter( ( k ) => k.startsWith( 's.d' ) ), [ 's.d@1' ] );
	assert.equal( h[ 's.d@1' ].key, 'fact:bake_date' );
	assert.equal( h[ 's.d@1' ].logicFormat, 'Baked on %s' );
	assert.equal( h[ 's.d@1' ].problem, undefined );
	// Negative controls: a built-in key is still its key, words chosen by an order field stay a problem, a constant is no hole.
	assert.equal( h.no.key, 'number' );
	assert.equal( h.no.fact, undefined );
	assert.match( h.eyebrow.problem, /chooses fixed words by the order's fresh/ );
	assert.equal( h.threshold, undefined );
	assert.deepEqual( got.holes.filter( ( x ) => x.problem ).map( ( x ) => x.expr ), [ 'eyebrow' ] );
	// A plugin that holds no fact form leaves every one of them a problem row, as before.
	const none = holesBy( read( PLUGIN ) );
	assert.match( none.bakeDate.problem, /reads the order's bake\.date, which no key of the order binding holds/ );
	assert.match( none.arrive.problem, /bake\.arrive/ );
	assert.match( none[ 's.d@1' ].problem, /reads the order's bake\.date, which no key of the order binding holds/ );
	assert.equal( none.no.key, 'number' );
	// A list the logic builds with map() has no step to point at: it stays the loop's problem row, with a plugin that holds facts too.
	const mapped = plant( FACT_TEMPLATE, FACT_LOGIC.replace( /steps: \[[^\n]*\],/, "steps: [ 1, 2 ].map( i => ( { t: 'Step', d: 'Baked on ' + bake.date } ) )," ), FACT_SAMPLES );
	const m = holesBy( readOrder( { record: mapped.record, tops: [ keyOf( mapped.record, 'main' ) ], draft: mapped.draft, facts: FACTS, plugin: FACT_PLUGIN } ) );
	assert.match( m[ 's.d' ].problem, /sits in the loop/ );
	// Steps that cannot be told apart stay the loop's problem row: a field below the step's own, and a list with a spread in it.
	const nested = plant( FACT_TEMPLATE.replace( '{{ s.d }}', '{{ s.m.d }}' ), FACT_LOGIC.replace( "{ t: 'Baking', d: 'Baked on ' + bake.date }", "{ t: 'Baking', m: { d: 'Baked on ' + bake.date } }" ), FACT_SAMPLES );
	assert.match( holesBy( readOrder( { record: nested.record, tops: [ keyOf( nested.record, 'main' ) ], draft: nested.draft, facts: FACTS, plugin: FACT_PLUGIN } ) )[ 's.m.d' ].problem, /sits in the loop/ );
	const spread = plant( FACT_TEMPLATE, FACT_LOGIC.replace( "steps: [ { t: 'Placed', d: 'Just now' },", "steps: [ ...cfg.more, { t: 'Placed', d: 'Just now' }," ), FACT_SAMPLES );
	assert.match( holesBy( readOrder( { record: spread.record, tops: [ keyOf( spread.record, 'main' ) ], draft: spread.draft, facts: FACTS, plugin: FACT_PLUGIN } ) )[ 's.d' ].problem, /sits in the loop/ );
	// Words joined to a fact that a format cannot hold (a literal percent sign, two order values) are a problem row, not a fact
	// that drops them; a plugin with a fact prefix but no filter to name binds none.
	const pct = plant( FACT_TEMPLATE, FACT_LOGIC.replace( "'Baked on ' + bake.date", "'100% baked on ' + bake.date" ), FACT_SAMPLES );
	const p = holesBy( readOrder( { record: pct.record, tops: [ keyOf( pct.record, 'main' ) ], draft: pct.draft, facts: FACTS, plugin: FACT_PLUGIN } ) );
	assert.match( p[ 's.d@1' ].problem, /joins other words to the order's bake\.date in a way no binding format holds/ );
	assert.equal( p.bakeDate.key, 'fact:bake_date' );
	assert.match( holesBy( read( { ...PLUGIN, factPrefix: 'fact:' } ) ).bakeDate.problem, /no key of the order binding holds/ );
	// A field that fits several keys stays a problem row (a fact is only for a value no key holds).
	const several = plant( FACT_TEMPLATE.replace( '<p>{{ eyebrow }}</p>', '<p>{{ contact }}</p>' ), FACT_LOGIC.replace( 'eyebrow:', 'contact: o.phoneDate, eyebrow:' ), FACT_SAMPLES );
	const s = holesBy( readOrder( { record: several.record, tops: [ keyOf( several.record, 'main' ) ], draft: several.draft, facts: FACTS, plugin: FACT_PLUGIN } ) );
	assert.match( s.contact.problem, /fits several keys \(date, phone\)|fits several keys \(phone, date\)/ );
	// A value that is an address is never a fact: only the words of an element are.
	const link = plant( FACT_TEMPLATE.replace( '<p>{{ eyebrow }}</p>', '<a href="{{ bakeHref }}">x</a>' ), FACT_LOGIC.replace( 'eyebrow:', "bakeHref: bake.date, eyebrow:" ), FACT_SAMPLES );
	const l = holesBy( readOrder( { record: link.record, tops: [ keyOf( link.record, 'main' ) ], draft: link.draft, facts: FACTS, plugin: FACT_PLUGIN } ) );
	assert.match( l.bakeHref.problem, /no link key of the order binding holds/ );
} );

test( 'MUST FAIL: place binds a fact, puts the words around it in the format, and lists what the site must supply', () => {
	const planted = plant( FACT_TEMPLATE, FACT_LOGIC, FACT_SAMPLES );
	const { record } = planted;
	const got = place( { ...factCtx( planted ), tree: factTree( record ) }, { id: 'order-number', find: 'order-values' } );
	// The bake line is one block: its own fact is the key, the other fact is a {fact:name} token in the words around it, so the
	// whole line (and every word of it) is one binding and nothing of the draft's sample date shows when no fact is supplied.
	const bound = bindingsOf( got.tree );
	assert.deepEqual( bound.map( ( b ) => b.slice( 1 ).join() ), [ 'fact:bake_arrive|Baking on {fact:bake_date} · with you from %s', 'number|Order %s', 'fact:bake_date|Baked on %s' ] );
	// The step line is bound on the second step only; the other two keep their words.
	assert.deepEqual( bound.filter( ( b ) => b[ 1 ].startsWith( 'fact:bake_date' ) ).map( ( b ) => b[ 0 ].split( '#' )[ 1 ] ), [ '1' ] );
	const steps = nodesIn( got.tree ).filter( ( n ) => /Just now|By courier/.test( n.attributes?.text || '' ) );
	assert.equal( steps.length, 2 );
	assert.ok( steps.every( ( n ) => ! n.attributes.metadata ) );
	// Every bound block outside an order branch shows only while the visitor may view the order.
	assert.deepEqual( nodesIn( got.tree ).filter( ( n ) => n.attributes?.metadata?.bindings ).map( ( n ) => n.attributes.sgsConditionLoggedIn ), [ 'order-viewable', 'order-viewable', 'order-viewable' ] );
	// The run report names each fact the owner must supply, once, with the filter to answer through.
	const said = got.notes.join( '\n' );
	assert.equal( ( said.match( /site-supplied fact/g ) || [] ).length, 3 );
	assert.match( said, /site-supplied fact fact:bake_date: \{\{ s\.d \}\} in Page\/\d+ reads the order's bake\.date/ );
	assert.match( said, /site-supplied fact fact:bake_date: \{\{ bakeDate \}\} in Page\/\d+ reads the order's bake\.date.*sgs_order_fact/ );
	assert.match( said, /site-supplied fact fact:bake_arrive: \{\{ arrive \}\} in Page\/\d+ reads the order's bake\.arrive/ );
	// The words chosen by an order field are still a problem row, and nothing else is.
	assert.deepEqual( got.problems.map( ( p ) => /\{\{ ([\w.]+) \}\}/.exec( p )?.[ 1 ] ), [ 'eyebrow' ] );
	// Negative control: with a plugin that holds no fact form nothing is bound for them, no note is made, and each is a problem row.
	const off = place( { ...factCtx( planted, PLUGIN ), tree: factTree( record ) }, { id: 'order-number', find: 'order-values' } );
	assert.deepEqual( bindingsOf( off.tree ).map( ( b ) => b.slice( 1 ).join() ), [ 'number|Order %s' ] );
	assert.ok( ! /site-supplied fact/.test( off.notes.join( '\n' ) ) );
	assert.deepEqual( off.problems.map( ( p ) => /\{\{ ([\w.]+) \}\}/.exec( p )?.[ 1 ] ), [ 'arrive', 'bakeDate', 's.d', 'eyebrow' ] );
	// The tree the piece is given is not changed.
	const input = factTree( record );
	const snapshot = structuredClone( input );
	place( { ...factCtx( planted ), tree: input }, { id: 'order-number', find: 'order-values' } );
	assert.deepEqual( input, snapshot );
} );

test( 'MUST FAIL: a fact whose step is missing from the skeleton is a problem row, and a key beside a fact takes it as a token', () => {
	const planted = plant( FACT_TEMPLATE, FACT_LOGIC, FACT_SAMPLES );
	const { record } = planted;
	// Only the first step was built: the step that reads the bake date is not in the skeleton.
	const short = place( { ...factCtx( planted ), tree: factTree( record, 1 ) }, { id: 'order-number', find: 'order-values' } );
	assert.match( short.problems.join( '\n' ), /the value \{\{ s\.d \}\} \(Page\/\d+, fact:bake_date\) is not in the skeleton/ );
	assert.deepEqual( bindingsOf( short.tree ).map( ( b ) => b.slice( 1 ).join() ), [ 'fact:bake_arrive|Baking on {fact:bake_date} · with you from %s', 'number|Order %s' ] );
	// A built-in key beside a fact in one block: the key is the binding and the fact a token.
	const both = plant( FACT_TEMPLATE.replace( '<p>Order {{ no }}</p>', '<p>Order {{ no }} baked {{ bakeDate }}</p>' ), FACT_LOGIC, FACT_SAMPLES );
	const mixed = place( { ...factCtx( both ), tree: factTree( both.record ) }, { id: 'order-number', find: 'order-values' } );
	assert.ok( bindingsOf( mixed.tree ).some( ( b ) => 'number|Order %s baked {fact:bake_date}' === b.slice( 1 ).join() ), JSON.stringify( bindingsOf( mixed.tree ) ) );
	assert.ok( ! mixed.problems.some( ( p ) => /holds another value/.test( p ) ) );
	// Whichever the fact stands before: the key is still the binding, and the fact's own turn never reports it.
	const before = plant( FACT_TEMPLATE.replace( '<p>Order {{ no }}</p>', '<p>Baked {{ bakeDate }} · Order {{ no }}</p>' ), FACT_LOGIC, FACT_SAMPLES );
	const early = place( { ...factCtx( before ), tree: factTree( before.record ) }, { id: 'order-number', find: 'order-values' } );
	assert.ok( bindingsOf( early.tree ).some( ( b ) => 'number|Baked {fact:bake_date} · Order %s' === b.slice( 1 ).join() ), JSON.stringify( bindingsOf( early.tree ) ) );
	assert.deepEqual( early.problems.map( ( p ) => /\{\{ ([\w.]+) \}\}/.exec( p )?.[ 1 ] ), [ 'eyebrow' ] );
	// A fact fills the token of its own value only: a third value in the words that is no fact is not filled by another fact.
	const three = plant( FACT_TEMPLATE.replace( '<p>Order {{ no }}</p>', '<p>Order {{ bakeDate }} and {{ arrive }} and {{ eyebrow }}</p>' ).replace( '<p>{{ eyebrow }}</p>', '' ), FACT_LOGIC, FACT_SAMPLES );
	const unfilled = place( { ...factCtx( three ), tree: factTree( three.record ) }, { id: 'order-number', find: 'order-values' } );
	assert.ok( ! bindingsOf( unfilled.tree ).some( ( b ) => /\|Order /.test( b.slice( 1 ).join() ) ), JSON.stringify( bindingsOf( unfilled.tree ) ) );
	assert.ok( unfilled.problems.some( ( p ) => /holds another value beside/.test( p ) ) );
	// Negative control: a second value that is no fact is still refused, with or without the fact form.
	const other = plant( FACT_TEMPLATE.replace( '<p>Order {{ no }}</p>', '<p>Order {{ no }} baked {{ eyebrow }}</p>' ), FACT_LOGIC, FACT_SAMPLES );
	const refused = place( { ...factCtx( other ), tree: factTree( other.record ) }, { id: 'order-number', find: 'order-values' } );
	assert.ok( ! bindingsOf( refused.tree ).some( ( b ) => /^number\|/.test( b.slice( 1 ).join() ) ) );
} );

test( 'MUST FAIL: the words of a draft element keep the space before a middle dot', () => {
	const { draft, record } = plant( FACT_TEMPLATE, FACT_LOGIC, FACT_SAMPLES );
	assert.equal( sourceText( draft, record.elements[ keyOf( record, 'p', 'Baking on' ) ] ), 'Baking on {{ bakeDate }} · with you from {{ arrive }}' );
	// Negative control: a full stop after an inline tag still closes up to the word before it.
	const tight = plant( FACT_TEMPLATE.replace( '<p>Order {{ no }}</p>', '<p>Order <b>{{ no }}</b>.</p>' ), FACT_LOGIC, FACT_SAMPLES );
	assert.equal( sourceText( tight.draft, tight.record.elements[ keyOf( tight.record, 'p', 'Order' ) ] ), 'Order {{ no }}.' );
} );

test( 'MUST FAIL: the plugin facts name the fact form the plugin holds, and none when the plugin holds none', () => {
	assert.deepEqual( bindingSourceOf( "register_block_bindings_source(\n'sgs/order', array() );\nconst KEYS = array( 'number' );\nconst FACT_PREFIX = 'fact:';\nconst FACT_FILTER = 'sgs_order_fact';" ), { source: 'sgs/order', keys: [ 'number' ], factPrefix: 'fact:', factFilter: 'sgs_order_fact' } );
	const old = bindingSourceOf( "register_block_bindings_source(\n'sgs/order', array() );\nconst KEYS = array( 'number' );" );
	assert.equal( old.factPrefix, null );
	assert.equal( old.factFilter, null );
	const real = pluginFacts();
	assert.equal( real.factPrefix, 'fact:' );
	assert.equal( real.factFilter, 'sgs_order_fact' );
	assert.ok( ! real.keys.some( ( k ) => k.startsWith( real.factPrefix ) ), 'a fact is no built-in key' );
} );

// A block already ruled is told by its Show-to setting alone: another attribute holding an `order-` word that is a value of that setting
// (a class name, an anchor) is no rule, so the card around the lines still takes the viewable rule.
test( 'MUST FAIL: an order- word in an attribute that is not the block\'s Show-to setting is no rule already on it', () => {
	const planted = plant();
	const { record } = planted;
	const tagged = plantedTree( record );
	const card = nodesOf( tagged ).find( ( n ) => ( n.innerBlocks || [] ).some( ( c ) => /Your items/.test( c.attributes?.text || '' ) ) );
	card.attributes.className = 'order-owner';
	const got = runBoth( planted, tagged );
	const cardAfter = cardOf( got.tree );
	assert.equal( cardAfter.attributes.className, 'order-owner' );
	assert.equal( cardAfter.attributes.sgsConditionLoggedIn, 'order-viewable', 'the class name is no Show-to rule, so the card takes the viewable rule' );
	// Negative control: the Show-to setting itself holding an order rule is a rule already on the block and is left alone.
	const ruled = plantedTree( record );
	nodesOf( ruled ).find( ( n ) => ( n.innerBlocks || [] ).some( ( c ) => /Your items/.test( c.attributes?.text || '' ) ) ).attributes.sgsConditionLoggedIn = 'order-owner';
	assert.equal( cardOf( runBoth( planted, ruled ).tree ).attributes.sgsConditionLoggedIn, 'order-owner' );
	// A Show-to setting left at `none` is no rule either: the card takes the viewable rule.
	const none = plantedTree( record );
	nodesOf( none ).find( ( n ) => ( n.innerBlocks || [] ).some( ( c ) => /Your items/.test( c.attributes?.text || '' ) ) ).attributes.sgsConditionLoggedIn = 'none';
	assert.equal( cardOf( runBoth( planted, none ).tree ).attributes.sgsConditionLoggedIn, 'order-viewable' );
} );

// A container that is itself bound to an order value and holds only the lines and titles has no "other" block: the builder said so
// by reading `other.name` of nothing.
test( 'MUST FAIL: a bound container holding only the order lines and titles is placed without a "stays visible" note and without throwing', () => {
	const planted = plant();
	const { record } = planted;
	const tree = plantedTree( record );
	const card = nodesOf( tree ).find( ( n ) => ( n.innerBlocks || [] ).some( ( c ) => /Your items/.test( c.attributes?.text || '' ) ) );
	card.attributes.metadata = { bindings: { text: { source: 'sgs/order', args: { key: 'number' } } } };
	const base = { key: 'order-confirmation', factRecord: record, rootComponent: 'Page', draft: planted.draft, db: fakeDb(), plugin: PLUGIN, orderFacts: FACTS };
	let got;
	assert.doesNotThrow( () => ( got = place( { ...base, tree }, { id: 'order-items', block: 'sgs/order-items', find: 'order-lines' } ) ) );
	assert.doesNotMatch( got.notes.join( '\n' ), /also holds/, 'no other block is there to name' );
	assert.equal( cardOf( got.tree ).attributes.sgsConditionLoggedIn, undefined, 'a bound container is left to the binding rule' );
	// Negative control: with a button of its own beside the lines the note still names it.
	const withButton = plantedTree( record );
	const c2 = nodesOf( withButton ).find( ( n ) => ( n.innerBlocks || [] ).some( ( c ) => /Your items/.test( c.attributes?.text || '' ) ) );
	c2.attributes.metadata = card.attributes.metadata;
	c2.innerBlocks.push( { name: 'sgs/button', attributes: { label: 'Keep browsing', url: '/shop/' }, innerBlocks: [] } );
	assert.match( place( { ...base, tree: withButton }, { id: 'order-items', block: 'sgs/order-items', find: 'order-lines' } ).notes.join( '\n' ), /also holds sgs\/button/ );
	// A card that already has its own Show-to value is not said to stay visible by default: that value decides.
	const ruled = plantedTree( record );
	const c3 = nodesOf( ruled ).find( ( n ) => ( n.innerBlocks || [] ).some( ( c ) => /Your items/.test( c.attributes?.text || '' ) ) );
	c3.attributes.sgsConditionLoggedIn = 'logged-in';
	c3.innerBlocks.push( { name: 'sgs/button', attributes: { label: 'Keep browsing', url: '/shop/' }, innerBlocks: [] } );
	assert.doesNotMatch( place( { ...base, tree: ruled }, { id: 'order-items', block: 'sgs/order-items', find: 'order-lines' } ).notes.join( '\n' ), /also holds/ );
} );

// A block holding two facts that the skeleton holds more than once (one template element, two blocks) takes the second fact as a
// `{fact:name}` token on every one of them: the fact is marked taken only once all of them are bound.
test( 'MUST FAIL: a second fact in one sentence is a token on every block holding that element, not only the first', () => {
	const planted = plant( FACT_TEMPLATE, FACT_LOGIC, FACT_SAMPLES );
	const { record } = planted;
	const tree = factTree( record );
	const section = tree[ 0 ].innerBlocks[ 0 ];
	section.innerBlocks.splice( 1, 0, structuredClone( section.innerBlocks[ 0 ] ) );
	const got = place( { ...factCtx( planted ), tree }, { id: 'order-number', find: 'order-values' } );
	const bakeLine = 'fact:bake_arrive|Baking on {fact:bake_date} · with you from %s';
	const bound = bindingsOf( got.tree ).map( ( b ) => b.slice( 1 ).join() );
	assert.equal( bound.filter( ( b ) => bakeLine === b ).length, 2, JSON.stringify( bound ) );
	assert.ok( ! got.problems.some( ( p ) => /holds another value/.test( p ) ), got.problems.join( '\n' ) );
	// Negative control: the one-block skeleton still binds the line once.
	const single = place( { ...factCtx( planted ), tree: factTree( record ) }, { id: 'order-number', find: 'order-values' } );
	assert.equal( bindingsOf( single.tree ).filter( ( b ) => bakeLine === b.slice( 1 ).join() ).length, 1 );
} );

test( 'MUST FAIL: the order lines piece reports the draft elements of the nodes it replaced; a card rule row and a tree where no node was dropped report none', () => {
	const planted = plant();
	const got = runBoth( planted, plantedTree( planted.record ) );
	const row = got.placed.find( ( p ) => 'sgs/order-items' === p.block );
	assert.deepEqual( row.run, [ 'Root/14#0', 'Root/19#0' ] );
	// Negative controls: the rule row of the card around the lines owns no run; with the lines' nodes already absent (nothing dropped) no run is reported.
	assert.ok( got.placed.filter( ( p ) => 'sgs/order-items' !== p.block ).every( ( p ) => undefined === p.run ) );
	const strip = ( list ) => list.filter( ( n ) => ! row.run.includes( n.draftRef?.tpl ) ).map( ( n ) => ( { ...n, innerBlocks: strip( n.innerBlocks || [] ) } ) );
	const empty = runBoth( planted, strip( plantedTree( planted.record ) ) );
	const none = empty.placed.find( ( p ) => 'sgs/order-items' === p.block );
	assert.ok( none, 'the block is still placed, in the loop container' );
	assert.equal( none.run, undefined );
} );
