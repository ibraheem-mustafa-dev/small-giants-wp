/**
 * SGS Nav Menu (sgs/nav-menu) — editor.
 *
 * The bar is fully server-rendered by render.php (menu source resolved via
 * SGS_Nav_Menu_Source). The editor uses ServerSideRender for the canvas
 * preview (the ssr-fixes-hand-built-preview-drift lesson — a hand-built
 * preview drifts from render.php) and exposes Settings + Styles as WP's
 * native inspector tabs (`InspectorControls` default group = Settings,
 * `group="styles"` = Styles; Advanced/className/anchor is WP's own
 * automatic panel — no bespoke third tab).
 *
 * @package SGS\Blocks
 */
import { __, sprintf } from '@wordpress/i18n';
import { useMemo, useState } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import {
	useBlockProps,
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { useEntityRecords } from '@wordpress/core-data';
import { parse, createBlock, store as blocksStore } from '@wordpress/blocks';
import {
	PanelBody,
	SelectControl,
	CheckboxControl,
	TextControl,
	ToggleControl,
	ButtonGroup,
	Button,
	Notice,
	RangeControl,
	__experimentalUnitControl as UnitControl,
	__experimentalBoxControl as BoxControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import {
	DesignTokenPicker,
	TypographyControls,
	StateToggleControl,
	ResponsiveBoxControl,
	ResponsiveControl,
} from '../../components';

/**
 * Burger Menu scope presets (Bean 2026-07-28 — no bare px values in the UI).
 * The stored attribute stays the numeric `collapsePoint` (render.php and the
 * emitted @media rules are unchanged); these are the operator-facing names:
 *
 * - mobile (DEFAULT) — burger below 768px (the device-tier mobile boundary,
 *   `~/.claude/rules/visual-standards.md`).
 * - tablet — burger below 1024px (tablet + mobile collapse).
 * - always — burger on EVERY device. 99999px comfortably exceeds any real
 *   viewport; increasingly common on large sites (drawer-first navigation).
 * - custom — any other stored value; picking it in the UI reveals the px box.
 */
const BURGER_SCOPE_PX = { mobile: 768, tablet: 1024, always: 99999 };

/**
 * Resolve a stored collapsePoint back to its scope name for the toggle.
 *
 * @param {number} px Stored collapse point.
 * @return {string} 'mobile' | 'tablet' | 'always' | 'custom'.
 */
function burgerScopeOf( px ) {
	if ( px === BURGER_SCOPE_PX.always ) {
		return 'always';
	}
	if ( px === BURGER_SCOPE_PX.tablet ) {
		return 'tablet';
	}
	if ( px === BURGER_SCOPE_PX.mobile ) {
		return 'mobile';
	}
	return 'custom';
}

/**
 * Link-count threshold for informational notice (FR-36-8, FR-36-12).
 * Baymard's research identified ~50 links as the abandonment cliff in navigation.
 * This is directional; validate against our own sites and adjust as needed.
 * NOT a gate — the operator can always save/publish regardless.
 *
 * @see https://baymard.com/blog/website-navigation-menu-increase-usability
 */
const LINK_COUNT_THRESHOLD = 50;

/**
 * Client-side mirror of render.php's SGS_Nav_Menu_Bar_Renderer::flatten() —
 * top-level items only (submenus collapse to their own link), same
 * identifier rule ('id:<id>' when the block carries one, else 'label:<text>')
 * so a ticked featuredItemIds entry matches the server-rendered item.
 *
 * @param {Array} blocks Parsed top-level nav blocks.
 * @return {Array<{identifier: string, label: string}>} Flattened items.
 */
function flattenMenuItems( blocks, parentPath = '', depth = 0 ) {
	const items = [];
	( blocks || [] ).forEach( ( block ) => {
		if ( 'core/home-link' === block.name ) {
			items.push( {
				identifier: 'special:home',
				label: __( 'Home', 'sgs-blocks' ),
				depth,
			} );
			return;
		}
		// core/page-list featured-marking is a Phase-1 limitation — the editor
		// can't expand a page-list without a REST call, so page-list items are
		// not offered in the featured checklist this phase.
		if (
			! [
				'core/navigation-link',
				'core/navigation-submenu',
			].includes( block.name )
		) {
			return;
		}
		const label = block.attributes?.label;
		if ( ! label ) {
			return;
		}
		const id = block.attributes?.id;
		const ownKey = id ? `id:${ id }` : `label:${ label }`;
		/*
		 * Path-qualified EXACTLY as render.php does (`$parent_path . '>' .
		 * $own_key`), or a ticked child would never match the item the server
		 * renders. Top-level keys stay bare, so existing selections still match.
		 */
		const identifier = parentPath ? `${ parentPath }>${ ownKey }` : ownKey;
		items.push( { identifier, label, depth } );
		/*
		 * Recurse into children. Without this the checklist listed TOP-LEVEL
		 * items only, so render.php's featured-child support (it marks any child
		 * whose identifier is in featuredItemIds) was unreachable from the
		 * editor — the block could render a featured child but no client could
		 * ever ask for one. Council-caught; by this project's own rule a setting
		 * that needs code is not done.
		 */
		if ( 'core/navigation-submenu' === block.name ) {
			items.push(
				...flattenMenuItems( block.innerBlocks, identifier, depth + 1 )
			);
		}
	} );
	return items;
}

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		ref,
		collapsePoint,
		drawerRef,
		navLabel,
		featuredItemIds,
		gap,
		maxWidth,
		listColumns,
		navBg,
		navColour,
		navBgHover,
		itemColour,
		itemBg,
		itemColourHover,
		itemBgHover,
		itemRadius,
		itemRadiusHover,
		hoverStyle,
		underlineColour,
		underlineColourHover,
		underlineThickness,
		underlineOffset,
		featuredColour,
		featuredBg,
		featuredColourHover,
		featuredBgHover,
		featuredRadius,
		featuredRadiusHover,
		featuredFontWeight,
		featuredFontWeightHover,
		burgerColour,
		burgerBg,
		burgerHoverColour,
		burgerSize,
		indicatorStyle,
		indicatorColour,
		itemMagnetEnabled,
		submenuAlign,
		submenuCaret,
		submenuCloseGrace,
		submenuBg,
		submenuColour,
		submenuMinWidth,
		submenuRadius,
		submenuPadding,
	} = attributes;

	// Burger Menu 'Custom' reveal — UI-only state (the stored value is collapsePoint).
	const [ showCustomCollapse, setShowCustomCollapse ] = useState( false );

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
			 * Children are INCLUDED. This used to `.filter( item => ! item.parent )`,
			 * which meant a client could never tick a nested item as featured even
			 * though render.php marks one happily — the capability existed with no
			 * way to reach it. Walked parent-first so each child's identifier is
			 * path-qualified against a parent that has already been resolved.
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
					out.push( {
						identifier,
						label:
							item.title?.rendered ||
							__( '(untitled item)', 'sgs-blocks' ),
						depth,
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

	// ── FR-36-9a(2) — the burger must open something. ───────────────────────
	//
	// This menu collapses to a burger below `collapsePoint` and opens
	// sgs/nav-drawer BY ID (render.php:295-317 → the drawer's <dialog> id,
	// nav-drawer/render.php:236). Every header STARTER pattern ships a drawer
	// as a SIBLING of sgs/site-header — but a header built by inserting the
	// blocks by hand has none, so the burger opens nothing, silently, and a
	// non-coder cannot diagnose it. That is the only hard FAIL in the FR-37-26
	// operator-simplicity test (parking P-HEADER-SIMPLICITY-FINDINGS finding 1).
	//
	// The drawer CANNOT be seeded from sgs/site-header's own TEMPLATE: its root
	// is a <dialog> that promotes to the top layer, it must be a sibling of the
	// header, and the container is templateLock:'all' around exactly three rows
	// (header-scratch.php:32-35 records the same reasoning for the patterns).
	// A notice on this block is the only thing that reaches the raw-insert path.
	//
	// Informational + fixable, NEVER a save/publish gate (FR-37-19 / P1 DP2a).
	//
	// Both sides fall back to 'sgs-nav-drawer' when the attribute is blank
	// (nav-menu/render.php:295-297, nav-drawer/render.php:61-65) — mirror that
	// here or a blank-vs-default pair would look mismatched when it is not.
	const effectiveDrawerRef = ( drawerRef || '' ).trim() || 'sgs-nav-drawer';

	const drawerState = useSelect(
		( select ) => {
			const be = select( blockEditorStore );

			// A nav-menu INSIDE a drawer renders a vertical list, not a burger.
			// It has no drawer of its own to open, so it must never warn.
			if (
				be.getBlockParentsByBlockName( clientId, 'sgs/nav-drawer' )
					.length > 0
			) {
				return { suppress: true };
			}

			const drawerIds = be.getBlocksByName
				? be.getBlocksByName( 'sgs/nav-drawer' )
				: [];
			const refs = drawerIds.map( ( id ) => {
				const attrs = be.getBlockAttributes( id ) || {};
				return ( attrs.drawerRef || '' ).trim() || 'sgs-nav-drawer';
			} );

			// A new drawer goes at the ROOT, immediately after whichever
			// top-level block this menu sits inside (the header) — a sibling,
			// never a child.
			const parents = be.getBlockParents( clientId );
			const outermost = parents.length ? parents[ 0 ] : clientId;

			return {
				suppress: false,
				total: refs.length,
				matches: refs.includes( effectiveDrawerRef ),
				firstRef: refs[ 0 ] || '',
				insertIndex: be.getBlockIndex( outermost ) + 1,
				// createBlock throws on an unregistered slug — never offer a
				// fix action that cannot run.
				canCreate: !! select( blocksStore ).getBlockType(
					'sgs/nav-drawer'
				),
			};
		},
		[ clientId, effectiveDrawerRef ]
	);

	const { insertBlock } = useDispatch( blockEditorStore );

	const addDrawer = () => {
		insertBlock(
			createBlock(
				'sgs/nav-drawer',
				{ drawerRef: effectiveDrawerRef },
				// Seed the same menu the bar uses, matching header-scratch.php
				// — the drawer opens with real links rather than empty.
				[ createBlock( 'sgs/nav-menu', { ref: ref || 0 } ) ]
			),
			drawerState.insertIndex,
			undefined, // root level
			true // select it, so the operator lands on its content
		);
	};

	// ── W2-a — the drawer moved to its own edit screen, so this notice had to
	// learn about it or it would start LYING. ────────────────────────────────
	//
	// The warning above fires when the canvas holds no sgs/nav-drawer block with a
	// matching id. Once the drawer lives in the `sgs_drawer` CPT, that is the
	// NORMAL, CORRECT state of every ordinary page — the panel is site-wide, not in
	// this post — and the notice would tell every operator their burger is broken
	// when it works perfectly.
	//
	// `activeDrawer` is published by PHP onto the existing window.sgsBlocksData
	// channel (class-sgs-blocks.php) and is null when no Active drawer RESOLVES
	// (get_active_id fails closed on trashed/draft/wrong-type), so a broken pointer
	// still produces the genuine warning rather than a false reassurance.
	//
	// Matched on `ref`, not on mere existence: the burger opens a drawer BY ELEMENT
	// ID, so an Active drawer whose own drawerRef differs opens nothing. Claiming
	// otherwise would be the same optimism this notice exists to prevent.
	const activeDrawer =
		( typeof window !== 'undefined' &&
			window.sgsBlocksData &&
			window.sgsBlocksData.activeDrawer ) ||
		null;
	const activeDrawerMatches =
		!! activeDrawer && activeDrawer.ref === effectiveDrawerRef;

	// The site-wide panel answers this burger: say where to edit it, and declare
	// the canvas limitation (wp_footer never fires in the editor, so the panel
	// cannot be previewed here) rather than leaving a non-coder to read its absence
	// as a fault.
	const showActiveDrawerNotice =
		! drawerState.suppress && ! drawerState.matches && activeDrawerMatches;

	const showDrawerNotice =
		! drawerState.suppress && ! drawerState.matches && ! activeDrawerMatches;

	const blockProps = useBlockProps();

	return (
		<>
			{ /* ── Settings tab (default InspectorControls group) ──────────── */ }
			<InspectorControls>
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
							<>
								<p style={ { margin: '0 0 8px' } }>
									{ sprintf(
										/* translators: 1: drawer id this menu points at. 2: the drawer id that actually exists. */
										__(
											'This burger is set to open a menu panel named “%1$s”, but no panel with that name is here. The panel that does exist is named “%2$s”.',
											'sgs-blocks'
										),
										effectiveDrawerRef,
										drawerState.firstRef
									) }
								</p>
								<Button
									variant="primary"
									size="small"
									onClick={ () =>
										setAttributes( {
											drawerRef: drawerState.firstRef,
										} )
									}
								>
									{ sprintf(
										/* translators: %s: the drawer id that actually exists. */
										__( 'Open “%s” instead', 'sgs-blocks' ),
										drawerState.firstRef
									) }
								</Button>
							</>
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

				{ resolvedItems.length > LINK_COUNT_THRESHOLD && (
					<Notice status="info" isDismissible={ true } style={ { marginBottom: '16px' } }>
						{ sprintf(
							/* translators: %d is the number of links. */
							__( 'This menu has %d links. Consider simplifying to reduce cognitive load and improve usability.', 'sgs-blocks' ),
							resolvedItems.length
						) }
					</Notice>
				) }

				<PanelBody title={ __( 'Menu', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Menu', 'sgs-blocks' ) }
						value={ ref || 0 }
						options={ menuOptions }
						onChange={ ( val ) =>
							setAttributes( { ref: Number( val ) || 0 } )
						}
						disabled={ isResolving }
						help={ __(
							'Auto follows the header navigation block / the site’s primary menu. Choose a specific menu to render an independent one. Manage menus in Appearance → Menus.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody title={ __( 'Burger Menu', 'sgs-blocks' ) }>
					<ToggleGroupControl
						label={ __( 'Show the burger on', 'sgs-blocks' ) }
						help={ __(
							'Choose how far up the burger reaches. Always turns this into a burger-only menu on every device — increasingly common on large sites. Below the chosen size the links collapse into the burger; above it they show as a bar.',
							'sgs-blocks'
						) }
						value={ burgerScopeOf( collapsePoint ) }
						isBlock
						__nextHasNoMarginBottom
						onChange={ ( value ) => {
							if ( value === 'custom' ) {
								setAttributes( { collapsePoint: collapsePoint || 768 } );
								setShowCustomCollapse( true );
								return;
							}
							setShowCustomCollapse( false );
							setAttributes( {
								collapsePoint: BURGER_SCOPE_PX[ value ],
							} );
						} }
					>
						<ToggleGroupControlOption
							value="always"
							label={ __( 'Always', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="tablet"
							label={ __( 'Tablet', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="mobile"
							label={ __( 'Mobile', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="custom"
							label={ __( 'Custom', 'sgs-blocks' ) }
						/>
					</ToggleGroupControl>

					{ ( showCustomCollapse ||
						burgerScopeOf( collapsePoint ) === 'custom' ) && (
						<UnitControl
							label={ __( 'Switch to burger below', 'sgs-blocks' ) }
							value={ `${ collapsePoint }px` }
							units={ [ { value: 'px', label: 'px', default: 768 } ] }
							onChange={ ( val ) => {
								const n = parseInt( val, 10 );
								if ( ! Number.isNaN( n ) && n > 0 ) {
									setAttributes( { collapsePoint: n } );
								}
							} }
							__next40pxDefaultSize
						/>
					) }

				</PanelBody>

				<PanelBody
					title={ __( 'Featured items', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ 0 === ref && (
						<p>
							{ __(
								'Choose a specific menu above to pick which items are featured.',
								'sgs-blocks'
							) }
						</p>
					) }
					{ 0 !== ref && 0 === resolvedItems.length && (
						<p>
							{ __(
								'This menu has no top-level items yet.',
								'sgs-blocks'
							) }
						</p>
					) }
					{ resolvedItems.map( ( item ) => (
						/*
						 * Nested items are indented so the list reads as the menu's
						 * own shape. Children appear at all now — the list was
						 * top-level only, which made render.php's featured-child
						 * support unreachable from the editor.
						 */
						<div
							key={ item.identifier }
							style={ {
								marginLeft: `${ ( item.depth || 0 ) * 20 }px`,
							} }
						>
							<CheckboxControl
								label={ item.label }
								checked={ ( featuredItemIds || [] ).includes(
									item.identifier
								) }
								onChange={ ( checked ) =>
									toggleFeatured( item.identifier, checked )
								}
								__nextHasNoMarginBottom
							/>
						</div>
					) ) }
				</PanelBody>

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
					/>
				</PanelBody>

				<PanelBody title={ __( 'Menu panel', 'sgs-blocks' ) } initialOpen={ false }>
					<p style={ { marginTop: 0 } }>
						{ __(
							'Below the collapse size (see Burger Menu above) this menu becomes a burger button that opens a menu panel — on any device, including desktop if you choose Always. To change what visitors see in it, select that panel and edit its contents like any other block.',
							'sgs-blocks'
						) }
					</p>
					<TextControl
						label={ __( 'Panel this burger opens', 'sgs-blocks' ) }
						value={ drawerRef }
						onChange={ ( val ) =>
							setAttributes( { drawerRef: val } )
						}
						help={ __(
							'Only change this if the page has more than one menu panel — it must match the name set on the panel you want to open.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>

					<ResponsiveControl label={ __( 'Panel columns', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<RangeControl
								label={ __( 'Panel columns', 'sgs-blocks' ) }
								hideLabelFromVision
								help={ __(
									'How many columns this list uses when it renders inside a menu panel (a horizontal bar always stays one row). 1 is the default.',
									'sgs-blocks'
								) }
								min={ 1 }
								max={ 4 }
								value={ listColumns?.[ breakpoint ] || 1 }
								onChange={ ( value ) =>
									setAttributes( {
										listColumns: { ...listColumns, [ breakpoint ]: value || undefined },
									} )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveControl>
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
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<ToolsPanel
					label={ __( 'Bar', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							gap: '8px',
							maxWidth: '',
							paddingTablet: {},
							paddingMobile: {},
						} )
					}
				>
					<ToolsPanelItem
						hasValue={ () => !! gap && gap !== '8px' }
						label={ __( 'Item gap', 'sgs-blocks' ) }
						onDeselect={ () => setAttributes( { gap: '8px' } ) }
						isShownByDefault
					>
						<UnitControl
							label={ __( 'Item gap', 'sgs-blocks' ) }
							value={ gap }
							onChange={ ( val ) =>
								setAttributes( { gap: val || '8px' } )
							}
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						hasValue={ () => !! maxWidth }
						label={ __( 'Max width', 'sgs-blocks' ) }
						onDeselect={ () => setAttributes( { maxWidth: '' } ) }
						isShownByDefault
					>
						<UnitControl
							label={ __( 'Max width', 'sgs-blocks' ) }
							value={ maxWidth }
							onChange={ ( val ) =>
								setAttributes( { maxWidth: val || '' } )
							}
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						hasValue={ () =>
							Object.keys( attributes.paddingTablet || {} )
								.length > 0 ||
							Object.keys( attributes.paddingMobile || {} )
								.length > 0
						}
						label={ __( 'Padding', 'sgs-blocks' ) }
						onDeselect={ () =>
							setAttributes( {
								paddingTablet: {},
								paddingMobile: {},
							} )
						}
						isShownByDefault
					>
						<ResponsiveBoxControl
							label={ __( 'Padding', 'sgs-blocks' ) }
							values={ {
								base: attributes.style?.spacing?.padding ?? {},
								tablet: attributes.paddingTablet ?? {},
								mobile: attributes.paddingMobile ?? {},
							} }
							onChange={ ( tier, next ) => {
								if ( 'base' === tier ) {
									setAttributes( {
										style: {
											...attributes.style,
											spacing: {
												...attributes.style?.spacing,
												padding: next,
											},
										},
									} );
								} else {
									setAttributes( {
										[ `padding${
											'tablet' === tier
												? 'Tablet'
												: 'Mobile'
										}` ]: next,
									} );
								}
							} }
						/>
					</ToolsPanelItem>
				</ToolsPanel>

				{ /*
				   Dropdown appearance. Every control is unset by default, so a
				   menu with no nested items — and any existing nav — renders
				   exactly as before. Unset writes NO custom property at all, so
				   the stylesheet's own fallback applies rather than a value
				   silently overriding the theme.
				*/ }
				<ToolsPanel
					label={ __(
						'Dropdown (only affects items with sub-items)',
						'sgs-blocks'
					) }
					resetAll={ () =>
						setAttributes( {
							submenuBg: '',
							submenuColour: '',
							submenuMinWidth: '',
							submenuRadius: '',
							submenuPadding: {},
						} )
					}
				>
					<ToolsPanelItem
						hasValue={ () => !! submenuBg }
						label={ __( 'Background', 'sgs-blocks' ) }
						onDeselect={ () => setAttributes( { submenuBg: '' } ) }
						isShownByDefault
					>
						<DesignTokenPicker
							label={ __( 'Background', 'sgs-blocks' ) }
							value={ submenuBg }
							onChange={ ( val ) =>
								setAttributes( { submenuBg: val || '' } )
							}
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						hasValue={ () => !! submenuColour }
						label={ __( 'Link colour', 'sgs-blocks' ) }
						onDeselect={ () =>
							setAttributes( { submenuColour: '' } )
						}
						isShownByDefault
					>
						<DesignTokenPicker
							label={ __( 'Link colour', 'sgs-blocks' ) }
							value={ submenuColour }
							onChange={ ( val ) =>
								setAttributes( { submenuColour: val || '' } )
							}
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						hasValue={ () => !! submenuMinWidth }
						label={ __( 'Minimum width', 'sgs-blocks' ) }
						onDeselect={ () =>
							setAttributes( { submenuMinWidth: '' } )
						}
					>
						<UnitControl
							label={ __( 'Minimum width', 'sgs-blocks' ) }
							value={ submenuMinWidth }
							onChange={ ( val ) =>
								setAttributes( { submenuMinWidth: val || '' } )
							}
							help={ __(
								'Stops a dropdown shrinking to the width of its shortest link.',
								'sgs-blocks'
							) }
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						hasValue={ () => !! submenuRadius }
						label={ __( 'Corner radius', 'sgs-blocks' ) }
						onDeselect={ () =>
							setAttributes( { submenuRadius: '' } )
						}
					>
						<UnitControl
							label={ __( 'Corner radius', 'sgs-blocks' ) }
							value={ submenuRadius }
							onChange={ ( val ) =>
								setAttributes( { submenuRadius: val || '' } )
							}
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						hasValue={ () =>
							!! submenuPadding &&
							Object.keys( submenuPadding ).length > 0
						}
						label={ __( 'Inner spacing', 'sgs-blocks' ) }
						onDeselect={ () =>
							setAttributes( { submenuPadding: {} } )
						}
					>
						{ /*
						   WP's NATIVE BoxControl, not ResponsiveBoxControl.
						   ResponsiveBoxControl stores a tier-shaped
						   { base, tablet, mobile } object and calls
						   onChange( tier, next ) — feeding that to a renderer
						   expecting a flat { top, right, bottom, left } drops
						   the whole value silently, with nothing to see in the
						   editor or the markup. A dropdown's inner spacing is
						   not device-tiered, so the flat shape is correct here
						   and matches sgs_box_object_shorthand() in render.php.
						*/ }
						<BoxControl
							label={ __( 'Inner spacing', 'sgs-blocks' ) }
							values={ submenuPadding || {} }
							units={ [
								{ value: 'px', label: 'px', default: 0 },
								{ value: 'rem', label: 'rem', default: 0 },
								{ value: 'em', label: 'em', default: 0 },
							] }
							splitOnAxis={ false }
							onChange={ ( val ) =>
								setAttributes( { submenuPadding: val || {} } )
							}
						/>
					</ToolsPanelItem>
				</ToolsPanel>

				{ /*
				   Nav CONTAINER appearance. Added 2026-07-28 (Bean-directed):
				   the block had per-ITEM colours but nothing for the bar
				   itself, so a client could never give the nav its own
				   surface. Everything here is unset by default — an
				   untouched nav renders exactly as before.

				   This panel is ALSO the drawer's styling surface: the
				   drawer holds its own sgs/nav-menu instance, so selecting
				   the nav inside the drawer and setting a background here
				   styles the drawer only.
				*/ }
				<PanelBody
					title={ __( 'Nav container', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<p className="components-base-control__help">
						{ __(
							'The bar itself — its background and text colour. Leave anything blank to inherit from the header or menu panel around it. The menu inside your menu panel is a separate copy: select it there to style the panel on its own. For a border or a pill look around the whole header, style the Site Header block instead.',
							'sgs-blocks'
						) }
					</p>

					<StateToggleControl>
						{ ( state ) =>
							state === 'hover' ? (
								<>
									<DesignTokenPicker
										label={ __( 'Background', 'sgs-blocks' ) }
										value={ navBgHover }
										onChange={ ( value ) =>
											setAttributes( { navBgHover: value || '' } )
										}
										linked
										enableAlpha
										clearable
									/>
									</>
							) : (
								<>
									<DesignTokenPicker
										label={ __( 'Background', 'sgs-blocks' ) }
										value={ navBg }
										onChange={ ( value ) =>
											setAttributes( { navBg: value || '' } )
										}
										linked
										enableAlpha
										clearable
									/>
									<DesignTokenPicker
										label={ __( 'Text colour', 'sgs-blocks' ) }
										value={ navColour }
										onChange={ ( value ) =>
											setAttributes( { navColour: value || '' } )
										}
										linked
										clearable
									/>
								</>
							)
						}
					</StateToggleControl>

				</PanelBody>

				<PanelBody title={ __( 'Items', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Hover style', 'sgs-blocks' ) }
						value={ hoverStyle }
						options={ [
							{
								label: __( 'Filled pill', 'sgs-blocks' ),
								value: 'pill',
							},
							{
								label: __( 'Underline', 'sgs-blocks' ),
								value: 'underline',
							},
							{
								label: __(
									'Text colour only',
									'sgs-blocks'
								),
								value: 'text',
							},
						] }
						onChange={ ( val ) =>
							setAttributes( { hoverStyle: val } )
						}
						help={ __(
							'How an item reacts on hover — and how the current page is marked. Underline draws a bar beneath the item.',
							'sgs-blocks'
						) }
					/>

					<StateToggleControl
						label={ __( 'State', 'sgs-blocks' ) }
						swatches={ [
							{
								label: __( 'Normal', 'sgs-blocks' ),
								value: itemColour,
							},
							{
								label: __( 'Hover', 'sgs-blocks' ),
								value: itemColourHover,
							},
						] }
					>
						{ ( state ) => {
							const isNormal = 'normal' === state;
							return (
								<>
									<DesignTokenPicker
										label={ __(
											'Text colour',
											'sgs-blocks'
										) }
										value={
											isNormal
												? itemColour
												: itemColourHover
										}
										onChange={ ( val ) =>
											setAttributes(
												isNormal
													? { itemColour: val }
													: { itemColourHover: val }
											)
										}
										linked
										enableAlpha
										clearable
									/>
									<DesignTokenPicker
										label={ __(
											'Background',
											'sgs-blocks'
										) }
										value={ isNormal ? itemBg : itemBgHover }
										onChange={ ( val ) =>
											setAttributes(
												isNormal
													? { itemBg: val }
													: { itemBgHover: val }
											)
										}
										linked
										enableAlpha
										clearable
									/>
									<UnitControl
										label={ __(
											'Corner radius',
											'sgs-blocks'
										) }
										value={ `${
											isNormal
												? itemRadius
												: itemRadiusHover ??
												  itemRadius
										}px` }
										units={ [
											{
												value: 'px',
												label: 'px',
												default: 8,
											},
										] }
										onChange={ ( val ) =>
											setAttributes(
												isNormal
													? {
															itemRadius:
																parseFloat(
																	val
																) || 0,
													  }
													: {
															itemRadiusHover:
																parseFloat(
																	val
																) || 0,
													  }
											)
										}
										help={
											isNormal
												? undefined
												: __(
														'Leave matching Normal for a pill that keeps its shape on hover.',
														'sgs-blocks'
												  )
										}
									/>
								</>
							);
						} }
					</StateToggleControl>

					<TypographyControls
						prefix="item"
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Effects', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleGroupControl
						label={ __( 'Sliding indicator', 'sgs-blocks' ) }
						value={ indicatorStyle }
						isBlock
						onChange={ ( val ) =>
							setAttributes( { indicatorStyle: val } )
						}
						help={ __(
							'A pill that slides beneath the hovered/current item — additional to the hover style above, not a replacement for it.',
							'sgs-blocks'
						) }
					>
						<ToggleGroupControlOption
							value="none"
							label={ __( 'Off', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="pill"
							label={ __( 'On', 'sgs-blocks' ) }
						/>
					</ToggleGroupControl>

					{ 'pill' === indicatorStyle && (
						<DesignTokenPicker
							label={ __( 'Indicator colour', 'sgs-blocks' ) }
							value={ indicatorColour }
							onChange={ ( val ) =>
								setAttributes( { indicatorColour: val } )
							}
							linked
							enableAlpha
							clearable
							help={ __(
								'Leave empty to use the theme accent colour.',
								'sgs-blocks'
							) }
						/>
					) }

					<ToggleControl
						label={ __( 'Magnetic hover pull', 'sgs-blocks' ) }
						checked={ !! itemMagnetEnabled }
						onChange={ ( val ) =>
							setAttributes( { itemMagnetEnabled: val } )
						}
						help={ __(
							'Nudges each item label a few pixels toward the cursor on hover. Off automatically when the visitor is using touch, and when reduced motion is requested.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ 'underline' === hoverStyle && (
					<PanelBody
						title={ __( 'Underline', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<StateToggleControl
							label={ __( 'State', 'sgs-blocks' ) }
							swatches={ [
								{
									label: __( 'Normal', 'sgs-blocks' ),
									value: underlineColour,
								},
								{
									label: __( 'Hover', 'sgs-blocks' ),
									value: underlineColourHover,
								},
							] }
						>
							{ ( state ) =>
								'normal' === state ? (
									<DesignTokenPicker
										label={ __(
											'Bar colour',
											'sgs-blocks'
										) }
										value={ underlineColour }
										onChange={ ( val ) =>
											setAttributes( {
												underlineColour: val,
											} )
										}
										linked
										enableAlpha
										clearable
									/>
								) : (
									<DesignTokenPicker
										label={ __(
											'Bar colour on hover',
											'sgs-blocks'
										) }
										value={ underlineColourHover }
										onChange={ ( val ) =>
											setAttributes( {
												underlineColourHover: val,
											} )
										}
										linked
										enableAlpha
										clearable
									/>
								)
							}
						</StateToggleControl>
						<UnitControl
							label={ __( 'Thickness', 'sgs-blocks' ) }
							value={ `${ underlineThickness }px` }
							units={ [
								{ value: 'px', label: 'px', default: 2 },
							] }
							onChange={ ( val ) =>
								setAttributes( {
									underlineThickness:
										parseFloat( val ) || 2,
								} )
							}
						/>
						<UnitControl
							label={ __( 'Distance below text', 'sgs-blocks' ) }
							value={ `${ underlineOffset }px` }
							units={ [
								{ value: 'px', label: 'px', default: 6 },
							] }
							onChange={ ( val ) =>
								setAttributes( {
									underlineOffset: parseFloat( val ) || 6,
								} )
							}
						/>
						<p className="sgs-nav-menu__inspector-note">
							{ __(
								'Leave the colours empty to match the item text. The bar also marks the current page.',
								'sgs-blocks'
							) }
						</p>
					</PanelBody>
				) }

				<PanelBody title={ __( 'Featured', 'sgs-blocks' ) } initialOpen={ false }>
					<StateToggleControl
						label={ __( 'State', 'sgs-blocks' ) }
						swatches={ [
							{
								label: __( 'Normal', 'sgs-blocks' ),
								value: featuredColour,
							},
							{
								label: __( 'Hover', 'sgs-blocks' ),
								value: featuredColourHover,
							},
						] }
					>
						{ ( state ) => {
							const isNormal = 'normal' === state;
							return (
								<>
									<DesignTokenPicker
										label={ __(
											'Text colour',
											'sgs-blocks'
										) }
										value={
											isNormal
												? featuredColour
												: featuredColourHover
										}
										onChange={ ( val ) =>
											setAttributes(
												isNormal
													? { featuredColour: val }
													: {
															featuredColourHover:
																val,
													  }
											)
										}
										linked
										enableAlpha
										clearable
									/>
									<DesignTokenPicker
										label={ __(
											'Background',
											'sgs-blocks'
										) }
										value={
											isNormal
												? featuredBg
												: featuredBgHover
										}
										onChange={ ( val ) =>
											setAttributes(
												isNormal
													? { featuredBg: val }
													: { featuredBgHover: val }
											)
										}
										linked
										enableAlpha
										clearable
									/>
									<UnitControl
										label={ __(
											'Corner radius',
											'sgs-blocks'
										) }
										value={ `${
											isNormal
												? featuredRadius
												: featuredRadiusHover ??
												  featuredRadius
										}px` }
										units={ [
											{
												value: 'px',
												label: 'px',
												default: 8,
											},
										] }
										onChange={ ( val ) =>
											setAttributes(
												isNormal
													? {
															featuredRadius:
																parseFloat(
																	val
																) || 0,
													  }
													: {
															featuredRadiusHover:
																parseFloat(
																	val
																) || 0,
													  }
											)
										}
									/>
									<SelectControl
										label={ __(
											'Font weight',
											'sgs-blocks'
										) }
										value={ String(
											isNormal
												? featuredFontWeight
												: featuredFontWeightHover ??
														featuredFontWeight
										) }
										options={ [
											{ label: 'Regular', value: '400' },
											{ label: 'Medium', value: '500' },
											{ label: 'Semi-bold', value: '600' },
											{ label: 'Bold', value: '700' },
										] }
										onChange={ ( val ) =>
											setAttributes(
												isNormal
													? {
															featuredFontWeight:
																parseInt(
																	val,
																	10
																),
													  }
													: {
															featuredFontWeightHover:
																parseInt(
																	val,
																	10
																),
													  }
											)
										}
									/>
								</>
							);
						} }
					</StateToggleControl>
					<p className="sgs-nav-menu__inspector-note">
						{ __(
							'Applies to the items ticked under Settings → Featured items. Set a background to render them as a filled pill; leave it empty for a coloured label. The text colour is checked for contrast against the background and falls back to a readable one if it would be hard to read.',
							'sgs-blocks'
						) }
					</p>
				</PanelBody>

				<PanelBody title={ __( 'Burger', 'sgs-blocks' ) } initialOpen={ false }>
					<StateToggleControl
						label={ __( 'State', 'sgs-blocks' ) }
						swatches={ [
							{ label: __( 'Normal', 'sgs-blocks' ), value: burgerColour },
							{ label: __( 'Hover', 'sgs-blocks' ), value: burgerHoverColour },
						] }
					>
						{ ( state ) =>
							'normal' === state ? (
								<>
									<DesignTokenPicker
										label={ __( 'Icon colour', 'sgs-blocks' ) }
										value={ burgerColour }
										onChange={ ( val ) =>
											setAttributes( { burgerColour: val } )
										}
										linked
										enableAlpha
										clearable
									/>
									<DesignTokenPicker
										label={ __( 'Background', 'sgs-blocks' ) }
										value={ burgerBg }
										onChange={ ( val ) =>
											setAttributes( { burgerBg: val } )
										}
										linked
										enableAlpha
										clearable
									/>
								</>
							) : (
								<DesignTokenPicker
									label={ __(
										'Hover background',
										'sgs-blocks'
									) }
									value={ burgerHoverColour }
									onChange={ ( val ) =>
										setAttributes( {
											burgerHoverColour: val,
										} )
									}
									linked
									enableAlpha
									clearable
								/>
							)
						}
					</StateToggleControl>
					<UnitControl
						label={ __( 'Button size', 'sgs-blocks' ) }
						value={ burgerSize }
						units={ [ { value: 'px', label: 'px', default: 44 } ] }
						onChange={ ( val ) =>
							setAttributes( { burgerSize: val || '44px' } )
						}
						help={ __(
							'44px minimum for a comfortable touch target (WCAG 2.2 AA).',
							'sgs-blocks'
						) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<ServerSideRender block="sgs/nav-menu" attributes={ attributes } />
			</div>
		</>
	);
}
