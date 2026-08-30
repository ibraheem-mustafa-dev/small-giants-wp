/**
 * Atom: INTRINSIC (logic half) — the chosen media's own pixel dimensions.
 *
 * PURE. Importable by plain Node. Owns `ImageWidth`/`ImageHeight`
 * (registry.js: `intrinsic.bases`). `clientEditable: false` in the registry —
 * this atom has NO control, so `intrinsic.control.js` is trivial (an empty
 * `control()`), moved there anyway so the file shape stays uniform across all
 * ten atoms per `scripts/check-media-atom-purity.js`.
 *
 * The renderer emits `width`/`height` HTML ATTRIBUTES on the `<img>` tag from
 * these values (the browser reserves layout space from those before the image
 * loads — the actual CLS-prevention mechanism, not a CSS rule). A client
 * never edits these; exposing them would invite a value that contradicts the
 * file, which is exactly what the registry's own comment warns against.
 *
 * ⛔ Do not confuse this with `box-shape`'s `Width`/`Height` bases (a
 * DIFFERENT pair of names, deliberately) — those are the CLIENT-FACING sizing
 * controls (fixed height, aspect ratio, etc.) owned by another atom. This
 * atom's `ImageWidth`/`ImageHeight` are read-only, written from the media
 * itself when it is picked (by the `source` atom's picker, or the block's own
 * `onChange`), never from an inspector row.
 *
 * `css()` returns an empty array. Intrinsic dimensions reach the page as HTML
 * attributes, not stylesheet rules — there is no CSS property this atom
 * legitimately owns, and inventing a custom property nothing reads would be
 * exactly the dead-control class this framework's gates exist to catch.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

/**
 * Always omitted. There is no row to show, disable, or hide conditionally —
 * the atom simply never surfaces a control.
 *
 * @return {{state: 'omitted', hiddenReason: string}}
 */
export function disclosure() {
	return {
		state: 'omitted',
		hiddenReason: __(
			'Intrinsic dimensions are written from the chosen media and are never edited directly.',
			'sgs-blocks'
		),
	};
}

/**
 * Reject-to-default for a candidate dimension.
 *
 * A dimension that is not a finite positive number cannot describe a real
 * media file's pixel size, so it is rejected to `null` (the renderer's own
 * "no intrinsic size known" state) rather than stored as-is.
 *
 * @param {*} value Candidate width or height.
 * @return {number|null} A rounded positive integer, or `null`.
 */
export function validate( value ) {
	const n = Number( value );
	return Number.isFinite( n ) && n > 0 ? Math.round( n ) : null;
}

/**
 * No CSS. Intrinsic width/height are HTML attributes, not stylesheet values.
 *
 * @return {Array} Always empty.
 */
export function css() {
	return [];
}
