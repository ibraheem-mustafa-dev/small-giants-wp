/**
 * `svg-presentation` atom — L2b control + disclosure + validator + value-setter.
 *
 * Bases (registry.js): `SvgAnimation`, `SvgAnimationSpeed`, `SvgOpacity`,
 * `SvgPosition`, `SvgMinHeight`, `SvgTextShadow`. Vocabulary mirrors
 * `sgs/container`'s `BackgroundPanel` SVG tab (`bgSvgPosition`/
 * `bgSvgAnimation`/`bgSvgAnimationSpeed`/`bgSvgOpacity`/`bgSvgTextShadow`/
 * `bgSvgMinHeight`, applied via `class-sgs-container-wrapper.php`) — same
 * client-facing questions, so a fresh block adopting this atom gets the
 * identical capability container that surface already proved out.
 *
 * This is a NEW, PARALLEL implementation, not a rewire of container's own
 * markup: container paints via BEM MODIFIER CLASSES
 * (`.sgs-container--svg-anim-pulse`) on its own `.sgs-container__svg-bg`
 * element, which this atom's contract (custom properties on `.sgs-media-el`
 * only, no classes) cannot reuse directly. `position`/`animation` are
 * therefore re-expressed as custom properties consumed by
 * `assets/css/media-atoms/svg-presentation.css`:
 *   - `SvgPosition` -> a z-index custom property (`background` sits behind
 *     sibling content, `foreground` sits above it) — NOT a class toggle.
 *   - `SvgAnimation`/`SvgAnimationSpeed` -> `animation-name`/`
 *     -duration` custom properties. `animation-name` accepts a `var()`
 *     resolving to a `@keyframes` identifier, so the keyword selection still
 *     lives in the stylesheet — this atom only supplies the WHICH and the
 *     HOW LONG.
 *
 * PREFERS-REDUCED-MOTION IS A NEW GUARD ON PURPOSE. The existing reduced-
 * motion guards (`hero/style.css`, `container/style.css`,
 * `assets/js/parallax.js`) are scoped to THOSE blocks' own selectors
 * (`.sgs-container__svg-bg`, the hero media element) and do not cover
 * `.sgs-media-el` — a different selector this atom introduces. Per the
 * brief: "if you introduce a genuinely NEW motion effect, that one carries
 * its own guard" — `svg-presentation.css` wraps its `@keyframes` and
 * `animation-name` rule in `@media (prefers-reduced-motion: no-preference)`,
 * mirroring container's own pattern rather than inventing a new one.
 *
 * `css()` mirrors `includes/media/atoms/svg-presentation.php`'s
 * `sgs_media_atom_svg_presentation_css()` byte-for-byte — enforced by
 * `scripts/tests/test-media-atom-parity.mjs`.
 *
 * LOGIC HALF ONLY. Split from the JSX control per the purity contract
 * (`scripts/check-media-atom-purity.js`): this module must be importable by
 * plain Node — no JSX, no `@wordpress/components` (a webpack EXTERNAL, not
 * installed in `node_modules`). The JSX control lives in
 * `svg-presentation.control.js` and imports from here.
 *
 * ⚠ NO CONTENT GATE YET — sanity-checked 2026-09-01 against the client's
 * report that container's own SVG tab controls sometimes fail to render even
 * though they look correctly gated on `bgSvgContent` truthy. This atom's
 * `attrKeys()`/`control()` deliberately carry NO `SvgContent` base at all
 * (see the bases list above) — position/animation/speed/opacity/text-shadow/
 * min-height only, so `control()` renders unconditionally today. That is
 * correct while there is no mount point (Wave 5a panel-assembly layer isn't
 * built), but it means the eventual mount MUST gate this control on whatever
 * attribute actually holds the SVG content for that block — and that gate is
 * exactly the kind of condition that can silently evaluate false forever
 * (wrong attr name, wrong truthiness check, wrong prefix/blockSlug threaded
 * through). When Wave 5a wires this atom's mount point, verify the content
 * gate live (render with content set AND unset) rather than trusting that it
 * "looks correctly gated" the way container's did.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

import { mediaStoredAttrName } from '../../MediaElementControls.js';

const POSITION_VALUES = [ 'background', 'foreground' ];
const ANIMATION_VALUES = [ 'none', 'pulse', 'float', 'wave' ];
const SPEED_VALUES = [ 'slow', 'medium', 'fast' ];
const SPEED_DURATIONS = { slow: '6s', medium: '3s', fast: '1.5s' };
const ANIMATION_NAMES = {
	pulse: 'sgs-media-svg-pulse',
	float: 'sgs-media-svg-float',
	wave: 'sgs-media-svg-wave',
};

/** Reject an out-of-vocabulary `SvgPosition` value to 'background'. */
export function validatePosition( value ) {
	return 'string' === typeof value && POSITION_VALUES.includes( value ) ? value : 'background';
}

