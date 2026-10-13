/**
 * The `top` link source's click handler (src/blocks/button/view.js), which every block's top link
 * uses (includes/helpers-link-source.php enqueues it for any `data-sgs-link-source="top"` link).
 *
 * A plain focus() scrolls its target into view and so cancels the smooth scroll to the top that
 * the same click started; the handler must focus with preventScroll.
 *
 * Negative control: 'an ordinary link is left alone' fails if the handler binds to every link.
 */

describe( 'top link source click', () => {
	let focusSpy;
	let scrollSpy;

	beforeEach( () => {
		jest.resetModules();
		document.body.innerHTML =
			'<main><h1>Title</h1></main>' +
			'<a id="top-link" href="#top" data-sgs-link-source="top">Back to top</a>' +
			'<a id="plain" href="#elsewhere">Elsewhere</a>';
		window.matchMedia = jest.fn( () => ( { matches: false } ) );
		scrollSpy = jest.fn();
		window.scrollTo = scrollSpy;
		focusSpy = jest.spyOn( HTMLElement.prototype, 'focus' );
		require( '../../src/blocks/button/view' );
	} );

	afterEach( () => {
		focusSpy.mockRestore();
	} );

	it( 'smooth-scrolls to the top and moves focus without scrolling', () => {
		document.getElementById( 'top-link' ).click();
		expect( scrollSpy ).toHaveBeenCalledWith( { top: 0, left: 0, behavior: 'smooth' } );
		expect( focusSpy ).toHaveBeenCalledTimes( 1 );
		expect( focusSpy.mock.instances[ 0 ] ).toBe( document.querySelector( 'main' ) );
		expect( focusSpy ).toHaveBeenCalledWith( { preventScroll: true } );
		expect( document.querySelector( 'main' ).getAttribute( 'tabindex' ) ).toBe( '-1' );
	} );

	it( 'an ordinary link is left alone', () => {
		document.getElementById( 'plain' ).click();
		expect( scrollSpy ).not.toHaveBeenCalled();
		expect( focusSpy ).not.toHaveBeenCalled();
	} );
} );
