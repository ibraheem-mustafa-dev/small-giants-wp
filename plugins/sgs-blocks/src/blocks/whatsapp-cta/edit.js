import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { TypographyControls, ResponsiveBoxControl, ResponsiveBorderRadiusControl, SgsColourPanel, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl, textRow } from '../../components';
import { colourVar, resolveTextColourPreviewStyle } from '../../utils';
import { VariantContent, cardColourRows, CardTypographyPanel } from './card-fields';
import { FloatingPanel } from './floating-panel';
import { buildRootStyle, buildRootClassName } from './preview-style';

const VARIANT_OPTIONS = [
	{ label: __( 'Inline button', 'sgs-blocks' ), value: 'inline' },
	{ label: __( 'Floating button', 'sgs-blocks' ), value: 'floating' },
	{ label: __( 'Banner', 'sgs-blocks' ), value: 'banner' },
	{ label: __( 'Card', 'sgs-blocks' ), value: 'card' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		phoneNumber,
		message,
		variant,
		label,
		showOn,
		backgroundColour,
		backgroundColourGradient,
		backgroundColourHover,
		backgroundColourHoverGradient,
		borderRadius,
		padding,
		margin,
		labelColour,
		labelColourGradient,
		cardBorderColour,
		cardBorderWidth,
		cardBorderStyle,
	} = attributes;

	// Visibility — tier object attr (D777/S2 fix). Only desktop/mobile ever
	// existed here (no tablet toggle in this UI, no tablet @media rule in
	// style.css) — preserved exactly, not widened to a third tier.
	const showOnMobile = showOn?.mobile ?? true;
	const showOnDesktop = showOn?.desktop ?? true;

	// Preview style/className building is extracted to preview-style.js —
	// pure functions, no JSX — to keep this file under the JS line budget.
	// CHECK A (check-editor-render-parity.js): the object below names every
	// attribute the preview reads EXPLICITLY, rather than handing the whole
	// `attributes` blob to buildRootStyle() — a wholesale pass-through
	// renders correctly but is invisible to CHECK A's traceability scan
	// (CLAUDE.md "Editor-canvas mirrors" trap 1).
	const blockProps = useBlockProps( {
		className: buildRootClassName( { variant, showOnMobile, showOnDesktop } ),
		style: buildRootStyle( {
			padding,
			margin,
			borderRadius,
			labelColour,
			labelColourGradient,
			backgroundColour,
			backgroundColourGradient,
			variant,
			cardBorderColour,
			cardBorderWidth,
			cardBorderStyle,
		}, colourVar, resolveTextColourPreviewStyle ),
	} );

	return (
		<>
			<SgsColourPanel
				rows={ [
					textRow( {
						key: 'label',
						label: __( 'Text colour', 'sgs-blocks' ),
						attrs: {
							base: 'labelColour',
							hover: 'labelColourHover',
							gradient: 'labelColourGradient',
							hoverGradient: 'labelColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					{
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: backgroundColour,
								onChange: ( val ) => setAttributes( { backgroundColour: val ?? '' } ),
								linked: true,
								gradientValue: backgroundColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { backgroundColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: backgroundColourHover,
								onChange: ( val ) =>
									setAttributes( { backgroundColourHover: val ?? '' } ),
								linked: true,
								gradientValue: backgroundColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { backgroundColourHoverGradient: val ?? '' } ),
							},
						],
					},
					...( 'card' === variant ? cardColourRows( { attributes, setAttributes } ) : [] ),
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'WhatsApp Settings', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Phone number', 'sgs-blocks' ) }
						help={ __(
							'International format without + or spaces (e.g. 447700900000)',
							'sgs-blocks'
						) }
						value={ phoneNumber || '' }
						onChange={ ( val ) =>
							setAttributes( { phoneNumber: val } )
						}
						type="tel"
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextareaControl
						label={ __(
							'Pre-filled message',
							'sgs-blocks'
						) }
						value={ message || '' }
						onChange={ ( val ) =>
							setAttributes( { message: val } )
						}
						rows={ 2 }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Variant', 'sgs-blocks' ) }
						value={ variant }
						options={ VARIANT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { variant: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ 'floating' === variant && (
					<FloatingPanel attributes={ attributes } setAttributes={ setAttributes } />
				) }

				<PanelBody
					title={ __( 'Visibility', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Show on mobile', 'sgs-blocks' ) }
						checked={ showOnMobile }
						onChange={ ( val ) =>
							setAttributes( { showOn: { ...showOn, mobile: val } } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show on desktop', 'sgs-blocks' ) }
						checked={ showOnDesktop }
						onChange={ ( val ) =>
							setAttributes( { showOn: { ...showOn, desktop: val } } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TypographyControls fontSizePresets showFontFamily showDecoration showTransform showLetterSpacing showTextAlign showTextWrap showTextColumns showTextIndent showWritingMode
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="label"
					/>
				</PanelBody>

				{ 'card' === variant && (
					<CardTypographyPanel attributes={ attributes } setAttributes={ setAttributes } />
				) }

				{ /* ── Spacing panel ── padding/margin are each a single block-owned
				   tier-object attr { desktop, tablet, mobile }, written via
				   ResponsiveOverride + SgsBoxControl; read by SGS_Container_Wrapper's
				   tier-object emission path. */ }
				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
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

				{ /* ── Border panel ── border-radius is a single block-owned
				   TIER-of-BOXES envelope attr { desktop, tablet, mobile }
				   (folded 2026-09-11 from the wrong 3-sibling shape — no more
				   WP-native style.border.radius, retired the same day this
				   block's margin/padding went private). Same envelope +
				   fold pattern as sgs/star-rating's already-shipped
				   borderRadius migration. */ }
				<PanelBody
					title={ __( 'Border', 'sgs-blocks' ) }
					initialOpen={ false }
				>
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

			{ /* ── Canvas ── contract §B3: no wrapper div. The button preview
			   element IS the block root (an <a> on the frontend; a <span>
			   here since the editor canvas must not be a real navigable
			   link). The "no phone number" warning is a sibling — it mirrors
			   render.php's early `return;` (nothing renders on the frontend
			   when unset), so it has no frontend equivalent to match. ── */ }
			<span { ...blockProps }>
				<VariantContent attributes={ attributes } setAttributes={ setAttributes } />
			</span>

			{ ! phoneNumber && (
				<p className="sgs-whatsapp-cta__warning">
					{ __(
						'Set a phone number in the sidebar.',
						'sgs-blocks'
					) }
				</p>
			) }
		</>
	);
}
