/**
 * Universal Hover Effects extension.
 *
 * Adds hover colour, scale, shadow, and border controls to ALL blocks.
 * Outputs CSS custom properties as inline styles and a `.sgs-has-hover`
 * class that activates the hover CSS.
 *
 * Server-side class injection handled by includes/hover-effects.php.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { getBlockType } from '@wordpress/blocks';
import { InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

// Lazy-import DesignTokenPicker if available, fallback to nothing.
let DesignTokenPicker;
try {
	DesignTokenPicker = require( '../../components' ).DesignTokenPicker;
} catch {
	DesignTokenPicker = null;
}

const HOVER_ATTRS = {
	sgsHoverBgColour: { type: 'string', default: '' },
	sgsHoverTextColour: { type: 'string', default: '' },
	sgsHoverBorderColour: { type: 'string', default: '' },
	sgsHoverScale: { type: 'number', default: 0 },
	sgsHoverShadow: { type: 'string', default: '' },
	sgsHoverDuration: { type: 'number', default: 300 },
	sgsHoverImageZoom: { type: 'boolean', default: false },
	sgsHoverGrayscale: { type: 'boolean', default: false },
	sgsBlockLink: { type: 'string', default: '' },
	sgsBlockLinkTarget: { type: 'boolean', default: false },
};

const SHADOW_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'sm' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'md' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'lg' },
	{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
];

/**
 * Add hover attributes to all blocks.
 */
addFilter(
	'blocks.registerBlockType',
	'sgs/hover-effects/attributes',
	( settings ) => {
		const type = getBlockType( settings.name );
		// Skip blocks that don't support className.
		if ( type?.supports?.className === false ) {
			return settings;
		}

		return {
			...settings,
			attributes: {
				...settings.attributes,
				...HOVER_ATTRS,
			},
		};
	}
);

/**
 * Add hover controls to the inspector.
 */
const withHoverControls = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { attributes, setAttributes, name } = props;
		const type = getBlockType( name );

		if ( type?.supports?.className === false ) {
			return <BlockEdit { ...props } />;
		}

		const {
			sgsHoverBgColour,
			sgsHoverTextColour,
			sgsHoverBorderColour,
			sgsHoverScale,
			sgsHoverShadow,
			sgsHoverDuration,
			sgsHoverImageZoom,
			sgsHoverGrayscale,
			sgsBlockLink,
			sgsBlockLinkTarget,
		} = attributes;

		return (
			<>
				<BlockEdit { ...props } />
				<InspectorControls>
					<PanelBody
						title={ __( 'Hover Effects', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						{ DesignTokenPicker ? (
							<>
								<DesignTokenPicker
									label={ __( 'Hover background', 'sgs-blocks' ) }
									value={ sgsHoverBgColour }
									onChange={ ( val ) => setAttributes( { sgsHoverBgColour: val || '' } ) }
								/>
								<DesignTokenPicker
									label={ __( 'Hover text colour', 'sgs-blocks' ) }
									value={ sgsHoverTextColour }
									onChange={ ( val ) => setAttributes( { sgsHoverTextColour: val || '' } ) }
								/>
								<DesignTokenPicker
									label={ __( 'Hover border colour', 'sgs-blocks' ) }
									value={ sgsHoverBorderColour }
									onChange={ ( val ) => setAttributes( { sgsHoverBorderColour: val || '' } ) }
								/>
							</>
						) : (
							<p>{ __( 'Colour controls not available.', 'sgs-blocks' ) }</p>
						) }
						<RangeControl
							label={ __( 'Hover scale (%)', 'sgs-blocks' ) }
							help={ __( '0 = no scale. 105 = 5% larger.', 'sgs-blocks' ) }
							value={ sgsHoverScale }
							onChange={ ( val ) => setAttributes( { sgsHoverScale: val } ) }
							min={ 0 }
							max={ 120 }
							step={ 1 }
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Hover shadow', 'sgs-blocks' ) }
							value={ sgsHoverShadow }
							options={ SHADOW_OPTIONS }
							onChange={ ( val ) => setAttributes( { sgsHoverShadow: val } ) }
							__nextHasNoMarginBottom
						/>
						<RangeControl
							label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
							value={ sgsHoverDuration }
							onChange={ ( val ) => setAttributes( { sgsHoverDuration: val } ) }
							min={ 0 }
							max={ 1000 }
							step={ 50 }
							__nextHasNoMarginBottom
						/>
						<ToggleControl
							label={ __( 'Image zoom on hover', 'sgs-blocks' ) }
							help={ __( 'Zooms any child images when the block is hovered.', 'sgs-blocks' ) }
							checked={ !! sgsHoverImageZoom }
							onChange={ ( val ) => setAttributes( { sgsHoverImageZoom: val } ) }
							__nextHasNoMarginBottom
						/>
						<ToggleControl
							label={ __( 'Grayscale to colour on hover', 'sgs-blocks' ) }
							help={ __( 'Renders the block in greyscale until hovered.', 'sgs-blocks' ) }
							checked={ !! sgsHoverGrayscale }
							onChange={ ( val ) => setAttributes( { sgsHoverGrayscale: val } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
					<PanelBody
						title={ __( 'Block Link', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<TextControl
							label={ __( 'Link URL', 'sgs-blocks' ) }
							help={ __( 'Wraps the entire block in a link.', 'sgs-blocks' ) }
							value={ sgsBlockLink }
							onChange={ ( val ) => setAttributes( { sgsBlockLink: val } ) }
							type="url"
							__nextHasNoMarginBottom
						/>
						{ sgsBlockLink && (
							<ToggleControl
								label={ __( 'Open in new tab', 'sgs-blocks' ) }
								checked={ !! sgsBlockLinkTarget }
								onChange={ ( val ) => setAttributes( { sgsBlockLinkTarget: val } ) }
								__nextHasNoMarginBottom
							/>
						) }
					</PanelBody>
				</InspectorControls>
			</>
		);
	};
}, 'withHoverControls' );

addFilter(
	'editor.BlockEdit',
	'sgs/hover-effects/controls',
	withHoverControls
);

/**
 * Add hover classes and CSS custom properties to saved content (static blocks).
 */
addFilter(
	'blocks.getSaveContent.extraProps',
	'sgs/hover-effects/save-props',
	( extraProps, blockType, attributes ) => {
		const {
			sgsHoverBgColour,
			sgsHoverTextColour,
			sgsHoverBorderColour,
			sgsHoverScale,
			sgsHoverShadow,
			sgsHoverImageZoom,
			sgsHoverGrayscale,
		} = attributes;

		const hasHover = sgsHoverBgColour || sgsHoverTextColour ||
			sgsHoverBorderColour || sgsHoverScale || sgsHoverShadow;

		const extraClasses = [];

		if ( hasHover ) {
			extraClasses.push( 'sgs-has-hover' );
		}
		if ( sgsHoverImageZoom ) {
			extraClasses.push( 'sgs-hover-image-zoom' );
		}
		if ( sgsHoverGrayscale ) {
			extraClasses.push( 'sgs-hover-grayscale' );
		}

		if ( ! extraClasses.length ) {
			return extraProps;
		}

		const classes = [ extraProps.className || '', ...extraClasses ]
			.filter( Boolean )
			.join( ' ' );

		return {
			...extraProps,
			className: classes,
		};
	}
);
