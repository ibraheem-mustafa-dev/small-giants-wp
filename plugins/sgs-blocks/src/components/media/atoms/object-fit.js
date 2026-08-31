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
 * ── ELEMENT scope is tiered (Bean-directed, 2026-09-01, reversing an earlier
 * documented decision) ───────────────────────────────────────────────────
 * Different media genuinely needs a different fit mode per device — a video
 * that's `cover` on desktop but `contain` on a small mobile screen, so the
 * subject isn't cropped out of frame. `MEDIA_TIERED_BASES`
 * (`MediaElementControls.js`) now carries `ObjectFit`, so this atom emits
 * `ObjectFitTablet`/`ObjectFitMobile` declarations alongside the base, for
 * the ELEMENT scope only. The BACKDROP scope's `Size` base stays untiered —
 * it is not in `MEDIA_TIERED_BASES`, and Bean's ask was about element media
 * (`<img>`/`<video>`), not painted backgrounds.
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

	// Element scope, tiered (MEDIA_TIERED_BASES carries `ObjectFit`).
	const fitKey = mediaStoredAttrName( blockSlug, prefix, 'ObjectFit' );
	const fit = validate( attributes[ fitKey ], 'element' );
	if ( fit ) {
		decls.push( `--sgs-media-object-fit:${ fit }` );
	}
	const fitTabletKey = mediaStoredAttrName( blockSlug, prefix, 'ObjectFitTablet' );
	const fitTablet = validate( attributes[ fitTabletKey ], 'element' );
	if ( fitTablet ) {
		decls.push( `--sgs-media-object-fit-tablet:${ fitTablet }` );
	}
	const fitMobileKey = mediaStoredAttrName( blockSlug, prefix, 'ObjectFitMobile' );
	const fitMobile = validate( attributes[ fitMobileKey ], 'element' );
	if ( fitMobile ) {
		decls.push( `--sgs-media-object-fit-mobile:${ fitMobile }` );
	}

	// Backdrop scope. `Size` is NOT in MEDIA_TIERED_BASES — not tiered.
	const sizeKey = mediaStoredAttrName( blockSlug, prefix, 'Size' );
	const size = validate( attributes[ sizeKey ], 'backdrop' );
	if ( size ) {
		decls.push( `--sgs-media-background-size:${ size }` );
	}

	return decls;
}
