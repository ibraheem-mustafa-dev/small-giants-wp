/**
 * SGS Nav Bar Menu (sgs/nav-bar-menu) — Settings tab: "Disabled items" PanelBody.
 *
 * Wave B. Lets an operator mark specific menu items (top-level or nested) as
 * non-interactive — the item renders as plain, non-focusable text with
 * `aria-disabled="true"` instead of a link, e.g. a section that is "coming
 * soon" and should stay visible in the menu without being clickable yet.
 *
 * Storage/UI mirrors `src/shared/nav-menu-panels/FeaturedPanel.js`'s own
 * checklist exactly — same `resolvedItems`/identifier scheme `disabledItemIds`
 * reuses from `featuredItemIds` — but is a BAR-ONLY, block-scoped component
 * (not moved to `src/shared/nav-menu-panels/`, which is out of scope for this
 * pass) with no radius/font-weight sub-controls: a disabled item has no pill
 * shape of its own, only a text colour (the Styles-tab "Disabled item text
 * colour" row, itemDisabledColour, in edit.js's own colourRows array).
 *
 * This is a pure DATA-SOURCE pick (which items are affected), not a colour
 * or any other styled value, so per Spec 35 Part O it belongs in the
 * Settings tab, not Styles — same placement FeaturedPanel's own checklist
 * half occupies, minus its styling controls.
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
					'A disabled item renders as plain text, not a link — visible in the menu but not clickable, e.g. for a section that is coming soon. Its text colour is set in the Styles tab under Disabled item — Text colour.',
					'sgs-blocks'
				) }
			</p>
		</PanelBody>
	);
}
