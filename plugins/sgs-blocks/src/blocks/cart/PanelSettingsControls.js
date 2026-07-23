import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';

/**
 * SGS Cart — FR-36-19 Phase 2 inspector controls: display mode + the
 * mini-cart panel's own settings. Split out of edit.js to keep the file
 * under the project's 250-line JS budget.
 *
 * @param {Object}   root0                         Props.
 * @param {string}   root0.displayMode             Current `displayMode` attribute.
 * @param {boolean}  root0.hasPanel                Whether displayMode is flyout|drawer.
 * @param {string}   root0.panelHeading            Panel heading text.
 * @param {string}   root0.emptyCartMessage        Empty-cart message text.
 * @param {string}   root0.emptyCartCtaLabel       Empty-cart CTA button text.
 * @param {string}   root0.viewCartLabel           "View cart" button text.
 * @param {string}   root0.checkoutLabel           "Checkout" button text.
 * @param {string}   root0.panelBg                 Panel background colour token.
 * @param {string}   root0.panelTextColour         Panel text colour token.
 * @param {boolean}  root0.autoOpenOnAdd           Whether the panel auto-opens on add.
 * @param {boolean}  root0.hideOnCartCheckoutPages Whether the panel is suppressed on cart/checkout.
 * @param {Function} root0.setAttributes           The block's attribute setter.
 */
export default function PanelSettingsControls( {
	displayMode,
	hasPanel,
	panelHeading,
	emptyCartMessage,
	emptyCartCtaLabel,
	viewCartLabel,
	checkoutLabel,
	panelBg,
	panelTextColour,
	autoOpenOnAdd,
	hideOnCartCheckoutPages,
	setAttributes,
} ) {
	return (
		<>
			<PanelBody title={ __( 'Display mode', 'sgs-blocks' ) }>
				<SelectControl
					label={ __( 'Cart trigger opens', 'sgs-blocks' ) }
					help={ __(
						'Link: goes straight to the cart page. Flyout: a dropdown panel (page stays usable). Drawer: a full off-canvas panel.',
						'sgs-blocks'
					) }
					value={ displayMode || 'link' }
					options={ [
						{
							label: __( 'Link only', 'sgs-blocks' ),
							value: 'link',
						},
						{
							label: __( 'Flyout (dropdown)', 'sgs-blocks' ),
							value: 'flyout',
						},
						{
							label: __( 'Drawer (off-canvas)', 'sgs-blocks' ),
							value: 'drawer',
						},
					] }
					onChange={ ( val ) =>
						setAttributes( { displayMode: val } )
					}
					__nextHasNoMarginBottom
				/>
			</PanelBody>

			{ hasPanel && (
				<PanelBody
					title={ __( 'Mini-cart panel', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Panel heading', 'sgs-blocks' ) }
						value={ panelHeading }
						onChange={ ( val ) =>
							setAttributes( { panelHeading: val } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Empty-cart message', 'sgs-blocks' ) }
						value={ emptyCartMessage }
						onChange={ ( val ) =>
							setAttributes( { emptyCartMessage: val } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Empty-cart button text', 'sgs-blocks' ) }
						value={ emptyCartCtaLabel }
						onChange={ ( val ) =>
							setAttributes( { emptyCartCtaLabel: val } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( '"View cart" button text', 'sgs-blocks' ) }
						value={ viewCartLabel }
						onChange={ ( val ) =>
							setAttributes( { viewCartLabel: val } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( '"Checkout" button text', 'sgs-blocks' ) }
						value={ checkoutLabel }
						onChange={ ( val ) =>
							setAttributes( { checkoutLabel: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Panel background', 'sgs-blocks' ) }
						value={ panelBg }
						onChange={ ( val ) =>
							setAttributes( { panelBg: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Panel text colour', 'sgs-blocks' ) }
						value={ panelTextColour }
						onChange={ ( val ) =>
							setAttributes( { panelTextColour: val } )
						}
					/>
					<ToggleControl
						label={ __(
							'Auto-open when an item is added',
							'sgs-blocks'
						) }
						help={ __(
							'Flyout mode only — the panel appears without moving keyboard focus, and can always be dismissed. Drawer mode never auto-opens (a modal takeover mid-task is disruptive).',
							'sgs-blocks'
						) }
						checked={ !! autoOpenOnAdd }
						onChange={ ( val ) =>
							setAttributes( { autoOpenOnAdd: val } )
						}
						__nextHasNoMarginBottom
					/>
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
		</>
	);
}
