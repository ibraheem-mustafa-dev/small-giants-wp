/**
 * SsrPreviewGuard — replaces `<Disabled>` around `<ServerSideRender>` previews.
 *
 * WHY NOT `<Disabled>` (regression fix, 2026-09-17): `<Disabled>` from
 * `@wordpress/components` makes its whole subtree `inert` (the native HTML
 * `inert` attribute) and sets `pointer-events: none` on top of it. Browsers
 * never dispatch ANY pointer event — click, hover, `mouseenter`/`mouseleave`,
 * focus — into an inert subtree. That is why wrapping a block's
 * `<ServerSideRender>` in `<Disabled>` (the original fix for real `<a href>`
 * clicks navigating the editor tab away instead of selecting the block)
 * silently killed every real CSS `:hover` state AND every JS-driven
 * interaction (e.g. `sgs/nav-bar-menu`'s Interactivity API mega-menu
 * disclosure store, which listens for `mouseenter`/`click` on the real
 * rendered DOM) — confirmed live: `getComputedStyle()` on a link inside
 * `.components-disabled` reported `pointer-events: none` and the wrapper
 * itself carries `inert="true"`.
 *
 * WHAT THIS DOES INSTEAD: a capture-phase click/submit interceptor, nothing
 * more. Real mouse and focus events reach the real DOM completely normally —
 * CSS `:hover`, `mouseenter`/`mouseleave`, and any of the block's own
 * click-driven interactivity all keep working exactly as the frontend
 * renders them. The ONLY thing this cancels is the BROWSER'S OWN default
 * action for a link/button/form (`event.preventDefault()`), which stops
 * navigation/submission without `stopPropagation()` — so:
 *   - the click still bubbles up to WordPress's own block-selection handler
 *     (clicking a nav link in the editor selects the block, exactly like
 *     clicking any other part of the preview);
 *   - the click still reaches any of the block's own click-driven listeners
 *     on the same or a descendant element (`preventDefault()` never stops
 *     other listeners on the event from running — only the element's own
 *     default browser behaviour).
 *
 * Scope of what gets its default action cancelled: real links (`a[href]`),
 * buttons, and submit/reset/button-type inputs, plus form submission. This
 * intentionally does NOT touch anything else — no pointer-events change, no
 * `inert`, no focus trapping — so the preview behaves like the live page for
 * every interaction except "leaving the editor".
 *
 * DISCLOSURE TOGGLE (2026-09-17, nav dropdown/chevron live-preview fix).
 * Bean rejected the premise that a `<ServerSideRender>` preview can never show
 * live interactive behaviour — that is a property of THIS component's choice
 * of mechanism, not a WordPress ceiling (core's own Navigation block and this
 * codebase's `sgs/tabs`/`sgs/accordion` all prove genuinely interactive
 * editor-canvas previews are achievable; `sgs/tabs`' `edit.js` does it with a
 * plain `useState` driving conditional JSX — but that path only exists
 * because tabs never routes its interactive part through ServerSideRender at
 * all). A block that DOES preview via ServerSideRender (this one) needs a
 * different mechanism, because the frontend Interactivity API runtime never
 * hydrates inside this static markup (confirmed live: zero interactivity
 * runtime script loads in the canvas) — so `data-wp-on--click`/
 * `data-wp-bind--aria-expanded` directives on the SSR'd HTML are inert here.
 *
 * The fix does NOT reimplement the Interactivity API. It doesn't need to:
 * `includes/nav-menu-markup.php` + `includes/nav-menu-submenu-css.php` (shared
 * by `sgs/nav-bar-menu` and `sgs/nav-drawer-menu`) already express the ENTIRE
 * visual open/close contract as plain CSS keyed off one HTML attribute —
 * `[data-sgs-mega-trigger][aria-expanded="true"] ~ .…__mega-panel-wrap` /
 * `…__submenu-wrap { display:block; }` for the panel, and
 * `[data-sgs-mega-trigger][aria-expanded="true"] .…__caret { transform:
 * rotate(180deg); }` for the chevron. Flipping that ONE attribute by hand on
 * click reproduces the real frontend visual, using the real frontend CSS —
 * nothing hand-rolled, nothing that can drift from render.php. Scoped to
 * exactly the documented `[data-sgs-mega-trigger]` contract, so any future
 * block emitting that same markup pattern gets a live editor preview for
 * free, with no per-block carve-out.
 *
 * Single-open is mirrored too (closing any other open trigger within this
 * same preview when one opens) — it costs one extra attribute read per click
 * and avoids two panels visibly stacked open at once, which the frontend's
 * `state.openMegaId` mechanism never allows. Everything else the frontend
 * store does (hover-intent, safe-triangle, outside-click, positioning,
 * reparenting, keyboard) is deliberately NOT reproduced here — this is an
 * editor-canvas demonstration of the open/close visual, not a parity
 * reimplementation of the live disclosure engine.
 *
 * WIDER ROLLOUT (2026-09-17, universal SsrPreviewGuard audit). Bean's mandate:
 * every block using this guard should behave like the frontend for every
 * interaction except link navigation. Audited all 9 current callers
 * (`before-after`, `brand-strip`, `business-info`, `card-grid`,
 * `nav-bar-menu`, `nav-drawer-menu`, `product-card`, `responsive-logo`,
 * `trustpilot-reviews`) against their real frontend `view.js`. Two more
 * blocks had real, currently-broken interactivity of the SAME general shape
 * this file already proves out (an interaction writes ONE plain DOM
 * attribute/property that the block's own CSS already keys its visual state
 * off) — extended below, same pattern, no store reimplementation:
 *
 *   - `sgs/before-after`'s ALWAYS-PRESENT native `<input type="range">` layer
 *     (see that block's `view.js` docblock — "layer 1", zero GSAP
 *     dependency) drives `--sgs-before-after-position` on the block root
 *     purely from the range's own `input` event. Confirmed live: the
 *     interactivity-free layer never wires up in the canvas, so a visitor
 *     could drag the native thumb (browser-native, no JS required) and the
 *     comparison image never actually moved. `handleInputCapture` below
 *     reproduces exactly that one write.
 *   - `sgs/trustpilot-reviews`'s carousel/mini-carousel prev/next arrows +
 *     pagination dots scroll `.sgs-trustpilot-reviews__track` — a plain
 *     `scrollBy`/`scrollTo` the browser already knows how to do; the block's
 *     `view.js` only computes WHERE to scroll to. `handleClickCapture` below
 *     reproduces that computation for the click-driven controls only.
 *
 * Deliberately NOT reproduced (checked, not skipped):
 *   - `sgs/product-card` bound-mode ADD-TO-CART + the availability-greying/
 *     demand-analytics/thumbnail-rebuild/value-ladder side-effects of a pill
 *     change: these mutate a large seeded manifest via a real Interactivity
 *     API action (`addToCart`, `applyAvailability`) or make network calls
 *     (Store API, demand-analytics endpoint) — reproducing them here would be
 *     the "reimplement the Interactivity API" trap this file already
 *     rejected for nav-bar-menu's OWN disclosure engine, and mutating the
 *     real WooCommerce cart from inside a post-editor preview would be a
 *     genuine data-safety regression, not a missing feature. This guard's
 *     existing `preventDefault()` on the submit button is the CORRECT
 *     behaviour here, not a gap.
 *   - `sgs/product-card` bound-mode PRICE/IMAGE SWAP is NOW reproduced (see
 *     `handleChangeCapture` below) — confirmed by reading `view.js`
 *     (`applyPillSelection`) that this specific slice is a PURE, LOCAL
 *     re-read of the already-seeded `data-wp-context` manifest (no network
 *     call of any kind), keyed on which `sgs/option-picker` pill the visitor
 *     selects. Because the Interactivity API runtime never hydrates in this
 *     canvas (see the disclosure-toggle rationale above), the seeded
 *     manifest is read directly off the DOM's own `data-wp-context`
 *     attribute (present verbatim in the static SSR markup) rather than via
 *     the live context proxy, and the same handful of `data-wp-text`/
 *     `data-wp-bind--*` directive VALUES already authored into that markup
 *     are used as the write targets — so this is a bounded mirror of one
 *     documented contract, not a parallel state machine guessing at
 *     render.php's shape.
 *   - `sgs/brand-strip`'s infinite-scroll marquee (clones DOM nodes, measures
 *     rendered image widths, starts a CSS animation) stays OUT OF SCOPE by
 *     Bean's explicit instruction (2026-09-18) — whether it auto-plays in
 *     the editor canvas is a separate, deliberately untouched question. Its
 *     HOVER-triggered effects are handled per-effect: the greyscale/sepia
 *     and scale/lift/glow treatments are pure CSS `:hover` rules with no JS
 *     involved, so they already work once `<Disabled>` is gone (nothing to
 *     add here). The whole-track PAUSE-on-hover is JS-driven
 *     (`mouseenter`/`mouseleave`/`pointerdown` toggling a class in
 *     `brand-strip/view.js`) and that script never runs in this canvas
 *     (frontend `viewScriptModule`s are not loaded in the editor, the same
 *     reason nav-bar-menu's own store never hydrates here) — reproduced
 *     below (`handlePointerCapture`/mouse listeners) as a direct class-
 *     toggle mirror of that exact contract. It has no visible effect unless
 *     the marquee is independently running, which is consistent with, not a
 *     contradiction of, the "don't touch autoplay" scope line above.
 *   - `sgs/business-info`, `sgs/card-grid`, `sgs/responsive-logo` — audited,
 *     no `view.js`, no Interactivity API directives, no interactivity beyond
 *     real CSS `:hover` (already fixed by this file's core change). Nothing
 *     to add.
 *
 * @package SGS\Blocks
 */
