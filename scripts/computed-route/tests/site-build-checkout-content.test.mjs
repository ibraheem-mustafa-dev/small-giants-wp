// The checkout content step (MERGED F-24; lib/site-build-checkout-content.mjs): what the checkout draft draws is written onto the
// checkout page's WooCommerce block tree, because the page's content (not the template) holds the Checkout block's words, steps and
// extra blocks and no route step wrote them. The MUST FAIL tests read both clients' saved skeleton inventories and drafts and plan
// against WooCommerce 11.3's default checkout content (tests/fixtures/checkout-content/wc-default-checkout.html, the content
// WC_Install::get_checkout_block_content gives a new shop). Each turns red under a mutation in
// tests/site-build-checkout-content.mutations.json (from scripts/computed-route: node tools/mutate.mjs .
// tests/site-build-checkout-content.mutations.json tests/site-build-checkout-content.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHECKOUT_MARKER, GIFT, NOTE, PAY_LATER, REMINDER_OPTION, SIGNUP_OPTION, WC, applyCheckoutPlan, checkoutDraft, checkoutPlanFor, outlineContent, planCheckoutContent, readCheckoutArtefacts, runCheckoutContent, escHtml, safeLink } from '../lib/site-build-checkout-content.mjs';
import { blocksOf, parseContent, removeBlock, serializeAttrs, serializeContent } from '../lib/checkout-content-markup.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '..', '..', '..' );
const EC = 'eye-care-ward-end';
const MM = 'mamas-munches-redesign';
const DEFAULT = fs.readFileSync( path.join( HERE, 'fixtures', 'checkout-content', 'wc-default-checkout.html' ), 'utf8' );

// The planned page for a client, as { tree: [ { name, attrs, parent } ], content, changes, notes, plan, draft }.
function planned( client, mutate = null ) {
	let draft;
	let plan;
	if ( mutate ) {
		const a = readCheckoutArtefacts( { repo: REPO, client } );
		const inventory = JSON.parse( JSON.stringify( a.inventory ) );
		mutate( inventory );
		const link = ( href ) => ( { 'Help.dc.html#allergens': '/help/#allergens', 'Help.dc.html#legal': '/help/#legal' }[ href ] ?? null );
		draft = checkoutDraft( { inventory, source: a.source, link } );
		plan = planCheckoutContent( draft );
	} else {
		( { draft, plan } = checkoutPlanFor( { repo: REPO, client } ) );
	}
	const r = applyCheckoutPlan( DEFAULT, plan );
	const tree = blocksOf( parseContent( r.content ) ).map( ( x ) => ( { name: x.block.name, attrs: x.block.attrs, parent: x.parent.name } ) );
	return { ...r, tree, plan, draft };
}
const attrsOf = ( p, name ) => p.tree.find( ( b ) => b.name === name )?.attrs;
const order = ( p, parent ) => p.tree.filter( ( b ) => b.parent === parent ).map( ( b ) => b.name );
const el = ( inv, key ) => inv.elements.find( ( e ) => e.key === key );

