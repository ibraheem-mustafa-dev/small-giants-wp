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
import { isLegacyCall, rulesFor, kindIn, omitted, disabled, REASONS } from '../panels/disclosure-context.js';

import { DEVICES, add, nodes, own, resolved, rulesCss, scalar } from '../emit/core.js';
import { mediaLength } from '../emit/values.js';
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
	return rulesFor( 'fit', attrs, device, prefix, opts, ( base, c ) => {
		if ( 'Size' === base ) {
			return c.background ? undefined : omitted();
		}
		if ( c.background || ! kindIn( c, 'image', 'video', 'svg' ) ) {
			return omitted();
		}
		return c.boxCrops ? undefined : disabled( REASONS.noCrop );
	} );
}

const EMIT_FITS = [ 'cover', 'contain', 'fill', 'none', 'scale-down' ];
const EMIT_REPEATS = [ 'repeat', 'repeat-x', 'repeat-y', 'no-repeat' ];

/**
 * C3 emitter: `object-fit` on the media element once per device that sets its own Fit. Tile (backgrounds) prints
 * `background-repeat` and `background-size` instead, and Pinned prints `background-attachment:fixed`. PHP twin:
 * `sgs_media_atom_object_fit_emit()`.
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
	for ( const device of DEVICES ) {
		const fit = own( attrs, slot, 'Fit', device );
		if ( EMIT_FITS.includes( fit ) ) {
			add( rules, media, device, 'object-fit', fit );
		} else if ( 'tile' === fit ) {
			const repeat = resolved( attrs, slot, 'Repeat', device );
			const size = mediaLength( resolved( attrs, slot, 'TileSize', device ), [ 'auto' ] );
			add( rules, media, device, 'background-repeat', EMIT_REPEATS.includes( repeat ) ? repeat : 'repeat' );
			add( rules, media, device, 'background-size', '' !== size ? size : 'auto' );
		}
	}
	if ( true === scalar( attrs, slot, 'Pinned' ) ) {
		add( rules, media, 'desktop', 'background-attachment', 'fixed' );
	}
	return rulesCss( rules );
}
