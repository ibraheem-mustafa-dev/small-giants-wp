import { __, sprintf } from '@wordpress/i18n';
import { Notice } from '@wordpress/components';
import { LINK_COUNT_THRESHOLD } from '../../shared/nav-menu-panels/utils';

/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — Settings-tab notice: the
 * link-count notice only.
 * The burger→drawer PAIRING notices (`showDrawerNotice`,
 * `showActiveDrawerNotice`: "this burger is set to open a panel that isn't
 * here" / "this burger opens the site-wide panel") belong to
 * `sgs/nav-bar-menu`: they describe a BURGER's relationship to a drawer, and
 * this block IS the drawer's own content, so it never has a burger to pair.
 * The underlying `useDrawerNotice()` hook returns `suppress: true` the moment
 * a block renders inside `sgs/nav-drawer`, this block's ONLY possible
 * position (`ancestor`), so importing it here would compute a permanent
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
