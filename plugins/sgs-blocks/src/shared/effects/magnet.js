/**
 * SGS shared motion — magnetic pull (Spec 38 §3.3, FR-38-30; Spec 38A FR-38A-40). Tier V.
 *
 * An element leans toward the pointer. ONE runtime serves every consumer (the
 * `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` label magnets through
 * `initMagnet`, the `magnet` fx effect through `registerMagnet`).
 *
 * ── THE CATCH AREA ────────────────────────────────────────────────────────
 * `engage: 'proximity'` (the default) pulls while the pointer is still OUTSIDE
 * the element, inside a radius measured to the element's BOX (default 120px).
 * That needs pointer positions from outside the element, which an element
 * listener never sees, so the pointer is read at DOCUMENT level: one shared,
 * rAF-throttled `mousemove` listener drives every registered magnet. A magnet
 * whose cached resting box is farther than its radius from the pointer does no
 * work and no DOM read. `engage: 'over'` pulls only while the pointer is over
 * the element's own box.
 *
 * ── PULL MODELS ───────────────────────────────────────────────────────────
 *   distance    pull = offset from the element centre x factor, capped at the
 *               max pull of each axis.
 *   normalised  the offset is divided by half the element's own size and clamped
 *               to -1..1, so the pull reaches its end at the element's edge
 *               whatever its size; the max pull of an axis is the TOTAL travel
 *               (edge to edge), so the element moves at most half of it either way.
 * Proximity scales either model by 1 - distance / radius, so the pull eases to
 * nothing at the radius and the element never snaps when the pointer leaves.
 *
 * ── OUTPUT ────────────────────────────────────────────────────────────────
 * Writes custom properties only (FR-38A-47): `--sgs-mag-x` / `--sgs-mag-y` (the
 * magnet slot of the translate channel in motion.css), `--sgs-mag-dur` (0ms
 * while tracking, the return duration on release) and `--sgs-mag-ease`. CSS owns
 * every declaration. With no JS the properties stay at their 0px defaults.
 *
 * Reduced motion is read live: a mid-session switch rests every magnet and
 * detaches the listener, and the switch back re-attaches it.
 *
 * @package
 */

import {
	prefersReducedMotion,
	rafThrottle,
	isTouchInput,
} from './motion-utils';

/** Nav-menu label defaults (`initMagnet` with no options). */
const MAX_PULL_PX = 8;
const PULL_FACTOR = 0.15;

/** The default catch area, in px from the element's box. */
export const DEFAULT_RADIUS = 120;
export const DEFAULT_RETURN_MS = 250;
export const DEFAULT_RETURN_EASE = 'ease-out';

const MQ = '(prefers-reduced-motion: reduce)';

/**
 * A finite number from a value, else the fallback. Infinity is accepted
 * (nav-bar-menu lifts the cap with it).
 *
 * @param {*}      value    The candidate.
 * @param {number} fallback Used when the candidate is not a number.
 * @return {number} The number.
 */
function num( value, fallback ) {
	return 'number' === typeof value && ! Number.isNaN( value )
		? value
		: fallback;
}

/**
 * Clamp a value between a minimum and a maximum.
 *
 * @param {number} value The value to clamp.
 * @param {number} min   The minimum.
 * @param {number} max   The maximum.
 * @return {number} The clamped value.
 */
function clamp( value, min, max ) {
	return Math.min( max, Math.max( min, value ) );
}

/**
 * Shortest distance from a point to a rectangle. Zero when the point is inside.
 *
 * Measured to the BOX, not the centre: distance-to-centre makes a wide element
 * engage late at its ends.
 *
 * @param {Object} rect Box with left, right, top, bottom.
 * @param {number} x    Pointer clientX.
 * @param {number} y    Pointer clientY.
 * @return {number} Distance in px, 0 when inside.
 */
function distanceToRect( rect, x, y ) {
	const dx = Math.max( rect.left - x, 0, x - rect.right );
	const dy = Math.max( rect.top - y, 0, y - rect.bottom );
	return Math.hypot( dx, dy );
}

/**
 * The element's current translate in px (every channel owner included), so the
 * resting box can be recovered from a rect that already includes it.
 *
 * @param {HTMLElement} el The element.
 * @return {{x: number, y: number}} Offsets, zero when none.
 */
function currentTranslate( el ) {
	const value =
		( 'function' === typeof window.getComputedStyle &&
			window.getComputedStyle( el ).translate ) ||
		'';
	if ( ! value || 'none' === value ) {
		return { x: 0, y: 0 };
	}
	const parts = value.split( /\s+/ ).map( parseFloat );
	return { x: parts[ 0 ] || 0, y: parts[ 1 ] || 0 };
}

