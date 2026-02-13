import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	Button,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar, fontSizeVar } from '../../utils';

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ), value: 'x-large' },
	{ label: __( 'XXL', 'sgs-blocks' ), value: 'xx-large' },
];

const BADGE_STYLE_OPTIONS = [
	{ label: __( 'Text only', 'sgs-blocks' ), value: 'text-only' },
	{ label: __( 'Image only', 'sgs-blocks' ), value: 'image-only' },
	{
		label: __( 'Image and text', 'sgs-blocks' ),
		value: 'image-and-text',
	},
];

const BADGE_SIZE_OPTIONS = [
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
];

function BadgeEditor( { item, index, badgeStyle, onChange, onRemove } ) {
	const update = ( key, value ) => {
		onChange( { ...item, [ key ]: value } );
	};

	return (
		<div
			style={ {
				borderBottom: '1px solid #ddd',
				paddingBottom: '12px',
				marginBottom: '12px',
			} }
		>
			<p style={ { fontWeight: 600, margin: '0 0 8px' } }>
				{ `#${ index + 1 }` }
				{ item.label ? ` — ${ item.label }` : '' }
			</p>

			{ badgeStyle !== 'text-only' && (
				<MediaUploadCheck>
					<MediaUpload
						onSelect={ ( media ) =>
							update( 'image', {
								id: media.id,
								url: media.url,
								alt: media.alt,
							} )
						}
						allowedTypes={ [ 'image' ] }
						value={ item.image?.id }
						render={ ( { open } ) => (
							<div style={ { marginBottom: '8px' } }>
								{ item.image?.url ? (
									<>
										<img
											src={ item.image.url }
											alt=""
											style={ {
												maxWidth: '64px',
												maxHeight: '48px',
												objectFit: 'contain',
												display: 'block',
												marginBottom: '4px',
											} }
										/>
										<Button
											variant="link"
											isDestructive
											onClick={ () =>
												update( 'image', undefined )
											}
											size="small"
										>
											{ __(
												'Remove image',
												'sgs-blocks'
											) }
										</Button>
									</>
								) : (
									<Button
										variant="secondary"
										onClick={ open }
										size="small"
									>
										{ __(
											'Select badge image',
											'sgs-blocks'
										) }
									</Button>
								) }
							</div>
						) }
					/>
				</MediaUploadCheck>
			) }

			{ badgeStyle !== 'image-only' && (
				<TextControl
					label={ __( 'Label', 'sgs-blocks' ) }
					value={ item.label || '' }
					onChange={ ( val ) => update( 'label', val ) }
					placeholder={ __( 'BRC Certified', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
				/>
			) }

			<TextControl
				label={ __( 'Link URL (optional)', 'sgs-blocks' ) }
				value={ item.url || '' }
				onChange={ ( val ) => update( 'url', val ) }
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
				{ __( 'Remove badge', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		title,
		items,
		badgeStyle,
		badgeSize,
		titleColour,
		titleFontSize,
		labelColour,
		labelFontSize,
	} = attributes;

	const updateItem = ( index, updated ) => {
		const next = [ ...items ];
		next[ index ] = updated;
		setAttributes( { items: next } );
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
				{ image: undefined, label: '', url: '' },
			],
		} );
	};

	const className = [
		'sgs-certification-bar',
		`sgs-certification-bar--${ badgeStyle }`,
		`sgs-certification-bar--${ badgeSize }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Badge style', 'sgs-blocks' ) }
						value={ badgeStyle }
						options={ BADGE_STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { badgeStyle: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Badge size', 'sgs-blocks' ) }
						value={ badgeSize }
						options={ BADGE_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { badgeSize: val } )
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
					<SelectControl
						label={ __( 'Title font size', 'sgs-blocks' ) }
						value={ titleFontSize || '' }
						options={ FONT_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { titleFontSize: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Label colour', 'sgs-blocks' ) }
						value={ labelColour }
						onChange={ ( val ) =>
							setAttributes( { labelColour: val } )
						}
					/>
					<SelectControl
						label={ __( 'Label font size', 'sgs-blocks' ) }
						value={ labelFontSize || '' }
						options={ FONT_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { labelFontSize: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Badges', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					{ items.map( ( item, index ) => (
						<BadgeEditor
							key={ index }
							item={ item }
							index={ index }
							badgeStyle={ badgeStyle }
							onChange={ ( updated ) =>
								updateItem( index, updated )
							}
							onRemove={ () => removeItem( index ) }
						/>
					) ) }
					<Button variant="secondary" onClick={ addItem }>
						{ __( 'Add badge', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<RichText
					tagName="p"
					className="sgs-certification-bar__title"
					value={ title }
					onChange={ ( val ) =>
						setAttributes( { title: val } )
					}
					placeholder={ __(
						'Trusted certifications & memberships',
						'sgs-blocks'
					) }
					style={ {
						color: colourVar( titleColour ) || undefined,
						fontSize: fontSizeVar( titleFontSize ) || undefined,
					} }
				/>

				{ items.length === 0 ? (
					<p className="sgs-certification-bar__empty">
						{ __(
							'Add badges in the sidebar panel.',
							'sgs-blocks'
						) }
					</p>
				) : (
					<div className="sgs-certification-bar__badges">
						{ items.map( ( item, i ) => (
							<div
								key={ i }
								className="sgs-certification-bar__badge"
							>
								{ badgeStyle !== 'text-only' &&
									item.image?.url && (
										<img
											src={ item.image.url }
											alt={ item.label || '' }
											className="sgs-certification-bar__badge-img"
										/>
									) }
								{ badgeStyle !== 'image-only' &&
									item.label && (
										<span
											className="sgs-certification-bar__badge-label"
											style={ {
												color:
													colourVar(
														labelColour
													) || undefined,
												fontSize:
													fontSizeVar(
														labelFontSize
													) || undefined,
											} }
										>
											{ item.label }
										</span>
									) }
							</div>
						) ) }
					</div>
				) }
			</div>
		</>
	);
}
