// Parity config: the bag drawer on the Gucci Oversized Cat-Eye (eye-care-test product 76,
// photographed in the draft), Ivory, added "as they are" (no lenses).
//
// Reached the way each side's own shopper reaches it: add the product, then open the bag
// (GAP-CHECKLIST 6 — draft shows a toast with no auto-open panel; live's `sgs/cart` block
// (drawer mode, confirmed live: `sgs-cart--mode-drawer` on the product page) deliberately
// EXCLUDES drawer mode from auto-open-on-add (view.js's own doc-block: showModal() would
// move focus and inert the page while the shopper may be mid-flow elsewhere — WCAG 3.2.1/
// 3.2.2), so BOTH sides need the same second click on the bag/cart trigger to see the panel.
//
// Proven with Playwright against the real draft, 2026-09-28: the draft's bag drawer
// (`[role="dialog"][aria-label="Your bag"]`) has NO quantity control at all — each line is
// just image/brand/price/name/options text, then "Add my prescription" and "Remove" text
// links. Live's `sgs/cart` panel DOES have a quantity input (item-row-template.js). Per the
// brief, the quantity-increase state is skipped (it needs a control on BOTH sides); the
// quantity-control pair stays in as a genuine one-sided-control gap (GAP-CHECKLIST 6).
//
// Run: node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/bag.mjs
const D = '[role="dialog"][aria-label="Your bag"]';
const L = '.sgs-cart__panel--drawer';
const vis = 'const vis = (e) => e && e.offsetParent !== null;';
// The draft's one line-item row: the grid div holding the image column and the info column
// (image/brand/price/name/options text/Remove), found by shape (a "£" amount plus a Remove
// button), not by its data-dc-tpl id (a per-build id, not a stable hook).
const LINE = `(r) => { ${ vis } return [...r.querySelectorAll('div')].find((d) => vis(d) && d.textContent.includes('£') && [...d.querySelectorAll('button')].some((b) => /^remove$/i.test(b.textContent.trim()))); }`;
const LROW = `(r) => { const l = (${ LINE })(r); return l && l.children[1] && l.children[1].children[0]; }`;

export default {
	name: 'bag',
	// The panel is a dialog over the page (draft) / a native <dialog> (live): scrolling the
	// window moves nothing in either.
	autoScroll: false,
	auto: { normalise: [ { side: 'live', from: /^(\+?£[\d,]+)\.00$/, to: '$1', reason: 'Pennies on every price in the bag drawer, product page, cart and checkout (Bean 2026-09-25)' } ] },
	draft: {
		url: 'https://mintcream-lyrebird-224487.hostingersite.com/',
		open: async ( h ) => {
			await h.clickText( '^sunglasses$', { wait: 900 } );
			await h.clickText( '^oversized cat-eye$', { wait: 900 } );
		},
	},
	live: {
		url: 'https://darkcyan-grouse-898606.hostingersite.com/product/gucci-oversized-cat-eye/?cb={cb}',
	},
	states: [
		{
			name: 'drawer-open',
			draft: async ( h ) => {
				await h.clickText( '^add to bag as they are', { tag: 'button', wait: 1200 } );
				await h.clickText( '^bag', { tag: 'button,a', wait: 900 } );
			},
			live: async ( h ) => {
				await h.click( '.buybox__add-to-cart', { wait: 1500 } );
				await h.click( '.sgs-cart__trigger', { quiet: true, wait: 1200 } );
			},
		},
		{
			name: 'line-removed',
			draft: ( h ) => h.clickText( '^remove$', { within: D, tag: 'button', wait: 900 } ),
			live: ( h ) => h.click( '.sgs-cart__item-remove', { quiet: true, wait: 1200 } ),
		},
	],
	pairs: [
		{ name: 'drawer-panel', states: [ 'drawer-open', 'line-removed' ], draft: D, live: L, text: false, box: [ 'w' ],
			props: [ 'background-color', 'padding-top', 'padding-left' ] },
		{ name: 'heading', states: [ 'drawer-open', 'line-removed' ], box: [ 'h' ],
			draft: { within: D, js: '(r) => r.querySelector("span")' },
			live: `${ L } .sgs-cart__panel-heading` },
		{ name: 'close', states: [ 'drawer-open', 'line-removed' ], hover: true,
			draft: { within: D, js: '(r) => r.querySelector("button[aria-label=\\"Close bag\\"]")' },
			live: `${ L } .sgs-cart__panel-close` },
		{ name: 'line-image', states: [ 'drawer-open' ], text: false,
			draft: { within: D, js: `(r) => { const l = (${ LINE })(r); return l && l.children[0] && l.children[0].children[0]; }` },
			live: `${ L } .sgs-cart__item-thumb` },
		{ name: 'line-name', states: [ 'drawer-open' ], box: [ 'h' ],
			draft: { within: D, js: `(r) => { const l = (${ LROW })(r); return l && l.children[1]; }` },
			live: `${ L } .sgs-cart__item-name` },
		{ name: 'line-options', states: [ 'drawer-open' ], box: [ 'h' ],
			draft: { within: D, js: `(r) => { const l = (${ LROW })(r); return l && l.children[2]; }` },
			live: `${ L } .sgs-cart__item-details` },
		{ name: 'line-price', states: [ 'drawer-open' ], box: [ 'h' ],
			draft: { within: D, js: `(r) => { const l = (${ LROW })(r); return l && l.children[0] && l.children[0].children[1]; }` },
			live: `${ L } .sgs-cart__item-price` },
		// A control on live only (GAP-CHECKLIST 6): the draft's line has no stepper at all.
		{ name: 'quantity-control', states: [ 'drawer-open' ], text: false,
			draft: { within: D, js: '() => null' },
			live: `${ L } .sgs-cart__item-qty-input` },
		{ name: 'remove-control', states: [ 'drawer-open' ], hover: true,
			draft: { within: D, js: `(r) => { const l = (${ LINE })(r); return l && [...l.querySelectorAll('button')].find((b) => /^remove$/i.test(b.textContent.trim())); }` },
			live: `${ L } .sgs-cart__item-remove` },
		{ name: 'subtotal', states: [ 'drawer-open' ], box: [ 'h' ],
			draft: { within: D, js: `(r) => { ${ vis } return [...r.querySelectorAll('div')].find((d) => vis(d) && /^subtotal/i.test(d.textContent.trim()) && d.textContent.includes('£')); }` },
			live: `${ L } .sgs-cart__panel-subtotal` },
		{ name: 'checkout-button', states: [ 'drawer-open' ], hover: true,
			draft: { within: D, js: `(r) => [...r.querySelectorAll('button')].find((b) => /^checkout$/i.test(b.textContent.trim()))` },
			live: `${ L } .sgs-cart__panel-checkout` },
		{ name: 'continue-shopping', states: [ 'line-removed' ], hover: true,
			draft: { within: D, js: `(r) => [...r.querySelectorAll('button')].find((b) => /^shop sunglasses$/i.test(b.textContent.trim()))` },
			live: `${ L } .sgs-cart__panel-empty-cta` },
		{ name: 'empty-state-text', states: [ 'line-removed' ], box: [ 'h' ],
			draft: { within: D, text: '^nothing in here yet', tag: 'div' },
			live: `${ L } .sgs-cart__panel-empty-message` },
	],
	// review: left out — no shots taken yet, per the brief.
	accept: [],
};
