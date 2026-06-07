import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import {
	PanelBody,
	SelectControl,
	TextControl,
	NumberControl,
	ComboboxControl,
	ToggleControl,
	Notice,
	Spinner,
} from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import apiFetch from '@wordpress/api-fetch';
import ServerSideRender from '@wordpress/server-side-render';

/**
 * FR-22-6 card template — all content as InnerBlocks (typed mode).
 *
 * Document order: image → heading (name) → text (description) →
 * text (price) → label (badge/tag) → multi-button (CTA).
 */
const CARD_TEMPLATE = [
	[ 'sgs/media', { mediaType: 'image' } ],
	[
		'core/heading',
		{ level: 3, placeholder: __( 'Product name', 'sgs-blocks' ) },
	],
	[ 'sgs/text', { placeholder: __( 'Short description…', 'sgs-blocks' ) } ],
	[
		'sgs/text',
		{ placeholder: __( 'Price — e.g. £10.00 · 8-pack', 'sgs-blocks' ) },
	],
	[ 'sgs/label', {} ],
	[
		'sgs/multi-button',
		{},
		[
			[
				'sgs/button',
				{
					inheritStyle: 'primary',
					label: __( 'Shop Now', 'sgs-blocks' ),
				},
			],
		],
	],
];

const ALLOWED_BLOCKS = [
	'sgs/media',
	'core/heading',
	'sgs/text',
	'sgs/label',
	'sgs/multi-button',
	'sgs/button',
];

/** Sentinel value for the "Typed (manual content)" option. */
const TYPED_VALUE = '__typed__';

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
			label: __( 'Typed (manual content)', 'sgs-blocks' ),
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
			productId: parseInt( id, 10 ) || 0,
		} );
	}

	const loading = wcLoading || cptResolving;

	return (
		<PanelBody
			title={ __( 'Product source', 'sgs-blocks' ) }
			initialOpen={ true }
		>
			<ComboboxControl
				label={ __( 'Bind to a product', 'sgs-blocks' ) }
				help={ __(
					'Search WooCommerce or SGS products. Choose "Typed" to author card content by hand.',
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
								'Trade/B2B only. UK consumer law (Price Marking Order 2004) requires the VAT-inclusive price to be the prominent price on a consumer shop — do not use this mode for B2C.',
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
	} = attributes;

	const isTrial = variantStyle === 'trial';
	const isFeatured = variantStyle === 'featured';
	const isBound = sourceMode !== 'typed';

	// Bound mode: render.php (via ServerSideRender) supplies the full
	// `.product-card` wrapper itself, so the editor wrapper must NOT also add
	// it — otherwise the preview shows a double `.product-card` (double
	// padding/border). Frontend spacing/align still come from render.php's
	// get_block_wrapper_attributes().
	const blockProps = useBlockProps(
		isBound
			? {}
			: {
					className: [
						'product-card',
						isTrial ? 'trial-card' : '',
						isFeatured ? 'featured-card' : '',
					]
						.filter( Boolean )
						.join( ' ' ),
			  }
	);

	// Typed-mode InnerBlocks slot (UNCHANGED behaviour).
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template: CARD_TEMPLATE,
		templateLock: false,
		allowedBlocks: ALLOWED_BLOCKS,
	} );

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
				<PanelBody title={ __( 'Card variant', 'sgs-blocks' ) }>
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
					{ ! isBound && (
						<Notice
							status="info"
							isDismissible={ false }
							style={ { marginTop: 8 } }
						>
							{ __(
								'Card content (image, name, description, price, badge, CTA) is managed directly in the editor. Click any inner block to edit it.',
								'sgs-blocks'
							) }
						</Notice>
					) }
				</PanelBody>
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
									indexVariationUrl: parseInt( v, 10 ) || 0,
								} )
							}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }
			{ isBound && (
						<PanelBody
							title={ __( 'Value ladder', 'sgs-blocks' ) }
							initialOpen={ false }
						>
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
				</InspectorControls>

			{ isBound ? (
				<div { ...blockProps }>
					<ServerSideRender
						block="sgs/product-card"
						attributes={ attributes }
					/>
				</div>
			) : (
				<div { ...innerBlocksProps } />
			) }
		</>
	);
}