/**
 * The driver-agnostic core. Attaches NO listeners; the shared driver below (or a
 * test) calls `apply` with pointer positions.
 *
 * @param {HTMLElement} el                    The element to nudge.
 * @param {Object}      [opts]                Options.
 * @param {string}      [opts.engage]         'proximity' (default) | 'over'.
 * @param {string}      [opts.pullModel]      'distance' (default) | 'normalised'.
 * @param {string}      [opts.axis]           'x' (default) | 'y' | 'both'.
 * @param {number}      [opts.radius]         Catch area in px (proximity). Default 120.
 * @param {number}      [opts.maxPull]        Max pull in px for both axes.
 * @param {number}      [opts.maxPullX]       Max pull in px on x (overrides maxPull).
 * @param {number}      [opts.maxPullY]       Max pull in px on y (overrides maxPull).
 * @param {number}      [opts.factor]         Fraction of the offset applied (distance model).
 * @param {number}      [opts.returnDuration] Return time in ms. Default 250.
 * @param {string}      [opts.returnEasing]   CSS easing for the return. Default ease-out.
 * @return {{apply: Function, reset: Function, invalidate: Function, destroy: Function}} The driver.
 */
export function createMagnet( el, opts = {} ) {
	const proximity = 'over' !== opts.engage;
	const normalised = 'normalised' === opts.pullModel;
	const axis = opts.axis || 'x';
	const radius = Math.max( 0, num( opts.radius, DEFAULT_RADIUS ) );
	const maxPull = num( opts.maxPull, MAX_PULL_PX );
	const maxX = Math.max( 0, num( opts.maxPullX, maxPull ) );
	const maxY = Math.max( 0, num( opts.maxPullY, maxPull ) );
	const factor = num( opts.factor, PULL_FACTOR );
	const returnMs = Math.max(
		0,
		num( opts.returnDuration, DEFAULT_RETURN_MS )
	);

	let rest = null;
	let curX = 0;
	let curY = 0;
	let held = false;

	// The element that moves: a declared part of the block, else the element itself. The pull is still measured from
	// `el`, so the catch area is the whole block.
	const mover = opts.target && opts.target !== el ? opts.target : el;
	if ( mover !== el ) {
		mover.setAttribute( 'data-sgs-mag-part', '' );
	}

	const write = ( x, y, ms ) => {
		mover.style.setProperty( '--sgs-mag-x', x.toFixed( 2 ) + 'px' );
		mover.style.setProperty( '--sgs-mag-y', y.toFixed( 2 ) + 'px' );
		mover.style.setProperty( '--sgs-mag-dur', ms + 'ms' );
		curX = x;
		curY = y;
	};

	if ( opts.returnEasing ) {
		mover.style.setProperty( '--sgs-mag-ease', String( opts.returnEasing ) );
	}

	// Resting write up front, so the element sits at its natural spot until
	// (and unless) the pointer engages it.
	write( 0, 0, 0 );

	/** Back to rest over the return duration (once; repeated calls do nothing). */
	const reset = () => {
		if ( held || 0 !== curX || 0 !== curY ) {
			held = false;
			write( 0, 0, returnMs );
		}
	};

	/** Forget the cached resting box (scroll, resize, layout change). */
	const invalidate = () => {
		rest = null;
	};

	const measure = () => {
		const rect = el.getBoundingClientRect();
		const t = currentTranslate( el );
		rest = {
			left: rect.left - t.x,
			right: rect.right - t.x,
			top: rect.top - t.y,
			bottom: rect.bottom - t.y,
			width: rect.width,
			height: rect.height,
		};
	};

	const pull = ( offset, half, max, strength ) => {
		const base = normalised
			? clamp( offset / half, -1, 1 ) * ( max / 2 )
			: clamp( offset * factor, -max, max );
		return base * strength;
	};

	const apply = ( clientX, clientY ) => {
		// Reactive touch gate: a hybrid device can switch pointer types
		// mid-session and some browsers fire a synthetic mousemove after a tap.
		if ( isTouchInput() ) {
			reset();
			return;
		}
		if ( ! rest ) {
			measure();
		}
		if ( 0 === rest.width || 0 === rest.height ) {
			return;
		}
		const distance = distanceToRect( rest, clientX, clientY );
		const reach = proximity ? radius : 0;
		if ( distance > reach ) {
			reset();
			return;
		}
		const strength = proximity && radius > 0 ? 1 - distance / radius : 1;
		const dx = clientX - ( rest.left + rest.width / 2 );
		const dy = clientY - ( rest.top + rest.height / 2 );
		held = true;
		write(
			'y' === axis ? 0 : pull( dx, rest.width / 2, maxX, strength ),
			'x' === axis ? 0 : pull( dy, rest.height / 2, maxY, strength ),
			0
		);
	};

	return {
		apply,
		reset,
		invalidate,
		destroy: () => {
			[
				'--sgs-mag-x',
				'--sgs-mag-y',
				'--sgs-mag-dur',
				'--sgs-mag-ease',
			].forEach( ( name ) => mover.style.removeProperty( name ) );
			if ( mover !== el ) {
				mover.removeAttribute( 'data-sgs-mag-part' );
			}
		},
	};
}

