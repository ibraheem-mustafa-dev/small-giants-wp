/**
 * The entrance clip reveal's corner radius (`clipRound`): the editor-canvas emitter writes the from and to radius
 * inputs, the stylesheets compose them into every `inset()` through one registered length, and an entrance without a
 * radius writes nothing extra.
 */

const fs = require( 'fs' );
const path = require( 'path' );

import { emitScopedCss } from '../../src/blocks/extensions/motion/canvas/emit-scoped-css';

const CSS_DIR = path.resolve( __dirname, '..', '..', 'assets', 'css' );
const read = ( file ) => fs.readFileSync( path.join( CSS_DIR, file ), 'utf8' );

const emit = ( from, to ) =>
	emitScopedCss(
		{
			v: 1,
			elements: {
				root: {
					entrance: {
						base: { trigger: 'load', values: { from, ...( to ? { to } : {} ), duration: 400 } },
					},
				},
			},
		},
		{ blockName: 'sgs/hero', elements: {}, root: '.sgs-m-x' }
	).css;

describe( 'entrance clip corner radius', () => {
	it( 'emits the from and to radius inputs', () => {
		const css = emit( { clip: 8, clipRound: 26 }, { clip: 0, clipRound: '22px' } );
		expect( css ).toContain( '--sgs-me-from-clip:8%;' );
		expect( css ).toContain( '--sgs-me-from-clip-round:26px;' );
		expect( css ).toContain( '--sgs-me-to-clip-round:22px;' );
	} );

	it( 'negative control: a clip with no radius emits no radius input', () => {
		const css = emit( { clip: 8 }, { clip: 0 } );
		expect( css ).toContain( '--sgs-me-from-clip:8%;' );
		expect( css ).not.toContain( 'clip-round' );
	} );

	it( 'composes the radius into every inset() through a registered length', () => {
		const motion = read( 'motion.css' );
		const triggers = read( 'motion-triggers.css' );
		expect( motion ).toContain( "@property --sgs-me-clip-round { syntax: '<length>'; inherits: false; initial-value: 0px; }" );
		expect( motion ).toContain( '--sgs-me-clip-round: var(--sgs-me-from-clip-round, 0px);' );
		expect( motion ).toContain( '--sgs-me-clip-round: var(--sgs-me-to-clip-round, 0px);' );
		expect( triggers ).toContain( '--sgs-me-clip-round: var(--sgs-me-close-to-clip-round, var(--sgs-me-from-clip-round, 0px));' );
		[ motion, triggers ].forEach( ( sheet ) => {
			expect( sheet ).not.toMatch( /var\(--sgs-me-clip-l\)\);/ );
			expect( sheet ).toContain( 'var(--sgs-me-clip-l) round var(--sgs-me-clip-round));' );
		} );
	} );
} );
