import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';

/**
 * SGS Nav Bar Menu (sgs/nav-bar-menu) — Settings tab: the "Menu" panel (the menu source picker).
 *
 * Kept separate from edit.js to stay under the project's 250-line JS budget; sibling of
 * DropdownSettingsPanel.js. Both are mounted from edit.js's `<InspectorControls>` (default group) block.
 * The burger's "Show the burger on" lives in the "Menu Button" panel (`BurgerScopeRows.js`).
 *
 * @param {Object}   root0               Props.
 * @param {number}   root0.menuRef       The block's `ref` attribute (menu id).
 *                                       Named `menuRef`, NOT `ref` — `ref` is a
 *                                       reserved JSX prop name and would be
 *                                       intercepted by React rather than reaching
 *                                       this component as a normal prop.
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
					'Auto follows the header navigation block / the site’s primary menu. Choose a specific menu to render an independent one. Manage menus in Appearance → Menus.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</PanelBody>
	);
}