test( 'MUST FAIL: Eye Care\'s from-blank checkout gets 1 CONTACT / 2 DELIVERY / 3 PAYMENT, PAY NOW with the total and no dot, YOUR BAG with Edit, the Klarna and secure-payment lines and no order note', () => {
	const p = planned( EC );
	const checkout = attrsOf( p, WC.checkout );
	assert.equal( checkout.showFormStepNumbers, true, 'the step headings lead with a number child: WooCommerce numbers the steps' );
	assert.equal( attrsOf( p, WC.contact ).title, 'Contact' );
	assert.equal( attrsOf( p, WC.address ).title, 'Delivery' );
	assert.equal( attrsOf( p, WC.methods ).title, '', 'the delivery options sit inside the Delivery step: no heading and no number of their own' );
	assert.equal( attrsOf( p, WC.payment ).title, 'Payment' );
	assert.deepEqual( attrsOf( p, WC.actions ), { placeOrderButtonLabel: 'Pay now', className: 'is-style-with-price', priceSeparator: '' } );
	assert.match( p.content, /<div class="wp-block-woocommerce-checkout-actions-block is-style-with-price"><\/div>/, 'the saved wrapper carries the class the attribute names' );
	assert.equal( checkout.sgsCheckoutStrings.summaryTitle, 'Your bag' );
	assert.equal( checkout.sgsSummaryEditLinkLabel, 'Edit' );
	assert.equal( checkout.sgsItemShowBrand, true, 'the bag line\'s first text line is set in capitals above the name' );
	assert.deepEqual( checkout.sgsCheckoutStrings, { summaryTitle: 'Your bag', expressDivider: 'or pay by card', createAccountLabel: 'Create an account', loginLink: 'Sign in', loginPrefix: 'Already have an account? ', emailLabel: 'Email' } );
	assert.ok( ! p.tree.some( ( b ) => b.name === WC.orderNote ), 'the draft draws no note field' );
	const fields = order( p, WC.fields );
	assert.equal( fields[ fields.indexOf( WC.actions ) + 1 ], NOTE, 'the secure-payment line sits below the button' );
	assert.equal( p.tree.find( ( b ) => b.name === NOTE ).attrs.text, 'Secure payment. Prescription details are held under UK GDPR and seen only by me.' );
	assert.deepEqual( order( p, WC.totals ), [ WC.summary, PAY_LATER ], 'the Klarna line is the pay-later message under the summary' );
	assert.deepEqual( attrsOf( p, WC.terms ), {}, 'the draft draws no terms line: WooCommerce\'s stays (D-6)' );
	assert.ok( ! p.tree.some( ( b ) => b.name === GIFT ) );
	assert.deepEqual( p.plan.options.map( ( o ) => o.name ), [ SIGNUP_OPTION, REMINDER_OPTION ] );
	assert.deepEqual( p.draft.gaps, [] );
} );

test( 'MUST FAIL: Mama\'s from-blank checkout gets its four numbered titles, the gift step, the allergen note, its terms line below the button and no dot', () => {
	const p = planned( MM );
	const checkout = attrsOf( p, WC.checkout );
	assert.equal( checkout.showFormStepNumbers, undefined, 'the numbers are in the titles\' own words, so WooCommerce adds none' );
	assert.equal( attrsOf( p, WC.contact ).title, '1 · Your details' );
	assert.equal( attrsOf( p, WC.address ).title, '3 · Delivery' );
	assert.equal( attrsOf( p, WC.methods ).title, '' );
	assert.equal( attrsOf( p, WC.payment ).title, '4 · Payment' );
	assert.deepEqual( attrsOf( p, GIFT ), { stepTitle: '2 · Who’s it for?', optionMeLabel: 'for me', optionMeText: 'Send to my address', optionGiftLabel: 'it’s a gift ♥', optionGiftText: 'Send to someone else', recipientLabel: 'Her name', recipientLimit: 40, messageLabel: 'Your note', messagePlaceholder: 'Congratulations, mama!', messageLimit: 200, giftOnlyLine: 'We’ll leave the prices off the packing slip' } );
	const fields = order( p, WC.fields );
	assert.equal( fields[ fields.indexOf( WC.contact ) + 1 ], GIFT, 'the gift step follows the details step, as drawn' );
	assert.deepEqual( fields.slice( -3 ), [ NOTE, WC.actions, WC.terms ], 'the allergen note above the button, the terms line below it' );
	assert.deepEqual( p.tree.find( ( b ) => b.name === NOTE && b.parent === WC.fields ).attrs, { text: 'Contains oats (gluten), eggs, milk and fenugreek unless you chose the vegan base. Made in a kitchen that handles tree nuts.', linkLabel: 'Full allergen info', linkUrl: '/help/#allergens' } );
	assert.deepEqual( attrsOf( p, WC.actions ), { placeOrderButtonLabel: 'Pay', className: 'is-style-with-price', priceSeparator: '' } );
	assert.equal( attrsOf( p, WC.terms ).text, 'By placing your order you agree to our <a href="/help/#legal">terms</a>.' );
	assert.equal( checkout.sgsCheckoutStrings.summaryTitle, 'Your order' );
	assert.equal( checkout.sgsCheckoutStrings.cityLabel, 'Town or city' );
	assert.equal( checkout.sgsCheckoutStrings.loginLink, 'Have an account? Sign in' );
	assert.equal( checkout.sgsItemShowBrand, undefined, 'Mama\'s lines show no brand' );
	assert.equal( checkout.sgsSummaryEditLinkLabel, undefined );
	assert.deepEqual( order( p, WC.totals ), [ WC.summary, NOTE ], 'the summary\'s closing line is a note under it; no pay-later line' );
	assert.equal( p.tree.filter( ( b ) => b.name === NOTE )[ 1 ].attrs.text, 'Baked fresh for you · with you in 3–5 days' );
	assert.ok( ! p.tree.some( ( b ) => b.name === WC.orderNote ) );
} );

