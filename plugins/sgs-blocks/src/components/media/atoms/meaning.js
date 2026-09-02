/**
 * Atom: MEANING (logic half) — accessibility text for the media.
 *
 * PURE. Importable by plain Node — no JSX, no `@wordpress/components`
 * import. `@wordpress/i18n`'s `__()` IS used here: `hiddenReason` is text a
 * client reads, and `@wordpress/i18n` is genuinely installed (confirmed via
 * `node_modules`), unlike `@wordpress/components`/`@wordpress/block-editor`.
 *
 * Owns `ImageAlt`/`VideoAlt`/`ImageDecorative` (registry.js:
 * `meaning.bases`). `registry.js` declares one cross-base rule:
 * `requires: { ImageAlt: [ '!ImageDecorative' ] }` — alt text is
 * meaningless once the client marks the media decorative, and leaving both
 * live produces an alt string no screen reader ever reads.
 *
 * Per-instance BY DESIGN (registry.js's own comment): the same logo image is
 * meaningful in a header and decorative in a footer strip, so this atom never
 * derives a value from the media itself — it is always an explicit editorial
 * choice.
 *
 * The control UI lives in `meaning.control.js`, which imports
 * `resolveMediaType()`/`altBaseFor()` from this file so the "which alt base
 * applies" logic is written once.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

import { mediaAttrName, mediaStoredAttrName } from '../../MediaElementControls.js';

export const TYPE_VOCABULARY = [ 'image', 'video', 'svg' ];

/**
 * Which alt base applies for the resolved media type.
 *
 * @param {'image'|'video'|'svg'} type Resolved media type.
 * @return {'ImageAlt'|'VideoAlt'} The base this atom edits.
 */
export function altBaseFor( type ) {
	return 'video' === type ? 'VideoAlt' : 'ImageAlt';
}

/**
 * Resolve the current media type, reading the `media-type` atom's `MediaType`
 * base when the surface has adopted it. Falls back to 'image'.
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
 * Disclosure rule for the atom's one CONDITIONAL row (alt text). The
 * decorative toggle itself is unconditional — `registry.js` never disables
 * or hides it — so it is not what this reports; a single-state contract
 * only needs to describe the row `requires` actually governs.
 *
 * @param {Object} ctx
 * @param {Object} ctx.attributes
 * @param {string} ctx.prefix
 * @return {{state: 'shown'|'disabled', hiddenReason?: string}}
 */
export function disclosure( { attributes, prefix } ) {
	const attrs = attributes || {};
	const key = mediaAttrName( prefix, 'ImageDecorative' );
	const isDecorative = !! attrs[ key ];

	return isDecorative
		? {
				state: 'disabled',
				hiddenReason: __(
					'Alt text is meaningless once the media is marked decorative.',
					'sgs-blocks'
				),
		  }
		: { state: 'shown' };
}

/**
 * Reject-to-default for an alt-text value.
 *
 * Anything that is not a string cannot be read aloud by a screen reader, so
 * it is rejected to the empty string rather than stored as-is.
 *
 * @param {*} value Candidate alt text.
 * @return {string} `value` if it is a string, otherwise `''`.
 */
export function validate( value ) {
	return 'string' === typeof value ? value : '';
}

/**
 * No CSS. Alt text and the decorative flag are HTML attributes
 * (`alt=""`/`aria-hidden="true"`/`role="presentation"`), never stylesheet
 * values.
 *
 * @return {Array} Always empty.
 */
export function css() {
	return [];
}
