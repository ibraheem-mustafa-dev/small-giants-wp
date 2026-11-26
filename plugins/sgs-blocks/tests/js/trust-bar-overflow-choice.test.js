/**
 * The trust bar's Overflow control writes the root marquee layer (one stored value, Spec 02 trust bar "Overflow"):
 * Ticker adds the default overflow layer, Wrap and Hide extras remove it, a ranged layer keeps its range, a layer at
 * every width hides the control, and the layer is found by its effect, never by its id.
 */
const {
	marqueeLayerOf,
	marqueeRangeKind,
	overflowChoices,
	overflowChoiceOf,
	withOverflowChoice,
} = require( '../../src/blocks/trust-bar/overflow-choice' );
const DEFAULT_TICKER_LAYER = require( '../../includes/motion/data/trust-bar-default-ticker.json' );

const withMarquee = ( values, id = 'mmtag', extra = [] ) => ( {
	v: 1,
	elements: {
		root: {
			effects: [ ...extra, { id, effect: 'marquee', values } ],
		},
	},
} );

describe( 'trust bar overflow choice', () => {
	test( 'Ticker on a bar with no marquee stores the default overflow layer', () => {
		const out = withOverflowChoice( undefined, 'ticker' );
		expect( out.refused ).toBeUndefined();
		expect( out.overflowMode ).toBe( 'ticker' );
		const layer = marqueeLayerOf( out.sgsMotion );
		expect( layer.effect ).toBe( 'marquee' );
		expect( layer.values ).toEqual( DEFAULT_TICKER_LAYER.values );
		expect( layer.values.belowBreakpoint ).toBe( 'overflow' );
		expect( overflowChoiceOf( out.sgsMotion, out.overflowMode ) ).toBe(
			'ticker'
		);
	} );

	test( "Ticker keeps a bar's other layers", () => {
		const fade = { id: 'fade-1', effect: 'ambient-float', values: {} };
		const motion = { v: 1, elements: { root: { effects: [ fade ] } } };
		const out = withOverflowChoice( motion, 'ticker' );
		expect( out.sgsMotion.elements.root.effects[ 0 ] ).toEqual( fade );
		expect( marqueeLayerOf( out.sgsMotion ).values.belowBreakpoint ).toBe(
			'overflow'
		);
	} );

	test( 'Wrap and Hide extras remove an overflow layer, found by its effect whatever its id', () => {
		const motion = withMarquee( {
			speed: 30,
			belowBreakpoint: 'overflow',
		} );
		for ( const choice of [ 'wrap', 'drop' ] ) {
			const out = withOverflowChoice( motion, choice );
			expect( marqueeLayerOf( out.sgsMotion ) ).toBeUndefined();
			expect( out.overflowMode ).toBe( choice );
			expect( overflowChoiceOf( out.sgsMotion, out.overflowMode ) ).toBe(
				choice
			);
		}
	} );

	test( 'a layer saved without an id is removed alone', () => {
		const other = { effect: 'ambient-float', values: {} };
		const motion = {
			v: 1,
			elements: {
				root: {
					effects: [
						other,
						{
							effect: 'marquee',
							values: { belowBreakpoint: 'overflow' },
						},
					],
				},
			},
		};
		const out = withOverflowChoice( motion, 'wrap' );
		expect( out.sgsMotion.elements.root.effects ).toEqual( [ other ] );
	} );

	test( 'a mobile-only layer keeps its range: Wrap and Hide extras set only what happens outside it', () => {
		// A marquee limited to the phone with Hide extras above it (what Fill writes for a draft whose ticker runs below 768).
		const motion = withMarquee( {
			touchPause: 'hold',
			belowBreakpoint: 'mobile',
		} );
		expect( overflowChoices( motion ) ).toEqual( [ 'wrap', 'drop' ] );
		const out = withOverflowChoice( motion, 'drop' );
		expect( out.sgsMotion ).toBe( motion );
		expect( out.overflowMode ).toBe( 'drop' );
		expect( withOverflowChoice( motion, 'ticker' ).refused ).toMatch(
			/own width range/
		);
	} );

	test( 'a layer at every width hides the control; no range counts as every width', () => {
		expect(
			overflowChoices( withMarquee( { belowBreakpoint: 'always' } ) )
		).toEqual( [] );
		expect(
			overflowChoices( withMarquee( { pauseOnTouch: true } ) )
		).toEqual( [] );
		expect( marqueeRangeKind( withMarquee( {} ) ) ).toBe( 'every' );
	} );

	test( 'no layer shows Wrap, or Hide extras when stored, never Ticker: nothing scrolls without a layer', () => {
		expect( overflowChoices( undefined ) ).toEqual( [
			'ticker',
			'wrap',
			'drop',
		] );
		expect( overflowChoiceOf( undefined, 'ticker' ) ).toBe( 'wrap' );
		expect( overflowChoiceOf( undefined, undefined ) ).toBe( 'wrap' );
		expect( overflowChoiceOf( undefined, 'drop' ) ).toBe( 'drop' );
		expect(
			overflowChoiceOf(
				{ v: 1, elements: { root: { effects: 'x' } } },
				'wrap'
			)
		).toBe( 'wrap' );
	} );
} );
