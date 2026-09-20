/**
 * SGS Nav Bar Menu — "create a new menu panel" action (Spec 37 FR-37-43's
 * inline-creation clause, FR-37-49; behaviour side Spec 36 FR-36-9a).
 *
 * A drawer is a `sgs_drawer` POST, never an in-page block, so creation goes
 * through `core-data`'s `saveEntityRecord` — the same channel the picker reads
 * — rather than inserting a sibling block into the page being edited.
 *
 * @package SGS\Blocks
 */
import { useState } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { __ } from '@wordpress/i18n';
import {
	DRAWER_POST_TYPE,
	DRAWER_QUERY,
	pickDrawerSeedPattern,
	drawerSeedContent,
	drawerTitleFrom,
	createDrawerErrorMessage,
} from './create-drawer-seed';

/**
 * Creation state + action for a new `sgs_drawer` post.
 *
 * @param {Object}   root0               Hook params.
 * @param {Function} root0.setAttributes The block's attribute setter — the new
 *                                       post id is written to `drawerRef`.
 * @return {Object} { canCreate, isCreating, error, created, createDrawer, dismiss }.
 */
export default function useCreateDrawer( { setAttributes } ) {
	const [ isCreating, setIsCreating ] = useState( false );
	const [ error, setError ] = useState( '' );
	const [ created, setCreated ] = useState( null );

	// `canUser` issues an OPTIONS probe against the collection route. That route
	// is gated by Sgs_Cpt_Rest_Gate on `edit_theme_options`, so a user without
	// the capability resolves to false here and never sees the action at all —
	// which is the honest answer, not a button that would 403 on click.
	//
	// `undefined` while the probe is in flight, so the action is offered only
	// once permission is actually known.
	const { canCreate, seedPattern } = useSelect( ( select ) => {
		const core = select( coreStore );
		return {
			canCreate: core.canUser( 'create', {
				kind: 'postType',
				name: DRAWER_POST_TYPE,
			} ),
			seedPattern: pickDrawerSeedPattern( core.getBlockPatterns() || [] ),
		};
	}, [] );

	const { saveEntityRecord, invalidateResolution } = useDispatch( coreStore );

	/**
	 * Creates the post, seeds it, points this burger at it.
	 *
	 * @param {string} rawTitle The inline name field's value.
	 */
	async function createDrawer( rawTitle ) {
		// The pending flag is the double-click guard: a second click while the
		// first save is in flight would create a second orphan drawer post.
		if ( isCreating ) {
			return;
		}
		setError( '' );
		setCreated( null );

		const content = drawerSeedContent( seedPattern );
		if ( '' === content ) {
			setError(
				__(
					'No blank menu-panel starter is registered, so a new panel cannot be created here. Create one in SGS → Menu drawers instead.',
					'sgs-blocks'
				)
			);
			return;
		}

		setIsCreating( true );
		try {
			// Published, not draft: the picker lists only published posts
			// (render.php resolves only published ones too), so a draft would be
			// created and then be invisible in the control that created it.
			const post = await saveEntityRecord(
				'postType',
				DRAWER_POST_TYPE,
				{
					title: drawerTitleFrom( rawTitle, __( 'New menu drawer', 'sgs-blocks' ) ),
					status: 'publish',
					content,
				},
				{ throwOnError: true }
			);

			// A save adds the record to core-data's entity store but does NOT
			// append it to an already-resolved getEntityRecords LIST, so without
			// this the picker would not offer the post it just created until a
			// page reload. The query object must be the same one the picker
			// passes — hence the shared DRAWER_QUERY constant.
			invalidateResolution( 'getEntityRecords', [
				'postType',
				DRAWER_POST_TYPE,
				DRAWER_QUERY,
			] );

			setAttributes( { drawerRef: post.id } );
			setCreated( {
				id: post.id,
				title: post.title?.raw || post.title?.rendered || '',
			} );
		} catch ( saveError ) {
			setError(
				createDrawerErrorMessage(
					saveError,
					__(
						'The menu panel could not be created. Please try again.',
						'sgs-blocks'
					)
				)
			);
		} finally {
			setIsCreating( false );
		}
	}

	return {
		canCreate: true === canCreate,
		isCreating,
		error,
		created,
		createDrawer,
		dismiss: () => {
			setError( '' );
			setCreated( null );
		},
	};
}
