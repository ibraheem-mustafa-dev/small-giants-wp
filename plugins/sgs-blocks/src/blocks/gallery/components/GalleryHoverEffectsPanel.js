/**
 * Gallery settings-tab Hover Effects panel: image size, hover effect, transition, grayscale, stagger and shadow.
 */
import { __ } from '@wordpress/i18n';
import { RangeControl, SelectControl, ToggleControl } from '@wordpress/components';
// ToolsPanel/ToolsPanelItem exist only as `__experimental*` on WP 7.1 (unprefixed = undefined,
// React error #130 on selecting the block): they must come from the primitives boundary.
import { ToolsPanel, ToolsPanelItem } from '../../../components/primitives';
import { ShadowControl } from '../../../components';
import { IMAGE_SIZE_OPTIONS, HOVER_EFFECT_OPTIONS, EASING_OPTIONS } from './gallery-options';

export default function GalleryHoverEffectsPanel( { attributes, setAttributes, set } ) {
	const {
		imageSize,
		effectHover,
		scaleHover,
		imageZoomHover,
		transitionDuration,
		transitionEasing,
		grayscaleHover,
		staggerDelay,
	} = attributes;

	return (
		<>
				{ /* Panel 3: Hover Effects — moved ahead of Content 2026-09-08
				     (rule 41 dom-order-vs-declared-order finding). This panel
				     holds Image's owned attrs (imageSize/imageZoomHover/
				     grayscaleHover; block.json supports.sgs.elements.image,
				     order 2) alongside the block-wide hover-effect controls
				     (effectHover/scaleHover/transitionDuration/Easing/
				     staggerDelay/shadowHover). render.php genuinely draws
				     <img> before <figcaption> (Image element order 2 before
				     Caption order 3), so the panel carrying Image's controls
				     must render before the panel carrying Caption's — moving
				     the JSX to match the real on-page order, not the other
				     way round (block.json's order numbers are correct and
				     were left alone). */ }
				<ToolsPanel
					label={ __( 'Hover Effects', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							effectHover: 'zoom',
							scaleHover: '',
							imageZoomHover: true,
							transitionDuration: '300',
							transitionEasing: 'ease',
							grayscaleHover: false,
							staggerDelay: 60,
							shadowHover: '',
						} )
					}
				>
					{ /* Moved in from the "Content" panel (D622 — an
					     element-scoped control belongs in its own element's
					     TIER 1 panel; "image" is a declared element whose
					     attrMap claims imageSize alongside imageZoomHover/
					     grayscaleHover below). */ }
					<ToolsPanelItem
						label={ __( 'Image size', 'sgs-blocks' ) }
						hasValue={ () => !! imageSize && imageSize !== 'large' }
						onDeselect={ () => setAttributes( { imageSize: 'large' } ) }
						isShownByDefault
					>
						<SelectControl
							label={ __( 'Image size', 'sgs-blocks' ) }
							value={ imageSize }
							options={ IMAGE_SIZE_OPTIONS }
							onChange={ set( 'imageSize' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						hasValue={ () => effectHover !== 'zoom' }
						onDeselect={ () => setAttributes( { effectHover: 'zoom' } ) }
						isShownByDefault
					>
						<SelectControl
							label={ __( 'Hover effect', 'sgs-blocks' ) }
							value={ effectHover }
							options={ HOVER_EFFECT_OPTIONS }
							onChange={ set( 'effectHover' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Image zoom on hover', 'sgs-blocks' ) }
						hasValue={ () => imageZoomHover !== true }
						onDeselect={ () => setAttributes( { imageZoomHover: true } ) }
						isShownByDefault
					>
						<ToggleControl
							label={ __( 'Image zoom on hover', 'sgs-blocks' ) }
							checked={ imageZoomHover }
							onChange={ set( 'imageZoomHover' ) }
							help={ __(
								'Zooms the image inside the card on hover.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Hover shadow', 'sgs-blocks' ) }
						hasValue={ () => ( attributes.shadowHover ?? '' ) !== '' }
						onDeselect={ () => setAttributes( { shadowHover: '' } ) }
						isShownByDefault
					>
						<ShadowControl
							label={ __( 'Hover shadow', 'sgs-blocks' ) }
							attributes={ attributes }
							setAttributes={ setAttributes }
							attrNames={ {
								base: 'shadowHover',
							} }
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Hover scale (card)', 'sgs-blocks' ) }
						hasValue={ () => scaleHover !== '' }
						onDeselect={ () => setAttributes( { scaleHover: '' } ) }
					>
						<RangeControl
							label={ __( 'Hover scale (card)', 'sgs-blocks' ) }
							value={ parseFloat( scaleHover ) || 1 }
							onChange={ ( val ) =>
								setAttributes( { scaleHover: String( val ) } )
							}
							min={ 1 }
							max={ 1.1 }
							step={ 0.01 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
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
							onChange={ ( val ) =>
								setAttributes( {
									transitionDuration: String( val ),
								} )
							}
							min={ 100 }
							max={ 1000 }
							step={ 50 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Transition easing', 'sgs-blocks' ) }
						hasValue={ () => transitionEasing !== 'ease' }
						onDeselect={ () =>
							setAttributes( { transitionEasing: 'ease' } )
						}
					>
						<SelectControl
							label={ __( 'Transition easing', 'sgs-blocks' ) }
							value={ transitionEasing }
							options={ EASING_OPTIONS }
							onChange={ set( 'transitionEasing' ) }
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
							onChange={ set( 'grayscaleHover' ) }
							help={ __(
								'Desaturates images at rest; restores full colour on hover.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Stagger delay (ms)', 'sgs-blocks' ) }
						hasValue={ () => staggerDelay !== 60 }
						onDeselect={ () => setAttributes( { staggerDelay: 60 } ) }
					>
						<RangeControl
							label={ __( 'Stagger delay (ms)', 'sgs-blocks' ) }
							help={ __(
								'Each image is delayed by a multiple of this value on entrance.',
								'sgs-blocks'
							) }
							value={ staggerDelay }
							onChange={ set( 'staggerDelay' ) }
							min={ 0 }
							max={ 500 }
							step={ 25 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
				</ToolsPanel>
		</>
	);
}