/* ==========================================================================
 * The shared document driver: ONE listener set for every registered magnet.
 * ========================================================================== */

const registry = new Set();
let attached = false;
let mediaQuery = null;
let resizeObserver = null;

const onMove = rafThrottle( ( event ) => {
	registry.forEach( ( magnet ) =>
		magnet.apply( event.clientX, event.clientY )
	);
} );
const restAll = () => registry.forEach( ( magnet ) => magnet.reset() );
const invalidateAll = () =>
	registry.forEach( ( magnet ) => magnet.invalidate() );

/**
 * The pointer left the window: let go of everything.
 *
 * @param {MouseEvent} event The mouseout event.
 */
const onOut = ( event ) => {
	if ( ! event.relatedTarget ) {
		onMove.cancel();
		restAll();
	}
};
const onDown = ( event ) => {
	if ( 'touch' === event.pointerType ) {
		onMove.cancel();
		restAll();
	}
};
const onPageShow = () => invalidateAll();

function attach() {
	if ( attached ) {
		return;
	}
	attached = true;
	document.addEventListener( 'mousemove', onMove );
	document.addEventListener( 'mouseout', onOut );
	document.addEventListener( 'pointerdown', onDown );
	// Capture, so a scroll inside any container refreshes the cached boxes.
	window.addEventListener( 'scroll', invalidateAll, {
		capture: true,
		passive: true,
	} );
	window.addEventListener( 'resize', invalidateAll );
	window.addEventListener( 'pageshow', onPageShow );
	if ( 'function' === typeof window.ResizeObserver ) {
		resizeObserver = new window.ResizeObserver( invalidateAll );
		resizeObserver.observe( document.documentElement );
	}
}

function detach() {
	if ( ! attached ) {
		return;
	}
	attached = false;
	onMove.cancel();
	document.removeEventListener( 'mousemove', onMove );
	document.removeEventListener( 'mouseout', onOut );
	document.removeEventListener( 'pointerdown', onDown );
	window.removeEventListener( 'scroll', invalidateAll, { capture: true } );
	window.removeEventListener( 'resize', invalidateAll );
	window.removeEventListener( 'pageshow', onPageShow );
	if ( resizeObserver ) {
		resizeObserver.disconnect();
		resizeObserver = null;
	}
}

/** Attach while there are magnets and motion is allowed; rest and detach otherwise. */
function sync() {
	if ( registry.size > 0 && ! prefersReducedMotion() ) {
		attach();
		return;
	}
	restAll();
	detach();
}

function watchMotionPreference() {
	if (
		mediaQuery ||
		'undefined' === typeof window ||
		'function' !== typeof window.matchMedia
	) {
		return;
	}
	mediaQuery = window.matchMedia( MQ );
	if ( mediaQuery && 'function' === typeof mediaQuery.addEventListener ) {
		mediaQuery.addEventListener( 'change', sync );
	}
}

function unwatchMotionPreference() {
	if ( mediaQuery && 'function' === typeof mediaQuery.removeEventListener ) {
		mediaQuery.removeEventListener( 'change', sync );
	}
	mediaQuery = null;
}

/**
 * Register one element with the shared driver.
 *
 * @param {HTMLElement} el     The element.
 * @param {Object}      [opts] Passed to {@link createMagnet}.
 * @return {Function} Cleanup: unregisters, clears the custom properties and, with
 *                     the last magnet gone, removes every listener.
 */
export function registerMagnet( el, opts = {} ) {
	if ( ! el || 'function' !== typeof el.getBoundingClientRect ) {
		return () => {};
	}
	const magnet = createMagnet( el, opts );
	registry.add( magnet );
	watchMotionPreference();
	sync();
	return () => {
		registry.delete( magnet );
		magnet.destroy();
		if ( 0 === registry.size ) {
			detach();
			unwatchMotionPreference();
		}
	};
}

/**
 * Attach the magnet effect to one element. CONTRACT: `sgs/nav-bar-menu` and
 * `sgs/nav-drawer-menu` import this. With no options it is the label magnet:
 * horizontal only, 8px cap, factor 0.15, and a 120px catch area around the label
 * (pass `engage: 'over'` for the old over-the-box-only behaviour).
 *
 * @param {HTMLElement} el     The element to nudge toward the cursor.
 * @param {Object}      [opts] Passed to {@link createMagnet}.
 * @return {Function} Cleanup. Safe on a detached or empty element.
 */
export function initMagnet( el, opts = {} ) {
	return registerMagnet( el, opts );
}
