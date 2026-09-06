/**
 * Regression tests for the gradient picker's parse/seed path.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Switching any colour row from "Solid" to "Gradient" replaced the block with
 * "This block has encountered an error and cannot be previewed."
 *
 * `gradientParser.parse()` does NOT throw for an empty string — it returns an
 * EMPTY ARRAY. The forked-from-core `try/catch` only covered the throwing
 * shape, so `[0]` was `undefined` and the next property read threw a
 * TypeError. Core never saw it because a core gradient attribute is
 * `undefined` when unset; every SGS gradient attribute defaults to `""` (96 of
 * them across 36 blocks), so it fired on the very first click, on every block.
 *
 * None of the ~50 prebuild gates could catch this: they are static source
 * checks, and none of them mounts a control and clicks it. This test is the
 * defence.
 */

import gradientParser from 'gradient-parser';

import { getGradientAstWithDefault } from '../../src/components/gradient-picker/utils';
import { buildPaletteDefaultGradient } from '../../src/components/gradient-picker/palette-default';
import { DEFAULT_GRADIENT } from '../../src/components/gradient-picker/constants';

/** A palette shaped like the real `useSettings( 'color.palette' )` output. */
const PALETTE = [
	{ slug: 'primary', color: '#1F7A7A', name: 'Primary' },
	{ slug: 'primary-text', color: '#F1F5F9', name: 'Primary text' },
	{ slug: 'accent', color: '#F59E0B', name: 'Accent' },
];

const VALID_GRADIENT =
	'linear-gradient(90deg, rgb(255,0,0) 0%, rgb(0,0,255) 100%)';
const VAR_GRADIENT =
	'linear-gradient(135deg, var(--wp--preset--color--primary) 0%, var(--wp--preset--color--accent) 100%)';

describe( 'negative control — the defect was real and this test can fail', () => {
	/**
	 * The pre-fix implementation, reproduced verbatim. If this ever STOPS
	 * throwing, `gradient-parser` changed its contract and the guard in
	 * `utils.js` needs re-deriving rather than trusting.
	 */
	function preFixGetGradientAstWithDefault( value ) {
		let gradientAST;
		let hasGradient = !! value;
		const valueToParse = value ?? DEFAULT_GRADIENT;
		try {
			gradientAST = gradientParser.parse( valueToParse )[ 0 ];
		} catch ( error ) {
			gradientAST = gradientParser.parse( DEFAULT_GRADIENT )[ 0 ];
			hasGradient = false;
		}
		// The exact line that crashed the block.
		if (
			! Array.isArray( gradientAST.orientation ) &&
			gradientAST.orientation?.type === 'directional'
		) {
			gradientAST.orientation = { type: 'angular', value: '180' };
		}
		return { gradientAST, hasGradient };
	}

	it( 'the OLD implementation crashes on an empty string', () => {
		expect( () => preFixGetGradientAstWithDefault( '' ) ).toThrow(
			TypeError
		);
	} );

	it( 'the OLD implementation crashes on a whitespace-only string', () => {
		expect( () => preFixGetGradientAstWithDefault( '   ' ) ).toThrow(
			TypeError
		);
	} );

	it( 'parse() returns an empty array rather than throwing — the root cause', () => {
		expect( gradientParser.parse( '' ) ).toEqual( [] );
		expect( gradientParser.parse( '' )[ 0 ] ).toBeUndefined();
	} );
} );

