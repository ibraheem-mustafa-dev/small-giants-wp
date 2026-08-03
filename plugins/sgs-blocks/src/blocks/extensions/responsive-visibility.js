/**
 * Device visibility extension — show/hide per breakpoint.
 *
 * Adds sgsHideOnMobile, sgsHideOnTablet, sgsHideOnDesktop toggles
 * to ALL Gutenberg blocks (core and SGS). Outputs CSS classes that
 * are handled by media queries in extensions.css.
 *
 * Server-side class injection is handled by the render_block filter
 * in includes/device-visibility.php, which ensures dynamic blocks
 * (with render.php) also receive the correct classes.
 *
 * The client-side blocks.getSaveContent.extraProps filter handles
 * static blocks (those with a JS save function).
 *
 * UI position: this file registers the sgsHideOnMobile/Tablet/Desktop
 * attributes and applies the resulting classes/editor indicator, but does
 * NOT render its own inspector panel. The device-visibility toggles are
 * rendered by ./conditional-visibility.js, at the TOP of its own
 * collapsible "Visibility conditions" panel (device toggles above the
 * conditional rules), because attributes registered here are available on
 * `props.attributes` by the time that file's editor.BlockEdit filter runs.
 * See conditional-visibility.js's file header for the panel-placement
 * rationale and index.js for import order.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { __ } from '@wordpress/i18n';

/**
 * Guard against double registration.
 *
 * If the extensions bundle is evaluated twice (e.g. a CJS build and an ESM
 * build both loaded by WordPress), the addFilter calls would fire twice and
 * the controls would appear twice in the inspector. The global flag prevents
 * this without throwing any console errors.
 */
if ( ! window.__sgsDeviceVisibilityRegistered ) {
window.__sgsDeviceVisibilityRegistered = true;

/**
 * Check whether a block type supports the className prop.
 *
 * If a block explicitly sets supports.className to false,
 * there is nowhere to add our visibility class — skip it.
 *
 * @param {Object} settings Block settings object.
 * @return {boolean} True if the block supports className.
 */
function supportsClassName( settings ) {
	if ( settings?.supports?.className === false ) {
		return false;
	}
	return true;
}

/**
 * Inject visibility attributes into all block types.
 *
 * @param {Object} settings Block settings.
 * @param {string} name     Block name.
 * @return {Object} Modified settings with visibility attributes.
 */
function addVisibilityAttributes( settings, name ) {
	if ( ! supportsClassName( settings ) ) {
		return settings;
	}

	return {
		...settings,
		attributes: {
			...settings.attributes,
			sgsHideOnMobile: { type: 'boolean', default: false },
			sgsHideOnTablet: { type: 'boolean', default: false },
			sgsHideOnDesktop: { type: 'boolean', default: false },
		},
	};
}

addFilter(
	'blocks.registerBlockType',
	'sgs/device-visibility-attributes',
	addVisibilityAttributes
);

/**
 * Add visibility CSS classes to the block wrapper for static blocks.
 *
 * This filter runs on save (blocks.getSaveContent.extraProps) and adds
 * the appropriate sgs-hide-* classes to the saved HTML. For dynamic
 * blocks, the server-side render_block filter handles this instead.
 *
 * @param {Object} props      Block wrapper props.
 * @param {Object} blockType  Block type definition.
 * @param {Object} attributes Block attributes.
 * @return {Object} Modified props with visibility classes.
 */
function addVisibilityClasses( props, blockType, attributes ) {
	if ( blockType?.supports?.className === false ) {
		return props;
	}

	const classes = [];
	if ( attributes.sgsHideOnMobile ) {
		classes.push( 'sgs-hide-mobile' );
	}
	if ( attributes.sgsHideOnTablet ) {
		classes.push( 'sgs-hide-tablet' );
	}
	if ( attributes.sgsHideOnDesktop ) {
		classes.push( 'sgs-hide-desktop' );
	}

	if ( classes.length ) {
		return {
			...props,
			className: [ props.className, ...classes ]
				.filter( Boolean )
				.join( ' ' ),
		};
	}

	return props;
}

addFilter(
	'blocks.getSaveContent.extraProps',
	'sgs/device-visibility-classes',
	addVisibilityClasses
);

/**
 * Add visual indicators in the editor when a block is hidden
 * on one or more devices (reduced opacity + dashed border).
 */
const withVisibilityEditorStyles = createHigherOrderComponent(
	( BlockListBlock ) => {
		return ( props ) => {
			const { attributes } = props;
			const isHidden =
				attributes.sgsHideOnMobile ||
				attributes.sgsHideOnTablet ||
				attributes.sgsHideOnDesktop;

			if ( ! isHidden ) {
				return <BlockListBlock { ...props } />;
			}

			// Build a label showing which devices are hidden.
			const hiddenOn = [];
			if ( attributes.sgsHideOnMobile ) {
				hiddenOn.push( __( 'mobile', 'sgs-blocks' ) );
			}
			if ( attributes.sgsHideOnTablet ) {
				hiddenOn.push( __( 'tablet', 'sgs-blocks' ) );
			}
			if ( attributes.sgsHideOnDesktop ) {
				hiddenOn.push( __( 'desktop', 'sgs-blocks' ) );
			}

			const wrapperProps = {
				...( props.wrapperProps || {} ),
				style: {
					...( props.wrapperProps?.style || {} ),
					opacity: 0.5,
					border: '1px dashed var(--wp-admin-theme-color, #007cba)',
					position: 'relative',
				},
				'data-sgs-hidden-on': hiddenOn.join( ', ' ),
			};

			return <BlockListBlock { ...props } wrapperProps={ wrapperProps } />;
		};
	},
	'withDeviceVisibilityEditorStyles'
);

addFilter(
	'editor.BlockListBlock',
	'sgs/device-visibility-editor-styles',
	withVisibilityEditorStyles
);

} // end guard: window.__sgsDeviceVisibilityRegistered
