import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	TextControl,
	ToggleControl,
	SelectControl,
} from '@wordpress/components';
import { ResponsiveBoxControl, SgsColourPanel, DesignTokenPicker, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl } from '../../components';
import { parseSvgGradient, SvgGradientDefs } from '../../utils';

// Box-object interface contract §1: a 4-side box is an object with named
// keys, each an already-unit-bearing CSS length string or absent (unset
// side). Build an editor-preview shorthand from the object — mirrors
// render.php's box-shorthand builder so the canvas preview matches the
// frontend (contract §5, mirrors sgs/heading).
function boxShorthand( box ) {
	if ( ! box ) {
		return '';
	}
	const { top, right, bottom, left } = box;
	if ( ! top && ! right && ! bottom && ! left ) {
		return '';
	}
	const t = top || '0';
	const r = right || '0';
	const b = bottom || '0';
	const l = left || '0';
	return `${ t } ${ r } ${ b } ${ l }`;
}

/** Build the wrapper's editor-preview style (mirrors render.php's scoped base declarations). */
function buildWrapperStyle( attributes ) {
	const { padding, margin, style } = attributes;
	const wrapperStyle = {};

	const paddingPreview = boxShorthand( padding?.desktop );
	if ( paddingPreview ) {
		wrapperStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( margin?.desktop );
	if ( marginPreview ) {
		wrapperStyle.margin = marginPreview;
	}
	if ( style?.color?.text ) {
		wrapperStyle.color = style.color.text;
	}
	if ( style?.color?.background ) {
		wrapperStyle.backgroundColor = style.color.background;
	}
	return wrapperStyle;
}

const DISPLAY_MODE_OPTIONS = [
	{ label: __( 'Stars only', 'sgs-blocks' ), value: 'stars-only' },
	{ label: __( 'Stars + value (e.g. 4.8)', 'sgs-blocks' ), value: 'stars-with-value' },
	{ label: __( 'Stars + value + count (e.g. 4.8 (127 reviews))', 'sgs-blocks' ), value: 'stars-with-value-and-count' },
];

// starColourGradient/emptyColourGradient (D636/D644, mirrored from
// render.php's `sgs_svg_stroke_gradient( ..., 'fill' )` call) paint a
// *fill*-based SVG shape, NOT a CSS background/text gradient — `fill` cannot
// hold a CSS gradient string, so the frontend builds a real SVG
// `<linearGradient>`/`<radialGradient>` def and points the star's fill
// attribute at `url(#id)`. This mirrors that exact technique (parseSvgGradient
// + SvgGradientDefs, `src/utils/svg-gradient-preview.js`) rather than the
// generic textPaintPreview/backgroundPaintPreview helpers, which paint via
// `background-image`/`color` — properties an SVG `fill` attribute has no use
// for. `injectStarDefs`/`injectEmptyDefs` mirror render.php's own
// $star_fill_defs_injected/$empty_fill_defs_injected flags — the def only
// needs to exist ONCE in the document; every other star referencing the same
// gradient id resolves to it regardless of which <svg> it lives in.
function StarSVG( {
	filled,
	half,
	size,
	colour,
	emptyColour,
	starGradient,
	emptyGradient,
	starGradId,
	emptyGradId,
	injectStarDefs,
	injectEmptyDefs,
} ) {
	const fill = filled
		? ( starGradient ? `url(#${ starGradId })` : colour )
		: ( half ? `url(#sgs-star-half)` : ( emptyGradient ? `url(#${ emptyGradId })` : emptyColour ) );
	return (
		<svg width={ size } height={ size } viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
			{ half && (
				<defs>
					<linearGradient id="sgs-star-half">
						<stop offset="50%" stopColor={ colour } />
						<stop offset="50%" stopColor={ emptyColour } />
					</linearGradient>
				</defs>
			) }
			{ ! half && filled && injectStarDefs && starGradient && (
				<defs><SvgGradientDefs id={ starGradId } gradient={ starGradient } /></defs>
			) }
			{ ! half && ! filled && injectEmptyDefs && emptyGradient && (
				<defs><SvgGradientDefs id={ emptyGradId } gradient={ emptyGradient } /></defs>
			) }
			<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={ fill } />
		</svg>
	);
}

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		rating,
		maxRating,
		starSize,
		starColour,
		starColourGradient,
		emptyColour,
		emptyColourGradient,
		label,
		showNumeric,
		schemaEnabled,
		schemaItemName,
		schemaReviewCount,
		displayMode,
		style,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
	} = attributes;

	// No-inline (contract §A/§5): the `spacing`/`color` supports declare
	// __experimentalSkipSerialization in block.json, so useBlockProps() no
	// longer auto-applies them — rebuild the base-tier preview manually here
	// (mirrors sgs/heading's buildWrapperStyle) so the canvas matches the
	// frontend's scoped <style> output at desktop width.
	const blockProps = useBlockProps( {
		className: `sgs-star-rating sgs-star-rating--${ displayMode }`,
		style: buildWrapperStyle( attributes ),
	} );

	// Style-variation gating — MIRRORS render.php:46-48 exactly (same split, same
	// in_array semantics, same official-wins-over-flat precedence). On
	// `is-style-trustpilot-official` render.php emits Trustpilot's own <img> badge
	// and NO inline <svg> stars at all (render.php:195-200), so both colour rows
	// paint nothing. Showing a control that cannot affect the output is the
	// dead-control defect (D751) — the client picks a colour and nothing happens.
	const sgsStyleClasses = String( attributes.className || '' )
		.split( /\s+/ )
		.filter( Boolean );
	const isTpOfficial = sgsStyleClasses.includes( 'is-style-trustpilot-official' );

	// Parsed once per render — mirrors render.php computing $star_fill_grad/
	// $empty_fill_grad once, before the loop, rather than re-parsing per star.
	const starGradient = parseSvgGradient( starColourGradient );
	const emptyGradient = parseSvgGradient( emptyColourGradient );
	const starGradId = `${ clientId }-star-grad`;
	const emptyGradId = `${ clientId }-empty-grad`;

	const stars = [];
	let starDefsInjected = false;
	let emptyDefsInjected = false;
	for ( let i = 1; i <= maxRating; i++ ) {
		const filled = i <= Math.floor( rating );
		const half = ! filled && i === Math.ceil( rating ) && rating % 1 >= 0.25;
		// Mirrors render.php's $star_fill_defs_injected/$empty_fill_defs_injected
		// flags — the gradient def only needs to exist ONCE in the document.
		const injectStarDefs = filled && ! half && ! starDefsInjected;
		const injectEmptyDefs = ! filled && ! half && ! emptyDefsInjected;
		if ( injectStarDefs ) {
			starDefsInjected = true;
		}
		if ( injectEmptyDefs ) {
			emptyDefsInjected = true;
		}
		stars.push(
			<StarSVG
				key={ i }
				filled={ filled }
				half={ half }
				size={ starSize }
				colour={ starColour }
				emptyColour={ emptyColour }
				starGradient={ starGradient }
				emptyGradient={ emptyGradient }
				starGradId={ starGradId }
				emptyGradId={ emptyGradId }
				injectStarDefs={ injectStarDefs }
				injectEmptyDefs={ injectEmptyDefs }
			/>
		);
	}

	const showValue = displayMode === 'stars-with-value' || displayMode === 'stars-with-value-and-count';
	const showCount = displayMode === 'stars-with-value-and-count';

	return (
		<>
			{ /* Colour panel FIRST — sgs/button pattern (D618/D619). Both rows
			   are single-state: starColour/emptyColour paint the SVG star
			   <path fill="..."> in render.php (not a CSS colour/background-
			   color property), but they're still plain token-or-hex colour
			   values resolved via sgs_colour_value(), so they belong here
			   like any other single colour. */ }
			{ ! isTpOfficial && (
			<SgsColourPanel
				rows={ [
					{
						key: 'emptyColour',
						label: __( 'Empty colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: emptyColour,
								onChange: ( val ) => setAttributes( { emptyColour: val ?? '' } ),
								gradientValue: emptyColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { emptyColourGradient: val ?? '' } ),
								linked: true,
							},
						],
					},
				] }
			/>
			) }
			<InspectorControls>
				<PanelBody title={ __( 'Rating', 'sgs-blocks' ) }>
					<RangeControl
						label={ __( 'Rating', 'sgs-blocks' ) }
						value={ rating }
						onChange={ ( val ) => setAttributes( { rating: val } ) }
						min={ 0 }
						max={ maxRating }
						step={ 0.5 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Max stars', 'sgs-blocks' ) }
						value={ maxRating }
						onChange={ ( val ) => setAttributes( { maxRating: val } ) }
						min={ 1 }
						max={ 10 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Star size (px)', 'sgs-blocks' ) }
						value={ starSize }
						onChange={ ( val ) => setAttributes( { starSize: val } ) }
						min={ 12 }
						max={ 64 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ ! isTpOfficial && (
						<DesignTokenPicker
							label={ __( 'Star colour', 'sgs-blocks' ) }
							states={ [
								{
									key: 'normal',
									label: __( 'Normal', 'sgs-blocks' ),
									value: starColour,
									onChange: ( val ) => setAttributes( { starColour: val ?? '' } ),
									gradientValue: starColourGradient,
									onGradientChange: ( val ) =>
										setAttributes( { starColourGradient: val ?? '' } ),
									linked: true,
								},
							] }
						/>
					) }
				</PanelBody>

				{ /* padding/margin are each a single block-owned tier-object attr
				   { desktop, tablet, mobile }, written via ResponsiveOverride +
				   SgsBoxControl; read directly by this block's render.php. */ }
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
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

				<PanelBody title={ __( 'Display', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Display mode', 'sgs-blocks' ) }
						value={ displayMode }
						options={ DISPLAY_MODE_OPTIONS }
						onChange={ ( val ) => setAttributes( { displayMode: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Label', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( val ) => setAttributes( { label: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Show numeric value (legacy)', 'sgs-blocks' ) }
						help={ __( 'Use Display mode above instead.', 'sgs-blocks' ) }
						checked={ showNumeric }
						onChange={ ( val ) => setAttributes( { showNumeric: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody title={ __( 'Schema Markup', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Enable schema.org markup', 'sgs-blocks' ) }
						checked={ schemaEnabled }
						onChange={ ( val ) => setAttributes( { schemaEnabled: val } ) }
						__nextHasNoMarginBottom
					/>
					{ schemaEnabled && (
						<>
							<TextControl
								label={ __( 'Item name', 'sgs-blocks' ) }
								value={ schemaItemName }
								onChange={ ( val ) => setAttributes( { schemaItemName: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<RangeControl
								label={ __( 'Review count', 'sgs-blocks' ) }
								value={ schemaReviewCount }
								onChange={ ( val ) => setAttributes( { schemaReviewCount: val } ) }
								min={ 1 }
								max={ 10000 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</>
					) }
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="sgs-star-rating__stars" role="img" aria-label={ `${ rating } out of ${ maxRating } stars` }>
					{ stars }
				</div>
				{ showValue && (
					<span className="sgs-star-rating__value" aria-hidden="true">
						{ rating.toFixed( 1 ) }
					</span>
				) }
				{ showCount && schemaReviewCount > 0 && (
					<span className="sgs-star-rating__count" aria-hidden="true">
						{ `(${ schemaReviewCount.toLocaleString( 'en-GB' ) } ${ schemaReviewCount === 1 ? __( 'review', 'sgs-blocks' ) : __( 'reviews', 'sgs-blocks' ) })` }
					</span>
				) }
				{ showNumeric && (
					<span className="sgs-star-rating__numeric">{ rating }/{ maxRating }</span>
				) }
				{ label && (
					<span className="sgs-star-rating__label">{ label }</span>
				) }
			</div>
		</>
	);
}
