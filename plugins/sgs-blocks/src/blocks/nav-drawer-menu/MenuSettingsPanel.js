import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';

/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — Settings tab: the "Menu" panel
 * (menu source picker only).
 *
 * Trimmed from nav-menu/MenuSettingsPanel.js (D1059 split, 2026-09-14) — that
 * file bundled TWO concerns in one component: the "Menu" panel (the `ref`
 * source picker, BOTH-classified — every menu-rendering block needs it) and
 * the "Burger Menu" panel (`collapsePoint`, BAR-only, measured — this block
 * never has a burger and never declares that attribute). Reusing the
 * original component unmodified would have rendered a "Burger Menu" panel
 * writing to an attribute this block's block.json doesn't declare — a dead
 * control, exactly what `check-dead-controls.js` bans. This file keeps ONLY
 * the half that applies here.
 *
 * @param {Object}   root0               Props.
 * @param {number}   root0.menuRef       The block's `ref` attribute (menu id).
 *                                       Named `menuRef`, NOT `ref` — `ref` is a
 *                                       reserved JSX prop name.
 * @param {Array}    root0.menuOptions   From useNavMenuSource().
 * @param {boolean}  root0.isResolving   From useNavMenuSource().
 * @param {Function} root0.setAttributes The block's attribute setter.
 */
export default function MenuSettingsPanel( {
	menuRef,
	menuOptions,
	isResolving,
	setAttributes,
} ) {
	return (
		<PanelBody title={ __( 'Menu', 'sgs-blocks' ) }>
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
		</PanelBody>
	);
}
