/**
 * Countdown Timer — frontend interactivity.
 *
 * Reads data-target or data-evergreen attributes and updates
 * the displayed numbers every second. Supports a flip animation
 * for digit changes and an ended state with a CSS class.
 *
 * @package SGS\Blocks
 */

/**
 * Animate a digit element with a flip effect when its value changes.
 *
 * Uses CSS perspective + rotateX via a class toggle. The CSS for
 * .sgs-countdown--digit-flip is in style.css.
 *
 * @param {Element} el       The span element displaying the digit.
 * @param {string}  newValue The new padded string value.
 */
function flipDigit( el, newValue ) {
	if ( el.textContent === newValue ) {
		return; // No change — skip.
	}

	// Add the flip class to trigger the animation.
	el.classList.add( 'sgs-countdown__number--flipping' );

	// Swap the value at the midpoint of the animation (150ms = half of 300ms total).
	setTimeout( () => {
		el.textContent = newValue;
	}, 150 );

	// Remove the class once the animation completes so it can retrigger next second.
	setTimeout( () => {
		el.classList.remove( 'sgs-countdown__number--flipping' );
	}, 300 );
}

/**
 * Update a digit element — flip style or plain text swap.
 *
 * @param {Element|null} el        Target span, or null to skip.
 * @param {string}       newValue  Padded string (e.g. "07").
 * @param {boolean}      useFlip   Whether to use the flip animation.
 */
function updateDigit( el, newValue, useFlip ) {
	if ( ! el ) {
		return;
	}
	if ( useFlip ) {
		flipDigit( el, newValue );
	} else if ( el.textContent !== newValue ) {
		el.textContent = newValue;
	}
}

function initCountdown( el ) {
	const targetAttr = el.dataset.target;
	const evergreenSeconds = parseInt( el.dataset.evergreen, 10 );
	const serverTs = parseInt( el.dataset.serverTs, 10 );
	const expiredMessage = el.dataset.expiredMessage || 'This offer has expired.';
	const digitStyle = el.dataset.digitStyle || 'simple';
	const useFlip = digitStyle === 'flip';

	// Reduced motion check — disable flip if user prefers reduced motion.
	const prefersReducedMotion = window.matchMedia(
		'(prefers-reduced-motion: reduce)'
	).matches;
	const shouldFlip = useFlip && ! prefersReducedMotion;

	let targetTime;

	if ( evergreenSeconds ) {
		const storageKey = 'sgs-countdown-' + ( el.id || btoa( el.dataset.evergreen ) );
		const stored = localStorage.getItem( storageKey );

		if ( stored && parseInt( stored, 10 ) > Date.now() ) {
			targetTime = parseInt( stored, 10 );
		} else {
			targetTime = Date.now() + ( evergreenSeconds * 1000 );
			localStorage.setItem( storageKey, targetTime.toString() );
		}
	} else if ( serverTs ) {
		targetTime = serverTs * 1000;
	} else if ( targetAttr ) {
		targetTime = new Date( targetAttr ).getTime();
	} else {
		return;
	}

	const daysEl = el.querySelector( '.sgs-countdown__days' );
	const hoursEl = el.querySelector( '.sgs-countdown__hours' );
	const minutesEl = el.querySelector( '.sgs-countdown__minutes' );
	const secondsEl = el.querySelector( '.sgs-countdown__seconds' );
	const expiredEl = el.querySelector( '.sgs-countdown__expired' );
	const gridEl = el.querySelector( '.sgs-countdown__grid' );

	function pad( n ) {
		return String( n ).padStart( 2, '0' );
	}

	function showEnded() {
		if ( gridEl ) {
			gridEl.hidden = true;
		}
		el.classList.add( 'sgs-countdown--ended' );
		if ( expiredEl ) {
			expiredEl.hidden = false;
			expiredEl.setAttribute( 'aria-hidden', 'false' );
		}
	}

	function update() {
		const now = Date.now();
		let diff = Math.max( 0, Math.floor( ( targetTime - now ) / 1000 ) );

		if ( diff <= 0 ) {
			showEnded();
			return;
		}

		const days = Math.floor( diff / 86400 );
		diff %= 86400;
		const hours = Math.floor( diff / 3600 );
		diff %= 3600;
		const minutes = Math.floor( diff / 60 );
		const seconds = diff % 60;

		updateDigit( daysEl, pad( days ), shouldFlip );
		updateDigit( hoursEl, pad( hours ), shouldFlip );
		updateDigit( minutesEl, pad( minutes ), shouldFlip );
		updateDigit( secondsEl, pad( seconds ), shouldFlip );

		requestAnimationFrame( () => setTimeout( update, 1000 ) );
	}

	update();
}

document.querySelectorAll( '.sgs-countdown' ).forEach( initCountdown );
