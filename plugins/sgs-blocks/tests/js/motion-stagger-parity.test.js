/**
 * Stagger parity, the JS side (Spec 38A FR-38A-24). `src/components/motion/stagger-delays.js` is the single source of
 * truth; this test pins its output to the shared fixture, which `tests/php/run-motion-stagger-parity-standalone.php`
 * holds `Sgs_Motion_Stagger` to as well. A change to either implementation that moves a delay fails one of the two.
 */
const fixture = require( '../fixtures/motion/stagger-parity-cases.json' );
const {
	computeStaggerDelays,
	computeCloseDelays,
} = require( '../../src/components/motion/stagger-delays' );

describe( 'stagger parity fixture', () => {
	it( 'carries the cases the PHP mirror is held to', () => {
		expect( fixture.cases.length ).toBeGreaterThanOrEqual( 40 );
	} );

	it.each( fixture.cases.map( ( c ) => [ c.name, c ] ) )(
		'%s',
		( name, testCase ) => {
			const actual =
				'close' === testCase.kind
					? computeCloseDelays( testCase.delays, testCase.direction )
					: computeStaggerDelays( testCase.settings );
			expect( actual ).toEqual( testCase.expected );
		}
	);
} );
