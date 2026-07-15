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
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { createBlock } from '@wordpress/blocks';
import { ResponsiveBoxControl } from '../../components';

/**
 * FR-22-6 migration: all card content (icon/media, heading, subtitle,
 * description, and button) is now rendered as InnerBlocks child blocks.
 * RichText inline editing of heading/description/subtitle has been removed —
 * those elements are now editable as child blocks in the InnerBlocks slot.
 *
 * Inspector controls cover only WRAPPER-level styling/layout that render.php
 * actually consumes:
 *   - cardStyle, effectHover, iconPosition (drive wrapper BEM classes)
 *   - Width (maxWidth / contentWidth — kept-scalar, base only)
 *   - Spacing (padding / margin — base via WP-native Dimensions panel,
 *     tablet/mobile via the paddingTablet/paddingMobile/marginTablet/
 *     marginMobile object attrs)
 *   - Border / Colour / Typography / Shadow are native WP supports — their
 *     editor UI is rendered automatically by the Styles inspector tab and
 *     needs no custom control here (`__experimentalSkipSerialization` only
 *     affects the RENDERED/SAVED output, not editor-UI availability).
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
 * HC2 cleanup (2026-06-08): the per-element colour / font-size / icon-size and
 * legacy-link controls were removed. They were dead — the child blocks
 * (sgs/icon, sgs/heading, sgs/text, sgs/multi-button) own their own colour,
 * font size and link, so the parent controls set attributes render.php never
 * read. The removed attrs survive only in deprecated.js for back-compat.
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
	const { style, contentWidth, maxWidth } = attributes;
	const preview = {};

	const bg = style?.color?.background;
	if ( bg ) preview.backgroundColor = bg;
	const text = style?.color?.text;
	if ( text ) preview.color = text;
	const gradient = style?.color?.gradient;
	if ( gradient ) preview.backgroundImage = gradient;

	const border = style?.border;
	if ( border ) {
		if ( border.style && border.style !== 'none' ) {
			if ( border.width ) preview.borderWidth = border.width;
			preview.borderStyle = border.style;
			if ( border.color ) preview.borderColor = border.color;
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

	const paddingPreview = boxShorthand( style?.spacing?.padding );
	if ( paddingPreview ) preview.padding = paddingPreview;
	const marginPreview = boxShorthand( style?.spacing?.margin );
	if ( marginPreview ) preview.margin = marginPreview;

	if ( maxWidth ) {
		preview.maxWidth = maxWidth;
		preview.marginInline = 'auto';
	}
	if ( contentWidth ) {
		preview.width = contentWidth;
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

const ICON_POSITION_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'top' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
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
		contentWidth,
		maxWidth,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
	} = attributes;

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
	const blockProps = useBlockProps( { className, style: buildPreviewStyle( attributes ) } );

	// FR-22-6: single InnerBlocks slot covers ALL card content.
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template:     INFO_BOX_TEMPLATE,
		// Open: converter injects varied child block combinations.
		// Do not lock allowedBlocks so the editor remains flexible.
	} );

	return (
		<>
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
					/>
				</PanelBody>

				{ /* ===== Width (kept-scalar, base only — matches render.php scope) ===== */ }
				<PanelBody title={ __( 'Width', 'sgs-blocks' ) } initialOpen={ false }>
					<UnitControl
						label={ __( 'Outer max-width', 'sgs-blocks' ) }
						value={ maxWidth || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { maxWidth: val ?? '' } ) }
						help={ __( 'Leave blank for no cap.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<UnitControl
						label={ __( 'Content width', 'sgs-blocks' ) }
						value={ contentWidth || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { contentWidth: val ?? '' } ) }
						help={ __( 'Exact CSS length, e.g. 900px. Leave blank for full width.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ===== Spacing — box-object interface contract §B/§E: base routes to
				   WP-native style.spacing.* (Dimensions panel, skip-serialised → scoped,
				   not inline); tiers are the paddingTablet/paddingMobile +
				   marginTablet/marginMobile object attrs. ===== */ }
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						values={ {
							base: style?.spacing?.padding ?? {},
							tablet: paddingTablet ?? {},
							mobile: paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, padding: next } } } );
							} else {
								setAttributes( { [ `padding${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						values={ {
							base: style?.spacing?.margin ?? {},
							tablet: marginTablet ?? {},
							mobile: marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, margin: next } } } );
							} else {
								setAttributes( { [ `margin${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
				</PanelBody>

				{ /* ===== Card Style ===== */ }
				<PanelBody title={ __( 'Card Style', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Card style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ CARD_STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { cardStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ effectHover }
						options={ HOVER_EFFECT_OPTIONS }
						onChange={ ( val ) => setAttributes( { effectHover: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ===== Layout ===== */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Media position', 'sgs-blocks' ) }
						value={ iconPosition }
						options={ ICON_POSITION_OPTIONS }
						onChange={ ( val ) => setAttributes( { iconPosition: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

			</InspectorControls>

			{ /* FR-22-6: innerBlocksProps spread onto the wrapper div — the
			     InnerBlocks slot IS the card content area. */ }
			<div { ...innerBlocksProps } />
		</>
	);
}
