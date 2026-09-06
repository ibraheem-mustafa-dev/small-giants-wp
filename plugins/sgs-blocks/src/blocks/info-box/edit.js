import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { useDispatch } from '@wordpress/data';
import {
	useBlockProps,
	InspectorControls,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ToggleControl,
	TextControl,
} from '@wordpress/components';
import { createBlock } from '@wordpress/blocks';
import { DesignTokenPicker, ResponsiveBoxControl, SgsColourPanel, ShadowControl, shadowAttrKeys, fillRow, textRow, SgsLengthControl, SgsBorderControl, resolveColourToken, TypographyControls, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl } from '../../components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { colourVar } from '../../utils';

/**
 * FR-22-6 migration: all card content (icon/media, heading, subtitle,
 * description, and button) is now rendered as InnerBlocks child blocks.
 * RichText inline editing of heading/description/subtitle has been removed —
 * those elements are now editable as child blocks in the InnerBlocks slot.
 *
 * Inspector controls cover only WRAPPER-level styling/layout that render.php
 * actually consumes:
 *   - cardStyle, effectHover, iconPosition (drive wrapper BEM classes)
 *   - Width (maxWidth / width — kept-scalar, base only)
 *   - Spacing (padding / margin — base via WP-native Dimensions panel,
 *     tablet/mobile via the paddingTablet/paddingMobile/marginTablet/
 *     marginMobile object attrs)
 *   - Border / Typography / Shadow are native WP supports — their editor UI
 *     is rendered automatically by the Styles inspector tab and needs no
 *     custom control here (`__experimentalSkipSerialization` only affects
 *     the RENDERED/SAVED output, not editor-UI availability). Border's
 *     RESTING solid colour stays native; only its gradient sibling + the
 *     hover state are custom.
 *   - Colour (background / text / link) is D744 block-private — moved off
 *     the competing native Styles-tab panel (supports.color.* all false)
 *     onto SgsColourPanel rows below (fillRow/textRow + a helper-built link
 *     row), so the client sees ONE colour control per property.
 *
 * NO-INLINE (LOCKED per-block no-inline migration contract §A, 2026-07-10):
 * render.php now scopes ALL of color/typography/spacing/border/shadow into
 * the block's own `<style>` tag rather than auto-inlining them, so
 * `useBlockProps()` no longer receives these via WP's native mechanism in
 * the editor canvas either. `buildPreviewStyle()` below manually mirrors
 * render.php's scoped declarations as an inline preview style on the SAME
 * root element — the editor canvas is allowed to use inline style for live
 * preview (only the SAVED/RENDERED frontend output must be inline-free), and
 * this block is dynamic (render.php), so nothing here is persisted to
 * post_content.
 *
 * Child blocks (sgs/icon, sgs/heading, sgs/text, sgs/multi-button) own their
 * own colour, font size and link, so the parent controls set attributes
 * render.php never reads. Removed attrs survive only in block.json as
 * historical schema; no deprecated.js exists (D271).
 */

const LENGTH_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: '%', label: '%', default: 0 },
];

// Box-object interface contract §1: build an editor-preview shorthand from a
// box object — mirrors render.php's box-shorthand builder so the canvas
// preview matches the frontend (contract §5). Desktop-tier only (responsive
// tiers apply via PHP @media, not previewable in the fixed-width canvas).
function boxShorthand( box ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	const { top, right, bottom, left } = box;
	if ( ! top && ! right && ! bottom && ! left ) return undefined;
	return [ top || '0', right || '0', bottom || '0', left || '0' ].join( ' ' );
}

/**
 * Editor-preview style builder — desktop styles only; responsive/border/
 * colour/typography per-instance edge cases are resolved authoritatively by
 * render.php. This mirrors the common cases so the canvas is a reasonable
 * WYSIWYG approximation.
 *
 * @param {Object} attributes Block attributes.
 * @returns {Object} React inline-style object.
 */
