/**
 * The Background panel of a block that has adopted the media system's background slot (Spec 49 §9.4, WP-8).
 *
 * The media (a photo, video or SVG per device, how it fills, Focal, Tile options, Pinned, Overlay, Photo opacity,
 * Load priority, the cover image and Pause button of a video, and the motion line) is the shared media panel for the
 * `background` slot. What the media system does not own stays with the wrapper and sits beside it: the surface tone,
 * the Surface blur and saturate, and the extra SVG layer (`bgSvg*`) that can sit over a photo or video, because kinds
 * are exclusive per device.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { getBlockType } from '@wordpress/blocks';
import { PanelBody, RangeControl, SelectControl, TextareaControl, ToggleControl, Notice } from '@wordpress/components';
import { ToolsPanel, ToggleGroupControl, ToggleGroupControlOption } from '../../../components/primitives';
import { MediaElementPanel, SgsLengthControl, SurfaceGroundControls } from '../../../components';
import { LENGTH_UNITS } from './_shared';

export const BACKGROUND_KINDS = [ 'image', 'video', 'svg' ];

/**
 * Whether the block type declares the adopted background slot.
 *
 * @param {string} name Block name.
 * @return {boolean} True when `backgroundSource` is a declared attribute.
 */
export function hasBackgroundSlot( name ) {
	return !! getBlockType( name )?.attributes?.backgroundSource;
}

/**
 * Surface tone, Surface blur and saturate: wrapper-owned, shown beside the media panel.
 */
function SurfaceSection( { attributes, setAttributes, name } ) {
	const type = getBlockType( name );
	const showTone = !! type?.attributes?.surfaceTone;
	const showSurface = !! type?.attributes?.surfaceBlur;
	if ( ! showTone && ! showSurface ) {
		return null;
	}
	const showSurfaceOpacity = !! type?.attributes?.surfaceOpacity;
	const { surfaceTone = 'auto', backgroundOverlayColour = '', backgroundOverlayGradient = '', backgroundSource } = attributes;
	const hasPhoto = !! ( backgroundSource?.desktop?.url || backgroundSource?.url );
	const hasOverlayPaint = !! backgroundOverlayColour || !! backgroundOverlayGradient;
	return (
		<PanelBody title={ __( 'Background surface', 'sgs-blocks' ) } initialOpen={ false }>
			{ showTone && (
				<>
					<ToggleGroupControl
						label={ __( 'Surface tone', 'sgs-blocks' ) }
						help={ __( 'Tells a see-through header and shadows whether this section reads as light or dark.', 'sgs-blocks' ) }
						value={ surfaceTone }
						onChange={ ( val ) => setAttributes( { surfaceTone: val || 'auto' } ) }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="auto" label={ __( 'Automatic', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="light" label={ __( 'Light', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="dark" label={ __( 'Dark', 'sgs-blocks' ) } />
					</ToggleGroupControl>
					{ hasPhoto && ! hasOverlayPaint && 'auto' === surfaceTone && (
						<Notice isDismissible={ false } status="warning">
							{ __( 'A header over this picture cannot tell whether it is light or dark.', 'sgs-blocks' ) }
						</Notice>
					) }
				</>
			) }
			{ showSurface && (
				<ToolsPanel
					label={ __( 'Surface', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							surfaceBlur: '',
							surfaceSaturate: undefined,
							...( showSurfaceOpacity ? { surfaceOpacity: undefined } : {} ),
						} )
					}
				>
					<SurfaceGroundControls attributes={ attributes } setAttributes={ setAttributes } showOpacity={ showSurfaceOpacity } />
				</ToolsPanel>
			) }
		</PanelBody>
	);
}

/**
 * The extra SVG layer (`bgSvg*`): kept beside the slot for a block that shows an SVG over a photo or video. Offered
 * only on a block that declares it.
 */
function SvgLayerSection( { attributes, setAttributes, name } ) {
	if ( ! getBlockType( name )?.attributes?.bgSvgContent ) {
		return null;
	}
	const { bgSvgContent = '', bgSvgPosition = 'background', bgSvgOpacity = 100, bgSvgTextShadow = false, bgSvgMinHeight = '' } = attributes;
	return (
		<PanelBody title={ __( 'Extra SVG layer', 'sgs-blocks' ) } initialOpen={ false }>
			<p className="components-base-control__help">
				{ __( 'An SVG drawn over a photo or video. To use an SVG as the whole background, choose SVG in the Background panel instead.', 'sgs-blocks' ) }
			</p>
			<TextareaControl
				label={ __( 'SVG code', 'sgs-blocks' ) }
				value={ bgSvgContent }
				onChange={ ( val ) => setAttributes( { bgSvgContent: val } ) }
				help={ __( 'Paste your <svg>…</svg> markup here.', 'sgs-blocks' ) }
				rows={ 8 }
			/>
			{ bgSvgContent && (
				<>
					<SelectControl
						label={ __( 'Position', 'sgs-blocks' ) }
						value={ bgSvgPosition }
						options={ [
							{ label: __( 'Background (behind content)', 'sgs-blocks' ), value: 'background' },
							{ label: __( 'Foreground (above content)', 'sgs-blocks' ), value: 'foreground' },
						] }
						onChange={ ( val ) => setAttributes( { bgSvgPosition: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Opacity (%)', 'sgs-blocks' ) }
						value={ bgSvgOpacity }
						onChange={ ( val ) => setAttributes( { bgSvgOpacity: val } ) }
						min={ 0 }
						max={ 100 }
						step={ 5 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Text shadow', 'sgs-blocks' ) }
						help={ __( 'Adds a subtle shadow to inner text for readability over busy SVG layers.', 'sgs-blocks' ) }
						checked={ bgSvgTextShadow }
						onChange={ ( val ) => setAttributes( { bgSvgTextShadow: val } ) }
						__nextHasNoMarginBottom
					/>
					<SgsLengthControl
						presets={ false }
						label={ __( 'Minimum height', 'sgs-blocks' ) }
						value={ bgSvgMinHeight }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { bgSvgMinHeight: val ?? '' } ) }
						help={ __( 'Minimum height applied to the SVG layer, e.g. 400px or 50vh. Leave blank for no minimum.', 'sgs-blocks' ) }
					/>
				</>
			) }
		</PanelBody>
	);
}

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @param {string}   props.name          Block name.
 * @return {JSX.Element|null} The panel.
 */
export function BackgroundMediaPanel( { attributes, setAttributes, name } ) {
	return (
		<>
			<MediaElementPanel
				attributes={ attributes }
				setAttributes={ setAttributes }
				prefix="background"
				blockSlug={ name }
				blockName={ name }
				context="background"
				kinds={ BACKGROUND_KINDS }
			/>
			<InspectorControls group="styles">
				<SurfaceSection attributes={ attributes } setAttributes={ setAttributes } name={ name } />
				<SvgLayerSection attributes={ attributes } setAttributes={ setAttributes } name={ name } />
			</InspectorControls>
		</>
	);
}
