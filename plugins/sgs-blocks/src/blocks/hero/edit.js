import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	Button,
	TextControl,
	TextareaControl,
	ToggleControl,
	Notice,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { DesignTokenPicker, ResponsiveControl } from '../../components';
import MediaPicker from '../../components/MediaPicker';

// ── Phase 1 constant options ─────────────────────────────────────────────────

const FONT_WEIGHT_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( '300 Light', 'sgs-blocks' ), value: '300' },
	{ label: __( '400 Regular', 'sgs-blocks' ), value: '400' },
	{ label: __( '500 Medium', 'sgs-blocks' ), value: '500' },
	{ label: __( '600 Semi-bold', 'sgs-blocks' ), value: '600' },
	{ label: __( '700 Bold', 'sgs-blocks' ), value: '700' },
	{ label: __( '800 Extra-bold', 'sgs-blocks' ), value: '800' },
	{ label: __( '900 Black', 'sgs-blocks' ), value: '900' },
];

const TEXT_TRANSFORM_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Uppercase', 'sgs-blocks' ), value: 'uppercase' },
	{ label: __( 'Lowercase', 'sgs-blocks' ), value: 'lowercase' },
	{ label: __( 'Capitalise', 'sgs-blocks' ), value: 'capitalize' },
];

const TEXT_DECORATION_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Underline', 'sgs-blocks' ), value: 'underline' },
	{ label: __( 'Line-through', 'sgs-blocks' ), value: 'line-through' },
];

const BORDER_STYLE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Solid', 'sgs-blocks' ), value: 'solid' },
	{ label: __( 'Dashed', 'sgs-blocks' ), value: 'dashed' },
	{ label: __( 'Dotted', 'sgs-blocks' ), value: 'dotted' },
];

const IMAGE_FIT_OPTIONS = [
	{ label: __( 'Cover', 'sgs-blocks' ), value: 'cover' },
	{ label: __( 'Contain', 'sgs-blocks' ), value: 'contain' },
	{ label: __( 'Fill', 'sgs-blocks' ), value: 'fill' },
	{ label: __( 'Match height', 'sgs-blocks' ), value: 'match-height' },
	{ label: __( 'Match width', 'sgs-blocks' ), value: 'match-width' },
	{ label: __( 'Custom (explicit width/height)', 'sgs-blocks' ), value: 'custom' },
];

const UNIT_PX_PCT = [
	{ label: 'px', value: 'px' },
	{ label: '%', value: '%' },
];

const UNIT_PX_EM_REM = [
	{ label: 'px', value: 'px' },
	{ label: 'em', value: 'em' },
	{ label: 'rem', value: 'rem' },
];

const UNIT_EM_PX = [
	{ label: 'em', value: 'em' },
	{ label: 'px', value: 'px' },
];

const VERTICAL_ALIGN_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'top' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Bottom', 'sgs-blocks' ), value: 'bottom' },
];

const COLUMN_RATIO_PRESETS = [
	{ label: __( '1:1 Equal', 'sgs-blocks' ), value: '1fr 1fr' },
	{ label: __( '2:1', 'sgs-blocks' ), value: '2fr 1fr' },
	{ label: __( '1:2', 'sgs-blocks' ), value: '1fr 2fr' },
	{ label: __( '3:2', 'sgs-blocks' ), value: '3fr 2fr' },
	{ label: __( '2:3', 'sgs-blocks' ), value: '2fr 3fr' },
	{ label: __( '60:40', 'sgs-blocks' ), value: '60% 40%' },
	{ label: __( '70:30', 'sgs-blocks' ), value: '70% 30%' },
	{ label: __( '40:60', 'sgs-blocks' ), value: '40% 60%' },
	{ label: __( '30:70', 'sgs-blocks' ), value: '30% 70%' },
	{ label: __( 'Custom...', 'sgs-blocks' ), value: 'custom' },
];

const MOBILE_ORDER_OPTIONS = [
	{ label: __( 'Media first (image on top)', 'sgs-blocks' ), value: 'media-first' },
	{ label: __( 'Content first (text on top)', 'sgs-blocks' ), value: 'content-first' },
];

/**
 * Responsive RangeControl helper.
 * Renders a RangeControl wrapped in ResponsiveControl, mapping
 * attrDesktop/Tablet/Mobile attribute names automatically.
 */
function RRangeControl( { label, attrDesktop, attrTablet, attrMobile, attributes, setAttributes, min = 0, max = 200, step = 1, nullOnZero = true } ) {
	return (
		<ResponsiveControl label={ label }>
			{ ( bp ) => {
				const key = { desktop: attrDesktop, tablet: attrTablet, mobile: attrMobile }[ bp ];
				const val = attributes[ key ] || 0;
				return (
					<RangeControl
						value={ val }
						onChange={ ( v ) => setAttributes( { [ key ]: nullOnZero ? ( v || null ) : v } ) }
						min={ min }
						max={ max }
						step={ step }
						__nextHasNoMarginBottom
					/>
				);
			} }
		</ResponsiveControl>
	);
}

/**
 * FR-22-6: full content column template.
 * Produces: eyebrow label → headline (h1) → sub-headline paragraph → CTA buttons.
 * Converter supplies sgs/label + sgs/heading + sgs/text + sgs/multi-button.
 */
const HERO_CONTENT_TEMPLATE = [
	[ 'sgs/label', { className: 'sgs-hero__label', content: __( 'Eyebrow label', 'sgs-blocks' ) } ],
	[ 'sgs/heading', { level: 1, className: 'sgs-hero__headline', content: __( 'Your hero headline', 'sgs-blocks' ) } ],
	[ 'sgs/text', { className: 'sgs-hero__subheadline', text: __( 'Supporting sub-headline text goes here.', 'sgs-blocks' ) } ],
	[ 'sgs/multi-button', {}, [
		[ 'sgs/button', { inheritStyle: 'primary', label: __( 'Primary Action', 'sgs-blocks' ) } ],
		[ 'sgs/button', { inheritStyle: 'secondary', label: __( 'Secondary Action', 'sgs-blocks' ) } ],
	] ],
];

const VARIANT_OPTIONS = [
	{ label: __( 'Standard', 'sgs-blocks' ), value: 'standard' },
	{ label: __( 'Split', 'sgs-blocks' ), value: 'split' },
	{ label: __( 'Video', 'sgs-blocks' ), value: 'video' },
	{ label: __( 'SVG Animated', 'sgs-blocks' ), value: 'svg-animated' },
];

const ALIGN_OPTIONS = [
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'centre' },
];

