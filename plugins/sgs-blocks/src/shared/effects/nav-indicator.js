/**
 * SGS shared motion — sliding nav indicator (Mega-Menu Build Spec §6, row 2).
 *
 * One absolute pill tracking the hovered/focused nav item, falling back to
 * the current-page item ( `[aria-current="page"]`, set client-side by
 * `sgs/nav-menu`'s view.js — see FR-36-10/-11 ) once the pointer/focus
 * leaves the bar. This is ADDITIVE to `sgs/nav-menu`'s existing per-link
 * `hoverStyle` treatments (pill/underline/text) — it does not replace or
 * alter them; both can render at once when an operator opts in.
 *
 * DELIBERATE, TIGHTLY-SCOPED EXCEPTION to project rule 1 ("transition ONLY
 * transform and opacity") — §6 describes `transform:translateX({x}px) +
 * width:{w}px`, and this module implements that LITERALLY (width included).
 * An earlier version tried to stay transform-only by expressing width as
 * `scaleX({w})` from a 1px base — that rendered WRONG at every width:
 * `border-radius` resolves BEFORE the transform, so scaling a 1px box up to
 * ~120px stretched the corners 120× horizontally into a smeared lozenge, not
 * a pill. Rule 1 exists to stop layout thrash PROPAGATING to sibling
 * elements; that risk doesn't apply here because
 * `.sgs-nav-menu__indicator` is `position: absolute` + `pointer-events: none`
 * — OUT OF NORMAL FLOW — so animating its width cannot reflow or repaint
 * anything else on the page. See the full rationale in the consuming CSS's
 * own comment (`sgs/nav-menu/style.css`, `.sgs-nav-menu__indicator`).
 *
 * CONSUMING CSS (ships in `sgs/nav-menu/style.css`, not here):
 *   .sgs-nav-menu__bar { position: relative; }
 *   .sgs-nav-menu__indicator {
 *     position: absolute; left: 0; top: 0; height: 100%;
 *     pointer-events: none; z-index: 0;
 *     width: var( --sgs-nav-indicator-w, 0px );
 *     transform: translateX( var( --sgs-nav-indicator-x, 0 ) );
 *     opacity: var( --sgs-nav-indicator-opacity, 0 );
 *     transition: transform .38s cubic-bezier(.16,.84,.32,1),
 *       width .38s cubic-bezier(.16,.84,.32,1),
 *       opacity .25s cubic-bezier(.16,.84,.32,1);
 *   }
 *
 * No-JS / reduced-motion: the pill defaults to `opacity: 0` (invisible)
 * until this module runs — with no JS it simply never appears, and every
 * link's own hover/current-page treatment (a real, always-present CSS rule)
 * is completely unaffected, so navigation never depends on this effect.
 *
 * @package
 */

import { prefersReducedMotion, isTouchInput } from './motion-utils';

const LINK_SELECTOR = '.sgs-nav-menu__link';
const INDICATOR_CLASS = 'sgs-nav-menu__indicator';

/**
 * Measure a link's position/width relative to the bar it lives in.
 *
 * @param {HTMLElement} barEl The bar (positioning context).
 * @param {HTMLElement} link  The link to measure.
 * @return {{x: number, w: number}} Offset from the bar's left edge + width.
 */
function measure( barEl, link ) {
	const barRect = barEl.getBoundingClientRect();
	const linkRect = link.getBoundingClientRect();
	return {
		x: linkRect.left - barRect.left,
		w: linkRect.width,
	};
}

/**
 * Initialise the sliding indicator on one nav bar.
 *
 * @param {HTMLElement} barEl The `.sgs-nav-menu__bar` element (or any
 *                            ancestor of the links carrying `position`).
 * @return {Function} Cleanup — removes listeners + the pill element. Safe
 *                     on a detached/empty element.
 */
