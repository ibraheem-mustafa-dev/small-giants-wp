/**
 * sgs/icon colour mode `brand-glyph` ("Brand colour: logo only") in the editor: resolveBrand() and the canvas root
 * style are the twins of render.php, so the canvas paints the glyph alone in the brand colour, never a ground, and
 * the brand mode is unchanged. Negative control: 'the brand mode still paints a ground' fails if the mode leaks.
 */

import { resolveBrand, attributesInGroup, iconGroupContext } from '../../src/blocks/icon/icon-state';
import { canvasRootStyle } from '../../src/blocks/icon/edit';

const whatsapp = { iconSource: 'brand', brandName: 'whatsapp', colourMode: 'brand-glyph' };

describe( 'brand-glyph mode in the editor', () => {
	it( 'paints the glyph in the brand colour and no ground', () => {
		const brand = resolveBrand( whatsapp, 'socials.whatsapp' );
		expect( brand.glyphOnly ).toBe( true );
		expect( brand.paint.glyph ).toBe( '#25D366' );
		const style = canvasRootStyle( whatsapp, 'desktop', brand, [] );
		expect( style[ '--sgs-icon-brand-glyph' ] ).toBe( '#25D366' );
		expect( style[ '--sgs-icon-brand-ground' ] ).toBeUndefined();
		expect( style[ '--sgs-icon-brand-border' ] ).toBeUndefined();
	} );

	it( 'Google keeps its mark (no glyph colour) and Instagram carries its gradient', () => {
		const google = resolveBrand( { iconSource: 'brand', brandName: 'google', colourMode: 'brand-glyph' }, '' );
		expect( google.drawFixed ).toBe( true );
		expect( google.paint.glyph ).toBe( '' );
		const instagram = resolveBrand( { iconSource: 'brand', brandName: 'instagram', colourMode: 'brand-glyph' }, '' );
		expect( instagram.paint.gradient ).toMatch( /^linear-gradient\(/ );
	} );

	it( 'a row in logo-only mode reaches an icon left on Automatic', () => {
		const group = iconGroupContext( { 'sgs/socialIconsColourMode': 'brand-glyph' } );
		expect( group.colourMode ).toBe( 'brand-glyph' );
		const effective = attributesInGroup( { iconSource: 'brand', brandName: 'whatsapp', colourMode: 'inherit' }, group );
		expect( resolveBrand( effective, 'socials.whatsapp' ).glyphOnly ).toBe( true );
		expect( resolveBrand( { ...effective, colourMode: 'theme' }, 'socials.whatsapp' ).brandOn ).toBe( false );
	} );

	it( 'the brand mode still paints a ground', () => {
		const brand = resolveBrand( { ...whatsapp, colourMode: 'brand' }, 'socials.whatsapp' );
		expect( brand.glyphOnly ).toBe( false );
		expect( brand.paint.ground ).toBe( '#25D366' );
	} );
} );
