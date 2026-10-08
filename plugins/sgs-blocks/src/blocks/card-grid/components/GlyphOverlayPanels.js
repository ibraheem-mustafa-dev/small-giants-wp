/**
 * Card Grid — Glyph and image-fallback panel plus the image overlay opacity and blend-mode panel.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, RangeControl, TextControl, ToggleControl } from '@wordpress/components';
import { SgsLengthControl } from '../../../components';
import { SGS_LENGTH_UNITS, sgsNormaliseLength } from '../../../utils';
import { OVERLAY_BLEND_MODE_OPTIONS } from './card-grid-options';

export default function GlyphOverlayPanels( { attributes, setAttributes } ) {
	const {
		glyphSize,
		imageFallback,
		noImageLabel,
		overlayColour,
		overlayGradient,
		overlayOpacity,
		overlayBlendMode,
	} = attributes;

	return (
		<>
				{ /* Glyph + image-fallback structural controls ("Shop by
				   shape" gap) — one shared size for every card's glyph/initial,
				   and the fallback-tile toggle. Colour rows for both live in the
				   shared SgsColourPanel mount above (THE PLACEMENT RULE). */ }
				<PanelBody
					title={ __( 'Glyph & Image Fallback', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /* CSS length — UnitControl (via SgsLengthControl), not a
					     raw-px RangeControl (Spec 35 C5). Mirrors this same
					     file's own cardRadius control above. */ }
					<SgsLengthControl
						label={ __( 'Glyph size', 'sgs-blocks' ) }
						value={ glyphSize || '' }
						units={ SGS_LENGTH_UNITS }
						presets={ false }
						onChange={ ( val ) =>
							setAttributes( { glyphSize: sgsNormaliseLength( val ) || '32px' } )
						}
						help={ __(
							'Also sets the size of the image-fallback initial letter below.',
							'sgs-blocks'
						) }
					/>
					<ToggleControl
						label={ __(
							'Show a fallback tile when a card has no image',
							'sgs-blocks'
						) }
						checked={ !! imageFallback }
						onChange={ ( val ) => setAttributes( { imageFallback: val } ) }
						help={ __(
							'Off keeps today’s empty box. On shows a neutral coloured tile (set its colour above) carrying the card’s glyph, or its title’s first letter.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					{ imageFallback && (
						<TextControl
							label={ __( 'Label on a fallback tile', 'sgs-blocks' ) }
							help={ __( 'Shown across the top of a card with no image, e.g. “Photo to come”. Empty shows no label. Its type is under Text Styling, its colour under Colours.', 'sgs-blocks' ) }
							value={ noImageLabel || '' }
							onChange={ ( val ) => setAttributes( { noImageLabel: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</PanelBody>

				{ /* Image overlay opacity + blend mode (wave B round 2) — the colour/
				   gradient itself lives in the shared SgsColourPanel mount above
				   (THE PLACEMENT RULE); these two are not colours, so they stay
				   here, disabled until an overlay colour or gradient is actually
				   set (mirrors sgs/media's overlay atom — MediaOverlayControls.js
				   gates the same two rows the same way). */ }
				<PanelBody
					title={ __( 'Image Overlay', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<p style={ { margin: '0 0 8px', fontSize: 12, color: '#757575' } }>
						{ __(
							'Set an overlay colour or gradient above (in the Image overlay colour row) to keep light text and a glyph legible over a photo. Only applies over a real photo, never the fallback tile.',
							'sgs-blocks'
						) }
					</p>
					<RangeControl
						label={ __( 'Overlay opacity (%)', 'sgs-blocks' ) }
						value={
							'number' === typeof overlayOpacity ? overlayOpacity : 100
						}
						min={ 0 }
						max={ 100 }
						disabled={ ! overlayColour && ! overlayGradient }
						onChange={ ( val ) => setAttributes( { overlayOpacity: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Overlay blend mode', 'sgs-blocks' ) }
						value={ overlayBlendMode || 'normal' }
						options={ OVERLAY_BLEND_MODE_OPTIONS }
						disabled={ ! overlayColour && ! overlayGradient }
						onChange={ ( val ) => setAttributes( { overlayBlendMode: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
		</>
	);
}
