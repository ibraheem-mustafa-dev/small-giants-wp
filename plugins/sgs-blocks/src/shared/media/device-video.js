/**
 * Spec 49 §7.1: the one shared view module for per-device video.
 *
 * A video prints one `<source media>` per device. When the viewport crosses a breakpoint the browser does not
 * re-run source selection by itself, so this module reloads the selection only when the source the viewport now
 * chooses differs from the one loaded (a phone rotating within one file keeps its place), pauses a video no longer
 * shown and plays the one shown (when it autoplays and the visitor has not asked for reduced motion).
 *
 * An autoplaying video can carry a pause button (`[data-sgs-media-pause]`, WCAG 2.2.2): printed `hidden`, shown here
 * while the video is shown and can autoplay, it pauses and resumes the video and keeps a visitor's pause across
 * breakpoint changes. An autoplaying embed prints without autoplay and with `data-sgs-autoplay-src`; the module
 * switches it to that address only when the visitor has not asked for reduced motion.
 *
 * The shown video's `poster` is the file its cover `<img>` already loaded for the device (`currentSrc`), so Chrome
 * paints the cover under the video's controls instead of an opaque panel, with no extra download. The renderer prints
 * no `poster` attribute, which would download on every device. The stack is marked `data-sgs-poster` once it is set;
 * the stylesheet lifts the cover above the video only while the mark is absent.
 *
 * Built as a standalone script module (`build/shared/media/device-video.js`); the renderer enqueues it only on
 * pages that print a video slot.
 */
import {
	QUERY_MOBILE_FRACTIONAL,
	QUERY_TABLET_ONLY_FRACTIONAL,
} from '../../utils/breakpoints.js';

const SELECTOR = 'video[data-sgs-device-video]';
/** The file each video's source selection last resolved to, which `load()` reports only later through `currentSrc`. */
const loadedSource = new WeakMap();
const EMBED_SELECTOR = 'iframe[data-sgs-autoplay-src]';

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
 * Point the shown video's poster at its stack's cover file and mark the stack.
 *
 * @param {HTMLVideoElement} video The video.
 */
function applyPoster( video ) {
	const stack = video.closest( '.sgs-media-stack' );
	const cover = stack && stack.querySelector( 'img.sgs-media-cover' );
	if ( ! stack || ! cover ) {
		return;
	}
	const src = cover.currentSrc || '';
	if ( ! src || src.startsWith( 'data:' ) ) {
		video.removeAttribute( 'poster' );
		stack.removeAttribute( 'data-sgs-poster' );
		return;
	}
	if ( video.getAttribute( 'poster' ) !== src ) {
		video.setAttribute( 'poster', src );
	}
	stack.setAttribute( 'data-sgs-poster', '' );
}

/**
 * Set a video's poster once its cover has loaded.
 *
 * @param {HTMLVideoElement} video The video.
 */
function syncPoster( video ) {
	const cover = video
		.closest( '.sgs-media-stack' )
		?.querySelector( 'img.sgs-media-cover' );
	if ( ! cover || ! isShown( video ) ) {
		return;
	}
	if ( cover.complete ) {
		applyPoster( video );
	} else {
		cover.addEventListener( 'load', () => applyPoster( video ), {
			once: true,
		} );
	}
}

/**
 * The first `<source>` whose media query matches now, as the browser's selection picks it.
 *
 * @param {HTMLVideoElement} video The video.
 * @return {HTMLSourceElement|undefined} The chosen source, or undefined when none matches.
 */
function chosenSource( video ) {
	return Array.from( video.querySelectorAll( 'source' ) ).find(
		( s ) => ! s.media || window.matchMedia( s.media ).matches
	);
}

/**
 * Whether the visitor has asked for reduced motion.
 *
 * @return {boolean} True under `prefers-reduced-motion: reduce`.
 */
function reducedMotion() {
	return window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
}

/**
 * Show or hide a video's pause button and set its label: shown while the video is shown and may autoplay.
 *
 * @param {HTMLVideoElement} video The video.
 */
