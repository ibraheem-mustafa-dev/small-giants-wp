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
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { getBlockType } from '@wordpress/blocks';
import { InspectorAdvancedControls } from '@wordpress/block-editor';
import { ToggleControl, Icon } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { mobile, tablet, desktop } from '@wordpress/icons';

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
 * Higher-order component that adds visibility toggle controls
 * to the Advanced panel of every block's inspector sidebar.
 */
const withVisibilityControls = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { name, attributes, setAttributes } = props;

		// Skip blocks that do not support className.
		const blockType = getBlockType( name );
		if ( blockType?.supports?.className === false ) {
			return <BlockEdit { ...props } />;
		}

		return (
			<>
				<BlockEdit { ...props } />
				<InspectorAdvancedControls>
					<p
						style={ {
							marginBottom: '8px',
							fontWeight: 600,
							fontSize: '11px',
							textTransform: 'uppercase',
							letterSpacing: '0.5px',
						} }
					>
						{ __( 'Device visibility', 'sgs-blocks' ) }
					</p>
					<ToggleControl
						label={
							<>
								<Icon icon={ mobile } size={ 16 } />{ ' ' }
								{ __( 'Hide on mobile', 'sgs-blocks' ) }
							</>
						}
						help={ __(
							'Below 600px',
							'sgs-blocks'
						) }
						checked={ !! attributes.sgsHideOnMobile }
						onChange={ ( val ) =>
							setAttributes( { sgsHideOnMobile: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={
							<>
								<Icon icon={ tablet } size={ 16 } />{ ' ' }
								{ __( 'Hide on tablet', 'sgs-blocks' ) }
							</>
						}
						help={ __(
							'600px to 1023px',
							'sgs-blocks'
						) }
						checked={ !! attributes.sgsHideOnTablet }
						onChange={ ( val ) =>
							setAttributes( { sgsHideOnTablet: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={
							<>
								<Icon icon={ desktop } size={ 16 } />{ ' ' }
								{ __( 'Hide on desktop', 'sgs-blocks' ) }
							</>
						}
						help={ __(
							'1024px and above',
							'sgs-blocks'
						) }
						checked={ !! attributes.sgsHideOnDesktop }
						onChange={ ( val ) =>
							setAttributes( { sgsHideOnDesktop: val } )
						}
						__nextHasNoMarginBottom
					/>
				</InspectorAdvancedControls>
			</>
		);
	};
}, 'withDeviceVisibilityControls' );

addFilter(
	'editor.BlockEdit',
	'sgs/device-visibility-controls',
	withVisibilityControls
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
