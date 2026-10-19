/**
 * The editor twin of "Stop below the site header" (`pinBelowHeader`, `pinGap`;
 * includes/container-pin-edge-css.php::sgs_container_pin_below_header_offset).
 */

import { pinEdgeTopPreview } from '../../src/blocks/container/pin-edge-preview';

const BASE = {
	pinEdge: { desktop: 'top' },
	pinBelowHeader: { desktop: 'on' },
	pinGap: { desktop: '36px' },
};

describe( 'pinEdgeTopPreview', () => {
	it( 'offsets a top pin by the header height plus the gap', () => {
		expect( pinEdgeTopPreview( BASE, 'desktop' ) ).toBe( 'calc(var(--sgs-header-height, 0px) + 36px)' );
	} );

	it( 'reads a spacing preset slug and the preset-reference form of a gap', () => {
		expect( pinEdgeTopPreview( { ...BASE, pinGap: { desktop: '30' } }, 'desktop' ) ).toBe(
			'calc(var(--sgs-header-height, 0px) + var(--wp--preset--spacing--30))'
		);
		expect( pinEdgeTopPreview( { ...BASE, pinGap: { desktop: 'var:preset|spacing|50' } }, 'desktop' ) ).toBe(
			'calc(var(--sgs-header-height, 0px) + var(--wp--preset--spacing--50))'
		);
	} );

	it( 'maps a non-numeric preset slug to its spacing custom property', () => {
		expect( pinEdgeTopPreview( { ...BASE, pinGap: { desktop: 'var:preset|spacing|x-large' } }, 'desktop' ) ).toBe(
			'calc(var(--sgs-header-height, 0px) + var(--wp--preset--spacing--x-large))'
		);
	} );

	it( 'falls back to the shop filter spacing when no gap is set', () => {
		expect( pinEdgeTopPreview( { ...BASE, pinGap: {} }, 'desktop' ) ).toBe(
			'calc(var(--sgs-header-height, 0px) + var(--wp--preset--spacing--40, 1.5rem))'
		);
	} );

	it( 'inherits the larger tier, as the stylesheet does', () => {
		expect( pinEdgeTopPreview( BASE, 'tablet' ) ).toBe( 'calc(var(--sgs-header-height, 0px) + 36px)' );
		expect( pinEdgeTopPreview( BASE, 'mobile' ) ).toBe( 'calc(var(--sgs-header-height, 0px) + 36px)' );
	} );

	it( 'stays at zero when the toggle is unset or off', () => {
		expect( pinEdgeTopPreview( { pinEdge: { desktop: 'top' } }, 'desktop' ) ).toBe( 0 );
		expect( pinEdgeTopPreview( { ...BASE, pinBelowHeader: { desktop: 'off' } }, 'desktop' ) ).toBe( 0 );
		expect( pinEdgeTopPreview( { ...BASE, pinBelowHeader: { desktop: 'on', tablet: 'off' } }, 'tablet' ) ).toBe( 0 );
	} );

	it( 'stays at zero where the pin is not at the top', () => {
		expect( pinEdgeTopPreview( { ...BASE, pinEdge: { desktop: 'top', mobile: 'bottom' } }, 'mobile' ) ).toBe( 0 );
		expect( pinEdgeTopPreview( { ...BASE, pinEdge: { desktop: 'none' } }, 'desktop' ) ).toBe( 0 );
	} );
} );
