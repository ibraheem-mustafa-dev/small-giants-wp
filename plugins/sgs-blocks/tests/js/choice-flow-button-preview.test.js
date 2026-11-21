/**
 * sgs/choice-flow's canvas twin of its built-in buttons (preview-style.js): the Back pill and the Close button wear the kit's
 * look, as includes/choice-flow-buttons.php prints it on the page. A preset chosen for a button gives it the preset's class and
 * drops the defaults Back's colour and border attributes carry; with none, Back keeps its transparent resting look; the radius
 * is per device.
 */

'use strict';

const mockDefaults = {
	backColourBackground: { default: '' },
	backColourText: { default: 'text' },
	backColourBorder: { default: 'border' },
	backBorderStyle: { default: 'solid' },
	backBorderWidth: { default: { top: '2px', right: '2px', bottom: '2px', left: '2px' } },
	backBorderRadius: { default: { desktop: { topLeft: '8px', topRight: '8px', bottomRight: '8px', bottomLeft: '8px' } } },
};

jest.mock( '@wordpress/blocks', () => ( {
	getBlockType: () => ( { attributes: mockDefaults } ),
} ) );

const { buildBackButtonPreviewStyle, buttonKitPreview, buttonPresetClass } = require( '../../src/blocks/choice-flow/preview-style' );

const DEFAULTS = {
	backColourText: 'text',
	backColourBorder: 'border',
	backBorderStyle: 'solid',
	backBorderWidth: { top: '2px', right: '2px', bottom: '2px', left: '2px' },
	backBorderRadius: { desktop: { topLeft: '8px', topRight: '8px', bottomRight: '8px', bottomLeft: '8px' } },
};

describe( 'choice-flow button previews', () => {
	test( 'a preset names the class; an empty or unknown name gives none', () => {
		expect( buttonPresetClass( { addToBasketStyle: 'primary' }, 'addToBasket' ) ).toBe( 'sgs-button sgs-button--primary' );
		expect( buttonPresetClass( { addToBasketStyle: '' }, 'addToBasket' ) ).toBe( '' );
		expect( buttonPresetClass( { addToBasketStyle: 'no-such' }, 'addToBasket' ) ).toBe( '' );
		expect( buttonPresetClass( {}, 'buyNow' ) ).toBe( '' );
	} );

	test( 'Back with no preset keeps its transparent resting look and the default border and radius', () => {
		const style = buildBackButtonPreviewStyle( DEFAULTS );
		expect( style.backgroundColor ).toBe( 'transparent' );
		expect( style.borderStyle ).toBe( 'solid' );
		expect( style.borderTopLeftRadius ).toBe( '8px' );
	} );

	test( 'Back with a preset leaves the paint to the preset: no default colours or radius in the inline style', () => {
		const style = buildBackButtonPreviewStyle( { ...DEFAULTS, backStyle: 'primary' } );
		expect( style.backgroundColor ).toBeUndefined();
		expect( style.color ).toBeUndefined();
		expect( style.borderTopLeftRadius ).toBeUndefined();
	} );

	test( 'Back with a preset still shows a colour the author set', () => {
		const style = buildBackButtonPreviewStyle( { ...DEFAULTS, backStyle: 'primary', backColourBackground: '#ff0000' } );
		expect( style.backgroundColor ).toBe( '#ff0000' );
	} );

	test( 'Back previews its radius at the previewed device', () => {
		const backBorderRadius = { desktop: { topLeft: '6px' }, tablet: { topLeft: '14px' } };
		expect( buildBackButtonPreviewStyle( { ...DEFAULTS, backBorderRadius }, 'desktop' ).borderTopLeftRadius ).toBe( '6px' );
		expect( buildBackButtonPreviewStyle( { ...DEFAULTS, backBorderRadius }, 'tablet' ).borderTopLeftRadius ).toBe( '14px' );
	} );

	test( 'Back previews padding and type from the kit', () => {
		const style = buildBackButtonPreviewStyle( { ...DEFAULTS, backPadding: { desktop: { top: '4px', left: '9px' } }, backFontSize: { desktop: '17' } } );
		expect( style.paddingTop ).toBe( '4px' );
		expect( style.paddingLeft ).toBe( '9px' );
		expect( style.fontSize ).toBeDefined();
	} );

	test( 'Close reads its own prefix: closeStyle (icon or text) is not the preset choice', () => {
		const style = buttonKitPreview( { closeStyle: 'text', closeButtonPadding: { desktop: { top: '3px' } } }, 'closeButton' );
		expect( style.paddingTop ).toBe( '3px' );
		expect( buttonPresetClass( { closeStyle: 'text' }, 'closeButton' ) ).toBe( '' );
		expect( buttonPresetClass( { closeButtonStyle: 'outline' }, 'closeButton' ) ).toBe( 'sgs-button sgs-button--outline' );
	} );
} );
