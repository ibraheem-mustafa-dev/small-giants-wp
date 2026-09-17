import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	RangeControl,
	Notice,
} from '@wordpress/components';
import { useEntityRecords } from '@wordpress/core-data';

/**
 * SGS Nav Bar Menu (sgs/nav-bar-menu) — Settings tab panels: Accessibility, Menu
 * panel, Dropdown menus.
 *
 * Split out of edit.js (Spec 41 step 7, pure refactor) to keep the file under
 * the project's 250-line JS budget — sibling of MenuSettingsPanel.js (see its
 * docblock for why this pair exists instead of one SettingsPanels.js). No
 * behaviour change — verbatim JSX from edit.js's `<InspectorControls>`
 * (default group) block.
 *
 * drawerRef (Task 6/W2-b, Spec 37 FR-37-49) — re-typed from a free-text
 * `TextControl` (a raw DOM-id STRING an operator had to type to MATCH the
 * target `sgs/nav-drawer` block's own `drawerRef`, silently broken by any
 * typo) to a real post-picker: a `SelectControl` populated from PUBLISHED
 * `sgs_drawer` posts, storing a POST ID. `0` means "no specific pick" and
 * falls back to the site's single Active-drawer pointer
 * (`Sgs_Active_Layout::AREA_DRAWER`, PHP-side). Shape copied verbatim from
 * `sgs/modal`'s `modalRef` control (`modal/edit.js`) — same
 * `useEntityRecords( 'postType', …, { per_page: -1, status: ['publish'],
 * context: 'edit' } )` fetch, same manual-options-array-with-a-leading-
 * default-option shape, same dangling-reference `Notice` pattern.
 *
 * @param {Object}   root0                   Props.
 * @param {string}   root0.navLabel          The block's `navLabel` attribute.
 * @param {Function} root0.setAttributes     The block's attribute setter.
 * @param {number}   root0.drawerRef         The block's `drawerRef` attribute (a `sgs_drawer` post id, or 0).
 * @param {string}   root0.submenuAlign      The block's `submenuAlign` attribute.
 * @param {boolean}  root0.submenuCaret      The block's `submenuCaret` attribute.
 * @param {number}   root0.submenuCloseGrace The block's `submenuCloseGrace` attribute.
 */
