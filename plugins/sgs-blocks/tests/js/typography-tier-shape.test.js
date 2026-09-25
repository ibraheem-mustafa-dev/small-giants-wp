/**
 * TypographyControls.js::isTieredValue — which storage shape a typography
 * value is written in.
 *
 * An unset per-device attribute (block.json default `{}`) reaches the editor
 * as `[]`, because WordPress passes block defaults through PHP and an empty
 * PHP array JSON-encodes as a list. Read as "not per-device", the font-size,
 * line-height and letter-spacing controls wrote a flat number into an
 * object-typed attribute, and WordPress dropped it on the next load (live on
 * sandybrown: sgs/heading fontSize 4vw, sgs/nav-bar-menu itemFontSize 2vw and
 * sgs/icon-list descriptionFontSize 13px all came back `[]` after save and
 * reload). Negative control: the pre-fix helper returns false for `[]`, which
 * fails the first test.
 */

import { isTieredValue } from '../../src/components/TypographyControls';

describe( 'isTieredValue', () => {
	it( 'treats the editor\'s empty default `[]` as an empty tier object', () => {
		expect( isTieredValue( [] ) ).toBe( true );
	} );

	it( 'treats a tier object as tiered', () => {
		expect( isTieredValue( {} ) ).toBe( true );
		expect( isTieredValue( { desktop: 18, mobile: 14 } ) ).toBe( true );
	} );

	it( 'treats legacy flat values and "inherit" as not tiered', () => {
		expect( isTieredValue( 18 ) ).toBe( false );
		expect( isTieredValue( 'large' ) ).toBe( false );
		expect( isTieredValue( '' ) ).toBe( false );
		expect( isTieredValue( null ) ).toBe( false );
		expect( isTieredValue( undefined ) ).toBe( false );
	} );

	it( 'never treats a non-empty list as a tier object', () => {
		expect( isTieredValue( [ 18 ] ) ).toBe( false );
	} );
} );
