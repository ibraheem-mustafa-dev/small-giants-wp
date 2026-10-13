/**
 * sgs/hero's split media shadow in the editor canvas: the shared `shadow` media atom's custom
 * properties for prefix 'splitMedia' (the values render.php prints through
 * `SGS_Media_Element::style()`), and the lift switch staying with its own surface.
 */
import { elementCustomProperties } from '../../src/components/media/canvasStyle';

const HOVER_MAP = { soft: 'lifted' };

const splitMediaStyle = ( attributes ) =>
	elementCustomProperties( {
		attributes,
		prefix: 'splitMedia',
		blockSlug: 'sgs/hero',
		atoms: [ 'object-fit', 'focal-point', 'shadow' ],
		extra: { hoverMap: HOVER_MAP },
	} );

describe( 'hero split media shadow preview', () => {
	it( 'paints the draft shadow on the split media element', () => {
		const style = splitMediaStyle( {
			splitMediaBoxShadow: '0 34px 60px -30px',
			splitMediaBoxShadowColour: 'rgba(44,62,80,.7)',
			shadowLiftOnHover: true,
		} );
		expect( style[ '--sgs-media-box-shadow' ] ).toBe( '0px 34px 60px -30px rgba(44,62,80,.7)' );
	} );

	it( 'does not take the hero root lift switch', () => {
		const style = splitMediaStyle( {
			splitMediaBoxShadow: 'soft',
			shadowLiftOnHover: true,
		} );
		expect( style[ '--sgs-media-box-shadow' ] ).toBeTruthy();
		expect( style[ '--sgs-media-box-shadow-hover' ] ).toBeUndefined();
	} );

	it( 'lifts when the surface declares its own switch, and sgs/media keeps the root switch', () => {
		expect( splitMediaStyle( { splitMediaBoxShadow: 'soft', splitMediaShadowLiftOnHover: true } )[ '--sgs-media-box-shadow-hover' ] ).toBe( 'var(--wp--preset--shadow--lifted)' );
		const media = elementCustomProperties( {
			attributes: { boxShadow: 'soft' },
			blockSlug: 'sgs/media',
			atoms: [ 'shadow' ],
			extra: { hoverMap: HOVER_MAP },
		} );
		expect( media[ '--sgs-media-box-shadow-hover' ] ).toBe( 'var(--wp--preset--shadow--lifted)' );
	} );

	it( 'prints nothing when no shadow is set', () => {
		expect( splitMediaStyle( { shadowLiftOnHover: true } )[ '--sgs-media-box-shadow' ] ).toBeUndefined();
	} );
} );
