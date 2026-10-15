/**
 * Tier G effect: the parameters of a pinned section and its children (Spec 38 FR-38-6).
 *
 * Each parameter is read from the element's computed custom property first (the per-device value the emitter writes
 * inside its media queries), then its data attribute (the desktop value), then the default. Exports functions only;
 * nothing runs on import.
 *
 * @package
 */

import { readResponsive, readPixels } from './scroll-rows.js';

/**
 * Where each pin-scrub parameter of `motion.schema.json::PinScrubValues`
 * arrives: the `x-sgs-field.dataAttr` of that parameter. The pin length is the
 * relative `end` (`+=100%`).
 *
 * @type {Object<string, string>}
 */
export const PARAMETER_ATTRS = {
	'pin-scrub-rows': 'data-sgs-fx-pin-scrub-rows',
	'pin-scrub-stagger': 'data-sgs-fx-stagger',
	'pin-scrub-hold': 'data-sgs-fx-hold',
	'pin-scrub-pin-top-offset': 'data-sgs-fx-pin-scrub-pin-top-offset',
	'pin-scrub-smoothing': 'data-sgs-fx-scrub',
	'pin-scrub-pin-length': 'data-sgs-fx-end',
	'pin-scrub-start': 'data-sgs-fx-start',
};

/**
 * The per-device custom property of a parameter that has one. It wins over the
 * attribute (the desktop value) when non-empty.
 *
 * @type {Object<string, string>}
 */
export const CUSTOM_PROPERTIES = {
	'pin-scrub-start': '--sgs-pin-scrub-start',
	'pin-scrub-pin-length': '--sgs-pin-scrub-end',
	'pin-scrub-smoothing': '--sgs-pin-scrub-smoothing',
	'pin-scrub-hold': '--sgs-pin-scrub-hold',
	'pin-scrub-stagger': '--sgs-pin-scrub-stagger',
	'pin-scrub-pin-top-offset': '--sgs-pin-scrub-pin-top-offset',
};

/** Seconds between one child's entrance and the next, when no step is set. */
const DEFAULT_STAGGER = 0.15;

/**
 * Curated from/to presets a child's entrance can use. Deliberately small and
 * closed — §3.1 says presets, not authoring, so this list is the inspector's
 * entire vocabulary, not a starting point to extend ad hoc per block.
 *
 * @type {Object<string, {from: Object, to: Object}>}
 */
const CHILD_PRESETS = {
	'fade-up': { from: { opacity: 0, y: 40 }, to: { opacity: 1, y: 0 } },
	'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
	'slide-left': { from: { opacity: 0, x: 60 }, to: { opacity: 1, x: 0 } },
	'slide-right': { from: { opacity: 0, x: -60 }, to: { opacity: 1, x: 0 } },
	'scale-in': {
		from: { opacity: 0, scale: 0.85 },
		to: { opacity: 1, scale: 1 },
	},
};

/**
 * Resolve a child's from/to targets: its own preset when it names one, else the
 * section's property rows, else `fade-up` for an absent or unrecognised value (see the child-markup
 * contract note above for why this defaults rather than skips).
 *
 * @param {HTMLElement}                     child The participating child element.
 * @param {{from: Object, to: Object}|null} rows  The section's property rows, or null.
 * @return {{from: Object, to: Object}} The child's from/to tween targets.
 */
export function resolveChildPreset( child, rows ) {
	const requested = child.getAttribute( 'data-sgs-fx-child-preset' );
	return CHILD_PRESETS[ requested ] || rows || CHILD_PRESETS[ 'fade-up' ];
}

/**
 * How much of the pin is spent holding the finished state, per `data-sgs-fx-hold`
 * (a named step, or the slider's number from 0 to 0.6).
 *
 * Expressed as a FRACTION OF THE PIN rather than a pixel figure, so it scales
 * with whatever pin length the client chose: doubling "how long it stays stuck"
 * doubles the pause too, instead of leaving a fixed dwell that feels
 * proportionally shorter the longer the section holds.
 *
 * `0.33` is the default (Bean, 2026-07-30) — with the shipped one-screen pin
 * that is ~270px of scrolling with everything settled, about three wheel
 * notches. The previous behaviour was ~100px, which is where the report
 * "you have to scroll to an exact point" came from.
 *
 * @type {Object<string, number>}
 */
