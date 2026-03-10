import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, RangeControl, SelectControl, ToggleControl } from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

const SHAPE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Circle', 'sgs-blocks' ), value: 'circle' },
	{ label: __( 'Rounded', 'sgs-blocks' ), value: 'rounded' },
	{ label: __( 'Square', 'sgs-blocks' ), value: 'square' },
];

export default function Edit( { attributes, setAttributes } ) {
	const { icon, iconColour, iconSize, backgroundColour, link, linkLabel, linkOpensNewTab, shape } = attributes;

	const style = {
		color: colourVar( iconColour ) || undefined,
		'--sgs-icon-size': iconSize + 'px',
		backgroundColor: backgroundColour ? colourVar( backgroundColour ) : undefined,
	};

	const blockProps = useBlockProps( { className: `sgs-icon-block sgs-icon-block--${ shape }`, style } );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Icon Settings', 'sgs-blocks' ) }>
					<TextControl label={ __( 'Icon name (Lucide)', 'sgs-blocks' ) } value={ icon } onChange={ ( val ) => setAttributes( { icon: val } ) } help={ __( 'Enter a Lucide icon name, e.g. star, heart, mail, phone', 'sgs-blocks' ) } __nextHasNoMarginBottom />
					<RangeControl label={ __( 'Size (px)', 'sgs-blocks' ) } value={ iconSize } onChange={ ( val ) => setAttributes( { iconSize: val } ) } min={ 16 } max={ 128 } __nextHasNoMarginBottom />
					<SelectControl label={ __( 'Shape', 'sgs-blocks' ) } value={ shape } options={ SHAPE_OPTIONS } onChange={ ( val ) => setAttributes( { shape: val } ) } __nextHasNoMarginBottom />
				</PanelBody>
				<PanelBody title={ __( 'Colours', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker label={ __( 'Icon colour', 'sgs-blocks' ) } value={ iconColour } onChange={ ( val ) => setAttributes( { iconColour: val } ) } />
					<DesignTokenPicker label={ __( 'Background', 'sgs-blocks' ) } value={ backgroundColour } onChange={ ( val ) => setAttributes( { backgroundColour: val } ) } />
				</PanelBody>
				<PanelBody title={ __( 'Link', 'sgs-blocks' ) } initialOpen={ false }>
					<TextControl label={ __( 'URL', 'sgs-blocks' ) } value={ link } onChange={ ( val ) => setAttributes( { link: val } ) } type="url" __nextHasNoMarginBottom />
					{ link && (
						<>
							<TextControl
								label={ __( 'Accessible label', 'sgs-blocks' ) }
								value={ linkLabel }
								onChange={ ( val ) => setAttributes( { linkLabel: val } ) }
								help={ __( 'Describe the link destination for screen readers (e.g. "Visit our Instagram page"). Defaults to the icon name if left blank.', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
							/>
							<ToggleControl label={ __( 'Open in new tab', 'sgs-blocks' ) } checked={ linkOpensNewTab } onChange={ ( val ) => setAttributes( { linkOpensNewTab: val } ) } __nextHasNoMarginBottom />
						</>
					) }
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<span className="sgs-icon-block__icon" aria-hidden="true" dangerouslySetInnerHTML={ { __html: `<svg width="${ iconSize }" height="${ iconSize }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>` } } />
			</div>
		</>
	);
}
