/**
 * sgs/buybox — the add-to-basket bar (Spec 02 FR-2-3).
 *
 * Self-contained ES module (plain DOM, like guided.js and notify-view.js). The
 * bar (`.sgs-buybox__bar`, printed by extras.php::sgs_buybox_sticky_bar_html)
 * slides up only while BOTH hold: the in-page Add control has scrolled above
 * the viewport, and the current device tier is switched on in the root's
 * `data-sgs-bar` map ({"d":0,"t":0,"m":1}, from sgs_buybox_sticky_bar_data).
 *
 * The bar owns no purchase logic. Its button forwards to the in-page control,
 * so the add-to-cart action, the guided-layout guard and the toast all run as
 * they do for the in-page button: `form.requestSubmit()` in cart mode, a click
 * on the modal opener in modal mode. A shopper who has not finished choosing
 * is taken to the picker instead of being submitted.
 *
 * The Interactivity context is not readable from plain DOM, so the variation
 * check reads the seed context printed on the root (`data-wp-context`) and
 * follows the `sgs:option-selected` events with the same combo-key rule
 * product-card/view.js::applyPillSelection uses.
 *
 * While a bar is showing, `--sgs-sticky-bar-h` on `:root` holds its height so
 * the page can leave room under it (style.css pads the body and the scroll
 * margin; whatsapp-cta lifts its floating button). Reduced motion is handled
 * in style.css by removing the transition.
 *
 * @since 1.20.0 (Spec 02 FR-2-3)
 */

const ROOT_SELECTOR = '.sgs-buybox[data-sgs-bar]';
const HEIGHT_PROPERTY = '--sgs-sticky-bar-h';

/** Heights of the bars that are showing now, keyed by bar element. */
const showing = new Map();

function publishHeight() {
	const style = document.documentElement.style;
	if ( showing.size ) {
		style.setProperty( HEIGHT_PROPERTY, Math.max( ...showing.values() ) + 'px' );
	} else {
		style.removeProperty( HEIGHT_PROPERTY );
	}
}

/** @param {string|null} text JSON text. @return {Object} The parsed object, or {}. */
function parseObject( text ) {
	try {
		const value = JSON.parse( text || '{}' );
		return value && 'object' === typeof value ? value : {};
	} catch ( e ) {
		return {};
	}
}

/** @param {Element} root The `.sgs-buybox` wrapper. @return {string} The chosen option labels joined with " / ". */
function chosenOptionsText( root ) {
	const values = Array.from( root.querySelectorAll( '.sgs-buybox__picker-selected-value' ) )
		.map( ( el ) => el.textContent.trim() )
		.filter( Boolean );
	if ( values.length ) {
		return values.join( ' / ' );
	}
	return Array.from( root.querySelectorAll( '.sgs-option-picker input[type="radio"]:checked' ) )
		.map( ( input ) => {
			const label = input.closest( 'label' );
			const text = label && label.querySelector( '.sgs-option-picker__pill-label' );
			return text ? text.textContent.trim() : '';
		} )
		.filter( Boolean )
		.join( ' / ' );
}

