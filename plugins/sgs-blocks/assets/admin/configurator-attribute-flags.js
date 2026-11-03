/**
 * Product screen, Attributes tab: show the controls that match an attribute's "Used for variations" box.
 * A variation attribute shows its one plain line; any other attribute shows the pick-several controls.
 * Delegated, so a row WooCommerce adds later is covered too.
 */
( function () {
	'use strict';

	function sync( row ) {
		var box = row.querySelector( 'input[type="checkbox"][name^="attribute_variation"]' );
		var panel = row.querySelector( '[data-sgs-attr-flags]' );
		if ( ! box || ! panel ) {
			return;
		}
		var priced = panel.querySelector( '[data-sgs-attr-flags-priced]' );
		var answer = panel.querySelector( '[data-sgs-attr-flags-answer]' );
		if ( priced ) {
			priced.hidden = ! box.checked;
		}
		if ( answer ) {
			answer.hidden = box.checked;
		}
	}

	document.addEventListener( 'change', function ( event ) {
		var target = event.target;
		if ( target && target.matches && target.matches( 'input[type="checkbox"][name^="attribute_variation"]' ) ) {
			sync( target.closest( '.woocommerce_attribute' ) || document );
		}
	} );

	document.addEventListener( 'DOMContentLoaded', function () {
		document.querySelectorAll( '.woocommerce_attribute' ).forEach( sync );
	} );
}() );
