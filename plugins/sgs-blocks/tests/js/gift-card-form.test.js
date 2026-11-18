/**
 * @jest-environment jsdom
 *
 * Gift card purchase form script (Spec 27, FR-27-GC4): the button wording follows the chosen amount.
 */
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
	path.join( __dirname, '../../assets/js/gift-card-form.js' ),
	'utf8'
);

function mount( template ) {
	document.body.innerHTML = `
		<form class="sgs-gift-card-form" data-label-template="${ template }" data-currency-symbol="£" data-currency-position="left" data-custom-min="1000" data-custom-max="10000">
			<input type="radio" name="sgs_gift_card_amount" value="1500" checked />
			<input type="radio" name="sgs_gift_card_amount" value="2500" />
			<input type="radio" id="sgs-gc-amount-custom" name="sgs_gift_card_amount" value="custom" />
			<input type="text" id="sgs-gc-custom" />
			<button class="sgs-gift-card-form__submit">Add to basket · £15.00</button>
		</form>`;
	// eslint-disable-next-line no-new-func
	new Function( source )();
	return document.querySelector( '.sgs-gift-card-form__submit' );
}

describe( 'gift card form button', () => {
	test( 'follows the chosen tile', () => {
		const button = mount( 'Add to basket · {amount}' );
		const radios = document.querySelectorAll( 'input[type="radio"]' );
		radios[ 1 ].checked = true;
		radios[ 1 ].dispatchEvent( new Event( 'change' ) );
		expect( button.textContent ).toBe( 'Add to basket · £25.00' );
	} );

	test( 'typing a custom amount selects it and prints it', () => {
		const button = mount( 'Add to basket · {amount}' );
		const custom = document.getElementById( 'sgs-gc-custom' );
		custom.value = '12.5';
		custom.dispatchEvent( new Event( 'input' ) );
		expect( document.getElementById( 'sgs-gc-amount-custom' ).checked ).toBe( true );
		expect( button.textContent ).toBe( 'Add to basket · £12.50' );
	} );

	test( 'with no valid amount the placeholder and separator are dropped', () => {
		const button = mount( 'Add to basket · {amount}' );
		const custom = document.getElementById( 'sgs-gc-custom' );
		custom.value = '3';
		custom.dispatchEvent( new Event( 'input' ) );
		expect( button.textContent ).toBe( 'Add to basket' );
	} );

	test( 'a form with no placeholder is left alone', () => {
		const button = mount( 'Add gift card to basket' );
		expect( button.textContent ).toBe( 'Add gift card to basket' );
	} );
} );
