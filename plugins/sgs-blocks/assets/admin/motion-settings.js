/**
 * SGS → Motion settings page — dependent-control state.
 *
 * Greys out (and genuinely DISABLES) the strength slider while smooth
 * scrolling is switched off, so the page never offers a control that does
 * nothing.
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
 * @package SGS\Blocks
 */

( function () {
	'use strict';

	function init() {
		const toggle = document.getElementById( 'sgs-smooth-scroll-toggle' );
		const slider = document.getElementById( 'sgs-smooth-strength' );
		if ( ! toggle || ! slider ) {
			return;
		}

		// The whole row dims, not just the input — the label and help text are
		// equally inapplicable while the feature is off.
		const row = slider.closest( 'tr' );

		function sync() {
			const on = toggle.checked;
			slider.disabled = ! on;
			if ( row ) {
				row.style.opacity = on ? '' : '0.5';
			}
		}

		toggle.addEventListener( 'change', sync );
		sync();
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
