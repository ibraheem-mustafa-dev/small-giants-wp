import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	Button,
	RangeControl,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar, fontSizeVar } from '../../utils';

const LAYOUT_OPTIONS = [
	{ label: __( 'Centred', 'sgs-blocks' ), value: 'centred' },
	{ label: __( 'Left-aligned', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Split', 'sgs-blocks' ), value: 'split' },
];

const BUTTON_STYLE_OPTIONS = [
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
	{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
	{ label: __( 'Outline', 'sgs-blocks' ), value: 'outline' },
];

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ), value: 'x-large' },
];

function ButtonEditor( { button, onChange, onRemove } ) {
	const update = ( key, value ) => {
		onChange( { ...button, [ key ]: value } );
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
			<TextControl
				label={ __( 'Button text', 'sgs-blocks' ) }
				value={ button.text || '' }
				onChange={ ( val ) => update( 'text', val ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'URL', 'sgs-blocks' ) }
				value={ button.url || '' }
				onChange={ ( val ) => update( 'url', val ) }
				type="url"
				__nextHasNoMarginBottom
			/>
			<SelectControl
				label={ __( 'Style', 'sgs-blocks' ) }
				value={ button.style || 'accent' }
				options={ BUTTON_STYLE_OPTIONS }
				onChange={ ( val ) => update( 'style', val ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Icon (optional)', 'sgs-blocks' ) }
				value={ button.icon || '' }
				onChange={ ( val ) => update( 'icon', val ) }
				placeholder="dashicon-name or emoji"
				help={ __(
					'Optional icon before button text',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
			/>
			<Button
				variant="secondary"
				isDestructive
				onClick={ onRemove }
				size="small"
				style={ { marginTop: '8px' } }
			>
				{ __( 'Remove button', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		headline,
		body,
		buttons,
		layout,
		headlineColour,
		bodyColour,
		bodyFontSize,
		buttonColour,
		buttonBackground,
		backgroundImage,
		backgroundImageOpacity,
		stats,
		hoverBackgroundColour,
		hoverTextColour,
		hoverBorderColour,
	} = attributes;

	const className = [
		'sgs-cta-section',
		`sgs-cta-section--${ layout }`,
	].join( ' ' );

	const wrapperStyle = {};
	if ( backgroundImage?.url ) {
		wrapperStyle.backgroundImage = `url(${ backgroundImage.url })`;
		wrapperStyle.backgroundSize = 'cover';
		wrapperStyle.backgroundPosition = 'center';
	}

	const blockProps = useBlockProps( {
		className,
		style: wrapperStyle,
	} );

	const headlineStyle = {
		color: colourVar( headlineColour ) || undefined,
	};

	const bodyStyle = {
		color: colourVar( bodyColour ) || undefined,
		fontSize: fontSizeVar( bodyFontSize ) || undefined,
	};

	const btnStyle = {
		color: colourVar( buttonColour ) || undefined,
		backgroundColor: colourVar( buttonBackground ) || undefined,
	};

	const updateButton = ( index, updated ) => {
		const newButtons = [ ...buttons ];
		newButtons[ index ] = updated;
		setAttributes( { buttons: newButtons } );
	};

	const removeButton = ( index ) => {
		setAttributes( {
			buttons: buttons.filter( ( _, i ) => i !== index ),
		} );
	};

	const addButton = () => {
		setAttributes( {
			buttons: [
				...buttons,
				{ text: '', url: '', style: 'accent', icon: '' },
			],
		} );
	};

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
			<InspectorControls>
				<PanelBody
					title={ __( 'Hover States', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Hover background', 'sgs-blocks' ) }
						value={ hoverBackgroundColour }
						onChange={ ( val ) =>
							setAttributes( {
								hoverBackgroundColour: val,
							} )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Hover text', 'sgs-blocks' ) }
						value={ hoverTextColour }
						onChange={ ( val ) =>
							setAttributes( { hoverTextColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Hover border', 'sgs-blocks' ) }
						value={ hoverBorderColour }
						onChange={ ( val ) =>
							setAttributes( {
								hoverBorderColour: val,
							} )
						}
					/>
				</PanelBody>

				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Layout', 'sgs-blocks' ) }
						value={ layout }
						options={ LAYOUT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { layout: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Buttons', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ buttons.map( ( button, index ) => (
						<ButtonEditor
							key={ index }
							button={ button }
							onChange={ ( updated ) =>
								updateButton( index, updated )
							}
							onRemove={ () => removeButton( index ) }
						/>
					) ) }
					<Button variant="secondary" onClick={ addButton }>
						{ __( 'Add button', 'sgs-blocks' ) }
					</Button>
				</PanelBody>

				<PanelBody
					title={ __( 'Background Image', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( media ) =>
								setAttributes( {
									backgroundImage: {
										id: media.id,
										url: media.url,
										alt: media.alt,
									},
								} )
							}
							allowedTypes={ [ 'image' ] }
							value={ backgroundImage?.id }
							render={ ( { open } ) => (
								<div>
									{ backgroundImage?.url ? (
										<>
											<img
												src={
													backgroundImage.url
												}
												alt=""
												style={ {
													maxWidth: '100%',
													marginBottom: '8px',
												} }
											/>
											<Button
												variant="secondary"
												onClick={ () =>
													setAttributes( {
														backgroundImage:
															undefined,
													} )
												}
												isDestructive
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
										>
											{ __(
												'Select background image',
												'sgs-blocks'
											) }
										</Button>
									) }
								</div>
							) }
						/>
					</MediaUploadCheck>
					<RangeControl
						label={ __(
							'Image opacity (%)',
							'sgs-blocks'
						) }
						value={ backgroundImageOpacity }
						onChange={ ( val ) =>
							setAttributes( {
								backgroundImageOpacity: val,
							} )
						}
						min={ 0 }
						max={ 100 }
						__nextHasNoMarginBottom
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
								onChange={ ( val ) =>
									updateStat( index, val )
								}
								placeholder={ __(
									'e.g., Trusted by 5,000+ businesses',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
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

				<PanelBody
					title={ __( 'Text Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Headline colour', 'sgs-blocks' ) }
						value={ headlineColour }
						onChange={ ( val ) =>
							setAttributes( { headlineColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Body colour', 'sgs-blocks' ) }
						value={ bodyColour }
						onChange={ ( val ) =>
							setAttributes( { bodyColour: val } )
						}
					/>
					<SelectControl
						label={ __( 'Body font size', 'sgs-blocks' ) }
						value={ bodyFontSize || '' }
						options={ FONT_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { bodyFontSize: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Button text colour', 'sgs-blocks' ) }
						value={ buttonColour }
						onChange={ ( val ) =>
							setAttributes( { buttonColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __(
							'Button background colour',
							'sgs-blocks'
						) }
						value={ buttonBackground }
						onChange={ ( val ) =>
							setAttributes( { buttonBackground: val } )
						}
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ backgroundImage?.url && (
					<span
						className="sgs-cta-section__overlay"
						style={ {
							opacity: backgroundImageOpacity / 100,
						} }
						aria-hidden="true"
					/>
				) }

				<div className="sgs-cta-section__content">
					<RichText
						tagName="h2"
						className="sgs-cta-section__headline"
						value={ headline }
						onChange={ ( val ) =>
							setAttributes( { headline: val } )
						}
						placeholder={ __(
							'Call-to-action headline…',
							'sgs-blocks'
						) }
						style={ headlineStyle }
					/>
					<RichText
						tagName="p"
						className="sgs-cta-section__body"
						value={ body }
						onChange={ ( val ) =>
							setAttributes( { body: val } )
						}
						placeholder={ __(
							'Supporting text…',
							'sgs-blocks'
						) }
						style={ bodyStyle }
					/>
				</div>
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

				{ buttons.length > 0 && (
					<div className="sgs-cta-section__buttons">
						{ buttons.map( ( btn, index ) =>
							btn.text ? (
								<span
									key={ index }
									className={ `sgs-cta-section__btn sgs-cta-section__btn--${ btn.style || 'accent' }` }
									style={ btnStyle }
								>
									{ btn.icon && (
										<span
											className="sgs-cta-section__btn-icon"
											aria-hidden="true"
										>
											{ btn.icon }
										</span>
									) }
									{ btn.text }
								</span>
							) : null
						) }
					</div>
				) }
			</div>
		</>
	);
}
