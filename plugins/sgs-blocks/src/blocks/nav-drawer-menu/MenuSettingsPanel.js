import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import {
	ToggleGroupControl,
	ToggleGroupControlOption,
} from '../../components/primitives';

/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — Settings tab: the "Menu" panel
 * (the menu source picker, the accordion's scroll-into-view switch and the
 * Panel or Link choice for mega items, `megaDrawerMode`; the per-item ticks and
 * the mega panel padding sit in the Styles "Mega menu" panel).
 *
 * Only the "Menu" panel (the `ref` source picker — every menu-rendering block
 * needs it). The bar block's "Burger Menu" panel (`collapsePoint`) is BAR-only:
 * this block never has a burger and never declares that attribute, and a
 * "Burger Menu" panel here would write to an undeclared attribute — a dead
 * control, exactly what `check-dead-controls.js` bans.
 *
 * @param {Object}   root0                         Props.
 * @param {number}   root0.menuRef                 The block's `ref` attribute (menu id).
 *                                                 Named `menuRef`, NOT `ref` — `ref` is a
 *                                                 reserved JSX prop name.
 * @param {Array}    root0.menuOptions             From useNavMenuSource().
 * @param {boolean}  root0.isResolving             From useNavMenuSource().
 * @param {boolean}  root0.accordionScrollIntoView Scroll an opened row near the top.
 * @param {string}   root0.parentRowAction         The block's `parentRowAction` attribute.
 * @param {string}   root0.megaDrawerMode          The block's `megaDrawerMode` attribute.
 * @param {Function} root0.setAttributes           The block's attribute setter.
 */
export default function MenuSettingsPanel( {
	menuRef,
	menuOptions,
	isResolving,
	accordionScrollIntoView,
	parentRowAction,
	megaDrawerMode,
	setAttributes,
} ) {
	return (
		<PanelBody initialOpen title={ __( 'Menu', 'sgs-blocks' ) }>
			<SelectControl
				label={ __( 'Menu', 'sgs-blocks' ) }
				value={ menuRef || 0 }
				options={ menuOptions }
				onChange={ ( val ) =>
					setAttributes( { ref: Number( val ) || 0 } )
				}
				disabled={ isResolving }
				help={ __(
					'Auto follows the site’s primary menu. Choose a specific menu to render an independent one. Manage menus in Appearance → Menus.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<SelectControl
				label={ __( 'Tapping a parent row', 'sgs-blocks' ) }
				value={ 'toggle' === parentRowAction ? 'toggle' : 'navigate' }
				options={ [
					{
						label: __( 'Goes to the parent page', 'sgs-blocks' ),
						value: 'navigate',
					},
					{
						label: __(
							'Opens and closes its section',
							'sgs-blocks'
						),
						value: 'toggle',
					},
				] }
				onChange={ ( val ) =>
					setAttributes( { parentRowAction: val } )
				}
				help={ __(
					'Applies to parent rows that have a page. With Opens and closes the whole row is one button, so add the parent page as a child link if visitors need it.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<ToggleControl
				label={ __(
					'Scroll an opened section into view',
					'sgs-blocks'
				) }
				help={ __(
					'When a section opens low down, the drawer scrolls so it sits near the top. Instant for visitors who prefer reduced motion.',
					'sgs-blocks'
				) }
				checked={ !! accordionScrollIntoView }
				onChange={ ( value ) =>
					setAttributes( { accordionScrollIntoView: value } )
				}
				__nextHasNoMarginBottom
			/>
			<ToggleGroupControl
				label={ __( 'Mega items in the drawer', 'sgs-blocks' ) }
				help={ __(
					'Panel shows each mega item’s own panel inside its drawer accordion. Link makes it a plain link.',
					'sgs-blocks'
				) }
				value={ 'link' === megaDrawerMode ? 'link' : 'panel' }
				onChange={ ( val ) =>
					setAttributes( {
						megaDrawerMode: 'link' === val ? 'link' : 'panel',
					} )
				}
				isBlock
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			>
				<ToggleGroupControlOption
					value="panel"
					label={ __( 'Panel', 'sgs-blocks' ) }
				/>
				<ToggleGroupControlOption
					value="link"
					label={ __( 'Link', 'sgs-blocks' ) }
				/>
			</ToggleGroupControl>
		</PanelBody>
	);
}
