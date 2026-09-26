/**
 * SGS Local Time — frontend interactivity (viewScriptModule, vanilla ES module).
 *
 * render.php always emits the server's own idea of "now" in the resolved
 * zone, in a PHP date()-format shape. This module corrects that to the
 * browser's locale-correct rendering with Intl.DateTimeFormat once it loads,
 * then keeps the clock ticking — at the next SECOND edge when seconds are
 * shown, otherwise at the next MINUTE edge — pausing entirely while the tab
 * is hidden (no point formatting a time nobody can see).
 *
 * Reads, per instance, from the server-rendered <time> element's data
 * attributes: data-zone, data-cycle ("h12"|"h23"), data-seconds ("1"|"0"),
 * data-show-period ("1"|"0", h12 only).
 *
 * No jQuery. No dependencies.
 */

/**
 * Format "now" in the given zone/options, hiding AM/PM when showPeriod is
 * false — Intl's hourCycle:"h12" always includes a dayPeriod part, so
 * hiding it means walking formatToParts() and dropping that one part
 * (there is no formatting option that omits it directly).
 *
 * @param {string}  zone         IANA time-zone identifier.
 * @param {string}  cycle        "h12" or "h23".
 * @param {boolean} showSeconds  Whether to include seconds.
 * @param {boolean} showPeriod   Whether to keep the AM/PM part (h12 only).
 * @return {string|null} Formatted time, or null if the zone/options are unusable.
 */
function formatLocalTime( zone, cycle, showSeconds, showPeriod ) {
	const options = {
		timeZone: zone || undefined,
		hourCycle: cycle,
		// h23 shows zero-padded two-digit hours ("19:48"), matching the
		// server's own H:i format (local-time-helpers.php::sgs_local_time_format_string).
		// h12 keeps numeric hours ("7:48") — no leading zero on a 12-hour clock.
		hour: 'h23' === cycle ? '2-digit' : 'numeric',
		minute: '2-digit',
	};
	if ( showSeconds ) {
		options.second = '2-digit';
	}

	let formatter;
	try {
		formatter = new Intl.DateTimeFormat( undefined, options );
	} catch ( e ) {
		return null;
	}

	if ( showPeriod || 'h12' !== cycle ) {
		return formatter.format( new Date() );
	}

	let out = '';
	formatter.formatToParts( new Date() ).forEach( ( part ) => {
		if ( 'dayPeriod' === part.type ) {
			return;
		}
		out += part.value;
	} );
	return out.trim();
}

/**
 * Wire one .sgs-local-time instance: correct the displayed time immediately,
 * then keep it ticking at the appropriate edge while the tab is visible.
 *
 * @param {HTMLElement} root The .sgs-local-time wrapper.
 */
function initInstance( root ) {
	if ( root.dataset.sgsLocalTimeReady === '1' ) {
		return;
	}
	root.dataset.sgsLocalTimeReady = '1';

	const timeEl = root.querySelector( '.sgs-local-time__time' );
	if ( ! timeEl ) {
		return;
	}

	const zone = timeEl.dataset.zone || '';
	const cycle = 'h12' === timeEl.dataset.cycle ? 'h12' : 'h23';
	const showSeconds = '1' === timeEl.dataset.seconds;
	const showPeriod = '1' === timeEl.dataset.showPeriod;

	let timeoutId = null;

	function tick() {
		timeoutId = null;

		if ( document.hidden ) {
			// Paused — a visibilitychange listener (below) resumes on show.
			return;
		}

		const formatted = formatLocalTime( zone, cycle, showSeconds, showPeriod );
		if ( null !== formatted ) {
			timeEl.textContent = formatted;
		}

		const now = new Date();
		const msToNextEdge = showSeconds
			? 1000 - now.getMilliseconds()
			: ( 60 - now.getSeconds() ) * 1000 - now.getMilliseconds();

		timeoutId = setTimeout( tick, Math.max( msToNextEdge, 50 ) );
	}

	document.addEventListener( 'visibilitychange', () => {
		if ( ! document.hidden && null === timeoutId ) {
			tick();
		}
	} );

	tick();
}

/**
 * Initialise every instance on the page.
 */
function init() {
	const roots = document.querySelectorAll( '.sgs-local-time' );
	roots.forEach( initInstance );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
