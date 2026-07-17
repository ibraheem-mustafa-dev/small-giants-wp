/**
 * Parallax scroll extension — adds background and element parallax to any block.
 *
 * Adds sgsParallax (type) and sgsParallaxStrength (0–100) attributes to ALL
 * Gutenberg blocks that support className. The CSS and JS runtime handle the
 * actual parallax effect; this extension provides the editor controls only.
 *
 * Class and data-attribute injection is handled server-side by
 * includes/parallax.php (render_block filter, priority 11). The frontend
 * effect is driven by:
 *   1. CSS Scroll-Driven Animations (Chrome 115+, Firefox 135+) — zero JS.
 *   2. background-attachment: fixed for older desktop browsers — CSS only.
 *   3. assets/js/parallax.js fallback — activates only when CSS SDA is absent.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { getBlockType } from '@wordpress/blocks';
import { isExtensionHidden } from './hide-extensions';
import { InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	Notice,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Guard against double registration.
 *
 * Prevents the inspector controls appearing twice if the extensions
 * bundle is evaluated more than once (CJS + ESM load collision).
 */
if ( ! window.__sgsParallaxRegistered ) {
window.__sgsParallaxRegistered = true;

/**
 * Check whether a block type supports the className prop.
 *
 * Blocks that explicitly disable className have no wrapper element for the
 * parallax class — skip them entirely.
 *
 * @param {Object} settings Block settings object.
 * @return {boolean} True when the block supports className.
 */
function supportsClassName( settings ) {
	if ( settings?.supports?.className === false ) {
		return false;
	}
	return true;
}

/**
 * Inject parallax attributes into all eligible block types.
 *
 * @param {Object} settings Block settings.
 * @param {string} name     Block name (unused but required by the filter signature).
 * @return {Object} Modified settings with parallax attributes added.
 */
function addParallaxAttributes( settings, name ) { // eslint-disable-line no-unused-vars
	if ( ! supportsClassName( settings ) ) {
		return settings;
	}

	return {
		...settings,
		attributes: {
			...settings.attributes,
			sgsParallax: { type: 'string', default: 'none' },
			sgsParallaxStrength: { type: 'number', default: 30 },
		},
	};
}

addFilter(
	'blocks.registerBlockType',
	'sgs/parallax-attributes',
	addParallaxAttributes
);

/**
 * Higher-order component that renders the Parallax panel in the inspector.
 *
 * Uses a standard InspectorControls PanelBody (not Advanced) so the
 * control is easy to discover. The panel starts collapsed (initialOpen=false)
 * to keep the inspector clean on first open.
 */
const withParallaxControls = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { name, attributes, setAttributes } = props;

		// Skip blocks that do not support className.
		const blockType = getBlockType( name );
		if ( blockType?.supports?.className === false ) {
			return <BlockEdit { ...props } />;
		}

		// Per-block opt-out (supports.sgs.hideExtensions): a logo wall etc.
		// has no use for parallax.
		if ( isExtensionHidden( name, 'parallax' ) ) {
			return <BlockEdit { ...props } />;
		}

		const { sgsParallax, sgsParallaxStrength } = attributes;
		const isActive = sgsParallax && 'none' !== sgsParallax;

		return (
			<>
				<BlockEdit { ...props } />
				<InspectorControls>
					<PanelBody
						title={ __( 'Parallax', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						{ isActive && (
							<Notice
								status="info"
								isDismissible={ false }
							>
								{ __(
									'Parallax active — not visible in the editor preview.',
									'sgs-blocks'
								) }
							</Notice>
						) }

						<SelectControl
							label={ __( 'Parallax type', 'sgs-blocks' ) }
							value={ sgsParallax || 'none' }
							options={ [
								{
									label: __( 'None', 'sgs-blocks' ),
									value: 'none',
								},
								{
									label: __( 'Background parallax', 'sgs-blocks' ),
									value: 'background',
									help: __(
										'Background image moves at a different speed to content',
										'sgs-blocks'
									),
								},
								{
									label: __( 'Element parallax', 'sgs-blocks' ),
									value: 'element',
									help: __(
										'Entire block translates on scroll',
										'sgs-blocks'
									),
								},
							] }
							onChange={ ( val ) =>
								setAttributes( { sgsParallax: val } )
							}
							help={
								'background' === sgsParallax
									? __(
										'Background image moves at a different speed to content',
										'sgs-blocks'
									)
									: 'element' === sgsParallax
									? __(
										'Entire block translates on scroll',
										'sgs-blocks'
									)
									: ''
							}
							__nextHasNoMarginBottom
						/>

						{ isActive && (
							<RangeControl
								label={ __( 'Strength', 'sgs-blocks' ) }
								value={ sgsParallaxStrength ?? 30 }
								onChange={ ( val ) =>
									setAttributes( { sgsParallaxStrength: val } )
								}
								min={ 0 }
								max={ 100 }
								step={ 5 }
								__nextHasNoMarginBottom
							/>
						) }
					</PanelBody>
				</InspectorControls>
			</>
		);
	};
}, 'withParallaxControls' );

addFilter(
	'editor.BlockEdit',
	'sgs/parallax-controls',
	withParallaxControls
);

/**
 * BlockListBlock HOC — adds a data attribute in the editor when parallax is
 * active. This lets authors identify which block has parallax without any
 * opacity change (parallax is invisible in the editor by design).
 */
const withParallaxEditorIndicator = createHigherOrderComponent(
	( BlockListBlock ) => {
		return ( props ) => {
			const { attributes } = props;
			const { sgsParallax } = attributes;

			const isActive = sgsParallax && 'none' !== sgsParallax;

			if ( ! isActive ) {
				return <BlockListBlock { ...props } />;
			}

			const wrapperProps = {
				...( props.wrapperProps || {} ),
				'data-sgs-parallax-type': sgsParallax,
			};

			return <BlockListBlock { ...props } wrapperProps={ wrapperProps } />;
		};
	},
	'withParallaxEditorIndicator'
);

addFilter(
	'editor.BlockListBlock',
	'sgs/parallax-editor-indicator',
	withParallaxEditorIndicator
);

} // end guard: window.__sgsParallaxRegistered
