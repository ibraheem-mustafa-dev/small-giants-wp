/**
 * `video-behaviour` atom — LOGIC half (pure: css/validate/disclosure).
 *
 * Owns `MEDIA_BASES.behaviour` (registry.js): VideoAutoplay / VideoLoop /
 * VideoMuted / VideoControls / VideoPlaysInline / VideoLazyLoad plus the four
 * VideoCaptions* attributes (WCAG 1.2.2 Level A).
 *
 * ⛔ THIS ATOM OWNS A LIVE DEFECT. `requires: { VideoAutoplay: [ 'VideoMuted',
 * 'VideoPlaysInline' ] }` exists because a browser refuses to autoplay an
 * unmuted video, and iOS needs `playsinline` or the video takes over the
 * screen. Before this atom the coupling existed in exactly ONE place —
 * `src/blocks/media/view.js` — and only on the client: a no-JS visitor could
 * be served `<video autoplay>` with no `muted`/`playsinline`, which the
 * browser simply refuses to play. The PHP twin
 * (`sgs_media_atom_video_behaviour_requires()`, `includes/media/atoms/
 * video-behaviour.php`) is the server-side half of the same rule, and
 * `media/render.php` now calls it instead of building the three flags
 * independently.
 *
 * DIRECTION OF THE COUPLING (both here and in the PHP twin): turning
 * Autoplay ON forces Muted and PlaysInline ON in the same action, and locks
 * their controls while Autoplay stays on. The alternative reading — gating
 * the Autoplay toggle itself behind Muted/PlaysInline already being set — was
 * considered and rejected: it lets an existing "Autoplay on, Muted off" save
 * sit invisibly instead of being corrected, and it does not match what
 * `view.js` already does today (`if (autoplay) { video.muted = true; }`).
 * Locking the DEPENDENTS on is the direction every other requires-consumer in
 * this population uses (a controlled attribute name for the key), so this
 * keeps continuity with `meaning`/`box-shape`/`overlay` while resolving the
 * real defect at both the editor and the render layer.
 *
 * ⛔ `sgs/before-after`'s `videoAutoplay` (+Tablet/Mobile) is BLOCK-LEVEL,
 * shared by both comparison slots, per its own sync contract (registry
 * `reads`, `STORED_AS`). Never per-prefix it — call this atom with `prefix:
 * ''` for that surface's shared toggle, exactly as it is already stored.
 *
 * `css()` returns nothing: playback behaviour (autoplay/loop/muted/controls/
 * playsinline/lazy, captions) is HTML element state, never a paintable CSS
 * property. See `assets/css/media-atoms/video-behaviour.css`.
 *
 * ⛔ THE CONTROL/LOGIC SPLIT IS A CONTRACT (`scripts/check-media-atom-purity.js`).
 * `control()` — the JSX/`@wordpress/components` half — lives in
 * `video-behaviour.control.js`. This file must stay importable by plain
 * Node: no unresolvable `@wordpress/*` packages, no JSX, no `control()`
 * export. `@wordpress/i18n`'s `__()` is fine here — `hiddenReason` is text a
 * client reads, and the package is genuinely installed.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { mediaAttrName } from '../../MediaElementControls.js';

/** Boolean bases this atom owns. */
const BOOLEAN_BASES = [
	'VideoAutoplay',
	'VideoLoop',
	'VideoMuted',
	'VideoControls',
	'VideoPlaysInline',
	'VideoLazyLoad',
];

/** The two bases the registry's `requires` locks on when Autoplay is on. */
const LOCKED_ON_AUTOPLAY = [ 'VideoMuted', 'VideoPlaysInline' ];

/**
 * Reject-to-default validator.
 *
 * Behaviour bases split into two shapes: the six boolean toggles, and the
 * four string/integer caption fields. `base` selects which; defaulting to
 * `'VideoAutoplay'` keeps the single-arg call `validate( value )` the brief
 * describes working for the common case.
 *
 * @param {*}      value Candidate value.
 * @param {string} [base] Which base is being validated.
 * @return {boolean|number|string} The validated value, or that base's default.
 */
export function validate( value, base = 'VideoAutoplay' ) {
	if ( BOOLEAN_BASES.includes( base ) ) {
		return true === value;
	}
	if ( 'VideoCaptionsId' === base ) {
		return Number.isInteger( value ) && value > 0 ? value : null;
	}
	// VideoCaptionsUrl / VideoCaptionsLabel / VideoCaptionsSrcLang.
	return 'string' === typeof value ? value : '';
}

/**
 * Per-base disclosure state, keyed by PascalCase base name.
 *
 * ⚑ SHAPE NOTE. The brief's generic signature returns one
 * `{state,hiddenReason}` for the whole atom; this atom governs six
 * independent bases with genuinely different gating (only two of them are
 * ever locked), so a single atom-wide state would either lock bases that
 * have no dependency or leave the two dependents unmarked. Returning a map
 * keyed by base is the direct generalisation of the registry's own
 * `requires` shape (`{ <base>: [...] }`), applied consistently.
 *
 * ⚠ blockSlug is not part of this signature (per the brief), so
 * `sgs/before-after`'s STORED_AS override is NOT resolved here — call this
 * with `prefix: ''` for that surface's shared autoplay toggle, which is
 * exactly how it is already stored, so the plain `mediaAttrName()` read
 * still lands on the right key.
 *
 * @param {Object} params
 * @param {Object} params.attributes Block attributes.
 * @param {string} [params.prefix]   Surface prefix.
 * @return {Object<string, {state: string, hiddenReason: (string|null)}>}
 */
// Defaulted so a caller with no attributes cannot throw. The panel dispatch
// calls disclosure() on EVERY atom to decide what to render, so one throw here
// takes down the whole inspector, not just this row.
export function disclosure( { attributes = {}, prefix = '' } = {} ) {
	const autoplayKey = mediaAttrName( prefix, 'VideoAutoplay' );
	const autoplayOn = !! attributes[ autoplayKey ];

	const lockedReason = __(
		'Locked on while Autoplay is on — a browser refuses to autoplay an unmuted video, and iOS needs "plays inline" or the video takes over the screen.',
		'sgs-blocks'
	);

	const states = {};
	LOCKED_ON_AUTOPLAY.forEach( ( base ) => {
		states[ base ] = autoplayOn
			? { state: 'disabled', hiddenReason: lockedReason }
			: { state: 'shown', hiddenReason: null };
	} );

	[
		'VideoAutoplay',
		'VideoLoop',
		'VideoControls',
		'VideoLazyLoad',
		'VideoCaptionsId',
		'VideoCaptionsUrl',
		'VideoCaptionsLabel',
		'VideoCaptionsSrcLang',
	].forEach( ( base ) => {
		states[ base ] = { state: 'shown', hiddenReason: null };
	} );

	return states;
}

/**
 * Playback behaviour is HTML element state (attributes/properties on
 * `<video>`), never a paintable CSS property. This atom emits no
 * custom-property declarations in either realm.
 *
 * @return {string[]} Always empty.
 */
export function css() {
	return [];
}
