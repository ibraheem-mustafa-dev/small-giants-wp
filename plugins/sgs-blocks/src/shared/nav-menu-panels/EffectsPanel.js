import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl, ToggleControl } from '@wordpress/components';

/**
 * SGS Nav Bar/Drawer Menu (shared, sgs/nav-bar-menu + sgs/nav-drawer-menu) — Styles tab: the "Effects" panel (Spec 41 §9.11).
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
 * `magnetStrength`/`onMagnetStrengthChange` are an ADDITIVE, OPTIONAL prop pair
 * (Spec 35 §35A CO-2 audit item 7, 2026-09-24): `sgs/nav-bar-menu`'s own
 * `itemMagnetStrength` attribute used to mount as a standalone control right
 * after this shared panel — a single logical "Effects" cluster split across
 * two mount points, the exact banned lookalike CO-2 clause 2 names. Every
 * OTHER prop is unchanged and `sgs/nav-drawer-menu`'s `edit.js` (this
 * component's other consumer) supplies neither prop, so it renders BYTE-FOR-BYTE
 * what it always has — the control below mounts ONLY when a caller supplies
 * `onMagnetStrengthChange`.
 *
 * @param {Object}   root0                    Props.
 * @param {boolean}  root0.itemMagnetEnabled  `itemMagnetEnabled`.
 * @param {Function} root0.setAttributes      The block's attribute setter.
 * @param {number}   [root0.magnetStrength]   Optional — `itemMagnetStrength`. `undefined`
 *                                             means "unset" (the caller's own shipped
 *                                             default applies, e.g. `magnet.js`'s 8px cap).
 * @param {Function} [root0.onMagnetStrengthChange] Optional — when supplied, renders the
 *                                             "Pull strength" control, gated on
 *                                             `itemMagnetEnabled` like the toggle above.
 */
export default function EffectsPanel( {
	itemMagnetEnabled,
	setAttributes,
	magnetStrength,
	onMagnetStrengthChange,
} ) {
	const hasStrengthControl = typeof onMagnetStrengthChange === 'function';
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
			{ /* Spec 35 PART B "no half-built controls" (audit item 6) — the
			   control can show AND return to UNSET: `value` accepts `undefined`
			   (WP's own uncontrolled-fallback contract, using `initialPosition`
			   for the slider's starting thumb position only), and the native
			   `allowReset`/`resetFallbackValue={ undefined }` pair puts a real
			   reset path back to "unset" — never a false "0.15" once touched. */ }
			{ hasStrengthControl && itemMagnetEnabled && (
				<RangeControl
					label={ __( 'Pull strength', 'sgs-blocks' ) }
					help={ __(
						'How strongly each item leans toward the cursor. Leave unset for the original strength.',
						'sgs-blocks'
					) }
					value={ magnetStrength }
					initialPosition={ 0.15 }
					min={ 0.02 }
					max={ 0.5 }
					step={ 0.01 }
					onChange={ ( val ) =>
						onMagnetStrengthChange( typeof val === 'number' ? val : undefined )
					}
					allowReset
					resetFallbackValue={ undefined }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</PanelBody>
	);
}
