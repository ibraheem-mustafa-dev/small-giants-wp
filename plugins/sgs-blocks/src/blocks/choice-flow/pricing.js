/**
 * SGS Choice Flow — pricing module (Spec 43 FR-43-17 to FR-43-20, v1.4.0).
 *
 * Kept as its own file rather than growing `view.js` (already well over this
 * codebase's 250-line JS guideline) — `view.js` calls the handful of exports
 * below at the points it already resolves a step click / initialises a flow;
 * everything add-on/price-specific lives here. The 'add-to-bag' terminal's
 * own POST is a further split, `add-to-bag.js` (reads this module's
 * `getAddonSummary()`), to keep this file itself under the same guideline.
 * The D4 summary panel's own PAINTING (image swap, rows, total) is a further
 * split again, `summary.js` — this module owns only the pricing STATE and
 * hands it a snapshot on every change; it holds no DOM query for the panel.
 *
 * Ownership split (FR-43-18 — the server-side price list is the ONLY price
 * authority):
 *   - This module never invents a price. Every price it shows or sends came
 *     from a `data-price` attribute `choice-flow-question/render.php` already
 *     read off the site-wide add-on price list at render time.
 *   - The summary panel is DISPLAY ONLY. The actual charge is resolved
 *     server-side, in `/sgs/v1/cart/add-item`'s `addons` handling (a parallel
 *     build — see `add-to-bag.js`), from `{group, key}` pairs alone; this
 *     module never sends a price or a total.
 *
 * "What is being bought" (FR-43-20): a page's own `sgs/buybox`/
 * `sgs/product-card` announces its live variation via a window
 * `sgs-variation-change` CustomEvent (built in `product-card/view.js`) —
 * listened for here, module-scoped (one listener for the whole page, not
 * per-flow instance: there is normally exactly one buybox per product page).
 * A flow's own `data-flow-product-id`/`data-flow-price-minor`/
 * `data-flow-decimals` (`choice-flow/render.php`) are the first-paint
 * fallback, read once per instance and overwritten the moment a live event
 * arrives.
 *
 * @package SGS\Blocks
 */

import { renderSummaryPanel, formatMinor, bindSummaryToggle } from './summary.js';

/**
 * Per-flow-instance add-on state: which priced-question group each chosen
 * option belongs to, keyed by GROUP so a later answer in the same group
 * (e.g. the shopper went Back and picked differently) simply overwrites the
 * earlier one rather than accumulating duplicates.
 *
 * @type {WeakMap<HTMLElement, {answers: Map<string, {key: string, label: string, price: string}>, base: {productId: number, variationId: number, attributes: Object, priceMinor: number|null, decimals: number}}>}
 */
const flowPricingState = new WeakMap();

/**
 * Live base product/variation per product ID, from `sgs-variation-change`.
 * Every product card on a page (the buybox, and each card in a "More from"
 * or "Similar" row) dispatches it, so a flow reads only the entry for its
 * own product (render.php seeds `data-flow-product-id`: the page's product,
 * else `flowProductId`). Until that product's event fires, the seeded
 * values stand.
 *
 * @type {Map<number, {productId: number, variationId: number, attributes: Object, priceMinor: number|null, decimals: number}>}
 */
const liveBases = new Map();

/**
 * The most recent event, for a flow with no product of its own (no product
 * page, no `flowProductId`): the only product it can mean is the last one
 * the shopper touched.
 *
 * @type {{productId: number, variationId: number, attributes: Object, priceMinor: number|null, decimals: number}|null}
 */
let lastLiveBase = null;

/**
 * The base product a flow prices and buys.
 *
 * @param {{base: Object}} state This flow instance's pricing state.
 * @return {{productId: number, variationId: number, attributes: Object, priceMinor: number|null, decimals: number}}
 */
function currentBase( state ) {
	if ( state.base.productId ) {
		return liveBases.get( state.base.productId ) || state.base;
	}
	return lastLiveBase || state.base;
}

/** Guards the module-level `sgs-variation-change` listener to once. */
let variationListenerBound = false;

/**
 * Read a flow's render.php-seeded first-paint product/price.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @return {{productId: number, variationId: number, attributes: Object, priceMinor: number|null, decimals: number}}
 */
function readSeededBase( flowRoot ) {
	const productId = parseInt( flowRoot.getAttribute( 'data-flow-product-id' ), 10 ) || 0;
	const minorRaw = flowRoot.getAttribute( 'data-flow-price-minor' );
	const decimals = parseInt( flowRoot.getAttribute( 'data-flow-decimals' ), 10 ) || 2;
	return {
		productId,
		variationId: 0,
		attributes: {},
		priceMinor: minorRaw && minorRaw !== '' ? parseInt( minorRaw, 10 ) : null,
		decimals,
	};
}

/**
 * Ensure this flow instance has pricing state, seeded from its own
 * render.php data attributes on first call.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @return {{answers: Map<string, Object>, base: Object}} This instance's state.
 */
function ensureState( flowRoot ) {
	if ( ! flowPricingState.has( flowRoot ) ) {
		flowPricingState.set( flowRoot, {
			answers: new Map(),
			base: readSeededBase( flowRoot ),
			trimZeros: flowRoot.getAttribute( 'data-flow-trim-zeros' ) === '1',
		} );
	}
	return flowPricingState.get( flowRoot );
}

/**
 * Hand `summary.js` this flow instance's current pricing snapshot to paint.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 */
