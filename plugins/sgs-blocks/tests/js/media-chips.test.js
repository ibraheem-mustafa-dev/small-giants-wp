/**
 * Chips (Spec 49 §9.2): radiogroup, roving arrow-key focus, a tick as well as colour, 44px targets, visible focus,
 * hover that brightens.
 */
const fs = require( 'fs' );
const path = require( 'path' );
const { h, mount, click, keydown, byRole } = require( './media-controls-harness' );
const Chips = require( '../../src/components/media/Chips' ).default;

const OPTIONS = [
	{ value: 'a', label: 'Alpha' },
	{ value: 'b', label: 'Beta' },
	{ value: 'c', label: 'Gamma', disabled: true },
	{ value: 'd', label: 'Delta' },
];

function setup( value = 'b' ) {
	const onChange = jest.fn();
	const view = mount( h( Chips, { label: 'Pick one', options: OPTIONS, value, onChange } ) );
	return { ...view, onChange, radios: byRole( view.container, 'radio' ) };
}

describe( 'Chips', () => {
	it( 'is one radiogroup of radios with the group named', () => {
		const { container, radios, unmount } = setup();
		const group = container.querySelector( '[role="radiogroup"]' );
		expect( group.getAttribute( 'aria-label' ) ).toBe( 'Pick one' );
		expect( radios ).toHaveLength( 4 );
		expect( radios.map( ( r ) => r.getAttribute( 'aria-checked' ) ) ).toEqual( [ 'false', 'true', 'false', 'false' ] );
		unmount();
	} );

	it( 'marks the selection with a tick as well as colour', () => {
		const { radios, unmount } = setup();
		expect( radios[ 1 ].querySelector( '.sgs-chips__tick' ) ).not.toBeNull();
		expect( radios[ 0 ].querySelector( '.sgs-chips__tick' ) ).toBeNull();
		unmount();
	} );

	it( 'has one tab stop: the selected chip, or the first when none is selected', () => {
		const selected = setup( 'b' );
		expect( selected.radios.map( ( r ) => r.tabIndex ) ).toEqual( [ -1, 0, -1, -1 ] );
		selected.unmount();
		const none = setup( '' );
		expect( none.radios.map( ( r ) => r.tabIndex ) ).toEqual( [ 0, -1, -1, -1 ] );
		none.unmount();
	} );

	it( 'moves focus with the arrow keys, skips a disabled chip, wraps, and does not select', () => {
		const { radios, onChange, unmount } = setup( 'b' );
		radios[ 1 ].focus();
		keydown( radios[ 1 ], 'ArrowRight' );
		expect( document.activeElement ).toBe( radios[ 3 ] );
		keydown( radios[ 3 ], 'ArrowRight' );
		expect( document.activeElement ).toBe( radios[ 0 ] );
		keydown( radios[ 0 ], 'ArrowLeft' );
		expect( document.activeElement ).toBe( radios[ 3 ] );
		keydown( radios[ 3 ], 'Home' );
		expect( document.activeElement ).toBe( radios[ 0 ] );
		keydown( radios[ 0 ], 'End' );
		expect( document.activeElement ).toBe( radios[ 3 ] );
		expect( onChange ).not.toHaveBeenCalled();
		unmount();
	} );

	it( 'chooses on click', () => {
		const { radios, onChange, unmount } = setup( 'b' );
		click( radios[ 3 ] );
		expect( onChange ).toHaveBeenCalledWith( 'd' );
		unmount();
	} );

	it( 'carries 44px targets, a visible focus ring and a hover that brightens in its stylesheet', () => {
		const css = fs.readFileSync( path.join( __dirname, '../../src/components/media/Chips.css' ), 'utf8' );
		expect( css ).toMatch( /min-width:\s*44px/ );
		expect( css ).toMatch( /min-height:\s*44px/ );
		expect( css ).toMatch( /:focus-visible\s*\{[^}]*outline:\s*2px/ );
		expect( css ).toMatch( /:hover:not\(:disabled\)\s*\{[^}]*background:\s*#fff/ );
	} );
} );
