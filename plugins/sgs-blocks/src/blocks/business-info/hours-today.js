/**
 * Business Info (hours): marks today's row in the visitor's browser.
 *
 * A cached page cannot know the visitor's day, so the server renders every row with the days it
 * covers (`data-days`) and this module adds the modifier class to the row that holds today, read
 * in the business's own time zone.
 */
import { DAY_KEYS, zonedNow } from './open-status-logic';

export const TODAY_CLASS = 'sgs-business-info__hours-row--today';

/**
 * Add the today class to the row covering the given day, and remove it from the others.
 *
 * @param {Element} list   The hours list carrying the rows.
 * @param {string}  dayKey Day key: mon, tue, wed, thu, fri, sat or sun.
 */
export function markToday( list, dayKey ) {
	list.querySelectorAll( '.sgs-business-hours__row' ).forEach( ( row ) => {
		const days = ( row.getAttribute( 'data-days' ) || '' ).split( /\s+/ );
		row.classList.toggle( TODAY_CLASS, days.includes( dayKey ) );
	} );
}

/**
 * Mark today's row on every hours list in the document.
 *
 * @param {Document} doc Document to search.
 * @param {Date}     now The moment to treat as now.
 */
export function initialiseHoursToday( doc = document, now = new Date() ) {
	doc.querySelectorAll( '[data-sgs-hours-today]' ).forEach( ( list ) => {
		try {
			const { day } = zonedNow( now, list.getAttribute( 'data-timezone' ) || 'UTC' );
			markToday( list, DAY_KEYS[ day ] );
		} catch ( error ) {
			// An unreadable time zone leaves the rows unmarked.
		}
	} );
}
