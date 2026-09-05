import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
} from '@wordpress/components';
import { SgsColourPanel, ResponsiveBoxControl, TypographyControls, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl } from '../../components';
import { colourVar, resolveTextColourPreviewStyle } from '../../utils';

const SEPARATOR_OPTIONS = [
	{ label: '/', value: '/' },
	{ label: '›', value: '›' },
	{ label: '»', value: '»' },
	{ label: '→', value: '→' },
	{ label: '|', value: '|' },
];

// Box-object interface contract §1: a 4-side box is an object with named
// keys, each an already-unit-bearing CSS length string or absent (unset
// side). Build an editor-preview shorthand from the object — mirrors
// render.php's box-shorthand builder so the canvas preview matches the
// frontend (contract §5).
function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

/** Build the root's inline preview style for the editor canvas (mirrors render.php's scoped root declarations). */
function buildRootStyle( attributes ) {
	const { linkColour, separatorColour, currentColour, style } = attributes;
	const rootStyle = {
		'--sgs-breadcrumbs-link-colour': colourVar( linkColour ) || undefined,
		'--sgs-breadcrumbs-separator-colour': colourVar( separatorColour ) || undefined,
		'--sgs-breadcrumbs-current-colour': colourVar( currentColour ) || undefined,
	};

	// Base padding/margin preview — WP-native style.spacing.* objects
	// (contract §B; box-model order top/right/bottom/left).
	const paddingPreview = boxShorthand( padding, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		rootStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( margin, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) {
		rootStyle.margin = marginPreview;
	}

	return Object.fromEntries(
		Object.entries( rootStyle ).filter( ( [ , v ] ) => v !== undefined )
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		style,
		separator,
		showHome,
		homeLabel,
		linkColour,
		linkColourGradient,
		separatorColour,
		separatorColourGradient,
		currentColour,
		currentColourGradient,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
	} = attributes;

	// Contract §B3: NO wrapper <div> — the <nav> IS the block root (matches
	// render.php). The editor-canvas preview style carries the same custom
	// colour properties + base spacing box preview the frontend emits scoped.
	const blockProps = useBlockProps( {
		className: 'sgs-breadcrumbs',
		style: buildRootStyle( attributes ),
	} );

	return (
		<>
			{ /* D618/D609 — ONE grouped, SGS-OWNED colour panel (own PanelBody,
			   default InspectorControls group), rendered FIRST so it sits at
			   the top of the inspector. Replaces the old inline "Colour"
			   PanelBody below; `supports.color` sub-flags are now false so
			   WordPress generates no native colour UI to overlap with this
			   panel. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'link',
						label: __( 'Link colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: linkColour,
								onChange: ( val ) => setAttributes( { linkColour: val ?? '' } ),
								gradientValue: linkColourGradient,
								onGradientChange: ( val ) => setAttributes( { linkColourGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'separator',
						label: __( 'Separator colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: separatorColour,
								onChange: ( val ) => setAttributes( { separatorColour: val ?? '' } ),
								gradientValue: separatorColourGradient,
								onGradientChange: ( val ) => setAttributes( { separatorColourGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'current',
						label: __( 'Current page colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: currentColour,
								onChange: ( val ) => setAttributes( { currentColour: val ?? '' } ),
								gradientValue: currentColourGradient,
								onGradientChange: ( val ) => setAttributes( { currentColourGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Breadcrumbs Settings', 'sgs-blocks' ) }>
					<ToggleControl
						label={ __( 'Show home link', 'sgs-blocks' ) }
						checked={ showHome }
						onChange={ ( val ) => setAttributes( { showHome: val } ) }
						__nextHasNoMarginBottom
					/>
					{ showHome && (
						<TextControl
							label={ __( 'Home label', 'sgs-blocks' ) }
							value={ homeLabel }
							onChange={ ( val ) => setAttributes( { homeLabel: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
					<SelectControl
						label={ __( 'Separator', 'sgs-blocks' ) }
						value={ separator }
						options={ SEPARATOR_OPTIONS }
						onChange={ ( val ) => setAttributes( { separator: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ /* ── Spacing panel ── Box-object interface contract §B/§E:
				   padding/margin base routes to WP-native style.spacing.* (mirrors
				   sgs/heading + sgs/quote); tiers are the paddingTablet/paddingMobile
				   + marginTablet/marginMobile object attrs. The spacing support
				   declares __experimentalSkipSerialization so base serialises
				   scoped, not inline. ── */ }
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
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				{ /* Typography — replaces the old WP-native supports.typography
				   (fontSize only) with the shared TypographyControls component +
				   sgs_typography_css_rule() render.php helper (D971/D972
				   full-replacement track). Root prefix "" since this is a
				   single-target block; defaults also expose weight/style/line-
				   height, which native typography never offered here. */ }
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
					/>
				</PanelBody>
			</InspectorControls>

			<nav { ...blockProps } aria-label={ __( 'Breadcrumbs', 'sgs-blocks' ) }>
				<ol className="sgs-breadcrumbs__list">
					{ showHome && (
						<li className="sgs-breadcrumbs__item">
							<a href="#">{ homeLabel }</a>
							<span className="sgs-breadcrumbs__separator" aria-hidden="true">{ separator }</span>
						</li>
					) }
					<li className="sgs-breadcrumbs__item">
						<a href="#">{ __( 'Parent Page', 'sgs-blocks' ) }</a>
						<span className="sgs-breadcrumbs__separator" aria-hidden="true">{ separator }</span>
					</li>
					<li
						className="sgs-breadcrumbs__item sgs-breadcrumbs__item--current"
						aria-current="page"
						style={ resolveTextColourPreviewStyle( currentColour, currentColourGradient, colourVar ) }
					>
						{ __( 'Current Page', 'sgs-blocks' ) }
					</li>
				</ol>
			</nav>
		</>
	);
}
