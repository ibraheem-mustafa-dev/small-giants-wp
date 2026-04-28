/**
 * Reading Progress — theme version.
 */
( function() {
	function initReadingProgress( wrapper ) {
		const displayMode       = wrapper.dataset.displayMode       || 'both';
		const targetSelector    = wrapper.dataset.targetSelector    || 'main, article, .entry-content';
		const wpm               = parseInt( wrapper.dataset.wpm, 10 ) || 225;
		const showWhenFinished  = 'true' === wrapper.dataset.showWhenFinished;
		const reducedMotion     = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

		const trackEl     = wrapper.querySelector( '.sgs-reading-progress__fill' );
		const countdownEl = wrapper.querySelector( '.sgs-reading-progress__countdown' );

		let articleEl = null;
		const selectors = targetSelector.split( ',' ).map( ( s ) => s.trim() );
		for ( const sel of selectors ) {
			articleEl = document.querySelector( sel );
			if ( articleEl ) break;
		}
		if ( ! articleEl ) articleEl = document.body;

		const rawText    = articleEl.textContent || '';
		const wordCount  = rawText.trim().split( /\s+/ ).filter( Boolean ).length;
		const totalMins  = Math.max( 1, Math.ceil( wordCount / wpm ) );

		function getProgress() {
			const rect        = articleEl.getBoundingClientRect();
			const articleTop  = rect.top + window.scrollY;
			const viewportBot = window.scrollY + window.innerHeight;
			const scrolled    = viewportBot - articleTop;
			const total       = articleEl.offsetHeight;

			if ( total <= 0 ) return 0;
			return Math.min( 1, Math.max( 0, scrolled / total ) );
		}

		function buildCountdownLabel( minsLeft ) {
			const isNarrow = window.innerWidth < 480;
			if ( 0 === minsLeft ) return isNarrow ? '✓' : 'Done';
			return isNarrow ? minsLeft + 'm' : minsLeft + ' min left';
		}

		function applyProgress( progress ) {
			const percent  = ( progress * 100 ).toFixed( 2 ) + '%';
			const minsLeft = Math.max( 0, Math.ceil( totalMins * ( 1 - progress ) ) );

			wrapper.style.setProperty( '--sgs-reading-progress', percent );
			wrapper.setAttribute( 'aria-valuenow', Math.round( progress * 100 ) );

			if ( trackEl ) trackEl.style.width = percent;
			if ( countdownEl ) countdownEl.textContent = buildCountdownLabel( minsLeft );

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

		let ticking = false;
		window.addEventListener( 'scroll', () => {
			if ( ticking ) return;
			ticking = true;
			requestAnimationFrame( () => {
				applyProgress( getProgress() );
				ticking = false;
			} );
		}, { passive: true } );

		applyProgress( getProgress() );
	}

	document.addEventListener( 'DOMContentLoaded', () => {
		const el = document.getElementById( 'sgs-reading-progress' );
		if ( el ) {
			initReadingProgress( el );
		}
	} );
} )();