function buildPreviewStyle( attributes ) {
	const { padding, margin, style, width, maxWidth, backgroundColour, backgroundColourGradient, textColour, borderColourGradient, textAlign } = attributes;
	const preview = {};

	// Mirrors render.php's `$info_box_text_align` resolution exactly — the
	// native `style.typography.textAlign` (WP's "Align text" control) wins
	// over the top-level `textAlign` attribute (the cloning converter's
	// fallback), applied to the block ROOT so InnerBlocks children inherit it
	// (`supports.typography.textAlign.__experimentalSkipSerialization: true`
	// means WP's own auto-apply is deliberately off — this is the only path).
	const infoBoxTextAlign = style?.typography?.textAlign ?? ( textAlign ?? '' );
	if ( [ 'left', 'center', 'right' ].includes( infoBoxTextAlign ) ) {
		preview.textAlign = infoBoxTextAlign;
	}

	// Background/text colour moved OFF native style.color.* to block-private
	// attrs mounted in SgsColourPanel (D744) — supports.color.background/
	// text/gradients are now false, so WP no longer writes style.color here.
	// Resolve the same way sgs/quote's editor preview does: a `#`/`rgb`/`hsl`
	// value passes through raw, anything else is a design-token slug wrapped
	// via colourVar(). A text GRADIENT is deliberately NOT previewed here —
	// it needs `background-clip:text` on the text layer while a background
	// gradient/colour needs its own `::after` layer (render.php owns that
	// interaction authoritatively); the canvas approximation stays
	// flat-colour-only for text.
	if ( backgroundColourGradient ) {
		preview.backgroundImage = backgroundColourGradient;
	} else if ( backgroundColour ) {
		preview.backgroundColor = /^#|^rgb|^hsl/.test( backgroundColour )
			? backgroundColour
			: colourVar( backgroundColour );
	}
	if ( textColour ) {
		preview.color = /^#|^rgb|^hsl/.test( textColour )
			? textColour
			: colourVar( textColour );
	}

	const border = style?.border;
	if ( border ) {
		if ( border.style && border.style !== 'none' ) {
			if ( border.width ) preview.borderWidth = border.width;
			preview.borderStyle = border.style;
			if ( border.color ) preview.borderColor = border.color;
			// A gradient border renders frontend as a masked ::before ring, which cannot
			// be reproduced in a plain inline style — approximate it with the gradient as
			// a border-image so the canvas at least shows that a gradient is applied.
			// borderColourGradient is a block-private attr (not part of native style.border).
			if ( borderColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( borderColourGradient ) ) {
				preview.borderImage = `${ borderColourGradient } 1`;
			}
		}
		const radius = border.radius;
		if ( typeof radius === 'string' && radius ) {
			preview.borderRadius = radius;
		} else if ( radius && typeof radius === 'object' ) {
			const r = boxShorthand( {
				top: radius.topLeft,
				right: radius.topRight,
				bottom: radius.bottomRight,
				left: radius.bottomLeft,
			} );
			if ( r ) preview.borderRadius = r;
		}
	}

	if ( style?.shadow ) {
		preview.boxShadow = /^#|^rgb|^var\(/.test( style.shadow )
			? style.shadow
			: `var(--wp--preset--shadow--${ style.shadow })`;
	}

	const paddingPreview = boxShorthand( padding?.desktop );
	if ( paddingPreview ) preview.padding = paddingPreview;
	const marginPreview = boxShorthand( margin?.desktop );
	if ( marginPreview ) preview.margin = marginPreview;

	if ( maxWidth ) {
		preview.maxWidth = maxWidth;
		preview.marginInline = 'auto';
	}
	if ( width ) {
		preview.width = width;
	}

	return preview;
}

const CARD_STYLE_OPTIONS = [
	{ label: __( 'Flat', 'sgs-blocks' ), value: 'flat' },
	{ label: __( 'Bordered', 'sgs-blocks' ), value: 'bordered' },
	{ label: __( 'Elevated', 'sgs-blocks' ), value: 'elevated' },
	{ label: __( 'Filled', 'sgs-blocks' ), value: 'filled' },
];

const HOVER_EFFECT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Border accent', 'sgs-blocks' ), value: 'border-accent' },
	{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
];

