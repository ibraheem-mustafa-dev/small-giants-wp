/**
 * HeroSplitMediaPanelLayout — Wave 6 panel assembly for `sgs/hero`'s
 * SPLIT-MEDIA feature (the image/video/SVG slot beside the text column).
 *
 * NOT the section-level background (bgVideo/bgParallax/bgKenBurns/
 * backgroundOverlay*) — that stays on `SGS_Container_Wrapper` and is out of
 * scope for this component.
 *
 * Sibling to `MediaPanelLayout.js` (sgs/media's own panel assembly) but NOT
 * a copy of it: hero already stored this element's attributes under THREE
 * different ad-hoc prefixes before this migration, and none may be renamed
 * (D338) —
 *
 *   'split'      — splitImage-family, splitVideo-family, splitMediaType-family
 *                  (source + media-type bases; mediaAttrName('split', base)
 *                  reproduces every one of these names EXACTLY).
 *   'splitMedia' — splitMediaObjectFit/splitMediaObjectPosition* (object-fit
 *                  + focal-point bases; mediaAttrName('splitMedia', base)
 *                  reproduces these EXACTLY too).
 *   'media'      — mediaOverlayColour/mediaOverlayGradient/mediaParallax/
 *                  mediaKenBurns/mediaAnimationDuration (overlay + motion
 *                  bases; mediaAttrName('media', base) reproduces these
 *                  EXACTLY).
 *
 * Three `MediaElementPanel` prefixes on the SAME physical element, not one —
 * this is a deliberate consequence of "never rename a stored attribute", not
 * an accident. `STORED_AS` (MediaElementControls.js) could bridge a
 * mismatched name to one canonical prefix, but hero has no entry there and
 * this component's file is outside the paths this migration is allowed to
 * touch — so three prefixes chosen to each reproduce a real slice of hero's
 * existing names exactly is the correct answer given that constraint, not a
 * workaround for a missing one.
 *
 * Renders in TWO sections rather than one contiguous list, matching where
 * the caller (`hero/edit.js`) mounts them — inside the block's EXISTING
 * "Split image" (media selection) and "Split image styling" (appearance)
 * PanelBody sections, kept rather than consolidated (judgement call, see the
 * migration's task report).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { ToggleControl } from '@wordpress/components';
import MediaElementPanel from '../MediaElementPanel.js';
import { resolveMediaType } from './atoms/source.js';

const BLOCK_SLUG = 'sgs/hero';

/**
 * The "Split image" panel's rows — media type + source pickers (prefix
 * 'split'), plus the media overlay + motion controls (prefix 'media'), which
 * lived in this same panel before the migration and stay here rather than
 * moving to "Split image styling" (no reason to relocate a working section).
 *
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @return {JSX.Element} Bare rows for the caller's existing PanelBody.
 */
export function HeroSplitMediaSourceSection( { attributes, setAttributes } ) {
	const commonProps = {
		attributes,
		setAttributes,
		blockSlug: BLOCK_SLUG,
		insertion: 'element',
	};
	const resolvedType = resolveMediaType( attributes, 'split', BLOCK_SLUG );

	return (
		<>
			{ /* media-type atom rows are ALWAYS mounted — unlike the hand-rolled
			     picker this replaces, `MediaTypeControl` is never gated on
			     `splitImage?.url`. This is the fix for the documented
			     splitImage?.url gating bug: the type tabs (Image/Video/SVG) are
			     now reachable before any media has been uploaded. */ }
			<MediaElementPanel
				{ ...commonProps }
				prefix="split"
				atoms={ [ 'media-type' ] }
				mediaType={ undefined }
			/>
			<MediaElementPanel
				{ ...commonProps }
				prefix="split"
				atoms={ [ 'source' ] }
				mediaType={ resolvedType }
			/>
			<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>
				{ __( 'Overlay', 'sgs-blocks' ) }
			</p>
			<MediaElementPanel
				{ ...commonProps }
				prefix="media"
				atoms={ [ 'overlay' ] }
			/>
			<hr style={ { margin: '16px 0' } } />
			<MediaElementPanel
				{ ...commonProps }
				prefix="media"
				atoms={ [ 'motion' ] }
			/>
		</>
	);
}

/**
 * The "Split image styling" panel's rows — object-fit + focal-point (prefix
 * 'splitMedia'), plus a hero-specific "custom sizing" toggle bridging into
 * the atom's `custom` sizing-mode sentinel (see the module-level note below).
 *
 * ⚑ JUDGEMENT CALL — the "Custom sizing" toggle is NOT part of any atom.
 * `object-fit`'s own vocabulary (cover/contain/fill/none/scale-down) never
 * includes `custom` — `splitMediaObjectFit==='custom'` is hero's OWN sizing-
 * mode sentinel meaning "ignore object-fit, use the explicit Width/Height
 * controls below instead" (kept UNCHANGED — box-shape/width/height were not
 * part of this migration's adopted atom set). The atom's own `ObjectFitField`
 * has no way to select `custom`, so this toggle is the ONLY way left to
 * enter/exit that mode once the hand-rolled `SelectControl`'s 4th option is
 * gone. Turning it ON sets `splitMediaObjectFit` to `'custom'` directly
 * (bypassing the atom's own `validate()`, which would reject it); turning it
 * OFF resets to `'cover'`, the atom's own documented ultimate fallback.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @return {JSX.Element} Bare rows for the caller's existing PanelBody.
 */
export function HeroSplitMediaStylingSection( { attributes, setAttributes } ) {
	const commonProps = {
		attributes,
		setAttributes,
		blockSlug: BLOCK_SLUG,
		insertion: 'element',
	};
	const resolvedType = resolveMediaType( attributes, 'split', BLOCK_SLUG );
	const isCustomSizing = 'custom' === attributes.splitMediaObjectFit;

	return (
		<>
			<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>
				{ __( 'Display', 'sgs-blocks' ) }
			</p>
			<ToggleControl
				label={ __( 'Custom sizing (explicit width/height)', 'sgs-blocks' ) }
				help={ __(
					'Off: choose how the media fills its box (Object fit, below). On: set an explicit width and height in the "Custom dimensions" controls further down instead.',
					'sgs-blocks'
				) }
				checked={ isCustomSizing }
				onChange={ ( val ) =>
					setAttributes( { splitMediaObjectFit: val ? 'custom' : 'cover' } )
				}
				__nextHasNoMarginBottom
			/>
			{ ! isCustomSizing && (
				<MediaElementPanel
					{ ...commonProps }
					prefix="splitMedia"
					atoms={ [ 'object-fit' ] }
					mediaType={ resolvedType }
				/>
			) }
			{ /* focal-point's own `disclosure()` already hides/disables itself
			     when ObjectFit is not in cover|contain|none|scale-down — 'custom'
			     is outside that list, so this row self-gates correctly with no
			     extra logic needed here. Mounted unconditionally on purpose. */ }
			<MediaElementPanel
				{ ...commonProps }
				prefix="splitMedia"
				atoms={ [ 'focal-point' ] }
				mediaType={ resolvedType }
			/>
		</>
	);
}
