/**
 * Countdown Timer — frontend interactivity.
 *
 * Reads data-target or data-evergreen attributes and updates
 * the displayed numbers every second.
 *
 * @package SGS\Blocks
 */

function initCountdown( el ) {
	const targetAttr = el.dataset.target;
	const evergreenSeconds = parseInt( el.dataset.evergreen, 10 );
	const serverTs = parseInt( el.dataset.serverTs, 10 );
	const expiredMessage = el.dataset.expiredMessage || 'This offer has expired.';

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

	function update() {
		const now = Date.now();
		let diff = Math.max( 0, Math.floor( ( targetTime - now ) / 1000 ) );

		if ( diff <= 0 ) {
			if ( gridEl ) gridEl.hidden = true;
			if ( expiredEl ) {
				expiredEl.hidden = false;
				expiredEl.setAttribute( 'aria-hidden', 'false' );
			}
			return;
		}

		const days = Math.floor( diff / 86400 );
		diff %= 86400;
		const hours = Math.floor( diff / 3600 );
		diff %= 3600;
		const minutes = Math.floor( diff / 60 );
		const seconds = diff % 60;

		if ( daysEl ) daysEl.textContent = pad( days );
		if ( hoursEl ) hoursEl.textContent = pad( hours );
		if ( minutesEl ) minutesEl.textContent = pad( minutes );
		if ( secondsEl ) secondsEl.textContent = pad( seconds );

		requestAnimationFrame( () => setTimeout( update, 1000 ) );
	}

	update();
}

document.querySelectorAll( '.sgs-countdown' ).forEach( initCountdown );
