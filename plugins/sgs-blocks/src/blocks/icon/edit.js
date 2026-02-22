import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	RangeControl,
	ToggleControl,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

const BG_SHAPES = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Circle', 'sgs-blocks' ), value: 'circle' },
	{ label: __( 'Rounded square', 'sgs-blocks' ), value: 'rounded' },
	{ label: __( 'Square', 'sgs-blocks' ), value: 'square' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		icon,
		size,
		iconColour,
		backgroundColour,
		backgroundShape,
		link,
		linkOpensNewTab,
	} = attributes;

	const className = [
		'sgs-icon',
		backgroundShape !== 'none' && `sgs-icon--bg-${ backgroundShape }`,
	].filter( Boolean ).join( ' ' );

	const style = {
		width: `${ size }px`,
		height: `${ size }px`,
		color: colourVar( iconColour ) || undefined,
		backgroundColor: backgroundColour ? colourVar( backgroundColour ) : undefined,
	};

	const blockProps = useBlockProps( { className, style } );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Icon', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Icon name (Lucide)', 'sgs-blocks' ) }
						help={ __( 'Enter a Lucide icon name, e.g. "heart", "star", "arrow-right"', 'sgs-blocks' ) }
						value={ icon }
						onChange={ ( val ) => setAttributes( { icon: val } ) }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Size (px)', 'sgs-blocks' ) }
						value={ size }
						onChange={ ( val ) => setAttributes( { size: val } ) }
						min={ 16 }
						max={ 128 }
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Icon colour', 'sgs-blocks' ) }
						value={ iconColour }
						onChange={ ( val ) => setAttributes( { iconColour: val } ) }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Background', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Background shape', 'sgs-blocks' ) }
						value={ backgroundShape }
						options={ BG_SHAPES }
						onChange={ ( val ) => setAttributes( { backgroundShape: val } ) }
						__nextHasNoMarginBottom
					/>
					{ backgroundShape !== 'none' && (
						<DesignTokenPicker
							label={ __( 'Background colour', 'sgs-blocks' ) }
							value={ backgroundColour }
							onChange={ ( val ) => setAttributes( { backgroundColour: val } ) }
						/>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Link', 'sgs-blocks' ) } initialOpen={ false }>
					<TextControl
						label={ __( 'Link URL', 'sgs-blocks' ) }
						value={ link }
						onChange={ ( val ) => setAttributes( { link: val } ) }
						type="url"
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Open in new tab', 'sgs-blocks' ) }
						checked={ linkOpensNewTab }
						onChange={ ( val ) => setAttributes( { linkOpensNewTab: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<span className="sgs-icon__placeholder" aria-hidden="true">
					{ icon }
				</span>
			</div>
		</>
	);
}