const HOLD_FRACTIONS = {
	none: 0,
	short: 0.15,
	standard: 0.33,
	long: 0.5,
};

/**
 * Resolve the hold fraction, defaulting to `standard`.
 *
 * @param {HTMLElement} el Element carrying the fx attributes.
 * @return {number} Fraction of the pin spent holding, 0 to <1.
 */
export function resolveHoldFraction( el ) {
	const raw =
		readResponsive(
			el,
			CUSTOM_PROPERTIES[ 'pin-scrub-hold' ],
			PARAMETER_ATTRS[ 'pin-scrub-hold' ]
		) || '';
	const numeric = '' === raw ? NaN : Number( raw );
	if ( Number.isFinite( numeric ) ) {
		// The slider's own value (0 to 0.6), beside the named steps.
		return Math.min( Math.max( numeric, 0 ), 0.6 );
	}
	const fraction = HOLD_FRACTIONS[ raw ];
	// An unset or unrecognised value takes the default rather than 0 — a
	// missing attribute must not silently mean "no pause", which is the
	// behaviour that was reported as wrong.
	return undefined === fraction ? HOLD_FRACTIONS.standard : fraction;
}

/**
 * A length in pixels from custom-property text (`40`, `40px`).
 *
 * @param {string|null} raw Value text.
 * @return {number|null} Pixels, or null when unset or not in pixels.
 */
function pixelsFromText( raw ) {
	const match = /^\s*(-?(?:\d+(?:\.\d+)?|\.\d+))(?:px)?\s*$/.exec(
		raw || ''
	);
	return match ? Number( match[ 1 ] ) : null;
}

/**
 * Seconds between one child's entrance and the next.
 *
 * @param {HTMLElement} el Element carrying the fx attributes.
 * @return {number} Seconds, `DEFAULT_STAGGER` when unset or unreadable.
 */
export function readStagger( el ) {
	const parsed = parseFloat(
		readResponsive(
			el,
			CUSTOM_PROPERTIES[ 'pin-scrub-stagger' ],
			PARAMETER_ATTRS[ 'pin-scrub-stagger' ]
		)
	);
	return Number.isFinite( parsed ) ? parsed : DEFAULT_STAGGER;
}

/**
 * The author's pin top offset in pixels, or null.
 *
 * @param {HTMLElement} el Element carrying the fx attributes.
 * @return {number|null} Pixels.
 */
function readPinTopOffset( el ) {
	const custom = pixelsFromText(
		readResponsive(
			el,
			CUSTOM_PROPERTIES[ 'pin-scrub-pin-top-offset' ],
			null
		)
	);
	return null !== custom
		? custom
		: readPixels( el, PARAMETER_ATTRS[ 'pin-scrub-pin-top-offset' ] );
}

/**
 * The ScrollTrigger `start` the author set: an explicit start, else the pin top offset (which replaces the header
 * clearance, parking the section that many pixels below the viewport top).
 *
 * @param {HTMLElement} el Element carrying the fx attributes.
 * @return {string|null} A start position, or null when the author set neither.
 */
export function readPinStart( el ) {
	const authored = readResponsive(
		el,
		CUSTOM_PROPERTIES[ 'pin-scrub-start' ],
		PARAMETER_ATTRS[ 'pin-scrub-start' ]
	);
	if ( authored ) {
		return authored;
	}
	const offset = readPinTopOffset( el );
	if ( null === offset ) {
		return null;
	}
	return offset < 0
		? `top top-=${ Math.abs( offset ) }`
		: `top top+=${ offset }`;
}

/**
 * The ScrollTrigger `end`: how many viewport-heights the section holds still while its timeline plays out.
 *
 * @param {HTMLElement} el Element carrying the fx attributes.
 * @return {string} An end position, `+=100%` when unset.
 */
export function readPinEnd( el ) {
	return (
		readResponsive(
			el,
			CUSTOM_PROPERTIES[ 'pin-scrub-pin-length' ],
			PARAMETER_ATTRS[ 'pin-scrub-pin-length' ]
		) || '+=100%'
	);
}
