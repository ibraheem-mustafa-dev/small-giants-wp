// Parity config: checkout, reached with the Gucci Oversized Cat-Eye (Ivory) already in the bag WITH prescription
// lenses (Distance, Thin, Polarised, Send it later: £418), the way each side's own shopper reaches it — the lens
// pop-up's Add to bag, open the bag/cart panel, click its Checkout link (never a typed /checkout/ URL: on live an EMPTY
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
// The lens pop-up on each side (as lens.mjs): the draft's dialog, live's choice flow. The draft's checkout shows its
// "Prescription" section only when the bag holds a lens, so both sides add one.
const DLENS = '[aria-label="Add prescription lenses"]';
const LLENS = 'dialog[open] .sgs-choice-flow';
// The draft's checkout sections carry no class names; each is found by its heading's words ("3Prescription").
const dsection = ( re ) => `(r) => [...document.querySelectorAll('main section')].find((s) => ${ re }.test((s.querySelector('h2') || {}).textContent || ''))`;
// A totals/summary row by its leading label word (Subtotal/Shipping/Delivery/Total), on
// either side's own component classnames (INFERRED live, see header note).
const totalsRow = ( label ) => `(r) => { ${ vis } return [...document.querySelectorAll('.wc-block-components-totals-item, .wc-block-components-totals-footer-item, div, span')].find((e) => vis(e) && new RegExp('^${ label }', 'i').test(e.textContent.trim()) && e.textContent.includes('£')); }`;
const draftTotalsRow = ( label ) => `(r) => { ${ vis } return [...r.querySelectorAll('div')].find((d) => vis(d) && new RegExp('^${ label }', 'i').test(d.textContent.trim()) && d.textContent.includes('£') && d.children.length <= 2); }`;


