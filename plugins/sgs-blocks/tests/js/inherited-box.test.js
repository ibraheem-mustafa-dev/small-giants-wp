/**
 * An unset side or corner at a narrower tier reports the nearest wider tier's value, so the inspector can show it as
 * placeholder text. A tier that sets the key itself reports nothing.
 */

import { inheritedBox, inheritedBoxValue, inheritedDefault, radiusAsCorners } from '../../src/utils/inherited-box';

describe( 'inheritedBoxValue', () => {
	const tiers = {
		base: { topLeft: '6px', topRight: '4px' },
		tablet: { topRight: '10px' },
		mobile: {},
	};

	it( 'shows a corner set only at desktop on tablet and mobile', () => {
		expect( inheritedBoxValue( tiers, 'tablet', 'topLeft' ) ).toBe( '6px' );
		expect( inheritedBoxValue( tiers, 'mobile', 'topLeft' ) ).toBe( '6px' );
	} );

	it( 'prefers the nearest wider tier', () => {
		expect( inheritedBoxValue( tiers, 'mobile', 'topRight' ) ).toBe( '10px' );
	} );

	it( 'reports nothing for a key the tier sets itself', () => {
		expect( inheritedBoxValue( tiers, 'tablet', 'topRight' ) ).toBe( '' );
	} );

	it( 'reports nothing at desktop and for a key no tier sets', () => {
		expect( inheritedBoxValue( tiers, 'base', 'topLeft' ) ).toBe( '' );
		expect( inheritedBoxValue( tiers, 'mobile', 'bottomLeft' ) ).toBe( '' );
	} );

	it( 'treats an empty string as unset but an explicit 0 as set', () => {
		expect( inheritedBoxValue( { base: { top: '' }, tablet: {} }, 'tablet', 'top' ) ).toBe( '' );
		expect( inheritedBoxValue( { base: { top: '0px' }, tablet: {} }, 'tablet', 'top' ) ).toBe( '0px' );
	} );

	it( 'reads the tiers of a ResponsiveOverride, keyed desktop, the same way', () => {
		const overrideTiers = { desktop: { top: '10px' }, tablet: { left: '4px' } };
		expect( inheritedBoxValue( overrideTiers, 'mobile', 'top' ) ).toBe( '10px' );
		expect( inheritedBoxValue( overrideTiers, 'mobile', 'left' ) ).toBe( '4px' );
		expect( inheritedBoxValue( overrideTiers, 'desktop', 'top' ) ).toBe( '' );
	} );

	it( 'negative control: a lookup that ignores the tier order is caught', () => {
		const wrongOrder = ( values, key ) => values.base?.[ key ] ?? values.tablet?.[ key ] ?? '';
		expect( wrongOrder( tiers, 'topRight' ) ).not.toBe( inheritedBoxValue( tiers, 'mobile', 'topRight' ) );
	} );
} );

describe( 'inheritedBox', () => {
	it( 'collects only the keys that inherit a value', () => {
		const tiers = { base: { top: '8px', left: '2px' }, tablet: { left: '5px' }, mobile: {} };
		expect( inheritedBox( tiers, 'mobile', [ 'top', 'right', 'bottom', 'left' ] ) ).toEqual( { top: '8px', left: '5px' } );
	} );
} );

describe( 'radiusAsCorners', () => {
	it( 'reads one length as all four corners, so the control shows it and inherits it', () => {
		expect( radiusAsCorners( '8px' ) ).toEqual( { topLeft: '8px', topRight: '8px', bottomRight: '8px', bottomLeft: '8px' } );
		expect( inheritedBoxValue( { base: radiusAsCorners( '8px' ), tablet: {} }, 'tablet', 'topRight' ) ).toBe( '8px' );
	} );

	it( 'passes a corner box through and turns anything else into an empty box', () => {
		const box = { topLeft: '2px' };
		expect( radiusAsCorners( box ) ).toBe( box );
		expect( radiusAsCorners( undefined ) ).toEqual( {} );
		expect( radiusAsCorners( '' ) ).toEqual( {} );
	} );

	it( 'negative control: spreading the raw string, as the unconverted control did, yields character keys', () => {
		expect( Object.keys( { ...'8px' } ) ).toEqual( [ '0', '1', '2' ] );
		expect( Object.keys( { ...radiusAsCorners( '8px' ) } ) ).toEqual( [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	} );
} );

describe( 'inheritedDefault', () => {
	const sizes = [ { slug: '40', name: 'Medium', size: '1.5rem' }, { slug: '50', size: '2.25rem' } ];

	it( 'names an offered preset and gives its size', () => {
		expect( inheritedDefault( 'var(--wp--preset--spacing--40)', sizes ) ).toEqual( { label: 'Medium', size: '1.5rem' } );
	} );

	it( 'falls back to the slug for a nameless preset', () => {
		expect( inheritedDefault( 'var(--wp--preset--spacing--50)', sizes ) ).toEqual( { label: '50', size: '2.25rem' } );
	} );

	it( 'gives a literal length as itself (negative control: it must not rename it)', () => {
		expect( inheritedDefault( '24px', sizes ) ).toEqual( { label: '24px', size: '24px' } );
	} );

	it( 'never returns a raw var(): an unoffered preset gives its fallback, else nothing', () => {
		expect( inheritedDefault( 'var(--wp--preset--spacing--99, 2rem)', sizes ) ).toEqual( { label: '2rem', size: '2rem' } );
		expect( inheritedDefault( 'var(--wp--preset--spacing--99)', sizes ) ).toEqual( { label: '', size: '' } );
	} );
} );
