/**
 * Universal Hover Effects extension.
 *
 * Adds hover colour, scale, shadow, image zoom, grayscale, stagger delay,
 * easing, duration, focus ring, and block link controls to ALL blocks.
 *
 * Default model: ALL blocks start with EMPTY/FALSE defaults (no hover lift).
 * A small opt-in list of card-like blocks gets subtle lift defaults.
 *
 * Class injection is handled server-side by includes/hover-effects.php via
 * the render_block filter. A getSaveContent.extraProps filter here would
 * bake classes into save() output, causing block validation failures
 * whenever defaults change. PHP render-time injection is the correct path
 * for both static and dynamic blocks.
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
 * Blocks that receive scale + shadow + image-zoom defaults by default.
 * All other blocks default to empty/false so they don't look interactive.
 *
 * Special cases:
 *   sgs/whatsapp-cta — scale + shadow only (no image zoom; no image present)
 *   sgs/gallery      — image zoom only (no scale on tiles)
 */
const SCALE_SHADOW_DEFAULT_BLOCKS = new Set( [
	'sgs/card-grid',
	'sgs/info-box',
	'sgs/cta-section',
	'sgs/team-member',
	'sgs/pricing-table',
	'sgs/post-grid',
	'sgs/google-reviews',
	'sgs/process-steps',
	'sgs/icon',
	// Special: scale + shadow but no image zoom.
	'sgs/whatsapp-cta',
	// Special: image zoom only, no scale.
	'sgs/gallery',
] );

// Blocks that get scale+shadow but explicitly NO image zoom.
const NO_IMAGE_ZOOM_BLOCKS = new Set( [ 'sgs/whatsapp-cta' ] );

// Blocks that get image zoom only (no scale, no shadow).
const IMAGE_ZOOM_ONLY_BLOCKS = new Set( [ 'sgs/gallery' ] );

/**
 * Resolve per-block attribute defaults based on the opt-in lists above.
 *
 * @param {string} blockName Block name (e.g. 'sgs/card-grid').
 * @return {{ scalePreset: string, shadow: string, imageZoom: boolean, focusRing: boolean }} Defaults.
 */
function resolveBlockDefaults( blockName ) {
	const isOptIn         = SCALE_SHADOW_DEFAULT_BLOCKS.has( blockName );
	const isNoZoom        = NO_IMAGE_ZOOM_BLOCKS.has( blockName );
	const isImageZoomOnly = IMAGE_ZOOM_ONLY_BLOCKS.has( blockName );

	if ( isImageZoomOnly ) {
		return { scalePreset: '', shadow: '', imageZoom: true, focusRing: true };
	}
	if ( isNoZoom ) {
		return { scalePreset: '1.02', shadow: 'md', imageZoom: false, focusRing: true };
	}
	if ( isOptIn ) {
		return { scalePreset: '1.02', shadow: 'md', imageZoom: true, focusRing: true };
	}
	// All other blocks: default OFF.
	return { scalePreset: '', shadow: '', imageZoom: false, focusRing: false };
}

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
 * Duration options sourced from theme.json settings.custom.duration tokens.
 * CSS custom property: var(--wp--custom--duration--{slug})
 */
