/**
 * Atom: SOURCE (logic half) — which media is showing.
 *
 * PURE. Importable by plain Node — no JSX, no `@wordpress/components` or
 * `@wordpress/block-editor` import (both are webpack externals, genuinely
 * absent from `node_modules`). `@wordpress/i18n` IS installed and is fine
 * here: it is not used in this file directly, but the sibling
 * `source.control.js` needs the JSX/MediaPicker half kept separate per the
 * atom contract (`scripts/check-media-atom-purity.js`).
 *
 * Owns the `source` base set declared in `registry.js` (Image/ImageId/ImageUrl,
 * Video/VideoId/VideoUrl, Svg/SvgContent, Thumbnail/ThumbnailId). Five storage
 * shapes exist across the population for this one concept (see the registry's
 * `reads` field + `sgs_media_element_value()`'s docblock) — this module's OWN
 * canonical shape, used whenever a surface freshly adopts this atom, is the
 * scalar ID+URL PAIR (`{base}Id` + `{base}Url`), because that is what
 * `MediaPicker` naturally returns and it is already the majority shape across
 * the census (`sgs/media`, `sgs/before-after`, `sgs/decorative-image`). The
 * OBJECT shape (`Image`/`Video`/`Thumbnail` as a whole `{id,url,alt}`) used by
 * `sgs/hero`/`sgs/container` is a READ concern for THOSE surfaces' own
 * render.php via `sgs_media_element_value()`, not something this atom's
 * control writes — adopting this atom there is a separate migration.
 *
 * The control UI (pickers, hard-restriction, per-tier art direction) lives in
 * `source.control.js`, which imports `resolveMediaType()` from this file so
 * the "which type is selected" logic is written once.
 *
 * @package SGS\Blocks
 */
import { mediaStoredAttrName } from '../../MediaElementControls.js';

/** The vocabulary this atom's `types` field declares (registry.js: source.types). */
export const TYPE_VOCABULARY = [ 'image', 'video', 'svg' ];

/**
 * Resolve which media type is currently selected, reading the `media-type`
 * atom's `MediaType` base if the surface has adopted it. Falls back to
 * 'image' — the same default `sgs/media`'s own `isImage` check uses.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} prefix     Surface prefix.
 * @param {string} blockSlug  Block slug, for STORED_AS resolution.
 * @return {'image'|'video'|'svg'} Resolved type.
 */
export function resolveMediaType( attributes, prefix, blockSlug ) {
	const attrs = attributes || {};
	const key = mediaStoredAttrName( blockSlug, prefix, 'MediaType' );
	const value = attrs[ key ];
	return TYPE_VOCABULARY.includes( value ) ? value : 'image';
}

/**
 * Disclosure rule. `registry.js` declares `requires: {}` for this atom — it is
 * never disabled or hidden by another atom's state, so it is always shown.
 *
 * @return {{state: 'shown'}}
 */
export function disclosure() {
	return { state: 'shown' };
}

/**
 * Reject-to-default for a picked-media value.
 *
 * Guards against a value whose resolved `type` falls outside this atom's own
 * `types` vocabulary (`registry.js`: image/video/svg) — e.g. a picker that
 * somehow resolves an audio file. Anything else (a plain URL string, `null`)
 * passes through unchanged; this only rejects a shaped media object with an
 * out-of-vocabulary `type`.
 *
 * @param {*} value Candidate value.
 * @return {*} `value` if valid, otherwise `null`.
 */
export function validate( value ) {
	if ( value && 'object' === typeof value && 'type' in value ) {
		return TYPE_VOCABULARY.includes( value.type ) ? value : null;
	}
	return value;
}

/**
 * Custom-property VALUES for a painted BACKDROP. Element-scope surfaces (an
 * `<img>`/`<video>` tag) never call this for paint — the chosen media reaches
 * the page via markup (`src`), not CSS, which is why `sgs/media`'s own
 * mechanism is "sibling-markup" per the census, not a stylesheet rule.
 *
 * Only an IMAGE source is paintable as `background-image`. A video or SVG
 * backdrop needs its own DOM (a `<video>` element or inline `<svg>`), not a
 * CSS property — this atom emits nothing for those types. That is an honest
 * limit of a "both scopes, one concept" atom, not an oversight: see the
 * task report for the explicit call-out.
 *
 * @param {Object} ctx
 * @param {Object} ctx.attributes
 * @param {string} ctx.prefix
 * @param {string} ctx.blockSlug
 * @return {string[]} `--custom-property:value` declarations.
 */
export function css( { attributes, prefix, blockSlug } ) {
	const attrs = attributes || {};
	const name = ( base ) => mediaStoredAttrName( blockSlug, prefix, base );
	const type = resolveMediaType( attrs, prefix, blockSlug );
	const out = [];

	if ( 'image' !== type ) {
		return out;
	}

	const push = ( varName, suffix ) => {
		const url = attrs[ name( 'ImageUrl' + suffix ) ];
		if ( url ) {
			out.push( `${ varName }:url("${ url }")` );
		}
	};

	push( '--sgs-media-background-image', '' );
	push( '--sgs-media-background-image-tablet', 'Tablet' );
	push( '--sgs-media-background-image-mobile', 'Mobile' );

	return out;
}
