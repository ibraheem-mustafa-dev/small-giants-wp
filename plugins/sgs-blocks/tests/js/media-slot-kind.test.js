/**
 * MediaSlotField resolves a device's kind from that device's own stored entry first (Spec 49 §9.2), so choosing
 * "Video file" on Mobile switches the chip and filters the library to video while Desktop keeps its photo.
 */
require( './media-controls-harness' );
const { deviceKind } = require( '../../src/components/media/MediaSlotField' );

const PHOTO = { kind: 'image', id: 7, url: 'https://example.test/a.jpg' };

describe( 'deviceKind', () => {
	it( "a device's own kind beats the inherited file", () => {
		const stored = { desktop: PHOTO, mobile: { kind: 'video' } };
		expect( deviceKind( stored, 'mobile', PHOTO, 'image' ) ).toBe( 'video' );
	} );

	it( 'a device with no entry of its own shows the inherited file kind', () => {
		const stored = { desktop: PHOTO };
		expect( deviceKind( stored, 'mobile', PHOTO, 'video' ) ).toBe( 'image' );
	} );

	it( 'an empty slot falls back to the first allowed kind', () => {
		expect( deviceKind( undefined, 'desktop', undefined, 'image' ) ).toBe( 'image' );
	} );
} );