const config = {
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
			await h.clickText( '^add my prescription', { tag: 'button', wait: 1200 } );
			await h.waitFor( DLENS );
			for ( const answer of [ 'Distance', 'Thin', 'Polarised' ] ) {
				await h.clickText( `^${ answer }`, { within: DLENS, tag: 'button', wait: 900 } );
			}
			await h.clickText( '^add to bag', { within: DLENS, tag: 'button', wait: 1500 } );
			await h.clickText( '^bag', { tag: 'button,a', wait: 900 } );
			// A real SPA route change (GAP-CHECKLIST 1's { nav: true } is for a link that ONLY
			// navigates; this one runs the checkout view's own mount code, so it stays a click).
			await h.clickText( '^checkout$', { tag: 'button', wait: 1200 } );
		},
	},
	live: {
		url: LIVE_PRODUCT,
		open: async ( h ) => {
			await h.clickText( '^add my prescription', { tag: 'a,button', wait: 1200 } );
			await h.waitFor( LLENS );
			for ( const answer of [ 'Distance', 'Thin', 'Polarised' ] ) {
				await h.clickText( `^${ answer }`, { within: LLENS, tag: '.sgs-choice-flow-question__option-button', wait: 150 } );
				await h.click( `${ LLENS } .sgs-choice-flow__continue`, { wait: 900 } );
			}
			await h.click( `${ LLENS } .sgs-choice-flow__add-to-basket`, { wait: 2500 } );
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
			name: 'rx-later',
			// The draft's "Prescription" section (shown because the bag holds a lens) has three modes; "Send it later" swaps the
			// upload box for a note. Live has no such section (Bean 2026-09-25, D1: the prescription is given per pair in the lens
			// pop-up), so its click is optional and a missing control is the finding.
			draft: ( h ) => h.clickText( '^send it later$', { within: 'main', tag: 'button', wait: 700 } ),
			live: ( h ) => h.clickText( '^send it later$', { within: 'main', tag: 'button', wait: 700, optional: true } ),
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
		// The draft's "Prescription" section (its third numbered step, shown because the bag holds a lens): the section, its
		// heading, the "Upload a photo" mode and the dashed upload box (hover). Live builds none of it by design (Bean
		// 2026-09-25, D1), so every live finder reads nothing and the presence rows are accepted below.
		{ name: 'rx-section', states: [ 'opening', 'delivery-toggle', 'rx-later' ], text: false, box: [ 'h' ],
			draft: { js: dsection( '/prescription$/i' ) }, live: '.sgs-checkout-prescription' },
		{ name: 'rx-heading', states: [ 'opening', 'delivery-toggle', 'rx-later' ], box: [ 'h' ],
			draft: { js: `(r) => (${ dsection( '/prescription$/i' ) })(r)?.querySelector('h2')` }, live: '.sgs-checkout-prescription h2' },
		{ name: 'rx-mode-upload', states: [ 'opening', 'delivery-toggle' ], hover: true,
			draft: { text: '^upload a photo$', within: 'main', tag: 'button' }, live: '.sgs-checkout-prescription button' },
		{ name: 'rx-upload-label', states: [ 'opening', 'delivery-toggle' ], hover: true, text: false,
			draft: { js: `(r) => (${ dsection( '/prescription$/i' ) })(r)?.querySelector('label')` }, live: '.sgs-checkout-prescription label' },
		{ name: 'rx-mode-later', states: [ 'rx-later' ], draft: { text: '^send it later$', within: 'main', tag: 'button' }, live: '.sgs-checkout-prescription button' },
		{ name: 'rx-later-note', states: [ 'rx-later' ], box: [ 'h' ],
			draft: { js: `(r) => (${ dsection( '/prescription$/i' ) })(r)?.lastElementChild` }, live: '.sgs-checkout-prescription div' },
		// The sections rise in one after another on the draft (animation "rise", 0.5s for the express wallets to 0.9s for payment):
		// the express block and the payment block carry the two ends of that stagger, compared through their declared motion.
		{ name: 'section-express', states: [ 'opening' ], text: false, box: [ 'h' ], structure: false,
			draft: { js: '(r) => document.querySelector("main section")' }, live: '.wp-block-woocommerce-checkout-express-payment-block' },
		{ name: 'section-payment', states: [ 'opening' ], text: false, box: [ 'h' ], structure: false,
			draft: { js: dsection( '/payment$/i' ) }, live: '.wp-block-woocommerce-checkout-payment-block' },
		// The empty-submit outcome (GAP-CHECKLIST 10 — a draft bug, not yet an accepted one):
		// live's own inline required-field error text; the draft has no equivalent element at
		// all once it has jumped to its mock confirmation screen.
		{ name: 'validation-error', states: [ 'submit-empty' ], box: [ 'h' ],
			draft: { js: `(r) => { ${ vis } return [...document.querySelectorAll('*')].find((e) => vis(e) && e.children.length === 0 && /required/i.test(e.textContent || '')); }` },
			live: { js: `(r) => { ${ vis } return [...document.querySelectorAll('.wc-block-components-validation-error, [class*="error"]')].find((e) => vis(e) && /required/i.test(e.textContent || '')); }` } },
	],
	review: {
		'opening@1440': "Checkout with a prescription lens in the bag (two columns: the form on the left, the \"Your bag\" card on the right): express wallets, 1 Contact, 2 Delivery (Post it to me chosen), 3 Prescription with Upload a photo chosen and the dashed upload box, 4 Payment and the Pay now bar with £418, order summary with the lens line; both sides read the same here because the run compares the draft with itself.",
		'delivery-toggle@1440': "Collect in Birmingham chosen (two columns: the form on the left, the \"Your bag\" card on the right): the address fields are gone, Collect in Birmingham is the ringed card, the summary's delivery row reads Collection, Free; Prescription and Payment sections follow unchanged.",
		'rx-later@1440': "Send it later chosen in the 3 Prescription section (two columns: the form on the left, the \"Your bag\" card on the right): Send it later is the filled button, the dashed upload box is replaced by the note \"No problem, I'll WhatsApp you a link\"; Payment and Pay now below it, the Card number field ringed from the earlier focus.",
		'submit-empty@1440': "Pay now pressed with every field empty: the draft has no validation and goes straight to the mock \"Thank you, order EC-10482\" screen (a tick circle, heading, note, Back to the shop button, footer); no required-field errors appear.",
		'auto-scrolled@1440': "Scrolled a screen and a half (two columns: the form on the left, the \"Your bag\" card on the right): the Payment fields, Pay now bar and its secure-payment line, the summary card's lower rows, then the footer columns; nothing new floats apart from the chat bubble.",
		'opening@768': "Checkout with a prescription lens in the bag (one column with the form first and the \"Your bag\" card under it): express wallets, 1 Contact, 2 Delivery (Post it to me chosen), 3 Prescription with Upload a photo chosen and the dashed upload box, 4 Payment and the Pay now bar with £418, order summary with the lens line; both sides read the same here because the run compares the draft with itself.",
		'delivery-toggle@768': "Collect in Birmingham chosen (one column with the form first and the \"Your bag\" card under it): the address fields are gone, Collect in Birmingham is the ringed card, the summary's delivery row reads Collection, Free; Prescription and Payment sections follow unchanged.",
		'rx-later@768': "Send it later chosen in the 3 Prescription section (one column with the form first and the \"Your bag\" card under it): Send it later is the filled button, the dashed upload box is replaced by the note \"No problem, I'll WhatsApp you a link\"; Payment and Pay now below it, the Card number field ringed from the earlier focus.",
		'submit-empty@768': "Pay now pressed with every field empty: the draft has no validation and goes straight to the mock \"Thank you, order EC-10482\" screen (a tick circle, heading, note, Back to the shop button, footer); no required-field errors appear.",
		'auto-scrolled@768': "Scrolled a screen and a half (one column with the form first and the \"Your bag\" card under it): the Payment fields, Pay now bar and its secure-payment line, the summary card's lower rows, then the footer columns; nothing new floats apart from the chat bubble.",
		'opening@375': "Checkout with a prescription lens in the bag (one column, express wallets in two rows, the \"Your bag\" card under the payment button): express wallets, 1 Contact, 2 Delivery (Post it to me chosen), 3 Prescription with Upload a photo chosen and the dashed upload box, 4 Payment and the Pay now bar with £418, order summary with the lens line; both sides read the same here because the run compares the draft with itself.",
		'delivery-toggle@375': "Collect in Birmingham chosen (one column, express wallets in two rows, the \"Your bag\" card under the payment button): the address fields are gone, Collect in Birmingham is the ringed card, the summary's delivery row reads Collection, Free; Prescription and Payment sections follow unchanged.",
		'rx-later@375': "Send it later chosen in the 3 Prescription section (one column, express wallets in two rows, the \"Your bag\" card under the payment button): Send it later is the filled button, the dashed upload box is replaced by the note \"No problem, I'll WhatsApp you a link\"; Payment and Pay now below it, the Card number field ringed from the earlier focus.",
		'submit-empty@375': "Pay now pressed with every field empty: the draft has no validation and goes straight to the mock \"Thank you, order EC-10482\" screen (a tick circle, heading, note, Back to the shop button, footer); no required-field errors appear.",
		'auto-scrolled@375': "Scrolled a screen and a half (one column, express wallets in two rows, the \"Your bag\" card under the payment button): the Payment fields, Pay now bar and its secure-payment line, the summary card's lower rows, then the footer columns; nothing new floats apart from the chat bubble.",
	},
	// Links (GAP-CHECKLIST 14): the checkout's body holds no link on live (read with a prescription lens in the bag, 2026-10-02: the
	// terms and privacy words are plain text; the only links on the page are the header's and footer's), so the table is empty.
	links: {},
	accept: [
		...[ 'rx-section', 'rx-heading', 'rx-mode-upload', 'rx-upload-label', 'rx-mode-later', 'rx-later-note' ].map( ( pair ) => ( {
			pair, kind: 'presence', reason: 'Accepted (Bean 2026-09-25, D1): the prescription is given per pair in the lens pop-up, so checkout has no Prescription step and shows each pair’s choice in the order summary',
		} ) ),
		{ state: 'rx-later', kind: 'drive', reason: 'Accepted (Bean 2026-09-25, D1): live has no Send it later control at checkout; the choice was made in the lens pop-up', when: ( d ) => /send it later/.test( d.key ) },
	],
};

export default config;
