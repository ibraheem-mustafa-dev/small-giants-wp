/**
 * `overlay` atom — L2b control + disclosure + validator + value-setter.
 *
 * THREE implementations existed before this atom, one of them bypassing the
 * shared emitter (census `presentation.disagreements`, "overlay"):
 *   - `sgs_overlay_decls()` (helpers-tokens.php:1003) — the shared VALUE
 *     primitive, 2 callers (`class-sgs-container-wrapper.php`,
 *     `hero/render.php`'s own section-level overlay).
 *   - `sgs_overlay_decls_for()` (helpers-colour-variants.php:316) — the
 *     attribute-level façade wrapper.
 *   - `sgs/hero`'s SPLIT-COLUMN overlay (`mediaOverlayColour`/
 *     `mediaOverlayGradient`) — calls NEITHER, has no opacity, no blend
 *     mode, no hover and no tiers. This atom is the fix: routing that
 *     surface through it gives it the missing four for free.
 *
 * This atom's `css()` cannot call `sgs_overlay_decls()` directly — that
 * helper returns full CSS DECLARATIONS (`background-color:…;opacity:…`),
 * and every media atom is contracted to emit ONLY `--custom-property:value`
 * strings (`_base.css`'s L4 contract). Instead it reuses the PAINT-VALUE
 * primitive one layer down (`sgs_background_paint_value()`, which already
 * does gradient-wins-over-colour + palette-token/raw-CSS-colour resolution)
 * and re-expresses the result, opacity clamp and blend-mode allowlist as
 * custom properties. `assets/css/media-atoms/overlay.css` applies them via
 * `background-color`/`background-image`/`opacity`/`mix-blend-mode` on a
 * `.sgs-media-el::after` layer, which is how every existing overlay
 * (container/hero/cta-section) paints today.
 *
 * NAMING IS INCONSISTENT INSIDE THE FAMILY, and this atom does NOT rename
 * either side (D338 — zero attribute renames): `backgroundOverlayColour`/
 * `backgroundOverlayOpacity`/`backgroundOverlayBlendMode` are prefixed;
 * `overlayGradient`/`overlayGradientHover` are not. This atom's own
 * canonical bases (`OverlayColour`/`OverlayGradient`/`OverlayOpacity`/
 * `OverlayBlendMode`) resolve through `mediaStoredAttrName()` exactly like
 * every other atom — a fresh adoption gets the atom's own consistent names;
 * an existing divergent surface is bridged by a future `STORED_AS` entry in
 * `MediaElementControls.js` (out of this atom's scope to edit).
 *
 * `requires` (registry.js): `OverlayOpacity`/`OverlayBlendMode` are dead
 * controls without a colour or gradient to tint — `disclosure()` reports
 * them `hidden` in that case, and `css()` never emits them either.
 *
 * ── `OverlayOpacity` is TIERED (2026-09-03, closing the detector-backlog gap
 * against `class-sgs-container-wrapper.php`'s `backgroundOverlayOpacityTablet`/
 * `Mobile`) ─────────────────────────────────────────────────────────────────
 * `OverlayOpacity` has been in `MEDIA_TIERED_BASES` (`MediaElementControls.js`)
 * for some time already, so the L1 injection layer
 * (`media-element-attrs-register.php` server-side, `mediaAttrKeys()` in the
 * editor) already registers `overlayOpacityTablet`/`overlayOpacityMobile`
 * (and their prefixed siblings) on every current adopter of this atom — this
 * atom's OWN `attrKeys()`/`css()` were simply not reading them yet. Only
 * OPACITY is tiered, matching the wrapper's own doc comment
 * (`class-sgs-container-wrapper.php:417-422`): the responsive need is "a
 * heavier scrim on the small screen", an opacity change, not a different hue
 * — colour/gradient/blend-mode stay untiered. Nesting mobile -> tablet ->
 * desktop -> the CSS initial (1) mirrors `object-fit.js`'s reasoning
 * (`assets/css/media-atoms/object-fit.css`'s own comment): an unset mobile
 * value must fall through to tablet, not jump straight past it to desktop.
 *
 * `css()` mirrors `includes/media/atoms/overlay.php`'s
 * `sgs_media_atom_overlay_css()` byte-for-byte — enforced by
 * `scripts/tests/test-media-atom-parity.mjs`.
 *
 * LOGIC HALF ONLY. Split from the JSX control per the purity contract
 * (`scripts/check-media-atom-purity.js`): this module must be importable by
 * plain Node — no JSX, no `@wordpress/components` (a webpack EXTERNAL, not
 * installed in `node_modules`). The JSX control lives in
 * `overlay.control.js` and imports from here.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

import { mediaStoredAttrName } from '../../MediaElementControls.js';
import { colourVar } from '../../../utils/tokens.js';

const GRADIENT_PATTERN = /^(repeating-)?(linear|radial|conic)-gradient\([A-Za-z0-9\s.,%()#/_-]+\)$/i;
const GRADIENT_BREAKOUT = /[;{}]|url\s*\(|<|>|@|expression/i;
const BLEND_MODES = [
	'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge',
	'color-burn', 'soft-light', 'hard-light', 'difference', 'exclusion',
];

/**
 * Validate a gradient string with the SAME charset/breakout rules as
 * `sgs_css_gradient_value()` (helpers-tokens.php) — mirrored, not called,
 * because that PHP function has no JS twin.
 *
 * @param {*} value Raw candidate.
 * @return {string} The gradient, or '' when invalid/empty.
 */
