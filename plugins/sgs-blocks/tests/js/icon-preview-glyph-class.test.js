/**
 * IconPreview's glyph class (Spec 38A §6.2): a caller's part class lands on the glyph's own `<svg>`, the element
 * `nav-drawer/render.php` puts `sgs-nav-drawer__close-icon` on, whether or not the SVG already has a class.
 */
jest.mock( '@wordpress/element', () => ( { useState: () => [ '', () => {} ], useEffect: () => {} } ) );
jest.mock( '@wordpress/compose', () => ( { useInstanceId: () => 1 } ) );
jest.mock( '../../src/components/IconPicker/icon-data', () => ( { loadLucide: jest.fn(), loadWpIcons: jest.fn() } ) );
jest.mock( '../../src/utils', () => ( { sanitiseSvg: ( s ) => s, withSvgStrokeGradient: ( s ) => s } ) );

const { withSvgClass } = require( '../../src/components/IconPicker/IconPreview' );

describe( 'withSvgClass', () => {
	it( 'adds the class to an svg with none', () => {
		expect( withSvgClass( '<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>', 'sgs-nav-drawer__close-icon' ) ).toBe(
			'<svg viewBox="0 0 24 24" class="sgs-nav-drawer__close-icon"><path d="M1 1"/></svg>'
		);
	} );

	it( 'appends to an existing class, on the root svg only', () => {
		expect( withSvgClass( '<svg class="lucide lucide-x"><svg class="inner"></svg></svg>', 'x-part' ) ).toBe(
			'<svg class="lucide lucide-x x-part"><svg class="inner"></svg></svg>'
		);
	} );
} );