test( 'every block the step does not touch is written back byte for byte, and settings are escaped as WordPress escapes them', () => {
	assert.equal( serializeContent( parseContent( DEFAULT ) ), DEFAULT );
	const p = planned( MM );
	for ( const name of [ WC.fields, WC.totals, WC.summary, 'woocommerce/checkout-express-payment-block', 'woocommerce/checkout-billing-address-block', 'woocommerce/checkout-order-summary-taxes-block' ] ) {
		const opener = new RegExp( `<!-- wp:${ name } -->\\n<div class="wp-block-${ name.replace( '/', '-' ) }">` );
		assert.match( p.content, opener, `${ name } keeps its saved markup` );
	}
	assert.match( p.content, /<!-- wp:woocommerce\/checkout-terms-block \{"text":"By placing your order you agree to our \\u003ca href=\\u0022\/help\/#legal\\u0022\\u003eterms\\u003c\/a\\u003e."\} -->/ );
	assert.equal( serializeAttrs( { a: 'x--y & "z"' } ), '{"a":"x\\u002d\\u002dy \\u0026 \\u0022z\\u0022"}' );
	assert.match( p.content, /<!-- wp:sgs\/gift-order \{[^]*?\} \/-->/, 'a dynamic block is written self-closing' );
	assert.doesNotMatch( p.content, /checkout-order-note-block/ );
	assert.doesNotMatch( p.content, /\n\n\n/, 'no blank line is left where a block was removed' );
	const last = parseContent( DEFAULT );
	const fields = blocksOf( last ).find( ( x ) => x.block.name === WC.fields ).block;
	removeBlock( fields, fields.inner.find( ( x ) => 'string' !== typeof x && x.name === WC.actions ) );
	assert.ok( serializeContent( last ).includes( '<!-- /wp:woocommerce/checkout-terms-block --></div>' ), 'the last block goes with the blank line before it' );
} );

