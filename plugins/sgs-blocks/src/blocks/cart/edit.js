import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, Notice } from '@wordpress/components';
import { IconPreview, ResponsiveBoxControl } from '../../components';
import { colourVar } from '../../utils';
import PanelSettingsControls from './PanelSettingsControls';
import TriggerSettingsControls from './TriggerSettingsControls';

/**
 * SGS Cart — block editor component.
 *
 * Shows a static placeholder (icon + badge showing "0" or "•") because
 * WC()->cart is not initialised during the editor render cycle and the
 * Store API is not called in the editor context. This is intentional and
 * matches WooCommerce core's own approach for cart blocks.
 *
 * If WooCommerce is not active (window.sgsCartData.wcActive is falsy) a
 * dismissible notice is shown below the placeholder.
 *
 * @param {Object}   root0               Block edit props.
 * @param {Object}   root0.attributes    The block's current attributes.
 * @param {Function} root0.setAttributes Setter for the block's attributes.
 */
export default function Edit( { attributes, setAttributes } ) {
	const {
		displayMode,
		iconName,
		iconSize,
		iconColour,
		badgeColour,
		badgeTextColour,
		ariaLabel,
		showZero,
		hideWhenEmpty,
		style: blockStyle,
		marginTablet,
		marginMobile,
		panelHeading,
		emptyCartMessage,
		emptyCartCtaLabel,
		viewCartLabel,
		checkoutLabel,
		autoOpenOnAdd,
		hideOnCartCheckoutPages,
		panelBg,
		panelTextColour,
	} = attributes;

	const hasPanel = 'link' !== ( displayMode || 'link' );

	// WooCommerce availability flag — injected by render.php via wp_localize_script
	// equivalent in the editor. Falls back to true when the data object is absent
	// so we don't show spurious warnings on a fresh install.
	const wcActive = window?.sgsCartData?.wcActive !== false;

	const style = {
		'--sgs-cart-icon-size': `${ iconSize }px`,
		'--sgs-cart-icon-colour': colourVar( iconColour ) || undefined,
		'--sgs-cart-badge-colour': colourVar( badgeColour ) || undefined,
		'--sgs-cart-badge-text-colour':
			colourVar( badgeTextColour ) || undefined,
	};

	const blockProps = useBlockProps( {
		className: 'sgs-cart sgs-cart--editor-preview',
		style,
	} );

	return (
		<>
			<InspectorControls>
				<PanelSettingsControls
					displayMode={ displayMode }
					hasPanel={ hasPanel }
					panelHeading={ panelHeading }
					emptyCartMessage={ emptyCartMessage }
					emptyCartCtaLabel={ emptyCartCtaLabel }
					viewCartLabel={ viewCartLabel }
					checkoutLabel={ checkoutLabel }
					panelBg={ panelBg }
					panelTextColour={ panelTextColour }
					autoOpenOnAdd={ autoOpenOnAdd }
					hideOnCartCheckoutPages={ hideOnCartCheckoutPages }
					setAttributes={ setAttributes }
				/>

				<TriggerSettingsControls
					iconName={ iconName }
					iconSize={ iconSize }
					iconColour={ iconColour }
					badgeColour={ badgeColour }
					badgeTextColour={ badgeTextColour }
					showZero={ showZero }
					hideWhenEmpty={ hideWhenEmpty }
					setAttributes={ setAttributes }
				/>

				<PanelBody
					title={ __( 'Accessibility', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Trigger aria-label', 'sgs-blocks' ) }
						help={ __(
							'Screen reader label for the cart link. The live item count is appended automatically.',
							'sgs-blocks'
						) }
						value={ ariaLabel }
						onChange={ ( val ) =>
							setAttributes( { ariaLabel: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						values={ {
							base: blockStyle?.spacing?.margin ?? {},
							tablet: marginTablet ?? {},
							mobile: marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( {
									style: {
										...blockStyle,
										spacing: {
											...blockStyle?.spacing,
											margin: next,
										},
									},
								} );
							} else {
								setAttributes( {
									[ `margin${
										'tablet' === tier ? 'Tablet' : 'Mobile'
									}` ]: next,
								} );
							}
						} }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* Editor canvas — static placeholder only */ }
			<div { ...blockProps }>
				{ ! wcActive && (
					<Notice
						status="warning"
						isDismissible={ false }
						className="sgs-cart__editor-notice"
					>
						{ __(
							'WooCommerce is not active. The cart badge will be hidden on the frontend until WooCommerce is installed and activated.',
							'sgs-blocks'
						) }
					</Notice>
				) }
				<span
					className="sgs-cart__trigger sgs-cart__trigger--editor"
					aria-label={ ariaLabel }
				>
					<span className="sgs-cart__icon" aria-hidden="true">
						<IconPreview
							source="lucide"
							name={ iconName }
							size={ iconSize }
						/>
					</span>
					<span
						className={ `sgs-cart__badge${
							showZero ? ' sgs-cart__badge--visible' : ''
						}` }
					>
						0
					</span>
				</span>
			</div>
		</>
	);
}
