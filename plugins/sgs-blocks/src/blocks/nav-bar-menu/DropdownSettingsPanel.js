import { __ } from '@wordpress/i18n';
import EasingAtom from '../../components/motion/EasingAtom';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	RangeControl,
} from '@wordpress/components';
import { ResponsiveOverride, SgsLengthControl } from '../../components';

/**
 * SGS Nav Bar Menu (sgs/nav-bar-menu) — Settings tab panels: Accessibility, Dropdown menus.
 *
 * Sibling of MenuSettingsPanel.js; kept separate to stay under the project's
 * 250-line JS budget. Both are mounted from edit.js's `<InspectorControls>`
 * (default group) block. The "Panel this burger opens" picker (`drawerRef`)
 * lives in the "Menu Button" panel (`BurgerDrawerRows.js`).
 *
 * @param {Object}   root0                    Props.
 * @param {string}   root0.navLabel           The block's `navLabel` attribute.
 * @param {Function} root0.setAttributes      The block's attribute setter.
 * @param {string}   root0.submenuAlign       The block's `submenuAlign` attribute.
 * @param {Object}   root0.megaAlign          The block's `megaAlign` attribute (a tier object).
 * @param {boolean}  root0.submenuCaret       The block's `submenuCaret` attribute.
 * @param {number}   root0.submenuCloseGrace  The block's `submenuCloseGrace` attribute.
 * @param {number}   root0.submenuIntentDelay The block's `submenuIntentDelay` attribute.
 * @param {string}   root0.submenuOpenOn      The block's `submenuOpenOn` attribute.
 * @param {boolean}  root0.submenuOpenOnFocus The block's `submenuOpenOnFocus` attribute.
 */
/**
 * Panel placements lined up with the page (Spec 36 FR-36-4 "Panel placement"),
 * shared by the dropdown and mega selects.
 */
const PAGE_PLACEMENTS = [
	{ label: __( 'Centred on the page', 'sgs-blocks' ), value: 'page-centred' },
	{ label: __( 'Full width', 'sgs-blocks' ), value: 'full-width' },
];

/** Panel placements lined up with the menu item. */
const ITEM_PLACEMENTS = [
	{ label: __( 'Left edge of the menu item', 'sgs-blocks' ), value: 'start' },
	{
		label: __( 'Centred under the menu item', 'sgs-blocks' ),
		value: 'center',
	},
	{ label: __( 'Right edge of the menu item', 'sgs-blocks' ), value: 'end' },
];

