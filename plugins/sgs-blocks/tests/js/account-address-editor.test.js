/**
 * The account block's inline address editor (src/blocks/account/address-editor.js): Edit opens the card's own form,
 * Cancel closes it and returns focus to Edit. Without the module the Edit link still navigates to WooCommerce's edit URL.
 *
 * Negative control: 'Edit on one card leaves the other card shut' fails if the handler opens every card.
 */

const CARD = ( type, open ) =>
	`<div class="sgs-account__addr" data-sgs-addr="${ type }">
		<header><h2>${ type }</h2>
			<a class="sgs-account__addr-edit" href="/edit-address/${ type }/" data-sgs-addr-edit aria-controls="f-${ type }" aria-expanded="${ open }"${ open === 'true' ? ' hidden' : '' }>Edit</a>
		</header>
		<address data-sgs-addr-read${ open === 'true' ? ' hidden' : '' }>Line</address>
		<form id="f-${ type }" data-sgs-addr-form${ open === 'true' ? '' : ' hidden' }>
			<input name="${ type }_first_name" id="${ type }_first_name">
			<a href="/edit-address/" data-sgs-addr-cancel>Cancel</a>
		</form>
	</div>`;

describe( 'account address editor', () => {
	beforeEach( () => {
		jest.resetModules();
		document.body.innerHTML = '<div class="sgs-account__wc">' + CARD( 'shipping', 'false' ) + CARD( 'billing', 'false' ) + '</div>';
		require( '../../src/blocks/account/address-editor' );
	} );

	it( 'Edit opens that card form, marks aria-expanded and focuses the first field', () => {
		const edit = document.querySelector( '[data-sgs-addr="shipping"] [data-sgs-addr-edit]' );
		edit.click();
		const card = document.querySelector( '[data-sgs-addr="shipping"]' );
		expect( card.querySelector( 'form' ).hidden ).toBe( false );
		expect( card.querySelector( '[data-sgs-addr-read]' ).hidden ).toBe( true );
		expect( edit.getAttribute( 'aria-expanded' ) ).toBe( 'true' );
		expect( document.activeElement ).toBe( card.querySelector( 'input' ) );
	} );

	it( 'Edit on one card leaves the other card shut', () => {
		document.querySelector( '[data-sgs-addr="shipping"] [data-sgs-addr-edit]' ).click();
		const other = document.querySelector( '[data-sgs-addr="billing"]' );
		expect( other.querySelector( 'form' ).hidden ).toBe( true );
		expect( other.querySelector( '[data-sgs-addr-edit]' ).getAttribute( 'aria-expanded' ) ).toBe( 'false' );
	} );

	it( 'Cancel closes the form and returns focus to Edit', () => {
		const card = document.querySelector( '[data-sgs-addr="shipping"]' );
		const edit = card.querySelector( '[data-sgs-addr-edit]' );
		edit.click();
		card.querySelector( '[data-sgs-addr-cancel]' ).click();
		expect( card.querySelector( 'form' ).hidden ).toBe( true );
		expect( card.querySelector( '[data-sgs-addr-read]' ).hidden ).toBe( false );
		expect( edit.hidden ).toBe( false );
		expect( edit.getAttribute( 'aria-expanded' ) ).toBe( 'false' );
		expect( document.activeElement ).toBe( edit );
	} );

	it( 'opening a second card closes the first', () => {
		document.querySelector( '[data-sgs-addr="shipping"] [data-sgs-addr-edit]' ).click();
		document.querySelector( '[data-sgs-addr="billing"] [data-sgs-addr-edit]' ).click();
		expect( document.querySelector( '[data-sgs-addr="shipping"] form' ).hidden ).toBe( true );
		expect( document.querySelector( '[data-sgs-addr="billing"] form' ).hidden ).toBe( false );
	} );
} );
