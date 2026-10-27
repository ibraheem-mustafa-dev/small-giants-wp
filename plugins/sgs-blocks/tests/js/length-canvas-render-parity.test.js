/**
 * The editor canvas paints the same length the page prints, at each device, for the settings stored as one CSS length
 * string per device. The render side of each pair is stated here from the PHPUnit test that asserts it, so a change on
 * either side fails one of the two suites.
 */

import { buttonPreviewStyle } from '../../src/blocks/button/preview-style';
import { separatorSizePreview } from '../../src/blocks/separator/edit';

describe( 'canvas preview equals the render for a per-device length', () => {
	// sgs/button: TextLengthStringTest::test_button_custom_width_and_min_height_print_per_device asserts render.php prints
	// `.sgs-button{width:240px` in the base rule and `width:80%` inside the 767px media query for this exact input.
	const button = {
		widthType: { desktop: 'custom', mobile: 'custom' },
		customWidth: { desktop: '240px', mobile: '80%' },
	};

	test( 'sgs/button customWidth: desktop 240px, mobile 80%, tablet inherits desktop', () => {
		expect( buttonPreviewStyle( button, [], 'desktop' ).style.width ).toBe( '240px' );
		expect( buttonPreviewStyle( button, [], 'tablet' ).style.width ).toBe( '240px' );
		expect( buttonPreviewStyle( button, [], 'mobile' ).style.width ).toBe( '80%' );
	} );

	test( 'sgs/button customWidth: a hostile string paints no width', () => {
		const hostile = { widthType: { desktop: 'custom' }, customWidth: { desktop: '10px;}body{color:red' } };
		expect( buttonPreviewStyle( hostile, [], 'desktop' ).style.width ).toBeUndefined();
	} );

	// sgs/separator: LengthStringSettingsTest::test_separator_width_and_thickness_print_per_device asserts render.php
	// prints `width:60%` and `border-bottom-width:2px` in the base rule, and `width:200px` and `border-bottom-width:4px`
	// in a media query, for width {desktop:60%, mobile:200px} and thickness {desktop:2px, mobile:4px}.
	test( 'sgs/separator width and thickness: the previewed device value, tablet inherits desktop', () => {
		const width = { desktop: '60%', mobile: '200px' };
		const thickness = { desktop: '2px', mobile: '4px' };
		expect( separatorSizePreview( width, thickness, 'desktop' ) ).toEqual( { width: '60%', borderBottomWidth: '2px' } );
		expect( separatorSizePreview( width, thickness, 'tablet' ) ).toEqual( { width: '60%', borderBottomWidth: '2px' } );
		expect( separatorSizePreview( width, thickness, 'mobile' ) ).toEqual( { width: '200px', borderBottomWidth: '4px' } );
	} );

	test( 'sgs/separator width: a hostile string paints nothing', () => {
		expect( separatorSizePreview( { desktop: '10px;}body{color:red' }, {}, 'desktop' ).width ).toBeUndefined();
	} );
} );
