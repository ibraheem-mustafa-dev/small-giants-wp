/**
 * The free-delivery progress renderer: the fill level, the progressbar value and the message for one element.
 *
 * It needs only the element it paints, so sgs/cart's drawer and sgs/free-delivery-bar share it. The element holds a
 * message child `[data-sgs-cart-free-delivery-text]` and a track child `[data-sgs-cart-free-delivery-track]`.
 *
 * @package
 */

import { formatMoney } from './money';

const DEFAULT_OPTIONS = {
	pctProperty: '--sgs-cart-free-delivery-pct',
	completeClass: 'sgs-cart__free-delivery--complete',
};

/**
 * Set the fill's level. The first level is held at 0% until the element is
 * actually on screen (it may start hidden, or sit in a closed drawer), then
 * released on a following frame so the width transition runs from empty
 * instead of the fill appearing at its final width. Later levels apply
 * straight away and animate from the previous one.
 *
 * @param {HTMLElement} el          The free-delivery element.
 * @param {number}      pct         Target percentage, 0 to 100.
 * @param {string}      pctProperty The custom property the stylesheet reads the width from.
 */
function setFillLevel( el, pct, pctProperty ) {
	el.sgsFillTarget = pct;
	if ( el.sgsFillReleased ) {
		el.style.setProperty( pctProperty, `${ pct }%` );
		return;
	}
	if ( el.sgsFillPending ) {
		return;
	}
	el.sgsFillPending = true;
	el.style.setProperty( pctProperty, '0%' );

	const release = () => {
		el.sgsFillReleased = true;
		window.requestAnimationFrame( () => {
			el.style.setProperty( pctProperty, `${ el.sgsFillTarget }%` );
		} );
	};

	if ( 'function' !== typeof window.IntersectionObserver ) {
		// Force a layout at 0% first so the next frame's change transitions.
		// eslint-disable-next-line no-unused-expressions
		el.offsetWidth;
		release();
		return;
	}

	const observer = new window.IntersectionObserver( ( entries ) => {
		if ( entries.some( ( entry ) => entry.isIntersecting ) ) {
			observer.disconnect();
			release();
		}
	} );
	observer.observe( el );
}

/**
 * Recompute and render the free-delivery progress against a cart. A no-op
 * when the element is missing.
 *
 * @param {HTMLElement|null} el             The free-delivery element.
 * @param {Object}           [cart]         The Store API cart response (or cart-live's equivalent).
 * @param {Object}           [freeDelivery] `{ threshold, message, successMessage, hideWhenEmpty }`.
 * @param {Object}           [options]      `{ pctProperty, completeClass }`; defaults are the cart drawer's.
 */
export function updateFreeDeliveryProgress( el, cart, freeDelivery, options ) {
	if ( ! el ) {
		return;
	}
	const { pctProperty, completeClass } = { ...DEFAULT_OPTIONS, ...options };

	const threshold = Number( freeDelivery?.threshold );
	const isEmpty = ! cart?.items?.length;
	if (
		! Number.isFinite( threshold ) ||
		threshold <= 0 ||
		( freeDelivery?.hideWhenEmpty && isEmpty )
	) {
		el.hidden = true;
		return;
	}

	const totals = cart?.totals || {};
	const minorUnit = Number( totals.currency_minor_unit ?? 2 );
	const subtotalMinor =
		Number( totals.total_items ?? 0 ) +
		Number( totals.total_items_tax ?? 0 );
	const subtotal = subtotalMinor / 10 ** minorUnit;
	const remaining = Math.max( 0, threshold - subtotal );
	const pct = Math.max( 0, Math.min( 100, ( subtotal / threshold ) * 100 ) );

	el.hidden = false;
	setFillLevel( el, pct, pctProperty );
	el.classList.toggle( completeClass, remaining <= 0 );

	const track = el.querySelector( '[data-sgs-cart-free-delivery-track]' );
	if ( track ) {
		track.setAttribute( 'aria-valuenow', String( Math.round( pct ) ) );
	}

	const textEl = el.querySelector( '[data-sgs-cart-free-delivery-text]' );
	if ( ! textEl ) {
		return;
	}

	// An unchanged message is left alone, so a live region does not announce the same words again.
	const setText = ( text ) => {
		if ( textEl.textContent !== text ) {
			textEl.textContent = text;
		}
	};

	if ( remaining <= 0 ) {
		setText(
			freeDelivery.successMessage || "You've unlocked free delivery!"
		);
		return;
	}

	const remainingMinor = Math.round( remaining * 10 ** minorUnit );
	const formattedRemaining = formatMoney( remainingMinor, totals );
	const template =
		freeDelivery.message || "You're %s away from free delivery";
	setText(
		template.includes( '%s' )
			? template.replace( '%s', formattedRemaining )
			: `${ template } ${ formattedRemaining }`
	);
}
