/**
 * Universal Hover Effects extension.
 *
 * Adds hover colour, scale, shadow, image zoom, grayscale, stagger delay,
 * and block link controls to ALL blocks.
 * Outputs CSS custom properties as inline styles and utility classes that
 * activate the hover CSS.
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
	ToggleControl,
	TextControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

// Lazy-import DesignTokenPicker if available, fallback to nothing.
let DesignTokenPicker;
try {
	DesignTokenPicker = require( '../../components' ).DesignTokenPicker;
} catch {
	DesignTokenPicker = null;
}

/**
 * Blocks that should NOT receive the default scale/shadow/image-zoom lift.
 * These are structural containers, bars, form elements, or data-display blocks
 * where a hover lift looks wrong or misleading.
 */
const SCALE_SHADOW_SKIP_BLOCKS = new Set( [
	'sgs/announcement-bar',
	'sgs/back-to-top',
	'sgs/breadcrumbs',
	'sgs/container',
	'sgs/countdown-timer',
	'sgs/counter',
	'sgs/form',
	'sgs/form-step',
	'sgs/form-field-address',
	'sgs/form-field-checkbox',
	'sgs/form-field-consent',
	'sgs/form-field-date',
	'sgs/form-field-email',
	'sgs/form-field-file',
	'sgs/form-field-hidden',
	'sgs/form-field-number',
	'sgs/form-field-phone',
	'sgs/form-field-radio',
	'sgs/form-field-select',
	'sgs/form-field-text',
	'sgs/form-field-textarea',
	'sgs/form-field-tiles',
	'sgs/hero',
	'sgs/mega-menu',
	'sgs/tabs',
	'sgs/tab',
] );

const HOVER_ATTRS = {
	// Colour overrides on hover.
	sgsHoverBgColour: { type: 'string', default: '' },
	sgsHoverTextColour: { type: 'string', default: '' },
	sgsHoverBorderColour: { type: 'string', default: '' },
	// Scale transform — fine-grained slider (0 = off; 105 = scale(1.05)).
	sgsHoverScale: { type: 'number', default: 0 },
	// Shadow elevation preset — 'md' gives a subtle lift on card-like blocks.
	sgsHoverShadow: { type: 'string', default: 'md' },
	// Transition timing — 250 ms feels responsive without being abrupt.
	sgsHoverDuration: { type: 'number', default: 250 },
	// Named scale preset — '1.02' is barely perceptible but clearly intentional.
	sgsHoverScalePreset: { type: 'string', default: '1.02' },
	// Image zoom on hover — enabled by default for blocks that contain images.
	sgsHoverImageZoom: { type: 'boolean', default: true },
	// Stagger animation delay in ms (applied to direct children).
	sgsStaggerDelay: { type: 'number', default: 0 },
	// Grayscale-to-colour effect on images.
	sgsHoverGrayscale: { type: 'boolean', default: false },
	// Border accent line on hover.
	sgsHoverBorderAccent: { type: 'boolean', default: false },
	// Tilt 3D effect.
	sgsHoverTilt3D: { type: 'boolean', default: false },
	// Block link — wraps the whole block in an <a> tag.
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

const SCALE_PRESET_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Subtle (1.02)', 'sgs-blocks' ), value: '1.02' },
	{ label: __( 'Medium (1.05)', 'sgs-blocks' ), value: '1.05' },
	{ label: __( 'Strong (1.1)', 'sgs-blocks' ), value: '1.1' },
];

/**
 * Add hover attributes to all blocks.
 *
 * Blocks in SCALE_SHADOW_SKIP_BLOCKS receive neutral defaults for scale,
 * shadow, and image zoom so they don't appear interactive when they shouldn't.
 * All other SGS blocks get subtle-lift defaults out of the box.
 */
