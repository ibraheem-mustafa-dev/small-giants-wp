/**
 * The values `@sgs/fx-lottie` reads from one Lottie element (Spec 38A FR-38A-52).
 *
 * An effect layer prints `data-sgs-fx-trigger` (absent for the `visible` trigger) and the layer values as
 * `data-sgs-fx-lottie-loop`, `-speed` and `-pause-control`; the server adds `data-src`, the animation file's URL
 * (`sgs_lottie_layer_source_attrs()` in `includes/lottie-render.php`). `sgs_render_lottie()` (the media block and the
 * wrapper background) prints `data-trigger`, `data-loop` and `data-speed` on its own `.sgs-lottie` span instead, so
 * both forms are read until that call is retired.
 *
 * Per-device speed: `data-sgs-fx-lottie-speed-tablet` (viewport 1023px and below) and `-speed-mobile` (767px and
 * below) override the base speed in their range.
 *
 * @package
 */

const TRIGGERS = [ 'load', 'visible', 'hover', 'scroll' ];
const TABLET = '(max-width: 1023px)';
const MOBILE = '(max-width: 767px)';

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
 * @param {Element} el
 * @return {boolean} Whether the element is an effect layer rather than a `sgs_render_lottie()` span.
 */
export function isLayer( el ) {
	return el.hasAttribute( 'data-sgs-fx-lottie-file' );
}

/**
 * The playback speed for the current viewport.
 *
 * @param {Element} el
 * @return {number} Speed, 1 when nothing is stored.
 */
function readSpeed( el ) {
	const matches = ( query ) =>
		'function' === typeof window.matchMedia &&
		window.matchMedia( query ).matches;
	let speed = numberAttr( el, 'data-sgs-fx-lottie-speed' );
	if ( null === speed ) {
		speed = numberAttr( el, 'data-speed' );
	}
	const tablet = numberAttr( el, 'data-sgs-fx-lottie-speed-tablet' );
	const mobile = numberAttr( el, 'data-sgs-fx-lottie-speed-mobile' );
	if ( null !== tablet && matches( TABLET ) ) {
		speed = tablet;
	}
	if ( null !== mobile && matches( MOBILE ) ) {
		speed = mobile;
	}
	return speed && speed > 0 ? speed : 1;
}

/**
 * @param {Element} el One Lottie element.
 * @return {{src: string, trigger: string, loop: boolean, speed: number, pauseControl: boolean}} Its settings.
 */
export function readConfig( el ) {
	const trigger =
		el.getAttribute( 'data-sgs-fx-trigger' ) ||
		el.getAttribute( 'data-trigger' ) ||
		'visible';
	const loop = el.hasAttribute( 'data-sgs-fx-lottie-loop' )
		? 'true' === el.getAttribute( 'data-sgs-fx-lottie-loop' )
		: '1' === el.getAttribute( 'data-loop' );
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
