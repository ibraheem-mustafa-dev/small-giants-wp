/**
 * The `icons` top-row slot's inspector note (Spec 36 FR-36-6): the slot shows
 * the drawer body's FIRST block when it is an `sgs/social-icons` group
 * (includes/nav-drawer-chrome-icons.php lifts it out of the body). This says
 * whether that block is in place and offers to add one at the top of the body,
 * seeded with a phone and an email icon whose links come from Site Info.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { Button, Notice } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { createBlock } from '@wordpress/blocks';
import { childAttributesForKey } from '../social-icons/links';

/**
 * @param {Object} props          Props.
 * @param {string} props.clientId The drawer block's client id.
 * @return {Element} The note.
 */
export default function ChromeIconsSlotNotice( { clientId } ) {
	const firstName = useSelect(
		( select ) => {
			const order = select( 'core/block-editor' ).getBlockOrder( clientId );
			return order.length ? select( 'core/block-editor' ).getBlockName( order[ 0 ] ) : '';
		},
		[ clientId ]
	);
	const { insertBlock } = useDispatch( 'core/block-editor' );
	const ready = 'sgs/social-icons' === firstName;

	const addGroup = () =>
		insertBlock(
			createBlock(
				'sgs/social-icons',
				{},
				[ 'phone', 'email' ]
					.map( childAttributesForKey )
					.filter( Boolean )
					.map( ( attrs ) => createBlock( 'sgs/icon', attrs ) )
			),
			0,
			clientId
		);

	return ready ? (
		<p className="components-base-control__help">
			{ __(
				'The Social Icons group at the top of the drawer content shows in the top row. Edit its icons and their look on that block; links set to Site Info follow your business details.',
				'sgs-blocks'
			) }
		</p>
	) : (
		<Notice status="warning" isDismissible={ false }>
			<p>
				{ __(
					'The top row shows the first block of the drawer content when it is a Social Icons group. There is none at the top yet.',
					'sgs-blocks'
				) }
			</p>
			<Button variant="secondary" onClick={ addGroup } __next40pxDefaultSize>
				{ __( 'Add a phone and email icon group', 'sgs-blocks' ) }
			</Button>
		</Notice>
	);
}
