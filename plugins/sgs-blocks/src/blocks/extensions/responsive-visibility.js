/**
 * Responsive visibility extension — show/hide per breakpoint.
 *
 * Adds hideOnMobile, hideOnTablet, hideOnDesktop toggles to all sgs/* blocks.
 * Outputs CSS classes (sgs-hide-mobile, etc.) that are handled by
 * the extensions.css media queries.
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

function addVisibilityAttributes( settings, name ) {
	if ( ! name.startsWith( 'sgs/' ) ) {
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
	'sgs/visibility-attributes',
	addVisibilityAttributes
);

const withVisibilityControls = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		if ( ! props.name.startsWith( 'sgs/' ) ) {
			return <BlockEdit { ...props } />;
		}

		const { attributes, setAttributes } = props;

		return (
			<>
				<BlockEdit { ...props } />
				<InspectorControls>
					<PanelBody
						title={ __( 'Visibility', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<ToggleControl
							label={ __( 'Hide on mobile', 'sgs-blocks' ) }
							checked={ attributes.sgsHideOnMobile }
							onChange={ ( val ) =>
								setAttributes( { sgsHideOnMobile: val } )
							}
							__nextHasNoMarginBottom
						/>
						<ToggleControl
							label={ __( 'Hide on tablet', 'sgs-blocks' ) }
							checked={ attributes.sgsHideOnTablet }
							onChange={ ( val ) =>
								setAttributes( { sgsHideOnTablet: val } )
							}
							__nextHasNoMarginBottom
						/>
						<ToggleControl
							label={ __( 'Hide on desktop', 'sgs-blocks' ) }
							checked={ attributes.sgsHideOnDesktop }
							onChange={ ( val ) =>
								setAttributes( { sgsHideOnDesktop: val } )
							}
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>
			</>
		);
	};
}, 'withVisibilityControls' );

addFilter(
	'editor.BlockEdit',
	'sgs/visibility-controls',
	withVisibilityControls
);

function addVisibilityClasses( props, blockType, attributes ) {
	if ( ! blockType.name.startsWith( 'sgs/' ) ) {
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
	'sgs/visibility-classes',
	addVisibilityClasses
);