export function validateGradient( value ) {
	const v = 'string' === typeof value ? value.trim() : '';
	if ( ! v || ! GRADIENT_PATTERN.test( v ) || GRADIENT_BREAKOUT.test( v ) ) {
		return '';
	}
	return v;
}

/**
 * Resolve a colour attribute (palette slug or raw CSS colour) to a paintable
 * value. Mirrors `sgs_colour_value()`'s slug branch — this atom's own
 * colours are always either a slug or already-valid CSS, never a raw
 * functional notation needing hex normalisation server-side, since the
 * client never types free text into a `DesignTokenPicker`.
 *
 * @param {*} value Raw candidate.
 * @return {string} A paintable CSS colour value, or '' when empty.
 */
export function resolveColour( value ) {
	if ( 'string' !== typeof value || ! value.trim() ) {
		return '';
	}
	return colourVar( value.trim() ) || value.trim();
}

/**
 * Resolve the paint (gradient wins over colour) for a colour/gradient pair —
 * mirrors `sgs_background_paint_value()` exactly: gradient-image or
 * colour, never both.
 *
 * @param {*} colour   Raw colour value.
 * @param {*} gradient Raw gradient value.
 * @return {{property: string, value: string}} `property` is 'background-image'
 *                  | 'background-color' | '' (nothing to paint).
 */
export function resolvePaint( colour, gradient ) {
	const g = validateGradient( gradient );
	if ( g ) {
		return { property: 'background-image', value: g };
	}
	const c = resolveColour( colour );
	if ( c ) {
		return { property: 'background-color', value: c };
	}
	return { property: '', value: '' };
}

export function attrKeys( prefix, blockSlug ) {
	return {
		colour: mediaStoredAttrName( blockSlug, prefix, 'OverlayColour' ),
		colourHover: mediaStoredAttrName( blockSlug, prefix, 'OverlayColourHover' ),
		gradient: mediaStoredAttrName( blockSlug, prefix, 'OverlayGradient' ),
		gradientHover: mediaStoredAttrName( blockSlug, prefix, 'OverlayGradientHover' ),
		opacity: mediaStoredAttrName( blockSlug, prefix, 'OverlayOpacity' ),
		opacityTablet: mediaStoredAttrName( blockSlug, prefix, 'OverlayOpacityTablet' ),
		opacityMobile: mediaStoredAttrName( blockSlug, prefix, 'OverlayOpacityMobile' ),
		blendMode: mediaStoredAttrName( blockSlug, prefix, 'OverlayBlendMode' ),
	};
}

/**
 * Clamp a raw opacity candidate to 0-100 and format it as the CSS fraction
 * string this atom stores (`0.3`, not `0.300000000000004` JS float noise).
 * Shared by the base and both tier declarations in `css()` below — mirrors
 * `sgs_overlay_decls()`'s own rounding.
 *
 * @param {*} raw Raw candidate.
 * @return {{pct: number, fraction: string}|null} `null` when not a finite
 *                  number, or when the clamped value is 100 (the CSS
 *                  initial/no-op — never emitted, same as the base always
 *                  has).
 */
