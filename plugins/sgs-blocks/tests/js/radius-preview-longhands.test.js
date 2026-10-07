/**
 * borderRadiusLonghands prints only the corners the client set, never a `0`
 * for an unset corner and never a `borderRadius` shorthand.
 */
import { borderRadiusLonghands } from '../../src/utils/radius-preview';

describe( 'borderRadiusLonghands', () => {
	it( 'returns exactly one key for one desktop corner', () => {
		expect( borderRadiusLonghands( { desktop: { topLeft: '12px' } } ) ).toEqual( { borderTopLeftRadius: '12px' } );
	} );
	it( 'returns {} when nothing is set', () => {
		expect( borderRadiusLonghands( undefined ) ).toEqual( {} );
		expect( borderRadiusLonghands( {} ) ).toEqual( {} );
		expect( borderRadiusLonghands( { desktop: {} } ) ).toEqual( {} );
	} );
	it( 'expands a uniform desktop string to all four corners', () => {
		expect( borderRadiusLonghands( { desktop: '8px' } ) ).toEqual( {
			borderTopLeftRadius: '8px',
			borderTopRightRadius: '8px',
			borderBottomRightRadius: '8px',
			borderBottomLeftRadius: '8px',
		} );
	} );
	it( 'lets a tablet corner override only that corner of a uniform desktop', () => {
		expect( borderRadiusLonghands( { desktop: '8px', tablet: { topLeft: '20px' } }, 'tablet' ) ).toEqual( {
			borderTopLeftRadius: '20px',
			borderTopRightRadius: '8px',
			borderBottomRightRadius: '8px',
			borderBottomLeftRadius: '8px',
		} );
	} );
	it( 'merges mobile over tablet and emits no unset corners', () => {
		expect(
			borderRadiusLonghands( { tablet: { topLeft: '20px' }, mobile: { bottomRight: '4px' } }, 'mobile' )
		).toEqual( { borderTopLeftRadius: '20px', borderBottomRightRadius: '4px' } );
	} );
	it( 'treats the legacy flat shape as the desktop tier at every tier', () => {
		expect( borderRadiusLonghands( { topLeft: '6px' } ) ).toEqual( { borderTopLeftRadius: '6px' } );
		expect( borderRadiusLonghands( { topLeft: '6px' }, 'tablet' ) ).toEqual( { borderTopLeftRadius: '6px' } );
	} );
	it( 'ignores tablet and mobile when desktop is requested', () => {
		expect(
			borderRadiusLonghands( { desktop: { topLeft: '4px' }, tablet: { topLeft: '20px' }, mobile: { topRight: '2px' } }, 'desktop' )
		).toEqual( { borderTopLeftRadius: '4px' } );
	} );
	it( 'keeps an explicit 0 as a set value', () => {
		expect( borderRadiusLonghands( { desktop: { topLeft: '0' } } ) ).toEqual( { borderTopLeftRadius: '0' } );
	} );
	it( 'never emits a borderRadius shorthand', () => {
		expect( borderRadiusLonghands( { desktop: '8px' } ) ).not.toHaveProperty( 'borderRadius' );
	} );
} );