export default function DropdownSettingsPanel( {
	navLabel,
	itemSmartContrast,
	setAttributes,
	drawerRef,
	submenuAlign,
	submenuCaret,
	submenuCloseGrace,
} ) {
	// Only PUBLISHED posts are offered — an unpublished one wouldn't resolve on
	// the frontend either (render.php / Sgs_Drawer_Render::get_drawer_post_content()
	// applies the same status check), so offering it here would be a picker
	// option that silently opens nothing.
	const { records: drawerPosts, isResolving: isResolvingDrawers } = useEntityRecords(
		'postType',
		'sgs_drawer',
		{ per_page: -1, status: [ 'publish' ], context: 'edit' }
	);
	const drawerRefOptions = [
		{
			label: __( "Site's active menu panel (default)", 'sgs-blocks' ),
			value: 0,
		},
		...( drawerPosts || [] ).map( ( post ) => ( {
			label: post.title?.rendered || __( '(untitled menu panel)', 'sgs-blocks' ),
			value: post.id,
		} ) ),
	];
	const referencedDrawerPost = ( drawerPosts || [] ).find( ( post ) => post.id === drawerRef );
	// A non-zero drawerRef whose post is missing from the published list above
	// — trashed, unpublished, or deleted since this block last saved —
	// degrades the same way render.php does: nothing opens from the reference.
	const drawerRefIsDangling = 0 !== drawerRef && ! isResolvingDrawers && ! referencedDrawerPost;
	return (
		<>
			<PanelBody title={ __( 'Accessibility', 'sgs-blocks' ) } initialOpen={ false }>
				<TextControl
					label={ __( 'Navigation label', 'sgs-blocks' ) }
					value={ navLabel }
					placeholder={ __(
						'Auto — from the menu name',
						'sgs-blocks'
					) }
					onChange={ ( val ) =>
						setAttributes( { navLabel: val } )
					}
					help={ __(
						'Accessible name for this menu landmark. Leave blank to use the chosen menu’s own name, so two menus are named apart automatically. Set it only to override that (e.g. Primary, Footer).',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>

				{ /* RELOCATED here in step 14 (Spec 41 §9.5 / FR-41-27) from the old
				   Design-tab colour/state area. It sits beside the navigation label
				   because both answer "does this menu behave safely for every
				   visitor", which is what a General-tab Accessibility panel is for.
				   DEFAULT FLIPPED 2026-09-13 (Bean-directed): was default-ON
				   (silently swapping an operator's explicit hover colour); now
				   default-OFF — an explicit colour always renders as-authored
				   unless this is switched ON. The readability CHECK itself is
				   unconditional regardless of this toggle: the item-text row below
				   always shows an advisory note when the hover colour would be hard
				   to read, and points back here.
				   ⛔ No "WCAG", no "contrast ratio", no "AA" in any client-visible
				   string on this block (FR-41-5). */ }
				<ToggleControl
					label={ __( 'Keep text readable automatically', 'sgs-blocks' ) }
					checked={ itemSmartContrast === true }
					onChange={ ( val ) => setAttributes( { itemSmartContrast: val } ) }
					help={ __(
						'When you set a background, we can check your text colour stays readable against it and swap in a readable one if it doesn’t. Off by default, so your chosen colour always renders exactly as picked — switch this on to have it corrected automatically instead.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
				/>
			</PanelBody>

			<PanelBody title={ __( 'Menu panel', 'sgs-blocks' ) } initialOpen={ false }>
				<p style={ { marginTop: 0 } }>
					{ __(
						'Below the collapse size (see Burger Menu above) this menu becomes a burger button that opens a menu panel — on any device, including desktop if you choose Always. To change what visitors see in it, select that panel and edit its contents like any other block.',
						'sgs-blocks'
					) }
				</p>
				<SelectControl
					label={ __( 'Panel this burger opens', 'sgs-blocks' ) }
					value={ drawerRef }
					options={ drawerRefOptions }
					onChange={ ( val ) =>
						setAttributes( { drawerRef: Number( val ) || 0 } )
					}
					help={ __(
						'Leave on the default to use the panel set as active for the whole site. Pick a specific one only if this burger should open a different panel.',
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

			</PanelBody>

			<PanelBody
				title={ __( 'Dropdown menus', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<p style={ { marginTop: 0 } }>
					{ __(
						'These settings apply to any menu item that has items nested under it in Appearance → Menus. Nothing here needs changing for a flat menu.',
						'sgs-blocks'
					) }
				</p>
				<SelectControl
					label={ __( 'Open from', 'sgs-blocks' ) }
					value={ submenuAlign || 'start' }
					options={ [
						{
							label: __(
								'Left edge of the menu item',
								'sgs-blocks'
							),
							value: 'start',
						},
						{
							label: __(
								'Centred under the menu item',
								'sgs-blocks'
							),
							value: 'center',
						},
						{
							label: __(
								'Right edge of the menu item',
								'sgs-blocks'
							),
							value: 'end',
						},
					] }
					onChange={ ( value ) =>
						setAttributes( { submenuAlign: value } )
					}
					help={ __(
						'Left is the usual choice — the first item sits closest to where the visitor clicked. If a dropdown would run off the edge of the screen it flips to the other side automatically, whichever option you pick.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<ToggleControl
					label={ __(
						'Show a small arrow on items that open',
						'sgs-blocks'
					) }
					checked={ submenuCaret !== false }
					onChange={ ( value ) =>
						setAttributes( { submenuCaret: value } )
					}
					help={ __(
						'The arrow tells visitors the item has more beneath it. Turning it off hides that cue.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
				/>
				<RangeControl
					label={ __( 'Close delay', 'sgs-blocks' ) }
					value={
						typeof submenuCloseGrace === 'number'
							? submenuCloseGrace
							: 170
					}
					min={ 0 }
					max={ 600 }
					step={ 10 }
					onChange={ ( value ) =>
						setAttributes( {
							submenuCloseGrace:
								typeof value === 'number' ? value : 170,
						} )
					}
					help={ __(
						'How long the dropdown waits before closing when the pointer leaves it, in milliseconds. A short delay stops it snapping shut while someone is moving towards it.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</PanelBody>
		</>
	);
}
