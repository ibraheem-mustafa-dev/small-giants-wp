/**
 * Spec 49 §7.1: the one shared view module for per-device video.
 *
 * A video prints one `<source media>` per device. When the viewport crosses a breakpoint the browser does not
 * re-run source selection by itself, so this module reloads the selection, pauses a video no longer shown and plays
 * the one shown (when it autoplays and the visitor has not asked for reduced motion).
 *
 * Built as a standalone script module (`build/shared/media/device-video.js`); the renderer enqueues it only on
 * pages that print a video slot.
 */
import { QUERY_MOBILE, QUERY_TABLET } from '../../utils/breakpoints.js';

const SELECTOR = 'video[data-sgs-device-video]';

/**
 * Whether an element generates a box, i.e. is not hidden by a device rule.
 *
 * @param {HTMLElement} el The element.
 * @return {boolean} True when it is displayed.
 */
function isShown( el ) {
	return el.getClientRects().length > 0;
}

/**
 * The file a video's source selection currently resolves to, or '' when none matches.
 *
 * @param {HTMLVideoElement} video The video.
 * @return {string} The URL.
 */
function currentSource( video ) {
	return video.currentSrc || '';
}

/**
 * Re-run source selection for one video and settle its playback.
 *
 * @param {HTMLVideoElement} video The video.
 */
export function settleVideo( video ) {
	const wasPlaying = ! video.paused;
	const before = currentSource( video );
	const sources = Array.from( video.querySelectorAll( 'source' ) );
	const matches = sources.some(
		( s ) => ! s.media || window.matchMedia( s.media ).matches
	);

	if ( ! isShown( video ) || ! matches ) {
		if ( wasPlaying ) {
			video.pause();
		}
		return;
	}

	// Chrome and Firefox keep the old selection until load() runs again.
	video.load();
	const reduce = window.matchMedia(
		'(prefers-reduced-motion: reduce)'
	).matches;
	if (
		video.hasAttribute( 'data-sgs-autoplay' ) &&
		! reduce &&
		( wasPlaying || before !== currentSource( video ) || video.paused )
	) {
		const promise = video.play();
		if ( promise && typeof promise.catch === 'function' ) {
			promise.catch( () => {} );
		}
	}
}

/**
 * Wire every device video on the page to breakpoint changes.
 */
export function initDeviceVideo() {
	const videos = Array.from( document.querySelectorAll( SELECTOR ) );
	if ( ! videos.length ) {
		return;
	}
	const queries = [ QUERY_MOBILE, QUERY_TABLET ];
	const onChange = () => videos.forEach( settleVideo );
	queries.forEach( ( q ) =>
		window.matchMedia( q ).addEventListener( 'change', onChange )
	);
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initDeviceVideo );
} else {
	initDeviceVideo();
}
