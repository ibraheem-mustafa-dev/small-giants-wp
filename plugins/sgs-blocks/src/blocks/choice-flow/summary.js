/**
 * SGS Choice Flow — summary panel (Spec 43 FR-43-19/FR-43-24, D4 v1.8.0).
 *
 * Renders the "finished product" summary `choice-flow-summary.php` reserves
 * the markup for: the resolved image (both the compact collapsed thumbnail
 * and the full stage image share one class, updated together), the product
 * name, a one-line "chosen options" summary (the unpriced answers on the
 * path, plain and product-option alike), the priced lines (base price then
 * each add-on, price or "Included"), and the running total. Same markup
 * serves this task's compact styling and FR-43-24's later `showcase`
 * styling. `pricing.js` owns the pricing STATE and calls
 * `renderSummaryPanel()` here on every change — this file only reads that
 * snapshot and paints. DISPLAY ONLY; FR-43-18's server-side price list
 * stays the sole price authority for what is actually charged.
 *
 * @package SGS\Blocks
 */

import { getPlainAnswers } from './flow-fields.js';

const SUMMARY_SELECTOR = '.sgs-choice-flow__summary';
const IMAGE_SELECTOR = '.sgs-choice-flow__summary-image';
const PRODUCT_SELECTOR = '.sgs-choice-flow__summary-product';
const SUMMARY_NAME_SELECTOR = '.sgs-choice-flow__summary-summary-name';
const META_SELECTOR = '.sgs-choice-flow__summary-meta';
const LINES_SELECTOR = '.sgs-choice-flow__summary-lines';
const TOTAL_VALUE_SELECTOR = '.sgs-choice-flow__summary-total-value';
// FIXES item 6: the collapsed row's total is now a "Total" label plus its
// own value span (previously a bare text node) — only the value updates.
const TOGGLE_TOTAL_VALUE_SELECTOR = '.sgs-choice-flow__summary-summary-total-value';

/** `style.css`'s own two-column breakpoint for `.sgs-choice-flow__body--with-panel`. */
const DESKTOP_QUERY = '(min-width: 1024px)';

/** Flow roots whose "stay open on desktop" toggle lock is already bound. */
const toggleLockBound = new WeakSet();

/**
 * @param {number}  minor     Amount in minor currency units.
 * @param {number}  decimals  Currency decimal places.
 * @param {boolean} trimZeros Drop the decimals on a whole amount (WooCommerce's
 *                            `woocommerce_price_trim_zeros`, seeded by render.php).
 * @return {string} A plain formatted amount, e.g. "£9.99". Display only — the
 *                   cart/order totals a shopper actually pays are always
 *                   WooCommerce's own, server-formatted output.
 */
export function formatMinor( minor, decimals, trimZeros = false ) {
	const amount = minor / 10 ** decimals;
	const places = trimZeros && minor % 10 ** decimals === 0 ? 0 : decimals;
	return (
		'£' +
		amount.toLocaleString( undefined, {
			minimumFractionDigits: places,
			maximumFractionDigits: places,
		} )
	);
}

/**
 * Find the image of the combo whose resolved variation ID matches, from the
 * flow root's own `data-flow-combos` (`choice-flow-variation-seed.php`'s
 * `i` field — the same map `variation.js` resolves the variation against).
 *
 * @param {HTMLElement} flowRoot    Flow wrapper element.
 * @param {number}      variationId The resolved variation ID (0 = none yet).
 * @return {string} An image URL, or '' when no combo carries one.
 */
function resolveComboImage( flowRoot, variationId ) {
	if ( ! variationId ) {
		return '';
	}
	const raw = flowRoot.getAttribute( 'data-flow-combos' );
	if ( ! raw ) {
		return '';
	}
	try {
		const combos = JSON.parse( raw );
		const match = Object.values( combos ).find( ( combo ) => parseInt( combo?.v, 10 ) === variationId );
		return match && typeof match.i === 'string' ? match.i : '';
	} catch {
		return '';
	}
}

/**
 * Show the resolved variation's image once one resolves; else the panel's
 * own seeded fallback (`choice-flow-summary.php`'s `data-fallback-image` —
 * the product's featured image). Hidden entirely when neither resolves, so
 * a flow with no image never shows a broken-image icon. Updates BOTH the
 * collapsed thumbnail and the full stage image — they share one class.
 *
 * @param {HTMLElement} panelEl     Summary panel `<aside>`.
 * @param {number}      variationId Resolved variation ID (0 = none).
 */
function updateImage( panelEl, variationId ) {
	const imageEls = panelEl.querySelectorAll( IMAGE_SELECTOR );
	if ( ! imageEls.length ) {
		return;
	}
	const flowRoot = panelEl.closest( '[data-wp-interactive="sgs/choice-flow"]' );
	const comboImage = flowRoot ? resolveComboImage( flowRoot, variationId ) : '';
	const src = comboImage || panelEl.getAttribute( 'data-fallback-image' ) || '';
	imageEls.forEach( ( imageEl ) => {
		if ( src ) {
			imageEl.src = src;
			imageEl.hidden = false;
		} else {
			imageEl.hidden = true;
		}
	} );
}

/**
 * @param {string} label Left cell text.
 * @param {string} value Right cell text.
 * @return {HTMLLIElement} A line with both cells.
 */
