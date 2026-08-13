/**
 * Shared CSS-length helpers for scalar length attributes edited by a
 * `UnitControl` (contract §4.3 — a raw-px `RangeControl` is a violation because
 * it locks the operator to px).
 *
 * WHY THIS EXISTS (2026-08-13). Several blocks stored a scalar length as a
 * `type: number` attribute and appended `px` at render time. Swapping the
 * control to a `UnitControl` changes the stored value to a STRING, so each of
 * those attributes migrates to `type: string` — and WordPress SILENTLY coerces
 * or discards a value whose type does not match the block.json declaration
 * (D338), so getting this wrong loses the setting with no error.
 *
 * The two rules below are the whole contract, and both sides of the render
 * boundary must agree on them:
 *
 *   1. A BARE NUMBER means px. Instances stored before the migration hold a
 *      plain number (e.g. `16`); `16` alone is not a valid CSS length, so both
 *      the editor preview and the PHP emitter append `px`. That is what keeps
 *      every pre-existing instance rendering byte-identically.
 *   2. ZERO means absent. A zero-valued length of any unit emits no
 *      declaration at all, so a bare element stays box-free rather than
 *      carrying a pointless `border-radius:0px`.
 *
 * PHP counterpart: `sgs_css_length_sanitise()` + the bare-number branch in
 * `sgs_label_box_css_rule()` (`includes/helpers-box.php`). Keep the two in step
 * — if the rule changes here it must change there in the SAME commit, or the
 * editor canvas and the frontend will disagree.
 */

/**
 * Units offered for a scalar length control. Matches SpacingControl.js's
 * FREE_UNITS deliberately, so every free-length control in the plugin offers
 * the same set rather than each block inventing its own.
 */
export const SGS_LENGTH_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: '%', label: '%', default: 0 },
];

/**
 * Normalise a `UnitControl` value into a storable CSS length.
 *
 * A bare number gets `px` appended (rule 1) so the stored value is always a
 * valid CSS length or an empty string. Empty/nullish returns '' so the
 * attribute reads as unset rather than as the string "undefined".
 *
 * @param {string|number|undefined|null} raw Raw value from UnitControl onChange.
 * @return {string} A valid CSS length, or '' when unset.
 */
export function sgsNormaliseLength( raw ) {
	if ( raw === undefined || raw === null || raw === '' ) {
		return '';
	}
	const trimmed = String( raw ).trim();
	if ( '' === trimmed ) {
		return '';
	}
	if ( /^\d+(\.\d+)?$/.test( trimmed ) ) {
		return trimmed + 'px';
	}
	return trimmed;
}

/**
 * Is this stored length meaningful (present and non-zero)?
 *
 * Uses `parseFloat`, NOT `parseInt`/`Number`: `parseInt('0.5rem')` is 0, which
 * would silently drop every sub-1 rem/em value, and `Number('1.5rem')` is NaN.
 * `parseFloat('0.5rem')` is 0.5 while `parseFloat('0px')` is 0, which is
 * exactly the zero-is-absent semantic in rule 2. Mirrors the `floatval()` guard
 * in the PHP renderers.
 *
 * @param {string|number|undefined|null} value Stored attribute value.
 * @return {boolean} True when the value should paint.
 */
export function sgsHasLength( value ) {
	if ( value === undefined || value === null || value === '' ) {
		return false;
	}
	const n = parseFloat( value );
	return ! Number.isNaN( n ) && 0 !== n;
}

/**
 * Render a stored length for the editor canvas preview.
 *
 * @param {string|number|undefined|null} value Stored attribute value.
 * @return {string|undefined} A CSS length, or undefined when it should not paint.
 */
export function sgsLengthPreview( value ) {
	if ( ! sgsHasLength( value ) ) {
		return undefined;
	}
	return sgsNormaliseLength( value );
}
