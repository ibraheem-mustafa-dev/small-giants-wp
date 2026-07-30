/**
 * SGS → Motion settings page — dependent-control state.
 *
 * Greys out (and genuinely DISABLES) any control that cannot currently do
 * anything, so the page never offers a setting with no effect.
 *
 * There are TWO levels of dependency:
 *   · smooth scrolling OFF  → strength, touch toggle AND touch strength are
 *     all inert (the whole feature is off)
 *   · smooth scrolling ON but touch OFF → touch strength alone is inert
 *
 * ⚠ It sets the `disabled` PROPERTY, not just an opacity. A visually-dimmed
 * but still-focusable control is worse than no dimming at all: a keyboard or
 * screen-reader user tabs into something that looks unavailable, can still
 * change it, and gets no feedback. `disabled` removes it from the tab order
 * and is announced, which is what makes the greying honest rather than
 * decorative.
 *
 * Runs only on this settings screen (enqueued against its page hook).
 *
 * @package
 */

( function () {
	'use strict';

	function init() {
		const scrollToggle = document.getElementById(
			'sgs-smooth-scroll-toggle'
		);

		// Nothing to wire if the master control is absent — bail before doing
		// any further lookups.
		if ( ! scrollToggle ) {
			return;
		}

		const strength = document.getElementById( 'sgs-smooth-strength' );
		const touchToggle = document.getElementById(
			'sgs-smooth-touch-toggle'
		);
		const touchStrength = document.getElementById(
			'sgs-smooth-touch-strength'
		);

		/**
		 * Apply enabled/disabled state to a control and dim its whole row —
		 * the label and help text are equally inapplicable when the control is.
		 *
		 * @param {HTMLElement|null} el      Control to toggle.
		 * @param {boolean}          enabled Whether it currently applies.
		 */
		function setEnabled( el, enabled ) {
			if ( ! el ) {
				return;
			}
			el.disabled = ! enabled;
			const row = el.closest( 'tr' );
			if ( row ) {
				row.style.opacity = enabled ? '' : '0.5';
			}
		}

		function sync() {
			const smoothOn = scrollToggle.checked;
			const touchOn = smoothOn && !! touchToggle && touchToggle.checked;

			setEnabled( strength, smoothOn );
			setEnabled( touchToggle, smoothOn );
			// Touch strength needs BOTH: the feature on, and touch opted in.
			setEnabled( touchStrength, touchOn );
		}

		scrollToggle.addEventListener( 'change', sync );
		if ( touchToggle ) {
			touchToggle.addEventListener( 'change', sync );
		}
		sync();
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