import { useCallback } from '@wordpress/element';

const INTERACTIVE_SELECTOR =
	'a[href], button, input[type="submit"], input[type="button"], input[type="reset"]';

/**
 * The disclosure-trigger contract shared by `sgs/nav-bar-menu` and
 * `sgs/nav-drawer-menu` (`includes/nav-menu-markup.php`). CSS in
 * `includes/nav-menu-submenu-css.php` keys the panel's `display` and the
 * chevron's `rotate` purely off this attribute — see the file docblock above.
 */
const DISCLOSURE_TRIGGER_SELECTOR = '[data-sgs-mega-trigger][aria-expanded]';

/**
 * `sgs/before-after`'s always-present range-input contract (that block's own
 * `render.php`/`view.js`) — the range's `value` is the single source of
 * truth for the comparison split, expressed purely as the CSS custom
 * property `--sgs-before-after-position` on the block root. See the wider
 * docblock above.
 */
const BEFORE_AFTER_RANGE_SELECTOR = '[data-sgs-before-after-range]';
const BEFORE_AFTER_ROOT_SELECTOR = '.wp-block-sgs-before-after';

/**
 * `sgs/trustpilot-reviews`'s carousel/mini-carousel contract (that block's
 * own `render.php`/`view.js`) — prev/next arrows and pagination dots live
 * alongside a single scrollable `.sgs-trustpilot-reviews__track` inside the
 * SAME preview root, so `event.currentTarget` (the guard's own wrapper) is
 * enough to scope the query without a page-wide selector. See the wider
 * docblock above.
 */
