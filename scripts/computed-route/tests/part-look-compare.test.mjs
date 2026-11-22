// The comparison of the route's values with a site's saved settings (lib/part-look-compare.mjs), the read of saved block attributes
// and the refusals of the write path (lib/part-look-run.mjs), and the page roles (part-look.mjs::pagesOf). Planted inputs only:
// no site is contacted (run-tests.mjs sets SGS_NO_SITE).
// Run: node scripts/computed-route/tools/run-tests.mjs tests/part-look-compare.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { compareSettings, effective, faultsOf, sameSetting } from '../lib/part-look-compare.mjs';
import { assertMayWrite, blockAttrsIn, customCssOf, readSavedBlock } from '../lib/part-look-run.mjs';
import { pagesOf } from '../part-look.mjs';

const SITE = { palette: [ { slug: 'mm-cocoa', colour: { r: 58, g: 42, b: 34, a: 1 } } ], fontFamilies: [ { slug: 'heading', family: 'young serif' } ] };
const write = ( attr, value, part = 'p', extra = {} ) => ( { attr, value, part, property: 'color', ...extra } );
const cmp = ( writes, saved, settings = {}, lookAttrs = null ) => compareSettings( { writes, settings, saved, lookAttrs: lookAttrs || [ ...new Set( [ ...writes.map( ( w ) => w.attr ), ...Object.keys( saved ) ] ) ], site: SITE } );

test( 'a saved value equal to the route\'s is equal, whatever form each takes: slug or colour, plain or per-device box', () => {
	const box = { top: '14px', right: '14px', bottom: '14px', left: '14px' };
	const c = cmp( [ write( 'aColour', 'mm-cocoa' ), write( 'aPad', { desktop: box } ), write( 'bPad', box ) ], { aColour: '#3A2A22', aPad: box, bPad: { desktop: box, tablet: box } } );
	assert.equal( c.counts.equal, 3 );
	assert.equal( c.counts.differs, 0 );
} );

test( 'a different saved value is differs, with both values', () => {
	const c = cmp( [ write( 'aSize', 19 ) ], { aSize: 20 } );
	assert.equal( c.counts.differs, 1 );
	assert.deepEqual( [ c.differs[ 0 ].route, c.differs[ 0 ].saved ], [ 19, 20 ] );
} );

test( 'a narrower device the route writes and the site does not hold differs unless it shows the same value', () => {
	assert.equal( sameSetting( { desktop: '40px', tablet: '24px' }, { desktop: '40px' } ), false );
	assert.equal( sameSetting( { desktop: '40px' }, { desktop: '40px', tablet: '40px' } ), true );
	assert.deepEqual( effective( { desktop: 1, mobile: 3 } ), { desktop: 1, tablet: 1, mobile: 3 } );
} );

test( 'a saved setting the route does not write is hand-set only, with the reason the build gave', () => {
	const settings = { aSaved: { code: 'noLocator', part: 'x' }, bSaved: { code: 'unpaired', part: 'y' }, cSaved: { code: 'noDifference', part: 'z' } };
	const c = cmp( [], { aSaved: 1, bSaved: 2, cSaved: 3 }, settings );
	assert.deepEqual( c.counts.handSetOnlyByReason, { noLocator: 1, unpaired: 1, noDifference: 1 } );
	assert.match( c.handSetOnly.find( ( h ) => 'unpaired' === h.code ).reason, /no element/ );
} );

test( 'a value the route writes and the site does not hold is route only', () => {
	const c = cmp( [ write( 'aColour', 'mm-cocoa' ) ], {} );
	assert.equal( c.counts.routeOnly, 1 );
	assert.equal( c.counts.equal + c.counts.differs + c.counts.handSetOnly, 0 );
} );

test( 'negative control: a saved attribute that is not a look setting is left out of the comparison', () => {
	const c = compareSettings( { writes: [], settings: {}, saved: { sgsCustomCss: 'a{}', displayMode: 'drawer' }, lookAttrs: [ 'aColour' ], site: SITE } );
	assert.equal( c.counts.handSetOnly, 0 );
} );

test( 'a shadow with its colour in the string equals the route\'s shadow and colour setting', () => {
	const writes = [ write( 'aShadow', '3px 3px 0 0', 'p', { property: 'box-shadow', pairedColour: 'aShadowColour' } ), write( 'aShadowColour', 'mm-cocoa', 'p', { companionOf: 'aShadow' } ) ];
	assert.equal( cmp( writes, { aShadow: '3px 3px 0 #3A2A22' } ).counts.equal, 1 );
	assert.equal( cmp( writes, { aShadow: '4px 3px 0 #3A2A22' } ).counts.differs, 1 );
} );

test( 'a differing colour whose saved slug is not in the client palette says so', () => {
	const c = cmp( [ write( 'aColour', 'mm-cocoa' ) ], { aColour: 'primary-text' } );
	assert.match( c.differs[ 0 ].note, /palette does not hold/ );
} );

