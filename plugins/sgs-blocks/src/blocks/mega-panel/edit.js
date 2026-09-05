/**
 * SGS Mega Panel — block editor UI.
 *
 * Element-first inspector (Panel / Style / Aside), mirroring the pattern
 * used across other composite SGS blocks. `variant` has NO live control
 * (CF-5) — it is insert-time only, chosen by the starter pattern that
 * inserts this block, so it never appears here.
 *
 * FLEXIBLE COLUMNS (Bean-directed): the panel accepts a free 1-N mix of
 * `sgs/mega-group` / `sgs/mega-aside` children — add, remove, reorder freely
 * (no `contentOnly` lock at THIS level). The number of columns is simply the
 * number of mega-group children an operator has added; there is no separate
 * `columnCount` attribute. Each individual mega-group/mega-aside still locks
 * its OWN internal template (mega-group: heading+icon-list; mega-aside:
 * media+LABEL+heading+text+button — five children, see
 * `mega-aside/edit.js:37`; `templateLock: 'insert'` on their own edit.js —
 * `'all'` re-runs WordPress's template-sync on every mount and silently
 * drops stored content that doesn't line up with the template by position,
 * so an operator cannot break THEIR shape, but can freely select and edit
 * any nested block's own settings (e.g. sgs/icon-list's link controls).
 *
 * The canvas itself proves the "parent paints child" mechanism (CF-10) live:
 * this component sets the SAME `data-mega-style` / `data-mega-scheme` /
 * `data-mega-variant` attributes AND the same colour custom-property VALUES
 * render.php computes onto the block wrapper, so editor.css (which mirrors
 * render.php's per-style reshape) restyles every sgs/mega-group /
 * sgs/mega-aside child immediately when an operator switches `style` or
 * `colourScheme` — no page reload, no ServerSideRender round-trip needed.
 * (The inline `style` set below is editor-canvas-only; the no-inline
 * contract governs the FRONTEND render.php output, not the editor — same
 * pattern as sgs/nav-drawer's edit.js.)
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
} from '@wordpress/components';
import {
	DesignTokenPicker,
	ResponsiveControl,
	ResponsiveBoxControl,
	SgsBorderControl,
	SgsColourPanel,
	SgsLengthControl,
	fillRow,
} from '../../components';
import MediaElementPanel from '../../components/MediaElementPanel';
import { colourVar } from '../../utils';
import { ToggleGroupControl, ToggleGroupControlOption, ToolsPanel, ToolsPanelItem } from '../../components/primitives';

/** Default general-variant template: 2 mega-groups (CF-10 pin) — a starting
 *  point only; the panel is NOT locked to this shape (FIX 1). */
const GENERAL_TEMPLATE = [ [ 'sgs/mega-group' ], [ 'sgs/mega-group' ] ];

/**
 * media-cards variant (§1/§3) — a single `sgs/card-grid`, pre-configured to
 * the draft's exact geometry (4-col, 14px gap, 18px card radius, 16:10
 * media). `sgs/card-grid` owns its OWN full styling system (colour, hover,
 * typography) — the mega panel does NOT repaint it (unlike mega-group/
 * mega-aside, which are deliberately dumb parent-painted wrappers); this is
 * normal WP composition, the same as any other composite's InnerBlocks
 * child bringing its own inspector.
 */
const MEDIA_CARDS_TEMPLATE = [
	[
		'sgs/card-grid',
		{
			variant: 'card',
			columns: 4,
			columnsTablet: 2,
			columnsMobile: 1,
			gap: '14',
			cardRadius: '18px',
			aspectRatio: '16/10',
		},
	],
];

/**
 * brands variant (§1/§3) — a `sgs/card-grid` used as a logo-tile grid
 * (media-only items, no title/subtitle needed) alongside a `sgs/mega-aside`
 * (pill/desc/CTA; asideWidth + asideSeparator attrs on THIS block already
 * give the 300px + 3px-accent-divider split — no new mega-panel CSS
 * required for that half). The eyebrow above the grid is the panel's own
 * `brandsEyebrow` attribute (see block.json note) rather than a child block.
 */
