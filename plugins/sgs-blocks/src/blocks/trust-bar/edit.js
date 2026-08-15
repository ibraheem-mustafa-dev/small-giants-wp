import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, RichText } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	Button,
	RangeControl,
	Notice,
	BoxControl,
} from '@wordpress/components';
import { DesignTokenPicker, IconPicker, IconPreview, TypographyControls, ResponsiveBoxControl, ResponsiveOverride, ShadowControl, SgsColourPanel, LinkPopoverField, BOX_UNITS, normaliseResponsiveBox } from '../../components';
import MediaPicker from '../../components/MediaPicker';
import { colourVar, resolveShadowPreview, resolveShadowPreviewComposed, resolveResponsiveTier } from '../../utils';
// No-inline migration (2026-07-10): trust-bar no longer uses the default
// <ContainerWrapperControls> aggregator — its unconditional "Content band" /
// "Responsive spacing" panels write to LEGACY FLAT attrs (contentBandPaddingTop,
// paddingTopTablet, …), which are now REMOVED box-object attrs on this block
// (paddingTablet/paddingMobile/marginTablet/marginMobile/contentBandPadding+
// Tablet+Mobile). Import the individual panels still needed instead (mirrors
// sgs/container's + sgs/hero's own edit.js) and roll trust-bar's own "Padding &
// margin" / "Content band" panels below using ResponsiveBoxControl bound to the
// object attrs.
import {
	WidthPanel,
	LayoutPanel,
	BackgroundPanel,
	ShapeDividersPanel,
	GridItemDefaultsPanel,
	MIN_HEIGHT_OPTIONS,
} from '../container/components/ContainerWrapperControls';
import { UnitControl } from '../../components/primitives';

/**
 * Resolve a gap attribute value to a valid CSS string for editor preview.
 *
 * Mirrors PHP sgs_container_gap_value() and container/edit.js gapCssValue():
 *  - Bare digit slug (e.g. "40") → var(--wp--preset--spacing--40)
 *  - Raw CSS length (e.g. "16px", "1.5rem") → pass through as-is
 *  - Empty / nullish → undefined (style key omitted)
 *
 * gap is a TIER OBJECT (Spec 35) — this resolves the desktop tier (what the
 * editor canvas shows) before formatting it, the same pattern feature-grid
 * and gallery use. String() on the raw object would yield "[object Object]".
 *
 * @param {Object|null|undefined} gap Gap attribute value ({desktop,tablet,mobile}).
 * @returns {string|undefined}
 */
function gapCssValue( gap ) {
	const gapDesktop = resolveResponsiveTier( gap, 'desktop' )?.value;
	if ( ! gapDesktop ) {
		return undefined;
	}
	if ( /^\d+$/.test( String( gapDesktop ) ) ) {
		return `var(--wp--preset--spacing--${ gapDesktop })`;
	}
	return String( gapDesktop );
}

/**
 * Resolve the desktop-tier `grid-template-columns` preview value.
 *
 * Mirrors the REAL winning mechanism in class-sgs-container-wrapper.php: an
 * object-shaped `gridTemplateColumns` attr is ALWAYS emitted (the unconditional
 * `isset() && is_array()` check at ~:2150, which lands in the responsive CSS
 * string after — and so overrides in the cascade — the legacy `columns`-based
 * base rule at ~:865). `columns` only drives the rendered grid when
 * `gridTemplateColumns`'s own tier is empty (render.php's `$gtc_base` fallback,
 * ~:854-858) — this is the ONLY case genuinely covered by `columns` any more,
 * since trust-bar declares `gridTemplateColumns` with a real, always-populated
 * default ({desktop:"repeat(4, 1fr)", …}), so that fallback rarely fires on a
 * fresh instance. Preserved anyway for a legacy/edge instance whose
 * `gridTemplateColumns` tier really is unset.
 *
 * @param {Object|null|undefined} gtc     gridTemplateColumns attribute ({desktop,tablet,mobile}).
 * @param {Object|null|undefined} cols    columns attribute ({desktop,tablet,mobile}).
 * @returns {string|undefined}
 */
function gridTemplateColumnsPreview( gtc, cols ) {
	const gtcDesktop = resolveResponsiveTier( gtc, 'desktop' )?.value;
	if ( gtcDesktop ) {
		return String( gtcDesktop );
	}
	const colsDesktop = resolveResponsiveTier( cols, 'desktop' )?.value;
	const count = colsDesktop ? parseInt( colsDesktop, 10 ) : 4;
	if ( ! count || count < 1 ) {
		return undefined;
	}
	return `repeat(${ count },1fr)`;
}

