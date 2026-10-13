/**
 * sgs/label's leading dot in the editor canvas: the same `::before` rule render.php prints
 * (tests/php/LabelDotTest.php), scoped to the canvas element.
 */
import { labelDotPreviewCss } from '../../src/blocks/label/dot-preview';

const SEL = '.sgs-lbl-ed-abc';

// colourVar() asks the browser's CSS.supports() whether a value is already a colour; jsdom has
// no CSS global, so this stands in for the browser's answer.
beforeAll( () => {
	global.CSS = { supports: ( property, value ) => 'color' === property && /^(#|rgba?\(|hsla?\()/i.test( String( value ) ) };
} );
afterAll( () => {
	delete global.CSS;
} );

describe( 'label dot preview', () => {
	it( 'paints the draft dot: 7px, #0A7EA8, 8px gap', () => {
		expect( labelDotPreviewCss( SEL, { dot: true, dotColour: '#0A7EA8', dotSize: '7px', dotGap: '8px' } ) ).toBe(
			'.sgs-lbl-ed-abc::before{content:"";display:inline-block;flex-shrink:0;width:7px;height:7px;border-radius:50%;vertical-align:middle;margin-inline-end:8px;background-color:#0A7EA8;}'
		);
	} );

	it( 'resolves the default gap preset and follows the text colour when no colour is set', () => {
		const css = labelDotPreviewCss( SEL, { dot: true, dotSize: '7px', dotGap: '20' } );
		expect( css ).toContain( 'margin-inline-end:var(--wp--preset--spacing--20);' );
		expect( css ).toContain( 'background-color:currentColor;' );
	} );

	it( 'lets a gradient win and refuses values that would leave the rule', () => {
		const gradient = 'linear-gradient(90deg,#0A7EA8 0%,#2C3E50 100%)';
		expect( labelDotPreviewCss( SEL, { dot: true, dotColour: '#0A7EA8', dotColourGradient: gradient } ) ).toContain( `background-image:${ gradient };` );
		const unsafe = labelDotPreviewCss( SEL, { dot: true, dotSize: '7px;}body{display:none', dotGap: '8px}body{color:red' } );
		expect( unsafe ).not.toContain( 'body{' );
		expect( unsafe ).toContain( 'width:7px;height:7px;' );
	} );

	it( 'prints nothing while the dot is off', () => {
		expect( labelDotPreviewCss( SEL, { dot: false, dotColour: '#0A7EA8' } ) ).toBe( '' );
	} );
} );
