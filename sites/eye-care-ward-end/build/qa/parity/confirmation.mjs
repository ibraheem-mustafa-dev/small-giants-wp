// Parity config: the order-confirmation view.
//
// Draft: reached in-app. Proven with Playwright against the real draft, 2026-09-28: the
// draft's checkout has NO field validation at all — clicking Pay Now with every field blank
// (no items touched beyond add-to-bag) jumps straight to a mock "Thank you — order EC-NNNNN."
// screen. Nothing is placed anywhere; it is a client-only route change (see checkout.mjs's
// 'submit-empty' state, which found the same thing from the other direction).
//
// Live: a real WooCommerce order is required to reach a genuine order-received page, and
// this task forbids creating one from this session. LIVE_ORDER_URL is a placeholder the
// orchestrator fills in from EYECARE_ORDER_URL after creating one test order (WP-CLI or the
// admin, never this walker) — never leave the env var unset for a real run.
//
// Live selectors are INFERRED from WooCommerce's standard, decade-stable `thankyou.php`
// order-received template (classic template — the Checkout BLOCK still redirects to this
// classic page by default, not a blocks order-confirmation screen); none of them are
// confirmed against this site's real DOM (an order has never been placed here to check).
//
// Run: node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/confirmation.mjs
const LIVE_ORDER_URL = process.env.EYECARE_ORDER_URL || '';
const vis = 'const vis = (e) => e && e.offsetParent !== null;';


const config = {
	name: 'confirmation',
	auto: {
		exclude: {
			draft: [
				'a[aria-label^="Message Fatima"]',
				{ js: '(r) => { let e = [...document.querySelectorAll("span")].find((s) => /^100% genuine/i.test(s.textContent.trim())); while (e && e.parentElement && e.getBoundingClientRect().width < innerWidth - 2) e = e.parentElement; return e; }' },
			],
		},
		normalise: [ { side: 'live', from: /^(\+?£[\d,]+)\.00$/, to: '$1', reason: 'Pennies on every price on the confirmation page (Bean 2026-09-25)' } ],
	},
	draft: {
		url: 'https://mintcream-lyrebird-224487.hostingersite.com/',
		open: async ( h ) => {
			await h.clickText( '^sunglasses$', { wait: 900 } );
			await h.clickText( '^oversized cat-eye$', { wait: 900 } );
			await h.clickText( '^add to bag as they are', { tag: 'button', wait: 1200 } );
			await h.clickText( '^bag', { tag: 'button,a', wait: 900 } );
			await h.clickText( '^checkout$', { tag: 'button', wait: 1200 } );
			// No fields need filling — the draft has no validation (see the file header note).
			await h.clickText( '^pay now', { tag: 'button', wait: 1500 } );
		},
	},
	live: {
		// The orchestrator writes EYECARE_ORDER_URL after creating one real test order;
		// LIVE_ORDER_URL is '' until then, which fails loudly at goto() rather than silently
		// comparing against nothing.
		url: LIVE_ORDER_URL,
	},
	states: [
		{ name: 'opening', fullPage: true },
	],
	pairs: [
		{ name: 'confirmation-message', states: [ 'opening' ], box: [ 'h' ],
			draft: { js: `(r) => { ${ vis } return [...document.querySelectorAll('div')].find((d) => vis(d) && /^thank you/i.test(d.textContent.trim())); }` },
			live: '.woocommerce-order .woocommerce-thankyou-order-received, .woocommerce-thankyou-order-received' },
		{ name: 'order-meta', states: [ 'opening' ], text: false, box: [ 'w' ],
			draft: { js: `(r) => { ${ vis } return [...document.querySelectorAll('div')].find((d) => vis(d) && /^thank you/i.test(d.textContent.trim())); }` },
			live: '.woocommerce-order-overview, .woocommerce-order-overview__order' },
		{ name: 'order-details', states: [ 'opening' ], text: false, box: [ 'w' ],
			// A real, documented content gap (open, not accepted): the draft's confirmation is a
			// single message with no line-item recap at all; live's classic template always lists
			// the order's items and totals in a table.
			draft: { js: '() => null' },
			live: '.woocommerce-order-details, table.woocommerce-table--order-details' },
		// The tick circle (a 64px accent disc with a white ✓) that pops in when the order is placed (keyframes "pop": from 60% size
		// and clear, past full size, then settling). Live's order-received page has no tick: its status line is plain text.
		{ name: 'tick-circle', states: [ 'opening' ], box: [ 'w', 'h' ],
			draft: { js: `(r) => { ${ vis } return [...document.querySelectorAll('div')].find((d) => vis(d) && ! d.children.length && '✓' === d.textContent.trim()); }` },
			live: '.woocommerce-order .sgs-order-confirmed__tick',
			props: [ 'background-color', 'color', 'border-radius', 'font-size', 'animation-name', 'animation-duration' ] },
		{ name: 'continue-link', states: [ 'opening' ], hover: true,
			draft: { text: '^back to the shop$', tag: 'button,a' },
			live: { js: `(r) => { ${ vis } return [...document.querySelectorAll('a')].find((a) => vis(a) && /continue shopping|back to shop|return to shop/i.test(a.textContent.trim())); }` } },
	],
	review: {
		'opening@1440': "Order-confirmed screen: the 64px accent tick circle with its white check, \"Thank you, order EC-10482.\" heading, the collection note, the dark Back to the shop button, then the footer; draft against itself, so only the structure and the tick circle's look and pop motion are compared.",
		'auto-scrolled@1440': "Scrolled a screen and a half: the confirmation block has gone up and the footer link columns and legal line are in view, with the chat bubble floating over the footer; nothing else appears on scrolling.",
		'opening@768': "Order-confirmed screen: the 64px accent tick circle with its white check, \"Thank you, order EC-10482.\" heading, the collection note, the dark Back to the shop button, then the footer; draft against itself, so only the structure and the tick circle's look and pop motion are compared.",
		'auto-scrolled@768': "Scrolled a screen and a half: the confirmation block has gone up and the footer link columns and legal line are in view, with the chat bubble floating over the footer; nothing else appears on scrolling.",
		'opening@375': "Order-confirmed screen: the 64px accent tick circle with its white check, \"Thank you, order EC-10482.\" heading, the collection note, the dark Back to the shop button, then the footer; draft against itself, so only the structure and the tick circle's look and pop motion are compared.",
		'auto-scrolled@375': "Scrolled a screen and a half: the confirmation block has gone up and the footer link columns and legal line are in view, with the chat bubble floating over the footer; nothing else appears on scrolling.",
	},
	accept: [],
};

export default config;
