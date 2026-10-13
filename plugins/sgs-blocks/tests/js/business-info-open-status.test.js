/**
 * sgs/business-info open-status: parsing of the free-text Site Info hours and the open/closed
 * computation in the business's own time zone.
 */
import {
	parseDay,
	parseSchedule,
	hasAnySession,
	zonedNow,
	computeStatus,
	buildLine,
	formatTime,
} from '../../src/blocks/business-info/open-status-logic';

const HOURS = {
	mon: '9:30am-5pm',
	tue: '9:30am-5pm',
	wed: '9.30-17.30',
	thu: '09:30 - 17:00',
	fri: '09:30-12:00, 14:30-17:00',
	sat: '10-14',
	sun: 'Closed',
};

const LABELS = {
	open: 'Open now',
	closed: 'Closed',
	closes: 'Closes at',
	opens: 'Opens at',
	reopens: 'Closed until',
	today: 'today',
	tomorrow: 'tomorrow',
	noon: 'noon',
	midnight: 'midnight',
	days: [ 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday' ],
};

const schedule = parseSchedule( HOURS );

/** Status line and open flag for a UTC instant seen in a time zone. */
function at( iso, timeZone = 'Europe/London', sched = schedule ) {
	const status = computeStatus( sched, zonedNow( new Date( iso ), timeZone ) );
	return {
		open: status.open,
		line: status.change ? buildLine( status.change, LABELS ) : '',
	};
}

describe( 'parseDay', () => {
	test( 'reads 12-hour, 24-hour and dotted times', () => {
		expect( parseDay( '9:30am-5pm' ) ).toEqual( [ { start: 570, end: 1020 } ] );
		expect( parseDay( '9.30-17.30' ) ).toEqual( [ { start: 570, end: 1050 } ] );
		expect( parseDay( '09:30 – 17:00' ) ).toEqual( [ { start: 570, end: 1020 } ] );
	} );

	test( 'borrows a single meridiem for the other end', () => {
		expect( parseDay( '9-5pm' ) ).toEqual( [ { start: 540, end: 1020 } ] );
		expect( parseDay( '9am-5' ) ).toEqual( [ { start: 540, end: 1020 } ] );
		expect( parseDay( '10-2pm' ) ).toEqual( [ { start: 600, end: 840 } ] );
	} );

	test( 'reads split sessions', () => {
		expect( parseDay( '09:30-12:00, 14:30-17:00' ) ).toEqual( [
			{ start: 570, end: 720 },
			{ start: 870, end: 1020 },
		] );
	} );

	test( 'a closed, empty or unparseable day has no sessions', () => {
		expect( parseDay( 'Closed' ) ).toEqual( [] );
		expect( parseDay( '' ) ).toEqual( [] );
		expect( parseDay( 'By appointment' ) ).toEqual( [] );
	} );

	test( 'a 24-hour day is open all day and a late close runs past midnight', () => {
		expect( parseDay( 'Open 24 hours' ) ).toEqual( [ { start: 0, end: 1440 } ] );
		expect( parseDay( '18:00-02:00' ) ).toEqual( [ { start: 1080, end: 1560 } ] );
	} );
} );

describe( 'computeStatus', () => {
	// 2026-10-13 is a Tuesday and BST (UTC+1) applies in London until 25 October.
	test( 'open during the day: Closes at 5pm today', () => {
		expect( at( '2026-10-13T11:00:00Z' ) ).toEqual( { open: true, line: 'Closes at 5pm today' } );
	} );

	test( 'before opening: Opens at 9:30am today', () => {
		expect( at( '2026-10-13T06:00:00Z' ) ).toEqual( { open: false, line: 'Opens at 9:30am today' } );
	} );

	test( 'after closing: Opens at 9:30am tomorrow', () => {
		expect( at( '2026-10-13T17:00:00Z' ) ).toEqual( { open: false, line: 'Opens at 9:30am tomorrow' } );
	} );

	test( 'between split sessions: Closed until 2:30pm', () => {
		// Friday 2026-10-16, 12:30 BST.
		expect( at( '2026-10-16T11:30:00Z' ) ).toEqual( { open: false, line: 'Closed until 2:30pm' } );
	} );

	test( 'inside the morning split session: Closes at noon today', () => {
		expect( at( '2026-10-16T09:00:00Z' ) ).toEqual( { open: true, line: 'Closes at noon today' } );
	} );

	test( 'a closed day names the next opening day when it is not tomorrow', () => {
		const monClosed = parseSchedule( { ...HOURS, mon: 'Closed' } );
		// Sunday 2026-10-18 12:00 BST: Sunday closed, Monday closed, Tuesday opens.
		expect( at( '2026-10-18T11:00:00Z', 'Europe/London', monClosed ) ).toEqual( {
			open: false,
			line: 'Opens at 9:30am Tuesday',
		} );
	} );

	test( 'a closed day with the next day open reads tomorrow', () => {
		expect( at( '2026-10-18T11:00:00Z' ) ).toEqual( { open: false, line: 'Opens at 9:30am tomorrow' } );
	} );

	test( 'Saturday evening rolls over the closed Sunday to Monday', () => {
		expect( at( '2026-10-17T20:00:00Z' ) ).toEqual( { open: false, line: 'Opens at 9:30am Monday' } );
	} );

	test( 'uses the business time zone, not the visitor’s', () => {
		// One instant: 17:30 on Tuesday in London (closed), 12:30 in New York (open).
		const instant = '2026-10-13T16:30:00Z';
		expect( at( instant, 'Europe/London' ).open ).toBe( false );
		expect( at( instant, 'America/New_York' ) ).toEqual( { open: true, line: 'Closes at 5pm today' } );
	} );

	test( 'a fixed UTC offset time zone works', () => {
		expect( at( '2026-10-13T16:30:00Z', '+01:00' ).open ).toBe( false );
		expect( at( '2026-10-13T16:30:00Z', '-04:00' ).open ).toBe( true );
	} );

	test( 'an overnight session keeps the business open after midnight', () => {
		const late = parseSchedule( { fri: '18:00-02:00' } );
		// Saturday 2026-10-17 01:00 BST.
		expect( at( '2026-10-17T00:00:00Z', 'Europe/London', late ) ).toEqual( {
			open: true,
			line: 'Closes at 2am today',
		} );
	} );

	test( 'no parseable hours at all gives no change and reports nothing to show', () => {
		const empty = parseSchedule( {} );
		expect( hasAnySession( empty ) ).toBe( false );
		expect( computeStatus( empty, { day: 1, minutes: 600 } ) ).toEqual( { open: false, change: null } );
	} );
} );

describe( 'formatTime', () => {
	test( 'speaks times the UK way', () => {
		expect( formatTime( 17 * 60 ) ).toBe( '5pm' );
		expect( formatTime( 9 * 60 + 30 ) ).toBe( '9:30am' );
		expect( formatTime( 12 * 60 ) ).toBe( 'noon' );
		expect( formatTime( 0 ) ).toBe( 'midnight' );
		expect( formatTime( 13 * 60 + 5 ) ).toBe( '1:05pm' );
	} );
} );
