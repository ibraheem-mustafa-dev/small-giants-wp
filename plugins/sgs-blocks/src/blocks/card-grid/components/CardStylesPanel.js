/**
 * Card Grid — Card Styles-tab panel: card background, border and text colours, shadow, border width, padding and corner radius.
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { ShadowControl, shadowAttrKeys, ResponsiveBoxControl, SgsLengthControl, DesignTokenPicker, GradientCapableColourControl } from '../../../components';
import { patchTier } from '../../../utils';

export default function CardStylesPanel( { attributes, setAttributes } ) {
	const {
		cardBackground,
		cardBackgroundGradient,
		cardBorderColour,
		cardBorderColourGradient,
		cardBorderWidth,
		cardRadius,
		cardPadding,
		backgroundColourHover,
		backgroundColourHoverGradient,
		borderColourHover,
		borderColourHoverGradient,
		textColourHover,
		textColourHoverGradient,
	} = attributes;

	return (
		<>
			{ /* CARD element (block.json's "item") — background/border/shadow
			   colour+hover plus the item's hover-only text colour, all in ONE
			   panel per THE PLACEMENT RULE. cardBackground pairs with
			   backgroundColourHover and cardBorderColour pairs with
			   borderColourHover — both target `.sgs-card-grid__item`
			   (render.php item element, confirmed via block.json's element
			   manifest + render.php:74-78/211-234/266-272/411-419). Text
			   colour on the card item is HOVER-ONLY — render.php has no
			   resting textColour attribute for the item, only
			   textColourHover (render.php:68,414) — so that row carries a
			   single Hover state, no Normal state. The shadow builder
			   (cardShadow/cardShadowHover, shape + colour) lives here too — see
			   the "Card Styling (resting state)" panel below for the rest of
			   the item's non-colour box styling (border width, radius). */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Card', 'sgs-blocks' ) } className="sgs-colour-panel">
					<DesignTokenPicker
						label={ __( 'Card background colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: cardBackground,
								onChange: ( val ) => setAttributes( { cardBackground: val ?? '' } ),
								linked: true,
								gradientValue: cardBackgroundGradient,
								onGradientChange: ( val ) =>
									setAttributes( { cardBackgroundGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: backgroundColourHover,
								onChange: ( val ) => setAttributes( { backgroundColourHover: val ?? '' } ),
								linked: true,
								gradientValue: backgroundColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { backgroundColourHoverGradient: val ?? '' } ),
							},
						] }
					/>
					<DesignTokenPicker
						label={ __( 'Card border colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: cardBorderColour,
								onChange: ( val ) => setAttributes( { cardBorderColour: val ?? '' } ),
								linked: true,
								gradientValue: cardBorderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { cardBorderColourGradient: val ?? '' } ),
							},
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
						] }
					/>
					{ /* Was a bare DesignTokenPicker with a gradientValue prop — inspector-scan
					   rule 31 flagged it as a mechanism mismatch (text needs
					   background-clip:text via GradientCapableColourControl; a raw gradient
					   string on DesignTokenPicker has no clip-text treatment). Swapped to
					   GradientCapableColourControl, matching the Subtitle colour row above. */ }
					<GradientCapableColourControl
						label={ __( 'Card text colour (hover)', 'sgs-blocks' ) }
						states={ [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: textColourHover,
								onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
								linked: true,
								gradientValue: textColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { textColourHoverGradient: val ?? '' } ),
							},
						] }
					/>
					{ /* Card shadow colour previously duplicated: once here as a standalone
					   2-state DesignTokenPicker, once again as ShadowControl's own
					   `colour`/`colourHover` prop below — two controls writing the same
					   attrs. Bean's ruling (Wave A1 ShadowControl redesign, 2026-09-07):
					   colour lives INSIDE the shadow panel, not the global colour panel.
					   Removed the standalone picker; ONE tabbed Normal/Hover
					   ShadowControl mount now owns shape AND colour for both states. */ }
					<ShadowControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ shadowAttrKeys( 'cardShadow', { hover: true, hoverColour: true } ) }
					/>
					{ /* Moved in from the Settings-tab "Card Styling (resting
					     state)" panel (D622 — an element-scoped control
					     belongs in its own element's TIER 1 panel;
					     cardBorderWidth/cardRadius are owned by "Card"). */ }
					<ResponsiveBoxControl
						label={ __( 'Border width', 'sgs-blocks' ) }
						showResponsive={ false }
						presets={ [ '10', '20', '30' ] }
						values={ { base: cardBorderWidth || {} } }
						onChange={ ( _tier, next ) =>
							setAttributes( { cardBorderWidth: next } )
						}
					/>
					{ /* cardPadding is a TIER-OBJECT {desktop,tablet,mobile} (2026-09-15) —
					     mirrors sgs/hero's mediaPadding (render.php: sgs_responsive_
					     normalise_object() + sgs_box_object_shorthand() per tier). Closes
					     the gap the classless sc-var responsive correlator surfaced: the
					     card body's padding was previously a hardcoded style.css default
					     with no attribute and no control at all. */ }
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						presets
						values={ {
							base: cardPadding?.desktop ?? {},
							tablet: cardPadding?.tablet ?? {},
							mobile: cardPadding?.mobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							const tierMap = { base: 'desktop', tablet: 'tablet', mobile: 'mobile' };
							patchTier( attributes, setAttributes, 'cardPadding', tierMap[ tier ], next );
						} }
					/>
					<SgsLengthControl
						label={ __( 'Corner radius', 'sgs-blocks' ) }
						value={ cardRadius || '' }
						onChange={ ( val ) =>
							setAttributes( { cardRadius: val || '' } )
						}
						units={ [
							{ value: 'px', label: 'px', default: 8 },
							{ value: '%', label: '%', default: 50 },
							{ value: 'rem', label: 'rem', default: 0.5 },
							{ value: 'em', label: 'em', default: 0.5 },
						] }
						help={ __(
							'Leave empty to use the theme default.',
							'sgs-blocks'
						) }
						presets={ false }
					/>
				</PanelBody>
			</InspectorControls>
		</>
	);
}
