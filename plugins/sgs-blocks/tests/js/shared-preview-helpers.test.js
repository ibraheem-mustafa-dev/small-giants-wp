/**
 * The shared editor-preview helpers every block routes through: per-tier corner
 * radius, tier values and lengths (a cleared narrower tier inherits), colour
 * resolution, and the grid-item editor <style> guard and shadow lift.
 */
import { wrapperBorderPreview } from '../../src/utils/wrapper-border-preview';
import { sgsBorderPreview } from '../../src/utils/border-preview';
import { tierValueOf } from '../../src/utils/responsive';
import { tierLengthPreview } from '../../src/utils/cssLength';
import { isCssGradient } from '../../src/utils/background-preview';
import { resolveColourToken } from '../../src/components/DesignTokenPicker';
import { buildWrapperStyle as teamMemberWrapperStyle } from '../../src/blocks/team-member/preview-style';
import { gridItemStateCss } from '../../src/blocks/container/grid-item-preview';

const RADIUS = {
	desktop: { topLeft: '4px', topRight: '4px', bottomRight: '4px', bottomLeft: '4px' },
	tablet: { topLeft: '20px', topRight: '20px', bottomRight: '20px', bottomLeft: '20px' },
	mobile: { topLeft: '8px' },
};
// The four corner longhands, in top-left, top-right, bottom-right, bottom-left order.
const corners = ( tl, tr, br, bl ) => ( { borderTopLeftRadius: tl, borderTopRightRadius: tr, borderBottomRightRadius: br, borderBottomLeftRadius: bl } );
const radiusOf = ( style ) => Object.fromEntries( Object.entries( style ).filter( ( [ k ] ) => /Radius$/.test( k ) ) );

describe( 'wrapperBorderPreview corner radius', () => {
	it( 'paints the tablet corners at tablet', () => {
		expect( radiusOf( wrapperBorderPreview( { borderRadius: RADIUS }, 'tablet', [] ) ) ).toEqual( corners( '20px', '20px', '20px', '20px' ) );
	} );
	it( 'merges a mobile corner over the tablet ones', () => {
		expect( radiusOf( wrapperBorderPreview( { borderRadius: RADIUS }, 'mobile', [] ) ) ).toEqual( corners( '8px', '20px', '20px', '20px' ) );
	} );
	it( 'keeps the desktop corners at desktop', () => {
		expect( radiusOf( wrapperBorderPreview( { borderRadius: RADIUS }, 'desktop', [] ) ) ).toEqual( corners( '4px', '4px', '4px', '4px' ) );
	} );
	it( 'previews only the set corners, never a 0 and never a shorthand', () => {
		const style = wrapperBorderPreview( { borderRadius: { tablet: { topLeft: '20px' } } }, 'tablet', [] );
		expect( radiusOf( style ) ).toEqual( { borderTopLeftRadius: '20px' } );
		expect( style ).not.toHaveProperty( 'borderRadius' );
	} );
} );

