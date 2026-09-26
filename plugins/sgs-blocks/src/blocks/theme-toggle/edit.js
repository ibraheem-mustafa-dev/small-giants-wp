import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, useSetting } from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl, ToggleControl, Notice } from '@wordpress/components';
import {
	SgsColourPanel,
	fillRow,
	textRow,
	TypographyControls,
	ResponsiveControl,
	ResponsiveOverride,
	ResponsiveBorderRadiusControl,
	SgsBorderControl,
	SgsBoxControl,
	BOX_UNITS,
	normaliseResponsiveBox,
	IconPicker,
} from '../../components';

const TOGGLE_STYLE_OPTIONS = [
	{ label: __( 'Switch', 'sgs-blocks' ), value: 'switch' },
	{ label: __( 'Segmented (light / dark / auto)', 'sgs-blocks' ), value: 'segmented' },
];

const LABEL_ROLL_OPTIONS = [
	{ label: __( 'Off', 'sgs-blocks' ), value: '' },
	{ label: __( 'Roll up', 'sgs-blocks' ), value: 'up' },
	{ label: __( 'Roll up + scale', 'sgs-blocks' ), value: 'up-scale' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		toggleStyle,
		label,
		labelRoll,
		iconOnly,
		iconLight,
		iconDark,
		textColour,
		textColourHover,
		textColourPressed,
		iconColour,
		iconColourHover,
		backgroundColour,
		backgroundColourHover,
		borderColour,
		borderWidth,
		borderStyle,
		borderRadius,
		padding,
	} = attributes;

	// Site-level dark palette check (D.5): render.php emits nothing on the frontend
	// (bar an editor comment) when the site has no derived dark palette — this mirrors
	// that check here so the notice always matches what the canvas/frontend actually do.
	const darkPalette = useSetting( 'custom.dark' );
	const hasDarkPalette = !! ( darkPalette && Object.keys( darkPalette ).length );

	const blockProps = useBlockProps( {
		className: 'sgs-theme-toggle-preview',
	} );

	const iconOnlyDesktop = iconOnly?.desktop ?? false;
	const iconOnlyTablet = iconOnly?.tablet ?? false;
	const iconOnlyMobile = iconOnly?.mobile ?? false;

	// Contrast check for border colour — warn if border fails WCAG 3:1 contrast
	// against the block's own background. When the background is a gradient,
	// the flat backgroundColour is not rendered, so skip the check in that case.
	const themeToggleContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient
			? attributes.backgroundColour
			: '';

	return (
		<>
			<SgsColourPanel
				rows={ [
					textRow( {
						key: 'label',
						label: __( 'Label colour', 'sgs-blocks' ),
						attrs: {
							base: 'textColour',
							hover: 'textColourHover',
							current: 'textColourPressed',
						},
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'icon',
						label: __( 'Icon colour', 'sgs-blocks' ),
						attrs: {
							base: 'iconColour',
							hover: 'iconColourHover',
						},
						attributes,
						setAttributes,
					} ),
					fillRow( {
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						attrs: {
							base: 'backgroundColour',
							hover: 'backgroundColourHover',
						},
						attributes,
						setAttributes,
					} ),
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Theme Toggle Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Style', 'sgs-blocks' ) }
						value={ toggleStyle }
						options={ TOGGLE_STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { toggleStyle: val } ) }
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
					{ 'switch' === toggleStyle && (
						<>
							<SelectControl
								label={ __( 'Label roll', 'sgs-blocks' ) }
								value={ labelRoll }
								options={ LABEL_ROLL_OPTIONS }
								onChange={ ( val ) => setAttributes( { labelRoll: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<IconPicker
								label={ __( 'Light-mode icon', 'sgs-blocks' ) }
								value={ iconLight }
								onChange={ ( val ) => setAttributes( { iconLight: val } ) }
							/>
							<IconPicker
								label={ __( 'Dark-mode icon', 'sgs-blocks' ) }
								value={ iconDark }
								onChange={ ( val ) => setAttributes( { iconDark: val } ) }
							/>
						</>
					) }
					{ ! hasDarkPalette && (
						<Notice status="warning" isDismissible={ false } className="sgs-theme-toggle-notice">
							{ __(
								'Dark colours are off for this site — this block will not render on the frontend until an automatic dark palette is enabled for this client (_sgsDark.enabled in the theme snapshot).',
								'sgs-blocks'
							) }
						</Notice>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Icon-only', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveControl label={ __( 'Icon only (hide the label visually)', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<ToggleControl
								checked={
									'desktop' === breakpoint
										? iconOnlyDesktop
										: 'tablet' === breakpoint
										? iconOnlyTablet
										: iconOnlyMobile
								}
								onChange={ ( val ) =>
									setAttributes( { iconOnly: { ...iconOnly, [ breakpoint ]: val } } )
								}
								__nextHasNoMarginBottom
							/>
						) }
					</ResponsiveControl>
				</PanelBody>
			</InspectorControls>

			{ /* Styles tab (Spec 35 PART O, THE PLACEMENT RULE) */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						fontSizePresets
						showFontFamily
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="label"
					/>
				</PanelBody>

				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveOverride
						value={ padding }
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
				</PanelBody>

				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ borderWidth }
						onWidthChange={ ( val ) => setAttributes( { borderWidth: val } ) }
						styleValue={ borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourValue={ borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourLinked
						contrastAgainst={ themeToggleContrastAgainst }
					/>
					<ResponsiveBorderRadiusControl
						label={ __( 'Border radius', 'sgs-blocks' ) }
						values={ {
							base: borderRadius?.desktop ?? {},
							tablet: borderRadius?.tablet ?? {},
							mobile: borderRadius?.mobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							const key = 'base' === tier ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ 'switch' === toggleStyle ? (
					<button
						type="button"
						className="sgs-theme-toggle sgs-dark-mode-toggle"
						aria-pressed="false"
						disabled
					>
						<span className="sgs-theme-toggle__icon sgs-icon-sun" aria-hidden="true" />
						<span className="sgs-theme-toggle__icon sgs-icon-moon" aria-hidden="true" />
						<span className="sgs-theme-toggle__label">{ label }</span>
					</button>
				) : (
					<div className="sgs-theme-toggle sgs-theme-toggle--segmented" role="radiogroup" aria-label={ __( 'Colour scheme', 'sgs-blocks' ) }>
						<button type="button" role="radio" aria-checked="false" disabled>
							{ __( 'Light', 'sgs-blocks' ) }
						</button>
						<button type="button" role="radio" aria-checked="false" disabled>
							{ __( 'Dark', 'sgs-blocks' ) }
						</button>
						<button type="button" role="radio" aria-checked="true" disabled>
							{ __( 'Auto', 'sgs-blocks' ) }
						</button>
					</div>
				) }
			</div>
		</>
	);
}
