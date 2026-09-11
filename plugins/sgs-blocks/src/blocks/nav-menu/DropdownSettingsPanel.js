import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	RangeControl,
} from '@wordpress/components';

/**
 * SGS Nav Menu (sgs/nav-menu) — Settings tab panels: Accessibility, Menu
 * panel, Dropdown menus.
 *
 * Split out of edit.js (Spec 41 step 7, pure refactor) to keep the file under
 * the project's 250-line JS budget — sibling of MenuSettingsPanel.js (see its
 * docblock for why this pair exists instead of one SettingsPanels.js). No
 * behaviour change — verbatim JSX from edit.js's `<InspectorControls>`
 * (default group) block.
 *
 * @param {Object}   root0                   Props.
 * @param {string}   root0.navLabel          The block's `navLabel` attribute.
 * @param {Function} root0.setAttributes     The block's attribute setter.
 * @param {string}   root0.drawerRef         The block's `drawerRef` attribute.
 * @param {string}   root0.submenuAlign      The block's `submenuAlign` attribute.
 * @param {boolean}  root0.submenuCaret      The block's `submenuCaret` attribute.
 * @param {number}   root0.submenuCloseGrace The block's `submenuCloseGrace` attribute.
 */
export default function DropdownSettingsPanel( {
	navLabel,
	itemSmartContrast,
	setAttributes,
	drawerRef,
	submenuAlign,
	submenuCaret,
	submenuCloseGrace,
} ) {
	return (
		<>
			<PanelBody title={ __( 'Accessibility', 'sgs-blocks' ) } initialOpen={ false }>
				<TextControl
					label={ __( 'Navigation label', 'sgs-blocks' ) }
					value={ navLabel }
					placeholder={ __(
						'Auto — from the menu name',
						'sgs-blocks'
					) }
					onChange={ ( val ) =>
						setAttributes( { navLabel: val } )
					}
					help={ __(
						'Accessible name for this menu landmark. Leave blank to use the chosen menu’s own name, so two menus are named apart automatically. Set it only to override that (e.g. Primary, Footer).',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>

				{ /* RELOCATED here in step 14 (Spec 41 §9.5 / FR-41-27) from the old
				   Design-tab colour/state area. The toggle, its default and its
				   two-case contrast resolution are UNCHANGED; only its home moved.
				   It sits beside the navigation label because both answer "does this
				   menu behave safely for every visitor", which is what a General-tab
				   Accessibility panel is for. The Colour panel's Item text and Item
				   background rows each carry a rendered note pointing here, so the
				   control does not read as having been dropped.
				   ⛔ No "WCAG", no "contrast ratio", no "AA" in any client-visible
				   string on this block (FR-41-5). */ }
				<ToggleControl
					label={ __( 'Keep text readable automatically', 'sgs-blocks' ) }
					checked={ itemSmartContrast !== false }
					onChange={ ( val ) => setAttributes( { itemSmartContrast: val } ) }
					help={ __(
						'When you set a background, we check your text colour stays readable against it and swap in a readable one if it doesn’t. Switch this off to always use exactly the colour you picked.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
				/>
			</PanelBody>

			<PanelBody title={ __( 'Menu panel', 'sgs-blocks' ) } initialOpen={ false }>
				<p style={ { marginTop: 0 } }>
					{ __(
						'Below the collapse size (see Burger Menu above) this menu becomes a burger button that opens a menu panel — on any device, including desktop if you choose Always. To change what visitors see in it, select that panel and edit its contents like any other block.',
						'sgs-blocks'
					) }
				</p>
				<TextControl
					label={ __( 'Panel this burger opens', 'sgs-blocks' ) }
					value={ drawerRef }
					onChange={ ( val ) =>
						setAttributes( { drawerRef: val } )
					}
					help={ __(
						'Only change this if the page has more than one menu panel — it must match the name set on the panel you want to open.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
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
					] }
					onChange={ ( value ) =>
						setAttributes( { submenuAlign: value } )
					}
					help={ __(
						'Left is the usual choice — the first item sits closest to where the visitor clicked. If a dropdown would run off the edge of the screen it flips to the other side automatically, whichever option you pick.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
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
						'How long the dropdown waits before closing when the pointer leaves it, in milliseconds. A short delay stops it snapping shut while someone is moving towards it.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</PanelBody>
		</>
	);
}
