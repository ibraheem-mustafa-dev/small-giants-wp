/**
 * Shared editor-canvas mirror of the padding/margin box-object preview. Every
 * block carrying `padding`/`margin` attributes uses it, so the canvas shows
 * the same spacing the published page paints instead of a flat, non-moving
 * canvas for a setting that is live on the front end (contract:
 * `.claude/plans/2026-07-09-box-object-interface-contract.md` §5, "editor
 * preview must match the frontend scoped output").
 *
 * `padding` and `margin` are each ONE tier-of-boxes object attribute,
 * `{ desktop: {top,right,bottom,left}, tablet: {...}, mobile: {...} }`; this
 * module reads that shape directly.
 *
 * ⛔ Keep this in step with the PHP path (`class-sgs-container-wrapper.php`).
 * If they disagree, the editor lies about what the page will look like —
 * which is the failure this mirror exists to prevent.
 */

/**
 * Box-object interface contract §1: build an editor-preview shorthand from a
 * 4-side box object — mirrors the pattern already used across every other
 * block's edit.js (e.g. icon-list/edit.js) and render.php's own hand-built
 * shorthand, so the canvas preview matches the frontend.
 *
 * @param {Object|undefined} box  {top,right,bottom,left}, each an already
 *                                 unit-bearing CSS length string or absent.
 * @return {string|undefined} A 4-value CSS shorthand, or undefined when no
 *                             side is set.
 */
export function boxShorthand( box ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	const keys = [ 'top', 'right', 'bottom', 'left' ];
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

/**
 * Resolve one tier-of-boxes attribute for the active preview tier. The frontend
 * emits the desktop box, then a tablet/mobile `@media` rule for EACH side that
 * tier explicitly sets — an unset side at a narrower tier keeps whatever the
 * wider tier declared (ordinary CSS cascade, both `max-width` queries can be
 * true at once). This mirrors that: tablet's declared sides merge over
 * desktop, then mobile's over that.
 *
 * @param {Object|undefined} base   Desktop box.
 * @param {Object|undefined} tablet Tablet box (only declared sides override).
 * @param {Object|undefined} mobile Mobile box (only declared sides override).
 * @param {string}           tier   Active preview tier.
 * @return {Object} Merged box for the active tier.
 */
export function resolveBoxTierPreview( base, tablet, mobile, tier ) {
	const merged = { ...( base && typeof base === 'object' ? base : {} ) };
	if ( tier === 'tablet' || tier === 'mobile' ) {
		const t = tablet && typeof tablet === 'object' ? tablet : {};
		[ 'top', 'right', 'bottom', 'left' ].forEach( ( key ) => {
			if ( t[ key ] ) merged[ key ] = t[ key ];
		} );
	}
	if ( tier === 'mobile' ) {
		const m = mobile && typeof mobile === 'object' ? mobile : {};
		[ 'top', 'right', 'bottom', 'left' ].forEach( ( key ) => {
			if ( m[ key ] ) merged[ key ] = m[ key ];
		} );
	}
	return merged;
}

/**
 * Does a tier-of-boxes attribute hold no value at any tier? An empty object,
 * `{ desktop: {} }` (the declared default) and boxes whose sides are all blank
 * all count as empty — plain key-counting on the default would say "set".
 *
 * @param {Object|undefined} tiers `{ desktop, tablet, mobile }` boxes.
 * @return {boolean} True when no tier declares any side.
 */
export function isTierBoxEmpty( tiers ) {
	if ( ! tiers || typeof tiers !== 'object' ) return true;
	return Object.values( tiers ).every(
		( box ) => ! box || typeof box !== 'object' || Object.values( box ).every( ( side ) => ! side )
	);
}

/**
 * Resolve a tier-of-boxes attribute (`{desktop,tablet,mobile}`, each a
 * `{top,right,bottom,left}` box) into a CSS shorthand for the active tier.
 *
 * @param {Object|undefined} tiers `{ desktop, tablet, mobile }` boxes.
 * @param {string}           tier  Active preview tier ('desktop'|'tablet'|'mobile').
 * @return {string|undefined} A 4-value shorthand, or undefined when nothing is set.
 */
export function tierBoxShorthand( tiers, tier ) {
	const source = tiers && typeof tiers === 'object' ? tiers : {};
	return boxShorthand( resolveBoxTierPreview( source.desktop, source.tablet, source.mobile, tier ) );
}

/**
 * A block's canvas `style` object for padding + margin at the active preview
 * tier. Returns only the keys that resolved to a real shorthand, so a caller
 * can spread the result straight into its style object.
 *
 * @param {Object} attrs         The block's spacing attributes.
 * @param {Object} [attrs.padding] Tier-of-boxes padding attribute.
 * @param {Object} [attrs.margin]  Tier-of-boxes margin attribute.
 * @param {string} tier          Active preview tier ('desktop'|'tablet'|'mobile').
 * @return {{padding?: string, margin?: string}}
 */
export function spacingPreview( { padding, margin }, tier ) {
	const result = {};
	const paddingValue = tierBoxShorthand( padding, tier );
	if ( paddingValue ) result.padding = paddingValue;
	const marginValue = tierBoxShorthand( margin, tier );
	if ( marginValue ) result.margin = marginValue;
	return result;
}
