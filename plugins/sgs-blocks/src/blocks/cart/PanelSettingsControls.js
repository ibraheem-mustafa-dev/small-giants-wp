import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	TextControl,
	ToggleControl,
} from '@wordpress/components';

import SgsFreeTextField from '../../components/SgsFreeTextField';
/**
 * SGS Cart — FR-36-19 inspector controls: the mini-cart panel's own
 * settings (the display-mode select is in TriggerSettingsControls.js). Split out of edit.js to keep the file
 * under the project's 250-line JS budget.
 *
 * @param {Object}   root0                               Props.
 * @param {string}   root0.displayMode                   Current `displayMode` attribute.
 * @param {boolean}  root0.hasPanel                      Whether displayMode is flyout|drawer.
 * @param {string}   root0.panelHeading                  Panel heading text.
 * @param {string}   root0.emptyCartMessage              Empty-cart message text.
 * @param {string}   root0.emptyCartCtaLabel             Empty-cart CTA button text.
 * @param {string}   root0.viewCartLabel                 "View cart" button text.
 * @param {string}   root0.checkoutLabel                 "Checkout" button text.
 * @param {boolean}  root0.autoOpenOnAdd                 Whether the panel auto-opens on add.
 * @param {boolean}  root0.hideOnCartCheckoutPages       Whether the panel is suppressed on cart/checkout.
 * @param {string}   root0.freeDeliveryThresholdOverride Manual free-delivery threshold override.
 * @param {string}   root0.freeDeliveryMessage           The "you're %s away" progress message template.
 * @param {string}   root0.freeDeliverySuccessMessage    The message shown once the threshold is reached.
 * @param {Function} root0.setAttributes                 The block's attribute setter.
 */
export default function PanelSettingsControls( {
	displayMode,
	hasPanel,
	panelHeading,
	emptyCartMessage,
	emptyCartCtaLabel,
	viewCartLabel,
	checkoutLabel,
	autoOpenOnAdd,
	autoOpenDrawerOnAdd,
	hideOnCartCheckoutPages,
	freeDeliveryThresholdOverride,
	freeDeliveryMessage,
	freeDeliverySuccessMessage,
	setAttributes,
} ) {
	return (
		<>
			{ hasPanel && (
				<PanelBody
					title={ __( 'Mini-cart panel', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SgsFreeTextField
						type="rich"
						label={ __( 'Panel heading', 'sgs-blocks' ) }
						value={ panelHeading }
						onChange={ ( val ) =>
							setAttributes( { panelHeading: val } )
						}
					/>
					<SgsFreeTextField
						type="rich"
						label={ __( 'Empty-cart message', 'sgs-blocks' ) }
						value={ emptyCartMessage }
						onChange={ ( val ) =>
							setAttributes( { emptyCartMessage: val } )
						}
					/>
					<SgsFreeTextField
						type="rich"
						noLink
						label={ __( 'Empty-cart button text', 'sgs-blocks' ) }
						value={ emptyCartCtaLabel }
						onChange={ ( val ) =>
							setAttributes( { emptyCartCtaLabel: val } )
						}
					/>
					<SgsFreeTextField
						type="rich"
						noLink
						label={ __( '"View cart" button text', 'sgs-blocks' ) }
						value={ viewCartLabel }
						onChange={ ( val ) =>
							setAttributes( { viewCartLabel: val } )
						}
					/>
					<SgsFreeTextField
						type="rich"
						noLink
						label={ __( '"Checkout" button text', 'sgs-blocks' ) }
						value={ checkoutLabel }
						onChange={ ( val ) =>
							setAttributes( { checkoutLabel: val } )
						}
					/>
					<ToggleControl
						label={ __(
							'Auto-open when an item is added',
							'sgs-blocks'
						) }
						help={ __(
							'The flyout appears without moving keyboard focus and can always be dismissed. A drawer stays closed unless you also turn on "Open the drawer when an item is added" (a modal takeover mid-task can be disruptive).',
							'sgs-blocks'
						) }
						checked={ !! autoOpenOnAdd }
						onChange={ ( val ) =>
							setAttributes( { autoOpenOnAdd: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ 'drawer' === displayMode && autoOpenOnAdd && (
						<ToggleControl
							label={ __(
								'Open the drawer when an item is added',
								'sgs-blocks'
							) }
							help={ __(
								'A drawer takes over the page, so it stays closed unless you turn this on. The "Added to your basket" message still offers View bag.',
								'sgs-blocks'
							) }
							checked={ !! autoOpenDrawerOnAdd }
							onChange={ ( val ) =>
								setAttributes( { autoOpenDrawerOnAdd: val } )
							}
							__nextHasNoMarginBottom
						/>
					) }
					<ToggleControl
						label={ __(
							'Hide the panel on the cart/checkout pages',
							'sgs-blocks'
						) }
						help={ __(
							'The badge still shows; the flyout/drawer is suppressed so it never duplicates the real cart page.',
							'sgs-blocks'
						) }
						checked={ !! hideOnCartCheckoutPages }
						onChange={ ( val ) =>
							setAttributes( { hideOnCartCheckoutPages: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			) }

			{ hasPanel && (
				<PanelBody
					title={ __( 'Free-delivery progress', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __(
							'Threshold override (optional)',
							'sgs-blocks'
						) }
						help={ __(
							"Leave blank to use the WooCommerce free-shipping method's minimum order amount for this store. Leave both blank to hide the bar.",
							'sgs-blocks'
						) }
						type="number"
						value={ freeDeliveryThresholdOverride }
						onChange={ ( val ) =>
							setAttributes( {
								freeDeliveryThresholdOverride: val,
							} )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Progress message', 'sgs-blocks' ) }
						help={ __(
							'%s is replaced with the amount remaining, formatted in the store’s currency.',
							'sgs-blocks'
						) }
						value={ freeDeliveryMessage }
						onChange={ ( val ) =>
							setAttributes( { freeDeliveryMessage: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Success message', 'sgs-blocks' ) }
						value={ freeDeliverySuccessMessage }
						onChange={ ( val ) =>
							setAttributes( { freeDeliverySuccessMessage: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			) }
		</>
	);
}
