import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { DesignTokenPicker, IconPicker, IconPreview } from '../../components';
import { colourVar, fontSizeVar } from '../../utils';

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ), value: 'x-large' },
	{ label: __( 'XXL', 'sgs-blocks' ), value: 'xx-large' },
];

const VARIANT_OPTIONS = [
	{ label: __( 'Info', 'sgs-blocks' ), value: 'info' },
	{ label: __( 'Success', 'sgs-blocks' ), value: 'success' },
	{ label: __( 'Warning', 'sgs-blocks' ), value: 'warning' },
	{ label: __( 'Error', 'sgs-blocks' ), value: 'error' },
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
];

// The ideal default icon for each variant (Lucide). Shown unless the operator
// picks an override. Must stay in sync with the same map in render.php.
const VARIANT_DEFAULT_ICON = {
	info: 'info',
	success: 'circle-check',
	warning: 'triangle-alert',
	error: 'circle-x',
	accent: 'sparkles',
};

/**
 * Resolve the icon to display: an explicit override, else the variant default.
 *
 * @param {Object} attrs Block attributes.
 * @return {{source:string,name:string}} Resolved icon.
 */
function resolveIcon( attrs ) {
	if ( attrs.iconSource && attrs.iconName ) {
		return { source: attrs.iconSource, name: attrs.iconName };
	}
	return {
		source: 'lucide',
		name: VARIANT_DEFAULT_ICON[ attrs.variant ] || 'info',
	};
}

export default function Edit( { attributes, setAttributes } ) {
	const { text, variant, showIcon, iconSource, textColour, textFontSize } =
		attributes;

	const className = [ 'sgs-notice-banner', `sgs-notice-banner--${ variant }` ].join(
		' '
	);
	const blockProps = useBlockProps( { className } );
	const resolved = resolveIcon( attributes );
	const usingDefault = ! ( iconSource && attributes.iconName );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Banner Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Variant', 'sgs-blocks' ) }
						help={ __(
							'Sets the colour and a fitting default icon.',
							'sgs-blocks'
						) }
						value={ variant }
						options={ VARIANT_OPTIONS }
						onChange={ ( val ) => setAttributes( { variant: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show icon', 'sgs-blocks' ) }
						checked={ !! showIcon }
						onChange={ ( val ) => setAttributes( { showIcon: val } ) }
						__nextHasNoMarginBottom
					/>
					{ showIcon && (
						<IconPicker
							label={ __( 'Icon (overrides the variant default)', 'sgs-blocks' ) }
							value={ resolved }
							onChange={ ( { source, name } ) =>
								setAttributes( { iconSource: source, iconName: name } )
							}
						/>
					) }
					{ showIcon && ! usingDefault && (
						<ToggleControl
							label={ __( 'Use the variant’s default icon', 'sgs-blocks' ) }
							checked={ false }
							onChange={ () =>
								setAttributes( { iconSource: '', iconName: '' } )
							}
							help={ __(
								'Reset to the icon that matches the chosen variant.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Text Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Text colour', 'sgs-blocks' ) }
						value={ textColour }
						onChange={ ( val ) => setAttributes( { textColour: val } ) }
					/>
					<SelectControl
						label={ __( 'Text font size', 'sgs-blocks' ) }
						value={ textFontSize || '' }
						options={ FONT_SIZE_OPTIONS }
						onChange={ ( val ) => setAttributes( { textFontSize: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps } role="note">
				{ showIcon && (
					<span className="sgs-notice-banner__icon" aria-hidden="true">
						<IconPreview source={ resolved.source } name={ resolved.name } size={ 20 } />
					</span>
				) }
				<RichText
					tagName="p"
					className="sgs-notice-banner__text"
					value={ text }
					onChange={ ( val ) => setAttributes( { text: val } ) }
					placeholder={ __( 'Write your notice message…', 'sgs-blocks' ) }
					style={ {
						color: colourVar( textColour ) || undefined,
						fontSize: fontSizeVar( textFontSize ) || undefined,
					} }
				/>
			</div>
		</>
	);
}
