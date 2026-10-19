import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	ToggleControl,
} from '@wordpress/components';
import { TypographyControls, ResponsiveBoxControl, SgsColourPanel, textRow, fillRow, SgsLengthControl, SpacingControl, LinkUnderlineControl } from '../../components';
import {
	colourVar,
	SGS_LENGTH_UNITS,
	sgsNormaliseLength,
	sgsHasLength,
	sgsLengthPreview,
	resolveTextColourPreviewStyle,
	typographyPreviewStyle,
	linkUnderlinePreviewCss,
	usePreviewTier,
	tierBoxLonghands,
	isCssGradient,
	sgsBorderPreview,
} from '../../utils';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { labelDotPreviewCss } from './dot-preview';
import EndShapePanel from './EndShapePanel';
import {
	labelEndShapeEnds,
	labelEndShapePreviewCss,
	labelHasEndOutline,
} from './end-shape-preview';
import { RICH_TEXT_LINK_ONLY } from '../../utils/rich-text-formats';

/**
 * The typography attributes the shared panel owns, at their block.json defaults.
 * The Typography item's reset writes these; its `hasValue` compares against them.
 * `textColumns` has no default, so a reset clears it.
 */
const TYPOGRAPHY_DEFAULTS = {
	fontFamily: '',
	fontSize: { desktop: 12 },
	fontSizeUnit: 'px',
	fontWeight: '600',
	fontStyle: '',
	lineHeight: 1.2,
	lineHeightUnit: 'em',
	letterSpacing: 0.08,
	letterSpacingUnit: 'em',
	textTransform: 'uppercase',
	textDecoration: '',
	textAlign: '',
	textWrap: '',
	textColumns: undefined,
	writingMode: '',
};

/**
 * Whether any typography attribute differs from its default. fontSize is a
 * { desktop, tablet, mobile } object, so it is compared by tier.
 *
 * @param {Object} attributes Block attributes.
 * @return {boolean} True when the Typography item holds a value.
 */
function hasTypographyValue( attributes ) {
	return Object.keys( TYPOGRAPHY_DEFAULTS ).some( ( key ) => {
		if ( 'fontSize' === key ) {
			const size = attributes.fontSize && 'object' === typeof attributes.fontSize ? attributes.fontSize : {};
			return 12 !== size.desktop || !! size.tablet || !! size.mobile;
		}
		const value = attributes[ key ];
		const fallback = TYPOGRAPHY_DEFAULTS[ key ];
		if ( undefined === fallback ) {
			return undefined !== value && null !== value && '' !== value;
		}
		return value !== fallback;
	} );
}

/**
 * Build the editor-canvas preview style object for the label element.
 * This is editor-only convenience (mirrors sgs/heading) — the frontend
 * render.php emits every declaration into a scoped `.{uid}` <style> tag,
 * never inline (contract §A).
 */
