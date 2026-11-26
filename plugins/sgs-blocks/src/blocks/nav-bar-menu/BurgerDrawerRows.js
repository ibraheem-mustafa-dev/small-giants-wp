import { __ } from '@wordpress/i18n';
import { SelectControl, Notice } from '@wordpress/components';
import { useEntityRecords } from '@wordpress/core-data';
import CreateDrawerControl from './CreateDrawerControl';
import { DRAWER_POST_TYPE, DRAWER_QUERY } from './create-drawer-seed';

/**
 * SGS Nav Bar Menu (sgs/nav-bar-menu) — the "Panel this burger opens" rows in the "Menu Button" panel (`BurgerPanel.js`).
 *
 * drawerRef (Spec 37 FR-37-49) is a post-picker: a `SelectControl` populated from PUBLISHED `sgs_drawer` posts, storing a
 * POST ID. `0` means "no specific pick" and falls back to the site's single Active-drawer pointer
 * (`Sgs_Active_Layout::AREA_DRAWER`, PHP-side). Same shape as `sgs/modal`'s `modalRef` control (`modal/edit.js`): the same
 * `useEntityRecords( 'postType', …, { per_page: -1, status: ['publish'], context: 'edit' } )` fetch, the same manual
 * options array with a leading default option, the same dangling-reference `Notice`.
 *
 * A new panel can also be created from here (FR-37-43's inline-creation clause): `CreateDrawerControl` saves a real
 * `sgs_drawer` POST. There is no "insert a drawer block into this page" path: a drawer is never an in-page block.
 *
 * @param {Object}   root0               Props.
 * @param {number}   root0.drawerRef     The block's `drawerRef` attribute (a `sgs_drawer` post id, or 0).
 * @param {Function} root0.setAttributes The block's attribute setter.
 */
export default function BurgerDrawerRows( { drawerRef, setAttributes } ) {
	// Only PUBLISHED posts are offered: an unpublished one would not resolve on the frontend either (render.php /
	// Sgs_Drawer_Render::get_drawer_post_content() applies the same status check), so offering it here would be a picker
	// option that silently opens nothing. DRAWER_QUERY is shared with useCreateDrawer's `invalidateResolution` call:
	// core-data keys its resolution cache on the query arguments, so a query that differed by one key would leave a
	// just-created panel missing from this list until a reload.
	const { records: drawerPosts, isResolving: isResolvingDrawers } =
		useEntityRecords( 'postType', DRAWER_POST_TYPE, DRAWER_QUERY );
	const drawerRefOptions = [
		{
			label: __( "Site's active menu panel (default)", 'sgs-blocks' ),
			value: 0,
		},
		...( drawerPosts || [] ).map( ( post ) => ( {
			label:
				post.title?.rendered ||
				__( '(untitled menu panel)', 'sgs-blocks' ),
			value: post.id,
		} ) ),
	];
	const referencedDrawerPost = ( drawerPosts || [] ).find(
		( post ) => post.id === drawerRef
	);
	// A non-zero drawerRef whose post is missing from the published list above (trashed, unpublished, or deleted since
	// this block last saved) degrades the same way render.php does: nothing opens from the reference.
	const drawerRefIsDangling =
		0 !== drawerRef && ! isResolvingDrawers && ! referencedDrawerPost;

	return (
		<>
			<SelectControl
				label={ __( 'Panel this burger opens', 'sgs-blocks' ) }
				value={ drawerRef }
				options={ drawerRefOptions }
				onChange={ ( val ) =>
					setAttributes( { drawerRef: Number( val ) || 0 } )
				}
				help={ __(
					'Below the size set in Show the burger on, this menu becomes a burger button that opens a menu panel. To change what visitors see in it, select that panel and edit its contents like any other block. Leave on the default to use the panel set as active for the whole site. Pick a specific one only if this burger should open a different panel.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ drawerRefIsDangling && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'The chosen menu panel is missing, unpublished, or was deleted. This burger will open nothing until a valid one is chosen above.',
						'sgs-blocks'
					) }
				</Notice>
			) }

			<CreateDrawerControl setAttributes={ setAttributes } />
		</>
	);
}