test( 'a second run changes nothing, and a value the page already holds is kept and noted', () => {
	for ( const client of [ EC, MM ] ) {
		const p = planned( client );
		const again = applyCheckoutPlan( p.content, p.plan );
		assert.deepEqual( again.changes, [], client );
		assert.equal( again.content, p.content, client );
	}
	const { plan } = checkoutPlanFor( { repo: REPO, client: EC } );
	const held = DEFAULT.replace( '<!-- wp:woocommerce/checkout-contact-information-block -->', '<!-- wp:woocommerce/checkout-contact-information-block {"title":"Your details"} -->' ).replace( '<!-- wp:woocommerce/checkout -->', '<!-- wp:woocommerce/checkout {"sgsCheckoutStrings":{"summaryTitle":"Basket"}} -->' );
	const r = applyCheckoutPlan( held, plan );
	const tree = blocksOf( parseContent( r.content ) );
	assert.equal( tree.find( ( x ) => x.block.name === WC.contact ).block.attrs.title, 'Your details' );
	assert.equal( tree.find( ( x ) => x.block.name === WC.checkout ).block.attrs.sgsCheckoutStrings.summaryTitle, 'Basket' );
	assert.equal( tree.find( ( x ) => x.block.name === WC.checkout ).block.attrs.sgsCheckoutStrings.loginLink, 'Sign in', 'a key the page lacks is still added' );
	assert.ok( r.notes.some( ( n ) => /title: the page holds "Your details", kept/.test( n ) ) );
	assert.ok( r.notes.some( ( n ) => /summaryTitle: the page holds "Basket", kept/.test( n ) ) );
	// A block the step does not change keeps its saved opening comment byte for byte, unicode escapes included.
	const escaped = DEFAULT.replace( '<!-- wp:woocommerce/checkout-billing-address-block -->', '<!-- wp:woocommerce/checkout-billing-address-block {"title":"2 \\u00b7 Billing"} -->' );
	assert.ok( applyCheckoutPlan( escaped, plan ).content.includes( '<!-- wp:woocommerce/checkout-billing-address-block {"title":"2 \\u00b7 Billing"} -->' ) );
	const noCheckout = applyCheckoutPlan( '<!-- wp:shortcode -->[woocommerce_checkout]<!-- /wp:shortcode -->', plan );
	assert.deepEqual( noCheckout.changes, [] );
	assert.match( noCheckout.notes[ 0 ], /holds no woocommerce\/checkout block/ );
} );

test( 'negative controls: what the draft does not draw is left as WooCommerce has it', () => {
	// No number child in the step headings: no WooCommerce numbers.
	const plain = planned( EC, ( inv ) => [ 'Root/754#0', 'Root/772#0', 'Root/808#0' ].forEach( ( k ) => ( el( inv, k ).visible = { 375: false, 768: false, 1440: false } ) ) );
	assert.equal( attrsOf( plain, WC.checkout ).showFormStepNumbers, undefined );
	assert.equal( attrsOf( plain, WC.contact ).title, 'Contact' );
	// A note field in a step keeps the order-note block.
	const noted = planned( MM, ( inv ) => inv.elements.push( { ...el( inv, 'Root/97#0' ), key: 'Root/990#0', parentKey: 'Root/85#0', tag: 'textarea', snippet: '<textarea data-dc-tpl="990">' } ) );
	assert.ok( noted.tree.some( ( b ) => b.name === WC.orderNote ) );
	// No tick box: no account-creation words or option; no sign-in link: no reminder.
	const noTick = planned( MM, ( inv ) => [ 'Root/57#0', 'Root/58#0', 'Root/59#0', 'Root/60#0', 'Root/61#0', 'Root/62#0', 'Root/50#0', 'Root/51#0' ].forEach( ( k ) => ( el( inv, k ).visible = { 375: false, 768: false, 1440: false } ) ) );
	assert.equal( attrsOf( noTick, WC.checkout ).sgsCheckoutStrings.createAccountLabel, undefined );
	assert.equal( attrsOf( noTick, WC.checkout ).sgsCheckoutStrings.loginLink, undefined );
	assert.deepEqual( noTick.plan.options, [] );
	// A button with no amount: no price style and no separator.
	const bare = planned( MM, ( inv ) => {
		el( inv, 'Root/117#0' ).allText = 'Place my order';
	} );
	assert.deepEqual( attrsOf( bare, WC.actions ), { placeOrderButtonLabel: 'Place my order' } );
	// A dot drawn between the words and the amount is WooCommerce's own separator: none written.
	const dot = planned( MM, ( inv ) => {
		el( inv, 'Root/117#0' ).allText = 'Pay · £30.45';
	} );
	assert.deepEqual( attrsOf( dot, WC.actions ), { placeOrderButtonLabel: 'Pay', className: 'is-style-with-price' } );
	// A line after the button with no link is a note, not the terms.
	const unlinked = planned( MM, ( inv ) => ( el( inv, 'Root/119#0' ).visible = { 375: false, 768: false, 1440: false } ) );
	assert.deepEqual( attrsOf( unlinked, WC.terms ), {} );
	assert.deepEqual( order( unlinked, WC.fields ).slice( -3 ), [ NOTE, WC.actions, NOTE ] );
	// An email field told by its type alone is still the contact step's.
	const typed = planned( EC, ( inv ) => ( el( inv, 'Root/756#0' ).snippet = el( inv, 'Root/756#0' ).snippet.replace( ' sc-camel-auto-complete="email"', '' ) ) );
	assert.equal( attrsOf( typed, WC.contact ).title, 'Contact' );
	assert.equal( attrsOf( typed, WC.checkout ).sgsCheckoutStrings.emailLabel, 'Email' );
	// A step of three choices is no gift step, note box or not.
	const three = planned( MM, ( inv ) => inv.elements.push( { ...el( inv, 'Root/76#0' ), key: 'Root/991#0', srcOwnText: 'Send later', words: 'Send later' } ) );
	assert.ok( ! three.tree.some( ( b ) => b.name === GIFT ) );
	// A step of two choices with no note box in its template is no gift step.
	const noGift = planned( MM, () => {} );
	assert.ok( noGift.tree.some( ( b ) => b.name === GIFT ), 'control: the real draft does place it' );
	const a = readCheckoutArtefacts( { repo: REPO, client: MM } );
	const draft = checkoutDraft( { inventory: a.inventory, source: a.source.replace( /<textarea[^>]*><\/textarea>/, '' ), link: () => '/x/' } );
	assert.equal( draft.gift, null );
} );

