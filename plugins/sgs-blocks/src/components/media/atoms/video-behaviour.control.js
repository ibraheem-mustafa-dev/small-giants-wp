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
 * `control()` calls `validate()` and `disclosure()` from the logic half
 * rather than duplicating them, so the editor lock behaviour and the
 * render-time coercion (`sgs_media_atom_video_behaviour_requires()`) stay
 * expressions of the SAME rule.
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
 * expressed as `disabled` on the WHOLE tiered control (all three tiers),
 * not just the desktop toggle — a client switching to the Tablet/Mobile tab
 * must not find the "locked" control suddenly editable there while its
 * desktop sibling is disabled.
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
import { __ } from '@wordpress/i18n';
import BooleanResponsiveControl from '../../BooleanResponsiveControl';
import VideoCaptionsFields from '../controls/VideoCaptionsFields.js';
import { mediaStoredAttrName } from '../../MediaElementControls.js';
import { validate, disclosure } from './video-behaviour.js';
import './video-behaviour.control.css';

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
	const states = disclosure( { attributes, prefix } );

	const autoplayBase = key( 'VideoAutoplay' );
	const mutedBase = key( 'VideoMuted' );
	const inlineBase = key( 'VideoPlaysInline' );
	const loopBase = key( 'VideoLoop' );
	const controlsBase = key( 'VideoControls' );
	const lazyBase = key( 'VideoLazyLoad' );

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
			help: states.VideoMuted.hiddenReason || undefined,
			attrBase: mutedBase,
			attrTablet: key( 'VideoMutedTablet' ),
			attrMobile: key( 'VideoMutedMobile' ),
			attributes,
			setAttributes,
			disabled: 'disabled' === states.VideoMuted.state,
		} ),
		createElement( BooleanResponsiveControl, {
			key: 'plays-inline',
			label: __( 'Plays inline', 'sgs-blocks' ),
			help: states.VideoPlaysInline.hiddenReason || undefined,
			attrBase: inlineBase,
			attrTablet: key( 'VideoPlaysInlineTablet' ),
			attrMobile: key( 'VideoPlaysInlineMobile' ),
			attributes,
			setAttributes,
			disabled: 'disabled' === states.VideoPlaysInline.state,
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
