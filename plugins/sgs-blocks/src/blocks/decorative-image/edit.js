import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InnerBlocks,
	InspectorControls,
	useSettings,
} from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import {
	PanelBody,
	RangeControl,
	ToggleControl,
	SelectControl,
} from '@wordpress/components';
import { ResponsiveOverride } from '../../components';
import MediaElementPanel from '../../components/MediaElementPanel';
import mediaPreview from '../../components/media/mediaPreview';
import { hasFile } from '../../components/media/mediaSlotWrites';
import { resolveTierSource } from '../../components/media/deviceValues';
import { usePreviewTier } from '../../utils';
import LayerBoxPanels from './LayerBoxPanels';
import LayerEdgePanel from './LayerEdgePanel';
import { layerPreviewStyle, layerBoxPreview } from './layer-preview';
import metadata from './block.json';

const ENTRY = metadata.supports.sgs.mediaElements.find( ( e ) => 'layer' === e.prefix );
const SLOT = { prefix: 'layer', kinds: ENTRY.kinds, context: ENTRY.context, wrapper: true };

/**
 * The settings the canvas layer paints on itself, as render.php does for a box layer. The picture inside fills it, so the
 * media preview reads the attributes without them.
 */
const BOX_KEYS = [
	'layerWidth',
	'layerMaxWidth',
	'layerHeight',
	'layerMinWidth',
	'layerMinHeight',
	'layerMaxHeight',
	'layerOpacity',
	'layerRadius',
	'layerBorderWidth',
	'layerBorderStyle',
	'layerBorderColour',
	'layerBorderColourHover',
	'layerBoxShadow',
	'layerBoxShadowColour',
	'layerBoxShadowColourHover',
];

const RADIUS_SHAPES = [ '', 'none', 'circle', 'ellipse', 'pill' ];

const OVERFLOW_OPTIONS = [
	{ label: __( 'Visible', 'sgs-blocks' ), value: 'visible' },
	{ label: __( 'Hidden', 'sgs-blocks' ), value: 'hidden' },
];