export default function DropdownSettingsPanel( {
	navLabel,
	itemSmartContrast,
	setAttributes,
	submenuAlign,
	megaAlign,
	submenuCaret,
	submenuCaretSize,
	submenuCaretOpacity,
	submenuCaretOpacityHover,
	submenuCaretGap,
	submenuCaretTurnDuration,
	submenuCaretTurnEasing,
	submenuCaretTurnEasingCustom,
	submenuCloseGrace,
	submenuIntentDelay,
	submenuOpenOn,
	submenuOpenOnFocus,
	itemHoverScope,
} ) {
	return (
		<>
			<PanelBody
				title={ __( 'Accessibility', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<TextControl
					label={ __( 'Navigation label', 'sgs-blocks' ) }
					value={ navLabel }
					placeholder={ __(
						'Auto — from the menu name',
						'sgs-blocks'
					) }
					onChange={ ( val ) => setAttributes( { navLabel: val } ) }
					help={ __(
						'Accessible name for this menu landmark. Leave blank to use the chosen menu’s own name, so two menus are named apart automatically. Set it only to override that (e.g. Primary, Footer).',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>

				{ /* Spec 36 §14.9.5 / FR-41-27. It sits beside the navigation label
				   because both answer "does this menu behave safely for every
				   visitor", which is what a General-tab Accessibility panel is for.
				   Default OFF — an explicit colour always renders as-authored
				   unless this is switched ON. The readability CHECK itself is
				   unconditional regardless of this toggle: the item-text row below
				   always shows an advisory note when the hover colour would be hard
				   to read, and points back here.
				   ⛔ No "WCAG", no "contrast ratio", no "AA" in any client-visible
				   string on this block (FR-41-5). */ }
				<ToggleControl
					label={ __(
						'Keep text readable automatically',
						'sgs-blocks'
					) }
					checked={ itemSmartContrast === true }
					onChange={ ( val ) =>
						setAttributes( { itemSmartContrast: val } )
					}
					help={ __(
						'When you set a background, we can check your text colour stays readable against it and swap in a readable one if it doesn’t. Off by default, so your chosen colour always renders exactly as picked — switch this on to have it corrected automatically instead.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
				/>
			</PanelBody>

			<PanelBody
				title={ __( 'Dropdown menus', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<p style={ { marginTop: 0 } }>
					{ __(
						'These settings apply to any menu item that has items nested under it in Appearance → Menus. Nothing here needs changing for a flat menu.',
						'sgs-blocks'
					) }
				</p>
				<SelectControl
					label={ __( 'Open from', 'sgs-blocks' ) }
					value={ submenuAlign || 'start' }
					options={ [
						{
							label: __(
								'Left edge of the menu item',
								'sgs-blocks'
							),
							value: 'start',
						},
						{
							label: __(
								'Centred under the menu item',
								'sgs-blocks'
							),
							value: 'center',
						},
						{
							label: __(
								'Right edge of the menu item',
								'sgs-blocks'
							),
							value: 'end',
						},
						...PAGE_PLACEMENTS,
					] }
					onChange={ ( value ) =>
						setAttributes( { submenuAlign: value } )
					}
					help={ __(
						'Left is the usual choice: the first item sits closest to where the visitor clicked. If a dropdown would run off the edge of the screen it moves back inside, whichever option you pick.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<ResponsiveOverride
					label={ __( 'Mega panels open from', 'sgs-blocks' ) }
					value={
						megaAlign && typeof megaAlign === 'object'
							? megaAlign
							: {}
					}
					onChange={ ( obj ) => setAttributes( { megaAlign: obj } ) }
				>
					{ ( { ownValue, effectiveValue, setOwnValue } ) => (
						<SelectControl
							hideLabelFromVision
							label={ __(
								'Mega panels open from',
								'sgs-blocks'
							) }
							value={
								ownValue || effectiveValue || 'page-centred'
							}
							options={ [
								...PAGE_PLACEMENTS,
								...ITEM_PLACEMENTS,
							] }
							onChange={ ( value ) =>
								setOwnValue( value || undefined )
							}
							help={ __(
								'Centred on the page is the usual choice for a wide panel. Set a different placement per device if needed.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</ResponsiveOverride>
				<ToggleControl
					label={ __(
						'Show a small arrow on items that open',
						'sgs-blocks'
					) }
					checked={ submenuCaret !== false }
					onChange={ ( value ) =>
						setAttributes( { submenuCaret: value } )
					}
					help={ __(
						'The arrow tells visitors the item has more beneath it. Turning it off hides that cue.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
				/>
				{ submenuCaret !== false && (
					<>
						<SgsLengthControl
							scale="font-size"
							label={ __( 'Arrow size', 'sgs-blocks' ) }
							value={ submenuCaretSize || '' }
							onChange={ ( value ) =>
								setAttributes( {
									submenuCaretSize: value || '',
								} )
							}
							help={ __(
								"Empty rides the item's own font size.",
								'sgs-blocks'
							) }
							units={ [ { value: 'px', label: 'px' } ] }
							presets={ false }
						/>
						<SgsLengthControl
							label={ __( 'Gap from the label', 'sgs-blocks' ) }
							value={ submenuCaretGap || '' }
							onChange={ ( value ) =>
								setAttributes( {
									submenuCaretGap: value || '',
								} )
							}
							units={ [ { value: 'px', label: 'px' } ] }
							presets={ false }
						/>
						<RangeControl
							label={ __(
								'Arrow opacity at rest',
								'sgs-blocks'
							) }
							value={
								typeof submenuCaretOpacity === 'number'
									? submenuCaretOpacity
									: undefined
							}
							min={ 0 }
							max={ 1 }
							step={ 0.05 }
							allowReset
							onChange={ ( value ) =>
								setAttributes( { submenuCaretOpacity: value } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<RangeControl
							label={ __(
								'Arrow opacity on hover',
								'sgs-blocks'
							) }
							value={
								typeof submenuCaretOpacityHover === 'number'
									? submenuCaretOpacityHover
									: undefined
							}
							min={ 0 }
							max={ 1 }
							step={ 0.05 }
							allowReset
							onChange={ ( value ) =>
								setAttributes( {
									submenuCaretOpacityHover: value,
								} )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<RangeControl
							label={ __( 'Arrow turn time (ms)', 'sgs-blocks' ) }
							help={ __(
								"How long the arrow takes to turn as its panel opens. Empty keeps today's instant turn.",
								'sgs-blocks'
							) }
							value={
								typeof submenuCaretTurnDuration === 'number'
									? submenuCaretTurnDuration
									: undefined
							}
							min={ 0 }
							max={ 1000 }
							step={ 10 }
							allowReset
							onChange={ ( value ) =>
								setAttributes( {
									submenuCaretTurnDuration: value,
								} )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<EasingAtom
							vocab="nav"
							label={ __( 'Arrow turn curve', 'sgs-blocks' ) }
							value={ submenuCaretTurnEasing }
							custom={ submenuCaretTurnEasingCustom }
							fallback="ease"
							onChange={ ( value ) =>
								setAttributes( {
									submenuCaretTurnEasing: value,
								} )
							}
							onCustomChange={ ( value ) =>
								setAttributes( {
									submenuCaretTurnEasingCustom: value,
								} )
							}
						/>
					</>
				) }
				<SelectControl
					label={ __( 'Hover colour applies to', 'sgs-blocks' ) }
					value={ itemHoverScope || 'all' }
					options={ [
						{
							label: __( 'Every top-level item', 'sgs-blocks' ),
							value: 'all',
						},
						{
							label: __(
								'Only items that open a dropdown or mega panel',
								'sgs-blocks'
							),
							value: 'with-submenu',
						},
					] }
					onChange={ ( value ) =>
						setAttributes( { itemHoverScope: value || 'all' } )
					}
					help={ __(
						'A plain link with nothing to open (e.g. Home) stays visually inert on hover when set to the second option.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<SelectControl
					label={ __( 'Open on', 'sgs-blocks' ) }
					value={ submenuOpenOn === 'click' ? 'click' : 'hover' }
					options={ [
						{
							label: __( 'Hover (or focus)', 'sgs-blocks' ),
							value: 'hover',
						},
						{
							label: __( 'Click only', 'sgs-blocks' ),
							value: 'click',
						},
					] }
					onChange={ ( value ) =>
						setAttributes( { submenuOpenOn: value } )
					}
					help={ __(
						'Click only keeps the panel open until it is clicked again, dismissed with Escape, or a click lands outside it. Touch and keyboard always work.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<ToggleControl
					label={ __( 'Open when tabbed to', 'sgs-blocks' ) }
					help={ __(
						'Keyboard focus on a menu item opens its panel, and moving focus away closes it. Escape still closes it. Mouse presses and taps do not open it.',
						'sgs-blocks'
					) }
					checked={ !! submenuOpenOnFocus }
					onChange={ ( value ) =>
						setAttributes( { submenuOpenOnFocus: value } )
					}
					__nextHasNoMarginBottom
				/>
				{ submenuOpenOn !== 'click' && (
					<RangeControl
						label={ __( 'Open delay', 'sgs-blocks' ) }
						value={
							typeof submenuIntentDelay === 'number'
								? submenuIntentDelay
								: 80
						}
						min={ 0 }
						max={ 400 }
						step={ 10 }
						onChange={ ( value ) =>
							setAttributes( {
								submenuIntentDelay:
									typeof value === 'number' ? value : 80,
							} )
						}
						help={ __(
							'How long the pointer must rest on a menu item before its dropdown or mega panel opens, in milliseconds. A short delay stops it opening while the pointer is only sweeping across the menu.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				) }
				<RangeControl
					label={ __( 'Close delay', 'sgs-blocks' ) }
					value={
						typeof submenuCloseGrace === 'number'
							? submenuCloseGrace
							: 170
					}
					min={ 0 }
					max={ 600 }
					step={ 10 }
					onChange={ ( value ) =>
						setAttributes( {
							submenuCloseGrace:
								typeof value === 'number' ? value : 170,
						} )
					}
					help={ __(
						'How long a dropdown or mega panel waits before closing when the pointer leaves it, in milliseconds. A short delay stops it snapping shut while someone is moving towards it.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</PanelBody>
		</>
	);
}
