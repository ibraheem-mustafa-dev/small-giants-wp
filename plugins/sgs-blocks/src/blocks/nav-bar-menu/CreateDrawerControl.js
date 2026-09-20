/**
 * SGS Nav Bar Menu — the "create a new menu panel" affordance (Spec 37
 * FR-37-43 inline-creation clause / FR-37-49).
 *
 * Mounted ONCE, directly beneath the drawer picker in `DropdownSettingsPanel`.
 * A single mount is deliberate: the success and failure notices below are this
 * action's only feedback, and a second mount elsewhere would either duplicate
 * them or unmount mid-flight (setting `drawerRef` clears the burger's
 * "opens nothing" notice, which would take a second mount down with it). The
 * panel instead opens itself when that notice is showing, so the operator lands
 * on the picker and this action together.
 *
 * @package SGS\Blocks
 */
import { __, sprintf } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { Button, Notice, TextControl, Flex, FlexItem } from '@wordpress/components';
import { drawerEditUrl } from './create-drawer-seed';
import useCreateDrawer from './useCreateDrawer';

/**
 * @param {Object}   root0               Props.
 * @param {Function} root0.setAttributes The block's attribute setter.
 */
export default function CreateDrawerControl( { setAttributes } ) {
	const { canCreate, isCreating, error, created, createDrawer, dismiss } =
		useCreateDrawer( { setAttributes } );
	const [ isNaming, setIsNaming ] = useState( false );
	const [ title, setTitle ] = useState( '' );
	const defaultTitle = __( 'New menu drawer', 'sgs-blocks' );

	if ( ! canCreate ) {
		return null;
	}

	async function submit() {
		await createDrawer( title );
		setIsNaming( false );
		setTitle( '' );
	}

	return (
		<>
			{ !! error && (
				<Notice status="error" onRemove={ dismiss }>
					{ error }
				</Notice>
			) }

			{ !! created && (
				<Notice status="success" onRemove={ dismiss }>
					<p>
						{ sprintf(
							/* translators: %s: title of the menu panel just created. */
							__(
								'“%s” was created and this burger now opens it. It is a separate item, so it does not appear in this editor — open it to add your links and content.',
								'sgs-blocks'
							),
							created.title || defaultTitle
						) }
					</p>
					<Button
						variant="secondary"
						size="small"
						href={ drawerEditUrl( created.id ) }
						target="_blank"
						rel="noopener noreferrer"
					>
						{ __( 'Edit this menu panel (opens a new tab)', 'sgs-blocks' ) }
					</Button>
				</Notice>
			) }

			{ ! isNaming && (
				<Button
					variant="secondary"
					size="small"
					disabled={ isCreating }
					accessibleWhenDisabled
					onClick={ () => setIsNaming( true ) }
				>
					{ __( 'Create a new menu panel', 'sgs-blocks' ) }
				</Button>
			) }

			{ isNaming && (
				<>
					<TextControl
						label={ __( 'Name the new menu panel', 'sgs-blocks' ) }
						value={ title }
						placeholder={ defaultTitle }
						onChange={ setTitle }
						help={ __(
							'Only you see this name — it is how you will find the panel in SGS → Menu drawers.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<Flex justify="flex-start" gap={ 2 }>
						<FlexItem>
							<Button
								variant="primary"
								size="small"
								isBusy={ isCreating }
								disabled={ isCreating }
								accessibleWhenDisabled
								onClick={ submit }
							>
								{ isCreating
									? __( 'Creating…', 'sgs-blocks' )
									: __( 'Create', 'sgs-blocks' ) }
							</Button>
						</FlexItem>
						<FlexItem>
							<Button
								variant="tertiary"
								size="small"
								disabled={ isCreating }
								accessibleWhenDisabled
								onClick={ () => {
									setIsNaming( false );
									setTitle( '' );
								} }
							>
								{ __( 'Cancel', 'sgs-blocks' ) }
							</Button>
						</FlexItem>
					</Flex>
				</>
			) }
		</>
	);
}
