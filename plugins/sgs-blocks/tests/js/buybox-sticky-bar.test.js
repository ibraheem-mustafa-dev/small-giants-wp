/**
 * sgs/buybox add-to-basket bar (src/blocks/buybox/sticky-bar.js): the bar shows only while the in-page Add
 * control is above the viewport AND the current device tier is switched on, forwards its click to the in-page
 * Add control, sends a shopper who has not finished choosing to the picker instead, and keeps
 * `--sgs-sticky-bar-h` on the document root only while it is showing.
 *
 * Negative controls: a control below the viewport, an off tier, and a finished choice each fail the matching
 * positive assertion if the guard in sticky-bar.js is removed.
 */

const ROOT_MAP = '{"d":0,"t":0,"m":1}';

/** A seed context like the one render.php prints on the root: one size axis, nothing chosen yet. */
const CONTEXT_UNCHOSEN = {
	axes: [ { taxonomy: 'pa_size', label: 'Size', terms: [ { slug: 'small', label: 'Small' }, { slug: 'large', label: 'Large' } ] } ],
	selectedAxes: {},
	selectedVariationId: 0,
	combos: { 'pa_size:small': { variationId: 61 }, 'pa_size:large': { variationId: 62 } },
};

const CONTEXT_CHOSEN = { ...CONTEXT_UNCHOSEN, selectedAxes: { pa_size: 'small' }, selectedVariationId: 61 };

function markup( { context, map = ROOT_MAP, modal = false } ) {
	const control = modal
		? '<div class="buybox__cart-form buybox__cart-form--modal"><button type="button" id="modal-open" data-sgs-modal-open="flow">Choose</button></div>'
		: '<form class="buybox__cart-form"><button type="submit">Add</button></form>';
	document.body.innerHTML =
		`<div class="sgs-buybox" data-wp-interactive="sgs/product-card" data-sgs-bar='${ map }' data-wp-context='${ JSON.stringify( context ) }'>` +
		'<fieldset class="sgs-option-picker"><div class="sgs-option-picker__options" data-type-key="pa_size">' +
		'<label><input type="radio" name="size" value="small"><span class="sgs-option-picker__pill"><span class="sgs-option-picker__pill-label">Small</span></span></label>' +
		'<label><input type="radio" name="size" value="large"><span class="sgs-option-picker__pill"><span class="sgs-option-picker__pill-label">Large</span></span></label>' +
		'</div></fieldset>' +
		'<span class="sgs-buybox__picker-selected-value">Small</span>' +
		control +
		'<div class="sgs-buybox__bar" data-sgs-bar hidden><div><span class="sgs-buybox__bar-price">£90</span><span class="sgs-buybox__bar-variant" data-sgs-bar-variant></span></div>' +
		'<button type="button" class="buybox__add-to-cart" id="bar-btn">Add</button></div></div>';
	return document.querySelector( '.sgs-buybox' );
}