const TRUSTPILOT_ARROW_SELECTOR =
	'.sgs-trustpilot-reviews__arrow--prev, .sgs-trustpilot-reviews__arrow--next';
const TRUSTPILOT_DOT_SELECTOR = '.sgs-trustpilot-reviews__dot[data-index]';
const TRUSTPILOT_TRACK_SELECTOR = '.sgs-trustpilot-reviews__track';
const TRUSTPILOT_CARD_SELECTOR =
	'.sgs-trustpilot-reviews__card:not([data-sgs-loop-clone])';

/**
 * `sgs/product-card` bound-mode variant-picker contract — the SAME markup
 * `sgs/option-picker`'s own `view.js` and `product-card`'s own `view.js`
 * (`applyAvailability`) already key off: a `change` event on a radio input
 * inside `.sgs-option-picker__options[data-type-key]`, where `data-type-key`
 * is the WooCommerce attribute taxonomy and the radio's `value` is the
 * selected term slug. The enclosing product card carries
 * `data-wp-interactive="sgs/product-card"` PLUS a `data-wp-context` attribute
 * holding the entire seeded manifest as literal JSON (see
 * `product-card/render.php`'s "data-wp-context carry" docblock) — readable
 * straight off the DOM even though the Interactivity runtime that would
 * normally parse it never hydrates in this canvas. See the wider docblock
 * above for why this one slice (price/image display) is reproduced while
 * add-to-cart/availability/analytics are not.
 */
