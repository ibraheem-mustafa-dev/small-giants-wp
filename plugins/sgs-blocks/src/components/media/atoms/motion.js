/**
 * `motion` atom — L2b control + disclosure + validator + value-setter.
 *
 * Bases (registry.js): `KenBurns`, `Parallax`, `AnimationDuration`. A
 * mutually-exclusive pair — slow zoom vs scroll drift — already proven on TWO
 * working surfaces: `sgs/hero`'s split-media (`mediaKenBurns`/`mediaParallax`/
 * `mediaAnimationDuration`) and `sgs/container`'s background
 * (`bgKenBurns`/`bgParallax`/`bgAnimationDuration`, `class-sgs-container-
 * wrapper.php`). Neither base is tiered (`MEDIA_TIERED_BASES` does not carry
 * any of the three) — no `@media` responsive fan-out needed here.
 *
 * ⚑ THE CLASS-MODIFIER JUDGEMENT CALL. Both reference implementations drive
 * the active effect via a BEM MODIFIER CLASS on their own wrapper
 * (`sgs-hero__media--ken-burns` / `sgs-hero__media--parallax`,
 * `sgs-container--ken-burns` / `sgs-container--parallax`) plus a duration
 * custom property. This atom's contract is custom properties on
 * `.sgs-media-el` only — `css()` cannot emit a class name, and this atom has
 * no wrapper of its own to put one on (`attachesTo: 'element'`, same as
 * `svg-presentation`).
 *
 * `svg-presentation`'s own `SvgAnimation` base already solved the identical
 * problem (a mutually-exclusive set of named keyframe effects on
 * `.sgs-media-el`) WITHOUT a class: it emits `--sgs-media-svg-animation-name`
 * as a raw (unquoted) `@keyframes` identifier and lets
 * `animation-name: var( --sgs-media-svg-animation-name, none )` pick the
 * keyframe. This atom follows that precedent rather than inventing a class
 * mechanism: `--sgs-media-motion-animation-name` selects between the two
 * keyframes (or neither), and a handful of sibling custom properties
 * (`-timing-function`/`-iteration-count`/`-direction`/`-fill-mode`/
 * `-timeline`) carry the two effects' differing animation shorthand values —
 * ken-burns is `ease-in-out infinite alternate` with a client-set duration;
 * parallax is a `linear`, single-pass, scroll-driven timeline with no
 * meaningful "duration" (progress is scroll position, not time). Both target
 * `animation-name` on the SAME rule, so unlike two separate class-scoped
 * rules there is no cascade collision to resolve — only one of the two
 * branches ever emits, because `css()` mirrors the reference implementations'
 * own mutual-exclusion resolution (parallax wins if somehow both attrs are
 * true — see the `parallaxActive`/`kenBurnsActive` order below, matching
 * `hero/render.php`'s `$media_ken_burns = !empty(...) && !$media_parallax`).
 *
 * No other atom in this population needs a class modifier today, so this is
 * the first precedent beyond `svg-presentation` itself for "an effect that
 * would traditionally be a wrapper class, re-expressed as a custom property
 * instead" — read this docblock before reaching for a class on a future atom.
 *
 * PREFERS-REDUCED-MOTION IS A NEW GUARD ON PURPOSE, same reasoning as
 * `svg-presentation`: `.sgs-media-el` is not covered by the existing guards in
 * `hero/style.css`/`container/style.css`/`parallax.js`, which are scoped to
 * THOSE blocks' own selectors. `motion.css` wraps both effects in
 * `@media (prefers-reduced-motion: no-preference)`.
 *
 * `css()` mirrors `includes/media/atoms/motion.php`'s
 * `sgs_media_atom_motion_css()` byte-for-byte — enforced by
 * `scripts/tests/test-media-atom-parity.mjs`.
 *
 * LOGIC HALF ONLY. Split from the JSX control per the purity contract
 * (`scripts/check-media-atom-purity.js`): this module must be importable by
 * plain Node — no JSX, no `@wordpress/components`. The JSX control lives in
 * `motion.control.js` and imports from here.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

import { mediaStoredAttrName } from '../../MediaElementControls.js';

const MIN_DURATION = 5;
const MAX_DURATION = 60;
const DEFAULT_DURATION = 20;

const KEN_BURNS_NAME = 'sgs-media-motion-ken-burns';
const PARALLAX_NAME = 'sgs-media-motion-parallax';

/** Reject a non-boolean `KenBurns`/`Parallax` value to `false`. */
export function validateBoolean( value ) {
	return true === value;
}

