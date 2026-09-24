import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, Notice } from '@wordpress/components';
import { IconPreview, ResponsiveBoxControl, SgsColourPanel, ScrimControls } from '../../components';
import { ToolsPanel } from '../../components/primitives';
import { colourVar } from '../../utils';
import MediaElementPanel from '../../components/MediaElementPanel';
import PanelSettingsControls from './PanelSettingsControls';
import TriggerSettingsControls from './TriggerSettingsControls';
import PillBorderControl from './PillBorderControl';
import buildCartColourRows from './colourPanelRows';

// Box-object interface contract §5: base-tier canvas preview shorthand
// (mirrors sgs/buybox + sgs/whatsapp-cta). Tablet/mobile tiers live in
// render.php's own scoped @media rules, which the editor canvas never
// executes.
function boxShorthand( box ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	const { top, right, bottom, left } = box;
	if ( ! top && ! right && ! bottom && ! left ) return undefined;
	return [ top, right, bottom, left ].map( ( v ) => v || '0' ).join( ' ' );
}

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
		iconColourGradient,
		iconColourHover,
		iconColourHoverGradient,
		badgeColour,
		badgeColourGradient,
		badgeTextColour,
		badgeTextColourGradient,
		badgeTextColourHover,
		badgeTextColourHoverGradient,
		ariaLabel,
		showZero,
		hideWhenEmpty,
		margin,
		panelHeading,
		emptyCartMessage,
		emptyCartCtaLabel,
		viewCartLabel,
		checkoutLabel,
		autoOpenOnAdd,
		hideOnCartCheckoutPages,
		panelBg,
		panelBgGradient,
		panelTextColour,
		panelTextColourGradient,
		panelTextColourHover,
		panelTextColourHoverGradient,
		triggerStyle,
		pillLabel,
		pillBorderColour,
		pillBorderWidth,
		pillBorderStyle,
		pillBorderRadius,
		countPopAnimation,
		freeDeliveryThresholdOverride,
		freeDeliveryMessage,
		freeDeliverySuccessMessage,
	} = attributes;

	const hasPanel = 'link' !== ( displayMode || 'link' );
	// Wave 3C U-2 (family M-14): only the drawer display mode has a backdrop —
	// flyout is a plain popover with no page-dimming.
	const hasDrawer = 'drawer' === displayMode;
	// Wave B, U-1 — 'pill' swaps the icon+badge trigger for a word beside the
	// live count, in a pill.
	const hasPill = 'pill' === ( triggerStyle || 'icon' );

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
		margin: boxShorthand( margin?.desktop ),
	};

	const blockProps = useBlockProps( {
		className: `sgs-cart sgs-cart--editor-preview sgs-cart--trigger-${
			hasPill ? 'pill' : 'icon'
		}`,
		style,
	} );

	return (
		<>
			<SgsColourPanel
				rows={ buildCartColourRows( {
					attributes,
					setAttributes,
					hasPanel,
					hasDrawer,
				} ) }
			/>
			<InspectorControls>
				<PanelSettingsControls
					displayMode={ displayMode }
					hasPanel={ hasPanel }
					panelHeading={ panelHeading }
					emptyCartMessage={ emptyCartMessage }
					emptyCartCtaLabel={ emptyCartCtaLabel }
					viewCartLabel={ viewCartLabel }
					checkoutLabel={ checkoutLabel }
					autoOpenOnAdd={ autoOpenOnAdd }
					hideOnCartCheckoutPages={ hideOnCartCheckoutPages }
					freeDeliveryThresholdOverride={ freeDeliveryThresholdOverride }
					freeDeliveryMessage={ freeDeliveryMessage }
					freeDeliverySuccessMessage={ freeDeliverySuccessMessage }
					setAttributes={ setAttributes }
				/>

				<TriggerSettingsControls
					iconName={ iconName }
					iconSize={ iconSize }
					showZero={ showZero }
					hideWhenEmpty={ hideWhenEmpty }
					triggerStyle={ triggerStyle }
					pillLabel={ pillLabel }
					countPopAnimation={ countPopAnimation }
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
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				{ hasPanel && (
					<MediaElementPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
						blockSlug="sgs/cart"
						insertion="root"
						atoms={ [ 'object-fit' ] }
						mediaType="image"
						title={ __( 'Item thumbnail', 'sgs-blocks' ) }
					/>
				) }

				<PillBorderControl
					isPill={ hasPill }
					pillBorderColour={ pillBorderColour }
					pillBorderWidth={ pillBorderWidth }
					pillBorderStyle={ pillBorderStyle }
					pillBorderRadius={ pillBorderRadius }
					contrastAgainst={
						attributes.pillBgColour && ! attributes.pillBgColourGradient
							? attributes.pillBgColour
							: ''
					}
					setAttributes={ setAttributes }
				/>

				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						presets
						values={ {
							base: margin?.desktop ?? {},
							tablet: margin?.tablet ?? {},
							mobile: margin?.mobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							const key = 'base' === tier ? 'desktop' : tier;
							setAttributes( { margin: { ...margin, [ key ]: next } } );
						} }
					/>
				</PanelBody>

				{ /* Wave 3C U-2 (family M-14) — the drawer's scrim (the see-through
				   layer dimming the page behind it). Drawer mode only: a flyout
				   is a plain popover with no page-dimming. */ }
				{ hasDrawer && (
					<ToolsPanel
						label={ __( 'Backdrop', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								scrimColour: '#000000',
								scrimColourGradient: '',
								scrimOpacity: { desktop: 0.55 },
								scrimBlur: {},
							} )
						}
					>
						<ScrimControls attributes={ attributes } setAttributes={ setAttributes } />
					</ToolsPanel>
				) }
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
					style={ {
						borderRadius: hasPill ? pillBorderRadius || undefined : undefined,
						borderColor: hasPill ? colourVar( pillBorderColour ) || undefined : undefined,
					} }
				>
					{ hasPill ? (
						<span className="sgs-cart__pill-label">
							{ pillLabel || __( 'Cart', 'sgs-blocks' ) }
						</span>
					) : (
						<span className="sgs-cart__icon" aria-hidden="true">
							<IconPreview
								source="lucide"
								name={ iconName }
								size={ iconSize }
								gradient={ iconColourGradient }
							/>
						</span>
					) }
					<span
						className={ `sgs-cart__badge${
							hasPill ? ' sgs-cart__badge--pill' : ''
						}${ showZero ? ' sgs-cart__badge--visible' : '' }` }
					>
						0
					</span>
				</span>
			</div>
		</>
	);
}
