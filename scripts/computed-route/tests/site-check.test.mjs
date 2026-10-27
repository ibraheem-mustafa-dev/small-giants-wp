// site-check.mjs's detectors against small HTML fixtures in a real Chromium (page.setContent), so each verdict is the one
// the live run gives: a menu link off the page map is reported, a drawer whose burger does nothing fails, a modal that
// opens and closes passes, and so on. Each MUST FAIL test turns red under a mutation in tests/site-check.mutations.json
// (node scripts/computed-route/tools/mutate.mjs scripts/computed-route scripts/computed-route/tests/site-check.mutations.json tests/site-check.test.mjs).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadChromium } from '../lib/fill-read.mjs';
import { MARK, menuItems, megaItems, drawerItem, readHeaderLinksInPage } from '../lib/site-check-nav.mjs';
import { readPartsInPage, modalItem, flowItem, formItem, wooItem } from '../lib/site-check-parts.mjs';
import { verdictOf, parseOnly, checkRecord, renderMarkdown, exitCodeOf } from '../lib/site-check-report.mjs';
import { pageTargets, flowsClient, rowsFor } from '../lib/site-check-site.mjs';

const BASE = 'https://site.test';
const shoot = async () => null;
let browser;

before( async () => {
	const { chromium } = await loadChromium();
	browser = await chromium.launch();
} );
after( async () => browser?.close() );

async function pageWith( html, width = 1440 ) {
	const page = await browser.newPage( { viewport: { width, height: 800 } } );
	await page.setContent( `<!doctype html><html><head><style>body{margin:0}</style></head><body>${ html }</body></html>` );
	return page;
}

// A header whose burger opens a <dialog> drawer (`works` false: the burger has no handler).
const drawerHtml = ( works ) => `
	<header class="sgs-site-header"><nav class="sgs-nav-bar-menu"><a href="/shop/">Shop</a></nav>
	<button class="burger" aria-controls="sgs-nav-drawer" aria-expanded="false">Menu</button></header>
	<dialog id="sgs-nav-drawer" class="sgs-nav-drawer"><button class="sgs-nav-drawer__close">Close</button><a href="/shop/">Shop</a></dialog>
	${ works ? `<script>
		const b = document.querySelector( '.burger' ), d = document.getElementById( 'sgs-nav-drawer' );
		b.onclick = () => { d.showModal(); b.setAttribute( 'aria-expanded', 'true' ); };
		d.querySelector( 'button' ).onclick = () => { d.close(); b.setAttribute( 'aria-expanded', 'false' ); };
	</script>` : '' }`;

// An sgs/modal as modal/render.php writes it (`works` false: neither trigger nor close button does anything).
const modalHtml = ( works ) => `
	<div class="wp-block-sgs-modal" id="offer"><button type="button" class="sgs-modal__trigger" data-modal-id="m1" aria-haspopup="dialog">Open offer</button>
	<dialog id="m1" class="sgs-modal__dialog" aria-label="Offer" data-open-on-hash-load="false"><button type="button" class="sgs-modal__close" aria-label="Close modal">x</button><p>Offer</p></dialog></div>
	${ works ? `<script>
		const d = document.getElementById( 'm1' );
		document.querySelector( '.sgs-modal__trigger' ).onclick = () => d.showModal();
		d.querySelector( '.sgs-modal__close' ).onclick = () => d.close();
	</script>` : '' }`;