/** @param {Element} root The `.sgs-buybox` wrapper with `data-sgs-bar`. */
function initStickyBar( root ) {
	if ( root.dataset.sgsBarInit === '1' ) {
		return;
	}
	const bar = root.querySelector( '.sgs-buybox__bar' );
	const control = root.querySelector( '.buybox__cart-form' ) || root.querySelector( '[data-sgs-modal-open]' );
	if ( ! bar || ! control || 'function' !== typeof window.IntersectionObserver ) {
		return;
	}
	root.dataset.sgsBarInit = '1';

	const tiers = parseObject( root.getAttribute( 'data-sgs-bar' ) );
	const seed = parseObject( root.getAttribute( 'data-wp-context' ) );
	const phone = window.matchMedia( '(max-width: 767px)' );
	const tablet = window.matchMedia( '(max-width: 1023px)' );
	const variantEl = bar.querySelector( '[data-sgs-bar-variant]' );

	let controlAbove = false;
	let selections = { ...( seed.selectedAxes || {} ) };
	let variationId = parseInt( seed.selectedVariationId, 10 ) || 0;

	// Interactivity owns `hidden` from here on (it hides the bar when the
	// selected variation is out of stock); the stylesheet keeps a bar that is
	// not showing out of sight and out of the tab order.
	bar.removeAttribute( 'hidden' );

	function tierIsOn() {
		const tier = phone.matches ? 'm' : tablet.matches ? 't' : 'd';
		return 1 === tiers[ tier ];
	}

	function apply() {
		const on = controlAbove && tierIsOn();
		bar.classList.toggle( 'is-on', on );
		if ( on ) {
			showing.set( bar, Math.ceil( bar.getBoundingClientRect().height ) );
		} else {
			showing.delete( bar );
		}
		publishHeight();
	}

	function refreshVariantLine() {
		const text = chosenOptionsText( root );
		if ( variantEl && text ) {
			variantEl.textContent = text;
		}
	}

	function choiceIsIncomplete() {
		return Array.isArray( seed.axes ) && seed.axes.length > 0 && 0 === variationId;
	}

	function goToPicker() {
		const pickers = Array.from( root.querySelectorAll( '.sgs-option-picker' ) );
		const picker = pickers.find( ( el ) => ! el.querySelector( 'input[type="radio"]:checked' ) ) || pickers[ 0 ];
		if ( ! picker ) {
			return;
		}
		picker.scrollIntoView( { block: 'center' } );
		const input = picker.querySelector( 'input' );
		if ( input ) {
			input.focus( { preventScroll: true } );
		}
	}

	new window.IntersectionObserver( ( entries ) => {
		const entry = entries[ entries.length - 1 ];
		controlAbove = ! entry.isIntersecting && entry.boundingClientRect.top < 0;
		apply();
	} ).observe( control );

	phone.addEventListener( 'change', apply );
	tablet.addEventListener( 'change', apply );

	root.addEventListener( 'sgs:option-selected', ( event ) => {
		const typeKey = event.detail && event.detail.typeKey;
		const key = event.detail && event.detail.selectedKey;
		if ( 'string' === typeof typeKey && typeKey && 'string' === typeof key && key ) {
			selections = { ...selections, [ typeKey ]: key };
			const comboKey = Object.keys( selections )
				.sort()
				.map( ( taxonomy ) => taxonomy + ':' + selections[ taxonomy ] )
				.join( '|' );
			const combo = seed.combos && seed.combos[ comboKey ];
			if ( combo ) {
				variationId = parseInt( combo.variationId, 10 ) || 0;
			}
		}
		refreshVariantLine();
	} );

	// The chosen-value labels are swapped by the shared bound-sync module a
	// moment after the event, so follow their text as well.
	if ( 'function' === typeof window.MutationObserver ) {
		const watcher = new window.MutationObserver( refreshVariantLine );
		root.querySelectorAll( '.sgs-buybox__picker-selected-value' ).forEach( ( el ) => {
			watcher.observe( el, { childList: true, characterData: true, subtree: true } );
		} );
	}

	const button = bar.querySelector( 'button' );
	if ( button ) {
		button.addEventListener( 'click', () => {
			const opener = root.querySelector( '.buybox__cart-form [data-sgs-modal-open]' );
			if ( opener ) {
				opener.click();
				return;
			}
			if ( choiceIsIncomplete() ) {
				goToPicker();
				return;
			}
			const form = root.querySelector( 'form.buybox__cart-form' );
			if ( form && 'function' === typeof form.requestSubmit ) {
				form.requestSubmit();
			}
		} );
	}

	refreshVariantLine();
}

function initStickyBars() {
	document.querySelectorAll( ROOT_SELECTOR ).forEach( initStickyBar );
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', initStickyBars );
} else {
	initStickyBars();
}
