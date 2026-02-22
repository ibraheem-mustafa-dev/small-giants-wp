import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

const POSITIONS = [
	{ label: __( 'Bottom right', 'sgs-blocks' ), value: 'bottom-right' },
	{ label: __( 'Bottom left', 'sgs-blocks' ), value: 'bottom-left' },
	{ label: __( 'Bottom centre', 'sgs-blocks' ), value: 'bottom-centre' },
];

const SHAPES = [
	{ label: __( 'Circle', 'sgs-blocks' ), value: 'circle' },
	{ label: __( 'Rounded', 'sgs-blocks' ), value: 'rounded' },
	{ label: __( 'Square', 'sgs-blocks' ), value: 'square' },
];

export default function Edit( { attributes, setAttributes } ) {
	const { buttonColour, iconColour, position, size, scrollThreshold, shape } = attributes;

	const blockProps = useBlockProps( {
		className: `sgs-back-to-top sgs-back-to-top--${ shape }`,
		style: {
			width: `${ size }px`,
			height: `${ size }px`,
			backgroundColor: colourVar( buttonColour ),
			color: colourVar( iconColour ),
		},
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Position', 'sgs-blocks' ) }
						value={ position }
						options={ POSITIONS }
						onChange={ ( val ) => setAttributes( { position: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Shape', 'sgs-blocks' ) }
						value={ shape }
						options={ SHAPES }
						onChange={ ( val ) => setAttributes( { shape: val } ) }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Size (px)', 'sgs-blocks' ) }
						value={ size }
						onChange={ ( val ) => setAttributes( { size: val } ) }
						min={ 32 }
						max={ 80 }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Show after scroll (px)', 'sgs-blocks' ) }
						value={ scrollThreshold }
						onChange={ ( val ) => setAttributes( { scrollThreshold: val } ) }
						min={ 100 }
						max={ 1000 }
						step={ 50 }
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Button colour', 'sgs-blocks' ) }
						value={ buttonColour }
						onChange={ ( val ) => setAttributes( { buttonColour: val } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Icon colour', 'sgs-blocks' ) }
						value={ iconColour }
						onChange={ ( val ) => setAttributes( { iconColour: val } ) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
					<path d="M18 15l-6-6-6 6" />
				</svg>
			</div>
		</>
	);
}