const PRODUCT_CARD_LIVE_SELECTOR = '[data-wp-interactive="sgs/product-card"]';
const PRODUCT_CARD_OPTIONS_SELECTOR =
	'.sgs-option-picker__options[data-type-key]';

/**
 * Per-card mutable state for the product-card variant mirror, keyed by the
 * live card's root DOM element so repeated pill changes accumulate onto the
 * SAME `selectedAxes` map (mirrors `view.js`'s `ctx.selectedAxes`) rather than
 * re-parsing the ORIGINAL `data-wp-context` JSON (which would forget every
 * axis except the one just clicked). Parsed once per card, lazily, on its
 * first pill change.
 *
 * @type {WeakMap<Element, {combos: Object, selectedAxes: Object, decimals: number, currencySymbol: string, taxDisplayMode: string, priceSuffix: string, vatLabel: string, perUnitTemplate: string, saleLabel: string}>}
 */
const productCardStateByRoot = new WeakMap();

/**
 * `sgs/brand-strip`'s scrolling-mode pause-on-hover contract (that block's
 * own `view.js`) — toggles `.sgs-brand-strip__track--paused` on
 * `.sgs-brand-strip__track` while the pointer is over
 * `.sgs-brand-strip--scrolling`, unless the operator has switched pause off
 * (`.sgs-brand-strip--no-pause` on the strip root). See the wider docblock
 * above — this has no VISIBLE effect unless the marquee animation is
 * independently running (out of scope), but reproduces the class-toggle
 * contract exactly so nothing about it silently diverges from the frontend.
 */
const BRAND_STRIP_SCROLLING_SELECTOR = '.sgs-brand-strip--scrolling';

/**
 * Format a minor-unit integer using the card's seeded currency settings.
 * Mirrors `product-card/view.js`'s `formatPrice()` exactly (SSR==swap parity).
 *
 * @param {number} minor Amount in minor currency units (pence).
 * @param {Object} meta  `{decimals, currencySymbol}` read from the card's context.
 * @return {string}
 */
function formatCardPrice( minor, meta ) {
	const decimals = typeof meta.decimals === 'number' ? meta.decimals : 2;
	const amount = ( minor / Math.pow( 10, decimals ) ).toLocaleString(
		undefined,
		{
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		}
	);
	return ( meta.currencySymbol || '' ) + amount;
}

/**
 * Current-price display string for a combo. Mirrors `view.js`'s `modePrice()`.
 *
 * @param {Object} combo The selected manifest combo.
 * @param {Object} meta  The card's context meta (see `formatCardPrice`).
 * @return {string}
 */
