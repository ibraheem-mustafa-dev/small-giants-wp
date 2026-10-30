/**
 * Which "Text by time of day" range shows at a given hour (Spec 02 FR-2-TT-2).
 *
 * Shared by the front-end swap (src/shared/time-text.js) and the editor
 * preview (src/blocks/extensions/time-text.js), so the inspector's "Showing
 * now" line and the visitor's page always agree.
 *
 * A range is `{ start, end, text }` in whole hours: it covers
 * `start <= hour < end`. A range whose start is after its end spans midnight
 * (21 to 5 covers 21:00 to 04:59). Start equal to end covers no hour. The
 * first range in the list that covers the hour wins.
 */

/**
 * The ranges a stored value holds, each with integer hours in bounds and
 * plain words; anything malformed is dropped.
 *
 * @param {*} list The stored `sgsTimeText` value (or parsed JSON).
 * @return {Array<{start: number, end: number, text: string}>} Usable ranges.
 */
export function normaliseRanges( list ) {
	if ( ! Array.isArray( list ) ) {
		return [];
	}
	return list
		.filter( ( r ) => r && 'object' === typeof r )
		.map( ( r ) => ( {
			start: Number( r.start ),
			end: Number( r.end ),
			text: 'string' === typeof r.text ? r.text : '',
		} ) )
		.filter(
			( r ) =>
				Number.isInteger( r.start ) &&
				Number.isInteger( r.end ) &&
				r.start >= 0 &&
				r.start <= 23 &&
				r.end >= 1 &&
				r.end <= 24 &&
				'' !== r.text.trim()
		);
}

/**
 * Whether a range covers an hour (0 to 23).
 *
 * @param {{start: number, end: number}} range The range.
 * @param {number}                       hour  Hour of the day, 0 to 23.
 * @return {boolean} True when the range covers the hour.
 */
export function covers( range, hour ) {
	if ( range.start < range.end ) {
		return hour >= range.start && hour < range.end;
	}
	if ( range.start > range.end ) {
		return hour >= range.start || hour < range.end;
	}
	return false;
}

/**
 * The first range covering an hour, or null when none does (the block's own
 * words then stand).
 *
 * @param {*}      list The stored ranges.
 * @param {number} hour Hour of the day, 0 to 23.
 * @return {{start: number, end: number, text: string}|null} The range.
 */
export function rangeFor( list, hour ) {
	return normaliseRanges( list ).find( ( r ) => covers( r, hour ) ) || null;
}

/**
 * The hour (0 to 23) a moment falls in, in a time zone: '' is the device's
 * own time; an IANA name (`Europe/London`) or a fixed offset (`+05:30`, what
 * WordPress gives for a site set to a UTC offset) reads that zone. An unknown
 * zone falls back to the device's own time.
 *
 * @param {Date}   date The moment.
 * @param {string} zone '' or a time zone.
 * @return {number} Hour of the day, 0 to 23.
 */
export function hourIn( date, zone = '' ) {
	const offset = /^([+-])(\d{1,2}):?(\d{2})?$/.exec( String( zone || '' ) );
	if ( offset ) {
		const sign = '-' === offset[ 1 ] ? -1 : 1;
		const minutes =
			sign *
			( Number( offset[ 2 ] ) * 60 + Number( offset[ 3 ] || 0 ) );
		const utc = date.getUTCHours() * 60 + date.getUTCMinutes();
		return Math.floor( ( ( ( utc + minutes ) % 1440 ) + 1440 ) / 60 ) % 24;
	}
	if ( zone ) {
		try {
			const hour = new Intl.DateTimeFormat( 'en-GB', {
				hour: 'numeric',
				hourCycle: 'h23',
				timeZone: zone,
			} )
				.formatToParts( date )
				.find( ( p ) => 'hour' === p.type );
			if ( hour ) {
				return Number( hour.value ) % 24;
			}
		} catch ( e ) {
			// An unknown zone name: the device's own time below.
		}
	}
	return date.getHours();
}
