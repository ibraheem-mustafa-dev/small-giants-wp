/**
 * Text matching shared by the filter blocks (filter-search, accordion filter).
 *
 * A query matches a haystack when the trimmed, lower-cased query is a substring of the trimmed, lower-cased haystack;
 * an empty or blank query matches everything.
 *
 * @package SGS\Blocks
 */

/**
 * Trim and lower-case a string for comparison.
 *
 * @param {*} text Value to normalise; null and undefined become ''.
 * @return {string} Trimmed lower-case text.
 */
export function normalise( text ) {
	return String( text ?? '' ).trim().toLowerCase();
}

/**
 * Collapse every whitespace run (including line breaks in authored markup) to one space and trim.
 *
 * @param {*} text Value to squash.
 * @return {string} Single-spaced text.
 */
export function squash( text ) {
	return String( text ?? '' ).replace( /\s+/g, ' ' ).trim();
}

/**
 * Whether the haystack contains the query.
 *
 * @param {*} haystack Text to search.
 * @param {*} query    What the visitor typed.
 * @return {boolean} True when the query is blank or found.
 */
export function matches( haystack, query ) {
	const needle = normalise( query );
	return '' === needle || normalise( haystack ).includes( needle );
}
