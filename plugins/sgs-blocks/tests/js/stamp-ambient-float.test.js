/**
 * Ambient float phase stamping (Spec 38A FR-38A-37): the phase is written once, inside [0, period), through the
 * on-add hook; an existing phase and any other effect are left alone.
 */

const {
	applyOnAddRules,
} = require( '../../src/blocks/extensions/motion/layers/stamp' );
const {
	stampAmbientFloatPhase,
	DEFAULT_PERIOD_MS,
} = require( '../../src/blocks/extensions/motion/layers/stamp-ambient-float' );

const CONTEXT = { target: 'root', list: 'effects.effects', panel: 'effects' };

describe( 'ambient float phase', () => {
	test( 'is written through the on-add hook, a whole number in [0, period)', () => {
		for ( let i = 0; i < 50; i++ ) {
			const result = applyOnAddRules(
				{ id: 'a', effect: 'ambient-float', values: { period: 3000 } },
				CONTEXT
			);
			const { phase } = result.values;
			expect( Number.isInteger( phase ) ).toBe( true );
			expect( phase ).toBeGreaterThanOrEqual( 0 );
			expect( phase ).toBeLessThan( 3000 );
			expect( result.values.period ).toBe( 3000 );
		}
	} );

	test( 'uses the default period when the layer stores none', () => {
		const top = stampAmbientFloatPhase(
			{ effect: 'ambient-float', values: {} },
			() => 0.9999999
		);
		expect( top.values.phase ).toBe( DEFAULT_PERIOD_MS - 1 );
		const bottom = stampAmbientFloatPhase(
			{ effect: 'ambient-float' },
			() => 0
		);
		expect( bottom.values.phase ).toBe( 0 );
	} );

	test( 'two layers do not all get the same phase', () => {
		const phases = new Set();
		for ( let i = 0; i < 20; i++ ) {
			phases.add(
				stampAmbientFloatPhase( {
					effect: 'ambient-float',
					values: { period: 60000 },
				} ).values.phase
			);
		}
		expect( phases.size ).toBeGreaterThan( 1 );
	} );

	test( 'an existing phase is never overwritten, including 0', () => {
		for ( const phase of [ 0, 1234 ] ) {
			const layer = {
				effect: 'ambient-float',
				values: { period: 5000, phase },
			};
			expect( stampAmbientFloatPhase( layer, () => 0.5 ) ).toBe( layer );
			expect( applyOnAddRules( layer, CONTEXT ).values.phase ).toBe(
				phase
			);
		}
	} );

	test( 'does not mutate the layer it was given', () => {
		const layer = { effect: 'ambient-float', values: { period: 2000 } };
		stampAmbientFloatPhase( layer, () => 0.5 );
		expect( layer.values.phase ).toBeUndefined();
	} );

	test( 'NEGATIVE CONTROL: another effect is untouched', () => {
		const layer = { id: 'b', effect: 'sheen', values: { angle: 20 } };
		expect( stampAmbientFloatPhase( layer, () => 0.5 ) ).toBe( layer );
		expect( applyOnAddRules( layer, CONTEXT ) ).toEqual( layer );
	} );
} );
