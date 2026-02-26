/**
 * Custom Spacing Extension
 *
 * Enhances blocks with additional spacing controls beyond WordPress core.
 * Adds responsive spacing controls to all SGS blocks.
 *
 * @package SGS\Blocks
 */

import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import SpacingControl from '../../components/SpacingControl';

/**
 * Add custom spacing attributes to SGS blocks.
 *
 * @param {Object} settings Block settings.
 * @param {string} name     Block name.
 * @return {Object} Modified settings.
 */
function addSpacingAttributes( settings, name ) {
	// Only apply to SGS blocks.
	if ( ! name.startsWith( 'sgs/' ) ) {
		return settings;
	}

	// Skip if block already has native spacing support.
	if ( settings.supports?.spacing ) {
		return settings;
	}

	return {
		...settings,
		attributes: {
			...settings.attributes,
			sgsMarginTop: {
				type: 'string',
				default: '',
			},
			sgsMarginBottom: {
				type: 'string',
				default: '',
			},
			sgsPaddingTop: {
				type: 'string',
				default: '',
			},
			sgsPaddingBottom: {
				type: 'string',
				default: '',
			},
		},
	};
}

addFilter(
	'blocks.registerBlockType',
	'sgs/custom-spacing-attributes',
	addSpacingAttributes
);

/**
 * Add spacing controls to block inspector.
 */
const withSpacingControls = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { attributes, setAttributes, name } = props;

		// Only apply to SGS blocks without native spacing support.
		if ( ! name.startsWith( 'sgs/' ) ) {
			return <BlockEdit { ...props } />;
		}

		// Skip if block has native spacing support.
		if ( props.attributes.style?.spacing ) {
			return <BlockEdit { ...props } />;
		}

		const {
			sgsMarginTop,
			sgsMarginBottom,
			sgsPaddingTop,
			sgsPaddingBottom,
		} = attributes;

		return (
			<>
				<BlockEdit { ...props } />
				<InspectorControls>
					<PanelBody
						title={ __( 'Spacing', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<SpacingControl
							label={ __( 'Margin Top', 'sgs-blocks' ) }
							value={ sgsMarginTop }
							onChange={ ( value ) =>
								setAttributes( { sgsMarginTop: value } )
							}
						/>

						<SpacingControl
							label={ __( 'Margin Bottom', 'sgs-blocks' ) }
							value={ sgsMarginBottom }
							onChange={ ( value ) =>
								setAttributes( { sgsMarginBottom: value } )
							}
						/>

						<SpacingControl
							label={ __( 'Padding Top', 'sgs-blocks' ) }
							value={ sgsPaddingTop }
							onChange={ ( value ) =>
								setAttributes( { sgsPaddingTop: value } )
							}
						/>

						<SpacingControl
							label={ __( 'Padding Bottom', 'sgs-blocks' ) }
							value={ sgsPaddingBottom }
							onChange={ ( value ) =>
								setAttributes( { sgsPaddingBottom: value } )
							}
						/>
					</PanelBody>
				</InspectorControls>
			</>
		);
	};
}, 'withSpacingControls' );

addFilter(
	'editor.BlockEdit',
	'sgs/custom-spacing-controls',
	withSpacingControls
);

/**
 * Apply spacing classes to block wrapper.
 *
 * @param {Object} props     Block props.
 * @param {Object} blockType Block type.
 * @param {Object} attributes Block attributes.
 * @return {Object} Modified props.
 */
function applySpacingClasses( props, blockType, attributes ) {
	const {
		sgsMarginTop,
		sgsMarginBottom,
		sgsPaddingTop,
		sgsPaddingBottom,
	} = attributes;

	if ( ! sgsMarginTop && ! sgsMarginBottom && ! sgsPaddingTop && ! sgsPaddingBottom ) {
		return props;
	}

	const classes = [];

	if ( sgsMarginTop ) {
		classes.push( `sgs-mt-${ sgsMarginTop }` );
	}

	if ( sgsMarginBottom ) {
		classes.push( `sgs-mb-${ sgsMarginBottom }` );
	}

	if ( sgsPaddingTop ) {
		classes.push( `sgs-pt-${ sgsPaddingTop }` );
	}

	if ( sgsPaddingBottom ) {
		classes.push( `sgs-pb-${ sgsPaddingBottom }` );
	}

	return {
		...props,
		className: [ props.className, ...classes ].filter( Boolean ).join( ' ' ),
	};
}

addFilter(
	'blocks.getSaveContent.extraProps',
	'sgs/custom-spacing-classes',
	applySpacingClasses
);
