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
			'--sgs-gi-padding': '4px 10px 10px 10px',
			'--sgs-gi-radius': '8px 0 0 0',
			'--sgs-gi-bg': '#123456',
			'--sgs-gi-border': '2px dashed #123456',
			'--sgs-gi-color': '#ffffff',
		} ) );
		expect( vars[ '--sgs-gi-shadow' ] ).toBeTruthy();
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
