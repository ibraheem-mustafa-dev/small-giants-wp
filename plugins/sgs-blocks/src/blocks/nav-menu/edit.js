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
import { useMemo } from '@wordpress/element';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { useEntityRecords } from '@wordpress/core-data';
import { parse } from '@wordpress/blocks';
import {
	PanelBody,
	SelectControl,
	CheckboxControl,
	TextControl,
	ButtonGroup,
	Button,
	Notice,
	__experimentalUnitControl as UnitControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import {
	DesignTokenPicker,
	TypographyControls,
	StateToggleControl,
	ResponsiveBoxControl,
} from '../../components';

const COLLAPSE_PRESETS = [ 640, 768, 1024 ];

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
function flattenMenuItems( blocks ) {
	const items = [];
	( blocks || [] ).forEach( ( block ) => {
		if ( 'core/home-link' === block.name ) {
			items.push( {
				identifier: 'special:home',
				label: __( 'Home', 'sgs-blocks' ),
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
		items.push( {
			identifier: id ? `id:${ id }` : `label:${ label }`,
			label,
		} );
	} );
	return items;
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		ref,
		collapsePoint,
		drawerRef,
		navLabel,
		featuredItemIds,
		gap,
		maxWidth,
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
	} = attributes;

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
		// Mirrors render.php: top-level items only, identifier 'id:<object_id>'
		// (the same value core/navigation-link carries), so a ticked featured
		// entry matches whichever menu format is in use.
		if ( selectedIsClassic ) {
			return ( classicItems || [] )
				.filter( ( item ) => ! item.parent )
				.sort( ( a, b ) => ( a.menu_order || 0 ) - ( b.menu_order || 0 ) )
				.map( ( item ) => ( {
					identifier: `id:${ item.object_id ?? item.id }`,
					label:
						item.title?.rendered ||
						__( '(untitled item)', 'sgs-blocks' ),
				} ) );
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

	const blockProps = useBlockProps();

	return (
		<>
			{ /* ── Settings tab (default InspectorControls group) ──────────── */ }
			<InspectorControls>
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

				<PanelBody title={ __( 'Collapse point', 'sgs-blocks' ) }>
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
						help={ __(
							'A visual breakpoint (independent of the Tablet/Mobile style tiers) — the bar shows as links at or above this width, and as a burger below it.',
							'sgs-blocks'
						) }
					/>
					<ButtonGroup style={ { marginTop: '8px' } }>
						{ COLLAPSE_PRESETS.map( ( preset ) => (
							<Button
								key={ preset }
								variant={
									collapsePoint === preset
										? 'primary'
										: 'secondary'
								}
								size="small"
								onClick={ () =>
									setAttributes( { collapsePoint: preset } )
								}
							>
								{ preset }px
							</Button>
						) ) }
						<Button
							variant="tertiary"
							size="small"
							onClick={ () =>
								setAttributes( { collapsePoint: 768 } )
							}
						>
							{ __( 'Reset', 'sgs-blocks' ) }
						</Button>
					</ButtonGroup>
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
						<CheckboxControl
							key={ item.identifier }
							label={ item.label }
							checked={ ( featuredItemIds || [] ).includes(
								item.identifier
							) }
							onChange={ ( checked ) =>
								toggleFeatured( item.identifier, checked )
							}
							__nextHasNoMarginBottom
						/>
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

				<PanelBody title={ __( 'Mobile drawer', 'sgs-blocks' ) } initialOpen={ false }>
					<TextControl
						label={ __( 'Drawer id', 'sgs-blocks' ) }
						value={ drawerRef }
						onChange={ ( val ) =>
							setAttributes( { drawerRef: val } )
						}
						help={ __(
							'The id of the sgs/nav-drawer block the burger opens. Leave as the default unless the page has more than one drawer.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
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
