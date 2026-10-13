/**
 * The frozen legacy stagger fixture (Spec 38A FR-38A-20): its shape, a row per legacy case, and every delay
 * equal to min( index, clamp( max, 1, 50 ) ) * step. A planted wrong delay must be reported.
 */
const fixture = require( '../fixtures/motion/legacy-stagger-offset.json' );

const INDEXES = 12;
const STEPS = [ 0, 40, 55, 100 ];
const MAXES = [ 0, 3, 7, 8 ];
const MODES = [ 'own', 'children' ];
const ROW_KEYS = [ 'origin', 'mode', 'index', 'step', 'max', 'delay_ms' ].sort();

/**
 * Every problem found in a fixture.
 *
 * @param {Object} data Fixture.
 * @return {string[]} Problems; empty when the fixture is sound.
 */
function problems( data ) {
	const found = [];
	if ( 'sgs-legacy-stagger-fixture/1' !== data.schema ) {
		found.push( 'schema' );
	}
	if ( ! Array.isArray( data.rows ) ) {
		return found.concat( 'rows' );
	}
	const seen = new Set();
	data.rows.forEach( ( row, i ) => {
		if ( JSON.stringify( Object.keys( row ).sort() ) !== JSON.stringify( ROW_KEYS ) ) {
			found.push( 'row ' + i + ' keys' );
			return;
		}
		const maxEffective = Math.max( 1, Math.min( 50, row.max ) );
		const expected = Math.min( row.index, maxEffective ) * row.step;
		if ( row.delay_ms !== expected ) {
			found.push( 'row ' + i + ' delay ' + row.delay_ms + ' expected ' + expected );
		}
		seen.add( [ row.mode, row.index, row.step, row.max ].join( '|' ) );
	} );
	MODES.forEach( ( mode ) => {
		for ( let index = 0; index < INDEXES; index++ ) {
			STEPS.forEach( ( step ) => MAXES.forEach( ( max ) => {
				if ( ! seen.has( [ mode, index, step, max ].join( '|' ) ) ) {
					found.push( 'missing ' + [ mode, index, step, max ].join( '|' ) );
				}
			} ) );
		}
	} );
	return found;
}

describe( 'legacy stagger fixture', () => {
	it( 'holds a sound row for every legacy case', () => {
		expect( problems( fixture ) ).toEqual( [] );
		expect( fixture.rows ).toHaveLength( 2 * INDEXES * ( STEPS.length * MAXES.length + 1 ) );
	} );

	it( 'carries the stored eye-care step of 70ms with a cap of 7', () => {
		const stored = fixture.rows.filter( ( r ) => 'stored' === r.origin );
		expect( stored.length ).toBe( 2 * INDEXES );
		expect( stored.every( ( r ) => 70 === r.step && 7 === r.max ) ).toBe( true );
		expect( stored.find( ( r ) => 'own' === r.mode && 11 === r.index ).delay_ms ).toBe( 490 );
	} );

	it( 'does not contain the retired function name', () => {
		expect( JSON.stringify( fixture ) ).not.toContain( 'stagger' + 'Offset' );
	} );

	it( 'reports a planted wrong delay', () => {
		const planted = JSON.parse( JSON.stringify( fixture ) );
		planted.rows[ 5 ].delay_ms += 1;
		expect( problems( planted ) ).toHaveLength( 1 );
		expect( problems( planted )[ 0 ] ).toMatch( /^row 5 delay/ );
	} );
} );