const DURATION_OPTIONS = [
	{ label: __( 'Instant (60ms)', 'sgs-blocks' ), value: 'instant' },
	{ label: __( 'Fast (150ms)', 'sgs-blocks' ), value: 'fast' },
	{ label: __( 'Medium (300ms)', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Slow (500ms)', 'sgs-blocks' ), value: 'slow' },
	{ label: __( 'Extra slow (800ms)', 'sgs-blocks' ), value: 'extra-slow' },
];

/**
 * Easing options sourced from theme.json settings.custom.easing tokens.
 * CSS custom property: var(--wp--custom--easing--{slug})
 */
const EASING_OPTIONS = [
	{ label: __( 'Default (Material)', 'sgs-blocks' ), value: 'default' },
	{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
	{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
	{ label: __( 'Spring', 'sgs-blocks' ), value: 'spring' },
	{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
];

/**
 * Add hover attributes to all blocks.
 *
 * Per-block defaults are resolved from resolveBlockDefaults() so that
 * the opt-in list gets subtle-lift defaults and everything else starts off.
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

		const defaults = resolveBlockDefaults( settings.name );

		return {
			...settings,
			attributes: {
				...settings.attributes,
				// Colour overrides on hover.
				sgsHoverBgColour:     { type: 'string',  default: '' },
				sgsHoverTextColour:   { type: 'string',  default: '' },
				sgsHoverBorderColour: { type: 'string',  default: '' },
				// Scale transform — fine-grained slider (0 = off).
				sgsHoverScale:        { type: 'number',  default: 0 },
				// Named scale preset — resolved from opt-in list.
				sgsHoverScalePreset:  { type: 'string',  default: defaults.scalePreset },
				// Shadow elevation preset — resolved from opt-in list.
				sgsHoverShadow:       { type: 'string',  default: defaults.shadow },
				// Duration slug — maps to var(--wp--custom--duration--{slug}).
				sgsHoverDuration:     { type: 'string',  default: 'medium' },
				// Easing slug — maps to var(--wp--custom--easing--{slug}).
				sgsHoverEasing:       { type: 'string',  default: 'default' },
				// Image zoom on hover — resolved from opt-in list.
				sgsHoverImageZoom:    { type: 'boolean', default: defaults.imageZoom },
				// Stagger animation delay in ms (applied to direct children).
				sgsStaggerDelay:      { type: 'number',  default: 0 },
				// Grayscale-to-colour effect on images.
				sgsHoverGrayscale:    { type: 'boolean', default: false },
				// Border accent line on hover.
				sgsHoverBorderAccent: { type: 'boolean', default: false },
				// 3D tilt effect.
				sgsHoverTilt3D:       { type: 'boolean', default: false },
				// Focus ring for keyboard navigation — enabled on opt-in blocks.
				sgsFocusRing:         { type: 'boolean', default: defaults.focusRing },
				// Block link — wraps the whole block in an <a> tag.
				sgsBlockLink:         { type: 'string',  default: '' },
				sgsBlockLinkTarget:   { type: 'boolean', default: false },
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
			sgsHoverEasing,
			sgsHoverScalePreset,
			sgsHoverImageZoom,
			sgsStaggerDelay,
			sgsHoverGrayscale,
			sgsHoverBorderAccent,
			sgsFocusRing,
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
						<SelectControl
							label={ __( 'Transition duration', 'sgs-blocks' ) }
							help={ __( 'Speed of hover transitions. Sourced from brand motion tokens.', 'sgs-blocks' ) }
							value={ sgsHoverDuration }
							options={ DURATION_OPTIONS }
							onChange={ ( val ) => setAttributes( { sgsHoverDuration: val } ) }
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Transition easing', 'sgs-blocks' ) }
							help={ __( 'Curve applied to hover transitions. Sourced from brand motion tokens.', 'sgs-blocks' ) }
							value={ sgsHoverEasing }
							options={ EASING_OPTIONS }
							onChange={ ( val ) => setAttributes( { sgsHoverEasing: val } ) }
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
						<ToggleControl
							label={ __( 'Show focus ring on keyboard focus', 'sgs-blocks' ) }
							help={ __( 'Adds a visible focus ring (3px primary glow at 0.4 alpha) when keyboard-tabbed to. Recommended on for any clickable block.', 'sgs-blocks' ) }
							checked={ sgsFocusRing }
							onChange={ ( val ) => setAttributes( { sgsFocusRing: val } ) }
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

// Class injection is handled server-side by includes/hover-effects.php via
// the render_block filter. A getSaveContent.extraProps filter here would
// bake classes into save() output, causing block validation failures
// whenever defaults change. PHP render-time injection is the correct path
// for both static and dynamic blocks.
