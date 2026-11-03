/**
 * "Minimum card width" extension for WooCommerce's Product Collection.
 *
 * Adds one per-device attribute, `sgsCardMinWidth` ({desktop,tablet,mobile}; a blank
 * tablet/mobile tier inherits the tier above), to the `woocommerce/product-collection`
 * block ONLY. Product Collection lays products out in a fixed column count, so a row
 * with one product draws one narrow card. When this length is set the product list fits
 * as many cards as fit at that minimum width (auto-fill) instead. An empty value changes
 * nothing; a set value is painted on the frontend by
 * includes/product-collection-card-min.php as a scoped rule on the product list.
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
import { usePreviewTier } from '../../utils/usePreviewTier';
import './product-collection-card-min.scss';

/** Only WooCommerce's Product Collection block carries this control. */
const TARGET_BLOCK_NAME = 'woocommerce/product-collection';

const CARD_MIN_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
];

/** Guard against double registration (a CJS + ESM double-load would register every filter twice). */
if ( ! window.__sgsCardMinRegistered ) {
	window.__sgsCardMinRegistered = true;

	addFilter(
		'blocks.registerBlockType',
		'sgs/product-collection-card-min/attributes',
		( settings, name ) => {
			if ( TARGET_BLOCK_NAME !== name ) {
				return settings;
			}
			return {
				...settings,
				attributes: {
					...settings.attributes,
					sgsCardMinWidth: { type: 'object', default: {} },
				},
			};
		}
	);

	const withCardMinControl = createHigherOrderComponent(
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
							title={ __( 'Card width', 'sgs-blocks' ) }
							initialOpen={ false }
						>
							<ResponsiveOverride
								label={ __( 'Minimum card width', 'sgs-blocks' ) }
								value={ attributes.sgsCardMinWidth }
								onChange={ ( obj ) =>
									setAttributes( { sgsCardMinWidth: obj } )
								}
							>
								{ ( { tier, ownValue, setOwnValue } ) => (
									<SgsLengthControl
										label={ __( 'Minimum card width', 'sgs-blocks' ) }
										hideLabelFromVision
										value={ ownValue }
										placeholder={
											ownValue
												? undefined
												: resolveResponsiveTier(
														attributes.sgsCardMinWidth || {},
														tier
												  ).value || ''
										}
										units={ CARD_MIN_UNITS }
										onChange={ setOwnValue }
										help={ __(
											'Fits as many cards per row as the width allows, replacing the fixed number of columns. Leave empty to keep the fixed columns. Clear a value to reset it.',
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
		'withCardMinControl'
	);

	addFilter(
		'editor.BlockEdit',
		'sgs/product-collection-card-min/controls',
		withCardMinControl
	);

	/**
	 * Editor preview: the minimum width of the tier the canvas previews, as the custom property
	 * product-collection-card-min.scss reads (custom properties only: Spec 32 forbids inline
	 * declarations; the front end gets its scoped rule from includes/product-collection-card-min.php).
	 */
	const withCardMinPreview = createHigherOrderComponent( ( BlockListBlock ) => ( props ) => {
		const tier = usePreviewTier();
		const { attributes, name } = props;
		const min = TARGET_BLOCK_NAME === name && attributes ? resolveResponsiveTier( attributes.sgsCardMinWidth || {}, tier ).value : '';
		if ( ! min ) {
			return <BlockListBlock { ...props } />;
		}
		const wrapperProps = {
			...( props.wrapperProps || {} ),
			className: [ props.wrapperProps?.className, 'sgs-card-min-preview' ].filter( Boolean ).join( ' ' ),
			style: { ...( props.wrapperProps?.style || {} ), '--sgs-card-min': min },
		};
		return <BlockListBlock { ...props } wrapperProps={ wrapperProps } />;
	}, 'withCardMinPreview' );

	addFilter( 'editor.BlockListBlock', 'sgs/product-collection-card-min/preview', withCardMinPreview );
} // end guard: window.__sgsCardMinRegistered
