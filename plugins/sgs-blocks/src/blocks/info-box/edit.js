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
	ToggleControl,
	Icon,
	Button,
} from '@wordpress/components';
import {
	starFilled,
	check,
	shipping,
	payment,
	globe,
	people,
	shield,
	inbox,
	mapMarker,
	calendar,
	comment,
	megaphone,
} from '@wordpress/icons';
import { DesignTokenPicker, ResponsiveControl } from '../../components';
import { colourVar, fontSizeVar } from '../../utils';

const ICON_OPTIONS = [
	{ label: __( 'Star', 'sgs-blocks' ), value: 'star-filled', icon: starFilled },
	{ label: __( 'Tick', 'sgs-blocks' ), value: 'check', icon: check },
	{ label: __( 'Delivery', 'sgs-blocks' ), value: 'shipping', icon: shipping },
	{ label: __( 'Payment', 'sgs-blocks' ), value: 'payment', icon: payment },
	{ label: __( 'Globe', 'sgs-blocks' ), value: 'globe', icon: globe },
	{ label: __( 'People', 'sgs-blocks' ), value: 'people', icon: people },
	{ label: __( 'Shield', 'sgs-blocks' ), value: 'shield', icon: shield },
	{ label: __( 'Inbox', 'sgs-blocks' ), value: 'inbox', icon: inbox },
	{ label: __( 'Location', 'sgs-blocks' ), value: 'map-marker', icon: mapMarker },
	{ label: __( 'Calendar', 'sgs-blocks' ), value: 'calendar', icon: calendar },
	{ label: __( 'Chat', 'sgs-blocks' ), value: 'comment', icon: comment },
	{ label: __( 'Announce', 'sgs-blocks' ), value: 'megaphone', icon: megaphone },
];

const ICON_MAP = Object.fromEntries(
	ICON_OPTIONS.map( ( opt ) => [ opt.value, opt.icon ] )
);

const CARD_STYLE_OPTIONS = [
	{ label: __( 'Flat', 'sgs-blocks' ), value: 'flat' },
	{ label: __( 'Bordered', 'sgs-blocks' ), value: 'bordered' },
	{ label: __( 'Elevated', 'sgs-blocks' ), value: 'elevated' },
	{ label: __( 'Filled', 'sgs-blocks' ), value: 'filled' },
];

const HOVER_EFFECT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Border accent', 'sgs-blocks' ), value: 'border-accent' },
	{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
];

const ICON_SIZE_OPTIONS = [
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
];

const MEDIA_TYPE_OPTIONS = [
	{ label: __( 'Icon', 'sgs-blocks' ), value: 'icon' },
	{ label: __( 'Image', 'sgs-blocks' ), value: 'image' },
];

