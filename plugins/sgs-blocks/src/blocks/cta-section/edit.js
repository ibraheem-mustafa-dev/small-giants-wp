import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	Button,
	RangeControl,
	BoxControl,
} from '@wordpress/components';
import MediaPicker from '../../components/MediaPicker';
import { resolveShadowPreviewComposed } from '../../utils/tokens';
import { ResponsiveBoxControl, ResponsiveOverride, ShadowControl, SgsColourPanel, BOX_UNITS, normaliseResponsiveBox } from '../../components';
// No-inline migration (2026-07-09): cta-section no longer uses the default
// <ContainerWrapperControls> aggregator wholesale — its ResponsiveSpacingPanel /
// ContentBandPanel sub-panels still write to LEGACY FLAT attrs
// (paddingTopTablet.../contentBandPaddingTop...), which became dead controls once
// paddingTablet/paddingMobile/marginTablet/marginMobile/contentBandPadding* became
// box OBJECT attrs (matches sgs/container's own edit.js, which took the same
// approach). Import the individual panels still needed instead, and roll cta-section's
// own "Padding & margin" / "Content band" panels below using ResponsiveBoxControl
// bound to the new object attrs.
import {
	WidthPanel,
	LayoutPanel,
	BackgroundPanel,
	ShapeDividersPanel,
	GridItemDefaultsPanel,
	MIN_HEIGHT_OPTIONS,
} from '../container/components/ContainerWrapperControls';

// FR-22-6: the content column is now InnerBlocks — heading + body text + buttons.
// Headline/body are no longer scalar attrs read by render.php; they are authored
// directly as child sgs/heading + sgs/text blocks. The body sgs/text carries the
// .sgs-cta-section__body class so the responsive font-size <style> still targets it.
const CTA_TEMPLATE = [
	[ 'sgs/heading', { level: 'h2', className: 'sgs-cta-section__headline' } ],
	[ 'sgs/text', { className: 'sgs-cta-section__body' } ],
	[
		'sgs/multi-button',
		{},
		[
			[
				'sgs/button',
				{ inheritStyle: 'primary', label: 'Primary Action' },
			],
			[
				'sgs/button',
				{ inheritStyle: 'secondary', label: 'Secondary Action' },
			],
		],
	],
];

const CTA_ALLOWED_BLOCKS = [ 'sgs/heading', 'sgs/text', 'sgs/multi-button' ];

