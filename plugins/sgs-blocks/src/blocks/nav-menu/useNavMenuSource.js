/**
 * SGS Nav Menu (sgs/nav-menu) — menu-source resolution hook.
 *
 * Split out of edit.js (Spec 41 step 7, pure refactor) to keep the file under
 * the project's 250-line JS budget. No behaviour change — verbatim logic
 * from edit.js, just relocated behind a hook boundary.
 *
 * @package SGS\Blocks
 */
import { __, sprintf } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';
import { useEntityRecords } from '@wordpress/core-data';
import { parse } from '@wordpress/blocks';
import { flattenMenuItems } from './utils';

/**
 * Resolves the classic/block menu source for sgs/nav-menu — the menu picker
 * options, the flattened featured-item checklist, and the toggle handler.
 *
 * @param {Object}   root0                 Hook params.
 * @param {number}   root0.ref             The block's `ref` attribute (menu id).
 * @param {string[]} root0.featuredItemIds The block's `featuredItemIds` attribute.
 * @param {Function} root0.setAttributes   The block's attribute setter.
 * @return {Object} { menuOptions, isResolving, resolvedItems, toggleFeatured }.
 */
export default function useNavMenuSource( { ref, featuredItemIds, setAttributes } ) {
	// Classic menus (Appearance → Menus, `nav_menu` terms) are the PRIMARY source
	// (Spec 36 FR-36-1); block-based wp_navigation menus are the Phase-3 extra.
	const { records: classicMenus, isResolving: isResolvingClassic } =
		useEntityRecords( 'taxonomy', 'nav_menu', { per_page: -1 } );

	const { records: blockMenus, isResolving: isResolvingBlock } =
		useEntityRecords( 'postType', 'wp_navigation', {
			per_page: -1,
			status: [ 'publish' ],
			context: 'edit',
		} );

	const isResolving = isResolvingClassic || isResolvingBlock;

	const classicIds = useMemo(
		() => new Set( ( classicMenus || [] ).map( ( m ) => m.id ) ),
		[ classicMenus ]
	);

	const selectedIsClassic = 0 !== ref && classicIds.has( ref );

	// A `nav_menu` term id and a `wp_navigation` post id are independent sequences,
	// so the same number can name one of each. render.php resolves CLASSIC-FIRST
	// (Bean 2026-07-20), which means a block menu sharing a classic menu's id can
	// never be reached — say so in the option rather than offering a dead choice.
	const menuOptions = [
		{
			label: __( 'Auto (site menu / navigation block)', 'sgs-blocks' ),
			value: 0,
		},
		...( classicMenus || [] ).map( ( menu ) => ( {
			label: menu.name || __( '(untitled menu)', 'sgs-blocks' ),
			value: menu.id,
		} ) ),
		...( blockMenus || [] ).map( ( menu ) => {
			const name =
				menu.title?.rendered || __( '(untitled menu)', 'sgs-blocks' );
			return classicIds.has( menu.id )
				? {
						label: sprintf(
							/* translators: %s: block menu name. */
							__(
								'%s (block menu — unavailable, its ID clashes with a classic menu)',
								'sgs-blocks'
							),
							name
						),
						value: menu.id,
						disabled: true,
				  }
				: {
						label: sprintf(
							/* translators: %s: block menu name. */
							__( '%s (block menu)', 'sgs-blocks' ),
							name
						),
						value: menu.id,
				  };
		} ),
	];

	// Featured-item checklist source. A classic menu's items live in their own
	// `nav_menu_item` records; a block menu's live in the post's block content.
	const { records: classicItems } = useEntityRecords(
		'postType',
		'nav_menu_item',
		{ menus: ref, per_page: -1, context: 'view' },
		{ enabled: selectedIsClassic }
	);

	const selectedBlockMenu = ( blockMenus || [] ).find(
		( m ) => m.id === ref && ! classicIds.has( m.id )
	);

	const resolvedItems = useMemo( () => {
		// Mirrors render.php's identifier scheme: 'id:<object_id>' (the same
		// value core/navigation-link carries) for a top-level item, and
		// '<parent>&gt;<own_key>' for a child, so a ticked featured entry matches
		// whichever menu format is in use.
		if ( selectedIsClassic ) {
			const all = ( classicItems || [] )
				.slice()
				.sort(
					( a, b ) => ( a.menu_order || 0 ) - ( b.menu_order || 0 )
				);
			const keyOf = ( item ) => `id:${ item.object_id ?? item.id }`;
			/*
			 * Children are INCLUDED — a client can tick a nested item as featured,
			 * matching what render.php already marks. Walked parent-first so each
			 * child's identifier is path-qualified against a parent that has
			 * already been resolved.
			 */
			const byParent = new Map();
			all.forEach( ( item ) => {
				const parent = String( item.parent || 0 );
				if ( ! byParent.has( parent ) ) {
					byParent.set( parent, [] );
				}
				byParent.get( parent ).push( item );
			} );
			const out = [];
			const walk = ( parentId, parentPath, depth ) => {
				( byParent.get( String( parentId ) ) || [] ).forEach( ( item ) => {
					const identifier = parentPath
						? `${ parentPath }>${ keyOf( item ) }`
						: keyOf( item );
					// isMega mirrors render.php's from_link() 'type' check — a
					// classic nav_menu_item's REST `object` field carries the
					// linked post type slug for a link to an sgs_mega_menu CPT
					// post. Feeds the megaDrawerFallbackIds checklist
					// (MegaDrawerPanel.js).
					out.push( {
						identifier,
						label:
							item.title?.rendered ||
							__( '(untitled item)', 'sgs-blocks' ),
						depth,
						isMega: 'sgs_mega_menu' === item.object,
						hasChildren:
							( byParent.get( String( item.id ) ) || [] ).length > 0,
					} );
					// Depth 1 matches render.php's MAX_SUBMENU_DEPTH: anything
					// deeper is flattened INTO level 1 there, so offering it as a
					// separate tick here would not match what the server renders.
					if ( depth < 1 ) {
						walk( item.id, identifier, depth + 1 );
					}
				} );
			};
			walk( 0, '', 0 );
			return out;
		}
		if ( ! selectedBlockMenu?.content?.raw ) {
			return [];
		}
		try {
			return flattenMenuItems( parse( selectedBlockMenu.content.raw ) );
		} catch {
			return [];
		}
	}, [ selectedIsClassic, classicItems, selectedBlockMenu?.content?.raw ] );

	const toggleFeatured = ( identifier, checked ) => {
		const next = checked
			? [ ...( featuredItemIds || [] ), identifier ]
			: ( featuredItemIds || [] ).filter( ( id ) => id !== identifier );
		setAttributes( { featuredItemIds: next } );
	};

	return { menuOptions, isResolving, resolvedItems, toggleFeatured };
}
