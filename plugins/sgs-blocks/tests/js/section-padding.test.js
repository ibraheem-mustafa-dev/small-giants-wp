/**
 * The editor's section padding default (Spec 32 FR-32-15): which containers take it, and the placeholder it shows.
 */

import { hasContentBand, sectionPaddingDefaults } from '../../src/utils/section-padding';

describe( 'hasContentBand', () => {
	it( 'is true for the default normal content width and for wide or a custom width', () => {
		expect( hasContentBand( { contentWidth: { desktop: 'normal' } } ) ).toBe( true );
		expect( hasContentBand( { contentWidth: { desktop: 'wide' } } ) ).toBe( true );
		expect( hasContentBand( { contentWidth: { desktop: '900px' } } ) ).toBe( true );
	} );

	it( 'is false for a full-bleed container with no padding or band margin', () => {
		expect( hasContentBand( { contentWidth: { desktop: 'full' } } ) ).toBe( false );
		expect( hasContentBand( { contentWidth: { desktop: '' }, padding: { desktop: {} } } ) ).toBe( false );
		expect( hasContentBand( {} ) ).toBe( false );
	} );

	it( 'is true for a full-bleed container that sets a padding or band margin side', () => {
		expect( hasContentBand( { contentWidth: { desktop: 'full' }, padding: { desktop: { top: '8px' } } } ) ).toBe( true );
		expect( hasContentBand( { contentWidth: { desktop: 'full' }, contentBandMargin: { desktop: { left: '0' } } } ) ).toBe( true );
	} );
} );

describe( 'sectionPaddingDefaults', () => {
	const custom = { section: { padding: { mobile: '24px', tablet: 'var(--wp--preset--spacing--50)', desktop: '0' } } };

	it( 'gives the tier token on top and bottom only', () => {
		expect( sectionPaddingDefaults( custom, 'mobile' ) ).toEqual( { top: '24px', bottom: '24px' } );
		expect( sectionPaddingDefaults( custom, 'tablet' ) ).toEqual( {
			top: 'var(--wp--preset--spacing--50)',
			bottom: 'var(--wp--preset--spacing--50)',
		} );
		expect( sectionPaddingDefaults( custom, 'desktop' ) ).toEqual( { top: '0', bottom: '0' } );
	} );

	it( 'gives nothing when the snapshot sets no token for the tier', () => {
		expect( sectionPaddingDefaults( {}, 'mobile' ) ).toEqual( {} );
		expect( sectionPaddingDefaults( { section: { padding: { mobile: '' } } }, 'mobile' ) ).toEqual( {} );
		expect( sectionPaddingDefaults( undefined, 'desktop' ) ).toEqual( {} );
	} );
} );
