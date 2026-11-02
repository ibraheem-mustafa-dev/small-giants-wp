import { __, sprintf } from '@wordpress/i18n';
import { PanelBody, RangeControl, ToggleControl } from '@wordpress/components';
import { IconPicker, ResponsiveControl } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

import SgsFreeTextField from '../../components/SgsFreeTextField';
/**
 * SGS Cart — Trigger style + Icon + Badge inspector controls. Split out of
 * edit.js to keep the file under the project's 250-line JS budget.
 *
 * @param {Object}   root0                    Props.
 * @param {string}   root0.iconName           Current icon name.
 * @param {number}   root0.iconSize           Current icon size (px).
 * @param {boolean}  root0.showZero           Whether the badge shows on a zero count.
 * @param {boolean}  root0.hideWhenEmpty      Whether the whole trigger hides until non-empty.
 * @param {string}   root0.triggerStyle       Desktop style: 'icon' (icon+badge) or 'pill' (word+count).
 * @param {string}   root0.triggerStyleTablet Tablet override ('' inherits desktop).
 * @param {string}   root0.triggerStyleMobile Mobile override ('' inherits tablet).
 * @param {boolean}  root0.pillShowIcon       Whether a pill tier shows the icon before the word.
 * @param {string}   root0.pillLabel          The pill trigger's editable word (e.g. "Cart"/"Bag").
 * @param {string}   root0.pillCountStyle     'plain' (count as text) or 'bubble' (round filled chip).
 * @param {Function} root0.setAttributes      The block's attribute setter.
 */
export default function TriggerSettingsControls( {
	iconName,
	iconSize,
	showZero,
	hideWhenEmpty,
	triggerStyle,
	triggerStyleTablet,
	triggerStyleMobile,
	pillShowIcon,
	pillLabel,
	pillCountStyle,
	setAttributes,
} ) {
	const desktopStyle = 'pill' === triggerStyle ? 'pill' : 'icon';
	const tabletStyle = [ 'icon', 'pill' ].includes( triggerStyleTablet ) ? triggerStyleTablet : desktopStyle;
	const mobileStyle = [ 'icon', 'pill' ].includes( triggerStyleMobile ) ? triggerStyleMobile : tabletStyle;
	// Any tier on the pill shows the pill's own settings.
	const isPill = [ desktopStyle, tabletStyle, mobileStyle ].includes( 'pill' );
	const styleName = ( value ) => ( 'pill' === value ? __( 'Text pill', 'sgs-blocks' ) : __( 'Icon', 'sgs-blocks' ) );

	return (
		<>
			<PanelBody title={ __( 'Trigger style', 'sgs-blocks' ) }>
				<ResponsiveControl label={ __( 'Trigger shows', 'sgs-blocks' ) }>
					{ ( breakpoint ) => {
						const isDesktop = 'desktop' === breakpoint;
						const isTablet = 'tablet' === breakpoint;
						const own = isDesktop ? desktopStyle : ( ( isTablet ? triggerStyleTablet : triggerStyleMobile ) || 'inherit' );
						const attrKey = isDesktop ? 'triggerStyle' : ( isTablet ? 'triggerStyleTablet' : 'triggerStyleMobile' );
						const parent = isTablet ? desktopStyle : tabletStyle;
						return (
							<ToggleGroupControl
								label={ __( 'Trigger shows', 'sgs-blocks' ) }
								hideLabelFromVision
								help={ __(
									'Icon: the cart icon with a count badge. Text pill: an editable word (e.g. "Cart" or "Bag") with the count beside it, in a pill. Set a different style per device; one button and one drawer print either way.',
									'sgs-blocks'
								) }
								value={ own }
								onChange={ ( val ) => setAttributes( { [ attrKey ]: 'inherit' === val ? '' : val } ) }
								isBlock
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							>
								{ ! isDesktop && (
									<ToggleGroupControlOption
										value="inherit"
										label={ sprintf(
											/* translators: 1: the tier above, 2: its trigger style. */
											__( 'Inherit (%1$s: %2$s)', 'sgs-blocks' ),
											isTablet ? __( 'Desktop', 'sgs-blocks' ) : __( 'Tablet', 'sgs-blocks' ),
											styleName( parent )
										) }
									/>
								) }
								<ToggleGroupControlOption value="icon" label={ __( 'Icon', 'sgs-blocks' ) } />
								<ToggleGroupControlOption value="pill" label={ __( 'Text pill', 'sgs-blocks' ) } />
							</ToggleGroupControl>
						);
					} }
				</ResponsiveControl>
				{ isPill && (
					<SgsFreeTextField type="rich" noLink
						label={ __( 'Pill label', 'sgs-blocks' ) }
						value={ pillLabel }
						onChange={ ( val ) => setAttributes( { pillLabel: val } ) }
					/>
				) }
				{ isPill && (
					<ToggleControl
						label={ __( 'Show the icon in the pill', 'sgs-blocks' ) }
						help={ __( 'Puts the cart icon, at the icon size below, before the word.', 'sgs-blocks' ) }
						checked={ !! pillShowIcon }
						onChange={ ( val ) => setAttributes( { pillShowIcon: val } ) }
						__nextHasNoMarginBottom
					/>
				) }
				{ isPill && (
					<ToggleGroupControl
						label={ __( 'Count shows as', 'sgs-blocks' ) }
						help={ __(
							'Plain: the number beside the word. Bubble: a round chip filled with the badge colours.',
							'sgs-blocks'
						) }
						value={ pillCountStyle || 'plain' }
						onChange={ ( val ) => setAttributes( { pillCountStyle: val } ) }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="plain" label={ __( 'Plain number', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="bubble" label={ __( 'Bubble', 'sgs-blocks' ) } />
					</ToggleGroupControl>
				) }
				{ /* Pill border colour + radius moved to the Styles tab's "Pill
				   border" panel (edit.js) — Spec 35 §14 / C1: border colour is
				   excluded from SgsColourPanel; radius sits with it as the pair. */ }
				<p>
					{ __(
						'The count animation is set by the Motion panel on the Badge part (Entrance, trigger State).',
						'sgs-blocks'
					) }
				</p>
			</PanelBody>

			<PanelBody title={ __( 'Icon', 'sgs-blocks' ) } initialOpen={ false }>
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
					__next40pxDefaultSize
				/>
			</PanelBody>

			<PanelBody
				title={ __( 'Badge', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<ToggleControl
					label={ __(
						'Show badge when cart is empty',
						'sgs-blocks'
					) }
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
		</>
	);
}
