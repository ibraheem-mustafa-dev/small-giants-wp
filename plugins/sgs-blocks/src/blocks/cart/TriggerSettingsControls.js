import { __, sprintf } from '@wordpress/i18n';
import { PanelBody, RangeControl, ToggleControl } from '@wordpress/components';
import {
	IconPicker,
	ResponsiveControl,
	ResponsiveBoxControl,
	SgsLengthControl,
} from '../../components';
import { ShapeSizeControl } from '../icon/inspector-shape';
import { resolveTier, patchTier } from '../../utils';
import {
	ToggleGroupControl,
	ToggleGroupControlOption,
} from '../../components/primitives';

import SgsFreeTextField from '../../components/SgsFreeTextField';

// One CSS length for the whole button, in px or %.
const RADIUS_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: '%', label: '%', default: 0 },
];

/**
 * SGS Cart — Trigger style + Icon + Badge inspector controls. Split out of
 * edit.js to keep the file under the project's 250-line JS budget.
 *
 * @param {Object}   root0                    Props.
 * @param {string}   root0.iconName           Current icon name.
 * @param {string}   root0.iconSource         'lucide' or 'custom' (a pasted SVG).
 * @param {string}   root0.iconSvg            The pasted SVG markup when iconSource is 'custom'.
 * @param {Object}   root0.iconSize           Icon size (px) per breakpoint: `{desktop,tablet,mobile}`.
 * @param {Object}   root0.showZero           Per breakpoint, whether the badge shows on a zero count.
 * @param {Object}   root0.badgeSize          Icon badge size (px) per breakpoint.
 * @param {Object}   root0.pillBadgeSize      Pill count bubble size (px) per breakpoint.
 * @param {Object}   root0.attributes         The block's attributes (the trigger's size, padding and radius).
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
	iconSource,
	iconSvg,
	iconSize,
	showZero,
	badgeSize,
	pillBadgeSize,
	attributes,
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
	const tabletStyle = [ 'icon', 'pill' ].includes( triggerStyleTablet )
		? triggerStyleTablet
		: desktopStyle;
	const mobileStyle = [ 'icon', 'pill' ].includes( triggerStyleMobile )
		? triggerStyleMobile
		: tabletStyle;
	// Any tier on the pill shows the pill's own settings.
	const isPill = [ desktopStyle, tabletStyle, mobileStyle ].includes(
		'pill'
	);
	const hasIconTier = [ desktopStyle, tabletStyle, mobileStyle ].includes(
		'icon'
	);
	const triggerPadding = attributes.triggerPadding;
	const styleName = ( value ) =>
		'pill' === value
			? __( 'Text pill', 'sgs-blocks' )
			: __( 'Icon', 'sgs-blocks' );

	return (
		<>
			<PanelBody initialOpen={ false } title={ __( 'Trigger style', 'sgs-blocks' ) }>
				<ResponsiveControl
					label={ __( 'Trigger shows', 'sgs-blocks' ) }
				>
					{ ( breakpoint ) => {
						const isDesktop = 'desktop' === breakpoint;
						const isTablet = 'tablet' === breakpoint;
						const own = isDesktop
							? desktopStyle
							: ( isTablet
									? triggerStyleTablet
									: triggerStyleMobile ) || 'inherit';
						const attrKey = isDesktop
							? 'triggerStyle'
							: isTablet
							? 'triggerStyleTablet'
							: 'triggerStyleMobile';
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
								onChange={ ( val ) =>
									setAttributes( {
										[ attrKey ]:
											'inherit' === val ? '' : val,
									} )
								}
								isBlock
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							>
								{ ! isDesktop && (
									<ToggleGroupControlOption
										value="inherit"
										label={ sprintf(
											/* translators: 1: the tier above, 2: its trigger style. */
											__(
												'Inherit (%1$s: %2$s)',
												'sgs-blocks'
											),
											isTablet
												? __( 'Desktop', 'sgs-blocks' )
												: __( 'Tablet', 'sgs-blocks' ),
											styleName( parent )
										) }
									/>
								) }
								<ToggleGroupControlOption
									value="icon"
									label={ __( 'Icon', 'sgs-blocks' ) }
								/>
								<ToggleGroupControlOption
									value="pill"
									label={ __( 'Text pill', 'sgs-blocks' ) }
								/>
							</ToggleGroupControl>
						);
					} }
				</ResponsiveControl>
				{ isPill && (
					<SgsFreeTextField
						type="rich"
						noLink
						label={ __( 'Pill label', 'sgs-blocks' ) }
						value={ pillLabel }
						onChange={ ( val ) =>
							setAttributes( { pillLabel: val } )
						}
					/>
				) }
				{ isPill && (
					<ToggleControl
						label={ __(
							'Show the icon in the pill',
							'sgs-blocks'
						) }
						help={ __(
							'Puts the cart icon, at the icon size below, before the word.',
							'sgs-blocks'
						) }
						checked={ !! pillShowIcon }
						onChange={ ( val ) =>
							setAttributes( { pillShowIcon: val } )
						}
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
						onChange={ ( val ) =>
							setAttributes( { pillCountStyle: val } )
						}
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption
							value="plain"
							label={ __( 'Plain number', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="bubble"
							label={ __( 'Bubble', 'sgs-blocks' ) }
						/>
					</ToggleGroupControl>
				) }
				{ /* The pill's border colour sits on the Styles tab's "Pill border"
				   panel (edit.js) — Spec 35 §14 / C1: border colour is excluded
				   from SgsColourPanel. */ }
				<p>
					{ __(
						'The count animation is set by the Motion panel on the Badge part (Entrance, trigger State).',
						'sgs-blocks'
					) }
				</p>
			</PanelBody>

			<PanelBody
				title={ __( 'Button', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<ShapeSizeControl
					label={ __( 'Button size', 'sgs-blocks' ) }
					attr="triggerSize"
					attributes={ attributes }
					setAttributes={ setAttributes }
					widthLabel={ __( 'Width', 'sgs-blocks' ) }
					heightLabel={ __( 'Height', 'sgs-blocks' ) }
					showWidth={ hasIconTier }
					widthHelp={ __(
						'Icon button only: a text pill is as wide as its label. A size set here replaces the 44px tap area at that device.',
						'sgs-blocks'
					) }
					heightHelp={ __(
						'Leave blank for the 44px tap area.',
						'sgs-blocks'
					) }
				/>
				<ResponsiveBoxControl
					label={ __( 'Button padding', 'sgs-blocks' ) }
					presets
					values={ {
						base: triggerPadding?.desktop ?? {},
						tablet: triggerPadding?.tablet ?? {},
						mobile: triggerPadding?.mobile ?? {},
					} }
					onChange={ ( tier, next ) => {
						const key = 'base' === tier ? 'desktop' : tier;
						setAttributes( {
							triggerPadding: {
								...( triggerPadding || {} ),
								[ key ]: next,
							},
						} );
					} }
				/>
				<SgsLengthControl
					label={ __( 'Button radius', 'sgs-blocks' ) }
					value={ attributes.triggerBorderRadius || '' }
					units={ RADIUS_UNITS }
					onChange={ ( val ) =>
						setAttributes( { triggerBorderRadius: val ?? '' } )
					}
					help={ __(
						'Leave blank for the default corners (square-ish for the icon button, fully rounded for the pill); 999px makes it round.',
						'sgs-blocks'
					) }
					presets={ false }
				/>
			</PanelBody>

			<PanelBody
				title={ __( 'Icon', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<IconPicker
					label={ __( 'Cart icon', 'sgs-blocks' ) }
					value={ {
						source: 'custom' === iconSource ? 'custom' : 'lucide',
						name: iconName,
						svg: 'custom' === iconSource ? iconSvg : undefined,
					} }
					sources={ [ 'lucide', 'custom' ] }
					onChange={ ( { source, name, svg } ) =>
						setAttributes(
							'custom' === source
								? { iconSource: 'custom', iconSvg: svg }
								: {
										iconSource: 'lucide',
										iconSvg: '',
										iconName: name,
								  }
						)
					}
				/>
				<ResponsiveControl
					label={ __( 'Icon size (px)', 'sgs-blocks' ) }
					value={ iconSize }
					isInherited={ ( tier ) =>
						resolveTier( iconSize, tier, 24 ).inherited
					}
					resolvedValue={ ( tier ) =>
						`${ resolveTier( iconSize, tier, 24 ).value }px`
					}
					onReset={ ( tier ) =>
						patchTier(
							{ iconSize },
							setAttributes,
							'iconSize',
							tier,
							null
						)
					}
				>
					{ ( tier ) => (
						<RangeControl
							label={ __( 'Icon size (px)', 'sgs-blocks' ) }
							hideLabelFromVision
							value={ resolveTier( iconSize, tier, 24 ).value }
							onChange={ ( val ) =>
								patchTier(
									{ iconSize },
									setAttributes,
									'iconSize',
									tier,
									val ?? null
								)
							}
							min={ 16 }
							max={ 64 }
							step={ 4 }
							help={ __(
								'Icon trigger only. A size set here lets the button wrap the icon instead of keeping its 44px tap area.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</ResponsiveControl>
			</PanelBody>

			<PanelBody
				title={ __( 'Badge', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<ResponsiveControl
					label={ __(
						'Show badge when cart is empty',
						'sgs-blocks'
					) }
					value={ showZero }
					isInherited={ ( tier ) =>
						resolveTier( showZero, tier, false ).inherited
					}
					resolvedValue={ ( tier ) =>
						resolveTier( showZero, tier, false ).value
							? __( 'Shown', 'sgs-blocks' )
							: __( 'Hidden', 'sgs-blocks' )
					}
					onReset={ ( tier ) =>
						patchTier(
							{ showZero },
							setAttributes,
							'showZero',
							tier,
							null
						)
					}
				>
					{ ( tier ) => (
						<ToggleControl
							label={ __(
								'Show badge when cart is empty',
								'sgs-blocks'
							) }
							hideLabelFromVision
							help={ __(
								'When off, the badge hides until there is at least one item in the cart. The editor preview counts as an empty cart, so it shows this setting for the device you are previewing.',
								'sgs-blocks'
							) }
							checked={
								!! resolveTier( showZero, tier, false ).value
							}
							onChange={ ( val ) =>
								patchTier(
									{ showZero },
									setAttributes,
									'showZero',
									tier,
									val
								)
							}
							__nextHasNoMarginBottom
						/>
					) }
				</ResponsiveControl>
				<ResponsiveControl
					label={ __( 'Icon badge size (px)', 'sgs-blocks' ) }
					value={ badgeSize }
					isInherited={ ( tier ) =>
						resolveTier( badgeSize, tier, 18 ).inherited
					}
					resolvedValue={ ( tier ) =>
						`${ resolveTier( badgeSize, tier, 18 ).value }px`
					}
					onReset={ ( tier ) =>
						patchTier(
							{ badgeSize },
							setAttributes,
							'badgeSize',
							tier,
							null
						)
					}
				>
					{ ( tier ) => (
						<RangeControl
							label={ __( 'Icon badge size (px)', 'sgs-blocks' ) }
							hideLabelFromVision
							value={ resolveTier( badgeSize, tier, 18 ).value }
							onChange={ ( val ) =>
								patchTier(
									{ badgeSize },
									setAttributes,
									'badgeSize',
									tier,
									val ?? null
								)
							}
							min={ 10 }
							max={ 40 }
							help={ __(
								'Icon trigger only: the round count badge on the icon.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</ResponsiveControl>
				{ isPill && (
					<ResponsiveControl
						label={ __(
							'Pill count bubble size (px)',
							'sgs-blocks'
						) }
						value={ pillBadgeSize }
						isInherited={ ( tier ) =>
							resolveTier( pillBadgeSize, tier, 20 ).inherited
						}
						resolvedValue={ ( tier ) =>
							`${
								resolveTier( pillBadgeSize, tier, 20 ).value
							}px`
						}
						onReset={ ( tier ) =>
							patchTier(
								{ pillBadgeSize },
								setAttributes,
								'pillBadgeSize',
								tier,
								null
							)
						}
					>
						{ ( tier ) => (
							<RangeControl
								label={ __(
									'Pill count bubble size (px)',
									'sgs-blocks'
								) }
								hideLabelFromVision
								value={
									resolveTier( pillBadgeSize, tier, 20 ).value
								}
								onChange={ ( val ) =>
									patchTier(
										{ pillBadgeSize },
										setAttributes,
										'pillBadgeSize',
										tier,
										val ?? null
									)
								}
								min={ 10 }
								max={ 40 }
								help={ __(
									'Text pill only, and only when the count shows as a bubble.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveControl>
				) }
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
