/**
 * Gallery settings-tab Hover Effects panel: scale, transition and shadow.
 */
import { __ } from '@wordpress/i18n';
import { RangeControl, SelectControl } from '@wordpress/components';
// ToolsPanel/ToolsPanelItem exist only as `__experimental*` on WP 7.1 (unprefixed = undefined,
// React error #130 on selecting the block): they must come from the primitives boundary.
import { ToolsPanel, ToolsPanelItem } from '../../../components/primitives';
import { ShadowControl } from '../../../components';
import { EASING_OPTIONS } from './gallery-options';

export default function GalleryHoverEffectsPanel( { attributes, setAttributes, set } ) {
	const {
		scaleHover,
		transitionDuration,
		transitionEasing,
	} = attributes;

	return (
		<>
				{ /* Panel 3: Hover Effects — moved ahead of Content 2026-09-08
				     (rule 41 dom-order-vs-declared-order finding). This panel
				     holds the block-wide hover-effect controls (Image,
				     block.json supports.sgs.elements.image, order 2, takes its Hover state from the Motion panel) alongside the block-wide hover-effect controls
				     (scaleHover/transitionDuration/Easing/
				     shadowHover). render.php genuinely draws
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
							scaleHover: '',
							transitionDuration: '300',
							transitionEasing: 'ease',
							shadowHover: '',
							shadowHoverColour: '',
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Hover shadow', 'sgs-blocks' ) }
						hasValue={ () => ( attributes.shadowHover ?? '' ) !== '' }
						onDeselect={ () =>
							setAttributes( { shadowHover: '', shadowHoverColour: '' } )
						}
						isShownByDefault
					>
						<ShadowControl
							label={ __( 'Hover shadow', 'sgs-blocks' ) }
							attributes={ attributes }
							setAttributes={ setAttributes }
							attrNames={ {
								base: 'shadowHover',
								colour: 'shadowHoverColour',
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
				</ToolsPanel>
		</>
	);
}
