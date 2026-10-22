/**
 * SGS motion: the full reveal of the `image-reveal` cursor field (Spec 38A). Tier V.
 *
 * The mouse-follow circle belongs to the mouse. Keyboard and touch visitors get the whole image instead: focus entering the
 * emitter (or any focusable inside it) opens the reveal, focus leaving closes it, and a touch or pen tap toggles it (a second
 * tap, or a tap outside, closes it). The module only sets `data-sgs-reveal-open` on the emitter; `assets/css/fx-cursor-field.css`
 * grows the revealed circle to cover the element on that flag, and under reduced motion the same rule applies with no
 * transition, so the image appears without the animated growth.
 *
 * @package
 */

const OPEN_ATTR = 'data-sgs-reveal-open';

/**
 * Whether a pointer event came from a finger or a pen.
 *
 * @param {PointerEvent} event Pointer event.
 * @return {boolean} True for touch and pen.
 */
function isTapPointer( event ) {
	return 'touch' === event.pointerType || 'pen' === event.pointerType;
}

/**
 * Bind the focus and tap reveal on one `image-reveal` emitter.
 *
 * @param {HTMLElement} el Emitter element.
 * @return {Function} Teardown.
 */
export function initRevealOpen( el ) {
	const doc = el.ownerDocument;
	const setOpen = ( on ) => {
		if ( on ) {
			el.setAttribute( OPEN_ATTR, '' );
			return;
		}
		el.removeAttribute( OPEN_ATTR );
	};

	// A tap sets the flag; the focus it causes must not close it again, so focus and tap own separate state.
	let focused = false;
	let tapped = false;
	const sync = () => setOpen( focused || tapped );

	const onFocusIn = () => {
		focused = true;
		sync();
	};
	const onFocusOut = ( event ) => {
		if ( event.relatedTarget && el.contains( event.relatedTarget ) ) {
			return;
		}
		focused = false;
		sync();
	};
	const onPointerUp = ( event ) => {
		if ( ! isTapPointer( event ) ) {
			return;
		}
		tapped = ! tapped;
		sync();
	};
	const onOutside = ( event ) => {
		if ( ! tapped || ! isTapPointer( event ) || el.contains( event.target ) ) {
			return;
		}
		tapped = false;
		sync();
	};

	el.addEventListener( 'focusin', onFocusIn );
	el.addEventListener( 'focusout', onFocusOut );
	el.addEventListener( 'pointerup', onPointerUp );
	doc.addEventListener( 'pointerdown', onOutside, true );

	return () => {
		el.removeEventListener( 'focusin', onFocusIn );
		el.removeEventListener( 'focusout', onFocusOut );
		el.removeEventListener( 'pointerup', onPointerUp );
		doc.removeEventListener( 'pointerdown', onOutside, true );
		el.removeAttribute( OPEN_ATTR );
	};
}
