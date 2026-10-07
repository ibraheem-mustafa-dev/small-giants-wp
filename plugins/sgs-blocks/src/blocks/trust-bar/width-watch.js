/**
 * SGS Trust Badges — re-run a measurement when an element's WIDTH changes.
 *
 * view.js measures the badge track once on init and again when the marquee
 * breakpoint is crossed. A viewport that narrows while staying inside the marquee
 * range crosses no breakpoint, so this watches the wrapper's width instead.
 *
 * - Width only: a height-only change (the marquee clones, a wrapping caption) is ignored.
 * - The observer's initial callback is ignored: the baseline is read when the watch starts.
 * - At most one callback per animation frame, however many resize events arrive.
 * - `rebase()` re-reads the baseline; the caller invokes it after its own measurement so
 *   any width change that measurement caused itself can never trigger another run.
 *
 * @param {HTMLElement} element  The element whose width is watched.
 * @param {Function}    onChange Called (at most once per frame) after a real width change.
 * @return {{ rebase: Function }} Controls for the watch.
 */
export function watchWidth( element, onChange ) {
	let lastWidth = element.offsetWidth;
	let frame = 0;

	const check = () => {
		frame = 0;
		const width = element.offsetWidth;
		if ( width === lastWidth ) {
			return;
		}
		lastWidth = width;
		onChange();
	};

	const schedule = () => {
		if ( 0 === frame ) {
			frame = window.requestAnimationFrame( check );
		}
	};

	if ( 'ResizeObserver' in window ) {
		new ResizeObserver( schedule ).observe( element );
	} else {
		// Older browsers without ResizeObserver: window resize is the nearest signal.
		window.addEventListener( 'resize', schedule );
	}

	return {
		rebase() {
			lastWidth = element.offsetWidth;
		},
	};
}
