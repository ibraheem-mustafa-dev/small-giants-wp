// A checkout found from the fields the visitor types into (rules.commerceRegion.checkoutEntry, Spec 48 FR-48-87): Eye Care's
// real checkout draft (the shown elements of its page-checkout inventory) has contact, delivery and payment inputs and
// wallet buttons, and its order lines loop is not shown (an empty basket), so the card-and-lines region does not exist. The
// form region is still WooCommerce's working Checkout block (`core/post-content` printing the page's own content). Tests
// marked MUST FAIL fail before the entry-field rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts, decisionsProblems } from '../lib/skeleton-facts.mjs';
import { commerceOf, commerceRegion } from '../lib/skeleton-commerce-region.mjs';
import { proposeFixture, fixtureModel } from './fixtures/fixture-facts.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
const RULE = () => facts().decisions.rules.commerceRegion;
const INV = JSON.parse( fs.readFileSync( path.join( HERE, 'fixtures/skeleton-commerce/eye-care-checkout-inventory.json' ), 'utf8' ) );
const KEY = ( n ) => `Eye Care Birmingham/${ n }#0`;
const CHECKOUT = { role: 'checkout', checkout: null };
const HIDDEN = { 375: false, 768: false, 1440: false };
const withEls = ( elements ) => ( { ...INV, elements } );
const of = ( commerce, elements = INV.elements, rule = RULE() ) => commerceRegion( { m: fixtureModel( withEls( elements ) ), commerce, rule } );
const find = ( tree, name ) => {
	for ( const n of tree ) {
		if ( n.name === name ) {
			return n;
		}
		const inner = find( n.innerBlocks || [], name );
		if ( inner ) {
			return inner;
		}
	}
	return null;
};
const names = ( tree ) => JSON.stringify( tree ).match( /"name":"[^"]+"/g ).map( ( x ) => x.slice( 8, -1 ) );
const edit = ( keys, fn ) => INV.elements.map( ( e ) => ( keys.includes( e.key ) ? fn( e ) : e ) );
const FIELDS = [ 756, 757, 786, 787, 788, 789, 790, 810, 811, 812 ].map( KEY );

test( 'MUST FAIL: Eye Care\'s checkout (no card-and-lines region) gets WooCommerce\'s Checkout block at its entry fields and order summary; the heading stays', () => {
	const { skeleton, proposal, problems } = proposeFixture( { inventory: INV, facts: facts(), surface: 'test', commerce: CHECKOUT, db } );
	assert.deepEqual( problems, [] );
	assert.deepEqual( proposal.commerceRegion, { key: KEY( 741 ), role: 'checkout', block: 'core/post-content' }, 'the column holding the form sections and the order summary beside it' );
	const pc = find( skeleton, 'core/post-content' );
	assert.ok( pc, 'the region is core/post-content, which prints the page\'s own Checkout block' );
	assert.equal( pc.draftRef, undefined, 'WooCommerce draws the region: Fill reads nothing into it' );
	assert.deepEqual( pc.innerBlocks, [] );
	assert.equal( names( skeleton ).filter( ( n ) => 'core/post-content' === n ).length, 1 );
	assert.ok( find( skeleton, 'sgs/heading' ), 'the draft\'s heading above the region is kept' );
	assert.equal( names( skeleton ).filter( ( n ) => /form|input|field/.test( n ) ).length, 0, 'no SGS form field imitates the checkout\'s fields' );
	const absorbed = new Set( proposal.rows.filter( ( r ) => 'absorbed' === r.action && 'commerceRegion' === r.rule ).map( ( r ) => r.key ) );
	[ 756, 786, 810, 813, 817, 836 ].forEach( ( n ) => assert.ok( absorbed.has( KEY( n ) ), `${ KEY( n ) } is drawn by WooCommerce, never built` ) );
} );

