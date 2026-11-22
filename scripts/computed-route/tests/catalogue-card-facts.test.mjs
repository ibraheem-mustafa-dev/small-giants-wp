// The catalogue's per-product card words and shop order (Spec 48 FR-48-92, MERGED F-34; lib/catalogue-card-facts.mjs,
// lib/catalogue-read.mjs, lib/site-build-catalogue.mjs and its PHP): the badge on the card's picture, the note beside its price,
// the button's words and action read from the draft by structure, each product's place in the draft's lists, and the catalogue
// step writing them as menu_order and the card's `_sgs_card_*` meta where the product has none. Tests marked MUST FAIL fail
// without the code they name. The real drafts, an edited fixture export and the stand-in WooCommerce; no site.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { catalogueSources } from '../lib/catalogue-source.mjs';
import { recordLists } from '../lib/catalogue-records.mjs';
import { cardFacts, restValue } from '../lib/catalogue-card-facts.mjs';
import { readCatalogue } from '../lib/catalogue-read.mjs';
import { catalogueProblems } from '../lib/intake-catalogue-run.mjs';
import { repoWith } from './fixtures/catalogue/repo.mjs';
import { ROWS, run, seed, setup, shop } from './fixtures/catalogue/php-shop.mjs';
import { parseLogic } from '../lib/intake-ast.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
const factsIn = ( folder ) => {
	const ctx = catalogueSources( folder );
	return recordLists( ctx ).lists.map( ( l ) => {
		const c = cardFacts( ctx, l, [ l.key, 'name', l.prices.price, l.prices.rrp ].filter( Boolean ) );
		return { fields: c.fields, values: Object.fromEntries( l.records.map( ( r ) => [ r[ l.key ], c.valuesOf( r ) ] ) ) };
	} );
};

test( 'MUST FAIL: a draft\'s product card words are read per product: badge, price note, button words (a product the logic gives its own) and action', () => {
	const [ got ] = factsIn( path.join( REPO, 'sites', 'mamas-munches-redesign', 'handoff' ) );
	assert.deepEqual( got.fields, { badge: 'badge', note: 'unit', label: 'cta' } );
	assert.deepEqual( got.values.zookies, { badge: 'Build your own', note: '£1.19 a cookie', label: 'Build your box', action: 'page' } );
	assert.deepEqual( got.values.trial, { badge: 'New? Start here', note: 'postage included', label: 'Add to basket', action: 'add' } );
	assert.deepEqual( got.values.giftcard, { badge: 'For baby showers', note: '£15 · £25 · £40', label: 'Choose amount', action: 'page' } );
	// Negative control: a draft whose cards draw no such words (its badges are computed, not record fields) has none.
	const [ eye ] = factsIn( path.join( REPO, 'sites', 'eye-care-ward-end', 'handoff' ) );
	assert.deepEqual( eye.fields, { badge: null, note: null, label: null } );
} );

// The fixture export with a card in the shop's loop: the badge over the picture, the note after the price, a button.
const CARD = '<sc-for list="{{ list }}" as="p"><a href="Item.dc.html?id=box"><span style="position:absolute;top:8px">{{ p.flag }}</span><h2>{{ p.name }}</h2></a><div><span>{{ p.label }}</span><span>{{ p.unit }}</span></div><p>{{ p.aside }}</p><button>{{ p.cta }}</button></sc-for>';
const withCard = ( card = CARD ) => repoWith( 'shared', ( dir ) => {
	const shopFile = path.join( dir, 'Shop.dc.html' );
	fs.writeFileSync( shopFile, fs.readFileSync( shopFile, 'utf8' ).replace( /<sc-for list="\{\{ list \}\}" as="p">[\s\S]*?<\/sc-for>/, card ) );
	const data = path.join( dir, 'data.js' );
	fs.writeFileSync( data, fs.readFileSync( data, 'utf8' ).replace( "origin: 'hills' }", "origin: 'hills', flag: 'New', unit: 'a jar', aside: 'Thin words', cta: 'Pick a size' }" ).replace( "label: '£12', img", "label: '£12', flag: '', unit: 'a tin', aside: 'More words', cta: 'Add', img" ) );
} );

