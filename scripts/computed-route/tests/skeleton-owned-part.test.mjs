// rules.ownedPart and the form rule's field requirement (Spec 48 FR-48-87, FR-48-57; Bean 2026-10-30): a surface the page map
// holds as a part of another row, with no row of its own, is never built as its own form or blocks. On a WooCommerce row (by
// its route, or a route the row folds in) the row's WooCommerce piece draws it: the piece is the root and everything in it is
// absorbed; any other part (a part of its page, a record the draft code shows nothing for) places nothing, its row's own
// surface building it. A form block stands only on an element holding a field: a form record naming a lone link or button is
// that control. Synthetic inventories and fact records (tests/fixtures/choice-flow-fixture.mjs). Tests marked MUST FAIL fail
// on the skeleton writer before the rule; each carries its negative controls (a saved form with its own row, a form on an
// ordinary page, a part naming another surface).
import test from 'node:test';
import assert from 'node:assert/strict';
import { E, R0, build, db, facts, names } from './fixtures/choice-flow-fixture.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { surfaceRole, rowOfRoute, routePath } from '../lib/skeleton-surface-role.mjs';

// A form surface: a card holding an email field and its submit button.
const FORM = [
	E( 1, 'div', null, { rendered: R0 } ),
	E( 2, 'label', 1, { words: 'Email', rendered: R0 } ),
	E( 3, 'input', 1, { attrs: { type: 'email' }, rendered: R0 } ),
	E( 4, 'button', 1, { attrs: { type: 'submit' }, words: 'Send', rendered: R0 } ),
];
const run = ( list, { pageMap = [], route = null, kind = 'form' } = {} ) => {
	const b = build( list, { ids: { 'S-09': { kind, name: 'The form', root: list[ 0 ].n } } } );
	return proposeSkeleton( { inventory: b.inventory, facts: facts(), surface: 'the-form', surfaceKind: kind, surfaceName: 'The form', db, factRecord: b.record, openers: {}, pageMap, surfaceId: 'S-09', surfaceRoute: route } );
};
const CHECKOUT = { slug: 'checkout', postType: 'page', template: 'checkout', route: 'Checkout.dc.html', id: null };
const ACCOUNT = { slug: 'my-account', postType: 'page', template: 'page', route: 'Account.dc.html', folds: [ 'SignIn.dc.html' ], id: null };
const CONTACT = { slug: 'contact', postType: 'page', template: 'page', route: 'Contact.dc.html', id: null };
const SAVED = { slug: 'form-the-form', postType: 'sgs_form', draftId: 'surfaces.json S-09', id: null };

test( 'MUST FAIL: a form surface on a WooCommerce page is that page\'s WooCommerce piece, never its own form', () => {
	const r = run( FORM, { pageMap: [ CHECKOUT, CONTACT ], route: 'Checkout.dc.html' } );
	assert.deepEqual( r.skeleton.map( ( n ) => [ n.name, n.innerBlocks.length ] ), [ [ 'core/post-content', 0 ] ], 'the checkout\'s Checkout block draws the form' );
	assert.ok( r.proposal.rows.slice( 1 ).every( ( x ) => 'absorbed' === x.action && 'ownedPart' === x.rule ) );
	assert.deepEqual( r.proposal.surfaceRole, { role: 'ownedPart', row: 'checkout', part: 'The form' } );
	assert.ok( ! names( r.skeleton ).some( ( n ) => n.startsWith( 'sgs/form' ) ) );
	// Negative controls: a saved form with its own row, and a form on an ordinary page, stay sgs/form with their field.
	for ( const [ why, pageMap, route ] of [ [ 'its own sgs_form row', [ CHECKOUT, SAVED ], 'Checkout.dc.html' ], [ 'an ordinary page', [ CHECKOUT, CONTACT ], 'Contact.dc.html' ], [ 'no page map', [], 'Checkout.dc.html' ] ] ) {
		const own = run( FORM, { pageMap, route } );
		assert.equal( own.skeleton[ 0 ].name, 'sgs/form', why );
		assert.ok( names( own.skeleton ).includes( 'sgs/form-field-email' ), why );
	}
} );

test( 'MUST FAIL: a form on a view the account row folds in is the account block', () => {
	const r = run( FORM, { pageMap: [ ACCOUNT ], route: 'SignIn.dc.html?mode=register' } );
	assert.deepEqual( r.skeleton.map( ( n ) => n.name ), [ 'sgs/account' ] );
	assert.equal( rowOfRoute( [ ACCOUNT ], 'SignIn.dc.html#forgot' ), ACCOUNT, 'a route with a query or fragment is its page' );
	// Negative control: without the fold the route is no WooCommerce page.
	assert.equal( run( FORM, { pageMap: [ { ...ACCOUNT, folds: [] } ], route: 'SignIn.dc.html' } ).skeleton[ 0 ].name, 'sgs/form' );
} );

