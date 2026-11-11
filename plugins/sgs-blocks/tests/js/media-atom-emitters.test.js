/**
 * Spec 49 C3 emitters of the `sizing`, `shape`, `filter` and `layout` atoms, their C4 disclosure rules, the FR-49-12
 * value helpers and the registry's separation of the new atoms. The PHP twin is held to the same output by
 * `scripts/tests/test-media-emitter-parity.mjs`; the sizing cases are `tests/fixtures/media/sizing-cases.json`.
 */

import sizingCases from '../fixtures/media/sizing-cases.json';
import { emit as sizing, disclosure as sizingDisclosure } from '../../src/components/media/atoms/sizing';
import { emit as shape, disclosure as shapeDisclosure } from '../../src/components/media/atoms/shape';
import { emit as filter, disclosure as filterDisclosure } from '../../src/components/media/atoms/filter';
import { emit as layout } from '../../src/components/media/atoms/layout';
import { emit as shadow } from '../../src/components/media/atoms/shadow';
import { emit as overlay } from '../../src/components/media/atoms/overlay';
import { emit as opacity } from '../../src/components/media/atoms/opacity';
import { emit as focal } from '../../src/components/media/atoms/focal-point';
import { emit as objectFit } from '../../src/components/media/atoms/object-fit';
import { MEDIA_EMITTERS } from '../../src/components/media/emit/emitters';
import { mediaColour, mediaFilter, mediaLength, mediaShadow, mediaUrl } from '../../src/components/media/emit/values';
import { cssLengthValue } from '../../src/utils/css-length';
import {
	ALL_MEDIA_ATOMS,
	KINDS_ATOM_IDS,
	MEDIA_ATOMS,
	MEDIA_ATOM_IDS,
} from '../../src/components/media/atoms/registry';

const SLOT = { prefix: 'm' };
const attrsOf = ( settings, file = sizingCases.context.file ) => {
	const attrs = { mSource: { kind: 'image', width: file.width, height: file.height } };
	Object.entries( settings ).forEach( ( [ base, value ] ) => {
		attrs[ `m${ base }` ] = value;
	} );
	return attrs;
};

/** `.u{a:b;}@media(max-width:767px){.u{c:d;}}` as `{ selector: { device: { prop: value } } }`. */
function parse( css ) {
	const out = {};
	const re = /(?:@media\(max-width:(\d+)px\)\{)?([^{}@]+)\{([^{}]*)\}\}?/g;
	let m;
	while ( ( m = re.exec( css ) ) !== null ) {
		const device = { 1023: 'tablet', 767: 'mobile' }[ m[ 1 ] ] || 'desktop';
		out[ m[ 2 ] ] ??= {};
		out[ m[ 2 ] ][ device ] = Object.fromEntries(
			m[ 3 ]
				.split( ';' )
				.filter( Boolean )
				.map( ( d ) => [ d.slice( 0, d.indexOf( ':' ) ), d.slice( d.indexOf( ':' ) + 1 ) ] )
		);
	}
	return out;
}

describe( 'sizing emitter against sizing-cases.json', () => {
	const tiered = ( d ) => ( 'desktop' in d || 'tablet' in d || 'mobile' in d ? d : { desktop: d } );
	[ ...sizingCases.cases, ...sizingCases.responsive ].forEach( ( c ) => {
		it( c.id, () => {
			const split = !! ( c.declarations.layout || c.declarations.surface );
			const css = sizing( { prefix: 'm', wrapper: split }, attrsOf( c.settings, c.file ), 'u', c.helper );
			const want = split
				? { '.u': tiered( c.declarations.layout || {} ), '.u .sgs-media-box': tiered( c.declarations.surface || {} ) }
				: { '.u': tiered( c.declarations.root ) };
			const got = parse( css );
			const nonEmpty = ( o ) => Object.fromEntries( Object.entries( o ).filter( ( [ , decls ] ) => Object.keys( decls ).length ) );
			Object.keys( want ).forEach( ( selector ) => {
				expect( got[ selector ] || {} ).toEqual( nonEmpty( want[ selector ] ) );
			} );
			expect( Object.keys( got ).sort() ).toEqual( Object.keys( want ).filter( ( s ) => Object.keys( nonEmpty( want[ s ] ) ).length ).sort() );
		} );
	} );

	it( 'prints nothing for a slot with nothing set and no helper', () => {
		expect( sizing( SLOT, {}, 'u', false ) ).toBe( '' );
	} );

	it( 'sorts properties and prints devices desktop, tablet, mobile', () => {
		const css = sizing( SLOT, attrsOf( { Ratio: '1 / 1', Height: { desktop: '300px', mobile: '200px' } } ), 'u', false );
		expect( css ).toBe( '.u{aspect-ratio:1 / 1;height:300px;width:auto;}@media(max-width:767px){.u{height:200px;}}' );
	} );

	it( 'prints no height for Match its space and drops the ratio', () => {
		const css = sizing( SLOT, attrsOf( { Height: 'fill', Ratio: '1 / 1' } ), 'u', true );
		expect( css ).toBe( '.u{width:100%;}' );
	} );
} );

