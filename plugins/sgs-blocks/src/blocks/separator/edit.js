/**
 * edit.js — Block editor component for sgs/separator.
 *
 * NO-INLINE + NO-USELESS-WRAPPER (LOCKED per-block no-inline migration
 * contract §A/§B3, 2026-07-09): in `contentMode: 'none'` the `<hr>` IS the
 * block root — no wrapper `<div>`. In `contentMode: 'icon' | 'text'` the
 * root becomes a flex-row `<div>` (two flanking line spans either side of
 * the content slot) — a genuinely-needed structure, not the "useless div"
 * the contract forbids. Mirrors sgs/quote's `as: 'blockquote'`
 * root-element-swap pattern, applied here to `hr` vs `div`.
 *
 * Editor canvas preview mirrors render.php's scoped-CSS output via inline
 * style on the SAME root element (the editor canvas may use inline style for
 * live preview — only the SAVED/RENDERED frontend output must be
 * inline-free, and this block is dynamic, so nothing here persists to
 * post_content).
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	RangeControl,
} from '@wordpress/components';
import {
	DesignTokenPicker,
	IconPicker,
	IconPreview,
	ResponsiveOverride,
	ResponsiveBoxControl,
	TypographyControls,
} from '../../components';
import { colourVar } from '../../utils';
import { ToolsPanel, ToolsPanelItem, UnitControl } from '../../components/primitives';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LINE_STYLE_OPTIONS = [
	{ label: __( 'Solid', 'sgs-blocks' ), value: 'solid' },
	{ label: __( 'Dashed', 'sgs-blocks' ), value: 'dashed' },
	{ label: __( 'Dotted', 'sgs-blocks' ), value: 'dotted' },
	{ label: __( 'Double', 'sgs-blocks' ), value: 'double' },
	{ label: __( 'None (invisible)', 'sgs-blocks' ), value: 'none' },
];

const ALIGNMENT_OPTIONS = [
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
];

const CONTENT_MODE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Icon', 'sgs-blocks' ), value: 'icon' },
	{ label: __( 'Text label', 'sgs-blocks' ), value: 'text' },
];

const WIDTH_UNITS = [
	{ value: '%', label: '%', default: 100 },
	{ value: 'px', label: 'px', default: 100 },
];

const THICKNESS_UNITS = [
	{ value: 'px', label: 'px', default: 1 },
	{ value: 'rem', label: 'rem', default: 1 },
	{ value: 'em', label: 'em', default: 1 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function composeUnit( num, unit ) {
	if ( num === undefined || num === null || num === '' ) {
		return '';
	}
	return `${ num }${ unit || '' }`;
}

function parseUnit( raw, currentUnit ) {
	if ( ! raw && raw !== 0 ) {
		return { num: undefined, unit: currentUnit || 'px' };
	}
	const str = String( raw ).trim();
	if ( '' === str ) {
		return { num: undefined, unit: currentUnit || 'px' };
	}
	const match = str.match( /^([\d.]+)\s*([a-z%]*)$/i );
	if ( match ) {
		const num = parseFloat( match[ 1 ] );
		const unit = match[ 2 ] || currentUnit || 'px';
		return { num: isNaN( num ) ? undefined : num, unit };
	}
	return { num: undefined, unit: currentUnit || 'px' };
}

// Box-object interface contract §1: build an editor-preview shorthand from a
// box object — mirrors render.php's box-shorthand builder (contract §5).
function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) {
		return undefined;
	}
	if ( ! keys.some( ( key ) => box[ key ] ) ) {
		return undefined;
	}
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

// Alignment → margin preview (mirrors render.php's alignment decl builder).
function alignmentMargin( alignment ) {
	if ( 'left' === alignment ) {
		return { marginLeft: 0, marginRight: 'auto' };
	}
	if ( 'right' === alignment ) {
		return { marginLeft: 'auto', marginRight: 0 };
	}
	return { marginLeft: 'auto', marginRight: 'auto' };
}

// The per-source attribute that holds the content icon's identifier
// (mirrors sgs/icon's currentIconName()).
function currentIconName( attrs ) {
	switch ( attrs.contentIconSource ) {
		case 'emoji':
			return attrs.contentIconEmoji;
		case 'dashicon':
			return attrs.contentIconDashicon;
		case 'wp-icon':
			return attrs.contentIconWpIcon;
		case 'lucide':
		default:
			return attrs.contentIconName;
	}
}

// ---------------------------------------------------------------------------
// Edit component
// ---------------------------------------------------------------------------

export default function Edit( { attributes, setAttributes } ) {
	const {
		style,
		lineStyle,
		width,
		widthUnit,
		thickness,
		thicknessUnit,
		colour,
		opacity,
		alignment,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		gradientEnabled,
		gradientColourStart,
		gradientColourEnd,
		gradientAngle,
		contentMode,
		contentIconSize,
		contentColour,
		contentText,
	} = attributes;

	const withContent = 'none' !== contentMode;

	// `width` and `thickness` are TIER OBJECTS (Spec 35 pass 2, 2026-08-11) — ONE
	// attr each holding {desktop,tablet,mobile}; the old widthTablet/widthMobile/
	// thicknessTablet/thicknessMobile sibling attrs no longer exist. The editor
	// canvas preview only ever showed the DESKTOP value (it never rendered a
	// live @media preview), so it reads the desktop tier here.
	const widthDesktop = width?.desktop ?? '';
	const thicknessDesktop = thickness?.desktop ?? '';

	// ---- Editor-canvas preview (mirrors render.php's scoped output) ----
	const lineDecls = {};
	if ( 'none' === lineStyle ) {
		lineDecls.borderBottom = '0 none transparent';
	} else {
		lineDecls.borderBottomStyle = lineStyle;
		lineDecls.borderBottomWidth =
			composeUnit( thicknessDesktop, thicknessUnit ) || undefined;
		if ( gradientEnabled && gradientColourStart && gradientColourEnd ) {
			const start = /^#|^rgb|^hsl|^var\(/.test( gradientColourStart )
				? gradientColourStart
				: colourVar( gradientColourStart );
			const end = /^#|^rgb|^hsl|^var\(/.test( gradientColourEnd )
				? gradientColourEnd
				: colourVar( gradientColourEnd );
			lineDecls.borderImage = `linear-gradient(${ gradientAngle }deg, ${ start }, ${ end }) 1`;
			lineDecls.borderBottomColor = 'transparent';
		} else if ( colour ) {
			lineDecls.borderBottomColor = /^#|^rgb|^hsl|^var\(/.test( colour )
				? colour
				: colourVar( colour );
		}
	}

	const rootPreviewStyle = {
		width: composeUnit( widthDesktop, widthUnit ) || undefined,
		...alignmentMargin( alignment ),
		opacity:
			'number' === typeof opacity && 100 !== opacity
				? opacity / 100
				: undefined,
	};

	const paddingPreview = boxShorthand( style?.spacing?.padding, [
		'top',
		'right',
		'bottom',
		'left',
	] );
	if ( paddingPreview ) {
		rootPreviewStyle.padding = paddingPreview;
	}
	const marginProps = alignmentMargin( alignment );
	const marginPreview = boxShorthand( style?.spacing?.margin, [
		'top',
		'right',
		'bottom',
		'left',
	] );
	if ( marginPreview ) {
		// Combine explicit margin (top/bottom) with the alignment-driven
		// left/right so both are respected in the preview.
		const [ mTop, , mBottom ] = marginPreview.split( ' ' );
		rootPreviewStyle.marginTop = mTop;
		rootPreviewStyle.marginBottom = mBottom;
		rootPreviewStyle.marginLeft = marginProps.marginLeft;
		rootPreviewStyle.marginRight = marginProps.marginRight;
	}

	const previewStyle = withContent
		? { ...rootPreviewStyle, '--sgs-separator-content-gap': '16px' }
		: { ...rootPreviewStyle, ...lineDecls };

	const blockProps = useBlockProps( {
		as: withContent ? 'div' : 'hr',
		className: withContent ? 'sgs-separator--with-content' : undefined,
		style: previewStyle,
	} );

	const handleIconChange = ( { source, name } ) => {
		const next = { contentIconSource: source };
		if ( 'emoji' === source ) {
			next.contentIconEmoji = name;
		} else if ( 'dashicon' === source ) {
			next.contentIconDashicon = name;
		} else if ( 'wp-icon' === source ) {
			next.contentIconWpIcon = name;
		} else {
			next.contentIconName = name;
		}
		setAttributes( next );
	};

	const lineSpanStyle = withContent ? lineDecls : undefined;

	return (
		<>
			<InspectorControls>
				{ /* ---- Line ---- */ }
				<ToolsPanel
					label={ __( 'Line', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							lineStyle: 'solid',
							// `thickness` is a TIER OBJECT (Spec 35 pass 2) — reset
							// to the declared default shape, not a bare scalar +
							// undefined siblings that no longer exist as attrs.
							thickness: { desktop: 1 },
							thicknessUnit: 'px',
							colour: '',
							opacity: 100,
							gradientEnabled: false,
							gradientColourStart: '',
							gradientColourEnd: '',
							gradientAngle: 90,
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Line style', 'sgs-blocks' ) }
						hasValue={ () => lineStyle !== 'solid' }
						onDeselect={ () => setAttributes( { lineStyle: 'solid' } ) }
						isShownByDefault
					>
						<SelectControl
							label={ __( 'Line style', 'sgs-blocks' ) }
							value={ lineStyle }
							options={ LINE_STYLE_OPTIONS }
							onChange={ ( val ) =>
								setAttributes( { lineStyle: val } )
							}
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>

					{ /*
					  `thickness` is a TIER OBJECT (Spec 35 pass 2) — ONE attr
					  holding {desktop,tablet,mobile}, so it uses
					  <ResponsiveOverride> rather than the old breakpoint-keyed
					  attrMap. The per-tier VALUE stays a bare NUMBER paired with
					  the block-level `thicknessUnit` (tier axis and unit are
					  separate concerns — matches sgs/responsive-logo's maxWidth).
					*/ }
					<ToolsPanelItem
						label={ __( 'Thickness', 'sgs-blocks' ) }
						hasValue={ () =>
							!! (
								thickness &&
								Object.values( thickness ).some(
									( v ) => v !== undefined && v !== null && v !== ''
								)
							)
						}
						onDeselect={ () =>
							setAttributes( { thickness: { desktop: 1 } } )
						}
						isShownByDefault
					>
						<ResponsiveOverride
							label={ __( 'Thickness', 'sgs-blocks' ) }
							value={ thickness }
							onChange={ ( obj ) =>
								setAttributes( { thickness: obj } )
							}
						>
							{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
								<UnitControl
									label={ __( 'Thickness', 'sgs-blocks' ) }
									hideLabelFromVision
									value={ composeUnit( ownValue, thicknessUnit ) }
									placeholder={
										inherited
											? composeUnit( effectiveValue, thicknessUnit )
											: ''
									}
									units={ THICKNESS_UNITS }
									onChange={ ( raw ) => {
										const { num, unit } = parseUnit(
											raw,
											thicknessUnit
										);
										setOwnValue( num === undefined ? '' : num );
										setAttributes( { thicknessUnit: unit } );
									} }
									__nextHasNoMarginBottom
								/>
							) }
						</ResponsiveOverride>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Colour', 'sgs-blocks' ) }
						hasValue={ () => !! colour }
						onDeselect={ () => setAttributes( { colour: '' } ) }
						isShownByDefault
					>
						<DesignTokenPicker
							label={ __( 'Colour', 'sgs-blocks' ) }
							value={ colour }
							onChange={ ( val ) =>
								setAttributes( { colour: val ?? '' } )
							}
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Opacity (%)', 'sgs-blocks' ) }
						hasValue={ () => opacity !== 100 }
						onDeselect={ () => setAttributes( { opacity: 100 } ) }
					>
						<RangeControl
							label={ __( 'Opacity (%)', 'sgs-blocks' ) }
							value={ opacity }
							onChange={ ( val ) =>
								setAttributes( { opacity: val } )
							}
							min={ 0 }
							max={ 100 }
							step={ 1 }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Gradient line', 'sgs-blocks' ) }
						hasValue={ () =>
							gradientEnabled !== false ||
							!! gradientColourStart ||
							!! gradientColourEnd ||
							gradientAngle !== 90
						}
						onDeselect={ () =>
							setAttributes( {
								gradientEnabled: false,
								gradientColourStart: '',
								gradientColourEnd: '',
								gradientAngle: 90,
							} )
						}
					>
						<ToggleControl
							label={ __( 'Gradient line', 'sgs-blocks' ) }
							checked={ gradientEnabled }
							onChange={ ( val ) =>
								setAttributes( { gradientEnabled: val } )
							}
							__nextHasNoMarginBottom
						/>
						{ gradientEnabled && (
							<>
								<DesignTokenPicker
									label={ __(
										'Gradient start colour',
										'sgs-blocks'
									) }
									value={ gradientColourStart }
									onChange={ ( val ) =>
										setAttributes( {
											gradientColourStart: val ?? '',
										} )
									}
								/>
								<DesignTokenPicker
									label={ __(
										'Gradient end colour',
										'sgs-blocks'
									) }
									value={ gradientColourEnd }
									onChange={ ( val ) =>
										setAttributes( {
											gradientColourEnd: val ?? '',
										} )
									}
								/>
								<RangeControl
									label={ __( 'Gradient angle', 'sgs-blocks' ) }
									value={ gradientAngle }
									onChange={ ( val ) =>
										setAttributes( { gradientAngle: val } )
									}
									min={ 0 }
									max={ 360 }
									step={ 1 }
									__nextHasNoMarginBottom
								/>
							</>
						) }
					</ToolsPanelItem>
				</ToolsPanel>

				{ /* ---- Size & alignment ---- */ }
				<PanelBody
					title={ __( 'Size & alignment', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /*
					  `width` is a TIER OBJECT (Spec 35 pass 2) — same pattern as
					  `thickness` above.
					*/ }
					<ResponsiveOverride
						label={ __( 'Width', 'sgs-blocks' ) }
						value={ width }
						onChange={ ( obj ) => setAttributes( { width: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<UnitControl
								label={ __( 'Width', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ composeUnit( ownValue, widthUnit ) }
								placeholder={
									inherited
										? composeUnit( effectiveValue, widthUnit )
										: ''
								}
								units={ WIDTH_UNITS }
								onChange={ ( raw ) => {
									const { num, unit } = parseUnit(
										raw,
										widthUnit
									);
									setOwnValue( num === undefined ? '' : num );
									setAttributes( { widthUnit: unit } );
								} }
								__nextHasNoMarginBottom
							/>
						) }
					</ResponsiveOverride>
					<SelectControl
						label={ __( 'Alignment', 'sgs-blocks' ) }
						help={ __(
							'Position when width is less than 100%.',
							'sgs-blocks'
						) }
						value={ alignment }
						options={ ALIGNMENT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { alignment: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ---- Content ---- */ }
				<PanelBody
					title={ __( 'Content', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Content in middle', 'sgs-blocks' ) }
						value={ contentMode }
						options={ CONTENT_MODE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { contentMode: val } )
						}
						__nextHasNoMarginBottom
					/>

					{ 'icon' === contentMode && (
						<>
							<IconPicker
								label={ __( 'Icon', 'sgs-blocks' ) }
								value={ {
									source: attributes.contentIconSource,
									name: currentIconName( attributes ),
								} }
								onChange={ handleIconChange }
							/>
							<RangeControl
								label={ __( 'Icon size (px)', 'sgs-blocks' ) }
								value={ contentIconSize }
								onChange={ ( val ) =>
									setAttributes( { contentIconSize: val } )
								}
								min={ 12 }
								max={ 96 }
								step={ 2 }
								__nextHasNoMarginBottom
							/>
							<DesignTokenPicker
								label={ __( 'Icon colour', 'sgs-blocks' ) }
								value={ contentColour }
								onChange={ ( val ) =>
									setAttributes( {
										contentColour: val ?? '',
									} )
								}
							/>
						</>
					) }

					{ 'text' === contentMode && (
						<>
							<TextControl
								label={ __( 'Label text', 'sgs-blocks' ) }
								value={ contentText }
								onChange={ ( val ) =>
									setAttributes( { contentText: val } )
								}
								placeholder={ __( 'OR', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
							/>
							<DesignTokenPicker
								label={ __( 'Text colour', 'sgs-blocks' ) }
								value={ contentColour }
								onChange={ ( val ) =>
									setAttributes( {
										contentColour: val ?? '',
									} )
								}
							/>
							<TypographyControls
								attributes={ attributes }
								setAttributes={ setAttributes }
								prefix="content"
							/>
						</>
					) }
				</PanelBody>

				{ /* ---- Spacing ---- Box-object interface contract §B/§E: padding/
				   margin base routes to WP-native style.spacing.* (scoped, not
				   inline); tiers are the paddingTablet/paddingMobile +
				   marginTablet/marginMobile object attrs. */ }
				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						values={ {
							base: style?.spacing?.padding ?? {},
							tablet: paddingTablet ?? {},
							mobile: paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( {
									style: {
										...style,
										spacing: {
											...style?.spacing,
											padding: next,
										},
									},
								} );
							} else {
								setAttributes( {
									[ `padding${
										'tablet' === tier ? 'Tablet' : 'Mobile'
									}` ]: next,
								} );
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
								setAttributes( {
									style: {
										...style,
										spacing: {
											...style?.spacing,
											margin: next,
										},
									},
								} );
							} else {
								setAttributes( {
									[ `margin${
										'tablet' === tier ? 'Tablet' : 'Mobile'
									}` ]: next,
								} );
							}
						} }
					/>
				</PanelBody>
			</InspectorControls>

			{ withContent ? (
				<div { ...blockProps }>
					<span
						className="sgs-separator__line"
						style={ lineSpanStyle }
						aria-hidden="true"
					/>
					<span className="sgs-separator__content">
						{ 'icon' === contentMode && (
							<span
								className="sgs-separator__icon"
								aria-hidden="true"
								style={ {
									'--sgs-separator-icon-size': `${ contentIconSize }px`,
									color: contentColour
										? colourVar( contentColour )
										: undefined,
								} }
							>
								<IconPreview
									source={ attributes.contentIconSource }
									name={ currentIconName( attributes ) }
									size={ contentIconSize }
								/>
							</span>
						) }
						{ 'text' === contentMode && (
							<span
								style={ {
									color: contentColour
										? colourVar( contentColour )
										: undefined,
								} }
							>
								{ contentText || __( 'Label…', 'sgs-blocks' ) }
							</span>
						) }
					</span>
					<span
						className="sgs-separator__line"
						style={ lineSpanStyle }
						aria-hidden="true"
					/>
				</div>
			) : (
				<hr { ...blockProps } />
			) }
		</>
	);
}
