import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	RangeControl,
	Button,
	Flex,
	FlexItem,
	FlexBlock,
	Notice,
} from '@wordpress/components';
import { DesignTokenPicker, SpacingControl, ResponsiveBoxControl, SgsLinkControl } from '../../components';
import { colourVar, spacingVar } from '../../utils';

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
		iconColour,
		iconColourHover,
		colourMode,
		iconStyle,
		gap,
		style,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
	} = attributes;

	const isSiteInfoSource = 'site-info' === source;

	// Box-object interface contract §5: base padding/margin preview mirrors the
	// WP-native style.spacing.* object read by render.php's style engine call.
	// NOTE: `style` here is WP's native style-support object attribute (holds
	// style.spacing/style.color) — distinct from this block's own `iconStyle`
	// attribute (plain/filled/outlined/pill variant), which previously shared
	// the name `style` and collided with WP's object. Renamed 2026-07-10.
	const basePadding = style?.spacing?.padding;
	const baseMargin = style?.spacing?.margin;
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
	// 'theme' mode drives every item's resting colour via this custom property
	// (style.css .sgs-social-icons__item{color:var(--sgs-social-colour)});
	// 'brand' mode overrides per item instead (applied on each item below).
	if ( 'theme' === colourMode && iconColour ) {
		previewStyle[ '--sgs-social-colour' ] = colourVar( iconColour );
	}

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

				{ isSiteInfoSource ? (
					<PanelBody title={ __( 'Social Links', 'sgs-blocks' ) }>
						<Notice status="info" isDismissible={ false }>
							{ __( 'Pulling social links from Site Info settings. Any network left blank in Appearance > SGS Site Info is skipped automatically.', 'sgs-blocks' ) }
						</Notice>
					</PanelBody>
				) : (
				<PanelBody title={ __( 'Social Links', 'sgs-blocks' ) }>
					{ icons.map( ( icon, index ) => (
						<Flex key={ index } align="flex-start" style={ { marginBottom: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '12px' } }>
							<FlexItem>
								<SelectControl
									value={ icon.platform }
									options={ PLATFORMS.map( ( p ) => ( { label: PLATFORM_LABELS[ p ] || p, value: p } ) ) }
									onChange={ ( val ) => updateIcon( index, 'platform', val ) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</FlexItem>
							<FlexBlock>
								<SgsLinkControl
									label={ __( 'Link', 'sgs-blocks' ) }
									value={ {
										url: icon.url || '',
										opensInNewTab: icon.opensInNewTab !== false,
										rel: icon.rel || '',
									} }
									onChange={ ( next ) => {
										const updated = [ ...icons ];
										updated[ index ] = {
											...updated[ index ],
											url: next.url || '',
											opensInNewTab: next.opensInNewTab,
											rel: next.rel || '',
										};
										setAttributes( { icons: updated } );
									} }
								/>
								<TextControl
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
												<Button variant="secondary" onClick={ open } style={ { marginTop: '4px' } }>
													{ icon.customIconUrl ? __( 'Replace icon', 'sgs-blocks' ) : __( 'Upload custom icon (SVG)', 'sgs-blocks' ) }
												</Button>
											) }
										/>
									</MediaUploadCheck>
								) }
							</FlexBlock>
							<FlexItem>
								<Flex direction="column" gap={ 1 }>
									<Button icon="arrow-up-alt2" onClick={ () => moveIcon( index, -1 ) } disabled={ 0 === index } label={ __( 'Move up', 'sgs-blocks' ) } />
									<Button icon="arrow-down-alt2" onClick={ () => moveIcon( index, 1 ) } disabled={ index === icons.length - 1 } label={ __( 'Move down', 'sgs-blocks' ) } />
									<Button icon="trash" isDestructive onClick={ () => removeIcon( index ) } label={ __( 'Remove', 'sgs-blocks' ) } />
								</Flex>
							</FlexItem>
						</Flex>
					) ) }
					<Button variant="secondary" onClick={ addIcon }>
						{ __( 'Add social link', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
				) }

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
							: __( 'Every icon uses the theme colour below at rest.', 'sgs-blocks' )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ 'theme' === colourMode && (
						<DesignTokenPicker
							label={ __( 'Icon colour', 'sgs-blocks' ) }
							value={ iconColour }
							onChange={ ( val ) => setAttributes( { iconColour: val } ) }
						/>
					) }
					<DesignTokenPicker
						label={ __( 'Hover colour', 'sgs-blocks' ) }
						value={ iconColourHover }
						onChange={ ( val ) => setAttributes( { iconColourHover: val } ) }
					/>
				</PanelBody>

				{ /* ── Spacing panel ── Box-object interface contract §B/§E: padding/
				   margin base routes to WP-native style.spacing.* (skip-serialised,
				   emitted scoped by render.php); tiers are the paddingTablet/
				   paddingMobile + marginTablet/marginMobile object attrs. */ }
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
								width: iconSize,
								height: iconSize,
								color: 'brand' === colourMode
									? ( PLATFORM_BRAND_COLOURS[ platform ] || PLATFORM_BRAND_COLOURS.custom )
									: undefined,
							} }
						>
							{ platform }
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
								width: iconSize,
								height: iconSize,
								color: 'brand' === colourMode
									? ( PLATFORM_BRAND_COLOURS[ icon.platform ] || PLATFORM_BRAND_COLOURS.custom )
									: undefined,
							} }
						>
							{ icon.platform }
						</span>
					) )
				) }
			</div>
		</>
	);
}
