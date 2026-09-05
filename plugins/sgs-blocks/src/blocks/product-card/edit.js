import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	MediaPlaceholder,
	RichText,
} from '@wordpress/block-editor';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import {
	TypographyControls,
	ResponsiveBoxControl,
	ResponsiveBorderRadiusControl,
	LinkPopoverField,
	SgsColourPanel,
	SgsLengthControl,
	SgsBorderControl,
	MediaElementPanel,
} from '../../components';
import { BUTTON_PRESETS } from '../button/presets';
import {
	PanelBody,
	SelectControl,
	TextControl,
	TextareaControl,
	ComboboxControl,
	ToggleControl,
	CheckboxControl,
	Notice,
	Spinner,
	Button,
} from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import apiFetch from '@wordpress/api-fetch';
import ServerSideRender from '@wordpress/server-side-render';
import { BoxControl, NumberControl, ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { SGS_LENGTH_UNITS, sgsNormaliseLength, resolveTextColourPreviewStyle } from '../../utils';

/** Sentinel value for the "No product connected" option. */
const TYPED_VALUE = '__typed__';

/** CSS-length units for the picker border-radius UnitControls (R4 forward). */
const PICKER_RADIUS_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: '%', label: '%', default: 0 },
];

/*
 * Override-able elements (Bean design, FP-H final unit): 'name', 'description',
 * 'badge', 'image', 'cta' — see ContentOverridesPanel. PRICE IS NEVER
 * OVERRIDABLE (page ↔ schema ↔ feed parity) — deliberately absent.
 */

/** Allowed CTA behaviour options — typed mode locks to 'learn-more'. */
const CTA_BEHAVIOUR_OPTIONS = [
	{ value: 'learn-more', label: __( 'Learn more (link to product page)', 'sgs-blocks' ) },
	{ value: 'add-to-basket', label: __( 'Add to basket (cart proxy)', 'sgs-blocks' ) },
	{ value: 'buy-now', label: __( 'Buy now (add + go to checkout)', 'sgs-blocks' ) },
];

/** Allowed CTA style options — mirrors btn-* vocabulary in style.css. */
const CTA_STYLE_OPTIONS = [
	{ value: 'primary', label: __( 'Primary', 'sgs-blocks' ) },
	{ value: 'secondary', label: __( 'Secondary', 'sgs-blocks' ) },
	{ value: 'outline', label: __( 'Outline', 'sgs-blocks' ) },
];

/**
 * Product source panel — searchable picker that lists both WooCommerce
 * products (wc/v3/products, when WC is active) and SGS products
 * (wp/v2/sgs_product). Selecting one auto-sets productId + sourceMode.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 */
