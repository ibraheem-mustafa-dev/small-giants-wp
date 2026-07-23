import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaPlaceholder,
	RichText,
} from '@wordpress/block-editor';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import { SpacingControl, DesignTokenPicker, TypographyControls } from '../../components';
import { BUTTON_PRESETS } from '../button/presets';
import {
	PanelBody,
	SelectControl,
	TextControl,
	TextareaControl,
	RangeControl,
	__experimentalNumberControl as NumberControl,
	__experimentalUnitControl as UnitControl,
	__experimentalBoxControl as BoxControl,
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
		<PanelBody
			title={ __( 'Content overrides', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<p style={ { marginTop: 0 } }>
				{ __(
					'Replace individual live product details with your own text. Switching an override off keeps your text for later. Price always comes from the product.',
					'sgs-blocks'
				) }
			</p>

			{ /* Name */ }
			<ToggleControl
				label={ __( 'Override name', 'sgs-blocks' ) }
				checked={ isOn( 'name' ) }
				onChange={ ( on ) => toggle( 'name', on ) }
				help={ ! isOn( 'name' ) ? liveHelp( liveName ) : undefined }
				__nextHasNoMarginBottom
			/>
			{ isOn( 'name' ) && (
				<TextControl
					label={ __( 'Name', 'sgs-blocks' ) }
					value={ attributes.productName || '' }
					onChange={ ( v ) =>
						setAttributes( { productName: v } )
					}
					__nextHasNoMarginBottom
				/>
			) }

			{ /* Description */ }
			<ToggleControl
				label={ __( 'Override description', 'sgs-blocks' ) }
				checked={ isOn( 'description' ) }
				onChange={ ( on ) => toggle( 'description', on ) }
				help={
					! isOn( 'description' )
						? liveHelp( liveDesc )
						: undefined
				}
				__nextHasNoMarginBottom
			/>
			{ isOn( 'description' ) && (
				<TextareaControl
					label={ __( 'Description', 'sgs-blocks' ) }
					value={ attributes.description || '' }
					onChange={ ( v ) =>
						setAttributes( { description: v } )
					}
					__nextHasNoMarginBottom
				/>
			) }

			{ /* Badge */ }
			<ToggleControl
				label={ __( 'Override badge', 'sgs-blocks' ) }
				checked={ isOn( 'badge' ) }
				onChange={ ( on ) => toggle( 'badge', on ) }
				__nextHasNoMarginBottom
			/>
			{ isOn( 'badge' ) &&
				( badgeApplies ? (
					<TextControl
						label={ __( 'Badge text', 'sgs-blocks' ) }
						value={ attributes[ badgeAttr ] || '' }
						onChange={ ( v ) =>
							setAttributes( { [ badgeAttr ]: v } )
						}
						__nextHasNoMarginBottom
					/>
				) : (
					<Notice status="info" isDismissible={ false }>
						{ __(
							'Badges show on the Trial and Featured variants. Choose one under Card.',
							'sgs-blocks'
						) }
					</Notice>
				) ) }

			{ /* Image */ }
			<ToggleControl
				label={ __( 'Override image', 'sgs-blocks' ) }
				checked={ isOn( 'image' ) }
				onChange={ ( on ) => toggle( 'image', on ) }
				help={ __(
					'Sets the card’s default image. Variation photos still swap in when an option is selected.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
			/>
			{ isOn( 'image' ) && (
				<>
					{ galleryImages.length > 0 && (
						<div
							style={ {
								display: 'flex',
								flexWrap: 'wrap',
								gap: 8,
								margin: '8px 0',
							} }
							aria-label={ __(
								'Product gallery images',
								'sgs-blocks'
							) }
						>
							{ galleryImages.map( ( img, i ) => (
								<Button
									key={ img.id || i }
									onClick={ () =>
										setAttributes( {
											image: img.src,
											imageAlt: img.alt || '',
										} )
									}
									aria-label={ `${ __(
										'Use gallery image',
										'sgs-blocks'
									) } ${ i + 1 }` }
									style={ {
										padding: 0,
										width: 48,
										height: 48,
										minWidth: 44,
										minHeight: 44,
										overflow: 'hidden',
										borderRadius: 4,
										border:
											attributes.image === img.src
												? '2px solid var(--wp-admin-theme-color, #007cba)'
												: '2px solid transparent',
									} }
								>
									<img
										src={ img.src }
										alt={ img.alt || '' }
										style={ {
											width: '100%',
											height: '100%',
											objectFit: 'cover',
										} }
									/>
								</Button>
							) ) }
						</div>
					) }
					<MediaUpload
						onSelect={ ( media ) =>
							setAttributes( {
								image: media.url,
								imageAlt: media.alt || '',
							} )
						}
						allowedTypes={ [ 'image' ] }
						render={ ( { open } ) => (
							<Button
								variant="secondary"
								onClick={ open }
							>
								{ __(
									'Choose another image',
									'sgs-blocks'
								) }
							</Button>
						) }
					/>
				</>
			) }

			{ /* CTA */ }
			<ToggleControl
				label={ __( 'Override button', 'sgs-blocks' ) }
				checked={ isOn( 'cta' ) }
				onChange={ ( on ) => toggle( 'cta', on ) }
				__nextHasNoMarginBottom
			/>
			{ isOn( 'cta' ) && (
				<>
					<TextControl
						label={ __( 'Button text', 'sgs-blocks' ) }
						value={ attributes.ctaText || '' }
						onChange={ ( v ) =>
							setAttributes( { ctaText: v } )
						}
						__nextHasNoMarginBottom
					/>
					{ ( ctaBehaviour || 'learn-more' ) ===
					'learn-more' ? (
						<TextControl
							label={ __( 'Button link', 'sgs-blocks' ) }
							value={ attributes.ctaUrl || '' }
							onChange={ ( v ) =>
								setAttributes( { ctaUrl: v } )
							}
							type="url"
							__nextHasNoMarginBottom
						/>
					) : (
						<Notice status="info" isDismissible={ false }>
							{ __(
								'Only the button text is overridable for basket buttons — the button keeps its basket action.',
								'sgs-blocks'
							) }
						</Notice>
					) }
				</>
			) }
		</PanelBody>
	);
}

export default function Edit( { attributes, setAttributes } ) {
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
		priceColour,
		descColour,
		priceNoteColour,
		// Built-in CTA styling (typed + bound share the same cta* attrs).
		ctaColourBackground,
		ctaColourText,
		ctaColourBorder,
		ctaBorderRadius,
		ctaFontSize,
		ctaPadding,
		ctaWidthType,
	} = attributes;

	const isTrial = variantStyle === 'trial';
	const isFeatured = variantStyle === 'featured';
	const isBound = sourceMode !== 'typed';

	// Typed mode = the built-in element editor. The block has no InnerBlocks
	// slot (legacy bridge retired 2026-07-04).
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

	// Typed-mode editor parity (no-inline migration): color/spacing/border supports
	// are __experimentalSkipSerialization, so useBlockProps() no longer applies the
	// WP-native colour/border to the editor wrapper. Bound mode uses ServerSideRender
	// (already faithful to render.php's scoped <style> + re-added has-* classes), but
	// the typed NATIVE preview must re-apply them here so the editor mirrors the
	// frontend. Editor inline style is allowed for live preview (only the SAVED /
	// dynamic-rendered frontend must be inline-free — this block is render.php-driven).
	// Mirrors render.php's scoped emission + preset has-* class re-add exactly.
	const nativeStyle = attributes.style || {};
	const typedPreviewStyle = {};
	const typedPreviewClasses = [];
	if ( ! isBound ) {
		const nc = nativeStyle.color || {};
		if ( nc.text ) typedPreviewStyle.color = nc.text;
		if ( nc.background ) typedPreviewStyle.background = nc.background;
		if ( nc.gradient ) typedPreviewStyle.background = nc.gradient;
		const nb = nativeStyle.border || {};
		if ( nb.color ) typedPreviewStyle.borderColor = nb.color;
		if ( nb.style ) typedPreviewStyle.borderStyle = nb.style;
		if ( nb.width ) typedPreviewStyle.borderWidth = nb.width;
		if ( typeof nb.radius === 'string' && nb.radius ) {
			typedPreviewStyle.borderRadius = nb.radius;
		} else if ( nb.radius && typeof nb.radius === 'object' ) {
			if ( nb.radius.topLeft ) typedPreviewStyle.borderTopLeftRadius = nb.radius.topLeft;
			if ( nb.radius.topRight ) typedPreviewStyle.borderTopRightRadius = nb.radius.topRight;
			if ( nb.radius.bottomLeft ) typedPreviewStyle.borderBottomLeftRadius = nb.radius.bottomLeft;
			if ( nb.radius.bottomRight ) typedPreviewStyle.borderBottomRightRadius = nb.radius.bottomRight;
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

	// Heading tag derived from headingLevel attr.
	const headingTag = `h${ headingLevel || 3 }`;

	return (
		<>
			<InspectorControls>
				<ProductSourcePanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="content"
				/>
				<PanelBody
					title={ __( 'Inner padding', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SpacingControl
						label={ __( 'Card body padding', 'sgs-blocks' ) }
						value={ attributes.innerPadding || '' }
						onChange={ ( val ) =>
							setAttributes( { innerPadding: val } )
						}
					/>
				</PanelBody>

				{ /* ── Card panel ── */ }
				<PanelBody title={ __( 'Card', 'sgs-blocks' ) }>
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
					/>
					{ isBuiltIn && (
						<>
							<SelectControl
								label={ __( 'Heading level', 'sgs-blocks' ) }
								help={ __(
									'HTML heading tag for the product name (h2, h3, or h4).',
									'sgs-blocks'
								) }
								value={ String( headingLevel || 3 ) }
								options={ [
									{ value: '2', label: 'H2' },
									{ value: '3', label: 'H3' },
									{ value: '4', label: 'H4' },
								] }
								onChange={ ( v ) =>
									setAttributes( {
										headingLevel: Number.parseInt( v, 10 ),
									} )
								}
								__nextHasNoMarginBottom
							/>
							<TypographyControls
								attributes={ attributes }
								setAttributes={ setAttributes }
								prefix="title"
							/>
							<DesignTokenPicker
								label={ __( 'Title colour', 'sgs-blocks' ) }
								value={ titleColour }
								onChange={ ( v ) =>
									setAttributes( { titleColour: v } )
								}
							/>
							<TypographyControls
								attributes={ attributes }
								setAttributes={ setAttributes }
								prefix="desc"
								showWeight={ false }
								showStyle={ false }
							/>
							<DesignTokenPicker
								label={ __( 'Description colour', 'sgs-blocks' ) }
								value={ descColour }
								onChange={ ( v ) =>
									setAttributes( { descColour: v } )
								}
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
								<TextControl
									label={ __( 'Trial tag text', 'sgs-blocks' ) }
									value={ attributes.trialTag || '' }
									onChange={ ( v ) =>
										setAttributes( { trialTag: v } )
									}
									__nextHasNoMarginBottom
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
									<DesignTokenPicker
										label={ __( 'Tag background colour', 'sgs-blocks' ) }
										value={ attributes.tagBackgroundColour || '' }
										onChange={ ( v ) =>
											setAttributes( { tagBackgroundColour: v } )
										}
									/>
									<DesignTokenPicker
										label={ __( 'Tag text colour', 'sgs-blocks' ) }
										value={ attributes.tagTextColour || '' }
										onChange={ ( v ) =>
											setAttributes( { tagTextColour: v } )
										}
									/>
									<RangeControl
										label={ __( 'Tag border radius (px)', 'sgs-blocks' ) }
										value={ attributes.tagBorderRadius }
										onChange={ ( v ) =>
											setAttributes( { tagBorderRadius: v } )
										}
										min={ 0 }
										max={ 50 }
										step={ 1 }
										__nextHasNoMarginBottom
									/>
									<BoxControl
										label={ __( 'Tag padding', 'sgs-blocks' ) }
										values={ attributes.tagPadding ?? {} }
										onChange={ ( next ) =>
											setAttributes( { tagPadding: next } )
										}
									/>
								</>
							) }
							{ isFeatured && (
								<TextControl
									label={ __( 'Featured tag text', 'sgs-blocks' ) }
									value={ attributes.featuredTag || '' }
									onChange={ ( v ) =>
										setAttributes( { featuredTag: v } )
									}
									__nextHasNoMarginBottom
								/>
							) }
						</>
					) }
				</PanelBody>

				{ /* ── Price panel (typed built-in only) ── */ }
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
						/>
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix="price"
							showStyle={ false }
							showLineHeight={ false }
						/>
						<DesignTokenPicker
							label={ __( 'Price colour', 'sgs-blocks' ) }
							value={ priceColour }
							onChange={ ( v ) =>
								setAttributes( { priceColour: v } )
							}
						/>
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix="priceNote"
							showWeight={ false }
							showStyle={ false }
							showLineHeight={ false }
						/>
						<DesignTokenPicker
							label={ __( 'Price note colour', 'sgs-blocks' ) }
							value={ priceNoteColour }
							onChange={ ( v ) =>
								setAttributes( { priceNoteColour: v } )
							}
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

				{ /* ── Buttons panel ── */ }
				<PanelBody
					title={ __( 'Buttons', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /* Primary CTA text + URL — typed mode only (B5, 2026-06-10).
					     In bound mode the CTA text/url are set via the Content
					     overrides panel ("Override button"), so duplicating them
					     here is redundant. Style + behaviour stay below (both modes). */ }
					{ ! isBound && (
						<>
							<TextControl
								label={ __( 'Primary button text', 'sgs-blocks' ) }
								value={ ctaText || '' }
								onChange={ ( v ) => setAttributes( { ctaText: v } ) }
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={ __( 'Primary button URL', 'sgs-blocks' ) }
								value={ ctaUrl || '' }
								onChange={ ( v ) => setAttributes( { ctaUrl: v } ) }
								type="url"
								__nextHasNoMarginBottom
							/>
						</>
					) }
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
											ctaColourBorder: preset.colourBorder,
											ctaColourBackgroundHover: preset.colourBackgroundHover,
											ctaColourTextHover: preset.colourTextHover,
											ctaColourBorderHover: preset.colourBorderHover,
											ctaBorderStyle: preset.borderStyle,
											ctaBorderWidth: preset.borderWidthTop,
											ctaBorderRadius: preset.borderRadiusTL,
											ctaFontWeight: preset.fontWeight,
									  }
									: {} ),
							} );
						} }
						__nextHasNoMarginBottom
					/>
					{ isBound ? (
						<SelectControl
							label={ __( 'Primary button behaviour', 'sgs-blocks' ) }
							help={ __(
								'What happens when the button is clicked in the live product card.',
								'sgs-blocks'
							) }
							value={ ctaBehaviour || 'learn-more' }
							options={ CTA_BEHAVIOUR_OPTIONS }
							onChange={ ( v ) =>
								setAttributes( { ctaBehaviour: v } )
							}
							__nextHasNoMarginBottom
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
					/>
					{ ( cta2Text || '' ) !== '' && (
						<>
							<TextControl
								label={ __(
									'Secondary button URL',
									'sgs-blocks'
								) }
								value={ cta2Url || '' }
								onChange={ ( v ) =>
									setAttributes( { cta2Url: v } )
								}
								type="url"
								__nextHasNoMarginBottom
							/>
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
							/>
								{ /* v1: the secondary button is always a plain learn-more link (one canonical cart form per card) — no behaviour dropdown until a real second behaviour exists (dead-control rule). */ }
						</>
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
									ctaColourBorder: preset.colourBorder,
									ctaColourBackgroundHover:
										preset.colourBackgroundHover,
									ctaColourTextHover:
										preset.colourTextHover,
									ctaColourBorderHover:
										preset.colourBorderHover,
									ctaBorderStyle: preset.borderStyle,
									ctaBorderWidth: preset.borderWidthTop,
									ctaBorderRadius: preset.borderRadiusTL,
									ctaFontWeight: preset.fontWeight,
								} );
							} }
							style={ { marginBottom: 16 } }
						>
							{ __( 'Reset colours to preset', 'sgs-blocks' ) }
						</Button>
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
						/>
						<NumberControl
							label={ __( 'Corner radius (px)', 'sgs-blocks' ) }
							value={ ctaBorderRadius ?? '' }
							min={ 0 }
							max={ 100 }
							onChange={ ( v ) =>
								setAttributes( {
									ctaBorderRadius:
										v === '' || v === undefined
											? undefined
											: Number.parseInt( v, 10 ),
								} )
							}
							__nextHasNoMarginBottom
						/>
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
						/>
						<BoxControl
							label={ __( 'CTA padding', 'sgs-blocks' ) }
							values={ ctaPadding ?? {} }
							onChange={ ( next ) =>
								setAttributes( { ctaPadding: next } )
							}
						/>
						<DesignTokenPicker
							label={ __( 'Background colour', 'sgs-blocks' ) }
							value={ ctaColourBackground }
							onChange={ ( v ) =>
								setAttributes( { ctaColourBackground: v } )
							}
						/>
						<DesignTokenPicker
							label={ __( 'Text colour', 'sgs-blocks' ) }
							value={ ctaColourText }
							onChange={ ( v ) =>
								setAttributes( { ctaColourText: v } )
							}
						/>
						<DesignTokenPicker
							label={ __( 'Border colour', 'sgs-blocks' ) }
							value={ ctaColourBorder }
							onChange={ ( v ) =>
								setAttributes( { ctaColourBorder: v } )
							}
						/>
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
					/>
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
					</PanelBody>
				) }

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
						/>
						<DesignTokenPicker
							label={ __(
								'Picker label colour',
								'sgs-blocks'
							) }
							value={ pickerLabelColour }
							onChange={ ( v ) =>
								setAttributes( {
									pickerLabelColour: v,
								} )
							}
						/>
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
						/>
						<ToggleControl
							label={ __( 'Show selection tick', 'sgs-blocks' ) }
							checked={ pickerShowSelectedTick }
							onChange={ ( v ) => setAttributes( { pickerShowSelectedTick: v } ) }
							__nextHasNoMarginBottom
						/>
						<DesignTokenPicker
							label={ __( 'Resting pill background', 'sgs-blocks' ) }
							value={ pickerPillBgColour }
							onChange={ ( v ) => setAttributes( { pickerPillBgColour: v } ) }
						/>
						<DesignTokenPicker
							label={ __( 'Resting pill text', 'sgs-blocks' ) }
							value={ pickerPillTextColour }
							onChange={ ( v ) => setAttributes( { pickerPillTextColour: v } ) }
						/>
						<DesignTokenPicker
							label={ __( 'Resting pill border', 'sgs-blocks' ) }
							value={ pickerPillBorderColour }
							onChange={ ( v ) => setAttributes( { pickerPillBorderColour: v } ) }
						/>
						<UnitControl
							label={ __( 'Pill border radius', 'sgs-blocks' ) }
							value={ pickerPillBorderRadius || '' }
							units={ PICKER_RADIUS_UNITS }
							onChange={ ( v ) => setAttributes( { pickerPillBorderRadius: v ?? '' } ) }
							help={ __( 'CSS length, e.g. 6px. Blank = default; 0 = square.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
						<DesignTokenPicker
							label={ __( 'Selected pill background', 'sgs-blocks' ) }
							value={ pickerPillSelectedBgColour }
							onChange={ ( v ) => setAttributes( { pickerPillSelectedBgColour: v } ) }
						/>
						<DesignTokenPicker
							label={ __( 'Selected pill text', 'sgs-blocks' ) }
							value={ pickerPillSelectedTextColour }
							onChange={ ( v ) => setAttributes( { pickerPillSelectedTextColour: v } ) }
						/>
						<DesignTokenPicker
							label={ __( 'Selected pill border', 'sgs-blocks' ) }
							help={ __( 'Independent of the fill (R2). Leave empty to match the fill.', 'sgs-blocks' ) }
							value={ pickerPillSelectedBorderColour }
							onChange={ ( v ) => setAttributes( { pickerPillSelectedBorderColour: v } ) }
						/>
						<UnitControl
							label={ __( 'Selected pill border radius', 'sgs-blocks' ) }
							value={ pickerPillSelectedBorderRadius || '' }
							units={ PICKER_RADIUS_UNITS }
							onChange={ ( v ) => setAttributes( { pickerPillSelectedBorderRadius: v ?? '' } ) }
							help={ __( 'Blank = match resting radius; 0 = square.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>

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
							<Button
								isDestructive
								isSmall
								style={ {
									position: 'absolute',
									top: 8,
									right: 8,
								} }
								onClick={ () =>
									setAttributes( {
										image: '',
										imageAlt: '',
									} )
								}
							>
								{ __( 'Remove image', 'sgs-blocks' ) }
							</Button>
						</div>
					) : (
						<MediaPlaceholder
							icon="format-image"
							labels={ {
								title: __( 'Product image', 'sgs-blocks' ),
							} }
							onSelect={ ( media ) =>
								setAttributes( {
									image: media.url,
									imageAlt: media.alt || '',
								} )
							}
							accept="image/*"
							allowedTypes={ [ 'image' ] }
						/>
					) }

					<div className="sgs-product-card__body">
						{ /* Tag badge preview */ }
						{ isTrial && ( attributes.trialTag || '' ) !== '' && (
							<span className="sgs-product-card__tag sgs-product-card__tag--trial">
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
									<span className="sgs-product-card__price">
										{ priceLarge }
									</span>
								) }
								{ ( priceNote || '' ) !== '' && (
									<span className="sgs-product-card__price-note">
										{ priceNote }
									</span>
								) }
							</div>
						) }

						{ /* CTA row */ }
						<div className="sgs-product-card__cta-row">
							{ ( ctaText || '' ) !== '' && (
								<span
									className={ `btn btn-${ safeCtaStyle }` }
								>
									{ ctaText }
								</span>
							) }
							{ ( cta2Text || '' ) !== '' && (
								<span
									className={ `btn btn-${ safeCta2Style }` }
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