test( 'MUST FAIL: the order summary joins the region only when it sits beside the fields and shows an amount', () => {
	assert.equal( of( CHECKOUT ).key, KEY( 741 ) );
	assert.match( of( CHECKOUT ).reason, /10 entry field\(s\); the order summary beside them/ );
	const noAmounts = INV.elements.map( ( e ) => ( { ...e, words: String( e.words ).replace( /£/g, '' ), allText: String( e.allText ).replace( /£/g, '' ) } ) );
	assert.equal( of( CHECKOUT, noAmounts ).key, KEY( 742 ), 'a summary showing no amount is not recognised, so only the field sections are replaced' );
	assert.match( of( CHECKOUT, noAmounts ).reason, /no order summary beside them/ );
	// The form's own amount (the pay button) is not a summary beside it: only the aside's amounts are removed.
	const inAside = ( e ) => KEY( 817 ) === e.key || ( e.parentKey && inAside( INV.elements.find( ( p ) => p.key === e.parentKey ) || {} ) );
	const noSummary = INV.elements.map( ( e ) => ( inAside( e ) ? { ...e, words: String( e.words ).replace( /£/g, '' ), allText: String( e.allText ).replace( /£/g, '' ) } : KEY( 742 ) === e.key ? { ...e, allText: `${ e.allText } Pay now £0` } : e ) );
	assert.equal( of( CHECKOUT, noSummary ).key, KEY( 742 ), 'the region\'s own pay button amount does not make it its own summary' );
} );

