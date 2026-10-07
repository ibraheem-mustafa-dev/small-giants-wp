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

/** The four sides of a padding/margin/border-width box, in CSS shorthand order. */
export const BOX_SIDE_KEYS = Object.freeze( [ 'top', 'right', 'bottom', 'left' ] );

/** The four corners of a border-radius box, in CSS shorthand order. */
export const BOX_CORNER_KEYS = Object.freeze( [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );

/**
 * Box-object interface contract §1: build an editor-preview shorthand from a
 * 4-side box object — mirrors the pattern already used across every other
 * block's edit.js (e.g. icon-list/edit.js) and render.php's own hand-built
 * shorthand, so the canvas preview matches the frontend.
 *
 * @param {Object|undefined} box  {top,right,bottom,left} (or the corner keys),
 *                                 each an already unit-bearing CSS length string or absent.
 * @param {string[]}         [keys] Box keys in shorthand order; BOX_CORNER_KEYS for a radius.
 * @return {string|undefined} A 4-value CSS shorthand, or undefined when no
 *                             side is set.
 */
export function boxShorthand( box, keys = BOX_SIDE_KEYS ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
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
 * @param {string[]}         [keys] The box keys to merge (BOX_CORNER_KEYS for a radius).
 * @return {Object} Merged box for the active tier.
 */
export function resolveBoxTierPreview( base, tablet, mobile, tier, keys = BOX_SIDE_KEYS ) {
	const merged = { ...( base && typeof base === 'object' ? base : {} ) };
	if ( tier === 'tablet' || tier === 'mobile' ) {
		const t = tablet && typeof tablet === 'object' ? tablet : {};
		keys.forEach( ( key ) => {
			if ( t[ key ] ) merged[ key ] = t[ key ];
		} );
	}
	if ( tier === 'mobile' ) {
		const m = mobile && typeof mobile === 'object' ? mobile : {};
		keys.forEach( ( key ) => {
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
 * Two front-end emitters exist, and the preview must follow the block's own:
 *  - per-side (default): the tier's `@media` rule sets only the sides that tier
 *    declares (`wp_style_engine_get_styles`, `sgs_emit_responsive_css` with
 *    `box`), so unset sides keep the wider tier's value;
 *  - whole box (`wholeBox` true): the tier's rule is one shorthand with unset
 *    sides as 0 (`sgs_box_object_shorthand` / `sgs_corner_object_shorthand`
 *    per tier), so the narrowest tier that declares anything wins outright.
 *
 * @param {Object|undefined} tiers      `{ desktop, tablet, mobile }` boxes.
 * @param {string}           tier       Active preview tier ('desktop'|'tablet'|'mobile').
 * @param {string[]}         [keys]     Box keys in shorthand order (BOX_CORNER_KEYS for a
 *                                      border-radius tier object).
 * @param {boolean}          [wholeBox] True for a whole-shorthand-per-tier emitter.
 * @return {string|undefined} A 4-value shorthand, or undefined when nothing is set.
 */
export function tierBoxShorthand( tiers, tier, keys = BOX_SIDE_KEYS, wholeBox = false ) {
	const source = tiers && typeof tiers === 'object' ? tiers : {};
	if ( wholeBox ) {
		const chain = { tablet: [ 'tablet', 'desktop' ], mobile: [ 'mobile', 'tablet', 'desktop' ] }[ tier ] || [ 'desktop' ];
		for ( const t of chain ) {
			const value = boxShorthand( source[ t ], keys );
			if ( value ) {
				return value;
			}
		}
		return undefined;
	}
	return boxShorthand( resolveBoxTierPreview( source.desktop, source.tablet, source.mobile, tier, keys ), keys );
}

/**
 * Resolve a padding or margin tier-of-boxes attribute into longhand style keys
 * for the SET sides only (`{ paddingTop: '12px' }`), for a block whose
 * render.php prints padding and margin through sgs_box_object_longhands().
 *
 * An unset side gets no key, so the canvas shows what the block's stylesheet or
 * a wider tier gives it — the same as the front end. tierBoxShorthand() would
 * print `0` for it instead. Tiers merge per side exactly as the front end's
 * @media rules cascade (resolveBoxTierPreview): a mobile tier that sets only the
 * top keeps the tablet tier's other sides.
 *
 * @param {Object|undefined} tiers  `{ desktop, tablet, mobile }` boxes.
 * @param {string}           tier   Active preview tier ('desktop'|'tablet'|'mobile').
 * @param {string}           family 'padding' or 'margin'.
 * @return {Object} Style keys for the set sides; `{}` when none is set.
 */
export function tierBoxLonghands( tiers, tier, family ) {
	if ( 'padding' !== family && 'margin' !== family ) {
		return {};
	}
	const source = tiers && 'object' === typeof tiers ? tiers : {};
	const merged = resolveBoxTierPreview( source.desktop, source.tablet, source.mobile, tier );
	const style = {};
	BOX_SIDE_KEYS.forEach( ( side ) => {
		if ( merged[ side ] ) {
			style[ family + side.charAt( 0 ).toUpperCase() + side.slice( 1 ) ] = merged[ side ];
		}
	} );
	return style;
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
