/**
 * Parallax scroll extension — element parallax.
 *
 * Adds sgsParallax (type) and sgsParallaxStrength (0–100) attributes to ALL
 * Gutenberg blocks that support className. The CSS and JS runtime handle the
 * actual parallax effect; this extension provides the editor control only.
 *
 * Element parallax is a toggle in its own panel (group="styles"), available
 * on any block. The whole block drifts as the visitor scrolls, for a subtle
 * sense of depth. Writes to the sgsParallax enum ('none' | 'element').
 *
 * A sibling "Background parallax" option used to live here too, mounted
 * inside WordPress's native Colour panel (group="color"). REMOVED
 * 2026-08-19 — see the withParallaxControls docblock below for why, and
 * BackgroundPanel (container/components/BackgroundPanel.js) for the working
 * background-motion mechanism (bgKenBurns/bgParallax).
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
 * Higher-order component that renders the element-parallax control in the inspector.
 *
 * Element parallax: a toggle in its own discoverable panel, on any block.
 *
 * The sibling "Background parallax" option this used to offer was REMOVED
 * 2026-08-19 (golden-controls goldens/behaviour.json, controls.animation).
 * It mounted inside WordPress's native Colour panel (`InspectorControls
 * group="color"`), gated on `getBlockSupport(name, ['color','background'])`
 * — which is false on any block that has migrated off native colour supports
 * (sgs/hero declares none at all; sgs/container sets `supports.color:false`),
 * so the toggle was confirmed dead UI on exactly the blocks that need
 * background parallax. `BackgroundPanel` (container/components/
 * BackgroundPanel.js) already provides a working, reachable Ken-burns/
 * Parallax pair (bgKenBurns/bgParallax) wherever a background image exists —
 * that is the real, live mechanism; this extension no longer duplicates it.
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
		const isElement = 'element' === sgsParallax;
		const isActive = isElement;

		return (
			<>
				<BlockEdit { ...props } />

				{ /*
				 * FIX (inspector tab placement): this used to be a bare
				 * <InspectorControls> (no group), which WordPress renders in
				 * the SETTINGS tab. Parallax is injected by a runtime filter,
				 * so it belongs to no declared element; per THE PLACEMENT RULE
				 * (TWO TIERS, D537 2026-08-09) it resolves to its TIER 2
				 * property-family panel — ANIMATION — not a single catch-all
				 * block-level panel, the same family as animation.js's panel.
				 * ANIMATION, not MOTION: `anim:parallax` is declared a member
				 * of the `animation` cluster in
				 * scripts/consistency/cluster-member-sets.json (suffixes
				 * Parallax / ParallaxStrength). `motion` in that file is a
				 * DIFFERENT family holding only css:transition-duration and
				 * css:transition-timing-function. group="styles" is kept as
				 * the interim WP-native-group home until the ANIMATION family
				 * panel is built (unbuilt at D537).
				 * ⛔ NOT justified by "behaviour → Settings; appearance →
				 * Styles" — RETIRED 2026-08-08. Routing unchanged, reason
				 * only.
				 */ }
				<InspectorControls group="styles">
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
								__next40pxDefaultSize
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