function cardModePrice( combo, meta ) {
	let mode = meta.taxDisplayMode || 'auto';
	if (
		mode === 'ex-plus-vat' &&
		( combo.exMinor == null || combo.taxMinor == null )
	) {
		mode = 'auto';
	}
	if ( mode === 'ex-plus-vat' ) {
		let out = formatCardPrice( combo.exMinor, meta );
		if ( combo.taxMinor && combo.taxMinor > 0 ) {
			out +=
				' + ' +
				formatCardPrice( combo.taxMinor, meta ) +
				' ' +
				( meta.vatLabel || 'VAT' );
		}
		return out;
	}
	if ( mode === 'inc-suffix' && meta.priceSuffix ) {
		return formatCardPrice( combo.priceMinor, meta ) + ' ' + meta.priceSuffix;
	}
	return formatCardPrice( combo.priceMinor, meta );
}

/**
 * Struck-through regular-price display string for a combo. Mirrors
 * `view.js`'s `modeRegular()`.
 *
 * @param {Object} combo The selected manifest combo.
 * @param {Object} meta  The card's context meta.
 * @return {string}
 */
function cardModeRegular( combo, meta ) {
	const exMode =
		( meta.taxDisplayMode || 'auto' ) === 'ex-plus-vat' &&
		combo.regularExMinor != null;
	return formatCardPrice(
		exMode ? combo.regularExMinor : combo.regularMinor,
		meta
	);
}

/**
 * Per-unit price string for a combo, e.g. "£1.04 per bar". Mirrors
 * `view.js`'s `perUnitDisplay()`.
 *
 * @param {Object} combo The selected manifest combo.
 * @param {Object} meta  The card's context meta.
 * @return {string}
 */
function cardPerUnitDisplay( combo, meta ) {
	const divisor =
		typeof combo.unitDivisor === 'number'
			? combo.unitDivisor
			: parseFloat( combo.unitDivisor ) || 0;
	const label = combo.unitLabel || '';
	if ( divisor <= 0 || label === '' ) {
		return '';
	}
	const mode = meta.taxDisplayMode || 'auto';
	const base =
		mode === 'ex-plus-vat' && combo.exMinor != null
			? combo.exMinor
			: combo.priceMinor;
	const perUnitMinor = Math.round( base / divisor );
	const template = meta.perUnitTemplate || 'per %s';
	return (
		formatCardPrice( perUnitMinor, meta ) +
		' ' +
		template.split( '%s' ).join( label )
	);
}

/**
 * Write a single directive VALUE to every element in `root` carrying the
 * matching `data-wp-text`/`data-wp-bind--*` attribute — the same attribute
 * literals `render.php` authors into the static SSR markup (see the
 * `PRODUCT_CARD_*` docblock above). Using the directive strings themselves as
 * the query means this stays correct if render.php's CSS class names ever
 * change, since it targets the documented data contract, not incidental
 * markup.
 *
 * @param {Element} root      The card's live root element.
 * @param {string}  attrName  e.g. 'data-wp-text' or 'data-wp-bind--hidden'.
 * @param {string}  attrValue e.g. 'context.priceDisplay'.
 * @param {(el: Element) => void} apply Called once per matching element.
 */
function applyToDirective( root, attrName, attrValue, apply ) {
	const selector = '[' + attrName + '="' + attrValue + '"]';
	root.querySelectorAll( selector ).forEach( apply );
}

