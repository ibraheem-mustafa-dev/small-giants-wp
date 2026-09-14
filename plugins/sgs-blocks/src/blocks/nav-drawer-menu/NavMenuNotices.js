import { __, sprintf } from '@wordpress/i18n';
import { Notice } from '@wordpress/components';
import { LINK_COUNT_THRESHOLD } from '../../shared/nav-menu-panels/utils';

/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — Settings-tab notice: the
 * link-count notice only.
 *
 * Trimmed from nav-menu/NavMenuNotices.js (D1059 split, 2026-09-14) — that
 * file also carried the burger→drawer PAIRING notices (`showDrawerNotice`,
 * `showActiveDrawerNotice`): "this burger is set to open a panel that isn't
 * here" / "this burger opens the site-wide panel". Both describe a BURGER's
 * relationship to a drawer, which only the bar block has — this block IS the
 * drawer's own content, so it never has a burger to pair and the underlying
 * `useDrawerNotice()` hook itself says so (`suppress: true` the moment the
 * block renders inside `sgs/nav-drawer`, its ONLY possible position once
 * `ancestor` is declared). Importing that hook here would compute a permanent
 * no-op; this block does not import it at all.
 *
 * @param {number} root0.resolvedItemsLength `resolvedItems.length` from useNavMenuSource().
 */
export default function NavMenuNotices( { resolvedItemsLength } ) {
	return (
		<>
			{ resolvedItemsLength > LINK_COUNT_THRESHOLD && (
				<Notice status="info" isDismissible={ true } style={ { marginBottom: '16px' } }>
					{ sprintf(
						/* translators: %d is the number of links. */
						__( 'This menu has %d links. Consider simplifying to reduce cognitive load and improve usability.', 'sgs-blocks' ),
						resolvedItemsLength
					) }
				</Notice>
			) }
		</>
	);
}