function formatOpacityDecl( raw ) {
	if ( 'number' !== typeof raw || ! Number.isFinite( raw ) ) {
		return null;
	}
	const pct = Math.max( 0, Math.min( 100, raw ) );
	if ( 100 === pct ) {
		return null;
	}
	return { pct, fraction: String( Math.round( ( pct / 100 ) * 10000 ) / 10000 ) };
}

/**
 * Opacity and blend mode are dead controls without a colour or gradient to
 * tint (registry.js `overlay.requires`).
 *
 * @param {Object} props
 * @param {Object} props.attributes
 * @param {string} [props.prefix]
 * @param {string} [props.blockSlug]
 * @return {{state: string, hiddenReason: (string|null)}}
 */
export function disclosure( { attributes = {}, prefix = '', blockSlug = '' } = {} ) {
	const keys = attrKeys( prefix, blockSlug );
	const paint = resolvePaint( attributes[ keys.colour ], attributes[ keys.gradient ] );
	if ( '' === paint.property ) {
		return {
			state: 'disabled',
			hiddenReason: __(
				'Opacity and blend mode only apply once an overlay colour or gradient is set.',
				'sgs-blocks'
			),
		};
	}
	return { state: 'shown', hiddenReason: null };
}

/**
 * Generic reject-to-default validator — required by the atom contract
 * (`scripts/check-media-atom-purity.js`), mirroring `object-fit`'s
 * `validate(value, scope)` shape.
 *
 * @param {*}      value Raw candidate.
 * @param {string} [kind] 'blendMode' (default) | 'gradient' | 'colour'.
 * @return {string} A vocabulary member / paintable value, never the raw
 *                  out-of-vocabulary input.
 */
export function validate( value, kind = 'blendMode' ) {
	if ( 'gradient' === kind ) {
		return validateGradient( value );
	}
	if ( 'colour' === kind ) {
		return resolveColour( value );
	}
	return value && 'normal' !== value && BLEND_MODES.includes( value ) ? value : 'normal';
}

/**
 * Custom-property declarations for this atom. Mirrors
 * `includes/media/atoms/overlay.php`'s `sgs_media_atom_overlay_css()`
 * exactly.
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

	const paint = resolvePaint( attributes[ keys.colour ], attributes[ keys.gradient ] );
	if ( '' === paint.property ) {
		return decls;
	}

	if ( 'background-image' === paint.property ) {
		decls.push( `--sgs-media-overlay-gradient:${ paint.value }` );
	} else {
		decls.push( `--sgs-media-overlay-colour:${ paint.value }` );
	}

	const hoverPaint = resolvePaint( attributes[ keys.colourHover ], attributes[ keys.gradientHover ] );
	if ( 'background-image' === hoverPaint.property ) {
		decls.push( `--sgs-media-overlay-gradient-hover:${ hoverPaint.value }` );
	} else if ( 'background-color' === hoverPaint.property ) {
		decls.push( `--sgs-media-overlay-colour-hover:${ hoverPaint.value }` );
	}

	const opacity = formatOpacityDecl( attributes[ keys.opacity ] );
	if ( opacity ) {
		decls.push( `--sgs-media-overlay-opacity:${ opacity.fraction }` );
	}

	const opacityTablet = formatOpacityDecl( attributes[ keys.opacityTablet ] );
	if ( opacityTablet ) {
		decls.push( `--sgs-media-overlay-opacity-tablet:${ opacityTablet.fraction }` );
	}

	const opacityMobile = formatOpacityDecl( attributes[ keys.opacityMobile ] );
	if ( opacityMobile ) {
		decls.push( `--sgs-media-overlay-opacity-mobile:${ opacityMobile.fraction }` );
	}

	const blendMode = attributes[ keys.blendMode ];
	if ( blendMode && 'normal' !== blendMode && BLEND_MODES.includes( blendMode ) ) {
		decls.push( `--sgs-media-overlay-blend:${ blendMode }` );
	}

	return decls;
}
