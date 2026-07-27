/**
 * SGS shared motion — cursor spotlight (Mega-Menu Build Spec §6, row 3).
 *
 * Frozen export contract — a parallel agent imports this into
 * `sgs/mega-panel` (the aside) without seeing this file's implementation:
 *
 *   import { initSpotlight } from '../../shared/effects/spotlight';
 *   const cleanup = initSpotlight( asideEl );
 *
 * CONSUMING-BLOCK CSS CONTRACT (Spec 32 no-inline: this module writes ONLY
 * the `--mx` / `--my` custom-property VALUES; the actual `background-image`
 * declaration lives in the consuming block's own scoped stylesheet):
 *
 *   [data-spotlight] {
 *     position: relative;
 *   }
 *   [data-spotlight]::before {
 *     content: '';
 *     position: absolute;
 *     inset: 0;
 *     opacity: .9;
 *     pointer-events: none;
 *     background: radial-gradient(
 *       260px circle at var( --mx, 50% ) var( --my, 30% ),
 *       var( --sgs-spotlight-colour, var( --wp--preset--color--accent ) ),
 *       transparent 70%
 *     );
 *   }
 *
 * `var(--mx, 50%)` / `var(--my, 30%)` default to the STATIC centre-ish
 * position, so with no JS (or with reduced motion) the spotlight simply
 * never moves — it renders as one fixed soft highlight, never absent.
 *
 * Contrast note (rule `an-effect-recomputes-every-contrast-above-it`): the
 * consuming block MUST verify text-over-the-lifted-zone contrast at the
 * position the spotlight ACTUALLY occupies, not just at its resting spot —
 * that check belongs to the consuming block, not this shared module.
 *
 * @package
 */

import { prefersReducedMotion, rafThrottle } from './motion-utils';

const STATIC_X = '50%';
const STATIC_Y = '30%';

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
 * Attach a rAF-throttled cursor-tracking spotlight to `el`.
 *
 * @param {HTMLElement} el The element the spotlight follows the cursor over.
 * @return {Function} Cleanup — removes the listeners. Safe on a
 *                     detached/empty element.
 */
export function initSpotlight( el ) {
	if ( ! el || typeof el.addEventListener !== 'function' ) {
		return () => {};
	}

	// Static default position — always applied, so the spotlight is never
	// absent even before the first pointer move.
	el.style.setProperty( '--mx', STATIC_X );
	el.style.setProperty( '--my', STATIC_Y );

	// Reduced motion / effectively static: no mousemove tracking at all —
	// the fixed default position IS the correct end state (rule 3).
	if ( prefersReducedMotion() ) {
		return () => {};
	}

	const handleMove = rafThrottle( ( event ) => {
		const rect = el.getBoundingClientRect();
		if ( 0 === rect.width || 0 === rect.height ) {
			return;
		}
		const x = clamp(
			( ( event.clientX - rect.left ) / rect.width ) * 100,
			0,
			100
		);
		const y = clamp(
			( ( event.clientY - rect.top ) / rect.height ) * 100,
			0,
			100
		);
		el.style.setProperty( '--mx', `${ x.toFixed( 2 ) }%` );
		el.style.setProperty( '--my', `${ y.toFixed( 2 ) }%` );
	} );

	const handleLeave = () => {
		el.style.setProperty( '--mx', STATIC_X );
		el.style.setProperty( '--my', STATIC_Y );
	};

	el.addEventListener( 'mousemove', handleMove );
	el.addEventListener( 'mouseleave', handleLeave );

	return () => {
		handleMove.cancel();
		el.removeEventListener( 'mousemove', handleMove );
		el.removeEventListener( 'mouseleave', handleLeave );
	};
}
