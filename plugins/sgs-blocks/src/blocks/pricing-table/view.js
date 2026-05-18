/**
 * Pricing Table — view.js
 *
 * Handles the monthly/yearly billing toggle. Uses vanilla JS only.
 * Finds the radio inputs inside each .sgs-pricing-table--has-toggle wrapper
 * and toggles the hidden attribute on .sgs-pricing-table__price--monthly /
 * --yearly spans and .sgs-pricing-table__savings-badge elements accordingly.
 *
 * Progressive enhancement: the monthly price is always visible by default
 * (rendered with no hidden attr). Only price--yearly and savings badges
 * start hidden.
 *
 * @package SGS\Blocks
 */

( function () {
	'use strict';

	/**
	 * Initialise billing toggle for a single pricing table block.
	 *
	 * @param {HTMLElement} wrapper The .sgs-pricing-table--has-toggle element.
	 */
	function initToggle( wrapper ) {
		const inputs = wrapper.querySelectorAll( '.sgs-pricing-table__toggle-input' );
		if ( ! inputs.length ) {
			return;
		}

		/**
		 * Update price visibility and savings badge based on the currently-selected
		 * billing period.
		 */
		function applyPeriod() {
			const checked = wrapper.querySelector( '.sgs-pricing-table__toggle-input:checked' );
			if ( ! checked ) {
				return;
			}
			const period = checked.value; // 'monthly' | 'yearly'

			wrapper.querySelectorAll( '.sgs-pricing-table__price--monthly' ).forEach( ( el ) => {
				el.hidden = ( period !== 'monthly' );
			} );
			wrapper.querySelectorAll( '.sgs-pricing-table__price--yearly' ).forEach( ( el ) => {
				el.hidden = ( period !== 'yearly' );
			} );

			// Savings badge: show only when yearly is active.
			wrapper.querySelectorAll( '.sgs-pricing-table__savings-badge' ).forEach( ( el ) => {
				el.hidden = ( period !== 'yearly' );
			} );

			// Reflect current state as a data attribute for CSS theming.
			wrapper.dataset.billingPeriod = period;
		}

		inputs.forEach( ( input ) => {
			input.addEventListener( 'change', applyPeriod );
		} );

		// Run immediately to match the default checked state.
		applyPeriod();
	}

	// Boot on DOMContentLoaded (scripts are deferred via viewScriptModule).
	document.querySelectorAll( '.sgs-pricing-table--has-toggle' ).forEach( initToggle );
} )();
