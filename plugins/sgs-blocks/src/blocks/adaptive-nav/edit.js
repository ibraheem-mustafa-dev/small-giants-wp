/**
 * SGS Adaptive Navigation — editor.
 *
 * The frontend bar is fully server-rendered by render.php (it resolves the
 * wp_navigation menu via SGS_Nav_Menu_Source — the same source the off-canvas
 * drawer reads). The editor therefore does NOT attempt to re-render the live
 * menu; it shows a lightweight, clearly-labelled placeholder plus an
 * InnerBlocks slot so operators can add rich sgs/mega-menu items. All other
 * configuration (menu source, collapse breakpoint, overflow, a11y, colours,
 * typography, layout) lives in the inspector.
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { useEntityRecords } from '@wordpress/core-data';
import {
	PanelBody,
	SelectControl,
	TextControl,
	__experimentalNumberControl as NumberControl,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import {
	DesignTokenPicker,
	TypographyControls,
	ResponsiveOverride,
	SpacingControl,
	ResponsiveBoxControls,
} from '../../components';

// STOP-NO-ALLOWLIST (Task 1 / D336): the InnerBlocks slot accepts ANY block —
// sgs/mega-menu items join the desktop bar, everything else routes to the
// drawer's content drop-zone at render time (see render.php). Do NOT
// reintroduce an `allowedBlocks` restriction here.

const COLLAPSE_TIER_OPTIONS = [
	{ label: __( 'Mobile (below 768px)', 'sgs-blocks' ), value: 'mobile' },
	{ label: __( 'Tablet (below 1024px)', 'sgs-blocks' ), value: 'tablet' },
	{ label: __( 'Desktop (below 1280px)', 'sgs-blocks' ), value: 'desktop' },
	{ label: __( 'Custom width…', 'sgs-blocks' ), value: 'custom' },
];

const OVERFLOW_OPTIONS = [
	{ label: __( 'More menu', 'sgs-blocks' ), value: 'more-menu' },
	{ label: __( 'Wrap to new line', 'sgs-blocks' ), value: 'wrap' },
	{ label: __( 'Scroll horizontally', 'sgs-blocks' ), value: 'scroll' },
];

const JUSTIFY_OPTIONS = [
	{ label: __( '— default (left) —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Space between', 'sgs-blocks' ), value: 'space-between' },
];

const FLEX_WRAP_OPTIONS = [
	{ label: __( 'No wrap (single row)', 'sgs-blocks' ), value: 'nowrap' },
	{ label: __( 'Wrap to new line', 'sgs-blocks' ), value: 'wrap' },
];

const VERTICAL_ALIGN_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'top' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Bottom', 'sgs-blocks' ), value: 'bottom' },
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		ref,
		collapseTier,
		collapseCustomPx,
		overflowBehaviour,
		moreMenuLabel,
		navigationLabel,
		linkColour,
		linkHoverColour,
		linkFontSize,
		justifyContent,
		flexWrap,
		verticalAlign,
		gap,
		menuButtonLabel,
		drawerLabel,
		drawerBg,
	} = attributes;

	const { records: menus, isResolving } = useEntityRecords(
		'postType',
		'wp_navigation',
		{
			per_page: -1,
			status: [ 'publish' ],
		}
	);

	const menuOptions = [
		{ label: __( 'Auto (use pages)', 'sgs-blocks' ), value: 0 },
		...( menus || [] ).map( ( menu ) => ( {
			label:
				menu.title?.rendered || __( '(untitled menu)', 'sgs-blocks' ),
			value: menu.id,
		} ) ),
	];

	const selectedMenu = ( menus || [] ).find( ( menu ) => menu.id === ref );

	const blockProps = useBlockProps( {
		className: 'sgs-adaptive-nav',
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-adaptive-nav__editor-innerblocks' },
		{
			// No allowedBlocks (STOP-NO-ALLOWLIST) — a sgs/mega-menu child
			// joins the desktop bar; any other block routes to the drawer's
			// content drop-zone. sgs/mega-menu keeps its own reciprocal
			// `parent` lock in its block.json.
			//
			// FR-34-3 default drawer children (Bean's 3-child model): empty
			// row container → the menu element → empty row container, all
			// reorderable/deletable. The template ONLY seeds a block with zero
			// stored children — existing content (e.g. the shipped header
			// pattern's business-info/socials) is never touched; Dispatch-E
			// inserts the nav-menu child into those files explicitly.
			// sgs/nav-menu's ref defaults to null ⇒ it inherits THIS block's
			// menu via context "sgs/navRef" (one source by default, FR-S9-4).
			template: [
				[ 'sgs/container', {} ],
				[ 'sgs/nav-menu', {} ],
				[ 'sgs/container', {} ],
			],
			templateLock: false,
			orientation: 'horizontal',
		}
	);

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Menu source', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Menu', 'sgs-blocks' ) }
						value={ ref || 0 }
						options={ menuOptions }
						onChange={ ( val ) =>
							setAttributes( { ref: Number( val ) } )
						}
						disabled={ isResolving }
						help={ __(
							'Choose the WordPress menu. Manage menus in Appearance → Editor → Navigation.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody title={ __( 'Collapse to drawer', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Collapse breakpoint', 'sgs-blocks' ) }
						value={ collapseTier }
						options={ COLLAPSE_TIER_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { collapseTier: val } )
						}
						help={ __(
							'Below this width the bar collapses to the burger + drawer.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					{ collapseTier === 'custom' && (
						<NumberControl
							label={ __(
								'Custom breakpoint (px)',
								'sgs-blocks'
							) }
							value={ collapseCustomPx }
							onChange={ ( val ) =>
								setAttributes( {
									collapseCustomPx: Number( val ) || 768,
								} )
							}
							min={ 320 }
							max={ 2000 }
							__next40pxDefaultSize
						/>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Drawer', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Menu button label', 'sgs-blocks' ) }
						value={ menuButtonLabel }
						onChange={ ( val ) =>
							setAttributes( { menuButtonLabel: val } )
						}
						help={ __(
							'Screen-reader label for the burger toggle shown below the collapse breakpoint.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Drawer label', 'sgs-blocks' ) }
						value={ drawerLabel }
						onChange={ ( val ) =>
							setAttributes( { drawerLabel: val } )
						}
						help={ __(
							'Screen-reader label for the disclosure drawer dialog.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Drawer background', 'sgs-blocks' ) }
						value={ drawerBg }
						onChange={ ( val ) =>
							setAttributes( { drawerBg: val } )
						}
						linked
					/>
					<p className="sgs-adaptive-nav__inspector-note">
						{ __(
							'Text and icon colours are chosen automatically for readable contrast against whichever background you pick, so they never need setting by hand.',
							'sgs-blocks'
						) }
					</p>
				</PanelBody>

				<PanelBody
					title={ __( 'Overflow', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'When items overflow', 'sgs-blocks' ) }
						value={ overflowBehaviour }
						options={ OVERFLOW_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { overflowBehaviour: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ overflowBehaviour === 'more-menu' && (
						<TextControl
							label={ __( '"More" label', 'sgs-blocks' ) }
							value={ moreMenuLabel }
							onChange={ ( val ) =>
								setAttributes( { moreMenuLabel: val } )
							}
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Accessibility', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Navigation label', 'sgs-blocks' ) }
						value={ navigationLabel }
						onChange={ ( val ) =>
							setAttributes( { navigationLabel: val } )
						}
						help={ __(
							'Screen-reader label for the <nav> landmark.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Link colours', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Link colour', 'sgs-blocks' ) }
						value={ linkColour }
						onChange={ ( val ) =>
							setAttributes( { linkColour: val } )
						}
						linked
					/>
					<DesignTokenPicker
						label={ __( 'Link hover colour', 'sgs-blocks' ) }
						value={ linkHoverColour }
						onChange={ ( val ) =>
							setAttributes( { linkHoverColour: val } )
						}
						linked
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Link typography', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TypographyControls
						prefix="link"
						attributes={ attributes }
						setAttributes={ setAttributes }
						showSize={ false }
					/>
					<ResponsiveOverride
						label={ __( 'Link font size', 'sgs-blocks' ) }
						value={ linkFontSize }
						onChange={ ( obj ) =>
							setAttributes( { linkFontSize: obj } )
						}
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<UnitControl
								label={ __( 'Link font size', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ ownValue || '' }
								placeholder={
									inherited && effectiveValue
										? String( effectiveValue )
										: ''
								}
								units={ [
									{ value: 'px', label: 'px', default: 15 },
									{ value: 'rem', label: 'rem', default: 1 },
									{ value: 'em', label: 'em', default: 1 },
								] }
								onChange={ ( v ) => setOwnValue( v || '' ) }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				<PanelBody
					title={ __( 'Layout', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Distribution', 'sgs-blocks' ) }
						value={ justifyContent || '' }
						options={ JUSTIFY_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { justifyContent: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Flex wrap', 'sgs-blocks' ) }
						value={ flexWrap }
						options={ FLEX_WRAP_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { flexWrap: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Vertical alignment', 'sgs-blocks' ) }
						value={ verticalAlign }
						options={ VERTICAL_ALIGN_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { verticalAlign: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ResponsiveOverride
						label={ __( 'Gap between links', 'sgs-blocks' ) }
						value={ gap }
						onChange={ ( obj ) => setAttributes( { gap: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<SpacingControl
								freeInput
								value={ ownValue }
								placeholder={ inherited ? effectiveValue : '' }
								onChange={ setOwnValue }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				<ResponsiveBoxControls
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="sgs-adaptive-nav__editor-placeholder">
					<span
						className="sgs-adaptive-nav__editor-icon"
						aria-hidden="true"
					>
						☰
					</span>
					<span className="sgs-adaptive-nav__editor-label">
						{ __( 'Adaptive Navigation', 'sgs-blocks' ) }
					</span>
					<span className="sgs-adaptive-nav__editor-menu">
						{ selectedMenu
							? selectedMenu.title?.rendered
							: __(
									'No menu selected — showing pages',
									'sgs-blocks'
							  ) }
					</span>
					<span className="sgs-adaptive-nav__editor-hint">
						{ __(
							'Rendered from the selected menu on the frontend. Add an SGS Mega Menu below for a rich desktop dropdown — any other block dropped here becomes content inside the off-canvas drawer instead.',
							'sgs-blocks'
						) }
					</span>
				</div>
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
