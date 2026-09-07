/**
 * SGS Filter Search — editor component.
 *
 * Renders a static preview of the search input and exposes inspector controls
 * for attributeId, threshold, and placeholder. Actual filtering is
 * frontend-only (render.php + view.js).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, useSettings } from '@wordpress/block-editor';
import { PanelBody, TextControl, Notice } from '@wordpress/components';
import { ResponsiveBoxControl, SgsColourPanel, resolveColourToken } from '../../components';
import { borderPaintPreview, textPaintPreview } from '../../utils';

// Guard the experimental NumberControl import — it may not exist on older WP
// versions. Falls back to a plain text input (type=number) via TextControl.
// This pattern mirrors the B3 crash lesson (dead-control crash on missing import).
const { __experimentalNumberControl: NumberControl } = wp?.components ?? {};

export default function Edit( { attributes, setAttributes, clientId } ) {
	const { attributeId, threshold, placeholder, style, marginTablet, marginMobile, inputBorderColour, inputBorderColourGradient, inputBorderColourHover, inputBorderColourHoverGradient, focusRingColour, textColour, textColourHover } = attributes;

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
				<PanelBody title={ __( 'Filter Search Settings', 'sgs-blocks' ) }>

					{ NumberControl ? (
						<NumberControl
							label={ __( 'Attribute ID', 'sgs-blocks' ) }
							help={ __(
								'The WooCommerce product attribute ID this filter belongs to. Find it at Products → Attributes.',
								'sgs-blocks'
							) }
							value={ attributeId }
							min={ 0 }
							onChange={ ( val ) =>
								setAttributes( { attributeId: parseInt( val, 10 ) || 0 } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) : (
						<TextControl
							label={ __( 'Attribute ID', 'sgs-blocks' ) }
							help={ __(
								'The WooCommerce product attribute ID this filter belongs to. Find it at Products → Attributes.',
								'sgs-blocks'
							) }
							type="number"
							min={ 0 }
							value={ String( attributeId ) }
							onChange={ ( val ) =>
								setAttributes( { attributeId: parseInt( val, 10 ) || 0 } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }

					{ NumberControl ? (
						<NumberControl
							label={ __( 'Minimum terms to show search', 'sgs-blocks' ) }
							help={ __(
								'The search input appears only when this attribute has at least this many options. Recommended: 16 (Baymard Institute threshold).',
								'sgs-blocks'
							) }
							value={ threshold }
							min={ 2 }
							onChange={ ( val ) =>
								setAttributes( { threshold: Math.max( 2, parseInt( val, 10 ) || 16 ) } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) : (
						<TextControl
							label={ __( 'Minimum terms to show search', 'sgs-blocks' ) }
							help={ __(
								'The search input appears only when this attribute has at least this many options. Recommended: 16.',
								'sgs-blocks'
							) }
							type="number"
							min={ 2 }
							value={ String( threshold ) }
							onChange={ ( val ) =>
								setAttributes( { threshold: Math.max( 2, parseInt( val, 10 ) || 16 ) } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }

					<TextControl
						label={ __( 'Placeholder text', 'sgs-blocks' ) }
						help={ __(
							'Leave blank to use the default: "Type to filter…"',
							'sgs-blocks'
						) }
						value={ placeholder }
						onChange={ ( val ) => setAttributes( { placeholder: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>

				</PanelBody>

				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						presets
						values={ {
							base: style?.spacing?.margin ?? {},
							tablet: marginTablet ?? {},
							mobile: marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, margin: next } } } );
							} else {
								setAttributes( { [ `margin${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
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
					{ 0 === attributeId
						? __( '⚠ Set an Attribute ID in the block settings to activate this block.', 'sgs-blocks' )
						: (
							/* translators: %d is the minimum-terms threshold number */
							__( 'Shows on the frontend only when this attribute has %d+ options.', 'sgs-blocks' )
								.replace( '%d', String( threshold ) )
						)
					}
				</p>
			</div>
		</>
	);
}