/** Reject an out-of-vocabulary `SvgAnimation` value to 'none'. */
export function validateAnimation( value ) {
	return 'string' === typeof value && ANIMATION_VALUES.includes( value ) ? value : 'none';
}

/** Reject an out-of-vocabulary `SvgAnimationSpeed` value to 'medium'. */
export function validateSpeed( value ) {
	return 'string' === typeof value && SPEED_VALUES.includes( value ) ? value : 'medium';
}

export function attrKeys( prefix, blockSlug ) {
	return {
		position: mediaStoredAttrName( blockSlug, prefix, 'SvgPosition' ),
		animation: mediaStoredAttrName( blockSlug, prefix, 'SvgAnimation' ),
		speed: mediaStoredAttrName( blockSlug, prefix, 'SvgAnimationSpeed' ),
		opacity: mediaStoredAttrName( blockSlug, prefix, 'SvgOpacity' ),
		textShadow: mediaStoredAttrName( blockSlug, prefix, 'SvgTextShadow' ),
		minHeight: mediaStoredAttrName( blockSlug, prefix, 'SvgMinHeight' ),
	};
}

/**
 * Animation speed is a dead control while animation is 'none' — the same
 * "requires a live paint" shape `overlay`'s opacity/blend-mode rows use,
 * applied here to speed against animation.
 *
 * @param {Object} props
 * @param {Object} props.attributes
 * @param {string} [props.prefix]
 * @param {string} [props.blockSlug]
 * @return {{state: string, hiddenReason: (string|null)}}
 */
export function disclosure( { attributes = {}, prefix = '', blockSlug = '' } = {} ) {
	const keys = attrKeys( prefix, blockSlug );
	const animation = validateAnimation( attributes[ keys.animation ] );
	if ( 'none' === animation ) {
		return {
			state: 'disabled',
			hiddenReason: __( 'Animation speed only applies once an animation is chosen.', 'sgs-blocks' ),
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
 * @param {string} [kind] 'animation' (default) | 'position' | 'speed'.
 * @return {string} A vocabulary member, never the raw out-of-vocabulary input.
 */
export function validate( value, kind = 'animation' ) {
	if ( 'position' === kind ) {
		return validatePosition( value );
	}
	if ( 'speed' === kind ) {
		return validateSpeed( value );
	}
	return validateAnimation( value );
}

/**
 * Custom-property declarations for this atom. Mirrors
 * `includes/media/atoms/svg-presentation.php`'s
 * `sgs_media_atom_svg_presentation_css()` exactly.
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

	// Only emit when the client actually chose a position. Pushing a z-index
	// unconditionally means the stylesheet's own `var( …, default )` fallback can
	// never apply, so every SVG is forced behind its content even on a block
	// where nothing was set - a value the client never picked, overriding a
	// default they never saw.
	const rawPosition = attributes[ keys.position ];
	if ( rawPosition ) {
		const position = validatePosition( rawPosition );
		decls.push(
			`--sgs-media-svg-zindex:${ 'foreground' === position ? 1 : -1 }`
		);
	}

	const animation = validateAnimation( attributes[ keys.animation ] );
	if ( 'none' !== animation ) {
		decls.push( `--sgs-media-svg-animation-name:${ ANIMATION_NAMES[ animation ] }` );
		const speed = validateSpeed( attributes[ keys.speed ] );
		decls.push( `--sgs-media-svg-animation-duration:${ SPEED_DURATIONS[ speed ] }` );
	}

	const opacityRaw = attributes[ keys.opacity ];
	if ( 'number' === typeof opacityRaw && Number.isFinite( opacityRaw ) ) {
		const pct = Math.max( 0, Math.min( 100, opacityRaw ) );
		if ( 100 !== pct ) {
			decls.push( `--sgs-media-svg-opacity:${ Math.round( pct ) / 100 }` );
		}
	}

	if ( attributes[ keys.textShadow ] ) {
		decls.push( '--sgs-media-svg-text-shadow:0 1px 3px rgba(0, 0, 0, 0.6)' );
	}

	const minHeight = attributes[ keys.minHeight ];
	if ( 'string' === typeof minHeight && minHeight.trim() ) {
		decls.push( `--sgs-media-svg-min-height:${ minHeight.trim() }` );
	}

	return decls;
}
