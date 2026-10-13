/**
 * Gallery item tile: the editor-canvas mirror of render-tile.php.
 *
 * Every tile setting at its default previews nothing; each set value paints.
 */
import { isTileMode, tilePreviewStyle, tileColourRow } from '../../src/blocks/gallery/tile-preview';

const PALETTE = [ { slug: 'primary', color: '#123456' } ];
const GRADIENT = 'linear-gradient(90deg, #111, #eee)';

describe( 'gallery tile preview', () => {
	it( 'previews nothing at the defaults (negative control)', () => {
		const defaults = {
			tileColour: '',
			tileColourGradient: '',
			tileBorderWidth: {},
			tileBorderRadius: {},
			tileMinHeight: {},
			tilePadding: {},
		};
		expect( isTileMode( defaults ) ).toBe( false );
		expect( tilePreviewStyle( defaults, 'desktop', PALETTE ) ).toEqual( {} );
	} );

	it( 'turns tile mode on only for a tile height', () => {
		expect( isTileMode( { tileMinHeight: { desktop: '64px' } } ) ).toBe( true );
		expect( isTileMode( { tileMinHeight: { mobile: '48px' } } ) ).toBe( true );
		expect( isTileMode( { tilePadding: { desktop: { top: '8px' } } } ) ).toBe( false );
	} );

	it( 'paints fill, height and padding for the previewed tier', () => {
		const style = tilePreviewStyle(
			{
				tileColour: '#FAFAF8',
				tileMinHeight: { desktop: '64px', mobile: '56px' },
				tilePadding: { desktop: { top: '8px', right: '12px', bottom: '8px', left: '12px' } },
			},
			'desktop',
			PALETTE
		);
		expect( style.minHeight ).toBe( '64px' );
		expect( style.boxSizing ).toBe( 'border-box' );
		expect( style.paddingLeft ).toBe( '12px' );
		expect( style.backgroundColor ).toBeTruthy();
	} );

	it( 'lets a gradient win over the flat fill', () => {
		const style = tilePreviewStyle( { tileColour: '#FAFAF8', tileColourGradient: GRADIENT }, 'desktop', PALETTE );
		expect( style.backgroundImage ).toBe( GRADIENT );
		expect( style.backgroundColor ).toBeUndefined();
	} );

	it( 'builds a resting and a hover state for the fill row', () => {
		const set = jest.fn();
		const row = tileColourRow( { attributes: { tileColour: 'primary' }, setAttributes: set } );
		expect( row.states.map( ( s ) => s.key ) ).toEqual( [ 'normal', 'hover' ] );
		row.states[ 1 ].onChange( null );
		expect( set ).toHaveBeenCalledWith( { tileColourHover: '' } );
	} );
} );
