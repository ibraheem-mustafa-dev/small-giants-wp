/**
 * SGS motion: the pause button the loop control creates (Spec 38A FR-38A-37).
 *
 * The markup of `sgs_motion_pause_button()` in `includes/helpers-motion-pause.php` (`inline` placement), styled by
 * `assets/css/motion-pause.css`. One button per block root, owned by the root's loop group.
 *
 * @package
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function icon( kind, path ) {
	const svg = document.createElementNS( SVG_NS, 'svg' );
	svg.setAttribute(
		'class',
		`sgs-motion-pause__icon sgs-motion-pause__icon--${ kind }`
	);
	svg.setAttribute( 'viewBox', '0 0 24 24' );
	svg.setAttribute( 'width', '20' );
	svg.setAttribute( 'height', '20' );
	svg.setAttribute( 'aria-hidden', 'true' );
	svg.setAttribute( 'focusable', 'false' );
	const shape = document.createElementNS( SVG_NS, 'path' );
	shape.setAttribute( 'd', path );
	shape.setAttribute( 'fill', 'currentColor' );
	svg.appendChild( shape );
	return svg;
}

function createButton( label ) {
	const button = document.createElement( 'button' );
	button.type = 'button';
	button.className = 'sgs-motion-pause sgs-motion-pause--inline';
	button.setAttribute( 'aria-pressed', 'false' );
	button.setAttribute( 'aria-label', label );
	button.setAttribute( 'data-sgs-motion-pause', '' );
	button.hidden = true;
	button.appendChild( icon( 'pause', 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z' ) );
	button.appendChild( icon( 'play', 'M8 5v14l11-7z' ) );
	return button;
}

/**
 * Create the root's pause button once and wire it to the group's controller.
 *
 * @param {Object}      group   The root's loop group (`controller`, `button`, `stopReduced`).
 * @param {HTMLElement} root    The block root.
 * @param {HTMLElement} el      The looping element.
 * @param {string}      label   The button's accessible name.
 * @param {Object}      reduced `{ matches(), onChange( listener ) }` over the reduced-motion preference.
 */
export function ensureButton( group, root, el, label, reduced ) {
	if ( group.button ) {
		return;
	}
	const button = createButton( label );
	button.addEventListener( 'click', () => {
		const pressed = button.getAttribute( 'aria-pressed' ) === 'true';
		if ( pressed ) {
			group.controller.play();
		} else {
			group.controller.pause();
		}
		button.setAttribute( 'aria-pressed', pressed ? 'false' : 'true' );
	} );
	if ( root === el ) {
		el.after( button );
	} else {
		root.appendChild( button );
	}
	group.button = button;
	// A CSS loop does not run under reduced motion, so the button stays hidden then.
	const showWhenMoving = ( isReduced ) => {
		button.hidden = isReduced;
	};
	showWhenMoving( reduced.matches() );
	group.stopReduced = reduced.onChange( showWhenMoving );
}

/**
 * Remove the root's button and stop following the reduced-motion preference.
 *
 * @param {Object} group The root's loop group.
 */
export function removeButton( group ) {
	if ( group.stopReduced ) {
		group.stopReduced();
		group.stopReduced = null;
	}
	if ( group.button ) {
		group.button.remove();
		group.button = null;
	}
}