const CTA_STYLE_OPTIONS = [
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
	{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
	{ label: __( 'Outline', 'sgs-blocks' ), value: 'outline' },
];

const BADGE_STYLE_OPTIONS = [
	{ label: __( 'Light', 'sgs-blocks' ), value: 'light' },
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
	{ label: __( 'Success', 'sgs-blocks' ), value: 'success' },
];

const BADGE_POSITION_OPTIONS = [
	{ label: __( 'Bottom left', 'sgs-blocks' ), value: 'bottom-left' },
	{ label: __( 'Bottom right', 'sgs-blocks' ), value: 'bottom-right' },
	{ label: __( 'Top left', 'sgs-blocks' ), value: 'top-left' },
	{ label: __( 'Top right', 'sgs-blocks' ), value: 'top-right' },
];

function BadgeEditor( { badge, index, onChange, onRemove } ) {
	const update = ( key, value ) => {
		onChange( { ...badge, [ key ]: value } );
	};

	return (
		<div className="sgs-hero-badge-editor">
			<TextControl
				label={ __( 'Number / value', 'sgs-blocks' ) }
				value={ badge.number || '' }
				onChange={ ( val ) => update( 'number', val ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Suffix', 'sgs-blocks' ) }
				value={ badge.suffix || '' }
				onChange={ ( val ) => update( 'suffix', val ) }
				placeholder="+"
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Label', 'sgs-blocks' ) }
				value={ badge.label || '' }
				onChange={ ( val ) => update( 'label', val ) }
				__nextHasNoMarginBottom
			/>
			<SelectControl
				label={ __( 'Position', 'sgs-blocks' ) }
				value={ badge.position || 'bottom-left' }
				options={ BADGE_POSITION_OPTIONS }
				onChange={ ( val ) => update( 'position', val ) }
				__nextHasNoMarginBottom
			/>
			<SelectControl
				label={ __( 'Style', 'sgs-blocks' ) }
				value={ badge.style || 'light' }
				options={ BADGE_STYLE_OPTIONS }
				onChange={ ( val ) => update( 'style', val ) }
				__nextHasNoMarginBottom
			/>
			<Button
				variant="secondary"
				isDestructive
				onClick={ onRemove }
				size="small"
			>
				{ __( 'Remove badge', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ), value: 'x-large' },
	{ label: __( 'XXL', 'sgs-blocks' ), value: 'xx-large' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		variant,
		splitImageBleed,
		alignment,
		backgroundImage,
		overlayColour,
		overlayOpacity,
		splitImage,
		splitMedia,
		backgroundVideo,
		svgContent,
		minHeight,
		badges,
		headlineColour,
		headlineFontSizeDesktop,
		headlineFontSizeTablet,
		headlineFontSizeMobile,
		headlineMarginBottom,
		headlineMarginBottomMobile,
		subHeadlineFontSize,
		subHeadlineColour,
		subHeadlineMaxWidth,
		subHeadlineMarginBottom,
		subHeadlineMarginBottomMobile,
		splitImageMobileHeight,
		bgParallax,
		bgKenBurns,
		bgVideo,
		bgVideoMobile,
		// Phase 1 — image display.
		imageObjectFit,
		imageObjectPosition,
		imageWidth,
		imageWidthTablet,
		imageWidthMobile,
		imageWidthUnit,
		imageHeight,
		imageHeightTablet,
		imageHeightMobile,
		imageHeightUnit,
		imageBorderRadiusTL,
		imageBorderRadiusTR,
		imageBorderRadiusBR,
		imageBorderRadiusBL,
		imageBorderRadiusUnit,
		imageBorderStyle,
		imageBorderWidthTop,
		imageBorderWidthRight,
		imageBorderWidthBottom,
		imageBorderWidthLeft,
		imageBorderWidthUnit,
		imageBorderColour,
		imagePaddingUnit,
		mediaBackgroundColour,
		contentPaddingUnit,
		mediaPaddingUnit,
		// Phase 1 — sub-headline typography.
		subHeadlineFontFamily,
		subHeadlineFontWeight,
		subHeadlineLineHeight,
		subHeadlineLineHeightUnit,
		subHeadlineLetterSpacing,
		subHeadlineLetterSpacingUnit,
		subHeadlineTextTransform,
		subHeadlineTextDecoration,
		// Phase 1 — label typography.
		labelFontFamily,
		labelFontSize,
		labelFontSizeTablet,
		labelFontSizeMobile,
		labelFontSizeUnit,
		labelFontWeight,
		labelLineHeight,
		labelLineHeightUnit,
		labelLetterSpacing,
		labelLetterSpacingUnit,
		labelTextTransform,
		labelTextDecoration,
		labelColour,
		labelMarginBottom,
		labelMarginBottomUnit,
		// Phase 1 — layout grid.
		splitColumnRatio,
		splitColumnRatioTablet,
		splitColumnRatioMobile,
		splitGap,
		splitGapTablet,
		splitGapMobile,
		splitGapUnit,
		splitContentOrderMobile,
		// Phase 1 — vertical alignment + content max-width.
		verticalAlignment,
		contentMaxWidth,
		contentMaxWidthTablet,
		contentMaxWidthMobile,
		contentMaxWidthUnit,
		// H-8 — CTA gap.
		ctaGapUnit,
	} = attributes;

	const isCustomRatio = ! COLUMN_RATIO_PRESETS.some(
		( p ) => p.value !== 'custom' && p.value === splitColumnRatio
	);

	const isSplit = variant === 'split';
	const isVideo = variant === 'video';
	const isSvgAnimated = variant === 'svg-animated';

	const wrapperStyle = {};
	if ( ! isSplit && ! isVideo && ! isSvgAnimated && backgroundImage?.url ) {
		wrapperStyle.backgroundImage = `url(${ backgroundImage.url })`;
		wrapperStyle.backgroundSize = 'cover';
		wrapperStyle.backgroundPosition = 'center';
	}
	if ( minHeight ) {
		wrapperStyle.minHeight = minHeight;
	}

	const className = [
		'sgs-hero',
		`sgs-hero--${ variant }`,
		`sgs-hero--align-${ alignment }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className, style: wrapperStyle } );

	// FR-22-6: content column uses InnerBlocks (label + heading + text + buttons).
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-hero__content' },
		{
			template: HERO_CONTENT_TEMPLATE,
			templateLock: false,
		}
	);

	const updateBadge = ( index, updatedBadge ) => {
		const updated = [ ...badges ];
		updated[ index ] = updatedBadge;
		setAttributes( { badges: updated } );
	};

	const removeBadge = ( index ) => {
		setAttributes( { badges: badges.filter( ( _, i ) => i !== index ) } );
	};

	const addBadge = () => {
		setAttributes( {
			badges: [
				...badges,
				{
					number: '',
					suffix: '',
					label: '',
					position: 'bottom-left',
					style: 'light',
				},
			],
		} );
	};

	return (
		<>
			<InspectorControls>
				{/* ── 1. Hero Settings (variant only) ── */}
				<PanelBody title={ __( 'Hero Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Variant', 'sgs-blocks' ) }
						value={ variant }
						options={ VARIANT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { variant: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{/* ── 2. Container / Entire Block ── */}
				<PanelBody title={ __( 'Container / Entire Block', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleGroupControl
						label={ __( 'Text alignment', 'sgs-blocks' ) }
						value={ alignment }
						onChange={ ( val ) =>
							setAttributes( { alignment: val } )
						}
						isBlock
						__nextHasNoMarginBottom
					>
						{ ALIGN_OPTIONS.map( ( opt ) => (
							<ToggleGroupControlOption
								key={ opt.value }
								value={ opt.value }
								label={ opt.label }
							/>
						) ) }
					</ToggleGroupControl>

					<SelectControl
						label={ __( 'Vertical alignment', 'sgs-blocks' ) }
						value={ verticalAlignment }
						options={ VERTICAL_ALIGN_OPTIONS }
						onChange={ ( val ) => setAttributes( { verticalAlignment: val } ) }
						__nextHasNoMarginBottom
					/>

					<ResponsiveControl
						label={ __( 'Min height', 'sgs-blocks' ) }
					>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'minHeight',
								tablet: 'minHeightTablet',
								mobile: 'minHeightMobile',
							};
							return (
								<SelectControl
									value={
										attributes[
											attrMap[ breakpoint ]
										]
									}
									options={ [
										{ label: __( 'Auto (fit content)', 'sgs-blocks' ), value: '' },
										{ label: '50vh',  value: '50vh'  },
										{ label: '75vh',  value: '75vh'  },
										{ label: '80vh',  value: '80vh'  },
										{ label: '100vh', value: '100vh' },
										{ label: '360px', value: '360px' },
										{ label: '400px', value: '400px' },
										{ label: '520px', value: '520px' },
										{ label: '600px', value: '600px' },
									] }
									onChange={ ( val ) =>
										setAttributes( {
											[ attrMap[ breakpoint ] ]:
												val,
										} )
									}
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>

					<RRangeControl label={ __( 'Content max-width', 'sgs-blocks' ) } attrDesktop="contentMaxWidth" attrTablet="contentMaxWidthTablet" attrMobile="contentMaxWidthMobile" attributes={ attributes } setAttributes={ setAttributes } min={ 0 } max={ 1400 } step={ 10 } />
					<SelectControl label={ __( 'Max-width unit', 'sgs-blocks' ) } value={ contentMaxWidthUnit } options={ UNIT_PX_PCT } onChange={ ( val ) => setAttributes( { contentMaxWidthUnit: val } ) } __nextHasNoMarginBottom />

					<DesignTokenPicker label={ __( 'Media background colour', 'sgs-blocks' ) } value={ mediaBackgroundColour } onChange={ ( val ) => setAttributes( { mediaBackgroundColour: val } ) } />

					<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Content padding', 'sgs-blocks' ) }</p>
					<RRangeControl label={ __( 'Top', 'sgs-blocks' ) } attrDesktop="contentPaddingTop" attrTablet="contentPaddingTopTablet" attrMobile="contentPaddingTopMobile" attributes={ attributes } setAttributes={ setAttributes } />
					<RRangeControl label={ __( 'Right', 'sgs-blocks' ) } attrDesktop="contentPaddingRight" attrTablet="contentPaddingRightTablet" attrMobile="contentPaddingRightMobile" attributes={ attributes } setAttributes={ setAttributes } />
					<RRangeControl label={ __( 'Bottom', 'sgs-blocks' ) } attrDesktop="contentPaddingBottom" attrTablet="contentPaddingBottomTablet" attrMobile="contentPaddingBottomMobile" attributes={ attributes } setAttributes={ setAttributes } />
					<RRangeControl label={ __( 'Left', 'sgs-blocks' ) } attrDesktop="contentPaddingLeft" attrTablet="contentPaddingLeftTablet" attrMobile="contentPaddingLeftMobile" attributes={ attributes } setAttributes={ setAttributes } />
					<SelectControl label={ __( 'Padding unit', 'sgs-blocks' ) } value={ contentPaddingUnit } options={ UNIT_PX_PCT } onChange={ ( val ) => setAttributes( { contentPaddingUnit: val } ) } __nextHasNoMarginBottom />

					{ isSplit && (
						<>
							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Split layout grid', 'sgs-blocks' ) }</p>
							<SelectControl
								label={ __( 'Column ratio (desktop)', 'sgs-blocks' ) }
								value={ isCustomRatio ? 'custom' : splitColumnRatio }
								options={ COLUMN_RATIO_PRESETS }
								onChange={ ( val ) => { if ( val !== 'custom' ) { setAttributes( { splitColumnRatio: val } ); } } }
								__nextHasNoMarginBottom
							/>
							{ isCustomRatio && (
								<TextControl label={ __( 'Custom ratio', 'sgs-blocks' ) } help={ __( 'CSS grid-template-columns (e.g. "3fr 2fr").', 'sgs-blocks' ) } value={ splitColumnRatio } onChange={ ( val ) => setAttributes( { splitColumnRatio: val } ) } __nextHasNoMarginBottom />
							) }
							<TextControl label={ __( 'Column ratio tablet', 'sgs-blocks' ) } help={ __( 'Blank = inherit desktop.', 'sgs-blocks' ) } value={ splitColumnRatioTablet || '' } onChange={ ( val ) => setAttributes( { splitColumnRatioTablet: val } ) } __nextHasNoMarginBottom />
							<TextControl label={ __( 'Column ratio mobile', 'sgs-blocks' ) } help={ __( 'Blank = stack columns.', 'sgs-blocks' ) } value={ splitColumnRatioMobile || '' } onChange={ ( val ) => setAttributes( { splitColumnRatioMobile: val } ) } __nextHasNoMarginBottom />
							<RRangeControl label={ __( 'Column gap', 'sgs-blocks' ) } attrDesktop="splitGap" attrTablet="splitGapTablet" attrMobile="splitGapMobile" attributes={ attributes } setAttributes={ setAttributes } min={ 0 } max={ 200 } step={ 1 } />
							<SelectControl label={ __( 'Gap unit', 'sgs-blocks' ) } value={ splitGapUnit } options={ UNIT_PX_PCT } onChange={ ( val ) => setAttributes( { splitGapUnit: val } ) } __nextHasNoMarginBottom />
							<SelectControl label={ __( 'Mobile column order', 'sgs-blocks' ) } value={ splitContentOrderMobile } options={ MOBILE_ORDER_OPTIONS } onChange={ ( val ) => setAttributes( { splitContentOrderMobile: val } ) } __nextHasNoMarginBottom />
							<ToggleControl
								label={ __( 'Image bleed to edge', 'sgs-blocks' ) }
								help={ __( 'Removes border-radius and column padding so the photo fills flush to the container edge.', 'sgs-blocks' ) }
								checked={ !! splitImageBleed }
								onChange={ ( val ) =>
									setAttributes( { splitImageBleed: val } )
								}
								__nextHasNoMarginBottom
							/>
						</>
					) }
				</PanelBody>

				{/* ── 3. Eyebrow Label typography overrides ── */}
				<PanelBody title={ __( 'Eyebrow Label', 'sgs-blocks' ) } initialOpen={ false }>
						<DesignTokenPicker label={ __( 'Colour', 'sgs-blocks' ) } value={ labelColour } onChange={ ( val ) => setAttributes( { labelColour: val } ) } />
						<RRangeControl label={ __( 'Font size', 'sgs-blocks' ) } attrDesktop="labelFontSize" attrTablet="labelFontSizeTablet" attrMobile="labelFontSizeMobile" attributes={ attributes } setAttributes={ setAttributes } min={ 0 } max={ 72 } step={ 1 } />
						<SelectControl label={ __( 'Font size unit', 'sgs-blocks' ) } value={ labelFontSizeUnit || 'px' } options={ UNIT_PX_EM_REM } onChange={ ( val ) => setAttributes( { labelFontSizeUnit: val } ) } __nextHasNoMarginBottom />
						<TextControl label={ __( 'Font family slug', 'sgs-blocks' ) } help={ __( 'theme.json slug e.g. "montserrat". Blank = inherit.', 'sgs-blocks' ) } value={ labelFontFamily || '' } onChange={ ( val ) => setAttributes( { labelFontFamily: val } ) } __nextHasNoMarginBottom />
						<SelectControl label={ __( 'Font weight', 'sgs-blocks' ) } value={ labelFontWeight || '600' } options={ FONT_WEIGHT_OPTIONS } onChange={ ( val ) => setAttributes( { labelFontWeight: val } ) } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Line height', 'sgs-blocks' ) } value={ labelLineHeight || 0 } onChange={ ( val ) => setAttributes( { labelLineHeight: val || null } ) } min={ 0 } max={ 4 } step={ 0.05 } __nextHasNoMarginBottom />
						<SelectControl label={ __( 'Line height unit', 'sgs-blocks' ) } value={ labelLineHeightUnit || 'em' } options={ UNIT_EM_PX } onChange={ ( val ) => setAttributes( { labelLineHeightUnit: val } ) } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Letter spacing', 'sgs-blocks' ) } value={ labelLetterSpacing || 0 } onChange={ ( val ) => setAttributes( { labelLetterSpacing: val || null } ) } min={ -5 } max={ 20 } step={ 0.01 } __nextHasNoMarginBottom />
						<SelectControl label={ __( 'Letter spacing unit', 'sgs-blocks' ) } value={ labelLetterSpacingUnit || 'em' } options={ UNIT_EM_PX } onChange={ ( val ) => setAttributes( { labelLetterSpacingUnit: val } ) } __nextHasNoMarginBottom />
						<SelectControl label={ __( 'Text transform', 'sgs-blocks' ) } value={ labelTextTransform || 'uppercase' } options={ TEXT_TRANSFORM_OPTIONS } onChange={ ( val ) => setAttributes( { labelTextTransform: val } ) } __nextHasNoMarginBottom />
						<SelectControl label={ __( 'Text decoration', 'sgs-blocks' ) } value={ labelTextDecoration || '' } options={ TEXT_DECORATION_OPTIONS } onChange={ ( val ) => setAttributes( { labelTextDecoration: val } ) } __nextHasNoMarginBottom />
						<RangeControl label={ __( 'Margin bottom', 'sgs-blocks' ) } value={ labelMarginBottom || 0 } onChange={ ( val ) => setAttributes( { labelMarginBottom: val } ) } min={ 0 } max={ 80 } step={ 1 } __nextHasNoMarginBottom />
						<SelectControl label={ __( 'Margin bottom unit', 'sgs-blocks' ) } value={ labelMarginBottomUnit || 'px' } options={ UNIT_PX_EM_REM } onChange={ ( val ) => setAttributes( { labelMarginBottomUnit: val } ) } __nextHasNoMarginBottom />
					</PanelBody>

				{/* ── 4. Headline (h1) ── */}
				<PanelBody title={ __( 'Headline (h1)', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Headline colour', 'sgs-blocks' ) }
						value={ headlineColour }
						onChange={ ( val ) =>
							setAttributes( { headlineColour: val } )
						}
					/>
					<ResponsiveControl
						label={ __( 'Headline font size (px)', 'sgs-blocks' ) }
					>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'headlineFontSizeDesktop',
								tablet: 'headlineFontSizeTablet',
								mobile: 'headlineFontSizeMobile',
							};
							return (
								<RangeControl
									value={ attributes[ attrMap[ breakpoint ] ] || 0 }
									onChange={ ( val ) =>
										setAttributes( {
											[ attrMap[ breakpoint ] ]: val || null,
										} )
									}
									min={ 0 }
									max={ 120 }
									step={ 1 }
									help={ __( '0 = inherit from theme', 'sgs-blocks' ) }
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>
					<RangeControl
						label={ __( 'Margin bottom — desktop (px)', 'sgs-blocks' ) }
						help={ __( '0 = inherit from theme.', 'sgs-blocks' ) }
						value={ headlineMarginBottom || 0 }
						onChange={ ( val ) =>
							setAttributes( { headlineMarginBottom: val || null } )
						}
						min={ 0 }
						max={ 120 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Margin bottom — mobile (px)', 'sgs-blocks' ) }
						help={ __( '0 = inherit from theme.', 'sgs-blocks' ) }
						value={ headlineMarginBottomMobile || 0 }
						onChange={ ( val ) =>
							setAttributes( { headlineMarginBottomMobile: val || null } )
						}
						min={ 0 }
						max={ 120 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{/* ── 5. Subheadline ── */}
				<PanelBody title={ __( 'Subheadline', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Colour', 'sgs-blocks' ) }
						value={ subHeadlineColour }
						onChange={ ( val ) =>
							setAttributes( { subHeadlineColour: val } )
						}
					/>
					<ResponsiveControl
						label={ __( 'Font size', 'sgs-blocks' ) }
					>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'subHeadlineFontSize',
								tablet: 'subHeadlineFontSizeTablet',
								mobile: 'subHeadlineFontSizeMobile',
							};
							return (
								<SelectControl
									value={
										attributes[
											attrMap[ breakpoint ]
										] || ''
									}
									options={
										breakpoint === 'desktop'
											? FONT_SIZE_OPTIONS
											: [
													{
														label: __(
															'Same as desktop',
															'sgs-blocks'
														),
														value: '',
													},
													...FONT_SIZE_OPTIONS.filter(
														( opt ) =>
															opt.value !== ''
													),
												]
									}
									onChange={ ( val ) =>
										setAttributes( {
											[ attrMap[ breakpoint ] ]:
												val,
										} )
									}
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>
					<TextControl label={ __( 'Font family slug', 'sgs-blocks' ) } help={ __( 'theme.json slug e.g. "montserrat". Blank = inherit.', 'sgs-blocks' ) } value={ subHeadlineFontFamily || '' } onChange={ ( val ) => setAttributes( { subHeadlineFontFamily: val } ) } __nextHasNoMarginBottom />
					<SelectControl label={ __( 'Font weight', 'sgs-blocks' ) } value={ subHeadlineFontWeight || '' } options={ FONT_WEIGHT_OPTIONS } onChange={ ( val ) => setAttributes( { subHeadlineFontWeight: val } ) } __nextHasNoMarginBottom />
					<RangeControl label={ __( 'Line height', 'sgs-blocks' ) } value={ subHeadlineLineHeight || 0 } onChange={ ( val ) => setAttributes( { subHeadlineLineHeight: val || null } ) } min={ 0 } max={ 4 } step={ 0.05 } __nextHasNoMarginBottom />
					<SelectControl label={ __( 'Line height unit', 'sgs-blocks' ) } value={ subHeadlineLineHeightUnit || 'em' } options={ UNIT_EM_PX } onChange={ ( val ) => setAttributes( { subHeadlineLineHeightUnit: val } ) } __nextHasNoMarginBottom />
					<RangeControl label={ __( 'Letter spacing', 'sgs-blocks' ) } value={ subHeadlineLetterSpacing || 0 } onChange={ ( val ) => setAttributes( { subHeadlineLetterSpacing: val || null } ) } min={ -5 } max={ 20 } step={ 0.01 } __nextHasNoMarginBottom />
					<SelectControl label={ __( 'Letter spacing unit', 'sgs-blocks' ) } value={ subHeadlineLetterSpacingUnit || 'px' } options={ UNIT_PX_EM_REM } onChange={ ( val ) => setAttributes( { subHeadlineLetterSpacingUnit: val } ) } __nextHasNoMarginBottom />
					<SelectControl label={ __( 'Text transform', 'sgs-blocks' ) } value={ subHeadlineTextTransform || '' } options={ TEXT_TRANSFORM_OPTIONS } onChange={ ( val ) => setAttributes( { subHeadlineTextTransform: val } ) } __nextHasNoMarginBottom />
					<SelectControl label={ __( 'Text decoration', 'sgs-blocks' ) } value={ subHeadlineTextDecoration || '' } options={ TEXT_DECORATION_OPTIONS } onChange={ ( val ) => setAttributes( { subHeadlineTextDecoration: val } ) } __nextHasNoMarginBottom />
					<RangeControl
						label={ __( 'Max width (px)', 'sgs-blocks' ) }
						help={ __( 'Limits sub-headline width for readability. 0 = no limit.', 'sgs-blocks' ) }
						value={ subHeadlineMaxWidth || 0 }
						onChange={ ( val ) =>
							setAttributes( { subHeadlineMaxWidth: val || null } )
						}
						min={ 0 }
						max={ 1200 }
						step={ 10 }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Margin bottom — desktop (px)', 'sgs-blocks' ) }
						help={ __( '0 = inherit from theme.', 'sgs-blocks' ) }
						value={ subHeadlineMarginBottom || 0 }
						onChange={ ( val ) =>
							setAttributes( { subHeadlineMarginBottom: val || null } )
						}
						min={ 0 }
						max={ 120 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Margin bottom — mobile (px)', 'sgs-blocks' ) }
						help={ __( '0 = inherit from theme.', 'sgs-blocks' ) }
						value={ subHeadlineMarginBottomMobile || 0 }
						onChange={ ( val ) =>
							setAttributes( { subHeadlineMarginBottomMobile: val || null } )
						}
						min={ 0 }
						max={ 120 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{/* ── 6. Image (background + split) ── */}
				<PanelBody title={ __( 'Image', 'sgs-blocks' ) } initialOpen={ false }>
					{ ! isSplit && ! isVideo && ! isSvgAnimated && (
						<>
							<p style={ { fontWeight: 600, margin: '0 0 4px' } }>{ __( 'Background image', 'sgs-blocks' ) }</p>
							<MediaUploadCheck>
								<MediaUpload
									onSelect={ ( media ) =>
										setAttributes( {
											backgroundImage: {
												id: media.id,
												url: media.url,
												alt: media.alt,
											},
										} )
									}
									allowedTypes={ [ 'image' ] }
									value={ backgroundImage?.id }
									render={ ( { open } ) => (
										<div>
											{ backgroundImage?.url ? (
												<>
													<img
														src={ backgroundImage.url }
														alt=""
														style={ {
															maxWidth: '100%',
															marginBottom: '8px',
														} }
													/>
													<Button
														variant="secondary"
														onClick={ () =>
															setAttributes( {
																backgroundImage:
																	undefined,
															} )
														}
														isDestructive
													>
														{ __(
															'Remove image',
															'sgs-blocks'
														) }
													</Button>
												</>
											) : (
												<Button
													variant="secondary"
													onClick={ open }
												>
													{ __(
														'Select background image',
														'sgs-blocks'
													) }
												</Button>
											) }
										</div>
									) }
								/>
							</MediaUploadCheck>

							<DesignTokenPicker
								label={ __( 'Overlay colour', 'sgs-blocks' ) }
								value={ overlayColour }
								onChange={ ( val ) =>
									setAttributes( { overlayColour: val } )
								}
							/>
							<RangeControl
								label={ __( 'Overlay opacity (%)', 'sgs-blocks' ) }
								value={ overlayOpacity }
								onChange={ ( val ) =>
									setAttributes( { overlayOpacity: val } )
								}
								min={ 0 }
								max={ 100 }
								__nextHasNoMarginBottom
							/>
						</>
					) }

					{ isSplit && (
						<>
							<p style={ { fontWeight: 600, margin: '0 0 4px' } }>{ __( 'Split media source', 'sgs-blocks' ) }</p>
							<MediaPicker
								value={
									splitMedia ||
									( splitImage?.url
										? {
												url: splitImage.url,
												type: 'image',
												id: splitImage.id || 0,
												alt: splitImage.alt || '',
												mime: '',
										  }
										: null )
								}
								onChange={ ( media ) =>
									setAttributes( {
										splitMedia: media,
										splitImage:
											media && media.type === 'image'
												? {
														id: media.id,
														url: media.url,
														alt: media.alt,
												  }
												: undefined,
									} )
								}
								onRemove={ () =>
									setAttributes( {
										splitMedia: null,
										splitImage: undefined,
									} )
								}
								label={ __( 'Select hero media', 'sgs-blocks' ) }
								instructionsImage={ __( 'Choose an image or video for the hero', 'sgs-blocks' ) }
							/>
							<RangeControl
								label={ __( 'Split image mobile height (px)', 'sgs-blocks' ) }
								help={ __( 'Fixed height for the split image on mobile screens. 0 = auto.', 'sgs-blocks' ) }
								value={ splitImageMobileHeight || 0 }
								onChange={ ( val ) =>
									setAttributes( { splitImageMobileHeight: val || null } )
								}
								min={ 0 }
								max={ 600 }
								step={ 10 }
								__nextHasNoMarginBottom
							/>

							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Display', 'sgs-blocks' ) }</p>
							<SelectControl label={ __( 'Object fit', 'sgs-blocks' ) } value={ imageObjectFit } options={ IMAGE_FIT_OPTIONS } onChange={ ( val ) => setAttributes( { imageObjectFit: val } ) } __nextHasNoMarginBottom />
							<TextControl label={ __( 'Object position', 'sgs-blocks' ) } help={ __( 'CSS object-position (e.g. "center 20%").', 'sgs-blocks' ) } value={ imageObjectPosition || 'center center' } onChange={ ( val ) => setAttributes( { imageObjectPosition: val } ) } __nextHasNoMarginBottom />
							{ imageObjectFit === 'custom' && (
								<>
									<p style={ { fontWeight: 600, margin: '12px 0 4px' } }>{ __( 'Custom dimensions', 'sgs-blocks' ) }</p>
									<RRangeControl label={ __( 'Width', 'sgs-blocks' ) } attrDesktop="imageWidth" attrTablet="imageWidthTablet" attrMobile="imageWidthMobile" attributes={ attributes } setAttributes={ setAttributes } min={ 0 } max={ 1200 } step={ 1 } />
									<SelectControl label={ __( 'Width unit', 'sgs-blocks' ) } value={ imageWidthUnit } options={ UNIT_PX_PCT } onChange={ ( val ) => setAttributes( { imageWidthUnit: val } ) } __nextHasNoMarginBottom />
									<RRangeControl label={ __( 'Height', 'sgs-blocks' ) } attrDesktop="imageHeight" attrTablet="imageHeightTablet" attrMobile="imageHeightMobile" attributes={ attributes } setAttributes={ setAttributes } min={ 0 } max={ 1200 } step={ 1 } />
									<SelectControl label={ __( 'Height unit', 'sgs-blocks' ) } value={ imageHeightUnit } options={ UNIT_PX_PCT } onChange={ ( val ) => setAttributes( { imageHeightUnit: val } ) } __nextHasNoMarginBottom />
								</>
							) }

							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Border radius', 'sgs-blocks' ) }</p>
							<RRangeControl label={ __( 'Top-left', 'sgs-blocks' ) } attrDesktop="imageBorderRadiusTL" attrTablet="imageBorderRadiusTabletTL" attrMobile="imageBorderRadiusMobileTL" attributes={ attributes } setAttributes={ setAttributes } min={ 0 } max={ 200 } step={ 1 } nullOnZero={ false } />
							<RRangeControl label={ __( 'Top-right', 'sgs-blocks' ) } attrDesktop="imageBorderRadiusTR" attrTablet="imageBorderRadiusTabletTR" attrMobile="imageBorderRadiusMobileTR" attributes={ attributes } setAttributes={ setAttributes } min={ 0 } max={ 200 } step={ 1 } nullOnZero={ false } />
							<RRangeControl label={ __( 'Bottom-right', 'sgs-blocks' ) } attrDesktop="imageBorderRadiusBR" attrTablet="imageBorderRadiusTabletBR" attrMobile="imageBorderRadiusMobileBR" attributes={ attributes } setAttributes={ setAttributes } min={ 0 } max={ 200 } step={ 1 } nullOnZero={ false } />
							<RRangeControl label={ __( 'Bottom-left', 'sgs-blocks' ) } attrDesktop="imageBorderRadiusBL" attrTablet="imageBorderRadiusTabletBL" attrMobile="imageBorderRadiusMobileBL" attributes={ attributes } setAttributes={ setAttributes } min={ 0 } max={ 200 } step={ 1 } nullOnZero={ false } />
							<SelectControl label={ __( 'Border radius unit', 'sgs-blocks' ) } value={ imageBorderRadiusUnit } options={ UNIT_PX_PCT } onChange={ ( val ) => setAttributes( { imageBorderRadiusUnit: val } ) } __nextHasNoMarginBottom />

							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Border', 'sgs-blocks' ) }</p>
							<SelectControl label={ __( 'Border style', 'sgs-blocks' ) } value={ imageBorderStyle } options={ BORDER_STYLE_OPTIONS } onChange={ ( val ) => setAttributes( { imageBorderStyle: val } ) } __nextHasNoMarginBottom />
							{ imageBorderStyle !== 'none' && (
								<>
									<RangeControl label={ __( 'Border top', 'sgs-blocks' ) } value={ imageBorderWidthTop || 0 } onChange={ ( val ) => setAttributes( { imageBorderWidthTop: val } ) } min={ 0 } max={ 20 } step={ 1 } __nextHasNoMarginBottom />
									<RangeControl label={ __( 'Border right', 'sgs-blocks' ) } value={ imageBorderWidthRight || 0 } onChange={ ( val ) => setAttributes( { imageBorderWidthRight: val } ) } min={ 0 } max={ 20 } step={ 1 } __nextHasNoMarginBottom />
									<RangeControl label={ __( 'Border bottom', 'sgs-blocks' ) } value={ imageBorderWidthBottom || 0 } onChange={ ( val ) => setAttributes( { imageBorderWidthBottom: val } ) } min={ 0 } max={ 20 } step={ 1 } __nextHasNoMarginBottom />
									<RangeControl label={ __( 'Border left', 'sgs-blocks' ) } value={ imageBorderWidthLeft || 0 } onChange={ ( val ) => setAttributes( { imageBorderWidthLeft: val } ) } min={ 0 } max={ 20 } step={ 1 } __nextHasNoMarginBottom />
									<SelectControl label={ __( 'Border width unit', 'sgs-blocks' ) } value={ imageBorderWidthUnit } options={ UNIT_PX_EM_REM } onChange={ ( val ) => setAttributes( { imageBorderWidthUnit: val } ) } __nextHasNoMarginBottom />
									<DesignTokenPicker label={ __( 'Border colour', 'sgs-blocks' ) } value={ imageBorderColour } onChange={ ( val ) => setAttributes( { imageBorderColour: val } ) } />
								</>
							) }

							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Inner padding (around the image element itself)', 'sgs-blocks' ) }</p>
							<p style={ { fontSize: '12px', color: '#757575', margin: '0 0 8px' } }>{ __( 'Affects the gap between the image and the wrapper border.', 'sgs-blocks' ) }</p>
							<RRangeControl label={ __( 'Top', 'sgs-blocks' ) } attrDesktop="imagePaddingTop" attrTablet="imagePaddingTopTablet" attrMobile="imagePaddingTopMobile" attributes={ attributes } setAttributes={ setAttributes } />
							<RRangeControl label={ __( 'Right', 'sgs-blocks' ) } attrDesktop="imagePaddingRight" attrTablet="imagePaddingRightTablet" attrMobile="imagePaddingRightMobile" attributes={ attributes } setAttributes={ setAttributes } />
							<RRangeControl label={ __( 'Bottom', 'sgs-blocks' ) } attrDesktop="imagePaddingBottom" attrTablet="imagePaddingBottomTablet" attrMobile="imagePaddingBottomMobile" attributes={ attributes } setAttributes={ setAttributes } />
							<RRangeControl label={ __( 'Left', 'sgs-blocks' ) } attrDesktop="imagePaddingLeft" attrTablet="imagePaddingLeftTablet" attrMobile="imagePaddingLeftMobile" attributes={ attributes } setAttributes={ setAttributes } />
							<SelectControl label={ __( 'Inner padding unit', 'sgs-blocks' ) } value={ imagePaddingUnit } options={ UNIT_PX_PCT } onChange={ ( val ) => setAttributes( { imagePaddingUnit: val } ) } __nextHasNoMarginBottom />

							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Outer padding (around the whole media wrapper)', 'sgs-blocks' ) }</p>
							<p style={ { fontSize: '12px', color: '#757575', margin: '0 0 8px' } }>{ __( 'Affects the gap between the wrapper and the surrounding section.', 'sgs-blocks' ) }</p>
							<RRangeControl label={ __( 'Top', 'sgs-blocks' ) } attrDesktop="mediaPaddingTop" attrTablet="mediaPaddingTopTablet" attrMobile="mediaPaddingTopMobile" attributes={ attributes } setAttributes={ setAttributes } />
							<RRangeControl label={ __( 'Right', 'sgs-blocks' ) } attrDesktop="mediaPaddingRight" attrTablet="mediaPaddingRightTablet" attrMobile="mediaPaddingRightMobile" attributes={ attributes } setAttributes={ setAttributes } />
							<RRangeControl label={ __( 'Bottom', 'sgs-blocks' ) } attrDesktop="mediaPaddingBottom" attrTablet="mediaPaddingBottomTablet" attrMobile="mediaPaddingBottomMobile" attributes={ attributes } setAttributes={ setAttributes } />
							<RRangeControl label={ __( 'Left', 'sgs-blocks' ) } attrDesktop="mediaPaddingLeft" attrTablet="mediaPaddingLeftTablet" attrMobile="mediaPaddingLeftMobile" attributes={ attributes } setAttributes={ setAttributes } />
							<SelectControl label={ __( 'Outer padding unit', 'sgs-blocks' ) } value={ mediaPaddingUnit } options={ UNIT_PX_PCT } onChange={ ( val ) => setAttributes( { mediaPaddingUnit: val } ) } __nextHasNoMarginBottom />
						</>
					) }

					{ ! isSplit && ! isVideo && ! isSvgAnimated && (
						<>
							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Background effects', 'sgs-blocks' ) }</p>
							<ToggleControl
								label={ __( 'Parallax scroll', 'sgs-blocks' ) }
								help={ __(
									'Background scrolls slower than content. Disabled automatically on touch devices.',
									'sgs-blocks'
								) }
								checked={ !! bgParallax }
								onChange={ ( val ) =>
									setAttributes( { bgParallax: val } )
								}
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={ __( 'Ken Burns animation', 'sgs-blocks' ) }
								help={ __(
									'Slow pan and zoom on the background image. Respects reduced-motion preference.',
									'sgs-blocks'
								) }
								checked={ !! bgKenBurns }
								onChange={ ( val ) =>
									setAttributes( { bgKenBurns: val } )
								}
								__nextHasNoMarginBottom
							/>
							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>
								{ __( 'Background video (desktop)', 'sgs-blocks' ) }
							</p>
							<MediaUploadCheck>
								<MediaUpload
									onSelect={ ( media ) =>
										setAttributes( {
											bgVideo: { id: media.id, url: media.url },
										} )
									}
									allowedTypes={ [ 'video' ] }
									value={ bgVideo?.id }
									render={ ( { open } ) => (
										<div>
											{ bgVideo?.url ? (
												<>
													<p style={ { fontSize: '12px', margin: '0 0 4px' } }>
														{ bgVideo.url.split( '/' ).pop() }
													</p>
													<Button
														variant="secondary"
														isDestructive
														onClick={ () =>
															setAttributes( { bgVideo: undefined } )
														}
													>
														{ __( 'Remove', 'sgs-blocks' ) }
													</Button>
												</>
											) : (
												<Button variant="secondary" onClick={ open }>
													{ __( 'Select video', 'sgs-blocks' ) }
												</Button>
											) }
										</div>
									) }
								/>
							</MediaUploadCheck>
							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>
								{ __( 'Background video (mobile)', 'sgs-blocks' ) }
							</p>
							<MediaUploadCheck>
								<MediaUpload
									onSelect={ ( media ) =>
										setAttributes( {
											bgVideoMobile: { id: media.id, url: media.url },
										} )
									}
									allowedTypes={ [ 'video' ] }
									value={ bgVideoMobile?.id }
									render={ ( { open } ) => (
										<div>
											{ bgVideoMobile?.url ? (
												<>
													<p style={ { fontSize: '12px', margin: '0 0 4px' } }>
														{ bgVideoMobile.url.split( '/' ).pop() }
													</p>
													<Button
														variant="secondary"
														isDestructive
														onClick={ () =>
															setAttributes( { bgVideoMobile: undefined } )
														}
													>
														{ __( 'Remove', 'sgs-blocks' ) }
													</Button>
												</>
											) : (
												<Button variant="secondary" onClick={ open }>
													{ __( 'Select mobile video', 'sgs-blocks' ) }
												</Button>
											) }
										</div>
									) }
								/>
							</MediaUploadCheck>
						</>
					) }
				</PanelBody>

				{/* ── Video Background (video variant only) ── */}
				{ isVideo && (
					<PanelBody
						title={ __( 'Background Video', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ ( media ) =>
									setAttributes( {
										backgroundVideo: {
											id: media.id,
											url: media.url,
										},
									} )
								}
								allowedTypes={ [ 'video' ] }
								value={ backgroundVideo?.id }
								render={ ( { open } ) => (
									<div>
										{ backgroundVideo?.url ? (
											<>
												<video
													src={ backgroundVideo.url }
													controls
													style={ {
														maxWidth: '100%',
														marginBottom: '8px',
													} }
												/>
												<Button
													variant="secondary"
													onClick={ () =>
														setAttributes( {
															backgroundVideo:
																undefined,
														} )
													}
													isDestructive
												>
													{ __(
														'Remove video',
														'sgs-blocks'
													) }
												</Button>
											</>
										) : (
											<Button
												variant="secondary"
												onClick={ open }
											>
												{ __(
													'Select background video (MP4/WebM)',
													'sgs-blocks'
												) }
											</Button>
										) }
									</div>
								) }
							/>
						</MediaUploadCheck>
						<DesignTokenPicker
							label={ __( 'Overlay colour', 'sgs-blocks' ) }
							value={ overlayColour }
							onChange={ ( val ) =>
								setAttributes( { overlayColour: val } )
							}
						/>
						<RangeControl
							label={ __( 'Overlay opacity (%)', 'sgs-blocks' ) }
							value={ overlayOpacity }
							onChange={ ( val ) =>
								setAttributes( { overlayOpacity: val } )
							}
							min={ 0 }
							max={ 100 }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{/* ── SVG Background (svg-animated variant only) ── */}
				{ isSvgAnimated && (
					<PanelBody
						title={ __( 'SVG Background', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<TextareaControl
							label={ __( 'SVG markup', 'sgs-blocks' ) }
							value={ svgContent || '' }
							onChange={ ( val ) =>
								setAttributes( { svgContent: val } )
							}
							rows={ 10 }
							help={ __(
								'Paste your SVG code here. Animation will be handled by the SVG itself.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
						<DesignTokenPicker
							label={ __( 'Overlay colour', 'sgs-blocks' ) }
							value={ overlayColour }
							onChange={ ( val ) =>
								setAttributes( { overlayColour: val } )
							}
						/>
						<RangeControl
							label={ __( 'Overlay opacity (%)', 'sgs-blocks' ) }
							value={ overlayOpacity }
							onChange={ ( val ) =>
								setAttributes( { overlayOpacity: val } )
							}
							min={ 0 }
							max={ 100 }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{/* ── 7. Buttons ── */}
				<PanelBody
					title={ __( 'Buttons', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<Notice status="info" isDismissible={ false }>
						{ __( 'Buttons are now managed using the SGS Button Group block inside the hero. Click on a button in the editor to configure its style, colour, and link.', 'sgs-blocks' ) }
					</Notice>
					<RRangeControl
						label={ __( 'Button gap', 'sgs-blocks' ) }
						attrDesktop="ctaGap"
						attrTablet="ctaGapTablet"
						attrMobile="ctaGapMobile"
						attributes={ attributes }
						setAttributes={ setAttributes }
						min={ 0 }
						max={ 80 }
						step={ 1 }
					/>
					<SelectControl
						label={ __( 'Gap unit', 'sgs-blocks' ) }
						value={ ctaGapUnit }
						options={ UNIT_PX_PCT }
						onChange={ ( val ) => setAttributes( { ctaGapUnit: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{/* ── 8. Badges ── */}
				<PanelBody
					title={ __( 'Badges', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ badges.map( ( badge, index ) => (
						<BadgeEditor
							key={ index }
							badge={ badge }
							index={ index }
							onChange={ ( updated ) =>
								updateBadge( index, updated )
							}
							onRemove={ () => removeBadge( index ) }
						/>
					) ) }
					<Button variant="secondary" onClick={ addBadge }>
						{ __( 'Add badge', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ isVideo && backgroundVideo?.url && (
					<video
						className="sgs-hero__video-bg"
						src={ backgroundVideo.url }
						autoPlay
						loop
						muted
						playsInline
						aria-hidden="true"
					/>
				) }

				{ isSvgAnimated && svgContent && (
					<div
						className="sgs-hero__svg-bg"
						dangerouslySetInnerHTML={ { __html: svgContent } }
						aria-hidden="true"
					/>
				) }

				{ ( ! isSplit && ! isVideo && ! isSvgAnimated && backgroundImage?.url ) && (
					<span
						className="sgs-hero__overlay"
						style={ {
							backgroundColor: overlayColour,
							opacity: overlayOpacity / 100,
						} }
						aria-hidden="true"
					/>
				) }

				{ ( isVideo || isSvgAnimated ) && (
					<span
						className="sgs-hero__overlay"
						style={ {
							backgroundColor: overlayColour,
							opacity: overlayOpacity / 100,
						} }
						aria-hidden="true"
					/>
				) }

				{ /* FR-22-6: content column is the InnerBlocks slot (label + heading + text + buttons). */ }
				<div { ...innerBlocksProps } />

				{ isSplit && ( splitMedia?.url || splitImage?.url ) && (
					<div className="sgs-hero__media">
						{ splitMedia?.type === 'video' ? (
							<video
								src={ splitMedia.url }
								className="sgs-hero__split-image"
								autoPlay
								muted
								loop
								playsInline
							/>
						) : (
							<img
								src={ splitMedia?.url || splitImage?.url }
								alt={ splitMedia?.alt || splitImage?.alt || '' }
								className="sgs-hero__split-image"
							/>
						) }
						{ badges.length > 0 &&
							badges.map( ( badge, index ) => (
								<div
									key={ index }
									className={ `sgs-hero__badge sgs-hero__badge--${ badge.position || 'bottom-left' } sgs-hero__badge--${ badge.style || 'light' }` }
								>
									<span className="sgs-hero__badge-number">
										{ badge.number }
										{ badge.suffix }
									</span>
									<span className="sgs-hero__badge-label">
										{ badge.label }
									</span>
								</div>
							) ) }
					</div>
				) }

				{ ! isSplit &&
					badges.length > 0 &&
					badges.map( ( badge, index ) => (
						<div
							key={ index }
							className={ `sgs-hero__badge sgs-hero__badge--${ badge.position || 'bottom-left' } sgs-hero__badge--${ badge.style || 'light' }` }
						>
							<span className="sgs-hero__badge-number">
								{ badge.number }
								{ badge.suffix }
							</span>
							<span className="sgs-hero__badge-label">
								{ badge.label }
							</span>
						</div>
					) ) }
			</div>
		</>
	);
}
