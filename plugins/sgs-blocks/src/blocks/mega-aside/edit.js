/**
 * SGS Mega Aside — block editor UI.
 *
 * Mirrors mega-panel/edit.js's own Aside PanelBody + the shared
 * ResponsiveBoxControl doc-comment for the values/onChange contract.
 *
 * A locked-content side panel: media + tag/eyebrow + heading + text + a
 * call-to-action button. `asideFormat` (feature|preview|cta) is a LIVE control
 * (unlike the parent panel's insert-time-only `variant`) — it only
 * changes which of the five fixed children are visible and how they're
 * arranged, never the structure, so switching it live never orphans content.
 *
 * This block owns its own FILL (background/padding/radius/border) — the
 * parent sgs/mega-panel still owns GRID POSITION (width/divider). No
 * typography/colour control exists here for any inner element (media/tag/
 * heading/text/button) — that's all child-owned; a parent duplicate
 * would be dead by CSS specificity against the child's own inline styles.
 *
 * @return {JSX.Element} The block editor UI.
 */

import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	useSettings,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
} from '@wordpress/components';
import { ResponsiveBoxControl, ResponsiveOverride, SpacingControl, resolveColourToken, SgsColourPanel, SgsLengthControl } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

import { tierBoxShorthand, usePreviewTier, resolveResponsiveTier, isCssGradient, sgsBorderPreview } from '../../utils';

