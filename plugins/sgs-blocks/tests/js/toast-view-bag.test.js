/**
 * "View bag" in the toast opens the page's bag drawer through the bag
 * button's own open path, and stays a plain link to the cart page when the
 * page has no drawer.
 */

jest.mock(
	'@wordpress/interactivity',
	() => ( {
		store: ( ns, def ) => ( { state: def.state, actions: def.actions } ),
	} ),
	{ virtual: true }
);

const { toastActions } = require( '../../src/shared/toast/store.js' );

const drawerTrigger = ( extra = '' ) =>
	`<div class="sgs-cart"><div class="sgs-cart__trigger-wrap"><button type="button" class="sgs-cart__trigger" aria-controls="drawer-1" data-sgs-cart-trigger ${ extra }>Bag</button></div></div>`;

const clickEvent = () => {
	const event = new MouseEvent( 'click', { bubbles: true, cancelable: true } );
	return event;
};

describe( 'toast View bag', () => {
	afterEach( () => {
		document.body.innerHTML = '';
	} );

	test( 'opens the drawer through the bag button and cancels the link', () => {
		document.body.innerHTML = drawerTrigger();
		const trigger = document.querySelector( '.sgs-cart__trigger' );
		const clicked = jest.fn();
		trigger.addEventListener( 'click', clicked );

		const event = clickEvent();
		toastActions.viewBag( event );

		expect( clicked ).toHaveBeenCalledTimes( 1 );
		expect( event.defaultPrevented ).toBe( true );
	} );

	test( 'leaves the link alone when the page has no drawer (negative control)', () => {
		document.body.innerHTML =
			'<div class="sgs-cart"><a class="sgs-cart__trigger" href="/cart/" data-sgs-cart-trigger>Bag</a></div>';
		const trigger = document.querySelector( '.sgs-cart__trigger' );
		const clicked = jest.fn();
		trigger.addEventListener( 'click', clicked );

		const event = clickEvent();
		toastActions.viewBag( event );

		expect( clicked ).not.toHaveBeenCalled();
		expect( event.defaultPrevented ).toBe( false );
	} );

	test( 'leaves the link alone when there is no bag block at all', () => {
		document.body.innerHTML = '';
		const event = clickEvent();
		toastActions.viewBag( event );
		expect( event.defaultPrevented ).toBe( false );
	} );
} );
