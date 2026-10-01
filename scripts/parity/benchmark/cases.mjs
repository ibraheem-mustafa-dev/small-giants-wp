// The walker's catch-rate benchmark: six optician-client gaps the walker passed and Bean found by eye
// (2026-09-27/28). Each case replays the gap's pre-fix state on today's live site (CSS or an init
// script injected on the live side only) and runs it against the page config as it stood before
// the gap was found (a "blind" config: no pair written with the gap in mind). `states` are where the
// gap shows (the walker still drives every state, and measures only these). `match` is written from the
// gap alone, never from a detector: a row it matches ("<state>@<width> | <pair> | <kind> | <key> | <draft>
// | <live>") would point a reviewer at the gap, so only a new row it matches counts as a catch. Run by
// scripts/parity/benchmark.mjs.

export const CONFIGS = {
	// Shop declared done (fd9115ba2), before Bean's review found cases a-d.
	shop: { ref: 'fd9115ba2', path: 'sites/eye-care-ward-end/build/qa/parity/shop.mjs' },
	// Lens config before the last question's gaps (e, f) were found.
	lens: { ref: '3495ae7e0', path: 'sites/eye-care-ward-end/build/qa/parity/lens.mjs' },
};

// Card prices set by the Interactivity API (data-wp-text) can be rewritten after load, so the
// pennies go back on through an observer, not once.
const PENNIES = `(() => {
	const add = () => document.querySelectorAll( ':is(.sgs-product-card, .product-card) :is(.price--current, .sgs-product-card__rrp)' ).forEach( ( el ) => {
		const t = [ ...el.childNodes ].reverse().find( ( n ) => 3 === n.nodeType && n.textContent.trim() );
		if ( t && /£\\d[\\d,]*$/.test( t.textContent.trim() ) ) {
			t.textContent = t.textContent.replace( /(£\\d[\\d,]*)\\s*$/, '$1.00' );
		}
	} );
	new MutationObserver( add ).observe( document, { childList: true, subtree: true, characterData: true } );
	document.addEventListener( 'DOMContentLoaded', add );
})();`;

// The shop filters read window.sgsShopFilters (wp_localize_script); the setter puts the
// floating Filter button back on, as before the Customizer switch existed.
const STICKY_ON = `(() => {
	let v;
	Object.defineProperty( window, 'sgsShopFilters', { configurable: true, get: () => v, set: ( x ) => {
		if ( x && 'object' === typeof x ) {
			x.stickyTrigger = 'on';
		}
		v = x;
	} } );
})();`;

// Strips the question's "open the chosen option's next step underneath" flag before the flow
// script reads it, so the last question routes to its own step as before 99f2f57f1.
const NO_INLINE = `new MutationObserver( ( ms ) => ms.forEach( ( m ) => m.addedNodes.forEach( ( n ) => {
	if ( 1 !== n.nodeType ) {
		return;
	}
	[ n, ...n.querySelectorAll( '[data-inline-next]' ) ].forEach( ( e ) => e.removeAttribute?.( 'data-inline-next' ) );
} ) ) ).observe( document, { childList: true, subtree: true } );`;

export const CASES = [
	{
		id: 'a', config: 'shop', widths: [ 1440, 768, 375 ], states: [ 'opening', 'women' ], match: /polarised|attribute-tag/i, fix: 'e8ecda854, b503570ed',
		label: 'Polarised tag sits in an uneven place on shop cards (follows the name; past the card edge at 375)',
		// Measured 2026-09-28: the pre-fix tag sits exactly as the draft's at every width (box 77x24, 8px each side,
		// 17px from the card edge; beside the name, past the edge on a one-word name at 375). Bean's fix went beyond
		// the draft, so no draft-versus-live comparison can see it: scored apart as the draft's own flaw.
		draftHasIt: true,
		css: `.sgs-product-card__title-row:has(> .sgs-product-card__attribute-tag) { flex-wrap: nowrap !important; }
.sgs-product-card__title-row:has(> .sgs-product-card__attribute-tag) > :first-child { flex: 0 1 auto !important; min-width: auto !important; overflow-wrap: normal !important; hyphens: manual !important; }
.sgs-product-card__title-row > .sgs-product-card__attribute-tag { margin-left: 0 !important; }`,
	},
	{
		id: 'b', config: 'shop', widths: [ 768, 375 ], states: [ 'opening', 'women', 'auto-scrolled' ], match: /^[\w-]*scrolled@.*filter/i, fix: 'e8ecda854',
		label: 'A floating Filter button appears after scrolling at 768 and 375 (the draft has none)',
		js: STICKY_ON,
	},
	{
		id: 'c', config: 'shop', widths: [ 768, 375 ], states: [ 'filters-open', 'panel-after-click' ], match: /range|slider|price-(min|max)|clipped/i, fix: 'e8ecda854',
		label: 'The drawer price slider\'s right handle is clipped to 12px (flush right in the scroll area)',
		css: '.sgs-shop-price-thin .sgs-shop-filters .wc-block-product-filter-price-slider { padding-inline: 4px 0 !important; }',
	},
	{
		id: 'd', config: 'shop', widths: [ 1440, 768, 375 ], states: [ 'opening', 'women', 'brand-ray-ban' ], match: /\.00\b/, fix: 'e8ecda854',
		label: 'Card prices and RRPs show ".00" on whole pounds (£139.00, the draft £139)',
		js: PENNIES,
	},
	{
		id: 'e', config: 'lens', widths: [ 1440, 768, 375 ], states: [ 'q4-prescription' ], match: /whatsapp|perfect|add to bag|continue|£418/i, fix: '99f2f57f1 onwards',
		label: 'The lens last question is two screens (options, then Continue to the chosen way) where the draft opens the chosen way under the options',
		js: NO_INLINE,
	},
	{
		id: 'f', config: 'lens', widths: [ 375 ], states: [ 'q2-thickness', 'q3-finish', 'q4-prescription' ], match: /^[\w-]+@375 .*(back|continue|add to bag|footer)/i, fix: '5658f162f',
		label: 'The lens footer stacks Back full width above the action at 375 (the draft keeps one row)',
		css: `@media (max-width: 480px) {
.sgs-choice-flow--layout-showcase .sgs-choice-flow__footer-row { flex-direction: column !important; align-items: stretch !important; }
.sgs-choice-flow--layout-showcase .sgs-choice-flow__footer-actions { flex: none !important; width: 100% !important; margin-left: 0 !important; }
}`,
	},
];