describe( 'buybox add-to-basket bar', () => {
	let observers;
	let mobile;

	beforeEach( () => {
		jest.resetModules();
		observers = [];
		window.IntersectionObserver = class {
			constructor( callback ) {
				this.callback = callback;
				this.targets = [];
				observers.push( this );
			}
			observe( target ) {
				this.targets.push( target );
			}
			disconnect() {}
		};
		mobile = true;
		// Phone: both max-width queries match. Desktop: neither does.
		window.matchMedia = jest.fn( () => ( {
			matches: mobile,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
		} ) );
		document.documentElement.style.removeProperty( '--sgs-sticky-bar-h' );
		Element.prototype.scrollIntoView = jest.fn();
	} );

	function start( options ) {
		const root = markup( options );
		const bar = root.querySelector( '.sgs-buybox__bar' );
		bar.getBoundingClientRect = () => ( { height: 64, top: 0 } );
		require( '../../src/blocks/buybox/sticky-bar' );
		return { root, bar };
	}

	function controlMoves( top, isIntersecting = false ) {
		observers[ 0 ].callback( [ { isIntersecting, boundingClientRect: { top } } ] );
	}

	it( 'observes the in-page Add control and shows the bar once it has scrolled above the viewport', () => {
		const { root, bar } = start( { context: CONTEXT_CHOSEN } );
		expect( observers[ 0 ].targets[ 0 ] ).toBe( root.querySelector( '.buybox__cart-form' ) );
		expect( bar.classList.contains( 'is-on' ) ).toBe( false );
		controlMoves( -120 );
		expect( bar.classList.contains( 'is-on' ) ).toBe( true );
		expect( bar.hasAttribute( 'hidden' ) ).toBe( false );
		controlMoves( 40, true );
		expect( bar.classList.contains( 'is-on' ) ).toBe( false );
	} );

	it( 'stays off while the control is below the viewport', () => {
		const { bar } = start( { context: CONTEXT_CHOSEN } );
		controlMoves( 900 );
		expect( bar.classList.contains( 'is-on' ) ).toBe( false );
	} );

	it( 'stays off at a device tier that is switched off', () => {
		mobile = false;
		const { bar } = start( { context: CONTEXT_CHOSEN } );
		controlMoves( -120 );
		expect( bar.classList.contains( 'is-on' ) ).toBe( false );
	} );

	it( 'sets --sgs-sticky-bar-h while showing and clears it after', () => {
		start( { context: CONTEXT_CHOSEN } );
		controlMoves( -120 );
		expect( document.documentElement.style.getPropertyValue( '--sgs-sticky-bar-h' ) ).toBe( '64px' );
		controlMoves( 40, true );
		expect( document.documentElement.style.getPropertyValue( '--sgs-sticky-bar-h' ) ).toBe( '' );
	} );

	it( 'forwards the click to the in-page form once, when the choice is finished', () => {
		const { root } = start( { context: CONTEXT_CHOSEN } );
		const form = root.querySelector( '.buybox__cart-form' );
		form.requestSubmit = jest.fn();
		controlMoves( -120 );
		document.getElementById( 'bar-btn' ).click();
		expect( form.requestSubmit ).toHaveBeenCalledTimes( 1 );
		expect( Element.prototype.scrollIntoView ).not.toHaveBeenCalled();
	} );

	it( 'sends the shopper to the picker instead of submitting when no variation is chosen', () => {
		const { root } = start( { context: CONTEXT_UNCHOSEN } );
		const form = root.querySelector( '.buybox__cart-form' );
		form.requestSubmit = jest.fn();
		const firstInput = root.querySelector( '.sgs-option-picker input' );
		const focusSpy = jest.spyOn( firstInput, 'focus' );
		controlMoves( -120 );
		document.getElementById( 'bar-btn' ).click();
		expect( Element.prototype.scrollIntoView ).toHaveBeenCalledWith( { block: 'center' } );
		expect( focusSpy ).toHaveBeenCalled();
		expect( form.requestSubmit ).not.toHaveBeenCalled();
	} );

	it( 'submits after the shopper has picked an option that resolves to a variation', () => {
		const { root } = start( { context: CONTEXT_UNCHOSEN } );
		const form = root.querySelector( '.buybox__cart-form' );
		form.requestSubmit = jest.fn();
		root.dispatchEvent( new CustomEvent( 'sgs:option-selected', { bubbles: true, detail: { typeKey: 'pa_size', selectedKey: 'large' } } ) );
		controlMoves( -120 );
		document.getElementById( 'bar-btn' ).click();
		expect( form.requestSubmit ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'clicks the modal opener in modal mode', () => {
		start( { context: CONTEXT_UNCHOSEN, modal: true } );
		const opener = document.getElementById( 'modal-open' );
		const clicked = jest.fn();
		opener.addEventListener( 'click', clicked );
		controlMoves( -120 );
		document.getElementById( 'bar-btn' ).click();
		expect( clicked ).toHaveBeenCalledTimes( 1 );
		expect( Element.prototype.scrollIntoView ).not.toHaveBeenCalled();
	} );

	it( 'rebuilds the variant line from the chosen option labels, joined with a slash', () => {
		const { root, bar } = start( { context: CONTEXT_CHOSEN } );
		expect( bar.querySelector( '[data-sgs-bar-variant]' ).textContent ).toBe( 'Small' );
		root.querySelector( '.sgs-buybox__picker-selected-value' ).textContent = 'Large';
		root.dispatchEvent( new CustomEvent( 'sgs:option-selected', { bubbles: true, detail: { typeKey: 'pa_size', selectedKey: 'large' } } ) );
		expect( bar.querySelector( '[data-sgs-bar-variant]' ).textContent ).toBe( 'Large' );
	} );

	it( 'does nothing on a buybox with no bar', () => {
		document.body.innerHTML = '<div class="sgs-buybox"><form class="buybox__cart-form"></form></div>';
		require( '../../src/blocks/buybox/sticky-bar' );
		expect( observers.length ).toBe( 0 );
	} );
} );
