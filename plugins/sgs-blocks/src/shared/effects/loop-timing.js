/**
 * SGS motion: the timing readers every looping effect shares (Spec 38A FR-38A-37). Re-exported by `@sgs/loop-control`.
 *
 * @package
 */

const DEFAULTS = {
	period: 4200,
	phase: 0,
	easing: 'ease-in-out',
	direction: 'alternate',
};
const DIRECTIONS = [ 'normal', 'reverse', 'alternate', 'alternate-reverse' ];

/**
 * A time custom property as milliseconds (`4200ms`, `4.2s`, a bare number), or the fallback.
 *
 * @param {string} text     The property's computed text.
 * @param {number} fallback Value when the text is empty or unreadable.
 * @return {number} Milliseconds.
 */
export function parseTime( text, fallback ) {
	const match = /^\s*(-?\d*\.?\d+)\s*(ms|s)?\s*$/.exec( text || '' );
	if ( ! match ) {
		return fallback;
	}
	const value = parseFloat( match[ 1 ] );
	return match[ 2 ] === 's' ? value * 1000 : value;
}

/**
 * A length custom property as CSS text (`12px`), or the fallback.
 *
 * @param {string} text     The property's computed text.
 * @param {string} fallback Value when the text is empty or unreadable.
 * @return {string} A length.
 */
export function parseLength( text, fallback ) {
	const value = ( text || '' ).trim();
	return /^-?\d*\.?\d+(px|rem|em|%)?$/.test( value ) ? value : fallback;
}

/**
 * The shared timing of a loop from its computed custom properties `--sgs-<name>-period`, `-phase`, `-easing` and
 * `-direction`.
 *
 * @param {HTMLElement} el   The loop element.
 * @param {string}      name The effect's property prefix, for example `float`.
 * @return {{period: number, phase: number, easing: string, direction: string}} Timing in milliseconds.
 */
export function readLoopTiming( el, name ) {
	const style = window.getComputedStyle( el );
	const get = ( key ) =>
		style.getPropertyValue( `--sgs-${ name }-${ key }` ).trim();
	const direction = get( 'direction' );
	const period = parseTime( get( 'period' ), DEFAULTS.period );
	return {
		period: period > 0 ? period : DEFAULTS.period,
		phase: Math.max( 0, parseTime( get( 'phase' ), DEFAULTS.phase ) ),
		easing: get( 'easing' ) || DEFAULTS.easing,
		direction: DIRECTIONS.includes( direction )
			? direction
			: DEFAULTS.direction,
	};
}
