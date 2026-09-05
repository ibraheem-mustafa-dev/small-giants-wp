import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	BlockControls,
	AlignmentControl,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	RangeControl,
} from '@wordpress/components';
import { SgsColourPanel, IconPicker, IconPreview, ResponsiveBoxControl, LinkPopoverField } from '../../components';
import { colourVar } from '../../utils';

// Box-object interface contract §1: build an editor-preview shorthand from a
// box object — mirrors render.php's box-shorthand builder so the canvas
// preview matches the frontend (contract §5). Mirrors sgs/heading's helper.
function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

/**
 * Resolve a shape-padding value to a valid CSS string for editor preview.
 * Mirrors PHP sgs_container_gap_value() (→ sgs_css_length_value()):
 *  - Bare digit slug (e.g. "30") → var(--wp--preset--spacing--30)
 *  - Raw CSS length (e.g. "12px", "0.75rem") → pass through as-is
 *  - Empty / nullish → '' (custom property omitted)
 *
 * @param {string} value Raw backgroundPadding attribute value.
 * @return {string} Resolved CSS length, or '' when nothing is set.
 */
function shapePaddingCssValue( value ) {
	if ( ! value ) {
		return '';
	}
	if ( /^\d+$/.test( String( value ) ) ) {
		return `var(--wp--preset--spacing--${ value })`;
	}
	return String( value );
}

const BG_SHAPES = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Circle', 'sgs-blocks' ), value: 'circle' },
	{ label: __( 'Pill', 'sgs-blocks' ), value: 'pill' },
	{ label: __( 'Rounded square', 'sgs-blocks' ), value: 'rounded' },
	{ label: __( 'Square', 'sgs-blocks' ), value: 'square' },
	{ label: __( 'Outline ring', 'sgs-blocks' ), value: 'outline' },
];

const TEXT_ALIGN_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
	{ label: __( 'Justify', 'sgs-blocks' ), value: 'justify' },
];

/**
 * Size modifier class for the editor preview wrapper.
 *
 * @param {number} size px value
 * @return {string} BEM modifier class
 */
function sizeModifier( size ) {
	if ( size <= 20 ) {
		return 'sgs-icon--size-small';
	}
	if ( size <= 40 ) {
		return 'sgs-icon--size-medium';
	}
	if ( size <= 64 ) {
		return 'sgs-icon--size-large';
	}
	return 'sgs-icon--size-custom';
}

/**
 * The per-source attribute that holds the icon's identifier.
 *
 * @param {Object} attrs Block attributes.
 * @return {string} The current icon name/char for the active source.
 */
