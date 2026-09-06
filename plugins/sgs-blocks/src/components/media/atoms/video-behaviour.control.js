/**
 * `video-behaviour` atom — CONTROL half (JSX-equivalent `control()`, via
 * `createElement()`).
 *
 * Pairs with `video-behaviour.js` (the pure `css()`/`validate()`/
 * `disclosure()` half — see its docblock for the full defect this atom
 * fixes, and the direction-of-coupling rationale). Split per
 * `scripts/check-media-atom-purity.js`: this file owns every import the
 * parity gate's plain-Node import cannot resolve (`@wordpress/components`'
 * `ToggleControl`, `BooleanResponsiveControl`'s `@wordpress/block-editor`
 * dependency via `ResponsiveControl`, and `VideoCaptionsFields`'s
 * `@wordpress/block-editor` dependency), so the logic half stays importable
 * there.
 *
 * `control()` calls `validate()` from the logic half rather than duplicating
 * it, so the editor write-side coercion and the render-time coercion
 * (`sgs_media_atom_video_behaviour_requires()`) stay expressions of the SAME
 * rule. It does NOT call the logic half's `disclosure()` for the Muted/
 * PlaysInline `disabled` derivation — that function is deliberately
 * desktop-only (see its own docblock), and the per-tier lock this file
 * derives instead needs the effective Autoplay value at each of the three
 * device tiers. See the per-tier note further down.
 *
 * ── Tiering (Wave 5b, 2026-09-01) ────────────────────────────────────────
 * Each of the six boolean bases now renders through the shared
 * `BooleanResponsiveControl` (promoted to `src/components/` — this atom was
 * the third consumer that triggered the promotion), matching (not falling
 * short of) `sgs/media`'s pre-existing hand-rolled Playback Options panel,
 * which offered the SAME six bases with Tablet/Mobile Inherit/On/Off tiers.
 * The tiered attribute names already exist framework-wide via
 * `MEDIA_TIERED_BASES` (`MediaElementControls.js`), and for an unprefixed
 * surface (`sgs/media`, `prefix: ''`) they resolve to exactly the same
 * stored names the block already declares (`videoAutoplayTablet` etc.) — no
 * new attributes, no STORED_AS override needed.
 *
 * The Autoplay -> Muted/PlaysInline lock (registry.js `requires`) is
 * expressed as `disabled` on the tiered Muted/PlaysInline controls,
 * PER TIER — the lock reflects THAT tier's own effective Autoplay state
 * (desktop base, tablet inheriting desktop unless overridden, mobile
 * inheriting the resolved tablet value unless overridden), not just the
 * desktop base's raw value applied uniformly to all three tiers.
 *
 * ⛔ CORRECTED 2026-09-01 — this used to derive `disabled` from the DESKTOP
 * autoplay value alone (`video-behaviour.js`'s `disclosure()`, which is
 * deliberately desktop-only per its own docblock) and apply that single
 * value to `BooleanResponsiveControl`'s `disabled` prop, which itself
 * applies whatever it's given uniformly across all three tiers. A client
 * could leave Autoplay off on Desktop (Muted/PlaysInline editable) then
 * override Autoplay ON just for Tablet — the Tablet Muted/PlaysInline
 * toggles stayed editable and could be saved autoplay=on/muted=off for that
 * tier, with no UI warning (the frontend stays protected only because
 * `sgs_media_atom_video_behaviour_requires()` re-couples them server-side).
 *
 * The fix reads the CURRENT global device tier the same way
 * `ResponsiveControl.js` does (`core/editor`'s `getDeviceType()` — the tier
 * is chosen once, in the global toggle docked at the bottom of the
 * inspector, Spec 35 Phase 1.2) and resolves that tier's effective Autoplay
 * value with the same "tablet inherits desktop unless overridden, mobile
 * inherits resolved tablet unless overridden" rule
 * `BooleanResponsiveControl.js`'s own `resolveEffective()` helper
 * implements. That helper is not exported (this atom's control half is
 * intentionally scoped to files owned by this atom alone), so the three-line
 * inheritance rule is mirrored here as `resolveEffectiveAutoplay()` rather
 * than imported — keep the two in sync if either changes. Because the
 * device tier is GLOBAL state, this component re-renders whenever it
 * changes, so the single `disabled` value passed down is always the one for
 * whichever tier is currently on screen.
 *
 * Imports its own `video-behaviour.control.css` for spacing between the six
 * stacked controls + the captions workflow — see that file's docblock for
 * why it is NOT under `assets/css/media-atoms/` (that pipeline is the
 * paintable-CSS-property stylesheet for the rendered element, and this is
 * Inspector-sidebar chrome outside every selector it can reach).
 *
 * @package SGS\Blocks
 */