describe( 'sizing disclosure', () => {
	it( 'omits Ratio while Height is Match its space, at that device only', () => {
		const attrs = attrsOf( { Height: { mobile: 'fill' } } );
		expect( sizingDisclosure( attrs, 'desktop', 'm' ).Ratio.state ).toBe( 'shown' );
		expect( sizingDisclosure( attrs, 'mobile', 'm' ).Ratio.state ).toBe( 'omitted' );
	} );

	it( 'shows every other setting', () => {
		const states = Object.entries( sizingDisclosure( {}, 'desktop', 'm' ) ).filter( ( [ base ] ) => 'Ratio' !== base );
		expect( states ).toHaveLength( 6 );
		states.forEach( ( [ , d ] ) => expect( d.state ).toBe( 'shown' ) );
	} );
} );

describe( 'shape emitter', () => {
	it( 'draws circle, ellipse and pill as border-radius on the surface', () => {
		const css = shape( SLOT, attrsOf( { Shape: { desktop: { shape: 'circle' }, tablet: 'pill' } } ), 'u', false );
		expect( css ).toBe( '.u{border-radius:50%;}@media(max-width:1023px){.u{border-radius:9999px;}}' );
	} );

	it( 'draws a registry shape as a mask on the mask layer and clears it where the device says none', () => {
		const css = shape( SLOT, attrsOf( { Shape: { desktop: { shape: 'hexagon' }, mobile: 'none' } } ), 'u', true );
		const got = parse( css );
		expect( got[ '.u .sgs-media-box__mask' ].desktop[ 'mask-image' ] ).toMatch( /^url\("data:image\/svg\+xml,%3Csvg/ );
		expect( got[ '.u .sgs-media-box__mask' ].desktop[ 'mask-size' ] ).toBe( 'contain' );
		expect( got[ '.u .sgs-media-box__mask' ].mobile ).toEqual( { '-webkit-mask-image': 'none', 'mask-image': 'none' } );
	} );

	it( 'stretches a registry shape to its box with mask-size 100% 100% when the slot says stretch', () => {
		const got = parse( shape( SLOT, attrsOf( { Shape: { shape: 'hexagon', proportions: 'stretch' } } ), 'u', true ) );
		expect( got[ '.u .sgs-media-box__mask' ].desktop[ 'mask-size' ] ).toBe( '100% 100%' );
	} );

	it( 'keeps proportions with mask-size contain and no preserveAspectRatio', () => {
		const css = shape( SLOT, attrsOf( { Shape: { shape: 'star', proportions: 'keep' } } ), 'u', true );
		expect( css ).toContain( 'mask-size:contain;' );
		expect( decodeURIComponent( css ) ).not.toContain( 'preserveAspectRatio' );
	} );

	it( 'prints corners per device and not on a device that has a shape', () => {
		const css = shape(
			SLOT,
			attrsOf( { Radius: { desktop: { topLeft: 8, bottomRight: '1rem' } }, Shape: { tablet: 'circle' } } ),
			'u',
			false
		);
		expect( css ).toBe( '.u{border-bottom-right-radius:1rem;border-top-left-radius:8px;}@media(max-width:1023px){.u{border-radius:50%;}}' );
	} );

	it( 'prints the border with its hover colour, and none with a mask', () => {
		const border = { BorderWidth: { top: 2, right: 2, bottom: 2, left: 2 }, BorderStyle: 'dashed', BorderColour: '#f00', BorderColourHover: 'secondary' };
		const css = shape( SLOT, attrsOf( border ), 'u', false );
		expect( css ).toContain( '.u{border-bottom-width:2px;border-color:#f00;border-left-width:2px;border-right-width:2px;border-style:dashed;border-top-width:2px;}' );
		expect( css ).toContain( '@media(hover:hover){.u:hover{border-color:var(--wp--preset--color--secondary, currentColor);}}' );
		expect( shape( SLOT, attrsOf( { ...border, Shape: { shape: 'hexagon' } } ), 'u', true ) ).not.toContain( 'border-' );
	} );

	it( 'disclosure: corners follow the shape, borders leave with a mask, style and colour wait for a width', () => {
		expect( shapeDisclosure( {}, 'desktop', 'm' ).Radius.state ).toBe( 'shown' );
		expect( shapeDisclosure( {}, 'desktop', 'm' ).BorderStyle.state ).toBe( 'disabled' );
		const circle = shapeDisclosure( attrsOf( { Shape: 'circle' } ), 'desktop', 'm' );
		expect( circle.Radius.state ).toBe( 'omitted' );
		expect( circle.BorderWidth.state ).toBe( 'shown' );
		const mask = shapeDisclosure( attrsOf( { Shape: { shape: 'hexagon' } } ), 'desktop', 'm' );
		expect( [ mask.BorderWidth.state, mask.BorderStyle.state, mask.BorderColour.state ] ).toEqual( [ 'omitted', 'omitted', 'omitted' ] );
	} );
} );

describe( 'filter emitter', () => {
	it( 'prints grayscale with the strength, brightness-invert for white, and none to cancel', () => {
		const css = filter( SLOT, attrsOf( { Colour: { desktop: 'greyscale', tablet: 'white', mobile: 'natural' }, Greyscale: 60 } ), 'u', false );
		expect( css ).toBe(
			'.u{filter:grayscale(60%);}@media(max-width:1023px){.u{filter:brightness(0) invert(1);}}@media(max-width:767px){.u{filter:none;}}'
		);
	} );

	it( 'defaults the strength to 100 and prints on the media element inside a helper', () => {
		expect( filter( SLOT, attrsOf( { Colour: 'greyscale' } ), 'u', true ) ).toBe( '.u .sgs-media-el{filter:grayscale(100%);}' );
	} );

	it( 'prints nothing for Natural', () => {
		expect( filter( SLOT, attrsOf( { Colour: 'natural' } ), 'u', false ) ).toBe( '' );
	} );

	it( 'disclosure: the strength shows with Black and white only', () => {
		expect( filterDisclosure( attrsOf( { Colour: 'greyscale' } ), 'desktop', 'm' ).Greyscale.state ).toBe( 'shown' );
		expect( filterDisclosure( attrsOf( { Colour: 'white' } ), 'desktop', 'm' ).Greyscale.state ).toBe( 'omitted' );
	} );
} );

describe( 'layout emitter', () => {
	it( 'prints Alignment as inline margins and Order clamped to -20 to 20, per device', () => {
		const css = layout( SLOT, attrsOf( { Alignment: { desktop: 'center', mobile: 'end' }, Order: { desktop: -3, mobile: 25 } } ), 'u', false );
		expect( css ).toBe(
			'.u{margin-inline-end:auto;margin-inline-start:auto;order:-3;}@media(max-width:767px){.u{margin-inline-end:0;margin-inline-start:auto;order:20;}}'
		);
	} );

	it( 'ignores an unknown alignment', () => {
		expect( layout( SLOT, attrsOf( { Alignment: 'sideways' } ), 'u', false ) ).toBe( '' );
	} );
} );

describe( 'the other atoms print real properties on the C3 nodes', () => {
	it( 'opacity and focal print on the media element', () => {
		expect( opacity( SLOT, attrsOf( { Opacity: { desktop: 100, tablet: 40 }, Blend: 'multiply' } ), 'u', true ) ).toBe(
			'.u .sgs-media-el{mix-blend-mode:multiply;}@media(max-width:1023px){.u .sgs-media-el{opacity:0.4;}}'
		);
		expect( focal( SLOT, attrsOf( { Focal: { x: 0.3, y: 0.7 } } ), 'u', false ) ).toBe( '.u{object-position:30% 70%;}' );
	} );

	it( 'object-fit prints Fit and the tile settings', () => {
		expect( objectFit( SLOT, attrsOf( { Fit: { desktop: 'contain', mobile: 'tile' }, TileSize: '80px' } ), 'u', false ) ).toBe(
			'.u{object-fit:contain;}@media(max-width:767px){.u{background-repeat:repeat;background-size:80px;}}'
		);
	} );

	it( 'overlay prints only with the helper, on its ::after, with the hover paint last', () => {
		const attrs = attrsOf( { OverlayColour: '#000', OverlayColourHover: '#111' } );
		expect( overlay( SLOT, attrs, 'u', false ) ).toBe( '' );
		const css = overlay( SLOT, attrs, 'u', true );
		expect( css.startsWith( '.u::after{background-color:#000;}' ) ).toBe( true );
		expect( css ).toContain( '@media(hover:hover){.u:hover::after{background-color:#111;}}' );
	} );

	it( 'shadow prints box-shadow with its forced-colours fallback, and a drop-shadow filter on a mask', () => {
		const attrs = attrsOf( { BoxShadow: '0 4px 12px', BoxShadowColour: '#00000040' } );
		expect( shadow( SLOT, attrs, 'u', false ) ).toContain( 'box-shadow:0px 4px 12px 0px #00000040;' );
		expect( shadow( SLOT, { ...attrs, mShape: { shape: 'hexagon' } }, 'u', true ) ).toContain( 'filter:drop-shadow(0px 4px 12px #00000040)' );
	} );
} );

describe( 'FR-49-12 value helpers', () => {
	it( 'refuses a bare number, unpaired quotes and adjacent terms inside min(), max() and clamp()', () => {
		[ '10', '10 px', 'min(10px 20px)', "var(--a, ')", 'var(--a, "x)', 'clamp(1rem 2rem, 1vw, 3rem)', '10px;}body{display:none' ].forEach( ( bad ) => {
			expect( mediaLength( bad ) ).toBe( '' );
		} );
	} );

	it( 'keeps real lengths', () => {
		[ '10px', 'calc(100% - 2rem)', 'clamp(1rem, 2vw + 1rem, 3rem)', 'min(100%, 40rem)', "var(--a, 'x y')", 'max(10px, 1vw)' ].forEach( ( v ) => {
			expect( mediaLength( v ) ).toBe( v );
		} );
		expect( mediaLength( 'auto', [ 'auto' ] ) ).toBe( 'auto' );
	} );

	it( 'gives every caller of the shared length helper the quote and adjacent-term checks', () => {
		expect( cssLengthValue( 'min(10px 20px)' ) ).toBe( '' );
		expect( cssLengthValue( "var(--a, ')" ) ).toBe( '' );
		expect( cssLengthValue( 'min(1px,2px) 3px' ) ).toBe( 'min(1px,2px) 3px' );
		expect( cssLengthValue( '16px 12px' ) ).toBe( '16px 12px' );
	} );

	it( 'colours: functional colours stay, a keyword stays, a slug becomes a preset, a breakout is refused', () => {
		expect( mediaColour( 'rgba(0,0,0,.5)' ) ).toBe( 'rgba(0,0,0,.5)' );
		expect( mediaColour( 'red' ) ).toBe( 'red' );
		expect( mediaColour( 'primary' ) ).toBe( 'var(--wp--preset--color--primary, currentColor)' );
		expect( mediaColour( 'red;background:url(x)' ) ).toBe( '' );
		expect( mediaColour( 'rgb(0,0,0' ) ).toBe( '' );
	} );

	it( 'shadow colours print as hex, the way sgs_colour_value() prints them', () => {
		expect( mediaShadow( '0 8px 24px', 'rgba(0,0,0,.25)' ) ).toBe( '0px 8px 24px 0px #00000040' );
		expect( mediaShadow( '0 8px 24px', 'hsl(200 50% 50%)' ) ).toBe( '0px 8px 24px 0px #4095BF' );
	} );

	it( 'filters and URLs', () => {
		expect( mediaFilter( 'greyscale', 250 ) ).toBe( 'grayscale(100%)' );
		expect( mediaFilter( 'natural', 50 ) ).toBe( '' );
		expect( mediaUrl( 'https://example.com/a.jpg' ) ).toBe( 'https://example.com/a.jpg' );
		[ 'javascript:alert(1)', 'data:text/html,<script>', '" onerror="alert(1)', '//evil.test/x' ].forEach( ( bad ) => {
			expect( mediaUrl( bad ) ).toBe( '' );
		} );
	} );
} );

describe( 'registry', () => {
	it( 'keeps the new atoms out of the legacy table, so no existing block gains a control or attribute', () => {
		expect( MEDIA_ATOM_IDS ).toHaveLength( 13 );
		KINDS_ATOM_IDS.forEach( ( id ) => {
			expect( MEDIA_ATOMS[ id ] ).toBeUndefined();
			expect( ALL_MEDIA_ATOMS[ id ].bases ).toEqual( [] );
		} );
		expect( KINDS_ATOM_IDS ).toEqual( [ 'sizing', 'shape', 'filter', 'layout' ] );
	} );

	it( 'splits box-shape', () => {
		expect( MEDIA_ATOMS[ 'box-shape' ].splitInto ).toEqual( [ 'sizing', 'shape' ] );
	} );

	it( 'carries one C1 setting per base of each new atom, with a control', () => {
		const bases = KINDS_ATOM_IDS.flatMap( ( id ) => ALL_MEDIA_ATOMS[ id ].settings.map( ( s ) => s.base ) );
		expect( bases ).toEqual( [ 'Ratio', 'Width', 'Height', 'MinWidth', 'MaxWidth', 'MinHeight', 'MaxHeight', 'Shape', 'Radius', 'BorderWidth', 'BorderStyle', 'BorderColour', 'Colour', 'Greyscale', 'Alignment', 'Order' ] );
		KINDS_ATOM_IDS.forEach( ( id ) => ALL_MEDIA_ATOMS[ id ].settings.forEach( ( s ) => expect( s.control.component ).toBeTruthy() ) );
	} );

	it( 'has an emitter for every atom, legacy and new', () => {
		Object.keys( ALL_MEDIA_ATOMS ).forEach( ( id ) => expect( typeof MEDIA_EMITTERS[ id ] ).toBe( 'function' ) );
	} );
} );