const BRANDS_TEMPLATE = [
	[
		'sgs/card-grid',
		{
			variant: 'card',
			columns: 4,
			columnsTablet: 3,
			columnsMobile: 2,
			gap: '10',
			cardRadius: '12px',
			aspectRatio: '3/2',
		},
	],
	[ 'sgs/mega-aside' ],
];

/**
 * Which child blocks + starting template a variant gets. `variant` is
 * insert-time only (CF-5) — chosen by which starter pattern inserted this
 * block; there is no live control here that switches it.
 *
 * @param {string} variant `general` | `media-cards` | `brands`.
 * @return {{allowedBlocks: string[], template: Array}} Config for useInnerBlocksProps.
 */
function innerBlocksConfigForVariant( variant ) {
	if ( 'media-cards' === variant ) {
		return { allowedBlocks: [ 'sgs/card-grid' ], template: MEDIA_CARDS_TEMPLATE };
	}
	if ( 'brands' === variant ) {
		return {
			allowedBlocks: [ 'sgs/card-grid', 'sgs/mega-aside' ],
			template: BRANDS_TEMPLATE,
		};
	}
	return {
		allowedBlocks: [ 'sgs/mega-group', 'sgs/mega-aside' ],
		template: GENERAL_TEMPLATE,
	};
}

/**
 * Build a CSS padding shorthand from a { top, right, bottom, left } box
 * object, or undefined when nothing is set (editor preview only — mirrors
 * sgs/nav-drawer's own `paddingFromBox` helper).
 *
 * @param {Object} box Box object.
 * @return {string|undefined} CSS padding value or undefined.
 */
