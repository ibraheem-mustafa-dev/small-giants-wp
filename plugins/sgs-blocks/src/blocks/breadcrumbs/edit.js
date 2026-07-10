import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
} from '@wordpress/components';
import { DesignTokenPicker, ResponsiveBoxControl } from '../../components';
import { colourVar } from '../../utils';

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
	const paddingPreview = boxShorthand( style?.spacing?.padding, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		rootStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( style?.spacing?.margin, [ 'top', 'right', 'bottom', 'left' ] );
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
		separatorColour,
		currentColour,
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
						/>
					) }
					<SelectControl
						label={ __( 'Separator', 'sgs-blocks' ) }
						value={ separator }
						options={ SEPARATOR_OPTIONS }
						onChange={ ( val ) => setAttributes( { separator: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ── Colour panel ── the SGS custom colour attrs for the link /
				   separator / current-crumb slots (distinct from the native WP
				   text/background/link colour supports, which cover the whole
				   block). ── */ }
				<PanelBody title={ __( 'Colour', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Link colour', 'sgs-blocks' ) }
						value={ linkColour }
						onChange={ ( val ) => setAttributes( { linkColour: val ?? '' } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Separator colour', 'sgs-blocks' ) }
						value={ separatorColour }
						onChange={ ( val ) => setAttributes( { separatorColour: val ?? '' } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Current page colour', 'sgs-blocks' ) }
						value={ currentColour }
						onChange={ ( val ) => setAttributes( { currentColour: val ?? '' } ) }
					/>
				</PanelBody>

				{ /* ── Spacing panel ── Box-object interface contract §B/§E:
				   padding/margin base routes to WP-native style.spacing.* (mirrors
				   sgs/heading + sgs/quote); tiers are the paddingTablet/paddingMobile
				   + marginTablet/marginMobile object attrs. The spacing support
				   declares __experimentalSkipSerialization so base serialises
				   scoped, not inline. ── */ }
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
					<li className="sgs-breadcrumbs__item sgs-breadcrumbs__item--current" aria-current="page">
						{ __( 'Current Page', 'sgs-blocks' ) }
					</li>
				</ol>
			</nav>
		</>
	);
}