describe( 'sgsBorderPreview', () => {
	const W = { top: '2px' };
	it( 'a width with no style paints solid; none or no width paints nothing', () => {
		expect( sgsBorderPreview( { widthValues: W } ) ).toEqual( { borderStyle: 'solid', borderWidth: '2px 0 0 0' } );
		expect( sgsBorderPreview( { styleValue: 'dashed', colourValue: '#f00' } ) ).toEqual( {} );
		expect( sgsBorderPreview( { widthValues: W, styleValue: 'none', colourValue: '#f00' } ) ).toEqual( {} );
	} );
	it( 'paints a gradient border as border-image beside the flat colour', () => {
		expect( sgsBorderPreview( { widthValues: W, colourValue: '#f00', colourGradientValue: 'linear-gradient(red, blue)' } ) ).toEqual( {
			borderStyle: 'solid',
			borderWidth: '2px 0 0 0',
			borderColor: '#f00',
			borderImage: 'linear-gradient(red, blue) 1',
		} );
		expect( sgsBorderPreview( { widthValues: W, colourGradientValue: 'red' } ).borderImage ).toBeUndefined();
	} );
	it( 'reads the per-device radius from the panel envelope or the attribute itself', () => {
		const envelope = { base: RADIUS.desktop, tablet: RADIUS.tablet, mobile: RADIUS.mobile };
		expect( radiusOf( sgsBorderPreview( { radiusValues: envelope }, 'tablet' ) ) ).toEqual( corners( '20px', '20px', '20px', '20px' ) );
		expect( radiusOf( sgsBorderPreview( { radiusValues: RADIUS }, 'mobile' ) ) ).toEqual( corners( '8px', '20px', '20px', '20px' ) );
	} );
	it( 'prefixed attributes paint the same as the un-prefixed wrapper', () => {
		const attrs = { cardBorderWidth: W, cardBorderStyle: 'dotted', cardBorderColour: 'primary', cardBorderColourGradient: '', cardBorderRadius: { desktop: '6px' } };
		const palette = [ { slug: 'primary', color: '#123456' } ];
		const prefixed = sgsBorderPreview( {
			widthValues: attrs.cardBorderWidth,
			styleValue: attrs.cardBorderStyle,
			colourValue: attrs.cardBorderColour,
			colourGradientValue: attrs.cardBorderColourGradient,
			radiusValues: attrs.cardBorderRadius,
		}, 'desktop', palette );
		expect( prefixed ).toEqual( { borderStyle: 'dotted', borderWidth: '2px 0 0 0', borderColor: '#123456', ...corners( '6px', '6px', '6px', '6px' ) } );
		expect( wrapperBorderPreview( { borderWidth: W, borderStyle: 'dotted', borderColour: 'primary', borderRadius: { desktop: '6px' } }, 'desktop', palette ) ).toEqual( prefixed );
	} );
	it( 'defaultBorder lets a chosen style or colour override the stylesheet border without a width', () => {
		expect( sgsBorderPreview( { styleValue: 'dashed', colourValue: '#f00' }, 'desktop', [], { defaultBorder: true } ) ).toEqual( { borderStyle: 'dashed', borderColor: '#f00' } );
		expect( sgsBorderPreview( {}, 'desktop', [], { defaultBorder: true } ) ).toEqual( {} );
	} );
	it( 'fallbackColour paints only when no flat colour is set', () => {
		expect( sgsBorderPreview( { widthValues: W }, 'desktop', [], { fallbackColour: 'var(--x)' } ).borderColor ).toBe( 'var(--x)' );
		expect( sgsBorderPreview( { widthValues: W, colourValue: '#0f0' }, 'desktop', [], { fallbackColour: 'var(--x)' } ).borderColor ).toBe( '#0f0' );
		expect( sgsBorderPreview( {}, 'desktop', [], { fallbackColour: 'var(--x)' } ) ).toEqual( {} );
	} );
} );

describe( 'tierValueOf', () => {
	it( 'inherits the wider tier when a narrower tier is cleared', () => {
		expect( tierValueOf( { desktop: '10px', tablet: '' }, 'tablet' ) ).toBe( '10px' );
		expect( tierValueOf( { desktop: '10px', tablet: '6px', mobile: '' }, 'mobile' ) ).toBe( '6px' );
		expect( tierValueOf( { desktop: '10px', tablet: 'inherit', mobile: null }, 'mobile' ) ).toBe( '10px' );
	} );
	it( 'passes a plain value through and returns undefined when nothing is set', () => {
		expect( tierValueOf( 'auto', 'mobile' ) ).toBe( 'auto' );
		expect( tierValueOf( { desktop: '' }, 'desktop' ) ).toBeUndefined();
	} );
	it( 'skips a tier the reader rejects', () => {
		const read = ( raw ) => ( Number( raw ) > 0 ? Number( raw ) : undefined );
		expect( tierValueOf( { desktop: '3', tablet: '0' }, 'tablet', read ) ).toBe( 3 );
	} );
} );