addFilter(
	'blocks.registerBlockType',
	'sgs/hover-effects/attributes',
	( settings ) => {
		const type = getBlockType( settings.name );
		// Skip blocks that do not support className.
		if ( type?.supports?.className === false ) {
			return settings;
		}

		// Structural/form/layout blocks: keep scale, shadow, and image zoom off
		// by default so they don't look interactive when they shouldn't.
		const isSkipBlock = SCALE_SHADOW_SKIP_BLOCKS.has( settings.name );
		const overrides = isSkipBlock
			? {
				sgsHoverScalePreset: { type: 'string', default: '' },
				sgsHoverShadow:      { type: 'string', default: '' },
				sgsHoverImageZoom:   { type: 'boolean', default: false },
			}
			: {};

		return {
			...settings,
			attributes: {
				...settings.attributes,
				...HOVER_ATTRS,
				...overrides,
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
			sgsHoverScalePreset,
			sgsHoverImageZoom,
			sgsStaggerDelay,
			sgsHoverGrayscale,
			sgsHoverBorderAccent,
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
						<SelectControl
							label={ __( 'Hover scale', 'sgs-blocks' ) }
							help={ __( 'Scale the block up on hover using a preset value.', 'sgs-blocks' ) }
							value={ sgsHoverScalePreset }
							options={ SCALE_PRESET_OPTIONS }
							onChange={ ( val ) => setAttributes( { sgsHoverScalePreset: val } ) }
							__nextHasNoMarginBottom
						/>
						<RangeControl
							label={ __( 'Hover scale (fine, %)', 'sgs-blocks' ) }
							help={ __( '0 = no scale. 105 = 5% larger. Overrides preset above.', 'sgs-blocks' ) }
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
						<ToggleControl
							label={ __( 'Zoom image on hover', 'sgs-blocks' ) }
							help={ __( 'Gently scales any image inside the block when hovered.', 'sgs-blocks' ) }
							checked={ sgsHoverImageZoom }
							onChange={ ( val ) => setAttributes( { sgsHoverImageZoom: val } ) }
						/>
						<ToggleControl
							label={ __( 'Grayscale to colour', 'sgs-blocks' ) }
							help={ __( 'Desaturates images at rest; restores colour on hover.', 'sgs-blocks' ) }
							checked={ sgsHoverGrayscale }
							onChange={ ( val ) => setAttributes( { sgsHoverGrayscale: val } ) }
						/>
						<ToggleControl
							label={ __( 'Border accent line on hover', 'sgs-blocks' ) }
							help={ __( 'Adds a coloured line at the bottom that scales in on hover.', 'sgs-blocks' ) }
							checked={ sgsHoverBorderAccent }
							onChange={ ( val ) => setAttributes( { sgsHoverBorderAccent: val } ) }
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
						<RangeControl
							label={ __( 'Child stagger delay (ms)', 'sgs-blocks' ) }
							help={ __( 'Each direct child is delayed by a multiple of this value.', 'sgs-blocks' ) }
							value={ sgsStaggerDelay }
							onChange={ ( val ) => setAttributes( { sgsStaggerDelay: val } ) }
							min={ 0 }
							max={ 500 }
							step={ 25 }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
					<PanelBody
						title={ __( 'Block Link', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<TextControl
							label={ __( 'Link URL', 'sgs-blocks' ) }
							help={ __( 'Wraps the entire block in a link. Leave empty to disable.', 'sgs-blocks' ) }
							value={ sgsBlockLink }
							onChange={ ( val ) => setAttributes( { sgsBlockLink: val || '' } ) }
							type="url"
							placeholder="https://"
							__nextHasNoMarginBottom
						/>
						{ sgsBlockLink && (
							<ToggleControl
								label={ __( 'Open in new tab', 'sgs-blocks' ) }
								checked={ sgsBlockLinkTarget }
								onChange={ ( val ) => setAttributes( { sgsBlockLinkTarget: val } ) }
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
			sgsHoverScalePreset,
			sgsHoverImageZoom,
			sgsStaggerDelay,
			sgsHoverGrayscale,
			sgsHoverBorderAccent,
			sgsHoverTilt3D,
			sgsBlockLink,
		} = attributes;

		const hasColourHover = sgsHoverBgColour || sgsHoverTextColour || sgsHoverBorderColour;
		const hasScaleHover  = sgsHoverScale || sgsHoverScalePreset;
		const hasShadowHover = sgsHoverShadow;
		const hasHover       = hasColourHover || hasScaleHover || hasShadowHover;

		const classNames = [ extraProps.className || '' ].filter( Boolean );

		if ( hasHover ) {
			classNames.push( 'sgs-has-hover' );
		}
		if ( sgsHoverScalePreset ) {
			classNames.push( 'sgs-has-hover-scale' );
		}
		if ( sgsHoverImageZoom ) {
			classNames.push( 'sgs-has-img-zoom' );
		}
		if ( sgsHoverGrayscale ) {
			classNames.push( 'sgs-has-grayscale' );
		}
		if ( sgsHoverBorderAccent ) {
			classNames.push( 'sgs-has-border-accent' );
		}
		if ( sgsStaggerDelay ) {
			classNames.push( 'sgs-has-stagger' );
		}
		if ( sgsBlockLink ) {
			classNames.push( 'sgs-has-block-link' );
		}

		if ( classNames.length === 0 && ! ( extraProps.className || '' ) ) {
			return extraProps;
		}

		return {
			...extraProps,
			className: classNames.join( ' ' ).trim() || undefined,
		};
	}
);
