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
} from '@wordpress/components';
import { DesignTokenPicker, ResponsiveControl } from '../../components';
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
		hoverEffect,
		titleColour,
		subtitleColour,
		source,
		queryPostType,
		queryPostsPerPage,
		queryCategory,
	} = attributes;

	const isQueryMode = source === 'query';

	const className = [
		'sgs-card-grid',
		`sgs-card-grid--${ variant }`,
		`sgs-card-grid--hover-${ hoverEffect }`,
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
						] }
						onChange={ ( val ) => setAttributes( { source: val } ) }
						help={ isQueryMode
							? __( 'Cards are pulled automatically from your posts.', 'sgs-blocks' )
							: __( 'Add and arrange cards manually below.', 'sgs-blocks' )
						}
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
								onChange={ ( val ) => setAttributes( { queryCategory: parseInt( val, 10 ) || 0 } ) }
								type="number"
								help={ __( 'Filter by category ID. Leave 0 for all categories.', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
							/>
						</>
					) }
				</PanelBody>

				{ ! isQueryMode && (
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
					<ResponsiveControl
						label={ __( 'Columns', 'sgs-blocks' ) }
					>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'columns',
								tablet: 'columnsTablet',
								mobile: 'columnsMobile',
							};
							return (
								<RangeControl
									value={
										attributes[
											attrMap[ breakpoint ]
										]
									}
									onChange={ ( val ) =>
										setAttributes( {
											[ attrMap[ breakpoint ] ]:
												val,
										} )
									}
									min={ 1 }
									max={
										breakpoint === 'mobile'
											? 2
											: 4
									}
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>
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
						value={ hoverEffect }
						options={ HOVER_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { hoverEffect: val } )
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
					<DesignTokenPicker
						label={ __( 'Subtitle colour', 'sgs-blocks' ) }
						value={ subtitleColour }
						onChange={ ( val ) =>
							setAttributes( { subtitleColour: val } )
						}
					/>
				</PanelBody>
			</InspectorControls>

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
		</>
	);
}
