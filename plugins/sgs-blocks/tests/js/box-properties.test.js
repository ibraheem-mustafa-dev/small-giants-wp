/**
 * The custom-property twins of the longhand previews: one `--prefix-side` or `--prefix-corner` per set side or corner
 * at the previewed tier, nothing for an unset one (src/utils/spacing-preview.js::tierBoxProperties and
 * src/utils/radius-preview.js::borderRadiusProperties; PHP: includes/helpers-box.php).
 */

import { tierBoxProperties } from '../../src/utils/spacing-preview';
import { borderRadiusProperties } from '../../src/utils/radius-preview';

describe( 'tierBoxProperties', () => {
	const tiers = { desktop: { top: '10px', right: '12px' }, tablet: { top: '30px' }, mobile: { bottom: '8px' } };

	it( 'merges per side across tiers', () => {
		expect( tierBoxProperties( tiers, 'tablet', '--x-pad-' ) ).toEqual( { '--x-pad-top': '30px', '--x-pad-right': '12px' } );
		expect( tierBoxProperties( tiers, 'mobile', '--x-pad-' ) ).toEqual( { '--x-pad-top': '30px', '--x-pad-right': '12px', '--x-pad-bottom': '8px' } );
	} );

	it( 'returns {} when no side is set', () => {
		expect( tierBoxProperties( undefined, 'desktop', '--x-pad-' ) ).toEqual( {} );
		expect( tierBoxProperties( {}, 'mobile', '--x-pad-' ) ).toEqual( {} );
	} );

	it( 'negative control: a zero-filling version would add the unset sides', () => {
		const zeroFilled = { '--x-pad-top': '30px', '--x-pad-right': '12px', '--x-pad-bottom': '0', '--x-pad-left': '0' };
		expect( tierBoxProperties( tiers, 'tablet', '--x-pad-' ) ).not.toEqual( zeroFilled );
	} );
} );

describe( 'borderRadiusProperties', () => {
	const radius = { desktop: { topLeft: '6px', topRight: '6px' }, tablet: { topLeft: '20px' }, mobile: { bottomRight: '4px' } };

	it( 'names each set corner and keeps the unset ones out', () => {
		expect( borderRadiusProperties( radius, 'tablet', '--x-radius-' ) ).toEqual( { '--x-radius-top-left': '20px', '--x-radius-top-right': '6px' } );
		expect( borderRadiusProperties( radius, 'mobile', '--x-radius-' ) ).toEqual( {
			'--x-radius-top-left': '20px',
			'--x-radius-top-right': '6px',
			'--x-radius-bottom-right': '4px',
		} );
	} );

	it( 'reads a uniform desktop length as all four corners and an empty value as none', () => {
		expect( Object.keys( borderRadiusProperties( { desktop: '8px' }, 'desktop', '--x-radius-' ) ) ).toHaveLength( 4 );
		expect( borderRadiusProperties( undefined, 'desktop', '--x-radius-' ) ).toEqual( {} );
	} );
} );
