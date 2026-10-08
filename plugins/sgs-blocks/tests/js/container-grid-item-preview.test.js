/**
 * The editor twin of the grid-item defaults (Spec 32 FR-32-12): all six
 * --sgs-gi-* values at the previewed tier, and the scoped state rules at both
 * cell depths.
 */

import { gridItemVars, gridItemStateCss, gridBorderParts } from '../../src/blocks/container/grid-item-preview';

const palette = [ { slug: 'primary', color: '#123456' } ];

describe( 'gridItemVars', () => {
	it( 'sets all six variables, tier-resolved, with slugs resolved', () => {
		const vars = gridItemVars( {
			gridItemPadding: { desktop: { top: '10px', right: '10px', bottom: '10px', left: '10px' }, mobile: { top: '4px' } },
			gridItemBorderRadius: { desktop: { topLeft: '8px' } },
			gridItemBackground: 'primary',
			gridItemBorder: '2px dashed primary',
			gridItemShadow: '0 1px 2px #000',
			gridItemTextColour: '#ffffff',
		}, 'mobile', palette );
		expect( vars ).toEqual( expect.objectContaining( {
			'--sgs-gi-padding-top': '4px',
			'--sgs-gi-padding-right': '10px',
			'--sgs-gi-padding-bottom': '10px',
			'--sgs-gi-padding-left': '10px',
			'--sgs-gi-radius-top-left': '8px',
			'--sgs-gi-bg': '#123456',
			'--sgs-gi-border': '2px dashed #123456',
			'--sgs-gi-color': '#ffffff',
		} ) );
		expect( vars[ '--sgs-gi-shadow' ] ).toBeTruthy();
	} );

	it( 'prints only the sides and corners a tier sets, never a zero fill', () => {
		const attributes = {
			gridItemPadding: { desktop: { top: '10px' }, tablet: { left: '6px' } },
			gridItemBorderRadius: { desktop: { topLeft: '8px' }, mobile: { bottomRight: '2px' } },
		};
		const tablet = gridItemVars( attributes, 'tablet', palette );
		expect( tablet[ '--sgs-gi-padding-top' ] ).toBe( '10px' );
		expect( tablet[ '--sgs-gi-padding-left' ] ).toBe( '6px' );
		expect( tablet ).not.toHaveProperty( '--sgs-gi-padding-right' );
		expect( tablet ).not.toHaveProperty( '--sgs-gi-padding-bottom' );
		expect( tablet ).not.toHaveProperty( '--sgs-gi-radius-bottom-right' );
		const mobile = gridItemVars( attributes, 'mobile', palette );
		expect( mobile[ '--sgs-gi-radius-top-left' ] ).toBe( '8px' );
		expect( mobile[ '--sgs-gi-radius-bottom-right' ] ).toBe( '2px' );
		expect( Object.keys( mobile ).filter( ( key ) => key.startsWith( '--sgs-gi-radius' ) ) ).toHaveLength( 2 );
		// Negative control: a zero-filled side would be caught by the same assertions.
		expect( { ...tablet, '--sgs-gi-padding-right': '0' } ).toHaveProperty( '--sgs-gi-padding-right' );
	} );

	it( 'prefers a background gradient as the ground value', () => {
		expect( gridItemVars( { gridItemBackground: 'primary', gridItemBackgroundGradient: 'linear-gradient(#fff,#000)' }, 'desktop', palette )[ '--sgs-gi-bg' ] ).toBe( 'linear-gradient(#fff,#000)' );
	} );
} );

describe( 'gridItemStateCss', () => {
	it( 'emits hover at both cell depths, never keyed on one block class', () => {
		const css = gridItemStateCss( { gridItemBackgroundHover: 'primary' }, '#block-x', palette );
		expect( css ).toContain( '#block-x > :where(:not(.sgs-container__inner):not([aria-hidden="true"])' );
		expect( css ).toContain( '#block-x > :where(.sgs-container__inner) > :where(:not([aria-hidden="true"])' );
		expect( css ).toContain( ':hover' );
		expect( css ).toContain( 'background-color:#123456' );
		expect( css ).not.toContain( '.sgs-container{' );
	} );

	it( 'is empty when nothing is set', () => {
		expect( gridItemStateCss( {}, '#block-x', palette ) ).toBe( '' );
	} );

	it( 'parses a border shorthand in any order', () => {
		expect( gridBorderParts( 'red solid 3px' ) ).toEqual( { width: '3px', style: 'solid', colour: 'red' } );
	} );
} );