const BADGE_STYLE_OPTIONS = [
	{ label: __( 'Icon circle (default)', 'sgs-blocks' ), value: 'icon-circle' },
	{ label: __( 'Text only (pill badge)', 'sgs-blocks' ), value: 'text-only' },
	{ label: __( 'Image badge (logo / cert)', 'sgs-blocks' ), value: 'image-badge' },
];

const BADGE_SIZE_OPTIONS = [
	{ label: __( 'Small', 'sgs-blocks' ),  value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ),  value: 'large' },
];

const AUTO_SCROLL_SPEED_OPTIONS = [
	{ label: __( 'Slow (40s)', 'sgs-blocks' ),   value: 'slow' },
	{ label: __( 'Medium (25s)', 'sgs-blocks' ),  value: 'medium' },
	{ label: __( 'Fast (15s)', 'sgs-blocks' ),    value: 'fast' },
];

// ─── Editor sub-components ────────────────────────────────────────────────────

/** Circle wrapper with the actual selected icon for editor preview. */
function EditorIconCircle( { size, circleBg, iconColour, iconSlug, borderRadius, boxShadow, filled, fillColour } ) {
	// The filled class picks up the fill exemption from style.css (loaded in the
	// editor iframe), so the preview matches the frontend. fillColour drives the
	// same custom-fill var render.php sets.
	const style = {
		width: size,
		height: size,
		borderRadius: borderRadius || '50%',
		backgroundColor: circleBg || '#ffffff',
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
		boxShadow: boxShadow || '0 1px 2px rgba(0,0,0,0.06)',
		color: iconColour || 'currentColor',
	};
	if ( filled && fillColour ) {
		style[ '--sgs-trust-badge-icon-fill' ] = colourVar( fillColour );
	}
	return (
		<span
			className={ 'sgs-trust-bar__circle' + ( filled ? ' sgs-trust-bar__circle--filled' : '' ) }
			aria-hidden="true"
			style={ style }
		>
			<IconPreview
				source="lucide"
				name={ iconSlug || 'check' }
				size={ Math.round( size * 0.45 ) }
			/>
		</span>
	);
}

