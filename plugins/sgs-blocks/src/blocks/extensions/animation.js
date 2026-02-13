/**
 * Animation extension — injects scroll-triggered animation controls
 * into ALL sgs/* blocks via WordPress filters.
 *
 * Adds three attributes (sgsAnimation, sgsAnimationDelay, sgsAnimationDuration)
 * and outputs them as data-* attributes on the saved markup. The frontend
 * IntersectionObserver reads these and triggers CSS transitions.
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { AnimationControl } from '../../components';

function addAnimationAttributes( settings, name ) {
	if ( ! name.startsWith( 'sgs/' ) ) {
		return settings;
	}

	return {
		...settings,
		attributes: {
			...settings.attributes,
			sgsAnimation: { type: 'string', default: 'none' },
			sgsAnimationDelay: { type: 'string', default: '0' },
			sgsAnimationDuration: { type: 'string', default: 'medium' },
		},
	};
}

addFilter(
	'blocks.registerBlockType',
	'sgs/animation-attributes',
	addAnimationAttributes
);

const withAnimationControls = createHigherOrderComponent( ( BlockEdit ) => {
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
						title={ __( 'Animation', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<AnimationControl
							animation={ attributes.sgsAnimation }
							animationDelay={ attributes.sgsAnimationDelay }
							animationDuration={
								attributes.sgsAnimationDuration
							}
							onChangeAnimation={ ( val ) =>
								setAttributes( { sgsAnimation: val } )
							}
							onChangeDelay={ ( val ) =>
								setAttributes( { sgsAnimationDelay: val } )
							}
							onChangeDuration={ ( val ) =>
								setAttributes( {
									sgsAnimationDuration: val,
								} )
							}
						/>
					</PanelBody>
				</InspectorControls>
			</>
		);
	};
}, 'withAnimationControls' );

addFilter(
	'editor.BlockEdit',
	'sgs/animation-controls',
	withAnimationControls
);

function addAnimationSaveProps( props, blockType, attributes ) {
	if ( ! blockType.name.startsWith( 'sgs/' ) ) {
		return props;
	}

	if ( attributes.sgsAnimation && attributes.sgsAnimation !== 'none' ) {
		return {
			...props,
			'data-sgs-animation': attributes.sgsAnimation,
			'data-sgs-animation-delay': attributes.sgsAnimationDelay || '0',
			'data-sgs-animation-duration':
				attributes.sgsAnimationDuration || 'medium',
		};
	}

	return props;
}

addFilter(
	'blocks.getSaveContent.extraProps',
	'sgs/animation-save-props',
	addAnimationSaveProps
);
