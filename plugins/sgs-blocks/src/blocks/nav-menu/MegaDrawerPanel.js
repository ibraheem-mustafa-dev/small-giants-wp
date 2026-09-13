import { __ } from '@wordpress/i18n';
import { PanelBody, CheckboxControl } from '@wordpress/components';

/**
 * SGS Nav Menu (sgs/nav-menu) — Settings tab: "Mega menu (drawer)" PanelBody.
 *
 * Bean 2026-09-13: "there should be an option to not show a mega menu item
 * on the nav drawer version since not everyone wants them." A mega-typed
 * item always degrades to a plain link inside the drawer (Spec 36 FR-36-5
 * reserves the FULL mega-panel-inside-the-drawer build as future work). This
 * panel offers the narrower, already-buildable slice: for a mega item
 * authored WITH real nested child links (a core/navigation-submenu, not a
 * bare core/navigation-link), ticking it here renders those children as an
 * ordinary accordion/submenu list in the drawer instead of the plain-link
 * degrade. Mirrors FeaturedPanel.js's checklist shape exactly — same
 * identifier scheme, same toggle-array pattern.
 *
 * Only mega items are listed; a mega item with no nested children is shown
 * with a disabled row + explanatory help text, since there is nothing to
 * fall back to.
 *
 * @param {Object}   root0                        Props.
 * @param {number}   root0.menuRef                The block's `ref` attribute (menu id).
 * @param {Array}    root0.resolvedItems          From useNavMenuSource() — each item
 *                                                 now also carries `isMega`/`hasChildren`.
 * @param {string[]} root0.megaDrawerFallbackIds  The block's `megaDrawerFallbackIds` attribute.
 * @param {Function} root0.setAttributes          The block's attribute setter.
 */
export default function MegaDrawerPanel( {
	menuRef,
	resolvedItems,
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
			title={ __( 'Mega menu (drawer)', 'sgs-blocks' ) }
			initialOpen={ false }
		>
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
					{ __(
						'This menu has no mega-menu items.',
						'sgs-blocks'
					) }
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
				<p className="sgs-nav-menu__inspector-note">
					{ __(
						'Ticked items show their own sub-links as a plain list in the nav drawer instead of the full mega-menu panel. The desktop bar always shows the full mega panel either way — this only affects the drawer.',
						'sgs-blocks'
					) }
				</p>
			) }
		</PanelBody>
	);
}
