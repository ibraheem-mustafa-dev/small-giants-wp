/**
 * Tier G effect: the stored parameters of a horizontal-panel section (Spec 38A FR-38A-38, FR-38A-39, FR-38A-50).
 *
 * Each parameter arrives on the attribute that `motion.schema.json::HorizontalPanelValues` names for it
 * (`x-sgs-field.dataAttr`). A parameter whose field also names a custom property would be read from the computed
 * custom property first; none of this effect's inputs do (its only custom properties, `--sgs-fx-progress`,
 * `--sgs-focus-s` and `--sgs-focus-op`, are outputs the effect writes), so every input is the attribute, then the
 * default below. Exports functions only; nothing runs on import and nothing is written.
 *
 * @package
 */

import { readSmoothing } from './scroll-rows.js';

/**
 * Where each parameter arrives: the `x-sgs-field.dataAttr` of that parameter.
 *
 * @type {Object<string, string>}
 */
export const ATTRS = {
	smoothing: 'data-sgs-fx-scrub',
	easing: 'data-sgs-fx-ease',
	hold: 'data-sgs-fx-hold',
	breakpoint: 'data-sgs-fx-horizontal-panel-breakpoint',
	pinLength: 'data-sgs-fx-end',
	pinTail: 'data-sgs-fx-horizontal-panel-pin-tail',
	progressOutput: 'data-sgs-fx-horizontal-panel-progress-output',
	activeState: 'data-sgs-fx-horizontal-panel-active-state',
	belowMode: 'data-sgs-fx-horizontal-panel-below-mode',
	proximityFocus: 'data-sgs-fx-horizontal-panel-proximity-focus',
	focusScale: 'data-sgs-fx-horizontal-panel-focus-scale',
	edgeScale: 'data-sgs-fx-horizontal-panel-edge-scale',
	focusOpacity: 'data-sgs-fx-horizontal-panel-focus-opacity',
	edgeOpacity: 'data-sgs-fx-horizontal-panel-edge-opacity',
};

/**
 * The narrowest viewport on which each `breakpoint` value pins. The stylesheet carries the same three widths.
 *
 * @type {Object<string, string>}
 */
export const PIN_QUERIES = {
	mobile: '(min-width: 0px)',
	tablet: '(min-width: 768px)',
	desktop: '(min-width: 1024px)',
};

/** Named hold steps, the same fractions `pin-scrub-params.js` offers beside the slider. */
const HOLD_STEPS = { none: 0, short: 0.15, standard: 0.33, long: 0.5 };

/** The proximity-focus values the reference draft's `updatePins` loop uses: centre 1 and 1, one panel-width off 0.94 and 0.55. */
export const FOCUS_DEFAULTS = {
	focusScale: 1,
	edgeScale: 0.94,
	focusOpacity: 1,
	edgeOpacity: 0.55,
};

/**
 * A trimmed attribute value, or null when it is absent or blank.
 *
 * @param {HTMLElement} el   Element carrying the attributes.
 * @param {string}      name Attribute name.
 * @return {string|null} The value.
 */
function text( el, name ) {
	const raw = el.getAttribute( name );
	return raw && raw.trim() ? raw.trim() : null;
}

/**
 * A boolean attribute (`true` / `false`), or the fallback when it is absent.
 *
 * @param {HTMLElement} el       Element carrying the attribute.
 * @param {string}      name     Attribute name.
 * @param {boolean}     fallback Value when unset.
 * @return {boolean} The flag.
 */
function flag( el, name, fallback ) {
	const raw = text( el, name );
	return null === raw ? fallback : 'false' !== raw && '0' !== raw;
}

/**
 * A finite number from an attribute, or the fallback.
 *
 * @param {HTMLElement} el       Element carrying the attribute.
 * @param {string}      name     Attribute name.
 * @param {number}      fallback Value when unset or unreadable.
 * @return {number} The number.
 */
