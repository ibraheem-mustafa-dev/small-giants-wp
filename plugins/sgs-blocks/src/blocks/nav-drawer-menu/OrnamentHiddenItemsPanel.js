/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — Settings tab: "Ornament"
 * PanelBody.
 *
 * Per-item opt-out from the leading ornament (2026-09-28): lets an operator
 * tick specific menu items (top-level or nested) so that row renders with NO
 * ornament glyph/counter and reserves no ornament space, e.g. a "Careers"
 * row that should not carry the same hover-draw marker as the rest of the
 * primary list.
 *
 * A pure data-source pick (which items skip the ornament), so it lives here
 * in Settings next to Disabled items, never in Styles (Spec 35 Part O
 * placement rule) — the ornament's own shape/colour/reveal controls stay in
 * RowExtrasPanel (Styles tab).
 *
 * Storage/UI mirrors DisabledItemsPanel.js exactly (same `ornamentHiddenItemIds`
 * identifier scheme as `disabledItemIds`/`featuredItemIds`) — a block-scoped
 * sibling file rather than a move to `src/shared/nav-menu-panels/`, matching
 * that panel's own note that this is out of scope for this pass.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, CheckboxControl } from '@wordpress/components';

/**
 * @param {Object}   root0                      Props.
 * @param {number}   root0.menuRef              The block's `ref` attribute (menu id).
 * @param {Array}    root0.resolvedItems        From `useNavMenuSource()`.
 * @param {Function} root0.toggleOrnamentHidden Local add/remove-from-array toggler
 *                                              (edit.js), same shape as
 *                                              useNavMenuSource's own toggleFeatured.
 * @param {string[]} root0.ornamentHiddenItemIds The block's `ornamentHiddenItemIds` attribute.
 */
export default function OrnamentHiddenItemsPanel( {
	menuRef,
	resolvedItems,
	toggleOrnamentHidden,
	ornamentHiddenItemIds,
} ) {
	return (
		<PanelBody title={ __( 'Ornament', 'sgs-blocks' ) } initialOpen={ false }>
			{ 0 === menuRef && (
				<p>
					{ __(
						'Choose a specific menu above to pick which items skip the ornament.',
						'sgs-blocks'
					) }
				</p>
			) }
			{ 0 !== menuRef && 0 === resolvedItems.length && (
				<p>
					{ __(
						'This menu has no top-level items yet.',
						'sgs-blocks'
					) }
				</p>
			) }
			{ resolvedItems.map( ( item ) => (
				// Nested items indented so the list reads as the menu's own
				// shape — same convention as DisabledItemsPanel's checklist.
				<div
					key={ item.identifier }
					style={ {
						marginLeft: `${ ( item.depth || 0 ) * 20 }px`,
					} }
				>
					<CheckboxControl
						label={ item.label }
						checked={ ( ornamentHiddenItemIds || [] ).includes(
							item.identifier
						) }
						onChange={ ( checked ) =>
							toggleOrnamentHidden( item.identifier, checked )
						}
						__nextHasNoMarginBottom
					/>
				</div>
			) ) }
			<p className="sgs-nav-panel__inspector-note">
				{ __(
					'A ticked item shows no leading ornament — no number, no icon, and no reserved gap before its label — even when Row extras (Styles tab) turns the ornament on for the rest of the list.',
					'sgs-blocks'
				) }
			</p>
		</PanelBody>
	);
}
