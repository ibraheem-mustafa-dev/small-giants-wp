import { __, sprintf } from '@wordpress/i18n';
import { Notice, Button } from '@wordpress/components';
import { LINK_COUNT_THRESHOLD } from '../../shared/nav-menu-panels/utils';

/**
 * SGS Nav Bar Menu (sgs/nav-bar-menu) — Settings-tab notices: the drawer-pairing
 * warning, the site-wide-drawer info notice, and the link-count notice.
 *
 * Kept separate from edit.js to stay under the project's 250-line JS budget;
 * mounted at the top of edit.js's `<InspectorControls>` block.
 *
 * @param {Object}   root0                     Props.
 * @param {boolean}  root0.showDrawerNotice     From useDrawerNotice().
 * @param {Object}   root0.drawerState          From useDrawerNotice().
 * @param {boolean}  root0.showActiveDrawerNotice From useDrawerNotice().
 * @param {Object}   root0.activeDrawer         From useDrawerNotice().
 * @param {number}   root0.resolvedItemsLength  `resolvedItems.length` from useNavMenuSource().
 */
export default function NavMenuNotices( {
	showDrawerNotice,
	drawerState,
	showActiveDrawerNotice,
	activeDrawer,
	resolvedItemsLength,
} ) {
	return (
		<>
			{ showDrawerNotice && (
				<Notice
					status="warning"
					isDismissible={ false }
					style={ { marginBottom: '16px' } }
				>
					{ 0 === drawerState.total ? (
						<>
							<p style={ { margin: '0 0 8px' } }>
								{ __(
									'Below the collapse size this menu becomes a burger button — but there is no menu panel for it to open, so tapping it will do nothing. Use “Create a new menu panel” in this block’s Menu panel settings, or pick an existing one.',
									'sgs-blocks'
								) }
							</p>
						</>
					) : (
						<p style={ { margin: 0 } }>
							{ sprintf(
								/* translators: %s: the menu panel id that already exists on this page. */
								__(
									'This burger is set to open the default menu panel, but the panel already on this page is named “%s” instead. Use the “Panel this burger opens” picker above to choose a specific menu panel, or set that panel as the site’s active one.',
									'sgs-blocks'
								),
								drawerState.firstRef
							) }
						</p>
					) }
				</Notice>
			) }

			{ showActiveDrawerNotice && (
				<Notice
					status="info"
					isDismissible={ false }
					style={ { marginBottom: '16px' } }
				>
					<p style={ { margin: '0 0 8px' } }>
						{ sprintf(
							/* translators: %s: title of the site's active menu drawer post. */
							__(
								'This burger opens your site-wide menu panel, “%s”. It is not part of this page, so it will not appear in the editor here — it shows on the live site.',
								'sgs-blocks'
							),
							activeDrawer.title
						) }
					</p>
					{ !! activeDrawer.editUrl && (
						<Button
							variant="secondary"
							size="small"
							href={ activeDrawer.editUrl }
						>
							{ __( 'Edit the menu panel', 'sgs-blocks' ) }
						</Button>
					) }
				</Notice>
			) }

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