export default function SsrPreviewGuard( { children, className } ) {
	const handleClickCapture = useCallback( ( event ) => {
		const target =
			typeof event.target.closest === 'function'
				? event.target.closest( INTERACTIVE_SELECTOR )
				: null;
		if ( target ) {
			event.preventDefault();
		}

		const trigger =
			typeof event.target.closest === 'function'
				? event.target.closest( DISCLOSURE_TRIGGER_SELECTOR )
				: null;
		if ( trigger ) {
			const willOpen = trigger.getAttribute( 'aria-expanded' ) !== 'true';
			// Single-open: close every OTHER open trigger in this preview first
			// (mirrors `state.openMegaId`, see file docblock).
			if (
				willOpen &&
				typeof event.currentTarget.querySelectorAll === 'function'
			) {
				event.currentTarget
					.querySelectorAll(
						DISCLOSURE_TRIGGER_SELECTOR + '[aria-expanded="true"]'
					)
					.forEach( ( other ) => {
						if ( other !== trigger ) {
							other.setAttribute( 'aria-expanded', 'false' );
						}
					} );
			}
			trigger.setAttribute( 'aria-expanded', willOpen ? 'true' : 'false' );
		}

		// `sgs/trustpilot-reviews` carousel arrows — scroll the track by one
		// card+gap, exactly matching that block's own `getStep()`/`scrollByCard()`
		// (autoplay/looping/drift are deliberately not reproduced — see docblock).
		const arrowBtn =
			typeof event.target.closest === 'function'
				? event.target.closest( TRUSTPILOT_ARROW_SELECTOR )
				: null;
		if ( arrowBtn && typeof event.currentTarget.querySelector === 'function' ) {
			const track = event.currentTarget.querySelector(
				TRUSTPILOT_TRACK_SELECTOR
			);
			const cards = track
				? track.querySelectorAll( TRUSTPILOT_CARD_SELECTOR )
				: [];
			if ( track && cards.length ) {
				const cardWidth = cards[ 0 ].getBoundingClientRect().width;
				const gap =
					parseFloat(
						getComputedStyle( track ).columnGap ||
							getComputedStyle( track ).gap
					) || 0;
				const step = cardWidth + gap;
				const dir = arrowBtn.classList.contains(
					'sgs-trustpilot-reviews__arrow--next'
				)
					? 1
					: -1;
				track.scrollBy( { left: step * dir, behavior: 'auto' } );
			}
		}

		// `sgs/trustpilot-reviews` pagination dots — scroll straight to the
		// matching card and sync the active-dot visual state (mirrors that
		// block's own dot click handler + `updateActiveDot()`).
		const dotBtn =
			typeof event.target.closest === 'function'
				? event.target.closest( TRUSTPILOT_DOT_SELECTOR )
				: null;
		if ( dotBtn && typeof event.currentTarget.querySelector === 'function' ) {
			const track = event.currentTarget.querySelector(
				TRUSTPILOT_TRACK_SELECTOR
			);
			const idx = dotBtn.getAttribute( 'data-index' );
			const targetCard = track
				? track.querySelector(
						TRUSTPILOT_CARD_SELECTOR + '[data-index="' + idx + '"]'
				  )
				: null;
			if ( track && targetCard ) {
				track.scrollTo( {
					left: targetCard.offsetLeft - track.offsetLeft,
					behavior: 'auto',
				} );
			}
			const dotsContainer = dotBtn.closest(
				'.sgs-trustpilot-reviews__dots'
			);
			if ( dotsContainer ) {
				dotsContainer
					.querySelectorAll( TRUSTPILOT_DOT_SELECTOR )
					.forEach( ( dot ) => {
						const isActive = dot === dotBtn;
						dot.classList.toggle( 'is-active', isActive );
						dot.setAttribute(
							'aria-selected',
							isActive ? 'true' : 'false'
						);
					} );
			}
		}
	}, [] );

	// `sgs/before-after`'s always-present native range layer — every `input`
	// event on the range writes the same CSS custom property the frontend's
	// own "layer 1" writes (see docblock above). No GSAP/Draggable
	// enhancement is reproduced here; the range alone already makes the
	// block fully operable by mouse, touch, and keyboard (browser-native).
	const handleInputCapture = useCallback( ( event ) => {
		const range =
			typeof event.target.closest === 'function'
				? event.target.closest( BEFORE_AFTER_RANGE_SELECTOR )
				: null;
		if ( ! range ) {
			return;
		}
		const root = range.closest( BEFORE_AFTER_ROOT_SELECTOR );
		if ( ! root ) {
			return;
		}
		const clamped = Math.max(
			0,
			Math.min( 100, Number.parseFloat( range.value ) )
		);
		root.style.setProperty( '--sgs-before-after-position', `${ clamped }%` );
	}, [] );

	const handleSubmitCapture = useCallback( ( event ) => {
		event.preventDefault();
	}, [] );

	// `sgs/product-card` bound-mode variant picker — a real `change` event on
	// an `sgs/option-picker` radio (native browser behaviour, needs no JS of
	// its own to select the pill — CSS's `:checked ~ .pill` already handles
	// that) recomputes the matching combo from the card's own seeded
	// `data-wp-context` manifest and writes the result straight onto the
	// documented `data-wp-text`/`data-wp-bind--*` directive targets. See the
	// `PRODUCT_CARD_*` docblock above for why this slice specifically is safe
	// to mirror (pure local read, no network call).
	const handleChangeCapture = useCallback( ( event ) => {
		const input = event.target;
		if ( ! input || input.type !== 'radio' ) {
			return;
		}
		const optionsDiv =
			typeof input.closest === 'function'
				? input.closest( PRODUCT_CARD_OPTIONS_SELECTOR )
				: null;
		if ( ! optionsDiv ) {
			return;
		}
		const root =
			typeof input.closest === 'function'
				? input.closest( PRODUCT_CARD_LIVE_SELECTOR )
				: null;
		if ( ! root ) {
			return;
		}

		const typeKey = optionsDiv.getAttribute( 'data-type-key' ) || '';
		const selectedKey = input.value;
		if ( ! typeKey || ! selectedKey ) {
			return;
		}

		let state = productCardStateByRoot.get( root );
		if ( ! state ) {
			const raw = root.getAttribute( 'data-wp-context' );
			if ( ! raw ) {
				return;
			}
			let seeded;
			try {
				seeded = JSON.parse( raw );
			} catch ( e ) {
				return;
			}
			if ( ! seeded || ! seeded.combos ) {
				// Simple/CPT card carries no manifest — nothing to swap.
				return;
			}
			state = {
				combos: seeded.combos,
				selectedAxes: { ...( seeded.selectedAxes || {} ) },
				decimals: seeded.decimals,
				currencySymbol: seeded.currencySymbol,
				taxDisplayMode: seeded.taxDisplayMode,
				priceSuffix: seeded.priceSuffix,
				vatLabel: seeded.vatLabel,
				perUnitTemplate: seeded.perUnitTemplate,
				saleLabel: seeded.saleLabel,
			};
			productCardStateByRoot.set( root, state );
		}

		state.selectedAxes = { ...state.selectedAxes, [ typeKey ]: selectedKey };
		const comboKey = Object.keys( state.selectedAxes )
			.sort()
			.map( ( t ) => t + ':' + state.selectedAxes[ t ] )
			.join( '|' );
		const combo = state.combos[ comboKey ];
		if ( ! combo ) {
			// Invalid/unavailable combination — leave price/image untouched
			// (mirrors view.js: no purchasable state to show a price for).
			return;
		}

		applyToDirective( root, 'data-wp-text', 'context.priceDisplay', ( el ) => {
			el.textContent = cardModePrice( combo, state );
		} );

		const onSale = combo.saleMinor !== null && combo.saleMinor !== undefined;
		applyToDirective(
			root,
			'data-wp-bind--hidden',
			'context.hideSale',
			( el ) => {
				el.hidden = ! onSale;
			}
		);
		applyToDirective(
			root,
			'data-wp-text',
			'context.regularDisplay',
			( el ) => {
				el.textContent = onSale ? cardModeRegular( combo, state ) : '';
			}
		);
		applyToDirective( root, 'data-wp-text', 'context.pctDisplay', ( el ) => {
			el.textContent =
				combo.pctDisplay != null
					? combo.pctDisplay
					: combo.pctOff > 0
					? combo.pctOff + '% off'
					: '';
		} );

		const inStock = !! combo.inStock;
		applyToDirective( root, 'data-wp-bind--hidden', 'context.inStock', ( el ) => {
			el.hidden = inStock;
		} );
		applyToDirective( root, 'data-wp-text', 'context.stockText', ( el ) => {
			el.textContent = inStock ? '' : 'Out of stock';
		} );

		const badgeLabel = onSale
			? state.saleLabel || 'Sale'
			: combo.discountLabel || '';
		applyToDirective(
			root,
			'data-wp-bind--hidden',
			'context.discountHidden',
			( el ) => {
				el.hidden = ! badgeLabel;
			}
		);
		applyToDirective(
			root,
			'data-wp-text',
			'context.discountLabel',
			( el ) => {
				el.textContent = badgeLabel;
			}
		);

		const puDisplay = cardPerUnitDisplay( combo, state );
		applyToDirective(
			root,
			'data-wp-bind--hidden',
			'context.perUnitHidden',
			( el ) => {
				el.hidden = puDisplay === '';
			}
		);
		applyToDirective(
			root,
			'data-wp-text',
			'context.perUnitDisplay',
			( el ) => {
				el.textContent = puDisplay;
			}
		);

		// Image swap — prefer the selected combo's own gallery (mirrors
		// view.js's gallery[0] priority), fall back to the combo's flat
		// imageUrl, else leave the current image untouched (a combo with no
		// image of its own keeps whatever was already showing — same M-C7
		// parity rule view.js documents).
		const gallery = Array.isArray( combo.gallery ) ? combo.gallery : [];
		const newSrc =
			gallery.length > 0 && gallery[ 0 ].url
				? gallery[ 0 ].url
				: combo.imageUrl || '';
		if ( newSrc ) {
			applyToDirective( root, 'data-wp-bind--src', 'context.imageSrc', ( el ) => {
				el.src = newSrc;
			} );
			const newAlt = gallery.length > 0 ? gallery[ 0 ].alt || '' : '';
			if ( newAlt ) {
				applyToDirective(
					root,
					'data-wp-bind--alt',
					'context.imageAlt',
					( el ) => {
						el.alt = newAlt;
					}
				);
			}
		}
	}, [] );

	// `sgs/brand-strip` scrolling-mode pause-on-hover — a bubbling
	// `mouseover`/`mouseout` pair standing in for `mouseenter`/`mouseleave`
	// (checking `relatedTarget` so the toggle fires once per true
	// enter/exit, not on every internal pointer move), toggling the exact
	// class `view.js` toggles. See the `BRAND_STRIP_SCROLLING_SELECTOR`
	// docblock above for why this has no visible effect without the marquee
	// separately running.
	const handleBrandStripHover = useCallback( ( event, isEntering ) => {
		const strip =
			typeof event.target.closest === 'function'
				? event.target.closest( BRAND_STRIP_SCROLLING_SELECTOR )
				: null;
		if ( ! strip || strip.classList.contains( 'sgs-brand-strip--no-pause' ) ) {
			return;
		}
		const related = event.relatedTarget;
		if ( related && strip.contains( related ) ) {
			// Moving between descendants of the same strip — not a real
			// enter/exit, ignore (mirrors mouseenter/mouseleave semantics).
			return;
		}
		const track = strip.querySelector( '.sgs-brand-strip__track' );
		if ( track ) {
			track.classList.toggle(
				'sgs-brand-strip__track--paused',
				isEntering
			);
		}
	}, [] );
	const handleMouseOverCapture = useCallback(
		( event ) => handleBrandStripHover( event, true ),
		[ handleBrandStripHover ]
	);
	const handleMouseOutCapture = useCallback(
		( event ) => handleBrandStripHover( event, false ),
		[ handleBrandStripHover ]
	);

	return (
		<div
			className={
				className
					? `sgs-ssr-preview-guard ${ className }`
					: 'sgs-ssr-preview-guard'
			}
			onClickCapture={ handleClickCapture }
			onChangeCapture={ handleChangeCapture }
			onInputCapture={ handleInputCapture }
			onSubmitCapture={ handleSubmitCapture }
			onMouseOverCapture={ handleMouseOverCapture }
			onMouseOutCapture={ handleMouseOutCapture }
		>
			{ children }
		</div>
	);
}
