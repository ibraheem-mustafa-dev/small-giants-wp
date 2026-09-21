/**
 * SGS Mega Panel — block editor UI.
 *
 * Element-first inspector (Panel / Style / Aside), mirroring the pattern
 * used across other composite SGS blocks. `variant` has NO live control
 * — it is insert-time only, chosen by the starter pattern that
 * inserts this block, so it never appears here.
 *
 * FLEXIBLE COLUMNS: the panel accepts a free 1-N mix of
 * `sgs/mega-group` / `sgs/mega-aside` children — add, remove, reorder freely
 * (no `contentOnly` lock at THIS level). The number of columns is simply the
 * number of mega-group children an operator has added; there is no separate
 * `columnCount` attribute. Each individual mega-group/mega-aside still locks
 * its OWN internal template (mega-group: heading+icon-list; mega-aside:
 * media+LABEL+heading+text+button — five children, see
 * `mega-aside/edit.js`; `templateLock: 'insert'` on their own edit.js —
 * `'all'` re-runs WordPress's template-sync on every mount and silently
 * drops stored content that doesn't line up with the template by position,
 * so an operator cannot break THEIR shape, but can freely select and edit
 * any nested block's own settings (e.g. sgs/icon-list's link controls).
 *
 * The canvas itself proves the "parent paints child" mechanism live:
 * this component sets the SAME `data-mega-style` / `data-mega-scheme` /
 * `data-mega-variant` attributes AND the same colour custom-property VALUES
 * render.php computes onto the block wrapper, so style.css (which mirrors
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
	Notice,
} from '@wordpress/components';
import {
	DesignTokenPicker,
	ResponsiveControl,
	ResponsiveBoxControl,
	SgsBorderControl,
	SgsColourPanel,
	SgsLengthControl,
	ShadowControl,
	SurfaceGroundControls,
	fillRow,
} from '../../components';
import MediaElementPanel from '../../components/MediaElementPanel';
import { CursorFieldRowControls } from '../../components/CursorFieldRowControls';
import { ParticleTrailRowControls } from '../../components/ParticleTrailRowControls';
import { GridDotFieldRowControls } from '../../components/GridDotFieldRowControls';
import { FlowingGradientRowControls } from '../../components/FlowingGradientRowControls';
import { colourVar, resolveShadowPreviewComposed } from '../../utils';
import { ToggleGroupControl, ToggleGroupControlOption, ToolsPanel, ToolsPanelItem } from '../../components/primitives';

/**
 * `fxEffect` picker options (Spec 38) — this block's own
 * block-private effect selector, NOT the shared fx roster's `fx` attribute
 * (mega-panel declares `hideExtensions:["fx"]` and stays off that roster).
 *
 * @type {Array<{label: string, value: string}>}
 */
const FX_EFFECT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Cursor field', 'sgs-blocks' ), value: 'cursor-field' },
	{ label: __( 'Particle trail', 'sgs-blocks' ), value: 'particles' },
	{ label: __( 'Grid dots', 'sgs-blocks' ), value: 'grid-dots' },
	{ label: __( 'Flowing gradient', 'sgs-blocks' ), value: 'wave-gradient' },
];

/** Default general-variant template: 2 mega-groups — a starting
 *  point only; the panel is NOT locked to this shape. */
const GENERAL_TEMPLATE = [ [ 'sgs/mega-group' ], [ 'sgs/mega-group' ] ];

/**
 * media-cards variant — a single `sgs/card-grid`, pre-configured to
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
			columns: { desktop: 4, tablet: 2, mobile: 1 },
			gap: { desktop: '14' },
			cardRadius: '18px',
			aspectRatio: '16/10',
		},
	],
];

/**
 * brands variant — a `sgs/card-grid` used as a logo-tile grid
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
			columns: { desktop: 4, tablet: 3, mobile: 2 },
			gap: { desktop: '10' },
			cardRadius: '12px',
			aspectRatio: '3/2',
		},
	],
	[ 'sgs/mega-aside' ],
];

/**
 * Which child blocks + starting template a variant gets. `variant` is
 * insert-time only — chosen by which starter pattern inserted this
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

/**
 * Build a CSS border-width shorthand from a { top, right, bottom, left } box
 * object — each side falls back to '1px' independently, mirroring
 * render.php's `$border_width_top = '' !== $border_width_top ? … : '1px';`
 * so a fresh instance (which never wrote this attr) shows
 * the exact same 1px-everywhere hairline in the canvas that it renders on
 * the published page. Always returns a value (never undefined) — matches
 * render.php's `$has_border_width` being unconditionally true by
 * construction.
 *
 * @param {Object} box Box object.
 * @return {string} CSS border-width shorthand value.
 */