import { createElement } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import BooleanResponsiveControl from '../../BooleanResponsiveControl';
import VideoCaptionsFields from '../controls/VideoCaptionsFields.js';
import { mediaStoredAttrName } from '../../MediaElementControls.js';
import { validate } from './video-behaviour.js';
import './video-behaviour.control.css';

// WP's native device-type names -> our breakpoint keys. Mirrors
// `ResponsiveControl.js`'s own `DEVICE_TO_KEY` table exactly — that file is
// outside this atom's exclusive scope, so the (tiny, stable) mapping is
// duplicated here rather than imported.
const DEVICE_TO_KEY = {
	Desktop: 'desktop',
	Tablet: 'tablet',
	Mobile: 'mobile',
};

/**
 * Resolve the EFFECTIVE boolean for a tier, falling back upward through
 * null/undefined overrides (tablet -> desktop; mobile -> resolved tablet).
 * Mirrors `BooleanResponsiveControl.js`'s own `resolveEffective()` — see this
 * file's docblock for why it is duplicated rather than imported.
 *
 * @param {boolean}                     base   Desktop value.
 * @param {boolean|null|undefined}      tablet Tablet override (null/undefined = inherit).
 * @param {boolean|null|undefined}      mobile Mobile override (null/undefined = inherit).
 * @param {'desktop'|'tablet'|'mobile'} tier   Tier to resolve.
 * @return {boolean} Effective value at that tier.
 */
function resolveEffectiveAutoplay( base, tablet, mobile, tier ) {
	if ( 'desktop' === tier ) {
		return base;
	}
	const tabletEffective = tablet === null || tablet === undefined ? base : !! tablet;
	if ( 'tablet' === tier ) {
		return tabletEffective;
	}
	return mobile === null || mobile === undefined ? tabletEffective : !! mobile;
}

/**
 * Bare control rows. Never its own `<InspectorControls>`.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @param {string}   [props.prefix]      Surface prefix.
 * @param {string}   props.blockSlug     e.g. 'sgs/media'.
 */
