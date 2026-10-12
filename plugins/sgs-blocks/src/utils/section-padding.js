/**
 * The section padding default in the editor (Spec 32 FR-32-15), mirroring
 * `SGS_Container_Wrapper::render` and theme/sgs-theme/assets/css/layout-tokens.css.
 *
 * A container with a content band (page content, the gate the wrapper's `.has-global-padding` uses) takes the
 * snapshot's `settings.custom.section.padding.{tier}` as its top and bottom padding unless it sits inside another
 * such container, and any padding the client sets wins.
 */

const BAND_BOX_SIDES = [ 'top', 'right', 'bottom', 'left' ];

/**
 * Whether a container's attributes give it a content band, as the wrapper's `$has_band_props` decides on the
 * desktop tier: a content width other than full, or any band padding or margin side.
 *
 * @param {Object} attributes Container attributes.
 * @return {boolean} Has a content band.
 */
export function hasContentBand( attributes ) {
	const width = attributes?.contentWidth?.desktop ?? '';
	if (
		'string' === typeof width &&
		'' !== width.trim() &&
		'full' !== width
	) {
		return true;
	}
	return [
		attributes?.contentBandPadding?.desktop,
		attributes?.contentBandMargin?.desktop,
	].some(
		( box ) =>
			box &&
			'object' === typeof box &&
			BAND_BOX_SIDES.some(
				( side ) => box[ side ] !== undefined && box[ side ] !== ''
			)
	);
}

/**
 * The padding control's declared defaults for the tier being edited: the token's value on top and bottom.
 *
 * @param {Object} custom The theme's `settings.custom` (from `useSettings( 'custom' )`).
 * @param {string} tier   'desktop' | 'tablet' | 'mobile'.
 * @return {Object} `{ top, bottom }`, or `{}` when the snapshot sets no token for the tier.
 */
export function sectionPaddingDefaults( custom, tier ) {
	const value = custom?.section?.padding?.[ tier ];
	if ( 'string' !== typeof value || '' === value.trim() ) {
		return {};
	}
	return { top: value, bottom: value };
}
