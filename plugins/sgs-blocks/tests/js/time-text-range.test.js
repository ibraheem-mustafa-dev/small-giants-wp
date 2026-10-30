/**
 * "Text by time of day" (Spec 02 FR-2-14): which range shows at an hour, the hour in a zone, and the swap in the page.
 */
import { covers, hourIn, normaliseRanges, rangeFor } from '../../src/shared/time-text-range';

// The five ranges a greeting by hour reads from `hr < 5 ? A : hr < 12 ? B : hr < 17 ? C : hr < 21 ? D : E`.
const GREETING = [
	{ start: 0, end: 5, text: 'night' },
	{ start: 5, end: 12, text: 'morning' },
	{ start: 12, end: 17, text: 'afternoon' },
	{ start: 17, end: 21, text: 'evening' },
	{ start: 21, end: 24, text: 'late' },
];

describe( 'rangeFor', () => {
	it( 'MUST FAIL on a wrap-blind range test: 21 to 5 covers 23:00 and 02:00 and not 12:00', () => {
		const late = [ { start: 21, end: 5, text: 'late' } ];
		expect( rangeFor( late, 23 )?.text ).toBe( 'late' );
		expect( rangeFor( late, 2 )?.text ).toBe( 'late' );
		expect( rangeFor( late, 21 )?.text ).toBe( 'late' );
		expect( rangeFor( late, 5 ) ).toBeNull();
		expect( rangeFor( late, 12 ) ).toBeNull();
	} );

	it( 'picks each greeting range at its edges (start included, end excluded)', () => {
		expect( [ 0, 4, 5, 11, 12, 16, 17, 20, 21, 23 ].map( ( h ) => rangeFor( GREETING, h ).text ) ).toEqual( [
			'night', 'night', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'late', 'late',
		] );
	} );

	it( 'the first covering range wins; an hour no range covers is null (the block keeps its own words)', () => {
		const list = [ { start: 9, end: 17, text: 'day' }, { start: 12, end: 13, text: 'lunch' } ];
		expect( rangeFor( list, 12 ).text ).toBe( 'day' );
		expect( rangeFor( list, 20 ) ).toBeNull();
	} );

	it( 'negative control: a range whose start equals its end covers no hour', () => {
		expect( covers( { start: 8, end: 8 }, 8 ) ).toBe( false );
	} );

	it( 'drops malformed ranges: hours out of bounds, fractional hours, empty words', () => {
		expect( normaliseRanges( [
			{ start: -1, end: 5, text: 'a' },
			{ start: 0, end: 25, text: 'b' },
			{ start: 1.5, end: 5, text: 'c' },
			{ start: 1, end: 5, text: '  ' },
			{ start: '6', end: '9', text: 'kept' },
			null,
		] ) ).toEqual( [ { start: 6, end: 9, text: 'kept' } ] );
		expect( normaliseRanges( 'nope' ) ).toEqual( [] );
	} );
} );

describe( 'hourIn', () => {
	const moment = new Date( Date.UTC( 2026, 0, 15, 23, 30 ) ); // 23:30 UTC, winter.

	it( 'reads a named zone', () => {
		expect( hourIn( moment, 'Europe/London' ) ).toBe( 23 );
		expect( hourIn( moment, 'Asia/Karachi' ) ).toBe( 4 );
		expect( hourIn( moment, 'America/New_York' ) ).toBe( 18 );
	} );

	it( 'reads a fixed offset, as WordPress gives for a site set to a UTC offset', () => {
		expect( hourIn( moment, '+05:30' ) ).toBe( 5 );
		expect( hourIn( moment, '-03:00' ) ).toBe( 20 );
	} );

	it( 'falls back to the device time for no zone or an unknown name', () => {
		expect( hourIn( moment, '' ) ).toBe( moment.getHours() );
		expect( hourIn( moment, 'Not/AZone' ) ).toBe( moment.getHours() );
	} );
} );

describe( 'the swap in the page', () => {
	afterEach( () => {
		jest.useRealTimers();
		jest.resetModules();
		document.body.innerHTML = '';
	} );

	it( 'swaps only the words, keeps no live region, and restores the server words when no range covers the hour', () => {
		jest.useFakeTimers();
		jest.setSystemTime( new Date( Date.UTC( 2026, 0, 15, 20, 10 ) ) );
		document.body.innerHTML =
			'<button id="focus">x</button>' +
			`<p id="greet" class="wp-block-sgs-text" data-sgs-time-text='${ JSON.stringify( GREETING ) }' data-sgs-time-zone="UTC">served</p>` +
			`<p id="gap" data-sgs-time-text='[{"start":20,"end":22,"text":"evening"}]' data-sgs-time-zone="UTC"><em>own</em> words</p>`;
		document.getElementById( 'focus' ).focus();
		jest.isolateModules( () => {
			require( '../../src/shared/time-text' );
		} );
		const greet = document.getElementById( 'greet' );
		expect( greet.textContent ).toBe( 'evening' );
		expect( greet.className ).toBe( 'wp-block-sgs-text' );
		expect( greet.hasAttribute( 'aria-live' ) ).toBe( false );
		expect( document.activeElement.id ).toBe( 'focus' );
		expect( document.getElementById( 'gap' ).textContent ).toBe( 'evening' );

		// Just after the top of the hour: 21:00:05.
		jest.advanceTimersByTime( ( 50 * 60 + 5 ) * 1000 );
		expect( greet.textContent ).toBe( 'late' );
		expect( document.getElementById( 'gap' ).textContent ).toBe( 'evening' );

		// 22:00: no range covers the hour, so the server's words (markup included) come back.
		jest.advanceTimersByTime( 60 * 60 * 1000 );
		expect( document.getElementById( 'gap' ).innerHTML ).toBe( '<em>own</em> words' );
	} );
} );