function borderWidthShorthand( box ) {
	const b = box && typeof box === 'object' ? box : {};
	return [ b.top, b.right, b.bottom, b.left ]
		.map( ( side ) => side || '1px' )
		.join( ' ' );
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		variant,
		style,
		headings,
		colourScheme,
		iconBackground,
		iconBackgroundGradient,
		iconBackgroundHover,
		iconBackgroundGradientHover,
		groupBorderColour,
		groupBorderColourGradient,
		groupBorderColourHover,
		groupBorderColourGradientHover,
		iconColour,
		iconColourGradient,
		iconColourHover,
		iconColourHoverGradient,
		accentBackgroundImage,
		accentBackgroundImageGradient,
		maxWidth,
		panelPadding,
		groupGap,
		panelBg,
		panelBgGradient,
		surfaceBlur,
		surfaceSaturate,
		surfaceOpacity,
		shadow,
		shadowColour,
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
		fxEffect,
	} = attributes;

	// Motion-effect reachability flags — each names the SINGLE
	// selected effect so the "not available in editor" Notice below and the
	// matching *RowControls panel gate on the same condition. The editor
	// canvas is static and cannot follow a pointer, animate particles, tick a
	// lattice, or scroll a gradient, so none of these four effects can be
	// shown live in the block preview — only the current settings can be
	// summarised. Mirrors sgs/media/edit.js's `isVideo`-style reachability
	// flag + fallback `<Notice>` (Signal 3, check-editor-render-parity.js).
	const isFxCursorField = 'cursor-field' === fxEffect;
	const isFxParticleTrail = 'particles' === fxEffect;
	const isFxGridDotField = 'grid-dots' === fxEffect;
	const isFxWaveGradient = 'wave-gradient' === fxEffect;

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
	// Gradient-set preview (mirrors sgs/text's firstLetterColour
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
		// Per-role accent custom properties — style.css derives
		// --sgs-mm-soft / --sgs-mm-soft-image from -bg / -image via color-mix();
		// -text / -border are consumed directly.
		'--sgs-mm-accent-bg': iconBackgroundValue,
		'--sgs-mm-accent-border': groupBorderValue,
		'--sgs-mm-accent-text': iconColourValue,
		'--sgs-mm-accent-image': accentImageValue,
		// iconBackgroundGradient canvas mirror — paints the icon-chip
		// background-image at full strength, same approximation approach as the
		// borderImage/groupBorderColourGradient mirrors below (a raw CSS function
		// string, gated on looking like a real gradient() call).
		'--sgs-mm-soft-gradient':
			iconBackgroundGradient &&
			/^(repeating-)?(linear|radial|conic)-gradient\(/i.test( iconBackgroundGradient )
				? iconBackgroundGradient
				: undefined,
		// iconBackgroundHover/iconBackgroundGradientHover canvas mirrors — consumed by style.css's `cards`-style hover rule on
		// `.sgs-mega-group:hover .sgs-icon-list__icon`. Only set when the operator
		// has picked one; unset means the hover rule's own var(...) fallback chain
		// resolves to the exact resting-state values, so this stays a no-op.
		'--sgs-mm-icon-hover-bg': iconBackgroundHover
			? colourVar( iconBackgroundHover ) || iconBackgroundHover
			: undefined,
		'--sgs-mm-icon-hover-bg-gradient':
			iconBackgroundGradientHover &&
			/^(repeating-)?(linear|radial|conic)-gradient\(/i.test( iconBackgroundGradientHover )
				? iconBackgroundGradientHover
				: undefined,
		// accentBackgroundImageGradient canvas mirror — consumed by
		// style.css's spotlight `[data-spotlight]::before` rule, bypassing the
		// derived --sgs-mm-soft-image tint entirely when set.
		'--sgs-mm-accent-image-gradient':
			accentBackgroundImageGradient &&
			/^(repeating-)?(linear|radial|conic)-gradient\(/i.test( accentBackgroundImageGradient )
				? accentBackgroundImageGradient
				: undefined,
		'--sgs-mm-panel-bg': panelBg
			? typeof surfaceOpacity === 'number' && surfaceOpacity < 1
				? `color-mix(in srgb, ${ colourVar( panelBg ) || panelBg } ${ Math.round( Math.max( 0, surfaceOpacity ) * 100 ) }%, transparent)`
				: colourVar( panelBg ) || panelBg
			: undefined,
		// panelBgGradient canvas mirror — same approach: --sgs-mm-panel-bg-gradient
		// is consumed by style.css's dark-scheme rule and by this root's own
		// panelBg background-color.
		'--sgs-mm-panel-bg-gradient':
			panelBgGradient &&
			/^(repeating-)?(linear|radial|conic)-gradient\(/i.test( panelBgGradient )
				? panelBgGradient
				: undefined,
		'--sgs-mm-panel-border': borderColour
			? colourVar( borderColour ) || borderColour
			: undefined,
		// A gradient border renders frontend as a masked ::before ring
		// (sgs_border_gradient_css() in render.php), which cannot be reproduced in
		// a plain inline style — approximate it with the gradient as a border-image,
		// same as every other block's canvas preview of a gradient border. Paints
		// into the real border area set below (borderWidth/borderStyle/
		// borderColor — this block has its own width/style control via
		// SgsBorderControl).
		borderImage:
			borderColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( borderColourGradient )
				? `${ borderColourGradient } 1`
				: undefined,
		// Resting-state group-tile border override —
		// only set when the operator has picked a resting colour; unset means
		// "inherit the cards tile's existing --sgs-mm-panel-border-derived
		// border", matched in style.css via a `var(..., var(--sgs-mm-panel-border))`
		// fallback chain (see that file's `.sgs-mega-group` cards rule).
		'--sgs-mm-group-border-resting': groupBorderColour
			? colourVar( groupBorderColour ) || groupBorderColour
			: undefined,
		// groupBorderColourGradient canvas mirror — render.php
		// paints it as a masked ::before ring on the resting `.sgs-mega-group`
		// tile (cards style only), winning over the flat resting colour above.
		// style.css's `--sgs-mm-group-border-image` consumer is a border-image
		// approximation, scoped so it is a no-op on the frontend (that custom
		// property is never set by render.php).
		'--sgs-mm-group-border-image':
			groupBorderColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( groupBorderColourGradient )
				? `${ groupBorderColourGradient } 1`
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
		// borderWidth/borderStyle canvas mirror (borderColour arrives via
		// --sgs-mm-panel-border above). Mirrors render.php exactly: width always
		// paints (each side falls back to 1px), style/colour ride the same
		// declaration set, colour reusing the --sgs-mm-panel-border value
		// already resolved above so an unset borderColour falls back
		// identically in both places.
		borderWidth: borderWidthShorthand( borderWidth ),
		borderStyle: borderStyle || 'solid',
		borderColor: 'var(--sgs-mm-panel-border)',
		backdropFilter: ( () => {
			const parts = [];
			if ( typeof surfaceSaturate === 'number' ) {
				parts.push( `saturate(${ surfaceSaturate }%)` );
			}
			if ( surfaceBlur ) {
				parts.push( `blur(${ surfaceBlur })` );
			}
			return parts.length ? parts.join( ' ' ) : undefined;
		} )(),
		boxShadow: shadow
			? resolveShadowPreviewComposed( shadow, shadowColour )
			: undefined,
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
			   render.php (each attribute resolves to its OWN
			   --sgs-mm-accent-bg / -border / -text / -image custom property,
			   consumed by exactly ONE real CSS property each — background-color
			   via the derived --sgs-mm-soft, border-color, color, and the aside
			   spotlight's background-image via the derived --sgs-mm-soft-image;
			   groupBorderColour/groupBorderColourGradient are the resting pair,
			   groupBorderColourHover/groupBorderColourGradientHover the hover
			   pair) + style.css (panelBg -> background-color, borderColour ->
			   border-color, --sgs-mm-group-border-resting -> the cards tile's
			   resting border-color). All single-state, `linked: true`. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'background',
						label: __( 'Background', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: panelBg,
								onChange: ( val ) => setAttributes( { panelBg: val ?? '' } ),
								linked: true,
								gradientValue: panelBgGradient,
								onGradientChange: ( val ) =>
									setAttributes( { panelBgGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'iconBackground',
						label: __( 'Accent background', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: iconBackground,
								onChange: ( val ) =>
									setAttributes( { iconBackground: val ?? 'accent' } ),
								linked: true,
								gradientValue: iconBackgroundGradient,
								onGradientChange: ( val ) =>
									setAttributes( { iconBackgroundGradient: val ?? '' } ),
							},
							{
								// Hover pair — fires off the
								// icon chip's ancestor `.sgs-mega-group:hover` on the `cards`
								// style only (the one style where that ancestor already has a
								// real hover trigger). Default empty string: no colour override
								// at hover until an operator sets one.
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: iconBackgroundHover,
								onChange: ( val ) =>
									setAttributes( { iconBackgroundHover: val ?? '' } ),
								linked: true,
								gradientValue: iconBackgroundGradientHover,
								onGradientChange: ( val ) =>
									setAttributes( { iconBackgroundGradientHover: val ?? '' } ),
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
							{
								// Hover pair — mirrors iconBackgroundHover immediately above: fires off the
								// icon chip's ancestor `.sgs-mega-group:hover` on the `cards`
								// style only. Deliberately NOT the shared textRow() helper: that
								// helper's onChange always falls back to '' on clear, but this
								// row's NORMAL state falls back to the 'accent' default
								// (matching iconColour's own block.json default), which this
								// hand-rolled shape preserves.
								// Default empty string on hover: no colour override until an
								// operator sets one, matching iconBackgroundHover's own convention.
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: iconColourHover,
								onChange: ( val ) =>
									setAttributes( { iconColourHover: val ?? '' } ),
								linked: true,
								gradientValue: iconColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { iconColourHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'accentBackgroundImage',
						label: __( 'Accent background image', 'sgs-blocks' ),
						// gradientCapable: the
						// accentBackgroundImageGradient sibling BYPASSES the base slug's
						// color-mix()-derived tint entirely and paints the raw gradient
						// directly on the spotlight glow's background-image — a gradient
						// cannot be meaningfully passed through that same colour-stop
						// derivation the way a flat colour can (see block.json's own note).
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: accentBackgroundImage,
								onChange: ( val ) =>
									setAttributes( { accentBackgroundImage: val ?? 'accent' } ),
								linked: true,
								gradientValue: accentBackgroundImageGradient,
								onGradientChange: ( val ) =>
									setAttributes( { accentBackgroundImageGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				{ /* A ToolsPanel — all controls (surface blur, maxWidth,
				   panelPadding, groupGap, borderRadius) are optional style/layout
				   customisations, so none are marked isShownByDefault. Same pattern
				   as team-member's optional controls. */ }
				<ToolsPanel
					label={ __( 'Panel', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							surfaceBlur: '',
							surfaceSaturate: undefined,
							surfaceOpacity: undefined,
							shadow: 'floating',
							shadowColour: '',
							maxWidth: undefined,
							panelPadding: undefined,
							groupGap: undefined,
							borderRadius: '',
						} )
					}
				>
					{ /* Fill */ }
					<SurfaceGroundControls
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>

					<ToolsPanelItem
						label={ __( 'Shadow', 'sgs-blocks' ) }
						hasValue={ () => shadow !== 'floating' || !! shadowColour }
						onDeselect={ () => setAttributes( { shadow: 'floating', shadowColour: '' } ) }
					>
						<ShadowControl
							label={ __( 'Shadow', 'sgs-blocks' ) }
							attributes={ attributes }
							setAttributes={ setAttributes }
							attrNames={ { base: 'shadow', colour: 'shadowColour' } }
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

					{ /* units array REQUIRED by the box-object interface contract. */ }
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
						<>
							<ToggleControl
								label={ __( 'Show group headings', 'sgs-blocks' ) }
								checked={ headings !== false }
								onChange={ ( value ) => setAttributes( { headings: value } ) }
								__nextHasNoMarginBottom
							/>
							{ false === headings && (
								<Notice status="info" isDismissible={ false }>
									{ __(
										'Hiding group headings is a known mega-menu accessibility pitfall — without a heading, screen reader users and quick visual scanners have no way to tell what each column of links is about. Consider leaving headings on, or switching to Minimal layout instead.',
										'sgs-blocks'
									) }
								</Notice>
							) }
						</>
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

					{ /* Block-private motion-effect selector (Spec 38) — NOT the shared fx ToolsPanel roster (this block
					   declares `hideExtensions:["fx"]` above and stays off that
					   roster). Additive to, and independent of, the aside's own
					   always-on cursor spotlight below in the Aside panel: that
					   effect is scoped to just the `.sgs-mega-aside` CTA column;
					   this one is scoped to the whole panel root. Only one of the
					   four control sets renders at a time, matching whichever
					   effect is selected. */ }
					<SelectControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Background effect', 'sgs-blocks' ) }
						help={ __(
							'An optional motion effect painted across the whole panel, on top of its background. Separate from the side-panel image glow below.',
							'sgs-blocks'
						) }
						value={ fxEffect || '' }
						options={ FX_EFFECT_OPTIONS }
						onChange={ ( value ) => setAttributes( { fxEffect: value } ) }
					/>

					{ isFxCursorField && (
						<>
							<Notice status="info" isDismissible={ false }>
								{ __(
									'This effect is not available to preview in the editor — it renders on the live site, handled by the server.',
									'sgs-blocks'
								) }
								{ ' ' }
								{ __( 'Current settings:', 'sgs-blocks' ) }
								{ ' ' }
								{ [
									attributes.fxFieldType ||
										__( 'glow', 'sgs-blocks' ),
									attributes.fxFieldColour ||
										__( 'default colour', 'sgs-blocks' ),
									attributes.fxFieldShape ||
										__( 'circle', 'sgs-blocks' ),
									attributes.fxFieldRadius
										? `${ attributes.fxFieldRadius }px`
										: '',
									attributes.fxFieldBlend
										? `${ attributes.fxFieldBlend }% blend`
										: '',
									attributes.fxFieldTrail
										? `${ attributes.fxFieldTrail }% drag`
										: '',
								]
									.filter( Boolean )
									.join( ', ' ) }
							</Notice>
							<CursorFieldRowControls
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</>
					) }
					{ isFxParticleTrail && (
						<>
							<Notice status="info" isDismissible={ false }>
								{ __(
									'This effect is not available to preview in the editor — it renders on the live site, handled by the server.',
									'sgs-blocks'
								) }
								{ ' ' }
								{ __( 'Current settings:', 'sgs-blocks' ) }
								{ ' ' }
								{ [
									attributes.fxParticlePreset ||
										__( 'sparks', 'sgs-blocks' ),
									attributes.fxParticleColour ||
										__( 'default colour', 'sgs-blocks' ),
									attributes.fxParticleDensity
										? `${ attributes.fxParticleDensity } density`
										: '',
									attributes.fxParticleSize
										? `${ attributes.fxParticleSize }px size`
										: '',
								]
									.filter( Boolean )
									.join( ', ' ) }
							</Notice>
							<ParticleTrailRowControls
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</>
					) }
					{ isFxGridDotField && (
						<>
							<Notice status="info" isDismissible={ false }>
								{ __(
									'This effect is not available to preview in the editor — it renders on the live site, handled by the server.',
									'sgs-blocks'
								) }
								{ ' ' }
								{ __( 'Current settings:', 'sgs-blocks' ) }
								{ ' ' }
								{ [
									attributes.fxGridDotColour ||
										__( 'default colour', 'sgs-blocks' ),
									attributes.fxGridDotHoverColour ||
										__( 'default hover colour', 'sgs-blocks' ),
									attributes.fxGridDotShape ||
										__( 'circle', 'sgs-blocks' ),
									attributes.fxGridCell
										? `${ attributes.fxGridCell }px cell`
										: '',
									attributes.fxGridDotSize
										? `${ attributes.fxGridDotSize }px dots`
										: '',
									attributes.fxGridRadius
										? `${ attributes.fxGridRadius }px radius`
										: '',
									attributes.fxGridLean
										? `${ attributes.fxGridLean }deg lean`
										: '',
									attributes.fxGridEase
										? `${ attributes.fxGridEase }ms ease`
										: '',
								]
									.filter( Boolean )
									.join( ', ' ) }
							</Notice>
							<GridDotFieldRowControls
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</>
					) }
					{ isFxWaveGradient && (
						<>
							<Notice status="info" isDismissible={ false }>
								{ __(
									'This effect is not available to preview in the editor — it renders on the live site, handled by the server.',
									'sgs-blocks'
								) }
								{ ' ' }
								{ __( 'Current settings:', 'sgs-blocks' ) }
								{ ' ' }
								{ [
									attributes.fxWaveVariant ||
										__( 'pastel', 'sgs-blocks' ),
									attributes.fxWaveBase ||
										__( 'default base colour', 'sgs-blocks' ),
									attributes.fxWave1 || '',
									attributes.fxWave2 || '',
									attributes.fxWave3 || '',
									attributes.fxWaveSpeed
										? `${ attributes.fxWaveSpeed }s speed`
										: '',
									attributes.fxWaveAmplitude
										? `${ attributes.fxWaveAmplitude }% amplitude`
										: '',
								]
									.filter( Boolean )
									.join( ', ' ) }
							</Notice>
							<FlowingGradientRowControls
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</>
					) }
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
					{ /* The aside banner's crop mode is a genuine client control
					   (style.css/render.php do not hardcode object-fit:cover;
					   the shared media-atoms system paints the same default).
					   The aside's image is rendered by a CHILD block (sgs/mega-
					   aside), so this is parent-paints-child, same as
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

				{ /* SgsBorderControl: width + style + colour (+ gradient) — borderWidth/
				   borderStyle default to 1px/solid, matching render.php's fallback
				   (SgsBorderControl always renders the width box; there is no
				   colour+radius-only composition). Radius is DELIBERATELY left out of
				   this control (no onRadiusChange wired) and stays on its own scalar
				   `borderRadius` control in the Panel ToolsPanel above —
				   SgsBorderControl's radius param expects a per-CORNER object
				   ({topLeft,topRight,bottomLeft,bottomRight}), a different shape from
				   this block's plain-string `borderRadius` (`"20px"`). Placed LAST in
				   InspectorControls (not next to the Panel ToolsPanel it conceptually
				   belongs beside) so its borderStyle/onStyleChange lines sit outside
				   the enum-control-shape gate's 900-char proximity window of the
				   unrelated Style/Motion/Aside panels' own ToggleGroupControl mounts —
				   those would falsely resolve as the bound control for borderStyle
				   (SgsBorderControl's OWN internal style picker is invisible to the
				   file-local scan, same as every other "shared-component" skip). */ }
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
				{ /* viewAllPlacement editor-canvas preview.
					The real footer content comes from `sgs_mega_panel_footer_html`
					— a filter fired at FRONTEND render time by the parent
					sgs/nav-bar-menu mega item, reading data this
					isolated block editor has no access to, so the actual link
					text/markup can never be replayed here (same "no live data"
					shape Signal 4 already covers for buybox/google-reviews).
					`auto`/`none` are correctly silent for the same reason: `auto`'s
					visibility depends on that same unavailable navigation context,
					and `none` genuinely renders nothing. But the CHOSEN CORNER
					(bottom-left/bottom-right) is real, static, and fully knowable
					here — it is just the alignment modifier class render.php
					already applies — so those two states get
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
							ever wraps real `$footer_html` content (render.php). */ }
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
