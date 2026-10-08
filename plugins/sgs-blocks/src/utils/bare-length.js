/**
 * bareLength — the editor-canvas twin of includes/helpers-css-safety.php's bare-number rule in sgs_css_length_value().
 *
 * A length stored as digits only (`"24"`, from imported content; the inspector always writes a unit) prints as
 * `24px` on the page, or as the spacing preset `var(--wp--preset--spacing--24)` when the theme registers a preset
 * with that slug. The canvas applies the same rule so a bare number does not preview as no value at all.
 *
 * @package SGS\Blocks
 */

/**
 * The spacing-preset slugs the theme registers, as the block editor reports them. Empty outside the editor.
 *
 * @return {string[]} Slugs.
 */
function themeSpacingSlugs() {
	try {
		const sizes = window.wp.data.select( 'core/block-editor' ).getSettings().__experimentalFeatures?.spacing?.spacingSizes;
		return Object.values( sizes ?? {} )
			.flat()
			.map( ( size ) => String( size.slug ) );
	} catch ( e ) {
		return [];
	}
}

/**
 * @param {string|undefined} value  A stored length.
 * @param {string[]}         [slugs] Registered spacing-preset slugs; read from the editor when omitted.
 * @return {string|undefined} The value, with a unit or preset reference when it was digits only.
 */
export function bareLength( value, slugs ) {
	if ( 'string' !== typeof value || ! /^\d+$/.test( value ) ) {
		return value;
	}
	return ( slugs ?? themeSpacingSlugs() ).includes( value ) ? `var(--wp--preset--spacing--${ value })` : `${ value }px`;
}
