/**
 * SGS shared motion — magnet label (Mega-Menu Build Spec §6, row 4).
 *
 * A small horizontal "pull" toward the cursor on a nav item's label, capped
 * at ±8px. `el` IS the label element to be transformed (e.g.
 * `.sgs-nav-menu__link-text` / `.sgs-nav-menu__label`) — mousemove is
 * tracked over that same element's own box, so the pull only engages while
 * the cursor is actually over the visible label.
 *
 * Frozen export contract:
 *   import { initMagnet } from '../../shared/effects/magnet';
 *   const cleanup = initMagnet( labelEl );
 *
 * CONSUMING CSS (ships in the consuming block's own stylesheet, e.g.
 * `sgs/nav-menu/style.css`):
 *   [data-magnet] .sgs-nav-menu__link-text,
 *   [data-magnet] .sgs-nav-menu__label {
 *     display: inline-block;
 *     transform: translateX( var( --magnet-x, 0px ) );
 *     transition: transform .2s ease-out;
 *   }
 *   \@media ( prefers-reduced-motion: reduce ) {
 *     [data-magnet] .sgs-nav-menu__link-text,
 *     [data-magnet] .sgs-nav-menu__label { transition: none; }
 *   }
 *
 * `var(--magnet-x, 0px)` defaults to zero displacement, so with no JS (or
 * with `[data-magnet]` never present because the opt-in flag is off) the
 * label sits exactly where it would without the effect — this is a pure
 * enhancement, never load-bearing for reading or activating the link.
 *
 * @package
 */

import {
	prefersReducedMotion,
	rafThrottle,
	isTouchInput,
} from './motion-utils';

const MAX_PULL_PX = 8;
const PULL_FACTOR = 0.15;

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
 * Attach the magnet-pull effect to one label element.
 *
 * @param {HTMLElement} el The label element to nudge toward the cursor.
 * @return {Function} Cleanup — removes the listeners. Safe on a
 *                     detached/empty element.
 */
export function initMagnet( el ) {
	if ( ! el || typeof el.addEventListener !== 'function' ) {
		return () => {};
	}

	// Resting position — always applied, so the label sits at its natural
	// spot until (and unless) the cursor engages it.
	el.style.setProperty( '--magnet-x', '0px' );

	// Reduced motion: the effect is off entirely — no listeners attached, no
	// displacement ever applied.
	if ( prefersReducedMotion() ) {
		return () => {};
	}

	const handleMove = rafThrottle( ( event ) => {
		// Reactive touch gate (NOT a one-time device check): a hybrid
		// trackpad+touchscreen device can switch pointer types mid-session,
		// and some browsers fire synthetic mousemove after a tap — both would
		// otherwise leave the label stuck off-centre with no real cursor to
		// release it.
		if ( isTouchInput() ) {
			return;
		}
		const rect = el.getBoundingClientRect();
		if ( 0 === rect.width ) {
			return;
		}
		const centre = rect.left + rect.width / 2;
		const pull = clamp(
			( event.clientX - centre ) * PULL_FACTOR,
			-MAX_PULL_PX,
			MAX_PULL_PX
		);
		el.style.setProperty( '--magnet-x', `${ pull.toFixed( 2 ) }px` );
	} );

	const handleLeave = () => el.style.setProperty( '--magnet-x', '0px' );

	// Belt-and-braces: a touch tap that fires pointerdown resets the label
	// immediately, rather than waiting for a mousemove that gates itself out.
	const handlePointerDown = ( event ) => {
		if ( 'touch' === event.pointerType ) {
			handleLeave();
		}
	};

	el.addEventListener( 'mousemove', handleMove );
	el.addEventListener( 'mouseleave', handleLeave );
	el.addEventListener( 'pointerdown', handlePointerDown );

	return () => {
		handleMove.cancel();
		el.removeEventListener( 'mousemove', handleMove );
		el.removeEventListener( 'mouseleave', handleLeave );
		el.removeEventListener( 'pointerdown', handlePointerDown );
	};
}
