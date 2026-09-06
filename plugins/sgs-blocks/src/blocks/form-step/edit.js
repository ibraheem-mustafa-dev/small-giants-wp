import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	useSettings,
} from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
// WS-4: shared sgs/container wrapper editor controls (content kind = width/spacing).
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import { SgsColourPanel, fillRow,
	SgsBorderControl,
	resolveColourToken,
} from '../../components';
import { textPaintPreview } from '../../utils';

export default function Edit( { attributes, setAttributes } ) {
	const { label, backgroundColour, backgroundColourGradient, textColour, textColourGradient } = attributes;

	// Contrast check for border — warn if border fails WCAG contrast against
	// the block's own background. When there's no background set or a gradient
	// is active, skip the check entirely.
	const formStepContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient
			? attributes.backgroundColour
			: '';

	// D288/D636 pattern (mirrors sgs/container): render.php applies textColour/
	// textColourGradient to $sgs_fs_sel — the block's own root `wrapper` element
	// (block.json attrMap css:color/css:background-image) — so the preview
	// belongs on blockProps.style.
	const [ colourPalette ] = useSettings( 'color.palette' );

	const blockProps = useBlockProps( {
		className: 'sgs-form-step',
		style: textPaintPreview( textColour, textColourGradient, colourPalette ),
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-form-step__inner' },
		{
			orientation: 'vertical',
		}
	);

	return (
		<>
			<SgsColourPanel
				rows={ [
					fillRow( {
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						attrs: {
							base: 'backgroundColour',
							hover: 'backgroundColourHover',
							gradient: 'backgroundColourGradient',
							hoverGradient: 'backgroundColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					{
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) =>
									setAttributes( { textColour: val ?? '' } ),
								linked: true,
								gradientValue: textColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { textColourGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Step Settings', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Step Label', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( value ) =>
							setAttributes( { label: value } )
						}
						help={ __(
							'Label shown in the progress bar.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
				{ /* Width / spacing (WS-4 container mirror) */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="content"
				/>
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ attributes.borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ attributes.borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ attributes.borderColourGradient }
						onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
						colourLinked={ true }
						contrastAgainst={ formStepContrastAgainst }
						radiusValues={ {
								base: attributes.borderRadius?.desktop ?? {},
								tablet: attributes.borderRadius?.tablet ?? {},
								mobile: attributes.borderRadius?.mobile ?? {},
							} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="sgs-form-step__header">
					<strong>{ label }</strong>
				</div>
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
