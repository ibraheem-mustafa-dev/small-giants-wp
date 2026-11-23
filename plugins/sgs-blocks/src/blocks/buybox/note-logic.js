/**
 * sgs/buybox note: the pure rules (Spec 27 FR-27-PS8), kept apart from the DOM so they can be tested alone.
 *
 * @package SGS\Blocks
 */

/** The count is announced once this many characters (or fewer) are left, or a fifth of the limit when that is larger. */
const NEAR_LIMIT_FLOOR = 20;

/**
 * Characters left before the limit.
 *
 * @param {string} value Text in the box.
 * @param {number} max   The limit.
 * @return {number} Never below 0.
 */
export function charsLeft( value, max ) {
	return Math.max( 0, max - Array.from( value ).length );
}

/**
 * Whether the polite count should speak: the shopper is close to the limit.
 *
 * @param {number} left Characters left.
 * @param {number} max  The limit.
 * @return {boolean} True when left is within the near-limit window and the limit is above 0.
 */
export function isNearLimit( left, max ) {
	return (
		max > 0 && left <= Math.max( NEAR_LIMIT_FLOOR, Math.ceil( max / 5 ) )
	);
}

/**
 * The cart proxy's `fields` row for the note, or null when the box is empty.
 *
 * @param {string} label The note's label (names the row on the line and the order).
 * @param {string} value Text in the box.
 * @param {number} max   The limit, applied here as well as by the server.
 * @return {{label:string,value:string,note:true}|null} The row.
 */
export function noteRow( label, value, max ) {
	const text = Array.from( String( value ).trim() )
		.slice( 0, max > 0 ? max : undefined )
		.join( '' );
	return '' === text ? null : { label, value: text, note: true };
}

/**
 * Whether the note lets the add go ahead.
 *
 * @param {boolean} required Whether the note is compulsory.
 * @param {string}  value    Text in the box.
 * @return {boolean} False only when a compulsory note is empty.
 */
export function noteReady( required, value ) {
	return ! required || '' !== String( value ).trim();
}
