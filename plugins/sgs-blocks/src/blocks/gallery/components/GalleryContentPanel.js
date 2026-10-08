/**
 * Gallery settings-tab Content panel: lightbox, lightbox backdrop, captions and caption colours.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, ToggleControl } from '@wordpress/components';
// ToolsPanel/ToolsPanelItem exist only as `__experimental*` on WP 7.1 (unprefixed = undefined,
// React error #130 on selecting the block): they must come from the primitives boundary.
import { ToolsPanel } from '../../../components/primitives';
import { DesignTokenPicker, ScrimControls } from '../../../components';

export default function GalleryContentPanel( { attributes, setAttributes, set } ) {
	const {
		enableLightbox,
		showCaptions,
		captionReveal,
		captionColour,
		captionColourGradient,
		captionColourHover,
		captionColourHoverGradient,
		captionBgColour,
		captionBgColourGradient,
	} = attributes;

	return (
		<>
				{ /* Panel 4: Content */ }
				<PanelBody
					title={ __( 'Content', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Enable lightbox', 'sgs-blocks' ) }
						checked={ enableLightbox }
						onChange={ set( 'enableLightbox' ) }
						help={ __(
							'Open images in a full-screen lightbox on click.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					{ /* Lightbox scrim strength + blur (U-2 Addendum A, 2026-09-24) —
					   only shown when the lightbox exists at all, since the scrim is
					   the lightbox's own backdrop. The colour row is the SgsColourPanel
					   row above (also gated on enableLightbox); this ToolsPanel carries
					   only the non-colour siblings, per ScrimControls.js's own docblock. */ }
					{ enableLightbox && (
						<ToolsPanel
							label={ __( 'Lightbox backdrop', 'sgs-blocks' ) }
							resetAll={ () =>
								// Reset to the block's own defaults (block.json) — scrimOpacity's
								// default is desktop 0.9, the old hardcoded 90% mix, not blank.
								setAttributes( { scrimOpacity: { desktop: 0.9 }, scrimBlur: {} } )
							}
						>
							<ScrimControls attributes={ attributes } setAttributes={ setAttributes } />
						</ToolsPanel>
					) }
					<ToggleControl
						label={ __( 'Show captions', 'sgs-blocks' ) }
						checked={ showCaptions }
						onChange={ set( 'showCaptions' ) }
						__nextHasNoMarginBottom
					/>
					{ showCaptions && (
						<ToggleControl
							label={ __(
								'Reveal caption on hover',
								'sgs-blocks'
							) }
							checked={ captionReveal }
							onChange={ set( 'captionReveal' ) }
							help={ __(
								'Caption slides up into view when the user hovers the image.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					) }
					{ /* Moved in from the shared SgsColourPanel (D622 — an
					     element-scoped colour belongs in its own element's
					     TIER 1 panel; "caption" is a declared element whose
					     attrMap claims captionColour/captionBgColour). */ }
					{ showCaptions && (
						<>
							<DesignTokenPicker
								label={ __( 'Caption text colour', 'sgs-blocks' ) }
								states={ [
									{
										key: 'normal',
										label: __( 'Normal', 'sgs-blocks' ),
										value: captionColour,
										onChange: ( val ) => setAttributes( { captionColour: val ?? '' } ),
										linked: true,
										gradientValue: captionColourGradient,
										onGradientChange: ( val ) => setAttributes( { captionColourGradient: val ?? '' } ),
									},
									{
										key: 'hover',
										label: __( 'Hover', 'sgs-blocks' ),
										value: captionColourHover,
										onChange: ( val ) => setAttributes( { captionColourHover: val ?? '' } ),
										linked: true,
										gradientValue: captionColourHoverGradient,
										onGradientChange: ( val ) => setAttributes( { captionColourHoverGradient: val ?? '' } ),
									},
								] }
							/>
							<DesignTokenPicker
								label={ __( 'Caption background colour', 'sgs-blocks' ) }
								states={ [
									{
										key: 'normal',
										label: __( 'Normal', 'sgs-blocks' ),
										value: captionBgColour,
										onChange: ( val ) => setAttributes( { captionBgColour: val ?? '' } ),
										linked: true,
										gradientValue: captionBgColourGradient,
										onGradientChange: ( val ) => setAttributes( { captionBgColourGradient: val ?? '' } ),
									},
								] }
							/>
						</>
					) }
				</PanelBody>
		</>
	);
}
