/**
 * "Gap between chips" extension for WooCommerce's attribute filter chips.
 *
 * Adds one per-device attribute, `sgsChipGap` ({desktop,tablet,mobile}; a blank
 * tablet/mobile tier inherits the tier above), to the `woocommerce/product-filter-chips`
 * block ONLY. WooCommerce gives that block no spacing setting for the chips, and the
 * parent filter block's gap spaces the heading from the list, not the chips from each
 * other. An empty value changes nothing; a set value is painted on the frontend by
 * includes/product-filter-chips-gap.php as a scoped rule on the chips list.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import ResponsiveOverride from '../../components/ResponsiveOverride';
import SgsLengthControl from '../../components/SgsLengthControl';
import { resolveResponsiveTier } from '../../utils/responsive';

/** Only WooCommerce's attribute filter chips block carries this control. */
const TARGET_BLOCK_NAME = 'woocommerce/product-filter-chips';

const GAP_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
];

/** Guard against double registration (a CJS + ESM double-load would register every filter twice). */
if ( ! window.__sgsChipGapRegistered ) {
	window.__sgsChipGapRegistered = true;

	addFilter(
		'blocks.registerBlockType',
		'sgs/product-filter-chips-gap/attributes',
		( settings, name ) => {
			if ( TARGET_BLOCK_NAME !== name ) {
				return settings;
			}
			return {
				...settings,
				attributes: {
					...settings.attributes,
					sgsChipGap: { type: 'object', default: {} },
				},
			};
		}
	);

	const withChipGapControl = createHigherOrderComponent(
		( BlockEdit ) => ( props ) => {
			if ( TARGET_BLOCK_NAME !== props.name ) {
				return <BlockEdit { ...props } />;
			}
			const { attributes, setAttributes } = props;
			return (
				<>
					<BlockEdit { ...props } />
					<InspectorControls group="styles">
						<PanelBody
							title={ __( 'Chip spacing', 'sgs-blocks' ) }
							initialOpen={ false }
						>
							<ResponsiveOverride
								label={ __( 'Gap between chips', 'sgs-blocks' ) }
								value={ attributes.sgsChipGap }
								onChange={ ( obj ) =>
									setAttributes( { sgsChipGap: obj } )
								}
							>
								{ ( { tier, ownValue, setOwnValue } ) => (
									<SgsLengthControl
										label={ __( 'Gap between chips', 'sgs-blocks' ) }
										hideLabelFromVision
										value={ ownValue }
										placeholder={
											ownValue
												? undefined
												: resolveResponsiveTier(
														attributes.sgsChipGap || {},
														tier
												  ).value || ''
										}
										units={ GAP_UNITS }
										onChange={ setOwnValue }
										help={ __(
											'Leave empty to keep the theme spacing. Clear a value to reset it.',
											'sgs-blocks'
										) }
									/>
								) }
							</ResponsiveOverride>
						</PanelBody>
					</InspectorControls>
				</>
			);
		},
		'withChipGapControl'
	);

	addFilter(
		'editor.BlockEdit',
		'sgs/product-filter-chips-gap/controls',
		withChipGapControl
	);
} // end guard: window.__sgsChipGapRegistered
