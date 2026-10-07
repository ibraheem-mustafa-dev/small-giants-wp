/**
 * A block preview that copies the shared wrapper preview's radius by key must copy the four corner longhands
 * (RADIUS_STYLE_KEYS), since no shared preview sets a `borderRadius` shorthand; and hero's split image previews only
 * the corners each tier sets, as render.php prints them.
 */
import { RADIUS_STYLE_KEYS } from '../../src/utils/radius-preview';
import { heroCanvasPreview } from '../../src/blocks/hero/canvas-preview';

const radiusOf = ( style ) => Object.fromEntries( Object.entries( style ).filter( ( [ k ] ) => /Radius$/.test( k ) ) );

describe( 'RADIUS_STYLE_KEYS', () => {
	it( 'names the four corner longhands and never the shorthand', () => {
		expect( RADIUS_STYLE_KEYS ).toEqual( [ 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius' ] );
	} );
} );

describe( 'heroCanvasPreview radius', () => {
	it( 'keeps the wrapper radius it copies onto the section', () => {
		const out = heroCanvasPreview( { borderRadius: { desktop: '8px' } }, { tier: 'desktop' } );
		expect( radiusOf( out.root ) ).toEqual( {
			borderTopLeftRadius: '8px',
			borderTopRightRadius: '8px',
			borderBottomRightRadius: '8px',
			borderBottomLeftRadius: '8px',
		} );
	} );
	it( 'previews only the split image corners a tier sets, never a 0', () => {
		const out = heroCanvasPreview( {
			splitMediaBorderRadius: { topLeft: '6px', topRight: '6px', bottomRight: '6px', bottomLeft: '6px' },
			splitMediaBorderRadiusTablet: { topLeft: '20px' },
		}, { tier: 'tablet', isSplit: true } );
		expect( radiusOf( out.image ) ).toEqual( {
			borderTopLeftRadius: '20px',
			borderTopRightRadius: '6px',
			borderBottomRightRadius: '6px',
			borderBottomLeftRadius: '6px',
		} );
	} );
} );