export function initNavIndicator( barEl ) {
	if ( ! barEl || typeof barEl.querySelectorAll !== 'function' ) {
		return () => {};
	}

	let pill = barEl.querySelector( `:scope > .${ INDICATOR_CLASS }` );
	if ( ! pill ) {
		pill = document.createElement( 'span' );
		pill.className = INDICATOR_CLASS;
		pill.setAttribute( 'aria-hidden', 'true' );
		barEl.appendChild( pill );
	}

	const currentLink = () =>
		barEl.querySelector( `${ LINK_SELECTOR }[aria-current="page"]` );

	const moveTo = ( link, visible ) => {
		if ( ! link ) {
			pill.style.setProperty( '--sgs-nav-indicator-opacity', '0' );
			return;
		}
		const { x, w } = measure( barEl, link );
		pill.style.setProperty( '--sgs-nav-indicator-x', `${ x }px` );
		pill.style.setProperty( '--sgs-nav-indicator-w', `${ w }px` );
		pill.style.setProperty(
			'--sgs-nav-indicator-opacity',
			visible ? '1' : '0'
		);
	};

	// Re-measure the currently-shown link (hovered, else current-page) — used
	// on window resize AND once webfonts swap in, since a pill sized from the
	// fallback font measures the wrong width until the next interaction
	// (cheap insurance; no verified bug report, but re-measuring costs nothing).
	const remeasure = () => {
		const hovered = barEl.querySelector( `${ LINK_SELECTOR }:hover` );
		const link = hovered || currentLink();
		if ( link ) {
			moveTo( link, true );
		}
	};

	// Reduced motion: snap straight to the resting (current-page) state, no
	// hover-tracking loop — the end state renders instantly and correctly.
	if ( prefersReducedMotion() ) {
		const current = currentLink();
		if ( current ) {
			moveTo( current, true );
		}
		if ( typeof document !== 'undefined' && document.fonts?.ready ) {
			document.fonts.ready.then( remeasure ).catch( () => {} );
		}
		return () => {
			pill.remove();
		};
	}

	// Invisible until the first hover/focus.
	moveTo( null, false );

	const onEnterOrFocus = ( event ) => {
		const link =
			typeof event.target.closest === 'function'
				? event.target.closest( LINK_SELECTOR )
				: null;
		if ( link && barEl.contains( link ) ) {
			moveTo( link, true );
		}
	};

	// mouseover ALSO fires from a browser's synthetic post-tap mouse events on
	// some touchscreens — gate it reactively (isTouchInput() re-checks on
	// every call, not once at load) so a tap can never leave the pill stuck
	// under an item the user isn't actually hovering. Keyboard focus (focusin)
	// is untouched — it is never a touch/mouse ambiguity.
	const onMouseOver = ( event ) => {
		if ( isTouchInput() ) {
			return;
		}
		onEnterOrFocus( event );
	};

	const onLeaveOrBlur = ( event ) => {
		// Focus moving between two links inside the bar re-fires onEnterOrFocus
		// for the new one; only reset here when focus has actually left the bar.
		if ( event.relatedTarget && barEl.contains( event.relatedTarget ) ) {
			return;
		}
		const current = currentLink();
		moveTo( current, !! current );
	};

	// Belt-and-braces: a touch tap that fires pointerdown resets the pill to
	// its resting (current-page-or-hidden) state immediately, rather than
	// waiting for a mouseover that now gates itself out.
	const onPointerDown = ( event ) => {
		if ( 'touch' === event.pointerType ) {
			onLeaveOrBlur( event );
		}
	};

	barEl.addEventListener( 'mouseover', onMouseOver );
	barEl.addEventListener( 'focusin', onEnterOrFocus );
	barEl.addEventListener( 'mouseleave', onLeaveOrBlur );
	barEl.addEventListener( 'focusout', onLeaveOrBlur );
	barEl.addEventListener( 'pointerdown', onPointerDown );
	window.addEventListener( 'resize', remeasure );

	if ( typeof document !== 'undefined' && document.fonts?.ready ) {
		document.fonts.ready.then( remeasure ).catch( () => {} );
	}

	return () => {
		barEl.removeEventListener( 'mouseover', onMouseOver );
		barEl.removeEventListener( 'focusin', onEnterOrFocus );
		barEl.removeEventListener( 'mouseleave', onLeaveOrBlur );
		barEl.removeEventListener( 'focusout', onLeaveOrBlur );
		barEl.removeEventListener( 'pointerdown', onPointerDown );
		window.removeEventListener( 'resize', remeasure );
		pill.remove();
	};
}