const LAYOUT_OPTIONS = [
	{ label: __( 'Centred', 'sgs-blocks' ), value: 'centred' },
	{ label: __( 'Left-aligned', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Split', 'sgs-blocks' ), value: 'split' },
];

export default function Edit( { attributes, setAttributes, name } ) {
	const {
		ribbon,
		layout, // legacy (pre-WS-4) — now the container grid/flex attr; read for old-post fallback only
		contentLayout,
		backgroundImage,
		backgroundMedia,
		backgroundImageOpacity,
		gradientPreset,
		stats,
	} = attributes;

	// WS-4: cta-section's own layout (centred/left/split) renamed to `contentLayout`
	// (the container owns `layout` = grid/flex). Fall back to the legacy value so
	// old posts render correctly in the editor before they round-trip.
	const ctaLayout = contentLayout || layout || 'centred';

	// Hydrate the active media from the new unified slot first, falling back to
	// the legacy backgroundImage object for posts that have not yet round-tripped
	// through the editor.
	const resolveActiveMedia = () => {
		if ( backgroundMedia && backgroundMedia.url ) {
			return backgroundMedia;
		}
		if ( backgroundImage && backgroundImage.url ) {
			return {
				url: backgroundImage.url,
				type: 'image',
				id: backgroundImage.id || 0,
				alt: backgroundImage.alt || '',
				mime: 'image/jpeg',
			};
		}
		return null;
	};
	const activeMedia = resolveActiveMedia();

	const className = [
		'sgs-cta-section',
		`sgs-cta-section--${ ctaLayout }`,
		gradientPreset ? `sgs-cta-section--gradient-${ gradientPreset }` : '',
	]
		.filter( Boolean )
		.join( ' ' );

	const wrapperStyle = {};
	if ( activeMedia && activeMedia.type === 'image' && activeMedia.url ) {
		wrapperStyle.backgroundImage = `url(${ activeMedia.url })`;
		wrapperStyle.backgroundSize = 'cover';
		wrapperStyle.backgroundPosition = 'center';
	}
	// Editor-canvas parity for cta-section's OWN scoped shadow (rendered
	// independent of the shared wrapper — see render.php's C3 guard). Shape
	// (`shadow`) + colour (`shadowColour`) are separate attrs since D621/D622;
	// the composed resolver mirrors sgs_shadow_value_composed() in PHP.
	const shadowPreview = resolveShadowPreviewComposed( attributes.shadow, attributes.shadowColour );
	if ( shadowPreview ) {
		wrapperStyle.boxShadow = shadowPreview;
	}

	const blockProps = useBlockProps( {
		className,
		style: wrapperStyle,
	} );

	// The content column hosts the InnerBlocks (heading + body + buttons),
	// mirroring the render.php <div class="sgs-cta-section__content"> wrapper.
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-cta-section__content' },
		{
			template: CTA_TEMPLATE,
			templateLock: false,
			allowedBlocks: CTA_ALLOWED_BLOCKS,
		}
	);

	const addStat = () => {
		setAttributes( {
			stats: [ ...stats, { text: '' } ],
		} );
	};

	const updateStat = ( index, text ) => {
		const updated = [ ...stats ];
		updated[ index ] = { text };
		setAttributes( { stats: updated } );
	};

	const removeStat = ( index ) => {
		setAttributes( {
			stats: stats.filter( ( _, i ) => i !== index ),
		} );
	};

	return (
		<>
			{ /* Settings tab — behaviour: content-authoring choices (content-column
				arrangement, ribbon text) and the stats/social-proof text repeater. */ }
			<InspectorControls>
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Content layout', 'sgs-blocks' ) }
						value={ ctaLayout }
						options={ LAYOUT_OPTIONS }
						onChange={ ( val ) => setAttributes( { contentLayout: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Ribbon label', 'sgs-blocks' ) }
						help={ __(
							'Optional floating badge shown top-right of the CTA box. Leave blank to hide.',
							'sgs-blocks'
						) }
						value={ ribbon || '' }
						onChange={ ( val ) => setAttributes( { ribbon: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Stats / Social Proof', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ stats.map( ( stat, index ) => (
						<div
							key={ index }
							style={ {
								display: 'flex',
								gap: '8px',
								marginBottom: '8px',
							} }
						>
							<TextControl
								value={ stat.text || '' }
								onChange={ ( val ) => updateStat( index, val ) }
								placeholder={ __(
									'e.g., Trusted by 5,000+ businesses',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<Button
								icon="trash"
								isDestructive
								onClick={ () => removeStat( index ) }
								size="small"
							/>
						</div>
					) ) }
					<Button variant="secondary" onClick={ addStat }>
						{ __( 'Add stat', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
			</InspectorControls>

			{ /* D621/D622 — shadow colour split out of the legacy `shadow` shape
				attribute into its own SgsColourPanel row, mounted BEFORE the
				group="styles" block below so it renders first in the Styles tab. */ }
			<SgsColourPanel
				rows={ [
					attributes.shadow && {
						key: 'shadow',
						label: __( 'Shadow colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: attributes.shadowColour,
								onChange: ( val ) => setAttributes( { shadowColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'hover-border',
						label: __( 'Hover border colour', 'sgs-blocks' ),
						states: [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: attributes.borderColourHover,
								onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
								linked: true,
								gradientValue: attributes.borderColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { borderColourHoverGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>

			{ /* Styles tab — appearance: section width/spacing, content band look, grid/flex
				geometry, background, shadow and shape dividers. WS-4: mirrored sgs/container
				wrapper controls (section kind) — individual panels rather than the
				<ContainerWrapperControls> aggregator (its ResponsiveSpacingPanel /
				ContentBandPanel sub-panels still write LEGACY FLAT attrs; see the
				top-of-file import comment). */ }
			<InspectorControls group="styles">
				{ /* Background (image/video/svg tabs + ken-burns/parallax) — root-level
					appearance, kept first in the Styles tab (mirrors sgs/container). */ }
				<BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } name={ name } />

				<PanelBody title={ __( 'Section (outer)', 'sgs-blocks' ) }>
					<WidthPanel attributes={ attributes } setAttributes={ setAttributes } />
					{ /*
					   Min-height: declared + painted by the shared wrapper (this block
					   renders kind='section'), but it had NO control until 2026-08-15 —
					   a client could not set it while sgs/container, sgs/hero,
					   sgs/physics-canvas and sgs/trust-bar all could.
					   `minHeight` is OBJECT-typed ({desktop,tablet,mobile}), so this uses
					   ResponsiveOverride — NOT the flat-sibling ResponsiveControl. A flat
					   value written to an object attr is silently coerced to the default
					   and the client's setting vanishes. Mirrors site-footer/edit.js:298.
					*/ }
					<ResponsiveOverride
						value={ attributes.minHeight }
						onChange={ ( obj ) => setAttributes( { minHeight: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								label={ __( 'Min height', 'sgs-blocks' ) }
								value={ ownValue || '' }
								options={ MIN_HEIGHT_OPTIONS }
								onChange={ ( val ) => setOwnValue( val || undefined ) }
								help={ tier === 'desktop'
									? __( 'Desktop / base. Tablet and mobile override it at narrower widths.', 'sgs-blocks' )
									: undefined }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				{ /* Responsive spacing (padding + margin) — box-object interface contract
					(.claude/plans/2026-07-09-box-object-interface-contract.md §5). Base tier
					writes to the WP-native style.spacing object (also visible in the Styles >
					Dimensions panel); tablet/mobile write to the paddingTablet/paddingMobile
					and marginTablet/marginMobile object attrs read by the wrapper's @media tiers. */ }
				<PanelBody title={ __( 'Padding & margin', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						values={ {
							base: attributes.style?.spacing?.padding ?? {},
							tablet: attributes.paddingTablet ?? {},
							mobile: attributes.paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( tier === 'base' ) {
								setAttributes( {
									style: {
										...attributes.style,
										spacing: { ...attributes.style?.spacing, padding: next },
									},
								} );
							} else {
								setAttributes( {
									[ tier === 'tablet' ? 'paddingTablet' : 'paddingMobile' ]: next,
								} );
							}
						} }
					/>
					<hr style={ { margin: '16px 0' } } />
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						values={ {
							base: attributes.style?.spacing?.margin ?? {},
							tablet: attributes.marginTablet ?? {},
							mobile: attributes.marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( tier === 'base' ) {
								setAttributes( {
									style: {
										...attributes.style,
										spacing: { ...attributes.style?.spacing, margin: next },
									},
								} );
							} else {
								setAttributes( {
									[ tier === 'tablet' ? 'marginTablet' : 'marginMobile' ]: next,
								} );
							}
						} }
					/>
				</PanelBody>

				{ /* Content band (Layer 2 __inner) padding — per-area object attr (contract §2),
					not a WP-native attr since the band is an SGS-only inner element. */ }
				<PanelBody title={ __( 'Content band', 'sgs-blocks' ) } initialOpen={ false }>
					<p className="components-base-control__help">
						{ __(
							'Styles the inner content band (the max-width wrapper set by Content width). Only active when Content width is set.',
							'sgs-blocks'
						) }
					</p>
					{ /* ⛔ "Band background colour" (contentBandBackground) REMOVED
						2026-08-12, attribute retired framework-wide — a background
						fills its CONTAINER's max-width and is never clipped to the
						inner content layer (Bean-ruled). Use BackgroundPanel on the
						block itself. Do NOT re-add a band-scoped background. */ }
					{ /* contentBandPadding is a TIER OBJECT — ONE attr holding
						{desktop,tablet,mobile}, each tier itself a
						{top,right,bottom,left} box (Spec 35 box-shaped pass,
						2026-08-11). Uses ResponsiveOverride, not the flat-sibling
						ResponsiveBoxControl — contentBandPaddingTablet/Mobile are
						no longer declared by block.json, so writing through the
						old attrMap would silently discard both tiers (D338).
						Mirrors sgs/container's own edit.js. */ }
					{ /* ⛔ NO `label` on the wrapper, and NO `hideLabelFromVision` on the
					     BoxControl — core's BoxControl ignores that prop and always renders its
					     own label, so both painted (sentence case + WP's uppercase). Keep
					     BoxControl's; BaseControl associates it with the inputs. Full reasoning
					     at components/ResponsiveBoxControls.js. */ }
					<ResponsiveOverride
						value={ attributes.contentBandPadding }
						onChange={ ( obj ) => setAttributes( { contentBandPadding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<BoxControl
								label={ __( 'Band padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								splitOnAxis={ false }
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				<PanelBody title={ __( 'Layout (grid/flex)', 'sgs-blocks' ) } initialOpen={ false }>
					<LayoutPanel attributes={ attributes } setAttributes={ setAttributes } />
				</PanelBody>

				<GridItemDefaultsPanel attributes={ attributes } setAttributes={ setAttributes } />

				{ /* Shadow — SHAPE-only string token attr (sm/md/lg/glow preset slug OR
					a raw box-shadow shape string, no colour — colour lives in the
					SgsColourPanel row above per D621/D622); the dead native `shadow`
					support duplicate was removed outright. Rendered scoped, not inline,
					via sgs_shadow_value_composed() — Spec 35 T2.2. */ }
				<PanelBody title={ __( 'Shadow', 'sgs-blocks' ) } initialOpen={ false }>
					<ShadowControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						value={ attributes.shadow || '' }
						onChange={ ( val ) => setAttributes( { shadow: val } ) }
						colour={ attributes.shadowColour }
						onColourChange={ ( val ) => setAttributes( { shadowColour: val } ) }
					/>
				</PanelBody>

				<ShapeDividersPanel attributes={ attributes } setAttributes={ setAttributes } />

				<PanelBody
					title={ __( 'Background', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Gradient preset', 'sgs-blocks' ) }
						value={ gradientPreset || '' }
						options={ [
							{ label: __( 'None', 'sgs-blocks' ), value: '' },
							{
								label: __( 'Primary fade', 'sgs-blocks' ),
								value: 'primary-fade',
							},
							{
								label: __( 'Accent glow', 'sgs-blocks' ),
								value: 'accent-glow',
							},
							{
								label: __( 'Dark radial', 'sgs-blocks' ),
								value: 'dark-radial',
							},
							{
								label: __( 'Mesh soft', 'sgs-blocks' ),
								value: 'mesh-soft',
							},
						] }
						onChange={ ( val ) =>
							setAttributes( { gradientPreset: val } )
						}
						help={ __(
							'Gradient overrides the solid background colour when set.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<MediaPicker
						value={ activeMedia }
						onChange={ ( media ) => {
							// Write the unified slot. Mirror image-only selections into the
							// legacy attribute so older render paths (and any back-compat
							// consumer) still see the same URL until they migrate.
							if ( media && media.type === 'image' ) {
								setAttributes( {
									backgroundMedia: media,
									backgroundImage: {
										id: media.id,
										url: media.url,
										alt: media.alt,
									},
								} );
							} else {
								// Video (or null) — clear the legacy image attribute so the
								// legacy <img>/CSS background path does not double-render.
								setAttributes( {
									backgroundMedia: media,
									backgroundImage: null,
								} );
							}
						} }
						onRemove={ () =>
							setAttributes( {
								backgroundMedia: null,
								backgroundImage: null,
							} )
						}
						label={ __( 'Select background media', 'sgs-blocks' ) }
						instructionsImage={ __(
							'Choose an image or video for the CTA background',
							'sgs-blocks'
						) }
					/>
					<RangeControl
						label={ __( 'Image opacity (%)', 'sgs-blocks' ) }
						value={ backgroundImageOpacity }
						onChange={ ( val ) =>
							setAttributes( {
								backgroundImageOpacity: val,
							} )
						}
						min={ 0 }
						max={ 100 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ activeMedia &&
					activeMedia.type === 'video' &&
					activeMedia.url && (
						<video
							className="sgs-cta-section__bg-video"
							src={ activeMedia.url }
							autoPlay
							muted
							loop
							playsInline
							aria-hidden="true"
						/>
					) }
				{ activeMedia && activeMedia.url && (
					<span
						className="sgs-cta-section__overlay"
						style={ {
							opacity: backgroundImageOpacity / 100,
						} }
						aria-hidden="true"
					/>
				) }

				{ ribbon && (
					<span
						className="sgs-cta-section__ribbon"
						aria-hidden="true"
					>
						{ ribbon }
					</span>
				) }

				<div { ...innerBlocksProps } />

				{ stats.length > 0 && (
					<div className="sgs-cta-section__stats">
						{ stats.map( ( stat, index ) =>
							stat.text ? (
								<span
									key={ index }
									className="sgs-cta-section__stat"
								>
									{ stat.text }
								</span>
							) : null
						) }
					</div>
				) }
			</div>
		</>
	);
}
