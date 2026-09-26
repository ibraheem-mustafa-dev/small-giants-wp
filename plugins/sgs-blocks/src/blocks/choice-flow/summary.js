/**
 * SGS Choice Flow — summary panel (Spec 43 FR-43-19/FR-43-24, D4 v1.8.0).
 *
 * Paints the "finished product" stage `choice-flow-summary.php` reserves
 * the markup for: the resolved image (the narrow row's thumbnail and the
 * stage photo share one class) with the chosen option's photo treatment,
 * the brand, name and chosen options, the running lines and the total.
 * What to list comes from `summary-lines.js`; `pricing.js` owns the pricing
 * state and calls `renderSummaryPanel()` on every change. DISPLAY ONLY:
 * FR-43-18's server-side price list is the sole authority for the charge.
 *
 * @package SGS\Blocks
 */

import { buildSummary, formatMinor as formatTotal } from './summary-lines.js';

export { formatMinor } from './summary-lines.js';

const SUMMARY_SELECTOR = '.sgs-choice-flow__summary';
const IMAGE_SELECTOR = '.sgs-choice-flow__summary-image';
const PRODUCT_SELECTOR = '.sgs-choice-flow__summary-product';
const META_SELECTOR = '.sgs-choice-flow__summary-meta';
const LINES_SELECTOR = '.sgs-choice-flow__summary-lines';
const MEDIA_SELECTOR = '.sgs-choice-flow__summary-media';
const TOTAL_VALUE_SELECTOR = '.sgs-choice-flow__summary-total-value, .sgs-choice-flow__summary-summary-total-value';
const EFFECTS = [ 'dim', 'deepen', 'soften', 'brighten' ];

/** `style.css`'s own two-column breakpoint for `.sgs-choice-flow__body--with-panel`. */
const DESKTOP_QUERY = '(min-width: 1024px)';

/** Flow roots whose "stay open on desktop" toggle lock is already bound. */
const toggleLockBound = new WeakSet();

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
 * @param {string}  label Left cell text.
 * @param {string}  value Right cell text.
 * @param {boolean} muted A secondary line (an unpriced answer, the placeholder).
 * @return {HTMLLIElement} A line with both cells.
 */
function buildLine( label, value, muted ) {
	const lineEl = document.createElement( 'li' );
	if ( muted ) {
		lineEl.className = 'is-muted';
	}
	const labelEl = document.createElement( 'span' );
	labelEl.textContent = label;
	const valueEl = document.createElement( 'span' );
	valueEl.textContent = value;
	lineEl.appendChild( labelEl );
	lineEl.appendChild( valueEl );
	return lineEl;
}

/**
 * Show the chosen option's photo treatment on the stage image (style.css's
 * `.is-effect-*` rules, a filter that eases over 0.6s) and name it in a small
 * tag on the photo, as the Eye Care draft does for the lens finish.
 *
 * @param {HTMLElement} panelEl     Stage `<aside>`.
 * @param {string}      effect      One of EFFECTS, or '' for none.
 * @param {string}      effectLabel The chosen option's label.
 */
function updateEffect( panelEl, effect, effectLabel ) {
	panelEl.querySelectorAll( MEDIA_SELECTOR ).forEach( ( mediaEl ) => {
		EFFECTS.forEach( ( name ) => mediaEl.classList.toggle( `is-effect-${ name }`, name === effect ) );
		let tagEl = mediaEl.querySelector( '.sgs-choice-flow__summary-effect' );
		if ( effect && ! tagEl ) {
			tagEl = document.createElement( 'span' );
			tagEl.className = 'sgs-choice-flow__summary-effect';
			mediaEl.appendChild( tagEl );
		}
		if ( tagEl ) {
			tagEl.textContent = effect ? effectLabel : '';
			tagEl.hidden = ! effect;
		}
	} );
}

/**
 * Re-render one flow instance's summary panel. A no-op when the flow has no
 * panel container (`showPricePanel:false` never emits one — that setting
 * still means "show the panel", D4/FR-43-24 just changed what it shows).
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @param {Object}      pricing  Pricing snapshot from `pricing.js`: `base`
 *                               (`{priceMinor, decimals, variationId, attributes}`),
 *                               `trimZeros`, `addonRows`.
 */
export function renderSummaryPanel( flowRoot, pricing ) {
	const panelEl = flowRoot.querySelector( SUMMARY_SELECTOR );
	if ( ! panelEl ) {
		return;
	}

	const { base, trimZeros } = pricing;
	const summary = buildSummary( flowRoot, panelEl, pricing );
	const productName = panelEl.getAttribute( 'data-product-name' ) || '';

	updateImage( panelEl, base.variationId );
	updateEffect( panelEl, summary.effect, summary.effectLabel );

	panelEl.querySelectorAll( META_SELECTOR ).forEach( ( metaEl ) => {
		metaEl.textContent = summary.meta;
	} );
	panelEl.querySelectorAll( PRODUCT_SELECTOR ).forEach( ( productEl ) => {
		productEl.textContent = productName;
	} );

	const linesEl = panelEl.querySelector( LINES_SELECTOR );
	if ( linesEl ) {
		linesEl.innerHTML = '';
		summary.lines.forEach( ( line ) => linesEl.appendChild( buildLine( line.label, line.value, line.muted ) ) );
	}

	const total = summary.totalMinor !== null ? formatTotal( summary.totalMinor, base.decimals, trimZeros ) : '—';
	panelEl.querySelectorAll( TOTAL_VALUE_SELECTOR ).forEach( ( totalValueEl ) => {
		// FR-43-24: the total pops when it changes (style.css's `.is-updated`
		// keyframes, off under reduced motion); an unchanged repaint stays still.
		const changed = totalValueEl.textContent !== '' && totalValueEl.textContent !== total;
		totalValueEl.textContent = total;
		if ( changed ) {
			totalValueEl.classList.remove( 'is-updated' );
			void totalValueEl.offsetWidth; // Restart the animation.
			totalValueEl.classList.add( 'is-updated' );
		}
	} );
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