export default function Edit( { attributes, setAttributes, clientId } ) {
	const { rotation, zIndex, flipX, fadeOnScroll, overflow } = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-decorative-image-editor',
	} );
	const blockCount = useSelect(
		( select ) => select( 'core/block-editor' ).getBlockCount( clientId ),
		[ clientId ]
	);
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-decorative-image__content' },
		{
			renderAppender: blockCount
				? undefined
				: InnerBlocks.ButtonBlockAppender,
		}
	);

	// The preview shows the tier the editor is previewing, a narrower tier inheriting from the wider one as the frontend's
	// @media overrides do.
	const previewTier = usePreviewTier();
	const [ colourPalette ] = useSettings( 'color.palette' );

	const shown = resolveTierSource( attributes.layerSource, previewTier, hasFile ).value;
	const hasMedia = !! ( shown && ( shown.url || shown.markup ) );
	const decorative = attributes.layerDecorative ?? true;
	const alt = decorative ? '' : shown?.alt || attributes.layerAlt || '';
	const uid = 'sgs-di-' + clientId.slice( 0, 8 );

	// The media part's CSS is the emitters' own, for the settings the layer root does not paint itself.
	const mediaAttrs = Object.fromEntries( Object.entries( attributes ).filter( ( [ key ] ) => ! BOX_KEYS.includes( key ) ) );
	// A radius-drawn shape is the box's corners (layer-preview.js); only a mask shape reaches the picture.
	const hasMask = Object.values( attributes.layerShape || {} ).some( ( value ) => ! RADIUS_SHAPES.includes( String( value?.shape ?? value ?? '' ) ) );
	if ( ! hasMask ) {
		delete mediaAttrs.layerShape;
	}
	const { css: mediaCss, needsHelper } = mediaPreview( SLOT, mediaAttrs, uid );
	// The picture fills the layer, as render.php's scoped rule does.
	const css = `${ mediaCss }
.${ uid } .sgs-media-el{display:block;width:100%;height:auto}`;

	const layerStyle = layerPreviewStyle( attributes, previewTier );
	// The layer's own box (border, fill, shadow, height), painted on the same element as the position.
	const boxStyle = layerBoxPreview( attributes, previewTier, colourPalette, ! hasMedia && 0 === blockCount );

	let picture = null;
	if ( hasMedia ) {
		const src = shown.url || 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent( shown.markup );
		picture = (
			<img
				src={ src }
				alt={ alt }
				className="sgs-decorative-image__media sgs-media-el"
			/>
		);
		if ( needsHelper ) {
			picture = (
				<span className="sgs-media-box">
					<span className="sgs-media-box__mask">{ picture }</span>
				</span>
			);
		}
	}

	return (
		<>
			<MediaElementPanel
				attributes={ attributes }
				setAttributes={ setAttributes }
				blockName="sgs/decorative-image"
				blockSlug="sgs/decorative-image"
				prefix="layer"
				atoms={ ENTRY.atoms }
				kinds={ ENTRY.kinds }
				context={ ENTRY.context }
			/>
			<LayerBoxPanels
				attributes={ attributes }
				setAttributes={ setAttributes }
			/>
			<LayerEdgePanel
				attributes={ attributes }
				setAttributes={ setAttributes }
			/>
			<InspectorControls group="styles">
				<PanelBody
					title={ __( 'Transform', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveOverride
						label={ __( 'Rotation (degrees)', 'sgs-blocks' ) }
						value={ rotation }
						onChange={ ( obj ) => setAttributes( { rotation: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<RangeControl
								help={
									inherited
										? __( 'Leave empty to use the desktop value', 'sgs-blocks' )
										: undefined
								}
								value={ ownValue || effectiveValue || 0 }
								onChange={ ( v ) => setOwnValue( v ) }
								min={ -180 }
								max={ 180 }
								step={ 5 }
								allowReset={ inherited }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
					<ToggleControl
						label={ __( 'Flip horizontally', 'sgs-blocks' ) }
						checked={ flipX }
						onChange={ ( val ) => setAttributes( { flipX: val } ) }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Z-Index', 'sgs-blocks' ) }
						help={ __(
							'Stacking order (above background, below content)',
							'sgs-blocks'
						) }
						value={ zIndex }
						onChange={ ( val ) => setAttributes( { zIndex: val } ) }
						min={ -1 }
						max={ 10 }
						step={ 1 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Scroll and overflow', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Fade on scroll', 'sgs-blocks' ) }
						help={ __(
							'Opacity fades to 0 as the layer scrolls past the top of the viewport. Disabled when "Reduce motion" is on.',
							'sgs-blocks'
						) }
						checked={ fadeOnScroll }
						onChange={ ( val ) => setAttributes( { fadeOnScroll: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Overflow', 'sgs-blocks' ) }
						help={ __(
							'Whether the layer can extend beyond its parent',
							'sgs-blocks'
						) }
						value={ overflow }
						options={ OVERFLOW_OPTIONS }
						onChange={ ( val ) => setAttributes( { overflow: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ ! hasMedia && 0 === blockCount && (
					<p className="sgs-decorative-image-editor__placeholder">
						{ __( 'Choose an image in the Media panel, or add blocks to float text, a label or a badge.', 'sgs-blocks' ) }
					</p>
				) }
				<div className="sgs-decorative-image-editor__preview-wrapper">
					<div
						className="sgs-decorative-image-editor__preview-container"
						style={ { position: 'relative', minHeight: '400px' } }
					>
						<div
							className={ [
								'sgs-decorative-image-editor__layer',
								'sgs-decorative-image--layer',
								hasMedia ? 'sgs-decorative-image--over-image' : '',
								uid,
							]
								.filter( Boolean )
								.join( ' ' ) }
							style={ {
								...layerStyle,
								...boxStyle,
							} }
						>
							{ css && <style>{ css }</style> }
							{ picture }
							<div { ...innerBlocksProps } />
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