export function control( { attributes, setAttributes, prefix = '', blockSlug } ) {
	const key = ( base ) => mediaStoredAttrName( blockSlug, prefix, base );

	const autoplayBase = key( 'VideoAutoplay' );
	const autoplayTabletKey = key( 'VideoAutoplayTablet' );
	const autoplayMobileKey = key( 'VideoAutoplayMobile' );
	const mutedBase = key( 'VideoMuted' );
	const inlineBase = key( 'VideoPlaysInline' );
	const loopBase = key( 'VideoLoop' );
	const controlsBase = key( 'VideoControls' );
	const lazyBase = key( 'VideoLazyLoad' );

	// The CURRENT global device tier — read the same way `ResponsiveControl.js`
	// does, so the `disabled` value computed below always matches whichever
	// tier's controls are actually on screen (the tier is global state, so this
	// component re-renders when it changes).
	const nativeDevice = useSelect( ( select ) => {
		const ed = select( 'core/editor' );
		return ed && typeof ed.getDeviceType === 'function' ? ed.getDeviceType() : null;
	}, [] );
	const activeTier = DEVICE_TO_KEY[ nativeDevice ] || 'desktop';

	// PER-TIER effective Autoplay — not just the desktop base's raw value.
	// See this file's docblock for the defect this replaces.
	const autoplayLockedReason = __(
		'Locked on while Autoplay is on — a browser refuses to autoplay an unmuted video, and iOS needs "plays inline" or the video takes over the screen.',
		'sgs-blocks'
	);
	const autoplayEffective = resolveEffectiveAutoplay(
		!! attributes[ autoplayBase ],
		attributes[ autoplayTabletKey ] ?? null,
		attributes[ autoplayMobileKey ] ?? null,
		activeTier
	);

	/**
	 * Wrap `setAttributes` so a tiered write on the Autoplay base also
	 * validates through `validate()` — `BooleanResponsiveControl` writes raw
	 * booleans/null directly, and this atom's own `validate()` is the reject-
	 * to-default gate every other atom's control() applies at the write site.
	 *
	 * @param {Object} patch Attribute patch from BooleanResponsiveControl.
	 */
	const setValidated = ( patch ) => {
		const next = {};
		Object.keys( patch ).forEach( ( attrKey ) => {
			const value = patch[ attrKey ];
			next[ attrKey ] = null === value ? null : validate( value, 'VideoAutoplay' );
		} );
		// Turning autoplay ON locks muted + playsinline ON in the SAME
		// setAttributes call — the editor never allows the unplayable
		// combination to exist even for one save. Only the DESKTOP base
		// triggers the lock; a Tablet/Mobile override is a boolean|null
		// tri-state and "on" is not distinguishable from "just turned on"
		// there, so the lock stays scoped to the base toggle, matching the
		// pre-existing Playback Options panel's own behaviour.
		if ( true === next[ autoplayBase ] ) {
			next[ mutedBase ] = true;
			next[ inlineBase ] = true;
		}
		setAttributes( next );
	};

	return createElement(
		'div',
		{ className: 'sgs-media-behaviour-controls' },
		createElement( BooleanResponsiveControl, {
			key: 'autoplay',
			label: __( 'Autoplay', 'sgs-blocks' ),
			help: __(
				'Autoplay requires Muted to be enabled on most browsers — turning Autoplay on automatically mutes and enables plays-inline too.',
				'sgs-blocks'
			),
			attrBase: autoplayBase,
			attrTablet: key( 'VideoAutoplayTablet' ),
			attrMobile: key( 'VideoAutoplayMobile' ),
			attributes,
			setAttributes: setValidated,
		} ),
		createElement( BooleanResponsiveControl, {
			key: 'muted',
			label: __( 'Muted', 'sgs-blocks' ),
			help: autoplayEffective ? autoplayLockedReason : undefined,
			attrBase: mutedBase,
			attrTablet: key( 'VideoMutedTablet' ),
			attrMobile: key( 'VideoMutedMobile' ),
			attributes,
			setAttributes,
			disabled: autoplayEffective,
		} ),
		createElement( BooleanResponsiveControl, {
			key: 'plays-inline',
			label: __( 'Plays inline', 'sgs-blocks' ),
			help: autoplayEffective ? autoplayLockedReason : undefined,
			attrBase: inlineBase,
			attrTablet: key( 'VideoPlaysInlineTablet' ),
			attrMobile: key( 'VideoPlaysInlineMobile' ),
			attributes,
			setAttributes,
			disabled: autoplayEffective,
		} ),
		createElement( BooleanResponsiveControl, {
			key: 'loop',
			label: __( 'Loop', 'sgs-blocks' ),
			attrBase: loopBase,
			attrTablet: key( 'VideoLoopTablet' ),
			attrMobile: key( 'VideoLoopMobile' ),
			attributes,
			setAttributes,
		} ),
		createElement( BooleanResponsiveControl, {
			key: 'controls',
			label: __( 'Show controls', 'sgs-blocks' ),
			attrBase: controlsBase,
			attrTablet: key( 'VideoControlsTablet' ),
			attrMobile: key( 'VideoControlsMobile' ),
			attributes,
			setAttributes,
		} ),
		createElement( BooleanResponsiveControl, {
			key: 'lazy',
			label: __( 'Lazy-load', 'sgs-blocks' ),
			help: __( 'Load video only when scrolled into view.', 'sgs-blocks' ),
			attrBase: lazyBase,
			attrTablet: key( 'VideoLazyLoadTablet' ),
			attrMobile: key( 'VideoLazyLoadMobile' ),
			attributes,
			setAttributes,
		} ),
		createElement( VideoCaptionsFields, {
			key: 'captions',
			attributes,
			setAttributes,
			prefix,
			blockSlug,
		} )
	);
}