/** Inspector item editor for icon-circle variant. */
function IconCircleItemEditor( { item, onChange, onRemove } ) {
	const update = ( key, value ) => onChange( { ...item, [ key ]: value } );
	return (
		<div
			style={ {
				padding: '12px',
				marginBottom: '12px',
				background: item.pending ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.02)',
				borderRadius: '4px',
				border: item.pending ? '1px dashed #ccc' : '1px solid transparent',
				opacity: item.pending ? 0.75 : 1,
			} }
		>
			{ item.pending && (
				<Notice status="warning" isDismissible={ false } style={ { marginBottom: '8px' } }>
					{ __( 'Pending — hidden on the frontend until you uncheck "Pending".', 'sgs-blocks' ) }
				</Notice>
			) }
			<IconPicker
				label={ __( 'Icon', 'sgs-blocks' ) }
				value={ { source: 'lucide', name: item.icon || 'check' } }
				onChange={ ( { name } ) => update( 'icon', name ) }
				sources={ [ 'lucide' ] }
			/>
			<TextControl
				label={ __( 'Label', 'sgs-blocks' ) }
				value={ item.label || '' }
				onChange={ ( val ) => update( 'label', val ) }
				placeholder={ __( 'Badge label…', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<ToggleControl
				label={ __( 'Filled icon', 'sgs-blocks' ) }
				help={ __( 'Render the icon as a solid filled shape (e.g. a filled star) instead of a line outline.', 'sgs-blocks' ) }
				checked={ item.fillStyle === 'filled' }
				onChange={ ( val ) => update( 'fillStyle', val ? 'filled' : 'outline' ) }
				__nextHasNoMarginBottom
			/>
			{ item.fillStyle === 'filled' && (
				<DesignTokenPicker
					label={ __( 'Fill colour', 'sgs-blocks' ) }
					value={ item.fillColour || '' }
					onChange={ ( val ) => update( 'fillColour', val ) }
				/>
			) }
			<ToggleControl
				label={ __( 'Pending (hidden on frontend)', 'sgs-blocks' ) }
				help={ __( 'Keep the slot in the editor but hide it from visitors until the credential is confirmed.', 'sgs-blocks' ) }
				checked={ !! item.pending }
				onChange={ ( val ) => update( 'pending', val ) }
				__nextHasNoMarginBottom
			/>
			<Button variant="secondary" isDestructive onClick={ onRemove } size="small" style={ { marginTop: '8px' } }>
				{ __( 'Remove badge', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

/** Inspector item editor for text-only and image-badge variants. */
function GenericBadgeItemEditor( { item, index, badgeStyle, onChange, onRemove } ) {
	const update = ( key, value ) => onChange( { ...item, [ key ]: value } );
	return (
		<div style={ { borderBottom: '1px solid #ddd', paddingBottom: '12px', marginBottom: '12px' } }>
			<p style={ { fontWeight: 600, margin: '0 0 8px' } }>
				{ `#${ index + 1 }` }{ item.label ? ` — ${ item.label }` : '' }
			</p>

			{ 'image-badge' === badgeStyle && (
				<MediaPicker
					value={ item.media || null }
					onChange={ ( media ) => {
						const next = { ...item, media };
						if ( next.image ) {
							next.image = undefined;
						}
						onChange( next );
					} }
					onRemove={ () => onChange( { ...item, media: null, image: undefined } ) }
					allowedTypes={ [ 'image' ] }
					label={ __( 'Badge image', 'sgs-blocks' ) }
					instructionsImage={ __( 'Choose a certification badge or logo image', 'sgs-blocks' ) }
				/>
			) }

			<TextControl
				label={ __( 'Label', 'sgs-blocks' ) }
				value={ item.label || '' }
				onChange={ ( val ) => update( 'label', val ) }
				placeholder={ __( 'BRC Certified', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ /* Spec 35 §2 LINK standard — replaces the superseded inline
			   `SgsLinkControl` mount. `item.linkTarget` is a boolean-shaped
			   enum ('_self'/'_blank' only per block.json) that defaults to
			   "opens in new tab" when unset — preserved here by defaulting
			   the passed-in linkTarget to '_blank' rather than falling
			   through to targetMode="boolean"'s own '_self' fallback. */ }
			<LinkPopoverField
				label={ __( 'Link (optional)', 'sgs-blocks' ) }
				help={ __( 'Search your site or paste a URL to make this badge clickable.', 'sgs-blocks' ) }
				value={ {
					url: item.url || '',
					linkTarget: item.linkTarget || '_blank',
					rel: item.linkRel || '',
				} }
				targetMode="boolean"
				onChange={ ( next ) => {
					const patch = { ...item };
					if ( undefined !== next.url ) patch.url = next.url;
					if ( undefined !== next.linkTarget ) patch.linkTarget = next.linkTarget;
					if ( undefined !== next.rel ) patch.linkRel = next.rel;
					onChange( patch );
				} }
			/>
			<Button variant="secondary" isDestructive onClick={ onRemove } size="small" style={ { marginTop: '8px' } }>
				{ __( 'Remove badge', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

// ─── Main Edit component ──────────────────────────────────────────────────────
export default function Edit( { attributes, setAttributes } ) {
	const {
		badgeStyle,
		items,
		title,
		titleColour,
		labelColour,
		badgeSize,
		iconCircleSize,
		iconCircleBackground,
		iconColour,
		iconCircleBorderRadius,
		iconCircleShadow,
		iconCircleShadowColour,
		badgeImageBorderRadius,
		badgeImageSize,
		badgeImageShadow,
		badgeImageShadowColour,
		badgeImageObjectFit,
		textColour,
		columns,
		gap,
		layout,
		gridTemplateColumns,
		autoScroll,
		autoScrollSpeed,
		autoScrollPauseOnHover,
		shadow,
	} = attributes;

	const circleBgValue  = colourVar( iconCircleBackground ) || '#ffffff';
	const iconColourValue = colourVar( iconColour ) || 'currentColor';
	const textColourValue = colourVar( textColour ) || undefined;

	// Build className based on active variant.
	const blockClassName = [
		'sgs-trust-bar',
		`sgs-trust-bar--${ badgeStyle }`,
		`sgs-trust-bar--${ badgeSize }`,
	].join( ' ' );

	const circleRadiusValue = ( iconCircleBorderRadius && iconCircleBorderRadius !== '50%' )
		? iconCircleBorderRadius
		: undefined;
	const circleShadowValue = resolveShadowPreviewComposed( iconCircleShadow, iconCircleShadowColour );

	// Grid preview (icon-circle only — text-only/image-badge always render
	// `.sgs-trust-bar--text-only`/`--image-badge`'s own hardcoded flex-wrap,
	// style.css:111-117/155-158, regardless of layout/columns/gridTemplateColumns;
	// the "Badges" panel's Columns control is gated to icon-circle only for the
	// same reason). Ungated on `layout` presence matches render.php: layout
	// defaults to 'grid' (block.json), and only an explicit 'flex' would fall
	// back to the natural inline-flex wrap this block already renders without
	// any style here.
	const showBadgeGrid = badgeStyle === 'icon-circle' && 'flex' !== layout;
	const badgeGridTemplateColumns = showBadgeGrid
		? gridTemplateColumnsPreview( gridTemplateColumns, columns )
		: undefined;

	const blockProps = useBlockProps( {
		className: blockClassName,
		style: {
			...( shadow && { boxShadow: resolveShadowPreview( shadow ) } ),
			...( badgeStyle === 'icon-circle' ? {
				'--sgs-trust-bar-gap': gapCssValue( gap ),
				'--sgs-trust-badge-circle-size': iconCircleSize !== 44 ? `${ iconCircleSize }px` : undefined,
				'--sgs-trust-badge-circle-bg': circleBgValue,
				'--sgs-trust-badge-icon-colour': iconColourValue,
				'--sgs-trust-badge-text-colour': textColourValue,
				'--sgs-trust-badge-circle-radius': circleRadiusValue,
				'--sgs-trust-badge-circle-shadow': circleShadowValue,
			} : {} ),
			...( badgeGridTemplateColumns ? {
				display: 'grid',
				gridTemplateColumns: badgeGridTemplateColumns,
				gap: gapCssValue( gap ),
			} : {} ),
		},
	} );

	const updateItem = ( index, updated ) => {
		const next = [ ...items ];
		next[ index ] = updated;
		setAttributes( { items: next } );
	};

	const removeItem = ( index ) => {
		setAttributes( { items: items.filter( ( _, i ) => i !== index ) } );
	};

	const addItem = () => {
		const newItem = badgeStyle === 'icon-circle'
			? { icon: 'check', label: '', pending: false }
			: { label: '', url: '' };
		setAttributes( { items: [ ...items, newItem ] } );
	};

	return (
		<>
			{ /* D621/D622 — shadow colour split out of the legacy shape-only
				iconCircleShadow/badgeImageShadow attrs into SgsColourPanel rows,
				mounted first so they render at the top of the Styles tab. Scoped
				to shadow only — the block's other colour controls (iconColour,
				textColour, badge background) are pre-existing scattered
				DesignTokenPicker rows, left untouched (out of scope here). */ }
			<SgsColourPanel
				rows={ [
					badgeStyle === 'icon-circle' && iconCircleShadow && {
						key: 'icon-circle-shadow',
						label: __( 'Icon circle shadow colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: iconCircleShadowColour,
								onChange: ( val ) => setAttributes( { iconCircleShadowColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					badgeStyle === 'image-badge' && badgeImageShadow && {
						key: 'badge-image-shadow',
						label: __( 'Badge image shadow colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: badgeImageShadowColour,
								onChange: ( val ) => setAttributes( { badgeImageShadowColour: val ?? '' } ),
								linked: true,
							},
						],
					},
				] }
			/>
			<InspectorControls>

				{ /* ── Variant (behaviour: which badge mode renders) ─────────── */ }
				<PanelBody title={ __( 'Style', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Badge style', 'sgs-blocks' ) }
						value={ badgeStyle }
						options={ BADGE_STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { badgeStyle: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ /* ── Auto-scroll (behaviour) ───────────────────────────────── */ }
				<PanelBody title={ __( 'Auto-scroll', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Enable auto-scroll', 'sgs-blocks' ) }
						help={ __( 'When the number of badges exceeds what fits on screen, the row scrolls automatically like a marquee.', 'sgs-blocks' ) }
						checked={ !! autoScroll }
						onChange={ ( val ) => setAttributes( { autoScroll: val } ) }
						__nextHasNoMarginBottom
					/>
					{ autoScroll && (
						<>
							<SelectControl
								label={ __( 'Scroll speed', 'sgs-blocks' ) }
								value={ autoScrollSpeed }
								options={ AUTO_SCROLL_SPEED_OPTIONS }
								onChange={ ( val ) => setAttributes( { autoScrollSpeed: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<ToggleControl
								label={ __( 'Pause on hover', 'sgs-blocks' ) }
								checked={ !! autoScrollPauseOnHover }
								onChange={ ( val ) => setAttributes( { autoScrollPauseOnHover: val } ) }
								__nextHasNoMarginBottom
							/>
						</>
					) }
				</PanelBody>

				{ /* ── Badge items repeater (content) ─────────────────────────── */ }
				<PanelBody title={ __( 'Badges', 'sgs-blocks' ) }>
					{ badgeStyle === 'icon-circle' && (
						<p style={ { fontSize: '12px', color: '#757575', marginTop: 0 } }>
							{ __( 'Badges marked "Pending" are hidden on the frontend but remain editable.', 'sgs-blocks' ) }
						</p>
					) }
					{ items.map( ( item, index ) => (
						badgeStyle === 'icon-circle' ? (
							<IconCircleItemEditor
								key={ index }
								item={ item }
								onChange={ ( updated ) => updateItem( index, updated ) }
								onRemove={ () => removeItem( index ) }
							/>
						) : (
							<GenericBadgeItemEditor
								key={ index }
								item={ item }
								index={ index }
								badgeStyle={ badgeStyle }
								onChange={ ( updated ) => updateItem( index, updated ) }
								onRemove={ () => removeItem( index ) }
							/>
						)
					) ) }
					<Button
						variant="secondary"
						onClick={ addItem }
						style={ { width: '100%', justifyContent: 'center' } }
					>
						{ __( 'Add badge', 'sgs-blocks' ) }
					</Button>
				</PanelBody>

			</InspectorControls>

			<InspectorControls group="styles">

				{ /* Background (image/video/svg tabs + ken-burns/parallax) — root-level
					appearance, kept first in the Styles tab (mirrors sgs/container). */ }
				<BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } />

				{ /* ── Section (outer): width + min-height ──────────────────── */ }
				<PanelBody title={ __( 'Section (outer)', 'sgs-blocks' ) }>
					<WidthPanel attributes={ attributes } setAttributes={ setAttributes } />
					{ /*
						  `minHeight` is a TIER OBJECT — ONE attr holding
						  {desktop,tablet,mobile} (Spec 35 pass), same shape as
						  `gridTemplateColumns` in ContainerWrapperControls.
						  `minHeightTablet`/`…Mobile` are no longer declared in
						  block.json.
					*/ }
					<ResponsiveOverride
						label={ __( 'Min height', 'sgs-blocks' ) }
						value={ attributes.minHeight }
						onChange={ ( obj ) => setAttributes( { minHeight: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								value={ ownValue || '' }
								options={ MIN_HEIGHT_OPTIONS }
								onChange={ ( val ) => setOwnValue( val ) }
								help={ tier === 'desktop'
									? __( 'Desktop / base. Tablet and mobile override it at narrower widths.', 'sgs-blocks' )
									: undefined }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				{ /* ── Padding & margin (box-object tiers) ───────────────────── */ }
				{ /* Box-object interface contract (.claude/plans/2026-07-09-box-object-interface-contract.md
				     §5): base tier writes to the WP-native style.spacing object (also visible
				     in the Styles > Dimensions panel); tablet/mobile write to the
				     paddingTablet/paddingMobile + marginTablet/marginMobile object attrs
				     read by the shared wrapper's @media tiers. Mirrors sgs/container's edit.js. */ }
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

				{ /* ── Content band (Layer 2 __inner) — object attrs ─────────── */ }
				<PanelBody title={ __( 'Content band', 'sgs-blocks' ) } initialOpen={ false }>
					<p className="components-base-control__help">
						{ __( 'Styles the inner content band (the max-width wrapper set by Content width). Only active when Content width is set.', 'sgs-blocks' ) }
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

				{ /* ── Layout (grid/flex, columns, gap) ──────────────────────── */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<LayoutPanel attributes={ attributes } setAttributes={ setAttributes } />
				</PanelBody>

				{ /* ── Grid item defaults ─────────────────────────────────────── */ }
				<GridItemDefaultsPanel attributes={ attributes } setAttributes={ setAttributes } />

				{ /* ── Shadow — legacy string token attr (sm/md/lg/glow OR a raw
					box-shadow CSS string built by ShadowControl), resolved by
					sgs_shadow_value() (Spec 35 T2.2b). ────────────────────────── */ }
				<PanelBody title={ __( 'Shadow', 'sgs-blocks' ) } initialOpen={ false }>
					<ShadowControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						value={ attributes.shadow || '' }
						onChange={ ( val ) => setAttributes( { shadow: val } ) }
					/>
				</PanelBody>

				{ /* ── Shape dividers ─────────────────────────────────────────── */ }
				<ShapeDividersPanel attributes={ attributes } setAttributes={ setAttributes } />

				{ /* ── Badge size + label typography (appearance; badgeStyle mode
				     itself moved to the Settings tab's "Style" panel above) ──── */ }
				{ badgeStyle !== 'icon-circle' && (
					<PanelBody title={ __( 'Badge size & typography', 'sgs-blocks' ) } initialOpen={ false }>
						{ /* Badge size only applies to text-only and image-badge variants.
						     In icon-circle mode, sizing is controlled by the Icon circle size
						     range control in the Appearance panel — showing this control there
						     would create a dead second size control with no visible effect. */ }
						<SelectControl
							label={ __( 'Badge size', 'sgs-blocks' ) }
							value={ badgeSize }
							options={ BADGE_SIZE_OPTIONS }
							onChange={ ( val ) => setAttributes( { badgeSize: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<p style={ { fontSize: '12px', fontWeight: 600, marginBottom: '4px' } }>
							{ __( 'Label typography', 'sgs-blocks' ) }
						</p>
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix="label"
							showLineHeight={ false }
						/>
					</PanelBody>
				) }

				{ /* ── Optional title (text-only + image-badge) ─────────────── */ }
				{ ( badgeStyle === 'text-only' || badgeStyle === 'image-badge' ) && (
					<PanelBody title={ __( 'Title', 'sgs-blocks' ) } initialOpen={ false }>
						<p style={ { fontSize: '12px', color: '#757575', marginTop: 0 } }>
							{ __( 'Optional heading above the badge row.', 'sgs-blocks' ) }
						</p>
						<DesignTokenPicker
							label={ __( 'Title colour', 'sgs-blocks' ) }
							value={ titleColour }
							onChange={ ( val ) => setAttributes( { titleColour: val } ) }
						/>
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix="title"
						/>
					</PanelBody>
				) }

				{ /* ── icon-circle appearance controls ──────────────────────── */ }
				{ badgeStyle === 'icon-circle' && (
					<PanelBody title={ __( 'Appearance', 'sgs-blocks' ) } initialOpen={ false }>
						<RangeControl
							label={ __( 'Icon circle size (px)', 'sgs-blocks' ) }
							value={ iconCircleSize }
							onChange={ ( val ) => setAttributes( { iconCircleSize: val } ) }
							min={ 36 }
							max={ 64 }
							step={ 2 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<DesignTokenPicker
							label={ __( 'Icon circle background', 'sgs-blocks' ) }
							value={ iconCircleBackground }
							onChange={ ( val ) => setAttributes( { iconCircleBackground: val } ) }
						/>
						{ /* §14.3 raw-TextControl violation fixed (D561). '%' is
						     load-bearing here — the attribute DEFAULTS to '50%' to
						     make the circle, so a px-only units array would silently
						     remove the block's own default shape. */ }
						<UnitControl
							label={ __( 'Icon circle border radius', 'sgs-blocks' ) }
							value={ iconCircleBorderRadius }
							onChange={ ( val ) => setAttributes( { iconCircleBorderRadius: val || '' } ) }
							units={ [
								{ value: '%', label: '%', default: 50 },
								{ value: 'px', label: 'px', default: 8 },
								{ value: 'rem', label: 'rem', default: 0.5 },
								{ value: 'em', label: 'em', default: 0.5 },
							] }
							help={ __( "50% makes a circle; a px value makes a rounded square.", 'sgs-blocks' ) }
							__next40pxDefaultSize
						/>
						<ShadowControl
							label={ __( 'Icon circle shadow', 'sgs-blocks' ) }
							value={ iconCircleShadow }
							onChange={ ( val ) => setAttributes( { iconCircleShadow: val } ) }
							colour={ iconCircleShadowColour }
							onColourChange={ ( val ) => setAttributes( { iconCircleShadowColour: val } ) }
						/>
						<DesignTokenPicker
							label={ __( 'Icon colour', 'sgs-blocks' ) }
							value={ iconColour }
							onChange={ ( val ) => setAttributes( { iconColour: val } ) }
						/>
						<DesignTokenPicker
							label={ __( 'Label colour', 'sgs-blocks' ) }
							value={ textColour }
							onChange={ ( val ) => setAttributes( { textColour: val } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{ /* ── image-badge appearance controls ──────────────────────── */ }
				{ badgeStyle === 'image-badge' && (
					<PanelBody title={ __( 'Appearance', 'sgs-blocks' ) } initialOpen={ false }>
						<RangeControl
							label={ __( 'Badge image size (px)', 'sgs-blocks' ) }
							value={ badgeImageSize }
							onChange={ ( val ) => setAttributes( { badgeImageSize: val } ) }
							min={ 24 }
							max={ 160 }
							step={ 4 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<SelectControl
							label={ __( 'Image fit', 'sgs-blocks' ) }
							value={ badgeImageObjectFit }
							options={ [
								{ label: __( 'Contain (show whole logo)', 'sgs-blocks' ), value: 'contain' },
								{ label: __( 'Cover (fill the box)', 'sgs-blocks' ), value: 'cover' },
							] }
							onChange={ ( val ) => setAttributes( { badgeImageObjectFit: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						{ /* §14.3 raw-TextControl violation fixed (D561). Same units
						     array as the icon circle above — '%' reaches the circle
						     case the old help text advertised. */ }
						<UnitControl
							label={ __( 'Badge image border radius', 'sgs-blocks' ) }
							value={ badgeImageBorderRadius }
							onChange={ ( val ) => setAttributes( { badgeImageBorderRadius: val || '' } ) }
							units={ [
								{ value: 'px', label: 'px', default: 8 },
								{ value: '%', label: '%', default: 50 },
								{ value: 'rem', label: 'rem', default: 0.5 },
								{ value: 'em', label: 'em', default: 0.5 },
							] }
							help={ __( 'Leave blank for square corners; 50% makes a circle.', 'sgs-blocks' ) }
							__next40pxDefaultSize
						/>
						<ShadowControl
							label={ __( 'Badge image shadow', 'sgs-blocks' ) }
							value={ badgeImageShadow }
							onChange={ ( val ) => setAttributes( { badgeImageShadow: val } ) }
							colour={ badgeImageShadowColour }
							onColourChange={ ( val ) => setAttributes( { badgeImageShadowColour: val } ) }
						/>
					</PanelBody>
				) }

				{ /* ── text-only / image-badge label styling ─────────────────── */ }
				{ ( badgeStyle === 'text-only' || badgeStyle === 'image-badge' ) && (
					<PanelBody title={ __( 'Label styling', 'sgs-blocks' ) } initialOpen={ false }>
						<DesignTokenPicker
							label={ __( 'Label colour', 'sgs-blocks' ) }
							value={ labelColour }
							onChange={ ( val ) => setAttributes( { labelColour: val } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{ /* ── Badges (icon-circle only) ──────────────────────────────
				     Named for the ELEMENT it controls, not the property cluster
				     (CO-2, element-first panel naming). It was "Layout" until
				     2026-08-08, which collided verbatim with the SECTION's own
				     "Layout" panel higher up the same tab: two panels, same word,
				     different scopes. A cluster name is only correct when the
				     controls apply to no single element — this one is badge-scoped
				     (`columns` drives the badge grid), so it takes the element's
				     name, exactly as sgs/button names its icon panel "Icon". */ }
				{ badgeStyle === 'icon-circle' && (
					<PanelBody title={ __( 'Badges', 'sgs-blocks' ) } initialOpen={ false }>
						{ /*
							  columns is a TIER OBJECT — ONE attr holding
							  {desktop,tablet,mobile} (Spec 35 pass 4). It must
							  therefore use ResponsiveOverride, which reads and
							  writes the object, NOT a bare RangeControl writing
							  a raw number — that would coerce the object-typed
							  attr to its default and drop the whole setting
							  (D563 bug class). `columnsTablet`/`columnsMobile`
							  are no longer declared by block.json; the tier
							  object's tablet/mobile keys carry the "at 600px+"
							  stacking behaviour that used to be an implicit
							  default (4/4/2).
						*/ }
						<ResponsiveOverride
							label={ __( 'Columns', 'sgs-blocks' ) }
							value={ columns }
							onChange={ ( obj ) => setAttributes( { columns: obj } ) }
						>
							{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => (
								<RangeControl
									value={
										ownValue !== ''
											? ownValue
											: ( effectiveValue !== '' ? effectiveValue : ( tier === 'mobile' ? 2 : 4 ) )
									}
									onChange={ setOwnValue }
									min={ 2 }
									max={ 6 }
									step={ 1 }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							) }
						</ResponsiveOverride>
						{ /* Gap between badges is provided by the shared ContainerWrapperControls
						     "Gap" responsive control (writes the same `gap` attr via the wrapper
						     helper). Removed here to eliminate UI duplication. */ }
					</PanelBody>
				) }

			</InspectorControls>

			{ /* ── Editor canvas ───────────────────────────────────────────── */ }
			<div { ...blockProps }>

				{ /* Optional title (text-only + image-badge variants) */ }
				{ ( badgeStyle === 'text-only' || badgeStyle === 'image-badge' ) && (
					<RichText
						tagName="p"
						className="sgs-trust-bar__title"
						value={ title }
						onChange={ ( val ) => setAttributes( { title: val } ) }
						placeholder={ __( 'Trusted certifications & memberships', 'sgs-blocks' ) }
						style={ {
							color: colourVar( titleColour ) || undefined,
						} }
					/>
				) }

				{ /* ── Curated items preview ───────────────────────────────── */ }
				{ items.length === 0 ? (
						<p style={ { color: '#757575', fontStyle: 'italic' } }>
							{ __( 'Add badges in the sidebar panel.', 'sgs-blocks' ) }
						</p>
					) : (
						items.map( ( item, index ) => {
							if ( badgeStyle === 'icon-circle' ) {
								const isPending = !! item.pending;
								return (
									<div
										key={ index }
										className="sgs-trust-bar__badge"
										style={ { opacity: isPending ? 0.45 : 1 } }
										title={ isPending ? __( 'Pending — hidden on frontend', 'sgs-blocks' ) : undefined }
									>
										<EditorIconCircle
											size={ iconCircleSize }
											circleBg={ circleBgValue }
											iconColour={ iconColourValue }
											iconSlug={ item.icon || 'check' }
											borderRadius={ iconCircleBorderRadius !== '50%' ? iconCircleBorderRadius : undefined }
											boxShadow={ circleShadowValue }
											filled={ item.fillStyle === 'filled' }
											fillColour={ item.fillColour }
										/>
										<span className="sgs-trust-bar__label" style={ { color: textColourValue } }>
											{ item.label || <em>{ __( '(no label)', 'sgs-blocks' ) }</em> }
											{ isPending && (
												<span style={ {
													marginLeft: '6px', fontSize: '10px', fontWeight: 600,
													textTransform: 'uppercase', background: '#f0ad4e',
													color: '#fff', padding: '1px 5px', borderRadius: '3px',
													letterSpacing: '0.05em',
												} }>
													{ __( 'Pending', 'sgs-blocks' ) }
												</span>
											) }
										</span>
									</div>
								);
							}

							if ( badgeStyle === 'text-only' ) {
								return (
									<div key={ index } className="sgs-trust-bar__badge">
										<span
											className="sgs-trust-bar__badge-label"
											style={ {
												color: colourVar( labelColour ) || undefined,
											} }
										>
											{ item.label || <em>{ __( '(no label)', 'sgs-blocks' ) }</em> }
										</span>
									</div>
								);
							}

							// image-badge
							const mediaUrl = item.media?.url || item.image?.url || '';
							const mediaAlt = item.media?.alt || item.label || '';
							return (
								<div key={ index } className="sgs-trust-bar__badge">
									{ mediaUrl && (
										<img
											src={ mediaUrl }
											alt={ mediaAlt }
											className="sgs-trust-bar__badge-img"
											style={ {
												width: `${ badgeImageSize }px`,
												height: `${ badgeImageSize }px`,
												objectFit: badgeImageObjectFit === 'cover' ? 'cover' : 'contain',
												borderRadius: badgeImageBorderRadius || undefined,
												boxShadow: resolveShadowPreviewComposed( badgeImageShadow, badgeImageShadowColour ),
											} }
										/>
									) }
									{ item.label && (
										<span
											className="sgs-trust-bar__badge-label"
											style={ {
												color: colourVar( labelColour ) || undefined,
											} }
										>
											{ item.label }
										</span>
									) }
								</div>
							);
						} )
					)
				}
			</div>
		</>
	);
}
