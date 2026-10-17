/**
 * SGS motion — magnet boot module (Spec 38 §3.3, FR-38-30; Spec 38A FR-38A-40). Tier V.
 *
 * The `@sgs/fx-magnet` script module the PHP motion registry enqueues when a
 * page renders a block carrying `data-sgs-fx="magnet"`. It reads each marked
 * element's attributes and registers it with the shared driver in `magnet.js`,
 * which owns the pull and the ONE document-level pointer listener (so a magnet
 * reacts while the pointer is still outside it, inside its catch area).
 *
 * It writes no CSS and applies no marker attribute. `assets/css/fx-magnet.css`
 * owns the return transition and the motion channel owns the translate
 * (FR-38A-47: scripts write custom properties only); with JS blocked the
 * element sits where it would without the effect, because `--sgs-mag-x/y`
 * default to 0.
 *
 * @package
 */

import { registerMagnet, DEFAULT_RADIUS, DEFAULT_RETURN_MS } from '@sgs/magnet';
import { bootGated } from './off-switch';

/** Elements the render layer marked. */
const SELECTOR = '[data-sgs-fx~="magnet"]';

/** Fallbacks when an instance declares no value of its own. */
const DEFAULT_STRENGTH = 24;
const DEFAULT_FACTOR = 0.35;

/** A CSS easing keyword, cubic-bezier() or linear(); anything else is dropped. */
const EASING =
	/^(?:linear|ease|ease-in|ease-out|ease-in-out)$|^(?:cubic-bezier|linear)\([\d.,\s%-]+\)$/;

/** Stops the tier-gated registration of every magnet, so a bfcache restore can tear down before re-init. */
let stopGated = () => {};

/**
 * A number read from one attribute, bounded; the fallback when the attribute is
 * absent or not a number. Zero is a real value, never "off".
 *
 * @param {HTMLElement} el       The element.
 * @param {string}      name     Attribute name.
 * @param {number}      fallback Value when absent or invalid.
 * @param {number}      min      Lower bound.
 * @param {number}      max      Upper bound.
 * @return {number} The bounded number.
 */
function readNumber( el, name, fallback, min, max ) {
	const value = parseFloat( el.getAttribute( name ) );
	return Number.isFinite( value )
		? Math.max( min, Math.min( max, value ) )
		: fallback;
}

/**
 * The element that moves under the pull: the declared part inside `el` when the renderer printed a moving part and
 * its selector, else `el` itself (`root`, no attribute, a selector matching nothing or an invalid one).
 *
 * @param {HTMLElement} el The marked element.
 * @return {HTMLElement} The moving element.
 */
export function resolveMovingPart( el ) {
	const part = ( el.getAttribute( 'data-sgs-fx-magnet-moving-part' ) || '' ).trim();
	const selector = ( el.getAttribute( 'data-sgs-fx-magnet-part-selector' ) || '' ).trim();
	if ( ! part || 'root' === part || ! selector ) {
		return el;
	}
	try {
		return el.querySelector( selector ) || el;
	} catch ( error ) {
		return el;
	}
}

/**
 * Read one instance's options off its own attributes.
 *
 * Every value is BOUNDED rather than trusted: a huge radius would make a button
 * react from across the page, and a huge pull would tear it out of its layout.
 * An absent attribute falls back to the default, never to zero. `engage`
 * defaults to proximity (a catch area of 120px around the box), so a magnet
 * reacts before the pointer is on it unless it is set to `over`.
 *
 * @param {HTMLElement} el The marked element.
 * @return {Object} Options for `createMagnet`.
 */
export function readOptions( el ) {
	const axis = el.getAttribute( 'data-sgs-fx-magnet-axis' );
	const easing = (
		el.getAttribute( 'data-sgs-fx-magnet-return-easing' ) || ''
	).trim();
	const maxPullX = readNumber(
		el,
		'data-sgs-fx-magnet-strength',
		DEFAULT_STRENGTH,
		0,
		200
	);
	return {
		engage:
			'over' === el.getAttribute( 'data-sgs-fx-magnet-engage' )
				? 'over'
				: 'proximity',
		pullModel:
			'normalised' === el.getAttribute( 'data-sgs-fx-magnet-pull-model' )
				? 'normalised'
				: 'distance',
		axis: [ 'x', 'y', 'both' ].includes( axis ) ? axis : 'both',
		radius: readNumber(
			el,
			'data-sgs-fx-magnet-radius',
			DEFAULT_RADIUS,
			0,
			400
		),
		maxPullX,
		// A single-limit instance (the legacy attribute) pulls the same on both axes.
		maxPullY: readNumber(
			el,
			'data-sgs-fx-magnet-max-pull-y',
			maxPullX,
			0,
			200
		),
		factor: readNumber(
			el,
			'data-sgs-fx-magnet-factor',
			DEFAULT_FACTOR,
			0,
			1
		),
		returnDuration: readNumber(
			el,
			'data-sgs-fx-magnet-return-duration',
			DEFAULT_RETURN_MS,
			0,
			5000
		),
		returnEasing: EASING.test( easing ) ? easing : undefined,
		target: resolveMovingPart( el ),
	};
}

/**
 * Register every marked element whose magnet is on at this tier with the shared driver. A motion layer's per-device
 * off switch (`data-sgs-fx-off-<tier>`, `data-sgs-fx-disable-<tier>`, Spec 38A FR-38A-23) unregisters the element on
 * entering that tier, so the driver drops its listeners with the last one, and registers it again on leaving.
 *
 * @return {void}
 */
function boot() {
	stopGated = bootGated( 'magnet', SELECTOR, ( el ) =>
		registerMagnet( el, readOptions( el ) )
	);
}

/**
 * Tear every magnet down; the driver removes its listeners with the last one.
 *
 * @return {void}
 */
function teardown() {
	stopGated();
	stopGated = () => {};
}

boot();

/*
 * bfcache (§1.6). A back-navigation restores the page from memory WITHOUT
 * re-running module code, so the registered elements may describe a DOM that
 * has since been re-rendered. Tearing down and re-booting on a persisted
 * restore keeps the two in step; a normal load does nothing here.
 */
window.addEventListener( 'pageshow', ( event ) => {
	if ( event.persisted ) {
		teardown();
		boot();
	}
} );