test( 'values that land on a setting with a recorded fault are counted as written, known not to paint', () => {
	const c = cmp( [ write( 'aColour', 'mm-cocoa', 'p', { knownFault: 'prints nothing' } ), write( 'bColour', 'mm-cocoa' ) ], { aColour: 'mm-cocoa' } );
	assert.equal( c.counts.knownFaultValues, 1 );
} );

test( 'known faults come from the data file and from look-table rows with no selector for the block', () => {
	const table = { columns: { gap: { attrs: [ [ 'Gap', 'object' ] ] } }, rows: { step: { checkout: '.s', columns: [ 'gap' ] }, item: { cart: '.i', checkout: '.i', columns: [ 'gap' ] } } };
	const faultOf = faultsOf( { block: 'woocommerce/cart', blockKey: 'cart', table, listed: { blocks: { 'woocommerce/cart': { sgsFieldPadding: 'loses' } } } } );
	assert.equal( faultOf( 'sgsFieldPadding' ), 'loses' );
	assert.match( faultOf( 'sgsStepGap' ), /no cart selector/ );
	assert.equal( faultOf( 'sgsItemGap' ), null );
	assert.equal( faultsOf( { block: 'sgs/account', blockKey: null, table, listed: { blocks: {} } } )( 'sgsStepGap' ), null );
} );

test( 'a block\'s saved attributes are read from its comment, and its Custom CSS counted', () => {
	const content = '<!-- wp:paragraph --><p>x</p><!-- /wp:paragraph --><!-- wp:woocommerce/cart {"sgsItemGap":"16px","sgsCustomCss":"a{x:1}b{y:2}"} /-->';
	const { attrs, count } = blockAttrsIn( content, 'woocommerce/cart' );
	assert.equal( attrs.sgsItemGap, '16px' );
	assert.equal( count, 1 );
	assert.deepEqual( customCssOf( attrs ), { attributes: 1, rules: 2, bytes: 12 } );
	assert.deepEqual( blockAttrsIn( content, 'sgs/cart' ), { attrs: {}, count: 0 } );
} );

test( 'negative control: the write path refuses every site that is not a scratch copy', () => {
	for ( const site of [ 'local-mamas', 'mamas-test', 'eye-care-test', 'sandybrown', 'local-eye-care' ] ) {
		assert.throws( () => assertMayWrite( site, {} ), /not a scratch copy/ );
	}
} );

test( 'the write path refuses a protected scratch name and, under SGS_NO_SITE, every site', () => {
	assert.throws( () => assertMayWrite( 'local-mediatest-x', { 'local-mediatest-x': { protected: 'live' } } ), /protected/ );
	assert.ok( process.env.SGS_NO_SITE );
	assert.throws( () => assertMayWrite( 'local-mediatest-x', {} ), /SGS_NO_SITE|may not contact|site/i );
} );

test( 'the read refuses a site that is not a local mirror or scratch copy', () => {
	assert.throws( () => readSavedBlock( { site: 'mamas-test', postId: 1, block: 'woocommerce/cart' } ), /local mirror or scratch copy/ );
} );

test( 'page roles come from the page map and the account row\'s own WooCommerce parts', () => {
	const rows = [
		{ route: 'Basket.dc.html', postType: 'page', template: 'cart' },
		{ route: 'Checkout.dc.html', postType: 'page', template: 'checkout' },
		{ route: 'Account.dc.html', postType: 'page', template: 'page', parts: [ { owner: 'woocommerce', draftId: 'Account.dc.html:1:1 <form>' }, { owner: 'woocommerce', draftId: 'SignIn.dc.html:49:9 <form>' } ] },
	];
	const pages = pagesOf( { rows, surfaces: { 'my-account': { draftIndex: 'Account.dc.html' } } } );
	assert.deepEqual( pages, { cart: 'Basket.dc.html', checkout: 'Checkout.dc.html', account: 'Account.dc.html', signin: 'SignIn.dc.html' } );
} );

test( 'MUST FAIL: a sign-in draft made a page of its own (D-1) is still the account\'s sign-in page, so the signed-in views can sign in', () => {
	const rows = [
		{ route: 'Account.dc.html', postType: 'page', slug: 'my-account', template: 'page', parts: [ { owner: 'woocommerce', draftId: 'Account.dc.html:1:1 <form>' } ] },
		{ route: 'SignIn.dc.html', postType: 'page', slug: 'sign-in', template: 'page', parts: [ { owner: 'woocommerce', draftId: 'SignIn.dc.html:49:9 <form>' } ] },
	];
	assert.equal( pagesOf( { rows, surfaces: { 'my-account': { draftIndex: 'Account.dc.html' } } } ).signin, 'SignIn.dc.html' );
	assert.equal( pagesOf( { rows: rows.slice( 0, 1 ), surfaces: { 'my-account': { draftIndex: 'Account.dc.html' } } } ).signin, undefined, 'negative control: no sign-in page, no sign-in role' );
} );
