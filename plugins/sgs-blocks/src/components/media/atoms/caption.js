/**
 * `caption` atom — L2b control + disclosure + validator + value-setter.
 *
 * Was hand-rolled directly in `sgs/media`'s `edit.js` (a `TextControl` +
 * `SelectControl` pair inside that block's own "Caption & Link" `PanelBody`,
 * unchanged by this atom since `caption`/`captionTag` already match this
 * atom's own canonical bases exactly — zero attribute rename) and rendered
 * by `render.php`'s own caption-markup builder (unchanged — this atom is
 * CONTROL-only, see `css()` below).
 *
 * NON-PAINT, EDITORIAL — the closest precedent is the `meaning` atom
 * (alt-text): a text/structure choice, never a stylesheet value, so `css()`
 * always returns empty. `captionColour`/`captionFontSize` (the caption's own
 * PAINT) stay OUTSIDE this atom's scope — `captionColour` is wired through
 * `SgsColourPanel` directly in `edit.js` per this project's standard colour
 * architecture (every block's colour rows live in one `SgsColourPanel` mount,
 * never scattered per-atom), and `captionFontSize`/`Unit` have no editor
 * control at all today (a pre-existing gap, out of this atom's scope to
 * close).
 *
 * `types: ['image', 'video']` — mirrors the hand-rolled gate this atom
 * replaces (`( isImage || isVideo ) && <PanelBody title="Caption & Link">`).
 * The design doc's own `backdrop` context excludes caption outright
 * ("player chrome … caption, link — it sits BEHIND content"); this atom is
 * adopted only by `root`/`element`-context surfaces.
 *
 * LOGIC HALF ONLY. Split from the JSX control per the purity contract
 * (`scripts/check-media-atom-purity.js`): this module must be importable by
 * plain Node — no JSX, no `@wordpress/components`. The JSX control lives in
 * `caption.control.js` and imports from here.
 *
 * @package SGS\Blocks
 */
import { mediaStoredAttrName } from '../../MediaElementControls.js';
import { isLegacyCall, rulesFor, kindIn, omitted } from '../panels/disclosure-context.js';

const ALLOWED_TAGS = [ 'figcaption', 'div' ];

/**
 * @param {string} prefix    Surface prefix.
 * @param {string} blockSlug Block slug, for STORED_AS resolution.
 * @return {{caption: string, tag: string}} Stored attribute names.
 */
export function attrKeys( prefix, blockSlug ) {
	return {
		caption: mediaStoredAttrName( blockSlug, prefix, 'Caption' ),
		tag: mediaStoredAttrName( blockSlug, prefix, 'CaptionTag' ),
	};
}

/**
 * Reject an out-of-vocabulary `CaptionTag` value to 'figcaption' — mirrors
 * `render.php`'s existing `in_array( $caption_tag_raw, $allowed_caption_tags, true )` gate.
 *
 * @param {*} value Raw candidate.
 * @return {string} A vocabulary member.
 */
export function validateTag( value ) {
	return 'string' === typeof value && ALLOWED_TAGS.includes( value ) ? value : 'figcaption';
}

/** Unconditional — nothing gates the caption fields off. */
function legacyDisclosure() {
	return { state: 'shown', hiddenReason: null };
}

/**
 * Per-base disclosure at the active device (Spec 49 §9.3). Returns a map of
 * base to `{ state, hiddenReason }`, the second legal return shape. Called the
 * earlier way, `disclosure( { attributes, prefix, blockSlug } )`, it returns
 * what it always did.
 *
 * @param {Object} attrs  Block attributes.
 * @param {string} device 'desktop' | 'tablet' | 'mobile'.
 * @param {string} prefix Surface prefix.
 * @param {Object} opts   `{ blockSlug, kinds, context, parallax }`.
 * @return {Object} Per-base states.
 */
export function disclosure( attrs, device, prefix = '', opts = {} ) {
	if ( isLegacyCall( attrs, device ) ) {
		return legacyDisclosure( attrs );
	}
	return rulesFor( 'caption', attrs, device, prefix, opts, ( base, c ) => {
		if ( c.background || ! kindIn( c, 'image', 'video' ) ) {
			return omitted();
		}
		return 'CaptionTag' === base && ! c.has( 'Caption' ) ? omitted() : undefined;
	} );
}

/**
 * Reject-to-default for the caption TEXT — required by the atom contract
 * (`scripts/check-media-atom-purity.js`).
 *
 * @param {*} value Raw candidate.
 * @return {string} `value` if it is a string, otherwise `''`.
 */
export function validate( value ) {
	return 'string' === typeof value ? value : '';
}

/**
 * No CSS. Caption text/tag are HTML content and structure, never stylesheet
 * values — same contract as the `meaning` atom's `css()`.
 *
 * @return {Array} Always empty.
 */
export function css() {
	return [];
}
