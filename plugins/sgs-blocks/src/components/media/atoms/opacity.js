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
 * `scripts/tests/test-media-atom-parity.mjs`.
 *
 * LOGIC HALF ONLY. Split from the JSX control per the purity contract
 * (`scripts/check-media-atom-purity.js`): this module must be importable by
 * plain Node — no JSX, no `@wordpress/components`. The JSX control lives in
 * `opacity.control.js` and imports from here.
 *
 * @package SGS\Blocks
 */
import { mediaStoredAttrName } from '../../MediaElementControls.js';

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
export function disclosure() {
	return { state: 'shown', hiddenReason: null };
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
 * Custom-property declaration for this atom. Mirrors
 * `includes/media/atoms/opacity.php`'s `sgs_media_atom_opacity_css()`
 * exactly. "Nothing for an empty attribute set" (registry.js's own contract)
 * — the fully-opaque default (1) is the stylesheet's own `var( …, 1 )`
 * fallback, so a client who never touched the control gets no declaration at
 * all, matching every other atom's convention.
 *
 * The gate accepts a numeric STRING as well as a `number` — matching the PHP
 * twin's `is_numeric()` (the atom-family convention: `box-shape.php`/
 * `motion.php`/`overlay.php`/`svg-presentation.php` all gate on `is_numeric()`
 * too). A numeric string is a genuine value on the REST/import path (a stored
 * attribute round-tripped through JSON as `"0.5"` rather than `0.5`), and
 * rejecting it here while PHP accepts it was a JS/PHP parity gap — the same
 * stored value rendered a declaration on the frontend but not in the editor
 * canvas.
 *
 * @param {Object} props
 * @param {Object} props.attributes
 * @param {string} [props.prefix]
 * @param {string} [props.blockSlug]
 * @return {string[]} `--custom-property:value;` declarations, never bare rules.
 */
export function css( { attributes, prefix = '', blockSlug = '' } ) {
	const decls = [];
	const keys = attrKeys( prefix, blockSlug );
	const raw = attributes[ keys.opacity ];
	const isNumeric =
		( 'number' === typeof raw && Number.isFinite( raw ) ) ||
		( 'string' === typeof raw && '' !== raw.trim() && Number.isFinite( Number( raw ) ) );
	if ( isNumeric ) {
		const clamped = validate( raw );
		if ( 1 !== clamped ) {
			decls.push( `--sgs-media-opacity:${ clamped }` );
		}
	}
	return decls;
}