test( 'an edited fixture card: the placed badge, the note after the price and the button words are read; a field shown elsewhere is not', () => {
	const [ got ] = factsIn( path.join( withCard(), 'sites', 'demo', 'handoff' ) );
	assert.deepEqual( got.fields, { badge: 'flag', note: 'unit', label: 'cta' } );
	assert.deepEqual( got.values.jar, { badge: 'New', note: 'a jar', label: 'Pick a size' } );
	assert.deepEqual( got.values.box, { note: 'a tin', label: 'Add' }, 'an empty badge is no badge' );
	// Negative controls: a badge not placed over the picture and a note not after the price are neither.
	const plain = CARD.replace( ' style="position:absolute;top:8px"', '' ).replace( '<span>{{ p.label }}</span><span>{{ p.unit }}</span>', '<span>{{ p.unit }}</span><span>{{ p.label }}</span>' );
	const [ none ] = factsIn( path.join( withCard( plain ), 'sites', 'demo', 'handoff' ) );
	assert.deepEqual( none.fields, { badge: null, note: null, label: 'cta' } );
	// A field after a field that is no price is no note.
	const [ noPrice ] = factsIn( path.join( withCard( CARD.replace( '<span>{{ p.label }}</span>', '<span>{{ p.aside }}</span>' ) ), 'sites', 'demo', 'handoff' ) );
	assert.equal( noPrice.fields.note, null );
	// Two fields placed over the picture: neither is the badge, and a note says so.
	const ctx = catalogueSources( path.join( withCard( CARD.replace( '<h2>{{ p.name }}</h2>', '<h2>{{ p.name }}</h2><span style="position:absolute">{{ p.aside }}</span>' ) ), 'sites', 'demo', 'handoff' ) );
	const [ l ] = recordLists( ctx ).lists;
	const two = cardFacts( ctx, l, [ l.key, 'name', l.prices.price ] );
	assert.equal( two.fields.badge, null );
	assert.match( two.notes.join( ' ' ), /the card's badge reads 2 record fields \(flag, aside\)/ );
} );

test( 'restValue reads a card at rest: the record bound, every this.* unset, anything else unread', () => {
	const idx = parseLogic( "const p = this.props.product; const sm = this.props.size === 'sm'; const label = this.state.added ? 'Added' : (sm ? 'Short' : (p.id === 'a' ? 'Own words' : p.cta));" );
	const init = idx.all.find( ( n ) => 'VariableDeclarator' === n.type && 'label' === n.id.name ).init;
	assert.equal( restValue( idx, init, 'p', { id: 'a', cta: 'Buy' } ), 'Own words' );
	assert.equal( restValue( idx, init, 'p', { id: 'b', cta: 'Buy' } ), 'Buy' );
	const call = parseLogic( 'const x = f( p.cta );' ).all.find( ( n ) => 'CallExpression' === n.type );
	assert.equal( restValue( idx, call, 'p', { cta: 'Buy' } ), null );
} );

test( 'MUST FAIL: each product carries its place in the draft\'s lists and its card words, and the record validates', () => {
	const { catalogue } = readCatalogue( { repo: withCard(), client: 'demo', rows: ROWS } );
	assert.deepEqual( catalogue.products.map( ( p ) => [ p.draftId, p.menuOrder ] ), [ [ 'jar', 0 ], [ 'box', 1 ], [ 'voucher', 2 ] ] );
	assert.deepEqual( catalogue.products[ 0 ].card, { badge: 'New', note: 'a jar', label: 'Pick a size' } );
	assert.equal( catalogue.products[ 2 ].card, undefined, 'a product with no card words carries none' );
	assert.deepEqual( catalogueProblems( catalogue ), [] );
	assert.ok( catalogueProblems( { ...catalogue, products: [ { ...catalogue.products[ 0 ], card: { action: 'buy' } } ] } ).length, 'an action other than add or page is refused' );
} );

test( 'MUST FAIL: the catalogue step sets a route-made product\'s menu order and writes the card words it lacks, never replacing one it has', () => {
	const { repo, catalogue } = setup();
	const jar = { ...catalogue.products[ 0 ], menuOrder: 3, card: { badge: 'Fresh', note: '£1 a jar', label: 'Pick', action: 'page' } };
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'catalogue.json' ), `${ JSON.stringify( { ...catalogue, products: [ jar ] }, null, 2 ) }\n` );
	const s = shop( seed( { grain: { id: 3, name: 'pa_grain', options: [ 20, 21 ], position: 1, visible: true, variation: true }, extra: { meta: { _sgs_draft_product: 'jar', _sgs_rrp: '', _sgs_card_price_note: 'kept' } } } ) );
	const dry = run( repo, s.runPhp, false );
	const line = dry.out.find( ( l ) => /^ {2}complete jar:/.test( l ) );
	assert.match( line, /its place in the shop \(menu order 3, now 0\)/ );
	assert.match( line, /its card badge "Fresh", label "Pick", action "page"/ );
	assert.doesNotMatch( line, /note/ );
	assert.equal( run( repo, s.runPhp, true ).code, 0 );
	const post = s.state().posts[ 50 ];
	assert.equal( post.menu_order, 3 );
	assert.deepEqual( [ post.meta._sgs_card_badge, post.meta._sgs_card_price_note, post.meta._sgs_card_cta_label, post.meta._sgs_card_cta_action ], [ 'Fresh', 'kept', 'Pick', 'page' ] );
	assert.ok( ! run( repo, s.runPhp, false ).out.some( ( l ) => /menu order|its card/.test( l ) ), 'a fresh read plans neither again' );
} );

test( 'MUST FAIL: a product the route did not make keeps its menu order and gets no card words', () => {
	const { repo, catalogue } = setup();
	const jar = { ...catalogue.products[ 0 ], menuOrder: 3, card: { badge: 'Fresh' } };
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'catalogue.json' ), `${ JSON.stringify( { ...catalogue, products: [ jar ] }, null, 2 ) }\n` );
	const s = shop( seed( { sku: 'SEEDED', grain: { id: 3, name: 'pa_grain', options: [ 20, 21 ], position: 1, visible: true, variation: true } } ) );
	const line = run( repo, s.runPhp, false ).out.find( ( l ) => /^ {2}complete jar:/.test( l ) );
	assert.doesNotMatch( line, /its card/ );
	assert.doesNotMatch( line, /menu order/ );
	run( repo, s.runPhp, true );
	assert.equal( s.state().posts[ 50 ].menu_order, undefined );
	assert.equal( s.state().posts[ 50 ].meta._sgs_card_badge, undefined, 'an adopted product gets no card words' );
} );