const ICON_POSITION_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'top' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
];

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ), value: 'x-large' },
	{ label: __( 'XXL', 'sgs-blocks' ), value: 'xx-large' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		mediaType,
		image,
		iconPosition,
		icon,
		heading,
		description,
		link,
		linkOpensNewTab,
		iconColour,
		iconBackgroundColour,
		iconSize,
		headingColour,
		headingFontSize,
		descriptionColour,
		cardStyle,
		hoverEffect,
	} = attributes;

	const className = [
		'sgs-info-box',
		`sgs-info-box--${ cardStyle }`,
		`sgs-info-box--hover-${ hoverEffect }`,
		`sgs-info-box--media-${ iconPosition }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	const iconStyle = {
		color: colourVar( iconColour ),
		backgroundColor: colourVar( iconBackgroundColour ),
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Card Style', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Card style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ CARD_STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { cardStyle: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ hoverEffect }
						options={ HOVER_EFFECT_OPTIONS }
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
						label={ __( 'Heading colour', 'sgs-blocks' ) }
						value={ headingColour }
						onChange={ ( val ) =>
							setAttributes( { headingColour: val } )
						}
					/>
					<ResponsiveControl
						label={ __( 'Heading font size', 'sgs-blocks' ) }
					>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'headingFontSize',
								tablet: 'headingFontSizeTablet',
								mobile: 'headingFontSizeMobile',
							};
							return (
								<SelectControl
									value={
										attributes[
											attrMap[ breakpoint ]
										] || ''
									}
									options={
										breakpoint === 'desktop'
											? FONT_SIZE_OPTIONS
											: [
													{
														label: __(
															'Same as desktop',
															'sgs-blocks'
														),
														value: '',
													},
													...FONT_SIZE_OPTIONS.filter(
														( opt ) =>
															opt.value !== ''
													),
												]
									}
									onChange={ ( val ) =>
										setAttributes( {
											[ attrMap[ breakpoint ] ]:
												val,
										} )
									}
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>
					<DesignTokenPicker
						label={ __(
							'Description colour',
							'sgs-blocks'
						) }
						value={ descriptionColour }
						onChange={ ( val ) =>
							setAttributes( {
								descriptionColour: val,
							} )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Media', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Media type', 'sgs-blocks' ) }
						value={ mediaType }
						options={ MEDIA_TYPE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { mediaType: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Position', 'sgs-blocks' ) }
						value={ iconPosition }
						options={ ICON_POSITION_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { iconPosition: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ mediaType === 'image' ? (
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ ( media ) =>
									setAttributes( {
										image: {
											id: media.id,
											url: media.url,
											alt: media.alt,
											width: media.width,
											height: media.height,
										},
									} )
								}
								allowedTypes={ [ 'image' ] }
								value={ image?.id }
								render={ ( { open } ) => (
									<>
										{ image?.url && (
											<img
												src={ image.url }
												alt={ image.alt || '' }
												style={ {
													display: 'block',
													maxWidth: '100%',
													marginBottom: '8px',
													borderRadius: '4px',
												} }
											/>
										) }
										<Button
											variant="secondary"
											onClick={ open }
											style={ { marginBottom: '4px' } }
										>
											{ image?.url
												? __(
													'Replace image',
													'sgs-blocks'
												)
												: __(
													'Select image',
													'sgs-blocks'
												) }
										</Button>
										{ image?.url && (
											<Button
												variant="link"
												isDestructive
												onClick={ () =>
													setAttributes( {
														image: undefined,
													} )
												}
												style={ { display: 'block' } }
											>
												{ __(
													'Remove image',
													'sgs-blocks'
												) }
											</Button>
										) }
									</>
								) }
							/>
						</MediaUploadCheck>
					) : (
						<>
							<SelectControl
								label={ __( 'Icon', 'sgs-blocks' ) }
								value={ icon }
								options={ ICON_OPTIONS.map( ( opt ) => ( {
									label: opt.label,
									value: opt.value,
								} ) ) }
								onChange={ ( val ) =>
									setAttributes( { icon: val } )
								}
								__nextHasNoMarginBottom
							/>
							<ResponsiveControl
								label={ __( 'Icon size', 'sgs-blocks' ) }
							>
								{ ( breakpoint ) => {
									const attrMap = {
										desktop: 'iconSize',
										tablet: 'iconSizeTablet',
										mobile: 'iconSizeMobile',
									};
									return (
										<SelectControl
											value={
												attributes[
													attrMap[ breakpoint ]
												] || ''
											}
											options={
												breakpoint === 'desktop'
													? ICON_SIZE_OPTIONS
													: [
															{
																label: __(
																	'Same as desktop',
																	'sgs-blocks'
																),
																value: '',
															},
															...ICON_SIZE_OPTIONS,
														]
											}
											onChange={ ( val ) =>
												setAttributes( {
													[ attrMap[ breakpoint ] ]:
														val,
												} )
											}
											__nextHasNoMarginBottom
										/>
									);
								} }
							</ResponsiveControl>
							<DesignTokenPicker
								label={ __( 'Icon colour', 'sgs-blocks' ) }
								value={ iconColour }
								onChange={ ( val ) =>
									setAttributes( { iconColour: val } )
								}
							/>
							<DesignTokenPicker
								label={ __(
									'Icon background colour',
									'sgs-blocks'
								) }
								value={ iconBackgroundColour }
								onChange={ ( val ) =>
									setAttributes( {
										iconBackgroundColour: val,
									} )
								}
							/>
						</>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Link', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Link URL', 'sgs-blocks' ) }
						value={ link || '' }
						onChange={ ( val ) =>
							setAttributes( { link: val } )
						}
						type="url"
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Open in new tab', 'sgs-blocks' ) }
						checked={ linkOpensNewTab }
						onChange={ ( val ) =>
							setAttributes( { linkOpensNewTab: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ /* Media element — icon or image */ }
				{ mediaType === 'image' && image?.url ? (
					<img
						src={ image.url }
						alt={ image.alt || '' }
						className="sgs-info-box__image"
					/>
				) : (
					<div
						className={ `sgs-info-box__icon sgs-info-box__icon--${ iconSize }` }
						style={ iconStyle }
					>
						{ ICON_MAP[ icon ] && (
							<Icon icon={ ICON_MAP[ icon ] } size={ 24 } />
						) }
					</div>
				) }
				<div className="sgs-info-box__body">
					<RichText
						tagName="h3"
						className="sgs-info-box__heading"
						value={ heading }
						onChange={ ( val ) =>
							setAttributes( { heading: val } )
						}
						placeholder={ __( 'Feature heading…', 'sgs-blocks' ) }
						style={ {
							color: colourVar( headingColour ) || undefined,
							fontSize:
								fontSizeVar( headingFontSize ) || undefined,
						} }
					/>
					<RichText
						tagName="p"
						className="sgs-info-box__description"
						value={ description }
						onChange={ ( val ) =>
							setAttributes( { description: val } )
						}
						placeholder={ __( 'Description…', 'sgs-blocks' ) }
						style={ {
							color:
								colourVar( descriptionColour ) || undefined,
						} }
					/>
				</div>
			</div>
		</>
	);
}