describe( 'tierLengthPreview', () => {
	it( 'gives a bare number the unit and inherits a cleared tier', () => {
		expect( tierLengthPreview( { desktop: '20', mobile: '' }, 'mobile' ) ).toBe( '20px' );
		expect( tierLengthPreview( { desktop: 2 }, 'tablet', 'rem' ) ).toBe( '2rem' );
		expect( tierLengthPreview( { desktop: '1.5em' }, 'desktop' ) ).toBe( '1.5em' );
	} );
	it( 'keeps zero unless the emitter drops it', () => {
		expect( tierLengthPreview( 0 ) ).toBe( '0px' );
		expect( tierLengthPreview( '0px', 'desktop', 'px', { dropZero: true } ) ).toBeUndefined();
		expect( tierLengthPreview( undefined ) ).toBeUndefined();
	} );
} );

describe( 'isCssGradient', () => {
	it( 'recognises a gradient, and the whole form refuses a stylesheet breakout', () => {
		expect( isCssGradient( 'linear-gradient(red, blue)' ) ).toBe( true );
		expect( isCssGradient( 'red' ) ).toBe( false );
		expect( isCssGradient( 'linear-gradient(red, blue);}body{color:red', { whole: true } ) ).toBe( false );
		expect( isCssGradient( 'linear-gradient(red, blue)', { whole: true } ) ).toBe( true );
	} );
} );

describe( 'colour resolution keeps CSS colours', () => {
	const realCss = global.CSS;
	beforeAll( () => {
		global.CSS = { supports: ( property, value ) => 'color' === property && [ 'rebeccapurple', 'red' ].includes( value ) };
	} );
	afterAll( () => {
		global.CSS = realCss;
	} );
	it( 'passes an oklch() or named colour through, and still resolves a slug', () => {
		expect( resolveColourToken( 'oklch(70% 0.1 200)', [] ) ).toBe( 'oklch(70% 0.1 200)' );
		expect( resolveColourToken( 'rebeccapurple', [] ) ).toBe( 'rebeccapurple' );
		expect( resolveColourToken( 'primary', [ { slug: 'primary', color: '#123456' } ] ) ).toBe( '#123456' );
		expect( resolveColourToken( 'accent', [] ) ).toBe( 'var(--wp--preset--color--accent)' );
	} );
	it( 'a named colour survives the team-member preview', () => {
		const style = teamMemberWrapperStyle( { backgroundColour: 'rebeccapurple', borderWidth: { top: '1px' }, borderColour: 'red' }, 'desktop', [] );
		expect( style.backgroundColor ).toBe( 'rebeccapurple' );
		expect( style.borderColor ).toBe( 'red' );
	} );
} );

describe( 'grid-item editor state rules', () => {
	it( 'a gradient carrying a stylesheet breakout produces no rule', () => {
		const hostile = 'linear-gradient(red, blue);}body{color:red';
		const css = gridItemStateCss(
			{
				gridItemBorderGradient: hostile,
				gridItemBorderGradientHover: hostile,
				gridItemTextColourGradient: hostile,
				gridItemTextColourHoverGradient: hostile,
				gridItemBackgroundHoverGradient: hostile,
			},
			'#block-x',
			[]
		);
		expect( css ).toBe( '' );
	} );
	it( 'drops a colour value carrying a breakout', () => {
		const css = gridItemStateCss( { gridItemBackgroundHover: '#fff;}body{color:red' }, '#block-x', [] );
		expect( css ).not.toContain( 'body{' );
	} );
	it( 'lifts the grid-item shadow on hover unless the switch is off', () => {
		const on = gridItemStateCss( { gridItemShadow: '0 4px 8px 0' }, '#block-x', [] );
		expect( on ).toContain( ':focus-visible{box-shadow:' );
		const off = gridItemStateCss( { gridItemShadow: '0 4px 8px 0', shadowLiftOnHover: false }, '#block-x', [] );
		expect( off ).toBe( '' );
	} );
} );
