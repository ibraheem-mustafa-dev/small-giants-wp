/**
 * A length stored as digits only previews as the page paints it: `24px`, or the spacing preset when the theme
 * registers that slug. The custom-property builders for tier padding and corner radius apply it.
 */

import { bareLength } from '../../src/utils/bare-length';
import { tierBoxProperties } from '../../src/utils/spacing-preview';
import { borderRadiusProperties } from '../../src/utils/radius-preview';

describe( 'bareLength', () => {
	it( 'gives a bare number the px unit', () => {
		expect( bareLength( '24', [] ) ).toBe( '24px' );
	} );

	it( 'names the preset when the theme registers that slug', () => {
		expect( bareLength( '30', [ '20', '30' ] ) ).toBe( 'var(--wp--preset--spacing--30)' );
	} );

	it( 'leaves a length that already has a unit, a preset reference and a non-string as stored', () => {
		expect( bareLength( '24px', [] ) ).toBe( '24px' );
		expect( bareLength( 'var(--wp--preset--spacing--40)', [] ) ).toBe( 'var(--wp--preset--spacing--40)' );
		expect( bareLength( undefined, [] ) ).toBeUndefined();
		expect( bareLength( '2.5', [] ) ).toBe( '2.5' );
	} );

	it( 'reads no slugs outside the editor, so a bare number is px', () => {
		expect( bareLength( '24' ) ).toBe( '24px' );
	} );
} );

describe( 'custom-property builders apply it', () => {
	it( 'tier padding side', () => {
		expect( tierBoxProperties( { desktop: { top: '24' } }, 'desktop', '--sgs-gi-padding-' ) ).toEqual( {
			'--sgs-gi-padding-top': '24px',
		} );
	} );

	it( 'tier radius corner', () => {
		expect( borderRadiusProperties( { desktop: { topLeft: '8' } }, 'desktop', '--sgs-gi-radius-' ) ).toEqual( {
			'--sgs-gi-radius-top-left': '8px',
		} );
	} );

	it( 'negative control: a value with a unit is not altered', () => {
		expect( tierBoxProperties( { desktop: { top: '1.5rem' } }, 'desktop', '--p-' ) ).toEqual( { '--p-top': '1.5rem' } );
	} );
} );