const EASING_OPTIONS = [
	{ label: __( 'Ease in-out', 'sgs-blocks' ), value: 'ease-in-out' },
	{ label: __( 'Ease', 'sgs-blocks' ), value: 'ease' },
	{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
	{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
	{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
];

const ICON_POSITION_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'top' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
];

const TEXT_ALIGN_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
];

/**
 * Media type options for the "Media type" convenience dropdown.
 * A leading placeholder covers the "custom first child" case — where the
 * first child is not one of the recognised block/attribute combinations.
 * In that case the dropdown shows "— Custom —" and does nothing on change.
 */
const MEDIA_TYPE_OPTIONS = [
	{ label: __( '— Custom —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Icon', 'sgs-blocks' ), value: 'icon' },
	{ label: __( 'Emoji', 'sgs-blocks' ), value: 'emoji' },
	{ label: __( 'Image', 'sgs-blocks' ), value: 'image' },
	{ label: __( 'Video', 'sgs-blocks' ), value: 'video' },
	{ label: __( 'SVG / Animation', 'sgs-blocks' ), value: 'svg' },
];

/**
 * Default attributes inserted when swapping TO each media type.
 * These are purposely minimal — only the attrs that distinguish the media
 * type are set here; the child block's own defaults cover the rest.
 */
const MEDIA_TYPE_DEFAULTS = {
	// Attr names MUST match sgs/icon block.json (iconName / backgroundColour /
	// numeric iconSize) — WP silently discards undeclared attrs (D338).
	icon:  { blockName: 'sgs/icon',  attrs: { iconSource: 'lucide', iconName: 'star', iconColour: 'primary', backgroundColour: 'accent-light', backgroundShape: 'circle', iconSize: 32 } },
	emoji: { blockName: 'sgs/icon',  attrs: { iconSource: 'emoji', emojiChar: '⭐' } },
	image: { blockName: 'sgs/media', attrs: { mediaType: 'image' } },
	video: { blockName: 'sgs/media', attrs: { mediaType: 'video' } },
	svg:   { blockName: 'sgs/media', attrs: { mediaType: 'svg' } },
};

/**
 * Derive the current media-type value from the FIRST inner block of this
 * info-box. Returns one of 'icon' | 'emoji' | 'image' | 'video' | 'svg' | ''.
 * An empty string means "custom" (unknown / non-standard first child).
 *
 * @param {Object|undefined} firstBlock - The first inner block object, or undefined.
 * @return {string} The derived media type value.
 */
function deriveMediaType( firstBlock ) {
	if ( ! firstBlock ) {
		return '';
	}
	if ( firstBlock.name === 'sgs/icon' ) {
		// Distinguish emoji from standard icon by iconSource attribute.
		return firstBlock.attributes?.iconSource === 'emoji' ? 'emoji' : 'icon';
	}
	if ( firstBlock.name === 'sgs/media' ) {
		const mt = firstBlock.attributes?.mediaType;
		if ( mt === 'image' || mt === 'video' || mt === 'svg' ) {
			return mt;
		}
	}
	// First child is present but not a recognised media block — show "Custom".
	return '';
}

/**
 * Default InnerBlocks template for a new info-box.
 * Produces: icon → heading → description paragraph → button.
 * Operators customise the child blocks in place in the editor.
 */
const INFO_BOX_TEMPLATE = [
	// Attr names MUST match sgs/icon block.json (iconName / backgroundColour /
	// numeric iconSize) — WP silently discards undeclared attrs (D338).
	[
		'sgs/icon',
		{
			iconName: 'star',
			iconColour: 'primary',
			backgroundColour: 'accent-light',
			backgroundShape: 'circle',
			iconSize: 32,
			className: 'sgs-info-box__icon',
		},
	],
	[ 'sgs/heading', { level: 'h3', headingRole: 'heading', content: __( 'Feature heading', 'sgs-blocks' ) } ],
	[ 'sgs/text', { text: __( 'Describe the feature or benefit here.', 'sgs-blocks' ) } ],
	[
		'sgs/multi-button',
		{},
		[ [ 'sgs/button', { inheritStyle: 'primary', label: __( 'Learn More', 'sgs-blocks' ) } ] ],
	],
];

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		style,
		cardStyle,
		effectHover,
		iconPosition,
		textAlign,
		width,
		maxWidth,
		borderColourHover,
		borderColourHoverGradient,
		borderColourGradient,
		shadowHover,
		shadowHoverColour,
		scaleHover,
		grayscaleHover,
		transitionDuration,
		transitionEasing,
		backgroundColour,
		backgroundColourGradient,
	} = attributes;

	// (The resting border-gradient row's Solid/Gradient mode is owned by
	// DesignTokenPicker and derived from the stored value — there is deliberately
	// no local useState mirror of it here. See the note at that control.)

	// -------------------------------------------------------------------------
	// Read the inner blocks of THIS info-box so we can derive the current
	// media type without storing a redundant scalar attr on the parent block.
	// Keyed on clientId so the selector re-runs only when this block's children
	// change (not on unrelated blocks in the page).
	// -------------------------------------------------------------------------
	const innerBlocks = useSelect(
		( select ) => select( 'core/block-editor' ).getBlocks( clientId ),
		[ clientId ]
	);

	const { replaceBlock, updateBlockAttributes, insertBlock } = useDispatch( 'core/block-editor' );

	// Derived — never stored on the info-box itself.
	const firstBlock     = innerBlocks[ 0 ];
	const currentMediaType = deriveMediaType( firstBlock );

	/**
	 * Handle a change in the "Media type" dropdown.
	 *
	 * Rules:
	 * 1. Empty value ("— Custom —") selected → do nothing; preserve first child.
	 * 2. Icon ↔ Emoji (both use sgs/icon): update attrs IN PLACE so the client
	 *    keeps size/colour/link choices they may have already set.
	 * 3. Cross-type switch (e.g. Icon → Image): replace the first child block.
	 * 4. No children yet: insert a new block at index 0.
	 *
	 * In all cases, children at index 1+ (heading, text, button) are NEVER
	 * touched — only index 0 is ever affected.
	 *
	 * @param {string} newValue - The newly selected media type value.
	 */
	function handleMediaTypeChange( newValue ) {
		// Ignore the placeholder "— Custom —" option.
		if ( ! newValue ) {
			return;
		}

		const target = MEDIA_TYPE_DEFAULTS[ newValue ];
		if ( ! target ) {
			return;
		}

		if ( ! firstBlock ) {
			// No children at all — insert at index 0 only.
			insertBlock( createBlock( target.blockName, target.attrs ), 0, clientId );
			return;
		}

		const isIconSwitch = firstBlock.name === 'sgs/icon' && target.blockName === 'sgs/icon';

		if ( isIconSwitch ) {
			// Icon ↔ Emoji: same underlying block — update attrs in place.
			// This preserves any iconSize / iconColour the client already set.
			// When switching TO emoji, only set emojiChar default if it is empty.
			const patch = { iconSource: target.attrs.iconSource };
			if ( newValue === 'emoji' ) {
				patch.iconSource = 'emoji';
				if ( ! firstBlock.attributes?.emojiChar ) {
					patch.emojiChar = target.attrs.emojiChar;
				}
			} else {
				// Switching back to Icon: restore the lucide defaults for source/icon.
				// Intentionally NOT overwriting iconColour / iconSize so the client
				// keeps any customisation they made in icon mode.
				patch.iconSource = 'lucide';
				if ( ! firstBlock.attributes?.icon ) {
					patch.icon = target.attrs.icon;
				}
			}
			updateBlockAttributes( firstBlock.clientId, patch );
			return;
		}

		// Cross-type switch (e.g. Icon → Image, Image → Video, etc.):
		// replace the first child block entirely. All other children are unaffected.
		replaceBlock( firstBlock.clientId, createBlock( target.blockName, target.attrs ) );
	}

	// -------------------------------------------------------------------------
	// Render
	// -------------------------------------------------------------------------

	const className = [
		'sgs-info-box',
		`sgs-info-box--${ cardStyle }`,
		`sgs-info-box--hover-${ effectHover }`,
		`sgs-info-box--media-${ iconPosition }`,
	].join( ' ' );

	// NO-INLINE contract §A: color/typography/spacing/border/shadow supports
	// are skip-serialised (block.json), so useBlockProps() no longer applies
	// them automatically. buildPreviewStyle() mirrors render.php's scoped
	// declarations here so the canvas stays a faithful WYSIWYG (editor-only —
	// this block is dynamic, so nothing here persists to post_content).

	// Contrast check for border colour — warn if border fails WCAG 3:1 contrast
	// against the info-box's own background. When the background is a gradient,
	// the flat backgroundColour is not rendered, so skip the check in that case.
	const infoBoxContrastAgainst =
		backgroundColour && ! backgroundColourGradient
			? backgroundColour
			: '';

	const blockProps = useBlockProps( { className, style: buildPreviewStyle( attributes ) } );

	// FR-22-6: single InnerBlocks slot covers ALL card content.
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template:     INFO_BOX_TEMPLATE,
		// Open: converter injects varied child block combinations.
		// Do not lock allowedBlocks so the editor remains flexible.
	} );

	return (
		<>
			{ /* D609/D618/D744 — ONE grouped, SGS-OWNED colour panel, rendered
			   FIRST. Background/text/link colour used to be WP-native
			   (`style.color.*`/Elements API); D744 moved them off the native
			   Styles-tab panel (supports.color.* all false) onto block-private
			   attrs so the client sees ONE colour control per property, not two
			   competing ones. Background/text now render as full rows (both
			   Normal + Hover states, via the shared fillRow/textRow helpers) —
			   Border stays native for its RESTING solid colour (only the
			   gradient sibling + the hover state are custom, unchanged by
			   D744). Link colour has no shared row helper, so it is hand-built
			   below matching sgs/table-of-contents' linkColour/hover pairing.
			   Every state links to the theme palette (D619). */ }
			<SgsColourPanel
				rows={ [
					fillRow( {
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						attrs: {
							base: 'backgroundColour',
							hover: 'backgroundColourHover',
							gradient: 'backgroundColourGradient',
							hoverGradient: 'backgroundColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						attrs: {
							base: 'textColour',
							hover: 'textColourHover',
							gradient: 'textColourGradient',
							hoverGradient: 'textColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'link',
						label: __( 'Link colour', 'sgs-blocks' ),
						attrs: {
							base: 'linkColour',
							hover: 'linkColourHover',
							gradient: 'linkColourGradient',
							hoverGradient: 'linkColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					{
						key: 'border',
						label: __( 'Border colour (hover)', 'sgs-blocks' ),
						states: [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: borderColourHover,
								onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
								linked: true,
								gradientValue: borderColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { borderColourHoverGradient: val ?? '' } ),
							},
						],
					},
					shadowHover && {
						key: 'shadowHover',
						label: __( 'Shadow colour (hover)', 'sgs-blocks' ),
						states: [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: shadowHoverColour,
								onChange: ( val ) => setAttributes( { shadowHoverColour: val ?? '' } ),
								linked: true,
							},
						],
					},
				] }
			/>
			{ /* Resting border gradient — the missing base counterpart to the
			   "Border colour (hover)" row above. Solid resting colour stays the
			   native `__experimentalBorder.color` control (WP's own Border panel
			   in the Styles tab, left untouched) — this control ONLY owns the
			   gradient sibling attribute, so there is no second control that can
			   disagree with the native one about what the solid colour is. */ }
			<InspectorControls group="styles">
				{ /* Typography — replaces the old WP-native supports.typography
				   (fontSize/lineHeight only) with the shared TypographyControls
				   component + sgs_typography_css_rule() render.php helper
				   (D971/D972 full-replacement track). Root prefix "" — this
				   block's typography support targeted the block root
				   (.wp-block-sgs-info-box), same as sgs/accordion. */ }
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
					/>
				</PanelBody>
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ attributes.borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ attributes.borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ attributes.borderColourGradient }
						onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
						colourLinked={ true }
						contrastAgainst={ infoBoxContrastAgainst }
						radiusValues={ {
								base: attributes.borderRadius?.desktop ?? {},
								tablet: attributes.borderRadius?.tablet ?? {},
								mobile: attributes.borderRadius?.mobile ?? {},
							} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>
			</InspectorControls>
			<InspectorControls>
				{ /* ===== Media type (convenience swap — first child only) ===== */ }
				<PanelBody title={ __( 'Media', 'sgs-blocks' ) } initialOpen={ true }>
					<SelectControl
						label={ __( 'Media type', 'sgs-blocks' ) }
						help={ __( 'Swaps the visual element at the top of this card. Your heading, text and button are never changed.', 'sgs-blocks' ) }
						value={ currentMediaType }
						options={ MEDIA_TYPE_OPTIONS }
						onChange={ handleMediaTypeChange }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ /* ===== Width (kept-scalar, base only — matches render.php scope) ===== */ }
				<PanelBody title={ __( 'Width', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsLengthControl
						presets={ false }
						label={ __( 'Outer max-width', 'sgs-blocks' ) }
						value={ maxWidth || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { maxWidth: val ?? '' } ) }
						help={ __( 'Leave blank for no cap.', 'sgs-blocks' ) }
					/>
					<SgsLengthControl
						presets={ false }
						label={ __( 'Width', 'sgs-blocks' ) }
						value={ width || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { width: val ?? '' } ) }
						help={ __( 'Exact CSS length, e.g. 900px. Leave blank for full width.', 'sgs-blocks' ) }
					/>
				</PanelBody>

				{ /* ===== Spacing — padding/margin are each a single block-owned
				   tier-object attr { desktop, tablet, mobile }, written via
				   ResponsiveOverride + SgsBoxControl; read by SGS_Container_Wrapper's
				   tier-object emission path. ===== */ }
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveOverride
						value={ attributes.padding }
						onChange={ ( obj ) => setAttributes( { padding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride
						value={ attributes.margin }
						onChange={ ( obj ) => setAttributes( { margin: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Margin', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				{ /* ===== Card Style ===== */ }
				<ToolsPanel
					label={ __( 'Card Style', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							cardStyle: 'elevated',
							effectHover: 'lift',
							scaleHover: '',
							grayscaleHover: false,
							transitionDuration: '300',
							transitionEasing: 'ease-in-out',
							shadowHover: '',
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Card style', 'sgs-blocks' ) }
						hasValue={ () => cardStyle !== 'elevated' }
						onDeselect={ () => setAttributes( { cardStyle: 'elevated' } ) }
						isShownByDefault
					>
						<SelectControl
							label={ __( 'Card style', 'sgs-blocks' ) }
							value={ cardStyle }
							options={ CARD_STYLE_OPTIONS }
							onChange={ ( val ) => setAttributes( { cardStyle: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						hasValue={ () => effectHover !== 'lift' }
						onDeselect={ () => setAttributes( { effectHover: 'lift' } ) }
						isShownByDefault
					>
						<SelectControl
							label={ __( 'Hover effect', 'sgs-blocks' ) }
							value={ effectHover }
							options={ HOVER_EFFECT_OPTIONS }
							onChange={ ( val ) => setAttributes( { effectHover: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Shadow (hover)', 'sgs-blocks' ) }
						hasValue={ () => shadowHover !== '' }
						onDeselect={ () => setAttributes( { shadowHover: '' } ) }
						isShownByDefault
					>
						{ /* shadowHover — declared + read by render.php (preset-slug ONLY,
							no colour, no editor control at all) until this fix (Stage 0
							orphan attr, D621/D622). Landed straight on the target shape
							(shape + colour), not the old fixed subtle/raised/floating/glow
							allowlist. */ }
						<ShadowControl
							label={ __( 'Shadow (hover)', 'sgs-blocks' ) }
							attributes={ attributes }
							setAttributes={ setAttributes }
							attrNames={ shadowAttrKeys( 'shadowHover' ) }
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Scale on hover (e.g. 1.03)', 'sgs-blocks' ) }
						hasValue={ () => scaleHover !== '' }
						onDeselect={ () => setAttributes( { scaleHover: '' } ) }
					>
						<TextControl
							label={ __( 'Scale on hover (e.g. 1.03)', 'sgs-blocks' ) }
							value={ scaleHover }
							onChange={ ( val ) => setAttributes( { scaleHover: val } ) }
							placeholder="1.03"
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Grayscale to colour', 'sgs-blocks' ) }
						hasValue={ () => grayscaleHover !== false }
						onDeselect={ () =>
							setAttributes( { grayscaleHover: false } )
						}
					>
						<ToggleControl
							label={ __( 'Grayscale to colour', 'sgs-blocks' ) }
							checked={ grayscaleHover }
							onChange={ ( val ) => setAttributes( { grayscaleHover: val } ) }
							help={ __(
								'Desaturates the media at rest; restores full colour on hover.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						hasValue={ () => transitionDuration !== '300' }
						onDeselect={ () =>
							setAttributes( { transitionDuration: '300' } )
						}
					>
						<RangeControl
							label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
							value={ parseInt( transitionDuration, 10 ) || 300 }
							onChange={ ( val ) => setAttributes( { transitionDuration: String( val ) } ) }
							min={ 0 }
							max={ 1000 }
							step={ 50 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Transition easing', 'sgs-blocks' ) }
						hasValue={ () => transitionEasing !== 'ease-in-out' }
						onDeselect={ () =>
							setAttributes( { transitionEasing: 'ease-in-out' } )
						}
					>
						<SelectControl
							label={ __( 'Transition easing', 'sgs-blocks' ) }
							value={ transitionEasing }
							options={ EASING_OPTIONS }
							onChange={ ( val ) => setAttributes( { transitionEasing: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
				</ToolsPanel>

				{ /* ===== Layout ===== */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Media position', 'sgs-blocks' ) }
						value={ iconPosition }
						options={ ICON_POSITION_OPTIONS }
						onChange={ ( val ) => setAttributes( { iconPosition: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Text align', 'sgs-blocks' ) }
						value={ textAlign }
						options={ TEXT_ALIGN_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { textAlign: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

			</InspectorControls>

			{ /* FR-22-6: innerBlocksProps spread onto the wrapper div — the
			     InnerBlocks slot IS the card content area. */ }
			<div { ...innerBlocksProps } />
		</>
	);
}
