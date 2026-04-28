/**
 * SGS Reading Progress — frontend scroll tracker.
 *
 * Calculates reading time from the target article element, then updates the
 * progress bar fill and countdown label on every scroll frame. Throttled via
 * requestAnimationFrame. Respects prefers-reduced-motion.
 *
 * @package SGS\Blocks
 */

/**
 * Initialise a single reading-progress block instance.
 *
 * @param {HTMLElement} wrapper The block's root element.
 */
function initReadingProgress( wrapper ) {
	const displayMode       = wrapper.dataset.displayMode       || 'both';
	const targetSelector    = wrapper.dataset.targetSelector    || 'main, article, .entry-content';
	const wpm               = parseInt( wrapper.dataset.wpm, 10 ) || 225;
	const showWhenFinished  = 'true' === wrapper.dataset.showWhenFinished;
	const reducedMotion     = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	const trackEl     = wrapper.querySelector( '.sgs-reading-progress__fill' );
	const countdownEl = wrapper.querySelector( '.sgs-reading-progress__countdown' );

	// ── Find article element ──────────────────────────────────────────────────
	// Walk the comma-separated selector list until we find a matching element.
	let articleEl = null;
	const selectors = targetSelector.split( ',' ).map( ( s ) => s.trim() );
	for ( const sel of selectors ) {
		articleEl = document.querySelector( sel );
		if ( articleEl ) {
			break;
		}
	}
	// Fallback: use document.body so the bar always does something.
	if ( ! articleEl ) {
		articleEl = document.body;
	}

	// ── Calculate total reading time ──────────────────────────────────────────
	// Strip child element tags to get plain text, split on whitespace runs.
	const rawText    = articleEl.textContent || '';
	const wordCount  = rawText.trim().split( /\s+/ ).filter( Boolean ).length;
	const totalMins  = Math.max( 1, Math.ceil( wordCount / wpm ) );

	// ── Progress calculation ──────────────────────────────────────────────────
	/**
	 * Return the fraction [0,1] of how far the user has scrolled through the
	 * article element.
	 *
	 * @return {number} Progress between 0 and 1.
	 */
	function getProgress() {
		const rect        = articleEl.getBoundingClientRect();
		const articleTop  = rect.top + window.scrollY;
		const articleEnd  = articleTop + articleEl.offsetHeight;
		const viewportBot = window.scrollY + window.innerHeight;

		// How far the bottom of the viewport has travelled into the article,
		// expressed as a fraction of the article's total height.
		const scrolled = viewportBot - articleTop;
		const total    = articleEl.offsetHeight;

		if ( total <= 0 ) {
			return 0;
		}
		return Math.min( 1, Math.max( 0, scrolled / total ) );
	}

	// ── Countdown label helper ────────────────────────────────────────────────
	/**
	 * Build the countdown string shown to the user.
	 *
	 * Uses abbreviated format ("2m") on narrow viewports to keep the pill compact.
	 *
	 * @param {number} minsLeft Minutes remaining (already rounded).
	 * @return {string} Human-readable label.
	 */
	function buildCountdownLabel( minsLeft ) {
		const isNarrow = window.innerWidth < 480;
		if ( 0 === minsLeft ) {
			return isNarrow ? '✓' : 'Done';
		}
		return isNarrow
			? minsLeft + 'm'
			: minsLeft + ' min left';
	}

	// ── Update DOM ────────────────────────────────────────────────────────────
	/**
	 * Apply the current progress value to the bar fill and countdown label.
	 *
	 * @param {number} progress Fraction 0–1.
	 */
	function applyProgress( progress ) {
		const percent  = ( progress * 100 ).toFixed( 2 ) + '%';
		const minsLeft = Math.max( 0, Math.ceil( totalMins * ( 1 - progress ) ) );

		// Update CSS variable on the wrapper — the fill width reads this.
		wrapper.style.setProperty( '--sgs-reading-progress', percent );

		// Keep ARIA progressbar in sync.
		wrapper.setAttribute( 'aria-valuenow', Math.round( progress * 100 ) );

		// Bar fill element (display mode: bar | both).
		if ( trackEl && ( 'bar' === displayMode || 'both' === displayMode ) ) {
			trackEl.style.width = percent;
		}

		// Countdown label (display mode: countdown | both).
		if ( countdownEl && ( 'countdown' === displayMode || 'both' === displayMode ) ) {
			countdownEl.textContent = buildCountdownLabel( minsLeft );
		}

		// Hide when finished (unless showWhenFinished is true).
		if ( progress >= 1 && ! showWhenFinished ) {
			if ( reducedMotion ) {
				wrapper.hidden = true;
			} else {
				wrapper.classList.add( 'sgs-reading-progress--finished' );
			}
		} else {
			wrapper.hidden = false;
			wrapper.classList.remove( 'sgs-reading-progress--finished' );
		}
	}

	// ── Scroll listener (RAF-throttled) ───────────────────────────────────────
	let ticking = false;

	function onScroll() {
		if ( ticking ) {
			return;
		}
		ticking = true;
		requestAnimationFrame( () => {
			applyProgress( getProgress() );
			ticking = false;
		} );
	}

	window.addEventListener( 'scroll', onScroll, { passive: true } );

	// Run once on load to set initial state (e.g. user refreshed mid-article).
	applyProgress( getProgress() );
}

// Initialise all instances on the page.
document.querySelectorAll( '.sgs-reading-progress' ).forEach( initReadingProgress );
