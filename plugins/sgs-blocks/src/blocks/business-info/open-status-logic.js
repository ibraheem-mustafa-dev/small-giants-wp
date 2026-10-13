/**
 * Business Info (open-status): parses the free-text Site Info opening hours and works out
 * whether the business is open at a given moment in the business's own time zone.
 *
 * Pure functions, no DOM: view.js drives them and the Jest tests exercise them directly.
 * Day index 0 is Monday ... 6 is Sunday (the Site Info day order). Times are minutes after
 * midnight; a session that runs past midnight has an end above 1440.
 */

export const DAY_KEYS = [ 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun' ];

const MINUTES_PER_DAY = 1440;
const MINUTES_PER_WEEK = MINUTES_PER_DAY * 7;

const TIME = '(\\d{1,2})(?:\\s*[:.]\\s*(\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)?';
const RANGE_RE = new RegExp( TIME + '\\s*(?:-|\\u2013|\\u2014|to|until|till)\\s*' + TIME, 'gi' );
const CLOSED_RE = /\b(closed|shut)\b/i;
const ALL_DAY_RE = /\b(24\s*(?:hours?|hrs?|h)|open\s*24|all\s*day)\b/i;

/**
 * Convert one parsed clock reading to minutes after midnight.
 *
 * @param {string}           hours    Hour digits.
 * @param {string|undefined} minutes  Minute digits.
 * @param {string}           meridiem '' | 'am' | 'pm'.
 * @return {number} Minutes after midnight.
 */
function toMinutes( hours, minutes, meridiem ) {
	let h = parseInt( hours, 10 );
	const m = minutes ? parseInt( minutes, 10 ) : 0;
	if ( 'am' === meridiem && 12 === h ) {
		h = 0;
	} else if ( 'pm' === meridiem && h < 12 ) {
		h += 12;
	}
	return h * 60 + m;
}

const meridiemOf = ( raw ) => ( raw ? raw.replace( /\./g, '' ).toLowerCase() : '' );

/**
 * Parse the sessions of one day, e.g. "9.30-12:00, 14:30-17:00" or "9am - 5pm".
 *
 * A meridiem on one end only applies to the other end when that keeps the range forward
 * ("9-5pm" is 09:00-17:00). A range whose end is not after its start runs past midnight.
 * Text with no range ("Closed", "By appointment", empty) has no sessions.
 *
 * @param {string} text One day's stored hours.
 * @return {Array<{start:number,end:number}>} Sessions in minutes after midnight.
 */
export function parseDay( text ) {
	const source = String( text || '' ).trim();
	if ( '' === source ) {
		return [];
	}
	if ( ALL_DAY_RE.test( source ) && ! CLOSED_RE.test( source ) ) {
		return [ { start: 0, end: MINUTES_PER_DAY } ];
	}
	const sessions = [];
	for ( const match of source.matchAll( RANGE_RE ) ) {
		const startMer = meridiemOf( match[ 3 ] );
		const endMer = meridiemOf( match[ 6 ] );
		let sMer = startMer;
		let eMer = endMer;
		let start = toMinutes( match[ 1 ], match[ 2 ], sMer || eMer );
		if ( ! sMer && eMer ) {
			// "9-5pm": the start borrows pm; when that lands after the end it was am.
			const end = toMinutes( match[ 4 ], match[ 5 ], eMer );
			if ( start >= end ) {
				sMer = 'pm' === eMer ? 'am' : 'pm';
				start = toMinutes( match[ 1 ], match[ 2 ], sMer );
			}
		}
		if ( ! eMer && sMer ) {
			// "9am-5": the end borrows the start's meridiem; when that is not after it, flip to pm.
			eMer = sMer;
			if ( toMinutes( match[ 4 ], match[ 5 ], eMer ) <= start ) {
				eMer = 'pm';
			}
		}
		let end = toMinutes( match[ 4 ], match[ 5 ], eMer );
		if ( end <= start ) {
			end += MINUTES_PER_DAY;
		}
		if ( start < MINUTES_PER_DAY && end > start ) {
			sessions.push( { start, end } );
		}
	}
	return sessions;
}

/**
 * Parse the whole week.
 *
 * @param {Object<string,string>} hours Stored hours keyed mon..sun.
 * @return {Array<Array<{start:number,end:number}>>} Seven session lists, Monday first.
 */
export function parseSchedule( hours ) {
	return DAY_KEYS.map( ( key ) => parseDay( hours && hours[ key ] ) );
}

/** True when at least one day has a session. */
export const hasAnySession = ( schedule ) => schedule.some( ( day ) => day.length > 0 );

const WEEKDAY_INDEX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/**
 * The day and clock time in a time zone at a moment.
 *
 * @param {Date}   date     The moment.
 * @param {string} timeZone IANA name ("Europe/London") or a fixed offset ("+01:00").
 * @return {{day:number,minutes:number}} Day index (Monday 0) and minutes after midnight there.
 */
export function zonedNow( date, timeZone ) {
	const offset = /^([+-])(\d{2}):?(\d{2})$/.exec( timeZone || '' );
	if ( offset ) {
		const total = ( parseInt( offset[ 2 ], 10 ) * 60 + parseInt( offset[ 3 ], 10 ) ) * ( '-' === offset[ 1 ] ? -1 : 1 );
		const shifted = new Date( date.getTime() + total * 60000 );
		return {
			day: ( shifted.getUTCDay() + 6 ) % 7,
			minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
		};
	}
	const parts = new Intl.DateTimeFormat( 'en-GB', {
		timeZone: timeZone || 'UTC',
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	} ).formatToParts( date );
	const get = ( type ) => parts.find( ( part ) => part.type === type )?.value || '';
	return {
		day: WEEKDAY_INDEX[ get( 'weekday' ) ] ?? 0,
		minutes: ( parseInt( get( 'hour' ), 10 ) % 24 ) * 60 + parseInt( get( 'minute' ), 10 ),
	};
}

/**
 * Every session as absolute minutes in the week, plus a copy a week either side so a session
 * that crosses midnight on Sunday, or a next opening on the following Monday, is found.
 */
function weekSessions( schedule ) {
	const all = [];
	for ( const shift of [ -MINUTES_PER_WEEK, 0, MINUTES_PER_WEEK ] ) {
		schedule.forEach( ( sessions, day ) => {
			sessions.forEach( ( session ) => {
				all.push( {
					start: shift + day * MINUTES_PER_DAY + session.start,
					end: shift + day * MINUTES_PER_DAY + session.end,
				} );
			} );
		} );
	}
	return all.sort( ( a, b ) => a.start - b.start );
}

/**
 * Whether the business is open now and what changes next.
 *
 * `kind` is how the next change reads: `closes` (open, closing later), `reopens` (shut
 * between two sessions of the same day) or `opens` (shut, next opening is another session).
 * `dayOffset` is how many days ahead the change falls (0 today, 1 tomorrow); `day` is its
 * weekday index. Null `change` means no session exists anywhere in the week.
 *
 * @param {Array}  schedule parseSchedule() output.
 * @param {{day:number,minutes:number}} now zonedNow() output.
 * @return {{open:boolean,change:null|{kind:string,minutes:number,dayOffset:number,day:number}}} Status.
 */
export function computeStatus( schedule, now ) {
	const at = now.day * MINUTES_PER_DAY + now.minutes;
	const sessions = weekSessions( schedule );
	const dayStart = now.day * MINUTES_PER_DAY;

	let current = sessions.find( ( s ) => s.start <= at && at < s.end );
	if ( current ) {
		// Back-to-back sessions (12:00-12:00 style gaps of zero) read as one opening.
		let next = sessions.find( ( s ) => s.start === current.end );
		while ( next ) {
			current = { start: current.start, end: next.end };
			next = sessions.find( ( s ) => s.start === current.end );
		}
		return { open: true, change: describe( 'closes', current.end, dayStart ) };
	}

	const upcoming = sessions.find( ( s ) => s.start > at );
	if ( ! upcoming ) {
		return { open: false, change: null };
	}
	const endedToday = sessions.some( ( s ) => s.start >= dayStart && s.end <= at );
	const sameDay = upcoming.start < dayStart + MINUTES_PER_DAY;
	return { open: false, change: describe( endedToday && sameDay ? 'reopens' : 'opens', upcoming.start, dayStart ) };
}

function describe( kind, absolute, dayStart ) {
	const dayOffset = Math.floor( ( absolute - dayStart ) / MINUTES_PER_DAY );
	const minutes = ( ( absolute % MINUTES_PER_DAY ) + MINUTES_PER_DAY ) % MINUTES_PER_DAY;
	const day = ( ( Math.floor( absolute / MINUTES_PER_DAY ) % 7 ) + 7 ) % 7;
	return { kind, minutes, dayOffset, day };
}

/**
 * A clock time the way a person says it: "5pm", "9:30am", "noon", "midnight".
 *
 * @param {number} minutes Minutes after midnight.
 * @return {string} Spoken time.
 */
export function formatTime( minutes, words = { noon: 'noon', midnight: 'midnight' } ) {
	const h = Math.floor( minutes / 60 ) % 24;
	const m = minutes % 60;
	if ( 0 === m && 0 === h ) {
		return words.midnight;
	}
	if ( 0 === m && 12 === h ) {
		return words.noon;
	}
	const suffix = h < 12 ? 'am' : 'pm';
	const hour = h % 12 || 12;
	return m ? `${ hour }:${ String( m ).padStart( 2, '0' ) }${ suffix }` : `${ hour }${ suffix }`;
}

/**
 * The status line, e.g. "Closes at 5pm today" or "Opens at 9:30am tomorrow".
 *
 * `labels` carries the wording: closes, opens, reopens ("Closed until"), today, tomorrow,
 * noon, midnight and days (seven weekday names, Monday first).
 *
 * @param {{kind:string,minutes:number,dayOffset:number,day:number}} change computeStatus().change.
 * @param {Object} labels Wording.
 * @return {string} The line.
 */
export function buildLine( change, labels ) {
	const time = formatTime( change.minutes, labels );
	let when = '';
	if ( 0 === change.dayOffset ) {
		when = labels.today;
	} else if ( 1 === change.dayOffset ) {
		when = labels.tomorrow;
	} else {
		when = labels.days[ change.day ];
	}
	if ( 'reopens' === change.kind ) {
		return `${ labels.reopens } ${ time }`;
	}
	const lead = 'closes' === change.kind ? labels.closes : labels.opens;
	return `${ lead } ${ time } ${ when }`;
}
