/**
 * `link` atom — L2b control + disclosure + validator + value-setter.
 *
 * Was hand-rolled directly in `sgs/media`'s `edit.js` (a `LinkPopoverField`
 * mount inside that block's "Caption & Link" `PanelBody`, IMAGE-ONLY per its
 * `{ isImage && ( <LinkPopoverField ... /> ) }` gate) and rendered by
 * `render.php`'s own link-wrapping logic (unchanged — this atom is
 * CONTROL-only, see `css()` below). Zero attribute rename: `linkUrl`/
 * `linkOpensNewTab`/`linkRel` already match this atom's own canonical bases
 * exactly.
 *
 * NON-PAINT, EDITORIAL, IMAGE-ONLY — the closest precedent is the `meaning`
 * atom (a text/structure choice, never a stylesheet value), so `css()`
 * always returns empty. `types: ['image']` mirrors the hand-rolled gate this
 * atom replaces — the design doc's own `backdrop` context excludes link
 * outright for the same reason it excludes caption ("it sits BEHIND
 * content … Caption and link belong to foreground media").
 *
 * LOGIC HALF ONLY. Split from the JSX control per the purity contract
 * (`scripts/check-media-atom-purity.js`): this module must be importable by
 * plain Node — no JSX, no `@wordpress/components`. The JSX control lives in
 * `link.control.js` and imports from here.
 *
 * @package SGS\Blocks
 */
import { mediaStoredAttrName } from '../../MediaElementControls.js';
import { isLegacyCall, rulesFor, kindIn, omitted } from '../panels/disclosure-context.js';

/**
 * @param {string} prefix    Surface prefix.
 * @param {string} blockSlug Block slug, for STORED_AS resolution.
 * @return {{url: string, newTab: string, rel: string, source: string}} Stored attribute names.
 */
export function attrKeys( prefix, blockSlug ) {
	return {
		url: mediaStoredAttrName( blockSlug, prefix, 'LinkUrl' ),
		newTab: mediaStoredAttrName( blockSlug, prefix, 'LinkOpensNewTab' ),
		rel: mediaStoredAttrName( blockSlug, prefix, 'LinkRel' ),
		// Where the link goes ('' = the typed URL); src/components/LinkSourcePicker.js.
		source: mediaStoredAttrName( blockSlug, prefix, 'LinkUrlSource' ),
	};
}

/** Unconditional — nothing gates the link fields off. */
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
	return rulesFor( 'link', attrs, device, prefix, opts, ( base, c ) =>
		c.background || ! kindIn( c, 'image' ) ? omitted() : undefined
	);
}

/**
 * Reject-to-default for the link URL — required by the atom contract
 * (`scripts/check-media-atom-purity.js`). `LinkPopoverField` owns URL
 * validation/search UI itself; this is a defensive pass-through.
 *
 * @param {*} value Raw candidate.
 * @return {string} `value` if it is a string, otherwise `''`.
 */
export function validate( value ) {
	return 'string' === typeof value ? value : '';
}

/**
 * No CSS. The link is an anchor wrapper, never a stylesheet value.
 *
 * @return {Array} Always empty.
 */
export function css() {
	return [];
}
