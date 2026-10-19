// The page baseline Fill compares inherited properties with at the top of a surface (R-47-5): calibration deliberately
// records no default for an inherited property (lib/calibrate-props.mjs::INHERITED), and the page's parent is not built
// yet, so the value the page shows comes from the client's theme snapshot: root typography and colour, then the
// element styles (heading, h1..h6) that apply to the node's tag.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pageBaseline, lineHeightPx, INITIAL } from '../lib/fill-page.mjs';

const RAW = {
	settings: {
		color: { palette: [ { slug: 'text', color: '#141414' }, { slug: 'primary', color: '#141414' }, { slug: 'cream', color: '#FAF8F5' } ] },
		typography: {
			fontFamilies: [ { slug: 'body', fontFamily: 'Outfit, system-ui, sans-serif' }, { slug: 'heading', fontFamily: '"Playfair Display", serif' } ],
			fontSizes: [ { slug: 'regular', size: '16px' }, { slug: 'large', size: '20px' }, { slug: 'fluid', size: 'clamp(1rem, 2vw, 2rem)' } ],
		},
	},
	styles: {
		typography: { fontFamily: 'var:preset|font-family|body', fontSize: 'var:preset|font-size|regular', lineHeight: '1.5', fontWeight: '400' },
		color: { text: 'var:preset|color|text' },
		elements: {
			heading: { typography: { fontFamily: 'var:preset|font-family|heading', fontWeight: '500', lineHeight: '1.0' } },
			h1: { typography: { fontSize: '63.36px', fontFamily: 'var:preset|font-family|heading', lineHeight: '1.0' } },
			h4: { typography: { fontSize: 'var:preset|font-size|large' } },
			h6: { typography: { textTransform: 'uppercase', letterSpacing: '0.08em' } },
		},
	},
};

test( 'MUST FAIL: the body baseline is the snapshot\'s root typography and text colour, presets resolved to the values they name', () => {
	const b = pageBaseline( RAW, 'p' );
	assert.equal( b.value( 'font-family', 1440 ), 'Outfit, system-ui, sans-serif' );
	assert.equal( b.value( 'font-size', 375 ), '16px' );
	assert.equal( b.value( 'font-weight', 768 ), '400' );
	assert.equal( b.value( 'color', 1440 ), 'rgb(20, 20, 20)' );
	assert.equal( b.value( 'line-height', 1440, 16 ), '24px', 'a unitless 1.5 is a ratio of the element\'s own font size' );
	assert.equal( b.value( 'line-height', 1440, 12 ), '18px' );
} );

test( 'a heading tag layers the heading and its own element style over the root: family, weight, size and line height of the theme', () => {
	const h1 = pageBaseline( RAW, 'h1' );
	assert.equal( h1.value( 'font-family', 1440 ), '"Playfair Display", serif' );
	assert.equal( h1.value( 'font-weight', 1440 ), '500', 'from the generic heading style' );
	assert.equal( h1.value( 'font-size', 1440 ), '63.36px' );
	assert.equal( h1.value( 'line-height', 1440, 48 ), '48px', 'a ratio of 1.0' );
	assert.equal( h1.own( 'font-family' ), true, 'a theme element style beats what a parent block shows' );
	assert.equal( pageBaseline( RAW, 'p' ).own( 'font-family' ), false, 'a paragraph has no element style: its parent decides' );
	const h4 = pageBaseline( RAW, 'h4' );
	assert.equal( h4.value( 'font-size', 1440 ), '20px', 'a preset font size on an element resolves' );
	assert.equal( h4.value( 'font-family', 1440 ), '"Playfair Display", serif', 'h4 has no family of its own, the generic heading style gives it' );
	const h6 = pageBaseline( RAW, 'h6' );
	assert.equal( h6.value( 'text-transform', 1440 ), 'uppercase' );
	assert.equal( h6.value( 'letter-spacing', 1440 ), '0.08em' );
} );

test( 'an inherited property the snapshot does not set takes the CSS initial value; a size it cannot give as px is unknown', () => {
	const b = pageBaseline( RAW, 'p' );
	assert.equal( b.value( 'font-style', 1440 ), 'normal' );
	assert.equal( b.value( 'text-align', 1440 ), 'start' );
	assert.equal( b.value( 'text-wrap', 1440 ), 'wrap' );
	assert.equal( b.value( 'text-shadow', 1440 ), 'none' );
	assert.equal( b.value( 'text-transform', 1440 ), 'none' );
	assert.equal( b.value( 'letter-spacing', 1440 ), 'normal' );
	assert.deepEqual( Object.keys( INITIAL ).sort(), [ 'font-style', 'letter-spacing', 'text-align', 'text-shadow', 'text-transform', 'text-wrap' ] );
	const fluid = pageBaseline( { ...RAW, styles: { ...RAW.styles, typography: { ...RAW.styles.typography, fontSize: 'var:preset|font-size|fluid' } } }, 'p' );
	assert.equal( fluid.value( 'font-size', 1440 ), undefined, 'a clamp() preset is not a px baseline' );
	assert.equal( fluid.value( 'line-height', 1440 ), undefined, 'and a ratio with no own font size is unknown' );
} );

test( 'a snapshot with no styles gives only the initial values, and an unknown tag falls back to the root', () => {
	const b = pageBaseline( { settings: {}, styles: {} }, 'p' );
	assert.equal( b.value( 'font-family', 1440 ), undefined );
	assert.equal( b.value( 'font-style', 1440 ), 'normal' );
	assert.equal( pageBaseline( RAW, 'main' ).value( 'font-family', 1440 ), 'Outfit, system-ui, sans-serif' );
	assert.equal( pageBaseline( RAW, undefined ).value( 'font-size', 1440 ), '16px' );
} );

test( 'lineHeightPx turns a ratio into px at a font size and reads a px value back, rounding to 0.01', () => {
	assert.equal( lineHeightPx( 1.5, 13 ), '19.5px' );
	assert.equal( lineHeightPx( 1.02, 48 ), '48.96px' );
	assert.equal( lineHeightPx( '24px', 99 ), '24px' );
	assert.equal( lineHeightPx( undefined, 16 ), undefined );
} );
