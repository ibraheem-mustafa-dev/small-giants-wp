/**
 * The values `@sgs/fx-lottie` reads from one Lottie element (Spec 38A FR-38A-52).
 *
 * An effect layer prints `data-sgs-fx-trigger` (absent for the `visible` trigger) and the layer values as
 * `data-sgs-fx-lottie-loop`, `-speed` and `-pause-control`; the server adds `data-src`, the animation file's URL
 * (`sgs_lottie_layer_source_attrs()` in `includes/lottie-render.php`).
 *
 * Speed: the computed custom property `--sgs-lottie-speed` (the emitter writes the tablet and mobile values there inside
 * its media queries), then `data-sgs-fx-lottie-speed`.
 *
 * @package
 */

const TRIGGERS = [ 'load', 'visible', 'hover', 'scroll' ];

/**
 * @param {Element} el
 * @param {string}  name Attribute name.
 * @return {number|null} The attribute as a finite number, else null.
 */
function numberAttr( el, name ) {
	const raw = el.getAttribute( name );
	if ( null === raw || '' === raw.trim() ) {
		return null;
	}
	const value = parseFloat( raw );
	return Number.isFinite( value ) ? value : null;
}

/**
 * The playback speed.
 *
 * @param {Element} el
 * @return {number} Speed, 1 when nothing is stored.
 */
export function readSpeed( el ) {
	const computed = parseFloat(
		window.getComputedStyle( el ).getPropertyValue( '--sgs-lottie-speed' )
	);
	let speed = Number.isFinite( computed ) ? computed : null;
	if ( null === speed ) {
		speed = numberAttr( el, 'data-sgs-fx-lottie-speed' );
	}
	return speed && speed > 0 ? speed : 1;
}

/**
 * @param {Element} el One Lottie element.
 * @return {{src: string, trigger: string, loop: boolean, speed: number, pauseControl: boolean}} Its settings.
 */
export function readConfig( el ) {
	const trigger = el.getAttribute( 'data-sgs-fx-trigger' ) || 'visible';
	const loop = 'true' === el.getAttribute( 'data-sgs-fx-lottie-loop' );
	return {
		src: el.getAttribute( 'data-src' ) || '',
		trigger: TRIGGERS.includes( trigger ) ? trigger : 'visible',
		loop,
		speed: readSpeed( el ),
		pauseControl:
			'true' === el.getAttribute( 'data-sgs-fx-lottie-pause-control' ),
	};
}

/**
 * The element's progress through the viewport, 0 (just entering the bottom edge) to 1 (just leaving the top edge).
 *
 * @param {Element} el
 * @return {number} 0..1.
 */
export function scrollProgress( el ) {
	const rect = el.getBoundingClientRect();
	const viewportHeight =
		window.innerHeight || document.documentElement.clientHeight;
	const total = viewportHeight + rect.height;
	return Math.min( 1, Math.max( 0, ( viewportHeight - rect.top ) / total ) );
}
