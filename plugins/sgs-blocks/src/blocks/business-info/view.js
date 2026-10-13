/**
 * Business Info (open-status) front end.
 *
 * The server renders a neutral fallback (the stored opening hours as text) because a cached
 * page would freeze any server-computed status. This module works out open or closed in the
 * visitor's browser, against the business's own time zone, replaces the fallback text on load
 * and re-checks every quarter of an hour so a page left open stays right. The text sits in no
 * live region, so assistive technology reads it once as part of the page and is not interrupted.
 */
import { parseSchedule, hasAnySession, zonedNow, computeStatus, buildLine } from './open-status-logic';

const RECHECK_MS = 15 * 60 * 1000;

function readConfig( root ) {
	try {
		return JSON.parse( root.getAttribute( 'data-config' ) || '' );
	} catch ( error ) {
		return null;
	}
}

function update( root, config, schedule ) {
	let now;
	try {
		now = zonedNow( new Date(), config.timezone );
	} catch ( error ) {
		return false;
	}
	const status = computeStatus( schedule, now );
	const pill = root.querySelector( '.sgs-open-status__pill' );
	const label = root.querySelector( '.sgs-open-status__label' );
	const line = root.querySelector( '.sgs-open-status__line' );
	root.setAttribute( 'data-state', status.open ? 'open' : 'closed' );
	if ( label ) {
		label.textContent = status.open ? config.labels.open : config.labels.closed;
	}
	if ( pill ) {
		pill.hidden = false;
	}
	if ( line ) {
		const text = config.showLine && status.change ? buildLine( status.change, config.labels ) : '';
		line.textContent = text;
		line.hidden = '' === text;
	}
	return true;
}

function initialise( root ) {
	const config = readConfig( root );
	if ( ! config || ! config.hours || ! config.labels ) {
		return;
	}
	const schedule = parseSchedule( config.hours );
	if ( ! hasAnySession( schedule ) ) {
		return;
	}
	const tick = () => {
		if ( update( root, config, schedule ) ) {
			window.setTimeout( tick, RECHECK_MS );
		}
	};
	tick();
}

document.querySelectorAll( '[data-sgs-open-status]' ).forEach( initialise );