function number( el, name, fallback ) {
	const raw = text( el, name );
	const parsed = null === raw ? NaN : parseFloat( raw );
	return Number.isFinite( parsed ) ? parsed : fallback;
}

/**
 * A scroll length: `70vh`, `70%` and `+=70%` are a share of the viewport height (the emitter writes a stored vh
 * pin length as `+=N%`), `300px` and `+=300px` are pixels, a bare number is vh.
 *
 * @param {string|null} raw Attribute text.
 * @return {{value: number, unit: 'vh'|'px'}|null} The length, or null when unset or unreadable.
 */
export function parseScrollLength( raw ) {
	const match =
		/^\+?=?\s*(-?(?:\d+(?:\.\d+)?|\.\d+))\s*(vh|svh|dvh|%|px)?$/i.exec(
			raw || ''
		);
	if ( ! match ) {
		return null;
	}
	const value = Number( match[ 1 ] );
	if ( value < 0 ) {
		return null;
	}
	return {
		value,
		unit: 'px' === ( match[ 2 ] || '' ).toLowerCase() ? 'px' : 'vh',
	};
}

/**
 * A scroll length in pixels for the current viewport.
 *
 * @param {{value: number, unit: string}|null} length   A length from `parseScrollLength`.
 * @param {number}                             viewport Viewport height in pixels.
 * @return {number} Pixels, 0 when there is no length.
 */
export function lengthPx( length, viewport ) {
	if ( ! length ) {
		return 0;
	}
	return 'px' === length.unit
		? length.value
		: ( length.value * viewport ) / 100;
}

/**
 * The hold fraction: the share of the pin spent with the row at rest after its travel. A number from 0 to 0.6 or a
 * named step; absent means none, so the default mapping is linear.
 *
 * @param {HTMLElement} el Element carrying `data-sgs-fx-hold`.
 * @return {number} Fraction of the pin, 0 to 0.6.
 */
export function readHold( el ) {
	const raw = text( el, ATTRS.hold );
	if ( null === raw ) {
		return 0;
	}
	const numeric = Number( raw );
	if ( Number.isFinite( numeric ) ) {
		return Math.min( Math.max( numeric, 0 ), 0.6 );
	}
	return HOLD_STEPS[ raw ] ?? 0;
}

/**
 * Every stored parameter of one horizontal-panel element.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="horizontal-panel"`.
 * @return {Object} The parameters: `scrub` (seconds, or `true` for none), `ease` (text or null), `hold`, `pinQuery`,
 *                  `belowMode`, `pinLength`, `pinTail`, `progress`, `active`, `focus` (on or off) and the four focus values.
 */
export function readParams( el ) {
	const breakpoint = text( el, ATTRS.breakpoint );
	const belowMode = text( el, ATTRS.belowMode );
	return {
		scrub: readSmoothing( el, ATTRS.smoothing, null, 0 ),
		ease: text( el, ATTRS.easing ),
		hold: readHold( el ),
		pinQuery: PIN_QUERIES[ breakpoint ] || PIN_QUERIES.tablet,
		belowMode: 'static' === belowMode ? 'static' : 'snap',
		pinLength: parseScrollLength( text( el, ATTRS.pinLength ) ),
		pinTail: parseScrollLength( text( el, ATTRS.pinTail ) ),
		progress: flag( el, ATTRS.progressOutput, true ),
		active: flag( el, ATTRS.activeState, true ),
		focus: flag( el, ATTRS.proximityFocus, false ),
		focusScale: number( el, ATTRS.focusScale, FOCUS_DEFAULTS.focusScale ),
		edgeScale: number( el, ATTRS.edgeScale, FOCUS_DEFAULTS.edgeScale ),
		focusOpacity: number(
			el,
			ATTRS.focusOpacity,
			FOCUS_DEFAULTS.focusOpacity
		),
		edgeOpacity: number(
			el,
			ATTRS.edgeOpacity,
			FOCUS_DEFAULTS.edgeOpacity
		),
	};
}
