/**
 * Parallax scroll extension — background parallax and element parallax.
 *
 * Adds sgsParallax (type) and sgsParallaxStrength (0–100) attributes to ALL
 * Gutenberg blocks that support className. The CSS and JS runtime handle the
 * actual parallax effect; this extension provides the editor controls only.
 *
 * The two effects are surfaced as two purpose-built controls:
 *   1. Background parallax — a toggle in the native Colour panel (group="color"),
 *      shown only on blocks that support a background colour. The block's
 *      background moves at a different speed to its content on scroll.
 *   2. Element parallax — a toggle in its own panel, available on any block. The
 *      whole block drifts as the visitor scrolls, for a subtle sense of depth.
 *
 * Both write to the single sgsParallax enum ('none' | 'background' | 'element'),
 * so the two effects are mutually exclusive and the server render is unchanged.
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
import { getBlockType, getBlockSupport } from '@wordpress/blocks';
import { isExtensionHidden } from './hide-extensions';
import { InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	ToggleControl,
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
 * Whether a block type supports a background colour.
 *
 * The background-parallax toggle only makes sense where the block has a
 * background to move, so it is surfaced only on background-colour-capable
 * blocks and rendered inside the native Colour panel (group="color").
 *
 * @param {string} name Block name.
 * @return {boolean} True when the block supports color.background.
 */
function supportsBackgroundColour( name ) {
	return !! getBlockSupport( name, [ 'color', 'background' ] );
}

/**
 * Higher-order component that renders the two parallax controls in the inspector.
 *
 * - Background parallax: a toggle inside the Colour panel (group="color"), only
 *   on background-capable blocks.
 * - Element parallax: a toggle in its own discoverable panel, on any block.
 *
 * Both controls drive the single sgsParallax enum, so enabling one disables the
 * other (a block does one kind of parallax).
 */
const withParallaxControls = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { name, attributes, setAttributes } = props;

		// Skip blocks that do not support className.
		const blockType = getBlockType( name );
		if ( blockType?.supports?.className === false ) {
			return <BlockEdit { ...props } />;
		}

		// Per-block opt-out (supports.sgs.hideExtensions): a logo wall, form
		// field etc. has no use for parallax.
		if ( isExtensionHidden( name, 'parallax' ) ) {
			return <BlockEdit { ...props } />;
		}

		const { sgsParallax, sgsParallaxStrength } = attributes;
		const isBackground = 'background' === sgsParallax;
		const isElement = 'element' === sgsParallax;
		const isActive = isBackground || isElement;
		const showBackground = supportsBackgroundColour( name );

		return (
			<>
				<BlockEdit { ...props } />

				{ showBackground && (
					<InspectorControls group="color">
						<ToggleControl
							label={ __( 'Background parallax', 'sgs-blocks' ) }
							help={ __(
								'The background moves at a different speed to the content as visitors scroll. Needs a background image or video to be visible.',
								'sgs-blocks'
							) }
							checked={ isBackground }
							onChange={ ( on ) =>
								setAttributes( {
									sgsParallax: on ? 'background' : 'none',
								} )
							}
							__nextHasNoMarginBottom
						/>

						{ isBackground && (
							<RangeControl
								label={ __( 'Strength', 'sgs-blocks' ) }
								value={ sgsParallaxStrength ?? 30 }
								onChange={ ( val ) =>
									setAttributes( {
										sgsParallaxStrength: val,
									} )
								}
								min={ 0 }
								max={ 100 }
								step={ 5 }
								help={ __(
									'How far the background travels on scroll.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
						) }
					</InspectorControls>
				) }

				<InspectorControls>
					<PanelBody
						title={ __( 'Element parallax', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<p className="sgs-parallax-help">
							{ __(
								'Element parallax makes the whole block drift gently up or down as the visitor scrolls, so it moves at a slightly different speed to everything around it — giving a subtle sense of depth. Best used sparingly, on images or standalone sections.',
								'sgs-blocks'
							) }
						</p>

						<ToggleControl
							label={ __( 'Enable element parallax', 'sgs-blocks' ) }
							checked={ isElement }
							onChange={ ( on ) =>
								setAttributes( {
									sgsParallax: on ? 'element' : 'none',
								} )
							}
							__nextHasNoMarginBottom
						/>

						{ isElement && (
							<RangeControl
								label={ __( 'Strength', 'sgs-blocks' ) }
								value={ sgsParallaxStrength ?? 30 }
								onChange={ ( val ) =>
									setAttributes( {
										sgsParallaxStrength: val,
									} )
								}
								min={ 0 }
								max={ 100 }
								step={ 5 }
								help={ __(
									'How far the block travels on scroll.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
						) }

						{ isActive && (
							<Notice status="info" isDismissible={ false }>
								{ __(
									'Parallax only shows on the live site, not here in the editor preview.',
									'sgs-blocks'
								) }
							</Notice>
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
