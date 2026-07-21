import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
} from '@wordpress/block-editor';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	Button,
	TextControl,
	ToggleControl,
	Spinner,
} from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import {
	ProductTaxonomyChecklist,
	ProductHandpickPanel,
} from './components/product-panels';
import { DesignTokenPicker, ShadowControl, TypographyControls } from '../../components';
import MediaPicker from '../../components/MediaPicker';
import { colourVar, spacingVar } from '../../utils';

const VARIANT_OPTIONS = [
	{ label: __( 'Card', 'sgs-blocks' ), value: 'card' },
	{ label: __( 'Overlay', 'sgs-blocks' ), value: 'overlay' },
];

const ASPECT_RATIO_OPTIONS = [
	{ label: __( 'Auto', 'sgs-blocks' ), value: 'auto' },
	{ label: '1:1', value: '1/1' },
	{ label: '4:3', value: '4/3' },
	{ label: '3:2', value: '3/2' },
	{ label: '16:10', value: '16/10' },
	{ label: '16:9', value: '16/9' },
];

const HOVER_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Zoom', 'sgs-blocks' ), value: 'zoom' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Overlay Slide', 'sgs-blocks' ), value: 'overlay-slide' },
];

const PRODUCT_COLLECTION_OPTIONS = [
	{ label: __( 'Latest', 'sgs-blocks' ), value: 'latest' },
	{ label: __( 'Best selling', 'sgs-blocks' ), value: 'best-selling' },
	{ label: __( 'Highest price', 'sgs-blocks' ), value: 'price-high' },
	{ label: __( 'Lowest price', 'sgs-blocks' ), value: 'price-low' },
	{ label: __( 'Top rated', 'sgs-blocks' ), value: 'top-rated' },
];

const BADGE_VARIANT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Success', 'sgs-blocks' ), value: 'success' },
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
	{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
];

