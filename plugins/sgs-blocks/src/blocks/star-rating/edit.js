import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	TextControl,
	ToggleControl,
	SelectControl,
} from '@wordpress/components';
import { ResponsiveBoxControl } from '../../components';

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
	const { style } = attributes;
	const wrapperStyle = {};

	const paddingPreview = boxShorthand( style?.spacing?.padding );
	if ( paddingPreview ) {
		wrapperStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( style?.spacing?.margin );
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

function StarSVG( { filled, half, size, colour, emptyColour } ) {
	const fill = filled ? colour : ( half ? `url(#sgs-star-half)` : emptyColour );
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
			<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={ fill } />
		</svg>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		rating,
		maxRating,
		starSize,
		starColour,
		emptyColour,
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

	const stars = [];
	for ( let i = 1; i <= maxRating; i++ ) {
		const filled = i <= Math.floor( rating );
		const half = ! filled && i === Math.ceil( rating ) && rating % 1 >= 0.25;
		stars.push(
			<StarSVG
				key={ i }
				filled={ filled }
				half={ half }
				size={ starSize }
				colour={ starColour }
				emptyColour={ emptyColour }
			/>
		);
	}

	const showValue = displayMode === 'stars-with-value' || displayMode === 'stars-with-value-and-count';
	const showCount = displayMode === 'stars-with-value-and-count';

	return (
		<>
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
					/>
					<RangeControl
						label={ __( 'Max stars', 'sgs-blocks' ) }
						value={ maxRating }
						onChange={ ( val ) => setAttributes( { maxRating: val } ) }
						min={ 1 }
						max={ 10 }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Star size (px)', 'sgs-blocks' ) }
						value={ starSize }
						onChange={ ( val ) => setAttributes( { starSize: val } ) }
						min={ 12 }
						max={ 64 }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Star colour', 'sgs-blocks' ) }
						value={ starColour }
						onChange={ ( val ) => setAttributes( { starColour: val } ) }
						type="color"
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Empty colour', 'sgs-blocks' ) }
						value={ emptyColour }
						onChange={ ( val ) => setAttributes( { emptyColour: val } ) }
						type="color"
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* Box-object interface contract §B/§E: padding/margin base routes to
				   WP-native style.spacing.* (mirrors sgs/heading); tiers are the
				   paddingTablet/paddingMobile + marginTablet/marginMobile object attrs.
				   The spacing support declares __experimentalSkipSerialization so base
				   serialises scoped, not inline. */ }
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						values={ {
							base: style?.spacing?.padding ?? {},
							tablet: paddingTablet ?? {},
							mobile: paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, padding: next } } } );
							} else {
								setAttributes( { [ `padding${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
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

				<PanelBody title={ __( 'Display', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Display mode', 'sgs-blocks' ) }
						value={ displayMode }
						options={ DISPLAY_MODE_OPTIONS }
						onChange={ ( val ) => setAttributes( { displayMode: val } ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Label', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( val ) => setAttributes( { label: val } ) }
						__nextHasNoMarginBottom
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
							/>
							<RangeControl
								label={ __( 'Review count', 'sgs-blocks' ) }
								value={ schemaReviewCount }
								onChange={ ( val ) => setAttributes( { schemaReviewCount: val } ) }
								min={ 1 }
								max={ 10000 }
								__nextHasNoMarginBottom
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
