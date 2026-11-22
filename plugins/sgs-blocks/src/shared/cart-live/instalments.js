/**
 * Instalments note maths, shared by the cart drawer's note (src/blocks/cart/panel-extras.js) and the buy box's
 * (src/blocks/product-card/view.js). The PHP twins are includes/helpers-cart-panel.php::sgs_instalment_minor and
 * ::sgs_instalments_note_fill.
 *
 * @package
 */

/**
 * One instalment of a total, rounded to the nearest minor unit (£139 over 3 is 4633).
 *
 * @param {number} totalMinor The total in minor units.
 * @param {number} count      Number of instalments; below 1 counts as 1.
 * @return {number} One instalment in minor units.
 */
export function instalmentMinor( totalMinor, count ) {
	const parts = Math.max( 1, Number.parseInt( count, 10 ) || 1 );
	return Math.round( Number( totalMinor ) / parts );
}

/**
 * The note's markup with its amount in place: the first %s replaced, or the amount added after a space when the
 * note has no %s.
 *
 * @param {string} template   The typed note (markup).
 * @param {string} safeAmount The amount, already escaped for markup.
 * @return {string} Markup.
 */
export function noteWithAmount( template, safeAmount ) {
	return template.includes( '%s' )
		? template.replace( '%s', () => safeAmount )
		: `${ template } ${ safeAmount }`;
}
