/**
 * Universal Hover Effects extension.
 *
 * Adds hover colour, scale, shadow, and border controls to ALL blocks.
 * Outputs CSS custom properties as inline styles and a `.sgs-has-hover`
 * class that activates the hover CSS.
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
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

// Lazy-import DesignTokenPicker if available, fallback to nothing.
let DesignTokenPicker;
try {
	DesignTokenPicker = require( '../../components' ).DesignTokenPicker;
} catch {
	DesignTokenPicker = null;
}

const HOVER_ATTRS = {
	sgsHoverBgColour: { type: 'string', default: '' },
	sgsHoverTextColour: { type: 'string', default: '' },
	sgsHoverBorderColour: { type: 'string', default: '' },
	sgsHoverScale: { type: 'number', default: 0 },
	sgsHoverShadow: { type: 'string', default: '' },
	sgsHoverDuration: { type: 'number', default: 300 },
};

const SHADOW_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'sm' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'md' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'lg' },
	{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
];

/**
 * Add hover attributes to all blocks.
 */
addFilter(
	'blocks.registerBlockType',
	'sgs/hover-effects/attributes',
	( settings ) => {
		const type = getBlockType( settings.name );
		// Skip blocks that don't support className.
		if ( type?.supports?.className === false ) {
			return settings;
		}

		return {
			...settings,
			attributes: {
				...settings.attributes,
				...HOVER_ATTRS,
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
		} = attributes;

		const hasAnyHover = sgsHoverBgColour || sgsHoverTextColour ||
			sgsHoverBorderColour || sgsHoverScale || sgsHoverShadow;

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
						<RangeControl
							label={ __( 'Hover scale (%)', 'sgs-blocks' ) }
							help={ __( '0 = no scale. 105 = 5% larger.', 'sgs-blocks' ) }
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
						<RangeControl
							label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
							value={ sgsHoverDuration }
							onChange={ ( val ) => setAttributes( { sgsHoverDuration: val } ) }
							min={ 0 }
							max={ 1000 }
							step={ 50 }
							__nextHasNoMarginBottom
						/>
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
			sgsHoverDuration,
		} = attributes;

		const hasHover = sgsHoverBgColour || sgsHoverTextColour ||
			sgsHoverBorderColour || sgsHoverScale || sgsHoverShadow;

		if ( ! hasHover ) {
			return extraProps;
		}

		const classes = [ extraProps.className || '', 'sgs-has-hover' ]
			.filter( Boolean )
			.join( ' ' );

		return {
			...extraProps,
			className: classes,
		};
	}
);
