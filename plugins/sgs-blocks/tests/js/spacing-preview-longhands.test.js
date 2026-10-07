/**
 * tierBoxLonghands() — the canvas preview for padding and margin printed through
 * sgs_box_object_longhands() (CR6): set sides only, merged per side across tiers,
 * so the canvas shows what the front end paints rather than a 0 for unset sides.
 */
import { tierBoxLonghands } from '../../src/utils/spacing-preview';

describe( 'tierBoxLonghands', () => {
	it( 'gives one key per set side and none for an unset side', () => {
		expect( tierBoxLonghands( { desktop: { top: '12px' } }, 'desktop', 'padding' ) ).toEqual( { paddingTop: '12px' } );
	} );

	it( 'gives nothing when no side is set at any tier', () => {
		expect( tierBoxLonghands( { desktop: {} }, 'mobile', 'padding' ) ).toEqual( {} );
		expect( tierBoxLonghands( undefined, 'desktop', 'margin' ) ).toEqual( {} );
	} );

	it( 'merges per side: a mobile tier that sets only the top keeps the tablet tier\'s left (Bean, 2026-10-07)', () => {
		const padding = { tablet: { left: '30px' }, mobile: { top: '50px' } };
		expect( tierBoxLonghands( padding, 'mobile', 'padding' ) ).toEqual( { paddingTop: '50px', paddingLeft: '30px' } );
		expect( tierBoxLonghands( padding, 'tablet', 'padding' ) ).toEqual( { paddingLeft: '30px' } );
		expect( tierBoxLonghands( padding, 'desktop', 'padding' ) ).toEqual( {} );
	} );

	it( 'keeps the desktop sides a narrower tier does not set', () => {
		const padding = { desktop: { top: '24px', right: '24px', bottom: '24px', left: '24px' }, tablet: { top: '40px' } };
		expect( tierBoxLonghands( padding, 'tablet', 'padding' ) ).toEqual( {
			paddingTop: '40px',
			paddingRight: '24px',
			paddingBottom: '24px',
			paddingLeft: '24px',
		} );
	} );

	it( 'names margin keys for the margin family, and refuses any other family', () => {
		expect( tierBoxLonghands( { desktop: { bottom: '8px' } }, 'desktop', 'margin' ) ).toEqual( { marginBottom: '8px' } );
		expect( tierBoxLonghands( { desktop: { top: '2px' } }, 'desktop', 'borderWidth' ) ).toEqual( {} );
	} );
} );