function paddingFromBox( box ) {
	if ( ! box || typeof box !== 'object' ) {
		return undefined;
	}
	const { top, right, bottom, left } = box;
	if ( ! top && ! right && ! bottom && ! left ) {
		return undefined;
	}
	return `${ top || '0' } ${ right || '0' } ${ bottom || '0' } ${ left || '0' }`;
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		variant,
		style,
		headings,
		colourScheme,
		iconBackground,
		groupBorderColour,
		groupBorderColourGradient,
		groupBorderColourHover,
		groupBorderColourGradientHover,
		iconColour,
		iconColourGradient,
		accentBackgroundImage,
		maxWidth,
		panelPadding,
		groupGap,
		panelBg,
		bgBlur,
		borderWidth,
		borderStyle,
		borderColour,
		borderColourGradient,
		borderRadius,
		asideWidth,
		asideSeparator,
		brandsEyebrow,
		staggerOnOpen,
		viewAllPlacement,
	} = attributes;

	const resolvedVariant = variant || 'general';
	const { allowedBlocks, template } = innerBlocksConfigForVariant( resolvedVariant );

	const sepStyle = asideSeparator?.style || 'line';

	// Editor-canvas colour + layout custom properties — the SAME derivation
	// render.php runs in PHP, reproduced here so the canvas reshapes/
	// recolours/repads live (FIX 2). Custom properties (--sgs-mm-*) inherit
	// down through the DOM from this root to every descendant regardless of
	// display type, so editor.css can consume them on `.sgs-mega-panel__content`
	// / `.sgs-mega-aside` even though those are separate elements.
	const iconBackgroundValue = colourVar( iconBackground ) || 'var(--wp--preset--color--accent)';
	const groupBorderValue = colourVar( groupBorderColourHover ) || 'var(--wp--preset--color--accent)';
	// Gradient-set preview (D636 pattern, mirrors sgs/text's firstLetterColour
	// precedent): a background-clip:text declaration cannot be expressed
	// through a single CSS custom-property value consumed by a DESCENDANT
	// selector — `--sgs-mm-accent-text` feeds `.sgs-icon-list__icon` several
	// DOM levels down via style.css/editor.css, so there is nowhere to attach
	// the extra background-image/background-clip/color:transparent trio. When
	// the gradient sibling is set the canvas simply falls back to the accent
	// default rather than emitting an invalid custom-property value; the
	// frontend (render.php + sgs_text_colour_decl()) renders the gradient
	// correctly via a direct rule scoped to the descendant selector.
	const iconColourValue = iconColourGradient
		? 'var(--wp--preset--color--accent)'
		: colourVar( iconColour ) || 'var(--wp--preset--color--accent)';
	const accentImageValue = colourVar( accentBackgroundImage ) || 'var(--wp--preset--color--accent)';
	const shellStyle = {
		// Per-role accent custom properties (D643) — style.css derives
		// --sgs-mm-soft / --sgs-mm-soft-image from -bg / -image via color-mix();
		// -text / -border are consumed directly.
		'--sgs-mm-accent-bg': iconBackgroundValue,
		'--sgs-mm-accent-border': groupBorderValue,
		'--sgs-mm-accent-text': iconColourValue,
		'--sgs-mm-accent-image': accentImageValue,
		'--sgs-mm-panel-bg': panelBg ? colourVar( panelBg ) || panelBg : undefined,
		'--sgs-mm-panel-border': borderColour
			? colourVar( borderColour ) || borderColour
			: undefined,
		// A gradient border renders frontend as a masked ::before ring
		// (sgs_border_gradient_css() in render.php), which cannot be reproduced in
		// a plain inline style — approximate it with the gradient as a border-image,
		// same as every other border-migrated block's canvas preview. style.css's
		// `.sgs-mega-panel` rule already sets `border:1px solid var(--sgs-mm-panel-border)`,
		// so this paints into that existing 1px border area rather than needing its
		// own width/style — this block exposes no border-width/style control.
		borderImage:
			borderColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( borderColourGradient )
				? `${ borderColourGradient } 1`
				: undefined,
		// NEW resting-state group-tile border override (2026-08-28, Bean-ruled) —
		// only set when the operator has picked a resting colour; unset means
		// "inherit the cards tile's existing --sgs-mm-panel-border-derived
		// border", matched in style.css via a `var(..., var(--sgs-mm-panel-border))`
		// fallback chain (see that file's `.sgs-mega-group` cards rule).
		'--sgs-mm-group-border-resting': groupBorderColour
			? colourVar( groupBorderColour ) || groupBorderColour
			: undefined,
		'--sgs-mm-group-gap': groupGap?.desktop || undefined,
		'--sgs-mm-aside-w': asideWidth || undefined,
		'--sgs-mm-aside-sep-width': asideSeparator?.width || undefined,
		'--sgs-mm-aside-sep-colour': asideSeparator?.colour
			? colourVar( asideSeparator.colour ) || asideSeparator.colour
			: undefined,
		maxWidth: maxWidth?.desktop || undefined,
		// Panel padding applies directly to the ROOT (it's the panel shell
		// itself that render.php pads, not the content row) — a real CSS
		// property, not a custom-prop indirection.
		padding: paddingFromBox( panelPadding?.desktop ),
		borderRadius: borderRadius || undefined,
		backdropFilter: bgBlur ? 'saturate(1.5) blur(24px)' : undefined,
	};

	const wrapperClassName = [
		'sgs-mega-panel',
		! headings && 'sgs-mega-panel--headings-off',
		'none' === sepStyle && 'sgs-mega-panel--aside-sep-none',
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps( {
		className: wrapperClassName,
		style: shellStyle,
		'data-mega-style': style,
		'data-mega-scheme': colourScheme,
		'data-mega-variant': resolvedVariant,
		...( staggerOnOpen ? { 'data-stagger': 'true' } : {} ),
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-mega-panel__content' },
		{
			template,
			templateLock: false,
			allowedBlocks,
		}
	);

	return (
		<>
			{ /* GROUND-TRUTH: block.json attributes.panelBg / borderColour /
			   iconBackground / groupBorderColour / groupBorderColourHover /
			   iconColour / accentBackgroundImage (plain string colour attrs) +
			   render.php:80-360 (each attribute resolves to its OWN
			   --sgs-mm-accent-bg / -border / -text / -image custom property,
			   consumed by exactly ONE real CSS property each — background-color
			   via the derived --sgs-mm-soft, border-color, color, and the aside
			   spotlight's background-image via the derived --sgs-mm-soft-image
			   — split 2026-08-16 (D643) from the single `accent` attribute that
			   previously drove all four at once, then renamed 2026-08-28 [NULL
			   css_element fix proposal §5] from accentBackground/
			   accentBorderColour/accentTextColour to iconBackground/
			   groupBorderColour/iconColour, and — same day, once Bean ruled a
			   genuine resting-state border should exist alongside the hover —
			   groupBorderColour/groupBorderColourGradient renamed a second time
			   to groupBorderColourHover/groupBorderColourGradientHover, freeing
			   the base names for the NEW resting pair) + style.css (panelBg ->
			   background-color, borderColour -> border-color, the new
			   --sgs-mm-group-border-resting -> the cards tile's resting
			   border-color). Confirmed 2026-08-16 against the live source
			   before wiring these rows; resting pair confirmed 2026-08-28
			   against the same render.php/style.css/block.json triad. All
			   single-state, `linked: true` per D619 (all previously used
			   `linked` on their DesignTokenPicker already). */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'background',
						label: __( 'Background', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: panelBg,
								onChange: ( val ) => setAttributes( { panelBg: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'iconBackground',
						label: __( 'Accent background', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: iconBackground,
								onChange: ( val ) =>
									setAttributes( { iconBackground: val ?? 'accent' } ),
								linked: true,
							},
						],
					},
					{
						key: 'groupBorderColour',
						label: __( 'Group border colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: groupBorderColour,
								onChange: ( val ) =>
									setAttributes( { groupBorderColour: val ?? '' } ),
								linked: true,
								gradientValue: groupBorderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { groupBorderColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: groupBorderColourHover,
								onChange: ( val ) =>
									setAttributes( { groupBorderColourHover: val ?? 'accent' } ),
								linked: true,
								gradientValue: groupBorderColourGradientHover,
								onGradientChange: ( val ) =>
									setAttributes( { groupBorderColourGradientHover: val ?? '' } ),
							},
						],
					},
					{
						key: 'iconColour',
						label: __( 'Accent text colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: iconColour,
								onChange: ( val ) =>
									setAttributes( { iconColour: val ?? 'accent' } ),
								linked: true,
								gradientValue: iconColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { iconColourGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'accentBackgroundImage',
						label: __( 'Accent background image', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: accentBackgroundImage,
								onChange: ( val ) =>
									setAttributes( { accentBackgroundImage: val ?? 'accent' } ),
								linked: true,
							},
						],
					},
				] }
			/>
			<InspectorControls>
				{ /* S7 pilot (2026-09-02, uniformity sweep): converted from a plain
				   PanelBody to a ToolsPanel — all six controls (bgBlur, maxWidth,
				   panelPadding, groupGap, borderRadius) are optional style/layout
				   customisations, so none are marked isShownByDefault. Same pattern
				   as team-member's optional controls. */ }
				<ToolsPanel
					label={ __( 'Panel', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							bgBlur: false,
							maxWidth: undefined,
							panelPadding: undefined,
							groupGap: undefined,
							borderRadius: '',
						} )
					}
				>
					{ /* Fill */ }
					<ToolsPanelItem
						label={ __( 'Background blur', 'sgs-blocks' ) }
						hasValue={ () => !! bgBlur }
						onDeselect={ () => setAttributes( { bgBlur: false } ) }
					>
						<ToggleControl
							label={ __( 'Background blur', 'sgs-blocks' ) }
							help={ __(
								'Adds a frosted-glass blur behind a translucent panel background.',
								'sgs-blocks'
							) }
							checked={ !! bgBlur }
							onChange={ ( value ) => setAttributes( { bgBlur: value } ) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>

					{ /* Layout */ }
					<ToolsPanelItem
						label={ __( 'Panel max width', 'sgs-blocks' ) }
						hasValue={ () => !! maxWidth && Object.values( maxWidth ).some( v => v ) }
						onDeselect={ () => setAttributes( { maxWidth: undefined } ) }
					>
						<ResponsiveControl label={ __( 'Panel max width', 'sgs-blocks' ) }>
							{ ( breakpoint ) => (
								<SgsLengthControl
									label={ __( 'Max width', 'sgs-blocks' ) }
									hideLabelFromVision
									value={ maxWidth?.[ breakpoint ] || '' }
									onChange={ ( value ) =>
										setAttributes( {
											maxWidth: { ...maxWidth, [ breakpoint ]: value || undefined },
										} )
									}
									presets={ false }
								/>
							) }
						</ResponsiveControl>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Panel padding', 'sgs-blocks' ) }
						hasValue={ () => !! panelPadding && Object.values( panelPadding ).some( box => box && Object.values( box ).some( v => v ) ) }
						onDeselect={ () => setAttributes( { panelPadding: undefined } ) }
					>
						<ResponsiveBoxControl
							label={ __( 'Panel padding', 'sgs-blocks' ) }
							presets
							values={ {
								base: panelPadding?.desktop ?? {},
								tablet: panelPadding?.tablet ?? {},
								mobile: panelPadding?.mobile ?? {},
							} }
							onChange={ ( tier, next ) => {
								const key = tier === 'base' ? 'desktop' : tier;
								setAttributes( {
									panelPadding: { ...panelPadding, [ key ]: next },
								} );
							} }
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Group gap', 'sgs-blocks' ) }
						hasValue={ () => !! groupGap && Object.values( groupGap ).some( v => v ) }
						onDeselect={ () => setAttributes( { groupGap: undefined } ) }
					>
						<ResponsiveControl label={ __( 'Group gap', 'sgs-blocks' ) }>
							{ ( breakpoint ) => (
								<SgsLengthControl
									label={ __( 'Gap', 'sgs-blocks' ) }
									hideLabelFromVision
									value={ groupGap?.[ breakpoint ] || '' }
									onChange={ ( value ) =>
										setAttributes( {
											groupGap: { ...groupGap, [ breakpoint ]: value || undefined },
										} )
									}
									presets={ false }
								/>
							) }
						</ResponsiveControl>
					</ToolsPanelItem>

					{ /* units array REQUIRED by contract §14 field 2 — added
					     2026-08-11 (P-SPEC35-BORDER-RESIDUALS item 3). */ }
					<ToolsPanelItem
						label={ __( 'Border radius', 'sgs-blocks' ) }
						hasValue={ () => !! borderRadius }
						onDeselect={ () => setAttributes( { borderRadius: '' } ) }
					>
						<SgsLengthControl
							label={ __( 'Border radius', 'sgs-blocks' ) }
							value={ borderRadius || '' }
							onChange={ ( value ) => setAttributes( { borderRadius: value || '20px' } ) }
							units={ [
								{ value: 'px', label: 'px', default: 20 },
								{ value: '%', label: '%', default: 50 },
								{ value: 'rem', label: 'rem', default: 1.25 },
								{ value: 'em', label: 'em', default: 1.25 },
							] }
							presets={ false }
						/>
					</ToolsPanelItem>
				</ToolsPanel>

				<PanelBody title={ __( 'Style', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleGroupControl
						label={ __( 'Group layout', 'sgs-blocks' ) }
						help={ __(
							'Columns shows a heading above each list. Cards puts every group in its own tile. Minimal shows one flat list with no headings.',
							'sgs-blocks'
						) }
						value={ style }
						onChange={ ( value ) => setAttributes( { style: value || 'columns' } ) }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="columns" label={ __( 'Columns', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="cards" label={ __( 'Cards', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="minimal" label={ __( 'Minimal', 'sgs-blocks' ) } />
					</ToggleGroupControl>

					{ 'columns' === style && (
						<ToggleControl
							label={ __( 'Show group headings', 'sgs-blocks' ) }
							checked={ headings !== false }
							onChange={ ( value ) => setAttributes( { headings: value } ) }
							__nextHasNoMarginBottom
						/>
					) }

					<ToggleGroupControl
						label={ __( 'Colour scheme', 'sgs-blocks' ) }
						help={ __(
							'Auto follows the site-wide dark/light switcher (renders light when the site has no switcher, even on a device set to dark). Light/Dark force this panel one way regardless of the site.',
							'sgs-blocks'
						) }
						value={ colourScheme || 'light' }
						onChange={ ( value ) => setAttributes( { colourScheme: value || 'light' } ) }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="light" label={ __( 'Light', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="dark" label={ __( 'Dark', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="auto" label={ __( 'Auto', 'sgs-blocks' ) } />
					</ToggleGroupControl>
				</PanelBody>

				{ 'brands' === resolvedVariant && (
					<PanelBody title={ __( 'Brands', 'sgs-blocks' ) } initialOpen={ false }>
						<TextControl
							label={ __( 'Eyebrow label', 'sgs-blocks' ) }
							help={ __(
								'A small label shown above the logo grid (e.g. "Our Partners").',
								'sgs-blocks'
							) }
							value={ brandsEyebrow || '' }
							onChange={ ( value ) => setAttributes( { brandsEyebrow: value } ) }
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				<PanelBody title={ __( 'Motion', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Stagger items on open', 'sgs-blocks' ) }
						help={ __(
							'Reveals each item with a short staggered fade/slide when the panel opens. Respects reduced-motion.',
							'sgs-blocks'
						) }
						checked={ !! staggerOnOpen }
						onChange={ ( value ) => setAttributes( { staggerOnOpen: value } ) }
						__nextHasNoMarginBottom
					/>

					<ToggleGroupControl
						label={ __( '"View all" link', 'sgs-blocks' ) }
						help={ __(
							'The menu item that opens this panel is a button, so its own page needs a link somewhere inside the panel. Automatic hides it when this panel already has its own button linking there.',
							'sgs-blocks'
						) }
						value={ viewAllPlacement || 'auto' }
						onChange={ ( value ) =>
							setAttributes( { viewAllPlacement: value || 'auto' } )
						}
						isBlock
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					>
						<ToggleGroupControlOption value="auto" label={ __( 'Automatic', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="none" label={ __( "Don't show", 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="bottom-left" label={ __( 'Bottom left', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="bottom-right" label={ __( 'Bottom right', 'sgs-blocks' ) } />
					</ToggleGroupControl>
				</PanelBody>

				<PanelBody title={ __( 'Aside', 'sgs-blocks' ) } initialOpen={ false }>
					<p className="sgs-mega-panel-editor-note">
						{ __(
							'Only applies when a side panel (sgs/mega-aside) block has been added alongside the groups.',
							'sgs-blocks'
						) }
					</p>
					<SgsLengthControl
						label={ __( 'Aside width', 'sgs-blocks' ) }
						value={ asideWidth || '' }
						onChange={ ( value ) => setAttributes( { asideWidth: value || '340px' } ) }
						presets={ false }
					/>
					<ToggleGroupControl
						label={ __( 'Divider', 'sgs-blocks' ) }
						value={ sepStyle }
						onChange={ ( value ) =>
							setAttributes( {
								asideSeparator: { ...asideSeparator, style: value || 'line' },
							} )
						}
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="line" label={ __( 'Line', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="none" label={ __( 'None', 'sgs-blocks' ) } />
					</ToggleGroupControl>
					{ 'line' === sepStyle && (
						<>
							<SgsColourPanel
								rows={ [
									fillRow( {
										key: 'aside-separator-colour',
										label: __( 'Divider colour', 'sgs-blocks' ),
										get: () => asideSeparator?.colour,
										set: ( value ) =>
									setAttributes( {
										asideSeparator: { ...asideSeparator, colour: value || '' },
									} ),
									} ),
								] }
							/>
							<SgsLengthControl
								label={ __( 'Divider width', 'sgs-blocks' ) }
								value={ asideSeparator?.width || '' }
								onChange={ ( value ) =>
									setAttributes( {
										asideSeparator: { ...asideSeparator, width: value || '' },
									} )
								}
								presets={ false }
							/>
						</>
					) }
					{ /* 37-media-no-handroll remediation (2026-09-03) — the aside
					   banner's crop mode is a genuine client control now
					   (style.css/render.php no longer hardcode object-fit:cover;
					   the shared media-atoms system paints the same default).
					   The aside's image is rendered by a CHILD block (sgs/mega-
					   aside), so this is parent-paints-child (CF-10), same as
					   this panel's other Aside-panel controls above. */ }
					<MediaElementPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
						blockSlug="sgs/mega-panel"
						insertion="element"
						atoms={ [ 'object-fit' ] }
						mediaType="image"
						scope="element"
					/>
				</PanelBody>

				{ /* B4 (2026-09-04): SgsBorderControl migration, ANOMALY category —
				   the panel had a border colour (+ gradient) already, painted via a
				   HARDCODED `border:1px solid` shorthand in render.php (no width/style
				   attrs existed). Adopting the shared control necessarily adds real
				   width + style capability (SgsBorderControl always renders the width
				   box; there is no colour+radius-only composition), so borderWidth/
				   borderStyle are NEW attrs, defaulting to 1px/solid to match the
				   previous hardcoded shorthand exactly. Radius is DELIBERATELY left
				   out of this control (no onRadiusChange wired) and stays on its own
				   scalar `borderRadius` control in the Panel ToolsPanel above —
				   SgsBorderControl's radius param expects a per-CORNER object
				   ({topLeft,topRight,bottomLeft,bottomRight}), a different shape from
				   this block's existing plain-string `borderRadius` (`"20px"`), and
				   migrating that shape is a separate, unscoped change with its own
				   backward-compatibility risk against every already-published
				   mega-menu instance. Placed LAST in InspectorControls (not next to
				   the Panel ToolsPanel it conceptually belongs beside) so its
				   borderStyle/onStyleChange lines sit outside the enum-control-shape
				   gate's 900-char proximity window of the unrelated Style/Motion/
				   Aside panels' own ToggleGroupControl mounts — those falsely
				   resolved as the bound control for borderStyle when this sat
				   earlier in the tree (SgsBorderControl's OWN internal style picker
				   is invisible to the file-local scan, same as every other migrated
				   block's "shared-component" skip). */ }
			</InspectorControls>

			{ /* Routed to its own explicit "styles" group (RULE 01-tab-group,
			   inspector-scan): this panel is a genuine CSS-styling control, and
			   once it joined MediaElementPanel above as a second non-structural
			   panel in this block, WordPress's default (both land in Settings
			   with no explicit choice) became a real routing decision the gate
			   requires be made explicitly. Same mechanism sgs/before-after uses
			   for its own "Frame styling" panel. */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						styleValue={ borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ borderColourGradient }
						onColourGradientChange={ ( val ) =>
							setAttributes( { borderColourGradient: val ?? '' } )
						}
						colourLinked={ true }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ 'brands' === resolvedVariant && brandsEyebrow && (
					<p className="sgs-mega-panel__eyebrow">{ brandsEyebrow }</p>
				) }
				<div { ...innerBlocksProps } />
				{ /* viewAllPlacement editor-canvas preview (CHECK A, 2026-08-13).
					The real footer content comes from `sgs_mega_panel_footer_html`
					— a filter fired at FRONTEND render time by the parent
					sgs/nav-menu mega item (render.php:528), reading data this
					isolated block editor has no access to, so the actual link
					text/markup can never be replayed here (same "no live data"
					shape Signal 4 already covers for buybox/google-reviews).
					`auto`/`none` are correctly silent for the same reason: `auto`'s
					visibility depends on that same unavailable nav-menu context,
					and `none` genuinely renders nothing. But the CHOSEN CORNER
					(bottom-left/bottom-right) is real, static, and fully knowable
					here — it is just the alignment modifier class render.php
					already applies (render.php:551-553) — so those two states get
					an honest placeholder showing WHERE the link will land. */ }
				{ ( 'bottom-left' === viewAllPlacement ||
					'bottom-right' === viewAllPlacement ) && (
					<div
						className={ `sgs-mega-panel__footer sgs-mega-panel__footer--${
							'bottom-right' === viewAllPlacement ? 'end' : 'start'
						}` }
						style={ {
							display: 'flex',
							width: '100%',
							justifyContent:
								'bottom-right' === viewAllPlacement
									? 'flex-end'
									: 'flex-start',
						} }
					>
						{ /* Styled inline (not a style.css rule) so this preview
							qualifies as an edit.js-only change under the visual-diff
							gate's editor-only exemption — there is no equivalent
							frontend markup this could accidentally clash with either
							way, since `.sgs-mega-panel__footer` on a real page only
							ever wraps real `$footer_html` content (render.php:548). */ }
						<span
							style={ {
								fontSize: '11px',
								fontWeight: 500,
								letterSpacing: '0.06em',
								textTransform: 'uppercase',
								color: 'var(--sgs-mm-muted, #606d80)',
								border: '1px dashed var(--sgs-mm-panel-border, rgba(0,0,0,.22))',
								borderRadius: '6px',
								padding: '6px 10px',
							} }
						>
							{ __( 'View all link', 'sgs-blocks' ) }
						</span>
					</div>
				) }
			</div>
		</>
	);
}
