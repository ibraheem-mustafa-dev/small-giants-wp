/**
 * Card Grid — Title, glyph, fallback and overlay colour rows, the Title heading-level panel and the Subtitle colour panel.
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { GradientCapableColourControl, SgsColourPanel } from '../../../components';
import { HEADING_LEVEL_OPTIONS } from './card-grid-options';

export default function ElementColourPanels( { attributes, setAttributes, cardBackgroundForContrast } ) {
	const {
		headingLevel,
		titleColour,
		titleColourHover,
		titleColourGradient,
		subtitleColour,
		subtitleColourHover,
		subtitleColourGradient,
		glyphColour,
		imageFallback,
		imageFallbackColour,
		noImageLabel,
		noImageLabelColour,
		overlayColour,
		overlayGradient,
	} = attributes;

	return (
		<>
			{ /* Spec 35 THE PLACEMENT RULE (D537) — TIER 1: one panel per declared
			   element (supports.sgs.elements), holding that element's content,
			   style and hover TOGETHER. Replaces the old single grouped
			   "Colour" panel that mixed title/subtitle/card colours across 3
			   different elements. Each element's colour rows are mounted the
			   same way SgsColourPanel mounts its own rows internally
			   (InspectorControls group="styles" + PanelBody + DesignTokenPicker/
			   GradientCapableColourControl) — SgsColourPanel itself has no
			   per-caller title override, so these are built directly rather
			   than forcing a shared-component change for 3 blocks (Rule 7 —
			   shared-mechanism changes need a design gate). */ }

			{ /* Title colour — was its own "Title" PanelBody, styled className="sgs-colour-panel"
			   to LOOK like the shared panel without actually being it (comment there cited
			   D622, since superseded — every fill/text/link colour lives in the real shared
			   SgsColourPanel now, see that component's own docblock). Moved into a genuine
			   SgsColourPanel mount, rendered first per that component's own ordering
			   requirement (before any other same-group InspectorControls Fill). Subtitle/Card
			   colour panels below stay as their own bespoke per-element panels — out of scope
			   for this move (Card's panel also mixes in border colour, which is genuinely
			   exempt from the shared panel). */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'title',
						label: __( 'Title colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: titleColour,
								onChange: ( val ) => setAttributes( { titleColour: val ?? '' } ),
								linked: true,
								gradientValue: titleColourGradient,
								onGradientChange: ( val ) => setAttributes( { titleColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: titleColourHover,
								onChange: ( val ) => setAttributes( { titleColourHover: val ?? '' } ),
								linked: true,
							},
						],
						...( cardBackgroundForContrast ? { contrastAgainst: cardBackgroundForContrast } : {} ),
					},
					{
						key: 'glyph',
						label: __( 'Glyph colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Colour', 'sgs-blocks' ),
								value: glyphColour,
								onChange: ( val ) => setAttributes( { glyphColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					// Image-fallback background — omitted entirely (not disabled)
					// when the feature is off, per SgsColourPanel's own
					// rows.filter(Boolean) contract.
					imageFallback && noImageLabel && {
						key: 'no-image-label',
						label: __( 'No-photo label', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Colour', 'sgs-blocks' ),
								value: noImageLabelColour,
								onChange: ( val ) => setAttributes( { noImageLabelColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					imageFallback && {
						key: 'image-fallback',
						label: __( 'Image fallback background', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Colour', 'sgs-blocks' ),
								value: imageFallbackColour,
								onChange: ( val ) => setAttributes( { imageFallbackColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'imageOverlay',
						label: __( 'Image overlay', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Colour or gradient', 'sgs-blocks' ),
								value: overlayColour,
								onChange: ( val ) => setAttributes( { overlayColour: val ?? '' } ),
								linked: true,
								gradientValue: overlayGradient,
								onGradientChange: ( val ) => setAttributes( { overlayGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			{ /* TITLE element — content (heading level) stays in Settings, unchanged
			   (out of scope for this move — a separate, already-approved batch owns
			   the headingLevel panel placement). */ }
			<InspectorControls>
				<PanelBody title={ __( 'Title', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Heading level', 'sgs-blocks' ) }
						value={ headingLevel || 'h3' }
						options={ HEADING_LEVEL_OPTIONS }
						onChange={ ( val ) => setAttributes( { headingLevel: val } ) }
						help={ __(
							'Pick the level that fits your page outline — usually H2 or H3 depending on what comes before this grid.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>

			{ /* SUBTITLE element — colour+hover only, no content control of its
			   own (the subtitle text itself is authored per-item, not a
			   block-level setting). */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Subtitle', 'sgs-blocks' ) } className="sgs-colour-panel">
					<GradientCapableColourControl
						label={ __( 'Subtitle colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: subtitleColour,
								onChange: ( val ) => setAttributes( { subtitleColour: val ?? '' } ),
								linked: true,
								gradientValue: subtitleColourGradient,
								onGradientChange: ( val ) => setAttributes( { subtitleColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: subtitleColourHover,
								onChange: ( val ) => setAttributes( { subtitleColourHover: val ?? '' } ),
								linked: true,
							},
						] }
						{ ...( cardBackgroundForContrast ? { contrastAgainst: cardBackgroundForContrast } : {} ) }
					/>
				</PanelBody>
			</InspectorControls>
		</>
	);
}