test( 'MUST FAIL: a menu link to an address off the page map is reported, and a page-map link passes', () => {
	const links = [
		{ text: 'Shop', href: '/shop/', abs: `${ BASE }/shop/`, inMenu: true, disclosure: false, selector: 'a >> nth=0' },
		{ text: 'Blog', href: '/blog/', abs: `${ BASE }/blog/`, inMenu: true, disclosure: false, selector: 'a >> nth=1' },
		{ text: 'Offers', href: '#', abs: `${ BASE }/#`, inMenu: true, disclosure: false, selector: 'a >> nth=2' },
		{ text: 'Brands', href: '#', abs: `${ BASE }/#`, inMenu: true, disclosure: true, selector: 'a >> nth=3' },
		{ text: 'Help', href: 'http://Help.dc.html', abs: 'http://help.dc.html/', inMenu: true, disclosure: false, selector: 'a >> nth=4' },
		{ text: 'Zookies', href: '/product/zookies/', abs: `${ BASE }/product/zookies/`, inMenu: false, disclosure: false, selector: 'a >> nth=5' },
	];
	const items = menuItems( { header: true, links, base: BASE, url: BASE, pages: [ { key: 'shop:shop', finalUrl: `${ BASE }/shop/` } ], examples: [ { key: 'product:product', finalUrl: `${ BASE }/product/trio/` } ], headerRows: [ { key: 'page:contact', title: 'Contact', url: `${ BASE }/contact/` } ], draftLinks: [ { href: 'http://Gifts.dc.html', text: 'Gifts', pages: [ 'page:home' ] } ] } );
	const by = Object.fromEntries( items.map( ( i ) => [ i.subject, i ] ) );
	assert.equal( by[ 'menu link "Shop"' ].status, 'pass' );
	assert.equal( by[ 'menu link "Blog"' ].status, 'fail' );
	assert.match( by[ 'menu link "Blog"' ].error, /not a page-map page/ );
	assert.equal( by[ 'menu link "Offers"' ].status, 'fail' );
	assert.equal( by[ 'menu link "Brands"' ].status, 'n-a' );
	assert.match( by[ 'menu link "Help"' ].error, /draft file/ );
	assert.equal( by[ 'header link "Zookies"' ].status, 'pass', 'a link under the product example\'s parent path reaches the product row' );
	assert.equal( by[ 'page-map header item page:contact' ].status, 'fail' );
	assert.equal( by[ 'draft-file link "Gifts"' ].status, 'fail' );
	assert.equal( verdictOf( items ), 'fail' );
} );

test( 'MUST FAIL: the header\'s links are read from the rendered page with their menu-bar flag', async () => {
	const page = await pageWith( '<header class="sgs-site-header"><nav class="sgs-nav-bar-menu"><a href="/a/">A</a></nav><a class="logo" href="/" aria-label="Home"></a></header>' );
	const read = await page.evaluate( readHeaderLinksInPage );
	await page.close();
	assert.deepEqual( read.links.map( ( l ) => [ l.text, l.inMenu ] ), [ [ 'A', true ], [ 'Home', false ] ] );
} );

