/**
 * SVG Background — Editor Component
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import {
	InspectorControls,
	InnerBlocks,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextareaControl,
	RangeControl,
	TextControl,
} from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const {
		svgContent,
		svgPosition,
		animationType,
		animationSpeed,
		opacity,
		minHeight,
	} = attributes;

	const blockProps = useBlockProps( {
		className: `sgs-svg-background sgs-svg-background--${ svgPosition } sgs-svg-background--${ animationType }`,
		style: {
			minHeight: minHeight || undefined,
			position: 'relative',
		},
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-svg-background__content' },
		{
			templateLock: false,
		}
	);

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'SVG Settings', 'sgs-blocks' ) }>
					<TextareaControl
						label={ __( 'SVG Code', 'sgs-blocks' ) }
						value={ svgContent }
						onChange={ ( value ) => setAttributes( { svgContent: value } ) }
						help={ __( 'Paste your SVG markup here.', 'sgs-blocks' ) }
						rows={ 10 }
					/>

					<SelectControl
						label={ __( 'SVG Position', 'sgs-blocks' ) }
						value={ svgPosition }
						options={ [
							{ label: __( 'Background (behind content)', 'sgs-blocks' ), value: 'background' },
							{ label: __( 'Foreground (above content)', 'sgs-blocks' ), value: 'foreground' },
						] }
						onChange={ ( value ) => setAttributes( { svgPosition: value } ) }
					/>

					<RangeControl
						label={ __( 'Opacity', 'sgs-blocks' ) }
						value={ opacity }
						onChange={ ( value ) => setAttributes( { opacity: value } ) }
						min={ 0 }
						max={ 100 }
						step={ 5 }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Animation', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Animation Type', 'sgs-blocks' ) }
						value={ animationType }
						options={ [
							{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
							{ label: __( 'Pulse', 'sgs-blocks' ), value: 'pulse' },
							{ label: __( 'Float', 'sgs-blocks' ), value: 'float' },
							{ label: __( 'Wave', 'sgs-blocks' ), value: 'wave' },
						] }
						onChange={ ( value ) => setAttributes( { animationType: value } ) }
					/>

					{ animationType !== 'none' && (
						<SelectControl
							label={ __( 'Animation Speed', 'sgs-blocks' ) }
							value={ animationSpeed }
							options={ [
								{ label: __( 'Slow', 'sgs-blocks' ), value: 'slow' },
								{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
								{ label: __( 'Fast', 'sgs-blocks' ), value: 'fast' },
							] }
							onChange={ ( value ) => setAttributes( { animationSpeed: value } ) }
						/>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<TextControl
						label={ __( 'Minimum Height', 'sgs-blocks' ) }
						value={ minHeight }
						onChange={ ( value ) => setAttributes( { minHeight: value } ) }
						help={ __( 'E.g., 400px or 50vh', 'sgs-blocks' ) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ svgContent && (
					<div
						className="sgs-svg-background__svg"
						style={ { opacity: opacity / 100 } }
						dangerouslySetInnerHTML={ { __html: svgContent } }
					/>
				) }

				<div { ...innerBlocksProps } />

				{ ! svgContent && (
					<div className="sgs-svg-background__placeholder">
						<p>{ __( 'Add SVG code in the block settings →', 'sgs-blocks' ) }</p>
					</div>
				) }
			</div>
		</>
	);
}
