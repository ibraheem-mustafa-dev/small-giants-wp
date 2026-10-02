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
// The first state, `added`, is the page right after "Add to bag": the draft's "Added to bag" toast (a
// `role="status"` strip that animates in and out over 3.2s) and the pop of the count bubble on the header's
// Bag button. Live shows no toast (a presence row is the expected finding) and its count bubble runs a
// different pop (`sgs-cart-count-pop`, 0.35s, scale only). `drawer-open` then opens the bag the way a shopper does, and `line-removed` empties it.
// The draft's rendered markup has no class names (its `sgs-*` names exist only in the source), so every
// draft finder works from tags, roles, text and shape.
//
// Run: node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/bag.mjs
const D = '[role="dialog"][aria-label="Your bag"]';
const L = '.sgs-cart__panel--drawer';
const vis = 'const vis = (e) => e && e.offsetParent !== null;';
// The draft's one line-item row: the grid div (`grid-template-columns: 96px 1fr`) holding the image column and the
// info column. The info column is brand and price on one row, then the name, the options line, and the "Add my
// prescription" and "Remove" buttons.
const LINE = `(r) => { ${ vis } return [...r.querySelectorAll('div')].find((d) => vis(d) && d.style.gridTemplateColumns.startsWith('96px') && d.textContent.includes('£')); }`;
const LINFO = `(r) => { const l = (${ LINE })(r); return l && l.children[1]; }`;
// The draft's bag button in the header (the pop bubble is its last span), and the toast strip.
const DBAGBTN = 'header button[aria-label="Bag"]';
const DTOAST = '(r) => [...document.querySelectorAll("[role=status]")].find((e) => /added/i.test(e.textContent))';
// The draft's free-delivery progress track (the 2px bar under the subtotal note) and the smallest div with a given text.
const DTRACK = `(r) => [...r.querySelectorAll('div')].find((d) => d.style.height === '2px' && d.firstElementChild)`;
const dtext = ( re ) => `(r) => { ${ vis } return [...r.querySelectorAll('div')].filter((d) => vis(d) && ${ re }.test(d.textContent.trim())).sort((a, b) => a.textContent.length - b.textContent.length)[0]; }`;