const JUSTIFY_OPTIONS = [
	{ label: __( 'Start', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Space between', 'sgs-blocks' ), value: 'space-between' },
];

const TEMPLATE = [
	[ 'sgs/media', {} ],
	[
		'sgs/label',
		{ text: __( 'Featured', 'sgs-blocks' ), textColour: 'accent' },
	],
	[
		'sgs/heading',
		{ level: 3, content: __( 'Explore more', 'sgs-blocks' ) },
	],
	[
		'sgs/text',
		{
			text: __(
				'Hover a link to preview it here, or read on to find out more.',
				'sgs-blocks'
			),
		},
	],
	[ 'sgs/button', {} ],
];

export default function Edit( { attributes, setAttributes, clientId } ) {
	const previewTier = usePreviewTier();
	const {
		asideFormat,
		asideBg,
		asideBgGradient,
		asideBgHover,
		asideBgHoverGradient,
		asidePadding,
		asideRadius,
		asideGap,
		asideJustify,
		asideBorderColour,
		asideBorderColourGradient,
		asideBorderColourHover,
		asideBorderColourHoverGradient,
		asideBorderWidth,
	} = attributes;

	const format = asideFormat || 'feature';

	// Editor-canvas preview style — mirrors render.php's fill logic
	// (background / border / radius / padding) exactly, so a change to any of
	// these 5 controls shows live in the canvas instead of only on the
	// published page. asideBg resolves via
	// sgs_colour_value() (here: resolveColourToken against the live palette,
	// the same slug-or-raw-CSS resolution used by sgs/button's own preview);
	// asideRadius is already a unit-bearing string from UnitControl; the
	// border only paints when at least one side of asideBorderWidth is
	// non-zero, falling back to the inherited --sgs-mm-panel-border custom
	// property when no explicit border colour is set (same fallback
	// render.php uses); asidePadding is a TIER object — the editor preview
	// always shows the desktop tier, matching sgs/button's own preview
	// convention for tier-object attrs.
	const [ palette ] = useSettings( 'color.palette' );

	const previewStyle = {};
	if ( asideBg ) {
		previewStyle.backgroundColor = resolveColourToken( asideBg, palette );
	}
	if ( isCssGradient( asideBgGradient ) ) {
		previewStyle.backgroundImage = asideBgGradient;
	}
	Object.assign( previewStyle, sgsBorderPreview( { widthValues: asideBorderWidth, styleValue: 'solid', colourValue: asideBorderColour, colourGradientValue: asideBorderColourGradient, radiusValues: asideRadius }, previewTier, palette, { fallbackColour: 'var(--sgs-mm-panel-border, rgba(0,0,0,.12))' } ) );
	// Stack gap + vertical alignment at the previewed tier (render.php's sgs_emit_responsive_css; a bare number is px).
	const gapAtTier = resolveResponsiveTier( asideGap || {}, previewTier )?.value;
	if ( gapAtTier ) {
		previewStyle.gap = /^\d+(\.\d+)?$/.test( String( gapAtTier ) ) ? `${ gapAtTier }px` : gapAtTier;
	}
	const justifyAtTier = resolveResponsiveTier( asideJustify || {}, previewTier )?.value;
	if ( justifyAtTier ) {
		previewStyle.justifyContent = justifyAtTier;
	}
	const paddingPreview = tierBoxShorthand( asidePadding, previewTier, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		previewStyle.padding = paddingPreview;
	}

	/*
	 * asideBgHover(Gradient) canvas mirror. render.php
	 * emits both hover-sibling CSS custom properties, consumed by
	 * style.css's real `.sgs-mega-aside:hover,:focus-within` rule — the
	 * editor canvas needs its own rule to show it. Same shape as this file's
	 * own resting preview above:
	 * a clientId-scoped `<style>` tag with a real `:hover,:focus-within` rule,
	 * resolved via the same resolveColourToken already used for the resting
	 * background.
	 *
	 * `!important` is required because the resting preview above sets the SAME
	 * background-color/-image properties as an inline `style` prop on this
	 * same element (previewStyle, spread into blockProps.style below) — an
	 * inline declaration always out-ranks an external stylesheet rule for the
	 * same property regardless of `:hover` matching, so without it this rule
	 * would parse correctly and still never paint whenever a resting
	 * background is also set (the common case).
	 */
	const megaAsidePreviewScope = `sgs-mega-aside-preview-${ clientId }`;
	const asideBgHoverDecl =
		isCssGradient( asideBgHoverGradient )
			? `background-image:${ asideBgHoverGradient } !important;background-color:transparent !important;`
			: asideBgHover
				? `background-color:${ resolveColourToken( asideBgHover, palette ) } !important;`
				: '';
	/*
	 * asideBorderColourHover(Gradient) canvas mirror. render.php emits both via
	 * sgs_border_states_css(); the editor canvas needs its own rule to show it.
	 * Only meaningful when a resting border is actually
	 * painting (the shared border preview set a width, matching render.php's own
	 * $aside_border_has_width gate above). Same `border-image` approximation
	 * as the resting-state gradient preview above (not the real masked
	 * ::before ring — a `<style>` tag can't reach ::before content).
	 */
	const asideBorderHoverDecl = previewStyle.borderWidth
		? isCssGradient( asideBorderColourHoverGradient )
			? `border-image:${ asideBorderColourHoverGradient } 1 !important;`
			: asideBorderColourHover
				? `border-color:${ resolveColourToken( asideBorderColourHover, palette ) } !important;`
				: ''
		: '';
	const megaAsideHoverPreviewCss = ( asideBgHoverDecl || asideBorderHoverDecl )
		? `.${ megaAsidePreviewScope }:hover,.${ megaAsidePreviewScope }:focus-within{${ asideBgHoverDecl }${ asideBorderHoverDecl }}`
		: '';

	const blockProps = useBlockProps( {
		className: `sgs-mega-aside ${ megaAsidePreviewScope }`,
		style: previewStyle,
		'data-aside-format': format,
	} );
	// `templateLock:'insert'`, NOT `'all'`. `'all'`/`'contentOnly'` re-run
	// WordPress's template-sync effect on every editor mount and silently
	// discard any stored child that doesn't line up with TEMPLATE by position;
	// `'insert'` still blocks a client from adding/removing/reordering the five
	// fixed children but never triggers that destructive resync.
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template: TEMPLATE,
		templateLock: 'insert',
	} );

	return (
		<>
			{ /* block.json attributes.asideBg / asideBorderColour (plain string
			   colour attrs, no default) + render.php (asideBg -> background-color;
			   asideBorderColour -> border-color, falling back to
			   --sgs-mm-panel-border when unset). `linked: true`. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'background',
						label: __( 'Background', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: asideBg,
								onChange: ( val ) => setAttributes( { asideBg: val ?? '' } ),
								linked: true,
								gradientValue: asideBgGradient,
								onGradientChange: ( val ) =>
									setAttributes( { asideBgGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: asideBgHover,
								onChange: ( val ) => setAttributes( { asideBgHover: val ?? '' } ),
								linked: true,
								gradientValue: asideBgHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { asideBgHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'border',
						label: __( 'Border colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: asideBorderColour,
								onChange: ( val ) => setAttributes( { asideBorderColour: val ?? '' } ),
								linked: true,
								gradientValue: asideBorderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { asideBorderColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: asideBorderColourHover,
								onChange: ( val ) => setAttributes( { asideBorderColourHover: val ?? '' } ),
								linked: true,
								gradientValue: asideBorderColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { asideBorderColourHoverGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Aside', 'sgs-blocks' ) }>
					<ToggleGroupControl
						label={ __( 'Format', 'sgs-blocks' ) }
						help={ __(
							'Feature shows media, a tag, a title, text and a button. Preview swaps its title and text to match whichever link in this menu is being hovered. CTA is a compact pill, text and button with no media.',
							'sgs-blocks'
						) }
						value={ format }
						onChange={ ( value ) =>
							setAttributes( { asideFormat: value || 'feature' } )
						}
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption
							value="feature"
							label={ __( 'Feature', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="preview"
							label={ __( 'Preview', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="cta"
							label={ __( 'CTA', 'sgs-blocks' ) }
						/>
					</ToggleGroupControl>

					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						presets
						values={ {
							base: asidePadding?.desktop ?? {},
							tablet: asidePadding?.tablet ?? {},
							mobile: asidePadding?.mobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( {
								asidePadding: {
									...asidePadding,
									[ key ]: next,
								},
							} );
						} }
					/>

					{ /* block.json attributes.asideGap / asideJustify (tier objects) +
					   render.php (sgs_emit_responsive_css on the aside's scoped rule). */ }
					<ResponsiveOverride
						label={ __( 'Content gap', 'sgs-blocks' ) }
						value={ asideGap }
						onChange={ ( obj ) => setAttributes( { asideGap: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<SpacingControl
								freeInput
								value={ ownValue }
								placeholder={ inherited ? effectiveValue : '16px' }
								onChange={ setOwnValue }
							/>
						) }
					</ResponsiveOverride>

					<ResponsiveOverride
						label={ __( 'Vertical alignment', 'sgs-blocks' ) }
						value={ asideJustify }
						onChange={ ( obj ) => setAttributes( { asideJustify: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								value={ ownValue || '' }
								options={
									'desktop' === tier
										? [ { label: __( 'Default (start)', 'sgs-blocks' ), value: '' }, ...JUSTIFY_OPTIONS ]
										: [ { label: __( '— inherit —', 'sgs-blocks' ), value: '' }, ...JUSTIFY_OPTIONS ]
								}
								onChange={ ( val ) => setOwnValue( val ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>

					{ /* units array is REQUIRED by the box-object interface contract. Without it
					     the operator gets whatever unit set core happens to
					     default to, and '%' (a pill/circle radius) may not be
					     reachable at all. */ }
					<SgsLengthControl
						label={ __( 'Corner radius', 'sgs-blocks' ) }
						value={ asideRadius || '' }
						onChange={ ( value ) =>
							setAttributes( { asideRadius: value || '' } )
						}
						units={ [
							{ value: 'px', label: 'px', default: 8 },
							{ value: '%', label: '%', default: 50 },
							{ value: 'rem', label: 'rem', default: 0.5 },
							{ value: 'em', label: 'em', default: 0.5 },
						] }
						presets={ false }
					/>

					<ResponsiveBoxControl
						label={ __( 'Border width', 'sgs-blocks' ) }
						presets={ [ '10', '20', '30' ] }
						values={ { base: asideBorderWidth ?? {} } }
						showResponsive={ false }
						onChange={ ( tier, next ) =>
							setAttributes( { asideBorderWidth: next } )
						}
					/>
				</PanelBody>
			</InspectorControls>

			{ megaAsideHoverPreviewCss && <style>{ megaAsideHoverPreviewCss }</style> }
			<div { ...innerBlocksProps } />
		</>
	);
}