test( 'MUST FAIL: a drawer that never opens fails', async () => {
	const page = await pageWith( drawerHtml( false ), 375 );
	const item = await drawerItem( page, { width: 375, url: BASE, shoot } );
	await page.close();
	assert.equal( item.status, 'fail' );
	assert.match( item.error, /did not show after the burger's click/ );
} );

test( 'MUST FAIL: a drawer that opens from its burger and closes by its close button passes', async () => {
	const page = await pageWith( drawerHtml( true ), 375 );
	const item = await drawerItem( page, { width: 375, url: BASE, shoot } );
	await page.close();
	assert.equal( item.status, 'pass', item.error );
	assert.match( item.detail, /closed by the close button/ );
} );

test( 'MUST FAIL: a drawer with no visible burger fails at the phone width and is n-a above it', async () => {
	const html = drawerHtml( true ).replace( '<button class="burger"', '<button class="burger" style="display:none"' );
	const phone = await pageWith( html, 375 );
	const tablet = await pageWith( html, 768 );
	const atPhone = await drawerItem( phone, { width: 375, url: BASE, shoot } );
	const atTablet = await drawerItem( tablet, { width: 768, url: BASE, shoot } );
	await phone.close();
	await tablet.close();
	assert.equal( atPhone.status, 'fail' );
	assert.equal( atTablet.status, 'n-a' );
} );

test( 'MUST FAIL: a modal that opens from its trigger and closes passes; one whose trigger does nothing fails', async () => {
	for ( const [ works, want ] of [ [ true, 'pass' ], [ false, 'fail' ] ] ) {
		const page = await pageWith( modalHtml( works ) );
		const { modals } = await page.evaluate( readPartsInPage, MARK );
		assert.equal( modals.length, 1 );
		const item = await modalItem( page, modals[ 0 ], { url: BASE, shoot } );
		await page.close();
		assert.equal( item.status, want, item.error || item.detail );
	}
} );

test( 'MUST FAIL: a modal that opens but cannot be closed fails', async () => {
	const html = modalHtml( true ).replace( "d.querySelector( '.sgs-modal__close' ).onclick = () => d.close();", "d.addEventListener( 'cancel', ( e ) => e.preventDefault() );" );
	const page = await pageWith( html );
	const { modals } = await page.evaluate( readPartsInPage, MARK );
	const item = await modalItem( page, modals[ 0 ], { url: BASE, shoot } );
	await page.close();
	assert.equal( item.status, 'fail' );
	assert.match( item.error, /did not close|neither its close button nor Escape/ );
} );

test( 'MUST FAIL: a mega trigger that opens its panel on hover passes; one with no handler fails', async () => {
	const html = `<header class="sgs-site-header"><nav class="sgs-nav-bar-menu">
		<a href="/about/" data-sgs-mega-trigger aria-expanded="false" aria-controls="p1">About</a><div id="p1" hidden>About panel</div>
		<a href="#" data-sgs-mega-trigger aria-expanded="false" aria-controls="p2" onclick="return false">Brands</a><div id="p2" hidden>Brands panel</div></nav></header>
		<script>
			const t = document.querySelector( '[aria-controls="p1"]' ), p = document.getElementById( 'p1' );
			const set = ( open ) => { p.hidden = ! open; t.setAttribute( 'aria-expanded', String( open ) ); };
			t.onmouseenter = () => set( true );
			t.parentElement.onmouseleave = () => set( false );
			document.addEventListener( 'keydown', ( e ) => 'Escape' === e.key && set( false ) );
		</script>`;
	const page = await pageWith( html );
	const items = await megaItems( page, { url: BASE, shoot } );
	await page.close();
	assert.deepEqual( items.map( ( i ) => i.status ), [ 'pass', 'fail' ] );
	assert.match( items[ 0 ].detail, /opened by hover/ );
} );

const flowHtml = ( works ) => `
	<div data-wp-interactive="sgs/choice-flow" data-flow-id="1-a" aria-label="Pick">
		<div class="sgs-form-step"><button type="button" class="sgs-choice-flow-question__option-button">Me</button></div>
		<div class="sgs-form-step" hidden><button type="button" class="sgs-choice-flow-question__option-button">Box</button></div>
		<button type="button" class="sgs-choice-flow__nav-back" hidden>Back</button>
	</div>
	${ works ? `<script>
		const steps = [ ...document.querySelectorAll( '.sgs-form-step' ) ], back = document.querySelector( '.sgs-choice-flow__nav-back' );
		const go = ( n ) => { steps.forEach( ( s, i ) => ( s.hidden = i !== n ) ); back.hidden = 0 === n; };
		steps[ 0 ].querySelector( 'button' ).onclick = () => go( 1 );
		back.onclick = () => go( 0 );
	</script>` : '' }`;

test( 'MUST FAIL: a choice flow that advances and comes back passes; one that never advances fails', async () => {
	for ( const [ works, want ] of [ [ true, 'pass' ], [ false, 'fail' ] ] ) {
		const page = await pageWith( flowHtml( works ) );
		const { flows } = await page.evaluate( readPartsInPage, MARK );
		const item = await flowItem( page, flows[ 0 ], { url: BASE, shoot } );
		await page.close();
		assert.equal( item.status, want, item.error || item.detail );
		want === 'fail' && assert.match( item.error, /stayed on step 1 of 2/, 'the dead flow fails for not advancing, not for a later step' );
	}
} );

const formHtml = ( works ) => `
	<div class="sgs-form" data-wp-interactive="sgs/form" data-wp-context='{"formId":"contact","successMessage":"Thanks!","successRedirect":""}'>
		<form class="sgs-form__inner" novalidate>
			<input type="text" name="your_name"><input type="email" name="email" required>
			<button type="submit">Send</button>
		</form>
		<p class="sgs-form__message--success" hidden>Thanks!</p>
	</div>
	<script>
		document.querySelector( 'form' ).addEventListener( 'submit', ( e ) => {
			e.preventDefault();
			window.__sent = Object.fromEntries( new FormData( e.target ) );
			${ works ? "document.querySelector( '.sgs-form__message--success' ).hidden = false;" : '' }
		} );
	</script>`;

test( 'MUST FAIL: a form that reaches its success message passes with the marked entry; one that shows nothing fails', async () => {
	for ( const [ works, want ] of [ [ true, 'pass' ], [ false, 'fail' ] ] ) {
		const page = await pageWith( formHtml( works ) );
		const { forms } = await page.evaluate( readPartsInPage, MARK );
		const item = await formItem( page, forms[ 0 ], { url: page.url(), shoot, marker: 'SGS site-check test', rowsSince: async () => ( { count: works ? 1 : 0 } ) } );
		const sent = await page.evaluate( () => window.__sent );
		await page.close();
		assert.equal( item.status, want, item.error || item.detail );
		assert.equal( sent.your_name, 'SGS site-check test' );
	}
} );

test( 'MUST FAIL: a form whose success shows but stores no submission fails', async () => {
	const page = await pageWith( formHtml( true ) );
	const { forms } = await page.evaluate( readPartsInPage, MARK );
	const item = await formItem( page, forms[ 0 ], { url: page.url(), shoot, marker: 'SGS site-check test', rowsSince: async () => ( { count: 0 } ) } );
	await page.close();
	assert.equal( item.status, 'fail' );
} );

test( 'MUST FAIL: a WooCommerce cart below the fold passes; an account page with no sign-in form fails', async () => {
	const cart = await pageWith( '<div style="height:2000px"></div><div class="wp-block-woocommerce-cart"><p>Your basket is empty</p></div>' );
	const cartItem = await wooItem( cart, 'cart', { url: BASE, shoot } );
	await cart.close();
	assert.equal( cartItem.status, 'pass', cartItem.error );
	const account = await pageWith( '<main><h1>My account</h1><a href="/sign-in/">Sign in</a></main>' );
	const accountItem = await wooItem( account, 'account', { url: BASE, shoot } );
	await account.close();
	assert.equal( accountItem.status, 'fail' );
	const signIn = await pageWith( '<main><form class="woocommerce-form-login"><input name="username"><input type="password" name="password"></form></main>' );
	assert.equal( ( await wooItem( signIn, 'account', { url: BASE, shoot } ) ).status, 'pass' );
	await signIn.close();
} );

test( 'MUST FAIL: verdicts, --only and the report', () => {
	assert.equal( verdictOf( [] ), 'n-a' );
	assert.equal( verdictOf( [ { status: 'pass' }, { status: 'n-a' } ] ), 'pass' );
	assert.equal( verdictOf( [ { status: 'pass' }, { status: 'passs' } ] ), 'fail', 'an unknown status never reads as a pass' );
	assert.deepEqual( parseOnly( 'menu,drawer' ).ids, [ 'menu', 'drawer' ] );
	assert.match( parseOnly( 'menu,nope' ).error, /nope/ );
	const checks = [ checkRecord( 'menu', [ { status: 'fail', subject: 'menu link "Blog"', error: 'not a page-map page' } ] ), checkRecord( 'mega', [], 'no mega menu' ) ];
	assert.equal( exitCodeOf( checks ), 1 );
	const md = renderMarkdown( { client: 'c', site: 's', base: BASE, startedAt: 't', exitCode: 1, checks } );
	assert.match( md, /\| 2 \| .* \| FAIL \|/ );
	assert.match( md, /## Failures\n\n- \*\*2\. menu\*\* menu link "Blog": error: not a page-map page/ );
	assert.match( md, /\| 3 \| .* \| N-A \| no mega menu \|/ );
} );

test( 'MUST FAIL: page targets and the flows owner', () => {
	const rows = [
		{ postType: 'page', slug: 'home', id: 5, menus: [] },
		{ postType: 'shop', slug: 'shop', id: 6 },
		{ postType: 'product', slug: 'product', id: null },
		{ postType: 'sgs_form', slug: 'contact', id: 9 },
		{ postType: 'template', slug: 'order-confirmation', id: null },
		{ postType: 'page', slug: 'draft', id: null },
	];
	const t = pageTargets( rows, BASE );
	assert.deepEqual( t.pages.map( ( p ) => p.url ), [ `${ BASE }/?page_id=5`, `${ BASE }/?page_id=6` ] );
	assert.deepEqual( t.examples.map( ( e ) => e.kind ), [ 'product' ] );
	assert.equal( t.skipped.length, 3 );
	assert.equal( rowsFor( rows, 'test-site', { site: 'local-test', mirrorOf: 'test-site' } )[ 0 ].id, 5, 'a mirror keeps its test site\'s ids' );
	assert.equal( rowsFor( rows, 'test-site', { site: 'other' } )[ 0 ].id, null, 'another site\'s ids are dropped' );
	assert.equal( flowsClient( '/repo/sites/some-client/build/qa/flows' ), 'some-client' );
} );