test( 'MUST FAIL: a part the page map gives its page (notes only or the page\'s own) places nothing on its own surface', () => {
	const GIFTS = { slug: 'gifts', postType: 'page', template: 'page', route: 'Gifts.dc.html', id: null, parts: [ { kind: 'form', label: 'The form', owner: 'draft-notes', draftId: 'surfaces.json S-09' } ] };
	const r = run( FORM, { pageMap: [ GIFTS ], route: 'Gifts.dc.html' } );
	assert.deepEqual( r.skeleton, [] );
	assert.equal( r.proposal.rows[ 0 ].action, 'remove' );
	assert.equal( r.proposal.rows[ 0 ].rule, 'ownedPart' );
	assert.match( r.proposal.rows[ 0 ].reason, /part "The form" of the gifts row \(owner draft-notes\)/ );
	// Negative control: a part naming another record is another surface's.
	const other = { ...GIFTS, parts: [ { ...GIFTS.parts[ 0 ], draftId: 'surfaces.json S-10' } ] };
	assert.equal( run( FORM, { pageMap: [ other ], route: 'Gifts.dc.html' } ).skeleton[ 0 ].name, 'sgs/form' );
} );

test( 'surfaceRole: a page, header or footer is never another row\'s part, and a surface with its own row is that row', () => {
	assert.equal( surfaceRole( { pageMap: [ CHECKOUT ], id: 'S-09', kind: 'header', route: 'Checkout.dc.html' } ), null, 'a page\'s own header is built on its own surface' );
	assert.equal( surfaceRole( { pageMap: [ CHECKOUT ], id: 'S-09', kind: 'page', route: 'Checkout.dc.html' } ), null );
	assert.equal( surfaceRole( { pageMap: [ CHECKOUT, { ...SAVED, postType: 'sgs_modal' } ], id: 'S-09', kind: 'modal', route: 'Checkout.dc.html' } ), null );
	assert.equal( surfaceRole( { pageMap: [ CHECKOUT ], id: 'S-09', kind: 'modal', route: 'Checkout.dc.html' } ).part.owner, 'woocommerce' );
} );

test( 'MUST FAIL: a form surface whose root is a lone link or button is that control, never a form with nothing to fill in', () => {
	const link = run( [ E( 1, 'a', null, { attrs: { href: '#results' }, words: 'Show 4 gifts', rendered: R0 } ) ] );
	assert.ok( ! names( link.skeleton ).includes( 'sgs/form' ), 'a link the form record names leads elsewhere' );
	assert.notEqual( link.proposal.rows[ 0 ].rule, 'formHost' );
	const button = run( [ E( 1, 'button', null, { words: 'Add to basket', click: 'add', rendered: R0 } ) ] );
	assert.ok( ! names( button.skeleton ).includes( 'sgs/form' ) );
	const bareForm = run( [ E( 1, 'form', null, { rendered: R0 } ), E( 2, 'button', 1, { attrs: { type: 'submit' }, words: 'Go', rendered: R0 } ) ], { kind: 'modal' } );
	assert.ok( ! names( bareForm.skeleton ).includes( 'sgs/form' ), 'a <form> holding only its submit button has nothing to fill in' );
	// Negative controls: a root holding a field, a lone field, and a <form> with a field are the form block.
	assert.equal( run( FORM ).skeleton[ 0 ].name, 'sgs/form' );
	assert.equal( run( [ E( 1, 'input', null, { attrs: { type: 'search' }, rendered: R0 } ) ] ).skeleton[ 0 ].name, 'sgs/form' );
	assert.equal( run( [ E( 1, 'form', null, { rendered: R0 } ), E( 2, 'input', 1, { attrs: { type: 'text' }, rendered: R0 } ) ], { kind: 'modal' } ).skeleton[ 0 ].name, 'sgs/form' );
} );

test( 'MUST FAIL: a hash route keeps its route fragment, so a hash-routed draft folds its account views like a file-routed one', () => {
	assert.equal( routePath( '#/account?tab=orders' ), '#/account' );
	assert.equal( routePath( 'Site.dc.html?x=1#/account/addresses' ), 'Site.dc.html#/account/addresses' );
	assert.equal( rowOfRoute( [ { slug: 'my-account', route: '#/signin', folds: [ '#/account' ] } ], '#/account?tab=1' )?.slug, 'my-account' );
	assert.equal( routePath( 'SignIn.dc.html?mode=register' ), 'SignIn.dc.html', 'negative control: a query string still goes' );
	assert.equal( routePath( 'Help.dc.html#faq' ), 'Help.dc.html', 'negative control: an in-page anchor is not a route' );
} );
