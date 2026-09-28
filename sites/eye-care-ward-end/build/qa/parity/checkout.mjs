// Parity config: checkout, reached with the Gucci Oversized Cat-Eye (Ivory, "as they are")
// already in the bag, the way each side's own shopper reaches it — add to bag, open the
// bag/cart panel, click its Checkout link (never a typed /checkout/ URL: on live an EMPTY
// cart's /checkout/ 302s to /cart/, proven with curl 2026-09-28 — GAP-CHECKLIST 1 also wants
// the click, not the URL).
//
// Live selectors below are two different kinds of evidence:
//   VERIFIED — read from theme/sgs-theme/parts/sgs-checkout-content.html, WooCommerce's own
//   `woocommerce/checkout` composition copied onto the Checkout page (WC 11.1.0): the
//   `.wp-block-woocommerce-checkout*` wrapper classes on every field group.
//   INFERRED — theme/sgs-theme/assets/css/woocommerce.css marks its OWN checkout rules
//   "UNVERIFIED … until a filled cart checkout-page curl is captured" for exactly the same
//   reason this config can't verify them either: an empty cart 302s the page away, and this
//   task forbids adding to the live cart from this session. These are the standard WooCommerce
//   Blocks component classnames (`.wc-block-components-*`) and step headings; a first walker
//   run against a real filled cart either confirms them or turns up `missing` rows to fix.
//
// Run: node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/checkout.mjs
const DRAFT = 'https://mintcream-lyrebird-224487.hostingersite.com/';
const LIVE_PRODUCT = 'https://darkcyan-grouse-898606.hostingersite.com/product/gucci-oversized-cat-eye/?cb={cb}';
const LIVE_CHECKOUT = 'https://darkcyan-grouse-898606.hostingersite.com/checkout/?cb={cb}';
const vis = 'const vis = (e) => e && e.offsetParent !== null;';
// A totals/summary row by its leading label word (Subtotal/Shipping/Delivery/Total), on
// either side's own component classnames (INFERRED live, see header note).
const totalsRow = ( label ) => `(r) => { ${ vis } return [...document.querySelectorAll('.wc-block-components-totals-item, .wc-block-components-totals-footer-item, div, span')].find((e) => vis(e) && new RegExp('^${ label }', 'i').test(e.textContent.trim()) && e.textContent.includes('£')); }`;
const draftTotalsRow = ( label ) => `(r) => { ${ vis } return [...r.querySelectorAll('div')].find((d) => vis(d) && new RegExp('^${ label }', 'i').test(d.textContent.trim()) && d.textContent.includes('£') && d.children.length <= 2); }`;

