import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, useSettings } from '@wordpress/block-editor';
import { PanelBody, TextControl, Notice } from '@wordpress/components';
import { IconPreview, ResponsiveBoxControl, SgsColourPanel, ScrimControls, TypographyControls, ResponsiveOverride, SgsLengthControl } from '../../components';
import { ToolsPanel } from '../../components/primitives';
import { colourVar, usePreviewTier, tierBoxLonghands } from '../../utils';
import MediaElementPanel from '../../components/MediaElementPanel';
import PanelSettingsControls from './PanelSettingsControls';
import TriggerSettingsControls from './TriggerSettingsControls';
import PillBorderControl from './PillBorderControl';
import buildCartColourRows from './colourPanelRows';
import buildPanelColourRows from './panelColourRows';
import PanelContentControls from './PanelContentControls';
import PanelDesignControls from './PanelDesignControls';
import PanelPreview from './PanelPreview';
import { triggerStyles } from './panel-preview-style';

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
 * @param {string}   root0.name          The block's registered name.
 */
export default function Edit( { attributes, setAttributes, name } ) {
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

	const previewTier = usePreviewTier();
	const [ palette ] = useSettings( 'color.palette' );
	const parts = triggerStyles( attributes, previewTier, palette, hasPill );
	const marginLonghands = tierBoxLonghands( margin, previewTier, 'margin' );
	const style = {
		'--sgs-cart-icon-size': `${ iconSize }px`,
		'--sgs-cart-icon-colour': colourVar( iconColour ) || undefined,
		'--sgs-cart-badge-colour': colourVar( badgeColour ) || undefined,
		'--sgs-cart-badge-text-colour':
			colourVar( badgeTextColour ) || undefined,
		...marginLonghands,
	};

	const blockProps = useBlockProps( {
		className: `sgs-cart sgs-cart--editor-preview sgs-cart--trigger-${
			hasPill ? 'pill' : 'icon'
		}${ hasPill && 'bubble' === attributes.pillCountStyle ? ' sgs-cart--pill-count-bubble' : '' }`,
		style,
	} );

	return (
		<>
			<SgsColourPanel
				rows={ [
					...buildCartColourRows( {
						attributes,
						setAttributes,
						hasPanel,
						hasDrawer,
					} ),
					...buildPanelColourRows( { attributes, setAttributes, hasPanel } ),
				] }
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

				<PanelContentControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					hasPanel={ hasPanel }
				/>

				<TriggerSettingsControls
					iconName={ iconName }
					iconSize={ iconSize }
					showZero={ showZero }
					hideWhenEmpty={ hideWhenEmpty }
					triggerStyle={ triggerStyle }
					pillLabel={ pillLabel }
					pillCountStyle={ attributes.pillCountStyle }
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
				<PanelDesignControls
					name={ name }
					attributes={ attributes }
					setAttributes={ setAttributes }
					hasPanel={ hasPanel }
					hasDrawer={ hasDrawer }
				/>
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

				{ hasPill && (
					<PanelBody
						title={ __( 'Pill text and size', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix="pill"
							showWeight
							showStyle={ false }
							showLineHeight={ false }
							showLetterSpacing
							showTransform
						/>
						<ResponsiveOverride
							label={ __( 'Minimum height', 'sgs-blocks' ) }
							value={ attributes.pillMinHeight }
							onChange={ ( obj ) => setAttributes( { pillMinHeight: obj } ) }
						>
							{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
								<SgsLengthControl
									presets={ false }
									label={ __( 'Minimum height', 'sgs-blocks' ) }
									hideLabelFromVision
									help={ __( 'Empty keeps the 44px touch-target height.', 'sgs-blocks' ) }
									value={ ownValue || '' }
									placeholder={ inherited ? effectiveValue : '44px' }
									onChange={ ( val ) => setOwnValue( val || '' ) }
								/>
							) }
						</ResponsiveOverride>
					</PanelBody>
				) }

				{ ( ! hasPill || 'bubble' === attributes.pillCountStyle ) && (
					<PanelBody
						title={ __( 'Count badge text', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix="badge"
							showWeight
							showStyle={ false }
							showLineHeight={ false }
						/>
					</PanelBody>
				) }

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
					style={ parts.trigger }
				>
					{ hasPill ? (
						<span className="sgs-cart__pill-label" style={ parts.pillLabel }>
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
						style={ parts.badge }
					>
						0
					</span>
				</span>
				{ hasPanel && (
					<PanelPreview attributes={ attributes } displayMode={ displayMode } tier={ previewTier } palette={ palette } />
				) }
			</div>
		</>
	);
}
