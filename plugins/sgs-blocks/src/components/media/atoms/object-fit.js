/**
 * `object-fit` atom — LOGIC half (L2b value-setter + validator + disclosure).
 *
 * Split from the JSX control per the purity contract
 * (scripts/check-media-atom-purity.js): this module must be importable by
 * plain Node — no JSX, no `@wordpress/components` (a webpack EXTERNAL, not
 * installed in node_modules). `@wordpress/i18n` IS installed and fine here
 * (measured, not assumed — see the gate's own docblock); this atom happens
 * not to need it since `disclosure()` has no hidden-reason text to translate.
 *
 * One client-facing question ("how should this media fill its box?") backing
 * TWO CSS properties depending on scope (registry.js `vocabulary`):
 *
 *   element scope  -> object-fit        (the `ObjectFit` base)
 *   backdrop scope -> background-size   (the `Size` base)
 *
 * ⛔ `custom` is NOT a member of either vocabulary. `sgs/hero`'s
 * `splitMediaObjectFit` uses it as a SIZING MODE ("explicit width/height"),
 * not a CSS fit value — render.php gates object-fit off entirely when it sees
 * `custom` (hero/render.php:625). That mode belongs to the `box-shape` atom;
 * this atom never validates or emits it.
 *
 * ⛔ NOT declared for `types: ['svg']` (see registry.js) — object-fit does
 * nothing to an inline `<svg>`.
 *
 * The JSX control lives in `object-fit.control.js` and imports `validate`
 * from here.
 *
 * `css()` mirrors `includes/media/atoms/object-fit.php`'s `sgs_media_atom_
 * object_fit_css()` byte-for-byte — enforced by
 * `scripts/tests/test-media-atom-parity.mjs`.
 *
 * @package SGS\Blocks
 */
import { mediaStoredAttrName } from '../../MediaElementControls.js';
import { MEDIA_ATOMS } from './registry.js';

const ATOM_ID = 'object-fit';

/**
 * Reject an out-of-vocabulary fit value to `''` (inherit) rather than storing
 * it. `scope` selects which of the two vocabularies governs the check — an
 * element-legal value (e.g. `fill`) is NOT automatically backdrop-legal.
 *
 * @param {*}      value Raw candidate.
 * @param {string} scope 'element' | 'backdrop'.
 * @return {string} A vocabulary member, or ''.
 */
export function validate( value, scope = 'element' ) {
	const vocabulary = MEDIA_ATOMS[ ATOM_ID ].vocabulary[ scope ] || [];
	return 'string' === typeof value && vocabulary.includes( value ) ? value : '';
}

/**
 * `object-fit` declares an empty `requires` in the registry — always visible,
 * for both scopes.
 *
 * @return {{state: string, hiddenReason: (string|null)}}
 */
export function disclosure() {
	return { state: 'shown', hiddenReason: null };
}

/**
 * Custom-property declarations for this atom. Mirrors
 * `includes/media/atoms/object-fit.php`'s `sgs_media_atom_object_fit_css()`
 * exactly.
 *
 * @param {Object} props
 * @param {Object} props.attributes  Block attributes.
 * @param {string} [props.prefix]    Surface prefix ('' | 'sgs' | 'split' | …).
 * @param {string} [props.blockSlug] Block slug, for `STORED_AS` resolution.
 * @return {string[]} `--custom-property:value;` declarations, never bare rules.
 */
export function css( { attributes, prefix = '', blockSlug = '' } ) {
	const decls = [];

	const fitKey = mediaStoredAttrName( blockSlug, prefix, 'ObjectFit' );
	const fit = validate( attributes[ fitKey ], 'element' );
	if ( fit ) {
		decls.push( `--sgs-media-object-fit:${ fit }` );
	}

	const sizeKey = mediaStoredAttrName( blockSlug, prefix, 'Size' );
	const size = validate( attributes[ sizeKey ], 'backdrop' );
	if ( size ) {
		decls.push( `--sgs-media-background-size:${ size }` );
	}

	return decls;
}
