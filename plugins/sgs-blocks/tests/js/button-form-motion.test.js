/**
 * The editor twins of the sgs/button and sgs/form submit-button additions: the shared hover
 * lift, the Site Info label, the circle behind the icon, the prefixed lift attribute names and
 * the submit button's canvas preview. The PHP halves are in
 * tests/php/run-button-form-motion-standalone.php.
 */
import { hoverLiftPx, hoverLiftDecls, hoverLiftPreviewRule, HOVER_LIFT_MAX_PX } from '../../src/utils/hover-lift';
import { siteInfoLabelText } from '../../src/blocks/button/site-info-label';
import { iconCircleDiameter, iconCirclePreviewStyle, ICON_CIRCLE_DEFAULT_DIAMETER } from '../../src/blocks/button/icon-circle-preview';
import { shadowLiftAttrKeys } from '../../src/components/ShadowLiftControls';
import { submitShadowPreviewStyle, submitLiftPreviewRule } from '../../src/blocks/form/submit-motion-preview';

const PALETTE = [ { slug: 'primary', color: '#0a7ea8' } ];

describe( 'hover lift', () => {
	it( 'clamps to 0..24 and floors a fraction, like the PHP helper', () => {
		expect( [ null, 0, -3, 6, 24, 25, 99, '7', '7.9', 'abc', 3.9 ].map( hoverLiftPx ) ).toEqual( [ 0, 0, 0, 6, 24, 24, 24, 7, 7, 0, 3 ] );
		expect( HOVER_LIFT_MAX_PX ).toBe( 24 );
	} );
	it( 'prints the declaration the front end prints', () => {
		expect( hoverLiftDecls( 6 ) ).toBe( 'translate:0 -6px' );
		expect( hoverLiftDecls( 6, true ) ).toBe( 'translate:0 -6px;transform:none' );
		expect( hoverLiftPreviewRule( '.x', 6 ) ).toBe( '.x:hover{translate:0 -6px}' );
	} );
	it( 'NEGATIVE CONTROL: a lift of 0 prints nothing', () => {
		expect( hoverLiftDecls( 0 ) ).toBe( '' );
		expect( hoverLiftPreviewRule( '.x', 0 ) ).toBe( '' );
		expect( hoverLiftPreviewRule( '.x', undefined ) ).toBe( '' );
	} );
} );

describe( 'shadow lift attribute names', () => {
	it( 'keeps the block-root names without a prefix and namespaces them with one', () => {
		expect( shadowLiftAttrKeys() ).toEqual( { lift: 'shadowLiftOnHover', hover: 'sgsHoverShadow' } );
		expect( shadowLiftAttrKeys( 'submit' ) ).toEqual( { lift: 'submitShadowLiftOnHover', hover: 'submitSgsHoverShadow' } );
	} );
} );

describe( 'button label from Site Info', () => {
	const info = {
		phone: { value: '020 7946 0958' },
		email: { value: 'hello@example.test' },
		'socials.whatsapp': { value: 'https://wa.me/447700900123' },
	};
	it( 'returns the value for phone, email and whatsapp', () => {
		expect( siteInfoLabelText( 'phone', info ) ).toBe( '020 7946 0958' );
		expect( siteInfoLabelText( 'email', info ) ).toBe( 'hello@example.test' );
		expect( siteInfoLabelText( 'whatsapp', info ) ).toBe( '+447700900123' );
		expect( siteInfoLabelText( 'whatsapp', { 'socials.whatsapp': { value: '07700 900123' } } ) ).toBe( '07700 900123' );
	} );
	it( 'NEGATIVE CONTROL: other sources, empty fields and bad values give an empty label', () => {
		expect( siteInfoLabelText( 'url', info ) ).toBe( '' );
		expect( siteInfoLabelText( 'phone', {} ) ).toBe( '' );
		expect( siteInfoLabelText( 'phone', undefined ) ).toBe( '' );
		expect( siteInfoLabelText( 'email', { email: { value: 'not-an-email' } } ) ).toBe( '' );
		expect( siteInfoLabelText( 'whatsapp', { 'socials.whatsapp': { value: 'https://example.test/chat' } } ) ).toBe( '' );
	} );
	it( 'drops markup from the value', () => {
		expect( siteInfoLabelText( 'phone', { phone: { value: '<b>0207</b>' } } ) ).toBe( '0207' );
	} );
} );

describe( 'icon circle preview', () => {
	it( 'uses the set diameter at the tier, else 1.8 times the icon size', () => {
		const size = { desktop: 40, mobile: 32 };
		expect( iconCircleDiameter( size, 'desktop' ) ).toBe( '40px' );
		expect( iconCircleDiameter( size, 'mobile' ) ).toBe( '32px' );
		expect( iconCircleDiameter( size, 'tablet' ) ).toBe( '40px' );
		expect( iconCircleDiameter( {}, 'desktop' ) ).toBe( ICON_CIRCLE_DEFAULT_DIAMETER );
	} );
	it( 'paints a round chip with the resolved fill', () => {
		const style = iconCirclePreviewStyle( { iconBackground: 'primary', iconShapeSize: { desktop: 40 } }, PALETTE, 'desktop' );
		expect( style ).toMatchObject( { borderRadius: '50%', width: '40px', height: '40px', backgroundColor: '#0a7ea8' } );
	} );
	it( 'NEGATIVE CONTROL: no fill set paints nothing', () => {
		expect( iconCirclePreviewStyle( { iconShapeSize: { desktop: 40 } }, PALETTE, 'desktop' ) ).toEqual( {} );
		expect( iconCirclePreviewStyle( {}, PALETTE, 'desktop' ) ).toEqual( {} );
	} );
} );

describe( 'form submit button preview', () => {
	it( 'previews the resting shadow and the lift', () => {
		const attrs = { submitShadow: '0 4px 14px -6px', submitShadowColour: '#0a7ea880', submitLiftHover: 2 };
		expect( submitShadowPreviewStyle( attrs, PALETTE ).boxShadow ).toContain( '#0a7ea880' );
		expect( submitLiftPreviewRule( '.f .b', attrs ) ).toBe( '.f .b:hover{translate:0 -2px}' );
	} );
	it( 'NEGATIVE CONTROL: defaults preview nothing', () => {
		expect( submitShadowPreviewStyle( { submitShadow: '', submitShadowColour: '' }, PALETTE ) ).toEqual( {} );
		expect( submitLiftPreviewRule( '.f .b', { submitLiftHover: 0 } ) ).toBe( '' );
	} );
} );
