/**
 * SGS Mega Aside — block editor UI.
 *
 * GROUND-TRUTH: verified against .claude/plans/archive/2026-07-24-mega-menu-BUILD-SPEC.md
 * §8 (aside formats) + mega-panel/edit.js's own Aside PanelBody + the shared
 * ResponsiveBoxControl doc-comment for the values/onChange contract.
 *
 * A locked-content side panel: media + tag/eyebrow + heading + text + a
 * call-to-action button. `asideFormat` (feature|preview|cta) is a LIVE control
 * (unlike the parent panel's insert-time-only `variant`, CF-5) — it only
 * changes which of the five fixed children are visible and how they're
 * arranged, never the structure, so switching it live never orphans content.
 *
 * This block owns its own FILL (background/padding/radius/border) — the
 * parent sgs/mega-panel still owns GRID POSITION (width/divider, CF-10). No
 * typography/colour control exists here for any inner element (media/tag/
 * heading/text/button) — that's all child-owned (HC2); a parent duplicate
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
} from '@wordpress/components';
import { ResponsiveBoxControl, resolveColourToken, SgsColourPanel, SgsLengthControl } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

/**
 * Build a CSS box shorthand ("top right bottom left") from a
 * { top, right, bottom, left } box object, or undefined when nothing is
 * set — mirrors sgs/button's own `boxShorthand` editor-preview helper
 * (same house pattern, kept local rather than shared since each block's
 * box shape/keys differ slightly).
 *
 * @param {Object} box  Box object.
 * @param {Array}  keys Ordered side keys to read.
 * @return {string|undefined} CSS shorthand value or undefined.
 */
function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) {
		return undefined;
	}
	if ( ! keys.some( ( key ) => box[ key ] ) ) {
		return undefined;
	}
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

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
	const {
		asideFormat,
		asideBg,
		asideBgGradient,
		asideBgHover,
		asideBgHoverGradient,
		asidePadding,
		asideRadius,
		asideBorderColour,
		asideBorderColourGradient,
		asideBorderWidth,
	} = attributes;

	const format = asideFormat || 'feature';

	// Editor-canvas preview style — mirrors render.php's fill logic (§2:
	// background / border / radius / padding) exactly, so a change to any of
	// these 5 controls shows live in the canvas instead of only on the
	// published page. GROUND-TRUTH: render.php:82-122 — asideBg resolves via
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
	if ( asideBgGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( asideBgGradient ) ) {
		previewStyle.backgroundImage = asideBgGradient;
	}
	if ( asideRadius ) {
		previewStyle.borderRadius = asideRadius;
	}
	const borderWidthPreview = boxShorthand( asideBorderWidth, [ 'top', 'right', 'bottom', 'left' ] );
	if ( borderWidthPreview ) {
		previewStyle.borderWidth = borderWidthPreview;
		previewStyle.borderStyle = 'solid';
		previewStyle.borderColor = asideBorderColour
			? resolveColourToken( asideBorderColour, palette )
			: 'var(--sgs-mm-panel-border, rgba(0,0,0,.12))';
		// CHECK A: asideBorderColourGradient had no canvas mirror — render.php:113-121
		// paints it as a masked ::before ring (D636 border builder), winning over
		// the flat border-color above. A plain inline style can't reproduce the
		// mask, so this approximates it via border-image (same documented
		// approximation used elsewhere this session), only when the border is
		// actually painting (borderWidthPreview truthy, matching render.php's gate).
		if ( asideBorderColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( asideBorderColourGradient ) ) {
			previewStyle.borderImage = `${ asideBorderColourGradient } 1`;
		}
	}
	const paddingPreview = boxShorthand( asidePadding?.desktop, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		previewStyle.padding = paddingPreview;
	}

	/*
	 * asideBgHover(Gradient) canvas mirror (CHECK A, 2026-09-06). render.php:88-104
	 * already emits both hover-sibling CSS custom properties, consumed by
	 * style.css:49-53's real `.sgs-mega-aside:hover,:focus-within` rule — the
	 * editor canvas never showed it because nothing outside the control read
	 * either Hover attr. Same shape as this file's own resting preview above:
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
		asideBgHoverGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( asideBgHoverGradient )
			? `background-image:${ asideBgHoverGradient } !important;background-color:transparent !important;`
			: asideBgHover
				? `background-color:${ resolveColourToken( asideBgHover, palette ) } !important;`
				: '';
	const megaAsideHoverPreviewCss = asideBgHoverDecl
		? `.${ megaAsidePreviewScope }:hover,.${ megaAsidePreviewScope }:focus-within{${ asideBgHoverDecl }}`
		: '';

	const blockProps = useBlockProps( {
		className: `sgs-mega-aside ${ megaAsidePreviewScope }`,
		style: previewStyle,
		'data-aside-format': format,
	} );
	// `templateLock:'insert'`, NOT `'all'` (D652). `'all'`/`'contentOnly'` re-run
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
			{ /* GROUND-TRUTH: block.json attributes.asideBg / asideBorderColour
			   (both plain string colour attrs, no default) + render.php:82-122
			   (asideBg -> background-color; asideBorderColour -> border-color,
			   falling back to --sgs-mm-panel-border when unset) — confirmed
			   2026-08-15. Both single-state (no hover pair exists for either),
			   `linked: true` per D619 (both previously used `linked` on their
			   DesignTokenPicker already). */ }
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

					{ /* units array is REQUIRED by contract §14 field 2 — added
					     2026-08-11 (P-SPEC35-BORDER-RESIDUALS item 3). Without it
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
