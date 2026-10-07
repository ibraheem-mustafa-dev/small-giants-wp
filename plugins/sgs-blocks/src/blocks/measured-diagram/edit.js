/**
 * sgs/measured-diagram — editor.
 *
 * The canvas renders the page's own markup (figure > frame > drawing, then the
 * label list holding the sgs/diagram-dimension children), so style.css does
 * the painting; editor-preview.js adds the per-instance rules render.php adds.
 * Each child draws its own line and label client-side and owns its drag
 * handles.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
	InnerBlocks,
} from '@wordpress/block-editor';
import { PanelBody, RangeControl } from '@wordpress/components';
import {
	SgsColourPanel,
	fillRow,
	textRow,
	TypographyControls,
	ResponsiveOverride,
	ResponsiveLengthControl,
	SgsLengthControl,
	MediaElementPanel,
} from '../../components';
import MediaPicker from '../../components/MediaPicker';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import { usePreviewTier } from '../../utils';
import { drawingBox } from './drawing-box';
import { diagramPreviewCss, gradientId, userSpaceGradient, UserSpaceGradientDef } from './editor-preview';

const ALLOWED_BLOCKS = [ 'sgs/diagram-dimension' ];
const TEMPLATE = [ [ 'sgs/diagram-dimension', {} ] ];

/**
 * Read a picked file's own pixel size when the media library did not report
 * one (an SVG upload usually has none): load it and read its natural size.
 *
 * @param {string}   url      File URL.
 * @param {Function} onResult Receives { width, height } when known.
 */