function refreshSummary( flowRoot ) {
	const state = ensureState( flowRoot );
	renderSummaryPanel( flowRoot, {
		base: currentBase( state ),
		trimZeros: state.trimZeros,
		addonRows: Array.from( state.answers.values() ),
	} );
}

/**
 * Module-level `sgs-variation-change` listener (item 5 — `product-card/
 * view.js` dispatches this whenever the page's own buybox/product-card
 * resolves a new combo, and once on init). Records the combo under its
 * product ID and re-renders every flow's panel; each flow then reads only
 * its own product's entry (see `liveBases`).
 *
 * @param {CustomEvent} event The `sgs-variation-change` event.
 */
function handleVariationChange( event ) {
	const detail = event?.detail || {};
	const live = {
		productId: parseInt( detail.productId, 10 ) || 0,
		variationId: parseInt( detail.variationId, 10 ) || 0,
		attributes: detail.attributes && 'object' === typeof detail.attributes ? detail.attributes : {},
		priceMinor: typeof detail.priceMinor === 'number' ? detail.priceMinor : null,
		decimals: typeof detail.decimals === 'number' ? detail.decimals : 2,
	};
	storeLiveBase( live );
}

/**
 * Record a live base and re-render every panel. A base a flow's own
 * product-option steps resolved is never replaced by a page buybox event.
 *
 * @param {Object} live Live base (productId, variationId, attributes, priceMinor, decimals, fromFlow?).
 */
function storeLiveBase( live ) {
	if ( ! live.productId || ( liveBases.get( live.productId )?.fromFlow && ! live.fromFlow ) ) {
		return;
	}
	liveBases.set( live.productId, live );
	lastLiveBase = live;
	document.querySelectorAll( '[data-wp-interactive="sgs/choice-flow"]' ).forEach( refreshSummary );
}

/**
 * Apply the variation a flow's own product-option steps resolved
 * (`variation.js`), taking precedence over the page buybox's event.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @param {{productId: number, variationId: number, attributes: Object, priceMinor: number|null}} overlay Resolved variation.
 */
export function setFlowVariationBase( flowRoot, overlay ) {
	storeLiveBase( {
		productId: parseInt( overlay.productId, 10 ) || 0,
		variationId: parseInt( overlay.variationId, 10 ) || 0,
		attributes: overlay.attributes && 'object' === typeof overlay.attributes ? overlay.attributes : {},
		priceMinor: typeof overlay.priceMinor === 'number' ? overlay.priceMinor : null,
		decimals: parseInt( flowRoot.getAttribute( 'data-flow-decimals' ), 10 ) || 2,
		fromFlow: true,
	} );
}

/**
 * Initialise this flow instance's pricing state + summary panel, and bind
 * the module-level variation-change listener + the panel's desktop toggle
 * lock once. Called from `view.js`'s `initFlow()`.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 */
export function initPricePanel( flowRoot ) {
	ensureState( flowRoot );
	bindSummaryToggle( flowRoot );

	if ( ! variationListenerBound ) {
		variationListenerBound = true;
		window.addEventListener( 'sgs-variation-change', handleVariationChange );
	}

	refreshSummary( flowRoot );
}

/**
 * Record a priced-add-on answer (FR-43-17/19), called from `view.js`'s
 * `handleOptionClick()` when the clicked option carries `data-price-group`.
 * A no-op when `group` is empty (the option isn't part of a priced step).
 *
 * @param {HTMLElement} flowRoot   Flow wrapper element.
 * @param {string}      group      The add-on group key.
 * @param {string}      groupLabel The group's own label (for the panel row).
 * @param {string}      key        The chosen option's key (matches a price-
 *                                  list option key — this IS the value the
 *                                  server resolves, per FR-43-18).
 * @param {string}      label      The chosen option's label.
 * @param {string}      price      The chosen option's decimal price string.
 */
export function recordAddonAnswer( flowRoot, group, groupLabel, key, label, price ) {
	if ( ! group ) {
		return;
	}
	const state = ensureState( flowRoot );
	state.answers.set( group, { key, label, groupLabel, price } );
	refreshSummary( flowRoot );
}

/**
 * Clear every accumulated add-on answer for a flow instance (FR-43-20's
 * "no add-ons" exit — `addToBagNow`), called from `view.js` when the clicked
 * option carries `data-add-to-bag-now`.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 */
export function resetAddonAnswers( flowRoot ) {
	const state = ensureState( flowRoot );
	state.answers.clear();
	refreshSummary( flowRoot );
}

/**
 * Build the add-to-bag payload for a flow instance: the resolved product/
 * variation (live event, falling back to the flow's own seeded data) plus
 * every priced answer accumulated on the path taken.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @return {{productId: number, variationId: number, attributes: Object, addons: Array<{group: string, key: string}>, rows: Array<{label: string, priceLabel: string}>}}
 */
export function getAddonSummary( flowRoot ) {
	const state = ensureState( flowRoot );
	const base = currentBase( state );

	const addons = [];
	const rows = [];
	state.answers.forEach( ( answer, group ) => {
		addons.push( { group, key: answer.key } );
		const priceValue = parseFloat( answer.price );
		rows.push( {
			label: answer.groupLabel ? `${ answer.groupLabel } — ${ answer.label }` : answer.label,
			priceLabel:
				Number.isFinite( priceValue ) && priceValue > 0
					? formatMinor( Math.round( priceValue * 10 ** base.decimals ), base.decimals, state.trimZeros )
					: 'included',
		} );
	} );

	return {
		productId: base.productId || 0,
		variationId: base.variationId || 0,
		attributes: base.attributes || {},
		addons,
		rows,
	};
}
