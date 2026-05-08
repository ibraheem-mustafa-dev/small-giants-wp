/**
 * Universal Image Controls extension.
 *
 * Adds objectPosition, maxWidth, and per-breakpoint height controls to any
 * block that declares `supports.sgs.imageControls: true` in its block.json.
 *
 * Class and CSS custom property injection is handled server-side by
 * includes/image-controls.php via the render_block filter. PHP-side injection
 * is the correct path for both static and dynamic blocks — it avoids baking
 * classes into save() output which would cause block validation failures.
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
	TextControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Return true if the given block supports image controls.
 *
 * @param {string|Object} blockNameOrSettings Block name string or settings object.
 * @return {boolean}
 */
function supportsImageControls( blockNameOrSettings ) {
	// Called from addFilter('blocks.registerBlockType') — receives settings object.
	if ( blockNameOrSettings && typeof blockNameOrSettings === 'object' ) {
		return !! blockNameOrSettings?.supports?.sgs?.imageControls;
	}
	// Called from editor HOC — receives name string.
	const type = getBlockType( blockNameOrSettings );
	return !! type?.supports?.sgs?.imageControls;
}

const HEIGHT_UNIT_OPTIONS = [
	{ label: __( 'px', 'sgs-blocks' ),  value: 'px' },
	{ label: __( 'vh', 'sgs-blocks' ),  value: 'vh' },
	{ label: __( 'em', 'sgs-blocks' ),  value: 'em' },
	{ label: __( '%', 'sgs-blocks' ),   value: '%' },
];

/**
 * Inject image-control attributes into opted-in blocks.
 */
addFilter(
	'blocks.registerBlockType',
	'sgs/image-controls/attributes',
	( settings ) => {
		if ( ! supportsImageControls( settings ) ) {
			return settings;
		}

		return {
			...settings,
			attributes: {
				...settings.attributes,
				// CSS object-position value, e.g. "center 20%" or "top right".
				sgsObjectPosition:  { type: 'string', default: '' },
				// CSS max-width value, e.g. "640px" or "100%".
				sgsMaxWidth:        { type: 'string', default: '' },
				// Per-breakpoint height (0 = auto).
				sgsHeightDesktop:   { type: 'number', default: 0 },
				sgsHeightTablet:    { type: 'number', default: 0 },
				sgsHeightMobile:    { type: 'number', default: 0 },
				// Unit applied to all three height values.
				sgsHeightUnit:      { type: 'string', default: 'px' },
			},
		};
	}
);

/**
 * Add Image Controls panel to the block inspector for opted-in blocks.
 */
const withImageControls = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { attributes, setAttributes, name } = props;

		if ( ! supportsImageControls( name ) ) {
			return <BlockEdit { ...props } />;
		}

		const {
			sgsObjectPosition,
			sgsMaxWidth,
			sgsHeightDesktop,
			sgsHeightTablet,
			sgsHeightMobile,
			sgsHeightUnit,
		} = attributes;

		return (
			<>
				<BlockEdit { ...props } />
				<InspectorControls>
					<PanelBody
						title={ __( 'Image Controls', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<TextControl
							label={ __( 'Object position', 'sgs-blocks' ) }
							help={ __(
								'e.g. center 20%, top right. Controls which part of the image is visible when cropped.',
								'sgs-blocks'
							) }
							value={ sgsObjectPosition }
							onChange={ ( val ) =>
								setAttributes( { sgsObjectPosition: val || '' } )
							}
							placeholder="center center"
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Max width', 'sgs-blocks' ) }
							help={ __(
								'Constrain the image width — CSS value like 640px or 80%.',
								'sgs-blocks'
							) }
							value={ sgsMaxWidth }
							onChange={ ( val ) =>
								setAttributes( { sgsMaxWidth: val || '' } )
							}
							placeholder="100%"
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Height unit', 'sgs-blocks' ) }
							help={ __(
								'Applied to all three breakpoint heights below.',
								'sgs-blocks'
							) }
							value={ sgsHeightUnit }
							options={ HEIGHT_UNIT_OPTIONS }
							onChange={ ( val ) =>
								setAttributes( { sgsHeightUnit: val } )
							}
							__nextHasNoMarginBottom
						/>
						<RangeControl
							label={ __( 'Height — desktop', 'sgs-blocks' ) }
							help={ __(
								'0 = auto (natural image height).',
								'sgs-blocks'
							) }
							value={ sgsHeightDesktop }
							onChange={ ( val ) =>
								setAttributes( { sgsHeightDesktop: val ?? 0 } )
							}
							min={ 0 }
							max={ 800 }
							step={ 1 }
							__nextHasNoMarginBottom
						/>
						<RangeControl
							label={ __( 'Height — tablet', 'sgs-blocks' ) }
							help={ __(
								'0 = inherit from desktop.',
								'sgs-blocks'
							) }
							value={ sgsHeightTablet }
							onChange={ ( val ) =>
								setAttributes( { sgsHeightTablet: val ?? 0 } )
							}
							min={ 0 }
							max={ 800 }
							step={ 1 }
							__nextHasNoMarginBottom
						/>
						<RangeControl
							label={ __( 'Height — mobile', 'sgs-blocks' ) }
							help={ __(
								'0 = inherit from desktop.',
								'sgs-blocks'
							) }
							value={ sgsHeightMobile }
							onChange={ ( val ) =>
								setAttributes( { sgsHeightMobile: val ?? 0 } )
							}
							min={ 0 }
							max={ 800 }
							step={ 1 }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>
			</>
		);
	};
}, 'withImageControls' );

addFilter(
	'editor.BlockEdit',
	'sgs/image-controls/controls',
	withImageControls
);
