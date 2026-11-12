/**
 * `opacity` atom — L2b control + disclosure + validator + value-setter.
 *
 * Was hand-rolled directly in `sgs/media`'s `edit.js` (a `RangeControl` inside
 * that block's own "Media Styling" `ToolsPanel`) and `render.php` (a bare
 * `opacity:` declaration on `$id_sel`, D-note "opacity."). This atom is that
 * control promoted to the shared layer — one CSS custom property,
 * `--sgs-media-opacity`, applied on `.sgs-media-el` (Wave 5c, 2026-09-01).
 *
 * `css()` mirrors `includes/media/atoms/opacity.php`'s
 * `sgs_media_atom_opacity_css()` byte-for-byte — enforced by
 * `scripts/tests/test-media-emitter-parity.mjs`.
 *
 * LOGIC HALF ONLY. Split from the JSX control per the purity contract
 * (`scripts/check-media-atom-purity.js`): this module must be importable by
 * plain Node — no JSX, no `@wordpress/components`. The JSX control lives in
 * `opacity.control.js` and imports from here.
 *
 * @package SGS\Blocks
 */
import { mediaStoredAttrName } from '../../MediaElementControls.js';
import { isLegacyCall, rulesFor, kindIn, omitted } from '../panels/disclosure-context.js';

import { emitPlain, nodes, num, rulesCss } from '../emit/core.js';
import { isNumeric, mediaBlend } from '../emit/values.js';
/**
 * @param {string} prefix    Surface prefix.
 * @param {string} blockSlug Block slug, for STORED_AS resolution.
 * @return {{opacity: string}} The stored attribute name.
 */
export function attrKeys( prefix, blockSlug ) {
	return {
		opacity: mediaStoredAttrName( blockSlug, prefix, 'Opacity' ),
	};
}

/**
 * Unconditional — nothing gates opacity off. Kept for contract parity with
 * every other atom's `control()` caller.
 *
 * @return {{state: string, hiddenReason: null}}
 */
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
	return rulesFor( 'opacity', attrs, device, prefix, opts, ( base, c ) =>
		kindIn( c, 'embed' ) ? omitted() : undefined
	);
}

/**
 * Clamp to the valid CSS `opacity` range, rejecting a non-numeric value to
 * the fully-opaque default — mirrors `render.php`'s old
 * `max( 0.0, min( 1.0, floatval(...) ) )` clamp exactly.
 *
 * @param {*} value Raw candidate.
 * @return {number} A value in [0, 1].
 */
export function validate( value ) {
	const n = Number( value );
	if ( ! Number.isFinite( n ) ) {
		return 1;
	}
	return Math.max( 0, Math.min( 1, n ) );
}

/**
 * C3 emitter: `opacity` (Opacity 0 to 100, per device; a desktop 100 is the default and prints nothing) and
 * `mix-blend-mode` (Blend) on the media element. PHP twin: `sgs_media_atom_opacity_emit()`.
 *
 * @param {Object}  slot   Slot `{ prefix, kinds, context, wrapper }`.
 * @param {Object}  attrs  Attributes.
 * @param {string}  uid    Scope class, without the dot.
 * @param {boolean} helper Whether the helper is printed.
 * @return {string} CSS, '' when nothing is set.
 */
export function emit( slot, attrs, uid, helper ) {
	const { media } = nodes( slot, uid, helper );
	const rules = {};
	emitPlain(
		rules,
		attrs,
		slot,
		'Opacity',
		media,
		'opacity',
		( raw ) => ( isNumeric( raw ) ? num( Math.max( 0, Math.min( 100, Number( raw ) ) ) / 100 ) : '' ),
		'1'
	);
	emitPlain( rules, attrs, slot, 'Blend', media, 'mix-blend-mode', mediaBlend );
	return rulesCss( rules );
}
