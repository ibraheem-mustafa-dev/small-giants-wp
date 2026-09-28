/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — Settings tab: "Disabled items"
 * PanelBody.
 *
 * Parity with sgs/nav-bar-menu's own identical panel (2026-09-28) — lets an
 * operator mark specific menu items (top-level or nested) as
 * non-interactive: the item renders as plain, non-focusable text with
 * `aria-disabled="true"` instead of a link.
 *
 * Storage/UI mirrors the bar's own `DisabledItemsPanel.js` exactly (same
 * `disabledItemIds` identifier scheme as `featuredItemIds`) — a block-scoped
 * sibling file rather than a move to `src/shared/nav-menu-panels/`, matching
 * the bar's own note that this is out of scope for this pass.
 *
 * Wired render-side for accordion-parent rows only this pass — leaf/sub-item
 * rows render through the shared `includes/nav-menu-markup.php` item-list
 * builder, out of this block's file-ownership scope; see
 * `block.json::attributes.disabledItemIds`'s own description.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, CheckboxControl } from '@wordpress/components';

/**
 * @param {Object}   root0
 * @param {number}   root0.menuRef         The block's `ref` attribute (menu id).
 * @param {Array}    root0.resolvedItems   From `useNavMenuSource()`.
 * @param {Function} root0.toggleDisabled  Local add/remove-from-array toggler
 *                                         (edit.js), same shape as
 *                                         useNavMenuSource's own toggleFeatured.
 * @param {string[]} root0.disabledItemIds The block's `disabledItemIds` attribute.
 */
export default function DisabledItemsPanel( {
	menuRef,
	resolvedItems,
	toggleDisabled,
	disabledItemIds,
} ) {
	return (
		<PanelBody title={ __( 'Disabled items', 'sgs-blocks' ) } initialOpen={ false }>
			{ 0 === menuRef && (
				<p>
					{ __(
						'Choose a specific menu above to pick which items are disabled.',
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
				// shape — same convention as FeaturedPanel's checklist.
				<div
					key={ item.identifier }
					style={ {
						marginLeft: `${ ( item.depth || 0 ) * 20 }px`,
					} }
				>
					<CheckboxControl
						label={ item.label }
						checked={ ( disabledItemIds || [] ).includes(
							item.identifier
						) }
						onChange={ ( checked ) =>
							toggleDisabled( item.identifier, checked )
						}
						__nextHasNoMarginBottom
					/>
				</div>
			) ) }
			<p className="sgs-nav-panel__inspector-note">
				{ __(
					'A disabled item renders as plain text, not a link — visible in the menu but not clickable, e.g. for a section that is coming soon. Its text colour is set in the Styles tab under Disabled item — Text colour. An item with a submenu keeps its own accordion toggle working (only the leaf link is disabled).',
					'sgs-blocks'
				) }
			</p>
		</PanelBody>
	);
}