function ItemEditor( { item, index, onChange, onRemove } ) {
	const update = ( key, value ) => {
		onChange( { ...item, [ key ]: value } );
	};

	return (
		<div
			style={ {
				padding: '12px',
				border: '1px solid #ddd',
				borderRadius: '4px',
				marginBottom: '12px',
			} }
		>
			<p style={ { margin: '0 0 8px', fontWeight: 600 } }>
				{ __( 'Item', 'sgs-blocks' ) } { index + 1 }
			</p>
			<div style={ { marginBottom: '8px' } }>
				<MediaPicker
					value={ item.media || ( item.image?.url ? {
						url: item.image.url,
						type: 'image',
						id: item.image.id || 0,
						alt: item.image.alt || '',
						mime: 'image/jpeg',
					} : null ) }
					onChange={ ( media ) => {
						// Persist to new unified slot AND keep legacy `image`
						// hydrated when the picked media is an image — the
						// existing render path / overlay still reads from it
						// during the deprecation window.
						const next = { ...item, media };
						if ( media && media.type === 'image' ) {
							next.image = {
								id: media.id || 0,
								url: media.url,
								alt: media.alt || '',
							};
						} else if ( media && media.type === 'video' ) {
							// Clear legacy image to avoid double-render.
							next.image = undefined;
						}
						onChange( next );
					} }
					onRemove={ () =>
						onChange( { ...item, media: null, image: undefined } )
					}
					label={ __( 'Select card media', 'sgs-blocks' ) }
					instructionsImage={ __(
						'Choose an image or video for this card',
						'sgs-blocks'
					) }
				/>
			</div>
			<TextControl
				label={ __( 'Title', 'sgs-blocks' ) }
				value={ item.title || '' }
				onChange={ ( val ) => update( 'title', val ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Subtitle', 'sgs-blocks' ) }
				value={ item.subtitle || '' }
				onChange={ ( val ) => update( 'subtitle', val ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Badge text', 'sgs-blocks' ) }
				value={ item.badge || '' }
				onChange={ ( val ) => update( 'badge', val ) }
				placeholder={ __(
					'e.g. Trade prices from £3.50/kg',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
			/>
			<SelectControl
				label={ __( 'Badge style', 'sgs-blocks' ) }
				value={ item.badgeVariant || '' }
				options={ BADGE_VARIANT_OPTIONS }
				onChange={ ( val ) => update( 'badgeVariant', val ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Link URL', 'sgs-blocks' ) }
				value={ item.link || '' }
				onChange={ ( val ) => update( 'link', val ) }
				type="url"
				__nextHasNoMarginBottom
			/>
			<Button
				variant="secondary"
				isDestructive
				onClick={ onRemove }
				size="small"
				style={ { marginTop: '8px' } }
			>
				{ __( 'Remove item', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		variant,
		items,
		columns,
		columnsTablet,
		columnsMobile,
		gap,
		aspectRatio,
		effectHover,
		titleColour,
		subtitleColour,
		cardBackground,
		cardBorderColour,
		cardBorderWidth,
		cardRadius,
		cardShadow,
		source,
		queryPostType,
		queryPostsPerPage,
		queryCategory,
		productSource,
		productCollection,
		productLimit,
		productCategories,
		productTags,
		productFeatured,
		productOnSale,
		productInStock,
		productIds,
		productShowLadder,
		productEmptyMessage,
	} = attributes;

	const isQueryMode = source === 'query';
	const isWcProductMode = source === 'wc-product';

	// Flat help-text resolution (no nested ternary — S3358).
	let sourceHelp = __( 'Add and arrange cards manually below.', 'sgs-blocks' );
	if ( isWcProductMode ) {
		sourceHelp = __( 'Products are pulled from your WooCommerce catalogue.', 'sgs-blocks' );
	} else if ( isQueryMode ) {
		sourceHelp = __( 'Cards are pulled automatically from your posts.', 'sgs-blocks' );
	}

	const className = [
		'sgs-card-grid',
		`sgs-card-grid--${ variant }`,
		`sgs-card-grid--hover-${ effectHover }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	const gridStyle = {
		'--sgs-card-grid-columns': columns,
		'--sgs-card-grid-columns-tablet': columnsTablet,
		'--sgs-card-grid-columns-mobile': columnsMobile,
		'--sgs-card-grid-gap': spacingVar( gap ),
		'--sgs-card-grid-aspect': aspectRatio,
	};

	const titleStyle = {
		color: colourVar( titleColour ) || undefined,
	};

	const subtitleStyle = {
		color: colourVar( subtitleColour ) || undefined,
	};

	const updateItem = ( index, updatedItem ) => {
		const updated = [ ...items ];
		updated[ index ] = updatedItem;
		setAttributes( { items: updated } );
	};

	const removeItem = ( index ) => {
		setAttributes( {
			items: items.filter( ( _, i ) => i !== index ),
		} );
	};

	const addItem = () => {
		setAttributes( {
			items: [
				...items,
				{
					media: null,
					image: undefined,
					title: '',
					subtitle: '',
					badge: '',
					badgeVariant: '',
					link: '',
				},
			],
		} );
	};

	return (
		<>
			<InspectorControls>
				<ContainerWrapperControls attributes={ attributes } setAttributes={ setAttributes } kind="layout" />
				<PanelBody title={ __( 'Content Source', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Source', 'sgs-blocks' ) }
						value={ source || 'manual' }
						options={ [
							{ label: __( 'Manual (custom items)', 'sgs-blocks' ), value: 'manual' },
							{ label: __( 'Query (from posts)', 'sgs-blocks' ), value: 'query' },
							{ label: __( 'WooCommerce products', 'sgs-blocks' ), value: 'wc-product' },
						] }
						onChange={ ( val ) => setAttributes( { source: val } ) }
						help={ sourceHelp }
						__nextHasNoMarginBottom
					/>
					{ isQueryMode && (
						<>
							<SelectControl
								label={ __( 'Post type', 'sgs-blocks' ) }
								value={ queryPostType || 'post' }
								options={ [
									{ label: __( 'Posts', 'sgs-blocks' ), value: 'post' },
									{ label: __( 'Pages', 'sgs-blocks' ), value: 'page' },
								] }
								onChange={ ( val ) => setAttributes( { queryPostType: val } ) }
								__nextHasNoMarginBottom
							/>
							<RangeControl
								label={ __( 'Number of cards', 'sgs-blocks' ) }
								value={ queryPostsPerPage || 6 }
								onChange={ ( val ) => setAttributes( { queryPostsPerPage: val } ) }
								min={ 1 }
								max={ 24 }
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={ __( 'Category ID (optional)', 'sgs-blocks' ) }
								value={ queryCategory ? String( queryCategory ) : '' }
								onChange={ ( val ) => setAttributes( { queryCategory: Number.parseInt( val, 10 ) || 0 } ) }
								type="number"
								help={ __( 'Filter by category ID. Leave 0 for all categories.', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
							/>
						</>
					) }
				</PanelBody>

				{ /* ── Products panel: visible only in wc-product mode ── */ }
				{ isWcProductMode && (
					<PanelBody
						title={ __( 'Products', 'sgs-blocks' ) }
						initialOpen={ true }
					>
						<SelectControl
							label={ __( 'Selection mode', 'sgs-blocks' ) }
							value={ productSource || 'collection' }
							options={ [
								{ label: __( 'Smart collection', 'sgs-blocks' ), value: 'collection' },
								{ label: __( 'Hand-pick specific products', 'sgs-blocks' ), value: 'handpick' },
							] }
							onChange={ ( val ) => setAttributes( { productSource: val } ) }
							__nextHasNoMarginBottom
						/>

						{ ( productSource || 'collection' ) === 'collection' && (
							<>
								<SelectControl
									label={ __( 'Smart collection', 'sgs-blocks' ) }
									value={ productCollection || 'latest' }
									options={ PRODUCT_COLLECTION_OPTIONS }
									onChange={ ( val ) => setAttributes( { productCollection: val } ) }
									help={ __( 'One-click preset ordering for your product grid.', 'sgs-blocks' ) }
									__nextHasNoMarginBottom
								/>
								<RangeControl
									label={ __( 'Number of products', 'sgs-blocks' ) }
									value={ productLimit || 6 }
									onChange={ ( val ) => setAttributes( { productLimit: val } ) }
									min={ 1 }
									max={ 24 }
									help={ __( 'Maximum 24 products.', 'sgs-blocks' ) }
									__nextHasNoMarginBottom
								/>
								<p style={ { margin: '12px 0 4px', fontWeight: 600, fontSize: 12 } }>
									{ __( 'Filters', 'sgs-blocks' ) }
								</p>
								<ProductTaxonomyChecklist
									taxonomy="product_cat"
									label={ __( 'Categories', 'sgs-blocks' ) }
									attributeKey="productCategories"
									selectedIds={ productCategories || [] }
									setAttributes={ setAttributes }
								/>
								<ProductTaxonomyChecklist
									taxonomy="product_tag"
									label={ __( 'Tags', 'sgs-blocks' ) }
									attributeKey="productTags"
									selectedIds={ productTags || [] }
									setAttributes={ setAttributes }
								/>
								<SelectControl
									label={ __( 'In stock only', 'sgs-blocks' ) }
									value={ productInStock === false ? 'no' : 'yes' }
									options={ [
										{ label: __( 'Yes (recommended)', 'sgs-blocks' ), value: 'yes' },
										{ label: __( 'No — include out-of-stock', 'sgs-blocks' ), value: 'no' },
									] }
									onChange={ ( val ) => setAttributes( { productInStock: val === 'yes' } ) }
									__nextHasNoMarginBottom
								/>
								<SelectControl
									label={ __( 'On sale only', 'sgs-blocks' ) }
									value={ productOnSale ? 'yes' : 'no' }
									options={ [
										{ label: __( 'No', 'sgs-blocks' ), value: 'no' },
										{ label: __( 'Yes — sale items only', 'sgs-blocks' ), value: 'yes' },
									] }
									onChange={ ( val ) => setAttributes( { productOnSale: val === 'yes' } ) }
									__nextHasNoMarginBottom
								/>
								<SelectControl
									label={ __( 'Featured only', 'sgs-blocks' ) }
									value={ productFeatured ? 'yes' : 'no' }
									options={ [
										{ label: __( 'No', 'sgs-blocks' ), value: 'no' },
										{ label: __( 'Yes — featured items only', 'sgs-blocks' ), value: 'yes' },
									] }
									onChange={ ( val ) => setAttributes( { productFeatured: val === 'yes' } ) }
									__nextHasNoMarginBottom
								/>
							</>
						) }

						{ ( productSource || 'collection' ) === 'handpick' && (
							<ProductHandpickPanel
								productIds={ productIds || [] }
								setAttributes={ setAttributes }
							/>
						) }

						<ToggleControl
							label={ __( 'Show price breakdown on cards', 'sgs-blocks' ) }
							checked={ !! productShowLadder }
							onChange={ ( val ) => setAttributes( { productShowLadder: val } ) }
							help={ __( 'Off by default — grids are a browsing context; the ladder does its upsell work on the product page.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Empty state message', 'sgs-blocks' ) }
							value={ productEmptyMessage || '' }
							onChange={ ( val ) => setAttributes( { productEmptyMessage: val } ) }
							help={ __( 'Shown when no products match — never a blank region (FR-24-6).', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{ ! isQueryMode && ! isWcProductMode && (
				<PanelBody title={ __( 'Items', 'sgs-blocks' ) }>
					{ items.map( ( item, index ) => (
						<ItemEditor
							key={ index }
							item={ item }
							index={ index }
							onChange={ ( updated ) =>
								updateItem( index, updated )
							}
							onRemove={ () => removeItem( index ) }
						/>
					) ) }
					<Button variant="secondary" onClick={ addItem }>
						{ __( 'Add item', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
				) }

				<PanelBody
					title={ __( 'Grid Settings', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Variant', 'sgs-blocks' ) }
						value={ variant }
						options={ VARIANT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { variant: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ /* Responsive columns (desktop/tablet/mobile) are provided by the
					     ContainerWrapperControls LayoutPanel above when layout=grid.
					     Duplicate direct controls removed (Rule 3, Step 7b). */ }
					<SelectControl
						label={ __( 'Aspect ratio', 'sgs-blocks' ) }
						value={ aspectRatio }
						options={ ASPECT_RATIO_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { aspectRatio: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ effectHover }
						options={ HOVER_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { effectHover: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Text Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Title colour', 'sgs-blocks' ) }
						value={ titleColour }
						onChange={ ( val ) =>
							setAttributes( { titleColour: val } )
						}
					/>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="title"
						showWeight={ false }
						showStyle={ false }
						showLineHeight={ false }
					/>
					<DesignTokenPicker
						label={ __( 'Subtitle colour', 'sgs-blocks' ) }
						value={ subtitleColour }
						onChange={ ( val ) =>
							setAttributes( { subtitleColour: val } )
						}
					/>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="subtitle"
						showWeight={ false }
						showStyle={ false }
						showLineHeight={ false }
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Card Styling (resting state)', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<p style={ { margin: '0 0 12px', fontSize: 12, color: '#757575' } }>
						{ __(
							'Leave any field empty to keep the theme default — these only override the card at rest (see also Hover effect above for the hover styling).',
							'sgs-blocks'
						) }
					</p>
					<DesignTokenPicker
						label={ __( 'Background colour', 'sgs-blocks' ) }
						value={ cardBackground }
						onChange={ ( val ) =>
							setAttributes( { cardBackground: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Border colour', 'sgs-blocks' ) }
						value={ cardBorderColour }
						onChange={ ( val ) =>
							setAttributes( { cardBorderColour: val } )
						}
					/>
					<TextControl
						label={ __( 'Border width', 'sgs-blocks' ) }
						value={ cardBorderWidth || '' }
						onChange={ ( val ) =>
							setAttributes( { cardBorderWidth: val } )
						}
						help={ __(
							'e.g. 1px. Leave empty for no border.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Corner radius', 'sgs-blocks' ) }
						value={ cardRadius || '' }
						onChange={ ( val ) =>
							setAttributes( { cardRadius: val } )
						}
						help={ __(
							'e.g. 8px. Leave empty to use the theme default.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<ShadowControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						value={ cardShadow }
						onChange={ ( val ) =>
							setAttributes( { cardShadow: val } )
						}
					/>
				</PanelBody>
			</InspectorControls>

			{ /* WC-product mode: live server-side preview (mirrors content-collection pattern) */ }
			{ isWcProductMode ? (
				<div { ...blockProps }>
					<ServerSideRender
						block="sgs/card-grid"
						attributes={ attributes }
						LoadingResponsePlaceholder={ () => (
							<div style={ { padding: '2rem', textAlign: 'center' } }>
								<Spinner />
								<p style={ { marginTop: 8, color: '#6b7280' } }>
									{ __( 'Loading products…', 'sgs-blocks' ) }
								</p>
							</div>
						) }
					/>
				</div>
			) : (
				<div { ...blockProps } style={ { ...blockProps.style, ...gridStyle } }>
					{ items.length === 0 && (
						<p className="sgs-card-grid__placeholder">
							{ __(
								'Add items in the sidebar to build your grid.',
								'sgs-blocks'
							) }
						</p>
					) }
					{ items.map( ( item, index ) => (
						<div key={ index } className="sgs-card-grid__item">
							<div className="sgs-card-grid__image-wrap">
								{ item.image?.url ? (
									<img
										src={ item.image.url }
										alt={ item.image.alt || '' }
										className="sgs-card-grid__image"
									/>
								) : (
									<span className="sgs-card-grid__image-placeholder" />
								) }
								{ variant === 'overlay' && (
									<div className="sgs-card-grid__overlay">
										{ item.title && (
											<span
												className="sgs-card-grid__title"
												style={ titleStyle }
											>
												{ item.title }
											</span>
										) }
										{ item.subtitle && (
											<span
												className="sgs-card-grid__subtitle"
												style={ subtitleStyle }
											>
												{ item.subtitle }
											</span>
										) }
									</div>
								) }
							</div>
							{ variant === 'card' && (
								<div className="sgs-card-grid__body">
									{ item.title && (
										<h3
											className="sgs-card-grid__title"
											style={ titleStyle }
										>
											{ item.title }
										</h3>
									) }
									{ item.subtitle && (
										<p
											className="sgs-card-grid__subtitle"
											style={ subtitleStyle }
										>
											{ item.subtitle }
										</p>
									) }
									{ item.badge && item.badgeVariant && (
										<span
											className={ `sgs-card-grid__badge sgs-card-grid__badge--${ item.badgeVariant }` }
										>
											{ item.badge }
										</span>
									) }
								</div>
							) }
						</div>
					) ) }
				</div>
			) }
		</>
	);
}
