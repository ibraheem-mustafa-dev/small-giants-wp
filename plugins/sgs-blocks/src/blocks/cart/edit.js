import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	ToggleControl,
	TextControl,
	Notice,
} from '@wordpress/components';
import { DesignTokenPicker, IconPicker, IconPreview, ResponsiveBoxControl } from '../../components';
import { colourVar } from '../../utils';

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
 */
export default function Edit( { attributes, setAttributes } ) {
	const {
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
	} = attributes;

	// WooCommerce availability flag — injected by render.php via wp_localize_script
	// equivalent in the editor. Falls back to true when the data object is absent
	// so we don't show spurious warnings on a fresh install.
	const wcActive = window?.sgsCartData?.wcActive !== false;

	const style = {
		'--sgs-cart-icon-size': `${ iconSize }px`,
		'--sgs-cart-icon-colour': colourVar( iconColour ) || undefined,
		'--sgs-cart-badge-colour': colourVar( badgeColour ) || undefined,
		'--sgs-cart-badge-text-colour': colourVar( badgeTextColour ) || undefined,
	};

	const blockProps = useBlockProps( {
		className: 'sgs-cart sgs-cart--editor-preview',
		style,
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Icon', 'sgs-blocks' ) }>
					<IconPicker
						label={ __( 'Cart icon', 'sgs-blocks' ) }
						value={ { source: 'lucide', name: iconName } }
						onChange={ ( { name } ) =>
							setAttributes( { iconName: name } )
						}
					/>
					<RangeControl
						label={ __( 'Icon size (px)', 'sgs-blocks' ) }
						value={ iconSize }
						onChange={ ( val ) => setAttributes( { iconSize: val } ) }
						min={ 16 }
						max={ 64 }
						step={ 4 }
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Icon colour', 'sgs-blocks' ) }
						value={ iconColour }
						onChange={ ( val ) => setAttributes( { iconColour: val } ) }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Badge', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Badge background', 'sgs-blocks' ) }
						value={ badgeColour }
						onChange={ ( val ) => setAttributes( { badgeColour: val } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Badge text colour', 'sgs-blocks' ) }
						value={ badgeTextColour }
						onChange={ ( val ) =>
							setAttributes( { badgeTextColour: val } )
						}
					/>
					<ToggleControl
						label={ __( 'Show badge when cart is empty', 'sgs-blocks' ) }
						help={ __(
							'When off, the badge hides until there is at least one item in the cart.',
							'sgs-blocks'
						) }
						checked={ showZero }
						onChange={ ( val ) => setAttributes( { showZero: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Hide cart until it has items', 'sgs-blocks' ) }
						help={ __(
							'When on, the cart icon is hidden entirely until at least one item is in the cart.',
							'sgs-blocks'
						) }
						checked={ hideWhenEmpty }
						onChange={ ( val ) =>
							setAttributes( { hideWhenEmpty: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

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
						onChange={ ( val ) => setAttributes( { ariaLabel: val } ) }
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
								setAttributes( { style: { ...blockStyle, spacing: { ...blockStyle?.spacing, margin: next } } } );
							} else {
								setAttributes( { [ `margin${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
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
						<IconPreview source="lucide" name={ iconName } size={ iconSize } />
					</span>
					<span
						className={ `sgs-cart__badge${ showZero ? ' sgs-cart__badge--visible' : '' }` }
					>
						0
					</span>
				</span>
			</div>
		</>
	);
}
