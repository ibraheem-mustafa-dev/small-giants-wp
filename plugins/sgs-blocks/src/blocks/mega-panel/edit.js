/**
 * SGS Mega Panel — block editor UI.
 *
 * Element-first inspector (Panel / Style / Aside), mirroring the pattern
 * used across other composite SGS blocks. `variant` has NO live control
 * (CF-5) — it is insert-time only, chosen by the starter pattern that
 * inserts this block, so it never appears here.
 *
 * FLEXIBLE COLUMNS (QC-fix 2026-07-24, Bean-directed): the panel accepts a
 * free 1-N mix of `sgs/mega-group` / `sgs/mega-aside` children — add,
 * remove, reorder freely (no `contentOnly` lock at THIS level). The number
 * of columns is simply the number of mega-group children an operator has
 * added; there is no separate `columnCount` attribute any more. Each
 * individual mega-group/mega-aside still locks its OWN internal template
 * (mega-group: heading+icon-list; mega-aside: media+LABEL+heading+text+button
 * — five children, see `mega-aside/edit.js:37`; `templateLock: 'all'` on
 * their own edit.js) so an operator cannot break THEIR shape, but can freely
 * select and edit any nested block's own settings (e.g. sgs/icon-list's
 * link controls) — the previous `contentOnly` lock at the panel level
 * suppressed the inspector for that whole subtree, which is what hid them.
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
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import {
	DesignTokenPicker,
	ResponsiveControl,
	ResponsiveBoxControl,
} from '../../components';
import { colourVar } from '../../utils';

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
		accent,
		maxWidth,
		panelPadding,
		groupGap,
		panelBg,
		bgBlur,
		borderColour,
		borderRadius,
		asideWidth,
		asideSeparator,
		brandsEyebrow,
		staggerOnOpen,
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
	const accentValue = colourVar( accent ) || 'var(--wp--preset--color--accent)';
	const shellStyle = {
		'--sgs-mm-accent': accentValue,
		'--sgs-mm-panel-bg': panelBg ? colourVar( panelBg ) || panelBg : undefined,
		'--sgs-mm-panel-border': borderColour
			? colourVar( borderColour ) || borderColour
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
			<InspectorControls>
				<PanelBody title={ __( 'Panel', 'sgs-blocks' ) }>
					{ /* Fill */ }
					<DesignTokenPicker
						label={ __( 'Background', 'sgs-blocks' ) }
						value={ panelBg }
						onChange={ ( value ) => setAttributes( { panelBg: value || '' } ) }
						linked
						enableAlpha
						clearable
					/>
					<DesignTokenPicker
						label={ __( 'Border colour', 'sgs-blocks' ) }
						value={ borderColour }
						onChange={ ( value ) => setAttributes( { borderColour: value || '' } ) }
						linked
						enableAlpha
						clearable
					/>
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

					{ /* Layout */ }
					<ResponsiveControl label={ __( 'Panel max width', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<UnitControl
								label={ __( 'Max width', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ maxWidth?.[ breakpoint ] || '' }
								onChange={ ( value ) =>
									setAttributes( {
										maxWidth: { ...maxWidth, [ breakpoint ]: value || undefined },
									} )
								}
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveControl>

					<ResponsiveBoxControl
						label={ __( 'Panel padding', 'sgs-blocks' ) }
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

					<ResponsiveControl label={ __( 'Group gap', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<UnitControl
								label={ __( 'Gap', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ groupGap?.[ breakpoint ] || '' }
								onChange={ ( value ) =>
									setAttributes( {
										groupGap: { ...groupGap, [ breakpoint ]: value || undefined },
									} )
								}
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveControl>

					<UnitControl
						label={ __( 'Border radius', 'sgs-blocks' ) }
						value={ borderRadius || '' }
						onChange={ ( value ) => setAttributes( { borderRadius: value || '20px' } ) }
						__next40pxDefaultSize
					/>
				</PanelBody>

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
					>
						<ToggleGroupControlOption value="light" label={ __( 'Light', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="dark" label={ __( 'Dark', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="auto" label={ __( 'Auto', 'sgs-blocks' ) } />
					</ToggleGroupControl>

					<DesignTokenPicker
						label={ __( 'Accent', 'sgs-blocks' ) }
						value={ accent }
						onChange={ ( value ) => setAttributes( { accent: value || 'accent' } ) }
						linked
					/>
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
				</PanelBody>

				<PanelBody title={ __( 'Aside', 'sgs-blocks' ) } initialOpen={ false }>
					<p className="sgs-mega-panel-editor-note">
						{ __(
							'Only applies when a side panel (sgs/mega-aside) block has been added alongside the groups.',
							'sgs-blocks'
						) }
					</p>
					<UnitControl
						label={ __( 'Aside width', 'sgs-blocks' ) }
						value={ asideWidth || '' }
						onChange={ ( value ) => setAttributes( { asideWidth: value || '340px' } ) }
						__next40pxDefaultSize
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
					>
						<ToggleGroupControlOption value="line" label={ __( 'Line', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="none" label={ __( 'None', 'sgs-blocks' ) } />
					</ToggleGroupControl>
					{ 'line' === sepStyle && (
						<>
							<DesignTokenPicker
								label={ __( 'Divider colour', 'sgs-blocks' ) }
								value={ asideSeparator?.colour }
								onChange={ ( value ) =>
									setAttributes( {
										asideSeparator: { ...asideSeparator, colour: value || '' },
									} )
								}
								linked
								clearable
							/>
							<UnitControl
								label={ __( 'Divider width', 'sgs-blocks' ) }
								value={ asideSeparator?.width || '' }
								onChange={ ( value ) =>
									setAttributes( {
										asideSeparator: { ...asideSeparator, width: value || '' },
									} )
								}
								__next40pxDefaultSize
							/>
						</>
					) }
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ 'brands' === resolvedVariant && brandsEyebrow && (
					<p className="sgs-mega-panel__eyebrow">{ brandsEyebrow }</p>
				) }
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
