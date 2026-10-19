/**
 * The canvas twin of includes/helpers-link-underline.php::sgs_link_underline_css prints the same rules for every
 * mode, with the line colour, hover colour and offset the inspector writes.
 */

import { linkUnderlinePreviewCss } from '../../src/utils/link-underline';

const SEL = '.sgs-ed';

describe( 'linkUnderlinePreviewCss', () => {
	beforeEach( () => {
		global.CSS = { supports: ( prop, value ) => 'color' === prop && /^#[0-9a-f]{3,8}$/i.test( value ) };
	} );

	afterEach( () => {
		delete global.CSS;
	} );

	it( 'shows the line only on hover, in its own colour and gap', () => {
		const css = linkUnderlinePreviewCss( SEL, { mode: 'hover', thickness: '2px', offset: '4px', colour: '#FFFAF0' } );

		expect( css ).toContain( `${ SEL } a{text-decoration-line:none;text-decoration-thickness:2px;text-decoration-color:#FFFAF0;text-underline-offset:4px;}` );
		expect( css ).toContain( `${ SEL } a:hover,${ SEL } a:focus-visible{text-decoration-line:underline;}` );
	} );

	it( 'changes the line colour on hover for hover and always', () => {
		const hover = linkUnderlinePreviewCss( SEL, { mode: 'hover', colourHover: '#FFFAF0' } );
		expect( hover ).toContain( `${ SEL } a:hover,${ SEL } a:focus-visible{text-decoration-line:underline;text-decoration-color:#FFFAF0;}` );

		const always = linkUnderlinePreviewCss( SEL, { mode: 'always', colour: '#111111', colourHover: '#FFFAF0', offset: '3px' } );
		expect( always ).toContain( `${ SEL } a{text-decoration-line:underline;text-decoration-color:#111111;text-underline-offset:3px;}` );
		expect( always ).toContain( `${ SEL } a:hover,${ SEL } a:focus-visible{text-decoration-color:#FFFAF0;}` );
	} );

	it( 'paints the sweep line in the chosen colours and ignores the offset', () => {
		const css = linkUnderlinePreviewCss( SEL, { mode: 'sweep', colour: '#111111', colourHover: '#FFFAF0', offset: '4px' } );

		expect( css ).toContain( 'background-image:linear-gradient(#111111,#111111);' );
		expect( css ).toContain( 'background-image:linear-gradient(#FFFAF0,#FFFAF0);' );
		expect( css ).not.toContain( 'text-underline-offset' );
	} );

	it( 'resolves a palette slug to its custom property', () => {
		const css = linkUnderlinePreviewCss( SEL, { mode: 'hover', colour: 'cream' } );

		expect( css ).toContain( 'text-decoration-color:var(--wp--preset--color--cream, currentColor);' );
	} );

	it( 'keeps the sweep line in currentColor when no colour is set', () => {
		const css = linkUnderlinePreviewCss( SEL, { mode: 'sweep' } );

		expect( css ).toContain( 'background-image:linear-gradient(currentColor,currentColor);' );
	} );

	it( 'prints nothing for an unset mode, a colour with no mode, or an unknown mode', () => {
		expect( linkUnderlinePreviewCss( SEL, {} ) ).toBe( '' );
		expect( linkUnderlinePreviewCss( SEL, { colour: '#FFFAF0', offset: '4px' } ) ).toBe( '' );
		expect( linkUnderlinePreviewCss( SEL, { mode: 'wavy', colour: '#FFFAF0' } ) ).toBe( '' );
	} );

	it( 'leaves the gradient-link rule as it was: no sweep when a gradient owns the background', () => {
		expect( linkUnderlinePreviewCss( SEL, { mode: 'sweep', linkGradient: 'linear-gradient(90deg,#f00,#00f)' } ) ).toBe( '' );
	} );
} );
