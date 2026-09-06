import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, MediaUpload, MediaUploadCheck, useSettings } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	RangeControl,
	Button,
	Flex,
	Notice,
} from '@wordpress/components';
import { DesignTokenPicker, SpacingControl, ResponsiveBoxControl, LinkPopoverField, IconPreview, resolveColourToken, SgsColourPanel, TypographyControls, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl } from '../../components';
import { spacingVar, borderPaintPreview } from '../../utils';

// Site Info mode pulls from this fixed set of networks (same 8 slugs the
// sgs/business-info 'socials' case reads from Sgs_Site_Info — Appearance >
// SGS Site Info) so the editor preview can list what will render without a
// server round-trip.
const SITE_INFO_NETWORKS = [
	'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'whatsapp', 'google',
];

const SOURCE_OPTIONS = [
	{ label: __( 'Manual URLs', 'sgs-blocks' ), value: 'manual' },
	{ label: __( 'From Site Info settings', 'sgs-blocks' ), value: 'site-info' },
];

// Box-object interface contract §1: build an editor-preview shorthand from a
// box object — mirrors render.php's box-shorthand builder so the canvas
// preview matches the frontend (contract §5).
function boxShorthand( box ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	const keys = [ 'top', 'right', 'bottom', 'left' ];
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

const PLATFORMS = [
	'facebook', 'twitter', 'linkedin', 'instagram', 'youtube',
	'tiktok', 'github', 'whatsapp', 'email', 'website',
	'pinterest', 'snapchat', 'telegram', 'discord', 'google', 'custom',
];

const PLATFORM_LABELS = {
	facebook: 'Facebook', twitter: 'X (Twitter)', linkedin: 'LinkedIn', instagram: 'Instagram',
	youtube: 'YouTube', tiktok: 'TikTok', github: 'GitHub', whatsapp: 'WhatsApp', email: 'Email',
	website: 'Website', pinterest: 'Pinterest', snapchat: 'Snapchat', telegram: 'Telegram',
	discord: 'Discord', google: 'Google', custom: 'Custom',
};

// Fix 1 (Spec 35 A2/Part B): mirrors render.php's $platform_icons EXACTLY —
// the editor canvas resolves the SAME Lucide slug render.php does, via the
// shared IconPreview component (src/components/IconPicker/IconPreview.js),
// instead of reinventing icon-name resolution a second time.
const PLATFORM_ICONS = {
	facebook: 'facebook',
	twitter: 'twitter',
	linkedin: 'linkedin',
	instagram: 'instagram',
	youtube: 'youtube',
	tiktok: 'music',
	github: 'github',
	whatsapp: 'message-circle',
	email: 'mail',
	website: 'globe',
	pinterest: 'pin',
	snapchat: 'ghost',
	telegram: 'send',
	discord: 'message-square',
	google: 'star',
};

// Mirrors render.php's sgs_social_icons_default_label() — editor-preview only
// (the server value is authoritative), so the operator sees the exact default
// they're overriding when they type into the Accessible label field.
const PLATFORM_VERBS = {
	whatsapp: 'Message us on WhatsApp',
	email: 'Email us',
	website: 'Visit our website',
	google: 'Read our reviews on Google',
	custom: 'Follow us',
};

function defaultAccessibleLabel( platform ) {
	if ( PLATFORM_VERBS[ platform ] ) {
		return PLATFORM_VERBS[ platform ];
	}
	return __( 'Follow us on', 'sgs-blocks' ) + ' ' + ( PLATFORM_LABELS[ platform ] || platform );
}

const STYLE_OPTIONS = [
	{ label: __( 'Plain', 'sgs-blocks' ), value: 'plain' },
	{ label: __( 'Filled', 'sgs-blocks' ), value: 'filled' },
	{ label: __( 'Outlined', 'sgs-blocks' ), value: 'outlined' },
	{ label: __( 'Pill', 'sgs-blocks' ), value: 'pill' },
];

const COLOUR_MODE_OPTIONS = [
	{ label: __( 'Theme colour', 'sgs-blocks' ), value: 'theme' },
	{ label: __( 'Brand colours', 'sgs-blocks' ), value: 'brand' },
];

// Mirrors render.php's $platform_brand_colours — used for the editor-preview
// per-item colour when colourMode='brand'.
const PLATFORM_BRAND_COLOURS = {
	facebook: '#1877F2',
	twitter: '#000000',
	linkedin: '#0A66C2',
	instagram: '#E4405F',
	youtube: '#FF0000',
	tiktok: '#000000',
	github: '#181717',
	whatsapp: '#25D366',
	email: '#6B7280',
	website: '#6B7280',
	pinterest: '#E60023',
	snapchat: '#FFFC00',
	telegram: '#26A5E4',
	discord: '#5865F2',
	google: '#4285F4',
	custom: '#6B7280',
};

export default function Edit( { attributes, setAttributes } ) {
	const {
		source,
		icons,
		iconSize,
		iconBackground,
		iconBackgroundGradient,
		iconBackgroundHover,
		iconBackgroundHoverGradient,
		iconBorderColour,
		iconBorderColourGradient,
		iconBorderColourHover,
		iconBorderColourHoverGradient,
		iconGlyphColour,
		iconGlyphColourGradient,
		iconGlyphColourHover,
		iconGlyphColourHoverGradient,
		colourMode,
		iconStyle,
		gap,
		style,
	} = attributes;

	const isSiteInfoSource = 'site-info' === source;
	const [ palette ] = useSettings( 'color.palette' );

	// Base padding/margin preview — padding/margin are owned tier-object
	// attrs { desktop, tablet, mobile }, read directly by render.php.
	// NOTE: `style` here is WP's native style-support object attribute (now
	// holds only style.color, not spacing) — distinct from this block's own
	// `iconStyle` attribute (plain/filled/outlined/pill variant).
	const basePadding = attributes.padding?.desktop;
	const baseMargin = attributes.margin?.desktop;
	const previewStyle = {};
	const paddingPreview = boxShorthand( basePadding );
	if ( paddingPreview ) {
		previewStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( baseMargin );
	if ( marginPreview ) {
		previewStyle.margin = marginPreview;
	}
	if ( gap ) {
		previewStyle.gap = spacingVar( gap );
	}
	// 'theme' mode drives every item's resting background/border/glyph colour
	// via these 3 custom properties (style.css .sgs-social-icons__item{color:
	// var(--sgs-social-glyph)} etc — D643); 'brand' mode overrides per item
	// instead (applied on each item below).
	if ( 'theme' === colourMode ) {
		// The DesignTokenPickers here have no `linked` prop, so they always
		// store a raw CSS value, never a slug -- resolveColourToken() (not
		// colourVar(), which is slug-only) is the correct resolver.
		if ( iconBackground ) {
			previewStyle[ '--sgs-social-bg' ] = resolveColourToken( iconBackground, palette );
		}
		if ( iconBorderColour ) {
			previewStyle[ '--sgs-social-border' ] = resolveColourToken( iconBorderColour, palette );
		}
		if ( iconGlyphColour ) {
			previewStyle[ '--sgs-social-glyph' ] = resolveColourToken( iconGlyphColour, palette );
		}
	}
	// Hover colours are written UNCONDITIONALLY (independent of colourMode,
	// matching render.php + style.css's `:hover` rules) so a real mouse hover
	// on the editor canvas (a live DOM, not a static screenshot) shows the
	// same colour the frontend does.
	if ( iconBackgroundHover ) {
		previewStyle[ '--sgs-social-bg-hover' ] = resolveColourToken( iconBackgroundHover, palette );
	}
	if ( iconBorderColourHover ) {
		previewStyle[ '--sgs-social-border-hover' ] = resolveColourToken( iconBorderColourHover, palette );
	}
	if ( iconGlyphColourHover ) {
		previewStyle[ '--sgs-social-glyph-hover' ] = resolveColourToken( iconGlyphColourHover, palette );
	}

	// Mirrors render.php's $item_size — the clickable hit area is
	// floored at 44px (WCAG 2.5.8) and grows past the glyph size for the
	// filled/outlined/pill variants (extra padding), while the glyph itself
	// always renders at the operator-chosen iconSize. Using the real value
	// here (not a fixed box) means a real SVG at iconSize always fits inside
	// a box floored at 44px.
	const itemSize = Math.max( 44, iconSize + ( 'plain' === iconStyle ? 0 : 16 ) );

	// iconBorderColourGradient real mechanism (render.php, D636): a masked
	// `::before` ring via `sgs_border_gradient_css()`, scoped to
	// `.sgs-social-icons--outlined .sgs-social-icons__item` — the gradient
	// border only ever paints on the OUTLINED style variant; plain/filled/pill
	// have no border to gradient at all. `borderPaintPreview()`'s
	// `border-image` is the same documented approximation `sgs/container`
	// already uses for a masked-ring border (real technique needs a
	// `::before` pseudo-element a plain inline style cannot reach) — applied
	// only when the style variant actually has a visible border, mirroring
	// the frontend's selector gate exactly.
	const itemBorderGradientPreview = 'outlined' === iconStyle
		? borderPaintPreview( iconBorderColour, iconBorderColourGradient, palette )
		: {};
	const itemBorderImage = itemBorderGradientPreview.borderImage;

	const blockProps = useBlockProps( {
		className: `sgs-social-icons sgs-social-icons--${ iconStyle }`,
		style: previewStyle,
	} );

	const updateIcon = ( index, field, value ) => {
		const updated = [ ...icons ];
		updated[ index ] = { ...updated[ index ], [ field ]: value };
		setAttributes( { icons: updated } );
	};

	const addIcon = () => {
		setAttributes( { icons: [ ...icons, { platform: 'website', url: '', opensInNewTab: true, rel: '' } ] } );
	};

	const removeIcon = ( index ) => {
		setAttributes( { icons: icons.filter( ( _, i ) => i !== index ) } );
	};

	// Up/down reorder — a keyboard- and touch-reachable equivalent to drag
	// (FR-36-21 NICE: "drag-to-reorder if cheap"). True pointer-drag needs a
	// parallel keyboard path to stay WCAG-reachable anyway, so two buttons
	// give the same reordering outcome without a drag library dependency.
	const moveIcon = ( index, direction ) => {
		const target = index + direction;
		if ( target < 0 || target >= icons.length ) {
			return;
		}
		const updated = [ ...icons ];
		[ updated[ index ], updated[ target ] ] = [ updated[ target ], updated[ index ] ];
		setAttributes( { icons: updated } );
	};

	return (
		<>
			{ /* D619 — ONE grouped, SGS-OWNED colour panel (own PanelBody,
			   Styles tab), rendered FIRST so it sits at the top of the inspector.
			   D643 (2026-08-16): `iconColour`/`iconColourHover` split into 3
			   attribute pairs — one per real CSS property this block paints
			   (background-color / border-color / color) — so each can later
			   carry its own gradient option without one value having to serve
			   3 different CSS techniques at once. The native `color` support
			   sub-flags are false so WordPress generates no competing native
			   colour UI. The colour mode (theme vs brand) gates whether the
			   resting rows are user-controllable: 'theme' mode shows all 3
			   resting+hover rows, 'brand' mode omits the resting half
			   (per-platform override, no user control) but keeps hover
			   editable (independent of mode). */ }
			<SgsColourPanel
				rows={ [
					...( 'theme' === colourMode ? [
						{
							key: 'icon-bg',
							label: __( 'Icon background', 'sgs-blocks' ),
							states: [
								{
									key: 'normal',
									label: __( 'Normal', 'sgs-blocks' ),
									value: iconBackground,
									onChange: ( val ) => setAttributes( { iconBackground: val ?? '' } ),
									linked: true,
									gradientValue: iconBackgroundGradient,
									onGradientChange: ( val ) => setAttributes( { iconBackgroundGradient: val ?? '' } ),
								},
								{
									key: 'hover',
									label: __( 'Hover', 'sgs-blocks' ),
									value: iconBackgroundHover,
									onChange: ( val ) => setAttributes( { iconBackgroundHover: val ?? '' } ),
									linked: true,
									gradientValue: iconBackgroundHoverGradient,
									onGradientChange: ( val ) => setAttributes( { iconBackgroundHoverGradient: val ?? '' } ),
								},
							],
						},
						{
							key: 'icon-border',
							label: __( 'Icon border colour', 'sgs-blocks' ),
							states: [
								{
									key: 'normal',
									label: __( 'Normal', 'sgs-blocks' ),
									value: iconBorderColour,
									onChange: ( val ) => setAttributes( { iconBorderColour: val ?? '' } ),
									linked: true,
									gradientValue: iconBorderColourGradient,
									onGradientChange: ( val ) =>
										setAttributes( { iconBorderColourGradient: val ?? '' } ),
								},
								{
									key: 'hover',
									label: __( 'Hover', 'sgs-blocks' ),
									value: iconBorderColourHover,
									onChange: ( val ) => setAttributes( { iconBorderColourHover: val ?? '' } ),
									linked: true,
									gradientValue: iconBorderColourHoverGradient,
									onGradientChange: ( val ) =>
										setAttributes( { iconBorderColourHoverGradient: val ?? '' } ),
								},
							],
						},
						{
							key: 'icon-glyph',
							label: __( 'Icon colour', 'sgs-blocks' ),
							states: [
								{
									key: 'normal',
									label: __( 'Normal', 'sgs-blocks' ),
									value: iconGlyphColour,
									onChange: ( val ) => setAttributes( { iconGlyphColour: val ?? '' } ),
									linked: true,
									gradientValue: iconGlyphColourGradient,
									onGradientChange: ( val ) =>
										setAttributes( { iconGlyphColourGradient: val ?? '' } ),
								},
								{
									key: 'hover',
									label: __( 'Hover', 'sgs-blocks' ),
									value: iconGlyphColourHover,
									onChange: ( val ) => setAttributes( { iconGlyphColourHover: val ?? '' } ),
									linked: true,
									gradientValue: iconGlyphColourHoverGradient,
									onGradientChange: ( val ) =>
										setAttributes( { iconGlyphColourHoverGradient: val ?? '' } ),
								},
							],
						},
					] : [
						{
							key: 'icon-bg-hover',
							label: __( 'Background hover', 'sgs-blocks' ),
							states: [
								{
									key: 'hover',
									label: __( 'Hover', 'sgs-blocks' ),
									value: iconBackgroundHover,
									onChange: ( val ) => setAttributes( { iconBackgroundHover: val ?? '' } ),
									linked: true,
									gradientValue: iconBackgroundHoverGradient,
									onGradientChange: ( val ) => setAttributes( { iconBackgroundHoverGradient: val ?? '' } ),
								},
							],
						},
						{
							key: 'icon-border-hover',
							label: __( 'Border colour hover', 'sgs-blocks' ),
							states: [
								{
									key: 'hover',
									label: __( 'Hover', 'sgs-blocks' ),
									value: iconBorderColourHover,
									onChange: ( val ) => setAttributes( { iconBorderColourHover: val ?? '' } ),
									gradientValue: attributes.iconBorderColourHoverGradient,
									onGradientChange: ( val ) => setAttributes( { iconBorderColourHoverGradient: val ?? '' } ),
									linked: true,
								},
							],
						},
						{
							key: 'icon-glyph-hover',
							label: __( 'Icon colour hover', 'sgs-blocks' ),
							states: [
								{
									key: 'hover',
									label: __( 'Hover', 'sgs-blocks' ),
									value: iconGlyphColourHover,
									onChange: ( val ) => setAttributes( { iconGlyphColourHover: val ?? '' } ),
									linked: true,
									gradientValue: iconGlyphColourHoverGradient,
									onGradientChange: ( val ) =>
										setAttributes( { iconGlyphColourHoverGradient: val ?? '' } ),
								},
							],
						},
					] ),
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Link source', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Link source', 'sgs-blocks' ) }
						value={ source }
						options={ SOURCE_OPTIONS }
						onChange={ ( val ) => setAttributes( { source: val } ) }
						help={ isSiteInfoSource
							? __( 'Links are pulled automatically from Appearance > SGS Site Info. No manual URLs are used.', 'sgs-blocks' )
							: __( 'Add and manage each link below.', 'sgs-blocks' )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody title={ __( 'Appearance', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Style', 'sgs-blocks' ) }
						value={ iconStyle }
						options={ STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { iconStyle: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Icon size (px)', 'sgs-blocks' ) }
						value={ iconSize }
						onChange={ ( val ) => setAttributes( { iconSize: val } ) }
						min={ 16 }
						max={ 64 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SpacingControl
						label={ __( 'Gap', 'sgs-blocks' ) }
						value={ gap }
						onChange={ ( val ) => setAttributes( { gap: val } ) }
					/>
					<SelectControl
						label={ __( 'Icon colour source', 'sgs-blocks' ) }
						value={ colourMode }
						options={ COLOUR_MODE_OPTIONS }
						onChange={ ( val ) => setAttributes( { colourMode: val } ) }
						help={ 'brand' === colourMode
							? __( 'Each icon uses its official brand colour (Facebook blue, Instagram pink, etc.) at rest.', 'sgs-blocks' )
							: __( 'Every icon uses the theme colour below at rest. Edit in the Colour panel at the top.', 'sgs-blocks' )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				{ /* NOTE (2026-09-03 investigation): "Social Links" appears TWICE
				   in this file — once here (Site Info source: read-only notice)
				   and once below (manual source: the full icon-list editor).
				   Confirmed NOT a dead/orphaned duplicate: the ternary on
				   `isSiteInfoSource` means exactly one of the two ever mounts,
				   both are live code paths reachable by toggling "Link source"
				   above. Confusingly named (identical titles, different
				   content) but functioning as designed — a rename is a
				   separate, out-of-scope UX fix, not attempted here. */ }
				{ isSiteInfoSource ? (
					<PanelBody title={ __( 'Social Links', 'sgs-blocks' ) }>
						<Notice status="info" isDismissible={ false }>
							{ __( 'Pulling social links from Site Info settings. Any network left blank in Appearance > SGS Site Info is skipped automatically.', 'sgs-blocks' ) }
						</Notice>
					</PanelBody>
				) : (
				<PanelBody title={ __( 'Social Links', 'sgs-blocks' ) }>
					{ /* Fix 4 (Bean: inspector "horrendous") — each control now runs
					   FULL-WIDTH, stacked vertically, instead of squeezed 3-across
					   inside a ~248px sidebar (previously ~110px per control, help
					   text wrapping 6 lines). Only the small icon-button row at the
					   bottom stays horizontal — those don't need full width. */ }
					{ icons.map( ( icon, index ) => (
						<div key={ index } className="sgs-social-icons-editor__item">
							<SelectControl
								label={ __( 'Platform', 'sgs-blocks' ) }
								value={ icon.platform }
								options={ PLATFORMS.map( ( p ) => ( { label: PLATFORM_LABELS[ p ] || p, value: p } ) ) }
								onChange={ ( val ) => updateIcon( index, 'platform', val ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							{ /* Fix 5 (Spec 35 §2 LINK, Bean-ruled 2026-08-13): the
							   canonical popover LINK control, replacing the retired
							   inline SgsLinkControl mount. targetMode="boolean" maps
							   this block's stored `opensInNewTab` boolean onto
							   LinkPopoverField's linkTarget shape. */ }
							<LinkPopoverField
								label={ __( 'Link', 'sgs-blocks' ) }
								value={ {
									url: icon.url || '',
									linkTarget: icon.opensInNewTab !== false ? '_blank' : '_self',
									rel: icon.rel || '',
								} }
								targetMode="boolean"
								showDownload={ false }
								onChange={ ( next ) => {
									const updated = [ ...icons ];
									const item = { ...updated[ index ] };
									if ( undefined !== next.url ) {
										item.url = next.url || '';
									}
									if ( undefined !== next.linkTarget ) {
										item.opensInNewTab = '_blank' === next.linkTarget;
									}
									if ( undefined !== next.rel ) {
										item.rel = next.rel || '';
									}
									updated[ index ] = item;
									setAttributes( { icons: updated } );
								} }
							/>
							<TextControl
								label={ __( 'Accessible label', 'sgs-blocks' ) }
								value={ icon.label || '' }
								onChange={ ( val ) => updateIcon( index, 'label', val ) }
								placeholder={ defaultAccessibleLabel( icon.platform ) }
								help={ __( 'Accessible name (aria-label), auto-generated. Edit to override — leave empty to keep the auto default shown above.', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							{ 'custom' === icon.platform && (
								<MediaUploadCheck>
									<MediaUpload
										onSelect={ ( media ) => {
											updateIcon( index, 'customIconId', media.id );
											updateIcon( index, 'customIconUrl', media.url );
										} }
										allowedTypes={ [ 'image/svg+xml', 'image' ] }
										value={ icon.customIconId }
										render={ ( { open } ) => (
											<Button variant="secondary" onClick={ open } className="sgs-social-icons-editor__upload">
												{ icon.customIconUrl ? __( 'Replace icon', 'sgs-blocks' ) : __( 'Upload custom icon (SVG)', 'sgs-blocks' ) }
											</Button>
										) }
									/>
								</MediaUploadCheck>
							) }
							<Flex justify="flex-end" gap={ 1 } className="sgs-social-icons-editor__actions">
								<Button icon="arrow-up-alt2" onClick={ () => moveIcon( index, -1 ) } disabled={ 0 === index } label={ __( 'Move up', 'sgs-blocks' ) } />
								<Button icon="arrow-down-alt2" onClick={ () => moveIcon( index, 1 ) } disabled={ index === icons.length - 1 } label={ __( 'Move down', 'sgs-blocks' ) } />
								<Button icon="trash" isDestructive onClick={ () => removeIcon( index ) } label={ __( 'Remove', 'sgs-blocks' ) } />
							</Flex>
						</div>
					) ) }
					<Button variant="secondary" onClick={ addIcon }>
						{ __( 'Add social link', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
				) }

				{ /* Typography — replaces the old WP-native supports.typography
				   (textAlign only, and dead in practice: this root is display:flex
				   with no inline/block content, so text-align never painted
				   anything) with the shared TypographyControls component +
				   sgs_typography_css_rule() render.php helper (D971/D972
				   full-replacement track). Root prefix "" — the block has no
				   rendered text label (aria-label only), so the root is the only
				   sensible typography target, matching the previous native
				   fontSize/lineHeight scope. */ }
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
					/>
				</PanelBody>

				{ /* ── Spacing panel ── padding/margin are each a single block-owned
				   tier-object attr { desktop, tablet, mobile }, written via
				   ResponsiveOverride + SgsBoxControl; read directly by this
				   block's render.php. */ }
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

			<div { ...blockProps }>
				{ isSiteInfoSource ? (
					// Editor-only preview: the real network list is resolved server-side
					// (Sgs_Site_Info) from what the operator has actually filled in, so
					// this canvas preview shows every possible network rather than
					// guessing which ones currently have a URL saved.
					SITE_INFO_NETWORKS.map( ( platform ) => (
						<span
							key={ platform }
							className="sgs-social-icons__item"
							style={ {
								width: itemSize,
								height: itemSize,
								color: 'brand' === colourMode
									? ( PLATFORM_BRAND_COLOURS[ platform ] || PLATFORM_BRAND_COLOURS.custom )
									: undefined,
								borderImage: itemBorderImage,
							} }
						>
							<span className="sgs-social-icons__icon" aria-hidden="true">
								{ /* iconGlyphColourGradient real mechanism (render.php,
								   D636/D644): `sgs_svg_stroke_gradient()` builds an SVG
								   `stroke:url(#id)` declaration + `<linearGradient>` def —
								   NOT a background-image/currentColor technique. IconPreview
								   itself now accepts a `gradient` prop and applies this exact
								   technique (`withSvgStrokeGradient()`,
								   src/utils/svg-gradient-preview.js) via its own
								   loadLucide()/withInlineFillStroke() path — pass it through
								   rather than reimplementing it here. */ }
								<IconPreview
									source="lucide"
									name={ PLATFORM_ICONS[ platform ] || 'link' }
									size={ iconSize }
									gradient={ iconGlyphColourGradient }
								/>
							</span>
						</span>
					) )
				) : icons.length === 0 ? (
					<p style={ { opacity: 0.5 } }>{ __( 'Add social links in the sidebar…', 'sgs-blocks' ) }</p>
				) : (
					icons.map( ( icon, i ) => (
						<span
							key={ i }
							className="sgs-social-icons__item"
							style={ {
								width: itemSize,
								height: itemSize,
								color: 'brand' === colourMode
									? ( PLATFORM_BRAND_COLOURS[ icon.platform ] || PLATFORM_BRAND_COLOURS.custom )
									: undefined,
								borderImage: itemBorderImage,
							} }
						>
							<span className="sgs-social-icons__icon" aria-hidden="true">
								{ 'custom' === icon.platform && icon.customIconUrl ? (
									<img src={ icon.customIconUrl } alt="" width={ iconSize } height={ iconSize } />
								) : (
									<IconPreview
										source="lucide"
										name={ PLATFORM_ICONS[ icon.platform ] || 'link' }
										size={ iconSize }
										gradient={ iconGlyphColourGradient }
									/>
								) }
							</span>
						</span>
					) )
				) }
			</div>
		</>
	);
}
