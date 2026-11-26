import { __ } from '@wordpress/i18n';
import { PanelBody, CheckboxControl } from '@wordpress/components';
import {
	BOX_UNITS,
	ResponsiveOverride,
	SgsBoxControl,
	normaliseResponsiveBox,
} from '../../components';
import { spacingDefaultsFor } from '../../utils/spacing-defaults';

/**
 * SGS Nav Drawer Menu — Styles tab: "Mega menu" PanelBody.
 *
 * `megaDrawerMode` (Spec 36 FR-36-6, Wave 3C U-7): `panel` (default) shows a
 * mega item's own mega panel post inside its accordion in the drawer (no
 * floating shell, text in the drawer's colours); `link` makes it a plain
 * link. Bean 2026-09-13: not everyone wants mega panels in the drawer. The
 * Panel or Link toggle itself sits in the Settings "Menu" panel
 * (`MenuSettingsPanel.js`); this panel reads the mode and shows the mega panel
 * padding (`megaBodyPadding`, the padding around a mega item's panel inside its
 * accordion; empty keeps style.css's 0 12px 12px) only while the mode is Panel.
 *
 * The checklist below takes precedence for one item: a mega item authored
 * WITH real nested child links (a core/navigation-submenu), ticked here,
 * shows those sub-links as an ordinary accordion list instead of its panel.
 * A mega item with no nested children is shown with a disabled row. Mirrors
 * FeaturedPanel.js's checklist shape (same identifier scheme and toggle).
 *
 * @param {Object}   root0                       Props.
 * @param {number}   root0.menuRef               The block's `ref` attribute (menu id).
 * @param {Array}    root0.resolvedItems         From useNavMenuSource() — each item
 *                                               also carries `isMega`/`hasChildren`.
 * @param {string}   root0.megaDrawerMode        The block's `megaDrawerMode` attribute (read only here).
 * @param {Object}   root0.megaBodyPadding       The block's `megaBodyPadding` attribute, a tier object of {top,right,bottom,left} boxes.
 * @param {string}   root0.blockName             The block's registered name, for the padding's default sides.
 * @param {string[]} root0.megaDrawerFallbackIds The block's `megaDrawerFallbackIds` attribute.
 * @param {Function} root0.setAttributes         The block's attribute setter.
 */
export default function MegaDrawerPanel( {
	menuRef,
	resolvedItems,
	megaDrawerMode,
	megaBodyPadding,
	blockName,
	megaDrawerFallbackIds,
	setAttributes,
} ) {
	const megaItems = resolvedItems.filter( ( item ) => item.isMega );

	const toggle = ( identifier, checked ) => {
		const next = checked
			? [ ...( megaDrawerFallbackIds || [] ), identifier ]
			: ( megaDrawerFallbackIds || [] ).filter(
					( id ) => id !== identifier
			  );
		setAttributes( { megaDrawerFallbackIds: next } );
	};

	return (
		<PanelBody
			title={ __( 'Mega menu', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			{ 'link' !== megaDrawerMode && (
				<ResponsiveOverride
					label={ __( 'Mega panel padding', 'sgs-blocks' ) }
					value={ megaBodyPadding }
					onChange={ ( obj ) =>
						setAttributes( { megaBodyPadding: obj } )
					}
				>
					{ ( { ownValue, setOwnValue } ) => (
						<SgsBoxControl
							label={ __( 'Mega panel padding', 'sgs-blocks' ) }
							help={ __(
								'Space around a mega item’s panel when it opens in the drawer. Empty keeps the default 0 12px 12px.',
								'sgs-blocks'
							) }
							values={
								ownValue && typeof ownValue === 'object'
									? ownValue
									: {}
							}
							units={ BOX_UNITS }
							presets
							defaults={ spacingDefaultsFor(
								blockName,
								'megaBodyPadding'
							) }
							onChange={ ( next ) =>
								setOwnValue( normaliseResponsiveBox( next ) )
							}
						/>
					) }
				</ResponsiveOverride>
			) }
			{ 0 === menuRef && (
				<p>
					{ __(
						'Choose a specific menu above to manage mega-menu items.',
						'sgs-blocks'
					) }
				</p>
			) }
			{ 0 !== menuRef && 0 === megaItems.length && (
				<p>
					{ __( 'This menu has no mega-menu items.', 'sgs-blocks' ) }
				</p>
			) }
			{ megaItems.map( ( item ) => (
				<div key={ item.identifier }>
					<CheckboxControl
						label={ item.label }
						checked={ ( megaDrawerFallbackIds || [] ).includes(
							item.identifier
						) }
						disabled={ ! item.hasChildren }
						onChange={ ( checked ) =>
							toggle( item.identifier, checked )
						}
						help={
							item.hasChildren
								? undefined
								: __(
										'No sub-links added to this item yet — nothing to list.',
										'sgs-blocks'
								  )
						}
						__nextHasNoMarginBottom
					/>
				</div>
			) ) }
			{ megaItems.length > 0 && (
				<p className="sgs-nav-panel__inspector-note">
					{ __(
						'Ticked items show their own sub-links as a plain list in the nav drawer instead of their mega panel. The desktop bar always shows the full mega panel either way — this only affects the drawer.',
						'sgs-blocks'
					) }
				</p>
			) }
		</PanelBody>
	);
}
