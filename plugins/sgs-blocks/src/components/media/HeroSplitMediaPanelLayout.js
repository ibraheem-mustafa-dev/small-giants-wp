/**
 * HeroSplitMediaPanelLayout — Wave 6 panel assembly for `sgs/hero`'s
 * SPLIT-MEDIA feature (the image/video/SVG slot beside the text column).
 *
 * NOT the section-level background (bgVideo/bgParallax/bgKenBurns/
 * backgroundOverlay*) — that stays on `SGS_Container_Wrapper` and is out of
 * scope for this component.
 *
 * Sibling to `MediaPanelLayout.js` (sgs/media's own panel assembly). Every
 * split-media attribute — source, media-type, object-fit, focal-point,
 * overlay and motion — is normalised onto ONE uniform prefix, `'splitMedia'`
 * (2026-09-07 rename; hero used to spread these across three different
 * ad-hoc prefixes — 'split' / 'splitMedia' / 'media' — a leftover of naming
 * drift, not a real constraint; the framework is pre-production so renaming
 * cost nothing). The one exception is the media-type atom, whose own base
 * string is literally `'MediaType'` — passing prefix `'splitMedia'` there
 * would double up to `splitMediaMediaType`, so it (and `resolveMediaType()`,
 * which reads the same attribute) keeps prefix `'split'`, which already
 * produces the correct `splitMediaType` name via `mediaAttrName('split',
 * 'MediaType')`.
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
import { TextControl, ToggleControl } from '@wordpress/components';
import MediaElementPanel from '../MediaElementPanel.js';
import ResponsiveControl from '../ResponsiveControl.js';
import { resolveMediaType } from './atoms/source.js';

const BLOCK_SLUG = 'sgs/hero';

/** Tier key -> attribute-name suffix, matching source.control.js's own map. */
const TIER_SUFFIX = { desktop: '', tablet: 'Tablet', mobile: 'Mobile' };

/**
 * Per-tier alt-text row for the split-media IMAGE (2026-09-08, WCAG 1.1.1).
 *
 * Hero already declares `splitMediaImageAlt`/`Tablet`/`Mobile` in block.json
 * and already reads all three per-tier (`$sgs_hero_resolve_split_image()` in
 * render.php) — this was a genuine editor-control gap, not a schema gap: the
 * shared `meaning` atom (`components/media/atoms/meaning.control.js`) is NOT
 * tier-aware (it always writes the base/desktop attribute only, matching its
 * sole other adopter `sgs/media`, which never declared tiered alt attrs), so
 * it cannot be reused here without widening it for every adopter. This row is
 * hero-private and mirrors the SAME tier pattern `source.control.js`'s
 * `pairPickerRow()` already uses for the picker above it, writing into the
 * pre-existing tiered attributes rather than inventing a new shape.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @return {JSX.Element} A bare `<ResponsiveControl>` row.
 */
function splitMediaAltRow( { attributes, setAttributes } ) {
	return (
		<ResponsiveControl key="split-media-alt" label={ __( 'Alt text', 'sgs-blocks' ) }>
			{ ( tier ) => {
				const suffix = TIER_SUFFIX[ tier ] ?? '';
				const key = `splitMediaImageAlt${ suffix }`;
				return (
					<TextControl
						label={ __( 'Alt text', 'sgs-blocks' ) }
						help={ __(
							"Describes this tier's image for screen readers. Leave blank to fall back to a wider tier's alt text — set one only when this device shows a genuinely different image, not just a crop.",
							'sgs-blocks'
						) }
						value={ attributes[ key ] || '' }
						onChange={ ( value ) => setAttributes( { [ key ]: value } ) }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				);
			} }
		</ResponsiveControl>
	);
}

/**
 * The "Split image" panel's rows — media type + source pickers, plus the
 * media overlay + motion controls (all prefix 'splitMedia', except the
 * media-type atom itself, which stays prefix 'split' — see the module-level
 * note), which lived in this same panel before the migration and stay here
 * rather than moving to "Split image styling" (no reason to relocate a
 * working section).
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
				prefix="splitMedia"
				atoms={ [ 'source' ] }
				mediaType={ resolvedType }
			/>
			{ /* Alt text only applies to the IMAGE tiers — a <video> carries no
			     alt attribute (captions/transcript are its accessible-text
			     mechanism) and an inline SVG tier already renders
			     aria-hidden="true" unconditionally (helpers-tier-media.php). */ }
			{ 'image' === resolvedType &&
				splitMediaAltRow( { attributes, setAttributes } ) }
			<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>
				{ __( 'Overlay', 'sgs-blocks' ) }
			</p>
			<MediaElementPanel
				{ ...commonProps }
				prefix="splitMedia"
				atoms={ [ 'overlay' ] }
			/>
			<hr style={ { margin: '16px 0' } } />
			<MediaElementPanel
				{ ...commonProps }
				prefix="splitMedia"
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