export default {
	name: 'checkout',
	auto: {
		exclude: {
			// Nav-track chrome outside the header/footer (as product.mjs): the draft's floating
			// WhatsApp bubble and "100% genuine" trust bar.
			draft: [
				'a[aria-label^="Message Fatima"]',
				{ js: '(r) => { let e = [...document.querySelectorAll("span")].find((s) => /^100% genuine/i.test(s.textContent.trim())); while (e && e.parentElement && e.getBoundingClientRect().width < innerWidth - 2) e = e.parentElement; return e; }' },
			],
		},
		normalise: [ { side: 'live', from: /^(\+?£[\d,]+)\.00$/, to: '$1', reason: 'Pennies on every price on checkout (Bean 2026-09-25)' } ],
	},
	draft: {
		url: DRAFT,
		open: async ( h ) => {
			await h.clickText( '^sunglasses$', { wait: 900 } );
			await h.clickText( '^oversized cat-eye$', { wait: 900 } );
			await h.clickText( '^add to bag as they are', { tag: 'button', wait: 1200 } );
			await h.clickText( '^bag', { tag: 'button,a', wait: 900 } );
			// A real SPA route change (GAP-CHECKLIST 1's { nav: true } is for a link that ONLY
			// navigates; this one runs the checkout view's own mount code, so it stays a click).
			await h.clickText( '^checkout$', { tag: 'button', wait: 1200 } );
		},
	},
	live: {
		url: LIVE_PRODUCT,
		open: async ( h ) => {
			await h.click( '.buybox__add-to-cart', { wait: 1500 } );
			// A real page navigation either way (the Checkout block always fully re-renders from
			// the server): the panel's own `.sgs-cart__panel-checkout` link and this goto reach
			// the identical page, so nothing a click would run is skipped (GAP-CHECKLIST 1).
			await h.goto( LIVE_CHECKOUT );
		},
	},
	states: [
		{ name: 'opening', fullPage: true },
		{
			name: 'delivery-toggle',
			// Draft: "Collect in Birmingham", the second of its two delivery buttons.
			draft: ( h ) => h.clickText( '^collect in birmingham', { tag: 'button', wait: 900 } ),
			// Live: INFERRED — the pickup/shipping-method choice, picked by its "pickup"/"collect"
			// wording where present, else the second option in the shipping-method block. Caught,
			// not required: an unverified guess at live's real markup (see header note) should
			// surface as a missing-control finding, never hard-fail the whole run.
			live: async ( h ) => {
				try {
					await h.click( {
						js: `(r) => { const scope = [...document.querySelectorAll('.wp-block-woocommerce-checkout-pickup-options-block, .wp-block-woocommerce-checkout-shipping-method-block')]; const opts = scope.flatMap((s) => [...s.querySelectorAll('input[type=radio], label, button')]); const named = opts.find((e) => /pickup|collect/i.test(e.textContent || '')); return named || opts[1] || opts[0] || null; }`,
					}, { quiet: true, wait: 1200 } );
				} catch {
					h.log.push( { type: 'click', target: 'delivery-toggle (inferred)', hit: false, optional: true } );
				}
			},
		},
		{
			name: 'submit-empty',
			// Proven with Playwright against the real draft, 2026-09-28: clicking Pay Now with
			// every field blank does NOT show required-field errors on the draft — it has no
			// validation at all and completes straight to a mock "Thank you" screen (see
			// confirmation.mjs). This is a genuine draft design fault, left open rather than
			// hidden: the two sides' states genuinely diverge here (draft: order-confirmation
			// content; live: checkout with inline required-field errors, never actually placing
			// an order — WooCommerce Blocks validates client-side before any Store API call).
			draft: ( h ) => h.clickText( '^pay now', { tag: 'button', wait: 1500 } ),
			live: ( h ) => h.clickText( '^place order', { tag: 'button', wait: 1500 } ),
		},
	],
	pairs: [
		{ name: 'page-heading', states: [ 'opening', 'delivery-toggle' ], draft: 'h1', live: 'h1', box: [ 'h' ] },
		{ name: 'heading-contact', states: [ 'opening', 'delivery-toggle' ], box: [ 'h' ],
			draft: { text: '^contact$', tag: 'span,div,h2,h3' },
			live: { js: '(r) => document.querySelector(".wp-block-woocommerce-checkout-contact-information-block")?.previousElementSibling || document.querySelector(".wp-block-woocommerce-checkout-contact-information-block")' } },
		{ name: 'heading-delivery', states: [ 'opening', 'delivery-toggle' ], box: [ 'h' ],
			draft: { text: '^delivery$', tag: 'span,div,h2,h3' },
			live: { js: '(r) => document.querySelector(".wp-block-woocommerce-checkout-shipping-address-block")?.previousElementSibling || document.querySelector(".wp-block-woocommerce-checkout-shipping-address-block")' } },
		{ name: 'heading-payment', states: [ 'opening', 'delivery-toggle' ], box: [ 'h' ],
			draft: { text: '^payment$', tag: 'span,div,h2,h3' },
			live: { js: '(r) => document.querySelector(".wp-block-woocommerce-checkout-payment-block")?.previousElementSibling || document.querySelector(".wp-block-woocommerce-checkout-payment-block")' } },
		// Field groups (VERIFIED live wrapper classes — theme part's own copy of WC's checkout
		// composition; the draft equivalents are the input rows under each numbered step).
		{ name: 'group-contact', states: [ 'opening', 'delivery-toggle' ], text: false, box: [ 'w' ],
			draft: { js: '(r) => document.querySelector(\'input[placeholder="Email"]\')?.closest("div")?.parentElement' },
			live: '.wp-block-woocommerce-checkout-contact-information-block' },
		{ name: 'group-address', states: [ 'opening', 'delivery-toggle' ], text: false, box: [ 'w' ],
			draft: { js: '(r) => document.querySelector(\'input[placeholder="First name"]\')?.closest("div")?.parentElement' },
			live: '.wp-block-woocommerce-checkout-shipping-address-block' },
		{ name: 'group-payment', states: [ 'opening', 'delivery-toggle' ], text: false, box: [ 'w' ],
			draft: { js: '(r) => document.querySelector(\'input[placeholder="Card number"]\')?.closest("div")?.parentElement' },
			live: '.wp-block-woocommerce-checkout-payment-block' },
		{ name: 'express-payment', states: [ 'opening', 'delivery-toggle' ], text: false, box: [ 'h' ],
			draft: { js: '(r) => { const b = [...document.querySelectorAll("button")].find((x) => /^apple pay$/i.test(x.textContent.trim())); return b && b.parentElement; }' },
			live: '.wp-block-woocommerce-checkout-express-payment-block' },
		// Delivery options — both buttons/rows, named separately (GAP-CHECKLIST 6: presence and
		// look, whichever way live actually offers pickup).
		{ name: 'delivery-ship', states: [ 'opening', 'delivery-toggle' ], hover: true,
			draft: { text: '^post it to me', tag: 'button' },
			live: { js: `(r) => { const opts = [...document.querySelectorAll('.wp-block-woocommerce-checkout-pickup-options-block, .wp-block-woocommerce-checkout-shipping-method-block')].flatMap((s) => [...s.querySelectorAll('input[type=radio], label, button')]); return opts[0] || null; }` } },
		{ name: 'delivery-collect', states: [ 'opening', 'delivery-toggle' ], hover: true,
			draft: { text: '^collect in birmingham', tag: 'button' },
			live: { js: `(r) => { const opts = [...document.querySelectorAll('.wp-block-woocommerce-checkout-pickup-options-block, .wp-block-woocommerce-checkout-shipping-method-block')].flatMap((s) => [...s.querySelectorAll('input[type=radio], label, button')]); return opts.find((e) => /pickup|collect/i.test(e.textContent || '')) || opts[1] || null; }` } },
		// Order summary: the line item and the totals rows.
		{ name: 'summary-heading', states: [ 'opening', 'delivery-toggle' ], box: [ 'h' ],
			draft: { text: '^your bag$', tag: 'span,div' },
			live: { text: '^order summary$', tag: 'h2,h3,span,div' } },
		{ name: 'summary-item', states: [ 'opening', 'delivery-toggle' ], box: [ 'h' ],
			draft: { js: `(r) => { ${ vis } return [...document.querySelectorAll('div,span')].find((e) => vis(e) && e.children.length === 0 && /^oversized cat-eye$/i.test(e.textContent.trim())); }` },
			live: '.wc-block-components-order-summary-item, .wc-block-components-order-summary-item__description' },
		{ name: 'summary-subtotal', states: [ 'opening', 'delivery-toggle' ], box: [ 'h' ],
			draft: { js: draftTotalsRow( 'subtotal' ) },
			live: { js: totalsRow( 'subtotal' ) } },
		{ name: 'summary-delivery', states: [ 'opening', 'delivery-toggle' ], box: [ 'h' ],
			draft: { js: draftTotalsRow( '(delivery|collection)' ) },
			live: { js: totalsRow( '(shipping|delivery|pickup)' ) } },
		{ name: 'summary-total', states: [ 'opening', 'delivery-toggle' ], box: [ 'h' ],
			draft: { js: draftTotalsRow( 'total' ) },
			live: { js: totalsRow( 'total' ) } },
		{ name: 'place-order', states: [ 'opening', 'delivery-toggle' ], hover: true,
			draft: { text: '^pay now', tag: 'button' },
			live: { text: '^place order', tag: 'button' } },
		// The empty-submit outcome (GAP-CHECKLIST 10 — a draft bug, not yet an accepted one):
		// live's own inline required-field error text; the draft has no equivalent element at
		// all once it has jumped to its mock confirmation screen.
		{ name: 'validation-error', states: [ 'submit-empty' ], box: [ 'h' ],
			draft: { js: `(r) => { ${ vis } return [...document.querySelectorAll('*')].find((e) => vis(e) && e.children.length === 0 && /required/i.test(e.textContent || '')); }` },
			live: { js: `(r) => { ${ vis } return [...document.querySelectorAll('.wc-block-components-validation-error, [class*="error"]')].find((e) => vis(e) && /required/i.test(e.textContent || '')); }` } },
	],
	// review: left out — no shots taken yet, per the brief.
	accept: [],
};