function buildLine( label, value ) {
	const lineEl = document.createElement( 'li' );
	const labelEl = document.createElement( 'span' );
	labelEl.textContent = label;
	const valueEl = document.createElement( 'span' );
	valueEl.textContent = value;
	lineEl.appendChild( labelEl );
	lineEl.appendChild( valueEl );
	return lineEl;
}

/**
 * Re-render one flow instance's summary panel. A no-op when the flow has no
 * panel container (`showPricePanel:false` never emits one — that setting
 * still means "show the panel", D4/FR-43-24 just changed what it shows).
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @param {Object}      pricing  Pricing snapshot from `pricing.js`.
 * @param {Object}      pricing.base      `{priceMinor, decimals, variationId}` — the resolved product/variation.
 * @param {boolean}     pricing.trimZeros Whether to drop decimals on a whole amount.
 * @param {Array}       pricing.addonRows Priced add-on answers, `{key, label, groupLabel, price}` each.
 */
export function renderSummaryPanel( flowRoot, pricing ) {
	const panelEl = flowRoot.querySelector( SUMMARY_SELECTOR );
	if ( ! panelEl ) {
		return;
	}

	const { base, trimZeros, addonRows } = pricing;
	const productName = panelEl.getAttribute( 'data-product-name' ) || '';
	// FIXES item 4: the base row's label is an operator control
	// (`summaryBaseLabel`, default "Base price" — Eye Care sets "Frame"),
	// carried here via the panel's own `data-base-label`.
	const baseLabel = panelEl.getAttribute( 'data-base-label' ) || 'Base price';

	updateImage( panelEl, base.variationId );

	// FR-43-24's "chosen options" one-liner — the path's unpriced answers
	// (plain questions and unpriced product-option steps alike; a priced
	// product-option step's choice shows as one of the priced lines below
	// via its resolved base price instead), joined " · " for the stage.
	const metaEl = panelEl.querySelector( META_SELECTOR );
	if ( metaEl ) {
		metaEl.textContent = getPlainAnswers( flowRoot )
			.map( ( answer ) => answer.value )
			.join( ' · ' );
	}

	const nameEl = panelEl.querySelector( SUMMARY_NAME_SELECTOR );
	if ( nameEl ) {
		nameEl.textContent = productName;
	}
	const productEl = panelEl.querySelector( PRODUCT_SELECTOR );
	if ( productEl ) {
		productEl.textContent = productName;
	}

	const linesEl = panelEl.querySelector( LINES_SELECTOR );
	let addonTotalMinor = 0;
	if ( linesEl ) {
		linesEl.innerHTML = '';
		linesEl.appendChild(
			buildLine( baseLabel, base.priceMinor !== null ? formatMinor( base.priceMinor, base.decimals, trimZeros ) : '—' )
		);
		addonRows.forEach( ( answer ) => {
			const priceValue = parseFloat( answer.price );
			const priceMinor = Number.isFinite( priceValue ) ? Math.round( priceValue * 10 ** base.decimals ) : 0;
			addonTotalMinor += priceMinor;
			// FIXES item 4: the chosen OPTION's own label only (e.g. "Distance
			// lenses", "Standard · 1.5") — never prefixed with its group's
			// label, matching the draft's own running lines.
			linesEl.appendChild(
				buildLine( answer.label, priceMinor > 0 ? formatMinor( priceMinor, base.decimals, trimZeros ) : 'Included' )
			);
		} );
	}

	const total =
		base.priceMinor !== null ? formatMinor( base.priceMinor + addonTotalMinor, base.decimals, trimZeros ) : '—';
	const totalValueEl = panelEl.querySelector( TOTAL_VALUE_SELECTOR );
	if ( totalValueEl ) {
		totalValueEl.textContent = total;
		// FR-43-24: retrigger the showcase stage's "total pops on change"
		// animation (style.css's `.is-updated` keyframe) — a no-op in compact,
		// which has no rule for this class. Reduced motion is handled entirely
		// by that CSS, not here.
		totalValueEl.classList.remove( 'is-updated' );
		void totalValueEl.offsetWidth; // Force a reflow so the class removal takes effect before it's re-added.
		totalValueEl.classList.add( 'is-updated' );
	}
	const toggleTotalValueEl = panelEl.querySelector( TOGGLE_TOTAL_VALUE_SELECTOR );
	if ( toggleTotalValueEl ) {
		toggleTotalValueEl.textContent = total;
	}
}

/**
 * Keep the panel's `<details>` open at desktop widths (D4: a static
 * left/right column there, not a real disclosure). `style.css` disables
 * pointer events on the `<summary>` at that width so a click can't close
 * it, but a keyboard Enter/Space on the still-focusable `<summary>` fires
 * the native `toggle` event regardless — this re-opens it when that
 * happens, so the panel can never be left closed on desktop.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 */
export function bindSummaryToggle( flowRoot ) {
	if ( toggleLockBound.has( flowRoot ) ) {
		return;
	}
	const detailsEl = flowRoot.querySelector( '.sgs-choice-flow__summary-toggle' );
	if ( ! detailsEl ) {
		return;
	}
	toggleLockBound.add( flowRoot );
	detailsEl.addEventListener( 'toggle', () => {
		if ( ! detailsEl.open && window.matchMedia( DESKTOP_QUERY ).matches ) {
			detailsEl.open = true;
		}
	} );
}