/**
 * Reject an out-of-range `AnimationDuration` to the default, clamping any
 * finite in-range number to whole seconds — mirrors the reference
 * `<RangeControl min={5} max={60} step={1}>` (`hero/edit.js`).
 *
 * @param {*} value Raw candidate.
 * @return {number} 5-60 inclusive.
 */
export function validateDuration( value ) {
	const num = 'number' === typeof value && Number.isFinite( value ) ? value : DEFAULT_DURATION;
	return Math.max( MIN_DURATION, Math.min( MAX_DURATION, Math.round( num ) ) );
}

export function attrKeys( prefix, blockSlug ) {
	return {
		kenBurns: mediaStoredAttrName( blockSlug, prefix, 'KenBurns' ),
		parallax: mediaStoredAttrName( blockSlug, prefix, 'Parallax' ),
		duration: mediaStoredAttrName( blockSlug, prefix, 'AnimationDuration' ),
	};
}

/**
 * Generic reject-to-default validator — required by the atom contract
 * (`scripts/check-media-atom-purity.js`), mirroring `svg-presentation`'s
 * `validate(value, kind)` shape.
 *
 * @param {*}      value Raw candidate.
 * @param {string} [kind] 'kenBurns' (default) | 'parallax' | 'duration'.
 * @return {boolean|number} A validated value, never the raw candidate.
 */
export function validate( value, kind = 'kenBurns' ) {
	if ( 'duration' === kind ) {
		return validateDuration( value );
	}
	return validateBoolean( value );
}

/**
 * `AnimationDuration` is a dead control while `KenBurns` is off — it only
 * governs the zoom animation's cycle length, and parallax has no comparable
 * duration (its "speed" is scroll position, not time). `KenBurns`/`Parallax`
 * themselves are always shown; their mutual exclusion is enforced by the
 * control's own `onChange` wiring, not by disclosure.
 *
 * ⚑ MAP SHAPE, per `video-behaviour.js`'s precedent: this atom governs THREE
 * bases with different gating (only one is ever disabled), so a single
 * atom-wide `{state,hiddenReason}` would either lock bases with no
 * dependency or leave the dependent unmarked.
 *
 * @param {Object} props
 * @param {Object} props.attributes
 * @param {string} [props.prefix]
 * @param {string} [props.blockSlug]
 * @return {Object<string, {state: string, hiddenReason: (string|null)}>}
 */
export function disclosure( { attributes = {}, prefix = '', blockSlug = '' } = {} ) {
	const keys = attrKeys( prefix, blockSlug );
	const kenBurnsOn = validateBoolean( attributes[ keys.kenBurns ] );

	return {
		KenBurns: { state: 'shown', hiddenReason: null },
		Parallax: { state: 'shown', hiddenReason: null },
		AnimationDuration: kenBurnsOn
			? { state: 'shown', hiddenReason: null }
			: {
					state: 'disabled',
					hiddenReason: __( 'Animation duration only applies once ken-burns zoom is turned on.', 'sgs-blocks' ),
			  },
	};
}

/**
 * Custom-property declarations for this atom. Mirrors
 * `includes/media/atoms/motion.php`'s `sgs_media_atom_motion_css()` exactly.
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

	// Parallax wins if somehow both attrs are true — mirrors the reference
	// implementations' own defensive resolution (`hero/render.php`:
	// `$media_ken_burns = !empty($attributes['mediaKenBurns']) && !$media_parallax;`).
	// The control's own onChange keeps them mutually exclusive in normal use;
	// this is the fallback for a hand-authored or legacy attribute set.
	const parallaxActive = validateBoolean( attributes[ keys.parallax ] );
	const kenBurnsActive = validateBoolean( attributes[ keys.kenBurns ] ) && ! parallaxActive;

	if ( kenBurnsActive ) {
		decls.push( `--sgs-media-motion-animation-name:${ KEN_BURNS_NAME }` );
		const duration = validateDuration( attributes[ keys.duration ] );
		decls.push( `--sgs-media-motion-animation-duration:${ duration }s` );
	} else if ( parallaxActive ) {
		decls.push( `--sgs-media-motion-animation-name:${ PARALLAX_NAME }` );
		decls.push( '--sgs-media-motion-animation-timing-function:linear' );
		decls.push( '--sgs-media-motion-animation-iteration-count:1' );
		decls.push( '--sgs-media-motion-animation-direction:normal' );
		decls.push( '--sgs-media-motion-animation-fill-mode:both' );
		decls.push( '--sgs-media-motion-animation-timeline:scroll(root)' );
	}

	return decls;
}
