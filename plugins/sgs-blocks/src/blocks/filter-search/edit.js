/**
 * SGS Filter Search — editor component.
 *
 * Renders a static preview of the search input and exposes inspector controls
 * for searchMode (attribute-chips vs taxonomy-terms), taxonomy, showCounts,
 * attributeId, threshold, and placeholder. Actual filtering/term listing is
 * frontend-only (render.php + view.js) — the editor never fetches live terms.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, useSettings } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { ResponsiveBoxControl, SgsColourPanel, resolveColourToken } from '../../components';
import { borderPaintPreview, textPaintPreview } from '../../utils';
import FilterSearchSettings from './FilterSearchSettings';

// Box-object interface contract §5: base-tier canvas preview shorthand
// (mirrors sgs/buybox + sgs/whatsapp-cta). Tablet/mobile tiers live in
// render.php's own scoped @media rules, which the editor canvas never
// executes.
function boxShorthand( box ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	const { top, right, bottom, left } = box;
	if ( ! top && ! right && ! bottom && ! left ) return undefined;
	return [ top, right, bottom, left ].map( ( v ) => v || '0' ).join( ' ' );
}

export default function Edit( { attributes, setAttributes, clientId } ) {
	const { searchMode, taxonomy, showCounts, attributeId, threshold, placeholder, margin, inputBorderColour, inputBorderColourGradient, inputBorderColourHover, inputBorderColourHoverGradient, focusRingColour, textColour, textColourHover } = attributes;
	const isTermsMode = 'taxonomy-terms' === searchMode;

	// D636/CHECK A: inputBorderColour/inputBorderColourGradient/textColour paint
	// `.sgs-filter-search__input` directly on the frontend (style.css:9-20 —
	// border-color and color, both with var() fallbacks) — there is no wrapper
	// custom-property indirection to mirror, so the same resolved values are
	// applied straight to the preview <input>'s inline style below.
	const [ colourPalette ] = useSettings( 'color.palette' );
	const inputPreviewStyle = {
		...borderPaintPreview( inputBorderColour, inputBorderColourGradient, colourPalette ),
		...textPaintPreview( textColour, '', colourPalette ),
	};

	/*
	 * inputBorderColourHover(Gradient) canvas mirror (CHECK A, Task 1,
	 * colour-conformance). render.php now emits both via
	 * sgs_border_states_css() on `.sgs-filter-search__input` — the editor
	 * canvas never showed it because nothing outside the control read either
	 * Hover attr. A clientId-scoped `<style>` tag with a real `:hover,
	 * :focus-within` rule, same shape as sgs/mega-aside's own hover mirror.
	 * `!important` is required because the resting preview above sets the
	 * SAME border-color/border-image properties as an inline `style` prop on
	 * this same input (inputPreviewStyle) — an inline declaration always
	 * out-ranks an external stylesheet rule for the same property regardless
	 * of `:hover` matching.
	 */
	const filterSearchPreviewScope = `sgs-filter-search-preview-${ clientId }`;
	const inputBorderHoverDecl =
		inputBorderColourHoverGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( inputBorderColourHoverGradient )
			? `border-image:${ inputBorderColourHoverGradient } 1 !important;`
			: inputBorderColourHover
				? `border-color:${ resolveColourToken( inputBorderColourHover, colourPalette ) } !important;`
				: '';
	const filterSearchHoverPreviewCss = inputBorderHoverDecl
		? `.${ filterSearchPreviewScope } .sgs-filter-search__input:hover,.${ filterSearchPreviewScope } .sgs-filter-search__input:focus-within{${ inputBorderHoverDecl }}`
		: '';

	const blockProps = useBlockProps( {
		className: `sgs-filter-search sgs-filter-search--editor-preview ${ filterSearchPreviewScope }`,
		style: { margin: boxShorthand( margin?.desktop ) },
	} );

	return (
		<>
			<SgsColourPanel
				rows={ [
					{
						key: 'inputBorder',
						label: __( 'Input border colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: inputBorderColour,
								onChange: ( val ) => setAttributes( { inputBorderColour: val ?? '' } ),
								linked: true,
								gradientValue: inputBorderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { inputBorderColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: inputBorderColourHover,
								onChange: ( val ) => setAttributes( { inputBorderColourHover: val ?? '' } ),
								linked: true,
								gradientValue: inputBorderColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { inputBorderColourHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'focusRing',
						label: __( 'Focus ring colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: focusRingColour,
								onChange: ( val ) => setAttributes( { focusRingColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) => setAttributes( { textColour: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: textColourHover,
								onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				<FilterSearchSettings attributes={ attributes } setAttributes={ setAttributes } />

				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						presets
						values={ {
							base: margin?.desktop ?? {},
							tablet: margin?.tablet ?? {},
							mobile: margin?.mobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							const key = 'base' === tier ? 'desktop' : tier;
							setAttributes( { margin: { ...margin, [ key ]: next } } );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			{ filterSearchHoverPreviewCss && <style>{ filterSearchHoverPreviewCss }</style> }
			<div { ...blockProps }>
				{ /* Static editor preview — filtering is frontend-only. */ }
				<input
					type="search"
					className="sgs-filter-search__input"
					style={ inputPreviewStyle }
					placeholder={ placeholder || __( 'Type to filter…', 'sgs-blocks' ) }
					disabled
					aria-label={ __( 'Filter search preview (inactive in editor)', 'sgs-blocks' ) }
				/>
				<p className="sgs-filter-search__editor-hint">
					{ isTermsMode
						? ( '' === taxonomy
							? __( '⚠ Set a taxonomy in the block settings to activate this block.', 'sgs-blocks' )
							: (
								/* translators: %d is the minimum-terms threshold number */
								__( 'Lists every term of "%1$s" as a tickable link. The search box only appears once the taxonomy has %2$d+ terms.', 'sgs-blocks' )
									.replace( '%1$s', taxonomy )
									.replace( '%2$d', String( threshold ) )
							)
						)
						: ( 0 === attributeId
							? __( '⚠ Set an Attribute ID in the block settings to activate this block.', 'sgs-blocks' )
							: (
								/* translators: %d is the minimum-terms threshold number */
								__( 'Shows on the frontend only when this attribute has %d+ options.', 'sgs-blocks' )
									.replace( '%d', String( threshold ) )
							)
						)
					}
				</p>
			</div>
		</>
	);
}