describe( 'getGradientAstWithDefault — never throws for an unset value', () => {
	it.each( [
		[ 'empty string (the SGS default for every gradient attribute)', '' ],
		[ 'whitespace-only string', '   ' ],
		[ 'undefined', undefined ],
		[ 'null', null ],
	] )( 'recovers from %s without warning (this is the normal path)', ( _label, value ) => {
		let result;
		expect( () => {
			result = getGradientAstWithDefault( value );
		} ).not.toThrow();

		expect( result.hasGradient ).toBe( false );
		expect( result.gradientAST ).toBeTruthy();
		expect( Array.isArray( result.gradientAST.colorStops ) ).toBe( true );
		expect( result.gradientAST.colorStops.length ).toBeGreaterThan( 1 );
	} );

	it( 'recovers from unparseable garbage AND warns, because a stored value was lost', () => {
		let result;
		expect( () => {
			result = getGradientAstWithDefault( 'not-a-gradient' );
		} ).not.toThrow();

		expect( result.hasGradient ).toBe( false );
		expect( result.gradientAST.colorStops.length ).toBeGreaterThan( 1 );
		// The operator had a value that could not be read — that is worth
		// surfacing, unlike the unset case above.
		expect( console ).toHaveWarned();
	} );

	it( 'keeps a real stored gradient and reports hasGradient', () => {
		const { gradientAST, hasGradient } =
			getGradientAstWithDefault( VALID_GRADIENT );

		expect( hasGradient ).toBe( true );
		expect( gradientAST.type ).toBe( 'linear-gradient' );
		expect( gradientAST.orientation.value ).toBe( '90' );
		expect( gradientAST.colorStops ).toHaveLength( 2 );
	} );

	it( 'round-trips palette-linked var() colour stops', () => {
		const { gradientAST, hasGradient } =
			getGradientAstWithDefault( VAR_GRADIENT );

		expect( hasGradient ).toBe( true );
		expect( gradientAST.colorStops.map( ( s ) => s.type ) ).toEqual( [
			'var',
			'var',
		] );
		expect( gradientAST.colorStops[ 0 ].value ).toBe(
			'--wp--preset--color--primary'
		);
	} );
} );

describe( 'getGradientAstWithDefault — brand-palette seed', () => {
	it( 'starts an unset picker from the supplied brand seed, not blue/purple', () => {
		const seed = buildPaletteDefaultGradient( PALETTE );
		const { gradientAST, hasGradient } = getGradientAstWithDefault( '', seed );

		expect( hasGradient ).toBe( false );
		expect( gradientAST.colorStops.map( ( s ) => s.value ) ).toEqual( [
			'--wp--preset--color--primary',
			'--wp--preset--color--accent',
		] );
	} );

	it( 'still recovers when the supplied default is itself unparseable', () => {
		let result;
		expect( () => {
			result = getGradientAstWithDefault( '', 'nonsense-default' );
		} ).not.toThrow();

		expect( result.hasGradient ).toBe( false );
		expect( result.gradientAST.colorStops.length ).toBeGreaterThan( 1 );
	} );
} );

describe( 'buildPaletteDefaultGradient', () => {
	it( 'prefers the primary -> accent pair', () => {
		expect( buildPaletteDefaultGradient( PALETTE ) ).toBe(
			'linear-gradient(135deg, var(--wp--preset--color--primary) 0%, var(--wp--preset--color--accent) 100%)'
		);
	} );

	it( 'falls back to the first two entries when primary/accent are absent', () => {
		const result = buildPaletteDefaultGradient( [
			{ slug: 'ink', color: '#111' },
			{ slug: 'paper', color: '#fff' },
		] );

		expect( result ).toBe(
			'linear-gradient(135deg, var(--wp--preset--color--ink) 0%, var(--wp--preset--color--paper) 100%)'
		);
	} );

	it( 'produces a string gradient-parser can actually read', () => {
		const seed = buildPaletteDefaultGradient( PALETTE );
		expect( () => gradientParser.parse( seed ) ).not.toThrow();
		expect( gradientParser.parse( seed ) ).toHaveLength( 1 );
	} );

	it.each( [
		[ 'a palette with fewer than two colours', [ { slug: 'only' } ] ],
		[ 'an empty palette', [] ],
		[ 'a non-array (settings not loaded yet)', undefined ],
		[ 'a palette whose slugs are unusable', [ { slug: 'a b' }, { slug: '' } ] ],
		[
			'a palette that would gradient a colour into itself',
			[ { slug: 'primary' }, { slug: 'primary' } ],
		],
	] )( 'returns null for %s', ( _label, palette ) => {
		expect( buildPaletteDefaultGradient( palette ) ).toBeNull();
	} );
} );
