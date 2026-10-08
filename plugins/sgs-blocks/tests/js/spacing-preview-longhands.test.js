/**
 * tierBoxLonghands() — the canvas preview for padding and margin printed through
 * sgs_box_object_longhands() (CR6): set sides only, merged per side across tiers,
 * so the canvas shows what the front end paints rather than a 0 for unset sides.
 */
import { tierBoxLonghands, boxLonghands, spacingPreview, boxShorthand } from '../../src/utils/spacing-preview';

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

describe( 'boxLonghands', () => {
	it( 'gives one key per set side and none for an unset side (product-card cardPadding, 20 unset)', () => {
		const box = { right: '30px', bottom: '30px', left: '30px' };
		expect( boxLonghands( box, 'padding' ) ).toEqual( { paddingRight: '30px', paddingBottom: '30px', paddingLeft: '30px' } );
	} );

	it( 'negative control: the zero-filling shorthand paints the unset top as 0, the longhands do not', () => {
		const box = { right: '30px', bottom: '30px', left: '30px' };
		expect( boxShorthand( box ) ).toBe( '0 30px 30px 30px' );
		expect( boxLonghands( box, 'padding' ) ).not.toHaveProperty( 'paddingTop' );
		expect( boxLonghands( box, 'padding' ) ).not.toHaveProperty( 'padding' );
	} );

	it( 'names margin keys, gives {} for no box or an empty box, and refuses another family', () => {
		expect( boxLonghands( { top: '4px' }, 'margin' ) ).toEqual( { marginTop: '4px' } );
		expect( boxLonghands( undefined, 'padding' ) ).toEqual( {} );
		expect( boxLonghands( {}, 'padding' ) ).toEqual( {} );
		expect( boxLonghands( { top: '4px' }, 'borderWidth' ) ).toEqual( {} );
	} );
} );

describe( 'spacingPreview', () => {
	it( 'returns longhands for the set sides only, never a padding or margin shorthand', () => {
		const out = spacingPreview( { padding: { desktop: { top: '8px' } }, margin: { desktop: { left: '2px' } } }, 'desktop' );
		expect( out ).toEqual( { paddingTop: '8px', marginLeft: '2px' } );
		expect( out ).not.toHaveProperty( 'padding' );
		expect( out ).not.toHaveProperty( 'margin' );
	} );
} );
