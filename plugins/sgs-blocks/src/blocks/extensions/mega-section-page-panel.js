/**
 * "Section page" Document sidebar panel on the `sgs_mega_menu` editor screen
 * (Spec 36 FR-36-5 "Section page").
 *
 * Picks the page every menu item that opens this panel links to, stored in
 * the `_sgs_mega_section_page` post meta registered by
 * `Sgs_Mega_Menu_CPT::register_meta()` (PHP). Published pages only; clearing
 * the choice stores 0, meaning no section page (the item stays a toggle
 * only). Renders null on every other post type, like cpt-default-panel.js.
 */
import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { useSelect } from '@wordpress/data';
import { useEntityProp, store as coreStore } from '@wordpress/core-data';
import { ComboboxControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';

const POST_TYPE = 'sgs_mega_menu';
const META_KEY = '_sgs_mega_section_page';

const pageLabel = ( page ) =>
	decodeEntities( page.title?.rendered || '' ) ||
	__( '(no title)', 'sgs-blocks' );

if ( ! window.__sgsMegaSectionPagePanelRegistered ) {
	window.__sgsMegaSectionPagePanelRegistered = true;

	const SgsMegaSectionPagePanel = () => {
		const [ search, setSearch ] = useState( '' );
		const postType = useSelect(
			( select ) => select( 'core/editor' ).getCurrentPostType(),
			[]
		);
		// Hooks run unconditionally; the post-type guard below gates rendering.
		const [ meta, setMeta ] = useEntityProp( 'postType', postType, 'meta' );
		const pageId = Number( meta?.[ META_KEY ] ) || 0;

		const { pages, current } = useSelect(
			( select ) => {
				if ( POST_TYPE !== postType ) {
					return { pages: [], current: null };
				}
				const store = select( coreStore );
				return {
					pages:
						store.getEntityRecords( 'postType', 'page', {
							per_page: 20,
							status: 'publish',
							search: search || undefined,
							orderby: 'title',
							order: 'asc',
						} ) || [],
					current: pageId
						? store.getEntityRecord( 'postType', 'page', pageId )
						: null,
				};
			},
			[ postType, search, pageId ]
		);

		if ( POST_TYPE !== postType ) {
			return null;
		}

		const options = pages.map( ( page ) => ( {
			value: String( page.id ),
			label: pageLabel( page ),
		} ) );
		if ( current && ! options.some( ( o ) => o.value === String( current.id ) ) ) {
			options.unshift( { value: String( current.id ), label: pageLabel( current ) } );
		}

		return (
			<PluginDocumentSettingPanel
				name="sgs-mega-section-page-panel"
				title={ __( 'Section page', 'sgs-blocks' ) }
			>
				<ComboboxControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Links to', 'sgs-blocks' ) }
					help={ __(
						'Menu items that open this panel link to this page, with a separate arrow that opens the panel. Leave empty for an item that only opens the panel.',
						'sgs-blocks'
					) }
					value={ pageId ? String( pageId ) : null }
					options={ options }
					onFilterValueChange={ setSearch }
					onChange={ ( value ) =>
						setMeta( { ...meta, [ META_KEY ]: value ? parseInt( value, 10 ) : 0 } )
					}
				/>
			</PluginDocumentSettingPanel>
		);
	};

	registerPlugin( 'sgs-mega-section-page-panel', { render: SgsMegaSectionPagePanel } );
}
