import { __, sprintf } from '@wordpress/i18n';
import { Notice, Button } from '@wordpress/components';
import { LINK_COUNT_THRESHOLD } from '../../shared/nav-menu-panels/utils';

/**
 * SGS Nav Bar Menu (sgs/nav-bar-menu) — Settings-tab notices: the drawer-pairing
 * warning, the site-wide-drawer info notice, and the link-count notice.
 *
 * Split out of edit.js (Spec 41 step 7, pure refactor) to keep the file under
 * the project's 250-line JS budget. No behaviour change — verbatim JSX from
 * edit.js's `<InspectorControls>` opening block.
 *
 * @param {Object}   root0                     Props.
 * @param {boolean}  root0.showDrawerNotice     From useDrawerNotice().
 * @param {Object}   root0.drawerState          From useDrawerNotice().
 * @param {Function} root0.addDrawer            From useDrawerNotice().
 * @param {boolean}  root0.showActiveDrawerNotice From useDrawerNotice().
 * @param {Object}   root0.activeDrawer         From useDrawerNotice().
 * @param {number}   root0.resolvedItemsLength  `resolvedItems.length` from useNavMenuSource().
 */
export default function NavMenuNotices( {
	showDrawerNotice,
	drawerState,
	addDrawer,
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
									'Below the collapse size this menu becomes a burger button — but there is no menu panel for it to open, so tapping it will do nothing.',
									'sgs-blocks'
								) }
							</p>
							{ drawerState.canCreate && (
								<Button
									variant="primary"
									size="small"
									onClick={ addDrawer }
								>
									{ __(
										'Add the menu panel',
										'sgs-blocks'
									) }
								</Button>
							) }
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
