/**
 * The detaching burger chip's watcher — Wave 3C U-14, family M-08.
 *
 * includes/nav-detach-chip.php prints each chip (`.sgs-nav-bar-menu__detach`,
 * carrying its menu's uid class) on wp_footer. This module toggles
 * `is-detached` on it when BOTH hold: the header copy of that menu's burger is
 * off screen (IntersectionObserver), and the page has scrolled at least the
 * current tier's `triggerDetachAfter` (the chip's `data-sgs-nav-detach-after`
 * JSON). One requestAnimationFrame-batched predicate is the only writer, so the
 * class never flickers at the threshold. The chip's CSS still hides it at tiers
 * where the setting is off and at or above the collapse point, where the header
 * burger is `display:none` and so always reads as off screen.
 *
 * No transition is applied here; reduced motion needs nothing extra.
 *
 * @package SGS\Blocks
 */
import { SGS_BREAKPOINTS } from '../../utils/responsive';

/**
 * The device tier for a viewport width.
 *
 * @param {number} width Viewport width in px.
 * @return {string} desktop | tablet | mobile.
 */
export function tierForWidth( width ) {
	if ( width <= SGS_BREAKPOINTS.MOBILE_MAX ) {
		return 'mobile';
	}
	if ( width <= SGS_BREAKPOINTS.TABLET_MAX ) {
		return 'tablet';
	}
	return 'desktop';
}

/**
 * Whether the chip should show.
 *
 * @param {boolean} burgerOffScreen Header burger not intersecting the viewport.
 * @param {number}  scrollY         Current scroll position.
 * @param {Object}  after           Per-tier thresholds {desktop,tablet,mobile}.
 * @param {string}  tier            Current tier.
 * @return {boolean} Detached.
 */
export function shouldDetach( burgerOffScreen, scrollY, after, tier ) {
	const threshold = Number( after && after[ tier ] ) || 0;
	return burgerOffScreen && scrollY >= threshold;
}

/**
 * Wire every chip on the page. Safe to call more than once per chip.
 *
 * @param {Document} doc The document.
 * @param {Window}   win The window.
 */
export function initDetachChips( doc = document, win = window ) {
	if ( typeof win.IntersectionObserver !== 'function' ) {
		return;
	}
	doc.querySelectorAll( '.sgs-nav-bar-menu__detach' ).forEach( ( chip ) => {
		if ( chip.dataset.sgsNavDetachWired ) {
			return;
		}
		const uid = Array.from( chip.classList ).find( ( name ) =>
			/^sgs-nav-bar-menu-[0-9a-f]+$/.test( name )
		);
		const burger = uid
			? doc.querySelector(
				`.${ uid }:not(.sgs-nav-bar-menu__detach) .sgs-nav-bar-menu__toggle-wrap .sgs-nav-bar-menu__burger`
			)
			: null;
		if ( ! burger ) {
			return;
		}
		chip.dataset.sgsNavDetachWired = '1';

		let after = {};
		try {
			after = JSON.parse( chip.dataset.sgsNavDetachAfter || '{}' ) || {};
		} catch ( e ) {
			after = {};
		}

		let offScreen = false;
		let frame = 0;
		const update = () => {
			frame = 0;
			chip.classList.toggle(
				'is-detached',
				shouldDetach( offScreen, win.scrollY, after, tierForWidth( win.innerWidth ) )
			);
		};
		const schedule = () => {
			if ( ! frame ) {
				frame = win.requestAnimationFrame( update );
			}
		};

		const observer = new win.IntersectionObserver( ( entries ) => {
			entries.forEach( ( entry ) => {
				offScreen = ! entry.isIntersecting;
			} );
			schedule();
		} );
		observer.observe( burger );
		win.addEventListener( 'scroll', schedule, { passive: true } );
		win.addEventListener( 'resize', schedule, { passive: true } );
	} );
}
