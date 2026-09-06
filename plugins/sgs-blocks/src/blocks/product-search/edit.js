/**
 * SGS Product Search — block editor UI.
 *
 * Renders a static preview (disabled input) in the editor.
 * Inspector controls: placeholder, buttonLabel, maxResults.
 */

import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, useSettings } from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl } from '@wordpress/components';
import { ResponsiveBoxControl, ResponsiveOverride, SgsColourPanel, resolveColourToken, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl, SgsBorderControl } from '../../components';
import MediaElementPanel from '../../components/MediaElementPanel';
import { borderPaintPreview } from '../../utils';

// NumberControl is experimental — fall back gracefully to TextControl if absent.
let NumberControl;
try {
	( {
		__experimentalNumberControl: NumberControl,
	} = require( '@wordpress/components' ) );
} catch {
	NumberControl = null;
}

/**
 * Edit component.
 *
 * @param {Object}   props               Block props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute updater.
 * @return {JSX.Element} Editor UI.
 */
export default function Edit( { attributes, setAttributes } ) {
	const {
		displayMode,
		placeholder,
		buttonLabel,
		maxResults,
		inputBorderColour,
		focusRingColour,
		listboxBackgroundColour,
		resultHoverBackgroundColour,
		matchHighlightColour,
		borderColour,
		borderColourGradient,
		borderColourHover,
		borderColourHoverGradient,
		borderStyle,
		borderWidth,
	} = attributes;

	// Editor-canvas mirror of the wrapper border block (width/style/colour+
	// gradient/radius) — render.php emits these on the block's own top-level
	// selector even though it isn't wrapper-qualified (see this file's own
	// border-colour rows below); the canvas preview approximates the same
	// visual on the root element regardless of the exact frontend selector.
	const borderPreviewStyle = {};
	if ( borderStyle && borderStyle !== 'none' ) {
		const bw = [ 'top', 'right', 'bottom', 'left' ];
		if ( borderWidth && bw.some( ( k ) => borderWidth[ k ] ) ) {
			borderPreviewStyle.borderWidth = bw.map( ( k ) => borderWidth[ k ] || '0' ).join( ' ' );
		}
		borderPreviewStyle.borderStyle = borderStyle;
		if ( borderColour ) {
			borderPreviewStyle.borderColor = /^#|^rgb|^hsl/.test( borderColour ) ? borderColour : `var(--wp--preset--color--${ borderColour })`;
		}
		if ( borderColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( borderColourGradient ) ) {
			borderPreviewStyle.borderImage = `${ borderColourGradient } 1`;
		}
	}

	const blockProps = useBlockProps( {
		className: 'sgs-product-search',
		style: borderPreviewStyle,
	} );

	// CHECK A: inputBorderColour paints `.sgs-product-search__input` directly
	// (style.css:37 — border, var(--sgs-ps-input-border, fallback)). No
	// gradient sibling attribute exists on this block, so only the flat-colour
	// branch of the shared helper ever fires.
	const [ colourPalette ] = useSettings( 'color.palette' );
	const inputPreviewStyle = borderPaintPreview( inputBorderColour, '', colourPalette );

	// CHECK A: listboxBackgroundColour paints `.sgs-product-search__results`
	// (style.css:86 — var(--sgs-ps-listbox-bg, fallback)); matchHighlightColour
	// paints `.sgs-product-search__result-title mark` (style.css:160). Neither
	// element ever exists in render.php's static markup — view.js builds the
	// listbox + result rows only after a live REST search fires — so the
	// static editor mock below is the only way either colour can be seen on
	// canvas without wiring real search logic into the editor.
	const listboxBgPreview = resolveColourToken(
		listboxBackgroundColour,
		colourPalette
	);
	const markBgPreview = resolveColourToken(
		matchHighlightColour,
		colourPalette
	);

	const resolvedPlaceholder =
		placeholder || __( 'Search products…', 'sgs-blocks' );
	const isIcon = displayMode === 'icon-expand' || displayMode === 'icon';
	const isOverlay = displayMode === 'full-screen-overlay';
	const isPalette = displayMode === 'command-palette';

	return (
		<>
			{ /* Colour gap close (D638 §6) — 5 client-controllable colour rows,
			    each a single 'normal' state (no hover concept on any of these
			    surfaces), matching the multi-button/D635 single-state pattern.
			    Falls back to the existing theme-token defaults in style.css
			    when unset (var(--sgs-ps-*, token) — see render.php). */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'input-border',
						label: __( 'Input border colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: inputBorderColour,
								onChange: ( val ) =>
									setAttributes( {
										inputBorderColour: val ?? '',
									} ),
							},
						],
					},
					{
						key: 'focus-ring',
						label: __( 'Focus ring colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: focusRingColour,
								onChange: ( val ) =>
									setAttributes( {
										focusRingColour: val ?? '',
									} ),
							},
						],
					},
					{
						key: 'listbox-background',
						label: __( 'Listbox background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: listboxBackgroundColour,
								onChange: ( val ) =>
									setAttributes( {
										listboxBackgroundColour: val ?? '',
									} ),
							},
						],
					},
					{
						key: 'result-hover-background',
						label: __(
							'Result hover background colour',
							'sgs-blocks'
						),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: resultHoverBackgroundColour,
								onChange: ( val ) =>
									setAttributes( {
										resultHoverBackgroundColour: val ?? '',
									} ),
							},
						],
					},
					{
						key: 'match-highlight',
						label: __( 'Match highlight colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: matchHighlightColour,
								onChange: ( val ) =>
									setAttributes( {
										matchHighlightColour: val ?? '',
									} ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Search settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Display', 'sgs-blocks' ) }
						value={ displayMode || 'inline-bar' }
						options={ [
							{
								label: __( 'Inline bar', 'sgs-blocks' ),
								value: 'inline-bar',
							},
							{
								label: __(
									'Icon (expand on click)',
									'sgs-blocks'
								),
								value: 'icon-expand',
							},
							{
								label: __(
									'Icon (full-screen overlay)',
									'sgs-blocks'
								),
								value: 'full-screen-overlay',
							},
							{
								label: __(
									'Command palette (⌘K / Ctrl+K)',
									'sgs-blocks'
								),
								value: 'command-palette',
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { displayMode: value } )
						}
						help={ __(
							'Inline bar: always-visible search field. Icon (expand): a small dropdown panel. Icon (full-screen overlay): opens a dimmed full-screen search dialog. Command palette: a centred modal opened by clicking the icon or pressing ⌘K / Ctrl+K.',
							'sgs-blocks'
						) }
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Input placeholder', 'sgs-blocks' ) }
						value={ placeholder }
						onChange={ ( value ) =>
							setAttributes( { placeholder: value } )
						}
						help={ __(
							'Placeholder text shown inside the search input.',
							'sgs-blocks'
						) }
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Button label', 'sgs-blocks' ) }
						value={ buttonLabel }
						onChange={ ( value ) =>
							setAttributes( { buttonLabel: value } )
						}
						help={ __(
							'Accessible label for the search button (screen readers).',
							'sgs-blocks'
						) }
						__next40pxDefaultSize
					/>
					{ /*
					  `maxResults` is a TIER OBJECT (Spec 35 pass 2) — ONE attr
					  holding {desktop,tablet,mobile}, so it uses
					  <ResponsiveOverride> rather than the old breakpoint-keyed
					  attrMap. FR-36-20's caps are per-tier (Baymard: max 10
					  desktop, 4–8 mobile) with NO distinct tablet design
					  finding — render.php inherits the desktop value/cap for
					  tablet (matching the pre-migration behaviour where no
					  tablet attr ever existed), so the tablet tier here shows
					  explanatory text rather than a second control that
					  render.php would never read (would be a dead control).
					*/ }
					<ResponsiveOverride
						label={ __( 'Max suggestions', 'sgs-blocks' ) }
						value={ maxResults }
						onChange={ ( obj ) =>
							setAttributes( { maxResults: obj } )
						}
					>
						{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => {
							if ( 'tablet' === tier ) {
								return (
									<p style={ { margin: 0, fontStyle: 'italic' } }>
										{ __(
											'Tablet uses the desktop value above — there is no separate tablet cap (Baymard research covers mobile only).',
											'sgs-blocks'
										) }
									</p>
								);
							}

							const isMobile = 'mobile' === tier;
							const min = isMobile ? 4 : 1;
							const max = isMobile ? 8 : 10;
							const fallback = isMobile ? 6 : 10;
							const current =
								'' !== ownValue && undefined !== ownValue
									? ownValue
									: effectiveValue;
							const commit = ( value ) =>
								setOwnValue(
									Math.max(
										min,
										Math.min(
											max,
											Number.parseInt( value, 10 ) ||
												fallback
										)
									)
								);
							const helpText = isMobile
								? __(
										'Maximum product suggestions shown on mobile (4–8, Baymard).',
										'sgs-blocks'
								  )
								: __(
										'Maximum product suggestions shown on desktop and tablet (1–10).',
										'sgs-blocks'
								  );

							return NumberControl ? (
								<NumberControl
									value={ current }
									min={ min }
									max={ max }
									onChange={ commit }
									help={ helpText }
									__next40pxDefaultSize
								/>
							) : (
								<TextControl
									value={ String( current ?? '' ) }
									type="number"
									onChange={ commit }
									help={ helpText }
									__next40pxDefaultSize
								/>
							);
						} }
					</ResponsiveOverride>
				</PanelBody>
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				{ /* 37-media-no-handroll remediation (2026-09-03) — the result-row
				   product thumbnail's crop mode is a genuine client control now
				   (style.css no longer hardcodes object-fit:cover; the shared
				   media-atoms stylesheet paints the same default). The thumbnail
				   only exists in the live results list (view.js), never in this
				   static editor preview, so this mounts its own panel rather than
				   nesting inside an existing preview-bound control. */ }
				<MediaElementPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
					prefix=""
					blockSlug="sgs/product-search"
					insertion="root"
					group="styles"
					atoms={ [ 'object-fit' ] }
					mediaType="image"
					scope="element"
					title={ __( 'Result thumbnail', 'sgs-blocks' ) }
				/>

				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveOverride
						value={ attributes.padding }
						onChange={ ( obj ) => setAttributes( { padding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride
						value={ attributes.margin }
						onChange={ ( obj ) => setAttributes( { margin: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Margin', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourStates={ [
							{ key: 'normal', label: __( 'Normal', 'sgs-blocks' ), value: borderColour,
							  onChange: ( val ) => setAttributes( { borderColour: val ?? '' } ),
							  gradientValue: borderColourGradient,
							  onGradientChange: ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) },
							{ key: 'hover', label: __( 'Hover', 'sgs-blocks' ), value: borderColourHover,
							  onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
							  gradientValue: borderColourHoverGradient,
							  onGradientChange: ( val ) => setAttributes( { borderColourHoverGradient: val ?? '' } ) },
						] }
						radiusValues={ {
							base: attributes.borderRadius?.desktop ?? {},
							tablet: attributes.borderRadius?.tablet ?? {},
							mobile: attributes.borderRadius?.mobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ isIcon || isOverlay || isPalette ? (
					/* Icon / overlay / command-palette editor preview — compact trigger button, matches the collapsed state. */
					<>
						<button
							type="button"
							className="sgs-product-search__submit"
							disabled
							aria-label={
								buttonLabel ||
								__( 'Search products', 'sgs-blocks' )
							}
							style={ { minWidth: '44px', minHeight: '44px' } }
						>
							<svg
								aria-hidden="true"
								focusable="false"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<circle cx="11" cy="11" r="8" />
								<line x1="21" y1="21" x2="16.65" y2="16.65" />
							</svg>
						</button>
						<p className="sgs-product-search__editor-hint">
							{ isPalette
								? __(
										'Command palette — opens a centred search modal on click or ⌘K / Ctrl+K.',
										'sgs-blocks'
								  )
								: isOverlay
								? __(
										'Full-screen overlay — opens a dimmed modal search dialog on click.',
										'sgs-blocks'
								  )
								: __(
										'Icon mode — click the icon to expand the search field.',
										'sgs-blocks'
								  ) }
						</p>
					</>
				) : (
					/* Inline-mode editor preview — full disabled search bar. */
					<>
						<div className="sgs-product-search__field-wrap">
							<input
								type="search"
								className="sgs-product-search__input"
								disabled
								style={ inputPreviewStyle }
								placeholder={ resolvedPlaceholder }
							/>
							<button
								type="button"
								className="sgs-product-search__submit"
								disabled
								aria-label={
									buttonLabel || __( 'Search', 'sgs-blocks' )
								}
							>
								<svg
									aria-hidden="true"
									focusable="false"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<circle cx="11" cy="11" r="8" />
									<line
										x1="21"
										y1="21"
										x2="16.65"
										y2="16.65"
									/>
								</svg>
							</button>
						</div>
						{ /* CHECK A mock — a static stand-in for the live results
						   listbox view.js builds at runtime on a real keystroke.
						   Permanently shown (the editor cannot simulate typing);
						   markup mirrors render.php's `<ul role="listbox">` +
						   view.js's per-row `result-info`/`result-title`/`<mark>`
						   structure exactly, using placeholder copy, so
						   listboxBackgroundColour and matchHighlightColour are
						   both visible on canvas. */ }
						<ul
							className="sgs-product-search__results"
							role="listbox"
							aria-label={ __(
								'Product suggestions',
								'sgs-blocks'
							) }
							style={ {
								position: 'static',
								marginTop: '0.25rem',
								...( listboxBgPreview
									? { background: listboxBgPreview }
									: {} ),
							} }
						>
							<li role="option">
								<div className="sgs-product-search__result-info">
									<span className="sgs-product-search__result-title">
										<mark
											style={
												markBgPreview
													? { background: markBgPreview }
													: undefined
											}
										>
											Ex
										</mark>
										ample Product
									</span>
								</div>
							</li>
							<li role="option">
								<div className="sgs-product-search__result-info">
									<span className="sgs-product-search__result-title">
										{ __(
											'Another Result',
											'sgs-blocks'
										) }
									</span>
								</div>
							</li>
						</ul>
						<p className="sgs-product-search__editor-hint">
							{ __(
								'Live product search — works on the published site.',
								'sgs-blocks'
							) }
						</p>
					</>
				) }
			</div>
		</>
	);
}
