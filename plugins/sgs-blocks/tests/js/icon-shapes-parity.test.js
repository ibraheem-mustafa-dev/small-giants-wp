/**
 * Icon shape registry parity (icon plan D2, Phase D): PHP and the editor read the same includes/data/icon-shapes.json
 * and derive the same things from it. Runs the PHP side (tests/php/fixtures/icon-shapes-dump.php) and compares, value
 * for value, with the JS twins: the outlines as read, the shape list, the width-only rule, the outline SVG markup
 * (canvas twin vs render), the stroke for a set of border inputs and the two CSS length validators the stroke reads
 * through (src/utils/css-length.js vs helpers-css-safety.php). Also asserts no shipped source outside the
 * registry carries an outline path.
 *
 * Negative control: 'a planted divergence is caught' feeds the comparison a changed path and expects it to differ.
 */

const { execFileSync } = require( 'child_process' );
const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );
const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

import { OUTLINE_SHAPES, SHAPE_SLUGS, shapeUsesWidthOnly } from '../../src/utils/icon-shapes';
import { outlineStroke } from '../../src/blocks/icon/icon-state';
import { CanvasOutline } from '../../src/blocks/icon/shape-options';
import { cssLengthValue, cssSingleLengthValue } from '../../src/utils/css-length';

const PLUGIN = path.resolve( __dirname, '..', '..' );

const STROKES = [
	{ box: { top: '2px' }, style: 'solid' },
	{ box: { right: '3px' }, style: '' },
	{ box: { top: '1px', left: '4px' }, style: 'dashed' },
	{ box: { bottom: '0.5rem' }, style: 'dotted' },
	{ box: { top: '2px' }, style: 'double' },
	{ box: { top: '2px' }, style: 'none' },
	{ box: { top: '2' }, style: 'solid' },
	{ box: { top: 'var(--wp--preset--spacing--10)' }, style: 'solid' },
	{ box: { top: 'calc(1px + 1px)' }, style: 'solid' },
	{ box: { top: '1px 2px' }, style: 'solid' },
	{ box: { top: 'calc(1px) 2px' }, style: 'solid' },
	{ box: { top: '2px;}body{color:red' }, style: 'solid' },
	{ box: { top: 'url(x)' }, style: 'solid' },
	{ box: { top: 'inherit' }, style: 'solid' },
	{ box: {}, style: 'solid' },
	{ box: null, style: 'solid' },
	{ box: { top: 'inherit', right: '2px' }, style: 'solid' },
	{ box: { top: '0', left: '5px' }, style: 'dashed' },
	{ box: { top: 'clamp(1px, 0.2vw, 3px)' }, style: 'ridge' },
	{ box: { top: true }, style: 'solid' },
];

const LENGTHS = [
	'2px', '2', ' 2px ', '0', '0.5rem', '1px 2px', 'calc(1px) 2px', 'calc(100% - (2 * 4px))', 'CALC(1px + 1px)', 'clamp(1px, 0.2vw, 3px)',
	'var(--wp--preset--spacing--10)', 'min(1px, max(2px, 3px))', 'calc(1px', 'calc(1px))', '2px;}body{', 'calc(}body{)', 'url(x)',
	'expression(1)', 'inherit', '-1px', '1e3px', 'a&b', 'calc(1px & 2px)', '1px /* x */', '',
];

let php;

beforeAll( () => {
	const input = path.join( os.tmpdir(), `sgs-shape-parity-${ process.pid }.json` );
	fs.writeFileSync( input, JSON.stringify( { strokes: STROKES, lengths: LENGTHS } ) );
	try {
		php = JSON.parse( execFileSync( 'php', [ path.join( PLUGIN, 'tests/php/fixtures/icon-shapes-dump.php' ), input ], { encoding: 'utf8' } ) );
	} finally {
		fs.unlinkSync( input );
	}
} );

/** The canvas outline as markup, with its instance clip id swapped for PHP's fixed one. */
const canvasMarkup = ( shape ) => {
	const container = document.createElement( 'div' );
	const root = createRoot( container );
	act( () => root.render( React.createElement( CanvasOutline, { shape } ) ) );
	const html = container.innerHTML;
	act( () => root.unmount() );
	return html.replace( /sgs-icn-ed-[^"#)]+-oc/g, 'CLIP' ).replace( /><\/path>/g, '/>' );
};

describe( 'icon shape registry parity', () => {
	it( 'both sides read the same outlines in the same order', () => {
		expect( OUTLINE_SHAPES.map( ( s ) => ( { ...s } ) ) ).toEqual( php.outlines );
		expect( OUTLINE_SHAPES.map( ( s ) => s.slug ) ).toEqual( [ 'hexagon', 'diamond', 'octagon', 'star', 'blob' ] );
	} );

	it( 'the shape list and the width-only rule match', () => {
		expect( [ ...SHAPE_SLUGS ] ).toEqual( php.slugs );
		Object.entries( php.width_only ).forEach( ( [ slug, phpValue ] ) => {
			expect( [ slug, shapeUsesWidthOnly( '(empty)' === slug ? '' : slug ) ] ).toEqual( [ slug, phpValue ] );
		} );
	} );

	it( 'the canvas draws the same SVG render.php prints', () => {
		Object.entries( php.svg ).forEach( ( [ slug, phpSvg ] ) => {
			expect( [ slug, canvasMarkup( '(empty)' === slug ? '' : slug ) ] ).toEqual( [ slug, phpSvg ] );
		} );
		expect( php.svg.hexagon ).toContain( 'aria-hidden="true" focusable="false"' );
	} );

	it( 'the stroke rule matches', () => {
		expect( STROKES.map( ( c ) => outlineStroke( c.box, c.style, [] ) ) ).toEqual( php.strokes );
	} );

	it( 'the two length validators match', () => {
		expect( LENGTHS.map( ( v ) => cssLengthValue( v, [] ) ) ).toEqual( php.lengths );
		expect( LENGTHS.map( ( v ) => cssSingleLengthValue( v, [] ) ) ).toEqual( php.singles );
	} );

	it( 'a planted divergence is caught', () => {
		const tampered = OUTLINE_SHAPES.map( ( s ) => ( 'diamond' === s.slug ? { ...s, d: 'M50 0L100 50L50 100Z' } : { ...s } ) );
		expect( tampered ).not.toEqual( php.outlines );
	} );

	it( 'no other shipped source copies an outline path', () => {
		const offenders = [];
		const walk = ( dir ) => {
			for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
				const full = path.join( dir, entry.name );
				if ( entry.isDirectory() ) {
					walk( full );
				} else if ( /\.(js|php|css|json)$/.test( entry.name ) && ! full.endsWith( path.join( 'data', 'icon-shapes.json' ) ) ) {
					const text = fs.readFileSync( full, 'utf8' );
					OUTLINE_SHAPES.forEach( ( s ) => {
						if ( text.includes( s.d ) ) {
							offenders.push( `${ path.relative( PLUGIN, full ).replace( /\\/g, '/' ) }: ${ s.slug }` );
						}
					} );
				}
			}
		};
		walk( path.join( PLUGIN, 'src' ) );
		walk( path.join( PLUGIN, 'includes' ) );
		expect( offenders ).toEqual( [] );
	} );
} );
