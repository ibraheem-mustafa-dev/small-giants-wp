/**
 * The shared box and wrapper previews (src/utils/box-preview.js and
 * src/utils/container-wrapper-preview.js) paint the box at the device tier the editor is previewing, as the front end's
 * tier rules do.
 */

import { boxPreview } from '../../src/utils/box-preview';
import { wrapperPreview } from '../../src/utils/container-wrapper-preview';

const corners = ( topLeft, topRight, bottomRight, bottomLeft ) => ( { topLeft, topRight, bottomRight, bottomLeft } );

describe( 'boxPreview', () => {
	const attributes = {
		padding: { desktop: { top: '10px' }, tablet: { top: '20px' } },
		borderRadius: { desktop: corners( '8px', '8px', '8px', '8px' ), tablet: { topLeft: '2px' } },
	};

	it( 'previews the desktop tier by default', () => {
		const style = boxPreview( attributes, 'desktop', [] );
		expect( style.paddingTop ).toBe( '10px' );
		expect( style ).not.toHaveProperty( 'paddingRight' );
		expect( style ).not.toHaveProperty( 'padding' );
		expect( [ style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius ] ).toEqual( [ '8px', '8px', '8px', '8px' ] );
	} );

	it( 'lets a tablet corner override only that corner', () => {
		const style = boxPreview( attributes, 'tablet', [] );
		expect( style.paddingTop ).toBe( '20px' );
		expect( style ).not.toHaveProperty( 'padding' );
		expect( [ style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius ] ).toEqual( [ '2px', '8px', '8px', '8px' ] );
	} );

	it( 'reads a flat radius length as the desktop tier', () => {
		const flat = boxPreview( { borderRadius: '12px' }, 'mobile', [] );
		expect( [ flat.borderTopLeftRadius, flat.borderTopRightRadius, flat.borderBottomRightRadius, flat.borderBottomLeftRadius ] ).toEqual( [ '12px', '12px', '12px', '12px' ] );
	} );

	it( 'paints a border only when a side has a width', () => {
		expect( boxPreview( { borderStyle: 'solid', borderColour: '#123456' }, 'desktop', [] ).borderWidth ).toBeUndefined();
		const painted = boxPreview( { borderStyle: 'dashed', borderWidth: { top: '2px' }, borderColour: '#123456' }, 'desktop', [] );
		expect( painted.borderWidth ).toBe( '2px 0 0 0' );
		expect( painted.borderStyle ).toBe( 'dashed' );
		expect( painted.borderColor ).toBe( '#123456' );
	} );
} );

describe( 'wrapperPreview', () => {
	it( 'caps the content in a band and moves the grid onto it', () => {
		const { style, bandStyle, hasBandProps } = wrapperPreview(
			{ layout: 'grid', contentWidth: { desktop: '900px' }, gridTemplateColumns: { desktop: '1fr 2fr' } },
			'desktop',
			[]
		);
		expect( hasBandProps ).toBe( true );
		expect( bandStyle.maxWidth ).toBe( '900px' );
		expect( bandStyle.display ).toBe( 'grid' );
		expect( bandStyle.gridTemplateColumns ).toBe( '1fr 2fr' );
		expect( style.display ).toBeUndefined();
	} );

	it( 'keeps the layout on the outer element without a band', () => {
		const { style, hasBandProps } = wrapperPreview( { layout: 'flex', flexDirection: 'column' }, 'desktop', [] );
		expect( hasBandProps ).toBe( false );
		expect( style.display ).toBe( 'flex' );
		expect( style.flexDirection ).toBe( 'column' );
	} );
} );