function ProductSourcePanel( { attributes, setAttributes } ) {
	const { sourceMode, productId, taxDisplayMode } = attributes;
	const [ search, setSearch ] = useState( '' );
	const [ wcOptions, setWcOptions ] = useState( [] );
	const [ wcLoading, setWcLoading ] = useState( false );

	// SGS CPT products via the entity store (REST: wp/v2/sgs-products).
	const { cptRecords, cptResolving } = useSelect(
		( select ) => {
			const query = { per_page: 20, search: search || undefined };
			return {
				cptRecords: select( coreStore ).getEntityRecords(
					'postType',
					'sgs_product',
					query
				),
				cptResolving: select( coreStore ).isResolving(
					'getEntityRecords',
					[ 'postType', 'sgs_product', query ]
				),
			};
		},
		[ search ]
	);

	// WooCommerce products via the WC REST API (not a WP entity).
	useEffect( () => {
		let cancelled = false;
		setWcLoading( true );
		apiFetch( {
			path: `/wc/v3/products?per_page=20&search=${ encodeURIComponent(
				search
			) }`,
		} )
			.then( ( items ) => {
				if ( cancelled ) {
					return;
				}
				setWcOptions(
					( items || [] ).map( ( p ) => ( {
						value: `wc:${ p.id }`,
						label: `${ p.name } (WooCommerce)`,
					} ) )
				);
			} )
			.catch( () => {
				// WooCommerce inactive or endpoint unavailable — silently skip.
				if ( ! cancelled ) {
					setWcOptions( [] );
				}
			} )
			.finally( () => {
				if ( ! cancelled ) {
					setWcLoading( false );
				}
			} );
		return () => {
			cancelled = true;
		};
	}, [ search ] );

	const cptOptions = ( cptRecords || [] ).map( ( p ) => ( {
		value: `cpt:${ p.id }`,
		label: `${
			p.title?.rendered || __( '(no title)', 'sgs-blocks' )
		} (SGS)`,
	} ) );

	const options = [
		{
			value: TYPED_VALUE,
			label: __( 'No product connected', 'sgs-blocks' ),
		},
		...wcOptions,
		...cptOptions,
	];

	// Current combobox value derived from sourceMode + productId.
	let currentValue = TYPED_VALUE;
	if ( 'wc-product' === sourceMode && productId ) {
		currentValue = `wc:${ productId }`;
	} else if ( 'sgs-cpt' === sourceMode && productId ) {
		currentValue = `cpt:${ productId }`;
	}

	function onSelect( value ) {
		if ( ! value || TYPED_VALUE === value ) {
			setAttributes( { sourceMode: 'typed', productId: 0 } );
			return;
		}
		const [ kind, id ] = value.split( ':' );
		setAttributes( {
			sourceMode: 'wc' === kind ? 'wc-product' : 'sgs-cpt',
			productId: Number.parseInt( id, 10 ) || 0,
		} );
	}

	const loading = wcLoading || cptResolving;

	return (
		<PanelBody
			title={ __( 'Connected product', 'sgs-blocks' ) }
			initialOpen={ true }
		>
			<ComboboxControl
				label={ __( 'Connected product', 'sgs-blocks' ) }
				help={ __(
					'Connect a WooCommerce product to fill this card with live data. Leave unconnected to author the card by hand.',
					'sgs-blocks'
				) }
				value={ currentValue }
				options={ options }
				onChange={ onSelect }
				onFilterValueChange={ ( v ) => setSearch( v ) }
				__nextHasNoMarginBottom
			/>
			{ loading && <Spinner /> }
			{ 'typed' !== sourceMode && productId > 0 && (
				<Notice
					status="info"
					isDismissible={ false }
					style={ { marginTop: 8 } }
				>
					{ __( 'Linked product #', 'sgs-blocks' ) }
					{ productId }
					{ 'wc-product' === sourceMode
						? __( '(WooCommerce).', 'sgs-blocks' )
						: __( '(SGS product).', 'sgs-blocks' ) }
				</Notice>
			) }
			{ 'wc-product' === sourceMode && productId > 0 && (
				<>
					<SelectControl
						label={ __( 'Price display (VAT)', 'sgs-blocks' ) }
						help={ __(
							'How the price line reads. Display only — the cart always charges the correct VAT-inclusive price.',
							'sgs-blocks'
						) }
						value={ taxDisplayMode || 'auto' }
						options={ [
							{
								label: __( 'Automatic (follow shop tax setting)', 'sgs-blocks' ),
								value: 'auto',
							},
							{
								label: __( 'Inclusive + "inc. VAT" suffix', 'sgs-blocks' ),
								value: 'inc-suffix',
							},
							{
								label: __( 'Ex-VAT price + VAT amount (trade/B2B)', 'sgs-blocks' ),
								value: 'ex-plus-vat',
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { taxDisplayMode: value } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ 'ex-plus-vat' === taxDisplayMode && (
						<Notice
							status="warning"
							isDismissible={ false }
							style={ { marginTop: 8 } }
						>
							{ __(
								'Trade/B2B only. UK consumer law (Price Marking Order 2004) requires the VAT-inclusive price to be the prominent price on a consumer shop — do not use this option for B2C.',
								'sgs-blocks'
							) }
						</Notice>
					) }
				</>
			) }
		</PanelBody>
	);
}

/**
 * Product options panel (connected products only) — visibleAxes checkbox list.
 * Derives the connected product's attribute taxonomies from the shared
 * /wc/v3/products/{id} fetch in Edit (single round-trip, reused by the
 * overrides panel too) so the operator can tick which axes to show.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?Object}  props.wcProduct     The connected WC product (or null).
 * @param {boolean}  props.loading       True while the product fetch is in flight.
 */
function ProductOptionsPanel( { attributes, setAttributes, wcProduct, loading } ) {
	const { visibleAxes } = attributes;
	const axesLoading = loading;
	const wcAxes = ( wcProduct?.attributes || [] )
		.filter( ( a ) => a.variation )
		.map( ( a ) => ( {
			slug: a.slug || `pa_${ a.name.toLowerCase().replace( /\s+/g, '-' ) }`,
			label: a.name,
		} ) );

	if ( ! wcAxes.length && ! axesLoading ) {
		return null;
	}

	const currentAxes = Array.isArray( visibleAxes ) ? visibleAxes : [];

	function toggleAxis( slug, checked ) {
		const next = checked
			? [ ...currentAxes.filter( ( s ) => s !== slug ), slug ]
			: currentAxes.filter( ( s ) => s !== slug );
		setAttributes( { visibleAxes: next } );
	}

	return (
		<PanelBody
			title={ __( 'Product options', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			{ axesLoading && <Spinner /> }
			{ ! axesLoading && (
				<>
					<p style={ { marginTop: 0 } }>
						{ __(
							'Choose which option axes to show. Untick to hide an axis from the picker (the product combos and pricing remain correct).',
							'sgs-blocks'
						) }
					</p>
					{ wcAxes.map( ( axis ) => (
						<CheckboxControl
							key={ axis.slug }
							label={ axis.label }
							checked={
								currentAxes.length === 0 ||
								currentAxes.includes( axis.slug )
							}
							onChange={ ( checked ) =>
								toggleAxis( axis.slug, checked )
							}
							__nextHasNoMarginBottom
						/>
					) ) }
					{ currentAxes.length === 0 && (
						<Notice
							status="info"
							isDismissible={ false }
							style={ { marginTop: 8 } }
						>
							{ __(
								'All axes shown (default). Untick one to hide it.',
								'sgs-blocks'
							) }
						</Notice>
					) }
				</>
			) }
		</PanelBody>
	);
}

/**
 * Content overrides panel (connected products only) — Bean's per-element
 * override design (FP-H final unit).
 *
 * Per element: ToggleControl "Override <element>". ON = the typed field shows
 * beneath and its non-empty value replaces the live value on the front end.
 * OFF = the field hides but its value is PRESERVED (toggle back without
 * retyping); the live value renders. An empty override never blanks the card.
 *
 * PRICE IS NEVER OVERRIDABLE (page ↔ schema ↔ feed parity) — no toggle here.
 *
 * Live previews + the image gallery strip reuse the SINGLE /wc/v3/products/{id}
 * fetch from Edit (no new REST round-trips).
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?Object}  props.wcProduct     The connected WC product (or null).
 */
function ContentOverridesPanel( { attributes, setAttributes, wcProduct } ) {
	const { overrideElements, variantStyle, ctaBehaviour } = attributes;
	const overrides = Array.isArray( overrideElements ) ? overrideElements : [];

	const isOn = ( el ) => overrides.includes( el );

	function toggle( el, on ) {
		// Only mutate the override LIST — never the element's typed attr value
		// (preserved so the operator can toggle back without retyping).
		const next = on
			? [ ...overrides.filter( ( e ) => e !== el ), el ]
			: overrides.filter( ( e ) => e !== el );
		setAttributes( { overrideElements: next } );
	}

	const stripTags = ( html ) =>
		( html || '' ).replace( /<[^>]*>/g, '' ).trim();

	const liveName = wcProduct?.name || '';
	const liveDesc = stripTags( wcProduct?.short_description );
	const galleryImages = wcProduct?.images || [];

	// The badge attr follows the variant (mirrors render.php's resolution).
	const isFeatured = variantStyle === 'featured';
	const badgeAttr = isFeatured ? 'featuredTag' : 'trialTag';
	const badgeApplies = variantStyle === 'trial' || isFeatured;

	/* translators: live-value preview under an override toggle. */
	const liveHelp = ( value ) =>
		value ? `${ __( 'Live value:', 'sgs-blocks' ) } ${ value }` : undefined;

	return (
		<>
			<p style={ { marginTop: 0, marginBottom: 16 } }>
				{ __(
					"Replace individual live product details with your own text. Switching an override off keeps your text for later. Price always comes from the product.",
					"sgs-blocks"
				) }
			</p>
			<ToolsPanel
				label={ __( "Content overrides", "sgs-blocks" ) }
				resetAll={ () =>
					setAttributes( {
						overrideElements: [],
						productName: "",
						description: "",
						trialTag: "",
						featuredTag: "",
						image: "",
						imageId: 0,
						imageAlt: "",
						ctaText: "",
						ctaUrl: "",
					} )
				}
			>
				{ /* Name */ }
				<ToolsPanelItem
					label={ __( "Override name", "sgs-blocks" ) }
					hasValue={ () => isOn( "name" ) }
					onDeselect={ () => toggle( "name", false ) }
					isShownByDefault
				>
					<ToggleControl
						label={ __( "Override name", "sgs-blocks" ) }
						checked={ isOn( "name" ) }
						onChange={ ( on ) => toggle( "name", on ) }
						help={ ! isOn( "name" ) ? liveHelp( liveName ) : undefined }
						__nextHasNoMarginBottom
					/>
					{ isOn( "name" ) && (
						<TextControl
							label={ __( "Name", "sgs-blocks" ) }
							value={ attributes.productName || "" }
							onChange={ ( v ) =>
								setAttributes( { productName: v } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</ToolsPanelItem>

				{ /* Description */ }
				<ToolsPanelItem
					label={ __( "Override description", "sgs-blocks" ) }
					hasValue={ () => isOn( "description" ) }
					onDeselect={ () => toggle( "description", false ) }
					isShownByDefault
				>
					<ToggleControl
						label={ __( "Override description", "sgs-blocks" ) }
						checked={ isOn( "description" ) }
						onChange={ ( on ) => toggle( "description", on ) }
						help={
							! isOn( "description" )
								? liveHelp( liveDesc )
								: undefined
						}
						__nextHasNoMarginBottom
					/>
					{ isOn( "description" ) && (
						<TextareaControl
							label={ __( "Description", "sgs-blocks" ) }
							value={ attributes.description || "" }
							onChange={ ( v ) =>
								setAttributes( { description: v } )
							}
							__nextHasNoMarginBottom
						/>
					) }
				</ToolsPanelItem>

				{ /* Badge */ }
				<ToolsPanelItem
					label={ __( "Override badge", "sgs-blocks" ) }
					hasValue={ () => isOn( "badge" ) }
					onDeselect={ () => toggle( "badge", false ) }
				>
					<ToggleControl
						label={ __( "Override badge", "sgs-blocks" ) }
						checked={ isOn( "badge" ) }
						onChange={ ( on ) => toggle( "badge", on ) }
						__nextHasNoMarginBottom
					/>
					{ isOn( "badge" ) &&
						( badgeApplies ? (
							<TextControl
								label={ __( "Badge text", "sgs-blocks" ) }
								value={ attributes[ badgeAttr ] || "" }
								onChange={ ( v ) =>
									setAttributes( { [ badgeAttr ]: v } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) : (
							<Notice status="info" isDismissible={ false }>
								{ __(
									"Badges show on the Trial and Featured variants. Choose one under Card.",
									"sgs-blocks"
								) }
							</Notice>
						) ) }
				</ToolsPanelItem>

				{ /* Image */ }
				<ToolsPanelItem
					label={ __( "Override image", "sgs-blocks" ) }
					hasValue={ () => isOn( "image" ) }
					onDeselect={ () => toggle( "image", false ) }
					isShownByDefault
				>
					<ToggleControl
						label={ __( "Override image", "sgs-blocks" ) }
						checked={ isOn( "image" ) }
						onChange={ ( on ) => toggle( "image", on ) }
						help={ __(
							'Sets the card’s default image. Variation photos still swap in when an option is selected.',
							"sgs-blocks"
						) }
						__nextHasNoMarginBottom
					/>
					{ isOn( "image" ) && (
						<>
							{ galleryImages.length > 0 && (
								<div
									style={ {
										display: "flex",
										flexWrap: "wrap",
										gap: 8,
										margin: "8px 0",
									} }
									aria-label={ __(
										"Product gallery images",
										"sgs-blocks"
									) }
								>
									{ galleryImages.map( ( img, i ) => (
										<Button
											key={ img.id || i }
											onClick={ () =>
												setAttributes( {
													image: img.src,
													// img is a WooCommerce REST product image object
													// ({id,src,name,alt}) — img.id is a real WP
													// attachment ID, not a synthetic gallery index.
													imageId: img.id || 0,
													imageAlt: img.alt || "",
												} )
											}
											aria-label={ `${ __(
												"Use gallery image",
												"sgs-blocks"
											) } ${ i + 1 }` }
											style={ {
												padding: 0,
												width: 48,
												height: 48,
												minWidth: 44,
												minHeight: 44,
												overflow: "hidden",
												borderRadius: 4,
												border:
													attributes.image === img.src
														? "2px solid var(--wp-admin-theme-color, #007cba)"
														: "2px solid transparent",
											} }
										>
											<img
												src={ img.src }
												alt={ img.alt || "" }
												style={ {
													width: "100%",
													height: "100%",
													objectFit: "cover",
												} }
											/>
										</Button>
									) ) }
								</div>
							) }
							<MediaUploadCheck>
								<MediaUpload
									onSelect={ ( media ) =>
										setAttributes( {
											image: media.url,
											imageId: media.id || 0,
											imageAlt: media.alt || "",
										} )
									}
									allowedTypes={ [ "image" ] }
									render={ ( { open } ) => (
										<Button
											variant="secondary"
											onClick={ open }
										>
											{ __(
												"Choose another image",
												"sgs-blocks"
											) }
										</Button>
									) }
								/>
							</MediaUploadCheck>
						</>
					) }
				</ToolsPanelItem>

				{ /* CTA */ }
				<ToolsPanelItem
					label={ __( "Override button", "sgs-blocks" ) }
					hasValue={ () => isOn( "cta" ) }
					onDeselect={ () => toggle( "cta", false ) }
					isShownByDefault
				>
					<ToggleControl
						label={ __( "Override button", "sgs-blocks" ) }
						checked={ isOn( "cta" ) }
						onChange={ ( on ) => toggle( "cta", on ) }
						__nextHasNoMarginBottom
					/>
					{ isOn( "cta" ) && (
						<>
							<TextControl
								label={ __( "Button text", "sgs-blocks" ) }
								value={ attributes.ctaText || "" }
								onChange={ ( v ) =>
									setAttributes( { ctaText: v } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							{ ( ctaBehaviour || "learn-more" ) ===
							"learn-more" ? (
								/* Spec 35 §2 LINK standard, searchOnly mode — ctaUrl
								   is a bare string with no target/rel concept. */
								<LinkPopoverField
									label={ __( "Button link", "sgs-blocks" ) }
									value={ attributes.ctaUrl || "" }
									onChange={ ( url ) =>
										setAttributes( { ctaUrl: url } )
									}
									searchOnly
								/>
							) : (
								<Notice status="info" isDismissible={ false }>
									{ __(
										"Only the button text is overridable for basket buttons — the button keeps its basket action.",
										"sgs-blocks"
									) }
								</Notice>
							) }
						</>
					) }
				</ToolsPanelItem>
			</ToolsPanel>
		</>
	);
}

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		variantStyle,
		sourceMode,
		cardMaxWidth,
		imageHeight,
		indexVariationUrl,
		framingMode,
		decoyEnabled,
		// Typed built-in attrs.
		productName,
		description,
		image,
		imageAlt,
		imageDecorative,
		packSizes,
		priceLarge,
		priceNote,
		ctaText,
		ctaUrl,
		cta2Text,
		cta2Url,
		headingLevel,
		ctaStyle,
		cta2Style,
		ctaBehaviour,
		pickerLabelFontSize,
		pickerLabelColour,
		pickerColourPreset,
		pickerShowSelectedTick,
		pickerPillBgColour,
		pickerPillTextColour,
		pickerPillBorderColour,
		pickerPillBorderRadius,
		pickerPillSelectedBgColour,
		pickerPillSelectedTextColour,
		pickerPillSelectedBorderColour,
		pickerPillSelectedBorderRadius,
		titleColour,
		titleColourGradient,
		priceColour,
		priceColourGradient,
		descColour,
		descColourGradient,
		priceNoteColour,
		priceNoteColourGradient,
		// Built-in CTA styling (typed + bound share the same cta* attrs).
		ctaColourBackground,
		ctaColourText,
		ctaColourTextGradient,
		ctaColourBorder,
		ctaColourBorderGradient,
		ctaColourBackgroundHover,
		ctaColourTextHover,
		ctaColourTextHoverGradient,
		ctaColourBorderHover,
		ctaColourBorderHoverGradient,
		ctaBorderStyle,
		ctaBorderWidth,
		ctaBorderRadius,
		ctaFontWeight,
		ctaFontSize,
		ctaPadding,
		ctaWidthType,
		cardPadding,
		// Card root colour/border (R2c, B-3/B-8) — block-private, replaces the
		// native style.color/__experimentalBorder path.
		backgroundColour,
		backgroundColourGradient,
		backgroundColourHover,
		backgroundColourHoverGradient,
		textColour,
		textColourGradient,
		textColourHover,
		textColourHoverGradient,
		borderColour,
		borderColourGradient,
		borderWidth,
		borderStyle,
	} = attributes;

	const isTrial = variantStyle === 'trial';
	const isFeatured = variantStyle === 'featured';
	const isBound = sourceMode !== 'typed';

	// Typed mode = the built-in element editor. The block has no InnerBlocks
	// slot.
	const isBuiltIn = ! isBound;

	// FP-H final unit: SINGLE shared /wc/v3/products/{id} fetch for the
	// connected product — reused by ProductOptionsPanel (axes), the overrides
	// panel (live-value help + gallery strip). No per-panel round-trips.
	const [ wcProduct, setWcProduct ] = useState( null );
	const [ wcProductLoading, setWcProductLoading ] = useState( false );
	const boundProductId = attributes.productId || 0;

	useEffect( () => {
		if ( 'wc-product' !== sourceMode || ! boundProductId ) {
			setWcProduct( null );
			return;
		}
		let cancelled = false;
		setWcProductLoading( true );
		apiFetch( { path: `/wc/v3/products/${ boundProductId }` } )
			.then( ( product ) => {
				if ( ! cancelled ) {
					setWcProduct( product || null );
				}
			} )
			.catch( () => {
				if ( ! cancelled ) {
					setWcProduct( null );
				}
			} )
			.finally( () => {
				if ( ! cancelled ) {
					setWcProductLoading( false );
				}
			} );
		return () => {
			cancelled = true;
		};
	}, [ sourceMode, boundProductId ] );

	// Q3: allowlist the style slugs before interpolating into className —
	// a stale/imported attribute value must not inject an arbitrary class.
	const ctaStyleSlugs = CTA_STYLE_OPTIONS.map( ( o ) => o.value );
	const safeCtaStyle = ctaStyleSlugs.includes( ctaStyle )
		? ctaStyle
		: 'primary';
	const safeCta2Style = ctaStyleSlugs.includes( cta2Style )
		? cta2Style
		: 'secondary';

	// Contrast check for border colour — warn if border fails WCAG AA contrast
	// against the card's own background. When the background is a gradient,
	// comparing against the flat colour would compare against a surface that
	// isn't rendered — skip the check entirely in that case. The backgroundColour
	// is used by render.php in both typed and bound modes.
	const productCardContrastAgainst =
		backgroundColour && ! backgroundColourGradient
			? backgroundColour
			: '';

	// Typed-mode editor parity (R2c, B-3/B-8): card root colour/border are now
	// block-private attrs (not the native style.color/__experimentalBorder
	// path), so useBlockProps() does not apply them to the editor wrapper.
	// Bound mode uses ServerSideRender (already faithful to render.php's
	// scoped <style>); the typed preview mirrors render.php's block-private
	// colour/border emission here. Editor inline style is allowed for live
	// preview (only the SAVED / dynamic-rendered frontend must be
	// inline-free — this block is render.php-driven). Border-radius alone
	// stays native (style.border.radius) — a corner-shape control, not a
	// colour/paint decision.
	const resolveCardColourPreview = ( value ) => {
		if ( ! value ) {
			return undefined;
		}
		const v = String( value ).trim();
		return /^(var\(|#|rgb|hsl)/i.test( v ) ? v : `var(--wp--preset--color--${ v })`;
	};
	const cardBoxShorthand = ( box, keys ) => {
		if ( ! box || 'object' !== typeof box ) return undefined;
		if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
		return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
	};
	const nativeStyle = attributes.style || {};
	const typedPreviewStyle = {};
	const typedPreviewClasses = [];
	if ( ! isBound ) {
		Object.assign(
			typedPreviewStyle,
			resolveTextColourPreviewStyle( textColour, textColourGradient, resolveCardColourPreview )
		);
		if (
			backgroundColourGradient &&
			/^(repeating-)?(linear|radial|conic)-gradient\(/i.test( backgroundColourGradient )
		) {
			typedPreviewStyle.backgroundImage = backgroundColourGradient;
		} else if ( backgroundColour ) {
			typedPreviewStyle.backgroundColor = resolveCardColourPreview( backgroundColour );
		}
		if ( borderStyle && 'none' !== borderStyle ) {
			typedPreviewStyle.borderStyle = borderStyle;
			const borderWidthPreview = cardBoxShorthand( borderWidth, [ 'top', 'right', 'bottom', 'left' ] );
			if ( borderWidthPreview ) {
				typedPreviewStyle.borderWidth = borderWidthPreview;
			}
			if (
				borderColourGradient &&
				/^(repeating-)?(linear|radial|conic)-gradient\(/i.test( borderColourGradient )
			) {
				// Canvas-only approximation of the frontend's masked ::before
				// gradient ring — a flat border-image shorthand, not a full
				// mask reproduction (not worth it for a preview).
				typedPreviewStyle.borderImage = `${ borderColourGradient } 1`;
			} else if ( borderColour ) {
				typedPreviewStyle.borderColor = resolveCardColourPreview( borderColour );
			}
		}
		if ( typeof nativeStyle?.border?.radius === 'string' && nativeStyle.border.radius ) {
			typedPreviewStyle.borderRadius = nativeStyle.border.radius;
		} else {
			const radiusPreview = cardBoxShorthand(
				nativeStyle?.border?.radius,
				[ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ]
			);
			if ( radiusPreview ) {
				typedPreviewStyle.borderRadius = radiusPreview;
			}
		}
		// Preset (palette-slug) colours are class-based — mirror render.php's re-add.
		if ( attributes.textColor ) {
			typedPreviewClasses.push( 'has-text-color', `has-${ attributes.textColor }-color` );
		}
		if ( attributes.backgroundColor ) {
			typedPreviewClasses.push( 'has-background', `has-${ attributes.backgroundColor }-background-color` );
		}
		if ( attributes.gradient ) {
			typedPreviewClasses.push( 'has-background', `has-${ attributes.gradient }-gradient-background` );
		}
		if ( attributes.borderColor ) {
			typedPreviewClasses.push( 'has-border-color', `has-${ attributes.borderColor }-border-color` );
		}
	}

	/*
	 * Typed-mode CTA preview parity. The typed preview's CTA is hand-authored
	 * JSX with no scoped <style> mechanism, so the cta* box attrs (padding,
	 * border, radius, font, width) are applied here to mirror the frontend.
	 * Mirrors includes/helpers-button-style.php sgs_button_element_style_css()
	 * (the SAME emitter render.php calls for both typed and bound branches)
	 * so the two paths stay in lockstep; resolvePcColour mirrors
	 * includes/helpers-tokens.php sgs_colour_value()'s slug-vs-raw-value
	 * branch. Hover/focus-visible declarations are NOT mirrored here — this
	 * is a static (non-interactive) preview element with no :hover state to
	 * drive, same as every other control in this typed preview.
	 *
	 * Also covers the text-colour attrs (titleColour/priceColour/
	 * descColour/priceNoteColour) — render.php resolves each via the same
	 * sgs_colour_value() branch and emits it as a scoped CSS custom property
	 * (--sgs-card-title-colour etc., consumed by style.css). resolvePcColour
	 * is the SAME resolver, renamed generically — the CTA usage below is
	 * unchanged.
	 */
	const resolvePcColour = ( value ) => {
		if ( ! value ) {
			return undefined;
		}
		const v = String( value ).trim();
		return /^(var\(|#|rgb|hsl)/i.test( v ) ? v : `var(--wp--preset--color--${ v })`;
	};
	const titlePreviewStyle = { color: resolvePcColour( titleColour ) };
	const pricePreviewStyle = { color: resolvePcColour( priceColour ) };
	const descPreviewStyle = { color: resolvePcColour( descColour ) };
	const priceNotePreviewStyle = { color: resolvePcColour( priceNoteColour ) };
	const ctaPaddingBox = ctaPadding && typeof ctaPadding === 'object' ? ctaPadding : {};
	const ctaHasPadding =
		ctaPaddingBox.top || ctaPaddingBox.right || ctaPaddingBox.bottom || ctaPaddingBox.left;
	// A2 — ctaBorderWidth/ctaBorderRadius are {top,right,bottom,left} /
	// {topLeft,topRight,bottomLeft,bottomRight} objects (mirrors sgs/button).
	// boxShorthand mirrors button/edit.js's canvas-preview helper (contract §5)
	// so the editor preview matches the frontend
	// (helpers-button-style.php's sgs_box_object_shorthand()).
	const boxShorthand = ( box, keys ) => {
		if ( ! box || 'object' !== typeof box ) return undefined;
		if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
		return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
	};
	const ctaPreviewStyle = {
		backgroundColor: resolvePcColour( ctaColourBackground ),
		color: resolvePcColour( ctaColourText ),
		borderColor: resolvePcColour( ctaColourBorder ),
		borderStyle: ctaBorderStyle || undefined,
		borderWidth: boxShorthand( ctaBorderWidth, [ 'top', 'right', 'bottom', 'left' ] ),
		// CSS border-radius shorthand order: top-left top-right bottom-right bottom-left.
		borderRadius: boxShorthand( ctaBorderRadius, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] ),
		fontWeight: ctaFontWeight || undefined,
		fontSize:
			ctaFontSize !== undefined && ctaFontSize !== null && '' !== ctaFontSize
				? `${ ctaFontSize }px`
				: undefined,
		...( ctaHasPadding
			? {
					paddingTop: ctaPaddingBox.top || '0',
					paddingRight: ctaPaddingBox.right || '0',
					paddingBottom: ctaPaddingBox.bottom || '0',
					paddingLeft: ctaPaddingBox.left || '0',
			  }
			: {} ),
		width: 'full' === ctaWidthType ? '100%' : undefined,
	};

	/*
	 * Typed-mode CTA HOVER preview. ctaPreviewStyle above covers RESTING
	 * state only — an inline style={} object cannot express :hover, so this
	 * block renders the hover rule render.php emits via
	 * sgs_button_element_style_css()'s hover/focus-visible rule (see
	 * includes/helpers-button-style.php lines 138-174). Mirrors that rule
	 * EXACTLY: same 3 properties (background-color/color/border-color), same
	 * "only emit what's set" gating, same :hover + :focus-visible pairing.
	 * resolvePcColour mirrors sgs_colour_value()'s slug-vs-raw branch (the
	 * same resolver already used for the resting-state colours above).
	 *
	 * Scoped to a PER-INSTANCE uid class derived from clientId (added to the
	 * typed preview's blockProps className below) so the rule never leaks to
	 * a sibling sgs/product-card in the same editor canvas — each block
	 * instance gets its own <style> tag keyed to its own uid.
	 *
	 * cta2 (secondary CTA) has no cta2*Hover attrs in block.json (confirmed:
	 * only ctaColourBackgroundHover/ctaColourTextHover/ctaColourBorderHover
	 * exist), so no hover preview is added there — inventing one would show
	 * a hover effect the frontend doesn't have.
	 */
	const ctaPreviewUid = `sgs-pc-preview-${ clientId }`;
	const ctaHoverDecls = [];
	const ctaBgHoverResolved = resolvePcColour( ctaColourBackgroundHover );
	const ctaTextHoverResolved = resolvePcColour( ctaColourTextHover );
	const ctaBorderHoverResolved = resolvePcColour( ctaColourBorderHover );
	if ( ctaBgHoverResolved ) {
		ctaHoverDecls.push( `background-color:${ ctaBgHoverResolved };` );
	}
	if ( ctaTextHoverResolved ) {
		ctaHoverDecls.push( `color:${ ctaTextHoverResolved };` );
	}
	if ( ctaBorderHoverResolved ) {
		ctaHoverDecls.push( `border-color:${ ctaBorderHoverResolved };` );
	}
	const ctaHoverSelector = `.${ ctaPreviewUid } .sgs-product-card__cta--primary`;
	const ctaHoverCss = ctaHoverDecls.length
		? `${ ctaHoverSelector }:hover,${ ctaHoverSelector }:focus-visible{${ ctaHoverDecls.join( '' ) }}`
		: '';

	// Bound mode: render.php (via ServerSideRender) supplies the full
	// `.product-card` wrapper itself, so the editor wrapper must NOT also add
	// it — otherwise the preview shows a double `.product-card` (double
	// padding/border).
	const blockProps = useBlockProps(
		isBound
			? {}
			: {
					className: [
						'product-card',
						ctaPreviewUid,
						isTrial ? 'trial-card' : '',
						isFeatured ? 'featured-card' : '',
						...typedPreviewClasses,
					]
						.filter( Boolean )
						.join( ' ' ),
					style: typedPreviewStyle,
			  }
	);

	// Pack sizes: stored as array of { label, selected }. Editor uses a
	// comma-separated text control for simplicity.
	const packSizesText = ( packSizes || [] )
		.map( ( p ) => p.label )
		.join( ', ' );

	function onPackSizesChange( text ) {
		const labels = text
			.split( ',' )
			.map( ( s ) => s.trim() )
			.filter( Boolean );
		setAttributes( {
			packSizes: labels.map( ( label, i ) => ( {
				label,
				selected: i === 0,
			} ) ),
		} );
	}

	// Heading tag derived from headingLevel attr (allowlisted string, e.g. 'h3').
	const ALLOWED_HEADING_LEVELS = [ 'h2', 'h3', 'h4', 'p' ];
	const headingTag = ALLOWED_HEADING_LEVELS.includes( headingLevel )
		? headingLevel
		: 'h3';

	// D618/D619 — ONE grouped, SGS-owned colour panel, rendered FIRST (mirrors
	// button/edit.js + option-picker/edit.js). Rows group by CSS property, not
	// by attribute name — every state carries linked: true.
	// Title/description/price/price-note text colours only apply
	// in typed built-in mode (bound mode draws these from the live product and
	// shows a Notice instead — mirrors the isBuiltIn/isBound gating already on
	// the Card style / Price style panels below). Tag background/text only
	// style the TRIAL tag (render.php's scoped rule targets
	// .sgs-product-card__tag--trial only; the featured badge has no colour
	// attrs of its own) — mirrors the isTrial gate already on those controls.
	// CTA background/text/border and the picker-family rows apply in BOTH
	// modes: render.php forwards pickerLabelColour/pickerPill*Colour into
	// EVERY render_block('sgs/option-picker') call site (typed pack pills at
	// render.php:1479 AND the bound configurator at render.php:1057), so
	// there is no isBound/isBuiltIn split for the picker rows — confirmed by
	// reading render.php directly, not assumed from the DB role='color' list.
	// Picker pill rows mirror option-picker/edit.js's own SgsColourPanel
	// grouping (background/text/border, each Normal+Selected) since this
	// block's pill controls forward 1:1 onto that same block.
	const colourRows = [];
	// Card root background/text/border colour — R2c (B-3/B-8): block-private
	// attrs, replacing the native style.color/__experimentalBorder path so
	// the root box has ONE owner. Placed FIRST (whole-card controls, before
	// the per-element rows below). render.php reads these unconditionally
	// (block-private colour/border section, before the mode branch split),
	// so this trio applies in BOTH typed and bound modes, unlike the
	// isBuiltIn-gated rows below.
	colourRows.push(
		{
			key: 'cardText',
			label: __( 'Card text colour', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: textColour,
					onChange: ( val ) => setAttributes( { textColour: val ?? '' } ),
					linked: true,
					gradientValue: textColourGradient,
					onGradientChange: ( val ) => setAttributes( { textColourGradient: val ?? '' } ),
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: textColourHover,
					onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
					linked: true,
					gradientValue: textColourHoverGradient,
					onGradientChange: ( val ) => setAttributes( { textColourHoverGradient: val ?? '' } ),
				},
			],
		},
		{
			key: 'cardBackground',
			label: __( 'Card background colour', 'sgs-blocks' ),
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
					onChange: ( val ) => setAttributes( { backgroundColourHover: val ?? '' } ),
					linked: true,
					gradientValue: backgroundColourHoverGradient,
					onGradientChange: ( val ) =>
						setAttributes( { backgroundColourHoverGradient: val ?? '' } ),
				},
			],
		},
	);
	if ( isBuiltIn ) {
		colourRows.push( {
			key: 'title',
			label: __( 'Title colour', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: titleColour,
					onChange: ( val ) => setAttributes( { titleColour: val ?? '' } ),
					linked: true,
					gradientValue: titleColourGradient,
					onGradientChange: ( val ) => setAttributes( { titleColourGradient: val ?? '' } ),
				},
			],
		} );
		colourRows.push( {
			key: 'description',
			label: __( 'Description colour', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: descColour,
					onChange: ( val ) => setAttributes( { descColour: val ?? '' } ),
					linked: true,
					gradientValue: descColourGradient,
					onGradientChange: ( val ) => setAttributes( { descColourGradient: val ?? '' } ),
				},
			],
		} );
		colourRows.push( {
			key: 'price',
			label: __( 'Price colour', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: priceColour,
					onChange: ( val ) => setAttributes( { priceColour: val ?? '' } ),
					linked: true,
					gradientValue: priceColourGradient,
					onGradientChange: ( val ) => setAttributes( { priceColourGradient: val ?? '' } ),
				},
			],
		} );
		colourRows.push( {
			key: 'priceNote',
			label: __( 'Price note colour', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: priceNoteColour,
					onChange: ( val ) => setAttributes( { priceNoteColour: val ?? '' } ),
					linked: true,
					gradientValue: priceNoteColourGradient,
					onGradientChange: ( val ) => setAttributes( { priceNoteColourGradient: val ?? '' } ),
				},
			],
		} );
	}
	if ( isTrial ) {
		colourRows.push( {
			key: 'tagBackground',
			label: __( 'Tag background colour', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: attributes.tagBackgroundColour,
					onChange: ( val ) => setAttributes( { tagBackgroundColour: val ?? '' } ),
					linked: true,
				},
			],
		} );
		colourRows.push( {
			key: 'tagText',
			label: __( 'Tag text colour', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: attributes.tagTextColour,
					onChange: ( val ) => setAttributes( { tagTextColour: val ?? '' } ),
					linked: true,
					gradientValue: attributes.tagTextColourGradient,
					onGradientChange: ( val ) => setAttributes( { tagTextColourGradient: val ?? '' } ),
				},
			],
		} );
	}
	colourRows.push(
		{
			key: 'ctaBackground',
			label: __( 'CTA background colour', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: ctaColourBackground,
					onChange: ( val ) => setAttributes( { ctaColourBackground: val ?? '' } ),
					linked: true,
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: ctaColourBackgroundHover,
					onChange: ( val ) => setAttributes( { ctaColourBackgroundHover: val ?? '' } ),
					linked: true,
				},
			],
		},
		{
			key: 'ctaText',
			label: __( 'CTA text colour', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: ctaColourText,
					onChange: ( val ) => setAttributes( { ctaColourText: val ?? '' } ),
					linked: true,
					gradientValue: ctaColourTextGradient,
					onGradientChange: ( val ) => setAttributes( { ctaColourTextGradient: val ?? '' } ),
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: ctaColourTextHover,
					onChange: ( val ) => setAttributes( { ctaColourTextHover: val ?? '' } ),
					linked: true,
					gradientValue: ctaColourTextHoverGradient,
					onGradientChange: ( val ) => setAttributes( { ctaColourTextHoverGradient: val ?? '' } ),
				},
			],
		},
		{
			key: 'ctaBorder',
			label: __( 'CTA border colour', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: ctaColourBorder,
					onChange: ( val ) => setAttributes( { ctaColourBorder: val ?? '' } ),
					linked: true,
					gradientValue: ctaColourBorderGradient,
					onGradientChange: ( val ) =>
						setAttributes( { ctaColourBorderGradient: val ?? '' } ),
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: ctaColourBorderHover,
					onChange: ( val ) => setAttributes( { ctaColourBorderHover: val ?? '' } ),
					linked: true,
					gradientValue: ctaColourBorderHoverGradient,
					onGradientChange: ( val ) =>
						setAttributes( { ctaColourBorderHoverGradient: val ?? '' } ),
				},
			],
		},
		{
			key: 'pickerLabel',
			label: __( 'Picker label colour', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: pickerLabelColour,
					onChange: ( val ) => setAttributes( { pickerLabelColour: val ?? '' } ),
					linked: true,
				},
			],
		},
		{
			key: 'pickerPillBackground',
			label: __( 'Picker pill background', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: pickerPillBgColour,
					onChange: ( val ) => setAttributes( { pickerPillBgColour: val ?? '' } ),
					linked: true,
				},
				{
					key: 'selected',
					label: __( 'Selected', 'sgs-blocks' ),
					value: pickerPillSelectedBgColour,
					onChange: ( val ) => setAttributes( { pickerPillSelectedBgColour: val ?? '' } ),
					linked: true,
				},
			],
		},
		{
			key: 'pickerPillText',
			label: __( 'Picker pill text', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: pickerPillTextColour,
					onChange: ( val ) => setAttributes( { pickerPillTextColour: val ?? '' } ),
					linked: true,
				},
				{
					key: 'selected',
					label: __( 'Selected', 'sgs-blocks' ),
					value: pickerPillSelectedTextColour,
					onChange: ( val ) => setAttributes( { pickerPillSelectedTextColour: val ?? '' } ),
					linked: true,
				},
			],
		},
		{
			key: 'pickerPillBorder',
			label: __( 'Picker pill border', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: pickerPillBorderColour,
					onChange: ( val ) => setAttributes( { pickerPillBorderColour: val ?? '' } ),
					linked: true,
				},
				{
					key: 'selected',
					label: __( 'Selected', 'sgs-blocks' ),
					value: pickerPillSelectedBorderColour,
					onChange: ( val ) => setAttributes( { pickerPillSelectedBorderColour: val ?? '' } ),
					linked: true,
				},
			],
		}
	);

	return (
		<>
			<SgsColourPanel rows={ colourRows } />
			<InspectorControls>
				<ProductSourcePanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>

				{ /* ── Card panel (behaviour: variant + heading level + tag text) ── */ }
				<PanelBody title={ __( 'Card', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Variant style', 'sgs-blocks' ) }
						value={ variantStyle }
						options={ [
							{
								value: 'standard',
								label: __( 'Standard', 'sgs-blocks' ),
							},
							{
								value: 'trial',
								label: __(
									'Trial (dashed border + gradient)',
									'sgs-blocks'
								),
							},
							{
								value: 'featured',
								label: __( 'Featured', 'sgs-blocks' ),
							},
						] }
						onChange={ ( v ) =>
							setAttributes( { variantStyle: v } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ isBuiltIn && (
						<>
							<SelectControl
								label={ __( 'Heading level', 'sgs-blocks' ) }
								help={ __(
									'HTML heading tag for the product name (h2, h3, or h4).',
									'sgs-blocks'
								) }
								value={ headingLevel || 'h3' }
								options={ [
									{ value: 'h2', label: 'Heading 2' },
									{ value: 'h3', label: 'Heading 3' },
									{ value: 'h4', label: 'Heading 4' },
									{ value: 'p', label: 'Paragraph (not a heading)' },
								] }
								onChange={ ( v ) =>
									setAttributes( { headingLevel: v } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							{ /* Typed mode only — a bound/live product photo is genuine
							     shopping content and must never be hidden from
							     assistive tech; this control only exists here,
							     inside the isBuiltIn gate. */ }
							<ToggleControl
								label={ __( 'Product image is decorative', 'sgs-blocks' ) }
								checked={ !! imageDecorative }
								onChange={ ( val ) =>
									setAttributes( { imageDecorative: val } )
								}
								help={ __(
									'Turn on when this image is a visual/promotional tile rather than a real product photo — screen readers will skip it instead of reading the alt text.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
							{ isTrial && (
								<TextControl
									label={ __( 'Trial tag text', 'sgs-blocks' ) }
									value={ attributes.trialTag || '' }
									onChange={ ( v ) =>
										setAttributes( { trialTag: v } )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							) }
							{ isFeatured && (
								<TextControl
									label={ __( 'Featured tag text', 'sgs-blocks' ) }
									value={ attributes.featuredTag || '' }
									onChange={ ( v ) =>
										setAttributes( { featuredTag: v } )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							) }
						</>
					) }
				</PanelBody>

				{ /* ── Card border panel — R2c (B-3/B-8): width/style/colour are
				     SGS custom attrs (borderWidth is an object, base only, no
				     tiers; borderStyle + borderColour/Gradient are flat) — now
				     ONE composite row (Task 0, 2026-08-27) mirroring native's
				     BorderBoxControl layout (width, style, colour side by
				     side) instead of style hiding inside the colour popover
				     and width living in a separate panel. borderColour has no
				     hover pair on this block (block.json declares none), so
				     the colour slot uses the single-state form. Border-radius
				     stays WP-native (style.border.radius) — the block declares
				     __experimentalBorder.__experimentalSkipSerialization so it
				     serialises scoped, not inline (mirrors sgs/heading + sgs/quote). ── */ }
				<PanelBody title={ __( 'Card border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Card border colour', 'sgs-blocks' ) }
						colourValue={ borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ borderColourGradient }
						onColourGradientChange={ ( val ) =>
							setAttributes( { borderColourGradient: val ?? '' } )
						}
						colourLinked={ true }
						contrastAgainst={ productCardContrastAgainst }
						radiusValues={ {
								base: attributes.borderRadius?.desktop ?? {},
								tablet: attributes.borderRadius?.tablet ?? {},
								mobile: attributes.borderRadius?.mobile ?? {},
							} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>

				{ /* ── Price panel (typed built-in only) — content fields; typography +
				     colour live in the Styles tab's "Price style" panel ── */ }
				{ isBuiltIn && (
					<PanelBody
						title={ __( 'Price', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<TextControl
							label={ __( 'Price', 'sgs-blocks' ) }
							help={ __(
								'Displayed price, e.g. £10.00',
								'sgs-blocks'
							) }
							value={ priceLarge || '' }
							onChange={ ( v ) =>
								setAttributes( { priceLarge: v } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<TextControl
							label={ __( 'Price note', 'sgs-blocks' ) }
							help={ __(
								'Small text below the price, e.g. "8-pack · Free delivery over £35"',
								'sgs-blocks'
							) }
							value={ priceNote || '' }
							onChange={ ( v ) =>
								setAttributes( { priceNote: v } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<TextControl
							label={ __( 'Pack sizes', 'sgs-blocks' ) }
							help={ __(
								'Comma-separated, e.g. 250g, 500g, 1kg. Shown as selectable pills; the first is marked active.',
								'sgs-blocks'
							) }
							value={ packSizesText }
							onChange={ onPackSizesChange }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</PanelBody>
				) }

				{ /* ── Buttons panel — content + behaviour; style presets live in the
				     Styles tab's "Button style" panel ── */ }
				<PanelBody
					title={ __( 'Buttons', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /* Primary CTA text + URL — typed mode only (B5, 2026-06-10).
					     In bound mode the CTA text/url are set via the Content
					     overrides panel ("Override button"), so duplicating them
					     here is redundant. Behaviour stays below (both modes). */ }
					{ ! isBound && (
						<>
							<TextControl
								label={ __( 'Primary button text', 'sgs-blocks' ) }
								value={ ctaText || '' }
								onChange={ ( v ) => setAttributes( { ctaText: v } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<LinkPopoverField
								label={ __( 'Primary button URL', 'sgs-blocks' ) }
								value={ ctaUrl || '' }
								onChange={ ( url ) => setAttributes( { ctaUrl: url } ) }
								searchOnly
							/>
						</>
					) }
					{ isBound ? (
						<SelectControl
							label={ __( 'Primary button behaviour', 'sgs-blocks' ) }
							help={ __(
								'What happens when the button is clicked in the live product card.',
								'sgs-blocks'
							) }
							value={ ctaBehaviour || "learn-more" }
							options={ CTA_BEHAVIOUR_OPTIONS }
							onChange={ ( v ) =>
								setAttributes( { ctaBehaviour: v } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) : (
						<Notice
							status="info"
							isDismissible={ false }
							style={ { marginTop: 8 } }
						>
							{ __(
								'Buttons render as plain links until a product is connected. Behaviour options apply to a connected product.',
								'sgs-blocks'
							) }
						</Notice>
					) }

					{ /* Secondary CTA */ }
					<hr style={ { margin: '12px 0' } } />
					<TextControl
						label={ __( 'Secondary button text', 'sgs-blocks' ) }
						help={ __(
							'Leave empty to hide the secondary button.',
							'sgs-blocks'
						) }
						value={ cta2Text || '' }
						onChange={ ( v ) =>
							setAttributes( { cta2Text: v } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ ( cta2Text || '' ) !== '' && (
						<LinkPopoverField
							label={ __(
								'Secondary button URL',
								'sgs-blocks'
							) }
							value={ cta2Url || '' }
							onChange={ ( url ) =>
								setAttributes( { cta2Url: url } )
							}
							searchOnly
						/>
					) }
					{ /* v1: the secondary button is always a plain learn-more link (one canonical cart form per card) — no behaviour dropdown until a real second behaviour exists (dead-control rule). */ }
				</PanelBody>

				{ /* ── Advanced SEO panel (WC bound only) ── */ }
				{ 'wc-product' === sourceMode && (
					<PanelBody
						title={ __( 'Advanced SEO', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<NumberControl
							label={ __(
								'Index a specific variation (advanced)',
								'sgs-blocks'
							) }
							help={ __(
								'Optional. Enter a variation ID to let search engines index that one variation\'s URL instead of only the main product. Leave at 0 for the default (recommended).',
								'sgs-blocks'
							) }
							value={ indexVariationUrl }
							min={ 0 }
							onChange={ ( v ) =>
								setAttributes( {
									indexVariationUrl:
										parseInt( v, 10 ) || 0,
								} )
							}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{ /* ── Value ladder panel (bound only) ── */ }
				{ isBound && (
					<PanelBody
						title={ __( 'Value ladder', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<ToggleControl
							label={ __( 'Show price ladder', 'sgs-blocks' ) }
							help={ __(
								'Off shows just the price and per-item note — suited to browsing grids.',
								'sgs-blocks'
							) }
							checked={ false !== attributes.showLadder }
							onChange={ ( v ) =>
								setAttributes( { showLadder: v } )
							}
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Savings framing', 'sgs-blocks' ) }
							help={ __(
								'How per-unit savings are worded on the price-per-unit ladder. Savings only show when a single-unit reference price is set + confirmed on the product editor.',
								'sgs-blocks'
							) }
							value={ framingMode || 'loss-aversion' }
							options={ [
								{
									value: 'loss-aversion',
									label: __(
										'Loss aversion ("save 8p each vs buying singly")',
										'sgs-blocks'
									),
								},
								{
									value: 'savings',
									label: __(
										'Savings ("save 8p each")',
										'sgs-blocks'
									),
								},
								{
									value: 'neutral',
									label: __(
										'Neutral (no saving text)',
										'sgs-blocks'
									),
								},
							] }
							onChange={ ( v ) =>
								setAttributes( { framingMode: v } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<ToggleControl
							label={ __(
								'Promote the second-largest pack',
								'sgs-blocks'
							) }
							help={ __(
								'Places a "Most popular" badge on the second-largest pack (decoy pricing). A per-product setting on the product editor overrides this for that product.',
								'sgs-blocks'
							) }
							checked={ !! decoyEnabled }
							onChange={ ( v ) =>
								setAttributes( { decoyEnabled: v } )
							}
							__nextHasNoMarginBottom
						/>
						<ToggleControl
							label={ __(
								'Show option pickers',
								'sgs-blocks'
							) }
							help={ __(
								'Off suppresses all option-picker renders (both variable-axis and non-variable pill paths) and falls through to the static From-price card appearance. Useful on collection grids where picker UI is unwanted.',
								'sgs-blocks'
							) }
							checked={ attributes.showPickers !== false }
							onChange={ ( v ) =>
								setAttributes( { showPickers: v } )
							}
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{ /* ── Content overrides panel (connected products only) ── */ }
				{ isBound && (
					<ContentOverridesPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
						wcProduct={ wcProduct }
					/>
				) }

				{ /* ── Product options panel (connected WC products only) ── */ }
				{ isBound && (
					<ProductOptionsPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
						wcProduct={ wcProduct }
						loading={ wcProductLoading }
					/>
				) }
			</InspectorControls>

			<InspectorControls group="styles">
				{ /* showContentBand={false}: this block passes `wrap_inner => false`
				     on every render branch, so `.sgs-container__inner` never
				     exists and a band width could never paint. `contentWidth` was
				     deleted from block.json at D540 for exactly that reason; this
				     suppresses the control that was still writing to it. */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="content"
					showContentBand={ false }
				/>
				<PanelBody
					title={ __( 'Card padding', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<BoxControl
						label={ __( 'Card padding', 'sgs-blocks' ) }
						values={ cardPadding ?? {} }
						onChange={ ( next ) =>
							setAttributes( { cardPadding: next } )
						}
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ /* ── Card style panel (appearance: typography + tag colours;
				     variant + heading level + tag text live in the Settings
				     tab's "Card" panel) ── */ }
				{ isBuiltIn && (
					<PanelBody title={ __( 'Card style', 'sgs-blocks' ) } initialOpen={ false }>
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix="title"
							showFontFamily
						/>
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix="desc"
							showFontFamily
							showWeight={ false }
							showStyle={ false }
						/>
						{ ( isTrial || isFeatured ) && (
							<TypographyControls
								attributes={ attributes }
								setAttributes={ setAttributes }
								prefix="tag"
								showWeight={ false }
								showStyle={ false }
								showLineHeight={ false }
							/>
						) }
						{ isTrial && (
							<>
								<ToggleControl
									label={ __( 'Tag full width', 'sgs-blocks' ) }
									help={ __(
										'Stretch the trial tag to the full width of the card body (matches the draft) instead of hugging its text.',
										'sgs-blocks'
									) }
									checked={ !! attributes.tagFullWidth }
									onChange={ ( v ) =>
										setAttributes( { tagFullWidth: v } )
									}
									__nextHasNoMarginBottom
								/>
								{ /* UnitControl, not a raw-px RangeControl (contract
								     §4.3). Stored as a CSS-length STRING; a legacy
								     bare number is treated as px by render.php.
								     Mirrors sgs/label — both feed the SAME shared
								     sgs_label_box_css_rule() emitter. */ }
								<SgsLengthControl
									label={ __( 'Tag border radius', 'sgs-blocks' ) }
									value={ attributes.tagBorderRadius ?? '' }
									units={ SGS_LENGTH_UNITS }
									presets={ false }
									onChange={ ( v ) =>
										setAttributes( {
											tagBorderRadius:
												sgsNormaliseLength( v ),
										} )
									}
								/>
								<BoxControl
									label={ __( 'Tag padding', 'sgs-blocks' ) }
									values={ attributes.tagPadding ?? {} }
									onChange={ ( next ) =>
										setAttributes( { tagPadding: next } )
									}
									__next40pxDefaultSize
								/>
							</>
						) }
					</PanelBody>
				) }

				{ /* ── Price style panel (typed built-in only) — content fields
				     live in the Settings tab's "Price" panel ── */ }
				{ isBuiltIn && (
					<PanelBody
						title={ __( 'Price style', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix="price"
							showFontFamily
							showStyle={ false }
							showLineHeight={ false }
						/>
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix="priceNote"
							showFontFamily
							showWeight={ false }
							showStyle={ false }
							showLineHeight={ false }
						/>
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix="pill"
							showWeight={ false }
							showStyle={ false }
							showLineHeight={ false }
						/>
					</PanelBody>
				) }
				{ isBound && (
					<PanelBody
						title={ __( 'Price', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<Notice status="info" isDismissible={ false }>
							{ __(
								'Price is drawn from the linked product and cannot be edited here.',
								'sgs-blocks'
							) }
						</Notice>
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix="priceFromLabel"
							showWeight={ false }
							showStyle={ false }
							showLineHeight={ false }
						/>
					</PanelBody>
				) }

				{ /* ── Button style panel (appearance: primary/secondary style
				     presets; text/URL/behaviour live in the Settings tab's
				     "Buttons" panel) ── */ }
				<PanelBody
					title={ __( 'Button style', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Primary button style', 'sgs-blocks' ) }
						value={ ctaStyle || 'primary' }
						options={ CTA_STYLE_OPTIONS }
						onChange={ ( v ) => {
							/*
							 * ctaStyle is now the SINGLE style attribute driving the
							 * sgs-button--{ctaStyle} class in BOTH typed and bound
							 * markup (the separate style-preset attr was merged away — D-merge). The cta*
							 * colour/border/weight attrs style the button in both
							 * modes, so every style change reseeds them from
							 * BUTTON_PRESETS[v] regardless of typed/bound — otherwise
							 * switching to secondary/outline would leave a
							 * primary-coloured button under a
							 * .sgs-button--secondary/outline class. The "Reset colours
							 * to preset" button below covers the case where the picked
							 * value is unchanged (onChange doesn't refire) but the user
							 * wants to snap hand-tweaked colours back to the preset.
							 */
							const preset = BUTTON_PRESETS[ v ];
							setAttributes( {
								ctaStyle: v,
								...( preset
									? {
											ctaColourBackground: preset.colourBackground,
											ctaColourText: preset.colourText,
											ctaColourBorder: preset.borderColour,
											ctaColourBackgroundHover: preset.colourBackgroundHover,
											ctaColourTextHover: preset.colourTextHover,
											ctaColourBorderHover: preset.borderColourHover,
											ctaBorderStyle: preset.borderStyle,
											// A2 box-object migration: presets are uniform
											// (all sides/corners equal), so a uniform-object
											// seed from the single preset value preserves
											// current behaviour exactly.
											ctaBorderWidth: {
												top: `${ preset.borderWidthTop }px`,
												right: `${ preset.borderWidthTop }px`,
												bottom: `${ preset.borderWidthTop }px`,
												left: `${ preset.borderWidthTop }px`,
											},
											ctaBorderRadius: {
												topLeft: `${ preset.borderRadiusTL }px`,
												topRight: `${ preset.borderRadiusTL }px`,
												bottomLeft: `${ preset.borderRadiusTL }px`,
												bottomRight: `${ preset.borderRadiusTL }px`,
											},
											ctaFontWeight: preset.fontWeight,
									  }
									: {} ),
							} );
						} }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ ( cta2Text || '' ) !== '' && (
						<SelectControl
							label={ __(
								'Secondary button style',
								'sgs-blocks'
							) }
							value={ cta2Style || 'secondary' }
							options={ CTA_STYLE_OPTIONS }
							onChange={ ( v ) =>
								setAttributes( { cta2Style: v } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</PanelBody>

				{ /* ── CTA Button Style panel (both modes — the primary button in
				     typed mode uses .sgs-button--{style} + a stable
				     .sgs-product-card__cta--primary marker; bound mode uses
				     .product-card__view / .product-card__add-to-cart) ── */ }
				<PanelBody
					title={ __( 'CTA Button Style', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<p style={ { marginTop: 0 } }>
						{ __(
							'Colour, border, corner radius, and padding for the primary button.',
							'sgs-blocks'
						) }
					</p>
						{ /*
						 * Style (primary/secondary/outline) is now set ONLY by the
						 * unified "Primary button style" SelectControl above —
						 * the separate style-preset attr was merged into ctaStyle (D-merge). A
						 * SelectControl's onChange cannot re-fire when the picked
						 * value is unchanged, so a user who has hand-tweaked a
						 * colour needs an explicit button to snap the colours back
						 * to the CURRENT style's preset values.
						 */ }
						<Button
							variant="secondary"
							onClick={ () => {
								const preset =
									BUTTON_PRESETS[ ctaStyle || 'primary' ];
								if ( ! preset ) {
									return;
								}
								setAttributes( {
									ctaColourBackground:
										preset.colourBackground,
									ctaColourText: preset.colourText,
									ctaColourBorder: preset.borderColour,
									ctaColourBackgroundHover:
										preset.colourBackgroundHover,
									ctaColourTextHover:
										preset.colourTextHover,
									ctaColourBorderHover:
										preset.borderColourHover,
									ctaBorderStyle: preset.borderStyle,
									ctaBorderWidth: {
										top: `${ preset.borderWidthTop }px`,
										right: `${ preset.borderWidthTop }px`,
										bottom: `${ preset.borderWidthTop }px`,
										left: `${ preset.borderWidthTop }px`,
									},
									ctaBorderRadius: {
										topLeft: `${ preset.borderRadiusTL }px`,
										topRight: `${ preset.borderRadiusTL }px`,
										bottomLeft: `${ preset.borderRadiusTL }px`,
										bottomRight: `${ preset.borderRadiusTL }px`,
									},
									ctaFontWeight: preset.fontWeight,
								} );
							} }
							style={ { marginBottom: 16 } }
						>
							{ __( 'Reset colours to preset', 'sgs-blocks' ) }
						</Button>
						<ToolsPanel
							className="sgs-nested-tools-panel"
							label={ __( 'CTA Button Style', 'sgs-blocks' ) }
							resetAll={ () =>
								setAttributes( {
									ctaWidthType: 'fit',
									ctaBorderWidth: {
										top: '2px',
										right: '2px',
										bottom: '2px',
										left: '2px',
									},
									ctaBorderRadius: {
										topLeft: '10px',
										topRight: '10px',
										bottomLeft: '10px',
										bottomRight: '10px',
									},
									ctaFontSize: undefined,
									ctaPadding: {},
									ctaColourBackground: '',
									ctaColourText: '',
									ctaColourBorder: '',
								} )
							}
						>
							<ToolsPanelItem
								label={ __( 'Width', 'sgs-blocks' ) }
								hasValue={ () => ( ctaWidthType || 'fit' ) !== 'fit' }
								onDeselect={ () =>
									setAttributes( { ctaWidthType: 'fit' } )
								}
								isShownByDefault
							>
								<SelectControl
									label={ __( 'Width', 'sgs-blocks' ) }
									value={ ctaWidthType || 'fit' }
									options={ [
										{
											value: 'fit',
											label: __( 'Fit content', 'sgs-blocks' ),
										},
										{
											value: 'full',
											label: __( 'Full width', 'sgs-blocks' ),
										},
									] }
									onChange={ ( v ) =>
										setAttributes( { ctaWidthType: v } )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
							{ /* A2 box-object migration (2026-07-26): mirrors sgs/button
							   (button/edit.js:596) exactly — ResponsiveBoxControl /
							   ResponsiveBorderRadiusControl with showResponsive={false}
							   (single-tier; no ctaBorderWidth/RadiusTablet/Mobile attrs
							   exist), writing the object straight to the attr. */ }
							<ToolsPanelItem
								label={ __( 'Border width', 'sgs-blocks' ) }
								hasValue={ () =>
									JSON.stringify( ctaBorderWidth ?? {} ) !==
									JSON.stringify( {
										top: '2px',
										right: '2px',
										bottom: '2px',
										left: '2px',
									} )
								}
								onDeselect={ () =>
									setAttributes( {
										ctaBorderWidth: {
											top: '2px',
											right: '2px',
											bottom: '2px',
											left: '2px',
										},
									} )
								}
								isShownByDefault
							>
								<ResponsiveBoxControl
									label={ __( 'Border width', 'sgs-blocks' ) }
									presets={ [ '10', '20', '30' ] }
									values={ { base: ctaBorderWidth ?? {} } }
									showResponsive={ false }
									onChange={ ( _tier, next ) =>
										setAttributes( { ctaBorderWidth: next } )
									}
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={ __( 'Corner radius', 'sgs-blocks' ) }
								hasValue={ () =>
									JSON.stringify( ctaBorderRadius ?? {} ) !==
									JSON.stringify( {
										topLeft: '10px',
										topRight: '10px',
										bottomLeft: '10px',
										bottomRight: '10px',
									} )
								}
								onDeselect={ () =>
									setAttributes( {
										ctaBorderRadius: {
											topLeft: '10px',
											topRight: '10px',
											bottomLeft: '10px',
											bottomRight: '10px',
										},
									} )
								}
							>
								<ResponsiveBorderRadiusControl
									label={ __( 'Corner radius', 'sgs-blocks' ) }
									values={ { base: ctaBorderRadius ?? {} } }
									showResponsive={ false }
									onChange={ ( _tier, next ) =>
										setAttributes( { ctaBorderRadius: next } )
									}
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={ __( 'Font size (px)', 'sgs-blocks' ) }
								hasValue={ () =>
									ctaFontSize !== null &&
									ctaFontSize !== undefined
								}
								onDeselect={ () =>
									setAttributes( { ctaFontSize: undefined } )
								}
							>
								<NumberControl
									label={ __( 'Font size (px)', 'sgs-blocks' ) }
									value={ ctaFontSize ?? '' }
									min={ 8 }
									max={ 48 }
									onChange={ ( v ) =>
										setAttributes( {
											ctaFontSize:
												v === '' || v === undefined
													? undefined
													: Number.parseInt( v, 10 ),
										} )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={ __( 'CTA padding', 'sgs-blocks' ) }
								hasValue={ () =>
									!! ctaPadding &&
									Object.keys( ctaPadding ).length > 0
								}
								onDeselect={ () =>
									setAttributes( { ctaPadding: {} } )
								}
							>
								<BoxControl
									label={ __( 'CTA padding', 'sgs-blocks' ) }
									values={ ctaPadding ?? {} }
									onChange={ ( next ) =>
										setAttributes( { ctaPadding: next } )
									}
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						</ToolsPanel>
					</PanelBody>

				{ /* ── Card layout panel ── */ }
				<PanelBody
					title={ __( 'Card layout', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Max width', 'sgs-blocks' ) }
						help={ __(
							'Enter any CSS value (e.g. 320px, 50%, 28rem). Leave empty to use the theme default (380px).',
							'sgs-blocks'
						) }
						value={ cardMaxWidth }
						onChange={ ( v ) =>
							setAttributes( { cardMaxWidth: v } )
						}
						placeholder="380px"
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Image height', 'sgs-blocks' ) }
						help={ __(
							'Height of the product image box (e.g. 180px, 16rem). Leave empty to use the theme default (220px).',
							'sgs-blocks'
						) }
						value={ imageHeight }
						onChange={ ( v ) =>
							setAttributes( { imageHeight: v } )
						}
						placeholder="220px"
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ /* Media-element atom controls (rule 37-media-no-handroll).
					     'main' governs every render branch's main product image
					     (typed, bound read-only, bound variable-configurator —
					     they never render simultaneously, so ONE control is
					     correct per R-31-9). 'thumb' governs only the bound
					     variable-configurator's thumbnail-rail images, a
					     distinct element with its own 48x48 box. Mirrors
					     sgs/before-after's + sgs/buybox's independently-scoped
					     per-element panels. */ }
					<MediaElementPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="main"
						blockSlug="sgs/product-card"
						insertion="element"
						atoms={ [ 'object-fit', 'focal-point' ] }
						mediaType="image"
						scope="element"
						previewUrl={ image }
					/>
					<MediaElementPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="thumb"
						blockSlug="sgs/product-card"
						insertion="element"
						atoms={ [ 'object-fit' ] }
						mediaType="image"
						scope="element"
					/>
				</PanelBody>

				{ /* ── Picker style panel (R4 — pill-style forwarding to every
				   in-card sgs/option-picker: typed pack-size pills AND
				   bound/connected axis pickers, all 3 render_block call
				   sites in render.php/product-card-builtin-render.php). ── */ }
					<PanelBody
						title={ __( 'Picker style', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<p style={ { marginTop: 0 } }>
							{ __(
								'Style the in-card option pickers (pack size / flavour / etc). Forwarded to every sgs/option-picker the card renders.',
								'sgs-blocks'
							) }
						</p>
						<ToolsPanel
							className="sgs-nested-tools-panel"
							label={ __( 'Picker style', 'sgs-blocks' ) }
							resetAll={ () =>
								setAttributes( {
									pickerLabelFontSize: '',
									pickerLabelColour: '',
									pickerColourPreset: 'solid',
									pickerShowSelectedTick: true,
									pickerPillBgColour: '',
									pickerPillTextColour: '',
									pickerPillBorderColour: '',
									pickerPillBorderRadius: '',
									pickerPillSelectedBgColour: '',
									pickerPillSelectedTextColour: '',
									pickerPillSelectedBorderColour: '',
									pickerPillSelectedBorderRadius: '',
								} )
							}
						>
							<ToolsPanelItem
								label={ __( 'Picker label font size', 'sgs-blocks' ) }
								hasValue={ () => !! pickerLabelFontSize }
								onDeselect={ () =>
									setAttributes( { pickerLabelFontSize: '' } )
								}
								isShownByDefault
							>
								<TextControl
									label={ __(
										'Picker label font size',
										'sgs-blocks'
									) }
									help={ __(
										'Any CSS size, e.g. 18px or 1.2rem. Leave empty for the default.',
										'sgs-blocks'
									) }
									value={ pickerLabelFontSize || '' }
									onChange={ ( v ) =>
										setAttributes( {
											pickerLabelFontSize: v,
										} )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={ __( 'Picker colour preset', 'sgs-blocks' ) }
								hasValue={ () => pickerColourPreset !== 'solid' }
								onDeselect={ () =>
									setAttributes( { pickerColourPreset: 'solid' } )
								}
								isShownByDefault
							>
								<SelectControl
									label={ __( 'Picker colour preset', 'sgs-blocks' ) }
									help={ __(
										'Solid (default) matches the previous look. Soft = pale-tint fill, outline, no tick.',
										'sgs-blocks'
									) }
									value={ pickerColourPreset }
									options={ [
										{ label: __( 'Solid (default)', 'sgs-blocks' ), value: 'solid' },
										{ label: __( 'Soft', 'sgs-blocks' ), value: 'soft' },
										{ label: __( '— Framework default —', 'sgs-blocks' ), value: '' },
									] }
									onChange={ ( v ) => setAttributes( { pickerColourPreset: v } ) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={ __( 'Show selection tick', 'sgs-blocks' ) }
								hasValue={ () => pickerShowSelectedTick !== true }
								onDeselect={ () =>
									setAttributes( { pickerShowSelectedTick: true } )
								}
							>
								<ToggleControl
									label={ __( 'Show selection tick', 'sgs-blocks' ) }
									checked={ pickerShowSelectedTick }
									onChange={ ( v ) => setAttributes( { pickerShowSelectedTick: v } ) }
									__nextHasNoMarginBottom
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={ __( 'Pill border radius', 'sgs-blocks' ) }
								hasValue={ () => !! pickerPillBorderRadius }
								onDeselect={ () =>
									setAttributes( { pickerPillBorderRadius: '' } )
								}
							>
								<SgsLengthControl
									presets={ false }
									label={ __( 'Pill border radius', 'sgs-blocks' ) }
									value={ pickerPillBorderRadius || '' }
									units={ PICKER_RADIUS_UNITS }
									onChange={ ( v ) => setAttributes( { pickerPillBorderRadius: v ?? '' } ) }
									help={ __( 'CSS length, e.g. 6px. Blank = default; 0 = square.', 'sgs-blocks' ) }
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={ __( 'Selected pill border radius', 'sgs-blocks' ) }
								hasValue={ () => !! pickerPillSelectedBorderRadius }
								onDeselect={ () =>
									setAttributes( { pickerPillSelectedBorderRadius: '' } )
								}
							>
								<SgsLengthControl
									presets={ false }
									label={ __( 'Selected pill border radius', 'sgs-blocks' ) }
									value={ pickerPillSelectedBorderRadius || '' }
									units={ PICKER_RADIUS_UNITS }
									onChange={ ( v ) => setAttributes( { pickerPillSelectedBorderRadius: v ?? '' } ) }
									help={ __( 'Blank = match resting radius; 0 = square.', 'sgs-blocks' ) }
								/>
							</ToolsPanelItem>
						</ToolsPanel>
					</PanelBody>
			</InspectorControls>

			{ isBound ? (
				/* Bound mode: server-side render preview */
				<div { ...blockProps }>
					<ServerSideRender
						block="sgs/product-card"
						attributes={ attributes }
					/>
				</div>
			) : (
				/* Typed built-in mode: WYSIWYG preview from block attributes */
				<div { ...blockProps }>
					{ /* CTA hover-state preview — mirrors render.php's scoped
					     :hover/:focus-visible rule (helpers-button-style.php
					     sgs_button_element_style_css()), scoped to this
					     instance's ctaPreviewUid class so it never leaks to a
					     sibling product-card in the same editor canvas. */ }
					{ ctaHoverCss && <style>{ ctaHoverCss }</style> }
					{ /* Image */ }
					{ image ? (
						<div style={ { position: 'relative' } }>
							<img
								className="sgs-product-card__image"
								src={ image }
								alt={ imageAlt || '' }
								style={ {
									width: '100%',
									height: imageHeight || '220px',
									objectFit: 'cover',
									display: 'block',
								} }
							/>
							{ /* D787 — a broken/mismatched image (exactly how a freshly
							     cloned card lands) previously left only a destructive
							     "Remove image" button here; a client had to DELETE the
							     value before the MediaPlaceholder picker (in the else
							     branch below) reappeared. "Replace image" mounts the
							     same picker inline so a client can swap the image
							     without first destroying it. */ }
							<div
								style={ {
									position: 'absolute',
									top: 8,
									right: 8,
									display: 'flex',
									gap: '4px',
								} }
							>
								<MediaUploadCheck>
									<MediaUpload
										onSelect={ ( media ) =>
											setAttributes( {
												image: media.url,
												imageId: media.id || 0,
												imageAlt: media.alt || '',
											} )
										}
										allowedTypes={ [ 'image' ] }
										render={ ( { open } ) => (
											<Button
												variant="secondary"
												onClick={ open }
												style={ {
													minHeight: '44px',
													minWidth: '44px',
												} }
											>
												{ __(
													'Replace image',
													'sgs-blocks'
												) }
											</Button>
										) }
									/>
								</MediaUploadCheck>
								<Button
									isDestructive
									variant="secondary"
									style={ {
										minHeight: '44px',
										minWidth: '44px',
									} }
									onClick={ () =>
										setAttributes( {
											image: '',
											imageId: 0,
											imageAlt: '',
										} )
									}
								>
									{ __( 'Remove image', 'sgs-blocks' ) }
								</Button>
							</div>
						</div>
					) : (
						<MediaUploadCheck>
							<MediaPlaceholder
								icon="format-image"
								labels={ {
									title: __( 'Product image', 'sgs-blocks' ),
								} }
								onSelect={ ( media ) =>
									setAttributes( {
										image: media.url,
										imageId: media.id || 0,
										imageAlt: media.alt || '',
									} )
								}
								accept="image/*"
								allowedTypes={ [ 'image' ] }
							/>
						</MediaUploadCheck>
					) }

					<div className="sgs-product-card__body">
						{ /* Tag badge preview — tagTextColour/tagBackgroundColour only
						     style the TRIAL tag in render.php (the scoped rule targets
						     .sgs-product-card__tag--trial specifically); the featured
						     badge is a fixed "coloured strip" with no colour attrs of
						     its own (block.json), so it is deliberately left unstyled
						     here. */ }
						{ isTrial && ( attributes.trialTag || '' ) !== '' && (
							<span
								className="sgs-product-card__tag sgs-product-card__tag--trial"
								style={ {
									backgroundColor: resolvePcColour(
										attributes.tagBackgroundColour
									),
									...resolveTextColourPreviewStyle(
										attributes.tagTextColour,
										attributes.tagTextColourGradient,
										resolvePcColour
									),
								} }
							>
								{ attributes.trialTag }
							</span>
						) }
						{ isFeatured &&
							( attributes.featuredTag || '' ) !== '' && (
								<span className="sgs-product-card__tag sgs-product-card__tag--featured">
									{ attributes.featuredTag }
								</span>
							) }

						{ /* Product name — inline RichText */ }
						<RichText
							tagName={ headingTag }
							className="sgs-product-card__title"
							style={ titlePreviewStyle }
							value={ productName || '' }
							onChange={ ( v ) =>
								setAttributes( { productName: v } )
							}
							placeholder={ __(
								'Product name…',
								'sgs-blocks'
							) }
							allowedFormats={ [] }
						/>

						{ /* Description — inline RichText */ }
						<RichText
							tagName="div"
							className="sgs-product-card__description"
							style={ descPreviewStyle }
							value={ description || '' }
							onChange={ ( v ) =>
								setAttributes( { description: v } )
							}
							placeholder={ __(
								'Short description…',
								'sgs-blocks'
							) }
							allowedFormats={ [
								'core/bold',
								'core/italic',
								'core/link',
							] }
						/>

						{ /*
						 * Pack pills preview — uses the REAL sgs/option-picker markup +
						 * classes (.sgs-option-picker / __options / __option / __pill,
						 * outlined+medium) so the shared option-picker stylesheet (loaded
						 * in the editor) styles it byte-identically to the frontend +
						 * bound-mode picker: "typed uses the same setup as bound" (Bean,
						 * 2026-07-10). The card-scoped .product-card .sgs-option-picker
						 * override supplies the pink resting outline; the :checked sibling
						 * rule + ::before tick give the selected pill its filled state.
						 * Non-interactive (readOnly) — the frontend picker is the real,
						 * self-contained sgs/option-picker block; this is a visual stand-in.
						 */ }
						{ ( packSizes || [] ).length > 0 && (
							<div
								className="sgs-option-picker sgs-option-picker--outlined sgs-option-picker--medium"
								role="radiogroup"
								aria-label={ __( 'Pack size', 'sgs-blocks' ) }
							>
								<div className="sgs-option-picker__options">
									{ packSizes.map( ( pill, i ) => (
										<label
											key={ i }
											className="sgs-option-picker__option"
										>
											<input
												type="radio"
												name="sgs-product-card-preview-pack-size"
												checked={ !! pill.selected }
												readOnly
											/>
											<span className="sgs-option-picker__pill">
												{ pill.label }
											</span>
										</label>
									) ) }
								</div>
							</div>
						) }

						{ /* Price row */ }
						{ ( ( priceLarge || '' ) !== '' ||
							( priceNote || '' ) !== '' ) && (
							<div className="sgs-product-card__price-row">
								{ ( priceLarge || '' ) !== '' && (
									<span
										className="sgs-product-card__price"
										style={ pricePreviewStyle }
									>
										{ priceLarge }
									</span>
								) }
								{ ( priceNote || '' ) !== '' && (
									<span
										className="sgs-product-card__price-note"
										style={ priceNotePreviewStyle }
									>
										{ priceNote }
									</span>
								) }
							</div>
						) }

						{ /* CTA row — classNames + inline style MIRROR
						     product-card-builtin-render.php's markup
						     (`sgs-button sgs-button--{style}` +, for the
						     primary CTA, the `sgs-product-card__cta--primary`
						     marker class) so the typed preview picks up the
						     same base/composite-mirror CSS cascade as the
						     frontend, on top of which ctaPreviewStyle applies
						     the per-instance cta* box/colour/typography
						     overrides render.php emits via
						     sgs_button_element_style_css(). cta2 has no
						     equivalent box attrs (block.json declares only
						     cta2Text/cta2Url/cta2Style), so no inline style
						     is needed there. */ }
						<div className="sgs-product-card__cta-row">
							{ ( ctaText || '' ) !== '' && (
								<span
									className={ `sgs-button sgs-button--${ safeCtaStyle } sgs-product-card__cta--primary` }
									style={ ctaPreviewStyle }
								>
									{ ctaText }
								</span>
							) }
							{ ( cta2Text || '' ) !== '' && (
								<span
									className={ `sgs-button sgs-button--${ safeCta2Style }` }
								>
									{ cta2Text }
								</span>
							) }
						</div>
					</div>
				</div>
			) }
		</>
	);
}
