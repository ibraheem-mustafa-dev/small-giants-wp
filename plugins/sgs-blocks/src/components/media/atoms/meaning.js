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
import { isLegacyCall, rulesFor, kindIn, omitted } from '../panels/disclosure-context.js';

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
function legacyDisclosure( { attributes, prefix } ) {
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
	return rulesFor( 'meaning', attrs, device, prefix, opts, ( base, c ) => {
		const decorative = !! c.get( 'ImageDecorative' ) && 'embed' !== c.kind;
		if ( 'ImageDecorative' === base ) {
			if ( ! kindIn( c, 'image', 'video', 'svg' ) ) {
				return omitted();
			}
			return ! c.background && c.has( 'LinkUrl' ) ? omitted() : undefined;
		}
		if ( 'ImageAlt' === base ) {
			return kindIn( c, 'image', 'svg' ) && ! decorative ? undefined : omitted();
		}
		return kindIn( c, 'video', 'embed' ) && ! decorative ? undefined : omitted();
	} );
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
