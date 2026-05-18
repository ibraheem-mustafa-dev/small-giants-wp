/**
 * view.js — SGS Responsive Logo block frontend script.
 *
 * Loads Vivus Instant (CSS-only SVG path animation, ~15 KB) and wires it to
 * the appropriate trigger based on the data-animation attribute set by
 * render.php. Only runs when an animated logo is present on the page.
 *
 * Supported animation styles:
 *   draw-on-load   — plays immediately on DOMContentLoaded
 *   hover-redraw   — replays on :hover / :focus-within
 *   scroll-trigger — plays when the logo enters the viewport
 *
 * prefers-reduced-motion: all styles skip to the drawn state immediately.
 *
 * No external CDN — Vivus is a peer dependency listed in package.json.
 * WordPress enqueues this module only when data-animation is present on
 * at least one .sgs-responsive-logo element (viewScriptModule in block.json
 * means it loads once per page when the block is used).
 */

/**
 * Lazy-import Vivus. Bundled via @wordpress/scripts so there is no runtime
 * network request — the import() just fetches a local chunk.
 *
 * @returns {Promise<typeof import('vivus')>}
 */
async function loadVivus() {
	const { default: Vivus } = await import( /* webpackChunkName: "vivus" */ 'vivus' );
	return Vivus;
}

/**
 * Wire up a single logo element.
 *
 * @param {HTMLElement} el          The .sgs-responsive-logo wrapper.
 * @param {typeof import('vivus')} Vivus  Vivus constructor.
 * @param {boolean}     reducedMotion Whether prefers-reduced-motion is active.
 */
function wireLogoAnimation( el, Vivus, reducedMotion ) {
	const style    = el.dataset.animation;
	const svgEl    = el.querySelector( '.sgs-responsive-logo__svg svg' );

	if ( ! svgEl || ! style || 'none' === style ) {
		return;
	}

	// Ensure the SVG has an id for Vivus (it targets by id).
	if ( ! svgEl.id ) {
		svgEl.id = 'sgs-logo-svg-' + Math.random().toString( 36 ).slice( 2, 8 );
	}

	/**
	 * Play the animation. When reduced motion is active, skip to the final
	 * frame immediately (duration: 0 is not valid; use 1ms).
	 */
	function play() {
		el.classList.add( 'is-animating' );
		el.classList.remove( 'is-animated' );

		new Vivus( svgEl.id, {
			type:     'delayed',
			duration: reducedMotion ? 1 : 200,
			animTimingFunction: Vivus.EASE_OUT,
			start:    'autostart',
		}, () => {
			el.classList.remove( 'is-animating' );
			el.classList.add( 'is-animated' );
		} );
	}

	if ( 'draw-on-load' === style ) {
		play();
		return;
	}

	if ( 'hover-redraw' === style ) {
		el.addEventListener( 'mouseenter', () => {
			if ( ! el.classList.contains( 'is-animating' ) ) {
				play();
			}
		} );
		el.addEventListener( 'focusin', () => {
			if ( ! el.classList.contains( 'is-animating' ) ) {
				play();
			}
		} );
		return;
	}

	if ( 'scroll-trigger' === style ) {
		const observer = new IntersectionObserver(
			( entries ) => {
				entries.forEach( ( entry ) => {
					if ( entry.isIntersecting && ! el.classList.contains( 'is-animated' ) ) {
						play();
						observer.unobserve( el );
					}
				} );
			},
			{ threshold: 0.2 }
		);
		observer.observe( el );
	}
}

/**
 * Initialise all animated logos on the page.
 */
async function init() {
	const logos = document.querySelectorAll( '.sgs-responsive-logo[data-animation]' );

	if ( ! logos.length ) {
		return;
	}

	// Only load Vivus when at least one animated logo is present.
	const Vivus        = await loadVivus();
	const reducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	logos.forEach( ( el ) => wireLogoAnimation( el, Vivus, reducedMotion ) );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