test( 'MUST FAIL: three or more shown entry fields with one identity sign are needed; hidden fields, an overlay\'s fields and passwords are not evidence', () => {
	assert.equal( of( CHECKOUT, edit( FIELDS.slice( 2 ), ( e ) => ( { ...e, visible: HIDDEN } ) ) ), null, 'two fields are not a checkout form' );
	assert.equal( of( CHECKOUT, edit( FIELDS.slice( 3 ), ( e ) => ( { ...e, visible: HIDDEN } ) ) ).key, KEY( 741 ), 'three shown fields (email, phone, first name) are enough' );
	const untyped = edit( FIELDS, ( e ) => ( { ...e, attrs: {}, snippet: e.snippet.replace( /\s(type|sc-camel-auto-complete|sc-camel-input-mode)="[^"]*"/g, '' ) } ) );
	assert.equal( of( CHECKOUT, untyped ), null, 'plain text fields with no email, phone, name, address or card sign are not recognised' );
	const named = edit( [ KEY( 757 ) ], ( e ) => ( { ...e, snippet: e.snippet.replace( '<input ', '<input autocomplete="given-name" ' ) } ) ).map( ( e ) => ( FIELDS.includes( e.key ) && KEY( 757 ) !== e.key ? { ...e, attrs: {}, snippet: e.snippet.replace( /\s(type|sc-camel-auto-complete|sc-camel-input-mode)="[^"]*"/g, '' ) } : e ) );
	assert.equal( of( CHECKOUT, named ).key, KEY( 741 ), 'one autocomplete token among plain fields is the identity sign' );
	// A field in a fixed panel never widens the region to the page.
	const drawer = [ ...INV.elements,
		{ ...INV.elements.find( ( e ) => KEY( 756 ) === e.key ), key: 'Eye Care Birmingham/950#0', parentKey: 'Eye Care Birmingham/951#0' },
		{ ...INV.elements.find( ( e ) => KEY( 744 ) === e.key ), key: 'Eye Care Birmingham/951#0', parentKey: KEY( 739 ), position: { 375: 'fixed', 768: 'fixed', 1440: 'fixed' }, tag: 'aside' } ];
	assert.equal( of( CHECKOUT, drawer ).key, KEY( 741 ), 'the fixed panel\'s email field is the panel\'s' );
	// A banner showing an amount beside the page's one block never lifts the region to the page's root.
	const banner = [ ...INV.elements, { ...INV.elements.find( ( e ) => KEY( 836 ) === e.key ), key: 'Eye Care Birmingham/970#0', parentKey: KEY( 739 ), tag: 'p', allText: 'Free delivery over £75', words: 'Free delivery over £75' } ];
	assert.equal( of( CHECKOUT, banner ).key, KEY( 741 ), 'the root is never the region' );
	// Order lines without card fields: the entry fields still decide, the lines are drawn by the summary beside them.
	const noCard = edit( [ 810, 811, 812 ].map( KEY ), ( e ) => ( { ...e, snippet: e.snippet.replace( /\ssc-camel-input-mode="[^"]*"/g, '' ) } ) );
	const lines = [ ...noCard, { ...INV.elements.find( ( e ) => KEY( 835 ) === e.key ), key: 'Eye Care Birmingham/900#0', parentKey: KEY( 818 ), membership: [ { kind: 'sc-for', list: '{{ lines }}', as: 'l', tpl: '899' } ], words: '£5.00', allText: '£5.00' } ];
	assert.match( of( CHECKOUT, lines ).reason, /10 entry field\(s\)/, 'an order lines loop with no card field is not the card-and-lines region' );
	assert.equal( of( CHECKOUT, lines ).key, KEY( 741 ) );
	const pw = [ ...INV.elements, { ...INV.elements.find( ( e ) => KEY( 756 ) === e.key ), key: 'Eye Care Birmingham/960#0', parentKey: KEY( 740 ), snippet: '<input type="password" data-dc-tpl="960">', attrs: { type: 'password' } } ];
	assert.equal( of( CHECKOUT, pw ).key, KEY( 741 ), 'a password field is the account\'s, not a checkout entry field' );
} );

test( 'negative controls: a checkout with card fields and order lines keeps its card region; other roles and ordinary pages get no checkout region', () => {
	assert.equal( of( { role: 'cart', checkout: 'Checkout.dc.html' } ), null, 'a cart role reads the order lines and checkout link, not the checkout\'s fields' );
	assert.equal( of( { role: 'account', checkout: null } ), null, 'an account role reads password fields and the signed-out view' );
	assert.equal( of( { role: 'shop', checkout: null } ), null );
	assert.equal( of( null ), null, 'an ordinary page has no commerce role, however many fields it holds' );
	assert.equal( commerceOf( { target: { template: 'page' } }, [] ), null, 'only the checkout template\'s surface has the checkout role' );
	const plain = proposeFixture( { inventory: INV, facts: facts(), surface: 'test', commerce: commerceOf( { target: { template: 'page' } }, [] ), db } );
	assert.equal( find( plain.skeleton, 'core/post-content' ), null, 'a form page that is not the checkout is built from the draft as it is' );
	assert.equal( plain.proposal.commerceRegion, undefined );
	// The same page given an order lines loop and a card autocomplete token: found by the card fields and the lines, as before.
	const lineProto = INV.elements.find( ( e ) => KEY( 835 ) === e.key );
	const withCard = [ ...edit( [ KEY( 810 ) ], ( e ) => ( { ...e, snippet: e.snippet.replace( '<input ', '<input autocomplete="cc-number" ' ) } ) ),
		{ ...lineProto, key: 'Eye Care Birmingham/900#0', parentKey: KEY( 818 ), membership: [ { kind: 'sc-for', list: '{{ lines }}', as: 'l', tpl: '899' } ], words: '£5.00', allText: '£5.00' } ];
	const card = of( CHECKOUT, withCard );
	assert.equal( card.key, KEY( 741 ) );
	assert.match( card.reason, /3 payment field\(s\); 1 order lines loop\(s\)|1 payment field\(s\); 1 order lines loop\(s\)/, 'found by the card fields and the order lines, not by the entry fields' );
	assert.doesNotMatch( card.reason, /entry field/ );
} );

test( 'the draft runtime\'s sc-camel spellings of autocomplete and inputmode are read like the plain attributes', () => {
	const m = fixtureModel( INV );
	assert.equal( m.els.filter( ( e ) => /sc-camel-input-mode="numeric"/.test( e.snippet ) ).length, 3, 'the draft\'s three card inputs are written sc-camel-input-mode' );
	assert.match( m.els.find( ( e ) => KEY( 756 ) === e.key ).snippet, /sc-camel-auto-complete="email"/ );
	// With the email no longer an identity field, the two or more numeric card inputs still are.
	const notEmail = edit( [ KEY( 756 ) ], ( e ) => ( { ...e, attrs: {}, snippet: e.snippet.replace( 'sc-camel-auto-complete="email"', 'sc-camel-auto-complete="off"' ).replace( 'type="email"', 'type="text"' ) } ) );
	const plain = notEmail.map( ( e ) => ( FIELDS.includes( e.key ) && KEY( 756 ) !== e.key && ! [ 810, 811, 812 ].map( KEY ).includes( e.key ) ? { ...e, snippet: e.snippet.replace( /\s(type|sc-camel-auto-complete)="[^"]*"/g, '' ) } : e ) );
	assert.equal( of( CHECKOUT, plain ).key, KEY( 741 ), 'read through sc-camel-input-mode' );
	// The email read through sc-camel-auto-complete alone (no type), and through its type alone (no autocomplete).
	const bare = ( e ) => ( FIELDS.includes( e.key ) ? { ...e, attrs: {}, snippet: e.snippet.replace( /\s(type|sc-camel-auto-complete|sc-camel-input-mode)="[^"]*"/g, '' ) } : e );
	const token = INV.elements.map( bare ).map( ( e ) => ( KEY( 756 ) === e.key ? { ...e, snippet: e.snippet.replace( '<input ', '<input sc-camel-auto-complete="email" ' ) } : e ) );
	assert.equal( of( CHECKOUT, token ).key, KEY( 741 ), 'read through sc-camel-auto-complete' );
	const typed = INV.elements.map( bare ).map( ( e ) => ( KEY( 756 ) === e.key ? { ...e, snippet: e.snippet.replace( '<input ', '<input type="email" ' ) } : e ) );
	assert.equal( of( CHECKOUT, typed ).key, KEY( 741 ), 'read through the input type' );
	const noNumeric = plain.map( ( e ) => ( [ 810, 811, 812 ].map( KEY ).includes( e.key ) ? { ...e, snippet: e.snippet.replace( /\ssc-camel-input-mode="[^"]*"/g, '' ) } : e ) );
	assert.equal( of( CHECKOUT, noNumeric ), null, 'without the numeric card inputs there is no identity field left' );
} );

test( 'the entry-field rule is validated, and without it only the card-and-lines region exists', () => {
	const f = facts();
	const rule = ( checkoutEntry ) => ( { ...f, decisions: { ...f.decisions, rules: { ...f.decisions.rules, commerceRegion: { ...f.decisions.rules.commerceRegion, checkoutEntry } } } } );
	assert.deepEqual( decisionsProblems( f ).filter( ( p ) => /checkoutEntry/.test( p ) ), [] );
	assert.deepEqual( decisionsProblems( rule( { minFields: 1, types: 'email', autocomplete: '(' } ) ).filter( ( p ) => /checkoutEntry/.test( p ) ).map( ( p ) => p.split( ' ' ).slice( 0, 3 ).join( ' ' ) ), [ 'rules.commerceRegion.checkoutEntry.autocomplete does not', 'rules.commerceRegion.checkoutEntry needs minFields' ] );
	const problems = ( entry ) => decisionsProblems( rule( entry ) ).filter( ( p ) => /checkoutEntry/.test( p ) ).length;
	assert.equal( problems( { minFields: 1, types: [ 'email' ], autocomplete: 'x' } ), 1, 'one field is no form' );
	assert.equal( problems( { minFields: 3, types: 'email', autocomplete: 'x' } ), 1, 'types is a list' );
	assert.equal( problems( { minFields: 3, types: [ 'email' ], autocomplete: 'x' } ), 0 );
	assert.equal( of( CHECKOUT, INV.elements, rule( undefined ).decisions.rules.commerceRegion ), null );
} );