function syncPause( video ) {
	const button = video
		.closest( '.sgs-media-stack' )
		?.querySelector( '[data-sgs-media-pause]' );
	if ( ! button ) {
		return;
	}
	const paused = video.hasAttribute( 'data-sgs-user-paused' );
	button.hidden =
		! video.hasAttribute( 'data-sgs-autoplay' ) ||
		reducedMotion() ||
		! isShown( video );
	button.setAttribute( 'aria-pressed', paused ? 'true' : 'false' );
	const label = paused
		? button.dataset.sgsLabelPlay
		: button.dataset.sgsLabelPause;
	if ( label ) {
		button.setAttribute( 'aria-label', label );
	}
	const bars = button.querySelector( '.sgs-media-pause__bars' );
	const play = button.querySelector( '.sgs-media-pause__play' );
	if ( bars && play ) {
		bars.hidden = paused;
		play.hidden = ! paused;
	}
}

/**
 * Pause or resume a video from its button; the visitor's choice survives breakpoint changes.
 *
 * @param {HTMLVideoElement} video The video.
 */
function togglePause( video ) {
	if ( video.hasAttribute( 'data-sgs-user-paused' ) ) {
		video.removeAttribute( 'data-sgs-user-paused' );
		const promise = video.play();
		if ( promise && typeof promise.catch === 'function' ) {
			promise.catch( () => {} );
		}
	} else {
		video.setAttribute( 'data-sgs-user-paused', '' );
		video.pause();
	}
	syncPause( video );
}

/**
 * Switch an autoplaying embed to its autoplay address, once it is shown and motion is allowed.
 *
 * @param {HTMLIFrameElement} frame The embed.
 */
function settleEmbed( frame ) {
	const target = frame.getAttribute( 'data-sgs-autoplay-src' );
	if ( target && ! reducedMotion() && frame.getClientRects().length > 0 && frame.getAttribute( 'src' ) !== target ) {
		frame.setAttribute( 'src', target );
	}
}

/**
 * Re-run source selection for one video, only when its chosen file changed, and settle its playback.
 *
 * @param {HTMLVideoElement} video The video.
 */
export function settleVideo( video ) {
	const wasPlaying = ! video.paused;
	const before = currentSource( video );
	const chosen = chosenSource( video );

	syncPoster( video );
	syncPause( video );
	if ( ! isShown( video ) || ! chosen ) {
		if ( wasPlaying ) {
			video.pause();
		}
		return;
	}

	// Chrome and Firefox keep the old selection until load() runs again; a reload with the same file restarts it.
	const known = loadedSource.get( video ) ?? before;
	const changed = '' === known || known !== chosen.src;
	if ( changed ) {
		loadedSource.set( video, chosen.src );
		video.load();
	}
	const reduce = reducedMotion();
	if (
		video.hasAttribute( 'data-sgs-autoplay' ) &&
		! video.hasAttribute( 'data-sgs-user-paused' ) &&
		! reduce &&
		( wasPlaying || changed || video.paused )
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
	const frames = Array.from( document.querySelectorAll( EMBED_SELECTOR ) );
	if ( ! videos.length && ! frames.length ) {
		return;
	}
	frames.forEach( settleEmbed );
	videos.forEach( ( video ) => {
		const first = chosenSource( video );
		if ( first ) {
			loadedSource.set( video, first.src );
		}
		video
			.closest( '.sgs-media-stack' )
			?.querySelector( '[data-sgs-media-pause]' )
			?.addEventListener( 'click', () => togglePause( video ) );
		syncPause( video );
		video
			.closest( '.sgs-media-stack' )
			?.querySelector( 'img.sgs-media-cover' )
			?.addEventListener( 'load', () => {
				if ( isShown( video ) ) {
					applyPoster( video );
				}
			} );
		syncPoster( video );
	} );
	// The same edges the renderer prints in each `<source media>` and sibling rule, so a fractional width settles too.
	const queries = [ QUERY_MOBILE_FRACTIONAL, QUERY_TABLET_ONLY_FRACTIONAL ];
	const onChange = () => {
		frames.forEach( settleEmbed );
		videos.forEach( settleVideo );
	};
	queries.forEach( ( q ) =>
		window.matchMedia( q ).addEventListener( 'change', onChange )
	);
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initDeviceVideo );
} else {
	initDeviceVideo();
}
