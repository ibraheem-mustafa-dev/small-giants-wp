/**
 * `media-type` atom — LOGIC half (pure: css/validate/disclosure).
 *
 * Owns `MEDIA_BASES.type` = [ 'MediaType', 'VideoSource', 'VideoMimeType' ]
 * (registry.js). See the registry entry for the measured disagreement this
 * atom reconciles:
 *
 *   - `sgs/media` / `sgs/before-after`: canonical 3-member enum.
 *   - `sgs/hero`: same 3 at the base tier, but `splitMediaTypeTablet` /
 *     `splitMediaTypeMobile` add a 4th member, `''`, meaning "inherit from
 *     the tier above" — never a real media type.
 *   - `sgs/container`: NO attribute at all. The type is inferred at render
 *     from which of `backgroundImage` / `bgVideo` / `bgSvgContent` is
 *     non-empty, and video silently beats image with no editor warning.
 *     Adopting this atom is what gives that surface a real choice.
 *
 * `VideoMimeType` has NO editor control. It is auto-derived from the
 * uploaded file (on internal media selection) or the URL's file extension
 * (on render, see `media/render.php`'s MIME auto-detect) — same
 * `clientEditable: false` shape as the `intrinsic` atom's width/height, just
 * not marked as such in the registry because it lives under `type` rather
 * than its own atom.
 *
 * ⛔ THE CONTROL/LOGIC SPLIT IS A CONTRACT (`scripts/check-media-atom-purity.js`).
 * `control()` — the JSX/`@wordpress/components` half, and the
 * non-destructive-switch behaviour it implements — lives in
 * `media-type.control.js`. This file must stay importable by plain Node: no
 * unresolvable `@wordpress/*` packages, no JSX, no `control()` export. It is
 * what `scripts/tests/test-media-atom-parity.mjs` actually imports.
 *
 * @package SGS\Blocks
 */

/** The canonical 3-member enum (registry `types` field, verbatim). */
export const CANONICAL_ENUM = [ 'image', 'video', 'svg' ];

/** The tiered enum: the canonical 3 plus the inherit sentinel. */
export const TIER_ENUM = [ '', ...CANONICAL_ENUM ];

/**
 * Reject-to-default validator.
 *
 * @param {string}  value                    Candidate value.
 * @param {Object}  [opts]
 * @param {boolean} [opts.allowInherit=false] True for a tiered sibling
 *                                            attribute (Tablet/Mobile).
 * @return {string} `value` if it is in the permitted enum, else the default
 *                   ('' for a tiered attribute, 'image' for the base).
 */
export function validate( value, { allowInherit = false } = {} ) {
	const allowed = allowInherit ? TIER_ENUM : CANONICAL_ENUM;
	if ( allowed.includes( value ) ) {
		return value;
	}
	return allowInherit ? '' : 'image';
}

/**
 * `requires: {}` in the registry — media-type is never gated by a sibling
 * attribute, so it is always reachable.
 *
 * @return {{state: string, hiddenReason: null}}
 */
export function disclosure() {
	return { state: 'shown', hiddenReason: null };
}

/**
 * media-type is a MARKUP discriminator (which element renders — `<img>`,
 * `<video>` or inline `<svg>`), never a paintable CSS property. It emits no
 * custom-property declarations in either realm — see
 * `assets/css/media-atoms/media-type.css` for the same note on the
 * stylesheet side.
 *
 * @return {string[]} Always empty.
 */
export function css() {
	return [];
}