// A fake site for the run: the checkout page, its CHECKOUT_MARKER and the two options; `drop` makes a write keep the old markup.
function fakeSite( { page = DEFAULT, marker = '', options = { [ SIGNUP_OPTION ]: 'no', [ REMINDER_OPTION ]: 'yes' } } = {} ) {
	const site = { page, marker, options, drop: false, calls: [] };
	site.runPhp = ( php ) => {
		site.calls.push( php );
		if ( php.includes( 'update_post_meta' ) ) {
			const b64 = /base64_decode\( '([^']+)' \)/.exec( php )?.[ 1 ];
			b64 && ! site.drop && ( site.page = Buffer.from( b64, 'base64' ).toString( 'utf8' ) );
			site.marker = site.noMarker ? site.marker : new RegExp( `update_post_meta\\( 8, '${ CHECKOUT_MARKER }', '([0-9a-f]{64})' \\)` ).exec( php )?.[ 1 ] ?? site.marker;
			for ( const m of php.matchAll( /update_option\( '([a-z_]+)', '([a-z]+)' \)/g ) ) {
				site.options = { ...site.options, [ m[ 1 ] ]: m[ 2 ] };
			}
			return '{"ok":true,"error":""}';
		}
		return JSON.stringify( { id: 8, content: Buffer.from( site.page ).toString( 'base64' ), marker: site.marker, options: site.options } );
	};
	return site;
}
const writes = ( site ) => site.calls.filter( ( c ) => c.includes( 'update_post_meta' ) );

