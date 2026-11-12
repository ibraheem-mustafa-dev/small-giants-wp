/**
 * The drawer menu's opt-in motion and navigation effects (sliding indicator, label magnet, accordion motion state,
 * drill-down, accordion scroll). view.js loads this file on the visitor's first pointer or key press, or when a drawer
 * opens, since the menu sits in a closed drawer until then; a page whose drawer menu uses drill-down loads it at once.
 *
 * @package
 */

import { initNavIndicator } from '../../shared/effects/nav-indicator';
import { initLabelMagnet } from '../../shared/effects/label-magnet';
import { initDrillDown } from '../../shared/effects/nav-drilldown';
import { initAccordionScroll } from './accordion-scroll';
import { initAccordionMotionState } from './accordion-motion-state';

/**
 * Wire the opt-in motion effects for one `.sgs-nav-drawer-menu__bar`, keyed on the
 * data-attribute flags render.php emits only when an operator has switched
 * the effect on.
 *
 * @param {HTMLElement} root The `.wp-block-sgs-nav-drawer-menu` root.
 * @return {Function[]} Cleanups for every effect instance it started.
 */
export function initBarEffects( root ) {
	const cleanups = [];
	const bar = root.querySelector( '.sgs-nav-drawer-menu__bar' );
	if ( ! bar ) {
		return cleanups;
	}

	if ( bar.hasAttribute( 'data-sgs-nav-indicator' ) ) {
		cleanups.push( initNavIndicator( bar, 'sgs-nav-drawer-menu' ) );
	}

	if ( bar.hasAttribute( 'data-magnet' ) ) {
		// `itemMagnetStrength` — `data-magnet-strength` rides only when the
		// operator set it (render.php). Absent: `initMagnet( el )` with no
		// options, magnet.js's own factor 0.15 and 8px cap. Present: that
		// factor with the cap lifted, since the pointer only engages while
		// inside the label's own box. Touch input and reduced motion switch
		// the effect off inside magnet.js itself.
		const strengthAttr = bar.getAttribute( 'data-magnet-strength' );
		const strength =
			null !== strengthAttr ? parseFloat( strengthAttr ) : NaN;
		const magnetOpts = Number.isFinite( strength )
			? { factor: strength, maxPull: Infinity }
			: {};

		bar.querySelectorAll( '.sgs-nav-drawer-menu__magnet-target' ).forEach(
			( label ) => {
				const link =
					label.closest( '.sgs-nav-drawer-menu__link' ) || label;
				cleanups.push(
					initLabelMagnet( link, {
						...magnetOpts,
						engage: 'over',
						target: label,
					} )
				);
			}
		);
	}

	// Each accordion row is a nested motion state host: opening it plays the entrances inside it.
	cleanups.push( initAccordionMotionState( bar ) );

	// Drill-down (FR-36-6): only when the operator picked "Drill-down" over
	// the default "Accordion" — an accordion drawer needs no JS at all
	// beyond the native <details>.
	if ( 'drill-down' === bar.dataset.sgsNavSubmenuModel ) {
		cleanups.push( initDrillDown( bar ) );
	} else if ( bar.hasAttribute( 'data-sgs-accordion-scroll' ) ) {
		// accordionScrollIntoView: an opened row scrolls near the drawer's top.
		cleanups.push( initAccordionScroll( bar ) );
	}
	return cleanups;
}
