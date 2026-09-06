/**
 * patchTier() — the ONE safe way to write one device tier of a tier-object attribute.
 *
 * WordPress's `setAttributes` REPLACES an attribute's whole value; it never merges nested
 * keys. A tier-object attribute (`{desktop, tablet, mobile}`, or the box-of-tiers shape
 * `{desktop:{top,right,bottom,left}, tablet:{...}, mobile:{...}}`) is ONE attribute, so an
 * unguarded `setAttributes({ x: { [tier]: value } })` silently DISCARDS the other two
 * tiers — no error, no warning, indistinguishable from a client's setting vanishing on its
 * own. WordPress itself provides no protection against this: a tier-object attribute
 * declares no nested `properties` schema (confirmed live, Phase 2 Step 2 — a malformed
 * sub-key passes through `prepare_attributes_for_render()` completely unchanged), so this
 * helper — not a WP-native check — is the entire defence.
 *
 * Every control that writes a tier of a tier-object attribute MUST go through this
 * function. Do not hand-roll a nested `setAttributes` call.
 */

const VALID_TIERS = new Set( [ 'desktop', 'tablet', 'mobile' ] );

/**
 * @param {Object}   attributes    The block's current attributes object.
 * @param {Function} setAttributes The block's setAttributes function.
 * @param {string}   attrName      The tier-object attribute's name (e.g. 'padding',
 *                                 'splitMediaObjectPosition').
 * @param {string}   tier          One of 'desktop' | 'tablet' | 'mobile'.
 * @param {*}        value         The new value for that tier (any type the attribute's
 *                                 per-tier value can hold — a scalar, `null` for inherit,
 *                                 or a box object `{top,right,bottom,left}`).
 */
export function patchTier( attributes, setAttributes, attrName, tier, value ) {
	if ( ! VALID_TIERS.has( tier ) ) {
		throw new Error(
			`patchTier(): "${ tier }" is not a valid tier for "${ attrName }" — expected ` +
				'desktop, tablet, or mobile. Refusing to write a garbage key rather than ' +
				'guessing.'
		);
	}
	const current = attributes[ attrName ];
	const base = current && typeof current === 'object' ? current : {};
	setAttributes( {
		[ attrName ]: {
			...base,
			[ tier ]: value,
		},
	} );
}
