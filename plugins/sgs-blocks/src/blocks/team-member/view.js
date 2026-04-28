/**
 * Team Member — frontend interactivity.
 *
 * Handles touch-device tap-to-toggle for the hover overlay feature.
 * On pointer (hover) devices the overlay is handled purely by CSS :hover.
 * On touch devices we toggle an `.is-overlay-active` class on tap so the
 * bio overlay can be revealed without a persistent hover state.
 *
 * @package SGS\Blocks
 */

function initTeamMemberOverlay() {
	const photoWrappers = document.querySelectorAll(
		'.sgs-has-hover-overlay .sgs-team-member__photo--has-overlay'
	);

	if ( photoWrappers.length === 0 ) {
		return;
	}

	// Only wire up touch handling when the primary input is coarse (touch screen).
	// Fine-pointer (mouse) devices rely entirely on CSS :hover.
	const isTouch = window.matchMedia( '(pointer: coarse)' ).matches;

	if ( ! isTouch ) {
		return;
	}

	photoWrappers.forEach( ( wrapper ) => {
		wrapper.addEventListener( 'click', ( e ) => {
			// If the overlay is already active, a second tap dismisses it.
			const isActive = wrapper.classList.contains( 'is-overlay-active' );

			// Close any other open overlays first.
			document.querySelectorAll(
				'.sgs-team-member__photo--has-overlay.is-overlay-active'
			).forEach( ( el ) => el.classList.remove( 'is-overlay-active' ) );

			if ( ! isActive ) {
				wrapper.classList.add( 'is-overlay-active' );
				// Prevent the tap from immediately propagating to the document
				// listener below (which would close it again).
				e.stopPropagation();
			}
		} );
	} );

	// Tap outside any overlay card closes all open overlays.
	document.addEventListener( 'click', () => {
		document.querySelectorAll(
			'.sgs-team-member__photo--has-overlay.is-overlay-active'
		).forEach( ( el ) => el.classList.remove( 'is-overlay-active' ) );
	} );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initTeamMemberOverlay );
} else {
	initTeamMemberOverlay();
}