function currentIconName( attrs ) {
	switch ( attrs.iconSource ) {
		case 'emoji':
			return attrs.emojiChar;
		case 'dashicon':
			return attrs.dashiconName;
		case 'wp-icon':
			return attrs.wpIconName;
		case 'lucide':
		default:
			return attrs.iconName;
	}
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		style,
		iconSource,
		iconSize,
		iconColour,
		backgroundColour,
		backgroundShape,
		backgroundPadding,
		linkUrl,
		linkTarget,
		linkRel,
		ariaLabel,
		iconColourHover,
		iconColourGradient,
		iconColourHoverGradient,
		shapeColourHover,
		scaleHover,
		iconAlign,
		textAlign,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
	} = attributes;

	const blockAlign = attributes.align || 'center';
	const className = [
		'sgs-icon',
		`sgs-icon--source-${ iconSource }`,
		sizeModifier( iconSize ),
		backgroundShape !== 'none' && `sgs-icon--bg-${ backgroundShape }`,
		`align${ blockAlign }`,
		iconAlign && iconAlign !== 'left' && `sgs-icon--align-${ iconAlign }`,
	]
		.filter( Boolean )
		.join( ' ' );

	// Outline shape: transparent background + coloured border; no solid fill.
	const isOutline = backgroundShape === 'outline';

	// Editor-canvas preview only — mirrors render.php's scoped output so the
	// canvas matches the frontend (contract §5). The frontend itself carries
	// ZERO inline literal declarations (color/background-color/padding/margin);
	// those are scoped there. CSS custom-property VALUES (--sgs-icon-*) remain
	// inline on both editor + frontend — the contract explicitly permits them.
	const previewStyle = {
		'--sgs-icon-size': `${ iconSize }px`,
		color: colourVar( iconColour ) || undefined,
		backgroundColor:
			backgroundColour && backgroundShape !== 'none' && ! isOutline
				? colourVar( backgroundColour )
				: undefined,
		'--sgs-icon-outline-colour':
			backgroundColour && isOutline ? colourVar( backgroundColour ) : undefined,
		'--sgs-icon-hover-colour': colourVar( iconColourHover ) || undefined,
		'--sgs-icon-hover-shape-colour':
			shapeColourHover ? colourVar( shapeColourHover ) : undefined,
		'--sgs-icon-hover-scale': scaleHover || undefined,
		'--sgs-icon-shape-padding':
			backgroundShape !== 'none' && backgroundPadding
				? shapePaddingCssValue( backgroundPadding )
				: undefined,
		// Mirrors render.php's `$root_decls[] = 'text-align:' . $text_align`
		// (emitted only when set, so inheritance works when empty — same here).
		textAlign: textAlign || undefined,
	};

	// Base padding/margin preview — WP-native style.spacing.* objects
	// (box-object interface contract §B; box-model order top/right/bottom/left).
	const paddingPreview = boxShorthand( style?.spacing?.padding, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		previewStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( style?.spacing?.margin, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) {
		previewStyle.margin = marginPreview;
	}

	const blockProps = useBlockProps( { className, style: previewStyle } );

	// Map the IconPicker's { source, name } back onto the block's per-source attrs.
	const handleIconChange = ( { source, name } ) => {
		const next = { iconSource: source };
		if ( 'emoji' === source ) {
			next.emojiChar = name;
		} else if ( 'dashicon' === source ) {
			next.dashiconName = name;
		} else if ( 'wp-icon' === source ) {
			next.wpIconName = name;
		} else {
			next.iconName = name;
		}
		setAttributes( next );
	};

	return (
		<>
			<BlockControls group="block">
				<AlignmentControl
					value={ iconAlign }
					onChange={ ( val ) =>
						setAttributes( { iconAlign: val || 'left' } )
					}
				/>
			</BlockControls>
			{ /* D609 amendment (decisions.md, 2026-08-13), corrected 2026-08-14
			   — ONE grouped, SGS-OWNED colour panel (own PanelBody, default
			   InspectorControls group — NOT native's `group="color"` slot;
			   see SgsColourPanel.js's docblock for why that first attempt
			   was wrong). `supports.color` stays declared (the
			   audit-block-uniformity.py gate requires the KEY present for
			   any ROOT-element colour attr per the Spec 35 element
			   manifest — a pipeline/DB-contract signal, not a UI toggle)
			   but its text/background/gradients sub-flags are now false,
			   so WordPress generates no native colour UI to overlap with
			   this panel. Rendered FIRST so it sits at the top of the
			   inspector. Every pickable colour on this block renders from
			   THIS one panel instead of being scattered as inline rows
			   inside "Icon"/"Background" below. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'icon',
						label: __( 'Icon colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: iconColour,
								onChange: ( val ) =>
									setAttributes( { iconColour: val } ),
								gradientValue: iconColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										iconColourGradient: val,
									} ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: iconColourHover,
								onChange: ( val ) =>
									setAttributes( {
										iconColourHover: val,
									} ),
								gradientValue: iconColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										iconColourHoverGradient: val,
									} ),
							},
						],
					},
					backgroundShape !== 'none' && {
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: backgroundColour,
								onChange: ( val ) =>
									setAttributes( {
										backgroundColour: val,
									} ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: shapeColourHover,
								onChange: ( val ) =>
									setAttributes( {
										shapeColourHover: val,
									} ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Icon', 'sgs-blocks' ) }>
					<IconPicker
						label={ __( 'Icon', 'sgs-blocks' ) }
						value={ {
							source: iconSource,
							name: currentIconName( attributes ),
						} }
						onChange={ handleIconChange }
					/>

					<RangeControl
						label={ __( 'Size (px)', 'sgs-blocks' ) }
						value={ iconSize }
						onChange={ ( val ) => setAttributes( { iconSize: val } ) }
						min={ 16 }
						max={ 128 }
						step={ 4 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ /* A4 (Spec 35 Part A — one element = one panel): the icon's
					   link belongs IN the Icon panel, not its own top-level
					   panel — Bean: "the link option should be in the icon
					   panel and not in its own panel". Folded in from the old
					   standalone "Link" PanelBody below; the LinkPopoverField
					   mount itself (Spec 35 §2 LINK standard) is unchanged. */ }
					<LinkPopoverField
						label={ __( 'Link', 'sgs-blocks' ) }
						help={ __(
							'Search your site or paste a URL to make this icon clickable.',
							'sgs-blocks'
						) }
						value={ { url: linkUrl, linkTarget, rel: linkRel } }
						targetMode="boolean"
						onChange={ ( next ) => {
							const patch = {};
							if ( undefined !== next.url ) patch.linkUrl = next.url;
							if ( undefined !== next.linkTarget ) patch.linkTarget = next.linkTarget;
							if ( undefined !== next.rel ) patch.linkRel = next.rel;
							setAttributes( patch );
						} }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Background', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Background shape', 'sgs-blocks' ) }
						value={ backgroundShape }
						options={ BG_SHAPES }
						onChange={ ( val ) => setAttributes( { backgroundShape: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ backgroundShape !== 'none' && (
						<>
							<TextControl
								label={ __( 'Shape padding', 'sgs-blocks' ) }
								help={ __(
									'A spacing slug (e.g. 30) or a CSS value (e.g. 12px, 0.75rem). Leave empty for the theme default.',
									'sgs-blocks'
								) }
								value={ backgroundPadding }
								onChange={ ( val ) =>
									setAttributes( { backgroundPadding: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</>
					) }
				</PanelBody>

			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Text align', 'sgs-blocks' ) }
						value={ textAlign }
						options={ TEXT_ALIGN_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { textAlign: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody title={ __( 'Hover effects', 'sgs-blocks' ) } initialOpen={ false }>
					{ /* D609: the hover colours moved into the Icon/Background
					   panels' own colour rows (Normal/Hover tab inside the
					   popover) — this panel keeps only the hover behaviour
					   that has no colour of its own. */ }
					<RangeControl
						label={ __( 'Scale on hover', 'sgs-blocks' ) }
						value={ scaleHover }
						onChange={ ( val ) => setAttributes( { scaleHover: val } ) }
						min={ 1 }
						max={ 1.5 }
						step={ 0.05 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ /* ── Spacing panel ── Box-object interface contract §B/§E: padding/
				   margin base routes to WP-native style.spacing.* (skip-serialised —
				   scoped, not inline, on the frontend); tiers are the
				   paddingTablet/paddingMobile + marginTablet/marginMobile object
				   attrs (scoped @media 1023/767). */ }
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						presets
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

			<InspectorControls>
				<PanelBody title={ __( 'Accessibility', 'sgs-blocks' ) } initialOpen={ false }>
					<TextControl
						label={ __( 'Accessible label', 'sgs-blocks' ) }
						help={
							linkUrl
								? __(
										'Describes the link destination for screen readers. Defaults to the icon name when blank.',
										'sgs-blocks'
								  )
								: __(
										'Describes the icon for screen readers. Leave blank for decorative icons (hidden from assistive technology).',
										'sgs-blocks'
								  )
						}
						value={ ariaLabel }
						onChange={ ( val ) => setAttributes( { ariaLabel: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ /* Editor canvas preview — renders the real icon via the shared preview. */ }
				<span className="sgs-icon__svg" aria-hidden="true">
					<IconPreview
						source={ iconSource }
						name={ currentIconName( attributes ) }
						size={ iconSize }
						gradient={ iconColourGradient }
					/>
				</span>
			</div>
		</>
	);
}
