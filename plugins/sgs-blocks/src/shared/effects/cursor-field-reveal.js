/**
 * SGS motion: the full reveal of the `image-reveal` cursor field (Spec 38A). Tier V.
 *
 * The mouse-follow circle belongs to the mouse. Keyboard and touch visitors get the whole image instead: focus entering the
 * emitter (or any focusable inside it) opens the reveal, focus leaving closes it, and a touch or pen tap toggles it (a second
 * tap, or a tap outside, closes it). The module only sets `data-sgs-reveal-open` on the emitter; `assets/css/fx-cursor-field.css`
 * grows the revealed circle to cover the element on that flag, and under reduced motion the same rule applies with no
 * transition, so the image appears without the animated growth.
 *
 * An emitter that carries `data-sgs-cursor-field-touch="circle"` (the renderer prints it for the touch mode setting) answers
 * a tap differently: the tap sets `data-sgs-reveal-tap` instead, which the stylesheet turns into the hover-sized circle at the
 * card centre, and the next tap (or a tap outside) removes it. Keyboard focus still opens the whole image.
 *
 * @package
 */
import { focusRests } from './motion-utils.js';

const OPEN_ATTR = 'data-sgs-reveal-open';
const TAP_ATTR = 'data-sgs-reveal-tap';

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
	const setFlag = ( name, on ) => {
		if ( on ) {
			el.setAttribute( name, '' );
			return;
		}
		el.removeAttribute( name );
	};

	// A tap sets the flag; the focus it causes must neither close it nor keep it open on the next tap, so focus and
	// tap own separate state. Only keyboard focus opens it: the last input anywhere on the page decides, so a mouse
	// click on a link inside the card never opens it, and a Tab in from elsewhere after a tap does.
	let focused = false;
	let tapped = false;
	let lastInputWasPointer = false;
	// Read at each tap, so a re-rendered emitter changes mode without a rebind.
	const circleOnTap = () =>
		'circle' === el.getAttribute( 'data-sgs-cursor-field-touch' );
	const sync = () => {
		const circle = circleOnTap();
		setFlag( OPEN_ATTR, focused || ( tapped && ! circle ) );
		setFlag( TAP_ATTR, tapped && circle );
	};

	const onFocusIn = () => {
		if ( lastInputWasPointer || focusRests( el ) ) {
			return;
		}
		focused = true;
		sync();
	};
	const onKeyDown = () => {
		lastInputWasPointer = false;
	};
	const onPointerDown = () => {
		lastInputWasPointer = true;
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
		lastInputWasPointer = true;
		focused = false;
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
	doc.addEventListener( 'keydown', onKeyDown, true );
	doc.addEventListener( 'pointerdown', onPointerDown, true );
	el.addEventListener( 'focusout', onFocusOut );
	el.addEventListener( 'pointerup', onPointerUp );
	doc.addEventListener( 'pointerdown', onOutside, true );

	return () => {
		el.removeEventListener( 'focusin', onFocusIn );
		doc.removeEventListener( 'keydown', onKeyDown, true );
		doc.removeEventListener( 'pointerdown', onPointerDown, true );
		el.removeEventListener( 'focusout', onFocusOut );
		el.removeEventListener( 'pointerup', onPointerUp );
		doc.removeEventListener( 'pointerdown', onOutside, true );
		el.removeAttribute( OPEN_ATTR );
		el.removeAttribute( TAP_ATTR );
	};
}
