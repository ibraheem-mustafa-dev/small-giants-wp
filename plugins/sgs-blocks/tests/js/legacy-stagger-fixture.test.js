/**
 * The frozen legacy stagger fixture (Spec 38A FR-38A-20): its shape, a row per legacy case, and every delay
 * equal to min( index, clamp( max, 1, 50 ) ) * step. The default-cap, step-clamp and max-clamp rows restate the same
 * arithmetic for an absent max, an out-of-range step and an out-of-range max; the dom rows freeze the position rules
 * (repeat depth, nested animated blocks, page order) as small pages whose expected delay is checked for shape only.
 * A planted wrong row in any section must be reported.
 *
 * @jest-environment jsdom
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

const DEFAULT_CAP = 7;
const DEFAULT_CAP_KEYS = [ 'origin', 'mode', 'index', 'step', 'delay_ms' ].sort();
const STEP_CLAMP_KEYS = [ 'origin', 'mode', 'index', 'raw_step', 'max', 'delay_ms' ].sort();
const MAX_CLAMP_KEYS = [ 'origin', 'mode', 'index', 'step', 'raw_max', 'delay_ms' ].sort();
const DOM_KEYS = [ 'origin', 'case', 'description', 'html', 'delay_ms' ].sort();

const sameKeys = ( row, keys ) => JSON.stringify( Object.keys( row ).sort() ) === JSON.stringify( keys );

/**
 * Every problem found in the default-cap, step-clamp, max-clamp and dom sections.
 *
 * @param {Object} data Fixture.
 * @return {string[]} Problems; empty when the sections are sound.
 */
function extendedProblems( data ) {
	const found = [];
	const section = ( name, keys, check ) => {
		const rows = data[ name ];
		if ( ! Array.isArray( rows ) || 0 === rows.length ) {
			found.push( name + ' missing' );
			return;
		}
		rows.forEach( ( row, i ) => {
			if ( ! sameKeys( row, keys ) ) {
				found.push( name + ' ' + i + ' keys' );
				return;
			}
			const message = check( row );
			if ( message ) {
				found.push( name + ' ' + i + ' ' + message );
			}
		} );
	};
	section( 'default_cap_rows', DEFAULT_CAP_KEYS, ( row ) => {
		const expected = Math.min( row.index, DEFAULT_CAP ) * row.step;
		return row.delay_ms === expected ? '' : 'delay ' + row.delay_ms + ' expected ' + expected;
	} );
	section( 'step_clamp_rows', STEP_CLAMP_KEYS, ( row ) => {
		const whole = /^\d+$/.test( row.raw_step );
		const expected = whole ? Math.min( row.index, row.max ) * Math.min( 1000, parseInt( row.raw_step, 10 ) ) : null;
		return row.delay_ms === expected ? '' : 'delay ' + row.delay_ms + ' expected ' + expected;
	} );
	section( 'max_clamp_rows', MAX_CLAMP_KEYS, ( row ) => {
		const expected = Math.min( row.index, Math.max( 1, Math.min( 50, parseInt( row.raw_max, 10 ) ) ) ) * row.step;
		return row.delay_ms === expected ? '' : 'delay ' + row.delay_ms + ' expected ' + expected;
	} );
	const names = new Set();
	section( 'dom_rows', DOM_KEYS, ( row ) => {
		if ( names.has( row.case ) ) {
			return 'duplicate case';
		}
		names.add( row.case );
		if ( 'string' !== typeof row.description || ! row.description.length ) {
			return 'description';
		}
		if ( null !== row.delay_ms && ( ! Number.isInteger( row.delay_ms ) || row.delay_ms < 0 ) ) {
			return 'delay_ms ' + row.delay_ms;
		}
		const host = document.createElement( 'div' );
		host.innerHTML = row.html;
		return 1 === host.querySelectorAll( '[data-case-target]' ).length ? '' : 'target marker count';
	} );
	return found;
}

describe( 'legacy stagger fixture', () => {
	it( 'holds sound default-cap, step-clamp, max-clamp and dom rows', () => {
		expect( extendedProblems( fixture ) ).toEqual( [] );
		const caps = fixture.default_cap_rows.filter( ( r ) => r.index > DEFAULT_CAP );
		expect( caps.length ).toBeGreaterThan( 0 );
		expect( fixture.step_clamp_rows.some( ( r ) => '5000' === r.raw_step && 1000 === r.delay_ms ) ).toBe( true );
		expect( fixture.step_clamp_rows.some( ( r ) => null === r.delay_ms ) ).toBe( true );
		expect( fixture.max_clamp_rows.some( ( r ) => '99' === r.raw_max && 500 === r.delay_ms ) ).toBe( true );
		const cases = fixture.dom_rows.map( ( r ) => r.case );
		[ 'repeat-index-three-wrappers', 'repeat-index-four-wrappers', 'group-owner-nested-block-owns-its-children', 'group-of-excludes-nested-members' ]
			.forEach( ( name ) => expect( cases ).toContain( name ) );
	} );

	it( 'reports a planted wrong row in every new section', () => {
		const plant = ( name, mutate ) => {
			const planted = JSON.parse( JSON.stringify( fixture ) );
			mutate( planted[ name ] );
			return extendedProblems( planted );
		};
		expect( plant( 'default_cap_rows', ( rows ) => { rows[ 3 ].delay_ms += 1; } ) ).toEqual( [ expect.stringMatching( /^default_cap_rows 3 delay/ ) ] );
		expect( plant( 'step_clamp_rows', ( rows ) => { rows[ 2 ].delay_ms = 1001; } ) ).toEqual( [ expect.stringMatching( /^step_clamp_rows 2 delay/ ) ] );
		expect( plant( 'max_clamp_rows', ( rows ) => { rows[ 4 ].delay_ms = 510; } ) ).toEqual( [ expect.stringMatching( /^max_clamp_rows 4 delay/ ) ] );
		expect( plant( 'dom_rows', ( rows ) => { rows[ 0 ].html = rows[ 0 ].html.replace( 'data-case-target', '' ); } ) ).toEqual( [ 'dom_rows 0 target marker count' ] );
		expect( plant( 'dom_rows', ( rows ) => { rows[ 1 ].delay_ms = -20; } ) ).toEqual( [ expect.stringMatching( /^dom_rows 1 delay_ms/ ) ] );
		expect( plant( 'dom_rows', ( rows ) => { rows[ 1 ].extra = true; } ) ).toEqual( [ 'dom_rows 1 keys' ] );
		expect( plant( 'dom_rows', ( rows ) => { rows[ 1 ].case = rows[ 0 ].case; } ) ).toEqual( [ 'dom_rows 1 duplicate case' ] );
	} );

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