export default {
	name: 'bag',
	// The panel is a dialog over the page (draft) / a native <dialog> (live): scrolling the
	// window moves nothing in either.
	autoScroll: false,
	// The product page behind the bag (`main` on both sides) is product.mjs's: this config compares the toast, the
	// header's count bubble and the bag drawer, so the page words under them are left out.
	auto: { exclude: { draft: [ 'main' ], live: [ 'main' ] }, normalise: [ { side: 'live', from: /^(\+?£[\d,]+)\.00$/, to: '$1', reason: 'Pennies on every price in the bag drawer, product page, cart and checkout (Bean 2026-09-25)' } ] },
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
			// Add the product and stop: the toast is on screen for 3.2s and the bag button's count pops.
			name: 'added',
			draft: ( h ) => h.clickText( '^add to bag as they are', { tag: 'button', wait: 300 } ),
			live: ( h ) => h.click( '.buybox__add-to-cart', { wait: 300 } ),
		},
		{
			name: 'drawer-open',
			draft: ( h ) => h.clickText( '^bag', { tag: 'button,a', wait: 900 } ),
			live: ( h ) => h.click( '.sgs-cart__trigger', { quiet: true, wait: 1200 } ),
		},
		{
			name: 'line-removed',
			draft: ( h ) => h.clickText( '^remove$', { within: D, tag: 'button', wait: 900 } ),
			live: ( h ) => h.click( '.sgs-cart__item-remove', { quiet: true, wait: 1200 } ),
		},
	],
	pairs: [
		// The "Added to bag" toast (draft: a status strip, animation `toast` 3.2s: fade and rise in, hold, fade out).
		// Live has none, so the pair reads missing on live. No `timeline` sampling: its fade-in is 384ms long, so the
		// opacity read at 30ms moves 0.3 to 0.5 from one run to the next on the draft against itself; the declared
		// keyframes and the running animation are compared instead.
		{ name: 'added-toast', states: [ 'added' ], box: [ 'w', 'h' ], draft: { js: DTOAST }, live: { js: '() => null' },
			props: [ 'background-color', 'color', 'font-size', 'padding-top', 'padding-left', 'box-shadow', 'opacity' ] },
		// The count bubble on the header's Bag button: the draft's `pop` keyframes run 0.5s on every change of the count
		// (compared by their declared keyframes and the running animation; a 30ms timeline read of a 0.5s scale-and-fade
		// moves 0.2 to 0.3 from one run to the next on the draft against itself).
		{ name: 'bag-count-pop', states: [ 'added' ], box: [ 'w', 'h' ],
			draft: { js: `(r) => { const b = document.querySelector('${ DBAGBTN }'); return b && b.lastElementChild; }` }, live: '.sgs-cart__badge',
			props: [ 'background-color', 'color', 'font-size', 'border-radius', 'animation-name', 'animation-duration', 'transform' ] },
		{ name: 'drawer-panel', states: [ 'drawer-open', 'line-removed' ], draft: D, live: L, text: false, box: [ 'w' ],
			props: [ 'background-color', 'padding-top', 'padding-left' ] },
		{ name: 'heading', states: [ 'drawer-open', 'line-removed' ], box: [ 'h' ],
			draft: { within: D, js: '(r) => r.querySelector("span")' },
			live: `${ L } .sgs-cart__panel-heading` },
		{ name: 'close', states: [ 'drawer-open', 'line-removed' ], hover: true,
			draft: { within: D, js: '(r) => r.querySelector("button[aria-label=\\"Close bag\\"]")' },
			live: `${ L } .sgs-cart__panel-close` },
		{ name: 'line-image', states: [ 'drawer-open' ], text: false,
			draft: { within: D, js: `(r) => { const l = (${ LINE })(r); return l && l.children[0]; }` },
			live: `${ L } .sgs-cart__item-thumb` },
		{ name: 'line-name', states: [ 'drawer-open' ], box: [ 'h' ],
			draft: { within: D, js: `(r) => { const i = (${ LINFO })(r); return i && i.children[1]; }` },
			live: `${ L } .sgs-cart__item-name` },
		{ name: 'line-options', states: [ 'drawer-open' ], box: [ 'h' ],
			draft: { within: D, js: `(r) => { const i = (${ LINFO })(r); return i && i.children[2]; }` },
			live: `${ L } .sgs-cart__item-details` },
		{ name: 'line-price', states: [ 'drawer-open' ], box: [ 'h' ],
			draft: { within: D, js: `(r) => { const i = (${ LINFO })(r); return i && i.children[0] && i.children[0].children[1]; }` },
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
		// Free-delivery line, its progress track and its fill (the draft's fill animates `width` over .6s), and the
		// Klarna line under Checkout.
		{ name: 'free-delivery-note', states: [ 'drawer-open' ], box: [ 'h' ],
			draft: { within: D, js: dtext( '/free uk delivery/i' ) },
			live: `${ L } .sgs-cart__free-delivery-text` },
		{ name: 'free-delivery-track', states: [ 'drawer-open' ], text: false, box: [ 'w', 'h' ], props: [ 'background-color', 'height', 'overflow' ],
			draft: { within: D, js: DTRACK },
			live: `${ L } .sgs-cart__free-delivery-track` },
		{ name: 'free-delivery-fill', states: [ 'drawer-open' ], text: false, box: [ 'w', 'h' ], props: [ 'background-color', 'width', 'height' ],
			draft: { within: D, js: `(r) => { const t = (${ DTRACK })(r); return t && t.firstElementChild; }` },
			live: `${ L } .sgs-cart__free-delivery-fill` },
		{ name: 'klarna-line', states: [ 'drawer-open' ], box: [ 'h' ],
			draft: { within: D, js: dtext( '/^or 3 payments of/i' ) },
			live: `${ L } .sgs-cart__panel-note` },
		// Per-line "Add my prescription" (a link on every line added without lenses). Live does not build it yet:
		// a presence row is the expected finding.
		{ name: 'line-add-prescription', states: [ 'drawer-open' ], box: [ 'h' ],
			draft: { within: D, js: `(r) => { const l = (${ LINE })(r); return l && [...l.querySelectorAll('button')].find((b) => /^add my prescription$/i.test(b.textContent.trim())); }` },
			live: { within: L, js: '() => null' } },
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
	accept: [],
	review: {
		'added@1440': 'Product page just after Add to bag: draft shows the dark Added to bag toast with View bag at the bottom of the page and the header bubble reads 1; live shows no toast at all. Header bubble reads 1 on both. Live header row is collapsed (stacked nav), product column sits lower.',
		'drawer-open@1440': 'Bag drawer open: heading, close cross, line image, brand, name, price, Remove, subtotal, free-delivery line with its progress rule, Checkout and Klarna line compared. Live lacks Add my prescription, shows Colour and Frame size lines instead of Frame only, prices carry .00 and the close button shows a focus ring.',
		'line-removed@1440': 'Emptied bag: Bag (0) heading, close cross, Nothing in here yet message and Shop sunglasses button match on both sides in place and look; no subtotal, delivery line or Checkout on either.',
		'added@768': 'Tablet product page after Add to bag: draft shows the toast beside the WhatsApp bubble and Menu button, logo and Bag 1 in one row; live has no toast and its header stacks the wordmark vertically through the Menu and Bag controls.',
		'drawer-open@768': 'Tablet bag drawer, 460px panel on the right on both sides: line, price, Remove, subtotal, free-delivery rule, Checkout, Klarna line compared. Live drops Add my prescription, shows Colour and Frame size lines, bolder delivery text and a focus ring on the close button.',
		'line-removed@768': 'Emptied bag at tablet width: Bag (0), close cross, Nothing in here yet and Shop sunglasses button identical in place and style on both sides; panel edge and dimmed page behind it match.',
		'added@375': 'Phone product page after Add to bag: draft toast wraps Added to bag and View bag to two lines near the bottom; live has no toast. Draft header shows Menu, logo and Bag 1; live header stacks the wordmark vertically across the Menu and Bag controls.',
		'drawer-open@375': 'Phone bag drawer full width: heading, close, line image, name, price, Remove, subtotal, delivery line and rule, Checkout and Klarna line compared. Live lacks Add my prescription and has extra Colour and Frame size lines, .00 pennies and a focus ring on the close button.',
		'line-removed@375': 'Emptied bag at phone width: Bag (0) heading, close cross, Nothing in here yet and Shop sunglasses button match in place and style; live close button shows a focus ring from the scripted click, the draft does not.',
	},

};