function measureImage( url, onResult ) {
	if ( ! url || 'undefined' === typeof window ) {
		return;
	}
	const probe = new window.Image();
	probe.onload = () => {
		if ( probe.naturalWidth > 0 && probe.naturalHeight > 0 ) {
			onResult( { width: probe.naturalWidth, height: probe.naturalHeight } );
		}
	};
	probe.src = url;
}

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		drawingImageUrl,
		drawingImageId,
		drawingImageAlt,
		drawingImageDecorative,
		drawingImageWidth,
		drawingImageHeight,
		maxWidth,
		labelMode,
		lineWidth,
		tickLength,
		extensionWidth,
		extensionStyle,
		labelGap,
		lineColourGradient,
		extensionColourGradient,
	} = attributes;

	const previewTier = usePreviewTier();
	const [ boxW, boxH ] = drawingBox( drawingImageWidth, drawingImageHeight );
	// Every attribute the canvas mirror paints is named here, at the call site.
	const previewCss = diagramPreviewCss( {
		attributes: { ...attributes, maxWidth, labelMode, lineWidth, extensionWidth, extensionStyle, labelGap },
		clientId,
		tier: previewTier,
		width: boxW,
		height: boxH,
	} );
	const lineGradient = userSpaceGradient( lineColourGradient, boxW, boxH );
	const extensionGradient = userSpaceGradient( extensionColourGradient, boxW, boxH );

	const blockProps = useBlockProps( {
		className: `sgs-measured-diagram sgs-measured-diagram--extension-${ extensionStyle || 'solid' }`,
	} );
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-measured-diagram__labels', role: 'list' },
		{
			allowedBlocks: ALLOWED_BLOCKS,
			template: TEMPLATE,
			renderAppender: InnerBlocks.ButtonBlockAppender,
		}
	);

	const onSelectDrawing = ( media ) => {
		if ( ! media ) {
			return;
		}
		setAttributes( {
			drawingImageUrl: media.url,
			drawingImageId: media.id || 0,
			drawingImageAlt: drawingImageAlt || media.alt || '',
			drawingImageWidth: media.width || undefined,
			drawingImageHeight: media.height || undefined,
		} );
		if ( ! media.width || ! media.height ) {
			measureImage( media.url, ( size ) =>
				setAttributes( { drawingImageWidth: size.width, drawingImageHeight: size.height } )
			);
		}
	};

	const onRemoveDrawing = () =>
		setAttributes( {
			drawingImageUrl: '',
			drawingImageId: 0,
			drawingImageWidth: undefined,
			drawingImageHeight: undefined,
		} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Settings', 'sgs-blocks' ) }>
					<ResponsiveOverride
						label={ __( 'Label layout', 'sgs-blocks' ) }
						value={ labelMode }
						onChange={ ( obj ) => setAttributes( { labelMode: obj } ) }
					>
						{ ( { ownValue, effectiveValue, setOwnValue } ) => (
							<ToggleGroupControl
								label={ __( 'Label layout', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ ownValue || effectiveValue || 'onDrawing' }
								onChange={ ( val ) => setOwnValue( val ) }
								help={ __(
									'Numbered puts a small number on each line and lists the labels under the drawing — useful on narrow screens where labels would overlap.',
									'sgs-blocks'
								) }
								isBlock
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							>
								<ToggleGroupControlOption value="onDrawing" label={ __( 'On the drawing', 'sgs-blocks' ) } />
								<ToggleGroupControlOption value="numbered" label={ __( 'Numbered', 'sgs-blocks' ) } />
							</ToggleGroupControl>
						) }
					</ResponsiveOverride>
				</PanelBody>
				<PanelBody title={ __( 'Drawing', 'sgs-blocks' ) }>
					<MediaPicker
						value={ drawingImageUrl ? { url: drawingImageUrl, id: drawingImageId, type: 'image' } : null }
						onChange={ onSelectDrawing }
						onRemove={ onRemoveDrawing }
						allowedTypes={ [ 'image' ] }
						label={ __( 'Choose drawing', 'sgs-blocks' ) }
						instructionsImage={ __( 'An SVG or image of the item, with no labels of its own.', 'sgs-blocks' ) }
					/>
					<MediaElementPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="drawing"
						blockSlug="sgs/measured-diagram"
						insertion="element"
						atoms={ [ 'intrinsic', 'meaning' ] }
						mediaType="image"
					/>
					<ResponsiveLengthControl
						label={ __( 'Maximum width', 'sgs-blocks' ) }
						value={ maxWidth }
						onChange={ ( obj ) => setAttributes( { maxWidth: obj } ) }
						placeholder="100%"
					/>
				</PanelBody>
			</InspectorControls>

			<SgsColourPanel
				rows={ [
					fillRow( {
						key: 'line',
						label: __( 'Measurement lines', 'sgs-blocks' ),
						attrs: { base: 'lineColour', gradient: 'lineColourGradient' },
						attributes,
						setAttributes,
					} ),
					fillRow( {
						key: 'extension',
						label: __( 'Extension lines', 'sgs-blocks' ),
						attrs: { base: 'extensionColour', gradient: 'extensionColourGradient' },
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'value',
						label: __( 'Value', 'sgs-blocks' ),
						attrs: { base: 'valueColour', gradient: 'valueColourGradient' },
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'caption',
						label: __( 'Caption', 'sgs-blocks' ),
						attrs: { base: 'captionColour', gradient: 'captionColourGradient' },
						attributes,
						setAttributes,
					} ),
				] }
			/>

			<InspectorControls group="styles">
				<PanelBody title={ __( 'Line', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsLengthControl
						label={ __( 'Line thickness', 'sgs-blocks' ) }
						value={ lineWidth }
						onChange={ ( val ) => setAttributes( { lineWidth: val || '' } ) }
						placeholder="1.5px"
						units={ [ { value: 'px', label: 'px' } ] }
					/>
					<RangeControl
						label={ __( 'Tick and arrow size (% of drawing width)', 'sgs-blocks' ) }
						value={ tickLength }
						onChange={ ( val ) => setAttributes( { tickLength: val } ) }
						min={ 0 }
						max={ 10 }
						step={ 0.1 }
						initialPosition={ 1.76 }
						allowReset
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
				<PanelBody title={ __( 'Extension lines', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsLengthControl
						label={ __( 'Extension line thickness', 'sgs-blocks' ) }
						value={ extensionWidth }
						onChange={ ( val ) => setAttributes( { extensionWidth: val || '' } ) }
						placeholder="1px"
						units={ [ { value: 'px', label: 'px' } ] }
					/>
					<ToggleGroupControl
						label={ __( 'Extension line style', 'sgs-blocks' ) }
						value={ extensionStyle || 'solid' }
						onChange={ ( val ) => setAttributes( { extensionStyle: val } ) }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="solid" label={ __( 'Solid', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="dashed" label={ __( 'Dashed', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="dotted" label={ __( 'Dotted', 'sgs-blocks' ) } />
					</ToggleGroupControl>
				</PanelBody>
				<PanelBody title={ __( 'Labels', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveLengthControl
						label={ __( 'Gap between caption and value', 'sgs-blocks' ) }
						value={ labelGap }
						onChange={ ( obj ) => setAttributes( { labelGap: obj } ) }
						placeholder="0px"
					/>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						targets={ [
							{
								key: 'value',
								label: __( 'Value', 'sgs-blocks' ),
								prefix: 'value',
								fontSizePresets: true,
								showFontFamily: true,
								showDecoration: true,
								showTransform: true,
								showLetterSpacing: true,
								showTextAlign: true,
								showTextWrap: true,
								showTextColumns: true,
								showWritingMode: true,
							},
							{
								key: 'caption',
								label: __( 'Caption', 'sgs-blocks' ),
								prefix: 'caption',
								fontSizePresets: true,
								showFontFamily: true,
								showDecoration: true,
								showTransform: true,
								showLetterSpacing: true,
								showTextAlign: true,
								showTextWrap: true,
								showTextColumns: true,
								showWritingMode: true,
							},
						] }
					/>
				</PanelBody>
			</InspectorControls>

			<figure { ...blockProps }>
				{ previewCss && <style>{ previewCss }</style> }
				<div className="sgs-measured-diagram__frame">
					{ drawingImageUrl ? (
						<img
							className="sgs-measured-diagram__drawing"
							src={ drawingImageUrl }
							alt={ drawingImageDecorative ? '' : drawingImageAlt || '' }
							width={ drawingImageWidth || undefined }
							height={ drawingImageHeight || undefined }
						/>
					) : (
						<div className="sgs-measured-diagram__empty">
							<MediaPicker
								value={ null }
								onChange={ onSelectDrawing }
								allowedTypes={ [ 'image' ] }
								label={ __( 'Choose drawing', 'sgs-blocks' ) }
								instructionsImage={ __( 'Choose the drawing to measure.', 'sgs-blocks' ) }
							/>
						</div>
					) }
					{ ( lineGradient || extensionGradient ) && (
						<svg className="sgs-measured-diagram__defs" aria-hidden="true" focusable="false">
							<defs>
								{ lineGradient && (
									<UserSpaceGradientDef id={ gradientId( clientId, 'line' ) } gradient={ lineGradient } />
								) }
								{ extensionGradient && (
									<UserSpaceGradientDef id={ gradientId( clientId, 'extension' ) } gradient={ extensionGradient } />
								) }
							</defs>
						</svg>
					) }
				</div>
				<ul { ...innerBlocksProps } />
			</figure>
		</>
	);
}
