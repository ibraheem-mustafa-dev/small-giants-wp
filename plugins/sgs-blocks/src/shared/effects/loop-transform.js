/**
 * SGS motion: the compositor frames a looping effect shares (Spec 38A FR-38A-37, FR-38A-52).
 *
 * A loop that runs for as long as the page is open must animate a property Chrome runs on the compositor thread. A
 * registered custom property (`--sgs-kb-s`, `--sgs-float-y`) cannot be: the main thread recomputes the element's style
 * on every frame, which kept an idle page restyling at 60 frames a second. `transform` can be, and it applies after the
 * individual `translate`, `rotate` and `scale` properties, so a loop that animates it multiplies and adds with whatever
 * `assets/css/motion.css` composes there (a hover or entrance scale, a parallax's translate) instead of replacing it.
 * `composite: 'add'` would also compose, but Chrome does not run a non-replace animation on the compositor.
 *
 * The frame is a movement and a scale relative to the element's resting style:
 *   - the scale is a ratio to `held`, the value the stylesheet already holds for that effect at rest (the computed
 *     `--sgs-kb-s`; 1 for the float), so the held value times the ratio is the authored value at every moment;
 *   - the movement is divided by `lift`, the element's own computed `scale`, because a `transform` translate sits inside
 *     that scale and would otherwise grow with it.
 * An element that already has a CSS `transform` would lose it to a `transform` animation, so `readChannel` says how to
 * keep it:
 *   - an authored transform that nothing animates (a decorative layer's rotation, centring and flip, which its own scoped
 *     CSS sets per tier) is read once and written after the loop's own movement and scale, so `translate() scale()
 *     <that transform>` puts the loop outside it, as the individual `translate` and `scale` properties were; the
 *     effect reads it again when the tier changes or the element resizes;
 *   - the motion `transform` channel (`data-sgs-mc` names it: hover tilt, follow-pointer, an entrance's rotateX) changes
 *     at run time, so a copy of it would go stale: those elements keep the registered-property run.
 *
 * @package
 */

/** Rounding for the ratios and lengths a frame carries. */
const DECIMALS = 1000000;

const round = ( number ) => Math.round( number * DECIMALS ) / DECIMALS;

/**
 * A positive number from computed-style text, or the fallback (`none`, empty and zero count as unreadable).
 *
 * @param {string} text     Computed value, such as `1.08` or `none`.
 * @param {number} fallback Value for unreadable text.
 * @return {number} The number.
 */
export function positive( text, fallback ) {
	const value = parseFloat( text );
	return Number.isFinite( value ) && value > 0 ? value : fallback;
}

/**
 * How a loop animates this element.
 *
 * @param {HTMLElement} el The looping element, with no animation of its own on `transform` running.
 * @return {{channel: string, base: string}} `channel` is `transform` (compositor frames) or `property` (the registered
 *                                           custom property, because the element's `transform` changes at run time);
 *                                           `base` is the authored transform the frames are written in front of, or ''.
 */
export function readChannel( el ) {
	const { transform } = window.getComputedStyle( el );
	if ( ! transform || transform === 'none' ) {
		return { channel: 'transform', base: '' };
	}
	return el.matches( '[data-sgs-mc~="transform"]' )
		? { channel: 'property', base: '' }
		: { channel: 'transform', base: transform };
}

/**
 * The element's whole computed `scale` (the stylesheet's product of every scale channel), 1 when it has none.
 *
 * @param {HTMLElement} el The looping element.
 * @return {number} The scale factor.
 */
export function readLift( el ) {
	return positive( window.getComputedStyle( el ).scale, 1 );
}

/**
 * A length as it must read inside the element's own scale: unchanged at scale 1, a rounded px value for a px length,
 * else a `calc()` division.
 *
 * @param {string} length A CSS length such as `12px` or `10%`.
 * @param {number} lift   The element's scale.
 * @return {string} The length.
 */
function inside( length, lift ) {
	if ( lift === 1 ) {
		return length;
	}
	return /^-?\d*\.?\d+px$/.test( length )
		? `${ round( parseFloat( length ) / lift ) }px`
		: `calc(${ length } / ${ lift })`;
}

/**
 * One compositor keyframe.
 *
 * @param {Object} frame
 * @param {number} [frame.scale] The authored scale at this frame.
 * @param {string} [frame.x]     The authored horizontal movement (a CSS length).
 * @param {string} [frame.y]     The authored vertical movement (a CSS length).
 * @param {number} [frame.held]  The scale the stylesheet already holds for this effect.
 * @param {number} [frame.lift]  The element's own scale.
 * @param {string} [frame.base]  The authored transform to write after the movement and scale, from `readChannel`.
 * @return {{transform: string}} The keyframe.
 */
export function transformFrame( {
	scale = 1,
	x = '0px',
	y = '0px',
	held = 1,
	lift = 1,
	base = '',
} ) {
	const frame = `translate(${ inside( x, lift ) }, ${ inside(
		y,
		lift
	) }) scale(${ round( scale / held ) })`;
	return { transform: base ? `${ frame } ${ base }` : frame };
}