test( 'the run reads the page, writes only with --apply, marks the page, reads it back and fails when the site holds other markup', () => {
	const site = fakeSite();
	const log = [];
	assert.equal( runCheckoutContent( { repo: REPO, client: EC, runPhp: site.runPhp, apply: false, log: ( l ) => log.push( l ) } ), 0 );
	assert.deepEqual( writes( site ), [], 'a dry run writes nothing' );
	assert.ok( log.some( ( l ) => l.includes( `option ${ SIGNUP_OPTION }: "no" -> yes` ) ) );
	assert.ok( ! log.some( ( l ) => l.includes( `option ${ REMINDER_OPTION }` ) ), 'an option the site already holds is not planned' );
	assert.equal( runCheckoutContent( { repo: REPO, client: EC, runPhp: site.runPhp, apply: true, log: () => {} } ), 0 );
	assert.match( writes( site )[ 0 ], /^kses_remove_filters\(\); \$r = wp_update_post\(/ );
	assert.match( site.page, /"placeOrderButtonLabel":"Pay now"/ );
	assert.equal( site.options[ SIGNUP_OPTION ], 'yes' );
	assert.match( site.marker, /^[0-9a-f]{64}$/, 'the page records the step\'s first run' );
	site.calls.length = 0;
	assert.equal( runCheckoutContent( { repo: REPO, client: EC, runPhp: site.runPhp, apply: true, log: () => {} } ), 0 );
	assert.deepEqual( writes( site ), [], 'a page already written is not written again' );
	// A first run with nothing to change still marks the page, without saving its content.
	const done = fakeSite( { page: site.page, options: { [ SIGNUP_OPTION ]: 'yes', [ REMINDER_OPTION ]: 'yes' } } );
	assert.equal( runCheckoutContent( { repo: REPO, client: EC, runPhp: done.runPhp, apply: true, log: () => {} } ), 0 );
	assert.equal( writes( done ).length, 1 );
	assert.doesNotMatch( writes( done )[ 0 ], /wp_update_post/ );
	assert.match( done.marker, /^[0-9a-f]{64}$/ );
	site.page = DEFAULT;
	site.drop = true;
	const errors = [];
	assert.equal( runCheckoutContent( { repo: REPO, client: EC, runPhp: site.runPhp, apply: true, log: () => {}, error: ( e ) => errors.push( e ) } ), 1 );
	assert.match( errors[ 0 ], /holds other markup than was written/ );
	// A site that kept the markup but not the marker fails the read-back.
	const unmarked = fakeSite();
	unmarked.noMarker = true;
	const missed = [];
	assert.equal( runCheckoutContent( { repo: REPO, client: EC, runPhp: unmarked.runPhp, apply: true, log: () => {}, error: ( e ) => missed.push( e ) } ), 1 );
	assert.match( missed[ 0 ], new RegExp( `the page carries no ${ CHECKOUT_MARKER }` ) );
	// A page with no Checkout block (a classic shortcode checkout) gets nothing, options included.
	const classic = fakeSite( { page: '<!-- wp:shortcode -->[woocommerce_checkout]<!-- /wp:shortcode -->' } );
	assert.equal( runCheckoutContent( { repo: REPO, client: EC, runPhp: classic.runPhp, apply: true, log: () => {} } ), 0 );
	assert.deepEqual( writes( classic ), [] );
} );

test( 'MUST FAIL: a rerun keeps the client\'s own changes: a put-back order note, the terms moved above the button, an option turned off', () => {
	// The first run, then the client's edits on the site.
	const site = fakeSite();
	assert.equal( runCheckoutContent( { repo: REPO, client: MM, runPhp: site.runPhp, apply: true, log: () => {} } ), 0 );
	assert.doesNotMatch( site.page, /checkout-order-note-block/ );
	const note = '<!-- wp:woocommerce/checkout-order-note-block -->\n<div class="wp-block-woocommerce-checkout-order-note-block"></div>\n<!-- /wp:woocommerce/checkout-order-note-block -->\n\n';
	const terms = /<!-- wp:woocommerce\/checkout-terms-block [^]*?<!-- \/wp:woocommerce\/checkout-terms-block -->/.exec( site.page )[ 0 ];
	site.page = site.page.replace( `\n\n${ terms }`, '' ).replace( '<!-- wp:woocommerce/checkout-actions-block', `${ note }${ terms }\n\n<!-- wp:woocommerce/checkout-actions-block` );
	site.options = { ...site.options, [ SIGNUP_OPTION ]: 'no' };
	const edited = site.page;
	const log = [];
	site.calls.length = 0;
	assert.equal( runCheckoutContent( { repo: REPO, client: MM, runPhp: site.runPhp, apply: true, log: ( l ) => log.push( l ) } ), 0 );
	assert.equal( site.page, edited, 'the client\'s page is left as they made it' );
	assert.deepEqual( writes( site ), [] );
	assert.equal( site.options[ SIGNUP_OPTION ], 'no' );
	assert.ok( log.some( ( l ) => /checkout-order-note-block: the page holds it after the step's first run .*kept/.test( l ) ) );
	assert.ok( log.some( ( l ) => /checkout-terms-block: the page holds it above woocommerce\/checkout-actions-block .*kept/.test( l ) ) );
	assert.ok( log.some( ( l ) => l.includes( `note: option ${ SIGNUP_OPTION } reads "no" after the step's first run` ) ) );
	// The same edits on a page the step has not run on yet (no marker) are the first run's to make.
	const fresh = applyCheckoutPlan( edited, checkoutPlanFor( { repo: REPO, client: MM } ).plan, { firstRun: true } );
	assert.ok( fresh.changes.some( ( c ) => c.includes( 'checkout-order-note-block removed' ) ) );
	assert.ok( fresh.changes.some( ( c ) => c.includes( 'checkout-terms-block moved after' ) ) );
} );

test( 'MUST FAIL: the terms link is escaped for its attribute, and a script or data address keeps WooCommerce\'s terms', () => {
	const a = readCheckoutArtefacts( { repo: REPO, client: MM } );
	const draftWith = ( href ) => checkoutDraft( { inventory: a.inventory, source: a.source.replace( 'href="Help.dc.html#legal"', `href='${ href }'` ), link: ( h ) => ( 'Help.dc.html#allergens' === h ? '/help/#allergens' : h ) } );
	const quoted = draftWith( 'https://example.test/terms?a="b" onmouseover="x' );
	assert.equal( quoted.terms.text, 'By placing your order you agree to our <a href="https://example.test/terms?a=&quot;b&quot; onmouseover=&quot;x">terms</a>.' );
	for ( const bad of [ 'javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,x', '//evil.test/x' ] ) {
		const d = draftWith( bad );
		assert.equal( d.terms, null, bad );
		assert.ok( d.gaps.some( ( g ) => /WooCommerce's terms words are kept/.test( g ) ), bad );
	}
	for ( const good of [ 'mailto:hello@example.test', 'tel:+441234', '#legal', '/help/#legal', 'http://example.test/t' ] ) {
		assert.ok( draftWith( good ).terms?.text.includes( `href="${ good }"` ), good );
	}
	assert.equal( safeLink( ' javascript:x' ), null );
	assert.equal( escHtml( `a"b'c<d>&e&amp;` ), 'a&quot;b&#39;c&lt;d&gt;&amp;e&amp;' );
} );

test( 'the site build runs the step alone, against a saved page, and last in a whole build', () => {
	const src = fs.readFileSync( path.join( HERE, '..', 'site-build.mjs' ), 'utf8' ).replace( /\r\n/g, '\n' );
	assert.match( src, /if \( args\.includes\( '--checkout-content' \) \) \{\n\ttry \{\n\t\tprocess\.exit\( runCheckoutContent\( \{ repo, client, runPhp: wpEvalRunner\( target, site, repo, \{ readOnly: ! apply \} \), apply \} \) \);/ );
	const whole = src.slice( src.indexOf( 'runShopOptions( { repo, client, runPhp, apply: true } )' ) );
	assert.match( whole, /runCheckoutContent\( \{ repo, client, runPhp, apply: true \} \)/, 'a whole build writes the checkout content after the shop options' );
	assert.match( src, /runShopOptions\( \{ repo, client, runPhp, apply: false \} \) \|\| runCheckoutContent\( \{ repo, client, runPhp, apply: false \} \)/, 'a whole dry run prints it' );
	const lines = outlineContent( planned( EC ).content );
	assert.equal( lines[ 0 ].split( ' ' )[ 0 ], WC.checkout );
	assert.ok( lines.includes( '    woocommerce/checkout-contact-information-block {"title":"Contact"}' ) );
} );