function buildStyle( attributes, tier ) {
	const {
		textColour,
		textColourGradient,
		backgroundColour,
		backgroundColourGradient,
		padding,
		margin,
		borderRadius,
		fullWidth,
		className,
		borderWidth,
		borderStyle,
		borderColour,
		borderColourGradient,
	} = attributes;
	const hasEndShape = Object.keys( labelEndShapeEnds( attributes ) ).length > 0;

	// margin and padding are TIER-OF-BOXES OBJECTS {desktop,tablet,mobile};
	// the preview shows the tier the editor is previewing.
	const marginLonghands = tierBoxLonghands( margin, tier, 'margin' );
	// Set sides only, as sgs_label_box_css_rule() prints them; an unset side keeps the stylesheet's value.
	const paddingLonghands = tierBoxLonghands( padding, tier, 'padding' );

	const previewStyle = {
		...resolveTextColourPreviewStyle( textColour, textColourGradient, colourVar ),
		...typographyPreviewStyle( attributes, '', tier ),
		...marginLonghands,
		...paddingLonghands,
	};

	// Box (padding / background / radius) paints on VALUE-PRESENCE — mirrors
	// render.php's ungated helper (no pill gate). A shaped label paints its fill on
	// the cut `::after` layer instead (labelEndShapePreviewCss), so the root has none.
	if ( ! hasEndShape ) {
		previewStyle.backgroundColor = colourVar( backgroundColour ) || undefined;
		// Gradient sibling preview (colour-conformance FILL closeout, 2026-09-06) —
		// mirrors render.php's sgs_background_paint_decl() gradient-wins-when-set.
		if ( isCssGradient( backgroundColourGradient ) ) {
			previewStyle.backgroundImage = backgroundColourGradient;
		}
	}
	// The border, as the shared border panel's twin paints it. With an end shape the
	// root's border only reserves room for the outline element, so its colour is clear.
	Object.assign(
		previewStyle,
		sgsBorderPreview(
			{
				widthValues: borderWidth,
				styleValue: borderStyle,
				colourValue: borderColour,
				colourGradientValue: borderColourGradient,
			},
			tier
		)
	);
	if ( hasEndShape ) {
		delete previewStyle.borderImage;
		if ( previewStyle.borderStyle ) {
			previewStyle.borderColor = 'transparent';
		}
	}
	// borderRadius is a CSS-length STRING (2026-08-13). The old check used
	// `Number( borderRadius ) !== 0`, which is NaN for '1.5rem' — and the old
	// preview appended 'px' unconditionally, so '1.5rem' painted as '1.5rempx'
	// and silently did nothing. Both now go through the shared helpers so the
	// canvas matches render.php exactly, legacy bare numbers included.
	const hasRadius = sgsHasLength( borderRadius );
	previewStyle.borderRadius = sgsLengthPreview( borderRadius );

	// Display model — mirrors render.php. When an is-style-* variant class owns
	// display, emit none (the variant CSS decides). Otherwise: fullWidth →
	// block+100%, a boxed label → inline-block, a bare eyebrow → block.
	const hasStyleVariant = typeof className === 'string' &&
		className.includes( 'is-style-' );
	if ( ! hasStyleVariant ) {
		// render.php's `null !== $base_padding_shorthand`: true when any padding side is set.
		const boxPresent = Object.keys( paddingLonghands ).length > 0 || !! backgroundColour || hasRadius || hasEndShape;
		if ( fullWidth ) {
			previewStyle.display = 'block';
			previewStyle.width = '100%';
		} else if ( boxPresent ) {
			previewStyle.display = 'inline-block';
		} else {
			previewStyle.display = 'block';
		}
	}

	// Remove undefined values so the DOM stays clean.
	return Object.fromEntries(
		Object.entries( previewStyle ).filter( ( [ , v ] ) => v !== undefined )
	);
}

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		text,
		linkUnderline,
		linkUnderlineThickness,
		linkUnderlineColour,
		linkUnderlineColourHover,
		linkUnderlineOffset,
		backgroundColour,
		backgroundColourGradient,
		// padding is a TIER-OF-BOXES OBJECT {desktop,tablet,mobile} — ONE attr;
		// each tier is a {top,right,bottom,left} box.
		padding,
		margin,
		borderRadius,
		fullWidth,
		dot,
		dotSize,
		dotGap,
	} = attributes;

	const previewTier = usePreviewTier();
	const hasEndShape = Object.keys( labelEndShapeEnds( attributes ) ).length > 0;
	const hasOutline = labelHasEndOutline( attributes );
	const blockProps = useBlockProps( {
		className: `sgs-lbl-ed-${ clientId }${ hasEndShape ? ' has-end-shape' : '' }`,
		style: buildStyle( attributes, previewTier ),
	} );
	// How a link inside the label is underlined: the same rules render.php prints (includes/helpers-link-underline.php).
	const linkUnderlineCss = linkUnderlinePreviewCss( `.sgs-lbl-ed-${ clientId }`, {
		mode: linkUnderline,
		thickness: linkUnderlineThickness,
		colour: linkUnderlineColour,
		colourHover: linkUnderlineColourHover,
		offset: linkUnderlineOffset,
	} );
	// The leading dot: the same `::before` rule render.php prints, scoped to this canvas element.
	const dotCss = labelDotPreviewCss( `.sgs-lbl-ed-${ clientId }`, attributes );
	// The end shapes: the cut fill layer and, with an outline, its edge element (the rules render.php prints).
	const endShapeCss = labelEndShapePreviewCss( `.sgs-lbl-ed-${ clientId }`, attributes );
	const richText = (
		<RichText
			tagName="span"
			value={ text }
			onChange={ ( val ) => setAttributes( { text: val } ) }
			placeholder={ __( 'Label text…', 'sgs-blocks' ) }
			allowedFormats={ RICH_TEXT_LINK_ONLY }
		/>
	);

	return (
		<>
			{ /* D609/D618 — ONE grouped, SGS-OWNED colour panel, rendered FIRST.
			   Replaces the inline DesignTokenPicker rows that used to live in
			   the "Colour" panel below. textColour gained a hover pair
			   2026-09-07 (Task 1, colour-conformance); background still has
			   none. Links to the theme palette (D619). */ }
			<SgsColourPanel
				rows={ [
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
					{
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: backgroundColour,
								onChange: ( val ) => setAttributes( { backgroundColour: val ?? '' } ),
								linked: true,
								gradientValue: backgroundColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { backgroundColourGradient: val ?? '' } ),
							},
						],
					},
					dot &&
						fillRow( {
							key: 'dot',
							label: __( 'Dot colour', 'sgs-blocks' ),
							attrs: {
								base: 'dotColour',
								gradient: 'dotColourGradient',
							},
							attributes,
							setAttributes,
						} ),
				].filter( Boolean ) }
			/>
			<InspectorControls group="styles">
				<PanelBody
					title={ __( 'Typography', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToolsPanel
						className="sgs-nested-tools-panel"
						label={ __( 'Typography', 'sgs-blocks' ) }
						resetAll={ () => setAttributes( { ...TYPOGRAPHY_DEFAULTS } ) }
					>
						{ /* One item for the whole shared panel: font family, size (all devices),
						   weight, style, line height, letter spacing, transform, decoration,
						   alignment, wrapping, columns and writing mode. */ }
						<ToolsPanelItem
							label={ __( 'Typography', 'sgs-blocks' ) }
							hasValue={ () => hasTypographyValue( attributes ) }
							onDeselect={ () => setAttributes( { ...TYPOGRAPHY_DEFAULTS } ) }
							isShownByDefault
						>
							<TypographyControls
								attributes={ attributes }
								setAttributes={ setAttributes }
								prefix=""
								showSize
								showResponsive
								fontSizePresets
								showFontFamily
								showWeight
								showStyle
								showLineHeight
								showLetterSpacing
								showTransform
								showDecoration
								showTextAlign
								showTextWrap
								showTextStroke
								showTextColumns
								showWritingMode
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				</PanelBody>
				<EndShapePanel attributes={ attributes } setAttributes={ setAttributes } />
			</InspectorControls>

			{ /* ── Settings tab (structural — no CSS property) ─────────────── */ }
			<InspectorControls>
				<PanelBody
					title={ __( 'Box', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Stretch to full width', 'sgs-blocks' ) }
						help={ __(
							'Make the label span the full width of its container (block, 100% wide) instead of hugging its text.',
							'sgs-blocks'
						) }
						checked={ !! fullWidth }
						onChange={ ( val ) =>
							setAttributes( { fullWidth: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ /* UnitControl, not a raw-px RangeControl (contract §4.3) —
					     the operator picks the unit. Stored as a CSS-length
					     STRING; a legacy bare number is treated as px by both
					     render.php and the canvas preview. */ }
					{ /* SgsLengthControl adoption (Gate B, presets={false}). */ }
					<SgsLengthControl
						label={ __( 'Border radius', 'sgs-blocks' ) }
						value={ borderRadius ?? '' }
						units={ SGS_LENGTH_UNITS }
						onChange={ ( val ) =>
							setAttributes( {
								borderRadius: sgsNormaliseLength( val ),
							} )
						}
						presets={ false }
					/>
					{ /* padding is a TIER-OF-BOXES OBJECT {desktop,tablet,mobile}
					     ONE attr; each tier holds the 4-side box. */ }
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						presets
						values={ {
							base: padding?.desktop ?? {},
							tablet: padding?.tablet ?? {},
							mobile: padding?.mobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							const tierKey = {
								base: 'desktop',
								tablet: 'tablet',
								mobile: 'mobile',
							}[ tier ];
							setAttributes( {
								padding: { ...padding, [ tierKey ]: next },
							} );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /* margin is a TIER-OF-BOXES OBJECT {desktop,tablet,mobile}
					     (folded 2026-09-11 from the wrong 3-sibling shape) — ONE
					     attr, same envelope + fold pattern as padding above. */ }
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						presets
						values={ {
							base: margin?.desktop ?? {},
							tablet: margin?.tablet ?? {},
							mobile: margin?.mobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							const tierKey = {
								base: 'desktop',
								tablet: 'tablet',
								mobile: 'mobile',
							}[ tier ];
							setAttributes( {
								margin: { ...margin, [ tierKey ]: next },
							} );
						} }
					/>
				</PanelBody>
				<PanelBody title={ __( 'Dot', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Show a dot before the text', 'sgs-blocks' ) }
						help={ __( 'A small decorative dot; its colour is under Colour (it follows the text colour until you pick one).', 'sgs-blocks' ) }
						checked={ !! dot }
						onChange={ ( val ) => setAttributes( { dot: val } ) }
						__nextHasNoMarginBottom
					/>
					{ dot && (
						<>
							<SgsLengthControl
								label={ __( 'Dot size', 'sgs-blocks' ) }
								value={ dotSize ?? '' }
								units={ SGS_LENGTH_UNITS }
								onChange={ ( val ) =>
									setAttributes( { dotSize: sgsNormaliseLength( val ) } )
								}
								presets={ false }
							/>
							<SpacingControl
								custom
								label={ __( 'Space between dot and text', 'sgs-blocks' ) }
								value={ dotGap ?? '' }
								onChange={ ( val ) => setAttributes( { dotGap: val ?? '' } ) }
							/>
						</>
					) }
				</PanelBody>
				<PanelBody title={ __( 'Links', 'sgs-blocks' ) } initialOpen={ false }>
					<LinkUnderlineControl
						mode={ linkUnderline }
						thickness={ linkUnderlineThickness }
						colour={ linkUnderlineColour }
						colourHover={ linkUnderlineColourHover }
						offset={ linkUnderlineOffset }
						onModeChange={ ( val ) => setAttributes( { linkUnderline: val } ) }
						onThicknessChange={ ( val ) => setAttributes( { linkUnderlineThickness: val } ) }
						onColourChange={ ( val ) => setAttributes( { linkUnderlineColour: val } ) }
						onColourHoverChange={ ( val ) => setAttributes( { linkUnderlineColourHover: val } ) }
						onOffsetChange={ ( val ) => setAttributes( { linkUnderlineOffset: val } ) }
					/>
				</PanelBody>
			</InspectorControls>

			{ linkUnderlineCss && <style>{ linkUnderlineCss }</style> }
			{ dotCss && <style>{ dotCss }</style> }
			{ endShapeCss && <style>{ endShapeCss }</style> }
			{ hasOutline ? (
				// The outline element is the label's first child, as render.php prints it.
				<span { ...blockProps }>
					<span className="sgs-label__edge" aria-hidden="true">
						<span className="sgs-label__edge-line" />
					</span>
					{ richText }
				</span>
			) : (
				<RichText
					{ ...blockProps }
					tagName="span"
					value={ text }
					onChange={ ( val ) => setAttributes( { text: val } ) }
					placeholder={ __( 'Label text…', 'sgs-blocks' ) }
					allowedFormats={ RICH_TEXT_LINK_ONLY }
				/>
			) }
		</>
	);
}
