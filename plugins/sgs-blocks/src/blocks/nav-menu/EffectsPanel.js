import { __ } from '@wordpress/i18n';
import { PanelBody, ToggleControl } from '@wordpress/components';

/**
 * SGS Nav Menu (sgs/nav-menu) — Styles tab: the "Effects" panel (Spec 41 §9.11).
 *
 * ⚠ The control is unchanged; only its home is. It used to sit at the bottom of the
 * "Items" panel, which §9 renames to "Menu item" and narrows to border SHAPE. §9.11
 * names "Effects" as its own panel, so it becomes one rather than being left inside a
 * panel that no longer describes it.
 *
 * ⚠ This is the ITEM magnet (`itemMagnetEnabled`). The MENU BUTTON has its own,
 * separate magnetic pull with its own radius/strength pair (FR-41-31), in the "Menu
 * Button" panel on the General tab — two different elements, two different controls,
 * deliberately not merged.
 *
 * @param {Object}   root0                  Props.
 * @param {boolean}  root0.itemMagnetEnabled `itemMagnetEnabled`.
 * @param {Function} root0.setAttributes     The block's attribute setter.
 */
export default function EffectsPanel( { itemMagnetEnabled, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Effects', 'sgs-blocks' ) } initialOpen={ false }>
			<ToggleControl
				label={ __( 'Magnetic hover pull', 'sgs-blocks' ) }
				checked={ !! itemMagnetEnabled }
				onChange={ ( val ) => setAttributes( { itemMagnetEnabled: val } ) }
				help={ __(
					'Nudges each item label a few pixels toward the cursor on hover. Off automatically when the visitor is using touch, and when reduced motion is requested.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
			/>
		</PanelBody>
	);
}
