/**
 * Gift card purchase form (Spec 27, FR-27-GC4): keeps the add-to-basket button's wording in step with the chosen amount.
 *
 * The server prints the button with the initial amount already in it; this script only updates the visible text when the
 * shopper picks another amount tile or types an amount. It never touches aria-live, so a screen reader reads the button
 * as it stands when focus reaches it, not on every keystroke. Without JavaScript the printed wording stays.
 *
 * The form carries the label template (`data-label-template`, with an `{amount}` placeholder), the shop's currency symbol
 * and position, and the custom range in pence, so the script needs no other configuration.
 */
( function () {
	'use strict';

	// The placeholder with the whitespace, middle dot, dashes, colon, bar, comma and slash that sit beside it.
	var PLACEHOLDER = /[\s\u00b7\-\u2013\u2014:|,/]*\{amount\}[\s\u00b7\-\u2013\u2014:|,/]*/gu;

	/**
	 * Format pence with decimals in the shop's symbol and position, matching Gift_Card_Money::format_price().
	 *
	 * @param {number} pence    Amount in pence.
	 * @param {string} symbol   Currency symbol.
	 * @param {string} position left, right, left_space or right_space.
	 * @return {string} Text such as "£25.00".
	 */
	function formatPrice( pence, symbol, position ) {
		var cents = pence % 100;
		var number = Math.floor( pence / 100 ) + '.' + ( cents < 10 ? '0' : '' ) + cents;
		switch ( position ) {
			case 'right':
				return number + symbol;
			case 'left_space':
				return symbol + ' ' + number;
			case 'right_space':
				return number + ' ' + symbol;
			default:
				return symbol + number;
		}
	}

	/**
	 * Fill the template. With no amount the placeholder and the separator next to it are dropped.
	 *
	 * @param {string}      template Label with an optional {amount} placeholder.
	 * @param {string|null} amount   Formatted amount, or null when none is chosen.
	 * @return {string} The button text.
	 */
	function buildLabel( template, amount ) {
		if ( null !== amount ) {
			return template.replace( /\{amount\}/g, amount );
		}
		return template.replace( PLACEHOLDER, ' ' ).replace( /\s+/g, ' ' ).trim();
	}

	/**
	 * Parse typed pounds into pence the way Gift_Card_Money::to_pence() does, or null when not a valid amount.
	 *
	 * @param {string} text Typed value.
	 * @return {number|null} Pence.
	 */
	function parsePence( text ) {
		var clean = String( text ).replace( /[£,\s]/g, '' );
		var match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec( clean );
		if ( ! match ) {
			return null;
		}
		var pence = parseInt( match[ 1 ], 10 ) * 100 + parseInt( ( match[ 2 ] || '' ).padEnd( 2, '0' ), 10 );
		return pence > 0 ? pence : null;
	}

	function init( form ) {
		var button = form.querySelector( '.sgs-gift-card-form__submit' );
		var template = form.getAttribute( 'data-label-template' );
		if ( ! button || ! template ) {
			return;
		}
		var symbol = form.getAttribute( 'data-currency-symbol' ) || '£';
		var position = form.getAttribute( 'data-currency-position' ) || 'left';
		var min = parseInt( form.getAttribute( 'data-custom-min' ) || '0', 10 );
		var max = parseInt( form.getAttribute( 'data-custom-max' ) || '0', 10 );
		var radios = form.querySelectorAll( 'input[type="radio"][name="sgs_gift_card_amount"]' );
		var custom = form.querySelector( '#sgs-gc-custom' );
		var customRadio = form.querySelector( '#sgs-gc-amount-custom' );

		function chosenPence() {
			var checked = form.querySelector( 'input[type="radio"][name="sgs_gift_card_amount"]:checked' );
			if ( ! checked ) {
				return null;
			}
			if ( 'custom' === checked.value ) {
				var typed = custom ? parsePence( custom.value ) : null;
				return null !== typed && typed >= min && typed <= max ? typed : null;
			}
			var fixed = parseInt( checked.value, 10 );
			return fixed > 0 ? fixed : null;
		}

		function update() {
			var pence = chosenPence();
			var text = buildLabel( template, null === pence ? null : formatPrice( pence, symbol, position ) );
			if ( button.textContent !== text ) {
				button.textContent = text;
			}
		}

		Array.prototype.forEach.call( radios, function ( radio ) {
			radio.addEventListener( 'change', update );
		} );
		if ( custom ) {
			custom.addEventListener( 'input', function () {
				if ( customRadio && ! customRadio.checked ) {
					customRadio.checked = true;
				}
				update();
			} );
		}
		update();
	}

	function boot() {
		Array.prototype.forEach.call( document.querySelectorAll( 'form.sgs-gift-card-form' ), init );
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', boot );
	} else {
		boot();
	}
}() );
